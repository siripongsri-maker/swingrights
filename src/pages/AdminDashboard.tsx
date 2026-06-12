import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { SeverityBadge } from '@/components/screening/SeverityBadge';
import { CaseStatus, STATUS_LABEL, BRANCHES } from '@/lib/screening';
import { Loader2, LogOut, Plus, ShieldCheck, ArrowLeft, Download, FileText, MapPin } from 'lucide-react';
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
  photo_urls: { path: string; name: string }[] | null;
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
      let { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      let isAdmin = roles?.some((r: any) => r.role === 'admin');
      if (!isAdmin) {
        // Try to claim demo admin (works only for admin@swing.demo)
        await supabase.rpc('claim_demo_admin' as any);
        const { data: roles2 } = await supabase.from('user_roles').select('role').eq('user_id', uid);
        isAdmin = roles2?.some((r: any) => r.role === 'admin');
      }
      if (!isAdmin) {
        navigate('/admin/login');
        return;
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

  const [branchFilter, setBranchFilter] = useState<string>('all');

  const branchOptions = useMemo(() => {
    const set = new Set<string>(BRANCHES);
    cases.forEach((c) => c.profile?.branch && set.add(c.profile.branch));
    return ['all', ...Array.from(set)];
  }, [cases]);

  const overviewCases = useMemo(
    () => (branchFilter === 'all' ? cases : cases.filter((c) => c.profile?.branch === branchFilter)),
    [cases, branchFilter]
  );

  const stats = useMemo(() => {
    const src = overviewCases;
    const total = src.length;
    const violence = src.filter((c) => c.has_violation).length;
    const high = src.filter((c) => c.ai_result?.riskLevel === 'high' || c.severity === 'red').length;
    const referred = src.filter((c) => Array.isArray(c.referrals) && c.referrals.length > 0).length;
    const byStatus: Record<CaseStatus, number> = { received: 0, inprogress: 0, completed: 0, cancelled: 0 };
    const byVtype: Record<string, number> = {};
    const byKp: Record<string, number> = {};
    const byBranch: Record<string, number> = {};
    src.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      (c.ai_result?.violationTags || []).forEach((t: any) => {
        byVtype[t.label] = (byVtype[t.label] || 0) + 1;
      });
      const kp = c.profile?.kp || 'ไม่ระบุ';
      byKp[kp] = (byKp[kp] || 0) + 1;
      const br = c.profile?.branch || 'ไม่ระบุ';
      byBranch[br] = (byBranch[br] || 0) + 1;
    });
    return { total, violence, high, referred, byStatus, byVtype, byKp, byBranch };
  }, [overviewCases]);

  const filtered = filter === 'all' ? cases : cases.filter((c) => c.status === filter);

  const updateStatus = async (id: string, status: CaseStatus, note?: string) => {
    await supabase.from('cases').update({ status } as any).eq('id', id);
    await supabase.from('case_timeline').insert({ case_id: id, status, note: note || null } as any);
    toast.success('อัปเดตสถานะแล้ว');
    await loadCases();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const logout = async () => { await supabase.auth.signOut(); navigate('/admin/login'); };

  const exportCSV = () => {
    const rows = overviewCases;
    const headers = ['เลขเคส','วันที่','สถานะ','ความรุนแรง','พื้นที่','กลุ่ม','เพศ','อายุ','ผู้รับบริการ','ผู้แจ้ง','พื้นที่เกิดเหตุ','มีการละเมิด','ประเภทการละเมิด','คะแนนความเสี่ยง (AI)','สรุป AI','ส่งต่อ'];
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(',')];
    rows.forEach((c) => {
      lines.push([
        c.case_code,
        new Date(c.created_at).toLocaleString('th-TH'),
        STATUS_LABEL[c.status],
        c.severity || '',
        c.profile?.branch || '',
        c.profile?.kp || '',
        c.profile?.gender || '',
        c.profile?.age || '',
        c.victim?.name || '',
        c.reporter?.name || '',
        c.profile?.incidentPlace || '',
        c.has_violation ? 'ใช่' : 'ไม่',
        (c.violation_details || []).join(' | '),
        c.ai_result?.riskScore ?? '',
        c.ai_result?.summary || '',
        (c.referrals || []).join(' | '),
      ].map(esc).join(','));
    });
    // Prepend BOM for Excel Thai support
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swing-cases-${branchFilter === 'all' ? 'all' : branchFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`ส่งออก CSV ${rows.length} เคสแล้ว`);
  };

  const exportPDF = () => {
    const rows = overviewCases;
    const branchTitle = branchFilter === 'all' ? 'ทุกพื้นที่' : branchFilter;
    const statBlock = (label: string, n: number) => `<div class="stat"><div class="num">${n}</div><div class="lbl">${label}</div></div>`;
    const barRows = (data: { label: string; value: number }[]) => {
      const max = Math.max(...data.map((d) => d.value), 1);
      return data.filter((d) => d.value > 0).map((d) => `
        <div class="bar-row">
          <span class="bar-lbl">${d.label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(d.value / max) * 100}%"></div></div>
          <span class="bar-val">${d.value}</span>
        </div>`).join('');
    };
    const tableRows = rows.map((c) => `
      <tr>
        <td>${c.case_code}</td>
        <td>${new Date(c.created_at).toLocaleDateString('th-TH')}</td>
        <td>${STATUS_LABEL[c.status]}</td>
        <td>${c.severity || '-'}</td>
        <td>${c.profile?.branch || '-'}</td>
        <td>${c.profile?.kp || '-'}</td>
        <td>${c.victim?.name || '-'}</td>
        <td>${c.has_violation ? '✓' : '-'}</td>
        <td>${c.ai_result?.riskScore ?? '-'}</td>
      </tr>`).join('');

    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8" />
      <title>SWING Report — ${branchTitle}</title>
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Sarabun','Noto Sans Thai',-apple-system,system-ui,sans-serif; color:#111; margin:0; padding:24px; }
        h1 { margin:0 0 4px; font-size:22px; color:#5b2bca; }
        .sub { color:#666; font-size:12px; margin-bottom:18px; }
        .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .stat { border:1px solid #e5e5e5; border-radius:10px; padding:12px; text-align:center; }
        .stat .num { font-size:24px; font-weight:600; color:#5b2bca; }
        .stat .lbl { font-size:11px; color:#666; margin-top:2px; }
        .section { margin-bottom:18px; }
        .section h2 { font-size:13px; color:#444; margin:0 0 8px; padding-bottom:4px; border-bottom:1px solid #eee; }
        .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:5px; font-size:11px; }
        .bar-lbl { width:140px; }
        .bar-track { flex:1; height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden; }
        .bar-fill { height:100%; background:linear-gradient(90deg,#7c3aed,#a78bfa); }
        .bar-val { width:30px; text-align:right; font-variant-numeric:tabular-nums; }
        table { width:100%; border-collapse:collapse; font-size:10.5px; }
        th, td { border:1px solid #e5e5e5; padding:5px 7px; text-align:left; }
        th { background:#f7f3ff; color:#5b2bca; font-weight:600; }
        tr:nth-child(even) td { background:#fafafa; }
        .footer { margin-top:24px; font-size:10px; color:#888; text-align:center; }
        @media print { body { padding:0; } }
      </style></head><body>
      <h1>SWING Foundation — รายงานเคส</h1>
      <div class="sub">พื้นที่: <strong>${branchTitle}</strong> · วันที่ออกรายงาน ${new Date().toLocaleString('th-TH')}</div>
      <div class="stats">
        ${statBlock('เคสทั้งหมด', stats.total)}
        ${statBlock('มีความรุนแรง', stats.violence)}
        ${statBlock('ความเสี่ยงสูง', stats.high)}
        ${statBlock('ส่งต่อแล้ว', stats.referred)}
      </div>
      <div class="section"><h2>สถานะเคส</h2>${barRows(Object.entries(stats.byStatus).map(([k, v]) => ({ label: STATUS_LABEL[k as CaseStatus], value: v as number })))}</div>
      <div class="section"><h2>กลุ่มประชากร (KP)</h2>${barRows(Object.entries(stats.byKp).map(([k, v]) => ({ label: k, value: v as number })))}</div>
      ${branchFilter === 'all' ? `<div class="section"><h2>แยกตามพื้นที่</h2>${barRows(Object.entries(stats.byBranch).map(([k, v]) => ({ label: k, value: v as number })))}</div>` : ''}
      <div class="section"><h2>ประเภทการละเมิด (จาก AI)</h2>${barRows(Object.entries(stats.byVtype).map(([k, v]) => ({ label: k, value: v as number }))) || '<p style="font-size:11px;color:#888">ยังไม่มีข้อมูล</p>'}</div>
      <div class="section"><h2>รายการเคส (${rows.length})</h2>
        <table><thead><tr><th>เลขเคส</th><th>วันที่</th><th>สถานะ</th><th>ความรุนแรง</th><th>พื้นที่</th><th>กลุ่ม</th><th>ผู้รับบริการ</th><th>ละเมิด</th><th>คะแนน AI</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="9" style="text-align:center;color:#888">ไม่มีข้อมูล</td></tr>'}</tbody></table>
      </div>
      <div class="footer">SWING Foundation · Confidential — สำหรับเจ้าหน้าที่ภายในเท่านั้น</div>
      <script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { toast.error('กรุณาอนุญาต popup เพื่อพิมพ์ PDF'); return; }
    w.document.write(html);
    w.document.close();
  };

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
            <div className="bg-card border border-border rounded-xl p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center shadow-card">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">พื้นที่:</span>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="h-9 max-w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((b) => (
                      <SelectItem key={b} value={b}>{b === 'all' ? 'ทุกพื้นที่' : b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground ml-1">{overviewCases.length} เคส</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportCSV} variant="outline" size="sm" className="h-9"><Download className="w-3.5 h-3.5" /> CSV</Button>
                <Button onClick={exportPDF} size="sm" className="h-9 bg-gradient-primary"><FileText className="w-3.5 h-3.5" /> PDF</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard num={stats.total} label="เคสทั้งหมด" tone="purple" />
              <StatCard num={stats.violence} label="มีความรุนแรง" tone="red" />
              <StatCard num={stats.high} label="ความเสี่ยงสูง" tone="amber" />
              <StatCard num={stats.referred} label="ส่งต่อแล้ว" tone="default" />
            </div>

            <ChartBlock title="สถานะเคส" data={Object.entries(stats.byStatus).map(([k, v]) => ({ label: STATUS_LABEL[k as CaseStatus], value: v }))} />
            {branchFilter === 'all' && (
              <ChartBlock title="แยกตามพื้นที่" data={Object.entries(stats.byBranch).map(([k, v]) => ({ label: k, value: v }))} />
            )}
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
  const [audioSigned, setAudioSigned] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    const list = caseRow.audio_urls || [];
    if (list.length === 0) return;
    (async () => {
      const out: Record<number, string> = {};
      for (const a of list) {
        const { data } = await supabase.storage.from('case-audio').createSignedUrl(a.path, 3600);
        if (data?.signedUrl) out[a.qIndex] = data.signedUrl;
      }
      if (!cancelled) setAudioSigned(out);
    })();
    return () => { cancelled = true; };
  }, [caseRow.id]);

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
                {audioSigned[i] && (
                  <audio src={audioSigned[i]} controls className="w-full mt-2 h-9" />
                )}
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
