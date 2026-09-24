// Live follow-up questions while a complaint is being told by voice.
// Checks the (de-identified) story against the SWING complaint form (แบบบันทึกรับเรื่องร้องเรียน)
// and returns which narrative items are still missing plus ONE gentle next question.
// Never asks for names, ID numbers, passport or immigration status. Payloads are never logged.
import { corsHeaders, rateLimit, tooMany, scrubText } from "../_shared/guard.ts";
import { parseBody, z } from "../_shared/schemas.ts";

const SLOTS = ["what", "when", "where", "who", "harm", "evidence", "reported", "help"] as const;

const bodySchema = z.object({
  text: z.string().max(8000),
  context: z.string().max(6000).optional().default(""),
  lang: z.enum(["th", "en", "my", "km", "lo"]).optional().default("th"),
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
Mark an item covered only if the story clearly states it. Then write ONE short, warm, non-judgemental follow-up question about the most important missing item (priority order as listed).
Rules: never ask for real names, national ID, passport, visa, work permit or immigration status; never blame; use "you"; max 25 words; simple words. If everything is covered, next_question is an empty string.`;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["covered", "next_slot", "next_question"],
  properties: {
    covered: { type: "array", items: { type: "string", enum: [...SLOTS] } },
    next_slot: { type: "string", enum: [...SLOTS, "none"] },
    next_question: { type: "string" },
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
    const { text, context, lang } = v.data;
    const story = scrubText(`${context}\n${text}`).trim();
    if (story.length < 8) return json({ covered: [], next_slot: "what", next_question: "" });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low" },
        instructions: `${SYSTEM}\nWrite next_question in ${LANG_NAME[lang]}.`,
        input: `Story so far (de-identified):\n${story}`,
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
    return json({
      covered: Array.isArray(parsed.covered) ? parsed.covered : [],
      next_slot: parsed.next_slot ?? "none",
      next_question: String(parsed.next_question ?? "").slice(0, 300),
    });
  } catch (e) {
    console.error("followup error", e instanceof Error ? e.message : "unknown");
    return json({ error: "failed" }, 500);
  }
});
