import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to live changes on case-related tables and invalidate
 * matching React Query caches so staff screens update by themselves,
 * with no refresh and no URL parameters.
 */
export function useRealtimeCases(caseId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const invalidate = (table: string) => {
      void qc.invalidateQueries({ queryKey: ['cases'] });
      void qc.invalidateQueries({ queryKey: ['queue'] });
      void qc.invalidateQueries({ queryKey: ['kpi'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      void qc.invalidateQueries({ queryKey: ['alerts'] });
      if (table === 'cases' && caseId) {
        void qc.invalidateQueries({ queryKey: ['case', caseId] });
      }
      if (table === 'case_questions' && caseId) {
        void qc.invalidateQueries({ queryKey: ['case-questions', caseId] });
      }
      if (table === 'case_timeline' && caseId) {
        void qc.invalidateQueries({ queryKey: ['case-timeline', caseId] });
      }
      if (table === 'case_referrals') {
        void qc.invalidateQueries({ queryKey: ['case-referrals'] });
      }
    };

    const tables = ['cases', 'case_questions', 'case_timeline', 'case_referrals', 'case_alerts'] as const;
    const channel = supabase.channel('realtime-cases');
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => invalidate(table));
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, caseId]);
}
