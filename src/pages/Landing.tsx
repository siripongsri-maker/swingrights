import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEffect as useEff2, useState as useSt2 } from 'react';
import { ShieldCheck, Search, ArrowRight, Lock, HeartHandshake, Sparkles, Users, Eye, MousePointerClick, Scale, ChevronLeft, ChevronRight, AudioWaveform, AudioLines, Menu, Home, Phone, MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { PdpaConsent } from '@/components/PdpaConsent';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { RIGHTS_SECTIONS, type RightsSectionId } from '@/data/rights';
import { HOTLINES } from '@/data/hotlines';
import { BrandHeader, BrandLockup } from '@/components/BrandLogo';
import { PartnerBar } from '@/components/PartnerBar';

const RIGHTS_SECTION_PREVIEW: Record<RightsSectionId, { labelKey: string; icon: typeof ShieldCheck }> = {
  arrest: { labelKey: 'landing.rightsPreview.arrest', icon: ShieldCheck },
  investigation: { labelKey: 'rights.section.investigation', icon: Scale },
  detention: { labelKey: 'rights.section.detention', icon: HeartHandshake },
};

/** Eases a number from 0 → target on mount (used for the stats card). */
function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

interface SiteStats {
  registered_users: number;
  unique_visitors: number;
  total_visits: number;
}

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
  const [stats, setStats] = useState<SiteStats>({ registered_users: 0, unique_visitors: 0, total_visits: 0 });
  const [rightsSectionIndex, setRightsSectionIndex] = useState(0);
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

  const showPreviousRight = () => setRightsSectionIndex((current) => (current - 1 + RIGHTS_SECTIONS.length) % RIGHTS_SECTIONS.length);
  const showNextRight = () => setRightsSectionIndex((current) => (current + 1) % RIGHTS_SECTIONS.length);
  const featuredSection = RIGHTS_SECTIONS[rightsSectionIndex];
  const sectionPreview = featuredSection ? RIGHTS_SECTION_PREVIEW[featuredSection] : undefined;
  const FeaturedSectionIcon = sectionPreview?.icon;

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

        // ดึงสถิติจาก Edge Function
        const { data, error } = await supabase.functions.invoke('site-stats', { method: 'GET' });
        if (!mounted || error) return;
        const s = data as SiteStats | null;
        if (s && typeof s.registered_users === 'number') {
          setStats(s);
        }
      } catch {
        // ไม่บล็อกหน้า Landing หากสถิติไม่พร้อมใช้งานชั่วคราว
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(showNextRight, 6000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden sm:h-auto sm:min-h-screen sm:block sm:overflow-visible bg-background">
      {waveOn && (
        <div className="sw-wave" aria-hidden>
          {[30, 46, 66, 92, 122, 150, 116, 84, 138, 170, 128, 96, 158, 186, 140, 104, 74, 168, 132, 92, 60, 150, 176, 118, 82, 136, 164, 108, 72, 48, 88, 124, 154, 178, 130, 98, 142, 62, 84, 110, 146, 172, 120, 90, 56, 134, 160, 100, 70, 40].map((height, index) => (
            <span
              key={index}
              className="sw-wave-bar"
              style={{ height: `${Math.round((height / 186) * 62)}vh`, animationDelay: `${index * 0.1}s, ${index * -0.33}s` }}
            />
          ))}
        </div>
      )}
      <div className="relative flex-1 min-h-0 flex flex-col sm:block overflow-hidden bg-transparent">
        <header className="relative shrink-0 max-w-5xl w-full mx-auto px-4 sm:px-5 pt-4 sm:pt-7 flex items-center justify-between gap-3">
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
        </header>

        <main className="relative flex-1 min-h-0 overflow-y-auto sm:overflow-visible max-w-5xl w-full mx-auto px-4 sm:px-5 pt-4 sm:pt-14 pb-6 sm:pb-16">
          <div className={cn(show('home'), 'h-full sm:h-auto')}><div className="h-full flex flex-col justify-center sm:grid sm:grid-cols-[1.15fr_0.85fr] items-center gap-6 sm:gap-10 animate-slide-up">
            <div className="text-center sm:text-start">
              <BrandLockup className="mx-auto mb-5 sm:mb-7 sm:mx-0" />
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground text-[10px] font-semibold px-3.5 py-1.5 rounded-full mb-5">
                <Sparkles className="w-3 h-3" /> {t('landing.badge')}
              </span>
              <h1 className="font-display text-[2rem] leading-tight sm:text-4xl sm:text-[2.75rem] font-bold leading-[1.1] text-balance mb-4">
                {t('landing.title1')}<br />
                 <span>{t('landing.title2')}</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-lg mx-auto sm:mx-0 text-balance leading-relaxed mb-6 sm:mb-8">
                {t('landing.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start w-full max-w-sm mx-auto sm:max-w-none sm:mx-0">
                <Link to="/report" className="block">
                  <Button size="lg" variant="action" className="px-7 shadow-elegant text-base w-full sm:w-auto">
                    <HeartHandshake className="w-4 h-4" /> {t('landing.cta.report')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                  </Button>
                </Link>
                <Link to="/track" className="block">
                  <Button size="lg" variant="outline" className="px-7 bg-card text-base w-full sm:w-auto">
                    <Search className="w-4 h-4" /> {t('landing.cta.track')}
                  </Button>
                </Link>
              </div>
            </div>

          </div></div>

          {/* Bento grid — revealed on scroll */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:mt-14">
              <article className={cn(show('rights'), "sm:col-span-2 relative overflow-hidden rounded-[20px] bg-card border border-border p-6 shadow-card")} aria-roledescription="carousel" aria-label={t('landing.rightsPreview.title')}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="font-subhead text-base sm:text-lg font-semibold text-primary mb-1">{t('rights.nav')}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full" onClick={showPreviousRight} aria-label={t('landing.rightsPreview.previous')}>
                      <ChevronLeft className="w-5 h-5 rtl:-scale-x-100" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full" onClick={showNextRight} aria-label={t('landing.rightsPreview.next')}>
                      <ChevronRight className="w-5 h-5 rtl:-scale-x-100" />
                    </Button>
                  </div>
                </div>

                {featuredSection && sectionPreview && FeaturedSectionIcon && (
                  <div className="min-h-[9.5rem]" aria-live="polite" aria-atomic="true">
                    <div className="flex items-center gap-5">
                      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-primary-soft text-foreground sm:h-24 sm:w-24">
                        <FeaturedSectionIcon className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={2} aria-hidden="true" />
                      </span>
                      <h2 className="font-subhead text-2xl font-semibold leading-snug sm:text-3xl">{t(sectionPreview.labelKey)}</h2>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 mt-3">
                  <span className="text-xs text-muted-foreground tabular-nums">{rightsSectionIndex + 1} / {RIGHTS_SECTIONS.length}</span>
                   <Link to="/rights" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors">
                    {t('landing.rightsPreview.all')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                  </Link>
                </div>
              </article>


              <article className={cn(show('more'), "rounded-[20px] bg-card border border-border p-5 shadow-card hover-lift")}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-medium text-primary tabular-nums leading-none">
                        <CountUp to={stats.registered_users} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('landing.stats.registered')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                      <Eye className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-medium text-primary tabular-nums leading-none">
                        <CountUp to={stats.unique_visitors} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('landing.stats.visitors')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                      <MousePointerClick className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-medium text-primary tabular-nums leading-none">
                        <CountUp to={stats.total_visits} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('landing.stats.visits')}</p>
                    </div>
                  </div>
                </div>
              </article>

              <article className={cn(show('help'), "sm:col-span-3 rounded-[20px] bg-card border border-border p-5 sm:p-6 shadow-card hover-lift")}>
                <h2 className="font-subhead text-lg font-semibold text-foreground mb-3">{t('landing.help.title')}</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {HOTLINES.map((h) => (
                    <li key={h.number} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3.5 py-2.5">
                      <span className="min-w-0 text-sm text-muted-foreground leading-snug">{t(h.labelKey)}</span>
                      <a
                        href={`tel:${h.number}`}
                        className="shrink-0 font-display text-lg font-semibold tabular-nums text-primary underline-offset-4 hover:underline"
                      >
                        {h.number}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t('landing.help.hours')}</p>
              </article>
            </section>
          <footer className={cn(show('more'), "sm:hidden mt-4 text-center text-xs text-muted-foreground")}>
            <PartnerBar className="mb-4 text-start" />
            © มูลนิธิเพื่อนพนักงานบริการ (SWING Foundation) · <Link to="/privacy" className="hover:text-foreground">{t('landing.footer')}</Link>
          </footer>
        </main>
      </div>

      <footer className="hidden sm:block max-w-5xl mx-auto px-5 py-8 text-center text-xs text-muted-foreground">
        <PartnerBar className="mb-6 text-start" />
        © มูลนิธิเพื่อนพนักงานบริการ (SWING Foundation) · <Link to="/privacy" className="hover:text-foreground">{t('landing.footer')}</Link>
      </footer>

      <nav className="sm:hidden relative z-10 shrink-0 border-t border-border bg-card/95 backdrop-blur grid grid-cols-4 pb-[env(safe-area-inset-bottom)]" aria-label={t('home.menu')}>
        {([['home', Home], ['rights', Scale], ['help', Phone], ['more', MoreHorizontal]] as const).map(([k, Icon]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
            className={cn('flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors', tab === k ? 'text-primary' : 'text-muted-foreground')}>
            <Icon className="h-5 w-5" />
            {t(`home.tab.${k}`)}
          </button>
        ))}
      </nav>
      <PdpaConsent />
    </div>
  );
}
