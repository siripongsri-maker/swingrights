import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Mic, Camera, Copy, AlertTriangle, Sparkles, ArrowRight, Loader2, ShieldCheck, ClipboardList, CalendarIcon, X as XIcon, RotateCcw, Trash2, SkipForward, Send, Pencil, Scale, FileText, Share2, HeartHandshake, ChevronDown, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { PhoneShell, SwingBadge } from '@/components/screening/PhoneShell';
import { SectionDivider } from '@/components/screening/SectionDivider';
import { SpeakButton } from '@/components/screening/SpeakButton';
import { ScreeningTools, summarizeScreening } from '@/components/screening/ScreeningTools';
import { nrmPositive } from '@/lib/screeningTools';
import { SeverityBadge } from '@/components/screening/SeverityBadge';
import { uploadCaseMedia } from '@/lib/uploadMedia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useIntake } from '@/store/intake';
import { AreaPicker } from '@/components/screening/AreaPicker';
import { GENDERS, KP_GROUPS, QUESTIONS, REFERRAL_OPTIONS, SEV_LABEL, SPECIAL_TESTS, VIOLATION_TYPES, type Severity } from '@/lib/screening';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { stripImageMetadata } from '@/lib/exif';
import { clearDraft, readDraftMeta, loadAudioBlobs, loadPhotoBlobs, saveAudioBlobs, savePhotoBlobs } from '@/lib/draft';
import { saveLocalCase, deleteLocalCase, listLocalCases, importLegacyDraft, currentSessionId, rotateSessionId } from '@/lib/localCases';
import { toast } from 'sonner';
import { printCaseDocument, docInputFromIntake, DOC_KINDS, type DocKind } from '@/lib/caseDocuments';
import { DocumentDraftDialog } from '@/components/admin/DocumentDraftDialog';
import { printCaseReport, type CaseReportData } from '@/lib/caseReport';
import { useI18n } from "@/i18n";
import { PiiHint, usePiiGuard } from "@/lib/piiGuard";


type Step = 'consent' | 'reporter' | 'victim' | 'voice' | 'assess' | 'ai' | 'referral' | 'signature' | 'confirmed';


export default function Intake() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const intake = useIntake();
  const [step, setStep] = useState<Step>('consent');
  const [draftAt, setDraftAt] = useState<number | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  // Phase 0.5 — offer to resume an unfinished draft (prevents re-traumatising retelling)
  useEffect(() => {
    const meta = readDraftMeta();
    if (meta?.updatedAt && !intake.caseCode) setDraftAt(meta.updatedAt);
    void importLegacyDraft().then(() => setPending(listLocalCases().length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multi-case vault — every session gets its own slot so nothing overwrites an earlier case
  useEffect(() => {
    if (intake.caseCode) return;
    const hasContent =
      intake.victim.name || intake.reporter.name ||
      intake.answers.some((a) => a?.transcript?.trim());
    if (!hasContent) return;
    const timer = setTimeout(() => {
      const { set: _s, patch: _p, reset: _r, photos, audioBlobs, ...state } = useIntake.getState() as any;
      void saveLocalCase({
        id: currentSessionId(),
        kind: 'draft',
        state,
        audio: audioBlobs,
        photos: photos.map((p: any) => ({ blob: p.blob, name: p.name })),
      }).then(() => setPending(listLocalCases().length));
    }, 1200);
    return () => clearTimeout(timer);
  }, [intake]);


  const resumeDraft = async () => {
    const [audio, photos] = await Promise.all([loadAudioBlobs(), loadPhotoBlobs()]);
    intake.patch({
      audioBlobs: audio,
      photos: photos.map((p) => ({ blob: p.blob, name: p.name, previewUrl: URL.createObjectURL(p.blob) })),
    });
    setDraftAt(null);
    toast.success(t('intake.toast.resumedDraft'));
  };

  const discardDraft = async () => {
    await clearDraft();
    intake.reset();
    setDraftAt(null);
    setStep('consent');
    toast.success(t('intake.toast.startedNew'));
  };

  const goBack = () => {
    const order: Step[] = ['consent', 'reporter', 'victim', 'voice', 'assess', 'ai', 'referral', 'signature', 'confirmed'];
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
    else navigate('/');
  };

  return (
    <PhoneShell onBack={step === 'consent' ? undefined : goBack} onClose={() => navigate('/')}>
      {draftAt && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary-soft/50 p-3">
          <p className="text-xs font-medium text-primary mb-1">{t('intake.draft.found')}</p>
          <p className="text-[11px] text-muted-foreground mb-2.5">
            {t('intake.draft.savedAt', { date: new Date(draftAt).toLocaleString('th-TH') })}
          </p>
          <div className="flex gap-2">
            <Button variant="action" onClick={resumeDraft} className="flex-1 h-10 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> {t('intake.draft.resume')}
            </Button>
            <Button onClick={discardDraft} variant="outline" className="flex-1 h-9 rounded-lg text-xs">
              <Trash2 className="w-3.5 h-3.5" /> {t('intake.draft.startNew')}
            </Button>
          </div>
        </div>
      )}
      {pending > 1 && (
        <button
          onClick={() => navigate('/recover')}
          className="mb-4 w-full text-left rounded-xl border border-border bg-muted/40 p-3"
        >
          <p className="text-xs font-medium">{t('intake.pending.count', { n: pending })}</p>
          <p className="text-[11px] text-muted-foreground">{t('intake.pending.tap')}</p>
        </button>
      )}

      {/* key={step} remounts each step so the fade transition plays on every change */}
      <div key={step} className="animate-fade-in">
        {step === 'consent' && <ConsentStep onNext={() => setStep('reporter')} />}
        {step === 'reporter' && <ReporterStep onNext={() => setStep('victim')} />}
        {step === 'victim' && <VictimStep onNext={() => setStep('voice')} />}
        {step === 'voice' && <VoiceStep onNext={() => setStep('assess')} />}
        {step === 'assess' && <AssessStep onNext={() => setStep('ai')} />}
        {step === 'ai' && <AIStep onNext={() => setStep('referral')} />}
        {step === 'referral' && <ReferralStep onNext={() => setStep('signature')} />}
        {step === 'signature' && <SignatureStep onNext={() => setStep('confirmed')} />}
        {step === 'confirmed' && <ConfirmedStep onReset={() => { void clearDraft(); rotateSessionId(); intake.reset(); setStep('consent'); }} />}
      </div>
    </PhoneShell>
  );
}

/* ----------------- 1. CONSENT ----------------- */
function ConsentStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const { consent, set } = useIntake();
  const items = [
    t('intake.consent.item1'),
    t('intake.consent.item2'),
    t('intake.consent.item3'),
    t('intake.consent.item4'),
  ];
  const ready = consent.cb1 && consent.cb2;
  return (
    <div>
      <SwingBadge />
      <h1 className="text-2xl font-medium text-foreground leading-tight mt-3 text-balance">{t('intake.consent.title')}</h1>
      <div className="flex items-center justify-between gap-3 mt-1 mb-5">
        <p className="text-sm text-muted-foreground">{t('intake.consent.subtitle')}</p>
        <SpeakButton text={items.join(' ')} label={t('intake.consent.listen')} />
      </div>


      <div className="bg-muted/60 border border-border rounded-2xl p-4 space-y-3 mb-4">
        {items.map((t, i) => (
          <div key={i} className="flex gap-2.5 items-start text-sm leading-relaxed">
            <span className="w-[18px] h-[18px] mt-0.5 rounded-full bg-success flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 text-success-foreground" strokeWidth={3} />
            </span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 rounded-xl p-3 mb-5 flex gap-2.5 items-start">
        <span className="bg-destructive text-destructive-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">SOS</span>
        <p className="text-xs text-destructive leading-relaxed">
          {t('intake.consent.sos').split('1300')[0]}<strong>1300</strong>{t('intake.consent.sos').split('1300')[1].split('1669')[0]}<strong>1669</strong>{t('intake.consent.sos').split('1669')[1]}
        </p>
      </div>

      {[
        { key: 'cb1', label: t('intake.consent.cb1'), required: true },
        { key: 'cb2', label: t('intake.consent.cb2'), required: true },
        {
          key: 'cb3',
          label: t('intake.consent.cb3label'),
          note: t('intake.consent.cb3note'),
          required: false,
        },
      ].map((c) => (
        <button
          key={c.key}
          onClick={() => set('consent', { ...consent, [c.key]: !consent[c.key as 'cb1' | 'cb2' | 'cb3'] })}
          className="flex gap-2.5 items-start mb-3 w-full text-left"
        >
          <span className={`w-[18px] h-[18px] mt-0.5 rounded border flex items-center justify-center transition shrink-0 ${
            consent[c.key as 'cb1' | 'cb2' | 'cb3'] ? 'bg-primary border-primary' : 'bg-card border-border'
          }`}>
            {consent[c.key as 'cb1' | 'cb2' | 'cb3'] && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
          </span>
          <span className="text-sm">
            {c.label}
            {!c.required && <span className="block text-[11px] text-muted-foreground mt-0.5">{c.note}</span>}
          </span>
        </button>
      ))}


      <Button variant="action" onClick={onNext} disabled={!ready} className="w-full mt-3 shadow-elegant">
        <Check className="w-4 h-4" /> {t('intake.consent.start')}
      </Button>
      <Link to="/privacy" target="_blank" className="block text-center text-xs text-foreground mt-3 underline underline-offset-4">
        {t('intake.consent.privacyLink')}
      </Link>
      <Link to="/" className="block text-center text-xs text-muted-foreground mt-2 underline-offset-4 hover:underline">
        {t('intake.consent.notReady')}
      </Link>
    </div>
  );
}

/* ----------------- 2. REPORTER ----------------- */
function ReporterStep({ onNext }: { onNext: () => void }) {
  const { reporter, set } = useIntake();
  const { t } = useI18n();
  const update = (k: keyof typeof reporter, v: string) => set('reporter', { ...reporter, [k]: v });
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{t('intake.reporter.eyebrow')}</p>
      <h1 className="text-xl font-medium mt-1 mb-4">{t('intake.reporter.title')}</h1>

      <Label className="text-xs text-muted-foreground mb-1.5 block">{t('intake.reporter.statusLabel')}</Label>
      <div className="flex gap-1.5 mb-4">
        {(['self', 'other'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => set('reporter', { ...reporter, type: opt })}
            className={`flex-1 py-2.5 rounded-lg text-sm border transition ${
              reporter.type === opt ? 'bg-primary-soft border-primary text-primary font-medium' : 'bg-muted/60 border-border text-muted-foreground'
            }`}
          >
            {opt === 'self' ? t('intake.reporter.self') : t('intake.reporter.other')}
          </button>
        ))}
      </div>

      <Field label={t('intake.reporter.nameLabel')}>
        <Input value={reporter.name} onChange={(e) => update('name', e.target.value)} placeholder={t('intake.common.namePlaceholder')} />
      </Field>
      <Field label={t('intake.reporter.addressLabel')}>
        <Textarea value={reporter.address} onChange={(e) => update('address', e.target.value)} placeholder={t('intake.reporter.addressPlaceholder')} />
        <PiiHint />
      </Field>

      <PhotoUpload />


      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Email">
          <Input type="email" value={reporter.email} onChange={(e) => update('email', e.target.value)} placeholder="example@mail.com" />
        </Field>
        <Field label={t('intake.reporter.phoneLabel')}>
          <Input type="tel" value={reporter.phone} onChange={(e) => update('phone', e.target.value)} placeholder="08x-xxx-xxxx" />
        </Field>
      </div>

      <Button
        onClick={() => {
          if (!reporter.name.trim()) return toast.error(t('intake.reporter.errName'));
          onNext();
        }}
         variant="action"
         className="w-full mt-4"
      >
        ถัดไป <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ----------------- 3. VICTIM ----------------- */
function VictimStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const { victim, profile, reporter, patch, set } = useIntake();
  const updateV = (k: keyof typeof victim, v: string) => set('victim', { ...victim, [k]: v });
  const updateP = (k: keyof typeof profile, v: any) => set('profile', { ...profile, [k]: v });

  const calcAge = (dob: string) => {
    if (!dob) return '';
    const b = new Date(dob), now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return t('intake.victim.ageYears', { age });
  };

  const toggleVT = (label: string) => {
    const cur = profile.initialViolationTypes;
    updateP('initialViolationTypes', cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]);
  };

  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{t('intake.victim.eyebrow')}</p>
      <h1 className="text-xl font-medium mt-1 mb-4">{t('intake.victim.title')}</h1>

      {reporter.type === 'self' && (
        <button
          onClick={() => {
            patch({
              victim: { name: reporter.name, contact: `${reporter.address} ${reporter.phone}`.trim() },
            });
            toast.success(t('intake.victim.copied'));
          }}
          className="w-full mb-4 flex items-center gap-2 text-xs text-primary bg-primary-soft/50 border border-primary/20 rounded-lg p-2.5 hover:bg-primary-soft transition"
        >
          <Copy className="w-3.5 h-3.5" /> {t('intake.victim.copyFromReporter')}
        </button>
      )}

      <Field label={t('intake.victim.nameLabel')}>
        <Input value={victim.name} onChange={(e) => updateV('name', e.target.value)} placeholder={t('intake.common.namePlaceholder')} />
      </Field>
      <Field label={t('intake.victim.contactLabel')}>
        <Textarea value={victim.contact} onChange={(e) => updateV('contact', e.target.value)} placeholder={t('intake.victim.contactPlaceholder')} />
        <PiiHint />
      </Field>

      <SectionDivider>{t('intake.victim.basicInfo')}</SectionDivider>

      <Field label={t('intake.victim.areaLabel')}>
        <AreaPicker
          value={{
            province: profile.province || '',
            district: profile.district || '',
            subdistrict: profile.subdistrict || '',
            zip: profile.zip || '',
            geo: profile.geo ?? null,
          }}
          onChange={(v) =>
            set('profile', {
              ...profile,
              province: v.province,
              district: v.district,
              subdistrict: v.subdistrict,
              zip: v.zip || '',
              geo: v.geo ?? null,
              branch: v.province || profile.branch,
            })
          }
        />
      </Field>

      <Field label={t('intake.victim.kpLabel')}>
        <Select value={profile.kp} onValueChange={(v) => updateP('kp', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{KP_GROUPS.map((b, i) => <SelectItem key={b} value={b}>{t(`screening.kp.${i}` as any)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>


      <Field label={t('intake.victim.genderLabel')}>
        <Select value={profile.gender} onValueChange={(v) => updateP('gender', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{GENDERS.map((b, i) => <SelectItem key={b} value={b}>{t(`screening.gender.${i}` as any)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label={t('intake.victim.dobLabel')}>
          <DobPicker
            value={profile.dob}
            onChange={(iso) => set('profile', { ...profile, dob: iso, age: calcAge(iso) })}
          />
        </Field>
        <Field label={t('intake.victim.ageLabel')}>
          <Input readOnly value={profile.age} className="bg-primary-soft text-primary text-center font-medium" placeholder={t('intake.victim.agePlaceholder')} />
        </Field>
      </div>


      <Field label={t('intake.victim.nationalityLabel')}>
        <Input value={profile.nationality} onChange={(e) => updateP('nationality', e.target.value)} placeholder={t('intake.victim.nationalityPlaceholder')} />
      </Field>

      <SectionDivider>{t('intake.victim.initialIssues')}</SectionDivider>

      <Field label={t('intake.victim.incidentPlaceLabel')}>
        <Input value={profile.incidentPlace} onChange={(e) => updateP('incidentPlace', e.target.value)} placeholder={t('intake.victim.incidentPlacePlaceholder')} />
      </Field>

      <Label className="text-xs text-muted-foreground mb-1.5 block">{t('intake.victim.violationTypeLabel')}</Label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {VIOLATION_TYPES.map((vt, i) => {
          const label = t(`screening.violationType.${vt.id}` as any);
          const selected = profile.initialViolationTypes.includes(vt.label);
          return (
            <button
              key={vt.id}
              onClick={() => toggleVT(vt.label)}
              className={`p-2.5 rounded-lg border flex items-center gap-2 transition text-left ${
                selected ? 'bg-destructive/10 border-destructive' : 'bg-muted/60 border-border'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                selected ? 'bg-destructive text-destructive-foreground' : 'bg-card border border-border'
              }`}>{i + 1}</span>
              <span className="text-[11px] leading-tight">{label.replace(t('intake.row.type'), '')}</span>
            </button>
          );
        })}
      </div>

      <Button
        onClick={() => {
          if (!victim.name.trim()) return toast.error(t('intake.victim.errName'));
          if (profile.initialViolationTypes.length === 0) return toast.error(t('intake.victim.errViolationType'));
          onNext();
        }}
        className="w-full h-12 rounded-xl bg-primary"
      >
        {t('intake.victim.nextBtn')} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ----------------- 4. VOICE Q&A (chat style) ----------------- */
function VoiceStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const { qIndex, answers, staffObs, profile, audioBlobs, consent, patch } = useIntake();
  const allowServerStt = consent.cb3;
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(answers[qIndex]?.transcript || '');
  const [obs, setObs] = useState(staffObs[qIndex] || '');
  const [showObs, setShowObs] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<any>(null);
  const tickRef = useRef<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const q = QUESTIONS[qIndex];
  const total = QUESTIONS.length;
  const pct = ((qIndex + 1) / total) * 100;

  useEffect(() => {
    setTranscript(answers[qIndex]?.transcript || '');
    setObs(staffObs[qIndex] || '');
    setShowObs(!!staffObs[qIndex]);
    setElapsed(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  useEffect(() => () => { stopAll(); }, []);

  // chat: keep the newest message in view
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [qIndex, transcribing, showObs]);

  const stopAll = () => {
    try { mediaRef.current?.state === 'recording' && mediaRef.current.stop(); } catch {}
    try { recogRef.current?.stop?.(); } catch {}
    mediaRef.current?.stream?.getTracks?.().forEach((t) => t.stop());
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
        const newBlobs = [...audioBlobs];
        newBlobs[qIndex] = blob;
        patch({ audioBlobs: newBlobs });
        void saveAudioBlobs(newBlobs); // Phase 0.5 — survive crash / battery death
        stream.getTracks().forEach((t) => t.stop());
        void serverTranscribe(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setElapsed(0);
      tickRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);

      // Live transcription via Web Speech API (Chrome/Edge/Safari iOS support varies)
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.lang = 'th-TH';
        rec.continuous = true;
        rec.interimResults = true;
        let finalTxt = transcript ? transcript + ' ' : '';
        rec.onresult = (ev: any) => {
          let interim = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const r = ev.results[i];
            if (r.isFinal) finalTxt += r[0].transcript + ' ';
            else interim += r[0].transcript;
          }
          setTranscript((finalTxt + interim).trim());
        };
        rec.onerror = (e: any) => console.warn('Speech recognition error:', e?.error);
        try { rec.start(); recogRef.current = rec; } catch {}
      }
    } catch (e: any) {
      console.error(e);
      toast.error(t('intake.voice.micError', { msg: e?.message || '' }));
    }
  };

  const stopRec = () => {
    setRecording(false);
    try { mediaRef.current?.stop(); } catch { /* noop */ }
    try { recogRef.current?.stop?.(); } catch { /* noop */ }
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    if (!allowServerStt) {
      toast.info(t('intake.voice.noConsentRecorded'));
    }
  };

  // Hybrid STT: server-side transcription produces the authoritative transcript
  // (works on iPhone/Safari where the Web Speech API is unavailable).
  const serverTranscribe = async (blob: Blob) => {
    if (!allowServerStt || blob.size < 2048) return;
    setTranscribing(true);
    try {
      const form = new FormData();
      const mime = (blob.type || 'audio/webm').split(';')[0];
      const ext = mime.includes('mp4') ? 'mp4' : mime.includes('mpeg') ? 'mp3' : mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'webm';
      form.append('file', new File([blob], `recording.${ext}`, { type: mime }));
      const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: form });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = (data?.text || '').trim();
      if (text) {
        setTranscript(text);
        toast.success(t('intake.voice.transcribeSuccess'));
      } else {
        toast.info(t('intake.voice.noSpeechFound'));
      }
    } catch (e) {
      console.error('transcribe error', e);
      toast.error(t('intake.voice.transcribeError'));
    } finally {
      setTranscribing(false);
    }
  };

  const toggleRec = () => (recording ? stopRec() : startRec());

  const persistCurrent = () => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = { question: q.main, cat: q.cat, frame: q.frame, transcript };
    const newObs = [...staffObs];
    newObs[qIndex] = obs;
    return { newAnswers, newObs };
  };

  const saveAndAdvance = (dir: 1 | -1) => {
    if (recording) { toast.info(t('intake.voice.stopFirst')); return; }
    const { newAnswers, newObs } = persistCurrent();
    const next = qIndex + dir;
    if (next < 0) return;
    if (next >= total) {
      patch({ answers: newAnswers, staffObs: newObs });
      onNext();
      return;
    }
    patch({ answers: newAnswers, staffObs: newObs, qIndex: next });
  };

  const jumpTo = (i: number) => {
    if (recording || i === qIndex) return;
    const { newAnswers, newObs } = persistCurrent();
    patch({ answers: newAnswers, staffObs: newObs, qIndex: i });
  };

  const tag = (cls: string, text: string) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{text}</span>
  );

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const isLast = qIndex === total - 1;

  // pb-14 clears the fixed QuickExit floating button above the composer
  return (
    <div className="pb-14">
      {/* header */}
      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
        <span>{t('intake.voice.progress', { current: qIndex + 1, total })}</span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
      <Progress value={pct} className="h-1 mb-2" />
      <div className="flex gap-1.5 flex-wrap mb-3">
        {tag('bg-secondary text-secondary-foreground', profile.kp)}
        {tag('bg-primary-soft text-primary', profile.gender)}
        {tag('bg-sevYellow-bg text-sevYellow-fg', profile.age || '-')}
        {tag('bg-sevGreen-bg text-sevGreen-fg', profile.branch)}
      </div>

      {/* chat thread */}
      <div ref={chatRef} className="bg-muted/30 border border-border rounded-2xl p-3 space-y-3 h-[42vh] min-h-[300px] overflow-y-auto mb-3">
        <div className="flex justify-center">
          <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-3 py-1">
            {t('intake.voice.introBubble')}
          </span>
        </div>

        {Array.from({ length: qIndex }).map((_, i) => {
          const past = QUESTIONS[i];
          const ans = answers[i];
          return (
            <div key={i} className="space-y-2.5">
              <QuestionBubble q={past} index={i} />
              {ans && (
                <div className="flex justify-end">
                  <div className="max-w-[88%] bg-primary-soft text-foreground rounded-[20px] rounded-tr-lg px-3.5 py-2.5 shadow-card">
                    <p className="text-[17px] leading-[26px] whitespace-pre-wrap">{ans.transcript || t('intake.voice.noAnswer')}</p>
                    {audioBlobs[i] && <HistoryAudio blob={audioBlobs[i]!} />}
                    {staffObs[i] && (
                      <p className="text-[11px] mt-1.5 bg-sevYellow-bg text-sevYellow-fg rounded-md px-2 py-1 leading-relaxed">
                        {t('intake.voice.staffNotePrefix', { note: staffObs[i] })}
                      </p>
                    )}
                    <button
                      onClick={() => jumpTo(i)}
                       className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition"
                    >
                      <Pencil className="w-2.5 h-2.5" /> {t('intake.voice.editAnswer')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* current question */}
        <QuestionBubble q={q} index={qIndex} current />

        {transcribing && (
          <div className="flex justify-end">
            <div className="bg-muted border border-border rounded-2xl rounded-tr-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">{t('intake.voice.transcribing')}</span>
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="bg-card border border-border rounded-2xl p-2.5 shadow-card">
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={t('intake.voice.composerPlaceholder')}
          className="bg-muted/40 border-0 text-sm min-h-[52px] resize-none focus-visible:ring-1"
        />
        <PiiHint />
        {audioBlobs[qIndex] && !recording && (
          <div className="px-1 pt-1.5"><HistoryAudio blob={audioBlobs[qIndex]!} /></div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={toggleRec}
            disabled={transcribing}
            aria-label={t('intake.voice.recordAria')}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shrink-0 disabled:opacity-50 ${
              recording ? 'bg-accent text-accent-foreground animate-pulse-ring' : 'bg-accent text-accent-foreground hover:bg-accent-deep'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {recording ? (
              <p className="text-xs text-destructive font-medium tabular-nums">{t('intake.voice.recordingTime', { time: `${mm}:${ss}` })}</p>
            ) : transcribing ? (
              <p className="text-xs text-muted-foreground">{t('intake.voice.waitingTranscribe')}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground truncate">
                {allowServerStt ? t('intake.voice.speakHint') : t('intake.voice.noConsentHint')}
              </p>
            )}
          </div>
          {qIndex > 0 && (
            <button
              onClick={() => saveAndAdvance(-1)}
              className="text-[11px] text-muted-foreground underline underline-offset-2 shrink-0 px-1"
            >
              {t('common.back')}
            </button>
          )}
          <Button
            onClick={() => saveAndAdvance(1)}
            disabled={recording || transcribing}
            className="h-10 shrink-0"
          >
            {isLast ? t('intake.voice.finishInterview') : t('intake.voice.sendAnswer')}
            {isLast ? <ArrowRight className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* staff observation (collapsible) */}
        <button
          onClick={() => setShowObs((v) => !v)}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-warning font-medium"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showObs ? 'rotate-180' : ''}`} />
          {t('intake.voice.staffObsToggle')} {obs && !showObs ? `· ${t('intake.voice.hasNote')}` : ''}
        </button>
        {showObs && (
          <>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder={t('intake.voice.obsPlaceholder')}
            className="mt-1.5 bg-sevYellow-bg border-warning/30 text-sm min-h-[48px]"
          />
          <PiiHint />
          </>
        )}
      </div>
    </div>
  );
}

/* chat bubbles */
function QuestionBubble({ q, index, current }: { q: (typeof QUESTIONS)[number]; index: number; current?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`flex gap-2.5 ${current ? 'animate-fade-in' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-card">
        <ClipboardList className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
      <div className="max-w-[88%] bg-card border border-border rounded-[20px] rounded-tl-lg px-3.5 py-2.5 shadow-card">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-medium text-primary tracking-widest">{t('intake.voice.questionNumber', { n: index + 1 })}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-soft text-foreground">{t(q.cat as any)}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sevYellow-bg text-sevYellow-fg">{q.frame}</span>
        </div>
        <p className="text-[17px] leading-[26px]">{t(q.main as any)}</p>
        {current && (
          <div className="flex items-center gap-2 mt-2">
            <SpeakButton text={t(q.main as any)} />
            <p className="text-[10px] text-muted-foreground">{t(q.hint as any)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryAudio({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return null;
  return <audio src={url} controls className="w-full mt-2 h-8 rounded" />;
}

/* ----------------- 5. ASSESS ----------------- */
function AssessStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const { hasViolation, violationDetails, severity, specialTests, extraFacts, screening, set, patch } = useIntake();

  const toggleDetail = (label: string) => {
    set('violationDetails', violationDetails.includes(label) ? violationDetails.filter((x) => x !== label) : [...violationDetails, label]);
  };
  const toggleTest = (id: string) => {
    set('specialTests', specialTests.includes(id) ? specialTests.filter((x) => x !== id) : [...specialTests, id]);
  };

  return (
    <div>
      <h1 className="text-lg font-medium">{t('intake.assess.title')}</h1>
      <p className="text-sm text-muted-foreground mb-4">{t('intake.assess.subtitle')}</p>

      <Card title={t('intake.assess.q1title')}>
        <div className="flex gap-2">
          <button
            onClick={() => set('hasViolation', true)}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
              hasViolation === true ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-card border-border text-muted-foreground'
            }`}
          >{t('intake.assess.yes')}</button>
          <button
            onClick={() => set('hasViolation', false)}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
              hasViolation === false ? 'bg-success/10 border-success text-success' : 'bg-card border-border text-muted-foreground'
            }`}
          >{t('intake.assess.no')}</button>
        </div>
      </Card>

      {hasViolation && (
        <Card title={t('intake.assess.q2title')}>
          <div className="grid grid-cols-2 gap-2">
            {VIOLATION_TYPES.map((vt, i) => {
          const label = t(`screening.violationType.${vt.id}` as any);
              const sel = violationDetails.includes(vt.label);
              return (
                <button key={vt.id} onClick={() => toggleDetail(vt.label)}
                  className={`p-2.5 rounded-lg border flex items-center gap-2 text-left transition ${sel ? 'bg-destructive/10 border-destructive' : 'bg-card border-border'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${sel ? 'bg-destructive text-destructive-foreground' : 'bg-muted'}`}>
                    {String.fromCharCode(97 + i)}
                  </span>
                  <span className="text-[11px]">{label.replace(t('intake.row.type'), '')}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card title={t('intake.assess.q3title')}>
        <div className="flex gap-2 mb-2">
          {(['green', 'yellow', 'red'] as Severity[]).map((s) => {
            const active = severity === s;
            const cls = active
              ? s === 'green' ? 'bg-sevGreen-bg border-success text-sevGreen-fg'
              : s === 'yellow' ? 'bg-sevYellow-bg border-warning text-sevYellow-fg'
              : 'bg-sevRed-bg border-destructive text-sevRed-fg'
              : 'bg-card border-border text-muted-foreground';
            return (
              <button key={s} onClick={() => set('severity', s)} className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition flex items-center justify-center gap-1.5 ${cls}`}>
                <span className={`w-2 h-2 rounded-full ${s === 'green' ? 'bg-success' : s === 'yellow' ? 'bg-warning' : 'bg-danger'}`} />
                {t(`intake.severity.${s}` as any)}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{t('intake.assess.severityLegend')}</p>
      </Card>

      <Card title={t('intake.assess.q4title')}>
        <div className="bg-primary-soft/50 border border-primary/20 rounded-lg p-3 space-y-2">
          {SPECIAL_TESTS.map((test) => {
            const done = specialTests.includes(test.id);
            return (
              <div key={test.id} className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground text-[11px] font-medium flex items-center justify-center shrink-0">{test.short}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{test.name}</p>
                  <p className="text-[11px] text-muted-foreground">{test.desc}</p>
                </div>
                <button onClick={() => toggleTest(test.id)}
                  className={`text-[11px] px-3 py-1.5 rounded-full shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${done ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground'}`}>
                  {done ? t('intake.assess.done') : t('intake.assess.markDone')}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title={t('intake.assess.q41title')}>
        <ScreeningTools value={screening} onChange={(v) => set('screening', v)} />
      </Card>


      <Card title={t('intake.assess.q5title')}>
        <Textarea value={extraFacts} onChange={(e) => set('extraFacts', e.target.value)} placeholder={t('intake.assess.extraFactsPlaceholder')} />
        <PiiHint />
      </Card>

      <Button onClick={() => {
        if (hasViolation === null) return toast.error(t('intake.assess.errQ1'));
        if (!severity) return toast.error(t('intake.assess.errSeverity'));
        onNext();
      }} variant="action" className="w-full mt-4">
        <Sparkles className="w-4 h-4" /> {t('intake.assess.analyzeBtn')}
      </Button>
    </div>
  );
}

/* ----------------- 6. AI ----------------- */
function AIStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const intake = useIntake();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepLabel, setStepLabel] = useState(t('intake.ai.step1'));

  useEffect(() => {
    let cancelled = false;
    const labels = [t('intake.ai.step1'), t('intake.ai.step2'), t('intake.ai.step3'), t('intake.ai.step4')];
    let i = 0;
    const timer = window.setInterval(() => { i = (i + 1) % labels.length; setStepLabel(labels[i]); }, 1100);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('analyze-case', {
          body: {
            reporter: intake.reporter,
            victim: intake.victim,
            profile: intake.profile,
            answers: intake.answers,
            staffObs: intake.staffObs,
            hasViolation: intake.hasViolation,
            violationDetails: intake.violationDetails,
            severity: intake.severity,
            extraFacts: intake.extraFacts,
          },
        });
        if (cancelled) return;
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        intake.set('aiResult', data as any);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || t('intake.ai.failed'));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; window.clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-11 h-11 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground leading-relaxed">{t('intake.ai.analyzing')}<br />{t('intake.ai.pleaseWait')}</p>
        <p className="text-xs text-primary/80 mt-2">{stepLabel}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">{t('intake.ai.failed')}</p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <Button onClick={() => window.location.reload()} variant="outline">{t('intake.ai.retry')}</Button>
          {/* Phase 0.11 — AI ต้องไม่บล็อกการรับเคส: ข้ามได้และให้เจ้าหน้าที่ประเมินเอง */}
          <Button
            onClick={() => { intake.set('aiResult', null); onNext(); }}
            variant="action"
          >
            <SkipForward className="w-4 h-4" /> {t('intake.ai.skip')}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed max-w-xs mx-auto">
          {t('intake.ai.skipNote')}
        </p>
      </div>
    );
  }

  const r = intake.aiResult!;
  const fillCls = r.riskLevel === 'low' ? 'bg-success' : r.riskLevel === 'medium' ? 'bg-warning' : 'bg-destructive';
  const tagCls: Record<string, string> = {
    physical: 'bg-destructive/10 text-destructive',
    sexual: 'bg-pink-100 text-pink-800',
    psychological: 'bg-amber-100 text-amber-800',
    economic: 'bg-blue-100 text-blue-800',
    legal: 'bg-emerald-100 text-emerald-800',
    discrimination: 'bg-primary-soft text-primary',
  };

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2.5 items-start bg-primary-soft/50 border border-primary/20 rounded-xl p-3 mb-4">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">{t('intake.ai.resultTitle')}</p>
          <p className="text-[11px] text-primary/80">{t('intake.ai.newCase', { date: new Date().toLocaleDateString('th-TH') })}</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {t('intake.ai.disclaimer')}
          </p>
        </div>
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-3.5 mb-3">
        <p className="text-[11px] text-muted-foreground mb-2">{t('intake.ai.riskLevel')}</p>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${fillCls}`} style={{ width: `${r.riskScore}%` }} />
          </div>
          <span className="text-sm font-medium tabular-nums">{r.riskScore}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {r.riskLevel === 'high' ? t('intake.ai.riskHigh') : r.riskLevel === 'medium' ? t('intake.ai.riskMed') : t('intake.ai.riskLow')}
        </p>
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-3.5 mb-3">
        <p className="text-[11px] text-muted-foreground mb-1.5">{t('intake.ai.summaryTitle')}</p>
        <p className="text-sm leading-relaxed">{r.summary}</p>
      </div>

      <div className="mb-4">
        <p className="text-[11px] text-muted-foreground mb-1.5">{t('intake.ai.violationTagsTitle')}</p>
        <div className="flex flex-wrap gap-1.5">
          {r.violationTags.map((t, i) => (
            <span key={i} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${tagCls[t.type] || 'bg-muted'}`}>{t.label}</span>
          ))}
        </div>
      </div>

      <div className="bg-success/5 border border-success/30 rounded-xl p-3.5 mb-4">
        <p className="text-[11px] font-medium text-success mb-2">{t('intake.ai.recommendationsTitle')}</p>
        {r.recommendations.map((rec, i) => (
          <div key={i} className="flex gap-2 text-xs text-success mb-1.5 last:mb-0">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-success shrink-0" /> <span>{rec}</span>
          </div>
        ))}
      </div>

      {r.followUpQuestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" /> {t('intake.ai.followupTitle')}
          </p>
          {r.followUpQuestions.map((q, i) => (
            <div key={i} className="bg-muted/40 border border-border rounded-xl p-3 mb-2">
              <p className="text-[10px] font-medium text-primary mb-1 tracking-wider uppercase">{q.category}</p>
              <p className="text-sm mb-2">{q.question}</p>
              <Textarea
                value={intake.extraAnswers[`q${i}`] || ''}
                onChange={(e) => intake.set('extraAnswers', { ...intake.extraAnswers, [`q${i}`]: e.target.value })}
                placeholder={t('intake.common.typeAnswerPlaceholder')}
                className="bg-card text-sm min-h-[52px]"
              />
              <PiiHint />
            </div>
          ))}
        </div>
      )}

       <Button variant="action" onClick={onNext} className="w-full">
        {t('intake.ai.nextBtn')} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ----------------- 7. REFERRAL ----------------- */
function ReferralStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const { referrals, referralNote, set } = useIntake();
  const toggle = (name: string) => set('referrals', referrals.includes(name) ? referrals.filter((x) => x !== name) : [...referrals, name]);
  return (
    <div>
      <h1 className="text-lg font-medium mb-1">{t('intake.referral.title')}</h1>
      <p className="text-sm text-muted-foreground mb-4">{t('intake.referral.subtitle')}</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {REFERRAL_OPTIONS.map((r) => {
          const sel = referrals.includes(r.name);
          return (
            <button key={r.id} onClick={() => toggle(r.name)}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${sel ? 'border-primary bg-primary-soft/40' : 'border-border bg-muted/40 hover:border-primary/60'}`}>
              <span className="text-base">{r.icon}</span>
              <span className="text-xs font-medium leading-tight">{r.name}</span>
            </button>
          );
        })}
      </div>
      <Textarea value={referralNote} onChange={(e) => set('referralNote', e.target.value)} placeholder={t('intake.referral.notePlaceholder')} className="mb-4 min-h-[64px]" />
      <PiiHint />
       <Button variant="action" onClick={onNext} className="w-full">{t('intake.referral.nextBtn')} <ArrowRight className="w-4 h-4" /></Button>
    </div>
  );
}

/* ----------------- 8. SIGNATURE & SAVE ----------------- */
function SignatureStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const intake = useIntake();
  const [staffName, setStaffName] = useState(intake.signatureStaffName);
  const [saving, setSaving] = useState(false);
  const staffCanvas = useRef<HTMLCanvasElement>(null);
  const clientCanvas = useRef<HTMLCanvasElement>(null);
  const [staffEmpty, setStaffEmpty] = useState(true);
  const [clientEmpty, setClientEmpty] = useState(true);

  const setupCanvas = (canvas: HTMLCanvasElement, onDraw: () => void) => {
    const ctx = canvas.getContext('2d')!;
    let drawing = false;
    const rect = () => canvas.getBoundingClientRect();
    const pos = (e: PointerEvent) => {
      const r = rect();
      return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
    };
    const down = (e: PointerEvent) => { drawing = true; canvas.setPointerCapture(e.pointerId); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: PointerEvent) => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; ctx.stroke(); onDraw(); };
    const up = () => { drawing = false; };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', up);
    };
  };

  useEffect(() => {
    const c1 = staffCanvas.current!, c2 = clientCanvas.current!;
    const u1 = setupCanvas(c1, () => setStaffEmpty(false));
    const u2 = setupCanvas(c2, () => setClientEmpty(false));
    return () => { u1(); u2(); };
  }, []);

  const clear = (which: 'staff' | 'client') => {
    const c = which === 'staff' ? staffCanvas.current! : clientCanvas.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    if (which === 'staff') setStaffEmpty(true); else setClientEmpty(true);
  };

  const piiGuard = usePiiGuard();
  const save = async () => {
    if (staffEmpty) return toast.error(t('intake.sig.errStaffSig'));
    if (!staffName.trim()) return toast.error(t('intake.sig.errStaffName'));
    const piiResult = await piiGuard.check(
      JSON.stringify({ a: intake.answers, o: intake.staffObs, e: intake.extraFacts, r: intake.referralNote, d: intake.violationDetails }),
    );
    if (piiResult === 'edit') return;
    setSaving(true);
    try {
      const draftId = crypto.randomUUID();
      const sigStaff = staffCanvas.current!.toDataURL('image/png');
      const sigClient = clientEmpty ? null : clientCanvas.current!.toDataURL('image/png');

      // 1) Upload audio recordings (if any) via the validated upload endpoint
      const audioPaths: { qIndex: number; path: string; question: string }[] = [];
      for (let i = 0; i < intake.audioBlobs.length; i++) {
        const blob = intake.audioBlobs[i];
        if (!blob) continue;
        const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
        const path = `cases/${draftId}/q${i + 1}-${Date.now()}.${ext}`;
        const up = await uploadCaseMedia('audio', path, blob);
        if (!up) {
          console.warn(`audio upload failed for q${i + 1}`);
          continue; // don't block case save if one upload fails
        }
        audioPaths.push({ qIndex: i, path: up.path, question: intake.answers[i]?.question || '' });
      }

      // 1b) Upload attached photos (if any)
      const photoPaths: { path: string; name: string }[] = [];
      for (let i = 0; i < intake.photos.length; i++) {
        const ph = intake.photos[i];
        if (!ph?.blob) continue;
        const ext = (ph.blob.type.split('/')[1] || 'jpg').split(';')[0];
        const path = `cases/${draftId}/photo-${i + 1}-${Date.now()}.${ext}`;
        const up = await uploadCaseMedia('photo', path, ph.blob);
        if (!up) {
          console.warn(`photo upload failed for #${i + 1}`);
          continue;
        }
        photoPaths.push({ path: up.path, name: ph.name });
      }



      const screeningResult = summarizeScreening(intake.screening);
      const suicideRisk = screeningResult.suicidalItem > 0;

      const payload: any = {
        consent: 'true',
        severity: intake.severity,
        has_violation: intake.hasViolation,
        violation_types: intake.profile.initialViolationTypes,
        violation_details: intake.violationDetails,
        special_tests: intake.specialTests,
        screening: screeningResult,
        suicide_risk: suicideRisk,
        reporter: intake.reporter,
        victim: intake.victim,
        profile: intake.profile,
        answers: intake.answers,
        staff_observations: intake.staffObs,
        extra_facts: intake.extraFacts,
        ai_result: intake.aiResult,
        referrals: intake.referrals,
        referral_note: intake.referralNote,
        signature_staff: sigStaff,
        signature_staff_name: staffName,
        signature_client: sigClient,
        audio_urls: audioPaths,
        photo_urls: photoPaths,
        pii_flag: piiResult === 'send',
      };

      // Safety net — keep a full copy on-device BEFORE we rely on the network
      const sessionId = currentSessionId();
      await saveLocalCase({
        id: sessionId,
        kind: 'failed',
        payload,
        audio: intake.audioBlobs,
        photos: intake.photos.map((p) => ({ blob: p.blob, name: p.name })),
      });

      // Phase 0.4 — the case code is generated and validated server-side (SECURITY DEFINER RPC)
      const { data: code, error } = await supabase.rpc('submit_case' as any, { _payload: payload });
      if (error) throw error;
      if (!code) throw new Error(t('intake.sig.saveFailed'));

      // แจ้งเตือนแบบ de-identified (case_code + สาขา + ระดับ เท่านั้น)
      if (suicideRisk || intake.severity === 'red' || intake.aiResult?.riskLevel === 'high') {
        void supabase.functions.invoke('notify-case', {
          body: {
            case_code: code as string,
            branch: intake.profile.branch,
            level: suicideRisk ? 'urgent' : intake.severity || intake.aiResult?.riskLevel || 'high',
            kind: suicideRisk ? 'suicide_risk' : 'high_risk',
          },
        }).catch((err) => console.warn('notify-case failed', err));
      }

      await deleteLocalCase(sessionId);
      rotateSessionId();
      await clearDraft();
      intake.patch({ caseCode: code as string, signatureStaff: sigStaff, signatureStaffName: staffName, signatureClient: sigClient || '' });
      toast.success(audioPaths.length ? t('intake.sig.savedWithAudio', { n: audioPaths.length }) : t('intake.sig.saved'));
      onNext();
    } catch (e: any) {
      console.error(e);
      try {
        await saveLocalCase({
          id: currentSessionId(),
          kind: 'failed',
          payload: undefined,
          error: e?.message || 'unknown error',
        });
      } catch { /* ignore */ }
      toast.error(t('intake.sig.saveError', { msg: e?.message || t('intake.sig.saveFailed') }));
    } finally {
      setSaving(false);
    }
  };


  const sevText = intake.severity ? SEV_LABEL[intake.severity] : '-';

  return (
    <>
      {piiGuard.dialog}
    <div>
      <div className="bg-success/10 border border-success/30 rounded-xl p-3.5 mb-4 flex gap-2.5 items-start">
        <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-success-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-success">{t('intake.sig.summaryTitle')}</p>
          <p className="text-xs text-success/80">{t('intake.sig.summarySubtitle')}</p>
        </div>
      </div>

      <SummaryBlock title={t('intake.sig.blockReporter')}>
        <Row k={t('intake.row.name')} v={intake.reporter.name} />
        <Row k={t('intake.row.phone')} v={intake.reporter.phone || '-'} />
      </SummaryBlock>

      <SummaryBlock title={t('intake.sig.blockVictim')}>
        <Row k={t('intake.row.name')} v={intake.victim.name} />
        <Row k={t('intake.row.kpGender')} v={`${intake.profile.kp} · ${intake.profile.gender}`} />
        <Row k={t('intake.row.ageNationality')} v={`${intake.profile.age || '-'} · ${intake.profile.nationality}`} />
      </SummaryBlock>

      <SummaryBlock title={t('intake.sig.blockViolation')}>
        <Row k={t('intake.row.incidentPlace')} v={intake.profile.incidentPlace || '-'} />
        <Row k={t('intake.row.type')} v={intake.violationDetails.join(', ') || intake.profile.initialViolationTypes.join(', ') || '-'} />
        <Row k={t('intake.row.severity')} v={sevText} />
        <Row k={t('intake.row.tests')} v={intake.specialTests.length ? intake.specialTests.join(', ').toUpperCase() : t('intake.common.none')} />
      </SummaryBlock>

      <SummaryBlock title={t('intake.sig.blockReferral')}>
        <p className="text-xs text-muted-foreground">{intake.referrals.join(' · ') || t('intake.referral.notSelected')}</p>
        {intake.referralNote && <p className="text-xs text-muted-foreground mt-2">{intake.referralNote}</p>}
      </SummaryBlock>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 mb-4 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <strong>{t('intake.sig.certifyLabel')}</strong> {t('intake.sig.certifyText')}
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">{t('intake.sig.staffSigLabel')}</p>
        <div className="relative bg-card border border-border rounded-xl overflow-hidden">
          <canvas ref={staffCanvas} width={400} height={100} className="block w-full h-[100px] cursor-crosshair touch-none" />
          {staffEmpty && <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none">{t('intake.sig.signHere')}</p>}
        </div>
        <button onClick={() => clear('staff')} className="text-[11px] text-muted-foreground underline mt-1">{t('intake.sig.clearSig')}</button>
        <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder={t('intake.sig.staffNamePlaceholder')} className="mt-2" />
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">{t('intake.sig.clientSigLabel')}</p>
        <div className="relative bg-card border border-border rounded-xl overflow-hidden">
          <canvas ref={clientCanvas} width={400} height={100} className="block w-full h-[100px] cursor-crosshair touch-none" />
          {clientEmpty && <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none">{t('intake.sig.signHere')} (ไม่บังคับ)</p>}
        </div>
        <button onClick={() => clear('client')} className="text-[11px] text-muted-foreground underline mt-1">{t('intake.sig.clearSig')}</button>
      </div>

      <Button variant="action" onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {t('intake.sig.confirmBtn')}
      </Button>
    </div>
    </>
  );
}

/* ----------------- 9. CONFIRMED ----------------- */
const DOC_ICONS: Record<DocKind, React.ReactNode> = {
  complaint: <Scale className="w-4 h-4" />,
  statement: <FileText className="w-4 h-4" />,
  referral: <Share2 className="w-4 h-4" />,
  assistance: <HeartHandshake className="w-4 h-4" />,
};

function ConfirmedStep({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  const intake = useIntake();
  const { caseCode } = intake;
  const navigate = useNavigate();
  const [qr, setQr] = useState<string>('');
  const [documentKind, setDocumentKind] = useState<DocKind | null>(null);

  // Phase 0.4 — QR ให้ผู้รับบริการถ่ายเก็บไว้ แทนการจดเลขอ้างอิง
  useEffect(() => {
    if (!caseCode) return;
    QRCode.toDataURL(`${window.location.origin}/track?code=${caseCode}`, { width: 320, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [caseCode]);

  const printFull = () => {
    const s = useIntake.getState();
    printCaseReport({
      id: s.caseId ?? '',
      case_code: caseCode ?? '',
      status: 'received',
      severity: s.severity,
      created_at: new Date().toISOString(),
      reporter: s.reporter,
      victim: s.victim,
      profile: s.profile,
      answers: s.answers,
      staff_observations: s.staffObs,
      ai_result: s.aiResult,
      screening: summarizeScreening(s.screening),
      suicide_risk: (s.screening.q9[8] ?? 0) > 0,
      has_violation: s.hasViolation,
      violation_details: s.violationDetails,
      extra_facts: s.extraFacts,
      referrals: s.referrals,
      referral_note: s.referralNote,
      signature_staff: s.signatureStaff,
      signature_staff_name: s.signatureStaffName,
      signature_client: s.signatureClient || null,
    } as CaseReportData);
  };

  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-3">
        <Check className="w-7 h-7 text-success" strokeWidth={3} />
      </div>
      <h1 className="text-lg font-medium">{t('intake.confirmed.title')}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t('intake.confirmed.subtitle')}</p>

      <div className="bg-primary-deep text-primary-foreground rounded-xl p-4 mb-4">
        <p className="text-[11px] text-primary-glow tracking-wider mb-1.5">{t('intake.confirmed.caseCodeLabel')}</p>
        <p className="text-3xl font-medium text-primary-foreground tracking-widest font-mono">{caseCode}</p>
        <button
          onClick={() => { navigator.clipboard.writeText(caseCode || ''); toast.success(t('intake.confirmed.copied')); }}
          className="inline-flex items-center gap-1.5 text-[11px] text-primary-glow bg-primary/20 border border-primary/40 rounded-full px-3 py-1 mt-2"
        >
          <Copy className="w-3 h-3" /> {t('intake.confirmed.copyBtn')}
        </button>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{t('intake.confirmed.keepCodeHint')}</p>
        {qr && (
          <div className="mt-3 flex flex-col items-center gap-1.5">
            <img src={qr} alt={t('intake.confirmed.qrAlt', { code: caseCode || '' })} className="w-32 h-32 rounded-lg bg-card p-1.5" />
            <p className="text-[11px] text-muted-foreground">{t('intake.confirmed.qrHint')}</p>
          </div>
        )}
      </div>

      {/* {t('intake.confirmed.caseSummary')} */}
      <div className="text-left mb-4">
        <p className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase mb-2">{t('intake.confirmed.caseSummary')}</p>
        <SummaryBlock title={t('intake.confirmed.blockClient')}>
          <Row k={t('intake.row.name')} v={intake.victim.name || '-'} />
          <Row k={t('intake.row.kpGender')} v={`${intake.profile.kp} · ${intake.profile.gender}`} />
          <Row k={t('intake.confirmed.rowArea')} v={`${intake.profile.province || intake.profile.branch}${intake.profile.incidentPlace ? ` · ${intake.profile.incidentPlace}` : ''}`} />
        </SummaryBlock>
        <SummaryBlock title={t('intake.confirmed.blockAssessment')}>
          <Row k={t('intake.confirmed.rowViolationType')} v={(intake.violationDetails.length ? intake.violationDetails : intake.profile.initialViolationTypes).join(', ') || '-'} />
          <Row k={t('intake.row.severity')} v={intake.severity ? SEV_LABEL[intake.severity] : '-'} />
          <Row k={t('intake.confirmed.rowScore')} v={t('intake.confirmed.scorePoints', { score: intake.screening.q9.reduce((a, b) => a + b, 0), nrm: nrmPositive(intake.screening.nrm, intake.screening.nrmUnder18) ? t('intake.confirmed.nrmYes') : t('intake.confirmed.nrmNo') })} />
          <Row k={t('intake.confirmed.rowReferral')} v={intake.referrals.join(' · ') || t('intake.referral.notSelected')} />
        </SummaryBlock>
      </div>

      {/* เอกสารสำหรับดำเนินเคสต่อ */}
      <div className="text-left mb-4">
        <p className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase mb-2">{t('intake.confirmed.docsTitle')}</p>
        <div className="grid grid-cols-2 gap-2">
          {DOC_KINDS.map((dk) => (
            <button
              key={dk.key}
              onClick={() => setDocumentKind(dk.key)}
              className="p-3 rounded-xl border border-border bg-card text-left hover:border-primary hover:bg-primary-soft/30 transition group"
            >
              <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition">
                {DOC_ICONS[dk.key]}
              </span>
              <span className="block text-xs font-medium">{dk.label}</span>
              <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5">{dk.desc}</span>
            </button>
          ))}
        </div>
        <Button onClick={printFull} variant="outline" className="w-full mt-2 rounded-xl h-10 text-xs">
          <Printer className="w-3.5 h-3.5" /> {t('intake.confirmed.fullReportBtn')}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{t('intake.confirmed.printHint')}</p>
      </div>

      <Button variant="action" onClick={() => navigate(`/track?code=${caseCode}`)} className="w-full mb-2">{t('intake.confirmed.trackBtn')}</Button>
      <Button variant="outline" onClick={onReset} className="w-full rounded-xl">{t('intake.confirmed.newCaseBtn')}</Button>
      {documentKind && intake.caseId && (
        <DocumentDraftDialog
          open
          onOpenChange={(open) => { if (!open) setDocumentKind(null); }}
          caseId={intake.caseId}
          kind={documentKind}
          input={docInputFromIntake(useIntake.getState())}
        />
      )}
    </div>
  );
}

/* ----------------- shared bits ----------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function DobPicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + 'T00:00:00') : undefined;
  const today = new Date();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full h-10 justify-start text-left font-normal', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
          {selected ? format(selected, 'd MMM yyyy', { locale: th }) : <span>{t('intake.dob.placeholder')}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? new Date(today.getFullYear() - 25, today.getMonth())}
          onSelect={(d) => {
            if (d) {
              const iso = format(d, 'yyyy-MM-dd');
              onChange(iso);
              setOpen(false);
            }
          }}
          captionLayout="dropdown-buttons"
          fromYear={1940}
          toYear={today.getFullYear()}
          disabled={{ after: today }}
          locale={th}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}

function PhotoUpload() {
  const { t } = useI18n();
  const { photos, set } = useIntake();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    const next = [...photos];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 15 * 1024 * 1024) {
        toast.error(t('intake.photo.tooLarge', { name: f.name }));
        continue;
      }
      // Phase 0.8 — re-encode to remove EXIF/GPS before the image ever leaves the device
      const cleaned = await stripImageMetadata(f);
      next.push({ blob: cleaned.blob, previewUrl: URL.createObjectURL(cleaned.blob), name: cleaned.name });
    }
    set('photos', next);
    void savePhotoBlobs(next.map((p) => ({ blob: p.blob, name: p.name })));
  };

  const remove = (i: number) => {
    const target = photos[i];
    if (target) URL.revokeObjectURL(target.previewUrl);
    const next = photos.filter((_, idx) => idx !== i);
    set('photos', next);
    void savePhotoBlobs(next.map((p) => ({ blob: p.blob, name: p.name })));
  };

  return (
    <div className="mb-4">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => cameraRef.current?.click()}
          className="py-3 rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground hover:border-primary hover:bg-primary-soft/40 transition flex items-center justify-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> {t('intake.photo.takePhoto')}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="py-3 rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground hover:border-primary hover:bg-primary-soft/40 transition flex items-center justify-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" /> {t('intake.photo.attach')}
        </button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          {photos.map((p, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
              <button type="button" onClick={() => remove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-destructive transition">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-1.5">{t('intake.photo.attachedCount', { n: photos.length })}</p>
      )}
    </div>
  );
}


function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 border border-border rounded-xl p-3.5 mb-3">
      <p className="text-xs font-medium text-foreground mb-2.5">{title}</p>
      {children}
    </div>
  );
}
function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 border border-border rounded-xl p-3.5 mb-3">
      <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase mb-2">{title}</p>
      <div className="space-y-1.5 text-xs">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5 border-b border-border/60 last:border-none">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="text-right font-medium break-words">{v}</span>
    </div>
  );
}
