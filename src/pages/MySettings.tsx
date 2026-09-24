import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save, KeyRound, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

const nameSchema = z.string().trim().min(1).max(60);
const mask = (n?: string | null) => {
  if (!n) return '—';
  const s = n.trim();
  return s.length <= 1 ? s + '•' : s[0] + '•'.repeat(Math.min(s.length - 1, 5));
};

export default function MySettings() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
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

  const card = 'bg-card border border-border rounded-xl p-4 shadow-card space-y-3';
  const d = q.data;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('prof.back')}
        </Button>
        <h1 className="font-display text-2xl font-medium">{t('prof.title')}</h1>

        {q.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <div className="grid gap-4 md:grid-cols-2">
            <section className={card}>
              <h2 className="font-subhead text-lg font-semibold">{t('prof.info')}</h2>
              <label className="block text-sm space-y-1">
                <span>{t('prof.displayName')}</span>
                <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
                <span className="text-xs text-muted-foreground">{t('prof.displayHint')}</span>
              </label>
              <label className="block text-sm space-y-1">
                <span>{t('prof.email')}</span>
                <Input value={d?.email ?? ''} readOnly disabled className="font-mono" />
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
                  [t('prof.roles'), d?.roles.join(', ') || t('prof.none')],
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
                <Input type="password" autoComplete="current-password" placeholder={t('prof.currentPw')} value={cur} onChange={(e) => setCur(e.target.value)} />
                <Input type="password" autoComplete="new-password" placeholder={t('prof.newPw')} value={pw} onChange={(e) => setPw(e.target.value)} />
                <Input type="password" autoComplete="new-password" placeholder={t('prof.confirmPw')} value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              <Button variant="outline" onClick={changePw} disabled={pwSaving || !cur || !pw}>
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} {t('prof.pwChange')}
              </Button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
