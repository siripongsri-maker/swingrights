import { useI18n } from '@/i18n';

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6 shadow-card space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary tabular-nums">
          {num}
        </span>
        <h2 className="font-subhead text-base sm:text-lg font-semibold text-foreground leading-snug">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed ps-11">{children}</div>
    </section>
  );
}

/** Shared PDPA privacy policy body, used by the /privacy page. */
export function PrivacyContent() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <Section num={1} title={t('privacy.s1.title').replace(/^\d+\.\s*/, '')}>
        <p>
          {t('privacy.s1.p1')} <span className="font-medium text-foreground">dpo@swingthailand.org</span>
        </p>
      </Section>

      <Section num={2} title={t('privacy.s2.title').replace(/^\d+\.\s*/, '')}>
        <ul className="list-disc ps-5 space-y-1">
          <li>{t('privacy.s2.li1')}</li>
          <li>{t('privacy.s2.li2')}</li>
          <li>{t('privacy.s2.li3')}</li>
          <li>{t('privacy.s2.li4')}</li>
        </ul>
      </Section>

      <Section num={3} title={t('privacy.s3.title').replace(/^\d+\.\s*/, '')}>
        <p>
          {t('privacy.s3.p1.pre')} <strong className="text-foreground">{t('privacy.s3.p1.strong')}</strong>{' '}
          {t('privacy.s3.p1.post')}
        </p>
      </Section>

      <Section num={4} title={t('privacy.s4.title').replace(/^\d+\.\s*/, '')}>
        <p>
          {t('privacy.s4.p1.pre')} <strong className="text-foreground">{t('privacy.s4.p1.strong')}</strong>{' '}
          {t('privacy.s4.p1.post')}
        </p>
      </Section>

      <Section num={5} title={t('privacy.s5.title').replace(/^\d+\.\s*/, '')}>
        <p>
          {t('privacy.s5.p1.pre')}{' '}
          <strong className="text-foreground">{t('privacy.s5.p1.strong')}</strong>{' '}
          {t('privacy.s5.p1.post')}
        </p>
      </Section>

      <Section num={6} title={t('privacy.s6.title').replace(/^\d+\.\s*/, '')}>
        <ul className="list-disc ps-5 space-y-1">
          <li>{t('privacy.s6.li1')}</li>
          <li>{t('privacy.s6.li2')}</li>
          <li>{t('privacy.s6.li3')}</li>
          <li>{t('privacy.s6.li4')}</li>
        </ul>
      </Section>

      <Section num={7} title={t('privacy.s7.title').replace(/^\d+\.\s*/, '')}>
        <p>{t('privacy.s7.p1')}</p>
      </Section>

      <Section num={8} title={t('privacy.s8.title').replace(/^\d+\.\s*/, '')}>
        <p>{t('privacy.s8.intro')}</p>
        <ul className="list-disc ps-5 space-y-1">
          <li>{t('privacy.s8.li1')}</li>
          <li>{t('privacy.s8.li2')}</li>
          <li>{t('privacy.s8.li3')}</li>
          <li>{t('privacy.s8.li4')}</li>
          <li>{t('privacy.s8.li5')}</li>
          <li>{t('privacy.s8.li6')}</li>
        </ul>
        <p>{t('privacy.s8.p2')}</p>
      </Section>

      <Section num={9} title={t('privacy.s9.title').replace(/^\d+\.\s*/, '')}>
        <ul className="list-disc ps-5 space-y-1">
          <li>{t('privacy.s9.li1')}</li>
          <li>{t('privacy.s9.li2')}</li>
          <li>{t('privacy.s9.li3')}</li>
          <li>{t('privacy.s9.li4')}</li>
        </ul>
      </Section>

      <Section num={10} title={t('privacy.s10.title').replace(/^\d+\.\s*/, '')}>
        <p>{t('privacy.s10.p1')}</p>
      </Section>

      <p className="text-xs text-muted-foreground text-center pb-2">
        {t('privacy.footer')}
      </p>
    </div>
  );
}
