import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type Lang = 'th' | 'en' | 'my' | 'km' | 'lo';

const STORAGE_KEY = 'swing.lang';
const ALL: Lang[] = ['th', 'en', 'my', 'km', 'lo'];

export type TextDir = 'ltr' | 'rtl';

export const LANGS: { id: Lang; label: string; short: string; dir: TextDir }[] = [
  { id: 'th', label: 'ไทย', short: 'ไทย', dir: 'ltr' },
  { id: 'en', label: 'English', short: 'EN', dir: 'ltr' },
  { id: 'my', label: 'မြန်မာ', short: 'MY', dir: 'ltr' },
  { id: 'km', label: 'ខ្មែរ', short: 'KH', dir: 'ltr' },
  { id: 'lo', label: 'ລາວ', short: 'LAO', dir: 'ltr' },
];

/** Text direction of a language — used to flip the whole layout automatically. */
export function langDir(l: Lang): TextDir {
  return LANGS.find((x) => x.id === l)?.dir ?? 'ltr';
}

/** BCP-47 locale for SpeechRecognition / SpeechSynthesis per UI language. */
export const SPEECH_LOCALE: Record<Lang, string> = {
  th: 'th-TH',
  en: 'en-US',
  my: 'my-MM',
  km: 'km-KH',
  lo: 'lo-LA',
};

export type Entry = { th: string; en: string; my?: string; km?: string; lo?: string };
type Dict = Record<string, Entry>;

import { INTAKE_DICT } from './dict/intake';
import { DASH_DICT } from './dict/dash';
import { ADMIN_DICT } from './dict/admin';
import { MISC_DICT } from './dict/misc';
import { TOOLS_DICT } from './dict/tools';
import { PRIVACY_DICT } from './dict/privacy';

const BASE_DICT: Dict = {
  // ---------- Common ----------
  'app.name': {
    th: 'SWING · คัดกรองด้วยเสียง', en: 'SWING · Voice Screening',
    my: 'SWING · အသံဖြင့် စစ်ဆေးခြင်း', km: 'SWING · ស្គាល់ដោយសំឡេង', lo: 'SWING · ກວດຄັດກອງດ້ວຍສຽງ',
  },
  'nav.privacy': {
    th: 'นโยบายความเป็นส่วนตัว', en: 'Privacy policy',
    my: 'ကိုယ်ရေးကိုယ်တာ မူဝါဒ', km: 'គោលការណ៍ភាពឯកជន', lo: 'ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ',
  },
  'nav.staff': { th: 'เจ้าหน้าที่', en: 'Staff', my: 'ဝန်ထမ်း', km: 'បុគ្គលិក', lo: 'ພະນັກງານ' },
  'common.search': { th: 'ค้นหา', en: 'Search', my: 'ရှာဖွေမည်', km: 'ស្វែងរក', lo: 'ຄົ້ນຫາ' },
  'common.back': { th: 'ย้อนกลับ', en: 'Back', my: 'နောက်သို့', km: 'ត្រឡប់ក្រោយ', lo: 'ກັບຄືນ' },
  'common.next': { th: 'ถัดไป', en: 'Next', my: 'ရှေ့သို့', km: 'បន្ទាប់', lo: 'ຕໍ່ໄປ' },
  'common.optional': { th: 'ไม่บังคับ', en: 'Optional', my: 'မဖြည့်လည်းရ', km: 'មិនបង្ខំ', lo: 'ບໍ່ບັງຄັບ' },
  'common.record': { th: 'อัดเสียง', en: 'Record', my: 'အသံသွင်းမည်', km: 'ថតសំឡេង', lo: 'ອັດສຽງ' },
  'common.stop': { th: 'หยุดอัด', en: 'Stop', my: 'ရပ်မည်', km: 'ឈប់', lo: 'ຢຸດ' },
  'common.rerecord': { th: 'อัดใหม่', en: 'Re-record', my: 'ပြန်သွင်းမည်', km: 'ថតម្តងទៀត', lo: 'ອັດໃໝ່' },
  'common.recording': { th: 'กำลังอัดเสียง...', en: 'Recording...', my: 'အသံသွင်းနေသည်...', km: 'កំពុងថត...', lo: 'ກຳລັງອັດສຽງ...' },
  'common.micError': {
    th: 'ไม่สามารถเข้าถึงไมโครโฟนได้', en: 'Cannot access the microphone',
    my: 'မိုက်ကရိုဖုန်းကို အသုံးမပြုနိုင်ပါ', km: 'មិនអាចប្រើមីក្រូហ្វូនបានទេ', lo: 'ບໍ່ສາມາດເຂົ້າເຖິງໄມໂຄຣໂຟນໄດ້',
  },
  'common.listen': {
    th: 'ฟังเสียงที่อัดไว้', en: 'Listen to the recording',
    my: 'သွင်းထားသောအသံ နားထောင်မည်', km: 'ស្តាប់សំឡេងដែលបានថត', lo: 'ຟັງສຽງທີ່ອັດໄວ້',
  },

  // ---------- Landing ----------
  'landing.badge': { th: 'RIGHTS & VIOLATION TOOL', en: 'RIGHTS & VIOLATION TOOL' },
  'landing.title1': {
    th: 'พื้นที่ปลอดภัย', en: 'A safe space',
    my: 'လုံခြုံစိတ်ချရသော နေရာ', km: 'ទីតាំងដែលមានសុវត្ថិភាព', lo: 'ພື້ນທີ່ທີ່ປອດໄພ',
  },
  'landing.title2': {
    th: 'สำหรับเสียงที่ถูกละเมิด', en: 'for voices that were harmed',
    my: 'နှိပ်စက်ခံရသောံများအတွက်', km: 'សម្រាប់សំឡេងដែលត្រូវបានរំលោភ', lo: 'ສຳລັບສຽງທີ່ຖືກລະເມີດ',
  },
  'landing.subtitle': {
    th: 'เล่าเรื่องด้วยเสียงของคุณเอง ทีละคำถาม ไม่เร่งรัด — ระบบจะช่วยประเมินความเสี่ยงและส่งต่อความช่วยเหลือให้อัตโนมัติ',
    en: 'Tell your story in your own voice, one question at a time, at your own pace — we help assess risk and route you to support.',
    my: 'သင့်အသံကိုယ်တိုင်ဖြင့် တစ်မေးခွန်းချင်း ပြောပြပါ — စနစ်က အန္တရာယ်အဆင့်ကို ဆန်းစစ်ပြီး အကူအညီရရှိရန် ဆက်သွယ်ပေးပါမည်',
    km: 'ប្រាប់រឿងរបស់អ្នកដោយសំឡេងខ្លួនឯង ម្តងមួយសំណួរ — ប្រព័ន្ធនឹងវាយតម្លៃហានិភ័យ និងផ្តល់ជំនួយដោយស្វ័យប្រវត្តិ',
    lo: 'ເລົ່າເລື່ອງດ້ວຍສຽງຂອງທ່ານເອງ ທີລະຄຳຖາມ — ລະບົບຈະປະເມີນຄວາມສ່ຽງ ແລະ ສົ່ງຕໍ່ຄວາມຊ່ວຍເຫຼືອໃຫ້ອັດຕະໂນມັດ',
  },
  'landing.cta.start': {
    th: 'เริ่มเล่าเรื่องของคุณ', en: 'Start your story',
    my: 'စတင်ပြောပြပါ', km: 'ចាប់ផ្តើមនិយាយ', lo: 'ເລີ່ມເລົ່າເລື່ອງຂອງທ່ານ',
  },
  'landing.cta.track': {
    th: 'ติดตามสถานะเคส', en: 'Track a case',
    my: 'အမှုအခြေအနေ စစ်ဆေးမည်', km: 'តាមដានស្ថានភាពករណី', lo: 'ຕິດຕາມສະຖານະເຄສ',
  },
  'landing.cta.report': {
    th: 'รายงานปัญหาด้วยตนเอง (ไม่ต้องสมัคร)', en: 'Report a problem yourself (no sign-up)',
    my: 'ကိုယ်တိုင် ပြဿနာအသိပေးပါ (အကောင့်မလို)', km: 'រាយការណ៍បញ្ហាដោយខ្លួនឯង (មិនត្រូវការគណនី)', lo: 'ລາຍງານບັນຫາດ້ວຍຕົນເອງ (ບໍ່ຕ້ອງສະໝັກ)',
  },
  'landing.card1.title': {
    th: 'เล่าได้ในจังหวะของคุณ', en: 'Go at your own pace',
    my: 'ကိုယ်ပိုင်လေ့လာချိန်ဖြင့် ပြောပြနိုင်သည်', km: 'និយាយតាមល្បឿនរបស់អ្នក', lo: 'ເລົ່າຕາມຈັງຫວະຂອງທ່ານ',
  },
  'landing.card1.body': {
    th: 'ทีละคำถาม เหมือนคุยกับคนที่รับฟัง หยุดพักเมื่อไหร่ก็ได้ ระบบเก็บฉบับร่างไว้ให้ ไม่ต้องเล่าซ้ำ',
    en: 'One question at a time, like talking to someone who listens. Pause anytime — your draft is saved, so you never repeat yourself.',
    my: 'တစ်မေးခွန်းချင်း နားထောင်ပေးသူနှင့် စကားပြောသလို — အချိန်မရွေး ခဏရပ်နိုင်သည် မူကြမ်းကို အလိုအလျောက် သိမ်းထားသည်',
    km: 'ម្តងមួយសំណួរ ដូចនិយាយជាមួយអ្នកស្តាប់ — ផ្អាកពេលណាក៏បាន សេចក្តីព្រាងត្រូវបានរក្សាទុក',
    lo: 'ທີລະຄຳຖາມ ເຫມືອນຄຸຍກັບຜູ້ທີ່ຮັບຟັງ — ຢຸດພັກໄດ້ທຸກເມື່ອ ສະບັບຮ່າງຖືກເກັບໄວ້ໃຫ້',
  },
  'landing.card2.title': {
    th: 'เป็นความลับ', en: 'Confidential',
    my: 'လျှို့ဝှက်ထားသည်', km: 'រក្សាទុកជាការសម្ងាត់', lo: 'ເກັບໄວ້ເປັນຄວາມລັບ',
  },
  'landing.card2.body': {
    th: 'ข้อมูลส่วนบุคคลแยกเก็บและเข้ารหัส ตามมาตรฐาน PDPA',
    en: 'Personal data is stored separately and encrypted, following PDPA standards.',
    my: 'ကိုယ်ရေးအချက်အလက်များကို PDPA စံနှုန်းအတိုင်း ခွဲထုတ်သိမ်းဆည်းထားသည်',
    km: 'ទិន្នន័យផ្ទាល់ខ្លួនត្រូវបានរក្សាទុកដោយឡែក តាមស្តង់ដារ PDPA',
    lo: 'ຂໍ້ມູນສ່ວນຕົວຖືກເກັບແຍກ ແລະ ເຂົ້າລະຫັດ ຕາມມາດຕະຖານ PDPA',
  },
  'landing.stat.label': {
    th: 'คำถามคัดกรองด้วยเสียง', en: 'voice screening questions',
    my: 'အသံဖြင့် စစ်ဆေးသော မေးခွန်းများ', km: 'សំណួរស្គាល់ដោយសំឡេង', lo: 'ຄຳຖາມກວດຄັດກອງດ້ວຍສຽງ',
  },
  'landing.stats.registered': {
    th: 'ผู้ลงทะเบียน', en: 'registered users',
    my: 'မှတ်ပုံတင်ထားသူများ', km: 'អ្នកប្រើប្រាស់ចុះឈ្មោះ', lo: 'ຜູ້ລົງທະບຽນ',
  },
  'landing.stats.visitors': {
    th: 'ผู้เข้าชม', en: 'unique visitors',
    my: 'အထူးသဖြင့် ဝင်ရောက်သူများ', km: 'អ្នកទស្សនាដាច់ដោយឡែក', lo: 'ຜູ້ເຂົ້າຊົມ',
  },
  'landing.stats.visits': {
    th: 'การเข้าชม', en: 'total visits',
    my: 'စုစုပေါင်း ဝင်ရောက်မှုများ', km: 'ការចូលមើលសរុប', lo: 'ຈຳນວນການເຂົ້າຊົມ',
  },
  'landing.help.title': {
    th: 'ต้องการความช่วยเหลือเร่งด่วน?', en: 'Need urgent help?',
    my: 'အရေးပေါ် အကူအညီ လိုအပ်ပါသလား?', km: 'ត្រូវការជំនួយបន្ទាន់?', lo: 'ຕ້ອງການຄວາມຊ່ວຍເຫຼືອດ່ວນ?',
  },
  'landing.help.body': {
    th: 'สายด่วนสุขภาพจิต', en: 'Mental health hotline',
    my: 'စိတ်ကျန်းမာရေး ဟော့လိုင်း', km: 'ខ្សែទូរស័ព្ទសុខភាពផ្លូវចិត្ត', lo: 'ສາຍດ່ວນສຸຂະພາບຈິດ',
  },
  'landing.help.hours': {
    th: 'ตลอด 24 ชั่วโมง', en: 'available 24/7',
    my: '၂၄ နာရီ ဖွင့်သည်', km: 'បើក ២៤ ម៉ោង', lo: 'ເປີດ 24 ຊົ່ວໂມງ',
  },
  'landing.footer': {
    th: 'นโยบายความเป็นส่วนตัว (PDPA)', en: 'Privacy policy (PDPA)',
    my: 'ကိုယ်ရေးကိုယ်တာ မူဝါဒ (PDPA)', km: 'គោលការណ៍ភាពឯកជន (PDPA)', lo: 'ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ (PDPA)',
  },
  'landing.footer.recover': {
    th: 'กู้เคสค้างในเครื่อง', en: 'Recover drafts on this device',
    my: 'ဤစက်ထဲက ကျန်အမှုများ ပြန်ယူမည်', km: 'ស្តារសេចក្តីព្រាងក្នុងឧបករណ៍នេះ', lo: 'ກູ້ສະບັບຮ່າງໃນອຸປະກອນນີ້',
  },

  // ---------- Track ----------
  'track.header': { th: 'ติดตามเคส', en: 'Track case', my: 'အမှုစစ်ဆေးခြင်း', km: 'តាមដានករណី', lo: 'ຕິດຕາມເຄສ' },
  'track.title': {
    th: 'ตรวจสอบสถานะเคส', en: 'Check case status',
    my: 'အမှုအခြေအနေ စစ်ဆေးပါ', km: 'ពិនិត្យស្ថានភាពករណី', lo: 'ກວດສອບສະຖານະເຄສ',
  },
  'track.subtitle': {
    th: 'กรอกเลขอ้างอิงที่ได้รับ', en: 'Enter the reference code you received',
    my: 'ရရှိထားသော ကုတ်နံပါတ် ထည့်ပါ', km: 'បញ្ចូលលេខកូដដែលអ្នកទទួលបាន', lo: 'ໃສ່ລະຫັດອ້າງອີງທີ່ໄດ້ຮັບ',
  },
  'track.notfound': {
    th: 'ไม่พบเคสที่มีเลขอ้างอิงนี้', en: 'No case found with this reference code',
    my: 'ဤကုတ်ဖြင့် အမှုမတွေ့ပါ', km: 'រកមិនឃើញករណីជាមួយលេខកូដនេះទេ', lo: 'ບໍ່ພົບເຄສທີ່ມີລະຫັດນີ້',
  },
  'track.area': { th: 'พื้นที่', en: 'Area', my: 'ဒေသ', km: 'តំបន់', lo: 'ພື້ນທີ່' },
  'track.timeline': { th: 'เส้นเวลา', en: 'Timeline', my: 'ဖြစ်စဉ်မျဉ်း', km: 'លំដាប់ព្រឹត្តិការណ៍', lo: 'ໄທມ໌ລາຍ' },
  'notfound.title': { th: 'ไม่พบหน้าที่คุณต้องการ', en: 'Oops! Page not found', my: 'စာမျက်နှာ မတွေ့ပါ', km: 'រកមិនឃើញទំព័រ', lo: 'ບໍ່ພົບໜ້າທີ່ຕ້ອງການ' },
  'notfound.home': { th: 'กลับหน้าหลัก', en: 'Return to Home', my: 'ပင်မစာမျက်နှာသို့', km: 'ត្រឡប់ទៅទំព័រដើម', lo: 'ກັບໜ້າຫຼັກ' },
  'track.savedAt': { th: 'บันทึกเมื่อ', en: 'Submitted', my: 'တင်သွင်းချိန်', km: 'បានដាក់ស្នើ', lo: 'ບັນທຶກເມື່ອ' },
  'track.cancelled': {
    th: 'เคสถูกยกเลิก', en: 'This case was cancelled',
    my: 'ဤအမှုကို ပယ်ဖျက်ထားသည်', km: 'ករណីនេះត្រូវបានលុបចោល', lo: 'ເຄສນີ້ຖືກຍົກເລີກ',
  },
  'track.questions.title': {
    th: 'คำถามเพิ่มเติมจากเจ้าหน้าที่', en: 'Follow-up questions from staff',
    my: 'ဝန်ထမ်းမှ ထပ်မံမေးခွန်းများ', km: 'សំណួរបន្ថែមពីបុគ្គលិក', lo: 'ຄຳຖາມເພີ່ມເຕີມຈາກພະນັກງານ',
  },
  'track.answer.placeholder': {
    th: 'พิมพ์คำตอบของคุณ หรือกดอัดเสียงตอบ', en: 'Type your answer, or record your voice',
    my: 'အဖြေရိုက်ပါ သို့မဟုတ် အသံသွင်းပါ', km: 'វាយចម្លើយ ឬថតសំឡេង', lo: 'ພິມຄຳຕອບ ຫຼື ອັດສຽງຕອບ',
  },
  'track.answer.send': {
    th: 'ส่งคำตอบ', en: 'Send answer',
    my: 'အဖြေပို့မည်', km: 'ផ្ញើចម្លើយ', lo: 'ສົ່ງຄຳຕອບ',
  },
  'track.answered': {
    th: 'ตอบแล้ว', en: 'Answered',
    my: 'အဖြေပေးပြီး', km: 'បានឆ្លើយរួច', lo: 'ຕອບແລ້ວ',
  },
  'track.answer.thanks': {
    th: 'ได้รับคำตอบแล้ว ขอบคุณ', en: 'Answer received — thank you',
    my: 'အဖြေရရှိပါပြီ — ကျေးဇူးတင်ပါသည်', km: 'បានទទួលចម្លើយហើយ — អរគុណ', lo: 'ໄດ້ຮັບຄຳຕອບແລ້ວ — ຂອບໃຈ',
  },
  'track.answer.error': {
    th: 'ส่งคำตอบไม่สำเร็จ ลองอีกครั้ง', en: 'Could not send the answer, please try again',
    my: 'အဖြေပို့မရပါ ထပ်ကြိုးစားပါ', km: 'ផ្ញើចម្លើយមិនបាន សូមព្យាយាមម្តងទៀត', lo: 'ສົ່ງຄຳຕອບບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່',
  },

  // ---------- Status labels ----------
  'status.received': { th: 'รับเรื่อง', en: 'Received', my: 'လက်ခံရရှိ', km: 'បានទទួល', lo: 'ຮັບເລື່ອງແລ້ວ' },
  'status.inprogress': { th: 'ดำเนินงาน', en: 'In progress', my: 'ဆောင်ရွက်နေသည်', km: 'កំពុងដំណើរការ', lo: 'ກຳລັງດຳເນີນການ' },
  'status.completed': { th: 'สำเร็จ', en: 'Completed', my: 'ပြီးစီးပါပြီ', km: 'បានបញ្ចប់', lo: 'ສຳເລັດແລ້ວ' },
  'status.cancelled': { th: 'ยกเลิก', en: 'Cancelled', my: 'ပယ်ဖျက်ထားသည်', km: 'បានលុបចោល', lo: 'ຍົກເລີກແລ້ວ' },

  // ---------- Self report ----------
  'report.title': {
    th: 'รายงานปัญหาด้วยตนเอง', en: 'Report your problem',
    my: 'ကိုယ်တိုင် ပြဿနာအသိပေးပါ', km: 'រាយការណ៍បញ្ហារបស់អ្នក', lo: 'ລາຍງານບັນຫາຂອງທ່ານເອງ',
  },
  'report.subtitle': {
    th: 'ไม่ต้องสมัครสมาชิก — เล่าด้วยเสียงหรือพิมพ์ก็ได้ ทุกภาษา ข้อมูลของคุณเป็นความลับ',
    en: 'No sign-up needed — speak or type, in any language. Your information stays confidential.',
    my: 'အကောင့်မလိုပါ — မည်သည့်ဘာသာစကားဖြင့်မဆို ပြော သို့မဟုတ် ရိုက်နိုင်သည် သင့်အချက်အလက်များ လျှို့ဝှက်ထားပါမည်',
    km: 'មិនត្រូវការគណនី — និយាយ ឬវាយ ជាភាសាណាក៏បាន ព័ត៌មានរបស់អ្នកត្រូវបានរក្សាទុកជាការសម្ងាត់',
    lo: 'ບໍ່ຕ້ອງສະໝັກ — ເວົ້າ ຫຼື ພິມ ພາສາໃດກໍໄດ້ ຂໍ້ມູນຂອງທ່ານເປັນຄວາມລັບ',
  },
  'report.consent.title': {
    th: 'การยินยอมให้เก็บข้อมูล (PDPA)', en: 'Consent to store your data (PDPA)',
    my: 'အချက်အလက်သိမ်းဆည်းရန် သဘောတူညီချက် (PDPA)', km: 'ការយិនយល់រក្សាទុកទិន្នន័យ (PDPA)', lo: 'ການຍິນຍອມເກັບຂໍ້ມູນ (PDPA)',
  },
  'report.consent.body': {
    th: 'เราจะเก็บเสียงและข้อมูลที่คุณให้อย่างปลอดภัย ใช้เพื่อช่วยเหลือคุณเท่านั้น แยกเก็บข้อมูลระบุตัวตน และไม่เปิดเผยโดยไม่ได้รับอนุญาต — อ่านเพิ่มเติมในหน้านโยบายความเป็นส่วนตัว',
    en: 'We securely store the voice and information you provide, use it only to help you, keep identifying data separately, and never share it without permission — see the privacy policy for details.',
    my: 'သင်ပေးသော အသံအချက်အလက်များကို လုံခြုံစွာသိမ်းထားပြီး သင့်ကိုကူညီရန်သာ အသုံးပြုပါမည် ခွင့်ပြုချက်မရှိဘဲ မမျှဝေပါ',
    km: 'យើងរក្សាទុកសំឡេង និងព័ត៌មានរបស់អ្នកដោយសុវត្ថិភាព ប្រើតែដើម្បីជួយអ្នក និងមិនចែករំលែកដោយគ្មានការអនុញ្ញាតទេ',
    lo: 'ພວກເຮົາເກັບສຽງ ແລະ ຂໍ້ມູນຂອງທ່ານຢ່າງປອດໄພ ໃຊ້ເພື່ອຊ່ວຍເຫຼືອທ່ານເທົ່ານັ້ນ ແລະ ບໍ່ເປີດເຜີຍໂດຍບໍ່ໄດ້ຮັບອະນຸຍາດ',
  },
  'report.consent.agree': {
    th: 'ฉันยินยอมให้เก็บและใช้ข้อมูลเพื่อช่วยเหลือฉัน', en: 'I consent to my data being stored and used to help me',
    my: 'ကျွန်ုပ်ကိုကူညီရန် အချက်အလက်များကို သိမ်းဆည်းအသုံးပြုရန် သဘောတူပါသည်', km: 'ខ្ញុំយល់ព្រមឱ្យរក្សាទុក និងប្រើទិន្នន័យដើម្បីជួយខ្ញុំ', lo: 'ຂ້ອຍຍິນຍອມໃຫ້ເກັບ ແລະ ໃຊ້ຂໍ້ມູນເພື່ອຊ່ວຍເຫຼືອຂ້ອຍ',
  },
  'report.story.title': {
    th: 'เล่าเรื่องของคุณ', en: 'Tell us what happened',
    my: 'ဖြစ်ရပ်ကို ပြောပြပါ', km: 'ប្រាប់យើងអំពីរឿងដែលកើតឡើង', lo: 'ເລົ່າເລື່ອງຂອງທ່ານ',
  },
  'report.story.hint': {
    th: 'กดไมค์แล้วเล่าด้วยเสียง หรือพิมพ์ในช่องด้านล่าง — ภาษาไหนก็ได้ที่คุณถนัด',
    en: 'Tap the mic and speak, or type below — in whichever language you prefer.',
    my: 'မိုက်ကို နှိပ်ပြီး ပြောပါ သို့မဟုတ် အောက်တွင်ရိုက်ပါ — သင်အဆင်ပြေသော ဘာသာစကားဖြင့်',
    km: 'ចុចមីក្រូហ្វូនហើយនិយាយ ឬវាយខាងក្រោម — ជាភាសាដែលអ្នកពូកែ',
    lo: 'ກົດໄມແລ້ວເວົ້າ ຫຼື ພິມຂ້າງລຸ່ມ — ດ້ວຍພາສາທີ່ທ່ານຖະໜັດ',
  },
  'report.story.placeholder': {
    th: 'พิมพ์เรื่องของคุณที่นี่...', en: 'Type your story here...',
    my: 'သင့်ဖြစ်ရပ်ကို ဤနေရာတွင် ရိုက်ပါ...', km: 'វាយរឿងរបស់អ្នកនៅទីនេះ...', lo: 'ພິມເລື່ອງຂອງທ່ານທີ່ນີ້...',
  },
  'report.needStory': {
    th: 'กรุณาอัดเสียงหรือพิมพ์เรื่องของคุณอย่างน้อยหนึ่งอย่าง', en: 'Please record your voice or type your story',
    my: 'အသံသွင်းခြင်း သို့မဟုတ် ရိုက်ထည့်ခြင်း တစ်ခုခု လုပ်ပါ', km: 'សូមថតសំឡេង ឬវាយរឿងរបស់អ្នក', lo: 'ກະລຸນາອັດສຽງ ຫຼື ພິມເລື່ອງຂອງທ່ານ',
  },
  'report.area.title': {
    th: 'พื้นที่เกิดเรื่อง', en: 'Where did it happen?',
    my: 'ဘယ်နေရာတွင် ဖြစ်ခဲ့သလဲ?', km: 'កើតឡើងនៅទីណា?', lo: 'ເກີດຂຶ້ນທີ່ໃດ?',
  },
  'report.area.hint': {
    th: 'ช่วยให้เราแนะนำหน่วยงานช่วยเหลือใกล้คุณได้ถูกต้องขึ้น (ไม่บังคับ)',
    en: 'Helps us suggest support organizations near you (optional).',
    my: 'သင့်အနီးရှိ အကူအညီပေးအဖွဲ့အစည်းများကို အကြံပြုနိုင်ရန် ကူညီပေးသည် (မဖြည့်လည်းရ)',
    km: 'ជួយឱ្យយើងផ្តល់អនុសាសន៍អង្គភាពជំនួយនៅជិតអ្នក (មិនបង្ខំ)',
    lo: 'ຊ່ວຍໃຫ້ພວກເຮົາແນະນຳອົງກອນຊ່ວຍເຫຼືອໃກ້ທ່ານໄດ້ (ບໍ່ບັງຄັບ)',
  },
  'report.type.title': {
    th: 'เรื่องนี้เกี่ยวกับอะไร (เลือกได้หลายข้อ)', en: 'What is this about? (select any)',
    my: 'ဘာနှင့်ဆိုင်သနည်း? (အများကြီး ရွေးနိုင်သည်)', km: 'រឿងនេះទាក់ទងនឹងអ្វី? (ជ្រើសបានច្រើន)', lo: 'ເລື່ອງນີ້ກ່ຽວກັບຫຍັງ? (ເລືອກໄດ້ຫຼາຍຂໍ້)',
  },
  'report.type.body': {
    th: 'ร่างกายและชีวิต', en: 'Body & life',
    my: 'ခန္ဓာကိုယ်နှင့် အသက်', km: 'រាងកាយ និងជីវិត', lo: 'ຮ່າງກາຍ ແລະ ຊີວິດ',
  },
  'report.type.labor': {
    th: 'แรงงาน / ค่าจ้าง', en: 'Work & wages',
    my: 'အလုပ်နှင့် လစာ', km: 'ការងារ និងប្រាក់ខែ', lo: 'ແຮງງານ / ຄ່າຈ້າງ',
  },
  'report.type.health': {
    th: 'สุขภาพ', en: 'Health',
    my: 'ကျန်းမာရေး', km: 'សុខភាព', lo: 'ສຸຂະພາບ',
  },
  'report.type.property': {
    th: 'ทรัพย์สิน / เงิน', en: 'Property & money',
    my: 'ပိုင်ဆိုင်မှု / ငွေ', km: 'ទ្រព្យសម្បត្តិ / ប្រាក់', lo: 'ຊັບສິນ / ເງິນ',
  },
  'report.type.other': {
    th: 'ไม่แน่ใจ / อื่น ๆ', en: 'Not sure / other',
    my: 'မသိ / အခြား', km: 'មិនប្រាកដ / ផ្សេងទៀត', lo: 'ບໍ່ແນ່ໃຈ / ອື່ນໆ',
  },
  'report.contact.title': {
    th: 'ช่องทางติดต่อกลับ', en: 'How can we reach you?',
    my: 'သင့်ကို ဘယ်လို ဆက်သွယ်ရမလဲ?', km: 'យើងអាចទាក់ទងអ្នកតាមរបៀបណា?', lo: 'ພວກເຮົາຕິດຕໍ່ທ່ານໄດ້ແນວໃດ?',
  },
  'report.contact.hint': {
    th: 'ไม่บังคับ — ถ้าไม่กรอก คุณยังติดตามเคสและตอบคำถามเจ้าหน้าที่ได้ด้วยรหัสเคส',
    en: 'Optional — even without it, you can still track your case and answer staff questions with your case code.',
    my: 'မဖြည့်လည်းရ — မဖြည့်ဘူးဆိုရင်လည်း ကုတ်နံပါတ်ဖြင့် အမှုအခြေအနေကို စစ်ဆေးနိုင်ပါသည်',
    km: 'មិនបង្ខំ — ទោះមិនបញ្ចូល អ្នកនៅតែអាចតាមដានករណីដោយលេខកូដបាន',
    lo: 'ບໍ່ບັງຄັບ — ຖ້າບໍ່ໃສ່ ທ່ານຍັງຕິດຕາມເຄສດ້ວຍລະຫັດໄດ້',
  },
  'report.contact.name': { th: 'ชื่อหรือชื่อเล่น', en: 'Name or nickname', my: 'နာမည် သို့မဟုတ် အမည်ဝှက်', km: 'ឈ្មោះ ឬឈ្មោះហៅក្រៅ', lo: 'ຊື່ ຫຼື ຊື່ຫຼິ້ນ' },
  'report.contact.phone': { th: 'เบอร์โทร / LINE / WhatsApp', en: 'Phone / LINE / WhatsApp', my: 'ဖုန်း / LINE / WhatsApp', km: 'ទូរស័ព្ទ / LINE / WhatsApp', lo: 'ໂທລະສັບ / LINE / WhatsApp' },
  'report.submit': {
    th: 'ส่งเรื่อง', en: 'Submit report',
    my: 'တင်သွင်းမည်', km: 'ដាក់ស្នើ', lo: 'ສົ່ງເລື່ອງ',
  },
  'report.submitting': {
    th: 'กำลังส่ง...', en: 'Submitting...', my: 'တင်သွင်းနေသည်...', km: 'កំពុងដាក់ស្នើ...', lo: 'ກຳລັງສົ່ງ...',
  },
  'report.success.title': {
    th: 'ส่งเรื่องเรียบร้อยแล้ว', en: 'Report submitted',
    my: 'တင်သွင်းပြီးပါပြီ', km: 'បានដាក់ស្នើរួចរាល់', lo: 'ສົ່ງເລື່ອງສຳເລັດແລ້ວ',
  },
  'report.success.code': {
    th: 'รหัสติดตามเคสของคุณ', en: 'Your case tracking code',
    my: 'သင့် အမှုကုတ်နံပါတ်', km: 'លេខកូដតាមដានករណីរបស់អ្នក', lo: 'ລະຫັດຕິດຕາມເຄສຂອງທ່ານ',
  },
  'report.success.hint': {
    th: 'จดหรือถ่ายภาพรหัสนี้ไว้ — ใช้ตรวจสอบสถานะ และตอบคำถามเพิ่มเติมจากเจ้าหน้าที่ได้ทุกเมื่อ',
    en: 'Write down or photograph this code — use it anytime to check status and answer follow-up questions from staff.',
    my: 'ဤကုတ်ကို ချရေးထားပါ သို့မဟုတ် ဓာတ်ပုံရိုက်ထားပါ — အခြေအနေစစ်ရန်နှင့် ဝန်ထမ်းမေးခွန်းများကို အဖြေပေးရန် အသုံးပြုပါ',
    km: 'សរសេរ ឬថតរូបលេខកូដនេះទុក — ប្រើវាដើម្បីពិនិត្យស្ថានភាព និងឆ្លើយសំណួរបុគ្គលិក',
    lo: 'ຈົດ ຫຼື ຖ່າຍຮູບລະຫັດນີ້ໄວ້ — ໃຊ້ກວດສະຖານະ ແລະ ຕອບຄຳຖາມຂອງພະນັກງານໄດ້ທຸກເມື່ອ',
  },
  'report.success.track': {
    th: 'ติดตามสถานะเคส', en: 'Track my case',
    my: 'အမှုအခြေအနေ ကြည့်မည်', km: 'តាមដានករណីរបស់ខ្ញុំ', lo: 'ຕິດຕາມເຄສຂອງຂ້ອຍ',
  },
  'report.success.new': {
    th: 'รายงานเรื่องใหม่', en: 'Report another issue',
    my: 'ပြဿနာအသစ် အသိပေးမည်', km: 'រាយការណ៍បញ្ហាថ្មី', lo: 'ລາຍງານເລື່ອງໃໝ່',
  },
  'report.error': {
    th: 'ส่งไม่สำเร็จ — เก็บสำเนาไว้ในเครื่องแล้ว ลองส่งใหม่ได้ที่หน้ากู้เคส',
    en: 'Submission failed — a copy is saved on this device; you can resend it from the recover page.',
    my: 'တင်သွင်းမှု မအောင်မြင်ပါ — မိတ္တူကို ဤစက်တွင် သိမ်းထားပါပြီ နောက်မှ ပြန်ပို့နိုင်သည်',
    km: 'ដាក់ស្នើមិនបាន — ច្បាប់ចម្លងត្រូវបានរក្សាទុកក្នុងឧបករណ៍នេះ អ្នកអាចផ្ញើម្តងទៀតបាន',
    lo: 'ສົ່ງບໍ່ສຳເລັດ — ສຳເນົາຖືກເກັບໄວ້ໃນອຸປະກອນນີ້ ສາມາດສົ່ງໃໝ່ໄດ້ຈາກຫນ້າກູ້ເຄສ',
  },
  'report.photo.add': {
    th: 'แนบรูปภาพ (ไม่บังคับ สูงสุด 3 รูป)', en: 'Attach photos (optional, max 3)',
    my: 'ဓာတ်ပုံများ ပူးတွဲပါ (မဖြည့်လည်းရ ၃ ပုံအထိ)', km: 'ភ្ជាប់រូបភាព (មិនបង្ខំ អតិបរមា ៣)', lo: 'ແນບຮູບພາບ (ບໍ່ບັງຄັບ ສູງສຸດ 3 ຮູບ)',
  },

  // ---------- Area picker ----------
  'area.province': { th: 'จังหวัด', en: 'Province', my: 'ပြည်နယ်/တိုင်း', km: 'ខេត្ត', lo: 'ແຂວງ' },
  'area.district': { th: 'อำเภอ/เขต', en: 'District', my: 'ခရိုင်', km: 'ស្រុក/ខណ្ឌ', lo: 'ເມືອງ' },
  'area.subdistrict': { th: 'ตำบล/แขวง', en: 'Subdistrict', my: 'ရပ်ကွက်/ကျေးရွာ', km: 'ឃុំ/សង្កាត់', lo: 'ບ້ານ' },
  'area.notfound': { th: 'ไม่พบข้อมูล', en: 'No results found', my: 'ရလဒ် မတွေ့ပါ', km: 'រកមិនឃើញទេ', lo: 'ບໍ່ພົບຂໍ້ມູນ' },
  'area.match.exact': { th: 'ตรงทุกตัวอักษร', en: 'Exact match', my: 'အတိအကျ ကိုက်ညီ', km: 'ត្រូវគ្នាពេញលេញ', lo: 'ກົງກັນທັງໝົດ' },
  'area.match.prefix': { th: 'ขึ้นต้นด้วยคำค้น', en: 'Starts with search', my: 'ရှာဖွေချက်ဖြင့် စတင်', km: 'ចាប់ផ្តើមដោយពាក្យស្វែងរក', lo: 'ຂຶ້ນຕົ້ນດ້ວຍຄຳຄົ້ນຫາ' },
  'area.match.word': { th: 'มีคำที่ขึ้นต้นตรง', en: 'Matching word', my: 'ကိုက်ညီသော စကားလုံး', km: 'ពាក្យត្រូវគ្នា', lo: 'ຄຳກົງກັນ' },
  'area.match.partial': { th: 'มีส่วนที่ตรง', en: 'Partial match', my: 'တစ်စိတ်တစ်ဒေသ ကိုက်ညီ', km: 'ត្រូវគ្នាខ្លះ', lo: 'ກົງກັນບາງສ່ວນ' },
  'area.match.alias': { th: 'ชื่อที่นิยมเรียก', en: 'Common nickname', my: 'အများသုံး အမည်ဝှက်', km: 'ឈ្មោះហៅក្រៅ', lo: 'ຊື່ຫຼິ້ນທີ່ນິຍົມ' },
  'area.match.token': { th: 'ตรงทุกคำในชื่อ', en: 'All words match', my: 'စကားလုံးတိုင်း ကိုက်ညီ', km: 'ពាក្យទាំងអស់ត្រូវគ្នា', lo: 'ກົງທຸກຄຳໃນຊື່' },
  'area.loading': {
    th: 'กำลังโหลดรายชื่อจังหวัด/อำเภอ/ตำบล...', en: 'Loading province/district/subdistrict list...',
    my: 'ဒေသစာရင်း ရယူနေသည်...', km: 'កំពុងផ្ទុកបញ្ជីតំបន់...', lo: 'ກຳລັງໂຫຼດລາຍຊື່ພື້ນທີ່...',
  },
  'area.loadError': {
    th: 'โหลดข้อมูลพื้นที่ไม่สำเร็จ', en: 'Could not load area data',
    my: 'ဒေသဒေတာ ရယူမရပါ', km: 'មិនអាចផ្ទុកទិន្នន័យតំបន់បាន', lo: 'ໂຫຼດຂໍ້ມູນພື້ນທີ່ບໍ່ສຳເລັດ',
  },
  'area.pin': {
    th: 'ปักหมุดพื้นที่ (ไม่บังคับ)', en: 'Pin location (optional)',
    my: 'တည်နေရာ မှတ်သားပါ (မဖြည့်လည်းရ)', km: 'ជ្រើសទីតាំងលើផែនទី (មិនបង្ខំ)', lo: 'ປັກໝຸດສະຖານທີ່ (ບໍ່ບັງຄັບ)',
  },
  'area.hideMap': { th: 'ซ่อนแผนที่', en: 'Hide map', my: 'မြေပုံဖျောက်ပါ', km: 'លាក់ផែនទី', lo: 'ເຊື່ອງແຜນທີ່' },
  'area.myLocation': { th: 'ตำแหน่งปัจจุบัน', en: 'Current location', my: 'လက်ရှိတည်နေရာ', km: 'ទីតាំងបច្ចុប្បន្ន', lo: 'ຕຳແໜ່ງປັດຈຸບັນ' },
  'area.geoUnsupported': {
    th: 'อุปกรณ์ไม่รองรับการระบุตำแหน่ง', en: 'Geolocation is not supported on this device',
    my: 'ဤစက်တွင် တည်နေရာဖော်ပြခြင်း မရှိပါ', km: 'ឧបករណ៍នេះមិនគាំទ្រការកំណត់ទីតាំង', lo: 'ອຸປະກອນນີ້ບໍ່ຮອງຮັບການລະບຸຕຳແໜ່ງ',
  },
  'area.geoDenied': {
    th: 'ไม่สามารถเข้าถึงตำแหน่งได้', en: 'Could not access your location',
    my: 'တည်နေရာ အသုံးမပြုနိုင်ပါ', km: 'មិនអាចចូលប្រើទីតាំងបានទេ', lo: 'ເຂົ້າເຖິງຕຳແໜ່ງບໍ່ໄດ້',
  },
  'area.clearPin': { th: 'ล้างหมุด', en: 'Clear pin', my: 'အမှတ် ဖျက်ပါ', km: 'លុបម្ជុល', lo: 'ລຶບໝຸດ' },
  'area.coordsLabel': { th: 'พิกัด', en: 'Coordinates', my: 'ကိုဩဒိနိတ်', km: 'កូអរដោនេ', lo: 'ພິກັດ' },
  'area.coordsHint': {
    th: 'ลากหมุดเพื่อปรับ', en: 'drag the pin to adjust',
    my: 'ပင်ကို ဆွဲ၍ ချိန်ပါ', km: 'អូសម្ជុលដើម្បីកែ', lo: 'ລາກໝຸດເພື່ອປັບ',
  },
  'area.tapToPin': {
    th: 'แตะบนแผนที่เพื่อปักหมุด — ไม่บังคับ', en: 'Tap the map to drop a pin — optional',
    my: 'မြေပုံကို ထိ၍ အမှတ်သားပါ — မဖြည့်လည်းရ', km: 'ប៉ះលើផែនទីដើម្បីដាក់ម្ជុល — មិនបង្ខំ', lo: 'ແຕະແຜນທີ່ເພື່ອປັກໝຸດ — ບໍ່ບັງຄັບ',
  },
  'area.nearMe': {
    th: 'จังหวัดใกล้ฉัน', en: 'Nearest province',
    my: 'အနီးဆုံး ပြည်နယ်', km: 'ខេត្តជិតបំផុត', lo: 'ແຂວງໃກ້ສຸດ',
  },
  'area.nearMeFound': {
    th: 'พื้นที่ใกล้คุณ: {name} (~{km} กม.)', en: 'Closest to you: {name} (~{km} km)',
    my: 'သင့်အနီးဆုံး: {name} (~{km} ကီလိုမီတာ)', km: 'ជិតអ្នកបំផុត៖ {name} (~{km} គម.)', lo: 'ໃກ້ທ່ານທີ່ສຸດ: {name} (~{km} ກມ.)',
  },
  'area.toggleNames': {
    th: 'สลับชื่อ EN/ท้องถิ่น', en: 'Toggle EN/local names',
    my: 'အမည် EN/ဒေသ ပြောင်းမယ်', km: 'ប្ដូរឈ្មោះ EN/ក្នុងស្រុក', lo: 'ສັບປ່ຽນຊື່ EN/ທ້ອງຖິ່ນ',
  },
  'area.clearSearch': {
    th: 'ล้างคำค้นหา', en: 'Clear search',
    my: 'ရှာဖွေမှု ရှင်းရန်', km: 'សម្អាតការស្វែងរក', lo: 'ລ້າງການຄົ້ນຫາ',
  },
  'area.geoDeniedHelp': {
    th: 'ไม่สามารถใช้ตำแหน่งปัจจุบันได้ — คุณสามารถพิมพ์ชื่อจังหวัด อำเภอ หรือรหัสไปรษณีย์เพื่อค้นหาได้',
    en: 'Current location is unavailable — you can type a province, district, or postcode to search.',
    my: 'လက်ရှိတည်နေရာကို မသုံးနိုင်ပါ — ပြည်နယ်၊ ခရိုင် သို့မဟုတ် စာပို့ကုဒ်အမည်ဖြင့် ရှာဖွေနိုင်ပါသည်။',
    km: 'ទីតាំងបច្ចុប្បន្នមិនអាចប្រើបានទេ — អ្នកអាចវាយឈ្មោះខេត្ត ស្រុក ឬកូដប្រៃសណីយ៍ដើម្បីស្វែងរក។',
    lo: 'ຕຳແໜ່ງປັດຈຸບັນບໍ່ສາມາດໃຊ້ໄດ້ — ທ່ານສາມາດພິມຊື່ແຂວງ ເມືອງ ຫຼື ລະຫັດໄປສະນີເພື່ອຄົ້ນຫາໄດ້.',
  },
  'area.geoUnsupportedHelp': {
    th: 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง — กรุณาพิมพ์ค้นหาพื้นที่ด้วยตนเอง',
    en: 'This device does not support geolocation — please type the area to search manually.',
    my: 'ဤစက်သည် တည်နေရာဖော်ပြခြင်းကို မထောက်ခံပါ — ကျေးဇူးပြု၍ ဒေသကို ကိုယ်တိုင်ရိုက်ရှာပါ။',
    km: 'ឧបករណ៍នេះមិនគាំទ្រការកំណត់ទីតាំងទេ — សូមវាយបញ្ចូលតំបន់ដើម្បីស្វែងរកដោយដៃ។',
    lo: 'ອຸປະກອນນີ້ບໍ່ຮອງຮັບການລະບຸຕຳແໜ່ງ — ກະລຸນາພິມຄົ້ນຫາພື້ນທີ່ດ້ວຍຕົນເອງ.',
  },
  'area.trySearch': {
    th: 'กรอกพื้นที่เอง', en: 'Enter area manually',
    my: 'ဒေသကို ကိုယ်တိုင်ရိုက်ပါ', km: 'បញ្ចូលតំបន់ដោយដៃ', lo: 'ປ້ອນພື້ນທີ່ດ້ວຍຕົນເອງ',
  },



  // ---------- Self report chat ----------
  'report.chat.greet': {
    th: 'สวัสดีค่ะ เราเป็นผู้ช่วยรับเรื่องของมูลนิธิ SWING จะถามทีละคำถามเหมือนคุยในแชต ตอบด้วยเสียงหรือพิมพ์ก็ได้ ไม่ต้องสมัครสมาชิก และทุกอย่างเป็นความลับ',
    en: "Hello — I'm the SWING Foundation intake assistant. I'll ask one question at a time, just like a chat. Answer by voice or by typing. No sign-up, and everything is confidential.",
    my: 'မင်္ဂလာပါ — ကျွန်မက SWING ဖောင်ဒေးရှင်းမှ လက်ခံရေးအကူအဖြစ် ဖြစ်ပါတယ် ချက်ပ်လို တစ်မေးခွန်းချင်း မေးပါမယ် အသံဖြင့်သော်လည်းကောင်း ရိုက်ဖြင့်သော်လည်းကောင်း ဖြေနိုင်ပါတယ်',
    km: 'សួស្តី — ខ្ញុំជាជំនួយការទទួលរឿងរបស់មូលនិធិ SWING ខ្ញុំនឹងសួរម្តងមួយសំណួរដូចជាការជជែក អ្នកអាចឆ្លើយដោយសំឡេង ឬវាយបាន គ្មានការចុះឈ្មោះ និងសម្ងាត់ទាំងស្រុង',
    lo: 'ສະບາຍດີ — ຂ້ອຍເປັນຜູ້ຊ່ວຍຮັບເລື່ອງຂອງມູນນິທິ SWING ຈະຖາມທີລະຄຳຖາມເຫມືອນຄຸຍໃນແຊັດ ຕອບດ້ວຍສຽງ ຫຼື ພິມກໍ່ໄດ້ ບໍ່ຕ້ອງສະໝັກ ແລະ ເປັນຄວາມລັບ',
  },
  'report.chat.send': { th: 'ส่ง', en: 'Send', my: 'ပို့မည်', km: 'ផ្ញើ', lo: 'ສົ່ງ' },
  'report.chat.skip': { th: 'ข้าม', en: 'Skip', my: 'ကျော်မည်', km: 'រំលង', lo: 'ຂ້າມ' },
  'report.chat.confirm': { th: 'ยืนยัน', en: 'Confirm', my: 'အတည်ပြုမည်', km: 'បញ្ជាក់', lo: 'ຢືນຢັນ' },
  'report.chat.start': {
    th: 'ยินยอมและเริ่มเล่า', en: 'I agree — start',
    my: 'သဘောတူပြီး စတင်ပါမည်', km: 'យល់ព្រម — ចាប់ផ្តើម', lo: 'ຍິນຍອມ ແລະ ເລີ່ມເລົ່າ',
  },
  'report.chat.agreed': {
    th: 'ฉันยินยอม', en: 'I agree',
    my: 'သဘောတူသည်', km: 'ខ្ញុំយល់ព្រម', lo: 'ຂ້ອຍຍິນຍອມ',
  },
  'report.chat.skipped': {
    th: 'ข้ามขั้นตอนนี้', en: 'Skipped this step',
    my: 'ဤအဆင့်ကို ကျော်သည်', km: 'រំលងជំហាននេះ', lo: 'ຂ້າມຂັ້ນຕອນນີ້',
  },
  'report.chat.notSpecified': { th: 'ไม่ระบุ', en: 'Not provided', my: 'မဖော်ပြပါ', km: 'មិនបានផ្តល់', lo: 'ບໍ່ໄດ້ລະບຸ' },
  'report.chat.photos.ask': {
    th: 'มีรูปภาพประกอบไหม? แนบได้สูงสุด 3 รูป (ไม่บังคับ)', en: 'Any photos to attach? Up to 3 (optional).',
    my: 'ပူးတွဲပါရစေ ဓာတ်ပုံ ရှိပါသလား? (မဖြည့်လည်းရ ၃ ပုံအထိ)', km: 'មានរូបភាពភ្ជាប់ទេ? អតិបរមា ៣ (មិនបង្ខំ)', lo: 'ມີຮູບພາບແນບບໍ? ສູງສຸດ 3 ຮູບ (ບໍ່ບັງຄັບ)',
  },
  'report.chat.photos.unit': { th: 'รูป', en: 'photo(s)', my: 'ပုံ', km: 'រូប', lo: 'ຮູບ' },
  'report.chat.input.placeholder': {
    th: 'พิมพ์ข้อความ หรือกดไมค์พูด...', en: 'Type a message, or tap the mic to speak...',
    my: 'စာရိုက်ပါ သို့မဟုတ် မိုက်ကိုနှိပ်ပြီး ပြောပါ...', km: 'វាយសារ ឬចុចមីក្រូហ្វូនដើម្បីនិយាយ...', lo: 'ພິມຂໍ້ຄວາມ ຫຼື ກົດໄມເພື່ອເວົ້າ...',
  },

  // ---------- Self report: sequential probing questions ----------
  'report.probe.intro': {
    th: 'ขอถามรายละเอียดเพิ่มทีละข้อ สั้น ๆ 5 ข้อ เพื่อให้เจ้าหน้าที่ช่วยเหลือคุณได้ตรงจุด — ข้อไหนไม่อยากตอบ กด "ข้าม" ได้เลย',
    en: 'A few short follow-up questions, one at a time (5 total), so staff can help you precisely — tap "Skip" on any you don\'t want to answer.',
    my: 'ဝန်ထမ်းများ အတိအကျ ကူညီနိုင်ရန် မေးခွန်းတိုလေးများ တစ်ခုချင်းစီ (စုစုပေါင်း ၅ ခု) — မဖြေချင်ပါက "ကျော်မည်" နှိပ်ပါ',
    km: 'សំណួរបន្ថែមខ្លីៗ ម្តងមួយ (សរុប ៥) ដើម្បីឱ្យបុគ្គលិកជួយអ្នកបានត្រឹមត្រូវ — ចុច "រំលង" បើមិនចង់ឆ្លើយ',
    lo: 'ຂໍຖາມລາຍລະອຽດເພີ່ມທີລະຂໍ້ ສັ້ນໆ 5 ຂໍ້ ເພື່ອໃຫ້ເຈົ້າໜ້າທີ່ຊ່ວຍເຫຼືອທ່ານໄດ້ຕົງຈຸດ — ຂໍ້ໃດບໍ່ຢາກຕອບ ກົດ "ຂ້າມ" ໄດ້ເລີຍ',
  },
  'report.probe.count': {
    th: 'คำถามข้อ {i}/{n}', en: 'Question {i} of {n}',
    my: 'မေးခွန်း {i}/{n}', km: 'សំណួរទី {i}/{n}', lo: 'ຄຳຖາມຂໍ້ {i}/{n}',
  },
  'report.probe.when.q': {
    th: 'เหตุการณ์นี้เกิดขึ้นเมื่อไหร่ และเกิดขึ้นบ่อยแค่ไหน?',
    en: 'When did this happen, and how often does it happen?',
    my: 'ဖြစ်ရပ်သည် ဘယ်အချိန်က ဖြစ်ပွားခဲ့ပြီး မကြာခဏ ဖြစ်ပွားသလဲ?',
    km: 'ហេតុការណ៍នេះកើតឡើងនៅពេលណា និងញឹកញាប់ប៉ុណ្ណា?',
    lo: 'ເຫດການນີ້ເກີດຂຶ້ນເມື່ອໃດ ແລະ ເກີດບ່ອຍປານໃດ?',
  },
  'report.probe.where.q': {
    th: 'เหตุการณ์เกิดขึ้นที่ไหน? (เช่น ที่ทำงาน ที่พักอาศัย หรือทางออนไลน์)',
    en: 'Where did it happen? (e.g. workplace, accommodation, or online)',
    my: 'ဘယ်နေရာမှာ ဖြစ်ပွားခဲ့သလဲ? (ဥပမာ အလုပ်ခွင်၊ နေထိုင်ရာ သို့မဟုတ် အွန်လိုင်း)',
    km: 'វាកើតឡើងនៅឯណា? (ឧ. កន្លែងធ្វើការ កន្លែងស្នាក់នៅ ឬតាមអនឡាញ)',
    lo: 'ເກີດຂຶ້ນທີ່ໃດ? (ເຊັ່ນ ບ່ອນເຮັດວຽກ ທີ່ພັກອາໄສ ຫຼື ທາງອອນລາຍ)',
  },
  'report.probe.who.q': {
    th: 'มีใครเกี่ยวข้องกับเหตุการณ์นี้บ้าง? (ใช้คำเรียกทั่วไปได้ ไม่ต้องระบุชื่อจริง)',
    en: 'Who was involved? (General terms are fine — no real names needed)',
    my: 'ဘယ်သူများ ပါဝင်ခဲ့သလဲ? (အမည်စစ် မလိုပါ — အထွေထွေ ခေါ်ဝေါ်နိုင်သည်)',
    km: 'មានអ្នកណាពាក់ព័ន្ធខ្លះ? (ប្រើពាក្យទូទៅបាន មិនបាច់ឈ្មោះពិត)',
    lo: 'ມີໃຜກ່ຽວຂ້ອງກັບເຫດການນີ້ແດ່? (ໃຊ້ຄຳເອີ້ນທົ່ວໄປໄດ້ ບໍ່ຕ້ອງລະບຸຊື່ຈິງ)',
  },
  'report.probe.safety.q': {
    th: 'ตอนนี้คุณปลอดภัยดีหรือไม่?',
    en: 'Are you safe right now?',
    my: 'အခု သင် လုံခြုံစွာ ရှိပါသလား?',
    km: 'តើពេលនេះអ្នកមានសុវត្ថិភាពដែរឬទេ?',
    lo: 'ຕອນນີ້ທ່ານປອດໄພດີບໍ?',
  },
  'report.probe.safety.safe': {
    th: 'ปลอดภัยดี', en: 'I am safe',
    my: 'လုံခြုံပါသည်', km: 'ខ្ញុំមានសុវត្ថិភាព', lo: 'ປອດໄພດີ',
  },
  'report.probe.safety.unsure': {
    th: 'ไม่แน่ใจ', en: 'Not sure',
    my: 'မသေချာပါ', km: 'មិនប្រាកដ', lo: 'ບໍ່ແນ່ໃຈ',
  },
  'report.probe.safety.unsafe': {
    th: 'ยังไม่ปลอดภัย', en: 'Not safe',
    my: 'မလုံခြုံပါ', km: 'មិនសុវត្ថិភាព', lo: 'ຍັງບໍ່ປອດໄພ',
  },
  'report.probe.safety.alert': {
    th: '⚠️ หากคุณอยู่ในอันตรายตอนนี้ โทร 191 (เหตุด่วนเหตุร้าย) 1300 (ศูนย์ช่วยเหลือสตรีและครอบครัว) หรือ 1323 (สายด่วนสุขภาพจิต) ได้ทันที ตลอด 24 ชม. — ระบบจะแจ้งเคสนี้เป็นเรื่องเร่งด่วนให้เจ้าหน้าที่',
    en: '⚠️ If you are in danger now, call 191 (emergency), 1300 (women & family helpline) or 1323 (mental health hotline) immediately, 24/7 — this case will be flagged as urgent for staff.',
    my: '⚠️ အခု အန္တရာယ်ရှိနေပါက 191 (အရေးပေါ်)၊ 1300 (မိသားစု အကူအညီ) သို့မဟုတ် 1323 (စိတ်ကျန်းမာရေး) ကို ချက်ချင်း ခေါ်ပါ — ဤအမှုကို အရေးပေါ်အဖြစ် ဝန်ထမ်းများအား အသိပေးပါမည်',
    km: '⚠️ បើអ្នកកំពុងមានគ្រោះថ្នាក់ ហៅ 191 (បន្ទាន់) 1300 (ជួយស្រ្តីនិងគ្រួសារ) ឬ 1323 (សុខភាពផ្លូវចិត្ត) ភ្លាមៗ 24 ម៉ោង — ករណីនេះនឹងត្រូវកំណត់ជាបន្ទាន់ដល់បុគ្គលិក',
    lo: '⚠️ ຖ້າທ່ານກຳລັງຢູ່ໃນອັນຕະລາຍ ໂທ 191 (ເຫດສຸກເສີນ), 1300 (ສູນຊ່ວຍເຫຼືອແມ່ຍິງ ແລະ ຄອບຄົວ) ຫຼື 1323 (ສາຍດ່ວນສຸຂະພາບຈິດ) ໄດ້ທັນທີ ຕະຫຼອດ 24 ຊົ່ວໂມງ — ເຄສນີ້ຈະຖືກແຈ້ງເປັນເລື່ອງດ່ວນໃຫ້ເຈົ້າໜ້າທີ່',
  },
  'report.probe.needs.q': {
    th: 'ตอนนี้คุณอยากได้รับความช่วยเหลือแบบไหนมากที่สุด? (เช่น ที่พักปลอดภัย คำปรึกษาทางกฎหมาย ค่ารักษาพยาบาล หรือการแจ้งความ)',
    en: 'What help do you need most right now? (e.g. safe shelter, legal advice, medical costs, or filing a police report)',
    my: 'အခု ဘယ်အကူအညီ အလိုအပ်ဆုံး လဲ? (ဥပမာ ဘေးကင်းရာ၊ ဥပဒေ အကြံဉာဏ်၊ ဆေးကုသမှု သို့မဟုတ် တရားစွဲမှု)',
    km: 'តើពេលនេះអ្នកត្រូវការជំនួយបែបណាខ្លះ? (ឧ. ទីជំរកសុវត្ថិភាព ដំបូន្មានផ្លូវច្បាប់ ថ្លៃព្យាបាល ឬដាក់ពាក្យបណ្តឹង)',
    lo: 'ຕອນນີ້ທ່ານຕ້ອງການຄວາມຊ່ວຍເຫຼືອແບບໃດທີ່ສຸດ? (ເຊັ່ນ ທີ່ພັກປອດໄພ ຄຳປຶກສາກົດໝາຍ ຄ່າຮັກສາພະຍາບານ ຫຼື ການແຈ້ງຄວາມ)',
  },

  // ---------- Self report: referral destination ----------
  'report.partners.title': {
    th: 'จากพื้นที่และประเด็นของคุณ เคสนี้จะถูกเชื่อมต่อกับหน่วยงานเหล่านี้',
    en: 'Based on your area and issues, this case will be connected with these organizations',
    my: 'သင့်ဒေသနှင့် ပြဿနာအရ ဤအမှုကို အောက်ပါအဖွဲ့အစည်းများနှင့် ချိတ်ဆက်ပါမည်',
    km: 'ផ្អែកលើតំបន់ និងបញ្ហារបស់អ្នក ករណីនេះនឹងត្រូវភ្ជាប់ទៅអង្គភាពទាំងនេះ',
    lo: 'ຈາກພື້ນທີ່ ແລະ ປະເດັນຂອງທ່ານ ເຄສນີ້ຈະຖືກເຊື່ອມຕໍ່ກັບໜ່ວຍງານເຫຼົ່ານີ້',
  },
  'report.partners.none': {
    th: 'เคสของคุณจะถูกส่งให้ทีมศูนย์กลางของมูลนิธิฯ ประสานหน่วยงานที่เหมาะสมในพื้นที่ของคุณต่อไป',
    en: 'Your case will go to the foundation\'s central team, who will coordinate the right organization in your area.',
    my: 'သင့်အမှုကို ဖောင်ဒေးရှင်းဗဟိုအဖွဲ့ထံ ပို့ပြီး သင့်ဒေသ၌ သင့်တော်သော အဖွဲ့အစည်းနှင့် ညှိနှိုင်းပေးပါမည်',
    km: 'ករណីរបស់អ្នកនឹងត្រូវបញ្ជូនទៅក្រុមកណ្តាលនៃមូលនិធិ ដែលនឹងសម្របសម្រួលអង្គភាពសមរម្យក្នុងតំបន់របស់អ្នក',
    lo: 'ເຄສຂອງທ່ານຈະຖືກສົ່ງໃຫ້ທີມສູນກາງຂອງມູນນິທິ ປະສານໜ່ວຍງານທີ່ເໝາະສົມໃນພື້ນທີ່ຂອງທ່ານຕໍ່ໄປ',
  },
  'report.partners.ack': {
    th: 'รับทราบ ดำเนินการต่อ', en: 'Got it, continue',
    my: 'နားလည်ပါပြီ ဆက်လုပ်မည်', km: 'យល់ហើយ បន្ត', lo: 'ຮັບຊາບແລ້ວ ດຳເນີນການຕໍ່',
  },
  'report.partners.noteAuto': {
    th: 'จับคู่หน่วยงานอัตโนมัติจากพื้นที่และประเด็น (แบบรายงานด้วยตนเอง)',
    en: 'Auto-matched by area and issues (self-report)',
    my: 'ဒေသနှင့် ပြဿနာအလိုက် အလိုအလျောက် ရွေးချယ်ထားသည် (ကိုယ်တိုင်အစီရင်ခံမှု)',
    km: 'បានផ្គូផ្គងស្វ័យប្រវត្តិតាមតំបន់ និងបញ្ហា (របាយការណ៍ដោយខ្លួនឯង)',
    lo: 'ຈັບຄູ່ອັດຕະໂນມັດຈາກພື້ນທີ່ ແລະ ປະເດັນ (ລາຍງານເອງ)',
  },
  'report.partners.orgType.hospital': { th: 'โรงพยาบาล', en: 'Hospital', my: 'ဆေးရုံ', km: 'មន្ទីរពេទ្យ', lo: 'ໂຮງໝໍ' },
  'report.partners.orgType.legal': { th: 'หน่วยงานกฎหมาย', en: 'Legal aid', my: 'ဥပဒေ အကူအညီ', km: 'ជំនួយផ្លូវច្បាប់', lo: 'ຊ່ວຍເຫຼືອທາງກົດໝາຍ' },
  'report.partners.orgType.ngo': { th: 'องค์กรภาคี', en: 'NGO / partner', my: 'NGO / မိတ်ဖက်', km: 'អង្គការ/ដៃគូ', lo: 'NGO / ຄູ່ຮ່ວມ' },
  'report.partners.orgType.shelter': { th: 'ที่พักพิงฉุกเฉิน', en: 'Emergency shelter', my: 'အရေးပေါ် ခိုလှုံရာ', km: 'ទីជំរកបន្ទាន់', lo: 'ທີ່ພັກພິງສຸກເສີນ' },
  'report.partners.orgType.police': { th: 'ตำรวจ', en: 'Police', my: 'ရဲ', km: 'ប៉ូលិស', lo: 'ຕຳຫຼວດ' },
  'report.partners.orgType.hotline': { th: 'สายด่วน', en: 'Hotline', my: 'အရေးပေါ်လိုင်း', km: 'ខ្សែទូរស័ព្ទបន្ទាន់', lo: 'ສາຍດ່ວນ' },
  'report.partners.orgType.other': { th: 'อื่น ๆ', en: 'Other', my: 'အခြား', km: 'ផ្សេងៗ', lo: 'ອື່ນໆ' },

  // ---------- Self report: success recap ----------
  'report.success.summary': {
    th: 'สรุปเรื่องที่ส่ง', en: 'Summary of your report',
    my: 'ပို့လိုက်သော အချက်အလက် အနှစ်ချုပ်', km: 'សេចក្តីសង្ខេបរបាយការណ៍', lo: 'ສະຫຼຸບເລື່ອງທີ່ສົ່ງ',
  },
  'report.success.forward': {
    th: 'เคสของคุณจะถูกประสานต่อไปยัง', en: 'Your case will be coordinated with',
    my: 'သင့်အမှုကို ညှိနှိုင်းပေးမည့် အဖွဲ့များ', km: 'ករណីរបស់អ្នកនឹងត្រូវសម្របសម្រួលទៅ', lo: 'ເຄສຂອງທ່ານຈະຖືກປະສານຕໍ່ໄປຍັງ',
  },
  'report.success.forwardNone': {
    th: 'ทีมศูนย์กลางมูลนิธิสวิง (จะประสานหน่วยงานในพื้นที่ให้)',
    en: 'SWING central team (will coordinate a local organization)',
    my: 'SWING ဗဟိုအဖွဲ့ (ဒေသတွင်း အဖွဲ့အစည်းကို ညှိနှိုင်းပေးမည်)',
    km: 'ក្រុមកណ្តាល SWING (នឹងសម្របសម្រួលអង្គភាពក្នុងតំបន់)',
    lo: 'ທີມສູນກາງ SWING (ຈະປະສານໜ່ວຍງານໃນພື້ນທີ່ໃຫ້)',
  },
  'report.success.urgent': {
    th: '🚨 ทำเครื่องหมายเป็นเคสเร่งด่วนแล้ว เพราะคุณระบุว่ายังไม่ปลอดภัย',
    en: '🚨 Flagged as urgent because you said you are not safe.',
    my: '🚨 မလုံခြုံကြောင်း ဖော်ပြထားသောကြောင့် အရေးပေါ်အဖြစ် မှတ်သားပြီးပါပြီ',
    km: '🚨 បានកំណត់ជាបន្ទាន់ ព្រោះអ្នកបានបញ្ជាក់ថាមិនសុវត្ថិភាព',
    lo: '🚨 ໝາຍເປັນເຄສດ່ວນແລ້ວ ເພາະທ່ານລະບຸວ່າຍັງບໍ່ປອດໄພ',
  },
  'report.success.answered': {
    th: 'ตอบคำถามซักไซร้ {n}/5 ข้อ', en: 'Answered {n} of 5 follow-up questions',
    my: 'မေးခွန်း {n}/5 ခု ဖြေပြီးပါပြီ', km: 'បានឆ្លើយសំណួរ {n}/5', lo: 'ຕອບຄຳຖາມຊັກໄຊ້ {n}/5 ຂໍ້',
  },


  // ---------- Admin login ----------
  'login.title': { th: 'เข้าสู่ระบบเจ้าหน้าที่', en: 'Staff sign in', my: 'ဝန်ထမ်း ဝင်ရောက်ခြင်း', km: 'ចូលប្រព័ន្ធបុគ្គលិក', lo: 'ເຂົ້າລະບົບພະນັກງານ' },
  'login.email': { th: 'อีเมลหน่วยงาน', en: 'Work email', my: 'ရုံးအီးမေးလ်', km: 'អ៊ីមែលការងារ', lo: 'ອີເມວຫນ່ວຍງານ' },
  'login.password': { th: 'รหัสผ่าน', en: 'Password', my: 'စကားဝှက်', km: 'ពាក្យសម្ងាត់', lo: 'ລະຫັດຜ່ານ' },
  'login.submit': { th: 'เข้าสู่ระบบ', en: 'Sign in', my: 'ဝင်ရောက်မည်', km: 'ចូល', lo: 'ເຂົ້າສູ່ລະບົບ' },
  'login.forgot': {
    th: 'ลืมรหัสผ่าน? ส่งลิงก์ตั้งรหัสใหม่', en: 'Forgot password? Send a reset link',
    my: 'စကားဝှက်မေ့နေပါသလား? ပြန်သတ်မှတ်လင့်ခ် ပို့မည်', km: 'ភ្លេចពាក្យសម្ងាត់? ផ្ញើតំណកំណត់ឡើងវិញ', lo: 'ລືມລະຫັດຜ່ານ? ສົ່ງລິ້ງຕັ້ງໃໝ່',
  },
  'login.otp': { th: 'รหัสยืนยัน 6 หลัก (Authenticator)', en: '6-digit code (Authenticator)', my: 'ဂဏန်း ၆ လုံး ကုဒ် (Authenticator)', km: 'លេខកូដ ៦ ខ្ទង់ (Authenticator)', lo: 'ລະຫັດ 6 ຫຼັກ (Authenticator)' },
  'login.verify': { th: 'ยืนยันรหัส', en: 'Verify code', my: 'ကုဒ်အတည်ပြုမည်', km: 'ផ្ទៀងផ្ទាត់កូដ', lo: 'ຢືນຢັນລະຫັດ' },
  'login.notice': {
    th: 'ระบบนี้เก็บข้อมูลผู้เสียหายที่มีความอ่อนไหวสูง บัญชีเปิดใช้โดยผู้ดูแลระบบเท่านั้น และแนะนำให้เปิดการยืนยันตัวตนสองชั้น (TOTP) ทุกบัญชี',
    en: 'This system holds highly sensitive survivor data. Accounts are created by administrators only, and two-factor authentication (TOTP) is strongly recommended.',
    my: 'ဤစနစ်တွင် အလွန်အရေးကြီးသော ကိုယ်ရေးအချက်အလက်များ ရှိသည် အကောင့်များကို စီမံခန့်ခွဲသူများသာ ဖွင့်ပေးသည်',
    km: 'ប្រព័ន្ធនេះមានទិន្នន័យដែលមានភាពរសើបខ្ពស់ គណនីត្រូវបានបង្កើតដោយអ្នកគ្រប់គ្រងប៉ុណ្ណោះ',
    lo: 'ລະບົບນີ້ເກັບຂໍ້ມູນທີ່ອ່ອນໄຫວສູງ ບັນຊີສ້າງໂດຍຜູ້ດູແລລະບົບເທົ່ານັ້ນ',
  },
  'login.success': { th: 'เข้าสู่ระบบสำเร็จ', en: 'Signed in successfully', my: 'ဝင်ရောက်ပြီးပါပြီ', km: 'ចូលបានជោគជ័យ', lo: 'ເຂົ້າສູ່ລະບົບສຳເລັດ' },
  'login.fillBoth': { th: 'กรุณากรอกอีเมลและรหัสผ่าน', en: 'Please enter your email and password', my: 'အီးမေးလ်နှင့် စကားဝှက် ထည့်ပါ', km: 'សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់', lo: 'ກະລຸນາໃສ່ອີເມວ ແລະ ລະຫັດຜ່ານ' },
  'login.failed': { th: 'เข้าสู่ระบบไม่สำเร็จ', en: 'Sign in failed', my: 'ဝင်ရောက်မှု မအောင်မြင်ပါ', km: 'ចូលមិនបាន', lo: 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ' },
  'login.otpInvalid': { th: 'รหัสยืนยันไม่ถูกต้อง', en: 'Invalid verification code', my: 'ကုဒ် မမှန်ကန်ပါ', km: 'លេខកូដមិនត្រឹមត្រូវ', lo: 'ລະຫັດຢືນຢັນບໍ່ຖືກຕ້ອງ' },
  'login.otpPrompt': { th: 'กรอกรหัส 6 หลักจากแอป Authenticator', en: 'Enter the 6-digit code from your authenticator app', my: 'Authenticator app မှ ဂဏန်း ၆ လုံး ထည့်ပါ', km: 'បញ្ចូលលេខ ៦ ខ្ទង់ពីកម្មវិធី Authenticator', lo: 'ໃສ່ລະຫັດ 6 ຫຼັກຈາກແອັບ Authenticator' },
  'login.emailFirst': { th: 'กรอกอีเมลก่อน แล้วกดลืมรหัสผ่านอีกครั้ง', en: 'Enter your email first, then tap forgot password again', my: 'အီးမေးလ် အရင်ထည့်ပါ', km: 'បញ្ចូលអ៊ីមែលជាមុនសិន', lo: 'ໃສ່ອີເມວກ່ອນ' },
  'login.resetSent': { th: 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว', en: 'A password reset link has been sent to your email', my: 'ပြန်သတ်မှတ်လင့်ခ်ကို အီးမေးလ်သို့ ပို့ပြီးပါပြီ', km: 'បានផ្ញើតំណកំណត់ពាក្យសម្ងាត់ទៅអ៊ីមែលរបស់អ្នក', lo: 'ສົ່ງລິ້ງຕັ້ງລະຫັດໃໝ່ໄປທີ່ອີເມວແລ້ວ' },
};

interface Ctx {
  lang: Lang;
  dir: TextDir;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT | string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<Ctx>({ lang: 'th', dir: 'ltr', setLang: () => {}, t: (k) => String(k) });

/** Full dictionary: base (public pages) + per-area fragments. */
export const DICT: Dict = {
  ...BASE_DICT,
  ...INTAKE_DICT,
  ...DASH_DICT,
  ...ADMIN_DICT,
  ...MISC_DICT,
  ...TOOLS_DICT,
  ...PRIVACY_DICT,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return ALL.includes(saved as Lang) ? (saved as Lang) : 'th';
  });

  const dir = langDir(lang);

  // Apply language + text direction to <html> so the whole layout flips
  // automatically (flex rows, chat bubbles, progress bars follow dir=rtl).
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
  }, []);

  // Fallback chain: selected language → English → Thai → raw key.
  // Optional {var} interpolation: t('x', { n: 3 }) replaces "{n}".
  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const e = DICT[key];
    let s = e ? (e[lang] ?? e.en ?? e.th ?? key) : key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [lang]);

  return <I18nContext.Provider value={{ lang, dir, setLang, t }}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  return useContext(I18nContext);
}
