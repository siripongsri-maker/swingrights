import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandHeader } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { linkDeviceReports } from '@/lib/myReports';
import { useI18n } from '@/i18n';

type P = {
  first_name: string; last_name: string; phone: string; gender: string; birthdate: string;
  address: string; lat: number | null; lng: number | null;
  emergency_name: string; emergency_relation: string; emergency_phone: string;
};
const EMPTY: P = { first_name: '', last_name: '', phone: '', gender: '', birthdate: '', address: '', lat: null, lng: null, emergency_name: '', emergency_relation: '', emergency_phone: '' };
const phoneRx = z.string().trim().regex(/^(\+?[\d\s\-()]{9,20})?$/);
const GENDERS = ['f', 'm', 't', 'nb'] as const;

export default function Onboarding() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [p, setP] = useState<P>(EMPTY);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate('/signin', { replace: true }); return; }
      setUid(data.user.id);
      const { data: row } = await supabase.from('client_profiles' as never).select('*').eq('id', data.user.id).maybeSingle();
      if (row) {
        const r = row as Record<string, unknown>;
        setP(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k] ?? (k === 'lat' || k === 'lng' ? null : '')])) as P);
      }
    })();
  }, [navigate]);

  const set = (k: keyof P) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });
  const field = (k: keyof P, label: string, type = 'text', auto?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} autoComplete={auto} value={(p[k] as string) ?? ''} onChange={set(k)} className="h-12 text-base" />
    </div>
  );

  const locate = () => {
    if (!navigator.geolocation) return toast.error(t('cl.f.locFail'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setP((x) => ({ ...x, lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) })); setLocating(false); },
      () => { toast.error(t('cl.f.locFail')); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const next = () => {
    if (step === 1) {
      if (!p.first_name.trim() || !p.last_name.trim()) return toast.error(t('ob.required'));
      if (!phoneRx.safeParse(p.phone).success) return toast.error(t('cl.f.phoneInvalid'));
    }
    setStep(step + 1);
  };

  const finish = async () => {
    if (!uid) return;
    if (!phoneRx.safeParse(p.emergency_phone).success) return toast.error(t('cl.f.phoneInvalid'));
    setSaving(true);
    const c = (s: string, n: number) => (s.trim().slice(0, n) || null);
    const { error } = await supabase.from('client_profiles' as never).upsert({
      id: uid, first_name: c(p.first_name, 100), last_name: c(p.last_name, 100), phone: c(p.phone, 20),
      address: c(p.address, 500), lat: p.lat, lng: p.lng, gender: c(p.gender, 40), birthdate: p.birthdate || null,
      emergency_name: c(p.emergency_name, 100), emergency_relation: c(p.emergency_relation, 60), emergency_phone: c(p.emergency_phone, 20),
    } as never);
    if (error) { setSaving(false); return toast.error(t('cl.saveFail')); }
    await linkDeviceReports().catch(() => 0);
    setSaving(false);
    toast.success(t('cl.saved'));
    navigate('/me', { replace: true });
  };

  const titles = [t('ob.s1'), t('ob.s2'), t('ob.s3')];

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-md mx-auto px-5 pt-6 flex items-center justify-between">
        <BrandHeader />
        <LanguageToggle />
      </header>
      <main className="max-w-md mx-auto px-5 py-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('ob.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t('ob.intro')}</p>
        </div>
        <div className="flex gap-2" aria-hidden="true">
          {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? 'bg-primary' : 'bg-border'}`} />)}
        </div>
        <section className="rounded-[1.25rem] border border-border bg-card p-6 shadow-sm space-y-4">
          <p className="font-mono text-xs text-muted-foreground">{t('ob.step', { n: step })}</p>
          <h2 className="font-subhead text-xl font-semibold">{titles[step - 1]}</h2>

          {step === 1 && (
            <div className="space-y-3">
              {field('first_name', t('cl.f.first'), 'text', 'given-name')}
              {field('last_name', t('cl.f.last'), 'text', 'family-name')}
              <div className="space-y-1.5">
                <Label>{t('cl.f.gender')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map((g) => {
                    const label = t(`ob.gender.${g}`);
                    const on = p.gender === label;
                    return (
                      <button key={g} type="button" onClick={() => setP({ ...p, gender: label })}
                        className={`min-h-11 rounded-xl border px-3 text-sm transition-colors ${on ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border hover:border-primary/50'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {field('birthdate', t('cl.f.birth'), 'date', 'bday')}
              {field('phone', t('cl.f.phone'), 'tel', 'tel')}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {field('address', t('cl.f.address'), 'text', 'street-address')}
              <div className="space-y-1.5">
                <Label>{t('cl.f.location')}</Label>
                <Button type="button" variant="outline" className="w-full h-12" onClick={locate} disabled={locating}>
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />} {t('cl.f.locate')}
                </Button>
                {p.lat != null && p.lng != null && <p className="font-mono text-sm text-center">{p.lat}, {p.lng}</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {field('emergency_name', t('cl.f.emName'))}
              {field('emergency_relation', t('cl.f.emRel'))}
              {field('emergency_phone', t('cl.f.emPhone'), 'tel')}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {step > 1 && (
              <Button variant="outline" className="h-12" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('ob.prev')}
              </Button>
            )}
            {step < 3 ? (
              <Button variant="action" className="h-12 flex-1" onClick={next}>
                {t('ob.next')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </Button>
            ) : (
              <Button variant="action" className="h-12 flex-1" onClick={finish} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t('ob.finish')}
              </Button>
            )}
          </div>
        </section>
        <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground min-h-11" onClick={() => navigate('/me')}>
          {t('ob.skip')}
        </button>
      </main>
    </div>
  );
}
