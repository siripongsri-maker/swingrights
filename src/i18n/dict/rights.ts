import type { Entry } from '../index';

/** Know Your Rights public page (/rights). USER-FACING: all 5 languages. */
export const RIGHTS_DICT: Record<string, Entry> = {
  'rights.nav': {
    th: 'ถ้าคุณถูกตำรวจจับ', en: 'If the police arrest you',
    my: 'ရဲဖမ်းဆီးခဲ့လျှင်', km: 'បើអ្នកត្រូវបានប៉ូលិសចាប់ខ្លួន', lo: 'ຖ້າທ່ານຖືກຕຳຫຼວດຈັບ',
  },
  'rights.title': {
    th: 'สิทธิของผู้ต้องหา', en: 'Rights of the Accused',
    my: 'တရားစွပ်စွဲခံရသူ၏ အခွင့်အရေးများ', km: 'សិទ្ធិរបស់ជនជាប់ចោទ', lo: 'ສິດຂອງຜູ້ຖືກກ່າວຫາ',
  },
  'rights.subtitle': {
    th: 'รู้ไว้ก่อน ใช้ได้ทันทีเมื่อถูกจับหรือควบคุมตัว',
    en: 'Know them before you need them — they apply the moment you are arrested or detained.',
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
    my: 'စစ်ဆေးမှုနှင့် အမှုကြားနာချင်းအတွင်း', km: 'ក្នុងអំឡុងការស៊ើបអង្កេត និងដំណើរការរឿងក្តី', lo: 'ໃນລະຫວ່າງການສອບສວນ ແລະ ດຳເນີນຄະດີ',
  },
  'rights.section.detention': {
    th: 'การดูแลตัวเองระหว่างถูกควบคุมตัว', en: 'Taking care of yourself in detention',
    my: 'ထောင်ချခံနေရစဉ် ကိုယ့်ကိုယ်ကိုယ် ဂရုစိုက်ခြင်း', km: 'ការថែរក្សាខ្លួនឯងក្នុងអំឡុងឃាត់ខ្លួន', lo: 'ການດູແລຕົນເອງໃນຂະນະຖືກຄວບຄຸມຕົວ',
  },
  'rights.expandAll': {
    th: 'ขยายทั้งหมด', en: 'Expand all',
    my: 'အားလုံး ချဲ့ပါ', km: 'ពង្រីកទាំងអស់', lo: 'ຂະຫຍາຍທັງໝົດ',
  },
  'rights.collapseAll': {
    th: 'ยุบทั้งหมด', en: 'Collapse all',
    my: 'အားလုံး ခေါင်းပါ', km: 'បង្រួមទាំងអស់', lo: 'ຫຍໍ້ທັງໝົດ',
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
  'rights.disclaimer': {
    th: 'เนื้อหานี้จัดทำเพื่อให้เข้าใจง่าย ไม่ใช่คำแนะนำทางกฎหมายแทนทนายความ หากต้องการความช่วยเหลือ ติดต่อ SWING ได้ทุกกรณี',
    en: 'This content is written to be easy to understand and is not a substitute for legal advice from a lawyer. If you need help, contact SWING in any case.',
    my: 'ဤအကြောင်းအရာကို နားလည်လွယ်စေရန် ရေးသားထားပြီး ရှေ့နေ၏ ဥပဒေရေးရာ အကြံဉာဏ်ကို အစားမထိုးနိုင်ပါ အကူအညီလိုပါက SWING ကို ဆက်သွယ်နိုင်သည်',
    km: 'មាតិកានេះត្រូវបានរៀបចំឱ្យងាយយល់ មិនមែនជាដំបូន្មានផ្នែកច្បាប់ជំនួសមេធាវីទេ ប្រសិនបើត្រូវការជំនួយ សូមទាក់ទង SWING បានគ្រប់ករណី',
    lo: 'ເນື້ອຫານີ້ຈັດທຳໃຫ້ເຂົ້າໃຈງ່າຍ ບໍ່ແມ່ນຄຳແນະນຳດ້ານກົດໝາຍແທນທະນາຍ ຖ້າຕ້ອງການຄວາມຊ່ວຍເຫຼືອ ຕິດຕໍ່ SWING ໄດ້ທຸກກໍລະນີ',
  },
};
