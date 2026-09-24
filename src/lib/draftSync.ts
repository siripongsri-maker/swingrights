/**
 * Server-side draft sync: uploads each voice clip / photo as soon as it exists
 * and saves de-identified answers to case_drafts, so nothing is lost if the
 * device dies mid-conversation. Names/contacts never go into the draft.
 */
import { supabase } from '@/integrations/supabase/client';
import { uploadCaseMedia } from '@/lib/uploadMedia';

const TOKEN_KEY = 'swing-draft-tokens';
const uploaded = new WeakMap<Blob, Promise<string | null>>();

function tokenFor(draftId: string): string {
  try {
    const all = JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}');
    if (!all[draftId]) {
      const b = crypto.getRandomValues(new Uint8Array(32));
      all[draftId] = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
    }
    return all[draftId];
  } catch { return ''; }
}

export function extFor(type: string, kind: 'audio' | 'photo') {
  if (kind === 'photo') return 'jpg';
  if (/mp4|m4a|aac/.test(type)) return 'm4a';
  if (/ogg|opus/.test(type)) return 'ogg';
  if (/mpeg|mp3/.test(type)) return 'mp3';
  if (/wav/.test(type)) return 'wav';
  return 'webm';
}

/** Upload a blob once (cached per blob). Returns storage path or null (retry later). */
export function uploadOnce(kind: 'audio' | 'photo', folder: string, blob: Blob, base: string): Promise<string | null> {
  const hit = uploaded.get(blob);
  if (hit) return hit;
  const safe = base.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 60) || kind;
  const path = `cases/${folder}/${safe}-${Date.now()}.${extFor(blob.type, kind)}`;
  const p = uploadCaseMedia(kind, path, blob).then((r) => r?.path ?? null);
  uploaded.set(blob, p);
  p.then((r) => { if (!r) uploaded.delete(blob); }); // allow retry on failure
  return p;
}

export interface DraftMedia {
  audio: { qIndex: number; path: string; question: string }[];
  photos: { path: string; name: string }[];
}

export async function uploadAllMedia(
  folder: string,
  audio: { blob: Blob | null; question?: string; base: string }[],
  photos: { blob: Blob; name: string }[],
): Promise<DraftMedia> {
  const a = await Promise.all(audio.map(async (x, i) => {
    if (!x.blob) return null;
    const path = await uploadOnce('audio', folder, x.blob, x.base);
    return path ? { qIndex: i, path, question: x.question || '' } : null;
  }));
  const p = await Promise.all(photos.map(async (x, i) => {
    const path = await uploadOnce('photo', folder, x.blob, `photo-${i + 1}`);
    return path ? { path, name: x.name } : null;
  }));
  return { audio: a.filter(Boolean) as DraftMedia['audio'], photos: p.filter(Boolean) as DraftMedia['photos'] };
}

export async function saveDraft(draftId: string, data: Record<string, unknown>, media: DraftMedia, language: string, source: 'staff' | 'self') {
  const clean = { ...data };
  delete clean.reporter; delete clean.victim;
  const { error } = await supabase.rpc('save_case_draft' as never, {
    _draft_id: draftId, _token: tokenFor(draftId), _data: clean, _media: media, _language: language, _source: source,
  } as never);
  if (error) throw error;
}

export async function finishDraft(draftId: string, caseCode: string) {
  try {
    await supabase.rpc('finish_case_draft' as never, { _draft_id: draftId, _token: tokenFor(draftId), _case_code: caseCode } as never);
  } catch { /* non-critical */ }
}
