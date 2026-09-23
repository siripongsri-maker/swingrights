import type { Entry } from '../index';

export const PII_DICT: Record<string, Entry> = {
  'pii.hint': {
    th: 'ไม่ต้องใส่ชื่อจริง เลขบัตร หรือสถานะการเข้าเมือง ระบบเก็บเฉพาะเรื่องที่เกิดขึ้น',
    en: 'No need to include real names, ID numbers or immigration status. We only record what happened.',
  },
  'pii.dialog.title': { th: 'ข้อความอาจมีข้อมูลส่วนตัว', en: 'This may include personal details' },
  'pii.dialog.body': {
    th: 'ดูเหมือนมีเลขบัตร เลขพาสปอร์ต หรือเรื่องการเข้าเมือง อยากลบออกก่อนส่งไหม? ส่งต่อได้เลยถ้าต้องการ',
    en: 'It looks like there may be an ID number, passport number or immigration details. Would you like to remove it before sending? You can still send it as is.',
  },
  'pii.dialog.edit': { th: 'แก้ไข', en: 'Edit' },
  'pii.dialog.send': { th: 'ส่งเลย', en: 'Send anyway' },
  'pii.flag.title': { th: 'อาจมีข้อมูลส่วนตัว — รอ M&E ตรวจ', en: 'Possible personal details — M&E review' },
};
