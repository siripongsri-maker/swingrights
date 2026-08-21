import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, SPEECH_LOCALE } from '@/i18n';

/**
 * Large speaker button that reads text aloud (low-literacy UX).
 * Uses the device's built-in voice matching the current UI language — works fully offline.
 */
export function SpeakButton({ text, className, label }: { text: string; className?: string; label?: string }) {
  const { lang, t } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }, []);
  useEffect(() => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } setSpeaking(false); }, [text, lang]);

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const locale = SPEECH_LOCALE[lang] || 'th-TH';
    u.lang = locale;
    u.rate = 0.9;
    const prefix = locale.split('-')[0].toLowerCase();
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(prefix));
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setSpeaking(true);
    synth.speak(u);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label ?? t('common.listen' as never) ?? 'ฟัง'}
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
