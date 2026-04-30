import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEMO_EMAIL = 'admin@swing.demo';
const DEMO_PASSWORD = 'SwingAdmin2026!';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);

  const ensureAdminRole = async (userId: string) => {
    const { data: existing } = await supabase.from('user_roles').select('id').eq('user_id', userId).eq('role', 'admin').maybeSingle();
    if (!existing) await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' } as any);
  };

  const submit = async (signup = false) => {
    setLoading(true);
    try {
      let userId: string | null = null;
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        userId = data.user?.id ?? null;
        toast.success('สร้างบัญชีผู้ดูแลแล้ว');
      } else {
        let { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message.toLowerCase();
          // Auto-create or recreate demo admin on common first-run errors
          if (email === DEMO_EMAIL && (msg.includes('invalid') || msg.includes('not confirmed') || msg.includes('email'))) {
            const { data: s, error: e2 } = await supabase.auth.signUp({
              email, password, options: { emailRedirectTo: `${window.location.origin}/admin` },
            });
            if (e2 && !e2.message.toLowerCase().includes('registered')) throw e2;
            // Try login again now that auto-confirm is on
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (retry.error) throw retry.error;
            userId = retry.data.user?.id ?? null;
          } else throw error;
        } else {
          userId = data.user?.id ?? null;
        }
      }
      if (userId) await ensureAdminRole(userId);
      toast.success('เข้าสู่ระบบสำเร็จ');
      navigate('/admin');
    } catch (e: any) {
      toast.error(e?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
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

        <div className="mb-3">
          <Label className="text-xs text-muted-foreground mb-1.5 block">อีเมล</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div className="mb-4">
          <Label className="text-xs text-muted-foreground mb-1.5 block">รหัสผ่าน</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </div>

        <Button onClick={() => submit(false)} disabled={loading} className="w-full h-11 rounded-xl bg-gradient-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'เข้าสู่ระบบ'}
        </Button>
        <button onClick={() => submit(true)} disabled={loading} className="w-full mt-2 text-xs text-muted-foreground hover:text-primary">
          ยังไม่มีบัญชี? สมัครเป็นผู้ดูแล
        </button>

        <div className="mt-5 bg-primary-soft/40 border border-primary/20 rounded-lg p-3 text-xs leading-relaxed">
          <p className="font-medium text-primary mb-1">บัญชีเดโมสำหรับทดลอง</p>
          <p className="font-mono text-foreground">{DEMO_EMAIL}</p>
          <p className="font-mono text-foreground">{DEMO_PASSWORD}</p>
          <p className="text-muted-foreground mt-1.5">กดเข้าสู่ระบบเพื่อใช้งานได้ทันที (ระบบจะสร้างบัญชีให้อัตโนมัติครั้งแรก)</p>
        </div>
      </div>
    </div>
  );
}
