import { useEffect, useRef, useState } from 'react';
import { Check, Lightbulb, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { SpeakButton } from '@/components/screening/SpeakButton';
import { cn } from '@/lib/utils';

export const FOLLOWUP_SLOTS = ['what', 'when', 'where', 'who', 'harm', 'evidence', 'reported', 'help'] as const;
type Slot = typeof FOLLOWUP_SLOTS[number];

interface Props {
  /** Text being spoken / typed right now. */
  text: string;
  /** Earlier answers in the same conversation. */
  context?: string;
  className?: string;
}

/**
 * Checks the story against the complaint record form while the person is speaking
 * and suggests one follow-up question for whatever is still missing.
 */
export function FollowUpCoach({ text, context = '', className }: Props) {
  const { t, lang } = useI18n();
  const [covered, setCovered] = useState<Slot[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const lastSent = useRef('');
  const reqId = useRef(0);

  useEffect(() => {
    const full = `${context}\n${text}`.trim();
    if (full.length < 15 || Math.abs(full.length - lastSent.current.length) < 12 && lastSent.current) return;
    const h = window.setTimeout(async () => {
      lastSent.current = full;
      const id = ++reqId.current;
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('followup-question', { body: { text, context, lang } });
      if (id !== reqId.current) return;
      setLoading(false);
      if (error || data?.error) return;
      setCovered((data.covered ?? []) as Slot[]);
      setQuestion(data.next_question ?? '');
    }, 2500);
    return () => window.clearTimeout(h);
  }, [text, context, lang]);

  if (`${context}${text}`.trim().length < 15) return null;
  const done = covered.length >= FOLLOWUP_SLOTS.length;

  return (
    <div className={cn('rounded-xl border border-border bg-muted/40 p-2.5 space-y-2', className)} aria-live="polite">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Lightbulb className="w-3.5 h-3.5 text-primary" /> {t('followup.title')}
        {loading && <Loader2 className="w-3 h-3 animate-spin ms-auto" />}
      </div>
      <div className="flex flex-wrap gap-1">
        {FOLLOWUP_SLOTS.map((s) => {
          const ok = covered.includes(s);
          return (
            <span key={s} className={cn('text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1', ok ? 'bg-sevGreen-bg text-sevGreen-fg' : 'bg-background text-muted-foreground border border-border')}>
              {ok && <Check className="w-2.5 h-2.5" />}{t(`followup.slot.${s}`)}
            </span>
          );
        })}
      </div>
      {done ? (
        <p className="text-xs text-sevGreen-fg">{t('followup.complete')}</p>
      ) : question ? (
        <div className="flex items-start gap-2 rounded-lg bg-card border border-border p-2">
          <p className="text-sm flex-1">{question}</p>
          <SpeakButton text={question} className="shrink-0" />
        </div>
      ) : null}
    </div>
  );
}
