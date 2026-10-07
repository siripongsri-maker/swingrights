import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Search, MessageCircleQuestion, Send, ChevronDown, ArrowRight, Inbox, MessagesSquare, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { LanguageToggle } from '@/components/LanguageToggle';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Illus } from '@/components/Illus';
import { supabase } from '@/integrations/supabase/client';
import { useI18n, type Lang } from '@/i18n';
import type { CaseStatus } from '@/lib/screening';

/** Date format per UI language. Thai keeps the Buddhist-era year and Thai month names. */
const DATE_LOCALE: Record<Lang, string> = { th: 'th-TH', en: 'en-GB', my: 'my-MM', km: 'km-KH', lo: 'lo-LA' };

const formatDateTime = (iso: string, locale = 'th-TH') => {
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
};

const toStatus = (s: string): CaseStatus =>
  s === 'in_progress' || s === 'inprogress' ? 'inprogress'
    : s === 'completed' || s === 'done' ? 'completed'
    : s === 'cancelled' ? 'cancelled' : 'received';

const FN = 'track-case';

/**
 * Normalise typed/pasted codes: uppercase, drop spaces, auto "SW-" prefix.
 * Real codes are "SW-" plus 8 characters that may themselves start with "SW", so only strip a
 * second "SW" when the person clearly typed the prefix too (more than 8 characters left).
 */
const formatCode = (v: string) => {
  let s = v.toUpperCase();
  if (s.startsWith('SW-')) s = s.slice(3);
  let raw = s.replace(/[^A-Z0-9]/g, '');
  if (raw.length > 8 && raw.startsWith('SW')) raw = raw.slice(2);
  return raw ? `SW-${raw}` : '';
};

interface TrackData {
  case_code: string;
  status: string;
  severity: string | null;
  area: string | null;
  cancelled: boolean;
  created_at: string;
  timeline: { status: string; note: string | null; created_at: string }[];
  files?: { audio: string[]; photos: string[] };
  questions: { id: string; question: string; created_at: string; answer_text: string | null; answered_at: string | null }[];
}

interface PublicStats { pending: number; in_progress: number; closed: number }

function StatsChart() {
  const { t } = useI18n();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.rpc('track_public_stats' as never);
        if (data) setStats(data as unknown as PublicStats);
      } catch { /* chart is optional */ }
    })();
  }, []);

  const rows = [
    { key: 'pending' as const, label: t('track.stats.pending'), icon: Inbox, bar: 'bg-muted-foreground/40' },
    { key: 'in_progress' as const, label: t('track.stats.inprogress'), icon: MessagesSquare, bar: 'bg-accent' },
    { key: 'closed' as const, label: t('track.stats.closed'), icon: CheckCircle2, bar: 'bg-primary' },
  ];
  const max = Math.max(1, ...(stats ? rows.map((r) => stats[r.key]) : [1]));

  return (
    <Collapsible className="rounded-2xl border border-border bg-card shadow-card">
      {/* The heading wraps the toggle button (a heading inside a <button> loses its heading role) */}
      <h2 className="m-0">
        <CollapsibleTrigger className="group flex w-full min-h-12 items-center justify-between gap-2 px-4 py-2 text-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="font-subhead text-base font-semibold">{t('track.stats.title')}</span>
          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent>
      <div className="space-y-2.5 px-4 pb-4">
        {rows.map((r) => {
          const n = stats?.[r.key] ?? 0;
          return (
            <div key={r.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <r.icon className="h-3.5 w-3.5" aria-hidden /> {r.label}
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {stats ? n : '-'} <span className="font-normal text-muted-foreground">{t('track.stats.unit')}</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-primary-soft overflow-hidden" role="img" aria-label={`${r.label}: ${stats ? n : '-'} ${t('track.stats.unit')}`}>
                {/* Static bar: no width animation */}
                <div
                  className={`h-full rounded-full ${r.bar}`}
                  style={{ width: stats ? `${Math.max(4, (n / max) * 100)}%` : '4%' }}
                />
              </div>
            </div>
          );
        })}
      </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Track() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const locale = DATE_LOCALE[lang];
  const [params] = useSearchParams();
  // Code handed over from the report success screen via router state (kept out of the URL)
  const stateCode = (useLocation().state as { code?: string } | null)?.code || '';
  const initialCode = params.get('code') || stateCode;
  const [code, setCode] = useState(formatCode(initialCode));
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
        setError(t('track.notfoundHint'));
      } else {
        setData(d as TrackData);
        setAnswers({});
      }
    } catch (e) {
      // track-case answers 404 for an unknown code and 429 after too many lookups. Anything else
      // (offline, server error) is a connection problem, not a typo in the code.
      const status = (e as { context?: { status?: number } })?.context?.status;
      setData(null);
      setError(status === 404 ? t('track.notfoundHint') : status === 429 ? t('track.tooMany') : t('track.lookupFailed'));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialCode) void lookup(initialCode); }, []);

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

  // The first staff question still waiting for an answer gets the single magenta button
  const firstOpenId = data?.questions.find((q) => !(q.answer_text || q.answered_at))?.id ?? null;

  return (
    <PhoneShell title={t('track.header')} onClose={() => navigate('/')} trailing={<LanguageToggle />}>
      <div className="space-y-5">
        <header className="flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="font-display text-2xl font-bold">{t('track.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('track.subtitle')}</p>
          </div>
          <Illus name="mic" eager className="w-20 shrink-0" />
        </header>

        <div className="space-y-2">
          <label htmlFor="track-code" className="block text-sm font-semibold">{t('track.codeLabel')}</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="track-code"
              value={code}
              onChange={(e) => setCode(formatCode(e.target.value))}
              placeholder="SW-XXXXXXXX"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono uppercase tracking-widest h-12 rounded-xl text-base"
              maxLength={24}
              onKeyDown={(e) => e.key === 'Enter' && void lookup(code)}
              aria-invalid={!!error}
              aria-describedby="track-hint track-error"
            />
            {/* One magenta action per screen: search, unless a staff question is waiting for an answer */}
            <Button
              variant={firstOpenId ? 'default' : 'action'}
              size="lg"
              className="h-12 w-full sm:w-auto rounded-xl px-5"
              onClick={() => void lookup(code)}
              disabled={loading || code.length < 4}
              aria-busy={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Search className="w-4 h-4" aria-hidden />}
              {t('track.search.button')}
            </Button>
          </div>
          <p id="track-hint" className="text-[13px] text-muted-foreground">{t('track.codeHint')}</p>
          <p id="track-error" aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">{error ?? ''}</p>
        </div>

        {!data && (
          <p className="text-sm text-muted-foreground">
            {t('track.recoverHint')}{' '}
            <Link to="/recover" className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">{t('track.recoverLink')}</Link>
          </p>
        )}

        {data && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3 shadow-card">
              <div>
                <p className="font-mono text-sm font-semibold tracking-wider">{data.case_code}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.area ?? '-'} · {t('track.savedAt')} {formatDateTime(data.created_at, locale)}
                </p>
              </div>
              <StatusBadge value={toStatus(data.cancelled ? 'cancelled' : data.status)} />
            </div>
            {data.cancelled && (
              <p className="text-sm text-center text-muted-foreground">{t('track.cancelled')}</p>
            )}
            {(() => {
              const st = toStatus(data.cancelled ? 'cancelled' : data.status);
              return (
                <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-accent rtl:-scale-x-100" aria-hidden />
                  <p className="text-sm leading-relaxed"><span className="font-semibold">{t('track.nextTitle')}:</span> {t(`track.next.${st}`)}</p>
                </div>
              );
            })()}

            {data.files && (data.files.audio.length > 0 || data.files.photos.length > 0) && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-card">
                <h2 className="font-subhead font-semibold text-sm">{t('track.files.title')}</h2>
                {data.files.audio.map((u, i) => (
                  <audio key={u} controls preload="none" src={u} className="w-full" aria-label={t('track.files.clip', { n: i + 1 })} />
                ))}
                {data.files.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {data.files.photos.map((u, i) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer noopener">
                        <img src={u} alt={t('track.files.photo', { n: i + 1 })} className="aspect-square w-full object-cover rounded-xl" loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('track.files.note')}</p>
              </div>
            )}

            {data.questions.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-subhead font-semibold text-sm flex items-center gap-2">
                  <MessageCircleQuestion className="w-4 h-4 text-accent" aria-hidden /> {t('track.questions.title')}
                </h2>
                {data.questions.map((q) => {
                  const draft = answers[q.id] ?? { text: '', blob: null, sending: false };
                  return (
                    <div key={q.id} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-card">
                      <p className="text-sm font-medium">{q.question}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(q.created_at, locale)}</p>
                      {q.answer_text || q.answered_at ? (
                        <div className="rounded-xl bg-primary-soft p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t('track.answered')}</p>
                          <p className="text-sm">{q.answer_text || '-'}</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <Textarea
                            value={draft.text}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { ...draft, text: e.target.value } }))}
                            placeholder={t('track.answer.placeholder')}
                            aria-label={q.question}
                            rows={3}
                            maxLength={2000}
                            className="text-base rounded-xl"
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
                            variant={q.id === firstOpenId ? 'action' : 'default'}
                            className="w-full rounded-xl"
                            disabled={draft.sending || (!draft.text.trim() && !draft.blob)}
                            onClick={() => void sendAnswer(q.id)}
                            aria-busy={draft.sending}
                          >
                            {draft.sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden />}
                            {t('track.answer.send')}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <h2 className="font-subhead font-semibold text-sm mb-3">{t('track.timeline')}</h2>
              <ol className="relative border-s-2 border-accent/30 ms-2 space-y-4">
                {data.timeline.map((tItem, i) => (
                  <li key={i} className="ms-4 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className="absolute -start-[7px] mt-1 w-3 h-3 rounded-full bg-accent border-2 border-background animate-pop" style={{ animationDelay: `${i * 80 + 150}ms` }} />
                    <p className="font-mono text-xs text-muted-foreground">{formatDateTime(tItem.created_at, locale)}</p>
                    <div className="mt-1"><StatusBadge value={toStatus(tItem.status)} /></div>
                    {tItem.note && <p className="text-sm text-foreground mt-1">{tItem.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* System-wide overview comes after the person's own result */}
        <StatsChart />

        <div className="text-center">
          <Link to="/" className="inline-flex min-h-11 items-center px-2 text-sm text-accent underline underline-offset-4">
            {t('common.back')}
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
