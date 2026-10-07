import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Search, ArrowRight, Lock, HeartHandshake, Scale, AudioWaveform, AudioLines, Menu, Home, Phone, MoreHorizontal, BadgeCheck, UserX } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { PdpaConsent } from '@/components/PdpaConsent';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { Illus, type IllusName } from '@/components/Illus';
import { SoftWave } from '@/components/SoftWave';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { RIGHTS, RIGHTS_SECTIONS, type RightsSectionId } from '@/data/rights';
import { HOTLINES, SWING_BRANCHES } from '@/data/hotlines';
import { BrandHeader, BrandLockup } from '@/components/BrandLogo';
import { PartnerBar } from '@/components/PartnerBar';

/** Hotline groups: SWING branches first (from the shared SWING_BRANCHES), then public lines. */
const HOTLINE_GROUPS: { key: string; rows: { number: string; tel: string; labelKey: string }[]; allDay: boolean }[] = [
  { key: 'landing.hl.swing', rows: SWING_BRANCHES.map((b) => ({ number: b.display, tel: b.tel, labelKey: b.nameKey })), allDay: false },
  // Only the public lines carry the 24-hour note; SWING office hours are not confirmed yet.
  { key: 'landing.hl.public', rows: HOTLINES.map((h) => ({ number: h.number, tel: h.number, labelKey: h.labelKey })), allDay: true },
];

/** Desktop "what you can do here" cards. */
const WHAT_CARDS: [to: string, illus: IllusName, titleKey: string, bodyKey: string][] = [
  ['/report', 'speak', 'landing.what.report', 'landing.what.reportBody'],
  ['/track', 'call', 'landing.what.track', 'landing.what.trackBody'],
  ['/rights', 'lawyer', 'landing.what.rights', 'landing.what.rightsBody'],
];

/** Labelled on/off switch for the decorative sound-wave band (menu sheet and More tab). */
function WaveSwitch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2 text-sm text-foreground">
      <span className="inline-flex items-center gap-2">
        <AudioWaveform className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        {label}
      </span>
      <Switch id={id} checked={on} onCheckedChange={onChange} />
    </label>
  );
}

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
  const { t, lang } = useI18n();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
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
  const setWave = (on: boolean) => {
    setWaveOn(on);
    try { localStorage.setItem('sw_wave_off', on ? '0' : '1'); } catch { /* ignore */ }
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
      <div className="relative flex-1 min-h-0 flex flex-col sm:block overflow-hidden bg-transparent">
        <header className="relative shrink-0 max-w-[1120px] w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-7 flex items-center justify-between gap-3">
          <BrandHeader />
          <div className="hidden sm:flex items-center gap-3">
            {/* One fixed name plus aria-pressed; the icon and fill also change with the state */}
            <button
              type="button"
              onClick={() => setWave(!waveOn)}
              aria-pressed={waveOn}
              title={t('ui.wave.show')}
              aria-label={t('ui.wave.show')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 backdrop-blur text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground aria-pressed:bg-primary-soft aria-pressed:text-foreground"
            >
              {waveOn ? <AudioWaveform className="w-4 h-4" aria-hidden /> : <AudioLines className="w-4 h-4" aria-hidden />}
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
              <Lock className="w-3.5 h-3.5" aria-hidden /> {t('nav.staff')}
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:hidden">
          <QuickExitSlot />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="sm:hidden h-11 w-11 rounded-full bg-card/80" aria-label={t('home.menu')}>
                <Menu className="w-5 h-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72" aria-describedby={undefined}>
              <SheetTitle className="font-subhead mb-6">{t('home.menu')}</SheetTitle>
              <div className="flex flex-col items-start gap-4">
                <WaveSwitch on={waveOn} onChange={setWave} label={t('ui.wave.show')} />
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
                  <Lock className="w-3.5 h-3.5" aria-hidden /> {t('nav.staff')}
                </Link>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </header>

        <main className="relative flex-1 min-h-0 overflow-y-auto sm:overflow-visible max-w-[1120px] w-full mx-auto px-4 sm:px-6 pt-3 sm:pt-14 pb-6 sm:pb-16">
          {/* Home: hero */}
          <section className={cn(show('home'), 'sm:grid sm:grid-cols-[1.1fr_0.9fr] sm:items-center sm:gap-10 animate-slide-up')}>
            <div className="min-w-0">
              <BrandLockup className="hidden sm:flex mb-7" />
              <div className="flex items-center justify-between gap-3 mb-4">
                <ul className="min-w-0 flex flex-wrap gap-2">
                  {([[BadgeCheck, 'landing.trust.free'], [Lock, 'landing.trust.private'], [UserX, 'landing.trust.noSignup']] as const).map(([Icon, k]) => (
                    <li key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
                      <Icon className="w-3.5 h-3.5 text-accent" aria-hidden /> {t(k)}
                    </li>
                  ))}
                </ul>
                {/* Phone only; on desktop the same figure stands on the rights card */}
                <Illus name="hero" eager className="sm:hidden w-16 shrink-0" />
              </div>
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
                  <Illus name="lawyer" className="w-12 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-subhead text-sm font-semibold text-foreground">{t('landing.arrested.title')}</span>
                    <span className="block text-xs text-muted-foreground">{t('landing.arrested.sub')}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden />
                </Link>
              </div>
            </div>

            {/* Desktop: first rights card, with the hero figure standing on its top edge.
                The card comes later in the DOM and is positioned, so it covers the figure's
                cropped bottom. */}
            <div className="hidden sm:block relative mt-36">
              <Illus name="hero" eager className="absolute bottom-full end-6 w-[120px] translate-y-4" />
              <aside className="relative rounded-[20px] bg-card border border-border p-6 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft"><Scale className="w-5 h-5 text-foreground" aria-hidden /></span>
                  <h2 className="font-subhead font-semibold">{t('landing.arrested.title')}</h2>
                </div>
                <ol className="space-y-2.5 mb-4">
                  {RIGHTS.slice(0, 3).map((r, i) => (
                    <li key={r.id} className="flex gap-3 rounded-2xl bg-background px-3.5 py-3 text-sm text-foreground">
                      <span className="font-mono tabular-nums text-accent font-semibold">{i + 1}</span>
                      <span lang="th">{r.title}</span>
                    </li>
                  ))}
                </ol>
                {lang !== 'th' && <p className="mb-2 text-xs text-muted-foreground">{t('landing.arrested.thaiOnly')}</p>}
                <Link to="/rights" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                  {t('landing.arrested.all').replace('{n}', String(RIGHTS.length))} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
                </Link>
              </aside>
            </div>
          </section>

          {/* Desktop: soft sound-wave band under the hero (fewer bars on narrow tablets) */}
          {waveOn && (
            <>
              <SoftWave bars={96} className="hidden sm:flex lg:hidden h-16 mt-12" />
              <SoftWave bars={170} className="hidden lg:flex h-16 mt-12" />
            </>
          )}

          {/* Desktop: what you can do here */}
          <section className="hidden sm:block mt-16" aria-labelledby="what-title">
            <h2 id="what-title" className="font-subhead font-semibold mb-5">{t('landing.what.title')}</h2>
            <div className="grid grid-cols-3 gap-4">
              {WHAT_CARDS.map(([to, illus, k, b]) => (
                <Link key={to} to={to} className="group rounded-[20px] bg-card border border-border p-5 shadow-card transition-colors hover:bg-primary-soft">
                  {/* Same height on all 3 cards so the titles line up */}
                  <Illus name={illus} className="h-[92px] w-auto mb-3" />
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
            <div className="flex items-end justify-between gap-3 mb-4">
              <h2 id="hl-title" className="font-subhead font-semibold">{t('landing.help.title')}</h2>
              {/* Phone tab only: on desktop 'call' already sits on the track-case card */}
              <Illus name="call" className="sm:hidden w-16 shrink-0" />
            </div>
            {HOTLINE_GROUPS.map((g) => (
              <div key={g.key} className="mb-5">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">{t(g.key)}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {g.rows.map((h) => (
                    <li key={h.number}>
                      <a href={`tel:${h.tel}`} aria-label={`${t('landing.hl.call')} ${t(h.labelKey)} ${h.number}`}
                        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-card transition-colors hover:bg-primary-soft">
                        <span className="min-w-0 text-sm text-foreground">{t(h.labelKey)}</span>
                        <span className="inline-flex shrink-0 items-center gap-2 font-mono text-xl font-semibold tabular-nums text-foreground">
                          {h.number} <Phone className="w-4 h-4 text-accent" aria-hidden />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                {g.allDay && <p className="mt-2 text-xs text-muted-foreground">{t('landing.help.hours')}</p>}
              </div>
            ))}
          </section>

          {/* Mobile tab: more */}
          <section className={cn(tab === 'more' ? 'block' : 'hidden', 'sm:hidden space-y-3')}>
            <Link to={signedIn ? '/me' : '/signin'} className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card px-4 font-semibold text-foreground shadow-card">
              {signedIn ? t('cl.nav.account') : t('cl.nav.signin')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
            </Link>
            <Link to="/admin/login" className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card px-4 text-foreground shadow-card">
              <span className="inline-flex items-center gap-2"><Lock className="w-4 h-4" aria-hidden /> {t('nav.staff')}</span> <ArrowRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
            </Link>
            <LanguageToggle />
            <WaveSwitch on={waveOn} onChange={setWave} label={t('ui.wave.show')} />
            <Link to="/privacy" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent">{t('landing.footer')}</Link>
            <PartnerBar className="text-start" />
            <p className="text-xs text-muted-foreground">{t('landing.copyright')}</p>
          </section>
        </main>
      </div>

      <footer className="hidden sm:block max-w-[1120px] mx-auto px-6 pt-16 pb-8 text-center text-xs text-muted-foreground">
        <PartnerBar className="mb-6 text-start" />
        {t('landing.copyright')} · <Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-foreground">{t('landing.footer')}</Link>
      </footer>

      {/* Phone: soft sound-wave band just above the tab bar, in the layout (never behind text) */}
      {waveOn && <SoftWave bars={56} className="sm:hidden h-11 shrink-0 px-4" />}

      <nav className="sw-bottom-nav sm:hidden relative z-10 shrink-0 border-t border-border bg-card/95 backdrop-blur grid grid-cols-4 pb-[env(safe-area-inset-bottom)]" aria-label={t('home.menu')}>
        {([['home', Home], ['rights', Scale], ['help', Phone], ['more', MoreHorizontal]] as const).map(([k, Icon]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
            className={cn('flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors', tab === k ? 'text-accent font-semibold' : 'text-muted-foreground')}>
            <Icon className="h-5 w-5" aria-hidden />
            {t(`home.tab.${k}`)}
          </button>
        ))}
      </nav>
      <PdpaConsent />
    </div>
  );
}
