import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { PartnerBar } from '@/components/PartnerBar';
import { PrivacyContent } from '@/components/PrivacyContent';

export default function Privacy() {
  const { t } = useI18n();
  const UPDATED = t('privacy.updatedDate');

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary-deep text-primary-foreground">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center gap-3">
          <Link to="/" className="w-10 h-10 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> {t('privacy.title')}
            </h1>
            <p className="text-xs text-sidebar-foreground/70">{t('privacy.updated').replace('{date}', UPDATED)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6 space-y-4">
        <PrivacyContent />
        <PartnerBar />
      </main>
    </div>
  );
}
