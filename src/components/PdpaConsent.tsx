import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/i18n';

const KEY = 'sw_pdpa_consent_v1';

/** Bottom-sheet PDPA acknowledgement + data-use consent, shown once per device. */
export function PdpaConsent() {
  const { t } = useI18n();
  const [open, setOpen] = useState(() => {
    try { return !localStorage.getItem(KEY); } catch { return true; }
  });
  const [ack, setAck] = useState(false);
  const [consent, setConsent] = useState(false);
  if (!open) return null;

  const accept = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pdpa-title">
      <div className="w-full max-w-lg rounded-t-[1.5rem] border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card animate-slide-up">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" aria-hidden />
        <div className="flex items-start gap-3 mb-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h2 id="pdpa-title" className="font-subhead text-lg font-semibold leading-snug">{t('pdpa.title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t('pdpa.body')}</p>
        <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 mb-2 cursor-pointer min-h-11">
          <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
          <span className="text-sm leading-snug">{t('pdpa.ack')}</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 mb-3 cursor-pointer min-h-11">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <span className="text-sm leading-snug">{t('pdpa.consent')}</span>
        </label>
        <Link to="/privacy" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline mb-2">
          {t('pdpa.read')}
        </Link>
        <Button variant="action" size="lg" className="w-full" disabled={!ack || !consent} onClick={accept}>
          {t('pdpa.accept')}
        </Button>
      </div>
    </div>
  );
}
