import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, Loader2, MapPin, Phone, Search, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAccess } from '@/hooks/useAccess';
import { useI18n } from '@/i18n';
import { BrandMark } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { cn } from '@/lib/utils';

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

  const { data: partners = [], isLoading } = useQuery({
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

  const { data: cases = [] } = useQuery({
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

  const provinces = useMemo(() => [...new Set(partners.map((p) => p.province).filter(Boolean))].sort() as string[], [partners]);
  const services = useMemo(
    () => [...new Set(partners.flatMap((p) => (Array.isArray(p.services) ? p.services : [])))].sort(),
    [partners],
  );

  /** 3 = same district, 2 = same province, 1 = nationwide, 0 = elsewhere */
  const nearness = (p: Partner) => {
    if (!p.province) return 1;
    if (!focusProv || !samePlace(p.province, focusProv)) return 0;
    return focusDist && samePlace(p.district, focusDist) ? 3 : 2;
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
    return focus ? [...list].sort((a, b) => nearness(b) - nearness(a)) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners, q, orgType, province, service, focus, nearOnly]);

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

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!isStaff) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{t('partners.adminOnly')}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary-deep text-primary-foreground sticky top-0 z-30 shadow-elegant">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link to="/admin" className="w-10 h-10 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80 flex items-center justify-center transition">
            <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg leading-tight">{t('psearch.title')}</h1>
            <p className="text-xs opacity-80">{t('psearch.subtitle')}</p>
          </div>
          <LanguageToggle />
          <BrandMark className="w-9 h-9" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        <div className="bg-primary-soft border border-primary/30 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {t('psearch.focusCase')}</p>
          <Select value={focusId ?? 'none'} onValueChange={(v) => { const n = new URLSearchParams(params); if (v === 'none') n.delete('case'); else n.set('case', v); setParams(n, { replace: true }); }}>
            <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('psearch.focusNone')}</SelectItem>
              {cases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.case_code} · {c.profile?.province || '—'} · {new Date(c.created_at).toLocaleDateString('th-TH')}
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
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={nearOnly} onChange={(e) => setNearOnly(e.target.checked)} className="w-4 h-4 accent-primary" />
                  {t('psearch.nearOnly')}
                </label>
              )}
            </>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-card space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('psearch.searchPlaceholder')} className="ps-9" maxLength={100} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={orgType} onValueChange={setOrgType}>
              <SelectTrigger><SelectValue placeholder={t('psearch.filterType')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('psearch.allTypes')}</SelectItem>
                {ORG_TYPE_KEYS.map((v) => <SelectItem key={v} value={v}>{t(`partners.orgType.${v}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger><SelectValue placeholder={t('psearch.filterProvince')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('psearch.allProvinces')}</SelectItem>
                {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger><SelectValue placeholder={t('psearch.filterService')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('psearch.allServices')}</SelectItem>
                {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">{t('psearch.resultCount', { n: filtered.length })}</p>
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t(`partners.orgType.${p.org_type}`)}</span>
                    {focus && nearness(p) > 0 && (
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full', nearness(p) >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                        {t(nearness(p) === 3 ? 'psearch.badgeDistrict' : nearness(p) === 2 ? 'psearch.badgeProvince' : 'psearch.badgeNational')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {[p.district, p.province].filter(Boolean).join(' · ') || '—'}
                    {p.phone && <span className="inline-flex items-center gap-1 ms-2"><Phone className="w-3 h-3" /> {p.phone}</span>}
                  </p>
                  {Array.isArray(p.services) && p.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.services.map((s, i) => <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{s}</span>)}
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
      </main>

      <Dialog open={!!referPartner} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('psearch.dialogTitle', { name: referPartner?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('psearch.dialogHint')}</DialogDescription>
          </DialogHeader>
          {link ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('ref.linkLabel')}</p>
              <div className="flex gap-2">
                <input readOnly value={link} className="flex-1 h-9 rounded-md border border-border bg-muted/40 px-2 text-xs font-mono" />
                <Button size="sm" onClick={() => { void navigator.clipboard.writeText(link); toast.success(t('ref.copied')); }}>
                  <Copy className="w-3.5 h-3.5" /> {t('ref.copy')}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">{t('psearch.linkHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium">{t('psearch.pickCase')}</p>
                <Select value={caseId ?? ''} onValueChange={setCaseId}>
                  <SelectTrigger><SelectValue placeholder={t('psearch.pickCasePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.case_code} · {c.status} · {new Date(c.created_at).toLocaleDateString('th-TH')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder={t('ref.notePlaceholder')} className="min-h-[70px] text-sm" />
              <p className="text-[11px] text-muted-foreground">{t('psearch.quickNote')}</p>
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
    </div>
  );
}
