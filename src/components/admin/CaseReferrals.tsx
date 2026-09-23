import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

interface Partner { id: string; name: string; province: string | null; district: string | null; services: string[] }
interface Referral { id: string; partner_id: string; referred_at: string; accepted_at: string | null; outcome: string; note: string | null; token_expires_at: string | null }

const OUTCOME_CLS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  accepted: 'bg-sevGreen-bg text-sevGreen-fg',
  completed: 'bg-sevGreen-bg text-sevGreen-fg',
  declined: 'bg-sevRed-bg text-sevRed-fg',
  no_response: 'bg-amber-100 text-amber-800',
};

/** Referral log for one case: history list + "Refer to partner" dialog. */
export function CaseReferrals({ caseId, province, violationTypes, canEdit }: {
  caseId: string; province: string | null; violationTypes: string[]; canEdit: boolean;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const { data: partners = [] } = useQuery({
    queryKey: ['ref-partners'],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from('referral_partners' as never)
        .select('id,name,province,district,services').eq('active', true).order('name');
      return (data ?? []) as unknown as Partner[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ['case-referrals', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('case_referrals' as never)
        .select('id,partner_id,referred_at,accepted_at,outcome,note,token_expires_at')
        .eq('case_id', caseId).order('referred_at', { ascending: false });
      return (data ?? []) as unknown as Referral[];
    },
  });

  const { data: names = {} } = useQuery({
    queryKey: ['ref-partner-names', history.map((h) => h.partner_id).join(',')],
    enabled: history.length > 0,
    queryFn: async () => {
      const ids = [...new Set(history.map((h) => h.partner_id))];
      const { data } = await supabase.from('referral_partners' as never).select('id,name').in('id', ids);
      return Object.fromEntries(((data ?? []) as unknown as { id: string; name: string }[]).map((p) => [p.id, p.name]));
    },
  });

  const filtered = useMemo(() => {
    if (showAll) return partners;
    const vt = violationTypes.map((v) => v.toLowerCase());
    return partners.filter((p) => {
      const provOk = !province || !p.province || p.province === province;
      const svc = (Array.isArray(p.services) ? p.services : []).map((s) => String(s).toLowerCase());
      const svcOk = vt.length === 0 || svc.length === 0 || svc.some((s) => vt.some((v) => s.includes(v) || v.includes(s)));
      return provOk && svcOk;
    });
  }, [partners, showAll, province, violationTypes]);

  const submit = async () => {
    if (!partnerId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('create_case_referral' as never, { _case_id: caseId, _partner_id: partnerId, _note: note || null } as never);
    setBusy(false);
    if (error || !data) { toast.error(t('ref.failed')); return; }
    const token = (data as { token: string }).token;
    setLink(`${window.location.origin}/referral/${token}`);
    toast.success(t('ref.success'));
    qc.invalidateQueries({ queryKey: ['case-referrals', caseId] });
  };

  const close = () => { setOpen(false); setPartnerId(null); setNote(''); setLink(null); setShowAll(false); };
  const fmt = (d: string) => new Date(d).toLocaleString('th-TH');
  const effectiveOutcome = (r: Referral) =>
    r.outcome === 'pending' && r.token_expires_at && new Date(r.token_expires_at) < new Date() ? 'no_response' : r.outcome;

  return (
    <section className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-medium text-muted-foreground">{t('ref.historyTitle')}</p>
        {canEdit && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setOpen(true)}><Share2 className="w-3.5 h-3.5" /> {t('ref.button')}</Button>}
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('ref.historyEmpty')}</p>
      ) : (
        <ol className="relative border-s-2 border-primary/25 ms-2 space-y-3">
          {history.map((r) => {
            const o = effectiveOutcome(r);
            return (
              <li key={r.id} className="ms-4 text-sm">
                <span className="absolute -start-[7px] mt-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{names[r.partner_id] ?? '—'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${OUTCOME_CLS[o] ?? ''}`}>{t(`ref.outcome.${o}`)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('ref.referredAt', { date: fmt(r.referred_at) })}
                  {r.accepted_at ? ` · ${t('ref.acceptedAt', { date: fmt(r.accepted_at) })}` : ''}
                </p>
                {r.note && <p className="text-xs text-muted-foreground mt-0.5">{r.note}</p>}
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('ref.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('ref.dialogHint')}</DialogDescription>
          </DialogHeader>
          {link ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('ref.linkLabel')}</p>
              <div className="flex gap-2">
                <input readOnly value={link} className="flex-1 h-9 rounded-md border border-border bg-muted/40 px-2 text-xs font-mono" />
                <Button size="sm" onClick={() => { void navigator.clipboard.writeText(link); toast.success(t('ref.copied')); }}><Copy className="w-3.5 h-3.5" /> {t('ref.copy')}</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filtered.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">{t('ref.noPartners')}</p>}
                {filtered.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPartnerId(p.id)}
                    className={`w-full text-start border rounded-lg p-3 text-sm transition ${partnerId === p.id ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary'}`}>
                    <p className="font-medium text-[13px]">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{[p.district, p.province].filter(Boolean).join(' · ')}</p>
                    {Array.isArray(p.services) && p.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">{p.services.map((s, i) => <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{s}</span>)}</div>
                    )}
                  </button>
                ))}
              </div>
              {!showAll && <button type="button" className="text-[11px] text-primary underline" onClick={() => setShowAll(true)}>{t('ref.showAll')}</button>}
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder={t('ref.notePlaceholder')} className="min-h-[70px] text-sm" />
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>{t('ref.cancel')}</Button>
            {!link && <Button disabled={!partnerId || busy} onClick={() => void submit()}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('ref.submit')}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
