import { useI18n } from '@/i18n';
import unaidsAsset from '@/assets/brand/unaids.png.asset.json';
import apcomAsset from '@/assets/brand/apcom.png.asset.json';
import youthLeadAsset from '@/assets/brand/youth-lead.png.asset.json';
import swingAsset from '@/assets/brand/swing.png.asset.json';
import { cn } from '@/lib/utils';

export function PartnerBar({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <aside className={cn('rounded-[20px] border border-border bg-card p-4 shadow-card md:p-6', className)}>
      <div className="flex flex-col gap-5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-center">
        <div className="min-w-0">
          <p className="mb-3 text-[13px] font-semibold text-muted-foreground">{t('partners.supportedBy')}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <img src={unaidsAsset.url} alt="UNAIDS" className="h-7 max-w-[7rem] object-contain md:h-9" />
            <img src={apcomAsset.url} alt="APCOM" className="h-8 max-w-[7rem] object-contain md:h-10" />
            <img src={youthLeadAsset.url} alt="Youth LEAD" className="h-7 max-w-[7rem] object-contain md:h-9" />
          </div>
        </div>
        <div className="hidden h-16 w-px bg-border min-[480px]:block" aria-hidden />
        <div className="border-t border-border pt-4 min-[480px]:border-s min-[480px]:border-t-0 min-[480px]:ps-5 min-[480px]:pt-0">
          <p className="mb-3 text-[13px] font-semibold text-muted-foreground">{t('partners.implementedBy')}</p>
          <img src={swingAsset.url} alt="SWING" className="h-8 max-w-[8rem] object-contain md:h-10" />
        </div>
      </div>
    </aside>
  );
}