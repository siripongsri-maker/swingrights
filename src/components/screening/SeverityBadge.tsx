import { Severity } from '@/lib/screening';

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
const label: Record<Severity, string> = { green: 'เขียว', yellow: 'เหลือง', red: 'แดง' };

export function SeverityBadge({ value }: { value: Severity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${map[value]}`}>
      <span className={`w-2 h-2 rounded-full ${dot[value]}`} />
      {label[value]}
    </span>
  );
}
