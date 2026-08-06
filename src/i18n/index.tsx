import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type Lang = 'th' | 'en';

const STORAGE_KEY = 'swing.lang';

type Dict = Record<string, { th: string; en: string }>;

export const DICT: Dict = {
  // Common
  'app.name': { th: 'SWING · คัดกรองด้วยเสียง', en: 'SWING · Voice Screening' },
  'nav.privacy': { th: 'นโยบายความเป็นส่วนตัว', en: 'Privacy policy' },
  'nav.staff': { th: 'เจ้าหน้าที่', en: 'Staff' },
  'common.search': { th: 'ค้นหา', en: 'Search' },
  'common.back': { th: 'ย้อนกลับ', en: 'Back' },

  // Landing
  'landing.badge': { th: 'RIGHTS & VIOLATION TOOL', en: 'RIGHTS & VIOLATION TOOL' },
  'landing.title1': { th: 'พื้นที่ปลอดภัย', en: 'A safe space' },
  'landing.title2': { th: 'สำหรับเสียงที่ถูกละเมิด', en: 'for voices that were harmed' },
  'landing.subtitle': {
    th: 'เล่าเรื่องด้วยเสียงของคุณเอง ทีละคำถาม ไม่เร่งรัด — ระบบจะช่วยประเมินความเสี่ยงและส่งต่อความช่วยเหลือให้อัตโนมัติ',
    en: 'Tell your story in your own voice, one question at a time, at your own pace — we help assess risk and route you to support.',
  },
  'landing.cta.start': { th: 'เริ่มเล่าเรื่องของคุณ', en: 'Start your story' },
  'landing.cta.track': { th: 'ติดตามสถานะเคส', en: 'Track a case' },
  'landing.card1.title': { th: 'เล่าได้ในจังหวะของคุณ', en: 'Go at your own pace' },
  'landing.card1.body': {
    th: 'ทีละคำถาม เหมือนคุยกับคนที่รับฟัง หยุดพักเมื่อไหร่ก็ได้ ระบบเก็บฉบับร่างไว้ให้ ไม่ต้องเล่าซ้ำ',
    en: 'One question at a time, like talking to someone who listens. Pause anytime — your draft is saved, so you never repeat yourself.',
  },
  'landing.card2.title': { th: 'เป็นความลับ', en: 'Confidential' },
  'landing.card2.body': {
    th: 'ข้อมูลส่วนบุคคลแยกเก็บและเข้ารหัส ตามมาตรฐาน PDPA',
    en: 'Personal data is stored separately and encrypted, following PDPA standards.',
  },
  'landing.stat.label': { th: 'คำถามคัดกรองด้วยเสียง', en: 'voice screening questions' },
  'landing.help.title': { th: 'ต้องการความช่วยเหลือเร่งด่วน?', en: 'Need urgent help?' },
  'landing.help.body': { th: 'สายด่วนสุขภาพจิต', en: 'Mental health hotline' },
  'landing.help.hours': { th: 'ตลอด 24 ชั่วโมง', en: 'available 24/7' },
  'landing.footer': { th: 'นโยบายความเป็นส่วนตัว (PDPA)', en: 'Privacy policy (PDPA)' },

  // Track
  'track.header': { th: 'ติดตามเคส', en: 'Track case' },
  'track.title': { th: 'ตรวจสอบสถานะเคส', en: 'Check case status' },
  'track.subtitle': { th: 'กรอกเลขอ้างอิงที่ได้รับ', en: 'Enter the reference code you received' },
  'track.notfound': { th: 'ไม่พบเคสที่มีเลขอ้างอิงนี้', en: 'No case found with this reference code' },
  'track.area': { th: 'พื้นที่', en: 'Area' },
  'track.savedAt': { th: 'บันทึกเมื่อ', en: 'Submitted' },
  'track.cancelled': { th: 'เคสถูกยกเลิก', en: 'This case was cancelled' },

  // Status labels
  'status.received': { th: 'รับเรื่อง', en: 'Received' },
  'status.inprogress': { th: 'ดำเนินงาน', en: 'In progress' },
  'status.completed': { th: 'สำเร็จ', en: 'Completed' },
  'status.cancelled': { th: 'ยกเลิก', en: 'Cancelled' },

  // Admin login
  'login.title': { th: 'เข้าสู่ระบบเจ้าหน้าที่', en: 'Staff sign in' },
  'login.email': { th: 'อีเมลหน่วยงาน', en: 'Work email' },
  'login.password': { th: 'รหัสผ่าน', en: 'Password' },
  'login.submit': { th: 'เข้าสู่ระบบ', en: 'Sign in' },
  'login.forgot': { th: 'ลืมรหัสผ่าน? ส่งลิงก์ตั้งรหัสใหม่', en: 'Forgot password? Send a reset link' },
  'login.otp': { th: 'รหัสยืนยัน 6 หลัก (Authenticator)', en: '6-digit code (Authenticator)' },
  'login.verify': { th: 'ยืนยันรหัส', en: 'Verify code' },
  'login.notice': {
    th: 'ระบบนี้เก็บข้อมูลผู้เสียหายที่มีความอ่อนไหวสูง บัญชีเปิดใช้โดยผู้ดูแลระบบเท่านั้น และแนะนำให้เปิดการยืนยันตัวตนสองชั้น (TOTP) ทุกบัญชี',
    en: 'This system holds highly sensitive survivor data. Accounts are created by administrators only, and two-factor authentication (TOTP) is strongly recommended.',
  },
  'login.success': { th: 'เข้าสู่ระบบสำเร็จ', en: 'Signed in successfully' },
  'login.fillBoth': { th: 'กรุณากรอกอีเมลและรหัสผ่าน', en: 'Please enter your email and password' },
  'login.failed': { th: 'เข้าสู่ระบบไม่สำเร็จ', en: 'Sign in failed' },
  'login.otpInvalid': { th: 'รหัสยืนยันไม่ถูกต้อง', en: 'Invalid verification code' },
  'login.otpPrompt': { th: 'กรอกรหัส 6 หลักจากแอป Authenticator', en: 'Enter the 6-digit code from your authenticator app' },
  'login.emailFirst': { th: 'กรอกอีเมลก่อน แล้วกดลืมรหัสผ่านอีกครั้ง', en: 'Enter your email first, then tap forgot password again' },
  'login.resetSent': { th: 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว', en: 'A password reset link has been sent to your email' },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT | string) => string;
}

const I18nContext = createContext<Ctx>({ lang: 'th', setLang: () => {}, t: (k) => String(k) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'en' || saved === 'th' ? saved : 'th';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
  }, []);

  const t = useCallback((key: string) => DICT[key]?.[lang] ?? key, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  return useContext(I18nContext);
}
