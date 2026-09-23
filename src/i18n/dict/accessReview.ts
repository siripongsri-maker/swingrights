import type { Entry } from '../index';

export const ACCESS_REVIEW_DICT: Record<string, Entry> = {
  'areview.nav': { th: 'ตรวจสอบสิทธิ์', en: 'Access review' },
  'areview.title': { th: 'ตรวจสอบการเข้าถึงรายเดือน', en: 'Monthly access review' },
  'areview.back': { th: 'กลับแดชบอร์ด', en: 'Back to dashboard' },
  'areview.month': { th: 'เดือน', en: 'Month' },
  'areview.col.staff': { th: 'เจ้าหน้าที่', en: 'Staff' },
  'areview.col.roles': { th: 'บทบาท', en: 'Roles' },
  'areview.col.views': { th: 'เปิดดูเคส', en: 'Case views' },
  'areview.col.exports': { th: 'ส่งออก', en: 'Exports' },
  'areview.col.lastLogin': { th: 'เข้าระบบล่าสุด', en: 'Last login' },
  'areview.never': { th: 'ไม่เคย', en: 'Never' },
  'areview.inactive': { th: 'ไม่มีกิจกรรม 30 วัน', en: 'No activity 30 days' },
  'areview.suspended': { th: 'ระงับ', en: 'Suspended' },
  'areview.markReviewed': { th: 'ทำเครื่องหมายว่าตรวจแล้ว', en: 'Mark reviewed' },
  'areview.reviewedAt': { th: 'ตรวจแล้วเมื่อ {date}', en: 'Reviewed {date}' },
  'areview.notReviewed': { th: 'ยังไม่ได้ตรวจเดือนนี้', en: 'Not yet reviewed this month' },
  'areview.saved': { th: 'บันทึกการตรวจแล้ว', en: 'Review recorded' },
  'areview.error': { th: 'โหลดข้อมูลไม่สำเร็จ', en: 'Could not load data' },
  'areview.empty': { th: 'ไม่มีเจ้าหน้าที่', en: 'No staff' },
  'areview.alert.unassigned': { th: 'เคสยังไม่มีผู้รับผิดชอบ: {code} · {area} · {level}', en: 'Case unassigned: {code} · {area} · {level}' },
};
