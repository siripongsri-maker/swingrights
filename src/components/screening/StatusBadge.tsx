import { CaseStatus } from '@/lib/screening';
import { useI18n } from '@/i18n';

const map: Record<CaseStatus, string> = {
  received: 'bg-primary-soft text-primary',
  inprogress: 'bg-primary-soft text-primary',
  completed: 'bg-sevGreen-bg text-sevGreen-fg',
  cancelled: 'bg-sevRed-bg text-sevRed-fg',
};

export function StatusBadge({ value }: { value: CaseStatus }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${map[value]}`}>
      {t(`status.${value}`)}
    </span>
  );
}
