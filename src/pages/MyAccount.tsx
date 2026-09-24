import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, LogOut, MapPin, Plus, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandHeader } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { SosButton } from '@/components/SosButton';
import { linkDeviceReports } from '@/lib/myReports';
import { useI18n } from '@/i18n';

type Profile = {
  first_name: string; last_name: string; phone: string; address: string;
  lat: number | null; lng: number | null; gender: string; birthdate: string;
  emergency_name: string; emergency_relation: string; emergency_phone: string;
};
const EMPTY: Profile = { first_name: '', last_name: '', phone: '', address: '', lat: null, lng: null, gender: '', birthdate: '', emergency_name: '', emergency_relation: '', emergency_phone: '' };
const phone = z.string().trim().regex(/^(\+?[\d\s\-()]{9,20})?$/);
type MyCase = { case_code: string; status: string; created_at: string };

export default function MyAccount() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [p, setP] = useState<Profile>(EMPTY);
  const [cases, setCases] = useState<MyCase[]>([]);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate('/signin', { replace: true }); return; }
      setUid(data.user.id); setEmail(data.user.email ?? '');
      const { data: row } = await supabase.from('client_profiles' as never).select('*').eq('id', data.user.id).maybeSingle();
      if (row) {
        const r = row as Record<string, unknown>;
        setP(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k] ?? (k === 'lat' || k === 'lng' ? null : '')])) as Profile);
      }
      const n = await linkDeviceReports();
      if (n > 0) toast.success(t('cl.cases.linked', { n }));
      const { data: list } = await supabase.rpc('my_cases' as never);
      setCases((list as MyCase[] | null) ?? []);
    })();
  }, [navigate, t]);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });

  const locate = () => {
    if (!navigator.geolocation) return toast.error(t('cl.f.locFail'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setP((x) => ({ ...x, lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) })); setLocating(false); },
      () => { toast.error(t('cl.f.locFail')); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    if (!uid) return;
    if (!phone.safeParse(p.phone).success || !phone.safeParse(p.emergency_phone).success) return toast.error(t('cl.f.phoneInvalid'));
    setSaving(true);
    const clean = (s: string, n: number) => (s.trim().slice(0, n) || null);
    const { error } = await supabase.from('client_profiles' as never).upsert({
      id: uid, first_name: clean(p.first_name, 100), last_name: clean(p.last_name, 100), phone: clean(p.phone, 20),
      address: clean(p.address, 500), lat: p.lat, lng: p.lng, gender: clean(p.gender, 40), birthdate: p.birthdate || null,
      emergency_name: clean(p.emergency_name, 100), emergency_relation: clean(p.emergency_relation, 60), emergency_phone: clean(p.emergency_phone, 20),
    } as never);
    setSaving(false);
    if (error) toast.error(t('cl.saveFail')); else toast.success(t('cl.saved'));
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate('/'); };
  const locale = lang === 'th' ? 'th-TH' : 'en-GB';

  const field = (k: keyof Profile, label: string, type = 'text', auto?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} autoComplete={auto} value={(p[k] as string) ?? ''} onChange={set(k)} className="h-11" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-2xl mx-auto px-5 pt-6 flex items-center justify-between gap-3">
        <BrandHeader />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4" /> {t('cl.signout')}</Button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('cl.back')}
        </Link>
        <h1 className="font-display text-3xl font-bold">{t('cl.acc.title')}</h1>
        <p className="font-mono text-xs text-muted-foreground">{email}</p>

        <SosButton />

        <section className="rounded-[1.25rem] border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-subhead text-lg font-semibold">{t('cl.cases.title')}</h2>
            <Button asChild size="sm" variant="action"><Link to="/report"><Plus className="w-4 h-4" /> {t('cl.cases.new')}</Link></Button>
          </div>
          {cases.length === 0 ? <p className="text-sm text-muted-foreground">{t('cl.cases.empty')}</p> : (
            <ul className="divide-y divide-border">
              {cases.map((c) => (
                <li key={c.case_code} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-mono font-bold text-primary">{c.case_code}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString(locale)} · {t(`status.${c.status}`)}</p>
                  </div>
                  <Button asChild size="sm" variant="outline"><Link to={`/track?code=${c.case_code}`}>{t('cl.cases.view')}</Link></Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[1.25rem] border border-border bg-card p-5 space-y-4">
          <h2 className="font-subhead text-lg font-semibold">{t('cl.acc.profile')}</h2>
          <p className="text-sm text-muted-foreground">{t('cl.acc.privacy')}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {field('first_name', t('cl.f.first'), 'text', 'given-name')}
            {field('last_name', t('cl.f.last'), 'text', 'family-name')}
            {field('phone', t('cl.f.phone'), 'tel', 'tel')}
            {field('gender', t('cl.f.gender'))}
            {field('birthdate', t('cl.f.birth'), 'date', 'bday')}
          </div>
          {field('address', t('cl.f.address'), 'text', 'street-address')}
          <div className="space-y-1.5">
            <Label>{t('cl.f.location')}</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={locate} disabled={locating}>
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />} {t('cl.f.locate')}
              </Button>
              {p.lat != null && p.lng != null && <span className="font-mono text-sm">{p.lat}, {p.lng}</span>}
            </div>
          </div>
          <h3 className="font-subhead font-semibold pt-2">{t('cl.f.emergency')}</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {field('emergency_name', t('cl.f.emName'))}
            {field('emergency_relation', t('cl.f.emRel'))}
            {field('emergency_phone', t('cl.f.emPhone'), 'tel')}
          </div>
          <Button variant="action" className="w-full h-12" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('cl.save')}
          </Button>
        </section>
      </main>
    </div>
  );
}
