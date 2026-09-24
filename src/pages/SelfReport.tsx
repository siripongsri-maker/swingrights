import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { rememberReportCode } from '@/lib/myReports';
import { supabase as sbAuth } from '@/integrations/supabase/client';
import { ArrowLeft, Building2, Check, Copy, Loader2, MapPin, Paperclip, Phone, SendHorizonal, X } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { LanguageToggle } from '@/components/LanguageToggle';
import { SpeakButton } from '@/components/screening/SpeakButton';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { AreaPicker, type AreaValue } from '@/components/screening/AreaPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { formatArea } from '@/lib/thaiGeo';
import { stripImageMetadata } from '@/lib/exif';
import { saveLocalCase, deleteLocalCase } from '@/lib/localCases';
import { cn } from '@/lib/utils';
import { PiiHint, usePiiGuard } from '@/lib/piiGuard';
import { BrandMark } from '@/components/BrandLogo';
import { PartnerBar } from '@/components/PartnerBar';

const MEDIA_FN = 'upload-case-media';

async function uploadOne(kind: 'audio' | 'photo', file: { blob: Blob; name: string; type: string }, folder: string): Promise<string> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60);
  const path = `cases/${folder}/${Date.now()}-${safeName}`;
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

type Stage = 'consent' | 'about' | 'story' | 'types' | 'probe' | 'photos' | 'area' | 'contact' | 'partners' | 'done';
type Widget = 'consent' | 'about' | 'types' | 'probe' | 'photos' | 'area' | 'contact' | 'partners' | 'success';

interface ChatMsg {
  id: number;
  role: 'bot' | 'user';
  text?: string;
  audioUrl?: string;
  widget?: Widget;
  resolved?: boolean;
}

const TYPE_KEYS = ['body', 'labor', 'health', 'property', 'other'] as const;
// Probe: sequential follow-up questions asked one at a time after the story
const PROBE_IDS = ['when', 'where', 'who', 'safety', 'needs'] as const;
type ProbeId = (typeof PROBE_IDS)[number];
const SAFETY_CHOICES = ['safe', 'unsure', 'unsafe'] as const;

interface Partner {
  id: string;
  name: string;
  org_type: string | null;
  province: string | null;
  district: string | null;
  phone: string | null;
  services: unknown;
}

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
  // free-text "full story" — editable before and after the AI follow-ups
  const [fullStory, setFullStory] = useState('');
  const [storyOpen, setStoryOpen] = useState(false);
  const [area, setArea] = useState<AreaValue>({ province: '', district: '', subdistrict: '', zip: '', geo: null });
  const [types, setTypes] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [photos, setPhotos] = useState<{ blob: Blob; url: string; name: string; type: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [caseCode, setCaseCode] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  // ---- basic profile questions (nationality / gender / age — all optional) ----
  const [nationality, setNationality] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');

  // ---- probe state (sequential probing questions) ----
  const [probeIdx, setProbeIdx] = useState(0);
  const [probeAnswers, setProbeAnswers] = useState<Partial<Record<ProbeId, { text: string; blob: Blob | null }>>>({});
  const [probeBlob, setProbeBlob] = useState<Blob | null>(null);
  const [probeTranscript, setProbeTranscript] = useState('');
  const [probeDraft, setProbeDraft] = useState('');
  const [safetyRisk, setSafetyRisk] = useState(false);

  // ---- live AI follow-up: reads each answer and asks about what was actually said ----
  const MAX_FU = 2;
  const fuCountRef = useRef(0);
  const fuRef = useRef<{ q: string; after: () => void } | null>(null);
  const [fuActive, setFuActive] = useState(false);
  const [followups, setFollowups] = useState<{ q: string; text: string }[]>([]);
  const heardRef = useRef<string[]>([]);
  const askFollowUp = async (latest: string, question: string, after: () => void, fresh: boolean) => {
    if (fresh) fuCountRef.current = 0;
    const done = () => { fuRef.current = null; setFuActive(false); fuCountRef.current = 0; after(); };
    if (!latest.trim() || fuCountRef.current >= MAX_FU) return done();
    heardRef.current.push(`Q: ${question}\nA: ${latest}`);
    setTyping(true);
    try {
      const { data, error } = await supabase.functions.invoke('followup-question', {
        body: {
          text: heardRef.current.join('\n\n').slice(-7500),
          context: `Current question: ${question}\nLATEST answer (build the follow-up on this): ${latest}`.slice(0, 5900),
          lang,
        },
      });
      setTyping(false);
      const q = !error && data?.next_question ? String(data.next_question).trim() : '';
      if (q && data.next_slot !== 'none') {
        fuCountRef.current += 1;
        fuRef.current = { q, after };
        setFuActive(true);
        push({ role: 'bot', text: q, widget: 'probe' });
        return;
      }
    } catch { setTyping(false); }
    done();
  };

  // ---- referral partners ----
  const [partners, setPartners] = useState<Partner[]>([]);

  const stageIdx = STAGE_ORDER.indexOf(stage === 'done' || stage === 'partners' ? 'contact' : stage);

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

  // Registered client: prefill name/phone from profile; phone is confirmed later at the contact stage.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      setSignedIn(true);
      const { data: prof } = await supabase
        .from('client_profiles')
        .select('first_name,last_name,phone,gender,birthdate')
        .eq('id', uid)
        .maybeSingle();
      if (prof?.phone) setProfilePhone(prof.phone);
      const fullName = [prof?.first_name, prof?.last_name].filter(Boolean).join(' ').trim();
      if (fullName) setName((prev) => prev || fullName);
      if (prof?.gender) setGender((prev) => prev || String(prof.gender));
      if (prof?.birthdate) {
        const years = Math.floor((Date.now() - new Date(prof.birthdate).getTime()) / (365.25 * 24 * 3600 * 1000));
        if (years > 0 && years < 120) setAge((prev) => prev || String(years));
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  // ---- stage transitions ----
  const agreeConsent = (msgId: number) => {
    resolveWidget(msgId);
    push({ role: 'user', text: t('report.chat.agreed') });
    setStage('about');
    botSay({ text: `${t('report.about.title')} — ${t('report.about.hint')}`, widget: 'about' });
  };

  const finishAbout = (msgId: number) => {
    resolveWidget(msgId);
    const parts: string[] = [];
    if (nationality.trim()) parts.push(`${t('report.about.nationality')}: ${nationality.trim()}`);
    if (gender) parts.push(`${t('report.about.gender')}: ${t(`report.about.gender.${gender}`)}`);
    if (age.trim()) parts.push(`${t('report.about.age')}: ${age.trim()}`);
    push({ role: 'user', text: parts.length ? parts.join(' · ') : t('report.chat.skipped') });
    setStage('story');
    botSay({ text: `${t('report.story.title')} — ${t('report.story.hint')}` });
  };

  const sendStory = () => {
    const text = draftText.trim() || transcript.trim();
    if (!audio && !text) return;
    const audioUrl = audio ? URL.createObjectURL(audio) : undefined;
    push({ role: 'user', text: text || undefined, audioUrl });
    if (text) setFullStory((prev) => (prev.trim() ? prev : text));
    setDraftText('');
    setFuActive(true);
    void askFollowUp(text, t('report.story.title'), () => {
      setStage('types');
      botSay({ text: t('report.type.title'), widget: 'types' });
    }, true);
  };

  const confirmTypes = (msgId: number) => {
    resolveWidget(msgId);
    const other = types.includes('other') && otherText.trim() ? otherText.trim() : '';
    push({
      role: 'user',
      text: types.length
        ? types.map((k) => t(`report.type.${k}`)).join(' · ') + (other ? ` — ${other}` : '')
        : t('report.chat.skipped'),
    });
    // move into the sequential probing interview
    setStage('probe');
    setProbeIdx(0);
    botSay({ text: t('report.probe.intro') });
    botSay({ text: probeQuestionText(0), widget: 'probe' }, 1100);
  };

  const probeQuestionText = (i: number) =>
    `${t('report.probe.count', { i: i + 1, n: PROBE_IDS.length })} — ${t(`report.probe.${PROBE_IDS[i]}.q`)}`;

  /** Answer (or skip) the current probe question, then ask the next one. */
  const answerProbe = (msgId: number, answer: { text: string; blob: Blob | null } | null) => {
    resolveWidget(msgId);
    if (fuRef.current) {
      const { q, after } = fuRef.current;
      fuRef.current = null;
      setProbeBlob(null); setProbeTranscript(''); setProbeDraft('');
      if (!answer) { push({ role: 'user', text: t('report.chat.skipped') }); setFuActive(false); fuCountRef.current = 0; after(); return; }
      push({ role: 'user', text: answer.text || undefined, audioUrl: answer.blob ? URL.createObjectURL(answer.blob) : undefined });
      if (answer.text) setFollowups((prev) => [...prev, { q, text: answer.text }]);
      void askFollowUp(answer.text, q, after, false);
      return;
    }
    const qid = PROBE_IDS[probeIdx];
    if (answer) {
      setProbeAnswers((prev) => ({ ...prev, [qid]: answer }));
      push({
        role: 'user',
        text: answer.text || undefined,
        audioUrl: answer.blob ? URL.createObjectURL(answer.blob) : undefined,
      });
      if (qid === 'safety' && /ไม่ปลอดภัย|not safe|မလုံခြုံ|មិនសុវត្ថិ|ບໍ່ປອດໄພ/i.test(answer.text)) {
        setSafetyRisk(true);
        botSay({ text: t('report.probe.safety.alert') });
      }
    } else {
      push({ role: 'user', text: t('report.chat.skipped') });
    }
    // reset per-question recorder state
    setProbeBlob(null);
    setProbeTranscript('');
    setProbeDraft('');
    const next = probeIdx + 1;
    const advance = () => {
      if (next < PROBE_IDS.length) {
        setProbeIdx(next);
        botSay({ text: probeQuestionText(next), widget: 'probe' }, answer && qid === 'safety' && safetyRisk ? 1400 : 700);
      } else {
        setStage('photos');
        botSay({ text: t('report.chat.photos.ask'), widget: 'photos' }, 700);
      }
    };
    if (answer?.text && qid !== 'safety') void askFollowUp(answer.text, t(`report.probe.${qid}.q`), advance, true);
    else advance();
  };

  const sendProbeAnswer = (msgId: number) => {
    const text = probeDraft.trim() || probeTranscript.trim();
    if (!text && !probeBlob) return;
    answerProbe(msgId, { text, blob: probeBlob });
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
    botSay({ text: `${t('report.contact.title')} — ${t('report.contact.hint')}`, widget: 'contact' });
  };

  // ---- referral partners: matched for staff only; reporter sees next steps ----
  const startPartners = async (msgId: number, phoneOverride?: string) => {
    const phone = phoneOverride ?? contact;
    const digits = phone.replace(/[^\d]/g, '');
    if (!/^\+?[\d\s\-()]+$/.test(phone.trim()) || digits.length < 9 || digits.length > 15) {
      toast.error(t('report.contact.phoneInvalid'));
      return;
    }
    if (phoneOverride) setContact(phoneOverride);
    resolveWidget(msgId);
    push({ role: 'user', text: `${name || t('report.chat.notSpecified')} · ${phone}` });
    setStage('partners');
    setTyping(true);
    let found: Partner[] = [];
    try {
      const { data } = await supabase
        .from('referral_partners')
        .select('id,name,org_type,province,district,phone,services')
        .eq('active', true)
        .limit(60);
      const all = (data ?? []) as unknown as Partner[];
      const prov = area.province.replace(/^จังหวัด/, '');
      const local = prov ? all.filter((p) => p.province && p.province.includes(prov)) : [];
      const national = all.filter((p) => !p.province);
      found = [...local, ...national.filter((n) => !local.some((l) => l.id === n.id))].slice(0, 5);
    } catch {
      found = [];
    }
    setPartners(found);
    setTyping(false);
    botSay({ text: t('report.partners.title'), widget: 'partners' }, 200);
  };

  // ---- photos ----
  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 3 - photos.length)) {
      if (!/^image\//.test(f.type)) continue;
      const stripped = await stripImageMetadata(f);
      const blob = new Blob([stripped.blob], { type: stripped.blob.type || f.type });
      setPhotos((prev) => [...prev, { blob, url: URL.createObjectURL(blob), name: stripped.name, type: blob.type || 'image/jpeg' }].slice(0, 3));
    }
  };

  const toggleType = (k: string) =>
    setTypes((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  // ---- submit (single submit_case call) ----
  const piiGuard = usePiiGuard();
  const submit = async (msgId: number) => {
    if (submitting) return;
    const story = (fullStory.trim() || draftText.trim() || transcript.trim());
    const piiResult = await piiGuard.check(story, ...PROBE_IDS.map((qid) => probeAnswers[qid]?.text));
    if (piiResult === 'edit') return;
    setSubmitting(true);
    resolveWidget(msgId);
    push({ role: 'user', text: t('report.partners.ack') });

    const localId = crypto.randomUUID();
    const probeDigest = PROBE_IDS.map((qid) => {
      const a = probeAnswers[qid];
      return a?.text ? `${t(`report.probe.${qid}.q`)} → ${a.text}` : null;
    }).concat(followups.map((f) => `${f.q} → ${f.text}`)).filter(Boolean).join('\n');
    const answersArr = [
      ...(transcript ? [{ question: 'self_report', cat: 'self_report', frame: '', transcript }] : []),
      ...PROBE_IDS.filter((qid) => probeAnswers[qid]?.text).map((qid) => ({
        question: t(`report.probe.${qid}.q`), cat: 'self_probe', frame: '', transcript: probeAnswers[qid]!.text,
      })),
      ...followups.map((f) => ({ question: f.q, cat: 'self_followup', frame: '', transcript: f.text })),
    ];

    const localRef = {
      consent: { cb1: true, cb2: false, cb3: true },
      reporter: { type: 'self' as const, name, address: '', email: '', phone: contact },
      victim: { name, contact },
      profile: {
        branch: area.province || '', province: area.province, district: area.district,
        subdistrict: area.subdistrict, zip: area.zip ?? '', geo: area.geo ?? null,
        kp: '', gender, dob: '', age: age.trim(), nationality: nationality.trim(), incidentPlace: '',
        initialViolationTypes: types,
      },
      answers: answersArr,
      extraFacts: `${story}\n${probeDigest}${otherText.trim() ? `\n${t('report.type.other')}: ${otherText.trim()}` : ''}`.trim(),
      violationDetails: types,
      audioBlobs: [audio, ...PROBE_IDS.map((q) => probeAnswers[q]?.blob ?? null)].filter((b): b is Blob => !!b),
      photos: photos.map((p) => ({ blob: p.blob, previewUrl: p.url, name: p.name })),
    };

    const basePayload = {
      consent: true, cb1: true, cb2: false, cb3: true, consent_ai: true,
      source: 'self', language: lang,
      reporter: name || contact ? { name, contact, address: '' } : null,
      victim: { name, contact },
      profile: {
        branch: area.province || 'ไม่ระบุ',
        province: area.province, district: area.district, subdistrict: area.subdistrict,
        zip: area.zip ?? '', geo: area.geo ?? null,
        kp: '', gender, age: age.trim(), nationality: nationality.trim(),
        incidentPlace: area.province ? formatArea(area.province, area.district, area.subdistrict, lang) : '',
        initialViolationTypes: types,
      },
      answers: answersArr,
      violation_details: types,
      extra_facts: `${story}\n${probeDigest}${otherText.trim() ? `\n${t('report.type.other')}: ${otherText.trim()}` : ''}`.trim().slice(0, 5000),
      pii_flag: piiResult === 'send',
      referrals: partners.slice(0, 3).map((p) => ({
        org_name: p.name, phone: p.phone ?? '', note: t('report.partners.noteAuto'),
      })),
      referral_note: '',
      // flag red severity when the reporter says they are not safe
      ...(safetyRisk ? { severity: 'red' } : {}),
    };

    try {
      // Upload media FIRST under a pre-generated folder, then create the case ONCE.
      const mediaFolder = crypto.randomUUID();
      const audioUrls: string[] = [];
      if (audio) {
        const ext = audio.type.includes('mp4') || audio.type.includes('m4a') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
        audioUrls.push(await uploadOne('audio', { blob: audio, name: `voice.${ext}`, type: audio.type }, mediaFolder));
      }
      for (const qid of PROBE_IDS) {
        const b = probeAnswers[qid]?.blob;
        if (b) {
          const ext = b.type.includes('mp4') || b.type.includes('m4a') ? 'm4a' : b.type.includes('ogg') ? 'ogg' : 'webm';
          audioUrls.push(await uploadOne('audio', { blob: b, name: `probe-${qid}.${ext}`, type: b.type }, mediaFolder));
        }
      }
      const photoUrls: string[] = [];
      for (const p of photos) {
        const ext = (p.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        photoUrls.push(await uploadOne('photo', { blob: p.blob, name: `photo.${ext}`, type: p.type }, mediaFolder));
      }

      const { data: code, error } = await supabase.rpc('submit_case' as never, {
        _payload: { ...basePayload, audio_urls: audioUrls, photo_urls: photoUrls },
      } as never);
      if (error || !code) throw error ?? new Error('submit failed');

      await deleteLocalCase(localId);
      rememberReportCode(String(code));
      void sbAuth.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); if (data.session) void sbAuth.rpc('link_my_cases' as never, { _codes: [String(code)] } as never); });
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
      push({ role: 'bot', text: t('report.error'), widget: 'partners' });
    } finally {
      setSubmitting(false);
    }
  };

  const canSendStory = !!(audio || draftText.trim() || transcript.trim());
  const phoneDigits = contact.replace(/[^\d]/g, '');
  const phoneOk = /^\+?[\d\s\-()]+$/.test(contact.trim()) && phoneDigits.length >= 9 && phoneDigits.length <= 15;
  const currentProbeId: ProbeId = PROBE_IDS[Math.min(probeIdx, PROBE_IDS.length - 1)];
  const answeredProbeCount = PROBE_IDS.filter((q) => probeAnswers[q]?.text).length;

  // ---- render one message ----
  const renderMsg = (m: ChatMsg) => {
    const isBot = m.role === 'bot';
    return (
      <div key={m.id} className={cn('flex items-end gap-2 animate-fade-in', isBot ? '' : 'flex-row-reverse')}>
        {isBot && (
          <span className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0 mb-0.5">
            <BrandMark className="h-5 w-5" />
          </span>
        )}
        <div
          className={cn(
            'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
            isBot ? 'bg-card border border-border text-foreground rounded-es-lg' : 'bg-primary-soft text-foreground rounded-ee-lg',
          )}
        >
          {m.text && (
            <div className="flex items-start gap-2">
              <p className="whitespace-pre-line flex-1">{m.text}</p>
              {isBot && <SpeakButton text={m.text} className="w-8 h-8 [&_svg]:w-4 [&_svg]:h-4 -me-1 -mt-1" />}
            </div>
          )}
          {m.audioUrl && <audio src={m.audioUrl} controls className="w-full h-9 mt-2" />}

          {/* ---------- interactive widgets ---------- */}
          {m.widget === 'consent' && !m.resolved && (
            <Button size="sm" className="w-full mt-2.5 rounded-xl" onClick={() => agreeConsent(m.id)}>
              <Check className="w-4 h-4 me-1" /> {t('report.chat.start')}
            </Button>
          )}

          {m.widget === 'about' && !m.resolved && (
            <div className="mt-2.5 space-y-2.5">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('report.about.nationality')}</p>
                <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder={t('report.about.nationalityPh')} maxLength={60} className="bg-card h-9 text-sm" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('report.about.gender')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['male', 'female', 'diverse', 'unspecified'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender((prev) => (prev === g ? '' : g))}
                      aria-pressed={gender === g}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95',
                        gender === g ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-muted-foreground',
                      )}
                    >
                      {t(`report.about.gender.${g}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('report.about.age')}</p>
                <Input value={age} onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, '').slice(0, 3))} placeholder={t('report.about.agePh')} inputMode="numeric" className="bg-card h-9 text-sm w-28" />
              </div>
              <Button size="sm" className="w-full rounded-xl" onClick={() => finishAbout(m.id)}>
                {nationality.trim() || gender || age.trim() ? t('report.chat.confirm') : t('report.chat.skip')}
              </Button>
            </div>
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
              {types.includes('other') && (
                <Input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder={t('report.type.otherPh')}
                  maxLength={200}
                  className="h-9 text-sm rounded-xl"
                />
              )}
              <Button size="sm" className="w-full rounded-xl" onClick={() => confirmTypes(m.id)}>
                {types.length ? t('report.chat.confirm') : t('report.chat.skip')}
              </Button>
            </div>
          )}

          {m.widget === 'probe' && !m.resolved && (
            <div className="mt-2.5 space-y-2.5">
              {/* quick choices for the safety question */}
              {currentProbeId === 'safety' && !fuActive && (
                <div className="flex flex-wrap gap-1.5">
                  {SAFETY_CHOICES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => answerProbe(m.id, { text: t(`report.probe.safety.${c}`), blob: probeBlob })}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95',
                        c === 'unsafe' ? 'border-destructive/50 text-destructive bg-card' : 'border-border bg-card text-muted-foreground',
                      )}
                    >
                      {t(`report.probe.safety.${c}`)}
                    </button>
                  ))}
                </div>
              )}
              <VoiceRecorder
                key={`probe-${m.id}-${probeIdx}`}
                compact
                onChange={(b, tx) => { setProbeBlob(b); setProbeTranscript(tx); }}
              />
              <div className="flex items-center gap-2">
                <Input
                  value={probeDraft}
                  onChange={(e) => setProbeDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendProbeAnswer(m.id); }}
                  placeholder={probeTranscript || t('report.chat.input.placeholder')}
                  maxLength={2000}
                  className="bg-card h-9 text-sm flex-1"
                />
                <Button size="sm" className="rounded-xl" disabled={!probeDraft.trim() && !probeTranscript.trim() && !probeBlob} onClick={() => sendProbeAnswer(m.id)} aria-label={t('report.chat.send')}>
                  <SendHorizonal className="w-4 h-4 rtl:-scale-x-100" />
                </Button>
              </div>
              <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => answerProbe(m.id, null)}>
                {t('report.chat.skip')}
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
                        className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
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
                  <MapPin className="w-3.5 h-3.5 me-1" /> {t('report.chat.confirm')}
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => finishArea(m.id, true)}>
                  {t('report.chat.skip')}
                </Button>
              </div>
            </div>
          )}

          {m.widget === 'contact' && !m.resolved && profilePhone && contact !== profilePhone && (
            <div className="mt-2.5 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">{t('report.contact.confirmPhone')}</p>
              <p className="font-mono text-base font-bold tracking-wide text-foreground" dir="ltr">{profilePhone}</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 rounded-xl" disabled={submitting} onClick={() => void startPartners(m.id, profilePhone)}>
                  {t('report.contact.useThis')}
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-xl" onClick={() => { setProfilePhone(null); setContact(''); }}>
                  {t('report.contact.changePhone')}
                </Button>
              </div>
            </div>
          )}

          {m.widget === 'contact' && !m.resolved && (!profilePhone || contact === profilePhone) && (
            <div className="mt-2.5 space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('report.contact.name')} maxLength={120} className="bg-card h-9 text-sm" />
              <Input
                value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t('report.contact.phone')}
                type="tel" inputMode="tel" autoComplete="tel" required aria-required="true" aria-invalid={!!contact && !phoneOk}
                maxLength={20} className="bg-card h-9 text-sm"
              />
              {contact && !phoneOk && <p className="text-[11px] text-destructive">{t('report.contact.phoneInvalid')}</p>}
              <Button size="sm" className="w-full rounded-xl" disabled={submitting || !phoneOk} onClick={() => void startPartners(m.id)}>
                {t('report.chat.confirm')}
              </Button>
            </div>
          )}

          {m.widget === 'partners' && !m.resolved && (
            <div className="mt-2.5 space-y-2">
              <Button size="sm" className="w-full rounded-xl" disabled={submitting} onClick={() => void submit(m.id)}>
                {submitting ? <><Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />{t('report.submitting')}</> : t('report.submit')}
              </Button>
            </div>
          )}

          {m.widget === 'success' && caseCode && (
            <div className="mt-3 space-y-3 text-center">
              <BrandMark className="mx-auto h-20 w-20" />
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">{t('report.success.code')}</p>
                <p className="font-mono text-lg font-bold tracking-widest text-primary">{caseCode}</p>
                <Button
                  size="sm" variant="ghost" className="mt-1 text-xs h-7"
                  onClick={() => { void navigator.clipboard?.writeText(caseCode); toast.success(<Check className="inline w-3.5 h-3.5" />); }}
                >
                  <Copy className="w-3 h-3 me-1" /> {caseCode}
                </Button>
              </div>
              {/* recap: what was collected + where the case goes next */}
              <div className="rounded-xl border border-border bg-card p-3 text-start text-[11px] space-y-1">
                <p className="font-semibold text-xs">{t('report.success.summary')}</p>
                {area.province && <p>📍 {formatArea(area.province, area.district, area.subdistrict, lang)}</p>}
                <p>{types.map((k) => t(`report.type.${k}`)).join(' · ')}</p>
                <p>💬 {t('report.success.answered', { n: answeredProbeCount })}</p>
                {safetyRisk && <p className="text-destructive font-medium">{t('report.success.urgent')}</p>}
                <p className="pt-1 mt-1 border-t border-border font-medium">{t('report.success.forward')}</p>
                <p>→ {t('report.partners.title')}</p>
              </div>
              {!signedIn && (
                <div className="rounded-xl border-2 border-accent/40 bg-accent/5 p-3 text-start space-y-2">
                  <p className="font-semibold text-sm">{t('cl.prompt.title')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('cl.prompt.body')}</p>
                  <Button asChild size="sm" variant="action" className="w-full rounded-xl"><Link to="/signin">{t('cl.prompt.cta')}</Link></Button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground leading-relaxed">{t('report.success.hint')}</p>
              <div className="grid gap-1.5">
                <Button asChild size="sm" className="rounded-xl"><Link to={`/track?code=${caseCode}`}>{t('report.success.track')}</Link></Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl"><Link to="/report" onClick={() => window.location.reload()}>{t('report.success.new')}</Link></Button>
              </div>
              <PartnerBar className="mt-4 text-start" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {piiGuard.dialog}
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
                <BrandMark className="h-5 w-5" />
              </span>
              <span className="rounded-2xl rounded-es-md bg-muted/70 px-4 py-3 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          )}
        </div>

        {/* full-story free text — available before and after follow-ups, until submit */}
        {stage !== 'consent' && stage !== 'done' && (
          <div className="border-t border-border bg-card/95 px-3 py-2">
            <button
              type="button"
              onClick={() => setStoryOpen((o) => !o)}
              aria-expanded={storyOpen}
              className="w-full flex items-center justify-between text-start text-sm font-semibold text-foreground py-1"
            >
              <span>{t('report.fullStory.title')}{fullStory.trim() ? ' ✓' : ''}</span>
              <span className="text-xs text-primary">{storyOpen ? t('report.fullStory.close') : t('report.fullStory.open')}</span>
            </button>
            {storyOpen && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground">{t('report.fullStory.hint')}</p>
                <textarea
                  value={fullStory}
                  onChange={(e) => setFullStory(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  placeholder={t('report.fullStory.placeholder')}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <PiiHint className="mt-0" />
                <p className="text-[11px] text-muted-foreground text-end font-mono">{fullStory.length}/5000</p>
              </div>
            )}
          </div>
        )}

        {/* composer — active while answering the story question */}
        {stage === 'story' && !fuActive && (
          <div className="border-t border-border bg-card/95 backdrop-blur px-3 py-3 space-y-2.5">
            <VoiceRecorder compact followUp onChange={(b, tx) => { setAudio(b); setTranscript(tx); }} />
            <PiiHint className="mt-0" />
            <div className="flex items-end gap-2">
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSendStory) sendStory(); } }}
                placeholder={transcript || t('report.chat.input.placeholder')}
                rows={2}
                maxLength={5000}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Button
                size="icon"
                className="w-11 h-11 rounded-full shrink-0"
                disabled={!canSendStory}
                aria-label={t('report.chat.send')}
                onClick={sendStory}
              >
                <SendHorizonal className="w-5 h-5 rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        )}

        {/* back link for pre-chat */}
        {stage === 'consent' && (
          <div className="border-t border-border px-4 py-2.5">
            <Button asChild variant="ghost" size="sm" className="text-xs -ms-2">
              <Link to="/"><ArrowLeft className="w-3.5 h-3.5 me-1 rtl:-scale-x-100" />{t('common.back')}</Link>
            </Button>
          </div>
        )}
      </div>
    </PhoneShell>
    </>
  );
}

const STAGE_ORDER: Stage[] = ['consent', 'about', 'story', 'types', 'probe', 'photos', 'area', 'contact'];
