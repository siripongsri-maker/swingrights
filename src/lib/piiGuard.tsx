import { useCallback, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

const PATTERNS: RegExp[] = [
  /\d{13}/,                                  // Thai national ID (13 consecutive digits)
  /(?<![A-Za-z])[A-Za-z]{1,2}\d{6,8}(?!\d)/, // passport-like
  /พาสปอร์ต|วีซ่า|ใบอนุญาตทำงาน|เข้าเมือง/,
  /\b(passport|visa|work\s*permit|immigration)\b/i,
];

/** True if any free text looks like it contains identity / immigration data. */
export function detectPii(...texts: (string | null | undefined)[]): boolean {
  const s = texts.filter(Boolean).join('\n').replace(/[\s-]/g, (m) => (m === '-' ? '' : m));
  const compact = s.replace(/(\d)[\s-](?=\d)/g, '$1');
  return PATTERNS.some((re) => re.test(s) || re.test(compact));
}

/** Small helper line shown under every free-text field. */
export function PiiHint({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  return <p className={`text-[11px] text-muted-foreground mt-1 ${className}`}>{t('pii.hint')}</p>;
}

/**
 * Gentle, non-blocking check. `check(texts)` resolves:
 *  - 'clean'  → nothing found
 *  - 'send'   → found, user chose "Send anyway" (set pii_flag)
 *  - 'edit'   → found, user wants to edit (caller should stop)
 */
export function usePiiGuard() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const resolver = useRef<((v: 'send' | 'edit') => void) | null>(null);

  const check = useCallback((...texts: (string | null | undefined)[]) => {
    if (!detectPii(...texts)) return Promise.resolve<'clean'>('clean');
    setOpen(true);
    return new Promise<'send' | 'edit'>((res) => { resolver.current = res; });
  }, []);

  const close = (v: 'send' | 'edit') => {
    setOpen(false);
    resolver.current?.(v);
    resolver.current = null;
  };

  const dialog = (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) close('edit'); }}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" /> {t('pii.dialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('pii.dialog.body')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <Button variant="outline" onClick={() => close('edit')}>{t('pii.dialog.edit')}</Button>
          <Button onClick={() => close('send')}>{t('pii.dialog.send')}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { check, dialog };
}
