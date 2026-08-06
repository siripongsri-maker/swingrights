import { Link } from 'react-router-dom';
import { ShieldCheck, Mic, Search, ArrowRight, Lock, Leaf, HeartHandshake, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useI18n } from '@/i18n';

export default function Landing() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-leaf grain">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-floaty" />
        <div className="pointer-events-none absolute top-40 -left-20 w-72 h-72 rounded-full bg-primary-soft/60 blur-3xl animate-floaty" style={{ animationDelay: '1.5s' }} />

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

        <main className="relative max-w-5xl mx-auto px-5 pt-14 pb-16">
          <div className="text-center animate-slide-up">
            <span className="inline-flex items-center gap-1.5 bg-card/80 backdrop-blur border border-border text-primary text-[10px] font-medium tracking-[0.16em] px-3.5 py-1.5 rounded-full mb-5">
              <Sparkles className="w-3 h-3" /> {t('landing.badge')}
            </span>
            <h1 className="font-display text-4xl sm:text-[3.25rem] font-medium leading-[1.1] text-balance mb-4">
              {t('landing.title1')}<br />
              <span className="text-primary">{t('landing.title2')}</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-lg mx-auto mb-8 text-balance leading-relaxed">
              {t('landing.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/intake">
                <Button size="lg" className="h-13 px-7 py-6 rounded-full bg-gradient-primary shadow-elegant hover-lift text-base">
                  <Mic className="w-4 h-4" /> {t('landing.cta.start')} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/track">
                <Button size="lg" variant="outline" className="h-13 px-7 py-6 rounded-full bg-card/70 backdrop-blur hover-lift text-base">
                  <Search className="w-4 h-4" /> {t('landing.cta.track')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Bento grid */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-14">
            <article className="sm:col-span-2 relative overflow-hidden rounded-[1.75rem] bg-card border border-border p-6 shadow-card hover-lift animate-bloom">
              <div className="w-10 h-10 rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
                <HeartHandshake className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-medium mb-1.5">{t('landing.card1.title')}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                {t('landing.card1.body')}
              </p>
              <div className="pointer-events-none absolute -bottom-10 -right-6 w-40 h-40 rounded-full bg-gradient-primary opacity-10" />
            </article>

            <article className="rounded-[1.75rem] bg-primary text-primary-foreground p-6 shadow-elegant hover-lift animate-bloom" style={{ animationDelay: '80ms' }}>
              <ShieldCheck className="w-5 h-5 mb-4 opacity-90" />
              <h2 className="font-display text-xl font-medium mb-1.5">{t('landing.card2.title')}</h2>
              <p className="text-sm opacity-85 leading-relaxed">
                {t('landing.card2.body')}
              </p>
            </article>

            <article className="rounded-[1.75rem] bg-card border border-border p-6 shadow-card hover-lift animate-bloom" style={{ animationDelay: '140ms' }}>
              <p className="font-display text-3xl font-medium text-primary tabular-nums">9</p>
              <p className="text-sm text-muted-foreground mt-1">{t('landing.stat.label')}</p>
            </article>

            <article className="sm:col-span-2 rounded-[1.75rem] bg-accent border border-border p-6 shadow-card hover-lift animate-bloom" style={{ animationDelay: '200ms' }}>
              <h2 className="font-display text-lg font-medium text-accent-foreground mb-1.5">{t('landing.help.title')}</h2>
              <p className="text-sm text-accent-foreground/80 leading-relaxed">
                {t('landing.help.body')} <a href="tel:1323" className="font-medium underline underline-offset-4">1323</a> · {t('landing.help.hours')}
              </p>
            </article>
          </section>
        </main>
      </div>

      <footer className="max-w-5xl mx-auto px-5 py-8 text-center text-xs text-muted-foreground">
        © SWING Foundation · <Link to="/privacy" className="hover:text-primary">{t('landing.footer')}</Link>
      </footer>
    </div>
  );
}
