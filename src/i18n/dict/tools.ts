import type { Entry } from '../index';

/**
 * Screening tools 2Q/9Q/NRM (components/screening/ScreeningTools.tsx, lib/screeningTools.ts).
 * Staff-facing: th/en required; my/km/lo fall back to en automatically.
 */
export const TOOLS_DICT: Record<string, Entry> = {
  // ---------- 2Q ----------
  'tools.q2.title': { th: 'แบบคัดกรองโรคซึมเศร้า 2 คำถาม (2Q)', en: 'Depression Screening — 2 Questions (2Q)' },
  'tools.q2.subtitle': {
    th: 'กรมสุขภาพจิต · ตอบ "มี" ข้อใดข้อหนึ่ง ให้ทำ 9Q ต่อ',
    en: 'Dept. of Mental Health · If "yes" to either item, proceed to 9Q',
  },
  'tools.q2.yes': { th: 'มี', en: 'Yes' },
  'tools.q2.no': { th: 'ไม่มี', en: 'No' },
  'tools.q2.resultLabel': { th: 'ผล 2Q', en: '2Q result' },
  'tools.q2.abnormal': { th: 'ผิดปกติ — ให้ทำแบบประเมิน 9Q ต่อ', en: 'Positive — proceed to 9Q assessment' },
  'tools.q2.normal': { th: 'ปกติ', en: 'Negative' },
  'tools.q.q2_1': {
    th: 'ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้ ท่านรู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวังหรือไม่',
    en: 'Over the past 2 weeks, including today, have you felt down, depressed, or hopeless?',
  },
  'tools.q.q2_2': {
    th: 'ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้ ท่านรู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลินหรือไม่',
    en: 'Over the past 2 weeks, including today, have you had little interest or pleasure in doing things?',
  },

  // ---------- 9Q ----------
  'tools.q9.title': { th: 'แบบประเมินโรคซึมเศร้า 9 คำถาม (9Q)', en: 'Depression Assessment — 9 Questions (9Q)' },
  'tools.q9.subtitle': {
    th: 'ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้ ท่านมีอาการเหล่านี้บ่อยแค่ไหน',
    en: 'Over the past 2 weeks, including today, how often have you been bothered by the following?',
  },
  'tools.q.q9_1': { th: 'เบื่อ ไม่สนใจอยากทำอะไร', en: 'Little interest or pleasure in doing things' },
  'tools.q.q9_2': { th: 'ไม่สบายใจ ซึมเศร้า ท้อแท้', en: 'Feeling down, depressed, or hopeless' },
  'tools.q.q9_3': { th: 'หลับยาก หรือหลับๆ ตื่นๆ หรือหลับมากไป', en: 'Trouble falling/staying asleep, or sleeping too much' },
  'tools.q.q9_4': { th: 'เหนื่อยง่าย หรือไม่ค่อยมีแรง', en: 'Feeling tired or having little energy' },
  'tools.q.q9_5': { th: 'เบื่ออาหาร หรือกินมากเกินไป', en: 'Poor appetite or overeating' },
  'tools.q.q9_6': {
    th: 'รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลว หรือทำให้ตนเอง/ครอบครัวผิดหวัง',
    en: 'Feeling bad about yourself, or that you are a failure, or have let yourself/your family down',
  },
  'tools.q.q9_7': {
    th: 'สมาธิไม่ดีเวลาทำอะไร เช่น ดูโทรทัศน์ ฟังวิทยุ หรือทำงานที่ต้องใช้ความตั้งใจ',
    en: 'Trouble concentrating on things, such as watching TV, listening to the radio, or focused tasks',
  },
  'tools.q.q9_8': {
    th: 'พูดช้า ทำอะไรช้าลงจนคนอื่นสังเกตเห็นได้ หรือกระสับกระส่ายจนอยู่ไม่นิ่งเหมือนเคย',
    en: 'Moving or speaking noticeably slower, or being fidgety/restless more than usual',
  },
  'tools.q.q9_9': {
    th: 'คิดทำร้ายตนเอง หรือคิดว่าถ้าตายไปคงจะดี',
    en: 'Thoughts of hurting yourself, or that you would be better off dead',
  },
  'tools.q9.scale.never': { th: 'ไม่มีเลย', en: 'Not at all' },
  'tools.q9.scale.someDays': { th: 'เป็นบางวัน (1-7 วัน)', en: 'Some days (1-7 days)' },
  'tools.q9.scale.often': { th: 'เป็นบ่อย (>7 วัน)', en: 'Often (>7 days)' },
  'tools.q9.scale.everyDay': { th: 'เป็นทุกวัน', en: 'Nearly every day' },
  'tools.q9.totalLabel': { th: 'คะแนนรวม 9Q', en: '9Q total score' },
  'tools.level.none': { th: 'ไม่มีอาการซึมเศร้า', en: 'No depression' },
  'tools.level.mild': { th: 'ซึมเศร้าระดับน้อย', en: 'Mild depression' },
  'tools.level.moderate': { th: 'ซึมเศร้าระดับปานกลาง', en: 'Moderate depression' },
  'tools.level.severe': { th: 'ซึมเศร้าระดับรุนแรง', en: 'Severe depression' },

  // ---------- Escalation ----------
  'tools.escalation.title': {
    th: 'พบความเสี่ยงการทำร้ายตนเอง — ต้องดำเนินการทันที',
    en: 'Self-harm risk detected — immediate action required',
  },
  'tools.escalation.call': { th: 'โทร', en: 'Call' },
  'tools.escalation.hotlineName': { th: 'สายด่วนสุขภาพจิต 1323', en: 'Mental Health Hotline 1323' },
  'tools.escalation.hotlineNote': {
    th: 'ให้บริการฟรี 24 ชั่วโมง · ระบบจะแจ้ง case manager แบบเรียลไทม์เมื่อบันทึกเคส',
    en: 'Free 24-hour service · Case manager will be notified in real time when the case is saved',
  },
  'tools.escalation.safetyPlanTitle': { th: 'ขั้นตอน Safety Planning', en: 'Safety Planning Steps' },
  'tools.q.step_1': {
    th: 'อยู่กับผู้รับบริการ ไม่ปล่อยให้อยู่คนเดียวจนกว่าจะประเมินความปลอดภัยเสร็จ',
    en: 'Stay with the client; do not leave them alone until a safety assessment is complete',
  },
  'tools.q.step_2': {
    th: 'ถามตรงๆ ว่ามีแผน วิธีการ หรือกำหนดเวลาในการทำร้ายตนเองหรือไม่',
    en: 'Ask directly whether they have a plan, method, or timeline for self-harm',
  },
  'tools.q.step_3': {
    th: 'นำสิ่งของที่อาจใช้ทำร้ายตนเองออกจากบริเวณ และประสานผู้ใกล้ชิดที่ไว้ใจได้',
    en: 'Remove any means of self-harm from the area and coordinate with a trusted person close to them',
  },
  'tools.q.step_4': {
    th: 'โทร 1323 ร่วมกับผู้รับบริการ หรือส่งต่อโรงพยาบาล/จิตแพทย์ทันทีหากมีความเสี่ยงสูง',
    en: 'Call 1323 together with the client, or refer immediately to a hospital/psychiatrist if risk is high',
  },
  'tools.q.step_5': {
    th: 'บันทึกข้อตกลงความปลอดภัย เบอร์ติดต่อฉุกเฉิน และนัดติดตามภายใน 24-48 ชั่วโมง',
    en: 'Record the safety agreement, emergency contacts, and schedule follow-up within 24-48 hours',
  },

  // ---------- NRM ----------
  'tools.nrm.title': {
    th: 'แบบคัดแยกผู้เสียหายจากการค้ามนุษย์ (NRM)',
    en: 'National Referral Mechanism — Trafficking Screening (NRM)',
  },
  'tools.nrm.subtitle': {
    th: 'เข้าเกณฑ์เมื่อพบตัวบ่งชี้ครบทั้ง 3 ด้าน (หรือ 2 ด้านหากอายุต่ำกว่า 18 ปี)',
    en: 'Positive when indicators are found in all 3 domains (or 2 domains if under 18 years old)',
  },
  'tools.nrm.section.act': { th: 'การกระทำ (Act)', en: 'Act' },
  'tools.nrm.section.means': { th: 'วิธีการ (Means)', en: 'Means' },
  'tools.nrm.section.purpose': { th: 'วัตถุประสงค์ (Purpose)', en: 'Purpose' },
  'tools.q.act_1': {
    th: 'ถูกจัดหา ชักชวน หรือพามาจากที่อื่นเพื่อทำงานนี้',
    en: 'Was recruited, persuaded, or brought from elsewhere to do this work',
  },
  'tools.q.act_2': {
    th: 'ถูกส่งต่อ/ขายต่อให้บุคคลหรือสถานประกอบการอื่น',
    en: 'Was transferred/sold to another person or establishment',
  },
  'tools.q.act_3': {
    th: 'ถูกกักตัวหรือจัดที่พักโดยผู้ควบคุมงาน',
    en: 'Was confined or housed by a work supervisor/controller',
  },
  'tools.q.means_1': {
    th: 'ถูกหลอกลวงเรื่องลักษณะงาน ค่าตอบแทน หรือเงื่อนไข',
    en: 'Was deceived about the nature of the work, pay, or conditions',
  },
  'tools.q.means_2': { th: 'ถูกยึดเอกสารประจำตัว/หนังสือเดินทาง', en: 'Had identity documents/passport confiscated' },
  'tools.q.means_3': {
    th: 'มีภาระหนี้ที่ต้องใช้คืนด้วยการทำงาน (debt bondage)',
    en: 'Has a debt that must be repaid through work (debt bondage)',
  },
  'tools.q.means_4': {
    th: 'ถูกขู่ทำร้าย ข่มขู่ครอบครัว หรือใช้กำลังบังคับ',
    en: 'Was threatened with harm, family intimidation, or physical force',
  },
  'tools.q.means_5': {
    th: 'ถูกจำกัดการเดินทางหรือการติดต่อกับภายนอก',
    en: 'Had freedom of movement or outside contact restricted',
  },
  'tools.q.purpose_1': {
    th: 'ถูกบังคับให้ให้บริการทางเพศหรือทำงานโดยไม่สมัครใจ',
    en: 'Was forced into sexual services or involuntary labor',
  },
  'tools.q.purpose_2': {
    th: 'ไม่ได้รับค่าตอบแทน หรือได้รับน้อยกว่าที่ตกลงอย่างมาก',
    en: 'Received no pay, or far less than agreed',
  },
  'tools.q.purpose_3': {
    th: 'ทำงานเกินเวลาหรือในสภาพที่เป็นอันตราย โดยปฏิเสธไม่ได้',
    en: 'Worked excessive hours or in hazardous conditions with no ability to refuse',
  },
  'tools.nrm.under18': { th: 'ผู้เสียหายอายุต่ำกว่า 18 ปี', en: 'Person affected is under 18 years old' },
  'tools.nrm.resultLabel': { th: 'ผล NRM', en: 'NRM result' },
  'tools.nrm.positive': {
    th: 'เข้าข่ายผู้เสียหายจากการค้ามนุษย์ — ส่งต่อทีมสหวิชาชีพ/OSCC',
    en: 'Meets criteria for a person affected by trafficking — refer to multidisciplinary team/OSCC',
  },
  'tools.nrm.negative': { th: 'ยังไม่เข้าเกณฑ์เบื้องต้น', en: 'Does not yet meet the preliminary criteria' },
  'tools.nrm.minorNote': {
    th: 'ผู้เยาว์: ต้องขอความยินยอมจากผู้ปกครองตาม PDPA และใช้แนวทาง child survivor (GBVIMS)',
    en: 'Minor: parental consent required under PDPA; follow child survivor guidelines (GBVIMS)',
  },
};
