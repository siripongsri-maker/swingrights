import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useI18n } from '@/i18n';
import { BrandMark } from '@/components/BrandLogo';

export default function AdminLogin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Phase 0.10 — TOTP step-up when the account has MFA enrolled
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6">
        <div className="flex justify-end mb-2"><LanguageToggle /></div>
        <div className="text-center mb-5">
          <BrandMark className="mx-auto mb-3 h-12 w-12" />
          <h1 className="text-xl font-medium">{t('login.title')}</h1>
          <p className="text-sm text-muted-foreground">SWING Foundation Admin</p>
        </div>

        {mfaFactorId ? (
          <>
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('login.otp')}</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} autoFocus />
            </div>
            <Button variant="action" onClick={verifyOtp} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('login.verify')}
            </Button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('login.email')}</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
            </div>
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('login.password')}</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === 'Enter') void signIn(); }} />
            </div>

            <Button variant="action" onClick={signIn} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('login.submit')}
            </Button>
            <button onClick={forgot} disabled={loading} className="w-full mt-2 text-xs text-muted-foreground hover:text-primary">
              {t('login.forgot')}
            </button>
          </>
        )}

        <div className="mt-5 bg-muted/50 border border-border rounded-lg p-3 text-[11px] leading-relaxed text-muted-foreground">
          {t('login.notice')}
        </div>
      </div>
    </div>
  );
}
