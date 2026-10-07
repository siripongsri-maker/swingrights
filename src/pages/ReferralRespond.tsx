import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Loader2, Printer, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { supabase } from '@/integrations/supabase/client';
import { useI18n, type Lang } from '@/i18n';

const DATE_LOCALE: Record<Lang, string> = { th: 'th-TH', en: 'en-GB', my: 'my-MM', km: 'km-KH', lo: 'lo-LA' };

interface RefView {
  case_code: string; branch: string | null; violation_types: string[];
  note: string | null; summary: string | null; severity: string | null; province: string | null; district: string | null; outcome: string; expires_at: string | null;
  letter: Record<string, string> | null; partner_name: string | null; referred_at: string | null;
  nationality: string | null; gender: string | null; age: string | null;
  screening: { q2_score: number; q2_positive: boolean; q9_total: number; q9_level: 'none' | 'mild' | 'moderate' | 'severe' } | null;
}

export default function ReferralRespond() {
  const { token = '' } = useParams();
  const { t, lang } = useI18n();
  const locale = DATE_LOCALE[lang];
  const [data, setData] = useState<RefView | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'accepted' | 'declined' | 'answered'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: d, error } = await supabase.functions.invoke('referral-respond', { body: { token, action: 'view' } });
      if (error || !d || d.error) { setState('invalid'); return; }
      setData(d as RefView);
      setState(d.outcome === 'pending' ? 'ready' : 'answered');
    })();
  }, [token]);

  const respond = async (action: 'accept' | 'decline') => {
    setBusy(true);
    const { data: d, error } = await supabase.functions.invoke('referral-respond', { body: { token, action } });
    setBusy(false);
    if (error || !d?.ok) { setState(d?.error === 'already_answered' ? 'answered' : 'invalid'); return; }
    setState(action === 'accept' ? 'accepted' : 'declined');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex justify-end items-center gap-2 mb-4"><QuickExitSlot /><LanguageToggle /></div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <p className="text-xs text-muted-foreground">{t('ref.page.from')}</p>
          <h1 className="font-display text-xl font-semibold leading-snug mb-4">{t('ref.page.title')}</h1>

          {state === 'loading' && (
            <div role="status" className="flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden />
              <span className="sr-only">{t('ui.loading')}</span>
            </div>
          )}
          {state === 'invalid' && <p className="text-sm text-destructive">{t('ref.page.invalid')}</p>}

          {data && state !== 'invalid' && (
            <dl className="space-y-3 text-sm mb-5">
              <div><dt className="text-xs text-muted-foreground">{t('ref.page.caseCode')}</dt><dd className="font-mono">{data.case_code}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('ref.page.branch')}</dt><dd>{data.branch || t('ref.page.unspecified')}</dd></div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('ref.page.category')}</dt>
                <dd className="flex flex-wrap gap-1.5 mt-1">
                  {data.violation_types.length ? data.violation_types.map((v, i) => (
                    <span key={i} className="text-xs bg-primary-soft text-primary px-2 py-0.5 rounded-full">{v}</span>
                  )) : t('ref.page.unspecified')}
                </dd>
              </div>
              {(data.province || data.district) && <div><dt className="text-xs text-muted-foreground">{t('ref.page.area')}</dt><dd>{[data.district, data.province].filter(Boolean).join(' · ')}</dd></div>}
              {data.severity && <div><dt className="text-xs text-muted-foreground">{t('ref.page.severity')}</dt><dd>{t(`ref.sev.${data.severity}`)}</dd></div>}
              {(data.nationality || data.gender || data.age) && (
                <div>
                  <dt className="text-xs text-muted-foreground">{t('ref.page.demographics')}</dt>
                  <dd className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 mt-1">
                    <span><span className="block text-xs text-muted-foreground">{t('ref.page.nationality')}</span>{data.nationality || t('ref.page.unspecified')}</span>
                    <span><span className="block text-xs text-muted-foreground">{t('ref.page.gender')}</span>{data.gender || t('ref.page.unspecified')}</span>
                    <span><span className="block text-xs text-muted-foreground">{t('ref.page.age')}</span>{data.age ? t('ref.page.ageValue', { age: data.age }) : t('ref.page.unspecified')}</span>
                  </dd>
                </div>
              )}
              {data.screening && (
                <div>
                  <dt className="text-xs text-muted-foreground">{t('ref.page.screening')}</dt>
                  <dd className="mt-1 rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3"><span>{t('ref.page.q2')}</span><strong>{data.screening.q2_score}/2 · {data.screening.q2_positive ? t('ref.page.q2Positive') : t('ref.page.q2Negative')}</strong></div>
                    <div className="flex items-center justify-between gap-3"><span>{t('ref.page.q9')}</span><strong>{data.screening.q9_total}/27 · {t(`tools.level.${data.screening.q9_level}`)}</strong></div>
                  </dd>
                </div>
              )}
              {data.summary && <div><dt className="text-xs text-muted-foreground">{t('ref.page.summary')}</dt><dd className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 mt-1">{data.summary}</dd></div>}
              {data.letter && (
                <div className="referral-letter rounded-xl border border-border p-4 space-y-3 bg-background">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-subhead font-semibold text-primary">{t('ref.page.letter')}</p>
                      <p className="text-xs text-muted-foreground">{t('ref.page.letterFrom')}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-auto min-h-11 whitespace-normal text-start print:hidden" onClick={() => window.print()}><Printer className="w-4 h-4" aria-hidden /> {t('ref.page.print')}</Button>
                  </div>
                  <p className="text-sm">{t('ref.page.letterTo')} {data.partner_name ?? t('ref.page.unspecified')} · <span className="font-mono">{data.case_code}</span>{data.referred_at ? ` · ${new Date(data.referred_at).toLocaleDateString(locale)}` : ''}</p>
                  {(['overview', 'details', 'impact', 'actions'] as const).map((k) => data.letter?.[k] ? (
                    <div key={k}>
                      <p className="text-xs font-semibold border-s-4 border-primary ps-2">{t(`ref.letter.${k}`)}</p>
                      <p className="whitespace-pre-wrap text-sm mt-1">{data.letter[k]}</p>
                    </div>
                  ) : null)}
                </div>
              )}
              {data.note && <div><dt className="text-xs text-muted-foreground">{t('ref.page.note')}</dt><dd className="whitespace-pre-wrap">{data.note}</dd></div>}
              {state === 'ready' && data.expires_at && (
                <p className="text-xs text-muted-foreground">{t('ref.page.expires', { date: new Date(data.expires_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) })}</p>
              )}
            </dl>
          )}

          {state === 'ready' && (
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto min-h-12 whitespace-normal text-balance" disabled={busy} onClick={() => void respond('decline')}><X className="w-4 h-4" aria-hidden /> {t('ref.page.decline')}</Button>
              <Button variant="action" className="h-auto min-h-12 whitespace-normal text-balance" disabled={busy} onClick={() => void respond('accept')}>{busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Check className="w-4 h-4" aria-hidden />} {t('ref.page.accept')}</Button>
            </div>
          )}
          {state === 'accepted' && <p role="status" className="text-sm text-primary">{t('ref.page.accepted')}</p>}
          {state === 'declined' && <p role="status" className="text-sm">{t('ref.page.declined')}</p>}
          {state === 'answered' && <p className="text-sm text-muted-foreground">{t('ref.page.alreadyAnswered')}</p>}

          <p className="text-xs text-muted-foreground mt-6 flex items-start gap-1.5"><ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden /> {t('ref.page.privacy')}</p>
        </div>
      </div>
    </div>
  );
}
