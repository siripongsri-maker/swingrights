// AI analysis of voice screening intake using Lovable AI Gateway
// Phase 0.2: the prompt is de-identified before it leaves our infrastructure and payloads are never logged.
// Phase 0.3: IP-based rate limiting.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, rateLimit, tooMany, scrubText, maskName } from "../_shared/guard.ts";

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

const SYSTEM = `คุณคือผู้เชี่ยวชาญด้านสิทธิมนุษยชนที่ทำงานร่วมกับมูลนิธิ SWING (ประเทศไทย) ซึ่งช่วยเหลือผู้ให้บริการทางเพศและกลุ่มเปราะบาง วิเคราะห์บันทึกการสัมภาษณ์ผู้ถูกละเมิด (ข้อมูลถูกลบข้อมูลระบุตัวตนออกแล้ว — ห้ามคาดเดาชื่อ เบอร์ หรือที่อยู่) แล้วประเมิน:
- ระดับความเสี่ยง 0-100 และ riskLevel ('low' < 40, 'medium' 40-69, 'high' >= 70)
- สรุปสถานการณ์ภาษาไทย กระชับ ใช้น้ำเสียงเชิงข้อเท็จจริง 2-4 ประโยค โดยเรียกว่า "ผู้รับบริการ" และ "ผู้แจ้ง"
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
    if (!(await rateLimit(req, "analyze-case", 20, 3600))) return tooMany();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Payload;

    // ---- de-identification ------------------------------------------------
    const deident = (t: string) => {
      let out = scrubText(t);
      out = maskName(out, body.victim?.name, "ผู้รับบริการ");
      out = maskName(out, body.reporter?.name, "ผู้แจ้ง");
      return out;
    };

    const answers = (body.answers ?? []).map((a) => ({
      cat: a.cat,
      question: a.question,
      transcript: deident(a.transcript),
    }));
    const staffObs = (body.staffObs ?? []).map((s) => deident(s));

    const userPrompt = `ข้อมูลเคส (ไม่ระบุตัวตน):
ผู้รับบริการ: กลุ่ม ${body.profile?.kp || '-'} | เพศ ${body.profile?.gender || '-'} | อายุ ${body.profile?.age || '-'} | สัญชาติ ${body.profile?.nationality || '-'}
พื้นที่ให้บริการ: ${body.profile?.branch || '-'}
ลักษณะสถานที่เกิดเหตุ: ${deident(body.profile?.incidentPlace) || '-'}
ประเภทการละเมิดเบื้องต้น: ${(body.profile?.initialViolationTypes || []).join(', ') || '-'}
เจ้าหน้าที่ประเมินว่ามีการละเมิด: ${body.hasViolation === true ? 'ใช่' : body.hasViolation === false ? 'ไม่' : 'ยังไม่ระบุ'}
รายละเอียดที่ละเมิด: ${(body.violationDetails || []).join(', ') || '-'}
ระดับความรุนแรงที่ประเมิน: ${body.severity || '-'}
ข้อเท็จจริงเพิ่มเติม: ${deident(body.extraFacts) || '-'}

บันทึกการสัมภาษณ์:
${answers.map((a, i) => `(${i + 1}) [${a.cat}] ${a.question}\nคำตอบ: ${a.transcript || '(ไม่มีคำตอบ)'}\nบันทึกของเจ้าหน้าที่: ${staffObs[i] || '-'}`).join('\n\n')}`;

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
      // never log the prompt/response body — it may contain case content
      console.error("AI gateway error status", aiRes.status);
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
    console.error("analyze-case error:", e instanceof Error ? e.message : "unknown");
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
