// Validated media upload proxy for the ANONYMOUS public intake form.
// Direct storage uploads are staff-only; public intake files are funneled
// through here: rate-limited per IP, type/size validated, path constrained.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, rateLimit, tooMany } from "../_shared/guard.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const KINDS: Record<string, { bucket: string; maxBytes: number; mimes: RegExp }> = {
  audio: {
    bucket: "case-audio",
    maxBytes: 25 * 1024 * 1024,
    mimes: /^audio\/(webm|mp4|mpeg|mp3|ogg|opus|wav|x-wav|x-m4a|m4a|aac)$/,
  },
  photo: {
    bucket: "case-photos",
    maxBytes: 10 * 1024 * 1024,
    mimes: /^image\/(jpeg|png|webp|heic|heif)$/,
  },
};

// cases/<session-uuid>/<filename> — no traversal, no nested folders
const PATH_RE = /^cases\/[A-Za-z0-9-]{6,64}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // 100 uploads/hour per IP — one case needs ~15 uploads max
  if (!(await rateLimit(req, "upload-media", 100, 3600))) return tooMany();

  try {
    const form = await req.formData();
    const kind = String(form.get("kind") || "");
    const path = String(form.get("path") || "");
    const file = form.get("file");

    const cfg = KINDS[kind];
    if (!cfg) return json({ error: "invalid kind" }, 400);
    if (!PATH_RE.test(path) || path.includes("..")) return json({ error: "invalid path" }, 400);
    if (!(file instanceof File)) return json({ error: "file required" }, 400);

    const type = (file.type || "").split(";")[0].toLowerCase().trim();
    if (!cfg.mimes.test(type)) return json({ error: "unsupported file type" }, 400);
    if (file.size <= 0 || file.size > cfg.maxBytes) return json({ error: "file too large" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.storage
      .from(cfg.bucket)
      .upload(path, file, { contentType: type, upsert: false });
    if (error) {
      console.error("storage upload failed:", error.message);
      return json({ error: "upload failed" }, 400);
    }
    return json({ path });
  } catch (e) {
    console.error("upload-case-media error", e);
    return json({ error: "upload failed" }, 500);
  }
});
