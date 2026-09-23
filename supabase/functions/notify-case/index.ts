// แจ้งเตือนเคส — ข้อความ de-identified เท่านั้น (case_code + สาขา + ระดับ / ชั่วโมงที่เหลือ)
// ช่องทาง: LINE Messaging API (push) + Resend email สำรอง
// kind: high_risk | suicide_risk | sla_warning | unassigned ; action "sla_sweep" = hourly job (requires x-cron-token)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { parseBody, notifyCaseSchema } from "../_shared/schemas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Kind = "high_risk" | "suicide_risk" | "sla_warning" | "unassigned";

function buildText(kind: Kind, code: string, branch: string, level: string, hours: number | null) {
  if (kind === "unassigned") {
    return [
      level === "manager" ? "📣 แจ้งผู้จัดการ: เคสยังไม่มีผู้รับผิดชอบเกิน 12 ชม." : "📌 เคสยังไม่มีผู้รับผิดชอบเกิน 4 ชม.",
      `รหัสเคส: ${code}`,
      `พื้นที่: ${branch}`,
      `ระดับ: ${level}`,
    ].join("\n");
  }
  if (kind === "sla_warning") {
    return [
      "⏰ ใกล้ครบ 24 ชม. ยังไม่มีการตอบกลับ",
      `รหัสเคส: ${code}`,
      `พื้นที่: ${branch}`,
      `เหลือเวลา: ${hours ?? 0} ชม.`,
    ].join("\n");
  }
  const urgent = kind === "suicide_risk";
  return [
    urgent ? "🚨 เคสเสี่ยงทำร้ายตนเอง (ต้องติดต่อทันที)" : "⚠️ เคสความเสี่ยงสูง",
    `รหัสเคส: ${code}`,
    `พื้นที่: ${branch}`,
    `ระดับ: ${level}`,
  ].join("\n");
}

async function send(text: string, subject: string) {
  const results: Record<string, string> = {};
  const lineToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  const lineTo = Deno.env.get("LINE_ALERT_TO");
  if (lineToken && lineTo) {
    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
      body: JSON.stringify({ to: lineTo, messages: [{ type: "text", text }] }),
    });
    results.line = r.ok ? "sent" : `error ${r.status}`;
    if (!r.ok) console.error("LINE push failed", r.status);
  } else results.line = "skipped";

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const alertEmail = Deno.env.get("ALERT_EMAIL_TO");
  const alertFrom = Deno.env.get("ALERT_EMAIL_FROM") || "SWING Alerts <onboarding@resend.dev>";
  if (resendKey && alertEmail) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: alertFrom, to: [alertEmail], subject, text }),
    });
    results.email = r.ok ? "sent" : `error ${r.status}`;
    if (!r.ok) console.error("Resend failed", r.status);
  } else results.email = "skipped";
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const parsed = await parseBody(req, notifyCaseSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data as Record<string, unknown>;

    if (body.action === "sla_sweep") {
      const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false },
      });
      const token = req.headers.get("x-cron-token") ?? "";
      const { data: ok } = await db.rpc("verify_cron_token", { _token: token });
      if (ok !== true) return json({ error: "forbidden" }, 403);

      const now = Date.now();
      const { data: cases, error } = await db
        .from("cases")
        .select("id, case_code, created_at, profile")
        .is("first_response_at", null)
        .is("deleted_at", null)
        .gte("created_at", new Date(now - 24 * 3600_000).toISOString())
        .lte("created_at", new Date(now - 20 * 3600_000).toISOString());
      if (error) throw error;

      let sent = 0;
      for (const c of cases ?? []) {
        const { count } = await db.from("case_alerts").select("id", { count: "exact", head: true })
          .eq("case_id", c.id).eq("kind", "sla_warning");
        if ((count ?? 0) > 0) continue; // one warning per case
        const hours = Math.max(0, Math.ceil((new Date(c.created_at).getTime() + 24 * 3600_000 - now) / 3600_000));
        const branch = String((c.profile as Record<string, unknown> | null)?.branch ?? "ไม่ระบุ").slice(0, 60);
        await db.from("case_alerts").insert({
          case_id: c.id, case_code: c.case_code, branch, level: `${hours}h`, kind: "sla_warning",
        });
        await send(buildText("sla_warning", c.case_code, branch, "", hours), `SWING SLA · ${c.case_code} · ${hours}h`);
        sent++;
      }
      // Escalation: unassigned > 4h → "staff" once; > 12h → "manager" once
      const { data: unassigned, error: uErr } = await db
        .from("cases")
        .select("id, case_code, created_at, profile, escalation_level")
        .is("assigned_to", null)
        .is("deleted_at", null)
        .lte("created_at", new Date(now - 4 * 3600_000).toISOString())
        .or("escalation_level.is.null,escalation_level.eq.staff");
      if (uErr) throw uErr;
      let escalated = 0;
      for (const c of unassigned ?? []) {
        const age = now - new Date(c.created_at).getTime();
        const target = age >= 12 * 3600_000 ? "manager" : "staff";
        if (c.escalation_level === target) continue;
        // claim atomically to avoid duplicates
        let q = db.from("cases").update({ escalation_level: target, escalation_sent_at: new Date().toISOString() })
          .eq("id", c.id).is("assigned_to", null);
        q = c.escalation_level ? q.eq("escalation_level", c.escalation_level) : q.is("escalation_level", null);
        const { data: claimed } = await q.select("id");
        if (!claimed?.length) continue;
        const branch = String((c.profile as Record<string, unknown> | null)?.branch ?? "ไม่ระบุ").slice(0, 60);
        await db.from("case_alerts").insert({ case_id: c.id, case_code: c.case_code, branch, level: target, kind: "unassigned" });
        await send(buildText("unassigned", c.case_code, branch, target, null), `SWING unassigned · ${c.case_code} · ${target}`);
        escalated++;
      }
      return json({ ok: true, checked: cases?.length ?? 0, sent, escalated });
    }

    const kind = ((body.kind as Kind | null) ?? "high_risk");
    const code = String(body.case_code);
    const branch = String(body.branch || "ไม่ระบุ").slice(0, 60);
    const level = String(body.level || "high").slice(0, 20);
    const hours = typeof body.hours_remaining === "number" ? body.hours_remaining : null;
    const text = buildText(kind, code, branch, level, hours);
    const subject = `${kind === "suicide_risk" ? "[URGENT] " : ""}SWING alert · ${code} · ${kind === "sla_warning" ? `${hours ?? 0}h` : level}`;
    return json({ ok: true, results: await send(text, subject) });
  } catch (e) {
    console.error("notify-case error", e instanceof Error ? e.message : "unknown");
    return json({ error: "internal error" }, 500);
  }
});
