// 120px-tall WebP copies of the partner PNGs (3x the largest 40px display height).
import unaidsImg from '@/assets/brand/unaids-new.webp';
import apcomImg from '@/assets/brand/apcom-new.webp';
import youthLeadImg from '@/assets/brand/youth-lead-new.webp';
import swingImg from '@/assets/brand/swing-new.webp';
import { cn } from '@/lib/utils';

/** Lazy (always below the fold), with intrinsic size so the bar does not shift while loading. */
const imgProps = { loading: 'lazy', decoding: 'async' } as const;

export function PartnerBar({ className }: { className?: string }) {
  return (
    <aside className={cn('rounded-[20px] border border-border bg-card p-4 shadow-card md:p-6', className)}>
      <div className="grid grid-cols-4 items-center gap-x-3 md:gap-x-6">
        <div className="flex min-w-0 items-center justify-center">
          <img src={unaidsImg} alt="UNAIDS" width={439} height={120} {...imgProps} className="h-7 w-full object-contain md:h-9" />
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <img src={apcomImg} alt="APCOM" width={200} height={120} {...imgProps} className="h-8 w-full object-contain md:h-10" />
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <img src={youthLeadImg} alt="Youth LEAD" width={378} height={120} {...imgProps} className="h-7 w-full object-contain md:h-9" />
        </div>
        <div className="flex min-w-0 items-center justify-center border-s border-border ps-3 md:ps-6">
          <img src={swingImg} alt="SWING" width={252} height={120} {...imgProps} className="h-8 w-full object-contain md:h-10" />
        </div>
      </div>
    </aside>
  );
}