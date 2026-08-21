import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Privacy() {
  const { t } = useI18n();
  const UPDATED = t('privacy.updatedDate');

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-gradient-dark text-white">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center gap-3">
          <Link to="/" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> {t('privacy.title')}
            </h1>
            <p className="text-xs text-white/70">{t('privacy.updated').replace('{date}', UPDATED)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6 space-y-4">
        <Section title={t('privacy.s1.title')}>
          <p>
            {t('privacy.s1.p1')} <span className="text-foreground">dpo@swingthailand.org</span>
          </p>
        </Section>

        <Section title={t('privacy.s2.title')}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacy.s2.li1')}</li>
            <li>{t('privacy.s2.li2')}</li>
            <li>{t('privacy.s2.li3')}</li>
            <li>{t('privacy.s2.li4')}</li>
          </ul>
        </Section>

        <Section title={t('privacy.s3.title')}>
          <p>
            {t('privacy.s3.p1.pre')} <strong className="text-foreground">{t('privacy.s3.p1.strong')}</strong>{' '}
            {t('privacy.s3.p1.post')}
          </p>
        </Section>

        <Section title={t('privacy.s4.title')}>
          <p>
            {t('privacy.s4.p1.pre')} <strong className="text-foreground">{t('privacy.s4.p1.strong')}</strong>{' '}
            {t('privacy.s4.p1.post')}
          </p>
        </Section>

        <Section title={t('privacy.s5.title')}>
          <p>
            {t('privacy.s5.p1.pre')}{' '}
            <strong className="text-foreground">{t('privacy.s5.p1.strong')}</strong>{' '}
            {t('privacy.s5.p1.post')}
          </p>
        </Section>

        <Section title={t('privacy.s6.title')}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacy.s6.li1')}</li>
            <li>{t('privacy.s6.li2')}</li>
            <li>{t('privacy.s6.li3')}</li>
            <li>{t('privacy.s6.li4')}</li>
          </ul>
        </Section>

        <Section title={t('privacy.s7.title')}>
          <p>{t('privacy.s7.p1')}</p>
        </Section>

        <Section title={t('privacy.s8.title')}>
          <p>{t('privacy.s8.intro')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacy.s8.li1')}</li>
            <li>{t('privacy.s8.li2')}</li>
            <li>{t('privacy.s8.li3')}</li>
            <li>{t('privacy.s8.li4')}</li>
            <li>{t('privacy.s8.li5')}</li>
            <li>{t('privacy.s8.li6')}</li>
          </ul>
          <p>{t('privacy.s8.p2')}</p>
        </Section>

        <Section title={t('privacy.s9.title')}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacy.s9.li1')}</li>
            <li>{t('privacy.s9.li2')}</li>
            <li>{t('privacy.s9.li3')}</li>
            <li>{t('privacy.s9.li4')}</li>
          </ul>
        </Section>

        <Section title={t('privacy.s10.title')}>
          <p>{t('privacy.s10.p1')}</p>
        </Section>

        <p className="text-xs text-muted-foreground text-center pb-6">
          {t('privacy.footer')}
        </p>
      </main>
    </div>
  );
}
