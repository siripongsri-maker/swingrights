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
    <div className="min-h-screen bg-muted/40 flex items-start justify-center py-4 sm:py-8 px-3">
      <div className="w-full max-w-md">
        <div className="bg-gradient-dark text-foreground rounded-t-2xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack ?? onClose}
            aria-label="back"
            className="w-8 h-8 rounded-full bg-white/10 text-white/70 hover:bg-white/20 flex items-center justify-center transition"
          >
            {onBack ? <ArrowLeft className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
          <span className="text-xs text-white/60 tracking-widest">{title}</span>
          <div className="w-8 h-8 flex items-center justify-center">{trailing}</div>
        </div>
        {contained ? (
          <div className="bg-card border border-t-0 rounded-b-2xl px-4 py-5 sm:px-5 sm:py-6 shadow-card animate-fade-in">
            {children}
          </div>
        ) : (
          <div className="bg-card border border-t-0 rounded-b-2xl shadow-card overflow-hidden animate-fade-in">{children}</div>
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
