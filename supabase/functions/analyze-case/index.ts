// AI analysis of voice screening intake using Lovable AI Gateway
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  reporter: any;
  victim: any;
  profile: any;
  answers: { question: string; cat: string; transcript: string }[];
  staffObs: string[];
  hasViolation: boolean | null;
  violationDetails: string[];
  severity: string | null;
  extraFacts: string;
}

const SYSTEM = `คุณคือผู้เชี่ยวชาญด้านสิทธิมนุษยชนที่ทำงานร่วมกับมูลนิธิ SWING (ประเทศไทย) ซึ่งช่วยเหลือผู้ให้บริการทางเพศและกลุ่มเปราะบาง วิเคราะห์บันทึกการสัมภาษณ์ผู้ถูกละเมิด แล้วประเมิน:
- ระดับความเสี่ยง 0-100 และ riskLevel ('low' < 40, 'medium' 40-69, 'high' >= 70)
- สรุปสถานการณ์ภาษาไทย กระชับ ใช้น้ำเสียงเชิงข้อเท็จจริง 2-4 ประโยค
- แท็กประเภทการละเมิด (เลือกจาก physical, sexual, psychological, economic, legal, discrimination)
- คำแนะนำเบื้องต้นสำหรับเจ้าหน้าที่ 3-5 ข้อ
- คำถามติดตามผล 2-4 ข้อ พร้อมหมวด

ตอบกลับผ่าน function call analyze_case เท่านั้น`;

const TOOL = {
  type: "function",
  function: {
    name: "analyze_case",
    description: "ส่งคืนผลการวิเคราะห์เคสในรูปแบบ JSON",
    parameters: {
      type: "object",
      properties: {
        riskScore: { type: "number", minimum: 0, maximum: 100 },
        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
        summary: { type: "string" },
        violationTags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["physical", "sexual", "psychological", "economic", "legal", "discrimination"] },
              label: { type: "string" },
            },
            required: ["type", "label"],
            additionalProperties: false,
          },
        },
        recommendations: { type: "array", items: { type: "string" } },
        followUpQuestions: {
          type: "array",
          items: {
            type: "object",
            properties: { category: { type: "string" }, question: { type: "string" } },
            required: ["category", "question"],
            additionalProperties: false,
          },
        },
      },
      required: ["riskScore", "riskLevel", "summary", "violationTags", "recommendations", "followUpQuestions"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Payload;

    const userPrompt = `ข้อมูลเคส:
ผู้รับบริการ: ${body.victim?.name || '-'} | กลุ่ม ${body.profile?.kp} | เพศ ${body.profile?.gender} | อายุ ${body.profile?.age} | สัญชาติ ${body.profile?.nationality}
พื้นที่เกิดเหตุ: ${body.profile?.incidentPlace || '-'}
ประเภทการละเมิดเบื้องต้น: ${(body.profile?.initialViolationTypes || []).join(', ') || '-'}
เจ้าหน้าที่ประเมินว่ามีการละเมิด: ${body.hasViolation === true ? 'ใช่' : body.hasViolation === false ? 'ไม่' : 'ยังไม่ระบุ'}
รายละเอียดที่ละเมิด: ${(body.violationDetails || []).join(', ') || '-'}
ระดับความรุนแรงที่ประเมิน: ${body.severity || '-'}
ข้อเท็จจริงเพิ่มเติม: ${body.extraFacts || '-'}

บันทึกการสัมภาษณ์:
${body.answers.map((a, i) => `(${i + 1}) [${a.cat}] ${a.question}\nคำตอบ: ${a.transcript || '(ไม่มีคำตอบ)'}\nบันทึกของเจ้าหน้าที่: ${body.staffObs[i] || '-'}`).join('\n\n')}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "analyze_case" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "ผู้ใช้งานหนาแน่น กรุณาลองใหม่ในอีกสักครู่" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "เครดิต AI หมด กรุณาเติมเครดิตใน Workspace" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error ${aiRes.status}`);
    }

    const data = await aiRes.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("ไม่ได้รับผลการวิเคราะห์");
    const parsed = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-case error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
