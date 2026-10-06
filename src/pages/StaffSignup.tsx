import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { LanguageToggle } from '@/components/LanguageToggle';
import { BrandMark } from '@/components/BrandLogo';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { useI18n } from '@/i18n';

export default function StaffSignup() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8) return toast.error(t('staffsignup.fill'));
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/login`,
          data: { staff_signup: true, display_name: name.trim().slice(0, 120), staff_note: note.trim().slice(0, 500) },
        },
      });
      if (error) throw error;
      if (data.user && (data.user.identities?.length ?? 0) === 0) { toast.error(t('cl.signin.err.exists')); return; }
      setSent(true);
    } catch (err) {
      const m = ((err as Error).message || '').toLowerCase();
      toast.error(m.includes('weak') || m.includes('pwned') ? t('cl.signin.err.weak')
        : m.includes('rate') ? t('cl.signin.err.rate')
        : m.includes('already') ? t('cl.signin.err.exists') : t('cl.signin.regFailed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6">
        <div className="flex justify-end items-center gap-2 mb-2"><QuickExitSlot always /><LanguageToggle /></div>
        <div className="text-center mb-4">
          <BrandMark className="mx-auto mb-3 h-12 w-12" />
          <h1 className="font-display text-xl font-bold">{t('staffsignup.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t('staffsignup.intro')}</p>
        </div>
        {sent ? (
          <p className="rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed">{t('staffsignup.sent')}</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div><Label htmlFor="signup-name" className="text-sm text-muted-foreground mb-1.5 block">{t('staffsignup.name')}</Label>
              <Input id="signup-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div><Label htmlFor="signup-email" className="text-sm text-muted-foreground mb-1.5 block">{t('login.email')}</Label>
              <Input id="signup-email" className="h-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <div><Label htmlFor="signup-password" className="text-sm text-muted-foreground mb-1.5 block">{t('cl.signin.password')}</Label>
              <Input id="signup-password" className="h-11" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
            <div><Label htmlFor="signup-note" className="text-sm text-muted-foreground mb-1.5 block">{t('staffsignup.note')}</Label>
              <Input id="signup-note" className="h-11" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>
            <Button type="submit" variant="action" className="w-full" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} {t('staffsignup.submit')}
            </Button>
          </form>
        )}
        <Link to="/admin/login" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t('staffsignup.haveAccount')}</Link>
      </div>
    </div>
  );
}
