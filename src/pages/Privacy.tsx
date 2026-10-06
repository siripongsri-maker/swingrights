import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, CalendarClock, Languages } from 'lucide-react';
import { useI18n } from '@/i18n';
import { PartnerBar } from '@/components/PartnerBar';
import { PrivacyContent } from '@/components/PrivacyContent';
import { BrandHeader } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';

export default function Privacy() {
  const { t, lang } = useI18n();
  const UPDATED = t('privacy.updatedDate');

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header keeps Quick Exit in its slot while reading. Below 640px the wordmark and the
          back label hide so brand, Quick Exit, language and back fit in 360px. */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <BrandHeader className="max-sm:[&>span]:hidden" />
          <div className="flex items-center gap-2">
            <QuickExitSlot />
            <LanguageToggle />
            <Link
              to="/"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t('common.back')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10 space-y-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden /> PDPA
          </span>
          <h1 className="font-display text-[28px] font-bold leading-[1.3] sm:text-[44px] sm:leading-[1.2]">{t('privacy.title')}</h1>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="w-3.5 h-3.5" aria-hidden /> {t('privacy.updated').replace('{date}', UPDATED)}
          </p>
        </div>

        {/* Some legal paragraphs are not translated into my/km/lo yet (they show in English) */}
        {(lang === 'my' || lang === 'km' || lang === 'lo') && (
          <p className="flex items-start gap-2.5 rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-relaxed text-foreground">
            <Languages className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            {t('privacy.enOnlyNote')}
          </p>
        )}

        <PrivacyContent />

        <PartnerBar className="pt-2" />
      </main>
    </div>
  );
}
