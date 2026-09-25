// Builds a new version of the SWING Rights model from consented, de-identified case answers.
// Admin only. Everything stays inside SWING Rights: samples are read with the service role,
// scrubbed again, distilled into internal guidance, and saved as a draft version.
import { corsHeaders, scrubText } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Row = { lang: string; question: string; answer: string; followup: string; staff_rating: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI not configured" }, 500);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({})) as { action?: string; activate?: boolean };
    let createdBy: string | null = null;
    let autoActivate = body.activate === true;
    const cronToken = req.headers.get("x-cron-token");
    if (cronToken) {
      // Scheduled auto-update: rebuild only when new consented answers arrived since the last version.
      const { data: ok } = await admin.rpc("verify_cron_token", { _token: cronToken });
      if (!ok) return json({ error: "forbidden" }, 403);
      const { data: act } = await admin.from("swing_rights_models").select("created_at").eq("status", "active").maybeSingle();
      if (!act) return json({ skipped: "no_active_model" });
      const { count } = await admin.from("ai_training_samples").select("id", { count: "exact", head: true })
        .or(`created_at.gt.${act.created_at},rated_at.gt.${act.created_at}`).not("case_id", "is", null);
      if ((count ?? 0) < 3) return json({ skipped: "no_new_samples", count });
      autoActivate = true;
    } else {
      const auth = req.headers.get("Authorization") ?? "";
      const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
      createdBy = u.user.id;
    }


    const [{ data: rated }, { data: real }, { data: partners }] = await Promise.all([
      admin.from("ai_training_samples").select("lang, question, answer, followup, staff_rating")
        .not("staff_rating", "is", null).neq("followup", "").order("rated_at", { ascending: false }).limit(400),
      admin.from("ai_training_samples").select("lang, question, answer, followup, staff_rating, cases!inner(deleted_at)")
        .is("staff_rating", null).not("case_id", "is", null).neq("followup", "")
        .is("cases.deleted_at", null).order("created_at", { ascending: false }).limit(400),
      admin.from("referral_partners").select("org_type, services, province").eq("active", true).limit(200),
    ]);
    // Compact picture of the live referral network, so lessons teach follow-ups that
    // surface the details partners actually need (location, service type, urgency).
    const svcCount: Record<string, number> = {};
    const provCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    for (const p of partners ?? []) {
      typeCount[p.org_type] = (typeCount[p.org_type] ?? 0) + 1;
      if (p.province) provCount[p.province] = (provCount[p.province] ?? 0) + 1;
      for (const s of Array.isArray(p.services) ? p.services : []) svcCount[String(s)] = (svcCount[String(s)] ?? 0) + 1;
    }
    const top = (o: Record<string, number>, n: number) =>
      Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}(${v})`).join(", ");
    const partnerContext = `Referral network: ${(partners ?? []).length} active partners — types: ${top(typeCount, 10)}; services: ${top(svcCount, 20)}; provinces: ${top(provCount, 15)}.`;
    const clean = (r: Row): Row => ({
      lang: r.lang, staff_rating: r.staff_rating,
      question: scrubText(r.question).slice(0, 200),
      answer: scrubText(r.answer).slice(0, 350),
      followup: scrubText(r.followup).slice(0, 220),
    });
    const R = ((rated ?? []) as Row[]).map(clean);
    const L = ((real ?? []) as Row[]).map(clean);
    const good = R.filter((r) => r.staff_rating === "good");
    const bad = R.filter((r) => r.staff_rating !== "good");
    if (R.length + L.length < 3) return json({ error: "not_enough_data", count: R.length + L.length }, 400);

    // Examples kept per language: 6 good, 4 rejected, 5 recent real answers.
    const examples: Record<string, { good: Row[]; bad: Row[]; real: Row[] }> = {};
    for (const lang of ["th", "en", "my", "km", "lo"]) {
      examples[lang] = {
        good: good.filter((r) => r.lang === lang).slice(0, 6),
        bad: bad.filter((r) => r.lang === lang).slice(0, 4),
        real: L.filter((r) => r.lang === lang).slice(0, 5),
      };
    }

    const fmt = (r: Row) => `[${r.lang}${r.staff_rating ? "/" + r.staff_rating : ""}] Q: ${r.question} | A: ${r.answer} | FU: ${r.followup}`;
    const corpus = [...good.slice(0, 60), ...bad.slice(0, 40), ...L.slice(0, 80)].map(fmt).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "medium" },
        instructions: `You distill lessons for the SWING Rights follow-up interviewer (SWING Foundation, Thailand; rights-based, trauma-informed support for sex workers / service workers).
From the de-identified samples below (Q = main question, A = reporter answer, FU = follow-up the AI asked; /good = staff approved, /repeat or /bad = staff rejected; no rating = real answer not yet reviewed), write 8-15 short, concrete rules in English on how to ask better follow-ups: which details reporters tend to leave out, phrasing that works, patterns staff rejected, per-language notes if clear.
Never include names, places, numbers or any case detail. Never suggest asking real names, ID/passport numbers or immigration status. Never use the word "victim". Output only a bullet list.`,
        input: corpus,
      }),
    });
    if (!res.ok || !res.body) {
      if (res.status === 429) return json({ error: "busy" }, 429);
      if (res.status === 402) return json({ error: "credits" }, 402);
      return json({ error: "ai_error" }, 502);
    }
    let guidance = "";
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "response.output_text.delta") guidance += ev.delta;
        } catch { /* ignore */ }
      }
    }
    guidance = scrubText(guidance).trim().slice(0, 4000);
    if (!guidance) return json({ error: "empty" }, 502);

    const { data: last } = await admin.from("swing_rights_models").select("version").order("version", { ascending: false }).limit(1);
    const version = (last?.[0]?.version ?? 0) + 1;
    const { data: row, error } = await admin.from("swing_rights_models").insert({
      version, guidance, examples, created_by: createdBy,
      sample_count: R.length + L.length, good_count: good.length, rejected_count: bad.length, real_count: L.length,
    }).select("id, version").single();
    if (error) throw error;
    if (autoActivate) {
      await admin.from("swing_rights_models").update({ status: "archived" }).eq("status", "active");
      await admin.from("swing_rights_models").update({ status: "active", activated_at: new Date().toISOString() }).eq("id", row.id);
    }
    return json({ ok: true, activated: autoActivate, ...row });
  } catch (e) {
    console.error("train-swing-model", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
