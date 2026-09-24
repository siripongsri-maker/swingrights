import markAsset from '@/assets/brand/swing-rights-mark.png.asset.json';
import lockupAsset from '@/assets/brand/swing-rights-lockup.png.asset.json';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return <img src={markAsset.url} alt="" aria-hidden className={cn('h-8 w-8 object-contain sm:h-10 sm:w-10', className)} />;
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-sm font-semibold text-foreground sm:text-base', className)}>
      <span className="font-semibold">SWING</span>{' '}
      <span className="relative font-bold after:absolute after:inset-x-0 after:-bottom-1 after:h-[3px] after:rounded-full after:bg-accent">RIGHTS</span>
    </span>
  );
}

export function BrandHeader({ className }: { className?: string }) {
  return <span className={cn('inline-flex items-center gap-2.5', className)}><BrandMark /><BrandWordmark /></span>;
}

export function BrandLockup({ className }: { className?: string }) {
  return <img src={lockupAsset.url} alt="SWING RIGHTS" className={cn('w-[200px] max-w-full object-contain', className)} />;
}