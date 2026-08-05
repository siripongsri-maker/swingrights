import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Large speaker button that reads Thai text aloud (low-literacy UX).
 * Uses the device's built-in Thai voice — works fully offline.
 */
export function SpeakButton({ text, className, label = 'ฟังคำถาม' }: { text: string; className?: string; label?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }, []);
  useEffect(() => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } setSpeaking(false); }, [text]);

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'th-TH';
    u.rate = 0.9;
    const thaiVoice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('th'));
    if (thaiVoice) u.voice = thaiVoice;
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
      aria-label={label}
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
