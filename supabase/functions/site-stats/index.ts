import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson } from "../_shared/schemas.ts";
import { rateLimit, tooMany } from "../_shared/guard.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsJson });
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsJson });
  }

  // 30 requests / 10 นาที ต่อ IP
  if (!(await rateLimit(req, "site-stats", 30, 600))) return tooMany();

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const [{ data: visits }, { data: registered_users }] = await Promise.all([
    db.rpc("get_site_stats") as Promise<{ data: { unique_visitors: number; total_visits: number } | null }>,
    db.rpc("get_registered_user_count") as Promise<{ data: number | null }>,
  ]);

  return new Response(
    JSON.stringify({
      registered_users: registered_users ?? 0,
      unique_visitors: visits?.unique_visitors ?? 0,
      total_visits: visits?.total_visits ?? 0,
    }),
    { headers: corsJson },
  );
});
