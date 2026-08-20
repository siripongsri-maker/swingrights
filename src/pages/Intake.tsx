import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Mic, Camera, Copy, AlertTriangle, Sparkles, ArrowRight, Loader2, ShieldCheck, ClipboardList, CalendarIcon, X as XIcon, RotateCcw, Trash2, SkipForward } from 'lucide-react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { PhoneShell, SwingBadge } from '@/components/screening/PhoneShell';
import { SectionDivider } from '@/components/screening/SectionDivider';
import { SpeakButton } from '@/components/screening/SpeakButton';
import { ScreeningTools, summarizeScreening } from '@/components/screening/ScreeningTools';
import { SeverityBadge } from '@/components/screening/SeverityBadge';
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
import { QuickExit } from '@/components/screening/QuickExit';
import { stripImageMetadata } from '@/lib/exif';
import { clearDraft, readDraftMeta, loadAudioBlobs, loadPhotoBlobs, saveAudioBlobs, savePhotoBlobs } from '@/lib/draft';
import { saveLocalCase, deleteLocalCase, listLocalCases, importLegacyDraft, currentSessionId, rotateSessionId } from '@/lib/localCases';
import { toast } from 'sonner';


type Step = 'consent' | 'reporter' | 'victim' | 'voice' | 'assess' | 'ai' | 'referral' | 'signature' | 'confirmed';


export default function Intake() {
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
    toast.success('ทำต่อจากฉบับร่างเดิม');
  };

  const discardDraft = async () => {
    await clearDraft();
    intake.reset();
    setDraftAt(null);
    setStep('consent');
    toast.success('เริ่มบันทึกใหม่');
  };

  const goBack = () => {
    const order: Step[] = ['consent', 'reporter', 'victim', 'voice', 'assess', 'ai', 'referral', 'signature', 'confirmed'];
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
    else navigate('/');
  };

  return (
    <PhoneShell onBack={step === 'consent' ? undefined : goBack} onClose={() => navigate('/')}>
      <QuickExit />
      {draftAt && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary-soft/50 p-3">
          <p className="text-xs font-medium text-primary mb-1">พบฉบับร่างที่ยังบันทึกไม่เสร็จ</p>
          <p className="text-[11px] text-muted-foreground mb-2.5">
            บันทึกไว้เมื่อ {new Date(draftAt).toLocaleString('th-TH')} — ทำต่อได้โดยไม่ต้องเล่าเรื่องซ้ำ
          </p>
          <div className="flex gap-2">
            <Button onClick={resumeDraft} className="flex-1 h-9 rounded-lg bg-gradient-primary text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> ทำต่อจากเดิม
            </Button>
            <Button onClick={discardDraft} variant="outline" className="flex-1 h-9 rounded-lg text-xs">
              <Trash2 className="w-3.5 h-3.5" /> เริ่มใหม่
            </Button>
          </div>
        </div>
      )}
      {pending > 1 && (
        <button
          onClick={() => navigate('/recover')}
          className="mb-4 w-full text-left rounded-xl border border-border bg-muted/40 p-3"
        >
          <p className="text-xs font-medium">มีเคสค้างในเครื่องนี้ {pending} รายการ</p>
          <p className="text-[11px] text-muted-foreground">แตะเพื่อเปิดหน้ากู้เคสและส่งเข้าระบบ</p>
        </button>
      )}

      {step === 'consent' && <ConsentStep onNext={() => setStep('reporter')} />}
      {step === 'reporter' && <ReporterStep onNext={() => setStep('victim')} />}
      {step === 'victim' && <VictimStep onNext={() => setStep('voice')} />}
      {step === 'voice' && <VoiceStep onNext={() => setStep('assess')} />}
      {step === 'assess' && <AssessStep onNext={() => setStep('ai')} />}
      {step === 'ai' && <AIStep onNext={() => setStep('referral')} />}
      {step === 'referral' && <ReferralStep onNext={() => setStep('signature')} />}
      {step === 'signature' && <SignatureStep onNext={() => setStep('confirmed')} />}
      {step === 'confirmed' && <ConfirmedStep onReset={() => { void clearDraft(); rotateSessionId(); intake.reset(); setStep('consent'); }} />}
    </PhoneShell>
  );
}

/* ----------------- 1. CONSENT ----------------- */
function ConsentStep({ onNext }: { onNext: () => void }) {
  const { consent, set } = useIntake();
  const items = [
    'การสนทนานี้เป็นไปโดยสมัครใจ คุณสามารถหยุดได้ทุกเมื่อ',
    'เสียงของคุณจะถูกแปลงเป็นข้อความโดย AI เพื่อการประเมินเท่านั้น',
    'ข้อมูลเก็บเป็นความลับ ไม่เปิดเผยต่อบุคคลภายนอกโดยไม่ได้รับอนุญาต',
    'คุณมีสิทธิขอตรวจสอบและแก้ไขข้อมูลของตัวเองได้ทุกเวลา',
  ];
  const ready = consent.cb1 && consent.cb2;
  return (
    <div>
      <SwingBadge />
      <h1 className="text-2xl font-medium text-foreground leading-tight mt-3 text-balance">ก่อนเริ่มการสัมภาษณ์</h1>
      <div className="flex items-center justify-between gap-3 mt-1 mb-5">
        <p className="text-sm text-muted-foreground">Before We Begin</p>
        <SpeakButton text={items.join(' ')} label="ฟังข้อตกลง" />
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
          หากอยู่ในอันตราย โทร <strong>1300</strong> (กรมกิจการสตรี) หรือ <strong>1669</strong> (ฉุกเฉิน)
        </p>
      </div>

      {[
        { key: 'cb1', label: 'ฉันเข้าใจและยินยอมให้บันทึกและวิเคราะห์เสียงในการสัมภาษณ์ครั้งนี้', required: true },
        { key: 'cb2', label: 'ฉันรับทราบว่าสามารถหยุดหรือถอนความยินยอมได้ทุกเมื่อ', required: true },
        {
          key: 'cb3',
          label: 'ยินยอมให้ส่ง “เฉพาะไฟล์เสียง” (ไม่แนบชื่อหรือข้อมูลระบุตัวตน) ไปถอดความด้วยระบบ AI ภายนอก เพื่อให้ได้ข้อความที่แม่นยำ',
          note: 'ไม่ยินยอมก็ได้ — เจ้าหน้าที่จะพิมพ์หรือจดคำตอบแทน (ยังบันทึกเสียงเก็บไว้ในระบบตามปกติ)',
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


      <Button onClick={onNext} disabled={!ready} className="w-full mt-3 h-12 rounded-xl bg-gradient-primary shadow-elegant">
        <Check className="w-4 h-4" /> ยินยอม เริ่มต้นการสัมภาษณ์
      </Button>
      <Link to="/privacy" target="_blank" className="block text-center text-xs text-primary mt-3 underline underline-offset-4">
        อ่านนโยบายความเป็นส่วนตัว (PDPA) และสิทธิของคุณ
      </Link>
      <Link to="/" className="block text-center text-xs text-muted-foreground mt-2 underline-offset-4 hover:underline">
        ยังไม่พร้อม / ไม่ยินยอมในขณะนี้
      </Link>
    </div>
  );
}

/* ----------------- 2. REPORTER ----------------- */
function ReporterStep({ onNext }: { onNext: () => void }) {
  const { reporter, set } = useIntake();
  const update = (k: keyof typeof reporter, v: string) => set('reporter', { ...reporter, [k]: v });
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">ข้อมูลผู้แจ้ง / ผู้ร้องเรียน</p>
      <h1 className="text-xl font-medium mt-1 mb-4">ข้อมูลผู้แจ้ง</h1>

      <Label className="text-xs text-muted-foreground mb-1.5 block">สถานะผู้แจ้ง *</Label>
      <div className="flex gap-1.5 mb-4">
        {(['self', 'other'] as const).map((t) => (
          <button
            key={t}
            onClick={() => set('reporter', { ...reporter, type: t })}
            className={`flex-1 py-2.5 rounded-lg text-sm border transition ${
              reporter.type === t ? 'bg-primary-soft border-primary text-primary font-medium' : 'bg-muted/60 border-border text-muted-foreground'
            }`}
          >
            {t === 'self' ? 'ร้องเรียนด้วยตนเอง' : 'ร้องเรียนให้ผู้อื่น'}
          </button>
        ))}
      </div>

      <Field label="ชื่อ-นามสกุล ผู้แจ้ง *">
        <Input value={reporter.name} onChange={(e) => update('name', e.target.value)} placeholder="ชื่อ-นามสกุล" />
      </Field>
      <Field label="ที่อยู่ที่ติดต่อได้">
        <Textarea value={reporter.address} onChange={(e) => update('address', e.target.value)} placeholder="ที่อยู่ปัจจุบัน หรือที่สามารถติดต่อกลับได้" />
      </Field>

      <PhotoUpload />


      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Email">
          <Input type="email" value={reporter.email} onChange={(e) => update('email', e.target.value)} placeholder="example@mail.com" />
        </Field>
        <Field label="เบอร์ติดต่อกลับ *">
          <Input type="tel" value={reporter.phone} onChange={(e) => update('phone', e.target.value)} placeholder="08x-xxx-xxxx" />
        </Field>
      </div>

      <Button
        onClick={() => {
          if (!reporter.name.trim()) return toast.error('กรุณากรอกชื่อผู้แจ้ง');
          onNext();
        }}
        className="w-full mt-4 h-12 rounded-xl bg-gradient-primary"
      >
        ถัดไป <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ----------------- 3. VICTIM ----------------- */
function VictimStep({ onNext }: { onNext: () => void }) {
  const { victim, profile, reporter, patch, set } = useIntake();
  const updateV = (k: keyof typeof victim, v: string) => set('victim', { ...victim, [k]: v });
  const updateP = (k: keyof typeof profile, v: any) => set('profile', { ...profile, [k]: v });

  const calcAge = (dob: string) => {
    if (!dob) return '';
    const b = new Date(dob), t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
    return `${age} ปี`;
  };

  const toggleVT = (label: string) => {
    const cur = profile.initialViolationTypes;
    updateP('initialViolationTypes', cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]);
  };

  return (
    <div>
      <p className="text-[11px] text-muted-foreground">ข้อมูลผู้ถูกละเมิด / ผู้รับบริการ</p>
      <h1 className="text-xl font-medium mt-1 mb-4">ข้อมูลผู้รับบริการ</h1>

      {reporter.type === 'self' && (
        <button
          onClick={() => {
            patch({
              victim: { name: reporter.name, contact: `${reporter.address} ${reporter.phone}`.trim() },
            });
            toast.success('คัดลอกข้อมูลจากผู้แจ้งแล้ว');
          }}
          className="w-full mb-4 flex items-center gap-2 text-xs text-primary bg-primary-soft/50 border border-primary/20 rounded-lg p-2.5 hover:bg-primary-soft transition"
        >
          <Copy className="w-3.5 h-3.5" /> ใช้ข้อมูลเดียวกับผู้แจ้ง
        </button>
      )}

      <Field label="ชื่อ-นามสกุล ผู้ถูกละเมิด *">
        <Input value={victim.name} onChange={(e) => updateV('name', e.target.value)} placeholder="ชื่อ-นามสกุล" />
      </Field>
      <Field label="ที่อยู่และเบอร์ติดต่อ">
        <Textarea value={victim.contact} onChange={(e) => updateV('contact', e.target.value)} placeholder="ที่อยู่ปัจจุบัน + เบอร์โทร" />
      </Field>

      <SectionDivider>ข้อมูลพื้นฐาน</SectionDivider>

      <Field label="พื้นที่รับเรื่อง (จังหวัด / อำเภอ / ตำบล) *">
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

      <Field label="กลุ่มประชากร (KP) *">
        <Select value={profile.kp} onValueChange={(v) => updateP('kp', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{KP_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
      </Field>


      <Field label="เพศสภาพ *">
        <Select value={profile.gender} onValueChange={(v) => updateP('gender', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{GENDERS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="วัน/เดือน/ปีเกิด *">
          <DobPicker
            value={profile.dob}
            onChange={(iso) => set('profile', { ...profile, dob: iso, age: calcAge(iso) })}
          />
        </Field>
        <Field label="อายุ (อัตโนมัติ)">
          <Input readOnly value={profile.age} className="bg-primary-soft text-primary text-center font-medium" placeholder="ปี" />
        </Field>
      </div>


      <Field label="สัญชาติ">
        <Input value={profile.nationality} onChange={(e) => updateP('nationality', e.target.value)} placeholder="เช่น ไทย, เมียนมา..." />
      </Field>

      <SectionDivider>ประเด็นเบื้องต้น</SectionDivider>

      <Field label="พื้นที่เกิดเหตุ">
        <Input value={profile.incidentPlace} onChange={(e) => updateP('incidentPlace', e.target.value)} placeholder="เช่น ห้องพักย่านสีลม / ที่ทำงาน / ออนไลน์" />
      </Field>

      <Label className="text-xs text-muted-foreground mb-1.5 block">ประเภทการละเมิด (เลือกเบื้องต้น) *</Label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {VIOLATION_TYPES.map((vt, i) => {
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
              <span className="text-[11px] leading-tight">{vt.label.replace('ละเมิด', '')}</span>
            </button>
          );
        })}
      </div>

      <Button
        onClick={() => {
          if (!victim.name.trim()) return toast.error('กรุณากรอกชื่อผู้รับบริการ');
          if (profile.initialViolationTypes.length === 0) return toast.error('กรุณาเลือกประเภทการละเมิด');
          onNext();
        }}
        className="w-full h-12 rounded-xl bg-gradient-primary"
      >
        ถัดไป: เริ่มสัมภาษณ์ <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ----------------- 4. VOICE Q&A ----------------- */
function VoiceStep({ onNext }: { onNext: () => void }) {
  const { qIndex, answers, staffObs, profile, audioBlobs, consent, set, patch } = useIntake();
  const allowServerStt = consent.cb3;
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(answers[qIndex]?.transcript || '');
  const [obs, setObs] = useState(staffObs[qIndex] || '');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<any>(null);
  const tickRef = useRef<number | null>(null);

  const q = QUESTIONS[qIndex];
  const total = QUESTIONS.length;
  const pct = ((qIndex + 1) / total) * 100;

  useEffect(() => {
    setTranscript(answers[qIndex]?.transcript || '');
    setObs(staffObs[qIndex] || '');
    const existing = audioBlobs[qIndex];
    setAudioUrl(existing ? URL.createObjectURL(existing) : null);
    setElapsed(0);
  }, [qIndex]);

  useEffect(() => () => { stopAll(); }, []);

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
        setAudioUrl(URL.createObjectURL(blob));
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
      toast.error('ไม่สามารถเข้าถึงไมโครโฟน — ' + (e?.message || ''));
    }
  };

  const stopRec = () => {
    setRecording(false);
    try { mediaRef.current?.stop(); } catch { /* noop */ }
    try { recogRef.current?.stop?.(); } catch { /* noop */ }
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    if (!allowServerStt) {
      toast.info('บันทึกเสียงแล้ว — ไม่ได้ยินยอมให้ถอดความภายนอก กรุณาพิมพ์หรือจดคำตอบ');
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
        toast.success('ถอดความด้วย AI เรียบร้อย');
      } else {
        toast.info('ไม่พบคำพูดในไฟล์เสียง กรุณาพิมพ์คำตอบ');
      }
    } catch (e) {
      console.error('transcribe error', e);
      toast.error('ถอดความอัตโนมัติไม่สำเร็จ — ใช้ข้อความที่แสดงสดหรือพิมพ์เพิ่มได้');
    } finally {
      setTranscribing(false);
    }
  };


  const toggleRec = () => (recording ? stopRec() : startRec());

  const saveAndAdvance = (dir: 1 | -1) => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = { question: q.main, cat: q.cat, frame: q.frame, transcript };
    const newObs = [...staffObs];
    newObs[qIndex] = obs;
    const next = qIndex + dir;
    if (next < 0) return;
    if (next >= total) {
      patch({ answers: newAnswers, staffObs: newObs });
      onNext();
      return;
    }
    patch({ answers: newAnswers, staffObs: newObs, qIndex: next });
  };

  const tag = (cls: string, text: string) => (
    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${cls}`}>{text}</span>
  );

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>คำถามที่ {qIndex + 1} จาก {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <Progress value={pct} className="h-1 mb-4" />

      <div className="flex gap-1.5 flex-wrap mb-4">
        {tag('bg-secondary text-secondary-foreground', profile.kp)}
        {tag('bg-primary-soft text-primary', profile.gender)}
        {tag('bg-amber-100 text-amber-800', profile.age || '-')}
        {tag('bg-emerald-100 text-emerald-800', profile.branch)}
      </div>

      <div className="bg-muted/60 border border-border rounded-2xl p-3.5 mb-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-foreground/80 flex items-center justify-center shrink-0">
          <ClipboardList className="w-4 h-4 text-background" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">เจ้าหน้าที่อ่านให้ฟัง</p>
          <p className="text-sm leading-relaxed text-foreground">{q.main}</p>
        </div>
      </div>

      <div className="bg-muted/40 border border-border rounded-2xl p-3.5 mb-3">
        <span className="inline-block bg-accent text-accent-foreground text-[11px] px-2.5 py-1 rounded-full mr-2">{q.cat}</span>
        <span className="inline-block bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full">{q.frame}</span>
        <div className="flex items-start gap-3 mt-2">
          <div className="flex-1">
            <p className="text-base font-medium">{q.main}</p>
            <p className="text-xs text-muted-foreground mt-1">{q.hint}</p>
          </div>
          <SpeakButton text={q.main} className="w-14 h-14" />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">กดปุ่มลำโพงเพื่อให้อ่านคำถามให้ฟัง</p>
      </div>

      <div className="bg-muted/40 border border-border rounded-2xl p-4 text-center mb-3">
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="รอการบันทึกเสียง — หรือพิมพ์คำตอบโดยตรง"
          className="bg-card text-left text-sm mb-3 min-h-[60px]"
        />
        <button
          onClick={toggleRec}
          disabled={transcribing}
          className={`w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center transition disabled:opacity-50 ${
            recording ? 'bg-destructive animate-pulse-ring' : 'bg-pink-600 hover:scale-105'
          }`}
          aria-label="record"
        >
          <Mic className="w-7 h-7 text-white" />
        </button>
        <p className="text-xs text-muted-foreground">
          {recording ? `กำลังบันทึกเสียง... ${mm}:${ss}` : transcribing ? 'กำลังถอดความด้วย AI...' : 'กดปุ่มเพื่อเริ่มบันทึก'}
        </p>
        {transcribing && <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2 text-muted-foreground" />}
        {!allowServerStt && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">
            ไม่ได้ยินยอมให้ถอดความภายนอก — บันทึกเสียงเก็บไว้ แต่ต้องพิมพ์คำตอบเอง
          </p>
        )}
        {audioUrl && !recording && (
          <audio src={audioUrl} controls className="w-full mt-3" />
        )}
      </div>


      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 mb-4">
        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" /> บันทึกของเจ้าหน้าที่ (ลักษณะที่สังเกต / ข้อเท็จจริงเพิ่มเติม)
        </p>
        <Textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="เช่น ร่องรอยฟกช้ำ, สีหน้าหวาดกลัว..."
          className="bg-card text-sm min-h-[48px]"
        />
      </div>

      <div className="flex gap-2 mt-2">
        <Button variant="outline" onClick={() => saveAndAdvance(-1)} disabled={qIndex === 0} className="rounded-lg">← ย้อนกลับ</Button>
        <Button onClick={() => saveAndAdvance(1)} className="flex-1 rounded-lg bg-gradient-primary">
          {qIndex === total - 1 ? 'เสร็จสิ้นการสัมภาษณ์' : 'บันทึกและไปต่อ'} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/* ----------------- 5. ASSESS ----------------- */
function AssessStep({ onNext }: { onNext: () => void }) {
  const { hasViolation, violationDetails, severity, specialTests, extraFacts, screening, set, patch } = useIntake();

  const toggleDetail = (label: string) => {
    set('violationDetails', violationDetails.includes(label) ? violationDetails.filter((x) => x !== label) : [...violationDetails, label]);
  };
  const toggleTest = (id: string) => {
    set('specialTests', specialTests.includes(id) ? specialTests.filter((x) => x !== id) : [...specialTests, id]);
  };

  return (
    <div>
      <h1 className="text-lg font-medium">ประเมินสภาพปัญหา</h1>
      <p className="text-sm text-muted-foreground mb-4">เจ้าหน้าที่ประเมินก่อนส่งให้ AI วิเคราะห์</p>

      <Card title="1. มีการละเมิดสิทธิ์เกิดขึ้นหรือไม่?">
        <div className="flex gap-2">
          <button
            onClick={() => set('hasViolation', true)}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
              hasViolation === true ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-card border-border text-muted-foreground'
            }`}
          >ใช่ มีการละเมิด</button>
          <button
            onClick={() => set('hasViolation', false)}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
              hasViolation === false ? 'bg-success/10 border-success text-success' : 'bg-card border-border text-muted-foreground'
            }`}
          >ไม่ใช่</button>
        </div>
      </Card>

      {hasViolation && (
        <Card title="2. ละเมิดสิทธิ์ด้านใด (เลือกได้หลายข้อ)">
          <div className="grid grid-cols-2 gap-2">
            {VIOLATION_TYPES.map((vt, i) => {
              const sel = violationDetails.includes(vt.label);
              return (
                <button key={vt.id} onClick={() => toggleDetail(vt.label)}
                  className={`p-2.5 rounded-lg border flex items-center gap-2 text-left transition ${sel ? 'bg-destructive/10 border-destructive' : 'bg-card border-border'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${sel ? 'bg-destructive text-destructive-foreground' : 'bg-muted'}`}>
                    {String.fromCharCode(97 + i)}
                  </span>
                  <span className="text-[11px]">{vt.label.replace('ละเมิด', '')}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="3. ระดับความรุนแรงของปัญหา">
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
                {s === 'green' ? 'เขียว' : s === 'yellow' ? 'เหลือง' : 'แดง'}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">เขียว: ไม่เร่งด่วน · เหลือง: ติดตามใกล้ชิด · แดง: ฉุกเฉิน ต้องดำเนินการทันที</p>
      </Card>

      <Card title="4. แบบทดสอบพิเศษที่ควรทำ">
        <div className="bg-primary-soft/50 border border-primary/20 rounded-lg p-3 space-y-2">
          {SPECIAL_TESTS.map((t) => {
            const done = specialTests.includes(t.id);
            return (
              <div key={t.id} className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground text-[11px] font-medium flex items-center justify-center shrink-0">{t.short}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                </div>
                <button onClick={() => toggleTest(t.id)}
                  className={`text-[11px] px-3 py-1.5 rounded-full text-white shrink-0 ${done ? 'bg-success' : 'bg-primary'}`}>
                  {done ? '✓ ทำแล้ว' : 'ทำแล้ว'}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="4.1 แบบคัดกรองมาตรฐาน 2Q / 9Q / NRM">
        <ScreeningTools value={screening} onChange={(v) => set('screening', v)} />
      </Card>


      <Card title="5. สอบข้อเท็จจริงเพิ่มเติม / บันทึกการลงพื้นที่">
        <Textarea value={extraFacts} onChange={(e) => set('extraFacts', e.target.value)} placeholder="บันทึกข้อเท็จจริงเพิ่มเติม การลงพื้นที่ พยานหลักฐาน..." />
      </Card>

      <Button onClick={() => {
        if (hasViolation === null) return toast.error('กรุณาตอบข้อ 1');
        if (!severity) return toast.error('กรุณาเลือกระดับความรุนแรง');
        onNext();
      }} className="w-full mt-4 h-12 rounded-xl bg-gradient-primary">
        <Sparkles className="w-4 h-4" /> วิเคราะห์ด้วย AI
      </Button>
    </div>
  );
}

/* ----------------- 6. AI ----------------- */
function AIStep({ onNext }: { onNext: () => void }) {
  const intake = useIntake();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepLabel, setStepLabel] = useState('กำลังประมวลผลคำตอบ');

  useEffect(() => {
    let cancelled = false;
    const labels = ['กำลังประมวลผลคำตอบ', 'ตรวจสอบรูปแบบการละเมิด', 'ประเมินความเสี่ยง', 'สร้างคำแนะนำเพิ่มเติม'];
    let i = 0;
    const t = window.setInterval(() => { i = (i + 1) % labels.length; setStepLabel(labels[i]); }, 1100);

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
        setError(e?.message || 'การวิเคราะห์ล้มเหลว');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; window.clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-11 h-11 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground leading-relaxed">AI กำลังวิเคราะห์การสัมภาษณ์<br />กรุณารอสักครู่</p>
        <p className="text-xs text-primary/80 mt-2">{stepLabel}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">การวิเคราะห์ล้มเหลว</p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <Button onClick={() => window.location.reload()} variant="outline">ลองใหม่</Button>
          {/* Phase 0.11 — AI ต้องไม่บล็อกการรับเคส: ข้ามได้และให้เจ้าหน้าที่ประเมินเอง */}
          <Button
            onClick={() => { intake.set('aiResult', null); onNext(); }}
            className="bg-gradient-primary rounded-xl"
          >
            <SkipForward className="w-4 h-4" /> ข้ามการวิเคราะห์ AI และบันทึกเคสต่อ
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed max-w-xs mx-auto">
          เคสจะถูกบันทึกครบถ้วนโดยใช้การประเมินของเจ้าหน้าที่เป็นหลัก
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
        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">ผลการวิเคราะห์โดย AI</p>
          <p className="text-[11px] text-primary/80">เคสใหม่ · {new Date().toLocaleDateString('th-TH')}</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            ผลนี้เป็นเพียงข้อมูลช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยทางกฎหมายหรือการแพทย์ เจ้าหน้าที่ต้องทบทวนก่อนเสมอ
          </p>
        </div>
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-3.5 mb-3">
        <p className="text-[11px] text-muted-foreground mb-2">ระดับความเสี่ยงที่ประเมินได้</p>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${fillCls}`} style={{ width: `${r.riskScore}%` }} />
          </div>
          <span className="text-sm font-medium tabular-nums">{r.riskScore}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {r.riskLevel === 'high' ? '⚠️ ความเสี่ยงสูง — แนะนำดำเนินการทันที' : r.riskLevel === 'medium' ? 'ความเสี่ยงปานกลาง — ติดตามใกล้ชิด' : 'ความเสี่ยงต่ำ — ติดตามตามรอบ'}
        </p>
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-3.5 mb-3">
        <p className="text-[11px] text-muted-foreground mb-1.5">สรุปสถานการณ์</p>
        <p className="text-sm leading-relaxed">{r.summary}</p>
      </div>

      <div className="mb-4">
        <p className="text-[11px] text-muted-foreground mb-1.5">ประเภทการละเมิดที่พบ</p>
        <div className="flex flex-wrap gap-1.5">
          {r.violationTags.map((t, i) => (
            <span key={i} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${tagCls[t.type] || 'bg-muted'}`}>{t.label}</span>
          ))}
        </div>
      </div>

      <div className="bg-success/5 border border-success/30 rounded-xl p-3.5 mb-4">
        <p className="text-[11px] font-medium text-success mb-2">คำแนะนำเบื้องต้นสำหรับเจ้าหน้าที่</p>
        {r.recommendations.map((rec, i) => (
          <div key={i} className="flex gap-2 text-xs text-success mb-1.5 last:mb-0">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-success shrink-0" /> <span>{rec}</span>
          </div>
        ))}
      </div>

      {r.followUpQuestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" /> คำถามเพิ่มเติม (จาก AI)
          </p>
          {r.followUpQuestions.map((q, i) => (
            <div key={i} className="bg-muted/40 border border-border rounded-xl p-3 mb-2">
              <p className="text-[10px] font-medium text-primary mb-1 tracking-wider uppercase">{q.category}</p>
              <p className="text-sm mb-2">{q.question}</p>
              <Textarea
                value={intake.extraAnswers[`q${i}`] || ''}
                onChange={(e) => intake.set('extraAnswers', { ...intake.extraAnswers, [`q${i}`]: e.target.value })}
                placeholder="พิมพ์คำตอบ..."
                className="bg-card text-sm min-h-[52px]"
              />
            </div>
          ))}
        </div>
      )}

      <Button onClick={onNext} className="w-full h-12 rounded-xl bg-gradient-primary">
        ต่อไป: เลือกการส่งต่อ <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ----------------- 7. REFERRAL ----------------- */
function ReferralStep({ onNext }: { onNext: () => void }) {
  const { referrals, referralNote, set } = useIntake();
  const toggle = (name: string) => set('referrals', referrals.includes(name) ? referrals.filter((x) => x !== name) : [...referrals, name]);
  return (
    <div>
      <h1 className="text-lg font-medium mb-1">การส่งต่อ</h1>
      <p className="text-sm text-muted-foreground mb-4">เลือกหน่วยงานสำหรับส่งต่อเคส</p>
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
      <Textarea value={referralNote} onChange={(e) => set('referralNote', e.target.value)} placeholder="บันทึกการส่งต่อ ชื่อหน่วยงาน เบอร์ติดต่อ..." className="mb-4 min-h-[64px]" />
      <Button onClick={onNext} className="w-full h-12 rounded-xl bg-gradient-primary">ถัดไป: ลงนามรับรอง <ArrowRight className="w-4 h-4" /></Button>
    </div>
  );
}

/* ----------------- 8. SIGNATURE & SAVE ----------------- */
function SignatureStep({ onNext }: { onNext: () => void }) {
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

  const save = async () => {
    if (staffEmpty) return toast.error('กรุณาลงลายเซ็นเจ้าหน้าที่');
    if (!staffName.trim()) return toast.error('กรุณากรอกชื่อเจ้าหน้าที่');
    setSaving(true);
    try {
      const draftId = crypto.randomUUID();
      const sigStaff = staffCanvas.current!.toDataURL('image/png');
      const sigClient = clientEmpty ? null : clientCanvas.current!.toDataURL('image/png');

      // 1) Upload audio recordings (if any) to private storage bucket under cases/<code>/
      const audioPaths: { qIndex: number; path: string; question: string }[] = [];
      for (let i = 0; i < intake.audioBlobs.length; i++) {
        const blob = intake.audioBlobs[i];
        if (!blob) continue;
        const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
        const path = `cases/${draftId}/q${i + 1}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('case-audio')
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (upErr) {
          console.warn(`audio upload failed for q${i + 1}:`, upErr);
          continue; // don't block case save if one upload fails
        }
        audioPaths.push({ qIndex: i, path, question: intake.answers[i]?.question || '' });
      }

      // 1b) Upload attached photos (if any)
      const photoPaths: { path: string; name: string }[] = [];
      for (let i = 0; i < intake.photos.length; i++) {
        const ph = intake.photos[i];
        if (!ph?.blob) continue;
        const ext = (ph.blob.type.split('/')[1] || 'jpg').split(';')[0];
        const path = `cases/${draftId}/photo-${i + 1}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('case-photos')
          .upload(path, ph.blob, { contentType: ph.blob.type, upsert: false });
        if (upErr) {
          console.warn(`photo upload failed for #${i + 1}:`, upErr);
          continue;
        }
        photoPaths.push({ path, name: ph.name });
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
      };

      // Phase 0.4 — the case code is generated and validated server-side (SECURITY DEFINER RPC)
      const { data: code, error } = await supabase.rpc('submit_case' as any, { _payload: payload });
      if (error) throw error;
      if (!code) throw new Error('บันทึกเคสไม่สำเร็จ');

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

      await clearDraft();
      intake.patch({ caseCode: code as string, signatureStaff: sigStaff, signatureStaffName: staffName, signatureClient: sigClient || '' });
      toast.success(audioPaths.length
        ? `บันทึกเคสและไฟล์เสียง ${audioPaths.length} ไฟล์สำเร็จ`
        : 'บันทึกเคสสำเร็จ');
      onNext();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'บันทึกล้มเหลว');
    } finally {
      setSaving(false);
    }
  };

  const sevText = intake.severity ? SEV_LABEL[intake.severity] : '-';

  return (
    <div>
      <div className="bg-success/10 border border-success/30 rounded-xl p-3.5 mb-4 flex gap-2.5 items-start">
        <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-success-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-success">สรุปและรับรองความถูกต้อง</p>
          <p className="text-xs text-success/80">ตรวจสอบข้อมูลทั้งหมดก่อนลงนาม</p>
        </div>
      </div>

      <SummaryBlock title="ผู้แจ้ง">
        <Row k="ชื่อ" v={intake.reporter.name} />
        <Row k="โทร" v={intake.reporter.phone || '-'} />
      </SummaryBlock>

      <SummaryBlock title="ผู้ถูกละเมิด">
        <Row k="ชื่อ" v={intake.victim.name} />
        <Row k="กลุ่ม / เพศ" v={`${intake.profile.kp} · ${intake.profile.gender}`} />
        <Row k="อายุ / สัญชาติ" v={`${intake.profile.age || '-'} · ${intake.profile.nationality}`} />
      </SummaryBlock>

      <SummaryBlock title="ข้อมูลการละเมิด">
        <Row k="พื้นที่เกิดเหตุ" v={intake.profile.incidentPlace || '-'} />
        <Row k="ประเภท" v={intake.violationDetails.join(', ') || intake.profile.initialViolationTypes.join(', ') || '-'} />
        <Row k="ความรุนแรง" v={sevText} />
        <Row k="แบบทดสอบ" v={intake.specialTests.length ? intake.specialTests.join(', ').toUpperCase() : 'ไม่มี'} />
      </SummaryBlock>

      <SummaryBlock title="การส่งต่อ">
        <p className="text-xs text-muted-foreground">{intake.referrals.join(' · ') || 'ยังไม่ได้เลือก'}</p>
        {intake.referralNote && <p className="text-xs text-muted-foreground mt-2">{intake.referralNote}</p>}
      </SummaryBlock>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 mb-4 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <strong>คำรับรอง:</strong> ข้าพเจ้าขอรับรองว่าข้อมูลที่บันทึกในแบบฟอร์มนี้เป็นความจริงทุกประการ และได้รับความยินยอมจากผู้รับบริการในการบันทึกและวิเคราะห์ข้อมูลดังกล่าวแล้ว
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">ลายเซ็นเจ้าหน้าที่</p>
        <div className="relative bg-card border border-border rounded-xl overflow-hidden">
          <canvas ref={staffCanvas} width={400} height={100} className="block w-full h-[100px] cursor-crosshair touch-none" />
          {staffEmpty && <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none">เซ็นชื่อที่นี่</p>}
        </div>
        <button onClick={() => clear('staff')} className="text-[11px] text-muted-foreground underline mt-1">ล้างลายเซ็น</button>
        <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="ชื่อ-นามสกุล เจ้าหน้าที่" className="mt-2" />
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">ลายเซ็นผู้รับบริการ (ถ้ามี)</p>
        <div className="relative bg-card border border-border rounded-xl overflow-hidden">
          <canvas ref={clientCanvas} width={400} height={100} className="block w-full h-[100px] cursor-crosshair touch-none" />
          {clientEmpty && <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none">เซ็นชื่อที่นี่ (ไม่บังคับ)</p>}
        </div>
        <button onClick={() => clear('client')} className="text-[11px] text-muted-foreground underline mt-1">ล้างลายเซ็น</button>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 rounded-xl bg-gradient-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        ยืนยันและบันทึกเคส
      </Button>
    </div>
  );
}

/* ----------------- 9. CONFIRMED ----------------- */
function ConfirmedStep({ onReset }: { onReset: () => void }) {
  const { caseCode } = useIntake();
  const navigate = useNavigate();
  const [qr, setQr] = useState<string>('');

  // Phase 0.4 — QR ให้ผู้รับบริการถ่ายเก็บไว้ แทนการจดเลขอ้างอิง
  useEffect(() => {
    if (!caseCode) return;
    QRCode.toDataURL(`${window.location.origin}/track?code=${caseCode}`, { width: 320, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [caseCode]);

  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-3">
        <Check className="w-7 h-7 text-success" strokeWidth={3} />
      </div>
      <h1 className="text-lg font-medium">บันทึกเคสสำเร็จ</h1>
      <p className="text-sm text-muted-foreground mb-5">เคสของคุณได้รับการบันทึกเรียบร้อยแล้ว</p>

      <div className="bg-gradient-dark rounded-xl p-4 mb-4">
        <p className="text-[11px] text-primary-glow tracking-wider mb-1.5">เลขอ้างอิงเคส</p>
        <p className="text-3xl font-medium text-white tracking-widest font-mono">{caseCode}</p>
        <button
          onClick={() => { navigator.clipboard.writeText(caseCode || ''); toast.success('คัดลอกแล้ว'); }}
          className="inline-flex items-center gap-1.5 text-[11px] text-primary-glow bg-primary/20 border border-primary/40 rounded-full px-3 py-1 mt-2"
        >
          <Copy className="w-3 h-3" /> คัดลอกเลขอ้างอิง
        </button>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">เก็บเลขนี้ไว้เพื่อติดตามสถานะเคสของคุณในภายหลัง</p>
        {qr && (
          <div className="mt-3 flex flex-col items-center gap-1.5">
            <img src={qr} alt={`QR code สำหรับติดตามเคส ${caseCode}`} className="w-32 h-32 rounded-lg bg-white p-1.5" />
            <p className="text-[11px] text-muted-foreground">สแกนหรือถ่ายภาพ QR นี้เพื่อติดตามสถานะ</p>
          </div>
        )}
      </div>

      <Button onClick={() => navigate(`/track?code=${caseCode}`)} className="w-full h-12 rounded-xl bg-gradient-primary mb-2">ติดตามสถานะเคส</Button>
      <Button variant="outline" onClick={onReset} className="w-full rounded-xl">บันทึกเคสใหม่</Button>
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
          {selected ? format(selected, 'd MMM yyyy', { locale: th }) : <span>เลือกวันเกิด</span>}
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
  const { photos, set } = useIntake();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    const next = [...photos];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`ไฟล์ ${f.name} ใหญ่เกิน 15MB`);
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
          <Camera className="w-4 h-4 text-primary" /> ถ่ายภาพ
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="py-3 rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground hover:border-primary hover:bg-primary-soft/40 transition flex items-center justify-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" /> แนบรูปภาพ
        </button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          {photos.map((p, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
              <button type="button" onClick={() => remove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-destructive transition">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-1.5">แนบรูปแล้ว {photos.length} รูป · ระบบลบข้อมูลพิกัด/EXIF ออกอัตโนมัติ</p>
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
