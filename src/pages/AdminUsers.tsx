import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_LABEL, ASSIGNABLE_ROLES, type AppRole } from '@/hooks/useAccess';
import { ArrowLeft, Loader2, UserPlus, KeyRound, Ban, RotateCcw, Users } from 'lucide-react';
import { toast } from 'sonner';

interface StaffUser {
  id: string;
  email: string | null;
  display_name: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  roles: AppRole[];
}

async function callAdmin(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: payload });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AppRole>('caseworker');

  const usersQ = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => ((await callAdmin({ action: 'list' })) as { users: StaffUser[] }).users ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['staff-users'] });

  const invite = useMutation({
    mutationFn: () => callAdmin({
      action: 'invite', email, role, display_name: name,
      redirect_to: `${window.location.origin}/reset-password`,
    }),
    onSuccess: () => { toast.success('ส่งคำเชิญแล้ว'); setEmail(''); setName(''); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRoleM = useMutation({
    mutationFn: (v: { user_id: string; role: AppRole }) => callAdmin({ action: 'set_role', ...v }),
    onSuccess: () => { toast.success('อัปเดตบทบาทแล้ว'); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: (v: { user_id: string; status: 'active' | 'suspended' }) => callAdmin({ action: 'set_status', ...v }),
    onSuccess: () => { toast.success('อัปเดตสถานะบัญชีแล้ว'); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPw = useMutation({
    mutationFn: (v: { email: string }) => callAdmin({
      action: 'reset_password', email: v.email, redirect_to: `${window.location.origin}/reset-password`,
    }),
    onSuccess: () => toast.success('ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว'),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-gradient-dark text-white">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => navigate('/admin')}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <div>
              <p className="font-medium">จัดการบัญชีเจ้าหน้าที่</p>
              <p className="text-[11px] text-white/60">เชิญผู้ใช้ · กำหนดบทบาท · ระงับบัญชี</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-5 py-6 space-y-6">
        <section className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> เชิญเจ้าหน้าที่ใหม่</p>
          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
            <Input placeholder="อีเมล" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="ชื่อที่แสดง (ไม่บังคับ)" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => invite.mutate()} disabled={!email || invite.isPending}>
              {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ส่งคำเชิญ'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            ผู้ถูกเชิญจะได้รับอีเมลเพื่อกำหนดรหัสผ่าน จากนั้นเข้าสู่ระบบที่ /admin/login
          </p>
        </section>

        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-medium">
            รายชื่อเจ้าหน้าที่ {usersQ.data ? `(${usersQ.data.length})` : ''}
          </div>
          {usersQ.isLoading && <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
          {usersQ.error && <div className="p-6 text-sm text-destructive">{(usersQ.error as Error).message}</div>}
          <div className="divide-y divide-border">
            {usersQ.data?.map((u) => (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.display_name || u.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.status === 'suspended' && <span className="text-[11px] text-destructive">ถูกระงับการใช้งาน</span>}
                </div>
                <Select
                  value={u.roles[0] ?? ''}
                  onValueChange={(v) => setRoleM.mutate({ user_id: u.id, role: v as AppRole })}
                >
                  <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="ยังไม่มีบทบาท" /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => u.email && resetPw.mutate({ email: u.email })} disabled={!u.email}>
                    <KeyRound className="w-3.5 h-3.5" /> รีเซ็ตรหัส
                  </Button>
                  {u.status === 'active' ? (
                    <Button size="sm" variant="outline" className="text-destructive"
                      onClick={() => setStatus.mutate({ user_id: u.id, status: 'suspended' })}>
                      <Ban className="w-3.5 h-3.5" /> ระงับ
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline"
                      onClick={() => setStatus.mutate({ user_id: u.id, status: 'active' })}>
                      <RotateCcw className="w-3.5 h-3.5" /> คืนสิทธิ์
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
