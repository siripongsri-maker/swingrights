import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { speakText, type SpeakHandle } from '@/lib/tts';

/**
 * Large speaker button that reads text aloud (low-literacy UX).
 * Uses a high-quality streamed voice matched to the current UI language
 * (falls back to the device's built-in voice when offline).
 */
export function SpeakButton({ text, className, label }: { text: string; className?: string; label?: string }) {
  const { lang, t } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const handleRef = useRef<SpeakHandle | null>(null);

  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setSpeaking(false);
  };

  useEffect(() => stop, []);
  useEffect(() => { stop(); }, [text, lang]);

  const toggle = () => {
    if (speaking) { stop(); return; }
    stop();
    const handle = speakText(text, lang);
    handleRef.current = handle;
    setSpeaking(true);
    void handle.done.then(() => {
      if (handleRef.current === handle) {
        handleRef.current = null;
        setSpeaking(false);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label ?? t('common.listen') ?? 'Listen'}
      className={cn(
        'shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95',
        speaking ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground',
        className,
      )}
    >
      {speaking ? <Square className="w-5 h-5" /> : <Volume2 className="w-6 h-6" />}
    </button>
  );
}
