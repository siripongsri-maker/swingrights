import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEffect as useEff2, useState as useSt2 } from 'react';
import { ShieldCheck, Search, ArrowRight, Lock, HeartHandshake, Scale, AudioWaveform, AudioLines, Menu, Home, Phone, MoreHorizontal, BadgeCheck, UserX } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { PdpaConsent } from '@/components/PdpaConsent';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { RIGHTS, RIGHTS_SECTIONS, type RightsSectionId } from '@/data/rights';
import { HOTLINES } from '@/data/hotlines';
import { BrandHeader, BrandLockup } from '@/components/BrandLogo';
import { PartnerBar } from '@/components/PartnerBar';

const SWING_LINES = [
  { number: '02-632-9501', labelKey: 'landing.hl.silom' },
  { number: '038-412-297', labelKey: 'landing.hl.pattaya' },
];

const RIGHTS_SECTION_PREVIEW: Record<RightsSectionId, { labelKey: string; icon: typeof ShieldCheck }> = {
  arrest: { labelKey: 'landing.rightsPreview.arrest', icon: ShieldCheck },
  investigation: { labelKey: 'rights.section.investigation', icon: Scale },
  detention: { labelKey: 'rights.section.detention', icon: HeartHandshake },
};

function getSessionId() {
  try {
    let id = sessionStorage.getItem('sw_visit_session');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('sw_visit_session', id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export default function Landing() {
  const { t } = useI18n();
  const [signedIn, setSignedIn] = useSt2(false);
  useEff2(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const [tab, setTab] = useState<'home' | 'rights' | 'help' | 'more'>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const show = (k: typeof tab) => (tab === k ? 'block' : 'hidden sm:block');
  const [waveOn, setWaveOn] = useState(() => {
    try { return localStorage.getItem('sw_wave_off') !== '1'; } catch { return true; }
  });
  const toggleWave = () => {
    setWaveOn((on) => {
      try { localStorage.setItem('sw_wave_off', on ? '1' : '0'); } catch { /* ignore */ }
      return !on;
    });
  };

  useEffect(() => {
    let mounted = true;
    const sessionId = getSessionId();

    (async () => {
      try {
        // บันทึกการเข้าชมปัจจุบัน
        await supabase.rpc('record_site_visit', {
          _session_id: sessionId,
          _path: window.location.pathname,
        });

      } catch {
        // ไม่บล็อกหน้า Landing หากสถิติไม่พร้อมใช้งานชั่วคราว
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden sm:h-auto sm:min-h-screen sm:block sm:overflow-visible bg-background">
      {waveOn && (
        <div className="sw-wave" aria-hidden>
          {[30, 46, 66, 92, 122, 150, 116, 84, 138, 170, 128, 96, 158, 186, 140, 104, 74, 168, 132, 92, 60, 150, 176, 118, 82, 136, 164, 108, 72, 48, 88, 124, 154, 178, 130, 98, 142, 62, 84, 110, 146, 172, 120, 90, 56, 134, 160, 100, 70, 40].map((height, index) => (
            <span
              key={index}
              className="sw-wave-bar"
              style={{ height: `${Math.round((height / 186) * 100)}%`, animationDelay: `${index * 0.1}s, ${index * -0.33}s` }}
            />
          ))}
        </div>
      )}
      <div className="relative flex-1 min-h-0 flex flex-col sm:block overflow-hidden bg-transparent">
        <header className="relative shrink-0 max-w-[1120px] w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-7 flex items-center justify-between gap-3">
          <BrandHeader />
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={toggleWave}
              aria-pressed={waveOn}
              title={waveOn ? t('landing.wave.off') : t('landing.wave.on')}
              aria-label={waveOn ? t('landing.wave.off') : t('landing.wave.on')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 backdrop-blur text-muted-foreground hover:text-primary transition-colors"
            >
              {waveOn ? <AudioWaveform className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
            </button>
            <LanguageToggle />
            <Link
              to={signedIn ? '/me' : '/signin'}
              className="text-sm font-semibold text-accent hover:underline min-h-11 inline-flex items-center"
            >
              {signedIn ? t('cl.nav.account') : t('cl.nav.signin')}
            </Link>
            <Link
              to="/admin/login"
              className="text-sm text-muted-foreground hover:text-primary inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card/70 backdrop-blur px-4 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> {t('nav.staff')}
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:hidden">
          <QuickExitSlot />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="sm:hidden h-11 w-11 rounded-full bg-card/80" aria-label={t('home.menu')}>
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="font-subhead mb-6">{t('home.menu')}</SheetTitle>
              <div className="flex flex-col items-start gap-4">
                <button
                  type="button"
                  onClick={toggleWave}
                  aria-pressed={waveOn}
                  title={waveOn ? t('landing.wave.off') : t('landing.wave.on')}
                  aria-label={waveOn ? t('landing.wave.off') : t('landing.wave.on')}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 backdrop-blur text-muted-foreground hover:text-primary transition-colors"
                >
                  {waveOn ? <AudioWaveform className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
                </button>
                <LanguageToggle />
                <Link
                  to={signedIn ? '/me' : '/signin'}
                  className="text-sm font-semibold text-accent hover:underline min-h-11 inline-flex items-center"
                >
                  {signedIn ? t('cl.nav.account') : t('cl.nav.signin')}
                </Link>
                <Link
                  to="/admin/login"
                  className="text-sm text-muted-foreground hover:text-primary inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card/70 backdrop-blur px-4 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" /> {t('nav.staff')}
                </Link>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </header>

        <main className="relative flex-1 min-h-0 overflow-y-auto sm:overflow-visible max-w-[1120px] w-full mx-auto px-4 sm:px-6 pt-3 sm:pt-14 pb-6 sm:pb-16">
          {/* Home: hero */}
          <section className={cn(show('home'), 'sm:grid sm:grid-cols-[1.1fr_0.9fr] sm:items-center sm:gap-10 animate-slide-up')}>
            <div className="rounded-[20px] bg-background/90 sm:p-2">
              <BrandLockup className="hidden sm:flex mb-7" />
              <ul className="flex flex-wrap gap-2 mb-4" aria-label={t('landing.trust.private')}>
                {([[BadgeCheck, 'landing.trust.free'], [Lock, 'landing.trust.private'], [UserX, 'landing.trust.noSignup']] as const).map(([Icon, k]) => (
                  <li key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
                    <Icon className="w-3.5 h-3.5 text-accent" aria-hidden /> {t(k)}
                  </li>
                ))}
              </ul>
              <h1 className="font-display font-bold mb-3">
                {t('landing.title1')}<br /><span>{t('landing.title2')}</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-lg text-pretty mb-5 sm:mb-8">{t('landing.subtitle2')}</p>

              <div className="flex flex-col gap-3 w-full sm:max-w-md">
                <Button asChild size="lg" variant="action" className="w-full min-h-14 flex-col gap-0 shadow-elegant">
                  <Link to="/report">
                    <span className="inline-flex items-center gap-2 text-base"><HeartHandshake className="w-5 h-5" aria-hidden /> {t('landing.cta.start2')}</span>
                    <span className="text-[13px] font-normal opacity-95">{t('landing.cta.startSub')}</span>
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full bg-card text-base">
                  <Link to="/track"><Search className="w-4 h-4" aria-hidden /> {t('landing.cta.trackCode')}</Link>
                </Button>
                <Link to="/rights#arrest" className="sm:hidden flex min-h-14 items-center gap-3 rounded-[20px] border border-border bg-card px-4 py-2.5 shadow-card transition-colors hover:bg-primary-soft">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft"><Scale className="w-5 h-5 text-foreground" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-subhead text-sm font-semibold text-foreground">{t('landing.arrested.title')}</span>
                    <span className="block text-xs text-muted-foreground">{t('landing.arrested.sub')}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden />
                </Link>
              </div>
            </div>

            {/* Desktop: first rights card */}
            <aside className="hidden sm:block rounded-[20px] bg-card border border-border p-6 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft"><Scale className="w-5 h-5 text-foreground" aria-hidden /></span>
                <h2 className="font-subhead font-semibold">{t('landing.arrested.title')}</h2>
              </div>
              <ol className="space-y-2.5 mb-4">
                {RIGHTS.slice(0, 3).map((r, i) => (
                  <li key={r.id} className="flex gap-3 rounded-2xl bg-background px-3.5 py-3 text-sm text-foreground">
                    <span className="font-mono tabular-nums text-accent font-semibold">{i + 1}</span>
                    <span>{r.title}</span>
                  </li>
                ))}
              </ol>
              <Link to="/rights" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                {t('landing.arrested.all').replace('{n}', String(RIGHTS.length))} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </aside>
          </section>

          {/* Desktop: what you can do here */}
          <section className="hidden sm:block mt-16" aria-labelledby="what-title">
            <h2 id="what-title" className="font-subhead font-semibold mb-5">{t('landing.what.title')}</h2>
            <div className="grid grid-cols-3 gap-4">
              {([
                ['/report', HeartHandshake, 'landing.what.report', 'landing.what.reportBody'],
                ['/track', Search, 'landing.what.track', 'landing.what.trackBody'],
                ['/rights', Scale, 'landing.what.rights', 'landing.what.rightsBody'],
              ] as const).map(([to, Icon, k, b]) => (
                <Link key={to} to={to} className="group rounded-[20px] bg-card border border-border p-5 shadow-card transition-colors hover:bg-primary-soft">
                  <Icon className="w-6 h-6 text-accent mb-3" aria-hidden />
                  <p className="font-subhead text-base font-semibold text-foreground">{t(k)}</p>
                  <p className="text-sm text-muted-foreground">{t(b)}</p>
                  <ArrowRight className="mt-3 w-4 h-4 text-foreground rtl:-scale-x-100" aria-hidden />
                </Link>
              ))}
            </div>
          </section>

          {/* Mobile tab: rights */}
          <section className={cn(tab === 'rights' ? 'block' : 'hidden', 'sm:hidden')} aria-labelledby="m-rights-title">
            <h2 id="m-rights-title" className="font-subhead font-semibold mb-4">{t('rights.nav')}</h2>
            <ul className="space-y-3">
              {RIGHTS_SECTIONS.map((sec) => {
                const pv = RIGHTS_SECTION_PREVIEW[sec]; const Icon = pv.icon;
                return (
                  <li key={sec}>
                    <Link to={`/rights#${sec}`} className="flex min-h-16 items-center gap-4 rounded-[20px] bg-card border border-border p-4 shadow-card transition-colors hover:bg-primary-soft">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft"><Icon className="w-6 h-6 text-foreground" aria-hidden /></span>
                      <span className="flex-1 font-subhead text-base font-semibold text-foreground">{t(pv.labelKey)}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground rtl:-scale-x-100" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link to="/rights" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent">
              {t('landing.arrested.all').replace('{n}', String(RIGHTS.length))} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          </section>

          {/* Hotlines: mobile tab, desktop grid */}
          <section className={cn(show('help'), 'sm:mt-16')} aria-labelledby="hl-title">
            <h2 id="hl-title" className="font-subhead font-semibold mb-4">{t('landing.help.title')}</h2>
            {([
              ['landing.hl.swing', SWING_LINES],
              ['landing.hl.public', HOTLINES.map((h) => ({ number: h.number, labelKey: h.labelKey }))],
            ] as const).map(([gk, rows]) => (
              <div key={gk} className="mb-5">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">{t(gk)}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {rows.map((h) => (
                    <li key={h.number}>
                      <a href={`tel:${h.number.replace(/-/g, '')}`} aria-label={`${t('landing.hl.call')} ${t(h.labelKey)} ${h.number}`}
                        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-card transition-colors hover:bg-primary-soft">
                        <span className="min-w-0 text-sm text-foreground">{t(h.labelKey)}</span>
                        <span className="inline-flex shrink-0 items-center gap-2 font-mono text-xl font-semibold tabular-nums text-foreground">
                          {h.number} <Phone className="w-4 h-4 text-accent" aria-hidden />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{t('landing.help.hours')}</p>
          </section>

          {/* Mobile tab: more */}
          <section className={cn(tab === 'more' ? 'block' : 'hidden', 'sm:hidden space-y-3')}>
            <Link to={signedIn ? '/me' : '/signin'} className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card px-4 font-semibold text-foreground shadow-card">
              {signedIn ? t('cl.nav.account') : t('cl.nav.signin')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
            </Link>
            <Link to="/admin/login" className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card px-4 text-foreground shadow-card">
              <span className="inline-flex items-center gap-2"><Lock className="w-4 h-4" aria-hidden /> {t('nav.staff')}</span> <ArrowRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
            </Link>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <button type="button" onClick={toggleWave} aria-pressed={waveOn}
                aria-label={waveOn ? t('landing.wave.off') : t('landing.wave.on')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
                {waveOn ? <AudioWaveform className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
              </button>
            </div>
            <Link to="/privacy" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent">{t('landing.footer')}</Link>
            <PartnerBar className="text-start" />
            <p className="text-xs text-muted-foreground">© มูลนิธิเพื่อนพนักงานบริการ (SWING Foundation)</p>
          </section>
        </main>
      </div>

      <footer className="hidden sm:block max-w-[1120px] mx-auto px-6 pt-16 pb-8 text-center text-xs text-muted-foreground">
        <PartnerBar className="mb-6 text-start" />
        © มูลนิธิเพื่อนพนักงานบริการ (SWING Foundation) · <Link to="/privacy" className="hover:text-foreground">{t('landing.footer')}</Link>
      </footer>

      <nav className="sw-bottom-nav sm:hidden relative z-10 shrink-0 border-t border-border bg-card/95 backdrop-blur grid grid-cols-4 pb-[env(safe-area-inset-bottom)]" aria-label={t('home.menu')}>
        {([['home', Home], ['rights', Scale], ['help', Phone], ['more', MoreHorizontal]] as const).map(([k, Icon]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
            className={cn('flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors', tab === k ? 'text-accent font-semibold' : 'text-muted-foreground')}>
            <Icon className="h-5 w-5" />
            {t(`home.tab.${k}`)}
          </button>
        ))}
      </nav>
      <PdpaConsent />
    </div>
  );
}
