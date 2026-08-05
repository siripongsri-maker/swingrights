// Shared privacy + abuse-protection helpers for public edge functions (Phase 0.2 / 0.3)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim();
}

/** Postgres-backed sliding-window rate limit. Fails open on infrastructure errors. */
export async function rateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.rpc("check_rate_limit", {
      _bucket: bucket,
      _ident: clientIp(req),
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

export function tooMany() {
  return new Response(
    JSON.stringify({ error: "คำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Removes direct identifiers from free text before it leaves our infrastructure.
 * Thai/intl phone numbers, 13-digit national IDs, emails, URLs and long digit runs.
 */
export function scrubText(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[อีเมล]")
    .replace(/\b\d[\d\s-]{11,}\d\b/g, "[เลขประจำตัว]")
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[เบอร์โทร]")
    .replace(/https?:\/\/\S+/g, "[ลิงก์]")
    .replace(/\b[A-Za-z0-9._%-]{6,}\b(?=\s*(?:ไลน์|line|id)\b)/gi, "[บัญชี]")
    .trim();
}

/** Replaces a known personal name wherever it appears in text with a neutral role label. */
export function maskName(text: string, name: string | null | undefined, label: string): string {
  const n = (name ?? "").trim();
  if (n.length < 2) return text;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "gi"), label);
}
