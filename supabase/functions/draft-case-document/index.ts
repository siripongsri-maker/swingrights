import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { scrubText } from "../_shared/guard.ts";

const BodySchema = z.object({
  case_id: z.string().uuid(),
  kind: z.enum(["complaint", "statement", "referral", "assistance"]),
});

const FIELD_GUIDANCE = {
  complaint: {
    overview: "ลำดับเหตุการณ์โดยสังเขป เรียงตามเวลา",
    details: "ข้อเท็จจริงสำคัญเกี่ยวกับการกระทำและผู้เกี่ยวข้องโดยไม่คาดเดา",
    impact: "ความเสียหายหรือผลกระทบที่ปรากฏในข้อมูล",
    actions: "ความประสงค์หรือการดำเนินการที่ควรร้องขอ โดยไม่สรุปข้อกฎหมายเกินข้อมูล",
  },
  statement: {
    overview: "ภูมิหลังและบริบทที่เกี่ยวข้องกับเหตุการณ์",
    details: "คำให้ข้อมูลที่เรียบเรียงเป็นเรื่องต่อเนื่องตามลำดับ โดยคงความหมายเดิม",
    impact: "ผลกระทบต่อผู้รับบริการตามที่ให้ข้อมูล",
    actions: "ความต้องการ ความประสงค์ หรือการสนับสนุนที่ร้องขอ",
  },
  referral: {
    overview: "สรุปสถานการณ์ที่จำเป็นต่อหน่วยงานรับส่งต่อ",
    details: "เหตุผลในการส่งต่อและประเด็นสิทธิที่เกี่ยวข้อง",
    impact: "ความต้องการช่วยเหลือและผลคัดกรองที่จำเป็น",
    actions: "ข้อควรระวังและสิ่งที่ขอให้หน่วยงานปลายทางดำเนินการ",
  },
  assistance: {
    overview: "สรุปสถานการณ์ของเคส",
    details: "ผลการประเมินและประเด็นสำคัญที่เจ้าหน้าที่พบ",
    impact: "การช่วยเหลือที่ดำเนินการแล้วจากข้อมูลที่มีเท่านั้น",
    actions: "แผนติดตามหรือขั้นตอนถัดไปที่เหมาะสม",
  },
} as const;

const json = (body: unknown, status = 200, extra?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...Object.fromEntries(new Headers(extra)) },
  });

function safeErrorMessage(raw: string, fallback: string) {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.message === "string" ? parsed.message : fallback;
  } catch {
    return fallback;
  }
}

async function readResponseText(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload);
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") output += event.delta;
        if (event.type === "response.completed" && !output && typeof event.response?.output_text === "string") output = event.response.output_text;
      } catch {
        // Ignore incomplete/non-JSON SSE metadata lines.
      }
    }
  }
  return output;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!url || !serviceKey || !anonKey || !lovableKey) return json({ error: "AI configuration is unavailable" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData } = await userClient.auth.getUser();
  const caller = authData.user;
  if (!caller) return json({ error: "Please sign in again" }, 401);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid document request" }, 400);

  const admin = createClient(url, serviceKey);
  const { data: allowed } = await admin.rpc("can_edit_case", { _user_id: caller.id, _case_id: parsed.data.case_id });
  if (!allowed) return json({ error: "You do not have permission to prepare this document" }, 403);

  const { data: caseRow, error: caseError } = await admin
    .from("cases")
    .select("id,created_at,severity,has_violation,violation_details,profile,answers,staff_observations,extra_facts,screening,suicide_risk,referrals,referral_note")
    .eq("id", parsed.data.case_id)
    .single();
  if (caseError || !caseRow) return json({ error: "Case not found" }, 404);

  await admin.from("case_access_log").insert({
    case_id: caseRow.id,
    actor: caller.id,
    action: "draft_document_ai",
    detail: parsed.data.kind,
  });

  const clean = (value: unknown) => scrubText(typeof value === "string" ? value : "");
  const answers = Array.isArray(caseRow.answers)
    ? caseRow.answers.slice(0, 50).map((item: Record<string, unknown>) => ({
        question: clean(item.question),
        category: clean(item.cat),
        answer: clean(item.transcript),
      }))
    : [];
  const observations = Array.isArray(caseRow.staff_observations)
    ? caseRow.staff_observations.slice(0, 50).map(clean)
    : [];
  const profile = caseRow.profile && typeof caseRow.profile === "object" ? caseRow.profile as Record<string, unknown> : {};
  const safeProfile = {
    group: clean(profile.kp), gender: clean(profile.gender), age: profile.age ?? null,
    nationality: clean(profile.nationality), branch: clean(profile.branch), province: clean(profile.province),
    incident_place: clean(profile.incidentPlace), violation_types: profile.initialViolationTypes ?? [],
  };
  const guide = FIELD_GUIDANCE[parsed.data.kind];
  const prompt = `จัดทำร่างเอกสารภาษาไทยชนิด ${parsed.data.kind} สำหรับเจ้าหน้าที่มูลนิธิสวิง

ข้อบังคับ:
- ใช้เฉพาะข้อเท็จจริงในข้อมูล ห้ามคาดเดา เติมชื่อ บุคคล สถานที่ วันเวลา ความผิด หรือการดำเนินการที่ไม่มีในข้อมูล
- ใช้ภาษาสิทธิที่เป็นกลาง เรียกบุคคลว่า “ผู้รับบริการ” หรือ “ผู้แจ้ง” ห้ามใช้คำตีตรา
- ไม่ใส่ชื่อจริง เลขบัตร หนังสือเดินทาง เบอร์โทร ที่อยู่ หรือสถานะเข้าเมือง แม้พบในข้อความ
- ถ้าข้อมูลไม่พอ ให้เขียนว่า “ยังไม่มีข้อมูลเพียงพอ”
- แต่ละช่องเป็นข้อความพร้อมวางในแบบฟอร์ม ไม่ใช่ Transcript ไม่ใช่บทสนทนา และไม่ใช้รายการคำถาม-คำตอบ

หัวข้อที่ต้องจัดทำ:
- overview: ${guide.overview}
- details: ${guide.details}
- impact: ${guide.impact}
- actions: ${guide.actions}

ข้อมูลเคสที่ไม่ระบุตัวตน:
${JSON.stringify({
    created_at: caseRow.created_at,
    profile: safeProfile,
    severity: caseRow.severity,
    has_violation: caseRow.has_violation,
    violation_details: caseRow.violation_details,
    answers,
    staff_observations: observations,
    extra_facts: clean(caseRow.extra_facts),
    screening: caseRow.screening,
    suicide_risk: caseRow.suicide_risk,
    referrals: caseRow.referrals,
    referral_note: clean(caseRow.referral_note),
  })}`;

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": lovableKey,
      "X-Lovable-AIG-SDK": "fetch",
      ...(req.headers.get("X-Lovable-AIG-Run-ID") ? { "X-Lovable-AIG-Run-ID": req.headers.get("X-Lovable-AIG-Run-ID") as string } : {}),
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: prompt,
      stream: true,
      reasoning: { effort: "medium", summary: "auto" },
      text: {
        format: {
          type: "json_schema",
          name: "case_document_draft",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overview: { type: "string" }, details: { type: "string" },
              impact: { type: "string" }, actions: { type: "string" },
            },
            required: ["overview", "details", "impact", "actions"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const runId = upstream.headers.get("X-Lovable-AIG-Run-ID");
  const responseHeaders = runId ? { "X-Lovable-AIG-Run-ID": runId } : undefined;
  if (!upstream.ok) {
    const message = safeErrorMessage(await upstream.text(), "AI could not prepare the document");
    return json({ error: message }, upstream.status, responseHeaders);
  }

  const text = await readResponseText(upstream);
  let draft: Record<string, string>;
  try { draft = JSON.parse(text); } catch { return json({ error: "AI returned an incomplete document" }, 502, responseHeaders); }
  if (["overview", "details", "impact", "actions"].some((key) => typeof draft[key] !== "string")) {
    return json({ error: "AI returned an invalid document" }, 502, responseHeaders);
  }
  return json({ draft, generated_at: new Date().toISOString() }, 200, responseHeaders);
});