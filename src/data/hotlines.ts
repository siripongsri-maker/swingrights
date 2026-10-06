// Emergency / support hotlines (Thailand). Labels are i18n keys in src/i18n.
export interface Hotline {
  number: string;
  labelKey: string;
}

export const HOTLINES: Hotline[] = [
  { number: '1323', labelKey: 'landing.help.hl.mental' },
  { number: '191', labelKey: 'landing.help.hl.emergency' },
  { number: '1300', labelKey: 'landing.help.hl.social' },
  { number: '1546', labelKey: 'landing.help.hl.labour' },
  { number: '1191', labelKey: 'landing.help.hl.trafficking' },
];

/**
 * SWING branch numbers. Shared by the app and printed material (single source).
 * labelKey is the short branch name ("สีลม"); nameKey adds SWING in front ("สวิง สาขาสีลม").
 * tel is in international format so it also dials from a foreign or roaming SIM.
 */
export interface SwingBranch { labelKey: string; nameKey: string; display: string; tel: string }
export const SWING_BRANCHES: SwingBranch[] = [
  { labelKey: 'rights.branch.silom', nameKey: 'landing.hl.silom', display: '02-632-9501', tel: '+6626329501' },
  { labelKey: 'rights.branch.pattaya', nameKey: 'landing.hl.pattaya', display: '038-412-297', tel: '+6638412297' },
];
