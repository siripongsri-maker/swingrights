import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandHeader } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useI18n } from '@/i18n';

const schema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(72) });

export default function SignIn() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate('/me', { replace: true }); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate('/me', { replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const oauth = async (provider: 'google' | 'apple') => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + '/signin' });
    if (r.error) toast.error(t('cl.signin.failed'));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) return toast.error(t('cl.signin.invalid'));
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: p.data.email, password: p.data.password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: p.data.email, password: p.data.password, options: { emailRedirectTo: window.location.origin + '/me' } });
        if (error) throw error;
        if (!data.session) toast.success(t('cl.signin.checkEmail'), { duration: 8000 });
      }
    } catch {
      toast.error(t('cl.signin.failed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-md mx-auto px-5 pt-6 flex items-center justify-between">
        <BrandHeader />
        <LanguageToggle />
      </header>
      <main className="max-w-md mx-auto px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('cl.back')}
        </Link>
        <div className="rounded-[1.25rem] border border-border bg-card p-6 shadow-sm space-y-4">
          <h1 className="font-display text-2xl font-bold">{t('cl.signin.title')}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('cl.signin.optional')}</p>
          <Button variant="outline" className="w-full h-12" onClick={() => oauth('google')}>{t('cl.signin.google')}</Button>
          <Button variant="outline" className="w-full h-12" onClick={() => oauth('apple')}>{t('cl.signin.apple')}</Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{t('cl.signin.or')}<span className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" autoComplete="email" placeholder={t('cl.signin.email')} value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
            <Input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={t('cl.signin.password')} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
            <Button type="submit" variant="action" className="w-full h-12" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {mode === 'login' ? t('cl.signin.login') : t('cl.signin.register')}
            </Button>
          </form>
          <button type="button" className="w-full text-sm text-primary hover:underline min-h-11" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? t('cl.signin.toRegister') : t('cl.signin.toLogin')}
          </button>
        </div>
      </main>
    </div>
  );
}
