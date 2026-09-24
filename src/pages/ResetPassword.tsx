import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { BrandMark } from '@/components/BrandLogo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (pw.length < 12) return toast.error(t('reset.err.tooShort'));
    if (pw !== pw2) return toast.error(t('reset.err.mismatch'));
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t('reset.success'));
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6">
        <div className="text-center mb-5">
          <BrandMark className="mx-auto mb-3 h-12 w-12" />
          <h1 className="text-xl font-medium">{t('reset.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('reset.subtitle')}</p>
        </div>

        {!ready ? (
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            {t('reset.needLink')}
          </p>
        ) : (
          <>
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('reset.newPassword')}</Label>
              <Input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="new-password" />
            </div>
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('reset.confirmPassword')}</Label>
              <Input value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" autoComplete="new-password" />
            </div>
            <Button variant="action" onClick={submit} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('reset.save')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
