import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { Loader2, ArrowLeft, ShieldAlert, Clock, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

/** หน้าประวัติเคสสำหรับเจ้าหน้าที่: ข้อมูลผู้รายงาน (PII แยกตาราง ต้องกดเปิดดู), ไทม์ไลน์, คำตอบทั้งหมดรวม follow-up */
export default function CaseHistory() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [pii, setPii] = useState<{ reporter: any; victim: any } | null>(null);
  const [piiLoading, setPiiLoading] = useState(false);

  const { data: c, isLoading } = useQuery({
    queryKey: ['case', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cases').select('*').eq('id', caseId!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['case-timeline', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase.from('case_timeline').select('status,note,created_at').eq('case_id', caseId!).order('created_at', { ascending: false });
      return (data ?? []) as { status: string; note: string | null; created_at: string }[];
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['case-questions', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('case_questions' as never)
        .select('id,question,answer_text,answered_at,created_at')
        .eq('case_id', caseId!)
        .order('created_at');
      return (data ?? []) as unknown as { id: string; question: string; answer_text: string | null; answered_at: string | null; created_at: string }[];
    },
  });

  const revealPii = async () => {
    setPiiLoading(true);
    const { data, error } = await supabase.rpc('get_case_pii' as any, { _case_id: caseId });
    setPiiLoading(false);
    if (error) { toast.error(t('dash.detail.piiNoAccess')); return; }
    setPii(data as any);
  };

  if (isLoading || !c) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const answers = (c.answers || []) as any[];
  const followups = answers.filter((a) => a.cat === 'self_followup');
  const fmt = (iso: string) => new Date(iso).toLocaleString('th-TH');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary-deep text-primary-foreground sticky top-0 z-30 shadow-elegant">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80 flex items-center justify-center transition" aria-label={t('dash.hist.back')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="font-mono text-sm">{c.case_code}</p>
            <p className="text-[11px] text-sidebar-foreground/60">{fmt(c.created_at)}</p>
          </div>
          <div className="ms-auto"><StatusBadge value={c.status} /></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 space-y-4">
        <h1 className="font-display text-2xl">{t('dash.hist.title')}</h1>

        {/* ข้อมูลผู้รายงาน */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-medium text-muted-foreground">{t('dash.hist.reporterSection')}</p>
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
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {t('dash.hist.timeline')}</p>
          {timeline.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('dash.hist.empty')}</p>
          ) : (
            <ol className="relative border-s border-border ps-4 space-y-4">
              {timeline.map((ev, i) => (
                <li key={i} className="relative">
                  <span className="absolute -start-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                  <p className="text-[11px] text-muted-foreground font-mono">{fmt(ev.created_at)}</p>
                  <p className="text-sm font-medium"><StatusBadge value={ev.status as any} /></p>
                  {ev.note && <p className="text-sm text-muted-foreground mt-0.5">{ev.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* คำตอบทั้งหมดรวม follow-up */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {t('dash.hist.answers')}</p>
          {followups.length > 0 && (
            <p className="text-xs bg-accent/10 text-accent border border-accent/30 rounded-md px-3 py-2 mb-3">
              {t('dash.detail.followupCount', { n: followups.length })}
            </p>
          )}
          <div className="space-y-3">
            {answers.length === 0 && <p className="text-xs text-muted-foreground">{t('dash.hist.empty')}</p>}
            {answers.map((a, i) => (
              <div key={i} className={`border-b border-border/60 pb-3 last:border-none last:pb-0 ${a.cat === 'self_followup' ? 'ps-3 border-s-2 border-s-accent' : ''}`}>
                <p className="text-[10px] uppercase tracking-wider text-primary mb-1">{a.cat === 'self_followup' ? t('dash.detail.followupLabel') : t('dash.detail.mainQLabel')}</p>
                <p className="text-xs text-muted-foreground mb-1">{a.question}</p>
                <p className="text-sm bg-muted/40 border border-border rounded-md p-2">{a.transcript || t('dash.detail.noAnswer')}</p>
              </div>
            ))}
          </div>
        </section>

        {/* คำถามจากเจ้าหน้าที่ + คำตอบผู้รายงาน */}
        {questions.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><MessageCircleQuestion className="w-3.5 h-3.5" /> {t('dash.hist.staffQuestions')}</p>
            {questions.map((q) => (
              <div key={q.id} className="border border-border/60 rounded-lg p-3 space-y-1.5">
                <p className="text-sm font-medium">{q.question}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{fmt(q.created_at)}</p>
                {q.answer_text ? (
                  <div className="bg-muted/50 rounded-md p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-primary">{t('dash.detail.answerFromReporter')}</p>
                    <p className="text-sm">{q.answer_text}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{t('dash.hist.waiting')}</p>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
