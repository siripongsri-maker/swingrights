import { ReactNode } from 'react';

export function SectionDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-2.5">
      <span className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-medium text-primary tracking-widest">{children}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}
