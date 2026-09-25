// Live follow-up questions while a complaint is being told by voice.
// Checks the (de-identified) story against the SWING complaint form (แบบบันทึกรับเรื่องร้องเรียน)
// and returns which narrative items are still missing plus ONE gentle next question.
// Never asks for names, ID numbers, passport or immigration status. Payloads are never logged.
import { corsHeaders, rateLimit, tooMany, scrubText } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { parseBody, z } from "../_shared/schemas.ts";

const SLOTS = ["what", "when", "where", "who", "harm", "evidence", "reported", "help", "nrm"] as const;

const bodySchema = z.object({
  text: z.string().max(8000),
  context: z.string().max(6000).optional().default(""),
  lang: z.enum(["th", "en", "my", "km", "lo"]).optional().default("th"),
  asked: z.array(z.string().max(400)).max(40).optional().default([]),
  covered_before: z.array(z.string().max(20)).max(12).optional().default([]),
  question: z.string().max(500).optional().default(""),
  latest: z.string().max(5000).optional().default(""),
  train_consent: z.boolean().optional().default(false),
  session_id: z.string().uuid().optional(),
});

const LANG_NAME: Record<string, string> = { th: "Thai", en: "English", my: "Burmese", km: "Khmer", lo: "Lao" };

const SYSTEM = `You help a rights first-responder at SWING Foundation (Thailand) complete the complaint record form while a sex worker / service worker tells their story by voice.
The form needs these narrative items:
- what: what happened (the act / violation)
- when: date or approximate time
- where: place or type of place / area
- who: who did it — role or relationship only (police, client, employer, officer…), NEVER a name
- harm: injuries, losses, money or property taken, effects
- evidence: photos, documents, witnesses, messages that exist
- reported: whether it was already reported to police / court / another agency
- help: what help the person wants from SWING or other agencies
Mark an item covered only if the story clearly states it.
Then read the LATEST answer carefully and write ONE short, warm, non-judgemental follow-up question built on what the person actually said:
- If the latest answer mentions something vague (e.g. "that night", "they", "a lot of money", "near the bar", "he hurt me"), ask them to make THAT exact point more specific (which date/time, what role, how much, what kind of place, what injury) — quote or refer to their own words.
- If details conflict or are unclear, gently ask them to clarify that point.
- Otherwise ask about the most important missing item (priority order as listed), connected to the current form question when given.
- LISTEN FIRST: read every earlier answer. Never ask about an item that the person already answered anywhere in the story, and never re-ask (even reworded) any question in the ALREADY ASKED list. You MAY ask to expand a detail they gave (more specific, clarify), but only if that exact point is still vague.
- If the only remaining questions would repeat something already asked or answered, return an empty next_question and next_slot "none".
TRAFFICKING CHECK (NRM form แบบ คก.1 — Thai National Referral Mechanism screening):
If the story suggests possible human trafficking or forced labour/services (e.g. recruited by an agent/broker or online with false promises, moved/transported, debt for travel or fees, documents or phone taken, not free to leave, locked in, watched/tracked, threats (incl. threat to call police), forced to see clients or do work not agreed, no pay/withheld pay, no days off, excessive hours, moved between venues, controlled housing, drugs used to control, tattoos/branding by exploiter, under 18), set trafficking_suspected=true and, when the core facts are already clear, use next_slot="nrm" and ask ONE question from the NRM indicators below that is NOT yet answered, choosing the one most relevant to what the person said and phrasing it around their own situation (not as a checklist):
- Recruitment & travel: how they were recruited (online/agent/other); who paid travel and whether they owe a debt and how much; whether destination or job matched what was promised; whether they were held somewhere waiting to be passed on; food/water or contact with family restricted during travel.
- Control: someone controlling/watching/tracking them; free to leave or refuse; phone or personal documents taken or held by someone else (ask only "was it taken / who holds it", never the document number or immigration status); threatened (incl. with arrest/police); debt used to bind them.
- Work conditions: forced to do work/services not agreed; work differs from agreement; pay withheld or cut; excessive hours, no days off; unfair contract or contract not in their language; employer decides housing, travel and work; moved between venues; crowded/unsanitary or no housing.
- Harm & health: injuries not treated; drugs used to make them work; marks/tattoos of ownership.
- Children (if person may be under 18): travelling without parent/guardian, cannot contact parents, working in unsuitable/dangerous places.
Ask gently and trauma-informed; stop NRM questions if the person seems distressed or says they do not want to answer.
Rules: never ask for real names, national ID, passport, visa, work permit or immigration status; never blame; use "you"; max 30 words; simple everyday spoken words, like a kind person chatting face to face (not a form or official letter); no dashes, brackets or slashes; in Thai end politely with คะ/ค่ะ. If everything is covered and nothing is vague, next_question is an empty string.`;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["covered", "next_slot", "next_question", "trafficking_suspected"],
  properties: {
    covered: { type: "array", items: { type: "string", enum: [...SLOTS] } },
    next_slot: { type: "string", enum: [...SLOTS, "none"] },
    next_question: { type: "string" },
    trafficking_suspected: { type: "boolean" },
  },
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!(await rateLimit(req, "followup-question", 120, 3600))) return tooMany();
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI not configured" }, 500);

    const v = await parseBody(req, bodySchema);
    if (v.error) return v.error;
    const { text, context, lang, asked, covered_before, question, latest, train_consent, session_id } = v.data;
    const story = scrubText(`${context}\n${text}`).trim();
    if (story.length < 8) return json({ covered: [], next_slot: "what", next_question: "" });

    const examples = await loadExamples(lang);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low" },
        instructions: `${SYSTEM}\nWrite next_question in ${LANG_NAME[lang]}.${examples}`,
        input: `Story so far (de-identified):\n${story}\n\nALREADY ASKED (do not repeat):\n${asked.map((a) => "- " + scrubText(a)).join("\n") || "- none"}\n\nItems already covered earlier: ${covered_before.join(", ") || "none"}`,
        text: { format: { type: "json_schema", name: "followup", strict: true, schema } },
      }),
    });

    if (!res.ok || !res.body) {
      console.error("followup gateway status", res.status);
      if (res.status === 429) return json({ error: "busy" }, 429);
      if (res.status === 402) return json({ error: "credits" }, 402);
      return json({ error: "ai_error" }, res.status >= 400 && res.status < 600 ? res.status : 502);
    }

    // accumulate output_text deltas from the SSE stream
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
        } catch { /* ignore partial */ }
      }
    }
    const parsed = JSON.parse(out || "{}");
    let nextQ = String(parsed.next_question ?? "").slice(0, 300);
    // safety net: drop a question that is (almost) identical to one already asked
    const norm = (x: string) => x.replace(/[\s\p{P}]/gu, "").toLowerCase();
    if (nextQ && asked.some((a) => norm(a) === norm(nextQ))) nextQ = "";
    if (train_consent && session_id) {
      try {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await admin.from("ai_training_samples").insert({
          session_id, lang,
          question: scrubText(question).slice(0, 500),
          answer: scrubText(latest || text).slice(0, 3000),
          followup: nextQ,
          covered: Array.isArray(parsed.covered) ? parsed.covered : [],
          next_slot: nextQ ? (parsed.next_slot ?? "none") : "none",
        });
      } catch { /* training log is best-effort */ }
    }
    return json({
      covered: Array.isArray(parsed.covered) ? parsed.covered : [],
      next_slot: parsed.next_slot ?? "none",
      next_question: nextQ,
      trafficking_suspected: parsed.trafficking_suspected === true,
    });
  } catch (e) {
    console.error("followup error", e instanceof Error ? e.message : "unknown");
    return json({ error: "failed" }, 500);
  }
});

// Learning from staff-rated examples (consented, de-identified samples only; stays inside SWING Rights).
let exCache: { at: number; byLang: Record<string, string> } = { at: 0, byLang: {} };
async function loadExamples(lang: string): Promise<string> {
  if (Date.now() - exCache.at < 10 * 60_000 && lang in exCache.byLang) return exCache.byLang[lang];
  if (Date.now() - exCache.at >= 10 * 60_000) exCache = { at: Date.now(), byLang: {} };
  let block = "";
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await admin.from("ai_training_samples")
      .select("lang, question, answer, followup, staff_rating")
      .not("staff_rating", "is", null).neq("followup", "")
      .order("rated_at", { ascending: false }).limit(80);
    const rows = (data ?? []).sort((a, b) => Number(b.lang === lang) - Number(a.lang === lang));
    const fmt = (r: { question: string; answer: string; followup: string }) =>
      `- Q: ${r.question.slice(0, 160)}\n  A: ${r.answer.slice(0, 300)}\n  Follow-up: ${r.followup.slice(0, 200)}`;
    const good = rows.filter((r) => r.staff_rating === "good").slice(0, 6).map(fmt);
    const bad = rows.filter((r) => r.staff_rating !== "good").slice(0, 4)
      .map((r) => `${fmt(r)}  (staff: ${r.staff_rating === "repeat" ? "repeated something already answered" : "unhelpful"})`);
    if (good.length) block += `\n\nEXAMPLES STAFF RATED GOOD (imitate the style and depth, never copy details):\n${good.join("\n")}`;
    if (bad.length) block += `\n\nEXAMPLES STAFF REJECTED (avoid these patterns):\n${bad.join("\n")}`;
  } catch { /* examples are optional */ }
  exCache.byLang[lang] = block;
  return block;
}
