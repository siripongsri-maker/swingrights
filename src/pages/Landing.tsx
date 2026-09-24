import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mic, Search, ArrowRight, Lock, Leaf, HeartHandshake, Sparkles, Users, Eye, MousePointerClick, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import heroBotanical from '@/assets/hero-botanical.png';
import { RIGHTS } from '@/data/rights';

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
  const [rightIndex, setRightIndex] = useState(0);

  const showPreviousRight = () => setRightIndex((current) => (current - 1 + RIGHTS.length) % RIGHTS.length);
  const showNextRight = () => setRightIndex((current) => (current + 1) % RIGHTS.length);
  const featuredRight = RIGHTS[rightIndex];
  const FeaturedRightIcon = featuredRight?.icon;

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
      <div className="relative overflow-hidden bg-gradient-leaf grain">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-floaty" />
        <div className="pointer-events-none absolute top-40 -left-20 w-72 h-72 rounded-full bg-primary-soft/60 blur-3xl animate-floaty" style={{ animationDelay: '1.5s' }} />

        {/* Drifting leaves — ambient botanical motion */}
        <Leaf className="pointer-events-none absolute top-28 left-[7%] w-5 h-5 text-primary/25 animate-drift" aria-hidden />
        <Leaf className="pointer-events-none absolute top-[52%] right-[5%] w-4 h-4 text-primary/20 animate-drift" style={{ animationDelay: '2.2s' }} aria-hidden />
        <Leaf className="pointer-events-none absolute bottom-40 left-[14%] w-6 h-6 text-primary/15 animate-drift" style={{ animationDelay: '4.4s' }} aria-hidden />

        <header className="relative max-w-5xl mx-auto px-5 pt-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-medium tracking-tight">{t('app.name')}</span>
          </div>
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
              <span className="inline-flex items-center gap-1.5 bg-card/80 backdrop-blur border border-border text-primary text-[10px] font-medium tracking-[0.16em] px-3.5 py-1.5 rounded-full mb-5">
                <Sparkles className="w-3 h-3" /> {t('landing.badge')}
              </span>
              <h1 className="font-display text-4xl sm:text-[3.25rem] font-medium leading-[1.1] text-balance mb-4">
                {t('landing.title1')}<br />
                <span className="text-primary">{t('landing.title2')}</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-lg mx-auto sm:mx-0 mb-8 text-balance leading-relaxed">
                {t('landing.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                <Link to="/report">
                  <Button size="lg" className="h-13 px-7 py-6 rounded-full bg-gradient-primary shadow-elegant hover-lift text-base w-full sm:w-auto">
                    <HeartHandshake className="w-4 h-4" /> {t('landing.cta.report')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                  </Button>
                </Link>
                <Link to="/track">
                  <Button size="lg" variant="outline" className="h-13 px-7 py-6 rounded-full bg-card/70 backdrop-blur hover-lift text-base w-full sm:w-auto">
                    <Search className="w-4 h-4" /> {t('landing.cta.track')}
                  </Button>
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 justify-center sm:justify-start">
                <Link to="/intake" className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4 hover:text-primary/80 transition">
                  <Mic className="w-4 h-4" /> {t('landing.cta.start')} ({t('nav.staff')})
                </Link>
                <Link to="/rights">
                  <Button size="sm" variant="secondary" className="rounded-full">
                    <Scale className="w-4 h-4" /> {t('rights.nav')}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-52 sm:w-full max-w-[19rem]">
              <div className="absolute inset-6 rounded-full bg-primary-soft/50 blur-2xl" aria-hidden />
              <img
                src={heroBotanical}
                alt="ภาพประกอบมือประคองต้นกล้า — การดูแลและเยียวยา"
                width={1024}
                height={1024}
                className="relative w-full animate-floaty drop-shadow-xl"
              />
            </div>
          </div>

          {/* Bento grid — revealed on scroll */}
          <Reveal>
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-14 stagger">
              <article className="sm:col-span-2 relative overflow-hidden rounded-[1.75rem] bg-card border border-border p-6 shadow-card" aria-roledescription="carousel" aria-label={t('landing.rightsPreview.title')}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">{t('rights.nav')}</p>
                    <h2 className="font-display text-xl font-medium">{t('landing.rightsPreview.title')}</h2>
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

                {featuredRight && FeaturedRightIcon && (
                  <div className="min-h-[9.5rem]" aria-live="polite" aria-atomic="true">
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm ring-1 ring-primary/10">
                        <FeaturedRightIcon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-medium leading-snug mb-2">{featuredRight.title}</h3>
                        <p className="text-base text-muted-foreground leading-relaxed line-clamp-2">{featuredRight.body}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 mt-3">
                  <span className="text-xs text-muted-foreground tabular-nums">{rightIndex + 1} / {RIGHTS.length}</span>
                  <Link to="/rights" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    {t('landing.rightsPreview.all')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                  </Link>
                </div>
              </article>

              <article className="rounded-[1.75rem] bg-primary text-primary-foreground p-6 shadow-elegant hover-lift">
                <ShieldCheck className="w-5 h-5 mb-4 opacity-90" />
                <h2 className="font-display text-xl font-medium mb-1.5">{t('landing.card2.title')}</h2>
                <p className="text-sm opacity-85 leading-relaxed">
                  {t('landing.card2.body')}
                </p>
              </article>

              <article className="rounded-[1.75rem] bg-card border border-border p-5 shadow-card hover-lift">
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

              <article className="sm:col-span-2 rounded-[1.75rem] bg-accent border border-border p-6 shadow-card hover-lift">
                <h2 className="font-display text-lg font-medium text-accent-foreground mb-1.5">{t('landing.help.title')}</h2>
                <p className="text-sm text-accent-foreground/80 leading-relaxed">
                  {t('landing.help.body')} <a href="tel:1323" className="font-medium underline underline-offset-4">1323</a> · {t('landing.help.hours')}
                </p>
              </article>
            </section>
          </Reveal>
        </main>
      </div>

      <footer className="max-w-5xl mx-auto px-5 py-8 text-center text-xs text-muted-foreground">
        © SWING Foundation · <Link to="/privacy" className="hover:text-primary">{t('landing.footer')}</Link> · <Link to="/recover" className="hover:text-primary">กู้เคสค้างในเครื่อง</Link>
      </footer>
    </div>
  );
}
