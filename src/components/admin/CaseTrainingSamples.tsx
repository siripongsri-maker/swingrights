import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, ThumbsDown, ThumbsUp, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface Sample { id: string; question: string; answer: string; followup: string; covered: string[]; staff_rating: string | null; created_at: string }

/** AI follow-up log for opted-in reporters; staff rate each question to build SWING Rights training data. */
export function CaseTrainingSamples({ caseId }: { caseId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ['training-samples', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('ai_training_samples' as never).select('id,question,answer,followup,covered,staff_rating,created_at').eq('case_id', caseId).order('created_at');
      return (data ?? []) as unknown as Sample[];
    },
  });
  if (!data.length) return null;

  const rate = async (id: string, r: string) => {
    const { error } = await supabase.rpc('rate_training_sample' as never, { _id: id, _rating: r } as never);
    if (error) { toast.error(t('train.rateError')); return; }
    qc.invalidateQueries({ queryKey: ['training-samples', caseId] });
  };

  const opts = [
    { k: 'good', icon: ThumbsUp },
    { k: 'repeat', icon: Repeat },
    { k: 'bad', icon: ThumbsDown },
  ] as const;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <h3 className="font-subhead text-sm flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" />{t('train.title')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t('train.hint')}</p>
      </div>
      <ul className="space-y-2.5">
        {data.map((s) => (
          <li key={s.id} className="rounded-xl bg-muted/40 p-3 text-sm space-y-1.5">
            <p className="text-xs text-muted-foreground">{s.question}</p>
            <p>{s.answer}</p>
            <p className="text-primary">{s.followup ? `→ ${s.followup}` : t('train.noFollowup')}</p>
            {s.covered?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {s.covered.map((c) => <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border">{t(`followup.slot.${c}`)}</span>)}
              </div>
            )}
            {s.followup && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {opts.map(({ k, icon: Icon }) => (
                  <Button key={k} size="sm" variant={s.staff_rating === k ? 'default' : 'outline'} className={cn('h-7 text-xs rounded-full')} onClick={() => rate(s.id, k)}>
                    <Icon className="w-3.5 h-3.5 me-1" />{t(`train.rate.${k}`)}
                  </Button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
