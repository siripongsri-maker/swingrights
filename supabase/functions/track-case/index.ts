// Public tracker lookup by case code (no auth required)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim().toUpperCase();
    if (!code || code.length < 6) {
      return new Response(JSON.stringify({ error: "invalid code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cases } = await supabase
      .from("cases")
      .select("id, case_code, status, severity, created_at, updated_at, profile, ai_result, referrals, signature_staff_name")
      .eq("case_code", code)
      .maybeSingle();

    if (!cases) {
      return new Response(JSON.stringify({ found: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: timeline } = await supabase
      .from("case_timeline")
      .select("status, note, created_at")
      .eq("case_id", cases.id)
      .order("created_at", { ascending: true });

    // Strip PII for public tracker
    const sanitized = {
      case_code: cases.case_code,
      status: cases.status,
      severity: cases.severity,
      created_at: cases.created_at,
      updated_at: cases.updated_at,
      branch: cases.profile?.branch,
      risk_level: cases.ai_result?.riskLevel,
      referral_count: Array.isArray(cases.referrals) ? cases.referrals.length : 0,
    };

    return new Response(JSON.stringify({ found: true, case: sanitized, timeline: timeline ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "lookup failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
