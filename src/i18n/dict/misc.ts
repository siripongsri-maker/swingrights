import type { Entry } from '../index';

/**
 * User-facing misc pages & shared components
 * (Recover.tsx, ResetPassword.tsx, ErrorBoundary.tsx, ProtectedRoute.tsx,
 * QuickExit.tsx, SeverityBadge.tsx, lib/localCases.ts, lib/resubmit.ts).
 * USER-FACING: all 5 languages (th/en/my/km/lo) required for every key.
 */
export const MISC_DICT: Record<string, Entry> = {
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
    th: 'ส่งเคสสำเร็จ — รหัส {code}', en: 'Case sent successfully — code {code}',
    my: 'အမှုပို့ခြင်းအောင်မြင်ပါသည် — ကုတ် {code}', km: 'ផ្ញើករណីបានជោគជ័យ — កូដ {code}', lo: 'ສົ່ງເຄສສຳເລັດ — ລະຫັດ {code}',
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

  // ---------- SeverityBadge ----------
  'severity.green': {
    th: 'เขียว', en: 'Green',
    my: 'အစိမ်း', km: 'បៃតង', lo: 'ສີຂຽວ',
  },
  'severity.yellow': {
    th: 'เหลือง', en: 'Yellow',
    my: 'အဝါ', km: 'លឿង', lo: 'ສີເຫຼືອງ',
  },
  'severity.red': {
    th: 'แดง', en: 'Red',
    my: 'အနီ', km: 'ក្រហម', lo: 'ສີແດງ',
  },
};
