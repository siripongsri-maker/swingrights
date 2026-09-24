import type { Entry } from '../index';

/**
 * PDPA privacy policy page (src/pages/Privacy.tsx).
 * Legal text: th/en required; my/km/lo fall back to en automatically.
 */
export const PRIVACY_DICT: Record<string, Entry> = {
  'privacy.title': { th: 'นโยบายความเป็นส่วนตัว (PDPA)', en: 'Privacy Policy (PDPA)' },
  'privacy.updated': { th: 'มูลนิธิเพื่อนพนักงานบริการ (SWING Foundation) · ปรับปรุงล่าสุด {date}', en: 'SWING Foundation · Last updated {date}' },
  'privacy.updatedDate': { th: '5 สิงหาคม 2569', en: '5 August 2026' },

  'privacy.s1.title': { th: '1. ผู้ควบคุมข้อมูลส่วนบุคคล', en: '1. Data Controller' },
  'privacy.s1.p1': {
    th: 'มูลนิธิเพื่อนพนักงานบริการ (SWING) เป็นผู้ควบคุมข้อมูลส่วนบุคคลของระบบคัดกรองการละเมิดสิทธิด้วยเสียงนี้ ติดต่อเจ้าหน้าที่คุ้มครองข้อมูล (DPO) ได้ที่อีเมล',
    en: 'The Service Workers IN Group (SWING) Foundation is the data controller for this voice-based rights-violation screening system. You may contact the Data Protection Officer (DPO) at',
  },

  'privacy.s2.title': { th: '2. ข้อมูลที่เก็บรวบรวม', en: '2. Data We Collect' },
  'privacy.s2.li1': { th: 'ข้อมูลระบุตัวตน: ชื่อ-นามสกุล ที่อยู่ เบอร์โทร อีเมลของผู้แจ้งและผู้รับบริการ', en: 'Identifying data: full name, address, phone number, and email of the reporter and service recipient' },
  'privacy.s2.li2': { th: 'ข้อมูลอ่อนไหว: กลุ่มประชากร เพศสภาพ สถานะสุขภาพจิต (2Q/9Q) และรายละเอียดเหตุการณ์ละเมิด', en: 'Sensitive data: demographic group, gender identity, mental health status (2Q/9Q), and details of the violation incident' },
  'privacy.s2.li3': { th: 'ไฟล์เสียงสัมภาษณ์ ข้อความถอดเสียง รูปภาพประกอบ และลายเซ็นอิเล็กทรอนิกส์', en: 'Interview audio recordings, transcripts, supporting images, and electronic signatures' },
  'privacy.s2.li4': { th: 'ข้อมูลการใช้งานระบบเท่าที่จำเป็นเพื่อความปลอดภัย (เวลาเข้าดูเคส ผู้เข้าดู)', en: 'System usage data necessary for security purposes (case access time, viewer identity)' },

  'privacy.s3.title': { th: '3. ฐานทางกฎหมายและวัตถุประสงค์', en: '3. Legal Basis and Purpose' },
  'privacy.s3.p1.pre': { th: 'เก็บและใช้ข้อมูลบนฐาน', en: 'Data is collected and used on the basis of' },
  'privacy.s3.p1.strong': { th: 'ความยินยอมโดยชัดแจ้ง', en: 'explicit consent' },
  'privacy.s3.p1.post': {
    th: '(มาตรา 26 สำหรับข้อมูลอ่อนไหว) และฐานประโยชน์สำคัญต่อชีวิตในกรณีฉุกเฉินที่มีความเสี่ยงต่อชีวิต เพื่อวัตถุประสงค์: รับเรื่องและช่วยเหลือผู้ถูกละเมิดสิทธิ ส่งต่อหน่วยงานที่เกี่ยวข้อง และจัดทำสถิติแบบไม่ระบุตัวตน',
    en: '(Section 26 for sensitive data) and on the vital-interest basis in life-threatening emergencies, for the purposes of: receiving and assisting victims of rights violations, referral to relevant agencies, and producing anonymised statistics.',
  },

  'privacy.s4.title': { th: '4. การเก็บข้อมูลแบบแยกส่วน (data minimisation)', en: '4. Data Minimisation (Separated Storage)' },
  'privacy.s4.p1.pre': { th: 'ข้อมูลระบุตัวตน (ชื่อ ที่อยู่ เบอร์โทร) ถูกจัดเก็บแยกจากเนื้อหาเคสในตารางเฉพาะที่ไม่มีผู้ใดอ่านได้โดยตรง ต้องเรียกผ่านฟังก์ชันที่ตรวจสิทธิ์และ', en: 'Identifying data (name, address, phone number) is stored separately from case content, in a dedicated table that cannot be read directly by anyone. It must be accessed through a permission-checking function that' },
  'privacy.s4.p1.strong': { th: 'บันทึกประวัติการเข้าดูทุกครั้ง', en: 'logs every access' },
  'privacy.s4.p1.post': { th: 'หน้ารายการเคสจะแสดงเพียงชื่อแบบปกปิด (เช่น ส•••) และรหัสเคสเท่านั้น', en: 'The case list view shows only a masked name (e.g. S•••) and the case ID.' },

  'privacy.s5.title': { th: '5. การใช้ AI', en: '5. Use of AI' },
  'privacy.s5.p1.pre': { th: 'ระบบใช้ AI ช่วยถอดเสียงและสรุปความเสี่ยงเบื้องต้น ข้อมูลจะถูก', en: 'The system uses AI to assist with transcription and preliminary risk summarisation. Data is' },
  'privacy.s5.p1.strong': { th: 'ลบข้อมูลระบุตัวตนออกก่อนส่งประมวลผลทุกครั้ง', en: 'de-identified before every processing request' },
  'privacy.s5.p1.post': { th: 'การประมวลผลด้วย AI กระทำภายในหน่วยงานเท่านั้น ข้อมูลจะไม่ถูกนำออกนอกหน่วยงาน ไม่ถูกนำไปฝึกสอนโมเดล และไม่ถูกใช้เพื่อการอื่นใดนอกเหนือจากวัตถุประสงค์ที่แจ้งไว้ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ผลลัพธ์ของ AI เป็นเพียงข้อเสนอแนะ — การตัดสินใจทั้งหมดทำโดยเจ้าหน้าที่', en: 'AI processing is performed within the organisation only. Data never leaves the organisation, is never used to train models, and is never used for any purpose beyond those stated under the PDPA (Personal Data Protection Act B.E. 2562). AI output is only a suggestion — all decisions are made by staff.' },

  'privacy.s6.title': { th: '6. ผู้ที่เข้าถึงข้อมูลได้', en: '6. Who Can Access the Data' },
  'privacy.s6.li1': { th: 'ผู้ดูแลระบบ / หัวหน้างาน: เข้าถึงเคสทั้งหมดเท่าที่จำเป็นต่อการกำกับดูแล', en: 'Administrators / supervisors: access all cases as necessary for oversight' },
  'privacy.s6.li2': { th: 'นักสังคมสงเคราะห์: เข้าถึงข้อมูลระบุตัวตนเฉพาะเคสที่ได้รับมอบหมาย', en: 'Social workers: access identifying data only for assigned cases' },
  'privacy.s6.li3': { th: 'ผู้อ่านอย่างเดียว: เห็นเฉพาะข้อมูลเคสแบบไม่ระบุตัวตน', en: 'Read-only users: see only anonymised case data' },
  'privacy.s6.li4': { th: 'หน่วยงานภายนอกจะได้รับข้อมูลเฉพาะเมื่อเจ้าของข้อมูลยินยอมให้ส่งต่อ', en: 'External agencies receive data only when the data subject consents to referral' },

  'privacy.s7.title': { th: '7. ระยะเวลาจัดเก็บ', en: '7. Retention Period' },
  'privacy.s7.p1': {
    th: 'เก็บข้อมูลเคส 5 ปีนับจากวันปิดเคส (สอดคล้องกับอายุความคดี) ไฟล์เสียงและรูปภาพเก็บ 1 ปีหลังปิดเคส เมื่อครบกำหนดจะลบหรือทำให้ไม่สามารถระบุตัวบุคคลได้',
    en: 'Case data is retained for 5 years from the case closing date (consistent with statutory limitation periods). Audio files and images are retained for 1 year after case closure. Upon expiry, data is deleted or anonymised.',
  },

  'privacy.s8.title': { th: '8. สิทธิของเจ้าของข้อมูล', en: '8. Data Subject Rights' },
  'privacy.s8.intro': { th: 'ท่านมีสิทธิตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ได้แก่', en: 'Under the Personal Data Protection Act B.E. 2562 (2019), you have the right to:' },
  'privacy.s8.li1': { th: 'ขอเข้าถึงและขอสำเนาข้อมูล', en: 'Request access to and a copy of your data' },
  'privacy.s8.li2': { th: 'ขอแก้ไขให้ถูกต้องเป็นปัจจุบัน', en: 'Request correction to keep data accurate and up to date' },
  'privacy.s8.li3': { th: 'ขอลบ ทำลาย หรือทำให้ไม่ระบุตัวตน', en: 'Request deletion, destruction, or anonymisation' },
  'privacy.s8.li4': { th: 'ขอระงับการใช้ / คัดค้านการประมวลผล', en: 'Request restriction of use / object to processing' },
  'privacy.s8.li5': { th: 'ถอนความยินยอมเมื่อใดก็ได้ โดยไม่กระทบการช่วยเหลือที่ได้ดำเนินการไปแล้ว', en: 'Withdraw consent at any time, without affecting assistance already provided' },
  'privacy.s8.li6': { th: 'ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', en: 'Lodge a complaint with the Office of the Personal Data Protection Committee' },
  'privacy.s8.p2': {
    th: 'ใช้สิทธิได้โดยแจ้งรหัสเคสของท่านมาที่ dpo@swingthailand.org หรือติดต่อเจ้าหน้าที่ที่รับเรื่อง ระบบจะดำเนินการภายใน 30 วัน',
    en: 'You may exercise these rights by sending your case ID to dpo@swingthailand.org or contacting the staff handling your case. Requests will be processed within 30 days.',
  },

  'privacy.s9.title': { th: '9. มาตรการความปลอดภัย', en: '9. Security Measures' },
  'privacy.s9.li1': { th: 'เข้ารหัสข้อมูลระหว่างส่งและขณะจัดเก็บ', en: 'Encryption of data in transit and at rest' },
  'privacy.s9.li2': { th: 'ควบคุมสิทธิ์ระดับแถวข้อมูล (RLS) ตามบทบาทผู้ใช้', en: 'Row-level security (RLS) access control based on user role' },
  'privacy.s9.li3': { th: 'ไฟล์เสียง/รูปภาพเป็นที่จัดเก็บแบบปิด เปิดดูผ่านลิงก์ชั่วคราวอายุ 5 นาที', en: 'Audio/image files are stored in private storage, accessible only via temporary links valid for 5 minutes' },
  'privacy.s9.li4': { th: 'ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งาน 20 นาที และบันทึก audit log ทุกการแก้ไข', en: 'Automatic logout after 20 minutes of inactivity, and an audit log recording every modification' },

  'privacy.s10.title': { th: '10. เหตุละเมิดข้อมูล', en: '10. Data Breach Notification' },
  'privacy.s10.p1': {
    th: 'หากเกิดเหตุละเมิดข้อมูลส่วนบุคคล มูลนิธิจะแจ้งสำนักงานฯ ภายใน 72 ชั่วโมง และแจ้งเจ้าของข้อมูลเมื่อมีความเสี่ยงสูง',
    en: 'In the event of a personal data breach, the Foundation will notify the Office within 72 hours and notify affected data subjects where there is a high risk to their rights.',
  },

  'privacy.footer': {
    th: 'เอกสารนี้จัดทำโดยมูลนิธิเพื่อนพนักงานบริการ (SWING Foundation) เพื่ออธิบายแนวปฏิบัติของระบบ · ไม่ใช่การรับรองหรือตรวจสอบโดยบุคคลที่สาม',
    en: 'This document is prepared by the SWING Foundation to describe the system\u2019s practices · it is not a certification or third-party audit.',
  },
};
