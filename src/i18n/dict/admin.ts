import type { Entry } from '../index';

/**
 * Admin user/partner management + access hooks
 * (AdminUsers.tsx, AdminPartners.tsx, useAccess.ts, useIdleLogout.ts, useCaseAlerts.ts).
 * Staff-facing: th/en required; my/km/lo fall back to en automatically.
 */
export const ADMIN_DICT: Record<string, Entry> = {
  // ---------- users.* ----------
  'users.header.title': { th: 'จัดการบัญชีเจ้าหน้าที่', en: 'Manage staff accounts' },
  'users.header.subtitle': { th: 'เชิญผู้ใช้ · กำหนดบทบาท · ระงับบัญชี', en: 'Invite users · assign roles · suspend accounts' },
  'users.invite.title': { th: 'เชิญเจ้าหน้าที่ใหม่', en: 'Invite new staff' },
  'users.invite.emailPlaceholder': { th: 'อีเมล', en: 'Email' },
  'users.invite.namePlaceholder': { th: 'ชื่อที่แสดง (ไม่บังคับ)', en: 'Display name (optional)' },
  'users.invite.send': { th: 'ส่งคำเชิญ', en: 'Send invite' },
  'users.invite.note': {
    th: 'ผู้ถูกเชิญจะได้รับอีเมลเพื่อกำหนดรหัสผ่าน จากนั้นเข้าสู่ระบบที่ /admin/login',
    en: 'Invited users receive an email to set a password, then sign in at /admin/login',
  },
  'users.invite.success': { th: 'ส่งคำเชิญแล้ว', en: 'Invite sent' },
  'users.list.title': { th: 'รายชื่อเจ้าหน้าที่', en: 'Staff list' },
  'users.list.suspended': { th: 'ถูกระงับการใช้งาน', en: 'Suspended' },
  'users.role.placeholder': { th: 'ยังไม่มีบทบาท', en: 'No role assigned' },
  'users.role.updateSuccess': { th: 'อัปเดตบทบาทแล้ว', en: 'Role updated' },
  'users.status.updateSuccess': { th: 'อัปเดตสถานะบัญชีแล้ว', en: 'Account status updated' },
  'users.resetPassword': { th: 'รีเซ็ตรหัส', en: 'Reset password' },
  'users.resetPassword.success': { th: 'ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว', en: 'Password reset link sent' },
  'users.suspend': { th: 'ระงับ', en: 'Suspend' },
  'users.restore': { th: 'คืนสิทธิ์', en: 'Restore' },

  // ---------- partners.* ----------
  'partners.orgType.agency': { th: 'หน่วยงาน', en: 'Agency' },
  'partners.orgType.hospital': { th: 'โรงพยาบาล / สุขภาพ', en: 'Hospital / health' },
  'partners.orgType.legal': { th: 'กฎหมาย / ทนาย', en: 'Legal / lawyer' },
  'partners.orgType.ngo': { th: 'องค์กรภาคประชาชน', en: 'NGO' },
  'partners.orgType.shelter': { th: 'ศูนย์พักพิง', en: 'Shelter' },
  'partners.orgType.police': { th: 'ตำรวจ / หน่วยงานรัฐ', en: 'Police / government agency' },
  'partners.orgType.hotline': { th: 'สายด่วน', en: 'Hotline' },
  'partners.orgType.other': { th: 'อื่น ๆ', en: 'Other' },
  'partners.header.title': { th: 'หน่วยงานรับส่งต่อ', en: 'Referral partners' },
  'partners.header.subtitle': { th: 'เครือข่ายช่วยเหลือรายพื้นที่ — ใช้แนะนำในรายละเอียดเคส', en: 'Local support network — used for recommendations in case details' },
  'partners.add': { th: 'เพิ่มหน่วยงาน', en: 'Add partner' },
  'partners.add.title': { th: 'เพิ่มหน่วยงานรับส่งต่อ', en: 'Add referral partner' },
  'partners.form.namePlaceholder': { th: 'ชื่อหน่วยงาน *', en: 'Organization name *' },
  'partners.form.provincePlaceholder': { th: 'จังหวัด (เว้นว่าง = ทุกพื้นที่)', en: 'Province (blank = all areas)' },
  'partners.form.districtPlaceholder': { th: 'อำเภอ/เขต', en: 'District' },
  'partners.form.phonePlaceholder': { th: 'โทรศัพท์', en: 'Phone' },
  'partners.form.emailPlaceholder': { th: 'อีเมล', en: 'Email' },
  'partners.form.addressPlaceholder': { th: 'ที่อยู่', en: 'Address' },
  'partners.form.servicesPlaceholder': {
    th: 'บริการที่ให้ (คั่นด้วย ,) เช่น ตรวจสุขภาพ, ให้คำปรึกษากฎหมาย',
    en: 'Services offered (comma separated) e.g. medical exam, legal counseling',
  },
  'partners.form.notesPlaceholder': { th: 'หมายเหตุภายใน', en: 'Internal notes' },
  'partners.save': { th: 'บันทึก', en: 'Save' },
  'partners.error.nameRequired': { th: 'กรุณากรอกชื่อหน่วยงาน', en: 'Please enter the organization name' },
  'partners.error.saveFailed': { th: 'บันทึกไม่สำเร็จ', en: 'Save failed' },
  'partners.success.added': { th: 'เพิ่มหน่วยงานแล้ว', en: 'Partner added' },
  'partners.error.updateFailed': { th: 'อัปเดตไม่สำเร็จ', en: 'Update failed' },
  'partners.confirmDelete': { th: 'ลบ "{name}" ออกจากรายชื่อหน่วยงานรับส่งต่อ?', en: 'Delete "{name}" from the referral partner list?' },
  'partners.error.deleteFailed': { th: 'ลบไม่สำเร็จ', en: 'Delete failed' },
  'partners.success.deleted': { th: 'ลบแล้ว', en: 'Deleted' },
  'partners.adminOnly': { th: 'เฉพาะผู้ดูแลระบบ', en: 'Admins only' },
  'partners.inactive': { th: 'ปิดใช้งาน', en: 'Inactive' },
  'partners.allAreas': { th: 'ทุกพื้นที่', en: 'All areas' },
  'partners.disable': { th: 'ปิดใช้งาน', en: 'Disable' },
  'partners.enable': { th: 'เปิดใช้งาน', en: 'Enable' },
  'partners.delete': { th: 'ลบ', en: 'Delete' },
  'partners.empty': {
    th: 'ยังไม่มีหน่วยงานในระบบ — กด "เพิ่มหน่วยงาน" เพื่อเริ่มสร้างเครือข่ายรายพื้นที่',
    en: 'No partners yet — click "Add partner" to start building your local network',
  },

  // ---------- access.* (roles) ----------
  'access.role.admin': { th: 'ผู้ดูแลระบบ', en: 'Admin' },
  'access.role.manager': { th: 'หัวหน้างาน', en: 'Manager' },
  'access.role.caseworker': { th: 'ผู้ปฏิบัติงานเคส', en: 'Caseworker' },
  'access.role.viewer': { th: 'ผู้ดูอย่างเดียว', en: 'Viewer' },
  'access.role.staff': { th: 'เจ้าหน้าที่', en: 'Staff' },

  // ---------- access.* (idle logout / alerts) ----------
  'access.idle.loggedOut': { th: 'ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งาน', en: 'Logged out automatically due to inactivity' },
  'access.idle.warning': { th: 'ไม่มีการใช้งาน — ระบบจะออกจากระบบใน 1 นาที', en: 'No activity — you will be logged out in 1 minute' },
  'access.alerts.unspecifiedArea': { th: 'ไม่ระบุพื้นที่', en: 'unspecified area' },
  'access.alerts.levelPrefix': { th: 'ระดับ {level}', en: 'level {level}' },
  'access.alerts.selfHarmRisk': { th: '🚨 เคสเสี่ยงทำร้ายตนเอง — {msg}', en: '🚨 Self-harm risk case — {msg}' },
  'access.alerts.highRisk': { th: '⚠️ เคสความเสี่ยงสูง — {msg}', en: '⚠️ High-risk case — {msg}' },
};
