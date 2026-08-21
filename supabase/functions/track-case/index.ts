import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z, parseBody, corsJson, caseCode } from "../_shared/schemas.ts";
import { rateLimit, tooMany } from "../_shared/guard.ts";

const schema = z.object({ case_code: caseCode });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsJson });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsJson });
  }
  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 10 lookups / 10 นาที ต่อ IP
  if (!(await rateLimit(req, "track-case", 10, 600))) return tooMany();

  const { data: c, error: qErr } = await db
    .from("cases")
    .select("id,case_code,status,severity,profile,deleted_at,created_at")
    .eq("case_code", data.case_code)
    .maybeSingle();

  if (qErr || !c) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: corsJson });
  }

  const { data: tl } = await db
    .from("case_timeline")
    .select("status,note,created_at")
    .eq("case_id", c.id)
    .order("created_at", { ascending: true });

  const { data: qs } = await db
    .from("case_questions")
    .select("id,question,created_at,answer_text,answered_at")
    .eq("case_id", c.id)
    .order("created_at", { ascending: true });

  const profile = (c.profile ?? {}) as Record<string, unknown>;
  const area = [profile.district, profile.province, profile.branch].filter(Boolean).join(" · ") || null;

  return new Response(
    JSON.stringify({
      case_code: c.case_code,
      status: c.status,
      severity: c.severity,
      area,
      cancelled: !!c.deleted_at,
      created_at: c.created_at,
      timeline: tl ?? [],
      questions: (qs ?? []).map((q: Record<string, unknown>) => ({
        id: q.id,
        question: q.question,
        created_at: q.created_at,
        answer_text: q.answer_text,
        answered_at: q.answered_at,
      })),
    }),
    { headers: corsJson },
  );
});
