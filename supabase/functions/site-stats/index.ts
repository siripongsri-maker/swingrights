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

  const { data: counts, error: countErr } = await db
    .from("site_visits")
    .select("session_id", { count: "exact", head: true });

  const { data: sessions, error: sessionErr } = await db
    .from("site_visits")
    .select("session_id");

  const { count: registeredUsers, error: userErr } = await db
    .from("auth_user_counts")
    .select("*", { count: "exact", head: true });

  // fallback: query auth.users directly if view/table not present
  let registered_users = 0;
  if (userErr) {
    const { data: users, error: directErr } = await db.rpc("get_registered_user_count");
    if (!directErr && typeof users === "number") registered_users = users;
  } else {
    registered_users = registeredUsers ?? 0;
  }

  const unique_visitors = sessions
    ? new Set((sessions as { session_id: string }[]).map((s) => s.session_id)).size
    : 0;
  const total_visits = counts?.length ?? sessions?.length ?? 0;

  if (countErr && sessionErr) {
    return new Response(JSON.stringify({ error: "stats unavailable" }), { status: 500, headers: corsJson });
  }

  return new Response(
    JSON.stringify({ registered_users, unique_visitors, total_visits }),
    { headers: corsJson },
  );
});
