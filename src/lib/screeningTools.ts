// แบบคัดกรองมาตรฐาน: 2Q / 9Q (กรมสุขภาพจิต) และ NRM (แบบคัดแยกผู้เสียหายจากการค้ามนุษย์)
// Question/option text lives in i18n dict (tools.*); this module keeps ids/keys/scoring stable.

export const Q2_ITEM_IDS = ['q2_1', 'q2_2'] as const;

export const Q9_ITEM_IDS = [
  'q9_1', 'q9_2', 'q9_3', 'q9_4', 'q9_5', 'q9_6', 'q9_7', 'q9_8', 'q9_9',
] as const;

export const Q9_SCALE_IDS = [
  { v: 0, id: 'never' },
  { v: 1, id: 'someDays' },
  { v: 2, id: 'often' },
  { v: 3, id: 'everyDay' },
] as const;

// label kept in Thai for non-i18n consumers (reports/admin exports); UI components should
// translate via t(`tools.level.${id}`) instead of using .label directly.
export function q9Level(total: number) {
  if (total < 7) return { id: 'none', label: 'ไม่มีอาการซึมเศร้า', tone: 'green' as const };
  if (total <= 12) return { id: 'mild', label: 'ซึมเศร้าระดับน้อย', tone: 'yellow' as const };
  if (total <= 18) return { id: 'moderate', label: 'ซึมเศร้าระดับปานกลาง', tone: 'amber' as const };
  return { id: 'severe', label: 'ซึมเศร้าระดับรุนแรง', tone: 'red' as const };
}

// NRM — แบบคัดแยกเบื้องต้น (Act / Means / Purpose ตามนิยามการค้ามนุษย์)
export const NRM_SECTIONS = [
  {
    key: 'act',
    titleId: 'tools.nrm.section.act',
    items: ['act_1', 'act_2', 'act_3'],
  },
  {
    key: 'means',
    titleId: 'tools.nrm.section.means',
    items: ['means_1', 'means_2', 'means_3', 'means_4', 'means_5'],
  },
  {
    key: 'purpose',
    titleId: 'tools.nrm.section.purpose',
    items: ['purpose_1', 'purpose_2', 'purpose_3'],
  },
] as const;

export const NRM_UNDER18_ID = 'tools.nrm.under18';

export interface ScreeningResult {
  q2: (0 | 1)[];
  q9: number[];
  q9Total: number;
  q2Positive: boolean;
  q9Level: string;
  suicidalItem: number;
  nrm: Record<string, boolean[]>;
  nrmUnder18: boolean;
  nrmPositive: boolean;
  completedAt: string;
}

export function nrmPositive(nrm: Record<string, boolean[]>, under18: boolean) {
  if (under18) return (nrm.act || []).some(Boolean) && (nrm.purpose || []).some(Boolean);
  return NRM_SECTIONS.every((s) => (nrm[s.key] || []).some(Boolean));
}

export const HOTLINE_1323 = {
  tel: '1323',
};

export const SAFETY_PLAN_STEP_IDS = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'];
