// Small WebP copies (mark 185x240, about 13KB; lockup 480x470, about 45KB) of the large PNG
// originals, which stay in src/assets/brand for print and design work.
import markImg from '@/assets/brand/swing-rights-mark.webp';
import lockupImg from '@/assets/brand/swing-rights-lockup.webp';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={markImg}
      width={185}
      height={240}
      alt=""
      aria-hidden
      decoding="async"
      className={cn('h-8 w-8 object-contain sm:h-10 sm:w-10', className)}
    />
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-sm font-semibold text-foreground sm:text-base', className)}>
      <span className="font-bold">SWING</span>{' '}
      <span className="relative font-medium after:absolute after:inset-x-0 after:-bottom-1 after:h-[3px] after:rounded-full after:bg-accent">RIGHTS</span>
    </span>
  );
}

export function BrandHeader({ className }: { className?: string }) {
  return <span className={cn('inline-flex items-center gap-2.5', className)}><BrandMark /><BrandWordmark /></span>;
}

export function BrandLockup({ className }: { className?: string }) {
  // Lazy: a lazy image inside display:none (the phone layout hides it) is never fetched.
  return (
    <img
      src={lockupImg}
      width={480}
      height={470}
      alt="SWING RIGHTS"
      loading="lazy"
      decoding="async"
      className={cn('h-auto w-[200px] max-w-full object-contain', className)}
    />
  );
}
