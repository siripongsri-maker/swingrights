import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Power } from 'lucide-react';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';

type ModelRow = {
  id: string; version: number; status: string; guidance: string; sample_count: number;
  good_count: number; rejected_count: number; real_count: number; created_at: string; activated_at: string | null;
};

export default function SwingModelPanel() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ['swing-models'],
    queryFn: async () => {
      const { data, error } = await supabase.from('swing_rights_models' as never)
        .select('id, version, status, guidance, sample_count, good_count, rejected_count, real_count, created_at, activated_at')
        .order('version', { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as ModelRow[];
    },
  });

  const train = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('train-swing-model', { body: {} });
    setBusy(false);
    const code = (data as { error?: string })?.error;
    if (error || code) {
      toast.error(code === 'not_enough_data' ? t('model.notEnough') : code === 'credits' ? t('model.credits') : t('model.error'));
      return;
    }
    toast.success(t('model.built'));
    qc.invalidateQueries({ queryKey: ['swing-models'] });
  };
  const activate = async (id: string) => {
    const { error } = await supabase.rpc('activate_swing_model' as never, { _id: id } as never);
    if (error) return toast.error(t('model.error'));
    qc.invalidateQueries({ queryKey: ['swing-models'] });
  };
  const deactivate = async () => {
    const { error } = await supabase.rpc('deactivate_swing_model' as never);
    if (error) return toast.error(t('model.error'));
    qc.invalidateQueries({ queryKey: ['swing-models'] });
  };

  const rows = q.data ?? [];
  const active = rows.find((r) => r.status === 'active');
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <p className="font-subhead font-semibold">{t('model.title')}</p>
        <p className="text-sm text-muted-foreground mt-1">{t('model.hint')}</p>
        <p className="text-sm mt-2">{active ? t('model.activeNow').replace('{v}', String(active.version)) : t('model.none')}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button onClick={train} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {t('model.train')}
          </Button>
          {active && <Button variant="outline" onClick={deactivate}><Power className="w-4 h-4" /> {t('model.off')}</Button>}
        </div>
      </div>
      {q.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('sys.none')}</p>
      ) : rows.map((r) => (
        <div key={r.id} className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold">v{r.version}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === 'active' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{t(`model.status.${r.status}`)}</span>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            {r.status !== 'active' && <Button size="sm" variant="outline" className="ms-auto" onClick={() => activate(r.id)}>{t('model.activate')}</Button>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('model.counts').replace('{n}', String(r.sample_count)).replace('{g}', String(r.good_count)).replace('{b}', String(r.rejected_count)).replace('{r}', String(r.real_count))}
          </p>
          <details className="mt-2">
            <summary className="text-sm cursor-pointer">{t('model.lessons')}</summary>
            <pre className="whitespace-pre-wrap text-xs mt-2 font-sans">{r.guidance}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}
