import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
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
    if (pw.length < 12) return toast.error('รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร');
    if (pw !== pw2) return toast.error('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('ตั้งรหัสผ่านใหม่เรียบร้อย');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary mx-auto flex items-center justify-center shadow-elegant mb-3">
            <KeyRound className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-medium">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-sm text-muted-foreground">สำหรับบัญชีเจ้าหน้าที่</p>
        </div>

        {!ready ? (
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            กรุณาเปิดหน้านี้จากลิงก์ในอีเมลรีเซ็ตรหัสผ่าน
          </p>
        ) : (
          <>
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground mb-1.5 block">รหัสผ่านใหม่ (อย่างน้อย 12 ตัว)</Label>
              <Input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="new-password" />
            </div>
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-1.5 block">ยืนยันรหัสผ่านใหม่</Label>
              <Input value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" autoComplete="new-password" />
            </div>
            <Button onClick={submit} disabled={saving} className="w-full h-11 rounded-xl bg-gradient-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึกรหัสผ่านใหม่'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
