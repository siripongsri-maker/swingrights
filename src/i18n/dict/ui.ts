import type { Entry } from '../index';

/**
 * Shared UI building blocks (src/components/ui/*, LanguageToggle, QuickExit, SoftWave,
 * ErrorBoundary, Onboarding, ReferralRespond) plus small keys any page may reuse.
 * USER-FACING: all 5 languages (th/en/my/km/lo) required for every key.
 * my/km/lo strings still need a native-speaker check before release.
 */
const CLOSE: Entry = { th: 'ปิด', en: 'Close', my: 'ပိတ်ရန်', km: 'បិទ', lo: 'ປິດ' };
const LANGUAGE: Entry = { th: 'ภาษา', en: 'Language', my: 'ဘာသာစကား', km: 'ភាសា', lo: 'ພາສາ' };

export const UI_DICT: Record<string, Entry> = {
  // Close button on sheets and dialogs (sr-only label)
  'ui.close': CLOSE,
  // Same text under the name other pages already plan to use (PhoneShell, Track)
  'common.close': CLOSE,

  // Language switcher
  'ui.language': LANGUAGE,
  'common.language': LANGUAGE,

  // Sonner toast region label
  'ui.notifications': {
    th: 'การแจ้งเตือน', en: 'Notifications',
    my: 'အသိပေးချက်များ', km: 'ការជូនដំណឹង', lo: 'ການແຈ້ງເຕືອນ',
  },

  // Screen-reader text next to a lone spinner
  'ui.loading': {
    th: 'กำลังโหลด', en: 'Loading',
    my: 'ဖွင့်နေသည်', km: 'កំពុងផ្ទុក', lo: 'ກຳລັງໂຫຼດ',
  },

  // Sound-wave band toggle (the band is decorative, not a background any more)
  'ui.wave.show': {
    th: 'แสดงลายคลื่นเสียง', en: 'Show sound-wave pattern',
    my: 'အသံလှိုင်းပုံစံကို ပြရန်', km: 'បង្ហាញលំនាំរលកសំឡេង', lo: 'ສະແດງລາຍຄື້ນສຽງ',
  },
  'ui.wave.hide': {
    th: 'ซ่อนลายคลื่นเสียง', en: 'Hide sound-wave pattern',
    my: 'အသံလှိုင်းပုံစံကို ဖျောက်ရန်', km: 'លាក់លំនាំរលកសំឡេង', lo: 'ເຊື່ອງລາຍຄື້ນສຽງ',
  },
};
