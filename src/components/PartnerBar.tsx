import { useI18n } from '@/i18n';
import unaidsAsset from '@/assets/brand/unaids-new.png.asset.json';
import apcomAsset from '@/assets/brand/apcom-new.png.asset.json';
import youthLeadAsset from '@/assets/brand/youth-lead-new.png.asset.json';
import swingAsset from '@/assets/brand/swing-new.png.asset.json';
import { cn } from '@/lib/utils';

export function PartnerBar({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <aside className={cn('rounded-[20px] border border-border bg-card p-4 shadow-card md:p-6', className)}>
      <div className="grid grid-cols-4 items-end gap-x-3 md:gap-x-6">
        <p className="col-span-3 mb-4 text-center text-[11px] font-semibold leading-snug text-muted-foreground md:text-[13px]">
          {t('partners.supportedBy')}
        </p>
        <p className="mb-4 border-s border-border ps-3 text-center text-[11px] font-semibold leading-snug text-muted-foreground md:ps-6 md:text-[13px]">
          {t('partners.implementedBy')}
        </p>
        <div className="flex min-w-0 items-center justify-center">
          <img src={unaidsAsset.url} alt="UNAIDS" className="h-7 w-full object-contain md:h-9" />
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <img src={apcomAsset.url} alt="APCOM" className="h-8 w-full object-contain md:h-10" />
        </div>
        <div className="flex min-w-0 items-center justify-center">
          <img src={youthLeadAsset.url} alt="Youth LEAD" className="h-7 w-full object-contain md:h-9" />
        </div>
        <div className="flex min-w-0 items-center justify-center border-s border-border ps-3 md:ps-6">
          <img src={swingAsset.url} alt="SWING" className="h-8 w-full object-contain md:h-10" />
        </div>
      </div>
    </aside>
  );
}