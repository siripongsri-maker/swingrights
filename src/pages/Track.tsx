import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Search, MessageCircleQuestion, Send } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { LanguageToggle } from '@/components/LanguageToggle';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import type { CaseStatus } from '@/lib/screening';
import plantImg from '@/assets/track-plant.png';

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
};

const toStatus = (s: string): CaseStatus =>
  s === 'in_progress' || s === 'inprogress' ? 'inprogress'
    : s === 'completed' || s === 'done' ? 'completed'
    : s === 'cancelled' ? 'cancelled' : 'received';

const FN = 'track-case';

interface TrackData {
  case_code: string;
  status: string;
  severity: string | null;
  area: string | null;
  cancelled: boolean;
  created_at: string;
  timeline: { status: string; note: string | null; created_at: string }[];
  questions: { id: string; question: string; created_at: string; answer_text: string | null; answered_at: string | null }[];
}

export default function Track() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get('code') || '').toUpperCase());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { text: string; blob: Blob | null; sending: boolean }>>({});

  const lookup = async (c: string) => {
    const cc = c.trim().toUpperCase();
    if (!cc) return;
    setLoading(true);
    setError(null);
    try {
      const { data: d, error: fnErr } = await supabase.functions.invoke(FN, { body: { case_code: cc } });
      if (fnErr) throw fnErr;
      if ((d as { error?: string })?.error === 'not_found' || !d) {
        setData(null);
        setError(t('track.notfound'));
      } else {
        setData(d as TrackData);
        setAnswers({});
      }
    } catch {
      setData(null);
      setError(t('track.notfound'));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (params.get('code')) void lookup(params.get('code')!); }, []);

  const sendAnswer = async (qid: string) => {
    const a = answers[qid];
    const text = (a?.text ?? '').trim();
    const blob = a?.blob ?? null;
    if (!text && !blob) return;
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], sending: true } }));
    try {
      let audioUrl: string | null = null;
      if (blob) {
        const ext = blob.type.includes('mp4') || blob.type.includes('m4a') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const path = `cases/${data!.case_code}/${Date.now()}-answer.${ext}`;
        const fd = new FormData();
        fd.set('kind', 'audio');
        fd.set('path', path);
        fd.set('file', blob, `answer.${ext}`);
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-case-media`, {
          method: 'POST',
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: fd,
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.path) audioUrl = json.path;
      }
      const { error: rpcErr } = await supabase.rpc('answer_case_question' as never, {
        _case_code: data!.case_code,
        _question_id: qid,
        _answer_text: text || null,
        _answer_audio_url: audioUrl,
      } as never);
      if (rpcErr) throw rpcErr;
      toast.success(t('track.answer.thanks'));
      await lookup(data!.case_code);
    } catch {
      toast.error(t('track.answer.error'));
      setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], sending: false } }));
    }
  };

  return (
    <PhoneShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">{t('track.header')}</p>
            <h1 className="font-display text-2xl font-bold mt-1">{t('track.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('track.subtitle')}</p>
          </div>
          <LanguageToggle />
        </div>

        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SW-XXXXXXXX"
            className="font-mono tracking-widest"
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && void lookup(code)}
            aria-label={t('track.title')}
          />
          <Button onClick={() => void lookup(code)} disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive text-center py-4 animate-fade-in">{error}</p>}

        {!data && !error && !loading && (
          <div className="py-4 text-center animate-fade-in">
            <img src={plantImg} alt="" width={1024} height={1024} loading="lazy" className="w-28 h-28 mx-auto animate-sway" />
          </div>
        )}

        {data && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold tracking-wider">{data.case_code}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.area ?? '—'} · {t('track.savedAt')} {formatDateTime(data.created_at)}
                </p>
              </div>
              <StatusBadge value={toStatus(data.cancelled ? 'cancelled' : data.status)} />
            </div>
            {data.cancelled && (
              <p className="text-xs text-center text-muted-foreground">{t('track.cancelled')}</p>
            )}

            {data.questions.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display font-semibold text-sm flex items-center gap-2">
                  <MessageCircleQuestion className="w-4 h-4 text-primary" /> {t('track.questions.title')}
                </h2>
                {data.questions.map((q) => {
                  const draft = answers[q.id] ?? { text: '', blob: null, sending: false };
                  return (
                    <div key={q.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                      <p className="text-sm font-medium">{q.question}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDateTime(q.created_at)}</p>
                      {q.answer_text || q.answered_at ? (
                        <div className="rounded-xl bg-muted/60 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t('track.answered')}</p>
                          <p className="text-sm">{q.answer_text || '—'}</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <Textarea
                            value={draft.text}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { ...draft, text: e.target.value } }))}
                            placeholder={t('track.answer.placeholder')}
                            rows={3}
                            maxLength={2000}
                            className="text-sm"
                          />
                          <VoiceRecorder
                            compact
                            onChange={(blob, tx) => setAnswers((prev) => ({
                              ...prev,
                              [q.id]: { ...draft, blob, text: tx || prev[q.id]?.text || '' },
                            }))}
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={draft.sending || (!draft.text.trim() && !draft.blob)}
                            onClick={() => void sendAnswer(q.id)}
                          >
                            {draft.sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 me-1 rtl:-scale-x-100" />{t('track.answer.send')}</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <h2 className="font-display font-semibold text-sm mb-3">Timeline</h2>
              <ol className="relative border-s-2 border-primary/25 ms-2 space-y-4">
                {data.timeline.map((tItem, i) => (
                  <li key={i} className="ms-4 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className="absolute -start-[7px] mt-1 w-3 h-3 rounded-full bg-primary border-2 border-background animate-pop" style={{ animationDelay: `${i * 80 + 150}ms` }} />
                    <p className="text-sm font-medium">
                      <StatusBadge value={toStatus(tItem.status)} />
                    </p>
                    {tItem.note && <p className="text-xs text-muted-foreground mt-0.5">{tItem.note}</p>}
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(tItem.created_at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link to="/" className="text-xs text-primary underline underline-offset-4">
            ← {t('common.back')}
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
