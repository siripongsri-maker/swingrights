// Server-side multilingual speech-to-text via Lovable AI Gateway (works on iOS
// Safari where Web Speech API is unavailable). Uses the dedicated transcription
// model + endpoint. Privacy: only the raw audio file is forwarded — no
// identifying case data is sent.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, rateLimit, tooMany } from "../_shared/guard.ts";

const MAX_BYTES = 14 * 1024 * 1024; // gemini-3.5-transcribe caps files at 14 MB
const ALLOWED = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/aac", "video/mp4", "video/webm"];
const EXT: Record<string, string> = {
  "audio/webm": "webm", "video/webm": "webm", "audio/mp4": "m4a", "video/mp4": "m4a", "audio/mpeg": "mp3",
  "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/aac": "aac",
};
// UI lang -> BCP-47 language hint for the transcription model.
const LANG: Record<string, string> = { th: "th", en: "en", my: "my", km: "km", lo: "lo" };

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
    if (file.size > MAX_BYTES) return json({ error: "ไฟล์เสียงใหญ่เกินไป (เกิน 14MB)" }, 413);

    const langRaw = form.get("lang");
    const language = typeof langRaw === "string" ? LANG[langRaw] : undefined;

    const mime = (file.type || "audio/webm").split(";")[0];
    if (!ALLOWED.includes(mime)) return json({ error: `ไม่รองรับไฟล์ชนิด ${mime}` }, 400);

    // The transcription model rejects video/* parts — always upload as audio/*.
    const uploadMime = mime.startsWith("video/") ? (mime === "video/webm" ? "audio/webm" : "audio/mp4") : mime;
    const upload = new File([await file.arrayBuffer()], `recording.${EXT[mime] ?? "webm"}`, { type: uploadMime });

    const upstream = new FormData();
    upstream.set("file", upload);
    upstream.set("model", "google/gemini-3.5-transcribe");
    if (language) upstream.set("language", language);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Lovable-API-Key": LOVABLE_API_KEY },
      body: upstream,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("transcription failed", res.status, msg.slice(0, 300));
      if (res.status === 429) return json({ error: "ผู้ใช้งานหนาแน่น กรุณาลองใหม่ในอีกสักครู่" }, 429);
      if (res.status === 402) return json({ error: "เครดิต AI หมด กรุณาเติมเครดิตใน Workspace" }, 402);
      return json({ error: "ถอดความไม่สำเร็จ" }, res.status);
    }

    const data = await res.json();
    const text = String(data?.text ?? "").trim();
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
