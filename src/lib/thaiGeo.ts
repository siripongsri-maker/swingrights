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

/** If the query contains digits, return the digits alone ("10-110"/"10 110" → "10110") for flexible postcode matching. */
function digitForm(q: string): string | null {
  if (!/\d/.test(q)) return null;
  const d = q.replace(/\D+/g, '');
  return d && d !== q ? d : null;
}

/** Expand a raw query into normalized + simplified + alias + digit-collapsed forms. */
function expandGeoQueries(raw: string): string[] {
  const n = normalizeGeoText(raw);
  if (!n) return [];
  const s = simplifyRoman(n);
  const qs = new Set([n, s]);
  GEO_ALIAS_MAP.get(s)?.forEach((a) => qs.add(a));
  const df = digitForm(n);
  if (df) qs.add(df);
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

/** Why an option matched: exact > prefix > word > token > partial; 'alias' when only a nickname/alias form matched. */
export type GeoMatchKind = 'exact' | 'prefix' | 'word' | 'token' | 'partial' | 'alias';

export function geoSearchReason(search: string, keywords?: string[]): GeoMatchKind | null {
  const raw = normalizeGeoText(search);
  if (!raw) return null;
  const keys = (keywords ?? []).filter(Boolean);
  if (!keys.length) return null;
  const rankQ = (q: string): GeoMatchKind | null => {
    const tokens = q.split(' ').filter(Boolean);
    let best: GeoMatchKind | null = null;
    for (const k of keys) {
      if (k === q) return 'exact';
      if (k.startsWith(q)) { if (!best) best = 'prefix'; continue; }
      const words = k.split(' ');
      if (words.some((w) => w.startsWith(q))) { if (!best || best === 'partial') best = 'word'; continue; }
      if (tokens.length > 1 && tokens.every((tk) => words.some((w) => w.startsWith(tk)) || k.includes(tk))) {
        if (!best || best === 'partial') best = 'token';
        continue;
      }
      if (k.includes(q) && !best) best = 'partial';
    }
    return best;
  };
  const direct = [raw, simplifyRoman(raw)];
  const df = digitForm(raw);
  if (df) direct.push(df);
  for (const q of direct) {
    const r = rankQ(q);
    if (r) return r;
  }
  for (const a of GEO_ALIAS_MAP.get(simplifyRoman(raw)) ?? []) if (rankQ(a)) return 'alias';
  return null;
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

// Combining/above/below marks dropped by the search normalization
// (Thai sara i/ii/…, mai han akat, thanthakhat, tone marks, latin diacritics).
const MARK_CLASS = /[\u0300-\u036f\u0e31\u0e34-\u0e3a\u0e47-\u0e4b]/;

/** Case/mark-insensitive skeleton of `s`; every unit maps back to original code-unit indices. */
function skeletonUnits(s: string): Unit[] {
  const raw: Unit[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (MARK_CLASS.test(ch)) continue; // combining/vowel/tone marks attach to neighbours
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
  // Absorb combining marks sitting between/next to hits so a highlighted
  // syllable never splits (e.g. "เชียง" stays one segment even though the
  // search normalization drops ี).
  for (let i = 0; i < text.length; i++) {
    if (!marks[i] && text[i] === ' ' && marks[i - 1] && marks[i + 1]) marks[i] = true;
    if (!marks[i] && MARK_CLASS.test(text[i]) && (marks[i - 1] || marks[i + 1])) marks[i] = true;
  }
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

// ─── Geolocation helpers ─────────────────────────────────────────────────────

/** Centroid of a province = mean of its tambon centers. Returns [lat, lng] or null. */
export function provinceCenter(p: ProvinceRow): [number, number] | null {
  let lat = 0, lng = 0, n = 0;
  for (const d of p.d) for (const s of d.s) {
    if (s.c) { lat += s.c[0]; lng += s.c[1]; n++; }
  }
  return n ? [lat / n, lng / n] : null;
}

/** Haversine distance between two [lat, lng] points, in km. */
export function distKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Nearest province to a coordinate, measured against every tambon center
 * (more accurate than province centroids near borders). Provinces whose
 * tambons lack coordinates — currently only Bangkok — fall back to a
 * known city-center point (TH_CENTER) so they still participate.
 */
export function nearestProvince(geo: ProvinceRow[], lat: number, lng: number): { province: string; km: number } | null {
  let best: { province: string; km: number } | null = null;
  const here: [number, number] = [lat, lng];
  for (const p of geo) {
    let minKm = Infinity;
    for (const d of p.d) {
      for (const s of d.s) {
        if (!s.c) continue;
        const km = distKm(here, s.c);
        if (km < minKm) minKm = km;
      }
    }
    if (minKm === Infinity) {
      // No tambon coords in this province — only Bangkok in the current dataset.
      if (p.n !== 'กรุงเทพมหานคร') continue;
      minKm = distKm(here, TH_CENTER);
    }
    if (!best || minKm < best.km) best = { province: p.n, km: minKm };
  }
  return best;
}

/**
 * Offline reverse-geocode: nearest tambon center → province / district / subdistrict / zip.
 * Runs in the browser only (no coordinates are sent to any third party).
 * Returns null if the point is far outside Thailand (> maxKm from any known point).
 * Bangkok has no tambon coords in the dataset, so it resolves to province only.
 */
export function reverseGeocode(
  geo: ProvinceRow[], lat: number, lng: number, maxKm = 40,
): { province: string; district: string; subdistrict: string; zip: string; km: number } | null {
  const here: [number, number] = [lat, lng];
  let best: { province: string; district: string; subdistrict: string; zip: string; km: number } | null = null;
  for (const p of geo) for (const d of p.d) for (const s of d.s) {
    if (!s.c) continue;
    const km = distKm(here, s.c);
    if (!best || km < best.km) best = { province: p.n, district: d.n, subdistrict: s.n, zip: s.z ? String(s.z) : '', km };
  }
  const bkk = distKm(here, TH_CENTER);
  if (bkk < 25 && (!best || bkk < best.km)) best = { province: 'กรุงเทพมหานคร', district: '', subdistrict: '', zip: '', km: bkk };
  return best && best.km <= maxKm ? best : null;
}

/**
 * Resolve a province (+ optional district) name to an approximate [lat, lng]
 * using local tambon centers — offline, no third-party calls.
 * District match wins; falls back to the province centroid. Bangkok (no
 * tambon coords in the dataset) falls back to TH_CENTER.
 */
export function resolveAreaCoords(
  geo: ProvinceRow[], province?: string | null, district?: string | null,
): [number, number] | null {
  if (!province) return null;
  // "กรุงเทพฯ" / "กรุงเทพ" → canonical "กรุงเทพมหานคร" before matching
  const np = normalizeGeoText(province).replace(/^กรุงเทพ.*$/, 'กรุงเทพมหานคร');
  if (!np) return null;
  const prov = geo.find((p) => {
    const pn = normalizeGeoText(p.n);
    return pn === np || pn.includes(np) || np.includes(pn);
  });
  if (!prov) return null;
  if (district) {
    const nd = normalizeGeoText(district);
    const dist = prov.d.find((d) => {
      const dn = normalizeGeoText(d.n);
      return dn === nd || dn.includes(nd) || nd.includes(dn);
    });
    if (dist) {
      let lat = 0, lng = 0, n = 0;
      for (const s of dist.s) if (s.c) { lat += s.c[0]; lng += s.c[1]; n++; }
      if (n) return [lat / n, lng / n];
    }
  }
  return provinceCenter(prov) ?? (prov.n === 'กรุงเทพมหานคร' ? TH_CENTER : null);
}
