// High-quality multilingual text-to-speech via Lovable AI Gateway.
// Picks a voice + speaking style per UI language and streams raw PCM (24kHz)
// as SSE so playback on the client starts while audio is still generating.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, rateLimit, tooMany } from "../_shared/guard.ts";

const MAX_CHARS = 1500;

interface LangCfg { voice: string; style: string }

// Gemini TTS: natural, expressive voices. Tone/pacing steering goes in the
// spoken text prefix (the gateway strips systemInstruction).
const LANG: Record<string, LangCfg> = {
  th: { voice: "Kore", style: "พูดภาษาไทยด้วยน้ำเสียงอบอุ่น เป็นกันเอง เป็นธรรมชาติเหมือนคุยกับเพื่อน จังหวะปกติ ไม่ช้า" },
  en: { voice: "Kore", style: "Say in a warm, friendly, natural conversational tone at a normal pace" },
  my: { voice: "Kore", style: "Say in Burmese with a warm, natural conversational tone at a normal pace" },
  km: { voice: "Kore", style: "Say in Khmer with a warm, natural conversational tone at a normal pace" },
  lo: { voice: "Kore", style: "Say in Lao with a warm, natural conversational tone at a normal pace" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!(await rateLimit(req, "speak-text", 240, 3600))) return tooMany();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "TTS is not configured (missing API key)" }, 500);

    let body: { text?: unknown; lang?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const lang = typeof body.lang === "string" ? body.lang : "th";
    if (!text) return json({ error: "Missing text" }, 400);
    if (text.length > MAX_CHARS) return json({ error: `Text too long (max ${MAX_CHARS} chars)` }, 400);
    const cfg = LANG[lang] ?? LANG.th;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-tts-preview",
        contents: [{ role: "user", parts: [{ text: `${cfg.style}: ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice } } },
        },
        stream_format: "sse",
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("speak-text upstream failed", res.status, msg.slice(0, 300));
      if (res.status === 429) return json({ error: "มีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้ง" }, 429);
      if (res.status === 402 || res.status === 403) {
        return json({ error: "เครดิต AI ไม่เพียงพอหรือถูกจำกัด กรุณาตรวจสอบ Workspace" }, res.status);
      }
      if (res.status === 400) return json({ error: "คำขออ่านเสียงไม่ถูกต้อง" }, 400);
      return json({ error: "สร้างเสียงอ่านไม่สำเร็จ" }, 502);
    }

    // Pass the SSE stream through untouched — do not buffer, or progressive
    // playback breaks.
    return new Response(res.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error("speak-text error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
