// Server-side Thai speech-to-text via Lovable AI Gateway (works on iOS Safari where Web Speech API is unavailable).
// Privacy: only the raw audio file is forwarded — no identifying case data is sent.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, rateLimit, tooMany } from "../_shared/guard.ts";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/aac", "video/mp4"];
const EXT: Record<string, string> = {
  "audio/webm": "webm", "audio/mp4": "mp4", "video/mp4": "mp4", "audio/mpeg": "mp3",
  "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/aac": "aac",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!(await rateLimit(req, "transcribe-audio", 60, 3600))) return tooMany();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ error: "ไม่พบไฟล์เสียง" }, 400);
    }
    if (file.size === 0) return json({ error: "ไฟล์เสียงว่างเปล่า กรุณาอัดใหม่" }, 400);
    if (file.size > MAX_BYTES) return json({ error: "ไฟล์เสียงใหญ่เกินไป (เกิน 20MB)" }, 413);

    const LANG_HINT: Record<string, string> = {
      th: "The speaker most likely speaks Thai. Write Thai in Thai script.",
      en: "The speaker most likely speaks English.",
      my: "The speaker most likely speaks Burmese (Myanmar). Write Burmese in Myanmar script (e.g. မြန်မာ), never Thai script.",
      km: "The speaker most likely speaks Khmer. Write Khmer in Khmer script (e.g. ខ្មែរ), never Thai script.",
      lo: "The speaker most likely speaks Lao. Write Lao in Lao script (e.g. ລາວ ຂ້ອຍ), never Thai script — Lao and Thai sound similar but Lao must be written in Lao letters.",
    };
    const langRaw = form.get("lang");
    const hint = typeof langRaw === "string" && LANG_HINT[langRaw] ? LANG_HINT[langRaw] + " " : "";

    const mime = (file.type || "audio/webm").split(";")[0];
    if (!ALLOWED.includes(mime)) return json({ error: `ไม่รองรับไฟล์ชนิด ${mime}` }, 400);

    const FMT: Record<string, string> = {
      "audio/webm": "webm", "audio/mp4": "m4a", "video/mp4": "m4a", "audio/mpeg": "mp3",
      "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/aac": "aac",
    };
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const b64 = btoa(bin);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: hint + "Transcribe this recording word for word, in the language actually spoken (Thai, English, Burmese, Khmer or Lao), using that language's own script. Keep every word, do not cut, summarize, translate or add anything. Add natural punctuation/spaces between sentences. Output only the transcript text. If there is no speech, output nothing." },
            { type: "input_audio", input_audio: { data: b64, format: FMT[mime] ?? "webm" } },
          ],
        }],
      }),
    });

    if (!res.ok) {
      console.error("transcription failed status", res.status);
      if (res.status === 429) return json({ error: "ผู้ใช้งานหนาแน่น กรุณาลองใหม่ในอีกสักครู่" }, 429);
      if (res.status === 402) return json({ error: "เครดิต AI หมด กรุณาเติมเครดิตใน Workspace" }, 402);
      return json({ error: "ถอดความไม่สำเร็จ" }, res.status);
    }

    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    return json({ text }, 200);
  } catch (e) {
    console.error("transcribe-audio error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
