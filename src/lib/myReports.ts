import { supabase } from '@/integrations/supabase/client';

const KEY = 'swing-my-report-codes';

export function rememberReportCode(code: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!list.includes(code)) list.push(code);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-50)));
  } catch { /* ignore */ }
}

export function getReportCodes(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

/** Link reports sent from this device to the signed-in account. */
export async function linkDeviceReports() {
  const codes = getReportCodes();
  if (!codes.length) return 0;
  const { data, error } = await supabase.rpc('link_my_cases' as never, { _codes: codes } as never);
  if (error) return 0;
  return Number(data) || 0;
}

export const SOS_CONTACTS = [
  { name: 'แมน', nameEn: 'Man', area: 'pattaya', phone: '0935058669' },
  { name: 'เอ็ม', nameEn: 'M', area: 'pattaya', phone: '0903827048' },
  { name: 'อ๋อ', nameEn: 'Or', area: 'bangkok', phone: '0634791103' },
] as const;
