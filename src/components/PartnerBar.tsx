import { useI18n } from '@/i18n';
import unaidsImg from '@/assets/brand/unaids-new.png';
import apcomImg from '@/assets/brand/apcom-new.png';
import youthLeadImg from '@/assets/brand/youth-lead-new.png';
import swingImg from '@/assets/brand/swing-new.png';
import { cn } from '@/lib/utils';

export function PartnerBar({ className }: { className?: string }) {
  return (
    <aside className={cn('rounded-[20px] border border-border bg-card p-4 shadow-card md:p-6', className)}>
      <div className="grid grid-cols-4 items-center gap-x-3 md:gap-x-6">
        <div className="flex min-w-0 items-center justify-center">
          <img src={unaidsImg} alt="UNAIDS" className="h-7 w-full object-contain md:h-9" />
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <img src={apcomImg} alt="APCOM" className="h-8 w-full object-contain md:h-10" />
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <img src={youthLeadImg} alt="Youth LEAD" className="h-7 w-full object-contain md:h-9" />
        </div>
        <div className="flex min-w-0 items-center justify-center border-s border-border ps-3 md:ps-6">
          <img src={swingImg} alt="SWING" className="h-8 w-full object-contain md:h-10" />
        </div>
      </div>
    </aside>
  );
}