import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { useI18n } from '@/i18n';

const KEY = 'sw_pdpa_consent_v1';

/**
 * PDPA acknowledgement + data-use consent, shown once per device. A bottom sheet on phones and a
 * centred card from 640px. The top row keeps Quick Exit and the language switch reachable before
 * consent; the middle scrolls (large system text) while the top row and the button stay put.
 */
export function PdpaConsent() {
  const { t } = useI18n();
  const [open, setOpen] = useState(() => {
    try { return !localStorage.getItem(KEY); } catch { return true; }
  });
  const [ack, setAck] = useState(false);
  const [consent, setConsent] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Move keyboard and screen-reader focus into the sheet when it appears
  useEffect(() => {
    if (open) titleRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;

  const accept = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdpa-title"
      aria-describedby="pdpa-body"
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col rounded-t-[1.5rem] border border-border bg-card shadow-card animate-slide-up motion-reduce:animate-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-[1.5rem]">
        {/* Quick Exit moves into this slot while the sheet is open; language switch at the end */}
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3 pb-1">
          <QuickExitSlot always />
          <LanguageToggle />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2">
          <div className="flex items-start gap-3 mb-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <h2 id="pdpa-title" ref={titleRef} tabIndex={-1} className="font-subhead text-lg font-semibold leading-snug focus:outline-none">{t('pdpa.title')}</h2>
          </div>
          <p id="pdpa-body" className="text-sm text-muted-foreground leading-relaxed mb-4">{t('pdpa.body')}</p>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 mb-2 cursor-pointer min-h-11">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
            <span className="text-sm leading-snug">{t('pdpa.ack')}</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 mb-2 cursor-pointer min-h-11">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span className="text-sm leading-snug">{t('pdpa.consent')}</span>
          </label>
          <Link to="/privacy" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline mb-1">
            {t('pdpa.read')}
          </Link>
        </div>
        <div className="shrink-0 border-t border-border px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button variant="action" size="lg" className="w-full" disabled={!ack || !consent} onClick={accept}>
            {t('pdpa.accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
