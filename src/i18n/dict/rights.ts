import type { Entry } from '../index';

/** Know Your Rights public page (/rights). USER-FACING: all 5 languages. */
export const RIGHTS_DICT: Record<string, Entry> = {
  'rights.nav': {
    th: 'ถ้าคุณถูกจับ', en: 'If you are arrested',
    my: 'ဖမ်းဆီးခံရလျှင်', km: 'បើអ្នកត្រូវបានចាប់ខ្លួន', lo: 'ຖ້າທ່ານຖືກຈັບ',
  },
  'rights.title': {
    th: 'สิทธิของผู้ต้องหา', en: 'Rights of the Accused',
    my: 'တရားစွပ်စွဲခံရသူ၏ အခွင့်အရေးများ', km: 'សិទ្ធិរបស់ជនជាប់ចោទ', lo: 'ສິດຂອງຜູ້ຖືກກ່າວຫາ',
  },
  'rights.subtitle': {
    th: 'รู้ไว้ก่อน ใช้ได้ทันทีเมื่อถูกจับหรือควบคุมตัว',
    en: 'Know them before you need them. They apply the moment you are arrested or detained.',
    my: 'ဖမ်းဆီးခံရသောအခါ ချက်ချင်းသုံးလို့ရစေရန် ကြိုတင်သိထားပါ',
    km: 'ដឹងទុកមុន ប្រើបានភ្លាមៗនៅពេលត្រូវបានចាប់ខ្លួន',
    lo: 'ຮູ້ໄວ້ກ່ອນ ໃຊ້ໄດ້ທັນທີເມື່ອຖືກຈັບ ຫຼື ຄວບຄຸມຕົວ',
  },
  'rights.context': {
    th: 'ทุกคนมีสิทธิเหล่านี้เท่าเทียมกัน ไม่ว่าจะเป็นใคร ทำงานอะไร',
    en: 'Everyone has these rights equally, no matter who they are or what work they do.',
    my: 'မည်သူ့ဖြစ်ဖြစ် မည်သည့်အလုပ်လုပ်နေသော်လည်း လူတိုင်းတွင် ဤအခွင့်အရေးများ တန်းတူရှိသည်',
    km: 'មនុស្សគ្រប់គ្នាមានសិទ្ធិទាំងនេះស្មើៗគ្នា មិនថាជានរណា ឬធ្វើការអ្វីទេ',
    lo: 'ທຸກຄົນມີສິດເຫຼົ່ານີ້ເທົ່າທຽມກັນ ບໍ່ວ່າຈະເປັນໃຜ ເຮັດວຽກຫຍັງ',
  },
  'rights.section.arrest': {
    th: 'ตอนถูกจับ', en: 'When arrested',
    my: 'ဖမ်းဆီးခံရသောအခါ', km: 'នៅពេលត្រូវបានចាប់ខ្លួន', lo: 'ເມື່ອຖືກຈັບ',
  },
  'rights.section.investigation': {
    th: 'ระหว่างสอบสวนและดำเนินคดี', en: 'During investigation and prosecution',
    my: 'စစ်ဆေးမှုနှင့် အမှုကြားနာခြင်းအတွင်း', km: 'ក្នុងអំឡុងការស៊ើបអង្កេត និងដំណើរការរឿងក្តី', lo: 'ໃນລະຫວ່າງການສອບສວນ ແລະ ດຳເນີນຄະດີ',
  },
  'rights.section.detention': {
    th: 'การดูแลตัวเองระหว่างถูกควบคุมตัว', en: 'Taking care of yourself in detention',
    my: 'ထောင်ချခံနေရစဉ် ကိုယ့်ကိုယ်ကိုယ် ဂရုစိုက်ခြင်း', km: 'ការថែរក្សាខ្លួនឯងក្នុងអំឡុងឃាត់ខ្លួន', lo: 'ການດູແລຕົນເອງໃນຂະນະຖືກຄວບຄຸມຕົວ',
  },
  'rights.count': { th: '{n} ข้อ', en: '{n} items', my: '{n} ချက်', km: '{n} ចំណុច', lo: '{n} ຂໍ້' },
  'rights.jump': { th: 'ไปที่หมวด', en: 'Jump to section', my: 'အပိုင်းသို့ သွားရန်', km: 'ទៅកាន់ផ្នែក', lo: 'ໄປທີ່ໝວດ' },
  'rights.branches': { th: 'เบอร์โทรสาขา SWING', en: 'SWING branch numbers', my: 'SWING ရုံးခွဲ ဖုန်းနံပါတ်များ', km: 'លេខទូរស័ព្ទសាខា SWING', lo: 'ເບີໂທສາຂາ SWING' },
  'rights.branch.silom': { th: 'สีลม', en: 'Silom', my: 'ဆီလုံ', km: 'ស៊ីឡុម', lo: 'ສີລົມ' },
  'rights.branch.pattaya': { th: 'พัทยา', en: 'Pattaya', my: 'ပတ္တယား', km: 'ប៉ាតាយ៉ា', lo: 'ພັດທະຍາ' },
  'rights.saveTitle': { th: 'พิมพ์ / บันทึกเป็นภาพ', en: 'Print / save as image', my: 'ပုံနှိပ်ရန် / ပုံအဖြစ် သိမ်းရန်', km: 'បោះពុម្ព / រក្សាទុកជារូបភាព', lo: 'ພິມ / ບັນທຶກເປັນຮູບ' },
  'rights.saveBody': { th: 'แคปหน้าจอนี้เก็บไว้ในเครื่อง เปิดดูได้แม้ไม่มีเน็ต', en: 'Take a screenshot of this page and keep it on your phone. You can open it even without internet.', my: 'ဤစာမျက်နှာကို screenshot ရိုက်ပြီး ဖုန်းထဲသိမ်းထားပါ။ အင်တာနက်မရှိလည်း ကြည့်နိုင်ပါသည်။', km: 'ថតអេក្រង់ទំព័រនេះទុកក្នុងទូរស័ព្ទ។ អាចបើកមើលបានទោះគ្មានអ៊ីនធឺណិត។', lo: 'ແຄັບໜ້າຈໍນີ້ເກັບໄວ້ໃນເຄື່ອງ. ເປີດເບິ່ງໄດ້ເຖິງວ່າບໍ່ມີເນັດ.' },
  'rights.expandAll': {
    th: 'ขยายทั้งหมด', en: 'Expand all',
    my: 'အားလုံး ချဲ့ပါ', km: 'ពង្រីកទាំងអស់', lo: 'ຂະຫຍາຍທັງໝົດ',
  },
  'rights.collapseAll': {
    th: 'ย่อทั้งหมด', en: 'Collapse all',
    my: 'အားလုံး ခေါက်ပါ', km: 'បង្រួមទាំងអស់', lo: 'ຫຍໍ້ທັງໝົດ',
  },
  'rights.call': {
    th: 'โทรหา SWING', en: 'Call SWING',
    my: 'SWING ကို ဖုန်းဆက်ပါ', km: 'ទូរស័ព្ទទៅ SWING', lo: 'ໂທຫາ SWING',
  },
  'rights.share': {
    th: 'แชร์หน้านี้', en: 'Share this page',
    my: 'ဤစာမျက်နှာ မျှဝေပါ', km: 'ចែករំលែកទំព័រនេះ', lo: 'ແບ່ງປັນໜ້ານີ້',
  },
  'rights.shareCopied': {
    th: 'คัดลอกลิงก์แล้ว', en: 'Link copied',
    my: 'လင့်ခ် ကူးပြီးပါပြီ', km: 'បានចម្លងតំណ', lo: 'ຄັດລອກລິ້ງແລ້ວ',
  },
  // Shown when neither the share sheet nor the clipboard works
  'rights.shareManual': {
    th: 'คัดลอกลิงก์จากแถบที่อยู่ด้านบนได้เลย', en: 'Copy the link from the address bar.',
    my: 'အပေါ်ရှိ လိပ်စာဘားမှ လင့်ခ်ကို ကူးယူပါ။', km: 'សូមចម្លងតំណពីរបារអាសយដ្ឋានខាងលើ។', lo: 'ສຳເນົາລິ້ງຈາກແຖບທີ່ຢູ່ດ້ານເທິງໄດ້ເລີຍ.',
  },
  // Shown only when the UI language is not Thai: the 15 rights in src/data/rights.ts are Thai-only
  'rights.thaiOnly': {
    th: 'ตอนนี้เนื้อหาสิทธิด้านล่างมีเฉพาะภาษาไทย ถ้าอยากให้ช่วยอ่าน โทรหา SWING ได้เลย',
    en: 'The rights below are in Thai for now. If you need help reading them, call SWING.',
    my: 'အောက်ပါ အခွင့်အရေးများကို လောလောဆယ် ထိုင်းဘာသာဖြင့်သာ ရေးထားပါသည်။ ဖတ်ရန် အကူအညီလိုပါက SWING ကို ဖုန်းဆက်ပါ။',
    km: 'សិទ្ធិខាងក្រោមមានតែជាភាសាថៃសិនសម្រាប់ពេលនេះ។ បើអ្នកត្រូវការជំនួយក្នុងការអាន សូមទូរស័ព្ទទៅ SWING។',
    lo: 'ຕອນນີ້ເນື້ອຫາສິດຂ້າງລຸ່ມມີແຕ່ພາສາໄທ. ຖ້າຢາກໃຫ້ຊ່ວຍອ່ານ ໂທຫາ SWING ໄດ້ເລີຍ.',
  },
  'rights.disclaimer': {
    th: 'เนื้อหานี้จัดทำเพื่อให้เข้าใจง่าย ไม่ใช่คำแนะนำทางกฎหมายแทนทนายความ หากต้องการความช่วยเหลือ ติดต่อ SWING ได้ทุกกรณี',
    en: 'This content is written to be easy to understand and is not a substitute for legal advice from a lawyer. If you need help, contact SWING in any case.',
    my: 'ဤအကြောင်းအရာကို နားလည်လွယ်စေရန် ရေးသားထားပြီး ရှေ့နေ၏ ဥပဒေရေးရာ အကြံဉာဏ်ကို အစားမထိုးနိုင်ပါ အကူအညီလိုပါက SWING ကို ဆက်သွယ်နိုင်သည်',
    km: 'មាតិកានេះត្រូវបានរៀបចំឱ្យងាយយល់ មិនមែនជាដំបូន្មានផ្នែកច្បាប់ជំនួសមេធាវីទេ ប្រសិនបើត្រូវការជំនួយ សូមទាក់ទង SWING បានគ្រប់ករណី',
    lo: 'ເນື້ອຫານີ້ຈັດທຳໃຫ້ເຂົ້າໃຈງ່າຍ ບໍ່ແມ່ນຄຳແນະນຳດ້ານກົດໝາຍແທນທະນາຍ ຖ້າຕ້ອງການຄວາມຊ່ວຍເຫຼືອ ຕິດຕໍ່ SWING ໄດ້ທຸກກໍລະນີ',
  },
};
