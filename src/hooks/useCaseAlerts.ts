import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CaseAlert {
  id: string;
  case_id: string | null;
  case_code: string;
  branch: string | null;
  level: string;
  kind: string;
  acknowledged_at: string | null;
  created_at: string;
}

/** Realtime in-app toast — de-identified: case_code + สาขา + ระดับ เท่านั้น */
export function useCaseAlerts(enabled: boolean, onAlert?: (a: CaseAlert) => void) {
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel('case-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'case_alerts' }, (payload) => {
        const a = payload.new as CaseAlert;
        const urgent = a.kind === 'suicide_risk';
        const msg = `${a.case_code} · ${a.branch || 'ไม่ระบุพื้นที่'} · ระดับ ${a.level}`;
        if (urgent) toast.error(`🚨 เคสเสี่ยงทำร้ายตนเอง — ${msg}`, { duration: 20000 });
        else toast.warning(`⚠️ เคสความเสี่ยงสูง — ${msg}`, { duration: 12000 });
        onAlert?.(a);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled]);
}
