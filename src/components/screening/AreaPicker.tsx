import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MapPicker } from './MapPicker';
import { loadThaiGeo, formatArea, geoKeywords, geoSearchScore, type ProvinceRow } from '@/lib/thaiGeo';
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
  keywords?: string[];
}

function Combo({
  label, value, options, disabled, onSelect,
}: { label: string; value: string; options: ComboOption[]; disabled?: boolean; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
        >
          <span className="truncate">{value || label}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[1200]" align="start">
        <Command filter={geoSearchScore}>
          <CommandInput placeholder={`${t('common.search')} ${label}... (TH/EN)`} />
          <CommandList className="max-h-64">
            <CommandEmpty>{t('area.notfound')}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.v}
                  value={`${o.v} ${o.sub ?? ''}`}
                  keywords={o.keywords}
                  onSelect={() => { onSelect(o.v); setOpen(false); }}
                >
                  <Check className={cn('me-2 h-4 w-4', value === o.v ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1">{o.v}</span>
                  {o.sub && <span className="text-[11px] text-muted-foreground ms-2">{o.sub}</span>}
                </CommandItem>
              ))}
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

  useEffect(() => {
    loadThaiGeo()
      .then(setGeo)
      .catch(() => toast.error(t('area.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const province = useMemo(() => geo?.find((p) => p.n === value.province) ?? null, [geo, value.province]);
  const district = useMemo(() => province?.d.find((d) => d.n === value.district) ?? null, [province, value.district]);
  const tambon = useMemo(() => district?.s.find((s) => s.n === value.subdistrict) ?? null, [district, value.subdistrict]);

  const center = tambon?.c ?? null;

  const provinceOptions = useMemo<ComboOption[]>(
    () => (geo ?? []).map((p) => ({ v: p.n, sub: p.e, keywords: geoKeywords(p.n, p.e) })),
    [geo],
  );
  const districtOptions = useMemo<ComboOption[]>(
    () => (province?.d ?? []).map((d) => ({ v: d.n, sub: d.e, keywords: geoKeywords(d.n, d.e) })),
    [province],
  );
  const tambonOptions = useMemo<ComboOption[]>(
    () => (district?.s ?? []).map((s) => ({ v: s.n, sub: s.e || (s.z ? String(s.z) : undefined), keywords: geoKeywords(s.n, s.e, s.z) })),
    [district],
  );

  return (
    <div className="space-y-2.5">
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
            onSelect={(v) => onChange({ ...value, province: v, district: '', subdistrict: '', zip: '' })}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <Combo
              label={t('area.district')}
              value={value.district}
              disabled={!province}
              options={districtOptions}
              onSelect={(v) => onChange({ ...value, district: v, subdistrict: '', zip: '' })}
            />
            <Combo
              label={t('area.subdistrict')}
              value={value.subdistrict}
              disabled={!district}
              options={tambonOptions}
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
              if (!navigator.geolocation) return toast.error(t('area.geoUnsupported'));
              navigator.geolocation.getCurrentPosition(
                (p) => onChange({ ...value, geo: { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) } }),
                () => toast.error(t('area.geoDenied')),
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
          <MapPicker value={value.geo ?? null} center={center} onChange={(g) => onChange({ ...value, geo: g })} />
          <p className="text-[11px] text-muted-foreground">
            {value.geo ? `${t('area.coordsLabel')}: ${value.geo.lat}, ${value.geo.lng} (${t('area.coordsHint')})` : t('area.tapToPin')}
          </p>
        </div>
      )}
    </div>
  );
}
