import { useEffect, useState } from 'react';
import { Clock, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

/** Shown to signed-in users without a staff role: sends / shows their staff access request. */
export function StaffPending() {
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const request = async (auto: boolean) => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const meta = (u.user?.user_metadata ?? {}) as { staff_signup?: boolean; display_name?: string; staff_note?: string };
    if (auto && !meta.staff_signup) { setBusy(false); return; }
    const { data, error } = await supabase.rpc('request_staff_access' as never, { _display_name: meta.display_name ?? '', _note: meta.staff_note ?? null } as never);
    if (!error) setStatus(data as unknown as string);
    setBusy(false);
  };

  useEffect(() => { void request(true); }, []);

  const pending = status === 'pending';
  const rejected = status === 'rejected';
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center border border-border rounded-2xl p-8 bg-card">
        {pending ? <Clock className="w-10 h-10 text-primary mx-auto mb-3" aria-hidden /> : <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-3" aria-hidden />}
        <h1 className="text-lg font-medium mb-1">{pending ? t('staffsignup.pendingTitle') : t('guard.accessDenied')}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {pending ? t('staffsignup.pendingBody') : rejected ? t('staffsignup.rejectedBody') : t('guard.noRole')}
        </p>
        <div className="flex flex-col gap-2 items-center">
          {!pending && !rejected && (
            <Button variant="action" disabled={busy} aria-busy={busy} onClick={() => request(false)}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} {t('staffsignup.requestBtn')}
            </Button>
          )}
          <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/admin/login'; }}>
            {t('guard.signOut')}
          </Button>
        </div>
      </div>
    </div>
  );
}
