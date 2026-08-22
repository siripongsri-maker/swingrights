import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Mic, Send, SkipForward, Leaf, Loader2, ShieldCheck,
  ClipboardCheck, Bot, User, MessageCircleQuestion, Phone, Building2, MapPin, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import LanguageToggle from '@/components/LanguageToggle';
import VoiceRecorder from '@/components/VoiceRecorder';
import SpeakButton from '@/components/SpeakButton';
import AreaPicker from '@/components/screening/AreaPicker';
import { ISSUE_KEYS } from '@/lib/caseReport';
import { useI18n } from '@/i18n';
import type { Lang } from '@/i18n';

type ChatMsg = {
  id: string;
  from: 'bot' | 'user';
  text: string;
  audioUrl?: string;
  photos?: { url: string; path: string }[];
  chips?: string[];
  quick?: { label: string; value: string }[];
  partners?: Partner[];
  doneCta?: boolean;
};

type Partner = {
  id: string;
  name: string;
  org_type: string | null;
  province: string | null;
  district: string | null;
  phone: string | null;
  services: string[];
};

type ProbeQId = 'when' | 'where' | 'who' | 'safety' | 'needs';

type Step =
  | 'consent' | 'profile'
  | 'story'
  | 'probe'
  | 'photos'
  | 'partners'
  | 'submit' | 'done';

const ISSUE_EMOJI: Record<string, string> = {
  violence: '🛡️', health: '🏥', housing: '🏠', wage: '💰', legal: '⚖️',
  mental: '🧠', discrimination: '🏳️‍🌈', safety: '🚨', immigration: '🛂', other: '💬',
};

const PROBE_QUESTIONS: { id: ProbeQId; qKey: string; quick?: { labelKey: string; value: string }[] }[] = [
  { id: 'when', qKey: 'report.probe.when.q' },
  { id: 'where', qKey: 'report.probe.where.q' },
  { id: 'who', qKey: 'report.probe.who.q' },
  {
    id: 'safety', qKey: 'report.probe.safety.q',
    quick: [
      { labelKey: 'report.probe.safety.safe', value: 'safe' },
      { labelKey: 'report.probe.safety.unsure', value: 'unsure' },
      { labelKey: 'report.probe.safety.unsafe', value: 'unsafe' },
    ],
  },
  { id: 'needs', qKey: 'report.probe.needs.q' },
];

const PREVIEW_LIFE_S = 300;

export default function SelfReport() {
  const { t, lang, aiTtsUrl } = useI18n();

  // ---- wizard state ----
  const [step, setStep] = useState<Step>('consent');
  const [submitting, setSubmitting] = useState(false);

  // ---- collected data ----
  const [area, setArea] = useState({ province: '', district: '', subdistrict: '' });
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [storyText, setStoryText] = useState('');
  const [probeAnswers, setProbeAnswers] = useState<Partial<Record<ProbeQId, { text: string; audioPath: string | null }>>>({});
  const [probeIdx, setProbeIdx] = useState(0);
  const [safetyRisk, setSafetyRisk] = useState(false);
  const [photos, setPhotos] = useState<{ url: string; path: string }[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [submitted, setSubmitted] = useState<{ code: string; pin: string; statusUrl: string } | null>(null);

  // ---- chat log + input ----
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);
  // Placeholder id so media can be uploaded before the case exists
  const [pendingId] = useState(() => crypto.randomUUID());

  const push = useCallback((m: Omit<ChatMsg, 'id'>) => {
    msgId.current += 1;
    const full = { ...m, id: `m${msgId.current}` };
    setMsgs(prev => [...prev, full]);
    return full.id;
  }, []);
  const patch = useCallback((id: string, p: Partial<ChatMsg>) => {
    setMsgs(prev => prev.map(m => m.id === id ? { ...m, ...p } : m));
  }, []);

  // boot greeting
  useEffect(() => {
    push({ from: 'bot', text: t('report.chat.greet') });
    setTimeout(() => {
      push({ from: 'bot', text: `${t('report.privacy.p1')}\n\n${t('report.privacy.p2')}`, quick: [{ label: t('report.chat.start'), value: '__consent' }] });
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, step, probeIdx]);

  // ---------- helpers ----------
  const trIssue = (k: string) => `${ISSUE_EMOJI[k] ?? ''} ${t(`issue.${k}`)}`;

  const currentProbe = PROBE_QUESTIONS[probeIdx];

  const buildIssueChips = () => [...selectedIssues].sort().map(trIssue);

  // ---------- partners (referral destination) ----------
  const fetchPartners = useCallback(async (province: string, issues: string[]) => {
    let q = supabase
      .from('referral_partners')
      .select('id,name,org_type,province,district,phone,services')
      .eq('active', true)
      .order('name')
      .limit(50);
    const { data } = await q;
    const all = (data ?? []) as unknown as Partner[];
    const local = all.filter(p => p.province && province && p.province.includes(province.replace('จังหวัด', '')));
    const issueMatched = (list: Partner[]) => {
      if (!issues.length) return list;
      const hit = list.filter(p => p.services?.some(s => issues.includes(s)));
      return hit.length ? hit : list;
    };
    let chosen = issueMatched(local).slice(0, 4);
    // fill with nationwide hotlines if few local matches
    if (chosen.length < 3) {
      const national = all.filter(p => !p.province || p.province === '');
      chosen = [...chosen, ...national.filter(n => !chosen.some(c => c.id === n.id))].slice(0, 5);
    }
    return chosen;
  }, []);

  // ---------- flow ----------
  const startProfile = useCallback(() => {
    setStep('profile');
    push({ from: 'bot', text: t('intake.area.label') });
  }, [push, t]);

  const advanceProbe = useCallback((answers: typeof probeAnswers, startAt = 0) => {
    // find next unanswered question from startAt
    for (let i = startAt; i < PROBE_QUESTIONS.length; i++) {
      if (!answers[PROBE_QUESTIONS[i].id]) {
        setProbeIdx(i);
        const q = PROBE_QUESTIONS[i];
        push({
          from: 'bot',
          text: `${t('report.probe.count', { i: i + 1, n: PROBE_QUESTIONS.length })} — ${t(q.qKey)}`,
          quick: q.quick?.map(x => ({ label: t(x.labelKey), value: `__probe_${q.id}_${x.value}` })),
        });
        return;
      }
    }
    // all answered → photos
    setStep('photos');
    push({ from: 'bot', text: t('report.chat.photos.ask') });
  }, [push, t]);

  const goPartners = useCallback(async () => {
    setStep('partners');
    const found = await fetchPartners(area.province, selectedIssues);
    setPartners(found);
    push({
      from: 'bot',
      text: found.length ? t('report.partners.title') : t('report.partners.none'),
      partners: found,
      quick: [{ label: t('report.partners.ack'), value: '__submit' }],
    });
  }, [area.province, selectedIssues, fetchPartners, push, t]);

  const handleStorySend = useCallback((text: string, audioPath: string | null) => {
    push({ from: 'user', text: text || '🎤', audioUrl: audioPath ? 'pending' : undefined });
    // single submit happens only at the end — just advance to probing here
    setStep('probe');
    push({ from: 'bot', text: t('report.probe.intro') });
    setTimeout(() => advanceProbe({}, 0), 350);
  }, [push, t, advanceProbe]);

  const handleProbeAnswer = useCallback((qid: ProbeQId, text: string, audioPath: string | null) => {
    const label = text || t('report.chat.notSpecified');
    push({ from: 'user', text: `❓ ${label}`, audioUrl: audioPath ? 'pending' : undefined });
    const next = { ...probeAnswers, [qid]: { text: label, audioPath } };
    setProbeAnswers(next);
    if (qid === 'safety') {
      if (text === 'unsafe' || /ไม่ปลอดภัย|not safe|မလုံခြုံ|មិនសុវត្ថិ|ບໍ່ປອດໄພ/i.test(text)) {
        setSafetyRisk(true);
        push({ from: 'bot', text: t('report.probe.safety.alert') });
      }
    }
    setTimeout(() => advanceProbe(next, probeIdx + 1), 250);
  }, [probeAnswers, probeIdx, push, t, advanceProbe]);

  const handleProbeSkip = useCallback(() => {
    const q = currentProbe;
    push({ from: 'user', text: t('report.chat.skipped') });
    const next = { ...probeAnswers, [q.id]: { text: t('report.chat.skipped'), audioPath: null } };
    setProbeAnswers(next);
    setTimeout(() => advanceProbe(next, probeIdx + 1), 250);
  }, [currentProbe, probeAnswers, probeIdx, push, t, advanceProbe]);

  // ---------- submit (single) ----------
  const doSubmit = useCallback(async () => {
    setStep('submit');
    setSubmitting(true);
    const notes = [
      t('report.success.summary'),
      storyText ? `• ${storyText}` : null,
      ...PROBE_QUESTIONS.map(q => {
        const a = probeAnswers[q.id];
        if (!a || a.text === t('report.chat.skipped')) return null;
        return `• ${t(q.qKey)} → ${a.text}`;
      }),
    ].filter(Boolean).join('\n');

    const payload: Record<string, unknown> = {
      nickname: `${t('selfreport.anonymous')} (${t(`lang.name.${lang}`)})`,
      province: area.province, district: area.district, subdistrict: area.subdistrict,
      lat: coords.lat, lng: coords.lng,
      pdpa_consent: true, ai_consent: true,
      issues: selectedIssues,
      urgency: safetyRisk ? 'critical' : 'normal',
      summary: storyText || selectedIssues.map(k => t(`issue.${k}`)).join(', '),
      additional_notes: notes,
      photo_urls: photos.map(p => p.url),
      referrals: partners.slice(0, 3).map(p => ({ org_name: p.name, note: t('report.partners.noteAuto') })),
      created_by: null,
    };
    const { data, error } = await supabase.rpc('submit_case', { p: payload });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      setStep('partners');
      return;
    }
    const res = data as { case_code: string; pin: string; case_id: string };
    const statusUrl = `${window.location.origin}/track?c=${res.case_code}`;
    setSubmitted({ code: res.case_code, pin: res.pin, statusUrl });
    localStorage.setItem(`swing_case_${res.case_code}`, res.pin);
    try {
      const arr = JSON.parse(localStorage.getItem('swing_my_cases') ?? '[]') as { code: string; pin: string }[];
      if (!arr.some(x => x.code === res.case_code)) arr.unshift({ code: res.case_code, pin: res.pin });
      localStorage.setItem('swing_my_cases', JSON.stringify(arr.slice(0, 20)));
    } catch { /* localStorage full/blocked */ }
    setStep('done');
    push({
      from: 'bot',
      text: `${t('selfreport.success.title')}\n\n${t('selfreport.success.code')}: ${res.case_code}\n${t('selfreport.success.pin')}: ${res.pin}`,
      doneCta: true,
    });
  }, [area, coords, selectedIssues, storyText, probeAnswers, safetyRisk, photos, partners, push, t, lang]);

  // ---------- quick-reply handler ----------
  const handleQuick = useCallback((value: string, label: string) => {
    if (value === '__consent') {
      push({ from: 'user', text: label });
      startProfile();
      return;
    }
    if (value === '__submit') {
      push({ from: 'user', text: label });
      void doSubmit();
      return;
    }
    if (value.startsWith('__probe_')) {
      const rest = value.slice('__probe_'.length);
      const [qid, val] = rest.split('_') as [ProbeQId, string];
      handleProbeAnswer(qid, t(`report.probe.safety.${val}`), null);
      return;
    }
    if (value.startsWith('__issue_')) {
      const key = value.replace('__issue_', '');
      setSelectedIssues(prev => prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]);
      return;
    }
  }, [push, startProfile, doSubmit, handleProbeAnswer, t]);

  // profile "next": area issues question
  const askIssues = useCallback(() => {
    push({ from: 'user', text: `📍 ${[area.subdistrict, area.district, area.province].filter(Boolean).join(' • ')}` });
    push({
      from: 'bot',
      text: t('selfreport.issues.label'),
      chips: ISSUE_KEYS.map(k => `__issue_${k}`),
      quick: selectedIssues.length ? [{ label: t('selfreport.issues.next'), value: '__issues_done' }] : undefined,
    });
  }, [area, selectedIssues, push, t]);

  // when issues selection changes, refresh the "next" quick chip on last chips msg
  const lastChipsMsgId = useRef<string | null>(null);
  useEffect(() => {
    if (lastChipsMsgId.current) {
      patch(lastChipsMsgId.current, {
        quick: selectedIssues.length ? [{ label: t('selfreport.issues.next'), value: '__issues_done' }] : undefined,
      });
    }
  }, [selectedIssues, patch, t]);

  const handleIssuesDone = useCallback(() => {
    push({ from: 'user', text: buildIssueChips().join('  ') });
    setStep('story');
    push({ from: 'bot', text: t('selfreport.story.ask') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIssues, push, t]);

  // ---------- media uploads ----------
  const uploadBlob = useCallback(async (fileName: string, blob: Blob): Promise<string | null> => {
    const fd = new FormData();
    fd.append('kind', 'audio');
    fd.append('path', `cases/${pendingId}/${fileName}`);
    fd.append('file', blob, fileName);
    try {
      const { data, error } = await supabase.functions.invoke('upload-case-media', { body: fd });
      if (error) throw error;
      return (data as { url?: string }).url ?? null;
    } catch (e) {
      console.error(e);
      toast.error(t('report.upload.error'));
      return null;
    }
  }, [pendingId, t]);

  const storyBlobRef = useRef<string | null>(null);
  const onStoryBlob = useCallback(async (blob: Blob) => {
    storyBlobRef.current = await uploadBlob('story.webm', blob);
  }, [uploadBlob]);

  const probeBlobCb = useMemo(() => {
    const map = {} as Record<ProbeQId, (blob: Blob) => Promise<void>>;
    for (const q of PROBE_QUESTIONS) {
      map[q.id] = async (blob: Blob) => {
        const path = await uploadBlob(`probe-${q.id}-${Date.now()}.webm`, blob);
        if (path) setProbeAnswers(prev => ({ ...prev, [q.id]: { text: prev[q.id]?.text ?? '', audioPath: path } }));
      };
    }
    return map;
  }, [uploadBlob]);

  // ---------- photos ----------
  const onPickPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = 3 - photos.length;
    const list = Array.from(files).slice(0, room);
    if (list.length < files.length) toast.info(t('report.photos.max'));
    for (const f of list) {
      const fd = new FormData();
      fd.append('kind', 'photo');
      fd.append('path', `cases/${pendingId}/${Date.now()}-${f.name.replace(/[^\w.\-ก-๙]/g, '_')}`);
      fd.append('file', f, f.name);
      try {
        const { data, error } = await supabase.functions.invoke('upload-case-media', { body: fd });
        if (error) throw error;
        const d = data as { url: string; path: string };
        setPhotos(prev => [...prev, { url: d.url, path: d.path }]);
      } catch (e) { console.error(e); toast.error(t('report.upload.error')); }
    }
  };

  // ---------- text input send ----------
  const onSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    if (step === 'story') { setStoryText(text); handleStorySend(text, storyBlobRef.current); }
    else if (step === 'probe') handleProbeAnswer(currentProbe.id, text, probeAnswers[currentProbe.id]?.audioPath ?? null);
  };

  // ---------- done screen pieces ----------
  const trackMy = useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem('swing_my_cases') ?? '[]') as { code: string; pin: string }[]);
    } catch { return []; }
  }, [submitted]);

  const answeredCount = PROBE_QUESTIONS.filter(q => {
    const a = probeAnswers[q.id];
    return a && a.text !== t('report.chat.skipped');
  }).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Leaf className="h-6 w-6 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{t('selfreport.title')}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> {t('selfreport.subtitle')}
            </p>
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* chat log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {msgs.map(m => (
            <div key={m.id} className={`flex gap-2 ${m.from === 'user' ? 'flex-row-reverse' : ''} animate-pop`}>
              <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.from === 'bot' ? 'bg-primary/15 text-primary' : 'bg-accent/20 text-accent-foreground'}`}>
                {m.from === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${m.from === 'bot' ? 'bg-card border border-border rounded-tl-sm' : 'bg-primary text-primary-foreground rounded-tr-sm'}`}>
                {m.text}
                {m.audioUrl && (
                  <div className="mt-2">
                    {m.audioUrl === 'pending'
                      ? <span className="text-xs opacity-70 flex items-center gap-1"><Mic className="h-3 w-3" /> {t('report.audio.saved')}</span>
                      : <audio controls preload="none" src={m.audioUrl} className="h-9 w-full max-w-[240px]" />}
                  </div>
                )}
                {m.from === 'bot' && (
                  <div className="mt-1.5">
                    <SpeakButton text={m.text} ttsUrl={m.partners?.length ? null : aiTtsUrl(m.text)} />
                  </div>
                )}
                {/* partner cards */}
                {m.partners && m.partners.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.partners.map(p => (
                      <div key={p.id} className="rounded-xl border border-border bg-background p-3 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary" /> {p.name}
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">{t(`report.partners.orgType.${p.org_type ?? 'other'}`)}</Badge>
                          {(p.district || p.province) && (
                            <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {[p.district, p.province].filter(Boolean).join(' ')}</span>
                          )}
                          {p.phone && (
                            <a href={`tel:${p.phone}`} className="flex items-center gap-0.5 text-primary font-medium">
                              <Phone className="h-3 w-3" /> {p.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* done CTA: recap + link */}
                {m.doneCta && submitted && (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl border border-border bg-background p-3 text-xs space-y-1">
                      <p className="font-semibold text-foreground">{t('report.success.summary')}</p>
                      <p>📍 {[area.subdistrict, area.district, area.province].filter(Boolean).join(' • ') || t('report.chat.notSpecified')}</p>
                      <p>{buildIssueChips().join('  ')}</p>
                      <p>💬 {t('report.success.answered', { n: answeredCount })}</p>
                      {safetyRisk && <p className="text-destructive font-medium">{t('report.success.urgent')}</p>}
                      <p className="pt-1 border-t border-border font-medium text-foreground">{t('report.success.forward')}</p>
                      {partners.length ? partners.map(p => (
                        <p key={p.id}>→ {p.name}{p.phone ? ` (${p.phone})` : ''}</p>
                      )) : <p>→ {t('report.success.forwardNone')}</p>}
                    </div>
                    <Link to={submitted.statusUrl.replace(window.location.origin, '')}>
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <MessageCircleQuestion className="h-3.5 w-3.5" /> {t('track.card.view')}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
                {/* issue toggle chips */}
                {m.chips && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {m.chips.map(c => {
                      const key = c.replace('__issue_', '');
                      const on = selectedIssues.includes(key);
                      return (
                        <button
                          key={c}
                          onClick={() => {
                            lastChipsMsgId.current = m.id;
                            handleQuick(c, key);
                          }}
                          className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}
                        >
                          {trIssue(key)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* quick replies */}
                {m.quick && m.quick.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {m.quick.map(qq => (
                      <Button key={qq.value} size="sm" variant={m.from === 'bot' ? 'default' : 'secondary'} className="rounded-full text-xs"
                        onClick={() => {
                          if (qq.value === '__issues_done') { handleIssuesDone(); return; }
                          handleQuick(qq.value, qq.label);
                        }}>
                        {qq.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {submitting && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>

      {/* bottom composer */}
      <div className="border-t border-border bg-card/90 backdrop-blur sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {step === 'consent' && (
            <p className="text-center text-xs text-muted-foreground">{t('selfreport.noLogin')}</p>
          )}

          {step === 'profile' && (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <AreaPicker
                  value={area}
                  onChange={setArea}
                  onPin={v => setCoords(v)}
                  initialPin={{ lat: coords.lat, lng: coords.lng }}
                />
                <Button className="w-full" disabled={!area.province} onClick={askIssues}>
                  {t('selfreport.area.next')}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'story' && (
            <div className="space-y-2">
              <VoiceRecorder onBlob={onStoryBlob} onTranscript={txt => setInputText(txt)} />
              <div className="flex gap-2">
                <Input value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onSend()}
                  placeholder={t('report.chat.input.placeholder')} className="flex-1" />
                <Button onClick={onSend} disabled={!inputText.trim() && !storyBlobRef.current}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground"
                onClick={() => { push({ from: 'user', text: t('report.chat.skipped') }); setStep('probe'); push({ from: 'bot', text: t('report.probe.intro') }); setTimeout(() => advanceProbe({}, 0), 350); }}>
                <SkipForward className="h-3.5 w-3.5 me-1" /> {t('report.chat.skip')}
              </Button>
            </div>
          )}

          {step === 'probe' && currentProbe && (
            <div className="space-y-2">
              <VoiceRecorder
                key={`${currentProbe.id}-${probeIdx}`}
                onBlob={probeBlobCb[currentProbe.id]}
                onTranscript={txt => setInputText(txt)}
              />
              <div className="flex gap-2">
                <Input value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onSend()}
                  placeholder={t('report.chat.input.placeholder')} className="flex-1" />
                <Button onClick={onSend} disabled={!inputText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={handleProbeSkip}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 'photos' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="flex-1">
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden"
                    onChange={e => { void onPickPhotos(e.target.files); e.target.value = ''; }} />
                  <Button variant="outline" className="w-full" asChild>
                    <span>📷 {t('report.photos.add')} ({photos.length}/3)</span>
                  </Button>
                </label>
                <Button onClick={() => { push({ from: 'user', text: photos.length ? `📷 ${photos.length} ${t('report.chat.photos.unit')}` : t('report.chat.skipped'), photos }); void goPartners(); }}>
                  {photos.length ? t('report.chat.confirm') : t('report.chat.skip')}
                </Button>
              </div>
              {photos.length > 0 && (
                <div className="flex gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="h-14 w-14 rounded-lg bg-primary/10 border border-border flex items-center justify-center text-xs">
                      📷 {i + 1}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(step === 'partners' || step === 'submit') && !submitting && (
            <p className="text-center text-xs text-muted-foreground">{t('report.partners.ack')} ↑</p>
          )}

          {step === 'done' && (
            <div className="flex gap-2">
              <Link to="/track" className="flex-1">
                <Button variant="outline" className="w-full gap-1.5">
                  <ClipboardCheck className="h-4 w-4" /> {t('track.title')}
                  {trackMy.length > 0 && <Badge variant="secondary">{trackMy.length}</Badge>}
                </Button>
              </Link>
              <Link to="/" className="flex-1">
                <Button variant="ghost" className="w-full">{t('nav.home')}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
