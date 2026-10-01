import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clearDraft } from '@/lib/draft';
import { clearAllLocalCases } from '@/lib/localCases';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

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

/** Place inside a page header. On phones the Quick Exit button moves into this spot. */
export function QuickExitSlot({ className }: { className?: string }) {
  return <div data-qe-slot className={cn('flex sm:hidden min-h-11 min-w-11', className)} />;
}

/** Finds a visible header slot (phones only). Re-checks when the page changes. */
function useHeaderSlot() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const find = () => {
      const el = mq.matches ? document.querySelector<HTMLElement>('[data-qe-slot]') : null;
      setSlot((prev) => (prev === el ? prev : el));
    };
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    mq.addEventListener('change', find);
    return () => { obs.disconnect(); mq.removeEventListener('change', find); };
  }, []);
  // When the header scrolls off screen, fall back to the fixed pill so it is always reachable
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!slot) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.6 });
    io.observe(slot);
    return () => io.disconnect();
  }, [slot]);
  return slot && inView ? slot : null;
}

/**
 * Quick exit. Leaves the page immediately, replaces the history entry and (by default)
 * wipes the local draft so someone else with the device cannot read it.
 * Press Esc twice quickly as a keyboard shortcut.
 */
export function QuickExit({ wipeDraft = true }: { wipeDraft?: boolean }) {
  const { t } = useI18n();
  const slot = useHeaderSlot();

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

  const button = (
    <button
      type="button"
      onClick={() => void escape(wipeDraft)}
      aria-describedby="sw-qe-hint"
      className={cn(
        'sw-quick-exit inline-flex items-center justify-center gap-1.5 rounded-full bg-danger text-danger-foreground font-semibold shadow-elegant transition-[background-color,transform] duration-150 ease-out hover:bg-danger/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        slot ? 'relative z-[60] h-11 min-w-11 px-3 text-sm shrink-0' : 'sw-quick-exit-float fixed z-50 h-11 min-w-11 px-3 text-sm sm:h-12 sm:px-4',
      )}
    >
      <X className="h-4 w-4 shrink-0" aria-hidden />
      <span>{t('guard.quickExit')}</span>
      <span id="sw-qe-hint" className="sr-only">{t('guard.quickExitAria')}. {t('guard.quickExitHint')}</span>
    </button>
  );

  return slot ? createPortal(button, slot) : button;
}
