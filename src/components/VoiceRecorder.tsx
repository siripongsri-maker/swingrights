import { useEffect, useRef, useState } from 'react';
import { Mic, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n, SPEECH_LOCALE } from '@/i18n';

interface Props {
  /** Called whenever a recording is produced or cleared. */
  onChange: (blob: Blob | null, transcript: string) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Reusable voice recorder: MediaRecorder capture + live transcript via
 * Web Speech API (where supported), in the current UI language.
 */
export function VoiceRecorder({ onChange, className, compact }: Props) {
  const { lang, t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  const mediaRef = useRef<MediaRecorder | null>(null);
  const recogRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number>(0);
  const blobRef = useRef<Blob | null>(null);

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
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
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
    window.setTimeout(() => onChange(blobRef.current, transcript), 60);
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
              'rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elegant transition active:scale-95',
              compact ? 'w-11 h-11' : 'w-14 h-14',
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
              'rounded-full bg-destructive text-destructive-foreground flex items-center justify-center animate-pulse transition active:scale-95',
              compact ? 'w-11 h-11' : 'w-14 h-14',
            )}
          >
            <Square className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium">
            {recording ? `${t('common.recording')} ${mm}:${ss}` : audioUrl ? t('common.listen') : t('common.record')}
          </p>
          {transcript && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{transcript}</p>}
        </div>
        {audioUrl && !recording && (
          <Button type="button" size="sm" variant="ghost" className="ml-auto text-xs" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> {t('common.rerecord')}
          </Button>
        )}
      </div>
      {audioUrl && !recording && <audio src={audioUrl} controls className="w-full h-9" />}
    </div>
  );
}
