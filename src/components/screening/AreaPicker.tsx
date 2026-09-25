import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Info, Languages, Loader2, LocateFixed, MapPin, MapPinOff, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPicker } from './MapPicker';
import { loadThaiGeo, formatArea, geoKeywords, geoSearchScore, geoSearchReason, highlightGeoText, nearestProvince, reverseGeocode, type ProvinceRow } from '@/lib/thaiGeo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';


export interface AreaValue {
  province: string;
  district: string;
  subdistrict: string;
  zip?: string;
  geo?: { lat: number; lng: number } | null;
}

interface ComboOption {
  v: string;
  sub?: string;
  zip?: string;
  keywords?: string[];
}

/** Renders `text` with the parts matching `q` highlighted (TH/EN/fuzzy-aware). */
function Hi({ text, q }: { text: string; q: string }) {
  const segs = useMemo(() => highlightGeoText(text, q), [text, q]);
  if (!segs) return <>{text}</>;
  return (
    <>
      {segs.map((s, i) =>
        s.hit ? (
          <mark key={i} className="bg-primary-soft text-primary font-semibold rounded-[4px] px-px">
            {s.t}
          </mark>
        ) : (
          <span key={i}>{s.t}</span>
        ),
      )}
    </>
  );
}

function Combo({
  label, value, options, disabled, enFirst, autoOpen, onSelect,
}: { label: string; value: string; options: ComboOption[]; disabled?: boolean; enFirst?: boolean; autoOpen?: boolean; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { t } = useI18n();
  const selected = options.find((o) => o.v === value);
  const display = value && enFirst && selected?.sub ? `${selected.sub} (${selected.v})` : value || label;

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      setSearch('');
    }
  }, [autoOpen]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
        >
          <span className="truncate">{display}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[1200]" align="start">
        <Command filter={geoSearchScore}>
          <div className="relative">
            <CommandInput
              placeholder={`${t('common.search')} ${label}... (TH/EN)`}
              value={search}
              onValueChange={setSearch}
            />
            {search && (
              <button
                type="button"
                aria-label={t('area.clearSearch')}
                onClick={() => setSearch('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty>{t('area.notfound')}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const reason = search.trim() ? geoSearchReason(search, o.keywords) : null;
                const primary = enFirst && o.sub ? o.sub : o.v;
                const secondary = enFirst && o.sub ? o.v : o.sub;
                return (
                  <CommandItem
                    key={o.v}
                    value={`${o.v} ${o.sub ?? ''}`}
                    keywords={o.keywords}
                    onSelect={() => { onSelect(o.v); setOpen(false); }}
                  >
                    <Check className={cn('me-2 h-4 w-4', value === o.v ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1"><Hi text={primary} q={search} /></span>
                    {secondary && <span className="text-[11px] text-muted-foreground ms-2"><Hi text={secondary} q={search} /></span>}
                    {o.zip && (
                      <span className="ms-2 shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] leading-none text-secondary-foreground">
                        {o.zip}
                      </span>
                    )}
                    {reason && (
                      <span className="ms-2 shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t(`area.match.${reason}`)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AreaPicker({ value, onChange }: { value: AreaValue; onChange: (v: AreaValue) => void }) {
  const { t, lang } = useI18n();
  const [geo, setGeo] = useState<ProvinceRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(!!value.geo);
  const [enFirst, setEnFirst] = useState(false);
  const [geoError, setGeoError] = useState<'denied' | 'unsupported' | null>(null);
  const [openProvince, setOpenProvince] = useState(false);

  useEffect(() => {
    loadThaiGeo()
      .then(setGeo)
      .catch(() => toast.error(t('area.loadError')))
      .finally(() => setLoading(false));
  }, []);

  /** Pin set on map / my-location → auto-detect province/district/subdistrict offline. */
  const setPin = (g: { lat: number; lng: number } | null) => {
    if (!g || !geo?.length) return onChange({ ...value, geo: g });
    const hit = reverseGeocode(geo, g.lat, g.lng);
    if (!hit) return onChange({ ...value, geo: g });
    onChange({ ...value, geo: g, province: hit.province, district: hit.district, subdistrict: hit.subdistrict, zip: hit.zip });
    toast.success(t('area.pinDetected', { name: formatArea(hit.province, hit.district, hit.subdistrict, lang) }));
  };

  /** Quick action: pick the province whose centroid is closest to the device's location. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _pickNearestProvince = () => {
    if (!navigator.geolocation) {
      setGeoError('unsupported');
      setOpenProvince(true);
      return;
    }
    if (!geo?.length) return;
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const best = nearestProvince(geo, p.coords.latitude, p.coords.longitude);
        if (!best) return;
        onChange({ ...value, province: best.province, district: '', subdistrict: '', zip: '' });
        toast.success(t('area.nearMeFound', { name: best.province, km: Math.round(best.km) }));
      },
      () => {
        setGeoError('denied');
        setOpenProvince(true);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };


  const province = useMemo(() => geo?.find((p) => p.n === value.province) ?? null, [geo, value.province]);
  const district = useMemo(() => province?.d.find((d) => d.n === value.district) ?? null, [province, value.district]);
  const tambon = useMemo(() => district?.s.find((s) => s.n === value.subdistrict) ?? null, [district, value.subdistrict]);

  const center = tambon?.c ?? null;

  const provinceOptions = useMemo<ComboOption[]>(
    () =>
      (geo ?? []).map((p) => ({
        v: p.n,
        sub: p.e,
        // searchable by any postcode inside the province
        keywords: [...geoKeywords(p.n, p.e), ...new Set(p.d.flatMap((d) => d.s.map((s) => String(s.z)).filter(Boolean)))],
      })),
    [geo],
  );
  const districtOptions = useMemo<ComboOption[]>(
    () =>
      (province?.d ?? []).map((d) => ({
        v: d.n,
        sub: d.e,
        keywords: [...geoKeywords(d.n, d.e), ...new Set(d.s.map((s) => String(s.z)).filter(Boolean))],
      })),
    [province],
  );
  const tambonOptions = useMemo<ComboOption[]>(
    () => (district?.s ?? []).map((s) => ({ v: s.n, sub: s.e || undefined, zip: s.z ? String(s.z) : undefined, keywords: geoKeywords(s.n, s.e, s.z) })),
    [district],
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant={enFirst ? 'secondary' : 'outline'}
          className="text-xs"
          aria-pressed={enFirst}
          onClick={() => setEnFirst((s) => !s)}
        >
          <Languages className="w-3.5 h-3.5 me-1" /> {t('area.toggleNames')}
        </Button>
      </div>

      {geoError && (
        <Alert variant="destructive" className="py-3">
          <MapPinOff className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">{t(geoError === 'unsupported' ? 'area.geoUnsupported' : 'area.geoDenied')}</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {t(geoError === 'unsupported' ? 'area.geoUnsupportedHelp' : 'area.geoDeniedHelp')}
          </AlertDescription>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-2 text-xs h-7"
            onClick={() => setOpenProvince(true)}
          >
            {t('area.trySearch')}
          </Button>
        </Alert>
      )}


      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('area.loading')}
        </div>
      ) : (
        <div className="grid gap-2.5">
          <Combo
            label={t('area.province')}
            value={value.province}
            options={provinceOptions}
            enFirst={enFirst}
            autoOpen={openProvince}
            onSelect={(v) => { setGeoError(null); setOpenProvince(false); onChange({ ...value, province: v, district: '', subdistrict: '', zip: '' }); }}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <Combo
              label={t('area.district')}
              value={value.district}
              disabled={!province}
              options={districtOptions}
              enFirst={enFirst}
              onSelect={(v) => onChange({ ...value, district: v, subdistrict: '', zip: '' })}
            />
            <Combo
              label={t('area.subdistrict')}
              value={value.subdistrict}
              disabled={!district}
              options={tambonOptions}
              enFirst={enFirst}
              onSelect={(v) => {
                const row = district?.s.find((s) => s.n === v);
                onChange({ ...value, subdistrict: v, zip: row?.z ? String(row.z) : '' });
              }}
            />
          </div>
        </div>
      )}

      {(value.province || value.zip) && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          {formatArea(value.province, value.district, value.subdistrict, lang)} {value.zip && `· ${value.zip}`}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowMap((s) => !s)} className="text-xs">
          <MapPin className="w-3.5 h-3.5 me-1" /> {showMap ? t('area.hideMap') : t('area.pin')}
        </Button>
        {showMap && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              if (!navigator.geolocation) {
                setGeoError('unsupported');
                setOpenProvince(true);
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (p) => { setGeoError(null); setPin({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }); },
                () => { setGeoError('denied'); setOpenProvince(true); },
                { enableHighAccuracy: true, timeout: 10000 },
              );
            }}
          >
            <LocateFixed className="w-3.5 h-3.5 me-1" /> {t('area.myLocation')}
          </Button>
        )}
        {value.geo && (
          <Button type="button" size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => onChange({ ...value, geo: null })}>
            <X className="w-3.5 h-3.5 me-1" /> {t('area.clearPin')}
          </Button>
        )}
      </div>

      {showMap && (
        <div className="space-y-1.5">
          <MapPicker value={value.geo ?? null} center={center} onChange={setPin} />
          <p className="text-[11px] text-muted-foreground">
            {value.geo ? `${t('area.coordsLabel')}: ${value.geo.lat}, ${value.geo.lng} (${t('area.coordsHint')})` : t('area.tapToPin')}
          </p>
        </div>
      )}
    </div>
  );
}
