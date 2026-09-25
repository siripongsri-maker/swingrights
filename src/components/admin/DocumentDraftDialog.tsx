import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileCheck2, FileInput, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { printCaseDocument, type DocInput, type DocKind, type ReviewedDocumentDraft } from '@/lib/caseDocuments';
import { toast } from 'sonner';

const FIELDS = ['overview', 'details', 'impact', 'actions'] as const;
type Field = typeof FIELDS[number];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  kind: DocKind;
  input: DocInput;
  existing?: ReviewedDocumentDraft | null;
  onSaved?: () => void;
}

const emptyDraft = (): ReviewedDocumentDraft => ({ overview: '', details: '', impact: '', actions: '' });

export function DocumentDraftDialog({ open, onOpenChange, caseId, kind, input, existing, onSaved }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ReviewedDocumentDraft>(emptyDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const title = t(`docs.${kind}.title`);
  const hasExisting = useMemo(() => !!existing?.reviewed_at, [existing]);

  const generate = async () => {
    setLoading(true);
    setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('draft-case-document', {
      body: { case_id: caseId, kind },
    });
    setLoading(false);
    const message = (data as { error?: string } | null)?.error || invokeError?.message;
    if (message) { setError(message); return; }
    const response = data as { draft?: ReviewedDocumentDraft; generated_at?: string } | null;
    const next = response?.draft;
    if (!next) { setError(t('docs.review.generateFailed')); return; }
    setDraft({ ...next, generated_at: response?.generated_at || new Date().toISOString() });
  };

  useEffect(() => {
    if (!open) return;
    setError('');
    if (existing) setDraft(existing);
    else { setDraft(emptyDraft()); void generate(); }
    // Generate only when the selected document dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);

  const fillFromCase = () => {
    const date = new Date(input.createdAt || Date.now()).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const profile = (input.profile ?? {}) as Record<string, unknown>;
    const person = [profile.nationality && `สัญชาติ${profile.nationality}`, profile.gender && `เพศ${profile.gender}`, profile.age && `อายุ ${profile.age} ปี`].filter(Boolean).join ' ' as never;
    const answerLines = (input.answers ?? [])
      .map((a) => {
        const text = (a as { transcript?: string; answer_text?: string }).transcript || (a as { answer_text?: string }).answer_text || '';
        return text ? `• ${a.question}\n  ${text}` : `• ${a.question}`;
      })
      .join('\n');
    const screening = (input.screening ?? {}) as Record<string, unknown>;
    const screeningLine = [
      screening.q2_score != null && `2Q: ${screening.q2_score}`,
      screening.q9_total != null && `9Q: ${screening.q9_total}`,
      screening.nrm && `NRM: ${screening.nrm}`,
    ].filter(Boolean).join(' · ');
    setDraft({
      overview: [
        `รหัสเคส ${input.caseCode ?? '-'} · รับเรื่องวันที่ ${date}`,
        person ? `ผู้รับบริการ: ${person}` : '',
        input.severity ? `ระดับความรุนแรง: ${input.severity}` : '',
      ].filter(Boolean).join('\n'),
      details: [answerLines, input.extraFacts ? `\nข้อเท็จจริงเพิ่มเติม: ${input.extraFacts}` : ''].filter(Boolean).join('\n'),
      impact: [
        input.violationDetails?.length ? `ประเด็นการละเมิด: ${input.violationDetails.join(', ')}` : '',
        screeningLine ? `ผลคัดกรอง: ${screeningLine}` : '',
      ].filter(Boolean).join('\n'),
      actions: [
        input.staffObs?.length ? `บันทึกเจ้าหน้าที่:\n${input.staffObs.map((o) => `• ${o}`).join('\n')}` : '',
        input.referrals?.length ? `การส่งต่อ: ${input.referrals.join(', ')}` : '',
        input.referralNote ? `หมายเหตุการส่งต่อ: ${input.referralNote}` : '',
      ].filter(Boolean).join('\n\n'),
      generated_at: draft.generated_at,
    });
    toast.success(t('docs.review.fillFromCase'));
  };

  const confirmAndPrint = async () => {
    if (FIELDS.some((field) => !draft[field].trim())) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const reviewed: ReviewedDocumentDraft = {
      ...draft,
      generated_at: draft.generated_at || new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user?.id,
    };
    const { data: current, error: readError } = await supabase.from('cases').select('document_drafts').eq('id', caseId).single();
    if (readError) { setSaving(false); toast.error(t('docs.review.saveFailed')); return; }
    const currentDrafts = ((current as { document_drafts?: Record<string, unknown> } | null)?.document_drafts ?? {});
    const { error: saveError } = await supabase.from('cases').update({ document_drafts: { ...currentDrafts, [kind]: reviewed } } as never).eq('id', caseId);
    setSaving(false);
    if (saveError) { toast.error(t('docs.review.saveFailed')); return; }
    printCaseDocument(kind, { ...input, documentDraft: reviewed });
    toast.success(t('docs.review.saved'));
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2"><FileCheck2 className="w-5 h-5 text-primary" />{t('docs.review.title')} · {title}</DialogTitle>
          <DialogDescription>{t('docs.review.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 space-y-4">
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground flex gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-foreground shrink-0 mt-0.5" />
            <span>{t('docs.review.disclaimer')}</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground"><Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />{t('docs.review.generating')}</div>
          ) : error ? (
            <div className="py-8 text-center"><p className="text-sm text-destructive mb-4">{error}</p><Button variant="outline" onClick={() => void generate()}><RotateCcw className="w-4 h-4" />{t('docs.review.regenerate')}</Button></div>
          ) : (
            <div className="space-y-4">
              {hasExisting && existing?.reviewed_at && <p className="text-xs text-muted-foreground">{t('docs.review.lastReviewed', { date: new Date(existing.reviewed_at).toLocaleString() })}</p>}
              {FIELDS.map((field) => (
                <label key={field} className="block space-y-1.5">
                  <span className="text-sm font-medium">{t(`docs.field.${kind}.${field}`)}</span>
                  <Textarea value={draft[field]} onChange={(event) => setDraft((value) => ({ ...value, [field]: event.target.value }))} className="min-h-[92px]" />
                </label>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('docs.review.cancel')}</Button>
          <Button variant="outline" disabled={loading || saving} onClick={() => void generate()}><RotateCcw className="w-4 h-4" />{t('docs.review.regenerate')}</Button>
          <Button disabled={loading || saving || FIELDS.some((field) => !draft[field].trim())} onClick={() => void confirmAndPrint()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}{t('docs.review.confirmPrint')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}