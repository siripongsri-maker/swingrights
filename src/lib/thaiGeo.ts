// Full Thai administrative areas (77 provinces / 928 districts / 7,400+ sub-districts)
// Data is lazy-loaded from /thai-geo.json so it never bloats the initial bundle.

export interface TambonRow { n: string; e: string; z?: number; c?: [number, number] }
export interface AmphoeRow { n: string; e: string; s: TambonRow[] }
export interface ProvinceRow { n: string; e: string; d: AmphoeRow[] }

let cache: ProvinceRow[] | null = null;
let inflight: Promise<ProvinceRow[]> | null = null;

export function loadThaiGeo(): Promise<ProvinceRow[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/thai-geo.json')
      .then((r) => {
        if (!r.ok) throw new Error('geo fetch failed');
        return r.json() as Promise<ProvinceRow[]>;
      })
      .then((d) => { cache = d; return d; })
      .catch((e) => { inflight = null; throw e; });
  }
  return inflight;
}

/** Rough province centroids fallback (Bangkok) for the map when no tambon coords exist. */
export const TH_CENTER: [number, number] = [13.7563, 100.5018];

export function formatArea(p?: string, d?: string, s?: string, lang: string = 'th') {
  if (lang === 'th') {
    return [s && `ต.${s}`, d && (d.startsWith('เขต') ? d : `อ.${d}`), p && (p === 'กรุงเทพมหานคร' ? p : `จ.${p}`)]
      .filter(Boolean)
      .join(' ');
  }
  // other languages: official names, comma-separated, no Thai prefixes
  return [s, d, p].filter(Boolean).join(', ');
}

// ─── Bilingual (TH/EN) fuzzy search for administrative areas ────────────────
// Normalizes Thai + Latin input, tolerates common romanization variants
// (ph/p, kh/k, th/t, ch/c, ng/n), strips Thai admin prefixes, expands
// well-known aliases (Khorat → Nakhon Ratchasima), and scores best matches.

const TH_PREFIX = /^(จังหวัด|อำเภอ|ตำบล|เขต|แขวง|จ\.|อ\.|ต\.|เทศบาล(นคร|เมือง|ตำบล)?|องค์การบริหารส่วนตำบล|อบต\.?|ทต\.?)\s*/;

/** Lowercase, strip diacritics/tone marks, strip Thai admin prefixes, collapse spaces. */
export function normalizeGeoText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // latin combining diacritics
    .replace(/[\u0e48-\u0e4b]/g, '') // thai tone marks
    .replace(TH_PREFIX, '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Collapse common Thai-romanization variants so "puket" ≈ "phuket", "korat" ≈ "khorat". */
export function simplifyRoman(s: string): string {
  return s
    .replace(/ph/g, 'p')
    .replace(/kh/g, 'k')
    .replace(/th/g, 't')
    .replace(/ch/g, 'c')
    .replace(/sh/g, 's')
    .replace(/ng/g, 'n')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'e')
    .replace(/oo/g, 'o')
    .replace(/uu/g, 'u');
}

// Well-known alternate spellings / place names → official English names.
const RAW_ALIASES: Record<string, string[]> = {
  bangkok: ['krung thep', 'krungthep mahanakhon'],
  krungthep: ['bangkok'],
  'krung thep': ['bangkok'],
  khorat: ['nakhon ratchasima'],
  korat: ['nakhon ratchasima'],
  chiengmai: ['chiang mai'],
  'chieng mai': ['chiang mai'],
  pattaya: ['bang lamung', 'chon buri'],
  pataya: ['bang lamung', 'chon buri'],
  huahin: ['prachuap khiri khan'],
  'hua hin': ['prachuap khiri khan'],
  samui: ['ko samui', 'surat thani'],
  'koh samui': ['ko samui', 'surat thani'],
  kosamui: ['ko samui', 'surat thani'],
  ayutthaya: ['phra nakhon si ayutthaya'],
  ayudhya: ['phra nakhon si ayutthaya'],
  ayothaya: ['phra nakhon si ayutthaya'],
  udon: ['udon thani'],
  ubon: ['ubon ratchathani'],
  lopburi: ['lop buri'],
  loppuri: ['lop buri'],
  burirum: ['buri ram'],
  prachinburi: ['prachin buri'],
  sakaeo: ['sa kaeo'],
  srakaew: ['sa kaeo'],
  'sa kaeo': ['srakaew'],
  puket: ['phuket'],
};

// Pre-normalize/simplify the alias map so lookups hit the simplified query form.
const GEO_ALIAS_MAP = new Map<string, string[]>(
  Object.entries(RAW_ALIASES).map(([k, vs]) => [
    simplifyRoman(normalizeGeoText(k)),
    vs.map((v) => simplifyRoman(normalizeGeoText(v))),
  ]),
);

/** Build the searchable keyword set for one area row (Thai + English + zip). */
export function geoKeywords(thai: string, eng?: string, zip?: string | number): string[] {
  const keys = new Set<string>();
  const nt = normalizeGeoText(thai);
  if (nt) {
    keys.add(nt);
    keys.add(simplifyRoman(nt));
  }
  if (eng) {
    const ne = normalizeGeoText(eng);
    if (ne) {
      keys.add(ne);
      keys.add(simplifyRoman(ne));
    }
  }
  if (zip) keys.add(String(zip));
  return [...keys];
}

/** Expand a raw query into normalized + simplified + alias forms. */
function expandGeoQueries(raw: string): string[] {
  const n = normalizeGeoText(raw);
  if (!n) return [];
  const s = simplifyRoman(n);
  const qs = new Set([n, s]);
  GEO_ALIAS_MAP.get(s)?.forEach((a) => qs.add(a));
  return [...qs];
}

/**
 * cmdk filter: returns 0–1 relevance score; cmdk sorts best matches first.
 * Exact > prefix > word-prefix > all-tokens > substring.
 */
export function geoSearchScore(_value: string, search: string, keywords?: string[]): number {
  const qs = expandGeoQueries(search);
  if (!qs.length) return 1;
  const keys = (keywords ?? []).filter(Boolean);
  if (!keys.length) return 0;
  let best = 0;
  for (const q of qs) {
    const tokens = q.split(' ').filter(Boolean);
    for (const k of keys) {
      if (k === q) { best = Math.max(best, 1); continue; }
      if (k.startsWith(q)) { best = Math.max(best, 0.9); continue; }
      const words = k.split(' ');
      if (words.some((w) => w.startsWith(q))) { best = Math.max(best, 0.75); continue; }
      if (tokens.length > 1 && tokens.every((tk) => words.some((w) => w.startsWith(tk)) || k.includes(tk))) {
        best = Math.max(best, 0.6);
        continue;
      }
      if (k.includes(q)) best = Math.max(best, 0.45);
    }
  }
  return best;
}

// ─── Search-term highlighting ───────────────────────────────────────────────
// Splits a visible label into hit/plain segments for the current query,
// using the same normalization pipeline as the search (Thai tone-mark
// stripping, case folding, romanization simplification, alias expansion)
// while mapping every match back to the original string indices.

export interface HiSeg { t: string; hit: boolean }

interface Unit { lo: number; hi: number; c: string }

const ROMAN_DIGRAPHS: [string, string][] = [
  ['ph', 'p'], ['kh', 'k'], ['th', 't'], ['ch', 'c'], ['sh', 's'], ['ng', 'n'],
  ['aa', 'a'], ['ee', 'e'], ['oo', 'o'], ['uu', 'u'],
];

/** Case/mark-insensitive skeleton of `s`; every unit maps back to original code-unit indices. */
function skeletonUnits(s: string): Unit[] {
  const raw: Unit[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/[̀-่ͯ-๋]/.test(ch)) continue; // standalone combining/tone marks
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const bc of base) {
      raw.push({ lo: i, hi: i + 1, c: /[^\p{L}\p{N} ]/u.test(bc) ? ' ' : bc });
    }
  }
  // collapse space runs into a single unit spanning the run
  const out: Unit[] = [];
  for (const u of raw) {
    const last = out[out.length - 1];
    if (u.c === ' ' && last?.c === ' ') last.hi = u.hi;
    else out.push({ ...u });
  }
  return out;
}

/** Apply the same digraph collapses as simplifyRoman, keeping index ranges. */
function simplifyUnits(units: Unit[]): Unit[] {
  const out: Unit[] = [];
  let i = 0;
  while (i < units.length) {
    const two = units[i].c + (units[i + 1]?.c ?? '');
    const rep = units[i].c !== ' ' && ROMAN_DIGRAPHS.find(([a]) => a === two);
    if (rep) {
      out.push({ lo: units[i].lo, hi: units[i + 1].hi, c: rep[1] });
      i += 2;
    } else {
      out.push(units[i]);
      i++;
    }
  }
  return out;
}

/**
 * Split `text` into segments, marking the parts that match `rawQuery`.
 * Returns null when the query is empty or nothing matches (render text as-is).
 */
export function highlightGeoText(text: string, rawQuery: string): HiSeg[] | null {
  const qs = expandGeoQueries(rawQuery);
  if (!qs.length || !text) return null;

  const base = skeletonUnits(text);
  const simp = simplifyUnits(base);
  const marks = new Array<boolean>(text.length).fill(false);

  const applyAll = (units: Unit[], q: string) => {
    const str = units.map((u) => u.c).join('');
    for (const tok of q.split(' ').filter(Boolean)) {
      let from = 0;
      for (;;) {
        const at = str.indexOf(tok, from);
        if (at < 0) break;
        for (let k = at; k < at + tok.length; k++) {
          const u = units[k];
          for (let j = u.lo; j < u.hi; j++) marks[j] = true;
        }
        from = at + tok.length;
      }
    }
  };
  // Try every expanded query form against both skeleton levels —
  // normalized forms hit the base skeleton, simplified/alias forms hit the simplified one.
  for (const q of qs) { applyAll(base, q); applyAll(simp, q); }

  if (!marks.some(Boolean)) return null;
  const segs: HiSeg[] = [];
  let i = 0;
  while (i < text.length) {
    let j = i;
    const h = marks[i];
    while (j < text.length && marks[j] === h) j++;
    segs.push({ t: text.slice(i, j), hit: h });
    i = j;
  }
  return segs;
}
