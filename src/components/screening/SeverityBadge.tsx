import { Severity } from '@/lib/screening';
import { useI18n } from '@/i18n';

const map: Record<Severity, string> = {
  green: 'bg-sevGreen-bg text-sevGreen-fg',
  yellow: 'bg-sevYellow-bg text-sevYellow-fg',
  red: 'bg-sevRed-bg text-sevRed-fg',
};
const dot: Record<Severity, string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-danger',
};
const labelKey: Record<Severity, string> = {
  green: 'severity.green',
  yellow: 'severity.yellow',
  red: 'severity.red',
};

export function SeverityBadge({ value }: { value: Severity }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${map[value]}`}>
      <span className={`w-2 h-2 rounded-full ${dot[value]}`} />
      {t(labelKey[value])}
    </span>
  );
}
