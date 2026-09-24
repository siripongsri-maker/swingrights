import { ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { BrandHeader } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';

interface Props {
  title?: string;
  onBack?: () => void;
  onClose?: () => void;
  children: ReactNode;
  trailing?: ReactNode;
  contained?: boolean; // wraps body in card
}

export function PhoneShell({ title = 'voice screening', onBack, onClose, children, trailing, contained = true }: Props) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-3 py-4 sm:py-8">
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between rounded-t-[20px] bg-card px-4 py-3 text-foreground border border-border border-b-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack ?? onClose}
            aria-label="back"
            className="h-10 w-10 rounded-full"
          >
            {onBack ? <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> : <X className="w-4 h-4" />}
          </Button>
          <div className="flex min-w-0 flex-col items-center">
            <BrandHeader className="[&_img]:h-7 [&_img]:w-7 [&>span]:hidden" />
            <span className="max-w-[13rem] truncate text-xs font-semibold text-muted-foreground">{title}</span>
          </div>
          <div className="w-10 min-w-10 flex items-center justify-center">{trailing}</div>
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
    <span className="inline-block bg-primary-soft text-primary text-[10px] font-medium tracking-[0.12em] px-3 py-1 rounded-full">
      SWING FOUNDATION
    </span>
  );
}
