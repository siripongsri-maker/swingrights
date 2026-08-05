// แจ้งเตือนเคสเสี่ยงสูง — ข้อความ de-identified เท่านั้น (case_code + สาขา + ระดับ)
// ช่องทาง: LINE Messaging API (push) + Resend email สำรอง
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  case_code: string;
  branch?: string | null;
  level?: string | null;
  kind?: "high_risk" | "suicide_risk";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    const code = (body.case_code || "").trim();
    if (!/^[A-Z0-9-]{6,32}$/.test(code)) {
      return new Response(JSON.stringify({ error: "invalid case_code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const branch = (body.branch || "ไม่ระบุ").slice(0, 60);
    const level = (body.level || "high").slice(0, 20);
    const urgent = body.kind === "suicide_risk";

    // ข้อความไม่มีข้อมูลระบุตัวตนใดๆ
    const text = [
      urgent ? "🚨 เคสเสี่ยงทำร้ายตนเอง (ต้องติดต่อทันที)" : "⚠️ เคสความเสี่ยงสูง",
      `รหัสเคส: ${code}`,
      `พื้นที่: ${branch}`,
      `ระดับ: ${level}`,
      urgent ? "แนวทาง: safety planning + สายด่วน 1323" : "กรุณาเข้าระบบเพื่อมอบหมายผู้รับผิดชอบ",
    ].join("\n");

    const results: Record<string, string> = {};

    // 1) LINE Messaging API
    const lineToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    const lineTo = Deno.env.get("LINE_ALERT_TO"); // userId หรือ groupId ของทีมเคส
    if (lineToken && lineTo) {
      const r = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
        body: JSON.stringify({ to: lineTo, messages: [{ type: "text", text }] }),
      });
      results.line = r.ok ? "sent" : `error ${r.status}: ${(await r.text()).slice(0, 200)}`;
      if (!r.ok) console.error("LINE push failed", results.line);
    } else {
      results.line = "skipped (ยังไม่ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN / LINE_ALERT_TO)";
    }

    // 2) Resend email สำรอง
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const alertEmail = Deno.env.get("ALERT_EMAIL_TO");
    const alertFrom = Deno.env.get("ALERT_EMAIL_FROM") || "SWING Alerts <onboarding@resend.dev>";
    if (resendKey && alertEmail) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: alertFrom,
          to: [alertEmail],
          subject: `${urgent ? "[URGENT] " : ""}SWING alert · ${code} · ${level}`,
          text,
        }),
      });
      results.email = r.ok ? "sent" : `error ${r.status}: ${(await r.text()).slice(0, 200)}`;
      if (!r.ok) console.error("Resend failed", results.email);
    } else {
      results.email = "skipped (ยังไม่ตั้งค่า RESEND_API_KEY / ALERT_EMAIL_TO)";
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-case error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
