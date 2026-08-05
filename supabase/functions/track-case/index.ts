// Public tracker lookup by case code (no auth required)
// Phase 0.3: rate limited + constant-ish delay on miss. Phase 0.7: internal staff notes never leave the server.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, rateLimit, tooMany, sleep } from "../_shared/guard.ts";

const PUBLIC_STATUS_NOTE: Record<string, string> = {
  received: "รับเรื่องแล้ว อยู่ระหว่างตรวจสอบเบื้องต้น",
  reviewing: "เจ้าหน้าที่กำลังพิจารณาเคส",
  in_progress: "อยู่ระหว่างการช่วยเหลือ",
  referred: "ส่งต่อหน่วยงานที่เกี่ยวข้องแล้ว",
  closed: "ปิดเคสแล้ว",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!(await rateLimit(req, "track-case", 15, 300))) return tooMany();

    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim().toUpperCase();
    if (!code || code.length < 6 || !/^[A-Z0-9-]{6,20}$/.test(code)) {
      return new Response(JSON.stringify({ error: "invalid code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cases } = await supabase
      .from("cases")
      .select("id, case_code, status, severity, created_at, updated_at, profile, ai_result, referrals, deleted_at")
      .eq("case_code", code)
      .is("deleted_at", null)
      .maybeSingle();

    if (!cases) {
      // slow down code guessing
      await sleep(700 + Math.floor(Math.random() * 500));
      return new Response(JSON.stringify({ found: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: timeline } = await supabase
      .from("case_timeline")
      .select("status, created_at")
      .eq("case_id", cases.id)
      .order("created_at", { ascending: true });

    // Strip PII for public tracker
    const sanitized = {
      case_code: cases.case_code,
      status: cases.status,
      severity: cases.severity,
      created_at: cases.created_at,
      updated_at: cases.updated_at,
      branch: (cases as any).profile?.branch,
      risk_level: (cases as any).ai_result?.riskLevel,
      referral_count: Array.isArray(cases.referrals) ? cases.referrals.length : 0,
    };

    // Phase 0.7 — internal notes are never exposed publicly; only a generic status label.
    const publicTimeline = (timeline ?? []).map((t: any) => ({
      status: t.status,
      created_at: t.created_at,
      note: PUBLIC_STATUS_NOTE[t.status] ?? "อัปเดตสถานะเคส",
    }));

    return new Response(JSON.stringify({ found: true, case: sanitized, timeline: publicTimeline }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "lookup failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
