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
          <Button variant="outline" className="w-full h-12" onClick={() => oauth('google')}>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.3 5.3C41 35.9 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
            {t('cl.signin.google')}
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => oauth('apple')}>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c-.03-2.89 2.36-4.27 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.76-1-1.94.03-3.72 1.12-4.72 2.85-2.01 3.49-.51 8.66 1.45 11.5.96 1.39 2.1 2.95 3.6 2.89 1.44-.06 1.99-.93 3.73-.93s2.23.93 3.76.9c1.55-.03 2.54-1.41 3.49-2.81 1.1-1.61 1.55-3.17 1.58-3.25-.03-.02-3.03-1.16-3.05-4.59zM14.15 4.06c.8-.97 1.34-2.31 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.85-1.39 2.23-1.22 3.54 1.29.1 2.6-.65 3.41-1.62z"/></svg>
            {t('cl.signin.apple')}
          </Button>
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
