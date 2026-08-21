/**
 * Multilingual text-to-speech.
 *
 * Preferred path: the `speak-text` edge function (Lovable AI gateway), which
 * picks a high-quality voice + natural pacing per UI language and streams raw
 * PCM (24kHz) that we schedule chunk-by-chunk on an AudioContext.
 *
 * Fallback path: the device's built-in speechSynthesis with a per-language
 * voice preference (Natural/Google/network voices first) and a per-language
 * speaking rate. Used when offline or when the edge function fails.
 */
import { SPEECH_LOCALE } from '@/i18n';
import type { Lang } from '@/i18n';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const TTS_URL = `${SUPABASE_URL}/functions/v1/speak-text`;
const MAX_CLOUD_CHARS = 1400;

/** Natural reading pace per language for the device-speech fallback. */
const DEVICE_RATE: Record<Lang, number> = {
  th: 0.92,
  en: 1.0,
  my: 0.85,
  km: 0.85,
  lo: 0.85,
};

export interface SpeakHandle {
  stop: () => void;
  /** Resolves when playback has fully ended (or was stopped/failed). Never rejects. */
  done: Promise<void>;
}

// ---------- PCM playback ----------

let sharedCtx: AudioContext | null = null;
function audioCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext({ sampleRate: 24000 });
  }
  return sharedCtx;
}

class PcmPlayer {
  private ctx: AudioContext;
  private playhead = 0;
  private pending = new Uint8Array(0);
  private sources: AudioBufferSourceNode[] = [];

  constructor() {
    this.ctx = audioCtx();
  }

  async ensureRunning() {
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
  }

  /** Schedule a chunk of raw 24kHz 16-bit signed LE mono PCM. */
  push(incoming: Uint8Array) {
    const bytes = new Uint8Array(this.pending.length + incoming.length);
    bytes.set(this.pending);
    bytes.set(incoming, this.pending.length);
    const usable = bytes.length - (bytes.length % 2);
    this.pending = bytes.slice(usable);
    if (usable === 0) return;
    const samples = new Int16Array(bytes.buffer, 0, usable / 2);
    const floats = Float32Array.from(samples, (s) => s / 32768);
    const buffer = this.ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    if (this.playhead === 0) {
      // Schedule slightly ahead: at exactly currentTime the device has not
      // started yet and the first milliseconds get dropped.
      this.playhead = this.ctx.currentTime + 0.08;
    } else {
      this.playhead = Math.max(this.playhead, this.ctx.currentTime);
    }
    source.start(this.playhead);
    this.playhead += buffer.duration;
    this.sources.push(source);
  }

  stopAll() {
    this.sources.forEach((s) => {
      try { s.stop(); } catch { /* already stopped */ }
    });
    this.playhead = 0;
  }

  /** Wait until all scheduled audio has actually played out. */
  async drain(isAborted: () => boolean) {
    while (this.playhead > 0 && this.playhead > this.ctx.currentTime + 0.05) {
      if (isAborted()) return;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

// ---------- In-memory phrase cache (identical text+lang re-plays for free) ----------

const pcmCache = new Map<string, Uint8Array>();
function cacheSet(key: string, bytes: Uint8Array) {
  if (pcmCache.size >= 40) {
    const oldest = pcmCache.keys().next().value;
    if (oldest !== undefined) pcmCache.delete(oldest);
  }
  pcmCache.set(key, bytes);
}

// ---------- SSE reading ----------

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function readSse(body: ReadableStream<Uint8Array>, onData: (data: string) => void) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of raw.split('\n')) {
        if (line.startsWith('data:')) onData(line.slice(5).trim());
      }
    }
  }
}

// ---------- Cloud (edge function) path ----------

async function cloudSpeak(
  text: string,
  lang: Lang,
  signal: AbortSignal,
  exposePlayer: (p: PcmPlayer) => void,
): Promise<void> {
  const player = new PcmPlayer();
  exposePlayer(player);
  await player.ensureRunning();
  if (signal.aborted) throw new Error('aborted');

  const key = `${lang}:${text}`;
  const cached = pcmCache.get(key);
  if (cached) {
    player.push(cached);
    await player.drain(() => signal.aborted);
    return;
  }

  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ text, lang }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`speak-text ${res.status}`);

  const collected: Uint8Array[] = [];
  let gotAudio = false;
  await readSse(res.body, (data) => {
    let payload: { type?: string; audio?: string };
    try { payload = JSON.parse(data); } catch { return; }
    if (payload.type === 'speech.audio.delta' && payload.audio) {
      const bytes = b64ToBytes(payload.audio);
      collected.push(bytes);
      player.push(bytes);
      gotAudio = true;
    }
  });
  if (signal.aborted) return;
  if (!gotAudio) throw new Error('no audio in stream');
  cacheSet(key, concat(collected));
  await player.drain(() => signal.aborted);
}

// ---------- Device speech fallback ----------

function pickDeviceVoice(lang: Lang): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const prefix = (SPEECH_LOCALE[lang] || 'th-TH').split('-')[0].toLowerCase();
  const matching = synth
    .getVoices()
    .filter((v) => (v.lang || '').toLowerCase().replace(/_/g, '-').startsWith(prefix));
  if (!matching.length) return null;
  return (
    matching.find((v) => /natural|neural|online|premium/i.test(v.name)) ||
    matching.find((v) => /google/i.test(v.name)) ||
    matching.find((v) => !v.localService) ||
    matching[0]
  );
}

// Prime the voice list — getVoices() is empty until voiceschanged on some browsers.
if (typeof window !== 'undefined' && window.speechSynthesis) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
  } catch { /* noop */ }
}

function deviceSpeak(text: string, lang: Lang, onEnd: () => void): (() => void) | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  let ended = false;
  const finish = () => { if (!ended) { ended = true; onEnd(); } };
  try { synth.cancel(); } catch { /* noop */ }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH_LOCALE[lang] || 'th-TH';
  u.rate = DEVICE_RATE[lang] ?? 0.95;
  u.pitch = 1.0;
  const voice = pickDeviceVoice(lang);
  if (voice) u.voice = voice;
  u.onend = finish;
  u.onerror = finish;
  synth.speak(u);
  return () => {
    try { synth.cancel(); } catch { /* noop */ }
    finish();
  };
}

// ---------- Public API ----------

/**
 * Speak `text` in `lang`. Tries the high-quality streamed cloud voice first,
 * falls back to the device voice (with per-language voice + rate) on failure.
 */
export function speakText(text: string, lang: Lang): SpeakHandle {
  const ctrl = new AbortController();
  let player: PcmPlayer | null = null;
  let fallbackStop: (() => void) | null = null;

  const done = (async () => {
    if (text.length <= MAX_CLOUD_CHARS) {
      try {
        await cloudSpeak(text, lang, ctrl.signal, (p) => { player = p; });
        return;
      } catch {
        if (ctrl.signal.aborted) return;
        // fall through to device speech
      }
    }
    await new Promise<void>((resolve) => {
      fallbackStop = deviceSpeak(text, lang, resolve);
      if (!fallbackStop) resolve();
    });
  })().catch(() => { /* never reject */ });

  return {
    done,
    stop: () => {
      ctrl.abort();
      player?.stopAll();
      fallbackStop?.();
    },
  };
}
