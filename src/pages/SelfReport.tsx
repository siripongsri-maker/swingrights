import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Leaf, Loader2, MapPin, Paperclip, SendHorizonal, X } from 'lucide-react';
import bloomImg from '@/assets/bloom.png';
import { toast } from 'sonner';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { LanguageToggle } from '@/components/LanguageToggle';
import { SpeakButton } from '@/components/screening/SpeakButton';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { AreaPicker, type AreaValue } from '@/components/screening/AreaPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { formatArea } from '@/lib/thaiGeo';
import { stripImageMetadata } from '@/lib/exif';
import { saveLocalCase, deleteLocalCase } from '@/lib/localCases';
import { cn } from '@/lib/utils';

const MEDIA_FN = 'upload-case-media';

async function uploadOne(kind: 'audio' | 'photo', file: { blob: Blob; name: string; type: string }, caseId: string): Promise<string> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60);
  const path = `cases/${caseId}/${Date.now()}-${safeName}`;
  const fd = new FormData();
  fd.set('kind', kind);
  fd.set('path', path);
  fd.set('file', file.blob, file.name);
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${MEDIA_FN}`, {
    method: 'POST',
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.path) throw new Error(json.error || `upload failed (${res.status})`);
  return json.path;
}

type Stage = 'consent' | 'story' | 'types' | 'photos' | 'area' | 'contact' | 'done';
type Widget = 'consent' | 'types' | 'photos' | 'area' | 'contact' | 'success';

interface ChatMsg {
  id: number;
  role: 'bot' | 'user';
  text?: string;
  audioUrl?: string;
  widget?: Widget;
  resolved?: boolean;
}

const TYPE_KEYS = ['body', 'labor', 'health', 'property', 'other'] as const;
const STAGE_ORDER: Stage[] = ['consent', 'story', 'types', 'photos', 'area', 'contact'];

export default function SelfReport() {
  const { lang, t } = useI18n();

  // ---- chat state ----
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [stage, setStage] = useState<Stage>('consent');
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);

  // ---- form state ----
  const [audio, setAudio] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [draftText, setDraftText] = useState('');
  const [area, setArea] = useState<AreaValue>({ province: '', district: '', subdistrict: '', zip: '', geo: null });
  const [types, setTypes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [photos, setPhotos] = useState<{ blob: Blob; url: string; name: string; type: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [caseCode, setCaseCode] = useState<string | null>(null);

  const stageIdx = STAGE_ORDER.indexOf(stage === 'done' ? 'contact' : stage);

  // ---- chat helpers ----
  const push = (m: Omit<ChatMsg, 'id'>) => {
    const id = ++idRef.current;
    setMsgs((prev) => [...prev, { ...m, id }]);
    return id;
  };

  const resolveWidget = (id: number) =>
    setMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, resolved: true } : m)));

  /** Bot message with a short "typing..." beat for a natural chat feel. */
  const botSay = (m: Omit<ChatMsg, 'id' | 'role'>, delay = 450) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      push({ ...m, role: 'bot' });
    }, delay);
  };

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    botSay({ text: t('report.chat.greet') }, 500);
    window.setTimeout(() => {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        push({ role: 'bot', text: `${t('report.consent.title')} — ${t('report.consent.body')}`, widget: 'consent' });
      }, 650);
    }, 950);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  // ---- stage transitions ----
  const agreeConsent = (msgId: number) => {
    resolveWidget(msgId);
    push({ role: 'user', text: t('report.chat.agreed') });
    setStage('story');
    botSay({ text: `${t('report.story.title')} — ${t('report.story.hint')}` });
  };

  const sendStory = () => {
    const text = draftText.trim() || transcript.trim();
    if (!audio && !text) return;
    const audioUrl = audio ? URL.createObjectURL(audio) : undefined;
    push({ role: 'user', text: text || undefined, audioUrl });
    setDraftText('');
    setStage('types');
    botSay({ text: t('report.type.title'), widget: 'types' });
  };

  const confirmTypes = (msgId: number) => {
    if (!types.length) return;
    resolveWidget(msgId);
    push({ role: 'user', text: types.map((k) => t(`report.type.${k}`)).join(' · ') });
    setStage('photos');
    botSay({ text: t('report.chat.photos.ask'), widget: 'photos' });
  };

  const finishPhotos = (msgId: number) => {
    resolveWidget(msgId);
    push({
      role: 'user',
      text: photos.length ? `${t('report.photo.add').split('(')[0].trim()} ${photos.length} ${t('report.chat.photos.unit')}` : t('report.chat.skipped'),
    });
    setStage('area');
    botSay({ text: `${t('report.area.title')} (${t('common.optional')}) — ${t('report.area.hint')}`, widget: 'area' });
  };

  const finishArea = (msgId: number, skip: boolean) => {
    resolveWidget(msgId);
    const hasArea = !skip && area.province;
    push({ role: 'user', text: hasArea ? formatArea(area.province, area.district, area.subdistrict, lang) : t('report.chat.skipped') });
    setStage('contact');
    botSay({ text: `${t('report.contact.title')} (${t('common.optional')}) — ${t('report.contact.hint')}`, widget: 'contact' });
  };

  // ---- photos ----
  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 3 - photos.length)) {
      if (!/^image\//.test(f.type)) continue;
      const stripped = await stripImageMetadata(f);
      const blob = new Blob([stripped.blob], { type: stripped.blob.type || f.type });
      setPhotos((prev) => [...prev, { blob, url: URL.createObjectURL(blob), name: stripped.name, type: f.type }].slice(0, 3));
    }
  };

  const toggleType = (k: string) =>
    setTypes((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  // ---- submit (unchanged logic) ----
  const submit = async (msgId: number) => {
    if (submitting) return;
    const story = (draftText.trim() || transcript.trim());
    setSubmitting(true);
    resolveWidget(msgId);
    push({ role: 'user', text: name || contact ? `${name || t('report.chat.notSpecified')} · ${contact || t('report.chat.notSpecified')}` : t('report.chat.skipped') });

    const localId = crypto.randomUUID();
    const localRef = {
      consent: { cb1: true, cb2: false, cb3: true },
      reporter: { type: 'self' as const, name, address: '', email: '', phone: contact },
      victim: { name, contact },
      profile: {
        branch: area.province || '', province: area.province, district: area.district,
        subdistrict: area.subdistrict, zip: area.zip ?? '', geo: area.geo ?? null,
        kp: '', gender: '', dob: '', age: '', nationality: '', incidentPlace: '',
        initialViolationTypes: types,
      },
      answers: transcript ? [{ question: 'self_report', cat: 'self_report', frame: '', transcript }] : [],
      extraFacts: story,
      violationDetails: types,
      audioBlobs: audio ? [audio] : [],
      photos: photos.map((p) => ({ blob: p.blob, previewUrl: p.url, name: p.name })),
    };

    const basePayload = {
      consent: true, cb1: true, cb2: false, cb3: true, consent_ai: true,
      source: 'self', report_language: lang,
      reporter: name || contact ? { name, contact, address: '' } : null,
      victim: { name, contact },
      profile: {
        branch: area.province || 'ไม่ระบุ',
        province: area.province, district: area.district, subdistrict: area.subdistrict,
        zip: area.zip ?? '', geo: area.geo ?? null,
        kp: '', incidentPlace: area.province ? formatArea(area.province, area.district, area.subdistrict, lang) : '',
        initialViolationTypes: types,
      },
      answers: transcript ? [{ question: 'self_report', cat: 'self_report', frame: '', transcript }] : [],
      violation_details: types,
      extra_facts: story.slice(0, 5000),
      referrals: [], referral_note: '',
    };

    try {
      const { data: caseId, error: preErr } = await supabase.rpc('submit_case' as never, {
        _payload: { ...basePayload, audio_urls: [], photo_urls: [] },
      } as never);
      if (preErr || !caseId) throw preErr ?? new Error('no case id');
      const id = String(caseId);

      const audioUrls: string[] = [];
      if (audio) {
        const ext = audio.type.includes('mp4') || audio.type.includes('m4a') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
        audioUrls.push(await uploadOne('audio', { blob: audio, name: `voice.${ext}`, type: audio.type }, id));
      }
      const photoUrls: string[] = [];
      for (const p of photos) {
        const ext = (p.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        photoUrls.push(await uploadOne('photo', { blob: p.blob, name: `photo.${ext}`, type: p.type }, id));
      }

      const { data: code, error } = await supabase.rpc('submit_case' as never, {
        _payload: { ...basePayload, audio_urls: audioUrls, photo_urls: photoUrls },
      } as never);
      if (error || !code) throw error ?? new Error('submit failed');

      await deleteLocalCase(localId);
      setCaseCode(String(code));
      setStage('done');
      botSay({ text: t('report.success.title'), widget: 'success' }, 600);
    } catch (e) {
      console.error('self report submit failed:', e instanceof Error ? e.message : 'error');
      await saveLocalCase({
        id: localId,
        kind: 'failed',
        state: localRef,
        audio: audio ? [audio] : [],
        photos: photos.map((p) => ({ blob: p.blob, name: p.name })),
        error: e instanceof Error ? e.message : 'submit failed',
      });
      toast.error(t('report.error'));
      // let the reporter try again
      push({ role: 'bot', text: t('report.error'), widget: 'contact' });
    } finally {
      setSubmitting(false);
    }
  };

  const canSendStory = !!(audio || draftText.trim() || transcript.trim());

  // ---- render one message ----
  const renderMsg = (m: ChatMsg) => {
    const isBot = m.role === 'bot';
    return (
      <div key={m.id} className={cn('flex items-end gap-2 animate-fade-in', isBot ? '' : 'flex-row-reverse')}>
        {isBot && (
          <span className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0 mb-0.5">
            <Leaf className="w-3.5 h-3.5" />
          </span>
        )}
        <div
          className={cn(
            'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
            isBot ? 'bg-muted/70 text-foreground rounded-bl-md' : 'bg-primary text-primary-foreground rounded-br-md',
          )}
        >
          {m.text && (
            <div className="flex items-start gap-2">
              <p className="whitespace-pre-line flex-1">{m.text}</p>
              {isBot && <SpeakButton text={m.text} className="w-8 h-8 [&_svg]:w-4 [&_svg]:h-4 -mr-1 -mt-1" />}
            </div>
          )}
          {m.audioUrl && <audio src={m.audioUrl} controls className="w-full h-9 mt-2" />}

          {/* ---------- interactive widgets ---------- */}
          {m.widget === 'consent' && !m.resolved && (
            <Button size="sm" className="w-full mt-2.5 rounded-xl" onClick={() => agreeConsent(m.id)}>
              <Check className="w-4 h-4 mr-1" /> {t('report.chat.start')}
            </Button>
          )}

          {m.widget === 'types' && !m.resolved && (
            <div className="mt-2.5 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {TYPE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleType(k)}
                    aria-pressed={types.includes(k)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95',
                      types.includes(k) ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    {t(`report.type.${k}`)}
                  </button>
                ))}
              </div>
              <Button size="sm" className="w-full rounded-xl" disabled={!types.length} onClick={() => confirmTypes(m.id)}>
                {t('report.chat.confirm')}
              </Button>
            </div>
          )}

          {m.widget === 'photos' && !m.resolved && (
            <div className="mt-2.5 space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer rounded-xl border border-dashed border-border bg-card px-3 py-2.5">
                <Paperclip className="w-4 h-4 text-muted-foreground" /> {t('report.photo.add')}
                <input type="file" accept="image/*" capture="environment" multiple className="hidden"
                  onChange={(e) => { void addPhotos(e.target.files); e.target.value = ''; }} />
              </label>
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p.url} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                      <button type="button" aria-label="remove" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button size="sm" className="w-full rounded-xl" onClick={() => finishPhotos(m.id)}>
                {photos.length ? t('report.chat.confirm') : t('report.chat.skip')}
              </Button>
            </div>
          )}

          {m.widget === 'area' && !m.resolved && (
            <div className="mt-2.5 space-y-2.5 bg-card rounded-xl p-2.5 border border-border">
              <AreaPicker value={area} onChange={setArea} />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 rounded-xl" disabled={!area.province} onClick={() => finishArea(m.id, false)}>
                  <MapPin className="w-3.5 h-3.5 mr-1" /> {t('report.chat.confirm')}
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => finishArea(m.id, true)}>
                  {t('report.chat.skip')}
                </Button>
              </div>
            </div>
          )}

          {m.widget === 'contact' && !m.resolved && (
            <div className="mt-2.5 space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('report.contact.name')} maxLength={120} className="bg-card h-9 text-sm" />
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t('report.contact.phone')} maxLength={120} className="bg-card h-9 text-sm" />
              <Button size="sm" className="w-full rounded-xl" disabled={submitting} onClick={() => void submit(m.id)}>
                {submitting ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />{t('report.submitting')}</> : t('report.submit')}
              </Button>
            </div>
          )}

          {m.widget === 'success' && caseCode && (
            <div className="mt-3 space-y-3 text-center">
              <img src={bloomImg} alt="" width={1024} height={1024} loading="lazy" className="w-20 h-20 mx-auto animate-pop" />
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">{t('report.success.code')}</p>
                <p className="font-mono text-lg font-bold tracking-widest text-primary">{caseCode}</p>
                <Button
                  size="sm" variant="ghost" className="mt-1 text-xs h-7"
                  onClick={() => { void navigator.clipboard?.writeText(caseCode); toast.success(<Check className="inline w-3.5 h-3.5" />); }}
                >
                  <Copy className="w-3 h-3 mr-1" /> {caseCode}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{t('report.success.hint')}</p>
              <div className="grid gap-1.5">
                <Button asChild size="sm" className="rounded-xl"><Link to={`/track?code=${caseCode}`}>{t('report.success.track')}</Link></Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl"><Link to="/report" onClick={() => window.location.reload()}>{t('report.success.new')}</Link></Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PhoneShell contained={false} title={t('report.title')} onClose={() => { window.location.href = '/'; }} trailing={<LanguageToggle />}>
      <div className="flex flex-col h-[calc(100dvh-9rem)] max-h-[46rem]">
        {/* progress */}
        <div className="flex gap-1.5 px-4 pt-3 pb-1" aria-hidden>
          {STAGE_ORDER.map((s, i) => (
            <span key={s} className={cn('h-1 flex-1 rounded-full transition-colors', i <= stageIdx ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>

        {/* chat thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
          {msgs.map(renderMsg)}
          {typing && (
            <div className="flex items-end gap-2 animate-fade-in">
              <span className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <Leaf className="w-3.5 h-3.5" />
              </span>
              <span className="rounded-2xl rounded-bl-md bg-muted/70 px-4 py-3 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          )}
        </div>

        {/* composer — active while answering the story question */}
        {stage === 'story' && (
          <div className="border-t border-border bg-card/95 backdrop-blur px-3 py-3 space-y-2.5">
            <VoiceRecorder compact onChange={(b, tx) => { setAudio(b); setTranscript(tx); }} />
            <div className="flex items-end gap-2">
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSendStory) sendStory(); } }}
                placeholder={transcript || t('report.chat.input.placeholder')}
                rows={2}
                maxLength={5000}
                className="flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                size="icon"
                className="w-11 h-11 rounded-full shrink-0"
                disabled={!canSendStory}
                aria-label={t('report.chat.send')}
                onClick={sendStory}
              >
                <SendHorizonal className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* back link for pre-chat */}
        {stage === 'consent' && (
          <div className="border-t border-border px-4 py-2.5">
            <Button asChild variant="ghost" size="sm" className="text-xs -ml-2">
              <Link to="/"><ArrowLeft className="w-3.5 h-3.5 mr-1" />{t('common.back')}</Link>
            </Button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
