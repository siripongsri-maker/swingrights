import { useEffect, useId, useState } from 'react';
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

/**
 * Spot for the Quick Exit button inside a header row.
 * - Default: used on phones (<640px) only; from 640px public pages keep the bottom-right pill.
 * - always: used at every width (staff top bars, case header, login card, custom overlays).
 * Any slot inside an open modal (role="dialog" / "alertdialog" / aria-modal="true") wins over
 * the page header, so Quick Exit stays on top of and inside the overlay. Sheet, Dialog and
 * AlertDialog from components/ui already include one.
 */
export function QuickExitSlot({ className, always = false }: { className?: string; always?: boolean }) {
  return (
    <div
      data-qe-slot={always ? 'always' : 'phone'}
      className={cn(always ? 'flex' : 'flex sm:hidden', 'min-h-11 min-w-11 shrink-0 items-center', className)}
    />
  );
}

/** Open overlay that blocks the page. Popovers also use role="dialog" but carry data-side. */
const OPEN_MODAL = '[role="dialog"][data-state="open"]:not([data-side]), [role="alertdialog"][data-state="open"], [aria-modal="true"]';
const ANY_MODAL = '[role="dialog"]:not([data-side]), [role="alertdialog"], [aria-modal="true"]';
const isShown = (el: Element) => el.getClientRects().length > 0;

type Spot = { slot: HTMLElement | null; overlay: boolean; inModal: boolean };

/**
 * Finds where Quick Exit should sit: a slot in the top-most open modal, else a visible page
 * slot ('always' first). Re-checks when the DOM, a dialog state or the window size changes.
 */
function useQuickExitSpot() {
  const [spot, setSpot] = useState<Spot>({ slot: null, overlay: false, inModal: false });
  useEffect(() => {
    // Coalesce bursts of DOM changes. setTimeout (not rAF) so it still runs in a hidden tab.
    let timer = 0;
    const find = () => {
      timer = 0;
      const modals = document.querySelectorAll<HTMLElement>(OPEN_MODAL);
      const top = modals.length ? modals[modals.length - 1] : null;
      let el: HTMLElement | null = null;
      if (top) {
        el = Array.from(top.querySelectorAll<HTMLElement>('[data-qe-slot]')).find(isShown) ?? null;
      } else {
        const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-qe-slot]'))
          .filter((s) => !s.closest(ANY_MODAL) && isShown(s));
        el = slots.find((s) => s.dataset.qeSlot === 'always') ?? slots[0] ?? null;
      }
      const next: Spot = { slot: el, overlay: !!top, inModal: !!top && !!el };
      setSpot((prev) => (prev.slot === next.slot && prev.overlay === next.overlay && prev.inModal === next.inModal ? prev : next));
    };
    const schedule = () => { if (!timer) timer = window.setTimeout(find, 16); };
    find();
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-state', 'aria-modal', 'class', 'hidden'],
    });
    window.addEventListener('resize', schedule);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', schedule);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // A page slot that scrolls mostly out of view hands over to the fixed pill, so Quick Exit is
  // always reachable. Slots inside an open modal are never swapped out.
  const watched = spot.slot && !spot.inModal ? spot.slot : null;
  const [inView, setInView] = useState(true);
  useEffect(() => {
    setInView(true);
    if (!watched) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries[entries.length - 1].intersectionRatio >= 0.75),
      { threshold: [0, 0.75, 1] },
    );
    io.observe(watched);
    return () => io.disconnect();
  }, [watched]);

  return { slot: spot.slot && (spot.inModal || inView) ? spot.slot : null, overlay: spot.overlay };
}

/**
 * Quick exit. Leaves the page immediately, replaces the history entry and (by default)
 * wipes the local draft so someone else with the device cannot read it.
 * Press Esc twice quickly as a keyboard shortcut.
 */
export function QuickExit({ wipeDraft = true }: { wipeDraft?: boolean }) {
  const { t } = useI18n();
  const hintId = useId();
  const { slot, overlay } = useQuickExitSpot();

  // Lets sticky page parts make room while the pill floats (see .sw-qe-clear in index.css)
  useEffect(() => {
    const root = document.documentElement;
    if (slot) root.removeAttribute('data-qe-float');
    else root.setAttribute('data-qe-float', '');
    return () => root.removeAttribute('data-qe-float');
  }, [slot]);

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

  // Charcoal pill (red means an alert, magenta is the main action). pointer-events-auto keeps it
  // tappable while a Radix modal has set pointer-events:none on <body>.
  const button = (
    <button
      type="button"
      data-quick-exit=""
      onClick={() => void escape(wipeDraft)}
      aria-label={t('guard.quickExit')}
      aria-describedby={hintId}
      className={cn(
        'sw-quick-exit pointer-events-auto inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-primary-foreground/20 bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-elegant transition-[background-color,transform] duration-150 ease-out hover:bg-primary-deep active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        slot ? 'relative' : cn('sw-quick-exit-float fixed sm:h-12 sm:px-4', overlay ? 'z-[100]' : 'z-50'),
      )}
    >
      <X className="h-4 w-4 shrink-0" aria-hidden />
      <span>{t('guard.quickExit')}</span>
      <span id={hintId} className="sr-only">{wipeDraft ? `${t('guard.quickExitAria')}. ` : ''}{t('guard.quickExitHint')}</span>
    </button>
  );

  return slot ? createPortal(button, slot) : button;
}
