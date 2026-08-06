import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { SeverityBadge } from '@/components/screening/SeverityBadge';
import { CaseStatus, STATUS_LABEL, BRANCHES } from '@/lib/screening';
import { q9Level } from '@/lib/screeningTools';
import { printCaseReport, logExport, AI_DISCLAIMER, type CaseReportData } from '@/lib/caseReport';
import { useCaseAlerts, type CaseAlert } from '@/hooks/useCaseAlerts';
import { useAccess, ROLE_LABEL } from '@/hooks/useAccess';

import {
  Loader2, LogOut, Plus, ShieldCheck, ArrowLeft, Download, FileText, MapPin,
  Search, ChevronLeft, ChevronRight, UserCheck, UserCog, CalendarClock, BellRing, ShieldAlert, Check,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

const LIST_COLS =
  'id, case_code, status, severity, created_at, follow_up_at, assigned_to, suicide_risk, ai_reviewed, victim, profile, ai_result';
const DETAIL_COLS = '*';
const sel = (s: string): string => s;

interface CaseListRow {
  id: string;
  case_code: string;
  status: CaseStatus;
  severity: 'green' | 'yellow' | 'red' | null;
  created_at: string;
  follow_up_at: string | null;
  assigned_to: string | null;
  suicide_risk: boolean;
  ai_reviewed: boolean;
  victim: any;
  profile: any;
  ai_result: any;
}

interface Staff { id: string; display_name: string | null; email: string | null }

interface Stats {
  total: number; open: number; suicide_risk: number; unassigned: number; overdue_follow_up: number;
  by_severity: Record<string, number>; by_status: Record<string, number>;
  by_branch: Record<string, number>; by_kp: Record<string, number>; by_caseworker: Record<string, number>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // filters (server-side)
  const [status, setStatus] = useState<'all' | CaseStatus>('all');
  const [branch, setBranch] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search.trim()); setPage(0); }, 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(0); }, [status, branch, assignee]);

  const access = useAccess();
  useEffect(() => {
    if (access.loading) return;
    if (!access.uid || !access.isStaff) { navigate('/admin/login'); return; }
    setUid(access.uid);
    setAuthorized(true);
    setChecking(false);
  }, [access.loading, access.uid, access.isStaff]);


  useCaseAlerts(authorized, () => {
    qc.invalidateQueries({ queryKey: ['alerts'] });
    qc.invalidateQueries({ queryKey: ['cases'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  });

  const staffQ = useQuery({
    queryKey: ['staff'],
    enabled: authorized,
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_profiles').select(sel('id, display_name, email'));
      if (error) throw error;
      return (data ?? []) as unknown as Staff[];
    },
  });
  const staffName = (id: string | null) => {
    if (!id) return null;
    const s = staffQ.data?.find((x) => x.id === id);
    return s?.display_name || s?.email || id.slice(0, 8);
  };

  const statsQ = useQuery({
    queryKey: ['stats', branch],
    enabled: authorized,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_stats' as any, { _branch: branch === 'all' ? null : branch });
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  const casesQ = useQuery({
    queryKey: ['cases', status, branch, assignee, debounced, page],
    enabled: authorized,
    queryFn: async () => {
      let q = supabase.from('cases').select(sel(LIST_COLS), { count: 'exact' });
      if (status !== 'all') q = q.eq('status', status);
      if (branch !== 'all') q = q.eq('profile->>branch', branch);
      if (assignee === 'unassigned') q = q.is('assigned_to', null);
      else if (assignee === 'me' && uid) q = q.eq('assigned_to', uid);
      else if (assignee !== 'all') q = q.eq('assigned_to', assignee);
      if (debounced) q = q.ilike('case_code', `%${debounced.toUpperCase()}%`);
      const { data, error, count } = await q
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
        .returns<CaseListRow[]>();
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const alertsQ = useQuery({
    queryKey: ['alerts'],
    enabled: authorized,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_alerts')
        .select(sel('id, case_id, case_code, branch, level, kind, acknowledged_at, created_at'))
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(20)
        .returns<CaseAlert[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const ackAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('case_alerts')
        .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: uid } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const invalidateCase = () => {
    qc.invalidateQueries({ queryKey: ['cases'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
    qc.invalidateQueries({ queryKey: ['case'] });
  };

  const logout = async () => { await supabase.auth.signOut(); navigate('/admin/login'); };

  const branchOptions = useMemo(() => ['all', ...BRANCHES], []);
  const stats = statsQ.data;
  const totalPages = Math.max(1, Math.ceil((casesQ.data?.count ?? 0) / PAGE_SIZE));

  const exportCSV = async () => {
    const { data, error } = await supabase
      .from('cases')
      .select(sel('case_code, created_at, status, severity, profile, victim, has_violation, violation_details, ai_result, referrals, suicide_risk, assigned_to'))
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) { toast.error('ส่งออกไม่สำเร็จ'); return; }
    const rows = (data ?? []).filter((c: any) => branch === 'all' || c.profile?.branch === branch);
    const headers = ['เลขเคส','วันที่','สถานะ','ความรุนแรง','พื้นที่','กลุ่ม','เพศ','อายุ','ผู้รับบริการ (ปกปิด)','พื้นที่เกิดเหตุ','มีการละเมิด','ประเภทการละเมิด','เสี่ยงทำร้ายตนเอง','ผู้รับผิดชอบ','คะแนน AI','สรุป AI','ส่งต่อ'];
    const esc = (v: any) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [headers.join(',')];
    rows.forEach((c: any) => {
      lines.push([
        c.case_code, new Date(c.created_at).toLocaleString('th-TH'), STATUS_LABEL[c.status as CaseStatus], c.severity || '',
        c.profile?.branch || '', c.profile?.kp || '', c.profile?.gender || '', c.profile?.age || '',
        c.victim?.name_masked || '', c.profile?.incidentPlace || '',
        c.has_violation ? 'ใช่' : 'ไม่', (c.violation_details || []).join(' | '),
        c.suicide_risk ? 'ใช่' : '', staffName(c.assigned_to) || '',
        c.ai_result?.riskScore ?? '', c.ai_result?.summary || '', (c.referrals || []).join(' | '),
      ].map(esc).join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swing-cases-${branch === 'all' ? 'all' : branch}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await logExport({ format: 'csv_summary', case_code: null });
    toast.success(`ส่งออก CSV ${rows.length} เคสแล้ว (บันทึกการส่งออกแล้ว)`);
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!authorized) return null;

  if (selectedId) {
    return (
      <CaseDetail
        caseId={selectedId}
        staff={staffQ.data ?? []}
        staffName={staffName}
        onBack={() => setSelectedId(null)}
        onChanged={invalidateCase}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-leaf grain">
      <header className="bg-gradient-dark text-white sticky top-0 z-30 shadow-elegant">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 rounded-2xl flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
            <div>
              <p className="font-display font-medium">SWING Admin Dashboard</p>
              <p className="text-[11px] text-white/60">
                Voice Screening · {access.roles.map((r) => ROLE_LABEL[r]).join(', ') || 'เจ้าหน้าที่'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {access.isAdmin && (
              <Button onClick={() => navigate('/admin/users')} size="sm" variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
                <UserCog className="w-4 h-4" /> ผู้ใช้
              </Button>
            )}
            {!access.isViewer && (
              <Button onClick={() => navigate('/intake')} size="sm" className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> เคสใหม่</Button>
            )}
            <Button onClick={logout} size="sm" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"><LogOut className="w-4 h-4" /></Button>

          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-5 py-6">
        {(alertsQ.data?.length ?? 0) > 0 && (
          <div className="mb-4 border-2 border-destructive/50 bg-destructive/5 rounded-xl p-4">
            <p className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
              <BellRing className="w-4 h-4" /> แจ้งเตือนเคสเสี่ยงสูงที่ยังไม่รับทราบ ({alertsQ.data?.length})
            </p>
            <div className="space-y-1.5">
              {alertsQ.data?.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg px-3 py-2">
                  {a.kind === 'suicide_risk' && <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />}
                  <span className="font-mono">{a.case_code}</span>
                  <span className="text-muted-foreground">· {a.branch || 'ไม่ระบุ'} · ระดับ {a.level}</span>
                  <span className="text-muted-foreground ml-auto hidden sm:inline">{new Date(a.created_at).toLocaleString('th-TH')}</span>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => a.case_id && setSelectedId(a.case_id)}>เปิดเคส</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => ackAlert.mutate(a.id)}><Check className="w-3 h-3" /> รับทราบ</Button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">ข้อความแจ้งเตือนทุกช่องทางเป็นแบบไม่ระบุตัวตน (รหัสเคส · พื้นที่ · ระดับ)</p>
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
            <TabsTrigger value="cases">จัดการเคส</TabsTrigger>
            <TabsTrigger value="caseload">Caseload</TabsTrigger>
            <TabsTrigger value="tracker">Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-card border border-border rounded-xl p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center shadow-card">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">พื้นที่:</span>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="h-9 max-w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((b) => <SelectItem key={b} value={b}>{b === 'all' ? 'ทุกพื้นที่' : b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground ml-1">{stats?.total ?? 0} เคส</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportCSV} variant="outline" size="sm" className="h-9"><Download className="w-3.5 h-3.5" /> CSV</Button>
              </div>
            </div>

            {statsQ.isLoading ? (
              <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  <StatCard num={stats?.total ?? 0} label="เคสทั้งหมด" tone="purple" />
                  <StatCard num={stats?.open ?? 0} label="ยังไม่ปิดเคส" tone="default" />
                  <StatCard num={stats?.suicide_risk ?? 0} label="เสี่ยงทำร้ายตนเอง" tone="red" />
                  <StatCard num={stats?.unassigned ?? 0} label="ยังไม่มอบหมาย" tone="amber" />
                  <StatCard num={stats?.overdue_follow_up ?? 0} label="เลยนัดติดตาม" tone="amber" />
                </div>
                <ChartBlock title="สถานะเคส" data={Object.entries(stats?.by_status ?? {}).map(([k, v]) => ({ label: STATUS_LABEL[k as CaseStatus] || k, value: v }))} />
                <ChartBlock title="ระดับความรุนแรง" data={Object.entries(stats?.by_severity ?? {}).map(([k, v]) => ({ label: k, value: v }))} />
                {branch === 'all' && <ChartBlock title="แยกตามพื้นที่" data={Object.entries(stats?.by_branch ?? {}).map(([k, v]) => ({ label: k, value: v }))} />}
                <ChartBlock title="กลุ่มประชากร (KP)" data={Object.entries(stats?.by_kp ?? {}).map(([k, v]) => ({ label: k, value: v }))} />
              </>
            )}
          </TabsContent>

          <TabsContent value="cases">
            <div className="bg-card border border-border rounded-xl p-3 mb-4 grid sm:grid-cols-4 gap-2 shadow-card">
              <div className="relative sm:col-span-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาเลขเคส" className="h-9 pl-8 text-sm" />
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="สถานะ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  {(['received', 'inprogress', 'completed', 'cancelled'] as CaseStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{branchOptions.map((b) => <SelectItem key={b} value={b}>{b === 'all' ? 'ทุกพื้นที่' : b}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ผู้รับผิดชอบทั้งหมด</SelectItem>
                  <SelectItem value="me">เคสของฉัน</SelectItem>
                  <SelectItem value="unassigned">ยังไม่มอบหมาย</SelectItem>
                  {(staffQ.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.display_name || s.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {casesQ.isLoading ? (
              <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
            ) : (casesQ.data?.rows.length ?? 0) === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-12">ไม่พบเคสตามเงื่อนไข</p>
            ) : (
              <div className="space-y-2">
                {casesQ.data?.rows.map((c) => {
                  const overdue = c.follow_up_at && new Date(c.follow_up_at) < new Date() && c.status !== 'completed';
                  return (
                    <button key={c.id} onClick={() => setSelectedId(c.id)}
                      className="w-full text-left bg-card border border-border rounded-xl p-3.5 hover:border-primary transition shadow-card">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-[11px] bg-foreground/90 text-background px-2 py-1 rounded">{c.case_code}</span>
                        <StatusBadge value={c.status} />
                        {c.severity && <SeverityBadge value={c.severity} />}
                        {c.suicide_risk && <span className="text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">เสี่ยงทำร้ายตนเอง</span>}
                        {overdue && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">เลยนัดติดตาม</span>}
                        <span className="ml-auto text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('th-TH')}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{c.victim?.name_masked || 'ไม่ระบุชื่อ'} · {c.profile?.kp || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.ai_result?.summary || c.profile?.incidentPlace || '-'}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> {staffName(c.assigned_to) || 'ยังไม่มอบหมาย'}
                        {c.follow_up_at && <> · <CalendarClock className="w-3 h-3" /> นัด {new Date(c.follow_up_at).toLocaleDateString('th-TH')}</>}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                {casesQ.data?.count ?? 0} เคส · หน้า {page + 1}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="caseload">
            <div className="bg-card border border-border rounded-xl p-5 shadow-card">
              <p className="text-sm font-medium mb-3">ภาระงานรายเจ้าหน้าที่ (Caseload)</p>
              <div className="space-y-2">
                {Object.entries(stats?.by_caseworker ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 text-sm border-b border-border/60 pb-2 last:border-none">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span className="flex-1 truncate">{k === 'unassigned' ? 'ยังไม่มอบหมาย' : staffName(k)}</span>
                    <span className="tabular-nums font-medium">{v}</span>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]"
                      onClick={() => { setAssignee(k === 'unassigned' ? 'unassigned' : k); toast.info('กรองเคสของผู้รับผิดชอบนี้ในแท็บจัดการเคสแล้ว'); }}>
                      ดูเคส
                    </Button>
                  </div>
                ))}
                {Object.keys(stats?.by_caseworker ?? {}).length === 0 && <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard num={stats?.unassigned ?? 0} label="ยังไม่มอบหมาย" tone="amber" />
                <StatCard num={stats?.overdue_follow_up ?? 0} label="เลยนัดติดตาม" tone="red" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracker">
            <div className="bg-card border border-border rounded-xl p-5 mb-3">
              <p className="font-medium mb-1">ส่งลิงก์ Tracker ให้ผู้ร้องเรียน</p>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">ผู้รับบริการกรอกเลขอ้างอิงเพื่อติดตามสถานะเคสตัวเองได้ โดยไม่เห็นข้อมูลเคสอื่น</p>
              <Button onClick={() => navigate('/track')} className="bg-gradient-primary">เปิดหน้า Tracker</Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ num, label, tone }: { num: number; label: string; tone: 'purple' | 'red' | 'amber' | 'default' }) {
  const cls = tone === 'purple' ? 'text-primary' : tone === 'red' ? 'text-destructive' : tone === 'amber' ? 'text-warning' : 'text-foreground';
  return (
    <div className="bg-card border border-border rounded-[1.25rem] p-4 text-center shadow-card hover-lift animate-bloom">
      <p className={`font-display text-3xl font-medium ${cls} tabular-nums`}>{num}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ChartBlock({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const visible = data.filter((d) => d.value > 0);
  return (
    <div className="bg-card border border-border rounded-[1.25rem] p-5 mb-4 shadow-card animate-bloom">
      <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wide">{title}</p>
      {visible.length === 0 ? <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p> : (
        <div className="space-y-2">
          {visible.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-xs w-32 truncate">{d.label}</span>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full transition-all duration-700" style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
              <span className="text-xs font-medium w-6 text-right tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaseDetail({ caseId, staff, staffName, onBack, onChanged }: {
  caseId: string; staff: Staff[]; staffName: (id: string | null) => string | null;
  onBack: () => void; onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [audioSigned, setAudioSigned] = useState<Record<number, string>>({});
  const [photoSigned, setPhotoSigned] = useState<string[]>([]);
  // PDPA: ข้อมูลระบุตัวตนอยู่คนละตาราง ต้องกดเปิดดูและระบบจะบันทึกประวัติการเข้าดูทุกครั้ง
  const [pii, setPii] = useState<{ reporter: any; victim: any } | null>(null);
  const [piiLoading, setPiiLoading] = useState(false);

  const revealPii = async () => {
    setPiiLoading(true);
    const { data, error } = await supabase.rpc('get_case_pii' as any, { _case_id: caseId });
    setPiiLoading(false);
    if (error) { toast.error('ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนบุคคลของเคสนี้'); return; }
    setPii(data as any);
  };

  const { data: c, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from('cases').select(sel(DETAIL_COLS)).eq('id', caseId).single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (!c) return;
    let cancelled = false;
    (async () => {
      // Phase 0.6 — audit every access to sensitive media, and keep links short-lived (5 นาที)
      void supabase.rpc('log_case_access' as any, { _case_id: c.id, _action: 'view_media' });
      const out: Record<number, string> = {};
      for (const a of (c.audio_urls || [])) {
        const { data } = await supabase.storage.from('case-audio').createSignedUrl(a.path, 300);
        if (data?.signedUrl) out[a.qIndex] = data.signedUrl;
      }
      const urls: string[] = [];
      for (const p of (c.photo_urls || [])) {
        const { data } = await supabase.storage.from('case-photos').createSignedUrl(p.path, 300);
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      if (!cancelled) { setAudioSigned(out); setPhotoSigned(urls); }
    })();
    return () => { cancelled = true; };
  }, [c?.id]);

  const patchCase = async (patch: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from('cases').update(patch as never).eq('id', caseId);
    if (error) { toast.error('บันทึกไม่สำเร็จ'); return; }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['case', caseId] });
    onChanged();
  };

  const updateStatus = async (status: CaseStatus) => {
    const { error } = await supabase.from('cases').update({ status } as never).eq('id', caseId);
    if (error) { toast.error('อัปเดตไม่สำเร็จ'); return; }
    await supabase.from('case_timeline').insert({ case_id: caseId, status, note: note || null } as never);
    toast.success('อัปเดตสถานะแล้ว');
    qc.invalidateQueries({ queryKey: ['case', caseId] });
    onChanged();
  };

  if (isLoading || !c) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const s = c.screening || {};

  return (
    <div className="min-h-screen bg-gradient-leaf grain">
      <header className="bg-gradient-dark text-white sticky top-0 z-30 shadow-elegant">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <p className="font-mono text-sm">{c.case_code}</p>
            <p className="text-[11px] text-white/60">{new Date(c.created_at).toLocaleString('th-TH')}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
              onClick={async () => {
                const p = pii ?? (await (async () => {
                  const { data } = await supabase.rpc('get_case_pii' as any, { _case_id: caseId });
                  if (data) setPii(data as any);
                  return data as any;
                })());
                printCaseReport({ ...c, reporter: p?.reporter ?? null, victim: p?.victim ?? null, assignee_name: staffName(c.assigned_to) } as CaseReportData);
              }}>
              <FileText className="w-4 h-4" /> เอกสารส่งต่อ (PDF)
            </Button>
            <StatusBadge value={c.status} /> {c.severity && <SeverityBadge value={c.severity} />}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 space-y-4">
        {c.suicide_risk && (
          <section className="border-2 border-destructive rounded-xl p-4 bg-destructive/5">
            <p className="text-sm font-semibold text-destructive flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> เคสนี้มีความเสี่ยงทำร้ายตนเอง — ติดตามตามขั้นตอน safety planning และสายด่วน 1323
            </p>
          </section>
        )}

        {/* Case assignment & follow-up */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-card grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">ผู้รับผิดชอบเคส</p>
            <Select value={c.assigned_to ?? 'none'} onValueChange={(v) => patchCase({ assigned_to: v === 'none' ? null : v }, 'มอบหมายเคสแล้ว')}>
              <SelectTrigger className="h-9"><SelectValue placeholder="เลือกเจ้าหน้าที่" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ยังไม่มอบหมาย</SelectItem>
                {staff.map((st) => <SelectItem key={st.id} value={st.id}>{st.display_name || st.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">วันนัดติดตาม</p>
            <Input
              type="date"
              value={c.follow_up_at ? new Date(c.follow_up_at).toISOString().slice(0, 10) : ''}
              onChange={(e) => patchCase({ follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null }, 'ตั้งวันนัดติดตามแล้ว')}
              className="h-9"
            />
          </div>
        </section>

        {c.ai_result && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <p className="text-xs font-medium text-primary mb-2">ความเห็นเบื้องต้นจากระบบ AI</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${c.ai_result.riskLevel === 'high' ? 'bg-destructive' : c.ai_result.riskLevel === 'medium' ? 'bg-warning' : 'bg-success'}`} style={{ width: `${c.ai_result.riskScore}%` }} />
              </div>
              <span className="font-medium tabular-nums">{c.ai_result.riskScore}</span>
            </div>
            <p className="text-sm leading-relaxed mb-3">{c.ai_result.summary}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(c.ai_result.violationTags || []).map((t: any, i: number) => <span key={i} className="text-[11px] bg-primary-soft text-primary px-2 py-1 rounded-full">{t.label}</span>)}
            </div>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground mb-3">
              {(c.ai_result.recommendations || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3">
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">{AI_DISCLAIMER}</p>
              <Button size="sm" variant={c.ai_reviewed ? 'outline' : 'default'} className="mt-2 h-8 text-[11px]"
                disabled={c.ai_reviewed}
                onClick={async () => {
                  const { data: sess } = await supabase.auth.getUser();
                  patchCase({ ai_reviewed: true, ai_reviewed_at: new Date().toISOString(), ai_reviewed_by: sess.user?.id }, 'บันทึกการทบทวนผล AI แล้ว');
                }}>
                <Check className="w-3 h-3" /> {c.ai_reviewed ? `เจ้าหน้าที่ทบทวนแล้ว${c.ai_reviewed_at ? ` · ${new Date(c.ai_reviewed_at).toLocaleDateString('th-TH')}` : ''}` : 'ทำเครื่องหมายว่าทบทวนแล้ว'}
              </Button>
            </div>
          </section>
        )}

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3">ผลแบบคัดกรองมาตรฐาน</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">2Q: </span>{s.q2Positive === undefined ? '-' : s.q2Positive ? 'ผิดปกติ' : 'ปกติ'}</div>
            <div><span className="text-muted-foreground text-xs">9Q: </span>{typeof s.q9Total === 'number' ? `${s.q9Total} — ${q9Level(s.q9Total).label}` : '-'}</div>
            <div><span className="text-muted-foreground text-xs">ข้อ 9 (ทำร้ายตนเอง): </span>{c.suicide_risk ? 'พบความเสี่ยง' : 'ไม่พบ'}</div>
            <div><span className="text-muted-foreground text-xs">NRM: </span>{s.nrmPositive === undefined ? '-' : s.nrmPositive ? 'เข้าข่ายค้ามนุษย์' : 'ยังไม่เข้าเกณฑ์'}{s.nrmUnder18 ? ' · ผู้เยาว์' : ''}</div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-4 text-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-medium text-muted-foreground">ข้อมูลผู้เกี่ยวข้อง</p>
            {!pii && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={piiLoading} onClick={revealPii}>
                {piiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />} เปิดดูข้อมูลส่วนบุคคล
              </Button>
            )}
          </div>
          {!pii && (
            <p className="text-xs text-muted-foreground">
              ชื่อ ที่อยู่ และเบอร์โทรถูกจัดเก็บแยกตาม PDPA · การเปิดดูจะถูกบันทึกไว้ในประวัติการเข้าถึง
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">ผู้แจ้ง</p>
              <p>{pii ? (pii.reporter?.name || '-') : '••••••'}</p>
              <p className="text-xs text-muted-foreground">{pii ? [pii.reporter?.phone, pii.reporter?.email].filter(Boolean).join(' · ') : '••••••'}</p>
              {pii?.reporter?.address && <p className="text-xs text-muted-foreground">{pii.reporter.address}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">ผู้รับบริการ</p>
              <p>{pii ? (pii.victim?.name || '-') : (c.victim?.name_masked || '••••••')}</p>
              <p className="text-xs text-muted-foreground">{c.profile?.kp} · {c.profile?.gender} · {c.profile?.age}</p>
              {pii?.victim?.contact && <p className="text-xs text-muted-foreground">{pii.victim.contact}</p>}
            </div>
            <div><p className="text-xs text-muted-foreground mb-1">พื้นที่</p><p>{c.profile?.branch}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">พื้นที่เกิดเหตุ</p><p>{c.profile?.incidentPlace || '-'}</p></div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3">บันทึกการสัมภาษณ์</p>
          <div className="space-y-3">
            {(c.answers || []).map((a: any, i: number) => (
              <div key={i} className="border-b border-border/60 pb-3 last:border-none last:pb-0">
                <p className="text-[10px] uppercase tracking-wider text-primary mb-1">{a.cat}</p>
                <p className="text-xs text-muted-foreground mb-1">{a.question}</p>
                <p className="text-sm bg-muted/40 border border-border rounded-md p-2">{a.transcript || '(ไม่มีคำตอบ)'}</p>
                {audioSigned[i] && <audio src={audioSigned[i]} controls className="w-full mt-2 h-9" />}
                {c.staff_observations?.[i] && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5">หมายเหตุ: {c.staff_observations[i]}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-2">การส่งต่อ</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(c.referrals || []).map((r: string, i: number) => <span key={i} className="text-[11px] bg-primary-soft text-primary px-2 py-1 rounded-full">{r}</span>)}
            {(!c.referrals || c.referrals.length === 0) && <span className="text-xs text-muted-foreground">ยังไม่มี</span>}
          </div>
          {c.referral_note && <p className="text-xs text-muted-foreground">{c.referral_note}</p>}
        </section>

        {photoSigned.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <p className="text-xs font-medium text-muted-foreground mb-3">รูปภาพประกอบ ({photoSigned.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {photoSigned.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition">
                  <img src={url} alt={`รูปประกอบ ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3">อัปเดตสถานะ</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {(['received', 'inprogress', 'completed', 'cancelled'] as CaseStatus[]).map((st) => (
              <button key={st} onClick={() => updateStatus(st)}
                className={`text-xs py-2 rounded-lg border transition ${c.status === st ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary'}`}>
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุการอัปเดต (ไม่บังคับ)" className="min-h-[60px]" />
        </section>

        {c.signature_staff && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <p className="text-xs font-medium text-muted-foreground mb-2">ลายเซ็นเจ้าหน้าที่ — {c.signature_staff_name}</p>
            <img src={c.signature_staff} alt="signature" className="bg-white border border-border rounded-md max-h-24" />
          </section>
        )}
      </main>
    </div>
  );
}
