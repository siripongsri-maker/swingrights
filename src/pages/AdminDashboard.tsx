import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/screening/StatusBadge';
import { SeverityBadge } from '@/components/screening/SeverityBadge';
import { CaseStatus, STATUS_LABEL, SEV_LABEL, BRANCHES, VIOLATION_TYPES, type Severity } from '@/lib/screening';
import { logExport } from '@/lib/caseReport';
import { useCaseAlerts, type CaseAlert } from '@/hooks/useCaseAlerts';
import { useAccess } from '@/hooks/useAccess';

import {
  Loader2, Plus, Download, MapPin, Search, ChevronLeft, ChevronRight, UserCheck, CalendarClock,
  BellRing, ShieldAlert, Check, AlertTriangle, Clock, HelpCircle, Flag,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { StaffShell, StaffLoadError } from '@/components/admin/StaffShell';
import { CaseDetail } from '@/components/admin/CaseDetail';

const PAGE_SIZE = 20;

const LIST_COLS =
  'id, case_code, status, severity, created_at, follow_up_at, assigned_to, suicide_risk, ai_reviewed, victim, profile, ai_result, first_response_at, pii_flag';
const DETAIL_COLS = '*';
const sel = (s: string): string => s;

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

interface Staff { id: string; display_name: string | null; email: string | null }

interface Stats {
  total: number; open: number; suicide_risk: number; unassigned: number; overdue_follow_up: number;
  sla_total?: number; sla_met_count?: number; awaiting_response?: number;
  by_severity: Record<string, number>; by_status: Record<string, number>;
  by_branch: Record<string, number>; by_kp: Record<string, number>; by_caseworker: Record<string, number>;
}

type StaffView = 'queue' | 'cases' | 'caseload' | 'overview';

const QUEUE_COLS =
  'id, case_code, status, severity, created_at, follow_up_at, assigned_to, suicide_risk, profile, ai_result, first_response_at, pii_flag, violation_types';

interface QueueRow {
  id: string; case_code: string; status: CaseStatus; severity: 'green' | 'yellow' | 'red' | null;
  created_at: string; follow_up_at: string | null; assigned_to: string | null; suicide_risk: boolean;
  profile: any; ai_result: any; first_response_at: string | null; pii_flag?: boolean; violation_types: string[] | null;
}

interface OverviewKpi { overdue_24h: number; awaiting_response: number; unassigned_open: number; sla_total: number; sla_met: number; open: number }

type QueueChip = 'open' | 'mine' | 'unassigned' | 'high' | 'overdue';

const hoursLeft = (createdAt: string) => 24 - (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
const isFollowOverdue = (c: { follow_up_at: string | null; status: CaseStatus }) =>
  !!c.follow_up_at && new Date(c.follow_up_at) < new Date() && c.status !== 'completed';
const isHigh = (c: QueueRow) => c.severity === 'red' || c.suicide_risk;
const isNrm = (c: QueueRow) => !!(c.ai_result?.trafficking_suspected || c.profile?.trafficking_suspected
  || (Array.isArray(c.profile?.special_tests) && c.profile.special_tests.includes('nrm')));
// Staff intake stores the Thai label, self-report stores the id: show both as the same id (display only).
const toTypeId = (x: string) => VIOLATION_TYPES.find((v) => v.label === x)?.id ?? x;
const typesOf = (c: QueueRow): string[] => Array.from(new Set([
  ...(Array.isArray(c.violation_types) ? c.violation_types : []),
  ...(Array.isArray(c.profile?.initialViolationTypes) ? c.profile.initialViolationTypes : []),
].map(toTypeId)));

/** Urgency: unanswered first (most overdue / least time left), then answered by follow-up date. */
function urgencySort(a: QueueRow, b: QueueRow) {
  const au = !a.first_response_at, bu = !b.first_response_at;
  if (au !== bu) return au ? -1 : 1;
  if (au && bu) return hoursLeft(a.created_at) - hoursLeft(b.created_at);
  const af = a.follow_up_at ? new Date(a.follow_up_at).getTime() : Infinity;
  const bf = b.follow_up_at ? new Date(b.follow_up_at).getTime() : Infinity;
  return af - bf;
}

function SlaPill({ c }: { c: { created_at: string; first_response_at: string | null } }) {
  const { t } = useI18n();
  const base = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums';
  if (c.first_response_at) return <span className={cn(base, 'bg-muted text-muted-foreground')}><Check className="h-3.5 w-3.5" aria-hidden />{t('staff.sla.done')}</span>;
  const left = hoursLeft(c.created_at);
  if (left <= 0) return <span className={cn(base, 'bg-destructive text-destructive-foreground')}><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{t('staff.sla.over', { h: Math.max(1, Math.ceil(-left)) })}</span>;
  const h = Math.ceil(left);
  return left < 6
    ? <span className={cn(base, 'bg-sevYellow-bg text-sevYellow-fg')}><Clock className="h-3.5 w-3.5" aria-hidden />{t('staff.sla.left', { h })}</span>
    : <span className={cn(base, 'bg-sevGreen-bg text-sevGreen-fg')}><Clock className="h-3.5 w-3.5" aria-hidden />{t('staff.sla.left', { h })}</span>;
}

/** Violation type id (or a legacy free-text label) as words in the current language. */
function useTypeLabel() {
  const { t } = useI18n();
  return (id: string) => { const v = t(`report.type.${id}`); return v === `report.type.${id}` ? id : v; };
}

function SevCell({ v }: { v: QueueRow['severity'] }) {
  const { t } = useI18n();
  if (!v) return <span className="text-sm text-muted-foreground">{t('staff.sev.none')}</span>;
  return <SeverityBadge value={v} />;
}

function Flags({ c }: { c: QueueRow }) {
  const { t } = useI18n();
  const items: { key: string; label: string; tone: string }[] = [];
  if (c.suicide_risk) items.push({ key: 's', label: t('staff.flag.suicide'), tone: 'text-destructive' });
  if (isNrm(c)) items.push({ key: 'n', label: t('staff.flag.nrm'), tone: 'text-sevYellow-fg' });
  if (isFollowOverdue(c)) items.push({ key: 'f', label: t('staff.flag.followup'), tone: 'text-sevYellow-fg' });
  if (c.pii_flag) items.push({ key: 'p', label: t('staff.flag.pii'), tone: 'text-sevYellow-fg' });
  if (!items.length) return <span className="text-sm text-muted-foreground">-</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map((f) => (
        <li key={f.key} className={cn('inline-flex items-center gap-1 text-sm font-medium', f.tone)}>
          <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden />{f.label}
        </li>
      ))}
    </ul>
  );
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const typeLabel = useTypeLabel();
  const { id: routeCaseId } = useParams();
  const qc = useQueryClient();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const view: StaffView = pathname.startsWith('/admin/cases') ? 'cases'
    : pathname.startsWith('/admin/caseload') ? 'caseload'
    : pathname.startsWith('/admin/overview') ? 'overview' : 'queue';
  // `from` lets the case page label its back link with the list it came from
  const caseState = { from: pathname };
  const openCase = (id: string) => navigate(`/admin/case/${id}`, { state: caseState });

  // filters (server-side)
  const [status, setStatus] = useState<'all' | CaseStatus>('all');
  const [branch, setBranch] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  // queue filters (client-side over open cases)
  const [chip, setChip] = useState<QueueChip>('open');
  const [qSearch, setQSearch] = useState('');
  const [alertOnly, setAlertOnly] = useState(false);

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
    qc.invalidateQueries({ queryKey: ['queue'] });
  }, (id) => openCase(id));

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
    enabled: authorized && view === 'cases',
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

  const queueQ = useQuery({
    queryKey: ['queue', branch],
    enabled: authorized && view === 'queue',
    queryFn: async () => {
      let q = supabase.from('cases').select(sel(QUEUE_COLS)).in('status', ['received', 'inprogress']);
      if (branch !== 'all') q = q.eq('profile->>branch', branch);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(300).returns<QueueRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const kpiQ = useQuery({
    queryKey: ['overview', branch === 'all' ? null : branch, 30],
    enabled: authorized && view === 'queue',
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_overview' as never, { _branch: branch === 'all' ? null : branch, _days: 30 } as never);
      if (error) throw error;
      return data as unknown as OverviewKpi;
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
        // Only the kinds the banner shows. new_case rows are never acknowledged, so without this
        // filter they push unacknowledged high-risk and self-harm alerts out of the newest 20.
        .in('kind', ['high_risk', 'suicide_risk'])
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

  const claim = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase.from('cases').update({ assigned_to: uid } as never).eq('id', caseId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t('staff.claimed')); invalidateCase(); },
    onError: () => toast.error(t('dash.detail.saveFailed')),
  });

  const invalidateCase = () => {
    qc.invalidateQueries({ queryKey: ['cases'] });
    qc.invalidateQueries({ queryKey: ['queue'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
    qc.invalidateQueries({ queryKey: ['case'] });
  };

  const branchOptions = useMemo(() => {
    const fromData = Object.keys(statsQ.data?.by_branch ?? {}).filter((b) => b && b !== 'ไม่ระบุ');
    return ['all', ...Array.from(new Set([...fromData, ...BRANCHES])).sort((a, b) => a.localeCompare(b, 'th'))];
  }, [statsQ.data]);
  const stats = statsQ.data;
  const totalPages = Math.max(1, Math.ceil((casesQ.data?.count ?? 0) / PAGE_SIZE));

  // SLA-warning and unassigned reminders keep their own toasts; the banner is high risk and self-harm only
  const highAlerts = (alertsQ.data ?? []).filter((a) => a.kind === 'high_risk' || a.kind === 'suicide_risk');
  const alertIds = new Set(highAlerts.map((a) => a.case_id).filter(Boolean) as string[]);

  const chipTest: Record<QueueChip, (c: QueueRow) => boolean> = {
    open: () => true,
    mine: (c) => !!uid && c.assigned_to === uid,
    unassigned: (c) => !c.assigned_to,
    high: isHigh,
    overdue: isFollowOverdue,
  };
  const queueAll = queueQ.data ?? [];
  const queueRows = queueAll
    .filter(chipTest[chip])
    .filter((c) => !qSearch.trim() || c.case_code.toUpperCase().includes(qSearch.trim().toUpperCase()))
    .filter((c) => !alertOnly || alertIds.has(c.id))
    .sort(urgencySort);

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
        c.case_code, new Date(c.created_at).toLocaleString('th-TH'), STATUS_LABEL[c.status as CaseStatus],
        c.severity ? (SEV_LABEL[c.severity as Severity] ?? c.severity) : '',
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

  if (checking) return <div className="min-h-screen flex items-center justify-center" role="status"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>;
  if (!authorized) return null;

  if (routeCaseId) {
    return (
      <StaffShell bare>
        <CaseDetail
          caseId={routeCaseId}
          staff={staffQ.data ?? []}
          staffName={staffName}
          // history.length also counts other sites' entries; location.key is 'default' on a fresh tab
          onBack={() => (location.key !== 'default' ? navigate(-1) : navigate('/admin'))}
          onChanged={invalidateCase}
        />
      </StaffShell>
    );
  }

  const titles: Record<StaffView, [string, string]> = {
    queue: [t('staff.nav.queue'), t('staff.ctx.queue')],
    cases: [t('staff.nav.cases'), t('staff.ctx.cases')],
    caseload: [t('staff.nav.caseload'), t('staff.ctx.caseload')],
    overview: [t('staff.nav.overview'), t('staff.ctx.overview')],
  };

  const actions = (
    <>
      {view === 'queue' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label={t('staff.help')}><HelpCircle className="w-4 h-4" /> <span className="hidden sm:inline">{t('staff.help')}</span></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="min-h-11" onClick={() => navigate('/track')}>{t('staff.openTracker')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {view === 'overview' && (
        <Button onClick={exportCSV} variant="outline" size="sm"><Download className="w-4 h-4" /> {t('dash.export.csv')}</Button>
      )}
      {!access.isViewer && (
        <Button onClick={() => navigate('/intake')} size="sm" variant="default"><Plus className="w-4 h-4" /> {t('staff.newCase')}</Button>
      )}
    </>
  );

  const branchSelect = (
    <Select value={branch} onValueChange={setBranch}>
      <SelectTrigger className="h-11 w-full sm:w-[220px]" aria-label={t('dash.filter.area')}><SelectValue /></SelectTrigger>
      <SelectContent>{branchOptions.map((b) => <SelectItem key={b} value={b}>{b === 'all' ? t('dash.filter.allAreas') : b}</SelectItem>)}</SelectContent>
    </Select>
  );

  const k = kpiQ.data;
  const slaPct = k && k.sla_total > 0 ? Math.round((k.sla_met / k.sla_total) * 100) : null;

  return (
    <StaffShell title={titles[view][0]} context={titles[view][1]} actions={actions}>
      {view === 'queue' && (
        <div className="space-y-5">
          {highAlerts.length > 0 && (
            <div role="alert" className="rounded-2xl border border-destructive/40 bg-sevRed-bg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 flex items-center gap-2 font-semibold text-sevRed-fg">
                <BellRing className="h-5 w-5 shrink-0" aria-hidden /> {t('staff.alert.banner', { n: highAlerts.length })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 bg-card" aria-pressed={alertOnly} onClick={() => setAlertOnly((v) => !v)}>
                  {alertOnly ? t('staff.alert.showAll') : t('staff.alert.filter')}
                </Button>
                <Button variant="destructive" className="h-11" disabled={ackAlert.isPending}
                  onClick={() => { highAlerts.forEach((a) => ackAlert.mutate(a.id)); setAlertOnly(false); }}>
                  <Check className="h-4 w-4" /> {t('staff.alert.ack')}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label={t('staff.kpi.overdue')} n={k?.overdue_24h} tone={k?.overdue_24h ? 'danger' : undefined} />
            <Kpi label={t('staff.kpi.awaiting')} n={k?.awaiting_response} />
            <Kpi label={t('staff.kpi.unassigned')} n={k?.unassigned_open} tone={k?.unassigned_open ? 'watch' : undefined} />
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">{t('staff.kpi.sla')}</p>
              <p className={cn('font-mono text-[32px] leading-tight font-semibold tabular-nums', slaPct !== null && slaPct < 90 ? 'text-destructive' : 'text-foreground')}>
                {slaPct === null ? '-' : `${slaPct}%`}
              </p>
              <div className="relative mt-2 h-2 rounded-full bg-muted" role="img" aria-label={`${slaPct ?? '-'}% · ${t('staff.kpi.target')}`}>
                <div className={cn('h-full rounded-full', slaPct !== null && slaPct >= 90 ? 'bg-success' : 'bg-destructive')} style={{ width: `${slaPct ?? 0}%` }} />
                <div className="absolute -top-1 -bottom-1 w-0.5 bg-foreground" style={{ insetInlineStart: '90%' }} aria-hidden />
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-end">{t('staff.kpi.target')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label={t('dash.filter.status')}>
              {(['open', 'mine', 'unassigned', 'high', 'overdue'] as QueueChip[]).map((key) => {
                const n = queueAll.filter(chipTest[key]).length;
                const on = chip === key;
                return (
                  <button key={key} type="button" aria-pressed={on} onClick={() => setChip(key)}
                    className={cn('inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium leading-normal transition-colors duration-150',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-primary-soft')}>
                    {t(`staff.chip.${key}`)}
                    <span className={cn('rounded-full px-2 font-mono text-xs tabular-nums', on ? 'bg-primary-foreground/20' : 'bg-muted')}>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input value={qSearch} onChange={(e) => setQSearch(e.target.value)} placeholder={t('staff.searchCode')} aria-label={t('staff.searchCode')} className="h-11 ps-9 font-mono uppercase" />
              </div>
              {branchSelect}
            </div>
          </div>

          {queueQ.isLoading ? (
            <div className="py-12 text-center" role="status"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>
          ) : queueQ.isError ? (
            <StaffLoadError onRetry={() => void queueQ.refetch()} />
          ) : queueRows.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-12">{t('staff.queueEmpty')}</p>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
                <table className="w-full text-[15px]">
                  <thead className="bg-muted/50 text-start text-xs text-muted-foreground">
                    <tr>
                      {['sla', 'code', 'severity', 'types', 'flags', 'area', 'owner'].map((h) => (
                        <th key={h} scope="col" className="px-3 py-3 text-start font-semibold whitespace-nowrap">{t(`staff.col.${h}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queueRows.map((c) => (
                      <tr key={c.id} className="border-t border-border h-16 align-middle hover:bg-primary-soft/40">
                        <td className="px-3"><SlaPill c={c} /></td>
                        <td className="px-3"><Link to={`/admin/case/${c.id}`} state={caseState} className="inline-flex min-h-11 items-center whitespace-nowrap font-mono font-semibold text-accent underline-offset-4 hover:underline">{c.case_code}</Link></td>
                        <td className="px-3 whitespace-nowrap"><SevCell v={c.severity} /></td>
                        <td className="px-3 text-sm">{typesOf(c).map(typeLabel).join(', ') || '-'}</td>
                        <td className="px-3"><Flags c={c} /></td>
                        <td className="px-3 text-sm">{c.profile?.province || c.profile?.branch || '-'}</td>
                        <td className="px-3"><Owner c={c} name={staffName(c.assigned_to)} canClaim={access.canManage} onClaim={() => claim.mutate(c.id)} busy={claim.isPending} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="lg:hidden space-y-3">
                {queueRows.map((c) => (
                  <li key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link to={`/admin/case/${c.id}`} state={caseState} className="inline-flex min-h-11 items-center font-mono text-base font-semibold text-accent underline underline-offset-4">{c.case_code}</Link>
                      <SlaPill c={c} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SevCell v={c.severity} />
                      <span className="text-sm text-muted-foreground">{typesOf(c).map(typeLabel).join(', ')}</span>
                    </div>
                    <Flags c={c} />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" aria-hidden />{c.profile?.province || c.profile?.branch || '-'}</span>
                      <Owner c={c} name={staffName(c.assigned_to)} canClaim={access.canManage} onClaim={() => claim.mutate(c.id)} busy={claim.isPending} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {view === 'overview' && (
        <div>
          <div className="bg-card border border-border rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center shadow-card">
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden />
              <span className="text-sm text-muted-foreground shrink-0">{t('dash.filter.area')}</span>
              {branchSelect}
              <span className="text-sm text-muted-foreground">{t('dash.filter.caseCount', { n: stats?.total ?? 0 })}</span>
            </div>
          </div>
          <DashboardOverview branch={branch === 'all' ? null : branch} onOpenCase={openCase} />
        </div>
      )}

      {view === 'cases' && (
        <div>
          <div className="bg-card border border-border rounded-2xl p-3 mb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2 shadow-card">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('dash.filter.searchPlaceholder')} aria-label={t('dash.filter.searchPlaceholder')} className="h-11 ps-9 text-sm" />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="h-11" aria-label={t('dash.filter.status')}><SelectValue placeholder={t('dash.filter.status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dash.filter.allStatuses')}</SelectItem>
                {(['received', 'inprogress', 'completed', 'cancelled'] as CaseStatus[]).map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            {branchSelect}
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-11" aria-label={t('staff.col.owner')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dash.filter.allAssignees')}</SelectItem>
                <SelectItem value="me">{t('dash.filter.myCases')}</SelectItem>
                <SelectItem value="unassigned">{t('dash.filter.unassigned')}</SelectItem>
                {(staffQ.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.display_name || s.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {casesQ.isLoading ? (
            <div className="py-12 text-center" role="status"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>
          ) : casesQ.isError ? (
            <StaffLoadError onRetry={() => void casesQ.refetch()} />
          ) : (casesQ.data?.rows.length ?? 0) === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-12">{t('dash.cases.noneFound')}</p>
          ) : (
            <ul className="space-y-2">
              {casesQ.data?.rows.map((c) => {
                const overdue = isFollowOverdue(c);
                return (
                  <li key={c.id}>
                    <Link to={`/admin/case/${c.id}`} state={caseState}
                      className="block w-full min-h-16 text-start bg-card border border-border rounded-2xl p-4 hover:border-primary transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{c.case_code}</span>
                        <StatusBadge value={c.status} />
                        {c.severity && <SeverityBadge value={c.severity} />}
                        {c.suicide_risk && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full"><ShieldAlert className="h-3.5 w-3.5" aria-hidden />{t('dash.cases.suicideRiskBadge')}</span>}
                        {!c.first_response_at && <SlaPill c={c} />}
                        {c.pii_flag && <span className="inline-flex items-center gap-1 text-xs font-medium text-sevYellow-fg"><Flag className="w-3.5 h-3.5" aria-hidden />{t('staff.flag.pii')}</span>}
                        {overdue && <span className="text-xs font-semibold bg-sevYellow-bg text-sevYellow-fg px-2 py-0.5 rounded-full">{t('dash.cases.overdueBadge')}</span>}
                        <span className="ms-auto font-mono text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('th-TH')}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{c.victim?.name_masked || t('dash.cases.unnamed')} · {c.profile?.kp || '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                        <UserCheck className="w-3.5 h-3.5" aria-hidden /> {staffName(c.assigned_to) || t('dash.cases.unassigned')}
                        {c.follow_up_at && <> · <CalendarClock className="w-3.5 h-3.5" aria-hidden /> {t('dash.cases.followUp', { date: new Date(c.follow_up_at).toLocaleDateString('th-TH') })}</>}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              {t('dash.cases.pageInfo', { n: casesQ.data?.count ?? 0, page: page + 1, total: totalPages })}
            </span>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" aria-label={t('staff.page.prev')} disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4 rtl:-scale-x-100" aria-hidden /></Button>
              <Button size="icon" variant="outline" aria-label={t('staff.page.next')} disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden /></Button>
            </div>
          </div>
        </div>
      )}

      {view === 'caseload' && statsQ.isError && <StaffLoadError onRetry={() => void statsQ.refetch()} />}
      {view === 'caseload' && statsQ.isLoading && (
        <div className="py-12 text-center" role="status"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" aria-hidden /><span className="sr-only">{t('ui.loading')}</span></div>
      )}
      {view === 'caseload' && statsQ.isSuccess && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <h2 className="font-subhead text-lg font-semibold mb-3">{t('dash.caseload.title')}</h2>
          <ul className="divide-y divide-border">
            {Object.entries(stats?.by_caseworker ?? {}).map(([key, v]) => (
              <li key={key} className="flex min-h-16 items-center gap-3 text-sm">
                <UserCheck className="w-4 h-4 text-primary shrink-0" aria-hidden />
                <span className="flex-1 truncate">{key === 'unassigned' ? t('dash.filter.unassigned') : staffName(key)}</span>
                <span className="font-mono tabular-nums font-semibold">{v}</span>
                <Button size="sm" variant="outline"
                  onClick={() => { setAssignee(key === 'unassigned' ? 'unassigned' : key); navigate('/admin/cases'); toast.info(t('dash.caseload.filteredToast')); }}>
                  {t('dash.caseload.viewCases')}
                </Button>
              </li>
            ))}
          </ul>
          {Object.keys(stats?.by_caseworker ?? {}).length === 0 && <p className="text-sm text-muted-foreground">{t('dash.caseload.noData')}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard num={stats?.unassigned ?? 0} label={t('dash.stat.unassigned')} tone="amber" />
            <StatCard num={stats?.overdue_follow_up ?? 0} label={t('dash.stat.overdue')} tone="red" />
          </div>
        </div>
      )}
    </StaffShell>
  );
}

function Kpi({ label, n, tone }: { label: string; n?: number; tone?: 'danger' | 'watch' }) {
  return (
    <div className={cn('rounded-2xl border p-4 shadow-card',
      tone === 'danger' ? 'border-destructive/40 bg-sevRed-bg' : tone === 'watch' ? 'border-warning/40 bg-sevYellow-bg' : 'border-border bg-card')}>
      <p className={cn('text-sm', tone === 'danger' ? 'text-sevRed-fg' : tone === 'watch' ? 'text-sevYellow-fg' : 'text-muted-foreground')}>
        {tone === 'danger' && <AlertTriangle className="me-1 inline h-4 w-4 align-[-2px]" aria-hidden />}{label}
      </p>
      <p className={cn('font-mono text-[32px] leading-tight font-semibold tabular-nums', tone === 'danger' ? 'text-sevRed-fg' : tone === 'watch' ? 'text-sevYellow-fg' : 'text-foreground')}>{n ?? '-'}</p>
    </div>
  );
}

/**
 * Assignee cell. The claim button writes assigned_to = me, which RLS allows only for admin/manager
 * (a caseworker's update matches 0 rows with no error), so callers pass canClaim={access.canManage},
 * the same rule as the case page.
 */
function Owner({ c, name, canClaim, onClaim, busy }: { c: QueueRow; name: string | null; canClaim: boolean; onClaim: () => void; busy: boolean }) {
  const { t } = useI18n();
  if (c.assigned_to && name) {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary" aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
        <span className="truncate max-w-[10rem]">{name}</span>
      </span>
    );
  }
  if (!canClaim) return <span className="text-sm text-muted-foreground">{t('dash.cases.unassigned')}</span>;
  // Charcoal, not magenta: the page keeps one main action and a queue can show several of these.
  return <Button size="sm" variant="default" disabled={busy} onClick={onClaim}><UserCheck className="h-4 w-4" /> {t('staff.claim')}</Button>;
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
