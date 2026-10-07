import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Copy, Loader2, MapPin, Phone, Search, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAccess } from '@/hooks/useAccess';
import { useI18n } from '@/i18n';
import { StaffShell, StaffLoadError } from '@/components/admin/StaffShell';
import { cn } from '@/lib/utils';
import { provinceDistanceKm } from '@/lib/provinceGeo';
import { loadThaiGeo, resolveAreaCoords, distKm } from '@/lib/thaiGeo';
import { PartnerMap, type MapMarker } from '@/components/PartnerMap';

const ORG_TYPE_KEYS = ['agency', 'hospital', 'legal', 'ngo', 'shelter', 'police', 'hotline', 'other'];

interface Partner {
  id: string;
  name: string;
  org_type: string;
  province: string | null;
  district: string | null;
  phone: string | null;
  services: string[];
}

interface CaseRow { id: string; case_code: string; status: string; created_at: string; profile: { province?: string; district?: string; branch?: string } | null }

/** Normalise Thai place names so "จังหวัดเชียงใหม่" matches "เชียงใหม่", "กรุงเทพฯ" matches "กรุงเทพมหานคร". */
const normPlace = (s?: string | null) => (s ?? '')
  .replace(/^(จังหวัด|จ\.|อำเภอ|อ\.|เขต)\s*/, '')
  .replace(/^กรุงเทพ.*$/, 'กรุงเทพ')
  .trim();
const samePlace = (a?: string | null, b?: string | null) => {
  const x = normPlace(a), y = normPlace(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

export default function PartnerSearch() {
  const { t } = useI18n();
  const { isStaff, loading } = useAccess();
  const [params, setParams] = useSearchParams();
  const focusId = params.get('case');
  const [q, setQ] = useState('');
  const [orgType, setOrgType] = useState('all');
  const [province, setProvince] = useState('all');
  const [service, setService] = useState('all');
  const [nearOnly, setNearOnly] = useState(true);
  const [referPartner, setReferPartner] = useState<Partner | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const { data: partners = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['partner-search'],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_partners' as never)
        .select('id,name,org_type,province,district,phone,services')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as Partner[];
    },
  });

  const { data: cases = [], isError: casesError, refetch: refetchCases } = useQuery({
    queryKey: ['partner-search-cases'],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('id,case_code,status,created_at,profile')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as CaseRow[];
    },
  });

  const focus = cases.find((c) => c.id === focusId) ?? null;
  const focusProv = focus?.profile?.province || '';
  const focusDist = focus?.profile?.district || '';

  // Local Thai geo data (provinces/districts/tambon centers), loaded once, offline.
  const { data: geo } = useQuery({ queryKey: ['thai-geo'], queryFn: loadThaiGeo, staleTime: Infinity });

  const provinces = useMemo(() => [...new Set(partners.map((p) => p.province).filter(Boolean))].sort() as string[], [partners]);
  const services = useMemo(
    () => [...new Set(partners.flatMap((p) => (Array.isArray(p.services) ? p.services : [])))].sort(),
    [partners],
  );

  /** Approximate [lat,lng] for a partner from local tambon/district centers (null if unknown). */
  const partnerCoords = useMemo(() => {
    const m = new Map<string, [number, number]>();
    if (!geo) return m;
    for (const p of partners) {
      const c = resolveAreaCoords(geo, p.province, p.district);
      if (c) m.set(p.id, c);
    }
    return m;
  }, [geo, partners]);

  const casePoint = useMemo(
    () => (geo && focusProv ? resolveAreaCoords(geo, focusProv, focusDist) : null),
    [geo, focusProv, focusDist],
  );

  /** 3 = same district, 2 = same province, 1 = nationwide, 0 = elsewhere */
  const nearness = (p: Partner) => {
    if (!p.province) return 1;
    if (!focusProv || !samePlace(p.province, focusProv)) return 0;
    return focusDist && samePlace(p.district, focusDist) ? 3 : 2;
  };

  /** Straight-line km from the case area to the partner (null if unknown). */
  const distanceKm = (p: Partner): number | null => {
    if (!focusProv) return null;
    if (!p.province) return null; // nationwide: no fixed location
    const pc = partnerCoords.get(p.id);
    if (casePoint && pc) {
      const d = distKm(casePoint, pc);
      return d < 1 ? 0 : Math.round(d);
    }
    return provinceDistanceKm(focusProv, p.province);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = partners.filter((p) => {
      if (orgType !== 'all' && p.org_type !== orgType) return false;
      if (province !== 'all' && p.province !== province) return false;
      if (service !== 'all' && !(Array.isArray(p.services) && p.services.includes(service))) return false;
      if (needle && !`${p.name} ${p.district ?? ''} ${p.province ?? ''}`.toLowerCase().includes(needle)) return false;
      if (focus && nearOnly && nearness(p) === 0) return false;
      return true;
    });
    if (!focus) return list;
    // Sort by real distance when both provinces are known; fall back to the nearness tier.
    return [...list].sort((a, b) => {
      const da = distanceKm(a);
      const db = distanceKm(b);
      if (da !== null && db !== null) return da - db;
      if (da !== null) return -1;
      if (db !== null) return 1;
      return nearness(b) - nearness(a);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners, q, orgType, province, service, focus, nearOnly, partnerCoords, casePoint]);

  const mapMarkers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (casePoint && focus) {
      list.push({
        id: 'case', kind: 'case', lat: casePoint[0], lng: casePoint[1],
        name: t('psearch.mapCasePin', { code: focus.case_code }),
        sub: [focusDist, focusProv].filter(Boolean).join(' · '),
      });
    }
    for (const p of filtered) {
      const c = partnerCoords.get(p.id);
      if (!c) continue;
      const d = focus ? distanceKm(p) : null;
      list.push({
        id: p.id, kind: 'partner', lat: c[0], lng: c[1], name: p.name,
        sub: [
          [p.district, p.province].filter(Boolean).join(' · ') || t('psearch.badgeNational'),
          d !== null ? (d === 0 ? t('psearch.distanceHere') : t('psearch.distance', { km: d.toLocaleString('th-TH') })) : '',
        ].filter(Boolean).join(' · '),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, partnerCoords, casePoint, focus, t]);

  const openRefer = (p: Partner) => { setReferPartner(p); setCaseId(focus?.id ?? null); };

  const submit = async () => {
    if (!referPartner || !caseId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('create_case_referral' as never, {
      _case_id: caseId,
      _partner_id: referPartner.id,
      _note: note.trim() || null,
      _summary: null,
      _letter: null,
    } as never);
    setBusy(false);
    if (error || !data) { toast.error(t('ref.failed')); return; }
    setLink(`${window.location.origin}/referral/${(data as { token: string }).token}`);
    toast.success(t('ref.success'));
  };

  const closeDialog = () => { setReferPartner(null); setCaseId(null); setNote(''); setLink(null); };

  const shell = (body: React.ReactNode) => (
    <StaffShell title={t('psearch.title')} context={t('psearch.subtitle')}>{body}</StaffShell>
  );
  if (loading || (isStaff && isLoading)) {
    return shell(<div className="py-12 text-center" role="status"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>);
  }
  if (!isStaff) {
    return shell(<p className="py-12 text-center text-sm text-muted-foreground">{t('partners.adminOnly')}</p>);
  }
  if (isError) return shell(<StaffLoadError onRetry={() => void refetch()} />);

  return shell(
    <>
      <div className="max-w-4xl space-y-4">
        {casesError && <StaffLoadError onRetry={() => void refetchCases()} />}
        <div className="bg-primary-soft border border-primary/30 rounded-xl p-4 space-y-2">
          <label htmlFor="psearch-focus" className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" aria-hidden /> {t('psearch.focusCase')}</label>
          <Select value={focusId ?? 'none'} onValueChange={(v) => { const n = new URLSearchParams(params); if (v === 'none') n.delete('case'); else n.set('case', v); setParams(n, { replace: true }); }}>
            <SelectTrigger id="psearch-focus" className="h-11 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('psearch.focusNone')}</SelectItem>
              {cases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.case_code} · {c.profile?.province || '-'} · {new Date(c.created_at).toLocaleDateString('th-TH')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {focus && (
            <>
              <p className="text-xs text-muted-foreground">
                {focusProv ? t('psearch.caseArea', { area: [focusDist, focusProv].filter(Boolean).join(' · ') }) : t('psearch.caseNoArea')}
              </p>
              {focusProv && (
                <label className="flex min-h-11 items-center gap-3 text-sm cursor-pointer">
                  <input type="checkbox" checked={nearOnly} onChange={(e) => setNearOnly(e.target.checked)} className="w-5 h-5 accent-primary" />
                  {t('psearch.nearOnly')}
                </label>
              )}
            </>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-card space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('psearch.searchPlaceholder')} aria-label={t('psearch.searchPlaceholder')} className="h-11 ps-9" maxLength={100} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={orgType} onValueChange={setOrgType}>
              <SelectTrigger className="h-11" aria-label={t('psearch.filterType')}><SelectValue placeholder={t('psearch.filterType')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('psearch.allTypes')}</SelectItem>
                {ORG_TYPE_KEYS.map((v) => <SelectItem key={v} value={v}>{t(`partners.orgType.${v}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger className="h-11" aria-label={t('psearch.filterProvince')}><SelectValue placeholder={t('psearch.filterProvince')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('psearch.allProvinces')}</SelectItem>
                {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="h-11" aria-label={t('psearch.filterService')}><SelectValue placeholder={t('psearch.filterService')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('psearch.allServices')}</SelectItem>
                {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{t('psearch.resultCount', { n: filtered.length })}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {t('psearch.mapTitle')}</p>
          <PartnerMap markers={mapMarkers} emptyHint={t('psearch.mapEmpty')} />
          <p className="text-xs text-muted-foreground">{t('psearch.mapHint')}</p>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">{t('psearch.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id} className="bg-card border border-border rounded-xl p-4 shadow-card flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{p.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t(`partners.orgType.${p.org_type}`)}</span>
                    {focus && nearness(p) > 0 && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', nearness(p) >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                        {t(nearness(p) === 3 ? 'psearch.badgeDistrict' : nearness(p) === 2 ? 'psearch.badgeProvince' : 'psearch.badgeNational')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                    <MapPin className="w-3 h-3" aria-hidden /> {[p.district, p.province].filter(Boolean).join(' · ') || '-'}
                    {p.phone && <span className="inline-flex items-center gap-1 ms-2"><Phone className="w-3 h-3" /> {p.phone}</span>}
                    {focus && focusProv && distanceKm(p) !== null && (
                      <span className="inline-flex items-center gap-1 ms-2 text-primary font-medium">
                        {distanceKm(p) === 0
                          ? t('psearch.distanceHere')
                          : t('psearch.distance', { km: distanceKm(p)!.toLocaleString('th-TH') })}
                      </span>
                    )}
                  </p>
                  {Array.isArray(p.services) && p.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.services.map((s, i) => <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{s}</span>)}
                    </div>
                  )}
                </div>
                <Button size="sm" className="shrink-0" onClick={() => openRefer(p)}>
                  <Share2 className="w-3.5 h-3.5" /> {t('psearch.referNow')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!referPartner} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('psearch.dialogTitle', { name: referPartner?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('psearch.dialogHint')}</DialogDescription>
          </DialogHeader>
          {link ? (
            <div className="space-y-2">
              <label htmlFor="psearch-link" className="block text-xs text-muted-foreground">{t('ref.linkLabel')}</label>
              <div className="flex gap-2">
                <input id="psearch-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 h-11 rounded-md border border-border bg-muted/40 px-2 text-xs font-mono" />
                <Button size="sm" onClick={() => { void navigator.clipboard.writeText(link); toast.success(t('ref.copied')); }}>
                  <Copy className="w-3.5 h-3.5" /> {t('ref.copy')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('psearch.linkHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="psearch-pick-case" className="block text-sm font-medium">{t('psearch.pickCase')}</label>
                <Select value={caseId ?? ''} onValueChange={setCaseId}>
                  <SelectTrigger id="psearch-pick-case" className="h-11"><SelectValue placeholder={t('psearch.pickCasePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.case_code} · {t(`status.${c.status}`)} · {new Date(c.created_at).toLocaleDateString('th-TH')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder={t('ref.notePlaceholder')} aria-label={t('ref.notePlaceholder')} className="min-h-[70px] text-sm" />
              <p className="text-xs text-muted-foreground">{t('psearch.quickNote')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('ref.cancel')}</Button>
            {!link && (
              <Button disabled={!caseId || busy} onClick={() => void submit()}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('ref.submit')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>,
  );
}
