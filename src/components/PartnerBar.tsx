import { useI18n } from '@/i18n';
import unaidsAsset from '@/assets/brand/unaids.png';
import apcomAsset from '@/assets/brand/apcom.png';
import youthLeadAsset from '@/assets/brand/youth-lead.png';
import swingAsset from '@/assets/brand/swing.png';
import { cn } from '@/lib/utils';

export function PartnerBar({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <aside className={cn('rounded-[20px] border border-border bg-card p-4 shadow-card md:p-6', className)}>
      <div className="grid grid-cols-4 items-end gap-x-2 md:gap-x-5">
        <p className="col-span-3 mb-3 text-center text-[11px] font-semibold leading-snug text-muted-foreground md:text-[13px]">
          {t('partners.supportedBy')}
        </p>
        <p className="mb-3 border-s border-border ps-2 text-center text-[11px] font-semibold leading-snug text-muted-foreground md:ps-5 md:text-[13px]">
          {t('partners.implementedBy')}
        </p>
        <div className="flex min-w-0 items-center justify-center">
          <img src={unaidsAsset} alt="UNAIDS" className="h-7 w-full object-contain md:h-9" />
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <img src={apcomAsset} alt="APCOM" className="h-8 w-full object-contain md:h-10" />
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <img src={youthLeadAsset} alt="Youth LEAD" className="h-7 w-full object-contain md:h-9" />
        </div>
        <div className="flex min-w-0 items-center justify-center border-s border-border ps-2 md:ps-5">
          <img src={swingAsset} alt="SWING" className="h-8 w-full object-contain md:h-10" />
        </div>
      </div>
    </aside>
  );
}