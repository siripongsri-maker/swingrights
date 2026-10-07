import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { useI18n } from '@/i18n';
import { BrandMark } from '@/components/BrandLogo';

export default function AdminLogin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Phase 0.10: TOTP step-up when the account has MFA enrolled
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  const finish = () => {
    toast.success(t('login.success'));
    navigate('/admin');
  };

  const continueAfterPassword = async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (totp) { setMfaFactorId(totp.id); return; }
    }
    finish();
  };

  const signIn = async () => {
    if (!email.trim() || !password) return toast.error(t('login.fillBoth'));
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await continueAfterPassword();
    } catch (e: any) {
      toast.error(e?.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!mfaFactorId || otp.trim().length < 6) return toast.error(t('login.otpPrompt'));
    setLoading(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: ch.id, code: otp.trim() });
      if (error) throw error;
      finish();
    } catch (e: any) {
      toast.error(e?.message || t('login.otpInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return toast.error(t('login.emailFirst'));
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success(t('login.resetSent'));
  };

  // Enter submits through the form; both branches call the same functions as the buttons did
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    void (mfaFactorId ? verifyOtp() : signIn());
  };
  const textLink = 'inline-flex min-h-11 w-full items-center justify-center rounded-lg px-2 text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6">
        {/* Quick Exit sits next to the language button at every width, never over the sign-in button */}
        <div className="flex justify-end items-center gap-2 mb-2"><QuickExitSlot always /><LanguageToggle /></div>
        <div className="text-center mb-5">
          <BrandMark className="mx-auto mb-3 h-12 w-12" />
          <h1 className="text-xl font-medium">{t('login.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        {mfaFactorId ? (
          <form onSubmit={onSubmit} noValidate>
            <div className="mb-4">
              <Label htmlFor="login-otp" className="text-sm text-muted-foreground mb-1.5 block">{t('login.otp')}</Label>
              <Input id="login-otp" className="h-11 font-mono tracking-widest" value={otp} onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus />
            </div>
            <Button type="submit" variant="action" disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} {t('login.verify')}
            </Button>
          </form>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="mb-3">
              <Label htmlFor="login-email" className="text-sm text-muted-foreground mb-1.5 block">{t('login.email')}</Label>
              <Input id="login-email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
            </div>
            <div className="mb-4">
              <Label htmlFor="login-password" className="text-sm text-muted-foreground mb-1.5 block">{t('login.password')}</Label>
              <Input id="login-password" className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
            </div>

            <Button type="submit" variant="action" disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} {t('login.submit')}
            </Button>
            <button type="button" onClick={forgot} disabled={loading} className={`${textLink} mt-2 text-muted-foreground hover:text-foreground disabled:opacity-50`}>
              {t('login.forgot')}
            </button>
            <Link to="/admin/signup" className={`${textLink} text-primary`}>
              {t('staffsignup.link')}
            </Link>
          </form>
        )}

        <div className="mt-5 bg-muted/50 border border-border rounded-lg p-3 text-sm leading-relaxed text-muted-foreground">
          {t('login.notice')}
        </div>
      </div>
    </div>
  );
}
