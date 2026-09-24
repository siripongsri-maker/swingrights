import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mic, Search, ArrowRight, Lock, HeartHandshake, Sparkles, Users, Eye, MousePointerClick, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [stats, setStats] = useState<SiteStats>({ registered_users: 0, unique_visitors: 0, total_visits: 0 });
  const [rightsSectionIndex, setRightsSectionIndex] = useState(0);

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
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-background">
        <header className="relative max-w-5xl mx-auto px-5 pt-7 flex items-center justify-between gap-3">
          <BrandHeader />
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/rights" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              {t('rights.nav')}
            </Link>
            <Link to="/privacy" className="hidden sm:inline text-xs text-muted-foreground hover:text-primary transition-colors">
              {t('nav.privacy')}
            </Link>
            <Link
              to="/admin/login"
              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 rounded-full border border-border bg-card/70 backdrop-blur px-3 py-1.5 transition-colors"
            >
              <Lock className="w-3 h-3" /> {t('nav.staff')}
            </Link>
          </div>
        </header>

        <main className="relative max-w-5xl mx-auto px-5 pt-10 sm:pt-14 pb-16">
          <div className="grid sm:grid-cols-[1.15fr_0.85fr] items-center gap-6 sm:gap-10 animate-slide-up">
            <div className="text-center sm:text-start">
              <BrandLockup className="mx-auto mb-7 sm:mx-0" />
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground text-[10px] font-semibold px-3.5 py-1.5 rounded-full mb-5">
                <Sparkles className="w-3 h-3" /> {t('landing.badge')}
              </span>
              <h1 className="font-display text-4xl sm:text-[2.75rem] font-bold leading-[1.1] text-balance mb-4">
                {t('landing.title1')}<br />
                 <span>{t('landing.title2')}</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-lg mx-auto sm:mx-0 mb-8 text-balance leading-relaxed">
                {t('landing.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                <Link to="/report">
                  <Button size="lg" variant="action" className="px-7 shadow-elegant text-base w-full sm:w-auto">
                    <HeartHandshake className="w-4 h-4" /> {t('landing.cta.report')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                  </Button>
                </Link>
                <Link to="/track">
                  <Button size="lg" variant="outline" className="px-7 bg-card text-base w-full sm:w-auto">
                    <Search className="w-4 h-4" /> {t('landing.cta.track')}
                  </Button>
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 justify-center sm:justify-start">
                <Link to="/intake" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground transition">
                  <Mic className="w-4 h-4" /> {t('landing.cta.start')} ({t('nav.staff')})
                </Link>
                <Link to="/rights">
                  <Button size="sm" variant="secondary" className="rounded-full">
                    <Scale className="w-4 h-4" /> {t('rights.nav')}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[19rem] items-end justify-center gap-1" aria-hidden>
              {[9, 15, 24, 38, 56, 76, 52, 32, 19, 12].map((height, index) => (
                <span key={index} className={index === 5 ? 'w-1 rounded-full bg-highlight-soft' : 'w-1 rounded-full bg-highlight'} style={{ height }} />
              ))}
            </div>
          </div>

          {/* Bento grid — revealed on scroll */}
          <Reveal>
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-14 stagger">
              <article className="sm:col-span-2 relative overflow-hidden rounded-[20px] bg-card border border-border p-6 shadow-card" aria-roledescription="carousel" aria-label={t('landing.rightsPreview.title')}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">{t('rights.nav')}</p>
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


              <article className="rounded-[20px] bg-card border border-border p-5 shadow-card hover-lift">
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

              <article className="sm:col-span-2 rounded-[20px] bg-card border border-border p-6 shadow-card hover-lift">
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
          </Reveal>
        </main>
      </div>

      <footer className="max-w-5xl mx-auto px-5 py-8 text-center text-xs text-muted-foreground">
        <PartnerBar className="mb-6 text-start" />
        © มูลนิธิเพื่อนพนักงานบริการ (SWING Foundation) · <Link to="/privacy" className="hover:text-foreground">{t('landing.footer')}</Link> · <Link to="/recover" className="hover:text-foreground">{t('landing.footer.recover')}</Link>
      </footer>
    </div>
  );
}
