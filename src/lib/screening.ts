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
  { cat: 'WHAT - เกิดอะไรขึ้น', frame: 'WHAT', main: 'เกิดอะไรขึ้น ช่วยเล่าให้ฟังหน่อย', hint: '(ลำดับเหตุการณ์โดยรวม)' },
  { cat: 'WHO - ผู้กระทำ', frame: 'WHO', main: 'ใครเป็นผู้กระทำ?', hint: '(ความสัมพันธ์ จำนวนคน)' },
  { cat: 'WHAT - การกระทำ', frame: 'WHAT', main: 'เขาทำอะไร หรือเราถูกทำอะไร?', hint: '(ลักษณะการกระทำที่เกิดขึ้น)' },
  { cat: 'HOW - วิธีการ', frame: 'HOW', main: 'เขาทำอย่างไร หรือเราถูกกระทำอย่างไร?', hint: '(วิธีการ เครื่องมือ)' },
  { cat: 'WHERE - สถานที่', frame: 'WHERE', main: 'เรื่องที่เกิดขึ้น เกิดขึ้นที่ไหน?', hint: '(สถานที่เกิดเหตุ)' },
  { cat: 'WHEN - เวลา', frame: 'WHEN', main: 'เรื่องที่เกิดขึ้น เกิดขึ้นเมื่อไหร่?', hint: '(วัน เวลา ความถี่)' },
  { cat: 'TIMELINE - ลำดับเหตุการณ์', frame: 'WHEN', main: 'ไล่ Timeline เหตุการณ์ที่เกิดขึ้น?', hint: '(ลำดับก่อน-หลัง)' },
  { cat: 'WHY - สาเหตุ', frame: 'WHY', main: 'สาเหตุเกิดจากอะไร?', hint: '(บริบท ความขัดแย้ง)' },
  { cat: 'NEEDS - ความต้องการ', frame: 'WHAT', main: 'อยากให้ SWING ช่วยเหลือเรื่องอะไรบ้าง?', hint: '(สิ่งที่ต้องการความช่วยเหลือ)' },
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
