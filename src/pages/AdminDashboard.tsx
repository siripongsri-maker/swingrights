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
import { useAccess, useRoleLabels } from '@/hooks/useAccess';

import {
  Loader2, LogOut, Plus, ShieldCheck, ArrowLeft, Download, FileText, MapPin,
  Search, ChevronLeft, ChevronRight, UserCheck, UserCog, CalendarClock, BellRing, ShieldAlert, Check,
  MessageCircleQuestion, Send, Building2, Volume2, ChevronDown, Printer, Scale, Share2, HeartHandshake, Flag,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { printCaseDocument, docInputFromReport, DOC_KINDS, type DocKind } from '@/lib/caseDocuments';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CaseReferrals } from '@/components/admin/CaseReferrals';
import { MapPicker } from '@/components/screening/MapPicker';
import { DocumentDraftDialog } from '@/components/admin/DocumentDraftDialog';
import { BrandMark } from '@/components/BrandLogo';

const PAGE_SIZE = 20;

const LIST_COLS =
  'id, case_code, status, severity, created_at, follow_up_at, assigned_to, suicide_risk, ai_reviewed, victim, profile, ai_result, first_response_at, pii_flag';
const DETAIL_COLS = '*';
const sel = (s: string): string => s;

function referralLabel(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const referral = value as Record<string, unknown>;
  return [referral.org_name, referral.phone, referral.note]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' · ');
}

interface CaseListRow {
  id: string;
  case_code: string;
  pii_flag?: boolean;
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
  first_response_at: string | null;
}

function SlaBadge({ createdAt }: { createdAt: string }) {
  const { t } = useI18n();
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  const left = 24 - elapsed;
  if (left <= 0) {
    return <span className="text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full tabular-nums">{t('dash.sla.overdue', { h: Math.floor(elapsed) })}</span>;
  }
  const h = Math.ceil(left);
  const cls = left < 6 ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums ${cls}`}>{t('dash.sla.remaining', { h })}</span>;
}

interface Staff { id: string; display_name: string | null; email: string | null }

interface Stats {
  total: number; open: number; suicide_risk: number; unassigned: number; overdue_follow_up: number;
  sla_total?: number; sla_met_count?: number; awaiting_response?: number;
  by_severity: Record<string, number>; by_status: Record<string, number>;
  by_branch: Record<string, number>; by_kp: Record<string, number>; by_caseworker: Record<string, number>;
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const roleLabels = useRoleLabels();
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

  const branchOptions = useMemo(() => {
    const fromData = Object.keys(statsQ.data?.by_branch ?? {}).filter((b) => b && b !== 'ไม่ระบุ');
    return ['all', ...Array.from(new Set([...fromData, ...BRANCHES])).sort((a, b) => a.localeCompare(b, 'th'))];
  }, [statsQ.data]);
  const stats = statsQ.data;
  const totalPages = Math.max(1, Math.ceil((casesQ.data?.count ?? 0) / PAGE_SIZE));

  const exportCSV = async () => {
    const { data, error } = await supabase
      .from('cases')
      .select(sel('id, case_code, created_at, status, severity, profile, victim, has_violation, violation_details, ai_result, referrals, suicide_risk, assigned_to'))
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) { toast.error(t('dash.csv.exportFailed')); return; }
    const rows = (data ?? []).filter((c: any) => branch === 'all' || c.profile?.branch === branch);
    // referral log (only rows the user may see under RLS)
    const { data: refs } = await supabase.from('case_referrals' as never)
      .select('case_id,partner_id,referred_at,accepted_at,outcome').limit(10000);
    const { data: pts } = await supabase.from('referral_partners' as never).select('id,name');
    const pName = Object.fromEntries(((pts ?? []) as any[]).map((p) => [p.id, p.name]));
    const refByCase: Record<string, string[]> = {};
    ((refs ?? []) as any[]).forEach((r) => {
      const s = `${pName[r.partner_id] ?? '?'} (${t(`ref.outcome.${r.outcome}`)}; ${new Date(r.referred_at).toLocaleDateString('th-TH')}${r.accepted_at ? ` → ${new Date(r.accepted_at).toLocaleDateString('th-TH')}` : ''})`;
      (refByCase[r.case_id] ||= []).push(s);
    });
    const headers = ['เลขเคส','วันที่','สถานะ','ความรุนแรง','พื้นที่','กลุ่ม','เพศ','อายุ','ผู้รับบริการ (ปกปิด)','พื้นที่เกิดเหตุ','มีการละเมิด','ประเภทการละเมิด','เสี่ยงทำร้ายตนเอง','ผู้รับผิดชอบ','คะแนน AI','สรุป AI','ส่งต่อ', t('ref.csvHeader')];
    const esc = (v: any) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [headers.join(',')];
    rows.forEach((c: any) => {
      lines.push([
        c.case_code, new Date(c.created_at).toLocaleString('th-TH'), STATUS_LABEL[c.status as CaseStatus], c.severity || '',
        c.profile?.branch || '', c.profile?.kp || '', c.profile?.gender || '', c.profile?.age || '',
        c.victim?.name_masked || '', c.profile?.incidentPlace || '',
        c.has_violation ? t('dash.csv.yes') : t('dash.csv.no'), (c.violation_details || []).join(' | '),
        c.suicide_risk ? t('dash.csv.yes') : '', staffName(c.assigned_to) || '',
        c.ai_result?.riskScore ?? '', c.ai_result?.summary || '', (c.referrals || []).join(' | '),
        (refByCase[c.id] || []).join(' | '),
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
    toast.success(t('dash.export.csvSuccess', { n: rows.length }));
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
    <div className="min-h-screen bg-background">
      <header className="bg-primary-deep text-primary-foreground sticky top-0 z-30 shadow-elegant">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-10 w-10" />
            <div>
              <p className="font-display font-medium">SWING Admin Dashboard</p>
              <p className="text-[11px] text-sidebar-foreground/60">
                Voice Screening · {access.roles.map((r) => roleLabels[r]).join(', ') || t('dash.staffFallback')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {access.isAdmin && (
              <>
                <Button onClick={() => navigate('/admin/users')} size="sm" variant="outline"
                  className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80">
                  <UserCog className="w-4 h-4" /> {t('dash.nav.users')}
                </Button>
                <Button onClick={() => navigate('/admin/partners')} size="sm" variant="outline"
                  className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80">
                  <Building2 className="w-4 h-4" /> {t('dash.nav.partners')}
                </Button>
              </>
            )}
            {access.canManage && (
              <Button onClick={() => navigate('/admin/access-review')} size="sm" variant="outline"
                className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80">
                <ShieldCheck className="w-4 h-4" /> <span className="hidden sm:inline">{t('areview.nav')}</span>
              </Button>
            )}
            {access.canManage && (
              <Button onClick={() => navigate('/admin/report')} size="sm" variant="outline"
                className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80">
                <FileText className="w-4 h-4" /> <span className="hidden sm:inline">{t('prep.button')}</span>
              </Button>
            )}
            {!access.isViewer && (
              <Button onClick={() => navigate('/intake')} size="sm" variant="action"><Plus className="w-4 h-4" /> {t('dash.nav.newCase')}</Button>
            )}
            <LanguageToggle className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground" />
            <Button onClick={logout} size="sm" variant="outline" className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80"><LogOut className="w-4 h-4" /></Button>

          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-5 py-6">
        {(alertsQ.data?.length ?? 0) > 0 && (
          <div className="mb-4 border-2 border-destructive/50 bg-destructive/5 rounded-xl p-4">
            <p className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
              <BellRing className="w-4 h-4" /> {t('dash.alerts.title', { n: alertsQ.data?.length })}
            </p>
            <div className="space-y-1.5">
              {alertsQ.data?.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg px-3 py-2">
                  {a.kind === 'suicide_risk' && <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />}
                  <span className="font-mono">{a.case_code}</span>
                  <span className="text-muted-foreground">· {a.branch || t('dash.alerts.unspecified')} · {t('dash.alerts.level', { level: a.level })}</span>
                  <span className="text-muted-foreground ml-auto hidden sm:inline">{new Date(a.created_at).toLocaleString('th-TH')}</span>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => a.case_id && setSelectedId(a.case_id)}>{t('dash.alerts.openCase')}</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => ackAlert.mutate(a.id)}><Check className="w-3 h-3" /> {t('dash.alerts.ack')}</Button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{t('dash.alerts.footnote')}</p>
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">{t('dash.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="cases">{t('dash.tabs.cases')}</TabsTrigger>
            <TabsTrigger value="caseload">{t('dash.tabs.caseload')}</TabsTrigger>
            <TabsTrigger value="tracker">{t('dash.tabs.tracker')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-card border border-border rounded-xl p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center shadow-card">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">{t('dash.filter.area')}</span>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="h-9 max-w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((b) => <SelectItem key={b} value={b}>{b === 'all' ? t('dash.filter.allAreas') : b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground ml-1">{t('dash.filter.caseCount', { n: stats?.total ?? 0 })}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportCSV} variant="outline" size="sm" className="h-9"><Download className="w-3.5 h-3.5" /> {t('dash.export.csv')}</Button>
              </div>
            </div>

            {statsQ.isLoading ? (
              <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  <StatCard num={stats?.total ?? 0} label={t('dash.stat.total')} tone="purple" />
                  <StatCard num={stats?.open ?? 0} label={t('dash.stat.open')} tone="default" />
                  <StatCard num={stats?.suicide_risk ?? 0} label={t('dash.stat.suicideRisk')} tone="red" />
                  <StatCard num={stats?.unassigned ?? 0} label={t('dash.stat.unassigned')} tone="amber" />
                  <StatCard num={stats?.overdue_follow_up ?? 0} label={t('dash.stat.overdue')} tone="amber" />
                </div>
                {(() => {
                  const due = stats?.sla_total ?? 0;
                  const met = stats?.sla_met_count ?? 0;
                  const pct = due > 0 ? Math.round((met / due) * 100) : null;
                  const ok = pct !== null && pct >= 90;
                  return (
                    <div className="bg-card border border-border rounded-xl p-5 mb-6">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <p className="font-medium">{t('dash.kpi.title')}</p>
                        <span className="text-xs text-muted-foreground">{t('dash.kpi.target')}</span>
                      </div>
                      <p className={`text-4xl font-display tabular-nums mt-2 ${pct === null ? 'text-muted-foreground' : ok ? 'text-primary' : 'text-destructive'}`}>
                        {pct === null ? '—' : <>{pct}% <span className="text-base text-muted-foreground">{met} / {due}</span></>}
                      </p>
                      <div className="h-2 rounded-full bg-muted mt-3 overflow-hidden">
                        <div className={`h-full ${ok ? 'bg-primary' : 'bg-destructive'}`} style={{ width: `${pct ?? 0}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('dash.kpi.detail', { met, due, waiting: stats?.awaiting_response ?? 0 })}
                      </p>
                    </div>
                  );
                })()}
                <ChartBlock title={t('dash.chart.byStatus')} data={Object.entries(stats?.by_status ?? {}).map(([k, v]) => ({ label: t(`status.${k}`), value: v }))} noDataLabel={t('dash.chart.noData')} />
                <ChartBlock title={t('dash.chart.bySeverity')} data={Object.entries(stats?.by_severity ?? {}).map(([k, v]) => ({ label: k, value: v }))} noDataLabel={t('dash.chart.noData')} />
                {branch === 'all' && <ChartBlock title={t('dash.chart.byBranch')} data={Object.entries(stats?.by_branch ?? {}).map(([k, v]) => ({ label: k, value: v }))} noDataLabel={t('dash.chart.noData')} />}
                <ChartBlock title={t('dash.chart.byKp')} data={Object.entries(stats?.by_kp ?? {}).map(([k, v]) => ({ label: k, value: v }))} noDataLabel={t('dash.chart.noData')} />
              </>
            )}
          </TabsContent>

          <TabsContent value="cases">
            <div className="bg-card border border-border rounded-xl p-3 mb-4 grid sm:grid-cols-4 gap-2 shadow-card">
              <div className="relative sm:col-span-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('dash.filter.searchPlaceholder')} className="h-9 pl-8 text-sm" />
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t('dash.filter.status')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dash.filter.allStatuses')}</SelectItem>
                  {(['received', 'inprogress', 'completed', 'cancelled'] as CaseStatus[]).map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{branchOptions.map((b) => <SelectItem key={b} value={b}>{b === 'all' ? t('dash.filter.allAreas') : b}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dash.filter.allAssignees')}</SelectItem>
                  <SelectItem value="me">{t('dash.filter.myCases')}</SelectItem>
                  <SelectItem value="unassigned">{t('dash.filter.unassigned')}</SelectItem>
                  {(staffQ.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.display_name || s.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {casesQ.isLoading ? (
              <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
            ) : (casesQ.data?.rows.length ?? 0) === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-12">{t('dash.cases.noneFound')}</p>
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
                        {c.suicide_risk && <span className="text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">{t('dash.cases.suicideRiskBadge')}</span>}
                        {!c.first_response_at && <SlaBadge createdAt={c.created_at} />}
                        {c.pii_flag && <span title={t('pii.flag.title')} aria-label={t('pii.flag.title')} className="text-warning"><Flag className="w-3.5 h-3.5" /></span>}
                        {overdue && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{t('dash.cases.overdueBadge')}</span>}
                        <span className="ml-auto text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('th-TH')}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{c.victim?.name_masked || t('dash.cases.unnamed')} · {c.profile?.kp || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.ai_result?.summary || c.profile?.incidentPlace || '-'}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> {staffName(c.assigned_to) || t('dash.cases.unassigned')}
                        {c.follow_up_at && <> · <CalendarClock className="w-3 h-3" /> {t('dash.cases.followUp', { date: new Date(c.follow_up_at).toLocaleDateString('th-TH') })}</>}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                {t('dash.cases.pageInfo', { n: casesQ.data?.count ?? 0, page: page + 1, total: totalPages })}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="caseload">
            <div className="bg-card border border-border rounded-xl p-5 shadow-card">
              <p className="text-sm font-medium mb-3">{t('dash.caseload.title')}</p>
              <div className="space-y-2">
                {Object.entries(stats?.by_caseworker ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 text-sm border-b border-border/60 pb-2 last:border-none">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span className="flex-1 truncate">{k === 'unassigned' ? t('dash.filter.unassigned') : staffName(k)}</span>
                    <span className="tabular-nums font-medium">{v}</span>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]"
                      onClick={() => { setAssignee(k === 'unassigned' ? 'unassigned' : k); toast.info(t('dash.caseload.filteredToast')); }}>
                      {t('dash.caseload.viewCases')}
                    </Button>
                  </div>
                ))}
                {Object.keys(stats?.by_caseworker ?? {}).length === 0 && <p className="text-xs text-muted-foreground">{t('dash.caseload.noData')}</p>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard num={stats?.unassigned ?? 0} label={t('dash.stat.unassigned')} tone="amber" />
                <StatCard num={stats?.overdue_follow_up ?? 0} label={t('dash.stat.overdue')} tone="red" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracker">
            <div className="bg-card border border-border rounded-xl p-5 mb-3">
              <p className="font-medium mb-1">{t('dash.tracker.title')}</p>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{t('dash.tracker.body')}</p>
              <Button variant="action" onClick={() => navigate('/track')}>{t('dash.tracker.open')}</Button>
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
    <div className="bg-card border border-border rounded-[20px] p-4 text-center shadow-card hover-lift animate-bloom">
      <p className={`font-display text-3xl font-medium ${cls} tabular-nums`}>{num}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ChartBlock({ title, data, noDataLabel }: { title: string; data: { label: string; value: number }[]; noDataLabel: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const visible = data.filter((d) => d.value > 0);
  return (
    <div className="bg-card border border-border rounded-[20px] p-5 mb-4 shadow-card animate-bloom">
      <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wide">{title}</p>
      {visible.length === 0 ? <p className="text-xs text-muted-foreground">{noDataLabel}</p> : (
        <div className="space-y-2">
          {visible.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-xs w-32 truncate">{d.label}</span>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${(d.value / max) * 100}%` }} />
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
  const { t } = useI18n();
  const access = useAccess();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [audioSigned, setAudioSigned] = useState<Record<number, string>>({});
  const [photoSigned, setPhotoSigned] = useState<string[]>([]);
  const [allAudio, setAllAudio] = useState<{ url: string; label: string }[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  // PDPA: ข้อมูลระบุตัวตนอยู่คนละตาราง ต้องกดเปิดดูและระบบจะบันทึกประวัติการเข้าดูทุกครั้ง
  const [pii, setPii] = useState<{ reporter: any; victim: any } | null>(null);
  const [piiLoading, setPiiLoading] = useState(false);
  // คำถามถึงผู้รายงาน (ตอบกลับผ่านหน้า /track ด้วยรหัสเคส) + หน่วยงานรับส่งต่อรายพื้นที่
  const [newQuestion, setNewQuestion] = useState('');
  const [answerAudio, setAnswerAudio] = useState<Record<string, string>>({});
  const [showMap, setShowMap] = useState(false);
  const [documentKind, setDocumentKind] = useState<DocKind | null>(null);
  const [documentInput, setDocumentInput] = useState<ReturnType<typeof docInputFromReport> | null>(null);


  const revealPii = async () => {
    setPiiLoading(true);
    const { data, error } = await supabase.rpc('get_case_pii' as any, { _case_id: caseId });
    setPiiLoading(false);
    if (error) { toast.error(t('dash.detail.piiNoAccess')); return; }
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

  const { data: questions = [] } = useQuery({
    queryKey: ['case-questions', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('case_questions' as never)
        .select('id,question,answer_text,answer_audio_url,answered_at,created_at')
        .eq('case_id', caseId)
        .order('created_at');
      return (data ?? []) as unknown as { id: string; question: string; answer_text: string | null; answer_audio_url: string | null; answered_at: string | null; created_at: string }[];
    },
  });

  const [saving, setSaving] = useState(false);
  const { data: timeline = [] } = useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('case_timeline').select('status,note,created_at').eq('case_id', caseId).order('created_at', { ascending: false });
      return (data ?? []) as { status: string; note: string | null; created_at: string }[];
    },
  });


  const { data: partners = [] } = useQuery({
    queryKey: ['case-partners', c?.profile?.province ?? null],
    enabled: !!c,
    queryFn: async () => {
      const prov = c?.profile?.province || c?.profile?.branch;
      let q = supabase.from('referral_partners' as never)
        .select('id,name,org_type,province,district,phone,email,address,services')
        .eq('active', true);
      if (prov) q = q.or(`province.eq.${prov},province.is.null`);
      const { data } = await q.order('name');
      return (data ?? []) as unknown as { id: string; name: string; org_type: string; province: string | null; district: string | null; phone: string | null; email: string | null; address: string | null; services: string[] }[];
    },
  });

  const askQuestion = async () => {
    const q = newQuestion.trim();
    if (!q) return;
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from('case_questions' as never)
      .insert({ case_id: caseId, question: q.slice(0, 1000), asked_by: sess.user?.id } as never);
    if (error) { toast.error(t('dash.detail.sendQuestionFailed')); return; }
    setNewQuestion('');
    toast.success(t('dash.detail.sendQuestionSuccess'));
    qc.invalidateQueries({ queryKey: ['case-questions', caseId] });
  };

  const playAnswerAudio = async (qid: string, path: string) => {
    if (answerAudio[qid]) return;
    const { data } = await supabase.storage.from('case-audio').createSignedUrl(path, 300);
    if (data?.signedUrl) setAnswerAudio((prev) => ({ ...prev, [qid]: data.signedUrl }));
  };

  useEffect(() => {
    if (!c) return;
    let cancelled = false;
    (async () => {
      // Phase 0.6 — audit every access to sensitive media, and keep links short-lived (5 นาที)
      void supabase.rpc('log_case_access' as any, { _case_id: c.id, _action: 'view_media' });
      const out: Record<number, string> = {};
      const list: { url: string; label: string }[] = [];
      const norm = (x: any) => (typeof x === 'string' ? { path: x } : x) as { path: string; qIndex?: number; question?: string };
      const signAll = async (bucket: string, items: any[]) => {
        const paths = (items || []).map(norm).filter((x) => x?.path);
        if (!paths.length) return [] as (string | null)[];
        const { data } = await supabase.storage.from(bucket).createSignedUrls(paths.map((x) => x.path), 600);
        return paths.map((_, i) => data?.[i]?.signedUrl ?? null);
      };
      const audioItems = (c.audio_urls || []).map(norm);
      const aUrls = await signAll('case-audio', c.audio_urls || []);
      audioItems.forEach((a: any, i: number) => {
        const url = aUrls[i]; if (!url) return;
        if (typeof a.qIndex === 'number') out[a.qIndex] = url;
        list.push({ url, label: a.question || t('dash.media.clip', { n: i + 1 }) });
      });
      const urls = (await signAll('case-photos', c.photo_urls || [])).filter(Boolean) as string[];
      if (!cancelled) { setAudioSigned(out); setPhotoSigned(urls); setAllAudio(list); }
    })();
    return () => { cancelled = true; };
  }, [c?.id]);

  const patchCase = async (patch: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from('cases').update(patch as never).eq('id', caseId);
    if (error) { toast.error(t('dash.detail.saveFailed')); return; }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['case', caseId] });
    onChanged();
  };

  const updateStatus = async (status: CaseStatus) => {
    const msg = note.trim().slice(0, 1000);
    if (status === c?.status && !msg) return;
    setSaving(true);
    try {
      if (status !== c?.status) {
        const { error } = await supabase.from('cases').update({ status } as never).eq('id', caseId);
        if (error) { toast.error(t('dash.detail.statusUpdateFailed')); return; }
      }
      const { error: tErr } = await supabase.from('case_timeline').insert({ case_id: caseId, status, note: msg || null } as never);
      if (tErr) { toast.error(t('dash.detail.saveFailed')); return; }
      setNote('');
      toast.success(status !== c?.status ? t('dash.detail.statusUpdateSuccess') : t('dash.detail.replySent'));
      qc.invalidateQueries({ queryKey: ['case', caseId] });
      qc.invalidateQueries({ queryKey: ['case-timeline', caseId] });
      onChanged();
    } finally { setSaving(false); }
  };


  if (isLoading || !c) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const s = c.screening || {};

  const DOC_ICONS: Record<DocKind, React.ReactNode> = {
    complaint: <Scale className="w-4 h-4" />,
    statement: <FileText className="w-4 h-4" />,
    referral: <Share2 className="w-4 h-4" />,
    assistance: <HeartHandshake className="w-4 h-4" />,
  };

  // ดึง PII ผ่าน RPC (masked-by-default) ก่อนออกเอกสารทุกประเภท
  const withPii = async (fn: (full: CaseReportData) => void) => {
    const p = pii ?? (await (async () => {
      const { data } = await supabase.rpc('get_case_pii' as any, { _case_id: caseId });
      if (data) setPii(data as any);
      return data as any;
    })());
    fn({ ...c, reporter: p?.reporter ?? null, victim: p?.victim ?? null, assignee_name: staffName(c.assigned_to) } as CaseReportData);
  };

  const reviewDocument = async (kind: DocKind) => {
    await withPii((full) => {
      setDocumentInput(docInputFromReport(full));
      setDocumentKind(kind);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary-deep text-primary-foreground sticky top-0 z-30 shadow-elegant">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80 flex items-center justify-center transition"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <p className="font-mono text-sm">{c.case_code}</p>
            <p className="text-[11px] text-sidebar-foreground/60">{new Date(c.created_at).toLocaleString('th-TH')}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80">
                  <FileText className="w-4 h-4" /> {t('dash.detail.docsMenu')} <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => void withPii((full) => printCaseReport(full))}>
                  <Printer className="w-4 h-4" /> {t('dash.detail.fullReportPdf')}
                </DropdownMenuItem>
                {DOC_KINDS.map((dk) => (
                  <DropdownMenuItem key={dk.key} onClick={() => void reviewDocument(dk.key)}>
                    {DOC_ICONS[dk.key]} {dk.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <StatusBadge value={c.status} /> {c.severity && <SeverityBadge value={c.severity} />}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 space-y-4">
        {documentKind && documentInput && (
          <DocumentDraftDialog
            open
            onOpenChange={(open) => { if (!open) { setDocumentKind(null); setDocumentInput(null); } }}
            caseId={caseId}
            kind={documentKind}
            input={documentInput}
            existing={(c.document_drafts?.[documentKind] ?? null) as any}
            onSaved={() => qc.invalidateQueries({ queryKey: ['case', caseId] })}
          />
        )}
        {c.suicide_risk && (
          <section className="border-2 border-destructive rounded-xl p-4 bg-destructive/5">
            <p className="text-sm font-semibold text-destructive flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> {t('dash.detail.suicideBanner')}
            </p>
          </section>
        )}

        {/* Case assignment & follow-up */}
        <section className="bg-card border border-border rounded-xl p-5 shadow-card grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{t('dash.detail.assignee')}</p>
            <Select value={c.assigned_to ?? 'none'} onValueChange={(v) => patchCase({ assigned_to: v === 'none' ? null : v }, t('dash.detail.assignedToast'))}>
              <SelectTrigger className="h-9"><SelectValue placeholder={t('dash.detail.selectStaff')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('dash.filter.unassigned')}</SelectItem>
                {staff.map((st) => <SelectItem key={st.id} value={st.id}>{st.display_name || st.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{t('dash.detail.followUpDate')}</p>
            <Input
              type="date"
              value={c.follow_up_at ? new Date(c.follow_up_at).toISOString().slice(0, 10) : ''}
              onChange={(e) => patchCase({ follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null }, t('dash.detail.followUpSetToast'))}
              className="h-9"
            />
          </div>
        </section>

        {c.ai_result && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <p className="text-xs font-medium text-primary mb-2">{t('dash.detail.aiOpinion')}</p>
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
                  patchCase({ ai_reviewed: true, ai_reviewed_at: new Date().toISOString(), ai_reviewed_by: sess.user?.id }, t('dash.detail.aiReviewedToast'));
                }}>
                <Check className="w-3 h-3" /> {c.ai_reviewed ? t('dash.detail.aiReviewedLabel', { date: c.ai_reviewed_at ? ` · ${new Date(c.ai_reviewed_at).toLocaleDateString('th-TH')}` : '' }) : t('dash.detail.markReviewed')}
              </Button>
            </div>
          </section>
        )}

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3">{t('dash.detail.standardScreening')}</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">2Q: </span>{s.q2Positive === undefined ? '-' : s.q2Positive ? t('dash.detail.q2Abnormal') : t('dash.detail.q2Normal')}</div>
            <div><span className="text-muted-foreground text-xs">9Q: </span>{typeof s.q9Total === 'number' ? `${s.q9Total} — ${q9Level(s.q9Total).label}` : '-'}</div>
            <div><span className="text-muted-foreground text-xs">{t('dash.detail.q9SelfHarmLabel')}</span>{c.suicide_risk ? t('dash.detail.riskFound') : t('dash.detail.riskNotFound')}</div>
            <div><span className="text-muted-foreground text-xs">NRM: </span>{s.nrmPositive === undefined ? '-' : s.nrmPositive ? t('dash.detail.nrmTrafficking') : t('dash.detail.nrmNotYet')}{s.nrmUnder18 ? t('dash.detail.nrmMinor') : ''}</div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-4 text-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-medium text-muted-foreground">{t('dash.detail.relatedInfo')}</p>
            {!pii && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={piiLoading} onClick={revealPii}>
                {piiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />} {t('dash.detail.revealPii')}
              </Button>
            )}
          </div>
          {!pii && (
            <p className="text-xs text-muted-foreground">
              {t('dash.detail.piiHint')}
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('dash.detail.reporter')}</p>
              <p>{pii ? (pii.reporter?.name || '-') : '••••••'}</p>
              <p className="text-xs text-muted-foreground">{pii ? [pii.reporter?.phone, pii.reporter?.email].filter(Boolean).join(' · ') : '••••••'}</p>
              {pii?.reporter?.address && <p className="text-xs text-muted-foreground">{pii.reporter.address}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('dash.detail.client')}</p>
              <p>{pii ? (pii.victim?.name || '-') : (c.victim?.name_masked || '••••••')}</p>
              <p className="text-xs text-muted-foreground">{c.profile?.kp} · {c.profile?.gender} · {c.profile?.age}</p>
              {pii?.victim?.contact && <p className="text-xs text-muted-foreground">{pii.victim.contact}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('dash.detail.area')}</p>
              <p>{[c.profile?.subdistrict && `ต.${c.profile.subdistrict}`, c.profile?.district && `อ.${c.profile.district}`, c.profile?.province || c.profile?.branch].filter(Boolean).join(' ')}</p>
              {c.profile?.geo && (
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => setShowMap((current) => !current)}>
                  {showMap ? t('dash.detail.hideMap') : t('dash.detail.viewOnMap')}
                </Button>
              )}
            </div>
            <div><p className="text-xs text-muted-foreground mb-1">{t('dash.detail.incidentPlace')}</p><p>{c.profile?.incidentPlace || '-'}</p></div>
          </div>
          {showMap && c.profile?.geo && (
            <div className="mt-4" aria-label={t('dash.detail.mapLabel')}>
              <MapPicker value={c.profile.geo} center={[c.profile.geo.lat, c.profile.geo.lng]} onChange={() => undefined} readOnly />
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3">{t('dash.detail.interviewLog')}</p>
          <div className="space-y-3">
            {(c.answers || []).map((a: any, i: number) => (
              <div key={i} className="border-b border-border/60 pb-3 last:border-none last:pb-0">
                <p className="text-[10px] uppercase tracking-wider text-primary mb-1">{a.cat}</p>
                <p className="text-xs text-muted-foreground mb-1">{a.question}</p>
                <p className="text-sm bg-muted/40 border border-border rounded-md p-2">{a.transcript || t('dash.detail.noAnswer')}</p>
                {audioSigned[i] && <audio src={audioSigned[i]} controls className="w-full mt-2 h-9" />}
                {c.staff_observations?.[i] && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5">{t('dash.detail.staffNote', { note: c.staff_observations[i] })}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('dash.detail.referrals')}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(c.referrals || []).map((r: unknown, i: number) => {
              const label = referralLabel(r);
              return label ? <span key={i} className="text-[11px] bg-primary-soft text-primary px-2 py-1 rounded-full">{label}</span> : null;
            })}
            {(!c.referrals || c.referrals.length === 0) && <span className="text-xs text-muted-foreground">{t('dash.detail.none')}</span>}
          </div>
          {c.referral_note && <p className="text-xs text-muted-foreground">{c.referral_note}</p>}
        </section>

        <CaseReferrals
          caseId={caseId}
          province={c.profile?.province ?? null}
          violationTypes={Array.isArray(c.violation_types) ? c.violation_types : []}
          canEdit={access.canEdit}
        />

        {partners.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> {t('dash.detail.localPartners', { province: c.profile?.province ? ` (${c.profile.province})` : '' })}
            </p>
            <div className="space-y-2.5">
              {partners.map((p) => (
                <div key={p.id} className="border border-border/60 rounded-lg p-3 text-sm">
                  <p className="font-medium text-[13px]">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {[p.district, p.province].filter(Boolean).join(' · ') || t('dash.detail.allAreas')}
                    {p.phone ? t('dash.detail.phone', { phone: p.phone }) : ''}{p.email ? ` · ${p.email}` : ''}
                  </p>
                  {Array.isArray(p.services) && p.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.services.map((sv, i) => <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{sv}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageCircleQuestion className="w-3.5 h-3.5" /> {t('dash.detail.askQuestionsTitle')}
          </p>
          {questions.map((q) => (
            <div key={q.id} className="border border-border/60 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{q.question}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleString('th-TH')}</p>
              {q.answer_text || q.answer_audio_url ? (
                <div className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-primary">{t('dash.detail.answerFromReporter')}</p>
                  {q.answer_text && <p className="text-sm">{q.answer_text}</p>}
                  {q.answer_audio_url && (
                    answerAudio[q.id]
                      ? <audio src={answerAudio[q.id]} controls className="w-full h-9" />
                      : <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void playAnswerAudio(q.id, q.answer_audio_url!)}>
                          <Volume2 className="w-3 h-3 mr-1" /> {t('dash.detail.listenAnswer')}
                        </Button>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t('dash.detail.waitingAnswer', { code: c.case_code })}</p>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder={t('dash.detail.questionPlaceholder')}
              className="min-h-[44px] text-sm"
              maxLength={1000}
            />
            <Button size="sm" className="self-end" disabled={!newQuestion.trim()} onClick={() => void askQuestion()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </section>

        {(allAudio.length > 0 || photoSigned.length > 0) && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-4" aria-label={t('dash.media.title')}>
            <p className="text-sm font-medium">{t('dash.media.title')}</p>
            {allAudio.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('dash.media.audio', { n: allAudio.length })}</p>
                {allAudio.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border p-2.5">
                    <p className="text-[11px] text-muted-foreground mb-1 line-clamp-1">{a.label}</p>
                    <audio src={a.url} controls preload="none" className="w-full h-9" />
                  </div>
                ))}
              </div>
            )}
            {photoSigned.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('dash.detail.photos', { n: photoSigned.length })}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photoSigned.map((url, i) => (
                    <button key={i} type="button" onClick={() => setLightbox(i)} className="block aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition">
                      <img src={url} loading="lazy" alt={t('dash.detail.photoAlt', { n: i + 1 })} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">{t('dash.media.note')}</p>
          </section>
        )}

        {lightbox !== null && photoSigned[lightbox] && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <img src={photoSigned[lightbox]} alt={t('dash.detail.photoAlt', { n: lightbox + 1 })} className="max-h-[85vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
            <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" disabled={lightbox === 0} onClick={() => setLightbox(lightbox - 1)}>‹</Button>
              <Button variant="secondary" onClick={() => setLightbox(null)}>{t('dash.media.close')}</Button>
              <Button variant="secondary" disabled={lightbox >= photoSigned.length - 1} onClick={() => setLightbox(lightbox + 1)}>›</Button>
            </div>
          </div>
        )}

        <section className="bg-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-3">{t('dash.detail.updateStatus')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {(['received', 'inprogress', 'completed', 'cancelled'] as CaseStatus[]).map((st) => (
              <button key={st} disabled={saving} onClick={() => void updateStatus(st)}
                className={`text-xs py-2 rounded-lg border transition disabled:opacity-60 ${c.status === st ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary'}`}>
                {t(`status.${st}`)}
              </button>
            ))}
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('dash.detail.replyPlaceholder')} className="min-h-[70px]" maxLength={1000} />
          <p className="text-[11px] text-muted-foreground mt-1">{t('dash.detail.replyHint')}</p>
          <div className="flex justify-end mt-2">
            <Button size="sm" disabled={!note.trim() || saving} onClick={() => void updateStatus(c.status as CaseStatus)}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {t('dash.detail.sendReply')}
            </Button>
          </div>
          {timeline.length > 0 && (
            <ol className="mt-4 space-y-2 border-t border-border pt-3">
              {timeline.map((it, i) => (
                <li key={i} className="text-xs flex gap-2">
                  <StatusBadge value={it.status as CaseStatus} />
                  <div className="min-w-0">
                    <p className="text-muted-foreground font-mono text-[10px]">{new Date(it.created_at).toLocaleString('th-TH')}</p>
                    {it.note && <p className="break-words">{it.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>


        {c.signature_staff && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('dash.detail.staffSignature', { name: c.signature_staff_name })}</p>
            <img src={c.signature_staff} alt="signature" className="bg-white border border-border rounded-md max-h-24" />
          </section>
        )}
      </main>
    </div>
  );
}
