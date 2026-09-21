import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mic, Search, ArrowRight, Lock, Leaf, HeartHandshake, Sparkles, Users, Eye, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import heroBotanical from '@/assets/hero-botanical.png';

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
              <div className="mt-4">
                <Link to="/intake" className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4 hover:text-primary/80 transition">
                  <Mic className="w-4 h-4" /> {t('landing.cta.start')} ({t('nav.staff')})
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
              <article className="sm:col-span-2 relative overflow-hidden rounded-[1.75rem] bg-card border border-border p-6 shadow-card hover-lift">
                <div className="w-10 h-10 rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
                  <HeartHandshake className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-display text-xl font-medium mb-1.5">{t('landing.card1.title')}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  {t('landing.card1.body')}
                </p>
                <div className="pointer-events-none absolute -bottom-10 -right-6 w-40 h-40 rounded-full bg-gradient-primary opacity-10" />
              </article>

              <article className="rounded-[1.75rem] bg-primary text-primary-foreground p-6 shadow-elegant hover-lift">
                <ShieldCheck className="w-5 h-5 mb-4 opacity-90" />
                <h2 className="font-display text-xl font-medium mb-1.5">{t('landing.card2.title')}</h2>
                <p className="text-sm opacity-85 leading-relaxed">
                  {t('landing.card2.body')}
                </p>
              </article>

              <article className="rounded-[1.75rem] bg-card border border-border p-6 shadow-card hover-lift">
                <p className="font-display text-3xl font-medium text-primary tabular-nums">
                  <CountUp to={9} />
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('landing.stat.label')}</p>
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
