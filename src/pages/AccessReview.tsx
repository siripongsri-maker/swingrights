import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { useRoleLabels, type AppRole } from '@/hooks/useAccess';
import { StaffShell, StaffLoadError } from '@/components/admin/StaffShell';

type Row = {
  user_id: string; name_masked: string | null; status: string; roles: string[];
  case_views: number; exports: number; last_login: string | null; last_activity: string | null;
};

const thisMonth = () => new Date().toISOString().slice(0, 7);
const DAY = 86_400_000;

export default function AccessReview() {
  const { t, lang } = useI18n();
  const roleLabels = useRoleLabels();
  const qc = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const [saving, setSaving] = useState(false);
  const monthDate = `${month}-01`;
  const locale = lang === 'th' ? 'th-TH' : 'en-GB';

  const rowsQ = useQuery({
    queryKey: ['access-review', month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('access_review' as never, { _month: monthDate } as never);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const reviewQ = useQuery({
    queryKey: ['access-review-mark', month],
    queryFn: async () => {
      const { data, error } = await supabase.from('access_reviews' as never)
        .select('reviewed_at').eq('month', monthDate).order('reviewed_at', { ascending: false }).limit(1);
      if (error) throw error;
      return ((data ?? []) as { reviewed_at: string }[])[0] ?? null;
    },
  });

  const markReviewed = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('access_reviews' as never)
      .insert({ month: monthDate, reviewed_by: u.user?.id } as never);
    setSaving(false);
    if (error) { toast.error(t('areview.error')); return; }
    toast.success(t('areview.saved'));
    qc.invalidateQueries({ queryKey: ['access-review-mark', month] });
  };

  const inactive = (r: Row) => !r.last_activity || Date.now() - new Date(r.last_activity).getTime() > 30 * DAY;

  const reviewedLine = reviewQ.data
    ? t('areview.reviewedAt', { date: new Date(reviewQ.data.reviewed_at).toLocaleString(locale) })
    : t('areview.notReviewed');

  return (
    <StaffShell title={t('areview.title')} context={reviewQ.isSuccess ? reviewedLine : undefined}>
      <div className="max-w-5xl space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-card flex flex-wrap items-end gap-3">
          <label className="text-sm space-y-1 flex-1 min-w-[200px] sm:flex-none">
            <span className="block text-muted-foreground">{t('areview.month')}</span>
            <Input className="h-11" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </label>
          <Button variant="action" onClick={markReviewed} disabled={saving || rowsQ.isLoading}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <CheckCircle2 className="w-4 h-4" aria-hidden />} {t('areview.markReviewed')}
          </Button>
        </div>
        {reviewQ.isError && <StaffLoadError onRetry={() => void reviewQ.refetch()} />}

        <div className="bg-card border border-border rounded-[20px] shadow-card overflow-x-auto">
          {rowsQ.isLoading ? (
            <div className="p-8 flex justify-center" role="status"><Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>
          ) : rowsQ.isError ? (
            <StaffLoadError className="m-4" onRetry={() => void rowsQ.refetch()} />
          ) : (rowsQ.data?.length ?? 0) === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t('areview.empty')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-start p-3">{t('areview.col.staff')}</th>
                  <th className="text-start p-3">{t('areview.col.roles')}</th>
                  <th className="text-end p-3">{t('areview.col.views')}</th>
                  <th className="text-end p-3">{t('areview.col.exports')}</th>
                  <th className="text-start p-3">{t('areview.col.lastLogin')}</th>
                </tr>
              </thead>
              <tbody>
                {rowsQ.data!.map((r) => {
                  const idle = inactive(r);
                  return (
                    <tr key={r.user_id} className={`border-t border-border ${idle ? 'bg-warning/10' : ''}`}>
                      <td className="p-3">
                        <div className="font-medium">{r.name_masked || '-'}</div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {idle && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-sevYellow-fg">
                              <AlertTriangle className="w-3 h-3" /> {t('areview.inactive')}
                            </span>
                          )}
                          {r.status === 'suspended' && <span className="text-xs text-muted-foreground">· {t('areview.suspended')}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-sm">{r.roles.map((x) => roleLabels[x as AppRole] ?? x).join(', ') || '-'}</td>
                      <td className="p-3 text-end tabular-nums">{r.case_views}</td>
                      <td className="p-3 text-end tabular-nums">{r.exports}</td>
                      <td className="p-3 text-xs">{r.last_login ? new Date(r.last_login).toLocaleDateString(locale) : t('areview.never')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StaffShell>
  );
}
