/**
 * Local case vault — keeps MANY cases on-device (not just the latest draft).
 *
 * Two kinds of records:
 *  - 'draft'  : an unfinished intake session, snapshotted while the user types
 *  - 'failed' : a completed case whose server submission failed (kept forever until resent)
 *
 * Text lives in localStorage (survives IndexedDB quirks / private mode); binary
 * audio + photos live in IndexedDB alongside it.
 */
import { get, set, del, keys, createStore } from 'idb-keyval';
import { DRAFT_TEXT_KEY, DRAFT_META_KEY } from '@/lib/draft';

const blobStore = createStore('swing-cases', 'blobs');
const INDEX_KEY = 'swing-case-vault-index';
const REC_PREFIX = 'swing-case-vault:';

export type LocalCaseKind = 'draft' | 'failed';

export interface LocalCaseMeta {
  id: string;
  kind: LocalCaseKind;
  createdAt: number;
  updatedAt: number;
  label: string;          // human hint: victim/reporter name or "ไม่ระบุชื่อ"
  area: string;           // province / branch
  answers: number;        // how many questions answered
  error?: string;         // last submission error (kind = 'failed')
  attempts?: number;
}

export interface LocalCaseRecord extends LocalCaseMeta {
  state?: any;            // intake text state snapshot (draft)
  payload?: any;          // ready-to-send submit_case payload (failed)
}

export interface LocalCaseBlobs {
  audio: (Blob | null)[];
  photos: { blob: Blob; name: string }[];
}

/* ------------------------------- index ------------------------------- */

function readIndex(): LocalCaseMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeIndex(list: LocalCaseMeta[]) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

function describe(state: any, payload: any): Pick<LocalCaseMeta, 'label' | 'area' | 'answers'> {
  const src = state || payload || {};
  const name = src?.victim?.name || src?.reporter?.name || '';
  const p = src?.profile || {};
  const answers = Array.isArray(src?.answers) ? src.answers.filter((a: any) => a?.transcript?.trim()).length : 0;
  return {
    label: name?.trim() ? name.trim() : 'ไม่ระบุชื่อ',
    area: [p.province || p.branch, p.district].filter(Boolean).join(' / ') || 'ไม่ระบุพื้นที่',
    answers,
  };
}

/* ------------------------------- write ------------------------------- */

export async function saveLocalCase(opts: {
  id: string;
  kind: LocalCaseKind;
  state?: any;
  payload?: any;
  audio?: (Blob | null)[];
  photos?: { blob: Blob; name: string }[];
  error?: string;
}): Promise<void> {
  const now = Date.now();
  const list = readIndex();
  const prev = list.find((r) => r.id === opts.id);

  const meta: LocalCaseMeta = {
    id: opts.id,
    kind: opts.kind,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    ...describe(opts.state, opts.payload),
    error: opts.error ?? prev?.error,
    attempts: opts.kind === 'failed' ? (prev?.attempts ?? 0) + (opts.error ? 1 : 0) : prev?.attempts,
  };

  try {
    localStorage.setItem(REC_PREFIX + opts.id, JSON.stringify({
      ...meta,
      state: opts.state ?? undefined,
      payload: opts.payload ?? undefined,
    }));
  } catch { /* quota — index still records the attempt */ }

  writeIndex([meta, ...list.filter((r) => r.id !== opts.id)]);

  if (opts.audio || opts.photos) {
    try {
      await set(opts.id, {
        audio: (opts.audio || []).map((b) => b ?? null),
        photos: (opts.photos || []).map((p) => ({ blob: p.blob, name: p.name })),
      } as LocalCaseBlobs, blobStore);
    } catch { /* ignore */ }
  }
}

/* ------------------------------- read -------------------------------- */

export function listLocalCases(): LocalCaseMeta[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getLocalCase(id: string): LocalCaseRecord | null {
  try {
    const raw = localStorage.getItem(REC_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function getLocalCaseBlobs(id: string): Promise<LocalCaseBlobs> {
  try {
    const v = (await get(id, blobStore)) as LocalCaseBlobs | undefined;
    return { audio: v?.audio || [], photos: v?.photos || [] };
  } catch { return { audio: [], photos: [] }; }
}

export async function deleteLocalCase(id: string) {
  try { localStorage.removeItem(REC_PREFIX + id); } catch { /* ignore */ }
  writeIndex(readIndex().filter((r) => r.id !== id));
  try { await del(id, blobStore); } catch { /* ignore */ }
}

/* --------------------------- legacy rescue ---------------------------- */

/**
 * Pull any pre-vault leftovers into the vault:
 *  - the single legacy localStorage draft (swing-intake-draft)
 *  - orphan blobs in the old IndexedDB store (swing-draft/blobs)
 * Safe to run on every load — it is idempotent.
 */
export async function importLegacyDraft(): Promise<number> {
  let imported = 0;
  const list = readIndex();

  try {
    const raw = localStorage.getItem(DRAFT_TEXT_KEY);
    if (raw && !list.some((r) => r.id === 'legacy-draft')) {
      const parsed = JSON.parse(raw);
      const state = parsed?.state ?? parsed;
      const hasContent = state && (
        state?.victim?.name || state?.reporter?.name ||
        (Array.isArray(state?.answers) && state.answers.some((a: any) => a?.transcript?.trim()))
      );
      if (hasContent) {
        const legacyStore = createStore('swing-draft', 'blobs');
        let audio: (Blob | null)[] = [];
        let photos: { blob: Blob; name: string }[] = [];
        try { audio = ((await get('audio', legacyStore)) as (Blob | null)[]) || []; } catch { /* ignore */ }
        try { photos = ((await get('photos', legacyStore)) as { blob: Blob; name: string }[]) || []; } catch { /* ignore */ }

        const meta = localStorage.getItem(DRAFT_META_KEY);
        await saveLocalCase({ id: 'legacy-draft', kind: 'draft', state, audio, photos });
        if (meta) {
          try {
            const { updatedAt } = JSON.parse(meta);
            const idx = readIndex().map((r) => (r.id === 'legacy-draft' ? { ...r, createdAt: updatedAt, updatedAt } : r));
            writeIndex(idx);
          } catch { /* ignore */ }
        }
        imported++;
      }
    }
  } catch { /* ignore */ }

  return imported;
}

/** Any other browser keys that look like abandoned intake data (older builds). */
export async function scanOrphanBlobStores(): Promise<number> {
  try {
    const ks = await keys(blobStore);
    return ks.length;
  } catch { return 0; }
}

/* ------------------------------ export -------------------------------- */

export function exportLocalCasesJson(): string {
  const records = listLocalCases().map((m) => getLocalCase(m.id) || m);
  return JSON.stringify({ exportedAt: new Date().toISOString(), count: records.length, records }, null, 2);
}

export function downloadLocalCasesJson() {
  const blob = new Blob([exportLocalCasesJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `swing-local-cases-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
