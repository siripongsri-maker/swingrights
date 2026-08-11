import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MapPicker } from './MapPicker';
import { loadThaiGeo, formatArea, type ProvinceRow } from '@/lib/thaiGeo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface AreaValue {
  province: string;
  district: string;
  subdistrict: string;
  zip?: string;
  geo?: { lat: number; lng: number } | null;
}

function Combo({
  label, value, options, disabled, onSelect,
}: { label: string; value: string; options: { v: string; sub?: string }[]; disabled?: boolean; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
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
        <Command>
          <CommandInput placeholder={`ค้นหา${label}...`} />
          <CommandList className="max-h-64">
            <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.v} value={`${o.v} ${o.sub ?? ''}`} onSelect={() => { onSelect(o.v); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === o.v ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1">{o.v}</span>
                  {o.sub && <span className="text-[11px] text-muted-foreground ml-2">{o.sub}</span>}
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
  const [geo, setGeo] = useState<ProvinceRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(!!value.geo);

  useEffect(() => {
    loadThaiGeo()
      .then(setGeo)
      .catch(() => toast.error('โหลดข้อมูลพื้นที่ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  const province = useMemo(() => geo?.find((p) => p.n === value.province) ?? null, [geo, value.province]);
  const district = useMemo(() => province?.d.find((d) => d.n === value.district) ?? null, [province, value.district]);
  const tambon = useMemo(() => district?.s.find((s) => s.n === value.subdistrict) ?? null, [district, value.subdistrict]);

  const center = tambon?.c ?? null;

  return (
    <div className="space-y-2.5">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังโหลดรายชื่อจังหวัด/อำเภอ/ตำบล...
        </div>
      ) : (
        <div className="grid gap-2.5">
          <Combo
            label="จังหวัด"
            value={value.province}
            options={(geo ?? []).map((p) => ({ v: p.n, sub: p.e }))}
            onSelect={(v) => onChange({ ...value, province: v, district: '', subdistrict: '', zip: '' })}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <Combo
              label="อำเภอ/เขต"
              value={value.district}
              disabled={!province}
              options={(province?.d ?? []).map((d) => ({ v: d.n, sub: d.e }))}
              onSelect={(v) => onChange({ ...value, district: v, subdistrict: '', zip: '' })}
            />
            <Combo
              label="ตำบล/แขวง"
              value={value.subdistrict}
              disabled={!district}
              options={(district?.s ?? []).map((s) => ({ v: s.n, sub: s.z ? String(s.z) : undefined }))}
              onSelect={(v) => {
                const t = district?.s.find((s) => s.n === v);
                onChange({ ...value, subdistrict: v, zip: t?.z ? String(t.z) : '' });
              }}
            />
          </div>
        </div>
      )}

      {(value.province || value.zip) && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          {formatArea(value.province, value.district, value.subdistrict)} {value.zip && `· ${value.zip}`}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowMap((s) => !s)} className="text-xs">
          <MapPin className="w-3.5 h-3.5 mr-1" /> {showMap ? 'ซ่อนแผนที่' : 'ปักหมุดพื้นที่ (ไม่บังคับ)'}
        </Button>
        {showMap && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              if (!navigator.geolocation) return toast.error('อุปกรณ์ไม่รองรับการระบุตำแหน่ง');
              navigator.geolocation.getCurrentPosition(
                (p) => onChange({ ...value, geo: { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) } }),
                () => toast.error('ไม่สามารถเข้าถึงตำแหน่งได้'),
                { enableHighAccuracy: true, timeout: 10000 },
              );
            }}
          >
            <LocateFixed className="w-3.5 h-3.5 mr-1" /> ตำแหน่งปัจจุบัน
          </Button>
        )}
        {value.geo && (
          <Button type="button" size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => onChange({ ...value, geo: null })}>
            <X className="w-3.5 h-3.5 mr-1" /> ล้างหมุด
          </Button>
        )}
      </div>

      {showMap && (
        <div className="space-y-1.5">
          <MapPicker value={value.geo ?? null} center={center} onChange={(g) => onChange({ ...value, geo: g })} />
          <p className="text-[11px] text-muted-foreground">
            {value.geo ? `พิกัด: ${value.geo.lat}, ${value.geo.lng} (ลากหมุดเพื่อปรับ)` : 'แตะบนแผนที่เพื่อปักหมุด — ไม่บังคับ'}
          </p>
        </div>
      )}
    </div>
  );
}
