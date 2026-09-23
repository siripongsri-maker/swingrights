// Partner responds to a referral without logging in. Token-only, de-identified.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z, parseBody, corsJson } from "../_shared/schemas.ts";
import { rateLimit, tooMany } from "../_shared/guard.ts";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{48}$/),
  action: z.enum(["view", "accept", "decline"]),
});
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: corsJson });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsJson });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!(await rateLimit(req, "referral-respond", 30, 600))) return tooMany();
  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: r } = await db.from("case_referrals")
    .select("id, case_id, partner_id, outcome, note, token_expires_at, referral_partners(name), cases(case_code, profile, violation_types, deleted_at)")
    .eq("accept_token", data.token).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const ref = r as any;
  if (!ref || !ref.cases || ref.cases.deleted_at) return json({ error: "invalid" }, 404);
  const expired = !ref.token_expires_at || new Date(ref.token_expires_at).getTime() < Date.now();

  if (data.action === "view") {
    if (expired && ref.outcome === "pending") return json({ error: "invalid" }, 404);
    return json({
      case_code: ref.cases.case_code,
      branch: ref.cases.profile?.branch ?? null,
      violation_types: Array.isArray(ref.cases.violation_types) ? ref.cases.violation_types.slice(0, 20) : [],
      note: ref.note,
      outcome: ref.outcome,
      expires_at: ref.token_expires_at,
    });
  }

  if (expired) return json({ error: "invalid" }, 404);
  if (ref.outcome !== "pending") return json({ error: "already_answered", outcome: ref.outcome }, 409);

  const accepted = data.action === "accept";
  const now = new Date().toISOString();
  const { error: uErr } = await db.from("case_referrals").update({
    outcome: accepted ? "accepted" : "declined",
    accepted_at: accepted ? now : null,
    responded_at: now,
  }).eq("id", ref.id).eq("outcome", "pending");
  if (uErr) return json({ error: "failed" }, 500);

  const pname = ref.referral_partners?.name ?? "partner";
  await db.from("case_timeline").insert({
    case_id: ref.case_id,
    status: "inprogress",
    note: accepted ? `${pname} ตอบรับการส่งต่อ / accepted the referral` : `${pname} ปฏิเสธการส่งต่อ / declined the referral`,
  });
  return json({ ok: true, outcome: accepted ? "accepted" : "declined" });
});
