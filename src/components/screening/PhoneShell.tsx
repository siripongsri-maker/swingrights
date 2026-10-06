import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandHeader } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { QuickExitSlot } from './QuickExit';

interface Props {
  title?: string;
  /** Header back button. Without onBack/onClose it goes to the home page. */
  onBack?: () => void;
  /** Older name for the same back action (kept for existing callers). */
  onClose?: () => void;
  children: ReactNode;
  trailing?: ReactNode;
  contained?: boolean; // wraps body in card
}

export function PhoneShell({ title = '', onBack, onClose, children, trailing, contained = true }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const goBack = onBack ?? onClose ?? (() => navigate('/'));
  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-3 py-4 sm:py-8">
      <div className="relative w-full max-w-md animate-slide-up">
        {/* Sticky so the Quick Exit spot in this row stays in view while the page scrolls.
            Always a back arrow: X is kept for Quick Exit only. */}
        <div className="sticky top-0 z-30 rounded-t-[20px] bg-card px-2 py-3 text-foreground border border-border border-b-0 sm:px-4">
          <div className="flex items-center justify-between gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goBack}
              aria-label={t('common.back')}
              className="h-11 w-11 rounded-full shrink-0"
            >
              <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
            </Button>
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <BrandHeader className="[&_img]:h-7 [&_img]:w-7 [&>span]:hidden" />
              {title && <span className="hidden max-w-full truncate text-xs font-semibold text-muted-foreground sm:block">{title}</span>}
            </div>
            <div className="min-w-11 flex items-center justify-end gap-2 shrink-0"><QuickExitSlot />{trailing}</div>
          </div>
          {/* Phones: Quick Exit and the language button fill the row, so the title gets its own full-width line */}
          {title && <p className="mt-1 px-2 text-center text-sm font-semibold leading-snug text-muted-foreground sm:hidden">{title}</p>}
        </div>
        {contained ? (
          <div className="bg-card border border-t-0 rounded-b-[20px] px-4 py-5 sm:px-5 sm:py-6 shadow-card animate-fade-in">
            {children}
          </div>
        ) : (
          <div className="bg-card border border-t-0 rounded-b-[20px] shadow-card overflow-hidden animate-fade-in">{children}</div>
        )}
      </div>
    </div>
  );
}

export function SwingBadge() {
  return (
    <span className="inline-block bg-primary-soft text-primary text-xs font-medium tracking-[0.12em] px-3 py-1 rounded-full">
      SWING FOUNDATION
    </span>
  );
}
