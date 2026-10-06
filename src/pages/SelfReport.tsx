import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rememberReportCode } from '@/lib/myReports';
import { supabase as sbAuth } from '@/integrations/supabase/client';
import { ChevronDown, ChevronLeft, Camera, Check, Copy, Download, Loader2, MapPin, MessageSquare, Paperclip, SendHorizonal, X } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { LanguageToggle } from '@/components/LanguageToggle';
import { SpeakButton } from '@/components/screening/SpeakButton';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { AreaPicker, type AreaValue } from '@/components/screening/AreaPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Illus } from '@/components/Illus';
import { supabase } from '@/integrations/supabase/client';
import { useI18n, SPEECH_LOCALE } from '@/i18n';
import { formatArea } from '@/lib/thaiGeo';
import { stripImageMetadata } from '@/lib/exif';
import { saveLocalCase, deleteLocalCase } from '@/lib/localCases';
import { cn } from '@/lib/utils';
import { PiiHint, usePiiGuard } from '@/lib/piiGuard';
import { BrandMark } from '@/components/BrandLogo';
import { PartnerBar } from '@/components/PartnerBar';
import { emptyScreening, summarizeScreening, type ScreeningDraft } from '@/components/screening/ScreeningTools';
import { Q2_ITEM_IDS, Q9_ITEM_IDS, Q9_SCALE_IDS, NRM_SECTIONS } from '@/lib/screeningTools';

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

type Stage = 'consent' | 'about' | 'story' | 'types' | 'probe' | 'screen' | 'photos' | 'area' | 'contact' | 'partners' | 'done';
type Widget = 'consent' | 'about' | 'types' | 'probe' | 'screenIntro' | 'screenItem' | 'photos' | 'area' | 'contact' | 'partners' | 'success';
type ScreenSection = 'mental' | 'nrm';
interface ScreenItem { id: string; group: 'q2' | 'q9' | 'nrm' | 'u18'; sec?: string; idx: number }
const Q2_ITEMS: ScreenItem[] = Q2_ITEM_IDS.map((id, idx) => ({ id, group: 'q2', idx }));
const Q9_ITEMS: ScreenItem[] = Q9_ITEM_IDS.map((id, idx) => ({ id, group: 'q9', idx }));
const NRM_ITEMS: ScreenItem[] = [
  ...NRM_SECTIONS.flatMap((s) => s.items.map((id, idx) => ({ id, group: 'nrm' as const, sec: s.key, idx }))),
  { id: 'under18', group: 'u18', idx: 0 },
];

/** Draw a shareable case-code card (brand colors) and download it as PNG. */
function downloadCodeCard(code: string, labels: { title: string; code: string; track: string; note: string; org: string; locale: string }) {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  // background
  ctx.fillStyle = '#F0F9F9';
  ctx.fillRect(0, 0, W, H);
  // header band
  ctx.fillStyle = '#2A2A2E';
  ctx.fillRect(0, 0, W, 220);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 64px "IBM Plex Sans Thai Looped", "Bai Jamjuree", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SWING RIGHTS', W / 2, 110);
  ctx.font = '400 34px "Bai Jamjuree", sans-serif';
  ctx.fillStyle = '#F0F9F9';
  ctx.fillText(labels.org, W / 2, 170);
  // card
  const cx = 90, cy = 300, cw = W - 180, ch = 620;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CC0099';
  ctx.lineWidth = 6;
  const r = 48;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, r);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2A2A2E';
  ctx.font = '400 40px "Bai Jamjuree", sans-serif';
  ctx.fillText(labels.code, W / 2, cy + 120);
  ctx.fillStyle = '#CC0099';
  ctx.font = '700 120px "IBM Plex Mono", monospace';
  ctx.fillText(code, W / 2, cy + 300);
  ctx.fillStyle = '#2A2A2E';
  ctx.font = '400 36px "Bai Jamjuree", sans-serif';
  ctx.fillText(labels.track, W / 2, cy + 420);
  ctx.fillStyle = '#CC0099';
  ctx.font = '700 44px "IBM Plex Mono", monospace';
  ctx.fillText('swingrights.app/track', W / 2, cy + 500);
  // note (word-wrapped) + date
  ctx.fillStyle = '#2A2A2E';
  ctx.font = '400 34px "Bai Jamjuree", sans-serif';
  const words = labels.note.split(' ');
  let line = '';
  let ny = 1000;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > W - 200 && line) {
      ctx.fillText(line, W / 2, ny);
      ny += 50;
      line = w;
    } else line = test;
  }
  if (line) { ctx.fillText(line, W / 2, ny); ny += 50; }
  ctx.font = '400 30px "IBM Plex Mono", monospace';
  ctx.fillText(new Date().toLocaleString(labels.locale, { dateStyle: 'long', timeStyle: 'short' }), W / 2, ny + 20);
  // footer band
  ctx.fillStyle = '#CC0099';
  ctx.fillRect(0, H - 120, W, 120);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '400 34px "Bai Jamjuree", sans-serif';
  ctx.fillText(labels.title, W / 2, H - 52);

  cv.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `swing-rights-${code}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

interface ChatMsg {
  id: number;
  role: 'bot' | 'user';
  text?: string;
  audioUrl?: string;
  widget?: Widget;
  resolved?: boolean;
  section?: ScreenSection;
  item?: ScreenItem;
}

const TYPE_KEYS = ['body', 'mental', 'labor', 'health', 'property', 'other'] as const;
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
  const navigate = useNavigate();
  // ids that tie visible labels to their fields
  const fid = useId();

  // ---- chat state ----
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [stage, setStage] = useState<Stage>('consent');
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);
  // header back button: ask first when the report has answers that are not sent yet
  const [leaveOpen, setLeaveOpen] = useState(false);

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
  const [occupation, setOccupation] = useState('');

  // ---- probe state (sequential probing questions) ----
  const [probeIdx, setProbeIdx] = useState(0);
  const [probeAnswers, setProbeAnswers] = useState<Partial<Record<ProbeId, { text: string; blob: Blob | null }>>>({});
  const [probeBlob, setProbeBlob] = useState<Blob | null>(null);
  const [probeTranscript, setProbeTranscript] = useState('');
  const [probeDraft, setProbeDraft] = useState('');
  const [safetyRisk, setSafetyRisk] = useState(false);

  // ---- screening (2Q→9Q, NRM): offered only when the story / AI suggests it, asked one item at a time ----
  const trafRef = useRef(false);
  const distressRef = useRef(false);
  const screenDraft = useRef<ScreeningDraft>(emptyScreening());
  const screenOffered = useRef<Record<ScreenSection, boolean>>({ mental: false, nrm: false });
  const screenAnswered = useRef<{ mental: boolean; q9: boolean; nrm: boolean }>({ mental: false, q9: false, nrm: false });
  const screenQueue = useRef<ScreenItem[]>([]);
  const screenAfter = useRef<() => void>(() => undefined);
  const [suicideRisk, setSuicideRisk] = useState(false);

  const nextScreenSection = (typesNow: string[] = types) => {
    const needMental = !screenOffered.current.mental && (typesNow.includes('mental') || distressRef.current);
    const needNrm = !screenOffered.current.nrm && trafRef.current;
    const section: ScreenSection | null = needMental ? 'mental' : needNrm ? 'nrm' : null;
    if (!section) {
      if (screenAnswered.current.mental || screenAnswered.current.nrm) botSay({ text: t('rscreen.thanks') }, 500);
      screenAfter.current();
      return;
    }
    screenOffered.current[section] = true;
    setStage('screen');
    botSay({ text: t(section === 'mental' ? 'rscreen.introMental' : 'rscreen.introNrm'), widget: 'screenIntro', section }, 700);
  };

  const startScreening = (after: () => void) => {
    screenAfter.current = after;
    nextScreenSection();
  };

  const screenQuestion = (it: ScreenItem) =>
    it.group === 'q9' ? `${t('rscreen.q9.lead')}\n${t(`rscreen.q.${it.id}`)}` : t(`rscreen.q.${it.id}`);

  const askNextScreen = () => {
    const it = screenQueue.current.shift();
    if (!it) { nextScreenSection(); return; }
    botSay({ text: screenQuestion(it), widget: 'screenItem', item: it }, 500);
  };

  const answerScreenIntro = (msgId: number, section: ScreenSection, go: boolean) => {
    resolveWidget(msgId);
    push({ role: 'user', text: go ? t('rscreen.start') : t('rscreen.skip') });
    if (!go) { nextScreenSection(); return; }
    screenQueue.current = section === 'mental' ? [...Q2_ITEMS] : [...NRM_ITEMS];
    askNextScreen();
  };

  /** v: 0/1 for yes-no, 0-3 for 9Q scale, null = rather not say, 'stop' = end this section */
  const answerScreenItem = (msgId: number, it: ScreenItem, v: number | null | 'stop', label: string) => {
    resolveWidget(msgId);
    push({ role: 'user', text: label });
    if (v === 'stop') { screenQueue.current = []; askNextScreen(); return; }
    const d = screenDraft.current;
    if (v !== null) {
      if (it.group === 'q2') { d.q2[it.idx] = v as 0 | 1; screenAnswered.current.mental = true; }
      if (it.group === 'q9') {
        d.q9[it.idx] = v; screenAnswered.current.q9 = true;
        if (it.idx === 8 && v > 0) { setSuicideRisk(true); botSay({ text: t('rscreen.crisis') }, 400); }
      }
      if (it.group === 'nrm' && it.sec) { d.nrm[it.sec][it.idx] = v === 1; screenAnswered.current.nrm = true; }
      if (it.group === 'u18') { d.nrmUnder18 = v === 1; screenAnswered.current.nrm = true; }
    }
    // 2Q positive → continue with 9Q
    if (it.group === 'q2' && !screenQueue.current.some((x) => x.group === 'q2') && d.q2.some((x) => x === 1)) {
      screenQueue.current = [...Q9_ITEMS, ...screenQueue.current];
    }
    askNextScreen();
  };

  const toPhotos = () => {
    setStage('photos');
    botSay({ text: t('report.chat.photos.ask'), widget: 'photos' }, 700);
  };

  /** Only the parts the reporter actually answered go to the case (staff see '-' otherwise). */
  const buildScreeningPayload = () => {
    const a = screenAnswered.current;
    if (!a.mental && !a.nrm) return {};
    const full = summarizeScreening(screenDraft.current) as unknown as Record<string, unknown>;
    const s: Record<string, unknown> = { completedAt: full.completedAt, source: 'self' };
    if (a.mental) Object.assign(s, { q2: full.q2, q2Positive: full.q2Positive });
    if (a.q9) Object.assign(s, { q9: full.q9, q9Total: full.q9Total, q9Level: full.q9Level, suicidalItem: full.suicidalItem });
    if (a.nrm) Object.assign(s, { nrm: full.nrm, nrmUnder18: full.nrmUnder18, nrmPositive: full.nrmPositive });
    const tests = [...(a.mental ? ['2q9q'] : []), ...(a.nrm ? ['nrm'] : [])];
    return { screening: s, special_tests: tests, suicide_risk: suicideRisk };
  };


  // ---- live AI follow-up: reads each answer and asks about what was actually said ----
  const MAX_FU = 2;
  const fuCountRef = useRef(0);
  const fuRef = useRef<{ q: string; after: () => void } | null>(null);
  const [fuActive, setFuActive] = useState(false);
  const [followups, setFollowups] = useState<{ q: string; text: string }[]>([]);
  const heardRef = useRef<string[]>([]);
  // every question already put to the reporter (fixed + AI) — never asked again
  const askedRef = useRef<string[]>([]);
  // form items the AI has heard answered so far
  const coveredRef = useRef<Set<string>>(new Set());
  const [trainConsent, setTrainConsent] = useState(false);
  const trainSession = useRef<string>(crypto.randomUUID());
  // fixed probe → form item it covers ('safety' is always asked)
  const PROBE_SLOT: Partial<Record<ProbeId, string>> = { when: 'when', where: 'where', who: 'who', needs: 'help' };
  const nextOpenProbe = (from: number) => {
    let i = from;
    while (i < PROBE_IDS.length) {
      const slot = PROBE_SLOT[PROBE_IDS[i]];
      if (!slot || !coveredRef.current.has(slot)) break;
      i += 1;
    }
    return i;
  };
  const askFollowUp = async (latest: string, question: string, after: () => void, fresh: boolean) => {
    if (fresh) fuCountRef.current = 0;
    const done = () => { fuRef.current = null; setFuActive(false); fuCountRef.current = 0; after(); };
    if (question && !askedRef.current.includes(question)) askedRef.current.push(question);
    if (!latest.trim() || fuCountRef.current >= MAX_FU) return done();
    heardRef.current.push(`Q: ${question}\nA: ${latest}`);
    setTyping(true);
    try {
      const { data, error } = await supabase.functions.invoke('followup-question', {
        body: {
          text: heardRef.current.join('\n\n').slice(-7500),
          context: `Current question: ${question}\nLATEST answer (build the follow-up on this): ${latest}`.slice(0, 5900),
          lang,
          asked: askedRef.current.slice(-40).map((a) => a.slice(0, 400)),
          covered_before: [...coveredRef.current],
          question: question.slice(0, 500),
          latest: latest.slice(0, 5000),
          train_consent: trainConsent,
          session_id: trainSession.current,
        },
      });
      setTyping(false);
      if (!error && Array.isArray(data?.covered)) (data.covered as string[]).forEach((c) => coveredRef.current.add(c));
      if (!error && data?.trafficking_suspected) trafRef.current = true;
      if (!error && data?.distress_suspected) distressRef.current = true;
      const q = !error && data?.next_question ? String(data.next_question).trim() : '';
      if (q && data.next_slot !== 'none' && !askedRef.current.includes(q)) {
        askedRef.current.push(q);
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

  const stageIdx = STAGE_ORDER.indexOf(stage === 'done' || stage === 'partners' ? 'contact' : stage === 'screen' ? 'probe' : stage);

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
        push({ role: 'bot', text: t('report.consent.title'), widget: 'consent' });
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
    const box = scrollRef.current;
    if (!box) return;
    const behavior: ScrollBehavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const items = box.querySelectorAll<HTMLElement>('[data-msg-id]');
    const last = items.length ? items[items.length - 1] : null;
    // A tall bot message (consent card, success screen with the case code) is shown from its
    // top, so its title and the code stay in view. Everything else scrolls to the newest line.
    if (!typing && last && last.dataset.msgRole === 'bot' && last.offsetHeight > box.clientHeight * 0.8) {
      box.scrollTo({ top: Math.max(0, last.offsetTop - 12), behavior });
      return;
    }
    box.scrollTo({ top: box.scrollHeight, behavior });
  }, [msgs, typing]);

  // Keyboard and screen-reader focus: when the answered widget disappears (focus falls back to
  // <body>), move focus to the newest open question without scrolling or opening the keyboard.
  useEffect(() => {
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const open = scrollRef.current?.querySelectorAll<HTMLElement>('[data-msg-focus]');
    const el = open && open.length ? open[open.length - 1] : null;
    el?.focus({ preventScroll: true });
  }, [msgs]);

  // ---- stage transitions ----
  const agreeConsent = (msgId: number) => {
    resolveWidget(msgId);
    push({ role: 'user', text: t('report.chat.agreed') });
    setStage('about');
    botSay({ text: `${t('report.about.title')}\n${t('report.about.hint')}`, widget: 'about' });
  };

  const finishAbout = (msgId: number) => {
    resolveWidget(msgId);
    const parts: string[] = [];
    if (nationality.trim()) parts.push(`${t('report.about.nationality')}: ${nationality.trim()}`);
    if (gender) parts.push(`${t('report.about.gender')}: ${t(`report.about.gender.${gender}`)}`);
    if (age.trim()) parts.push(`${t('report.about.age')}: ${age.trim()}`);
    if (occupation.trim()) parts.push(`${t('report.about.occupation')}: ${occupation.trim()}`);
    push({ role: 'user', text: parts.length ? parts.join(' · ') : t('report.chat.skipped') });
    // ask province/area first so follow-ups and referral matching know where the person is
    setStage('area');
    botSay({ text: `${t('report.area.title')}\n${t('report.area.hint')}`, widget: 'area' });
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
        ? types.map((k) => t(`report.type.${k}`)).join(' · ') + (other ? `: ${other}` : '')
        : t('report.chat.skipped'),
    });
    // move into the sequential probing interview — skip questions already answered in the story
    const first = nextOpenProbe(0);
    if (first >= PROBE_IDS.length) {
      startScreening(toPhotos);
      return;
    }
    setStage('probe');
    setProbeIdx(first);
    botSay({ text: t('report.probe.intro') });
    botSay({ text: probeQuestionText(first), widget: 'probe' }, 1100);
  };

  const probeQuestionText = (i: number) =>
    `${t('report.probe.count', { i: i + 1, n: PROBE_IDS.length })}\n${t(`report.probe.${PROBE_IDS[i]}.q`)}`;

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
    const advance = () => {
      const next = nextOpenProbe(probeIdx + 1);
      if (next < PROBE_IDS.length) {
        setProbeIdx(next);
        botSay({ text: probeQuestionText(next), widget: 'probe' }, answer && qid === 'safety' && safetyRisk ? 1400 : 700);
      } else {
        startScreening(toPhotos);
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
      text: photos.length ? t('report.chat.photos.added', { n: photos.length }) : t('report.chat.skipped'),
    });
    setStage('contact');
    botSay({ text: `${t('report.contact.title')}\n${t('report.contact.hint')}`, widget: 'contact' });
  };

  const finishArea = (msgId: number, skip: boolean) => {
    resolveWidget(msgId);
    const hasArea = !skip && area.province;
    const label = hasArea ? formatArea(area.province, area.district, area.subdistrict, lang) : '';
    push({ role: 'user', text: hasArea ? label : t('report.chat.skipped') });
    if (hasArea) heardRef.current.push(`Province/area where the person is (already answered, do not ask again): ${area.province}${area.district ? ` / ${area.district}` : ''}`);
    setStage('story');
    botSay({ text: `${t('report.story.title')}\n${t('report.story.hint')}` });
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
        kp: '', gender, dob: '', age: age.trim(), nationality: nationality.trim(), occupation: occupation.trim(), incidentPlace: '',
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
        kp: '', gender, age: age.trim(), nationality: nationality.trim(), occupation: occupation.trim(),
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
      // flag red severity when the reporter says they are not safe or reports self-harm thoughts
      ...(safetyRisk || suicideRisk ? { severity: 'red' } : {}),
      ...buildScreeningPayload(),
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
      // supabase rpc builders are lazy: they only send when awaited/then'd
      void sbAuth.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); if (data.session) void sbAuth.rpc('link_my_cases' as never, { _codes: [String(code)] } as never).then(() => undefined); });
      setCaseCode(String(code));
      if (trainConsent) void supabase.rpc('link_training_session' as never, { _session: trainSession.current, _case_code: String(code) } as never)
        .then(({ error: le }) => { if (le) console.error('link training failed'); });
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

  const consentMsg = msgs.find((x) => x.widget === 'consent' && !x.resolved);
  // The open follow-up question is answered in the bottom composer, not inside the bubble.
  const activeProbe = msgs.find((x) => x.widget === 'probe' && !x.resolved);
  const lastBotText = [...msgs].reverse().find((x) => x.role === 'bot' && x.text)?.text ?? '';
  const inProgress = stage !== 'done' && msgs.some((x) => x.role === 'user');
  const leavePage = () => navigate('/');

  /** What the listen button reads: the consent card also reads its three summary lines. */
  const speakTextFor = (m: ChatMsg) =>
    m.widget === 'consent'
      ? [m.text, ...(['What', 'Use', 'Who'] as const).map((k) => `${t(`report.consent.sum${k}L`)}: ${t(`report.consent.sum${k}`)}`)].join('\n')
      : m.text ?? '';

  /** Copy the case code; in-app browsers often block the clipboard, so say how to copy by hand. */
  const copyCode = (code: string) => {
    const fallback = () => toast(t('report.success.copyFallback'));
    let done: Promise<void> | undefined;
    try { done = navigator.clipboard?.writeText(code); } catch { done = undefined; }
    if (!done) { fallback(); return; }
    done.then(() => toast.success(t('report.success.copied')), fallback);
  };

  // Paired buttons stack on phones and may wrap long my/km/lo labels.
  const pairBtn = 'h-auto min-h-11 whitespace-normal text-balance rounded-xl';

  // ---- render one message ----
  const renderMsg = (m: ChatMsg) => {
    const isBot = m.role === 'bot';
    // Open widgets and the success card use the whole row, so fields, button pairs and the case code fit.
    const wide = (!!m.widget && !m.resolved) || m.widget === 'success';
    const focusable = isBot && !!m.widget && !m.resolved && m.widget !== 'success';
    return (
      <div key={m.id} data-msg-id={m.id} data-msg-role={m.role} className={cn('flex items-start gap-2 animate-fade-in', isBot ? '' : 'flex-row-reverse')}>
        {isBot && (
          <span className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0 mt-1" aria-hidden>
            <BrandMark className="h-5 w-5" />
          </span>
        )}
        <div
          tabIndex={focusable ? -1 : undefined}
          data-msg-focus={focusable ? '' : undefined}
          className={cn(
            'relative rounded-2xl p-3 text-base leading-[1.7] shadow-sm',
            wide ? 'flex-1 min-w-0' : 'max-w-[85%]',
            isBot ? 'bg-card border border-border text-foreground rounded-ss-md' : 'bg-accent-soft text-foreground rounded-se-md',
            focusable && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {m.text && (
            <>
              {/* only the text makes room for the 44px listen button, widgets below use the full width */}
              <p className={cn('whitespace-pre-line', isBot && 'pe-12 min-h-10')}>{m.text}</p>
              {isBot && <SpeakButton text={speakTextFor(m)} label={t('report.listenMsg')} className="absolute top-1 end-1 w-11 h-11 [&_svg]:w-4 [&_svg]:h-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
            </>
          )}
          {m.audioUrl && <audio src={m.audioUrl} controls aria-label={t('common.listen')} className="w-full h-9 mt-2" />}

          {/* ---------- interactive widgets ---------- */}
          {m.widget === 'consent' && !m.resolved && (
            <>
              <Illus name="care" eager className="mx-auto mt-1 mb-1 h-20 w-auto" />
              <ul className="mt-2 space-y-1.5">
                {(['What', 'Use', 'Who'] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-1.5 shrink-0 text-accent" aria-hidden />
                    <span><span className="font-semibold">{t(`report.consent.sum${k}L`)}:</span> {t(`report.consent.sum${k}`)}</span>
                  </li>
                ))}
              </ul>
              <Collapsible className="mt-2">
                <CollapsibleTrigger className="group inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {t('report.consent.details')}
                  <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-sm leading-[1.7] text-muted-foreground pb-1">{t('report.consent.body')}</p>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
          {m.widget === 'consent' && !m.resolved && (
            <>
              <label className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-sm leading-snug cursor-pointer focus-within:ring-2 focus-within:ring-ring">
                <span>{t('report.train.consent')}</span>
                <input type="checkbox" className="accent-primary w-5 h-5 shrink-0" checked={trainConsent} onChange={(e) => setTrainConsent(e.target.checked)} />
              </label>
            </>
          )}

          {m.widget === 'about' && !m.resolved && (
            <div className="mt-2.5 space-y-2.5">
              <div>
                <label htmlFor={`${fid}-nat`} className="block text-sm font-medium text-muted-foreground mb-1">{t('report.about.nationality')}</label>
                <Input id={`${fid}-nat`} value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder={t('report.about.nationalityPh')} maxLength={60} className="bg-card h-11 text-base" />
              </div>
              <div role="group" aria-labelledby={`${fid}-gender`}>
                <p id={`${fid}-gender`} className="text-sm font-medium text-muted-foreground mb-1">{t('report.about.gender')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['male', 'female', 'diverse', 'unspecified'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender((prev) => (prev === g ? '' : g))}
                      aria-pressed={gender === g}
                      className={cn(
                        'min-h-12 rounded-xl border px-3 py-2 text-sm font-medium text-start transition active:scale-95',
                        gender === g ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-muted-foreground',
                      )}
                    >
                      {t(`report.about.gender.${g}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor={`${fid}-age`} className="block text-sm font-medium text-muted-foreground mb-1">{t('report.about.age')}</label>
                <Input id={`${fid}-age`} value={age} onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, '').slice(0, 3))} placeholder={t('report.about.agePh')} inputMode="numeric" className="bg-card h-11 text-base w-28" />
              </div>
              <div>
                <label htmlFor={`${fid}-occ`} className="block text-sm font-medium text-muted-foreground mb-1">{t('report.about.occupation')}</label>
                <Input id={`${fid}-occ`} value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder={t('report.about.occupationPh')} maxLength={60} className="bg-card h-11 text-base" />
              </div>
              <Button size="sm" className="w-full rounded-xl" onClick={() => finishAbout(m.id)}>
                {nationality.trim() || gender || age.trim() || occupation.trim() ? t('report.chat.confirm') : t('report.chat.skip')}
              </Button>
            </div>
          )}

          {m.widget === 'types' && !m.resolved && (
            <div className="mt-2.5 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TYPE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleType(k)}
                    aria-pressed={types.includes(k)}
                    className={cn(
                      'min-h-12 rounded-xl border px-3 py-2 text-sm font-medium text-start transition active:scale-95',
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
                  aria-label={t('report.type.other')}
                  maxLength={200}
                  className="h-11 text-base rounded-xl"
                />
              )}
              <Button size="sm" className="w-full rounded-xl" onClick={() => confirmTypes(m.id)}>
                {types.length ? t('report.chat.confirm') : t('report.chat.skip')}
              </Button>
            </div>
          )}

          {/* quick choices for the safety question; typed/voice answers use the bottom composer */}
          {m.widget === 'probe' && !m.resolved && currentProbeId === 'safety' && !fuActive && (
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAFETY_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => answerProbe(m.id, { text: t(`report.probe.safety.${c}`), blob: probeBlob })}
                  className={cn(
                    'min-h-12 rounded-xl border px-3 py-2 text-sm font-medium text-start transition active:scale-95',
                    c === 'unsafe' ? 'border-destructive/50 text-destructive bg-card' : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {t(`report.probe.safety.${c}`)}
                </button>
              ))}
            </div>
          )}

          {m.widget === 'screenIntro' && !m.resolved && m.section && (
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button size="sm" className={pairBtn} onClick={() => answerScreenIntro(m.id, m.section!, true)}>{t('rscreen.start')}</Button>
              <Button size="sm" variant="outline" className={pairBtn} onClick={() => answerScreenIntro(m.id, m.section!, false)}>{t('rscreen.skip')}</Button>
            </div>
          )}

          {m.widget === 'screenItem' && !m.resolved && m.item && (() => {
            const it = m.item;
            const opts = it.group === 'q9'
              ? Q9_SCALE_IDS.map((s) => ({ v: s.v as number, label: t(`rscreen.scale.${s.id}`) }))
              : [{ v: 1, label: t('rscreen.yes') }, { v: 0, label: t('rscreen.no') }];
            return (
              <div className="mt-2.5 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {opts.map((o) => (
                    <button key={o.v} type="button" onClick={() => answerScreenItem(m.id, it, o.v, o.label)}
                      className="min-h-12 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-start transition hover:border-primary active:scale-95">
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button size="sm" variant="ghost" className={cn(pairBtn, 'text-sm font-medium text-muted-foreground')} onClick={() => answerScreenItem(m.id, it, null, t('rscreen.noAnswer'))}>{t('rscreen.noAnswer')}</Button>
                  <Button size="sm" variant="ghost" className={cn(pairBtn, 'text-sm font-medium text-muted-foreground')} onClick={() => answerScreenItem(m.id, it, 'stop', t('rscreen.stop'))}>{t('rscreen.stop')}</Button>
                </div>
              </div>
            );
          })()}

          {m.widget === 'photos' && !m.resolved && (
            <div className="mt-2.5 space-y-2.5">
              {/* No capture attribute: people often attach an existing screenshot; the picker still offers the camera. */}
              <label className="relative flex min-h-11 items-center gap-2 text-sm font-medium cursor-pointer rounded-xl border border-dashed border-border bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <Paperclip className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden /> {t('report.photo.add')}
                <input type="file" accept="image/*" multiple className="sr-only"
                  onChange={(e) => { void addPhotos(e.target.files); e.target.value = ''; }} />
              </label>
              {photos.length > 0 && (
                <div className="flex gap-4 flex-wrap pt-2">
                  {photos.map((p, i) => (
                    <div key={p.url} className="relative">
                      <img src={p.url} alt={t('track.files.photo', { n: i + 1 })} className="w-14 h-14 rounded-lg object-cover border border-border" />
                      {/* 44px hit area around a small visible dot */}
                      <button type="button" aria-label={t('report.photo.remove', { n: i + 1 })} onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-4 -end-4 w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm">
                          <X className="w-3.5 h-3.5" aria-hidden />
                        </span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button size="sm" className={pairBtn} disabled={!area.province} onClick={() => finishArea(m.id, false)}>
                  <MapPin className="w-3.5 h-3.5" aria-hidden /> {t('report.chat.confirm')}
                </Button>
                <Button size="sm" variant="outline" className={pairBtn} onClick={() => finishArea(m.id, true)}>
                  {t('report.chat.skip')}
                </Button>
              </div>
            </div>
          )}

          {m.widget === 'contact' && !m.resolved && profilePhone && contact !== profilePhone && (
            <div className="mt-2.5 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm text-muted-foreground">{t('report.contact.confirmPhone')}</p>
              <p className="font-mono text-base font-bold tracking-wide text-foreground" dir="ltr">{profilePhone}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button size="sm" className={pairBtn} disabled={submitting} onClick={() => void startPartners(m.id, profilePhone)}>
                  {t('report.contact.useThis')}
                </Button>
                <Button size="sm" variant="outline" className={pairBtn} onClick={() => { setProfilePhone(null); setContact(''); }}>
                  {t('report.contact.changePhone')}
                </Button>
              </div>
            </div>
          )}

          {m.widget === 'contact' && !m.resolved && (!profilePhone || contact === profilePhone) && (
            <div className="mt-2.5 space-y-2.5">
              <div>
                <label htmlFor={`${fid}-name`} className="block text-sm font-medium text-muted-foreground mb-1">{t('report.contact.name')}</label>
                <Input id={`${fid}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('report.contact.name')} maxLength={120} className="bg-card h-11 text-base" />
              </div>
              <div>
                <label htmlFor={`${fid}-phone`} className="block text-sm font-medium text-muted-foreground mb-1">{t('report.contact.phone')}</label>
                <Input
                  id={`${fid}-phone`}
                  value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t('report.contact.phone')}
                  type="tel" inputMode="tel" autoComplete="tel" required aria-required="true" aria-invalid={!!contact && !phoneOk}
                  aria-describedby={contact && !phoneOk ? `${fid}-phone-err` : undefined}
                  maxLength={20} className="bg-card h-11 text-base"
                />
              </div>
              {contact && !phoneOk && <p id={`${fid}-phone-err`} className="text-sm text-destructive">{t('report.contact.phoneInvalid')}</p>}
              <Button size="sm" className="w-full rounded-xl" disabled={submitting || !phoneOk} onClick={() => void startPartners(m.id)}>
                {t('report.chat.confirm')}
              </Button>
            </div>
          )}

          {m.widget === 'partners' && !m.resolved && (
            <div className="mt-2.5 space-y-2">
              {/* sending the report is the one main action on this step */}
              <Button variant="action" size="lg" className="w-full rounded-xl" disabled={submitting} aria-busy={submitting} onClick={() => void submit(m.id)}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />{t('report.submitting')}</> : t('report.submit')}
              </Button>
            </div>
          )}

          {m.widget === 'success' && caseCode && (
            <div className="mt-3 space-y-3 text-center">
              <Illus name="group" eager className="mx-auto w-full max-w-[200px]" />
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
                <p className="text-sm text-muted-foreground mb-1">{t('report.success.code')}</p>
                {/* one line on every phone; long-press selects the whole code when copying is blocked */}
                <p className="font-mono text-[28px] max-[359px]:text-2xl max-[359px]:tracking-wide leading-tight font-bold tracking-wider text-primary whitespace-nowrap tabular-nums select-all" dir="ltr">{caseCode}</p>
                <p className="mt-1 text-sm text-foreground">{t('report.success.keep')}</p>
                <Button size="lg" className="mt-2 w-full rounded-xl" onClick={() => copyCode(caseCode)}>
                  <Copy className="w-4 h-4" aria-hidden /> {t('report.success.copy')}
                </Button>
                <Button
                  size="sm" variant="outline" className={cn(pairBtn, 'mt-2 w-full')}
                  onClick={() => downloadCodeCard(caseCode, {
                    title: t('report.title'),
                    code: t('report.success.code'),
                    track: t('report.success.track'),
                    note: t('report.success.shotNote'),
                    org: t('common.orgName'),
                    locale: SPEECH_LOCALE[lang],
                  })}
                >
                  <Download className="w-4 h-4" aria-hidden /> {t('report.success.saveImage')}
                </Button>
              </div>
              {/* the one main (magenta) action on this screen, right under the code */}
              <Button asChild size="lg" variant="action" className="w-full rounded-xl"><Link to="/track" state={{ code: caseCode }}>{t('report.success.track')}</Link></Button>
              <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-1.5 text-start">
                <Camera className="w-4 h-4 mt-1 shrink-0 text-primary" aria-hidden />
                {t('report.success.shotNote')}
              </p>
              {/* recap: what was collected + where the case goes next */}
              <div className="rounded-xl border border-border bg-card p-3 text-start text-xs space-y-1">
                <p className="font-semibold text-xs">{t('report.success.summary')}</p>
                {area.province && (
                  <p className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                    {formatArea(area.province, area.district, area.subdistrict, lang)}
                  </p>
                )}
                {types.length > 0 && <p>{types.map((k) => t(`report.type.${k}`)).join(' · ')}</p>}
                <p className="flex items-start gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  {t('report.success.answered', { n: answeredProbeCount })}
                </p>
                {safetyRisk && <p className="text-destructive font-medium">{t('report.success.urgent')}</p>}
                <p className="pt-1 mt-1 border-t border-border font-medium">{t('report.success.forward')}</p>
                <p>{t('report.partners.title')}</p>
              </div>
              {!signedIn && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-start space-y-2">
                  <p className="font-semibold text-sm">{t('cl.prompt.title')}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t('cl.prompt.body')}</p>
                  <Button asChild size="sm" variant="outline" className={cn(pairBtn, 'w-full')}><Link to="/signin">{t('cl.prompt.cta')}</Link></Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed">{t('report.success.hint')}</p>
              <Button asChild size="sm" variant="outline" className={cn(pairBtn, 'w-full')}><Link to="/report" onClick={() => window.location.reload()}>{t('report.success.new')}</Link></Button>
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
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('report.leave.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('report.leave.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('report.leave.stay')}</AlertDialogCancel>
            <AlertDialogAction onClick={leavePage}>{t('report.leave.go')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <PhoneShell contained={false} title={t('report.title')} onBack={() => (inProgress ? setLeaveOpen(true) : leavePage())} trailing={<LanguageToggle />}>
      {/* 640-767px: the floating Quick Exit pill (bottom-right) would sit over the send button, so the card ends higher */}
      <div className="flex flex-col h-[calc(100dvh-9rem)] sm:max-md:h-[calc(100dvh-13rem)] max-h-[46rem]">
        {/* progress */}
        <div className="shrink-0 px-4 pt-3 pb-1">
          <div className="flex gap-1.5" aria-hidden>
            {STAGE_ORDER.map((s, i) => (
              <span key={s} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= stageIdx ? 'bg-accent' : 'bg-muted')} />
            ))}
          </div>
          <p className="mt-1.5 text-xs font-medium text-muted-foreground" aria-live="polite">
            {t('report.step', { n: Math.max(1, stageIdx + 1), total: STAGE_ORDER.length })}
          </p>
        </div>

        {/* chat thread */}
        <div ref={scrollRef} className="relative flex-1 min-h-28 overflow-y-auto px-4 py-3 space-y-3">
          {msgs.map(renderMsg)}
          {typing && (
            <div className="flex items-end gap-2 animate-fade-in">
              <span className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0" aria-hidden>
                <BrandMark className="h-5 w-5" />
              </span>
              <span role="status" className="rounded-2xl rounded-es-md bg-muted/70 px-4 py-3 flex gap-1">
                <span className="sr-only">{t('report.chat.typing')}</span>
                {[0, 1, 2].map((i) => (
                  <span key={i} aria-hidden className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce motion-reduce:animate-none" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          )}
        </div>
        {/* Screen readers hear each new question once (the thread itself is not a live region,
            so widget buttons and bullets are not read out every time). */}
        <p className="sr-only" aria-live="polite">{lastBotText}</p>

        {/* full-story free text, available before and after follow-ups, until submit */}
        {stage !== 'consent' && stage !== 'done' && (
          <div className="flex min-h-0 flex-col border-t border-border bg-card/95 px-3 py-1">
            <button
              type="button"
              onClick={() => setStoryOpen((o) => !o)}
              aria-expanded={storyOpen}
              aria-controls={storyOpen ? `${fid}-story` : undefined}
              className="w-full min-h-11 shrink-0 flex items-center justify-between gap-2 rounded-lg text-start text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="inline-flex items-center gap-1.5">
                {t('report.fullStory.title')}
                {fullStory.trim() && (
                  <>
                    <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden />
                    <span className="sr-only">{t('report.fullStory.added')}</span>
                  </>
                )}
              </span>
              <span className="text-xs text-primary">{storyOpen ? t('report.fullStory.close') : t('report.fullStory.open')}</span>
            </button>
            {storyOpen && (
              <div id={`${fid}-story`} className="min-h-0 max-h-[40dvh] overflow-y-auto space-y-1.5 pb-2">
                <p className="text-sm text-muted-foreground">{t('report.fullStory.hint')}</p>
                <textarea
                  value={fullStory}
                  onChange={(e) => setFullStory(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  aria-label={t('report.fullStory.title')}
                  placeholder={t('report.fullStory.placeholder')}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <PiiHint className="mt-0" />
                <p className="text-xs text-muted-foreground text-end font-mono">{fullStory.length}/5000</p>
              </div>
            )}
          </div>
        )}

        {/* composer, active while answering the story question */}
        {stage === 'story' && !fuActive && (
          <div className="flex min-h-0 flex-col gap-2.5 border-t border-border bg-card/95 backdrop-blur px-3 py-3">
            {/* recorder, transcript and tips scroll (and shrink) on their own so the send row always stays visible */}
            <div className="min-h-0 max-h-[38dvh] overflow-y-auto space-y-2.5">
              <VoiceRecorder compact followUp onChange={(b, tx) => { setAudio(b); setTranscript(tx); }} />
              <PiiHint className="mt-0" />
            </div>
            <div className="flex shrink-0 items-end gap-2">
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (canSendStory) sendStory(); } }}
                placeholder={t('report.chat.input.placeholder')}
                aria-label={t('report.chat.input.placeholder')}
                rows={2}
                maxLength={5000}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                size="icon"
                className="w-11 h-11 rounded-full shrink-0"
                disabled={!canSendStory}
                aria-label={t('report.chat.send')}
                onClick={sendStory}
              >
                <SendHorizonal className="w-5 h-5 rtl:-scale-x-100" aria-hidden />
              </Button>
            </div>
          </div>
        )}

        {/* composer for the open follow-up question (fixed and AI questions) */}
        {activeProbe && (
          <div className="flex min-h-0 flex-col gap-2 border-t border-border bg-card/95 backdrop-blur px-3 py-3">
            <div className="min-h-0 max-h-[38dvh] overflow-y-auto">
              <VoiceRecorder
                key={`probe-${activeProbe.id}-${probeIdx}`}
                compact
                onChange={(b, tx) => { setProbeBlob(b); setProbeTranscript(tx); }}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Input
                value={probeDraft}
                onChange={(e) => setProbeDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendProbeAnswer(activeProbe.id); }}
                placeholder={t('report.chat.input.placeholder')}
                aria-label={t('report.chat.input.placeholder')}
                maxLength={2000}
                className="bg-background h-11 text-base md:text-sm flex-1 rounded-xl"
              />
              <Button
                size="icon"
                className="w-11 h-11 rounded-full shrink-0"
                disabled={!probeDraft.trim() && !probeTranscript.trim() && !probeBlob}
                aria-label={t('report.chat.send')}
                onClick={() => sendProbeAnswer(activeProbe.id)}
              >
                <SendHorizonal className="w-5 h-5 rtl:-scale-x-100" aria-hidden />
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="w-full shrink-0 text-sm text-muted-foreground" onClick={() => answerProbe(activeProbe.id, null)}>
              {t('report.chat.skip')}
            </Button>
          </div>
        )}

        {/* back link for pre-chat */}
        {stage === 'consent' && (
          <div className="shrink-0 border-t border-border bg-card px-4 py-2.5 space-y-2">
            {consentMsg && (
              <Button variant="action" size="lg" className="w-full rounded-xl" onClick={() => agreeConsent(consentMsg.id)}>
                <Check className="w-4 h-4" aria-hidden /> {t('report.chat.start')}
              </Button>
            )}
            <Button asChild variant="ghost" className="min-h-11 text-sm -ms-2">
              <Link to="/"><ChevronLeft className="w-4 h-4 rtl:-scale-x-100" aria-hidden />{t('common.back')}</Link>
            </Button>
          </div>
        )}
      </div>
    </PhoneShell>
    </>
  );
}

const STAGE_ORDER: Stage[] = ['consent', 'about', 'area', 'story', 'types', 'probe', 'photos', 'contact'];
