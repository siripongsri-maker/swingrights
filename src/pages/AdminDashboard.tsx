import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { SeverityBadge } from '@/components/screening/SeverityBadge';
import { CaseStatus, STATUS_LABEL } from '@/lib/screening';
import { Loader2, LogOut, Plus, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CaseRow {
  id: string;
  case_code: string;
  status: CaseStatus;
  severity: 'green' | 'yellow' | 'red' | null;
  created_at: string;
  victim: any;
  profile: any;
  ai_result: any;
  reporter: any;
  answers: any;
  staff_observations: any;
  referrals: any;
  referral_note: string | null;
  signature_staff_name: string | null;
  signature_staff: string | null;
  has_violation: boolean | null;
  violation_details: any;
  extra_facts: string | null;
  audio_urls: { qIndex: number; path: string; question: string }[] | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selected, setSelected] = useState<CaseRow | null>(null);
  const [filter, setFilter] = useState<'all' | CaseStatus>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { navigate('/admin/login'); return; }
      const uid = session.session.user.id;
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      const isAdmin = roles?.some((r: any) => r.role === 'admin');
      if (!isAdmin) {
        // Auto-grant for demo simplicity
        await supabase.from('user_roles').insert({ user_id: uid, role: 'admin' } as any);
      }
      if (cancelled) return;
      setAuthorized(true);
      await loadCases();
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadCases = async () => {
    const { data } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
    setCases((data ?? []) as any);
  };

  const stats = useMemo(() => {
    const total = cases.length;
    const violence = cases.filter((c) => c.has_violation).length;
    const high = cases.filter((c) => c.ai_result?.riskLevel === 'high' || c.severity === 'red').length;
    const referred = cases.filter((c) => Array.isArray(c.referrals) && c.referrals.length > 0).length;
    const byStatus: Record<CaseStatus, number> = { received: 0, inprogress: 0, completed: 0, cancelled: 0 };
    const byVtype: Record<string, number> = {};
    const byKp: Record<string, number> = {};
    cases.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      (c.ai_result?.violationTags || []).forEach((t: any) => {
        byVtype[t.label] = (byVtype[t.label] || 0) + 1;
      });
      const kp = c.profile?.kp || 'ไม่ระบุ';
      byKp[kp] = (byKp[kp] || 0) + 1;
    });
    return { total, violence, high, referred, byStatus, byVtype, byKp };
  }, [cases]);

  const filtered = filter === 'all' ? cases : cases.filter((c) => c.status === filter);

  const updateStatus = async (id: string, status: CaseStatus, note?: string) => {
    await supabase.from('cases').update({ status } as any).eq('id', id);
    await supabase.from('case_timeline').insert({ case_id: id, status, note: note || null } as any);
    toast.success('อัปเดตสถานะแล้ว');
    await loadCases();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const logout = async () => { await supabase.auth.signOut(); navigate('/admin/login'); };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!authorized) return null;

  if (selected) {
    return <CaseDetail caseRow={selected} onBack={() => setSelected(null)} onUpdateStatus={(s, n) => updateStatus(selected.id, s, n)} />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-gradient-dark text-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
            <div>
              <p className="font-medium">SWING Admin Dashboard</p>
              <p className="text-[11px] text-white/60">Voice Screening · Rights & Violation Tool</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/intake')} size="sm" className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> เคสใหม่</Button>
            <Button onClick={logout} size="sm" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-5 py-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
            <TabsTrigger value="cases">จัดการเคส</TabsTrigger>
            <TabsTrigger value="tracker">Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard num={stats.total} label="เคสทั้งหมด" tone="purple" />
              <StatCard num={stats.violence} label="มีความรุนแรง" tone="red" />
              <StatCard num={stats.high} label="ความเสี่ยงสูง" tone="amber" />
              <StatCard num={stats.referred} label="ส่งต่อแล้ว" tone="default" />
            </div>

            <ChartBlock title="สถานะเคส" data={Object.entries(stats.byStatus).map(([k, v]) => ({ label: STATUS_LABEL[k as CaseStatus], value: v }))} />
            <ChartBlock title="ประเภทการละเมิด (จาก AI)" data={Object.entries(stats.byVtype).map(([k, v]) => ({ label: k, value: v }))} />
            <ChartBlock title="กลุ่มประชากร (KP)" data={Object.entries(stats.byKp).map(([k, v]) => ({ label: k, value: v }))} />
          </TabsContent>

          <TabsContent value="cases">
            <div className="flex gap-2 flex-wrap mb-4">
              {(['all', 'received', 'inprogress', 'completed', 'cancelled'] as const).map((s) => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary'}`}>
                  {s === 'all' ? 'ทั้งหมด' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-12">ยังไม่มีเคส</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className="w-full text-left bg-card border border-border rounded-xl p-3.5 hover:border-primary transition shadow-card">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-[11px] bg-foreground/90 text-background px-2 py-1 rounded">{c.case_code}</span>
                      <StatusBadge value={c.status} />
                      {c.severity && <SeverityBadge value={c.severity} />}
                      <span className="ml-auto text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('th-TH')}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{c.victim?.name || '-'} · {c.profile?.kp || '-'}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.ai_result?.summary || c.profile?.incidentPlace || '-'}</p>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tracker">
            <div className="bg-card border border-border rounded-xl p-5 mb-3">
              <p className="font-medium mb-1">ส่งลิงก์ Tracker ให้ผู้ร้องเรียน</p>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">ผู้รับบริการกรอกเลขอ้างอิงเพื่อติดตามสถานะเคสตัวเองได้ โดยไม่เห็นข้อมูลเคสอื่น</p>
              <Button onClick={() => navigate('/track')} className="bg-gradient-primary">เปิดหน้า Tracker</Button>
            </div>
            <div className="bg-primary-soft/40 border border-primary/20 rounded-xl p-5">
              <p className="text-sm font-medium text-primary mb-2">วิธีใช้งาน</p>
              <ol className="text-sm text-muted-foreground space-y-1 leading-relaxed list-decimal list-inside">
                <li>แจ้งเลขอ้างอิง (SW-XXXX-XXXX) ให้ผู้รับบริการ</li>
                <li>ผู้รับบริการกรอกเลขในหน้า Tracker</li>
                <li>ระบบแสดงเฉพาะสถานะและ timeline ของเคสนั้น</li>
                <li>เจ้าหน้าที่อัปเดตสถานะจาก "จัดการเคส"</li>
              </ol>
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
    <div className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
      <p className={`text-3xl font-medium ${cls}`}>{num}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ChartBlock({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const visible = data.filter((d) => d.value > 0);
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-card">
      <p className="text-xs font-medium text-muted-foreground mb-3">{title}</p>
      {visible.length === 0 ? <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p> : (
        <div className="space-y-2">
          {visible.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-xs w-32 truncate">{d.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
              <span className="text-xs font-medium w-6 text-right tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaseDetail({ caseRow, onBack, onUpdateStatus }: { caseRow: CaseRow; onBack: () => void; onUpdateStatus: (s: CaseStatus, note?: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-gradient-dark text-white">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <p className="font-mono text-sm">{caseRow.case_code}</p>
            <p className="text-[11px] text-white/60">{new Date(caseRow.created_at).toLocaleString('th-TH')}</p>
          </div>
          <div className="ml-auto flex items-center gap-2"><StatusBadge value={caseRow.status} /> {caseRow.severity && <SeverityBadge value={caseRow.severity} />}</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 space-y-4">
        {caseRow.ai_result && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <p className="text-xs font-medium text-primary mb-2">การวิเคราะห์ของ AI</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${caseRow.ai_result.riskLevel === 'high' ? 'bg-destructive' : caseRow.ai_result.riskLevel === 'medium' ? 'bg-warning' : 'bg-success'}`} style={{ width: `${caseRow.ai_result.riskScore}%` }} />
              </div>
              <span className="font-medium tabular-nums">{caseRow.ai_result.riskScore}</span>
            </div>
            <p className="text-sm leading-relaxed mb-3">{caseRow.ai_result.summary}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(caseRow.ai_result.violationTags || []).map((t: any, i: number) => <span key={i} className="text-[11px] bg-primary-soft text-primary px-2 py-1 rounded-full">{t.label}</span>)}
            </div>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              {(caseRow.ai_result.recommendations || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </section>
        )}

        <section className="bg-card border border-border rounded-xl p-5 shadow-card grid sm:grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-muted-foreground mb-1">ผู้แจ้ง</p><p>{caseRow.reporter?.name || '-'}</p><p className="text-xs text-muted-foreground">{caseRow.reporter?.phone}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">ผู้รับบริการ</p><p>{caseRow.victim?.name || '-'}</p><p className="text-xs text-muted-foreground">{caseRow.profile?.kp} · {caseRow.profile?.gender} · {caseRow.profile?.age}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">พื้นที่</p><p>{caseRow.profile?.branch}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">พื้นที่เกิดเหตุ</p><p>{caseRow.profile?.incidentPlace || '-'}</p></div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3">บันทึกการสัมภาษณ์</p>
          <div className="space-y-3">
            {(caseRow.answers || []).map((a: any, i: number) => (
              <div key={i} className="border-b border-border/60 pb-3 last:border-none last:pb-0">
                <p className="text-[10px] uppercase tracking-wider text-primary mb-1">{a.cat}</p>
                <p className="text-xs text-muted-foreground mb-1">{a.question}</p>
                <p className="text-sm bg-muted/40 border border-border rounded-md p-2">{a.transcript || '(ไม่มีคำตอบ)'}</p>
                {caseRow.staff_observations?.[i] && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5">หมายเหตุ: {caseRow.staff_observations[i]}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-2">การส่งต่อ</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(caseRow.referrals || []).map((r: string, i: number) => <span key={i} className="text-[11px] bg-primary-soft text-primary px-2 py-1 rounded-full">{r}</span>)}
            {(!caseRow.referrals || caseRow.referrals.length === 0) && <span className="text-xs text-muted-foreground">ยังไม่มี</span>}
          </div>
          {caseRow.referral_note && <p className="text-xs text-muted-foreground">{caseRow.referral_note}</p>}
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3">อัปเดตสถานะ</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {(['received', 'inprogress', 'completed', 'cancelled'] as CaseStatus[]).map((s) => (
              <button key={s} onClick={() => onUpdateStatus(s, note)}
                className={`text-xs py-2 rounded-lg border transition ${caseRow.status === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary'}`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุการอัปเดต (ไม่บังคับ)" className="min-h-[60px]" />
        </section>

        {caseRow.signature_staff && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <p className="text-xs font-medium text-muted-foreground mb-2">ลายเซ็นเจ้าหน้าที่ — {caseRow.signature_staff_name}</p>
            <img src={caseRow.signature_staff} alt="signature" className="bg-white border border-border rounded-md max-h-24" />
          </section>
        )}
      </main>
    </div>
  );
}
