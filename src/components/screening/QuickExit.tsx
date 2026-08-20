import { useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { clearDraft } from '@/lib/draft';
import { clearAllLocalCases } from '@/lib/localCases';

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
    <button
      type="button"
      onClick={() => void escape(wipeDraft)}
      aria-label="ออกจากหน้านี้ทันที และล้างข้อมูลที่กรอกไว้ในเครื่อง"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2.5 text-xs font-medium text-destructive-foreground shadow-elegant transition hover:opacity-90 active:scale-95"
    >
      <LogOut className="h-4 w-4" />
      ออกด่วน
    </button>
  );
}
