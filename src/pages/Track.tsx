import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { CaseStatus } from '@/lib/screening';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { QuickExit } from '@/components/screening/QuickExit';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useI18n } from '@/i18n';

interface Result {
  found: boolean;
  case?: { case_code: string; status: CaseStatus; severity: string | null; created_at: string; updated_at: string; branch?: string; risk_level?: string; referral_count?: number };
  timeline?: { status: CaseStatus; note: string | null; created_at: string }[];
}

const STATUS_ORDER: CaseStatus[] = ['received', 'inprogress', 'completed'];

export default function Track() {
  const { t, lang } = useI18n();
  const locale = lang === 'th' ? 'th-TH' : 'en-US';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(params.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const search = async (c: string) => {
    if (c.length < 6) return;
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-case?code=${encodeURIComponent(c)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
      const data = await r.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (code) search(code); /* eslint-disable-line */ }, []);

  return (
    <PhoneShell title={t('track.header')} onClose={() => navigate('/')} contained={false}>
      <QuickExit />
      <div className="flex justify-center pt-4"><LanguageToggle /></div>
      <div className="px-5 pt-6 pb-4 text-center">
        <span className="inline-block bg-primary-soft text-primary text-[10px] tracking-widest px-3 py-1 rounded-full mb-3">SWING FOUNDATION</span>
        <h1 className="text-xl font-medium">{t('track.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('track.subtitle')}</p>
      </div>
      <div className="px-4 pb-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && search(code)}
          placeholder="SW-XXXX-XXXX"
          maxLength={13}
          className="h-12 text-center font-mono tracking-widest text-base"
        />
        <Button onClick={() => search(code)} disabled={loading} className="w-full mt-3 h-11 rounded-xl bg-gradient-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.search')}
        </Button>
      </div>

      {result && (
        <div className="px-4 pb-6">
          {!result.found ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center text-sm text-destructive">
              {t('track.notfound')}
            </div>
          ) : (
            <div className="bg-muted/40 border border-border rounded-xl p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs bg-foreground/90 text-background px-2 py-1 rounded">{result.case!.case_code}</span>
                <StatusBadge value={result.case!.status} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{t('track.area')}: {result.case!.branch || '-'}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('track.savedAt')}: {new Date(result.case!.created_at).toLocaleString(locale)}</p>

              <div className="space-y-3">
                {STATUS_ORDER.map((s, i) => {
                  const isCancelled = result.case!.status === 'cancelled';
                  const reached = STATUS_ORDER.indexOf(result.case!.status) >= i;
                  const event = result.timeline?.find((t) => t.status === s);
                  return (
                    <div key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`w-3 h-3 rounded-full border-2 ${reached && !isCancelled ? 'bg-primary border-primary' : 'bg-card border-border'}`} />
                        {i < STATUS_ORDER.length - 1 && <span className={`flex-1 w-0.5 my-1 ${reached && !isCancelled ? 'bg-primary' : 'bg-border'}`} />}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className={`text-sm font-medium ${reached && !isCancelled ? 'text-foreground' : 'text-muted-foreground'}`}>{t(`status.${s}`)}</p>
                        {event && (
                          <>
                            <p className="text-[11px] text-muted-foreground">{new Date(event.created_at).toLocaleString(locale)}</p>
                            {event.note && <p className="text-xs text-muted-foreground mt-1 bg-card border border-border rounded-md px-2 py-1.5">{event.note}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {result.case!.status === 'cancelled' && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2 text-xs text-destructive">{t('track.cancelled')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </PhoneShell>
  );
}
