import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type Lang = 'th' | 'en' | 'my' | 'km' | 'lo';

const STORAGE_KEY = 'swing.lang';
const ALL: Lang[] = ['th', 'en', 'my', 'km', 'lo'];

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'th', label: 'ไทย', short: 'ไทย' },
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'my', label: 'မြန်မာ', short: 'MY' },
  { id: 'km', label: 'ខ្មែរ', short: 'KH' },
  { id: 'lo', label: 'ລາວ', short: 'LAO' },
];

/** BCP-47 locale for SpeechRecognition / SpeechSynthesis per UI language. */
export const SPEECH_LOCALE: Record<Lang, string> = {
  th: 'th-TH',
  en: 'en-US',
  my: 'my-MM',
  km: 'km-KH',
  lo: 'lo-LA',
};

type Entry = { th: string; en: string; my?: string; km?: string; lo?: string };
type Dict = Record<string, Entry>;

export const DICT: Dict = {
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

  // ---------- Landing ----------
  'landing.badge': { th: 'RIGHTS & VIOLATION TOOL', en: 'RIGHTS & VIOLATION TOOL' },
  'landing.title1': {
    th: 'พื้นที่ปลอดภัย', en: 'A safe space',
    my: 'လုံခြုံစိတ်ချရသော နေရာ', km: 'ទីតាំងដែលមានសុវត្ថិភាព', lo: 'ພື້ນທີ່ທີ່ປອດໄພ',
  },
  'landing.title2': {
    th: 'สำหรับเสียงที่ถูกละเมิด', en: 'for voices that were harmed',
    my: 'နှipsis်ငှ... အထိနာခဲ့ရသောံများအတွက်', km: 'សម្រាប់សំឡេងដែលត្រូវបានរំលោភ', lo: 'ສຳລັບສຽງທີ່ຖືກລະເມີດ',
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
    my: 'ကိုယ်ပိုင်လrayေးချိန်ဖြင့် ပြောပြနိုင်သည်', km: 'និយាយតាមល្បឿនរបស់អ្នក', lo: 'ເລົ່າຕາມຈັງຫວະຂອງທ່ານ',
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
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT | string) => string;
}

const I18nContext = createContext<Ctx>({ lang: 'th', setLang: () => {}, t: (k) => String(k) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return ALL.includes(saved as Lang) ? (saved as Lang) : 'th';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
  }, []);

  // Fallback chain: selected language → English → Thai → raw key
  const t = useCallback((key: string) => {
    const e = DICT[key];
    if (!e) return key;
    return e[lang] ?? e.en ?? e.th ?? key;
  }, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  return useContext(I18nContext);
}
