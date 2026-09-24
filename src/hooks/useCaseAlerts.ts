import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

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

/** Realtime in-app toast — de-identified: case_code + branch + level only */
export function useCaseAlerts(enabled: boolean, onAlert?: (a: CaseAlert) => void, onOpen?: (caseId: string) => void) {
  const { t } = useI18n();

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel('case-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'case_alerts' }, (payload) => {
        const a = payload.new as CaseAlert;
        const urgent = a.kind === 'suicide_risk';
        const area = a.branch || t('access.alerts.unspecifiedArea');
        if (a.kind === 'unassigned') {
          toast.warning(t('areview.alert.unassigned', { code: a.case_code, area, level: a.level }), { duration: 15000 });
          onAlert?.(a);
          return;
        }
        if (a.kind === 'new_case') {
          try { new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=').play().catch(() => undefined); } catch { /* ignore */ }
          toast.info(t('dash.alerts.newToast', { code: a.case_code, area }), {
            duration: 20000,
            action: onOpen && a.case_id ? { label: t('dash.alerts.openCase'), onClick: () => onOpen(a.case_id!) } : undefined,
          });
          onAlert?.(a);
          return;
        }
        if (a.kind === 'sla_warning') {
          toast.warning(t('dash.sla.alert', { code: a.case_code, area, hours: parseInt(a.level, 10) || 0 }), { duration: 15000 });
          onAlert?.(a);
          return;
        }
        const msg = `${a.case_code} · ${area} · ${t('access.alerts.levelPrefix', { level: a.level })}`;
        if (urgent) toast.error(t('access.alerts.selfHarmRisk', { msg }), { duration: 20000 });
        else toast.warning(t('access.alerts.highRisk', { msg }), { duration: 12000 });
        onAlert?.(a);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, t]);
}
