import type { Entry } from '../index';

/**
 * User-facing misc pages & shared components
 * (Track.tsx, Recover.tsx, ResetPassword.tsx, ErrorBoundary.tsx, ProtectedRoute.tsx,
 * QuickExit.tsx, SeverityBadge.tsx, RouteSeo.tsx, lib/localCases.ts, lib/resubmit.ts).
 * USER-FACING: all 5 languages (th/en/my/km/lo) required for every key.
 */
export const MISC_DICT: Record<string, Entry> = {
  'recover.refresh': { th: 'โหลดรายการใหม่', en: 'Refresh list', my: 'စာရင်းကို ပြန်လည်ဖွင့်ရန်', km: 'ផ្ទុកបញ្ជីឡើងវិញ', lo: 'ໂຫຼດລາຍການໃໝ່' },
  // ---------- Track polish ----------
  'track.codeLabel': { th: 'รหัสเคส', en: 'Case code', my: 'အမှုကုတ်', km: 'លេខកូដករណី', lo: 'ລະຫັດເຄສ' },
  'track.notfoundHint': { th: 'ไม่พบรหัสนี้ ลองเช็กตัวอักษรอีกครั้ง', en: 'Code not found. Please check the letters again.', my: 'ဤကုတ်ကို မတွေ့ပါ။ စာလုံးများကို ပြန်စစ်ပါ။', km: 'រកមិនឃើញលេខកូដនេះ។ សូមពិនិត្យអក្សរម្តងទៀត។', lo: 'ບໍ່ພົບລະຫັດນີ້. ລອງກວດຕົວອັກສອນອີກຄັ້ງ.' },
  'track.codeHint': { th: 'ตัวอย่าง SW-XXXXXXXX ใส่แค่ตัวเลขและตัวอักษรหลัง SW- ก็ได้', en: 'Example: SW-XXXXXXXX. You can type only the part after SW-.', my: 'ဥပမာ SW-XXXXXXXX။ SW- နောက်က အပိုင်းကိုသာ ရိုက်ထည့်လည်း ရပါသည်။', km: 'ឧទាហរណ៍ SW-XXXXXXXX។ អ្នកអាចវាយតែផ្នែកនៅក្រោយ SW- ក៏បាន។', lo: 'ຕົວຢ່າງ SW-XXXXXXXX. ໃສ່ແຕ່ຕົວເລກ ແລະ ຕົວອັກສອນຫຼັງ SW- ກໍໄດ້.' },
  'track.tooMany': { th: 'ค้นหาหลายครั้งเกินไป รอประมาณ 10 นาทีแล้วลองใหม่', en: 'Too many tries. Please wait about 10 minutes and try again.', my: 'ရှာဖွေမှု အကြိမ်များလွန်းနေပါသည်။ ၁၀ မိနစ်ခန့် စောင့်ပြီး ထပ်ကြိုးစားပါ။', km: 'ស្វែងរកច្រើនដងពេក។ សូមរង់ចាំប្រហែល 10 នាទី រួចព្យាយាមម្តងទៀត។', lo: 'ຄົ້ນຫາຫຼາຍເທື່ອເກີນໄປ. ລໍຖ້າປະມານ 10 ນາທີ ແລ້ວລອງໃໝ່.' },
  'track.lookupFailed': { th: 'เชื่อมต่อไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วกดค้นหาอีกครั้ง', en: 'Could not connect. Check your internet and try again.', my: 'ချိတ်ဆက်၍ မရပါ။ အင်တာနက်ကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။', km: 'មិនអាចភ្ជាប់បានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយព្យាយាមម្តងទៀត។', lo: 'ເຊື່ອມຕໍ່ບໍ່ໄດ້. ລອງກວດອິນເຕີເນັດ ແລ້ວກົດຄົ້ນຫາອີກຄັ້ງ.' },
  'track.recoverHint': { th: 'ส่งเรื่องไม่สำเร็จ หรือกรอกค้างไว้?', en: 'Report failed to send, or left unfinished?', my: 'တင်မရခဲ့ သို့မဟုတ် မပြီးသေးဘူးလား?', km: 'ផ្ញើមិនបាន ឬបំពេញមិនទាន់ចប់?', lo: 'ສົ່ງເລື່ອງບໍ່ສຳເລັດ ຫຼື ກອກຄ້າງໄວ້?' },
  'track.recoverLink': { th: 'ดูที่หน้ากู้คืน', en: 'See the recover page', my: 'ပြန်ယူရန် စာမျက်နှာကို ကြည့်ပါ', km: 'មើលទំព័រស្តារ', lo: 'ເບິ່ງທີ່ໜ້າກູ້ຄືນ' },
  'track.nextTitle': { th: 'ขั้นต่อไป', en: 'Next step', my: 'နောက်တစ်ဆင့်', km: 'ជំហានបន្ទាប់', lo: 'ຂັ້ນຕໍ່ໄປ' },
  'track.next.received': { th: 'เจ้าหน้าที่จะอ่านเรื่องของคุณและติดต่อกลับภายใน 24 ชั่วโมง', en: 'Staff will read your report and get back to you within 24 hours.', my: 'ဝန်ထမ်းများသည် သင့်အကြောင်းကိုဖတ်ပြီး ၂၄ နာရီအတွင်း ပြန်ဆက်သွယ်ပါမည်။', km: 'បុគ្គលិកនឹងអានរឿងរបស់អ្នក ហើយទាក់ទងមកវិញក្នុងរយៈពេល 24 ម៉ោង។', lo: 'ພະນັກງານຈະອ່ານເລື່ອງຂອງທ່ານ ແລະ ຕິດຕໍ່ກັບພາຍໃນ 24 ຊົ່ວໂມງ.' },
  'track.next.inprogress': { th: 'เจ้าหน้าที่กำลังดูแลเรื่องนี้ กลับมาดูที่นี่เป็นระยะ เผื่อมีคำถามถึงคุณ', en: 'Staff are working on it. Check back here in case they have questions for you.', my: 'ဝန်ထမ်းများ ဆောင်ရွက်နေပါသည်။ မေးခွန်းများရှိနိုင်သဖြင့် ဤနေရာကို ပြန်ကြည့်ပါ။', km: 'បុគ្គលិកកំពុងដោះស្រាយ។ សូមត្រឡប់មកមើលវិញ ក្រែងមានសំណួរសម្រាប់អ្នក។', lo: 'ພະນັກງານກຳລັງດູແລ. ກັບມາເບິ່ງທີ່ນີ້ເປັນໄລຍະ ເຜື່ອມີຄຳຖາມເຖິງທ່ານ.' },
  'track.next.completed': { th: 'เรื่องนี้ปิดแล้ว ถ้ามีเรื่องใหม่ แจ้งเข้ามาได้ทุกเมื่อ', en: 'This case is closed. You can report something new at any time.', my: 'ဤအမှုကို ပိတ်ပြီးပါပြီ။ အသစ်ရှိပါက အချိန်မရွေး တိုင်ကြားနိုင်ပါသည်။', km: 'ករណីនេះបានបិទហើយ។ អ្នកអាចរាយការណ៍រឿងថ្មីបានគ្រប់ពេល។', lo: 'ເລື່ອງນີ້ປິດແລ້ວ. ຖ້າມີເລື່ອງໃໝ່ ແຈ້ງເຂົ້າມາໄດ້ທຸກເວລາ.' },
  'track.next.cancelled': { th: 'เรื่องนี้ถูกยกเลิก ถ้ายังต้องการความช่วยเหลือ แจ้งเรื่องใหม่ได้เลย', en: 'This case was cancelled. If you still need help, you can send a new report.', my: 'ဤအမှုကို ပယ်ဖျက်ခဲ့သည်။ အကူအညီလိုသေးပါက အသစ်တင်နိုင်ပါသည်။', km: 'ករណីនេះត្រូវបានលុបចោល។ បើនៅត្រូវការជំនួយ អាចផ្ញើរបាយការណ៍ថ្មី។', lo: 'ເລື່ອງນີ້ຖືກຍົກເລີກ. ຖ້າຍັງຕ້ອງການຄວາມຊ່ວຍເຫຼືອ ແຈ້ງເລື່ອງໃໝ່ໄດ້ເລີຍ.' },
  // ---------- Self-report polish ----------
  'report.step': { th: 'ขั้นที่ {n} จาก {total}', en: 'Step {n} of {total}', my: 'အဆင့် {total} ခုအနက် {n}', km: 'ជំហាន {n} នៃ {total}', lo: 'ຂັ້ນທີ {n} ຈາກ {total}' },
  'report.consent.sumWhatL': { th: 'เก็บอะไร', en: 'What we keep', my: 'ဘာသိမ်းမလဲ', km: 'រក្សាទុកអ្វី', lo: 'ເກັບຫຍັງ' },
  'report.consent.sumWhat': { th: 'เสียงและเรื่องที่คุณเล่า', en: 'Your voice and your story', my: 'သင့်အသံနှင့် ပြောပြသောအကြောင်းအရာ', km: 'សំឡេង និងរឿងដែលអ្នកប្រាប់', lo: 'ສຽງ ແລະ ເລື່ອງທີ່ທ່ານເລົ່າ' },
  'report.consent.sumUseL': { th: 'ใช้ทำอะไร', en: 'What it is for', my: 'ဘာအတွက်သုံးမလဲ', km: 'ប្រើធ្វើអ្វី', lo: 'ໃຊ້ເຮັດຫຍັງ' },
  'report.consent.sumUse': { th: 'ใช้ช่วยเหลือคุณเท่านั้น', en: 'Only to help you', my: 'သင့်ကိုကူညီရန်သာ', km: 'សម្រាប់ជួយអ្នកតែប៉ុណ្ណោះ', lo: 'ໃຊ້ຊ່ວຍເຫຼືອທ່ານເທົ່ານັ້ນ' },
  'report.consent.sumWhoL': { th: 'ใครเห็นได้', en: 'Who can see it', my: 'ဘယ်သူမြင်နိုင်လဲ', km: 'អ្នកណាអាចមើលឃើញ', lo: 'ໃຜເຫັນໄດ້' },
  'report.consent.sumWho': { th: 'เจ้าหน้าที่ SWING ที่ดูแลเคส ไม่เปิดเผยถ้าคุณไม่อนุญาต', en: 'SWING staff handling your case. Never shared without your permission', my: 'အမှုကိုကိုင်တွယ်သော SWING ဝန်ထမ်းများ။ ခွင့်ပြုချက်မရှိဘဲ မမျှဝေပါ', km: 'បុគ្គលិក SWING ដែលមើលការខុសត្រូវករណី។ មិនចែករំលែកដោយគ្មានការអនុញ្ញាត', lo: 'ພະນັກງານ SWING ທີ່ດູແລເຄສ. ບໍ່ເປີດເຜີຍຖ້າທ່ານບໍ່ອະນຸຍາດ' },
  'report.consent.details': { th: 'อ่านรายละเอียด', en: 'Read details', my: 'အသေးစိတ်ဖတ်ရန်', km: 'អានព័ត៌មានលម្អិត', lo: 'ອ່ານລາຍລະອຽດ' },
  'report.listenMsg': { th: 'ฟังข้อความนี้', en: 'Listen to this message', my: 'ဤစာကို နားထောင်ရန်', km: 'ស្តាប់សារនេះ', lo: 'ຟັງຂໍ້ຄວາມນີ້' },
  'voice.recordingNow': { th: 'กำลังอัด', en: 'Recording', my: 'အသံသွင်းနေသည်', km: 'កំពុងថត', lo: 'ກຳລັງອັດ' },
  'report.success.copy': { th: 'คัดลอกรหัส', en: 'Copy code', my: 'ကုတ်ကူးယူရန်', km: 'ចម្លងលេខកូដ', lo: 'ສຳເນົາລະຫັດ' },
  'report.success.copied': { th: 'คัดลอกแล้ว', en: 'Copied', my: 'ကူးယူပြီးပါပြီ', km: 'បានចម្លង', lo: 'ສຳເນົາແລ້ວ' },
  'report.success.keep': { th: 'เก็บรหัสนี้ไว้ ใช้ติดตามเคส', en: 'Keep this code. Use it to track your case', my: 'ဤကုတ်ကို သိမ်းထားပါ။ အမှုခြေရာခံရန် အသုံးပြုပါ', km: 'រក្សាលេខកូដនេះទុក។ ប្រើវាដើម្បីតាមដានករណី', lo: 'ເກັບລະຫັດນີ້ໄວ້. ໃຊ້ຕິດຕາມເຄສ' },
  // ---------- Recover ----------
  'recover.pageTitle': {
    th: 'กู้เคสจากเครื่องนี้', en: 'Recover cases from this device',
    my: 'ဤစက်မှ အမှုများ ပြန်ယူပါ', km: 'ស្តារករណីពីឧបករណ៍នេះ', lo: 'ກູ້ເຄສຈາກອຸປະກອນນີ້',
  },
  'recover.heading': {
    th: 'เคสที่ค้างอยู่ในเครื่อง', en: 'Cases saved on this device',
    my: 'ဤစက်ထဲတွင် ကျန်ရှိနေသော အမှုများ', km: 'ករណីដែលនៅសល់ក្នុងឧបករណ៍នេះ', lo: 'ເຄສທີ່ຄ້າງຢູ່ໃນອຸປະກອນນີ້',
  },
  'recover.subtitle': {
    th: 'ระบบเก็บเคสที่กรอกค้างไว้และเคสที่ส่งไม่สำเร็จไว้ในเบราว์เซอร์นี้ ส่งเข้าระบบซ้ำได้ทุกเมื่อ',
    en: 'Unfinished drafts and cases that failed to submit are saved in this browser. You can resend them anytime.',
    my: 'မပြီးသေးသော မူကြမ်းနှင့် ပို့မရသော အမှုများကို ဤဘရောက်ဇာတွင် သိမ်းထားသည် အချိန်မရွေး ပြန်ပို့နိုင်သည်',
    km: 'សេចក្តីព្រាងមិនទាន់ចប់ និងករណីដែលផ្ញើមិនបានត្រូវបានរក្សាទុកនៅក្នុងកម្មវិធីរុករកនេះ អ្នកអាចផ្ញើម្តងទៀតបានគ្រប់ពេល',
    lo: 'ຮ່າງທີ່ຍັງບໍ່ສຳເລັດ ແລະ ເຄສທີ່ສົ່ງບໍ່ສຳເລັດຖືກເກັບໄວ້ໃນບຣາວເຊີນີ້ ສາມາດສົ່ງໃໝ່ໄດ້ທຸກເມື່ອ',
  },
  'recover.sendAll': {
    th: 'ส่งทั้งหมด', en: 'Send all',
    my: 'အားလုံးပို့မည်', km: 'ផ្ញើទាំងអស់', lo: 'ສົ່ງທັງໝົດ',
  },
  'recover.backupJson': {
    th: 'สำรอง JSON', en: 'Back up JSON',
    my: 'JSON ကူးထားရန်', km: 'បម្រុងទុក JSON', lo: 'ສຳຮອງ JSON',
  },
  'recover.emptyTitle': {
    th: 'ไม่พบเคสค้างในเบราว์เซอร์นี้', en: 'No saved cases found in this browser',
    my: 'ဤဘရောက်ဇာတွင် ကျန်ရှိသော အမှုမတွေ့ပါ', km: 'រកមិនឃើញករណីនៅក្នុងកម្មវិធីរុករកនេះទេ', lo: 'ບໍ່ພົບເຄສທີ່ຄ້າງໃນບຣາວເຊີນີ້',
  },
  'recover.emptyHint': {
    th: 'ลองเปิดหน้านี้จากเครื่อง/เบราว์เซอร์เดิมที่ใช้กรอกเคส (ต้องไม่เคยล้างข้อมูลเว็บไซต์)',
    en: 'Try opening this page on the same device/browser you used to fill in the case (make sure site data was not cleared).',
    my: 'အမှုဖြည့်ခဲ့သော စက်/ဘရောက်ဇာအတိုင်း ဤစာမျက်နှာကို ဖွင့်ကြည့်ပါ (ဝက်ဘ်ဆိုက်ဒေတာကို မဖျက်ဖူးရမည်)',
    km: 'សូមព្យាយាមបើកទំព័រនេះនៅលើឧបករណ៍/កម្មវិធីរុករកដដែលដែលអ្នកបានប្រើបំពេញករណី (ត្រូវប្រាកដថាមិនបានលុបទិន្នន័យគេហទំព័រ)',
    lo: 'ລອງເປີດໜ້ານີ້ຈາກອຸປະກອນ/ບຣາວເຊີເກົ່າທີ່ໃຊ້ຕື່ມເຄສ (ຕ້ອງບໍ່ເຄີຍລ້າງຂໍ້ມູນເວັບໄຊທ໌)',
  },
  'recover.failed': {
    th: 'ส่งไม่สำเร็จ', en: 'Failed to send',
    my: 'ပို့၍မရပါ', km: 'ផ្ញើមិនបាន', lo: 'ສົ່ງບໍ່ສຳເລັດ',
  },
  'recover.draft': {
    th: 'ฉบับร่าง', en: 'Draft',
    my: 'မူကြမ်း', km: 'សេចក្តីព្រាង', lo: 'ສະບັບຮ່າງ',
  },
  'recover.answeredCount': {
    th: 'ตอบแล้ว {n} คำถาม · แก้ไขล่าสุด {date}',
    en: '{n} questions answered · last edited {date}',
    my: 'မေးခွန်း {n} ခု ဖြေထားသည် · နောက်ဆုံးပြင်ဆင်ချိန် {date}',
    km: 'បានឆ្លើយសំណួរ {n} · កែសម្រួលចុងក្រោយ {date}',
    lo: 'ຕອບແລ້ວ {n} ຄຳຖາມ · ແກ້ໄຂລ່າສຸດ {date}',
  },
  'recover.errorPrefix': {
    th: 'ผิดพลาด: {msg}', en: 'Error: {msg}',
    my: 'အမှား: {msg}', km: 'កំហុស៖ {msg}', lo: 'ຜິດພາດ: {msg}',
  },
  'recover.sendToSystem': {
    th: 'ส่งเข้าระบบ', en: 'Send to system',
    my: 'စနစ်ထဲသို့ ပို့မည်', km: 'ផ្ញើទៅប្រព័ន្ធ', lo: 'ສົ່ງເຂົ້າລະບົບ',
  },
  'recover.importedToast': {
    th: 'พบข้อมูลค้างในเครื่องเพิ่ม {n} รายการ', en: 'Found {n} more saved item(s) on this device',
    my: 'ဤစက်တွင် နောက်ထပ် {n} ခု တွေ့ရှိသည်', km: 'រកឃើញធាតុបន្ថែម {n} នៅលើឧបករណ៍នេះ', lo: 'ພົບຂໍ້ມູນຄ້າງເພີ່ມ {n} ລາຍການ',
  },
  'recover.sentSuccess': {
    th: 'ส่งเคสสำเร็จ, รหัส {code}', en: 'Case sent successfully, code {code}',
    my: 'အမှုပို့ခြင်းအောင်မြင်ပါသည်, ကုတ် {code}', km: 'ផ្ញើករណីបានជោគជ័យ, កូដ {code}', lo: 'ສົ່ງເຄສສຳເລັດ, ລະຫັດ {code}',
  },
  'recover.sendOneFailed': {
    th: 'ส่งไม่สำเร็จ', en: 'Failed to send',
    my: 'ပို့၍မရပါ', km: 'ផ្ញើមិនបាន', lo: 'ສົ່ງບໍ່ສຳເລັດ',
  },
  'recover.sentSummary': {
    th: 'ส่งสำเร็จ {ok}/{total} เคส', en: 'Sent {ok}/{total} cases successfully',
    my: 'အမှု {ok}/{total} ပို့ပြီးပါပြီ', km: 'បានផ្ញើ {ok}/{total} ករណីដោយជោគជ័យ', lo: 'ສົ່ງສຳເລັດ {ok}/{total} ເຄສ',
  },
  'recover.deleted': {
    th: 'ลบข้อมูลในเครื่องแล้ว', en: 'Local data deleted',
    my: 'စက်ထဲမှ ဒေတာ ဖျက်ပြီးပါပြီ', km: 'បានលុបទិន្នន័យក្នុងឧបករណ៍', lo: 'ລຶບຂໍ້ມູນໃນອຸປະກອນແລ້ວ',
  },
  'recover.delete': {
    th: 'ลบเรื่องนี้ออกจากเครื่อง', en: 'Delete from this device',
    my: 'ဤစက်ထဲမှ ဖျက်ရန်', km: 'លុបចេញពីឧបករណ៍នេះ', lo: 'ລຶບອອກຈາກອຸປະກອນນີ້',
  },
  'recover.deleteConfirmTitle': {
    th: 'ลบเรื่องนี้ออกจากเครื่องไหม', en: 'Delete this from your device?',
    my: 'ဤအကြောင်းအရာကို သင့်စက်ထဲမှ ဖျက်မလား။', km: 'លុបរឿងនេះចេញពីឧបករណ៍របស់អ្នកឬ?', lo: 'ລຶບເລື່ອງນີ້ອອກຈາກອຸປະກອນບໍ?',
  },
  'recover.deleteConfirmBody': {
    th: 'ลบแล้วกู้คืนไม่ได้ ถ้ายังไม่ได้ส่ง เรื่องนี้จะหายไป', en: 'This cannot be undone. If it was not sent, it will be lost.',
    my: 'ဖျက်ပြီးပါက ပြန်ယူ၍ မရပါ။ မပို့ရသေးပါက ဤအကြောင်းအရာ ပျောက်သွားပါမည်။', km: 'លុបហើយមិនអាចស្តារវិញបានទេ។ បើមិនទាន់បានផ្ញើ រឿងនេះនឹងបាត់។', lo: 'ລຶບແລ້ວກູ້ຄືນບໍ່ໄດ້. ຖ້າຍັງບໍ່ໄດ້ສົ່ງ ເລື່ອງນີ້ຈະຫາຍໄປ.',
  },
  'recover.cancel': {
    th: 'ยกเลิก', en: 'Cancel',
    my: 'မဖျက်တော့ပါ', km: 'បោះបង់', lo: 'ຍົກເລີກ',
  },

  // ---------- Vault (localCases.ts describe()) ----------
  'vault.unnamed': {
    th: 'ไม่ระบุชื่อ', en: 'Unnamed',
    my: 'အမည်မဖော်ပြပါ', km: 'មិនបញ្ជាក់ឈ្មោះ', lo: 'ບໍ່ລະບຸຊື່',
  },
  'vault.unknownArea': {
    th: 'ไม่ระบุพื้นที่', en: 'Unspecified area',
    my: 'ဒေသ မဖော်ပြပါ', km: 'មិនបញ្ជាក់តំបន់', lo: 'ບໍ່ລະບຸພື້ນທີ່',
  },
  'vault.err.notFound': {
    th: 'ไม่พบข้อมูลเคสในเครื่อง', en: 'Case data not found on this device',
    my: 'ဤစက်တွင် အမှုအချက်အလက် မတွေ့ပါ', km: 'រកមិនឃើញទិន្នន័យករណីនៅលើឧបករណ៍នេះទេ', lo: 'ບໍ່ພົບຂໍ້ມູນເຄສໃນອຸປະກອນນີ້',
  },
  'vault.err.saveFailed': {
    th: 'บันทึกเคสไม่สำเร็จ', en: 'Failed to save the case',
    my: 'အမှုကို သိမ်း၍မရပါ', km: 'រក្សាទុកករណីមិនបានទេ', lo: 'ບັນທຶກເຄສບໍ່ສຳເລັດ',
  },

  // ---------- Reset password ----------
  'reset.title': {
    th: 'ตั้งรหัสผ่านใหม่', en: 'Set a new password',
    my: 'စကားဝှက်အသစ် သတ်မှတ်ပါ', km: 'កំណត់ពាក្យសម្ងាត់ថ្មី', lo: 'ຕັ້ງລະຫັດຜ່ານໃໝ່',
  },
  'reset.subtitle': {
    th: 'สำหรับบัญชีเจ้าหน้าที่', en: 'For staff accounts',
    my: 'ဝန်ထမ်းအကောင့်အတွက်', km: 'សម្រាប់គណនីបុគ្គលិក', lo: 'ສຳລັບບັນຊີພະນັກງານ',
  },
  'reset.needLink': {
    th: 'กรุณาเปิดหน้านี้จากลิงก์ในอีเมลรีเซ็ตรหัสผ่าน',
    en: 'Please open this page from the link in your password reset email.',
    my: 'စကားဝှက်ပြန်လည်သတ်မှတ်ရန် အီးမေးလ်ရှိလင့်ခ်မှတဆင့် ဤစာမျက်နှာကို ဖွင့်ပါ',
    km: 'សូមបើកទំព័រនេះពីតំណនៅក្នុងអ៊ីមែលកំណត់ពាក្យសម្ងាត់ឡើងវិញរបស់អ្នក',
    lo: 'ກະລຸນາເປີດໜ້ານີ້ຈາກລິ້ງໃນອີເມວຣີເຊັດລະຫັດຜ່ານ',
  },
  'reset.newPassword': {
    th: 'รหัสผ่านใหม่ (อย่างน้อย 12 ตัว)', en: 'New password (at least 12 characters)',
    my: 'စကားဝှက်အသစ် (အနည်းဆုံး ၁၂ လုံး)', km: 'ពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ១២ តួអក្សរ)', lo: 'ລະຫັດຜ່ານໃໝ່ (ຢ່າງໜ້ອຍ 12 ຕົວ)',
  },
  'reset.confirmPassword': {
    th: 'ยืนยันรหัสผ่านใหม่', en: 'Confirm new password',
    my: 'စကားဝှက်အသစ် အတည်ပြုပါ', km: 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី', lo: 'ຢືນຢັນລະຫັດຜ່ານໃໝ່',
  },
  'reset.save': {
    th: 'บันทึกรหัสผ่านใหม่', en: 'Save new password',
    my: 'စကားဝှက်အသစ် သိမ်းမည်', km: 'រក្សាទុកពាក្យសម្ងាត់ថ្មី', lo: 'ບັນທຶກລະຫັດຜ່ານໃໝ່',
  },
  'reset.err.tooShort': {
    th: 'รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร', en: 'Password must be at least 12 characters long',
    my: 'စကားဝှက်သည် အနည်းဆုံး ၁၂ လုံးရှိရမည်', km: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ១២ តួអក្សរ', lo: 'ລະຫັດຜ່ານຕ້ອງຍາວຢ່າງໜ້ອຍ 12 ຕົວອັກສອນ',
  },
  'reset.err.mismatch': {
    th: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน', en: 'The two passwords do not match',
    my: 'စကားဝှက်နှစ်ခု မတူညီပါ', km: 'ពាក្យសម្ងាត់ទាំងពីរមិនត្រូវគ្នាទេ', lo: 'ລະຫັດຜ່ານທັງສອງບໍ່ກົງກັນ',
  },
  'reset.success': {
    th: 'ตั้งรหัสผ่านใหม่เรียบร้อย', en: 'New password set successfully',
    my: 'စကားဝှက်အသစ် အောင်မြင်စွာ သတ်မှတ်ပြီးပါပြီ', km: 'បានកំណត់ពាក្យសម្ងាត់ថ្មីដោយជោគជ័យ', lo: 'ຕັ້ງລະຫັດຜ່ານໃໝ່ສຳເລັດແລ້ວ',
  },

  // ---------- ErrorBoundary ----------
  'guard.errorTitle': {
    th: 'ระบบขัดข้องชั่วคราว', en: 'Temporary system error',
    my: 'စနစ် ယာယီချို့ယွင်းနေပါသည်', km: 'ប្រព័ន្ធមានបញ្ហាបណ្តោះអាសន្ន', lo: 'ລະບົບຂັດຂ້ອງຊົ່ວຄາວ',
  },
  'guard.errorBody': {
    th: 'ข้อมูลที่กรอกไว้ยังถูกเก็บเป็นฉบับร่างในเครื่อง กรุณาลองเปิดใหม่อีกครั้ง',
    en: 'What you entered is still saved as a draft on this device. Please try reloading.',
    my: 'သင်ဖြည့်ထားသော အချက်အလက်များကို ဤစက်တွင် မူကြမ်းအဖြစ် သိမ်းထားပါသည် ကျေးဇူးပြု၍ ပြန်ဖွင့်ကြည့်ပါ',
    km: 'ព័ត៌មានដែលអ្នកបានបញ្ចូលនៅតែត្រូវបានរក្សាទុកជាសេចក្តីព្រាងនៅលើឧបករណ៍នេះ សូមព្យាយាមផ្ទុកឡើងវិញ',
    lo: 'ຂໍ້ມູນທີ່ຕື່ມໄວ້ຍັງຖືກເກັບເປັນສະບັບຮ່າງໃນອຸປະກອນນີ້ ກະລຸນາລອງເປີດໃໝ່ອີກຄັ້ງ',
  },
  'guard.reload': {
    th: 'เปิดใหม่', en: 'Reload',
    my: 'ပြန်ဖွင့်မည်', km: 'ផ្ទុកឡើងវិញ', lo: 'ເປີດໃໝ່',
  },

  // ---------- ProtectedRoute ----------
  'guard.accessDenied': {
    th: 'ไม่มีสิทธิ์เข้าถึง', en: 'Access denied',
    my: 'ဝင်ရောက်ခွင့် မရှိပါ', km: 'គ្មានសិទ្ធិចូលប្រើទេ', lo: 'ບໍ່ມີສິດເຂົ້າເຖິງ',
  },
  'guard.suspended': {
    th: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
    en: 'Your account has been suspended. Please contact the administrator.',
    my: 'သင့်အကောင့်ကို ယာယီရပ်ဆိုင်းထားပါသည် စီမံခန့်ခွဲသူကို ဆက်သွယ်ပါ',
    km: 'គណនីរបស់អ្នកត្រូវបានផ្អាក សូមទាក់ទងអ្នកគ្រប់គ្រង',
    lo: 'ບັນຊີຂອງທ່ານຖືກລະງັບການໃຊ້ງານ ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ',
  },
  'guard.noRole': {
    th: 'บัญชีนี้ยังไม่ได้รับสิทธิ์เจ้าหน้าที่ กรุณาติดต่อผู้ดูแลระบบ',
    en: 'This account does not yet have staff access. Please contact the administrator.',
    my: 'ဤအကောင့်တွင် ဝန်ထမ်းအခွင့်အရေး မရှိသေးပါ စီမံခန့်ခွဲသူကို ဆက်သွယ်ပါ',
    km: 'គណនីនេះមិនទាន់មានសិទ្ធិជាបុគ្គលិកនៅឡើយទេ សូមទាក់ទងអ្នកគ្រប់គ្រង',
    lo: 'ບັນຊີນີ້ຍັງບໍ່ໄດ້ຮັບສິດເປັນພະນັກງານ ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ',
  },
  'guard.roleDenied': {
    th: 'บทบาทของคุณ ({roles}) ไม่สามารถเข้าหน้านี้ได้',
    en: 'Your role(s) ({roles}) cannot access this page.',
    my: 'သင့်အခန်းကဏ္ဍ ({roles}) ဤစာမျက်နှာကို ဝင်ရောက်၍မရပါ',
    km: 'តួនាទីរបស់អ្នក ({roles}) មិនអាចចូលទំព័រនេះបានទេ',
    lo: 'ບົດບາດຂອງທ່ານ ({roles}) ບໍ່ສາມາດເຂົ້າໜ້ານີ້ໄດ້',
  },
  'guard.signOut': {
    th: 'ออกจากระบบ', en: 'Sign out',
    my: 'ထွက်မည်', km: 'ចាកចេញ', lo: 'ອອກຈາກລະບົບ',
  },

  // ---------- QuickExit ----------
  'guard.quickExitAria': {
    th: 'ออกจากหน้านี้ทันที และล้างข้อมูลที่กรอกไว้ในเครื่อง',
    en: 'Leave this page immediately and clear data saved on this device',
    my: 'ဤစာမျက်နှာကို ချက်ချင်းထွက်ပြီး ဤစက်ရှိ ဒေတာများကို ရှင်းလင်းပါ',
    km: 'ចាកចេញពីទំព័រនេះភ្លាមៗ និងលុបទិន្នន័យដែលបានរក្សាទុកនៅលើឧបករណ៍នេះ',
    lo: 'ອອກຈາກໜ້ານີ້ທັນທີ ແລະ ລ້າງຂໍ້ມູນທີ່ເກັບໄວ້ໃນອຸປະກອນນີ້',
  },
  'guard.quickExit': {
    th: 'ออกด่วน', en: 'Exit quickly',
    my: 'အမြန်ထွက်ရန်', km: 'ចេញរហ័ស', lo: 'ອອກດ່ວນ',
  },
  'guard.quickExitHint': {
    th: 'กด Esc สองครั้งเพื่อออกทันที', en: 'Press Esc twice to leave now',
    my: 'ချက်ချင်းထွက်ရန် Esc ကို နှစ်ကြိမ်နှိပ်ပါ', km: 'ចុច Esc ពីរដង ដើម្បីចេញភ្លាមៗ', lo: 'ກົດ Esc ສອງເທື່ອເພື່ອອອກທັນທີ',
  },

  // ---------- SeverityBadge ----------
  'severity.green': {
    th: 'ต่ำ', en: 'Low',
    my: 'နိမ့်', km: 'ទាប', lo: 'ຕ່ຳ',
  },
  'severity.yellow': {
    th: 'ปานกลาง', en: 'Medium',
    my: 'အလယ်အလတ်', km: 'មធ្យម', lo: 'ປານກາງ',
  },
  'severity.red': {
    th: 'สูง', en: 'High',
    my: 'မြင့်', km: 'ខ្ពស់', lo: 'ສູງ',
  },

  // ---------- Page titles and meta descriptions (RouteSeo.tsx) ----------
  // Titles use " | " as the separator. Public wording: "arrested" / "detained" (ถูกจับ / ถูกควบคุมตัว).
  'seo.home.title': {
    th: 'SWING RIGHTS | แจ้งเหตุและติดตามความช่วยเหลือ', en: 'SWING RIGHTS | Report and track support',
    my: 'SWING RIGHTS | တိုင်ကြားပြီး အကူအညီကို ခြေရာခံပါ', km: 'SWING RIGHTS | រាយការណ៍ និងតាមដានជំនួយ', lo: 'SWING RIGHTS | ແຈ້ງເຫດ ແລະ ຕິດຕາມຄວາມຊ່ວຍເຫຼືອ',
  },
  'seo.home.desc': {
    th: 'พื้นที่ปลอดภัยสำหรับพนักงานบริการ แจ้งเหตุ รู้สิทธิ และติดตามความช่วยเหลือจากมูลนิธิเพื่อนพนักงานบริการ (SWING)',
    en: 'A safe space to report rights violations, know your rights and track support from SWING Foundation.',
    my: 'အခွင့်အရေးချိုးဖောက်မှုကို တိုင်ကြားရန်၊ သင့်အခွင့်အရေးများကို သိရှိရန်နှင့် SWING ဖောင်ဒေးရှင်း၏ အကူအညီကို ခြေရာခံရန် လုံခြုံသောနေရာ။',
    km: 'កន្លែងសុវត្ថិភាពសម្រាប់រាយការណ៍ការរំលោភសិទ្ធិ ស្គាល់សិទ្ធិរបស់អ្នក និងតាមដានជំនួយពីមូលនិធិ SWING។',
    lo: 'ພື້ນທີ່ປອດໄພສຳລັບແຈ້ງການລະເມີດສິດ, ຮູ້ສິດຂອງທ່ານ ແລະ ຕິດຕາມຄວາມຊ່ວຍເຫຼືອຈາກມູນນິທິ SWING.',
  },
  'seo.report.title': {
    th: 'แจ้งเรื่องด้วยตนเอง | SWING RIGHTS', en: 'Report a rights violation | SWING RIGHTS',
    my: 'အခွင့်အရေးချိုးဖောက်မှုကို တိုင်ကြားရန် | SWING RIGHTS', km: 'រាយការណ៍ការរំលោភសិទ្ធិ | SWING RIGHTS', lo: 'ລາຍງານການລະເມີດສິດ | SWING RIGHTS',
  },
  'seo.report.desc': {
    th: 'แจ้งเหตุละเมิดสิทธิได้ด้วยตนเอง พิมพ์หรือพูดได้หลายภาษา ไม่ต้องลงทะเบียน ข้อมูลเก็บเป็นความลับตาม PDPA',
    en: 'Report a rights violation confidentially by typing or speaking. No account is required, and support is available from SWING Foundation.',
    my: 'မြန်မာဘာသာဖြင့် စာရိုက်၍ဖြစ်စေ အသံဖြင့်ဖြစ်စေ လျှို့ဝှက်စွာ တိုင်ကြားနိုင်ပါသည်။ အကောင့်ဖွင့်ရန် မလိုအပ်ပါ။',
    km: 'រាយការណ៍ការរំលោភសិទ្ធិជាភាសាខ្មែរ ដោយវាយអត្ថបទ ឬនិយាយដោយសម្ងាត់។ មិនចាំបាច់ចុះឈ្មោះទេ។',
    lo: 'ລາຍງານການລະເມີດສິດເປັນພາສາລາວ ດ້ວຍການພິມ ຫຼື ເວົ້າຢ່າງເປັນຄວາມລັບ ໂດຍບໍ່ຕ້ອງລົງທະບຽນ.',
  },
  'seo.track.title': {
    th: 'ติดตามสถานะเรื่อง | SWING RIGHTS', en: 'Track your case | SWING RIGHTS',
    my: 'အမှုအခြေအနေ စစ်ဆေးရန် | SWING RIGHTS', km: 'តាមដានករណីរបស់អ្នក | SWING RIGHTS', lo: 'ຕິດຕາມສະຖານະເລື່ອງ | SWING RIGHTS',
  },
  'seo.track.desc': {
    th: 'ใช้รหัสเคสเพื่อติดตามสถานะเรื่องที่แจ้งไว้กับ SWING และตอบคำถามจากเจ้าหน้าที่ได้อย่างปลอดภัย',
    en: 'Use your case code to check the status of your report to SWING and answer questions from staff safely.',
    my: 'သင့်အမှုကုတ်ဖြင့် SWING သို့ တိုင်ကြားထားသော အကြောင်းအရာ၏ အခြေအနေကို စစ်ဆေးပြီး ဝန်ထမ်းများ၏ မေးခွန်းများကို လုံခြုံစွာ ဖြေဆိုနိုင်ပါသည်။',
    km: 'ប្រើលេខកូដករណីរបស់អ្នក ដើម្បីតាមដានស្ថានភាពរឿងដែលបានរាយការណ៍ទៅ SWING និងឆ្លើយសំណួររបស់បុគ្គលិកដោយសុវត្ថិភាព។',
    lo: 'ໃຊ້ລະຫັດເຄສເພື່ອຕິດຕາມສະຖານະເລື່ອງທີ່ແຈ້ງໄວ້ກັບ SWING ແລະ ຕອບຄຳຖາມຈາກພະນັກງານໄດ້ຢ່າງປອດໄພ.',
  },
  'seo.rights.title': {
    th: 'รู้สิทธิของคุณ | SWING RIGHTS', en: 'Know your rights | SWING RIGHTS',
    my: 'သင့်အခွင့်အရေးများကို သိထားပါ | SWING RIGHTS', km: 'ស្គាល់សិទ្ធិរបស់អ្នក | SWING RIGHTS', lo: 'ຮູ້ສິດຂອງທ່ານ | SWING RIGHTS',
  },
  'seo.rights.desc': {
    th: 'สิทธิพื้นฐานของคุณถ้าถูกจับหรือถูกควบคุมตัว อ่านเก็บไว้ก่อน และโทรหา SWING ได้จากหน้านี้',
    en: 'Your basic rights if you are arrested or detained. Read them now, and call SWING from this page.',
    my: 'ဖမ်းဆီးခံရလျှင် သို့မဟုတ် ထိန်းသိမ်းခံရလျှင် သင့်အခြေခံအခွင့်အရေးများ။ ကြိုတင်ဖတ်ထားပြီး ဤစာမျက်နှာမှ SWING ကို ဖုန်းဆက်နိုင်ပါသည်။',
    km: 'សិទ្ធិមូលដ្ឋានរបស់អ្នក ប្រសិនបើអ្នកត្រូវបានចាប់ខ្លួន ឬឃុំខ្លួន។ អានទុកជាមុន ហើយទូរស័ព្ទទៅ SWING ពីទំព័រនេះ។',
    lo: 'ສິດພື້ນຖານຂອງທ່ານ ຖ້າຖືກຈັບ ຫຼື ຖືກຄວບຄຸມຕົວ. ອ່ານໄວ້ກ່ອນ ແລະ ໂທຫາ SWING ໄດ້ຈາກໜ້ານີ້.',
  },
  'seo.privacy.title': {
    th: 'นโยบายความเป็นส่วนตัว | SWING RIGHTS', en: 'Privacy policy | SWING RIGHTS',
    my: 'ကိုယ်ရေးအချက်အလက် မူဝါဒ | SWING RIGHTS', km: 'គោលការណ៍ឯកជនភាព | SWING RIGHTS', lo: 'ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ | SWING RIGHTS',
  },
  'seo.privacy.desc': {
    th: 'วิธีที่มูลนิธิเพื่อนพนักงานบริการเก็บ ใช้ และคุ้มครองข้อมูลส่วนบุคคลของคุณตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล',
    en: "How SWING Foundation collects, uses and protects your personal data under Thailand's Personal Data Protection Act (PDPA).",
    my: 'SWING ဖောင်ဒေးရှင်းက သင့်ကိုယ်ရေးအချက်အလက်များကို ထိုင်းနိုင်ငံ ကိုယ်ရေးအချက်အလက် ကာကွယ်ရေးဥပဒေ (PDPA) အတိုင်း စုဆောင်း၊ အသုံးပြုပြီး ကာကွယ်ပုံ။',
    km: 'របៀបដែលមូលនិធិ SWING ប្រមូល ប្រើប្រាស់ និងការពារទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នក តាមច្បាប់ការពារទិន្នន័យផ្ទាល់ខ្លួនរបស់ថៃ (PDPA)។',
    lo: 'ວິທີທີ່ມູນນິທິ SWING ເກັບ, ໃຊ້ ແລະ ປົກປ້ອງຂໍ້ມູນສ່ວນບຸກຄົນຂອງທ່ານ ຕາມກົດໝາຍຄຸ້ມຄອງຂໍ້ມູນສ່ວນບຸກຄົນຂອງໄທ (PDPA).',
  },
  'seo.signin.title': {
    th: 'เข้าสู่ระบบ | SWING RIGHTS', en: 'Sign in | SWING RIGHTS',
    my: 'အကောင့်ဝင်ရန် | SWING RIGHTS', km: 'ចូលគណនី | SWING RIGHTS', lo: 'ເຂົ້າສູ່ລະບົບ | SWING RIGHTS',
  },
  'seo.signin.desc': {
    th: 'เข้าสู่ระบบหรือสมัครบัญชีผู้แจ้งเพื่อติดตามเคสของคุณและใช้ปุ่ม SOS ติดต่อเจ้าหน้าที่ SWING',
    en: 'Sign in or create a reporter account to follow your cases and use the SOS button to reach SWING staff.',
    my: 'သင့်အမှုများကို ခြေရာခံရန်နှင့် SOS ခလုတ်ဖြင့် SWING ဝန်ထမ်းများကို ဆက်သွယ်ရန် အကောင့်ဝင်ပါ သို့မဟုတ် အကောင့်ဖွင့်ပါ။',
    km: 'ចូលគណនី ឬបង្កើតគណនីអ្នករាយការណ៍ ដើម្បីតាមដានករណីរបស់អ្នក និងប្រើប៊ូតុង SOS ទាក់ទងបុគ្គលិក SWING។',
    lo: 'ເຂົ້າສູ່ລະບົບ ຫຼື ສ້າງບັນຊີຜູ້ແຈ້ງ ເພື່ອຕິດຕາມເຄສຂອງທ່ານ ແລະ ໃຊ້ປຸ່ມ SOS ຕິດຕໍ່ພະນັກງານ SWING.',
  },
  'seo.recover.title': {
    th: 'กู้เรื่องที่ค้างในเครื่อง | SWING RIGHTS', en: 'Recover saved reports | SWING RIGHTS',
    my: 'သိမ်းထားသော တိုင်ကြားချက်များ ပြန်ယူရန် | SWING RIGHTS', km: 'ស្តាររបាយការណ៍ដែលបានរក្សាទុក | SWING RIGHTS', lo: 'ກູ້ເລື່ອງທີ່ຄ້າງໃນອຸປະກອນ | SWING RIGHTS',
  },
  'seo.recover.desc': {
    th: 'ส่งเรื่องที่กรอกค้างไว้หรือส่งไม่สำเร็จจากเครื่องนี้อีกครั้ง',
    en: 'Resend reports that were left unfinished or failed to send from this device.',
    my: 'ဤစက်မှ မပြီးသေးသော သို့မဟုတ် ပို့မရခဲ့သော တိုင်ကြားချက်များကို ပြန်ပို့ပါ။',
    km: 'ផ្ញើរបាយការណ៍ដែលមិនទាន់បំពេញចប់ ឬផ្ញើមិនបាន ពីឧបករណ៍នេះម្តងទៀត។',
    lo: 'ສົ່ງເລື່ອງທີ່ກອກຄ້າງໄວ້ ຫຼື ສົ່ງບໍ່ສຳເລັດຈາກອຸປະກອນນີ້ອີກຄັ້ງ.',
  },
  'seo.intake.title': {
    th: 'รับเรื่องโดยเจ้าหน้าที่ | SWING Foundation', en: 'Staff intake | SWING Foundation',
    my: 'ဝန်ထမ်း လက်ခံမှတ်တမ်း | SWING Foundation', km: 'ការទទួលរឿងដោយបុគ្គលិក | SWING Foundation', lo: 'ຮັບເລື່ອງໂດຍພະນັກງານ | SWING Foundation',
  },
  'seo.intake.desc': {
    th: 'แบบฟอร์มรับเรื่องสำหรับเจ้าหน้าที่มูลนิธิเพื่อนพนักงานบริการ บันทึกเสียง ประเมิน และส่งต่อความช่วยเหลือ',
    en: 'Intake form for SWING Foundation staff: record, assess and refer for support.',
    my: 'SWING ဖောင်ဒေးရှင်း ဝန်ထမ်းများအတွက် လက်ခံပုံစံ။ အသံသွင်း၊ အကဲဖြတ်ပြီး အကူအညီသို့ လွှဲပို့ပါ။',
    km: 'ទម្រង់ទទួលរឿងសម្រាប់បុគ្គលិកមូលនិធិ SWING៖ ថតសំឡេង វាយតម្លៃ និងបញ្ជូនបន្តដើម្បីជំនួយ។',
    lo: 'ແບບຟອມຮັບເລື່ອງສຳລັບພະນັກງານມູນນິທິ SWING: ບັນທຶກສຽງ, ປະເມີນ ແລະ ສົ່ງຕໍ່ຄວາມຊ່ວຍເຫຼືອ.',
  },
  'seo.fallback.title': { th: 'SWING RIGHTS', en: 'SWING RIGHTS', my: 'SWING RIGHTS', km: 'SWING RIGHTS', lo: 'SWING RIGHTS' },
  'seo.fallback.desc': {
    th: 'พื้นที่ปลอดภัยสำหรับแจ้งเหตุ รู้สิทธิ และติดตามความช่วยเหลือจาก SWING',
    en: 'A safe space to report, know your rights and track support from SWING.',
    my: 'SWING ထံ တိုင်ကြားရန်၊ အခွင့်အရေးများ သိရှိရန်နှင့် အကူအညီကို ခြေရာခံရန် လုံခြုံသောနေရာ။',
    km: 'កន្លែងសុវត្ថិភាពសម្រាប់រាយការណ៍ ស្គាល់សិទ្ធិ និងតាមដានជំនួយពី SWING។',
    lo: 'ພື້ນທີ່ປອດໄພສຳລັບແຈ້ງເຫດ, ຮູ້ສິດ ແລະ ຕິດຕາມຄວາມຊ່ວຍເຫຼືອຈາກ SWING.',
  },
};
