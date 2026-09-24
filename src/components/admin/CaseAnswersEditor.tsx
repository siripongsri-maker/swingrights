import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Loader2, Pencil, Plus, UserPen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PiiHint } from '@/lib/piiGuard';
import { useI18n } from '@/i18n';

interface Answer { question: string; cat: string; transcript: string; edited_at?: string; edited_by?: string; added_by?: string }
interface Revision { id: string; answer_index: number; action: string; question: string | null; old_transcript: string | null; new_transcript: string | null; edited_by: string; created_at: string }

interface Props {
  caseId: string;
  answers: Answer[];
  canEdit: boolean;
  audioSigned: Record<number, string>;
  staffObs?: string[];
  staffName: (id: string | null | undefined) => string;
}

/** Reporter answers + staff additions/edits, with a full revision history. */
export function CaseAnswersEditor({ caseId, answers, canEdit, audioSigned, staffObs, staffName }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [busy, setBusy] = useState(false);
  const [openHist, setOpenHist] = useState<number | null>(null);

  const { data: revisions = [] } = useQuery({
    queryKey: ['answer-revisions', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('case_answer_revisions' as never).select('*').eq('case_id', caseId).order('created_at', { ascending: false });
      return (data ?? []) as unknown as Revision[];
    },
  });

  const save = async (index: number | null, question: string, transcript: string) => {
    setBusy(true);
    const { error } = await supabase.rpc('staff_edit_answer' as never, { _case_id: caseId, _index: index, _question: question, _transcript: transcript } as never);
    setBusy(false);
    if (error) { toast.error(t('dash.ans.saveFailed')); return false; }
    toast.success(t('dash.ans.saved'));
    qc.invalidateQueries({ queryKey: ['case', caseId] });
    qc.invalidateQueries({ queryKey: ['answer-revisions', caseId] });
    return true;
  };

  const label = (cat: string) =>
    cat === 'self_followup' ? t('dash.detail.followupLabel')
      : cat === 'staff_added' ? t('dash.ans.staffAdded')
        : cat === 'SELF_PROBE' ? t('dash.detail.mainQLabel') : cat;

  const followups = answers.filter((a) => a.cat === 'self_followup').length;

  return (
    <section className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-medium text-muted-foreground">{t('dash.detail.interviewLog')}</p>
        {canEdit && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5 me-1" />{t('dash.ans.add')}</Button>
        )}
      </div>
      <div className="space-y-3">
        {followups > 0 && (
          <p className="text-xs bg-accent/10 text-accent border border-accent/30 rounded-md px-3 py-2">{t('dash.detail.followupCount', { n: followups })}</p>
        )}
        {answers.map((a, i) => {
          const hist = revisions.filter((r) => r.answer_index === i);
          const side = a.cat === 'self_followup' ? 'ps-3 border-s-2 border-s-accent' : a.cat === 'staff_added' ? 'ps-3 border-s-2 border-s-primary' : '';
          return (
            <div key={i} className={`border-b border-border/60 pb-3 last:border-none last:pb-0 ${side}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[10px] uppercase tracking-wider text-primary">{label(a.cat)}</p>
                {canEdit && editIdx !== i && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditIdx(i); setDraft(a.transcript || ''); }}>
                    <Pencil className="w-3 h-3 me-1" />{t('dash.ans.edit')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">{a.question}</p>
              {editIdx === i ? (
                <div className="space-y-2">
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={5000} />
                  <PiiHint />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditIdx(null)}>{t('dash.ans.cancel')}</Button>
                    <Button size="sm" disabled={busy} onClick={async () => { if (await save(i, '', draft)) setEditIdx(null); }}>
                      {busy && <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />}{t('dash.ans.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm bg-muted/40 border border-border rounded-md p-2 whitespace-pre-wrap">{a.transcript || t('dash.detail.noAnswer')}</p>
              )}
              {audioSigned[i] && <audio src={audioSigned[i]} controls className="w-full mt-2 h-9" />}
              {staffObs?.[i] && <p className="text-xs text-amber-700 mt-1.5">{t('dash.detail.staffNote', { note: staffObs[i] })}</p>}
              {(a.edited_at || a.added_by) && (
                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <UserPen className="w-3 h-3" />
                  {t('dash.ans.byLine', { name: staffName(a.edited_by || a.added_by), at: new Date(a.edited_at || '').toLocaleString() })}
                </p>
              )}
              {hist.length > 0 && (
                <div className="mt-1">
                  <button type="button" className="text-[11px] text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline"
                    onClick={() => setOpenHist(openHist === i ? null : i)}>
                    <History className="w-3 h-3" />{t('dash.ans.history', { n: hist.length })}
                  </button>
                  {openHist === i && (
                    <ol className="mt-2 space-y-2 border-s border-border ps-3">
                      {hist.map((r) => (
                        <li key={r.id} className="text-xs">
                          <p className="text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {staffName(r.edited_by)} · {r.action === 'add' ? t('dash.ans.actAdd') : t('dash.ans.actEdit')}</p>
                          {r.old_transcript != null && <p className="line-through text-muted-foreground whitespace-pre-wrap">{r.old_transcript || '—'}</p>}
                          <p className="whitespace-pre-wrap">{r.new_transcript || '—'}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {answers.length === 0 && !adding && <p className="text-xs text-muted-foreground">{t('dash.hist.empty')}</p>}

        {adding && (
          <div className="rounded-lg border border-primary/40 bg-primary-soft/40 p-3 space-y-2">
            <p className="text-xs font-medium">{t('dash.ans.addTitle')}</p>
            <Input value={newQ} onChange={(e) => setNewQ(e.target.value)} maxLength={500} placeholder={t('dash.ans.qPlaceholder')} />
            <Textarea value={newA} onChange={(e) => setNewA(e.target.value)} rows={4} maxLength={5000} placeholder={t('dash.ans.aPlaceholder')} />
            <PiiHint />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewQ(''); setNewA(''); }}>{t('dash.ans.cancel')}</Button>
              <Button size="sm" disabled={busy || !newQ.trim() || !newA.trim()}
                onClick={async () => { if (await save(null, newQ.trim(), newA.trim())) { setAdding(false); setNewQ(''); setNewA(''); } }}>
                {busy && <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />}{t('dash.ans.save')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
