import { Inbox, Loader, CheckCircle2, XCircle } from 'lucide-react';
import { CaseStatus } from '@/lib/screening';
import { useI18n } from '@/i18n';

const map: Record<CaseStatus, string> = {
  received: 'bg-primary-soft text-primary',
  inprogress: 'bg-accent-soft text-accent',
  completed: 'bg-sevGreen-bg text-sevGreen-fg',
  cancelled: 'bg-sevRed-bg text-sevRed-fg',
};
const icons = { received: Inbox, inprogress: Loader, completed: CheckCircle2, cancelled: XCircle } as const;

export function StatusBadge({ value }: { value: CaseStatus }) {
  const { t } = useI18n();
  const Icon = icons[value];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold ${map[value]}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {t(`status.${value}`)}
    </span>
  );
}
