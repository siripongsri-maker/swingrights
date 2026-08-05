import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Phase 0.10 — TOTP step-up when the account has MFA enrolled
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  const finish = () => {
    toast.success('เข้าสู่ระบบสำเร็จ');
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
    if (!email.trim() || !password) return toast.error('กรุณากรอกอีเมลและรหัสผ่าน');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await continueAfterPassword();
    } catch (e: any) {
      toast.error(e?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!mfaFactorId || otp.trim().length < 6) return toast.error('กรอกรหัส 6 หลักจากแอป Authenticator');
    setLoading(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: ch.id, code: otp.trim() });
      if (error) throw error;
      finish();
    } catch (e: any) {
      toast.error(e?.message || 'รหัสยืนยันไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return toast.error('กรอกอีเมลก่อน แล้วกดลืมรหัสผ่านอีกครั้ง');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว');
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary mx-auto flex items-center justify-center shadow-elegant mb-3">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-medium">เข้าสู่ระบบเจ้าหน้าที่</h1>
          <p className="text-sm text-muted-foreground">SWING Foundation Admin</p>
        </div>

        {mfaFactorId ? (
          <>
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-1.5 block">รหัสยืนยัน 6 หลัก (Authenticator)</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} autoFocus />
            </div>
            <Button onClick={verifyOtp} disabled={loading} className="w-full h-11 rounded-xl bg-gradient-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยันรหัส'}
            </Button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground mb-1.5 block">อีเมลหน่วยงาน</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
            </div>
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-1.5 block">รหัสผ่าน</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === 'Enter') void signIn(); }} />
            </div>

            <Button onClick={signIn} disabled={loading} className="w-full h-11 rounded-xl bg-gradient-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'เข้าสู่ระบบ'}
            </Button>
            <button onClick={forgot} disabled={loading} className="w-full mt-2 text-xs text-muted-foreground hover:text-primary">
              ลืมรหัสผ่าน? ส่งลิงก์ตั้งรหัสใหม่
            </button>
          </>
        )}

        <div className="mt-5 bg-muted/50 border border-border rounded-lg p-3 text-[11px] leading-relaxed text-muted-foreground">
          ระบบนี้เก็บข้อมูลผู้เสียหายที่มีความอ่อนไหวสูง บัญชีเปิดใช้โดยผู้ดูแลระบบเท่านั้น
          และแนะนำให้เปิดการยืนยันตัวตนสองชั้น (TOTP) ทุกบัญชี
        </div>
      </div>
    </div>
  );
}
