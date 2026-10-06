import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { Loader2, ArrowLeft, ShieldAlert, Clock, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { StaffShell, StaffLoadError } from '@/components/admin/StaffShell';

/** หน้าประวัติเคสสำหรับเจ้าหน้าที่: ข้อมูลผู้รายงาน (PII แยกตาราง ต้องกดเปิดดู), ไทม์ไลน์, คำตอบทั้งหมดรวม follow-up */
export default function CaseHistory() {
  const { id: caseId } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [pii, setPii] = useState<{ reporter: any; victim: any } | null>(null);
  const [piiLoading, setPiiLoading] = useState(false);

  const { data: c, isLoading, isError, refetch } = useQuery({
    queryKey: ['case', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cases').select('*').eq('id', caseId!).single();
      if (error) throw error;
      return data as any;
    },
  });

  // Same reads as before; a failed read now shows an error instead of looking empty
  const timelineQ = useQuery({
    queryKey: ['case-timeline', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase.from('case_timeline').select('status,note,created_at').eq('case_id', caseId!).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as { status: string; note: string | null; created_at: string }[];
    },
  });
  const timeline = timelineQ.data ?? [];

  const questionsQ = useQuery({
    queryKey: ['case-questions', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_questions' as never)
        .select('id,question,answer_text,answered_at,created_at')
        .eq('case_id', caseId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; question: string; answer_text: string | null; answered_at: string | null; created_at: string }[];
    },
  });
  const questions = questionsQ.data ?? [];

  const revealPii = async () => {
    setPiiLoading(true);
    const { data, error } = await supabase.rpc('get_case_pii' as any, { _case_id: caseId });
    setPiiLoading(false);
    if (error) { toast.error(t('dash.detail.piiNoAccess')); return; }
    setPii(data as any);
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('th-TH');
  // Labelled 44px link back to the case (the shell sidebar / bottom nav cover the lists)
  const backLink = caseId ? (
    <Link to={`/admin/case/${caseId}`}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg pe-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" aria-hidden /> {t('staff.hist.backToCase')}
    </Link>
  ) : null;

  if (isLoading || !c) {
    return (
      <StaffShell title={t('dash.hist.title')}>
        {backLink}
        {isError || (!isLoading && !c)
          ? <StaffLoadError className="mt-3" onRetry={() => void refetch()} />
          : <div className="py-12 text-center" role="status"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>}
      </StaffShell>
    );
  }

  const answers = (c.answers || []) as any[];
  const followups = answers.filter((a) => a.cat === 'self_followup');

  return (
    <StaffShell
      title={`${t('dash.hist.title')} ${c.case_code}`}
      context={t('staff.hist.created', { date: fmt(c.created_at) })}
      actions={<StatusBadge value={c.status} />}
    >
      <div className="max-w-4xl space-y-4">
        {backLink}

        {/* ข้อมูลผู้รายงาน */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-subhead text-base font-semibold">{t('dash.hist.reporterSection')}</h2>
            {!pii && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={piiLoading} onClick={() => void revealPii()}>
                {piiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />} {t('dash.detail.revealPii')}
              </Button>
            )}
          </div>
          {!pii && <p className="text-xs text-muted-foreground">{t('dash.detail.piiHint')}</p>}
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('dash.detail.reporter')}</p>
              <p className="font-medium">{pii ? (pii.reporter?.name || '-') : '••••••'}</p>
              <p className="text-xs text-muted-foreground">{pii ? [pii.reporter?.phone, pii.reporter?.email].filter(Boolean).join(' · ') || '-' : '••••••'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('dash.hist.period')}</p>
              <p>{t('dash.hist.periodValue', { from: fmt(c.created_at), to: fmt(c.updated_at) })}</p>
              {c.first_response_at && <p className="text-xs text-muted-foreground mt-1">{t('dash.hist.firstResponse', { at: fmt(c.first_response_at) })}</p>}
            </div>
          </div>
        </section>

        {/* ไทม์ไลน์ */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-subhead text-base font-semibold mb-3 flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" aria-hidden /> {t('dash.hist.timeline')}</h2>
          {timelineQ.isError ? (
            <StaffLoadError onRetry={() => void timelineQ.refetch()} />
          ) : timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">{timelineQ.isLoading ? t('ui.loading') : t('dash.hist.empty')}</p>
          ) : (
            <ol className="relative border-s border-border ps-4 space-y-4">
              {timeline.map((ev, i) => (
                <li key={i} className="relative">
                  <span className="absolute -start-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground font-mono">{fmt(ev.created_at)}</p>
                  <p className="text-sm font-medium"><StatusBadge value={ev.status as any} /></p>
                  {ev.note && <p className="text-sm text-muted-foreground mt-0.5">{ev.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* คำตอบทั้งหมดรวม follow-up */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-subhead text-base font-semibold mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" aria-hidden /> {t('dash.hist.answers')}</h2>
          {followups.length > 0 && (
            <p className="text-xs bg-accent/10 text-accent border border-accent/30 rounded-md px-3 py-2 mb-3">
              {t('dash.detail.followupCount', { n: followups.length })}
            </p>
          )}
          <div className="space-y-3">
            {answers.length === 0 && <p className="text-xs text-muted-foreground">{t('dash.hist.empty')}</p>}
            {answers.map((a, i) => (
              <div key={i} className={`border-b border-border/60 pb-3 last:border-none last:pb-0 ${a.cat === 'self_followup' ? 'ps-3 border-s-2 border-s-accent' : ''}`}>
                <p className="text-xs font-semibold text-primary mb-1">{a.cat === 'self_followup' ? t('dash.detail.followupLabel') : t('dash.detail.mainQLabel')}</p>
                <p className="text-xs text-muted-foreground mb-1">{a.question}</p>
                <p className="text-sm bg-muted/40 border border-border rounded-md p-2">{a.transcript || t('dash.detail.noAnswer')}</p>
              </div>
            ))}
          </div>
        </section>

        {/* คำถามจากเจ้าหน้าที่ + คำตอบผู้รายงาน */}
        {questionsQ.isError && <StaffLoadError onRetry={() => void questionsQ.refetch()} />}
        {questions.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3">
            <h2 className="font-subhead text-base font-semibold flex items-center gap-1.5"><MessageCircleQuestion className="w-4 h-4 text-primary" aria-hidden /> {t('dash.hist.staffQuestions')}</h2>
            {questions.map((q) => (
              <div key={q.id} className="border border-border/60 rounded-lg p-3 space-y-1.5">
                <p className="text-sm font-medium">{q.question}</p>
                <p className="text-xs text-muted-foreground font-mono">{fmt(q.created_at)}</p>
                {q.answer_text ? (
                  <div className="bg-muted/50 rounded-md p-2.5">
                    <p className="text-xs font-semibold text-primary">{t('dash.detail.answerFromReporter')}</p>
                    <p className="text-sm">{q.answer_text}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('dash.hist.waiting')}</p>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </StaffShell>
  );
}
