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
