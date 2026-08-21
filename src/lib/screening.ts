// Voice screening domain constants & types

export type Severity = 'green' | 'yellow' | 'red';
export type CaseStatus = 'received' | 'inprogress' | 'completed' | 'cancelled';

export const STATUS_LABEL: Record<CaseStatus, string> = {
  received: 'รับเรื่อง',
  inprogress: 'ดำเนินงาน',
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก',
};

export const SEV_LABEL: Record<Severity, string> = {
  green: 'เขียว (ไม่เร่งด่วน)',
  yellow: 'เหลือง (ติดตามใกล้ชิด)',
  red: 'แดง (ฉุกเฉิน)',
};

export const VIOLATION_TYPES = [
  { id: 'body', label: 'สิทธิ์ในร่างกายและชีวิต' },
  { id: 'labor', label: 'สิทธิ์แรงงาน' },
  { id: 'health', label: 'สิทธิ์สุขภาพ' },
  { id: 'property', label: 'สิทธิ์ในทรัพย์สิน' },
];

export const QUESTIONS = [
  { cat: "screening.q0.cat", frame: "WHAT", main: "screening.q0.main", hint: "screening.q0.hint" },
  { cat: "screening.q1.cat", frame: "WHO", main: "screening.q1.main", hint: "screening.q1.hint" },
  { cat: "screening.q2.cat", frame: "WHAT", main: "screening.q2.main", hint: "screening.q2.hint" },
  { cat: "screening.q3.cat", frame: "HOW", main: "screening.q3.main", hint: "screening.q3.hint" },
  { cat: "screening.q4.cat", frame: "WHERE", main: "screening.q4.main", hint: "screening.q4.hint" },
  { cat: "screening.q5.cat", frame: "WHEN", main: "screening.q5.main", hint: "screening.q5.hint" },
  { cat: "screening.q6.cat", frame: "TIMELINE", main: "screening.q6.main", hint: "screening.q6.hint" },
  { cat: "screening.q7.cat", frame: "WHY", main: "screening.q7.main", hint: "screening.q7.hint" },
  { cat: "screening.q8.cat", frame: "NEEDS", main: "screening.q8.main", hint: "screening.q8.hint" },
];

export const REFERRAL_OPTIONS = [
  { id: 'osc', icon: '🏥', name: 'One Stop Crisis Center' },
  { id: 'police', icon: '🚔', name: 'แจ้งความ / ตำรวจ' },
  { id: 'legal', icon: '⚖️', name: 'ทนายความ / Legal Aid' },
  { id: 'shelter', icon: '🏠', name: 'บ้านพักฉุกเฉิน' },
  { id: 'psych', icon: '🧠', name: 'นักจิตวิทยา' },
  { id: 'swing', icon: '🔄', name: 'ส่งต่อภายใน SWING' },
  { id: 'labor', icon: '💼', name: 'กระทรวงแรงงาน' },
  { id: 'pyo', icon: '🤝', name: 'มูลนิธิเพื่อนหญิง' },
];

export const SPECIAL_TESTS = [
  { id: '2q9q', short: '2Q', name: '2Q / 9Q (ภาวะซึมเศร้า)', desc: 'กรณีถูกทำร้ายร่างกาย/จิตใจ' },
  { id: 'nrm', short: 'NRM', name: 'NRM (National Referral Mechanism)', desc: 'กรณีละเมิดสิทธิ์แรงงาน / ค้ามนุษย์' },
];

export const BRANCHES = ['สีลม (Silom)', 'บางกอกน้อย', 'สุขุมวิท', 'ออนไลน์', 'นอกพื้นที่'];
export const KP_GROUPS = ['FSW', 'MSM', 'TG', 'PWID', 'ไม่ระบุ'];
export const GENDERS = ['หญิง', 'ชาย', 'สาวประเภทสอง / ผู้หญิงข้ามเพศ', 'ชายข้ามเพศ', 'ไม่ระบุ'];

export function genCaseCode() {
  const n = new Date();
  const yr = String(n.getFullYear()).slice(-2);
  const mo = String(n.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SW-${yr}${mo}-${rand}`;
}
