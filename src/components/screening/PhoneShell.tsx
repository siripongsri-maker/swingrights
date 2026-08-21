import { ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-leaf grain flex items-start justify-center py-4 sm:py-8 px-3">
      <div className="w-full max-w-md relative animate-bloom">
        <div className="bg-gradient-primary text-foreground rounded-t-[1.75rem] px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack ?? onClose}
            aria-label="back"
            className="w-8 h-8 rounded-full bg-white/15 text-white/80 hover:bg-white/25 flex items-center justify-center transition"
          >
            {onBack ? <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> : <X className="w-4 h-4" />}
          </button>
          <span className="text-xs text-white/75 tracking-widest font-display">{title}</span>
          <div className="w-8 h-8 flex items-center justify-center">{trailing}</div>
        </div>
        {contained ? (
          <div className="bg-card border border-t-0 rounded-b-[1.75rem] px-4 py-5 sm:px-5 sm:py-6 shadow-elegant animate-fade-in">
            {children}
          </div>
        ) : (
          <div className="bg-card border border-t-0 rounded-b-[1.75rem] shadow-elegant overflow-hidden animate-fade-in">{children}</div>
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
