import { useEffect, useId, useRef, useState } from 'react';
import { Mic, Square, RotateCcw, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { FollowUpCoach } from '@/components/FollowUpCoach';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n, SPEECH_LOCALE } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  /** Called whenever a recording is produced or cleared. */
  onChange: (blob: Blob | null, transcript: string) => void;
  className?: string;
  compact?: boolean;
  /** Show live follow-up questions based on the complaint form. */
  followUp?: boolean;
  /** Earlier answers, used by the follow-up check. */
  followUpContext?: string;
}

/**
 * Reusable voice recorder: MediaRecorder capture + live transcript via
 * Web Speech API (where supported), in the current UI language.
 */
export function VoiceRecorder({ onChange, className, compact, followUp, followUpContext }: Props) {
  const { lang, t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const transcriptRef = useRef('');
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const recogRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number>(0);
  const blobRef = useRef<Blob | null>(null);
  const tid = useId();

  useEffect(() => () => {
    try { recogRef.current?.stop(); } catch { /* noop */ }
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported?.(m));
      // Small voice format: Opus ~24 kbps (≈180 KB/min), AAC fallback on older iPhones
      const mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: (mr.mimeType || chunksRef.current[0]?.type || 'audio/webm').split(';')[0] });
        blobRef.current = blob;
        setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        stream.getTracks().forEach((tr) => tr.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setElapsed(0);
      tickRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);

      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.lang = SPEECH_LOCALE[lang] || 'th-TH';
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
          const txt = (finalTxt + interim).trim();
          setTranscript(txt);
          onChange(blobRef.current, txt);
        };
        rec.onerror = () => { /* unsupported — recording still works */ };
        try { rec.start(); recogRef.current = rec; } catch { /* noop */ }
      }
    } catch {
      // caller shows its own toast via aria / surrounding UI
      alert(t('common.micError'));
    }
  };

  const stop = () => {
    try { recogRef.current?.stop(); } catch { /* noop */ }
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = 0; }
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    setRecording(false);
    // blob lands in onstop; give it a tick then emit
    window.setTimeout(() => {
      onChange(blobRef.current, transcriptRef.current);
      // Browser speech recognition is missing on iPhone and often for
      // Burmese/Khmer/Lao — fall back to server transcription in the UI language.
      const blob = blobRef.current;
      if (!transcriptRef.current.trim() && blob && blob.size > 2048) void serverTranscribe(blob);
    }, 300);
  };

  const serverTranscribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const mime = (blob.type || 'audio/webm').split(';')[0];
      const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'webm';
      const form = new FormData();
      form.append('file', new File([blob], `recording.${ext}`, { type: mime }));
      form.append('lang', lang);
      const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: form });
      if (error || data?.error) throw error || new Error(data.error);
      const text = String(data?.text || '').trim();
      if (text && !transcriptRef.current.trim()) { setTranscript(text); onChange(blobRef.current, text); }
    } catch { /* recording is kept; user can type instead */ }
    finally { setTranscribing(false); }
  };

  const reset = () => {
    blobRef.current = null;
    setTranscript('');
    setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setElapsed(0);
    onChange(null, '');
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={start}
            aria-label={t('common.record')}
            className={cn(
              'rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-elegant transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              compact ? 'w-12 h-12' : 'w-14 h-14',
            )}
          >
            <Mic className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            aria-label={t('common.stop')}
            className={cn(
              'rounded-full bg-accent text-accent-foreground flex items-center justify-center animate-pulse-ring transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              compact ? 'w-12 h-12' : 'w-14 h-14',
            )}
          >
            <Square className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium">
            {recording ? `${t('common.recording')} ${mm}:${ss}` : audioUrl ? t('common.listen') : t('common.record')}
          </p>
          {transcribing && <p className="text-[11px] text-muted-foreground mt-0.5">{t('voice.transcribing')}</p>}
          {recording && transcript && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{transcript}</p>}
        </div>
        {audioUrl && !recording && (
          <Button type="button" size="sm" variant="ghost" className="ms-auto text-xs" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5 me-1" /> {t('common.rerecord')}
          </Button>
        )}
      </div>
      {audioUrl && !recording && <audio src={audioUrl} controls className="w-full h-9" />}
      {!recording && (transcript || audioUrl) && (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground block" htmlFor={tid}>{t('voice.editTranscript')}</label>
          <div className="flex items-start gap-1.5">
            <Textarea
              id={tid}
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); onChange(blobRef.current, e.target.value); }}
              placeholder={t('voice.transcriptPlaceholder')}
              className="text-sm min-h-[60px]"
            />
            {transcript && (
              <Button type="button" size="icon" variant="ghost" className="shrink-0" aria-label={t('voice.clearTranscript')} onClick={() => { setTranscript(''); onChange(blobRef.current, ''); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      {followUp && <FollowUpCoach text={transcript} context={followUpContext} />}
    </div>
  );
}
