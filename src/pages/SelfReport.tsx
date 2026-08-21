import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, HeartHandshake, Loader2, MapPin, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneShell } from '@/components/screening/PhoneShell';
import { LanguageToggle } from '@/components/LanguageToggle';
import { SpeakButton } from '@/components/screening/SpeakButton';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { AreaPicker, type AreaValue } from '@/components/screening/AreaPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { formatArea } from '@/lib/thaiGeo';
import { stripImageMetadata } from '@/lib/exif';
import { saveLocalCase, markLocalSubmitted } from '@/lib/localCases';
import { cn } from '@/lib/utils';

const MEDIA_FN = 'upload-case-media';

async function uploadOne(kind: 'audio' | 'photo', file: { blob: Blob; name: string; type: string }, caseId: string): Promise<string> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes.session?.access_token;
  const base = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const fd = new FormData();
  fd.set('kind', kind);
  fd.set('case_id', caseId);
  fd.set('file', file.blob, file.name);
  const res = await fetch(`${base}/functions/v1/${MEDIA_FN}`, {
    method: 'POST',
    headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.path) throw new Error(json.error || `upload failed (${res.status})`);
  return json.path;
}

type Step = 'consent' | 'story' | 'area' | 'contact' | 'done';

const TYPE_KEYS = ['body', 'labor', 'health', 'property', 'other'] as const;

export default function SelfReport() {
  const { lang, t } = useI18n();
  const [step, setStep] = useState<Step>('consent');
  const [consent, setConsent] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [story, setStory] = useState('');
  const [area, setArea] = useState<AreaValue>({ province: '', district: '', subdistrict: '', zip: '', geo: null });
  const [types, setTypes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [photos, setPhotos] = useState<{ blob: Blob; url: string; name: string; type: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [caseCode, setCaseCode] = useState<string | null>(null);

  const steps: Step[] = ['consent', 'story', 'area', 'contact'];
  const stepIdx = steps.indexOf(step);

  const toggleType = (k: string) =>
    setTypes((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 3 - photos.length)) {
      if (!/^image\//.test(f.type)) continue;
      const stripped = await stripImageMetadata(f);
      const blob = new Blob([stripped.blob], { type: stripped.blob.type || f.type });
      setPhotos((prev) => [
        ...prev,
        { blob, url: URL.createObjectURL(blob), name: stripped.name, type: f.type },
      ].slice(0, 3));
    }
  };

  const canContinueStory = !!(audio || story.trim());

  const submit = async () => {
    if (!consent) return;
    setSubmitting(true);
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

    try {
      const { data: caseId, error: preErr } = await supabase.rpc('submit_case' as never, {
        _payload: {
          consent: true, cb1: true, cb2: false, cb3: true, consent_ai: true,
          source: 'self', report_language: lang,
          reporter: name || contact ? { name, contact, address: '' } : null,
          victim: { name, contact },
          profile: {
            branch: area.province || 'ไม่ระบุ',
            province: area.province, district: area.district, subdistrict: area.subdistrict,
            zip: area.zip ?? '', geo: area.geo ?? null,
            kp: '', incidentPlace: area.province ? formatArea(area.province, area.district, area.subdistrict) : '',
            initialViolationTypes: types,
          },
          answers: [],
          violation_details: types,
          extra_facts: story.slice(0, 5000),
          audio_urls: [], photo_urls: [], referrals: [], referral_note: '',
        },
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

      const payload = {
        consent: true, cb1: true, cb2: false, cb3: true, consent_ai: true,
        source: 'self', report_language: lang,
        reporter: name || contact ? { name, contact, address: '' } : null,
        victim: { name, contact },
        profile: {
          branch: area.province || 'ไม่ระบุ',
          province: area.province, district: area.district, subdistrict: area.subdistrict,
          zip: area.zip ?? '', geo: area.geo ?? null,
          kp: '', incidentPlace: area.province ? formatArea(area.province, area.district, area.subdistrict) : '',
          initialViolationTypes: types,
        },
        answers: transcript ? [{ question: 'self_report', cat: 'self_report', frame: '', transcript }] : [],
        violation_details: types,
        extra_facts: story.slice(0, 5000),
        audio_urls: audioUrls, photo_urls: photoUrls, referrals: [], referral_note: '',
      };

      const { data: code, error } = await supabase.rpc('submit_case' as never, { _payload: payload } as never);
      if (error || !code) throw error ?? new Error('submit failed');

      await markLocalSubmitted(localId, String(code));
      setCaseCode(String(code));
      setStep('done');
    } catch (e) {
      console.error('self report submit failed:', e instanceof Error ? e.message : 'error');
      await saveLocalCase(localRef as never, { id: localId });
      toast.error(t('report.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PhoneShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="text-xs -ml-2">
            <Link to="/"><ArrowLeft className="w-3.5 h-3.5 mr-1" />{t('common.back')}</Link>
          </Button>
          <LanguageToggle />
        </div>

        {step !== 'done' && (
          <>
            <div>
              <h1 className="font-display text-xl font-bold">{t('report.title')}</h1>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('report.subtitle')}</p>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {steps.map((s, i) => (
                <span key={s} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= stepIdx ? 'bg-primary' : 'bg-muted')} />
              ))}
            </div>
          </>
        )}

        {step === 'consent' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <SpeakButton text={`${t('report.consent.title')}. ${t('report.consent.body')} ${t('report.consent.agree')}`} />
                <div>
                  <h2 className="text-sm font-semibold">{t('report.consent.title')}</h2>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('report.consent.body')}</p>
                </div>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer rounded-xl bg-muted/50 p-3">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span className="text-xs leading-relaxed">{t('report.consent.agree')}</span>
              </label>
            </div>
            <Button className="w-full" disabled={!consent} onClick={() => setStep('story')}>
              {t('common.next')} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 'story' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <SpeakButton text={`${t('report.story.title')}. ${t('report.story.hint')}`} />
                <div>
                  <h2 className="text-sm font-semibold">{t('report.story.title')}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{t('report.story.hint')}</p>
                </div>
              </div>
              <VoiceRecorder onChange={(b, tx) => { setAudio(b); setTranscript(tx); }} />
              <Textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder={t('report.story.placeholder')}
                rows={5}
                maxLength={5000}
                className="text-sm"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">{t('report.type.title')}</h2>
              <div className="flex flex-wrap gap-2">
                {TYPE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleType(k)}
                    aria-pressed={types.includes(k)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-xs font-medium transition active:scale-95',
                      types.includes(k) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-primary',
                    )}
                  >
                    {t(`report.type.${k}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <Paperclip className="w-4 h-4 text-muted-foreground" /> {t('report.photo.add')}
                <input type="file" accept="image/*" capture="environment" multiple className="hidden"
                  onChange={(e) => { void addPhotos(e.target.files); e.target.value = ''; }} />
              </label>
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p.url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
                      <button type="button" aria-label="remove" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('consent')}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" disabled={!canContinueStory} onClick={() => setStep('area')}>
                {t('common.next')} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {!canContinueStory && <p className="text-[11px] text-destructive">{t('report.needStory')}</p>}
          </div>
        )}

        {step === 'area' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> {t('report.area.title')}
                <span className="text-[10px] font-normal text-muted-foreground">({t('common.optional')})</span>
              </h2>
              <p className="text-xs text-muted-foreground">{t('report.area.hint')}</p>
              <AreaPicker value={area} onChange={setArea} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('story')}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" onClick={() => setStep('contact')}>
                {t('common.next')} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 'contact' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <SpeakButton text={`${t('report.contact.title')}. ${t('report.contact.hint')}`} />
                <div>
                  <h2 className="text-sm font-semibold">{t('report.contact.title')}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1.5">({t('common.optional')})</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('report.contact.hint')}</p>
                </div>
              </div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('report.contact.name')} maxLength={120} />
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t('report.contact.phone')} maxLength={120} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('area')}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" disabled={submitting} onClick={() => void submit()}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />{t('report.submitting')}</> : t('report.submit')}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && caseCode && (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <HeartHandshake className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold">{t('report.success.title')}</h1>
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
              <p className="text-xs text-muted-foreground mb-1.5">{t('report.success.code')}</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-primary">{caseCode}</p>
              <Button
                size="sm" variant="ghost" className="mt-2 text-xs"
                onClick={() => { void navigator.clipboard?.writeText(caseCode); toast.success(<Check className="inline w-3.5 h-3.5" />); }}
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> {caseCode}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('report.success.hint')}</p>
            <div className="grid gap-2">
              <Button asChild><Link to={`/track?code=${caseCode}`}>{t('report.success.track')}</Link></Button>
              <Button asChild variant="outline"><Link to="/report" onClick={() => window.location.reload()}>{t('report.success.new')}</Link></Button>
            </div>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
