/**
 * Phase 0.5 / 0.9 — draft autosave.
 * Text answers live in localStorage (via zustand persist); audio/photo blobs live in IndexedDB.
 * Everything can be wiped instantly by the quick-exit button.
 */
import { get, set, del, clear, createStore } from 'idb-keyval';

const store = createStore('swing-draft', 'blobs');

export const DRAFT_TEXT_KEY = 'swing-intake-draft';
export const DRAFT_META_KEY = 'swing-intake-draft-meta';

export interface DraftMeta { updatedAt: number }

export function markDraftSaved() {
  try {
    localStorage.setItem(DRAFT_META_KEY, JSON.stringify({ updatedAt: Date.now() } as DraftMeta));
  } catch { /* storage may be unavailable in private mode */ }
}

export function readDraftMeta(): DraftMeta | null {
  try {
    const raw = localStorage.getItem(DRAFT_META_KEY);
    return raw ? (JSON.parse(raw) as DraftMeta) : null;
  } catch { return null; }
}

export async function saveAudioBlobs(blobs: (Blob | null)[]) {
  try { await set('audio', blobs.map((b) => b ?? null), store); } catch { /* ignore */ }
}
export async function loadAudioBlobs(): Promise<(Blob | null)[]> {
  try { return ((await get('audio', store)) as (Blob | null)[]) ?? []; } catch { return []; }
}

export async function savePhotoBlobs(photos: { blob: Blob; name: string }[]) {
  try { await set('photos', photos.map((p) => ({ blob: p.blob, name: p.name })), store); } catch { /* ignore */ }
}
export async function loadPhotoBlobs(): Promise<{ blob: Blob; name: string }[]> {
  try { return ((await get('photos', store)) as { blob: Blob; name: string }[]) ?? []; } catch { return []; }
}

export async function clearDraft() {
  try { localStorage.removeItem(DRAFT_TEXT_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(DRAFT_META_KEY); } catch { /* ignore */ }
  try { await clear(store); } catch { /* ignore */ }
  try { await del('audio', store); await del('photos', store); } catch { /* ignore */ }
}
