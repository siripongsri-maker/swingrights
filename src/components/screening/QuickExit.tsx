import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearDraft } from '@/lib/draft';
import { clearAllLocalCases } from '@/lib/localCases';
import { useI18n } from '@/i18n';

const SAFE_URL = 'https://www.google.co.th/search?q=พยากรณ์อากาศวันนี้';

async function escape(wipeDraft: boolean) {
  if (wipeDraft) { await clearDraft(); await clearAllLocalCases(); }
  try {
    window.history.replaceState(null, '', '/');
    window.location.replace(SAFE_URL);
  } catch {
    window.location.href = SAFE_URL;
  }
}

/**
 * Phase 0.9 — Quick exit.
 * Leaves the page immediately, replaces the history entry and (by default) wipes
 * the local draft so an abuser with the device cannot read it from IndexedDB.
 * Press Esc twice quickly as a keyboard shortcut.
 */
export function QuickExit({ wipeDraft = true }: { wipeDraft?: boolean }) {
  const { t } = useI18n();
  useEffect(() => {
    let last = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const now = Date.now();
      if (now - last < 700) void escape(wipeDraft);
      last = now;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wipeDraft]);

  return (
    <Button
      type="button"
      onClick={() => void escape(wipeDraft)}
      aria-label={t('guard.quickExitAria')}
      className="fixed bottom-4 end-4 z-50 h-12 rounded-full border border-accent/20 bg-accent-soft px-4 text-sm text-accent-deep shadow-elegant hover:bg-accent-soft/80 active:scale-95"
    >
      <X className="h-4 w-4" />
      {t('guard.quickExit')}
    </Button>
  );
}
