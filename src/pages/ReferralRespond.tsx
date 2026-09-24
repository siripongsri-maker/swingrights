import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

interface RefView {
  case_code: string; branch: string | null; violation_types: string[];
  note: string | null; outcome: string; expires_at: string | null;
}

export default function ReferralRespond() {
  const { token = '' } = useParams();
  const { t } = useI18n();
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
        <div className="flex justify-end mb-4"><LanguageToggle /></div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <p className="text-xs text-muted-foreground">{t('ref.page.from')}</p>
          <h1 className="font-display text-xl font-semibold mb-4">{t('ref.page.title')}</h1>

          {state === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />}
          {state === 'invalid' && <p className="text-sm text-destructive">{t('ref.page.invalid')}</p>}

          {data && state !== 'invalid' && (
            <dl className="space-y-3 text-sm mb-5">
              <div><dt className="text-xs text-muted-foreground">{t('ref.page.caseCode')}</dt><dd className="font-mono">{data.case_code}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('ref.page.branch')}</dt><dd>{data.branch || t('ref.page.unspecified')}</dd></div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('ref.page.category')}</dt>
                <dd className="flex flex-wrap gap-1.5 mt-1">
                  {data.violation_types.length ? data.violation_types.map((v, i) => (
                    <span key={i} className="text-[11px] bg-primary-soft text-primary px-2 py-0.5 rounded-full">{v}</span>
                  )) : t('ref.page.unspecified')}
                </dd>
              </div>
              {data.note && <div><dt className="text-xs text-muted-foreground">{t('ref.page.note')}</dt><dd className="whitespace-pre-wrap">{data.note}</dd></div>}
              {state === 'ready' && data.expires_at && (
                <p className="text-[11px] text-muted-foreground">{t('ref.page.expires', { date: new Date(data.expires_at).toLocaleString() })}</p>
              )}
            </dl>
          )}

          {state === 'ready' && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" disabled={busy} onClick={() => void respond('decline')}><X className="w-4 h-4" /> {t('ref.page.decline')}</Button>
               <Button variant="action" disabled={busy} onClick={() => void respond('accept')}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t('ref.page.accept')}</Button>
            </div>
          )}
          {state === 'accepted' && <p className="text-sm text-primary">{t('ref.page.accepted')}</p>}
          {state === 'declined' && <p className="text-sm">{t('ref.page.declined')}</p>}
          {state === 'answered' && <p className="text-sm text-muted-foreground">{t('ref.page.alreadyAnswered')}</p>}

          <p className="text-[11px] text-muted-foreground mt-6 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> {t('ref.page.privacy')}</p>
        </div>
      </div>
    </div>
  );
}
