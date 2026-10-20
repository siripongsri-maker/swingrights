import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, KeyRound, Eye, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { useRoleLabels, type AppRole } from '@/hooks/useAccess';
import { StaffShell, StaffLoadError } from '@/components/admin/StaffShell';

const nameSchema = z.string().trim().min(1).max(60);
const mask = (n?: string | null) => {
  if (!n) return '-';
  const s = n.trim();
  return s.length <= 1 ? s + '•' : s[0] + '•'.repeat(Math.min(s.length - 1, 5));
};

export default function MySettings() {
  const { t, lang } = useI18n();
  const roleLabels = useRoleLabels();
  const qc = useQueryClient();
  const locale = lang === 'th' ? 'th-TH' : 'en-GB';
  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString(locale) : t('prof.none'));

  const q = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) throw new Error('no user');
      const [p, r] = await Promise.all([
        supabase.from('staff_profiles').select('display_name,email,status,updated_at').eq('id', user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
      ]);
      return {
        id: user.id,
        email: user.email ?? p.data?.email ?? '',
        lastLogin: user.last_sign_in_at ?? null,
        profile: p.data,
        roles: (r.data ?? []).map((x) => x.role as string),
      };
    },
  });

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (q.data) setName(q.data.profile?.display_name ?? ''); }, [q.data]);

  const saveName = async () => {
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success || !q.data) { toast.error(t('prof.nameInvalid')); return; }
    setSaving(true);
    const { error } = q.data.profile
      ? await supabase.from('staff_profiles').update({ display_name: parsed.data }).eq('id', q.data.id)
      : await supabase.from('staff_profiles').insert({ id: q.data.id, display_name: parsed.data, email: q.data.email });
    setSaving(false);
    if (error) { toast.error(t('prof.error')); return; }
    toast.success(t('prof.saved'));
    qc.invalidateQueries({ queryKey: ['my-profile'] });
  };

  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const changePw = async () => {
    if (pw.length < 8 || pw.length > 72) { toast.error(t('prof.pwShort')); return; }
    if (pw !== pw2) { toast.error(t('prof.pwMismatch')); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as never);
    setPwSaving(false);
    if (error) { toast.error(t('prof.error')); return; }
    setCur(''); setPw(''); setPw2('');
    toast.success(t('prof.pwSaved'));
  };

  // TOTP (MFA) state
  const mfaQ = useQuery({
    queryKey: ['my-mfa'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return (data.totp ?? []).filter((f) => f.status === 'verified');
    },
  });
  const [totpEnroll, setTotpEnroll] = useState<{ id: string; qr: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);

  const startEnroll = async () => {
    setTotpBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) { setTotpBusy(false); toast.error(t('prof.error')); return; }
    const qr = await QRCode.toDataURL(data.totp.uri, { width: 220, margin: 1 });
    setTotpEnroll({ id: data.id, qr });
    setTotpCode('');
    setTotpBusy(false);
  };

  const verifyEnroll = async () => {
    if (!totpEnroll) return;
    setTotpBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totpEnroll.id });
    const { error } = chErr ? { error: chErr } : await supabase.auth.mfa.verify({ factorId: totpEnroll.id, challengeId: ch.id, code: totpCode.trim() });
    setTotpBusy(false);
    if (error) { toast.error(t('prof.totp.badCode')); return; }
    setTotpEnroll(null); setTotpCode('');
    toast.success(t('prof.totp.on'));
    qc.invalidateQueries({ queryKey: ['my-mfa'] });
  };

  const cancelEnroll = async () => {
    if (totpEnroll) await supabase.auth.mfa.unenroll({ factorId: totpEnroll.id });
    setTotpEnroll(null); setTotpCode('');
  };

  const disableTotp = async () => {
    const f = mfaQ.data?.[0];
    if (!f) return;
    setTotpBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    setTotpBusy(false);
    if (error) { toast.error(t('prof.error')); return; }
    toast.success(t('prof.totp.off'));
    qc.invalidateQueries({ queryKey: ['my-mfa'] });
  };

  const card = 'bg-card border border-border rounded-xl p-4 shadow-card space-y-3';
  const d = q.data;

  return (
    <StaffShell title={t('prof.title')}>
      <div className="max-w-3xl space-y-4">
        {q.isError ? <StaffLoadError onRetry={() => void q.refetch()} /> : q.isLoading ? (
          <div className="py-12 text-center" role="status"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <section className={card}>
              <h2 className="font-subhead text-lg font-semibold">{t('prof.info')}</h2>
              <label className="block text-sm space-y-1">
                <span>{t('prof.displayName')}</span>
                <Input className="h-11" value={name} maxLength={60} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
                <span className="block text-xs text-muted-foreground">{t('prof.displayHint')}</span>
              </label>
              <label className="block text-sm space-y-1">
                <span>{t('prof.email')}</span>
                <Input className="h-11 font-mono" value={d?.email ?? ''} readOnly disabled />
              </label>
              <Button variant="action" onClick={saveName} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('prof.save')}
              </Button>
            </section>

            <section className={card}>
              <h2 className="font-subhead text-lg font-semibold flex items-center gap-2"><Eye className="w-4 h-4" /> {t('prof.preview')}</h2>
              <p className="text-xs text-muted-foreground">{t('prof.previewHint')}</p>
              <dl className="text-sm divide-y divide-border">
                {[
                  [t('prof.displayName'), d?.profile?.display_name ?? t('prof.none')],
                  [t('prof.seenAs'), mask(d?.profile?.display_name)],
                  [t('prof.roles'), d?.roles.map((r) => roleLabels[r as AppRole] ?? r).join(', ') || t('prof.none')],
                  [t('prof.status'), d?.profile?.status ?? t('prof.none')],
                  [t('prof.updated'), fmt(d?.profile?.updated_at)],
                  [t('prof.lastLogin'), fmt(d?.lastLogin)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-end break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={`${card} md:col-span-2`}>
              <h2 className="font-subhead text-lg font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4" /> {t('prof.password')}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input className="h-11" type="password" autoComplete="current-password" placeholder={t('prof.currentPw')} aria-label={t('prof.currentPw')} value={cur} onChange={(e) => setCur(e.target.value)} />
                <Input className="h-11" type="password" autoComplete="new-password" placeholder={t('prof.newPw')} aria-label={t('prof.newPw')} value={pw} onChange={(e) => setPw(e.target.value)} />
                <Input className="h-11" type="password" autoComplete="new-password" placeholder={t('prof.confirmPw')} aria-label={t('prof.confirmPw')} value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              <Button variant="outline" onClick={changePw} disabled={pwSaving || !cur || !pw}>
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} {t('prof.pwChange')}
              </Button>
            </section>

            <section className={`${card} md:col-span-2`}>
              <h2 className="font-subhead text-lg font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> {t('prof.totp.title')}</h2>
              {mfaQ.isLoading ? (
                <div className="py-4 text-center" role="status"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>
              ) : (
                <>
                  <p className="text-sm">
                    {t('prof.status')}: <span className="font-medium">{mfaQ.data?.length ? t('prof.totp.statusOn') : t('prof.totp.statusOff')}</span>
                  </p>
                  {totpEnroll ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{t('prof.totp.hint')}</p>
                      <img src={totpEnroll.qr} alt={t('prof.totp.qrAlt')} className="w-44 h-44 rounded-lg border border-border" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="h-11 w-40 font-mono"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="123456"
                          aria-label={t('prof.totp.code')}
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        />
                        <Button variant="action" onClick={verifyEnroll} disabled={totpBusy || totpCode.length !== 6}>
                          {totpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} {t('prof.totp.verify')}
                        </Button>
                        <Button variant="outline" onClick={cancelEnroll} disabled={totpBusy}>{t('prof.totp.cancel')}</Button>
                      </div>
                    </div>
                  ) : mfaQ.data?.length ? (
                    <Button variant="outline" onClick={disableTotp} disabled={totpBusy}>
                      {totpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {t('prof.totp.disable')}
                    </Button>
                  ) : (
                    <Button variant="action" onClick={startEnroll} disabled={totpBusy}>
                      {totpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} {t('prof.totp.enable')}
                    </Button>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </StaffShell>
  );
}
