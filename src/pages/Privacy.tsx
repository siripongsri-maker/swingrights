import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, CalendarClock } from 'lucide-react';
import { useI18n } from '@/i18n';
import { PartnerBar } from '@/components/PartnerBar';
import { PrivacyContent } from '@/components/PrivacyContent';
import { BrandHeader } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function Privacy() {
  const { t } = useI18n();
  const UPDATED = t('privacy.updatedDate');

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <BrandHeader />
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              to="/"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:-scale-x-100" /> {t('common.back')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10 space-y-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary">
            <ShieldCheck className="w-3.5 h-3.5" /> PDPA
          </span>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{t('privacy.title')}</h1>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="w-3.5 h-3.5" /> {t('privacy.updated').replace('{date}', UPDATED)}
          </p>
        </div>

        <PrivacyContent />

        <PartnerBar className="pt-2" />
      </main>
    </div>
  );
}
