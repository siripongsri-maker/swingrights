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

export function formatArea(p?: string, d?: string, s?: string) {
  return [s && `ต.${s}`, d && (d.startsWith('เขต') ? d : `อ.${d}`), p && (p === 'กรุงเทพมหานคร' ? p : `จ.${p}`)]
    .filter(Boolean)
    .join(' ');
}
