import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  MessageCircleQuestion, Send, AlertTriangle, Clock, HelpCircle, Building2, Volume2, ChevronDown, Printer, Scale, Share2, HeartHandshake, Flag, History,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { printCaseDocument, docInputFromReport, DOC_KINDS, type DocKind } from '@/lib/caseDocuments';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CaseReferrals } from '@/components/admin/CaseReferrals';
import { MapPicker } from '@/components/screening/MapPicker';
import { DocumentDraftDialog } from '@/components/admin/DocumentDraftDialog';
import { BrandMark } from '@/components/BrandLogo';
import { CaseAnswersEditor } from '@/components/admin/CaseAnswersEditor';
import { CaseTrainingSamples } from '@/components/admin/CaseTrainingSamples';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { StaffShell } from '@/components/admin/StaffShell';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
    return <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full tabular-nums">{t('dash.sla.overdue', { h: Math.floor(elapsed) })}</span>;
  }
  const h = Math.ceil(left);
  const cls = left < 6 ? 'bg-sevYellow-bg text-sevYellow-fg' : 'bg-muted text-muted-foreground';
  return <span className={`text-xs px-2 py-0.5 rounded-full tabular-nums ${cls}`}>{t('dash.sla.remaining', { h })}</span>;
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
const typesOf = (c: QueueRow): string[] => Array.from(new Set([
  ...(Array.isArray(c.violation_types) ? c.violation_types : []),
  ...(Array.isArray(c.profile?.initialViolationTypes) ? c.profile.initialViolationTypes : []),
]));

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
  if (left <= 0) return <span className={cn(base, 'bg-destructive text-destructive-foreground')}><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{t('staff.sla.over', { h: Math.floor(-left) })}</span>;
  const h = Math.ceil(left);
  return left < 6
    ? <span className={cn(base, 'bg-sevYellow-bg text-sevYellow-fg')}><Clock className="h-3.5 w-3.5" aria-hidden />{t('staff.sla.left', { h })}</span>
    : <span className={cn(base, 'bg-sevGreen-bg text-sevGreen-fg')}><Clock className="h-3.5 w-3.5" aria-hidden />{t('staff.sla.left', { h })}</span>;
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
  const { pathname } = useLocation();
  const { id: routeCaseId } = useParams();
  const qc = useQueryClient();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const view: StaffView = pathname.startsWith('/admin/cases') ? 'cases'
    : pathname.startsWith('/admin/caseload') ? 'caseload'
    : pathname.startsWith('/admin/overview') ? 'overview' : 'queue';
  const openCase = (id: string) => navigate(`/admin/case/${id}`);

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

  const highAlerts = (alertsQ.data ?? []).filter((a) => a.kind !== 'new_case');
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

  if (routeCaseId) {
    return (
      <StaffShell bare>
        <CaseDetail
          caseId={routeCaseId}
          staff={staffQ.data ?? []}
          staffName={staffName}
          onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/admin'))}
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
            <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
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
                        <td className="px-3"><Link to={`/admin/case/${c.id}`} className="inline-flex min-h-11 items-center whitespace-nowrap font-mono font-semibold text-accent underline-offset-4 hover:underline">{c.case_code}</Link></td>
                        <td className="px-3 whitespace-nowrap"><SevCell v={c.severity} /></td>
                        <td className="px-3 text-sm">{typesOf(c).map((x) => t(`report.type.${x}`)).join(', ') || '-'}</td>
                        <td className="px-3"><Flags c={c} /></td>
                        <td className="px-3 text-sm">{c.profile?.province || c.profile?.branch || '-'}</td>
                        <td className="px-3"><Owner c={c} name={staffName(c.assigned_to)} canClaim={access.canEdit} onClaim={() => claim.mutate(c.id)} busy={claim.isPending} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="lg:hidden space-y-3">
                {queueRows.map((c) => (
                  <li key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link to={`/admin/case/${c.id}`} className="inline-flex min-h-11 items-center font-mono text-base font-semibold text-accent underline underline-offset-4">{c.case_code}</Link>
                      <SlaPill c={c} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SevCell v={c.severity} />
                      <span className="text-sm text-muted-foreground">{typesOf(c).map((x) => t(`report.type.${x}`)).join(', ')}</span>
                    </div>
                    <Flags c={c} />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" aria-hidden />{c.profile?.province || c.profile?.branch || '-'}</span>
                      <Owner c={c} name={staffName(c.assigned_to)} canClaim={access.canEdit} onClaim={() => claim.mutate(c.id)} busy={claim.isPending} />
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
            <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
          ) : (casesQ.data?.rows.length ?? 0) === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-12">{t('dash.cases.noneFound')}</p>
          ) : (
            <ul className="space-y-2">
              {casesQ.data?.rows.map((c) => {
                const overdue = isFollowOverdue(c);
                return (
                  <li key={c.id}>
                    <Link to={`/admin/case/${c.id}`}
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
              <Button size="icon" variant="outline" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4 rtl:-scale-x-100" /></Button>
              <Button size="icon" variant="outline" aria-label="Next page" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4 rtl:-scale-x-100" /></Button>
            </div>
          </div>
        </div>
      )}

      {view === 'caseload' && (
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
  return <Button size="sm" variant="action" disabled={busy} onClick={onClaim}><UserCheck className="h-4 w-4" /> {t('staff.claim')}</Button>;
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
  const navigate = useNavigate();
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
  const [confirmStatus, setConfirmStatus] = useState<CaseStatus | null>(null);


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

  const card = 'bg-card border border-border rounded-2xl p-5 shadow-card';
  const h2 = 'font-subhead text-base font-semibold mb-3 flex items-center gap-2';
  const q9 = typeof s.q9Total === 'number' ? s.q9Total : null;
  const tiles: { label: string; value: string; tone: 'ok' | 'watch' | 'danger' | 'none' }[] = [
    { label: '2Q', value: s.q2Positive === undefined ? '-' : s.q2Positive ? t('dash.detail.q2Abnormal') : t('dash.detail.q2Normal'), tone: s.q2Positive === undefined ? 'none' : s.q2Positive ? 'watch' : 'ok' },
    { label: '9Q', value: q9 === null ? '-' : `${q9} · ${q9Level(q9).label}`, tone: q9 === null ? 'none' : q9 >= 19 ? 'danger' : q9 >= 7 ? 'watch' : 'ok' },
    { label: t('cd.selfHarm'), value: c.suicide_risk ? t('dash.detail.riskFound') : t('dash.detail.riskNotFound'), tone: c.suicide_risk ? 'danger' : 'ok' },
    { label: 'NRM', value: (s.nrmPositive === undefined ? '-' : s.nrmPositive ? t('dash.detail.nrmTrafficking') : t('dash.detail.nrmNotYet')) + (s.nrmUnder18 ? t('dash.detail.nrmMinor') : ''), tone: s.nrmPositive === undefined ? 'none' : s.nrmPositive ? 'danger' : 'ok' },
  ];
  const toneCls = { ok: 'bg-sevGreen-bg text-sevGreen-fg border-transparent', watch: 'bg-sevYellow-bg text-sevYellow-fg border-transparent', danger: 'bg-sevRed-bg text-sevRed-fg border-transparent', none: 'bg-muted/50 text-muted-foreground border-border' };
  const source = c.source || c.channel || c.profile?.source;

  const pickStatus = (st: CaseStatus) => {
    if (st === c.status) return;
    if (st === 'completed' || st === 'cancelled') setConfirmStatus(st);
    else void updateStatus(st);
  };

  const followValue = c.follow_up_at ? new Date(c.follow_up_at).toISOString().slice(0, 10) : '';
  const saveFollow = (v: string) => {
    if (v === followValue) return;
    void patchCase({ follow_up_at: v ? new Date(v).toISOString() : null }, t('dash.detail.followUpSetToast'));
  };

  const actionCol = (
    <div className="space-y-4 xl:sticky xl:top-[calc(var(--case-head-h,120px)+16px)]">
      <section className={card}>
        <h2 className={h2}>{t('cd.next')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">{t('dash.detail.assignee')}</label>
            <div className="flex flex-col gap-2">
              <Select value={c.assigned_to ?? 'none'} onValueChange={(v) => patchCase({ assigned_to: v === 'none' ? null : v }, t('dash.detail.assignedToast'))} disabled={!access.canEdit}>
                <SelectTrigger className="h-11" aria-label={t('dash.detail.assignee')}><SelectValue placeholder={t('dash.detail.selectStaff')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('dash.filter.unassigned')}</SelectItem>
                  {staff.map((st) => <SelectItem key={st.id} value={st.id}>{st.display_name || st.email}</SelectItem>)}
                </SelectContent>
              </Select>
              {access.canEdit && access.uid && c.assigned_to !== access.uid && (
                <Button variant="outline" onClick={() => patchCase({ assigned_to: access.uid }, t('dash.detail.assignedToast'))}>
                  <UserCheck className="w-4 h-4" /> {t('cd.claimSelf')}
                </Button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="cd-follow" className="block text-sm text-muted-foreground mb-1.5">{t('dash.detail.followUpDate')}</label>
            <Input id="cd-follow" key={followValue} type="date" defaultValue={followValue} disabled={!access.canEdit}
              onBlur={(e) => saveFollow(e.target.value)} className="h-11" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1.5" id="cd-status-label">{t('cd.status')}</p>
            <div role="radiogroup" aria-labelledby="cd-status-label" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(['received', 'inprogress', 'completed', 'cancelled'] as CaseStatus[]).map((st) => (
                <button key={st} type="button" role="radio" aria-checked={c.status === st} disabled={saving || !access.canEdit}
                  onClick={() => pickStatus(st)}
                  className={cn('min-h-11 rounded-lg px-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
                    c.status === st ? 'bg-primary text-primary-foreground shadow-card' : 'text-foreground hover:bg-card')}>
                  {t(`status.${st}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}><Send className="w-4 h-4 text-accent" aria-hidden />{t('cd.msgTitle')}</h2>
        <p className="text-sm text-muted-foreground mb-2">{t('dash.detail.replyHint')}</p>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('dash.detail.replyPlaceholder')} aria-label={t('cd.msgTitle')} className="min-h-[96px]" maxLength={1000} />
        <Button variant="action" className="w-full mt-3" disabled={!note.trim() || saving} onClick={() => void updateStatus(c.status as CaseStatus)}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t('cd.sendMsg')}
        </Button>
        <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent underline underline-offset-4"
          onClick={() => document.getElementById('cd-questions')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}>
          <MessageCircleQuestion className="w-4 h-4" aria-hidden /> {t('cd.askMore')}
        </button>
      </section>

      <section className={card}>
        <h2 className={h2}><History className="w-4 h-4" aria-hidden />{t('cd.activity')}</h2>
        {timeline.length > 0 ? (
          <ol className="relative ms-2 space-y-4 border-s-2 border-border">
            {timeline.map((it, i) => (
              <li key={i} className="ms-4">
                <span className="absolute -start-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-card bg-accent" aria-hidden />
                <p className="font-mono text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString('th-TH')}</p>
                <div className="mt-1"><StatusBadge value={it.status as CaseStatus} /></div>
                {it.note && <p className="mt-1 text-sm break-words">{it.note}</p>}
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-muted-foreground">{t('dash.detail.none')}</p>}
        <Button variant="outline" className="w-full mt-4" onClick={() => navigate(`/admin/case/${caseId}/history`)}>
          <History className="w-4 h-4" /> {t('cd.allHistory')}
        </Button>
      </section>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg pe-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" aria-hidden /> {t('staff.nav.queue')}
            </button>
            <div className="flex items-center gap-2">
              <Link to={`/admin/partner-search?case=${c.id}`} className="hidden sm:inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <MapPin className="w-4 h-4" aria-hidden /> {t('psearch.nearButton')}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline"><FileText className="w-4 h-4" /> {t('dash.detail.docsMenu')} <ChevronDown className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem className="min-h-11" onClick={() => void withPii((full) => printCaseReport(full))}>
                    <Printer className="w-4 h-4" /> {t('dash.detail.fullReportPdf')}
                  </DropdownMenuItem>
                  {DOC_KINDS.map((dk) => (
                    <DropdownMenuItem key={dk.key} className="min-h-11" onClick={() => void reviewDocument(dk.key)}>
                      {DOC_ICONS[dk.key]} {dk.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <QuickExitSlot />
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-mono text-[28px] font-semibold leading-tight tracking-wide">{c.case_code}</h1>
            <StatusBadge value={c.status} />
            {c.severity && <SeverityBadge value={c.severity} />}
            {!c.first_response_at && <SlaPill c={c} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{new Date(c.created_at).toLocaleString('th-TH')}</span>
            {(c.profile?.branch || c.profile?.province) && <> · {c.profile?.branch || c.profile?.province}</>}
            {source && <> · {String(source)}</>}
          </p>
          <Link to={`/admin/partner-search?case=${c.id}`} className="sm:hidden mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent underline underline-offset-4">
            <MapPin className="w-4 h-4" aria-hidden /> {t('psearch.nearButton')}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 space-y-4">
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
          <section role="alert" className="rounded-2xl border border-destructive/40 bg-sevRed-bg p-4">
            <p className="flex items-start gap-2 font-semibold text-sevRed-fg">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> {t('cd.safety')}
            </p>
          </section>
        )}

        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
          <div className="order-2 xl:order-1 min-w-0 space-y-4">
            <section aria-label={t('cd.story')} className="space-y-2">
              <h2 className="font-subhead text-lg font-semibold">{t('cd.story')}</h2>
              <CaseAnswersEditor
                caseId={caseId}
                answers={Array.isArray(c.answers) ? c.answers : []}
                canEdit={access.canEdit}
                audioSigned={audioSigned}
                staffObs={c.staff_observations ?? undefined}
                staffName={(id) => staffName(id ?? null) || t('dash.staffFallback')}
              />
            </section>

            {c.ai_result && (
              <section className={card}>
                <h2 className={h2}>{t('dash.detail.aiOpinion')}</h2>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden" role="img" aria-label={`${c.ai_result.riskLevel ?? ''} ${c.ai_result.riskScore}`}>
                    <div className={`h-full ${c.ai_result.riskLevel === 'high' ? 'bg-destructive' : c.ai_result.riskLevel === 'medium' ? 'bg-warning' : 'bg-success'}`} style={{ width: `${c.ai_result.riskScore}%` }} />
                  </div>
                  <span className="font-mono font-semibold tabular-nums">{c.ai_result.riskScore}</span>
                </div>
                <p className="text-sm leading-relaxed mb-3">{c.ai_result.summary}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(c.ai_result.violationTags || []).map((tg: any, i: number) => <span key={i} className="text-xs bg-primary-soft text-primary px-2.5 py-1 rounded-full">{tg.label}</span>)}
                </div>
                {(c.ai_result.recommendations || []).length > 0 && (
                  <ul className="text-sm space-y-1 list-disc ps-5 text-muted-foreground mb-3">
                    {(c.ai_result.recommendations || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                )}
                <div className="rounded-xl border border-warning/40 bg-sevYellow-bg/60 p-3">
                  <p className="text-sm text-sevYellow-fg">{t('cd.aiNotice')}</p>
                  <Collapsible>
                    <CollapsibleTrigger className="group mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-sevYellow-fg underline underline-offset-4">
                      {t('cd.aiLimits')} <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                    </CollapsibleTrigger>
                    <CollapsibleContent><p className="pb-2 text-sm leading-relaxed text-sevYellow-fg">{AI_DISCLAIMER}</p></CollapsibleContent>
                  </Collapsible>
                  <Button size="sm" variant={c.ai_reviewed ? 'outline' : 'default'} className="mt-1"
                    disabled={c.ai_reviewed}
                    onClick={async () => {
                      const { data: sess } = await supabase.auth.getUser();
                      patchCase({ ai_reviewed: true, ai_reviewed_at: new Date().toISOString(), ai_reviewed_by: sess.user?.id }, t('dash.detail.aiReviewedToast'));
                    }}>
                    <Check className="w-4 h-4" /> {c.ai_reviewed ? t('dash.detail.aiReviewedLabel', { date: c.ai_reviewed_at ? ` · ${new Date(c.ai_reviewed_at).toLocaleDateString('th-TH')}` : '' }) : t('dash.detail.markReviewed')}
                  </Button>
                </div>
              </section>
            )}

            <section className={card}>
              <h2 className={h2}>{t('dash.detail.standardScreening')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {tiles.map((tl) => (
                  <div key={tl.label} className={cn('rounded-xl border p-3', toneCls[tl.tone])}>
                    <p className="text-xs font-semibold opacity-90">{tl.label}</p>
                    <p className="mt-1 text-sm font-semibold leading-snug">{tl.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={cn(card, 'space-y-4 text-sm')}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="font-subhead text-base font-semibold">{t('dash.detail.relatedInfo')}</h2>
                {!pii && (
                  <Button size="sm" variant="outline" disabled={piiLoading} onClick={revealPii}>
                    {piiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} {t('dash.detail.revealPii')}
                  </Button>
                )}
              </div>
              {!pii && <p className="text-xs text-muted-foreground">{t('dash.detail.piiHint')}</p>}
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
                    <Button type="button" variant="link" size="sm" className="px-0" onClick={() => setShowMap((current) => !current)}>
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

            <section className={card}>
              <h2 className={h2}>{t('dash.detail.types')}</h2>
              <div className="flex flex-wrap gap-2">
                {(['body', 'mental', 'labor', 'health', 'property', 'other'] as const).map((k) => {
                  const staffTypes: string[] = Array.isArray(c.violation_types) ? c.violation_types : [];
                  const initTypes: string[] = Array.isArray((c.profile as any)?.initialViolationTypes) ? (c.profile as any).initialViolationTypes : [];
                  const fromReporter = initTypes.includes(k);
                  const fromStaff = staffTypes.includes(k);
                  const active = fromReporter || fromStaff;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={!access.canEdit || fromReporter}
                      aria-pressed={active}
                      title={fromReporter ? t('dash.detail.typeReporter') : undefined}
                      onClick={() => patchCase({ violation_types: fromStaff ? staffTypes.filter((x) => x !== k) : [...staffTypes, k] }, t('dash.detail.typesSaved'))}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium leading-normal transition-colors duration-150 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-foreground hover:bg-primary-soft',
                      )}
                    >
                      {active && <Check className="h-4 w-4" aria-hidden />}
                      {t(`report.type.${k}`)}
                      {fromReporter && <span className="text-xs opacity-90">· {t('dash.detail.typeReporterShort')}</span>}
                      {fromStaff && !fromReporter && <span className="text-xs opacity-90">· {t('dash.detail.typeStaffShort')}</span>}
                    </button>
                  );
                })}
              </div>
            </section>

            {(allAudio.length > 0 || photoSigned.length > 0) && (
              <section className={cn(card, 'space-y-4')} aria-label={t('dash.media.title')}>
                <h2 className="font-subhead text-base font-semibold">{t('dash.media.title')}</h2>
                {allAudio.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t('dash.media.audio', { n: allAudio.length })}</p>
                    {allAudio.map((a, i) => (
                      <div key={i} className="rounded-xl border border-border p-2.5">
                        <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{a.label}</p>
                        <audio src={a.url} controls preload="none" className="w-full h-11" />
                      </div>
                    ))}
                  </div>
                )}
                {photoSigned.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('dash.detail.photos', { n: photoSigned.length })}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {photoSigned.map((url, i) => (
                        <button key={i} type="button" onClick={() => setLightbox(i)} className="block aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                          <img src={url} loading="lazy" alt={t('dash.detail.photoAlt', { n: i + 1 })} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('dash.media.note')}</p>
              </section>
            )}

            <section className={card}>
              <h2 className={h2}>{t('dash.detail.referrals')}</h2>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(c.referrals || []).map((r: unknown, i: number) => {
                  const label = referralLabel(r);
                  return label ? <span key={i} className="text-xs bg-primary-soft text-primary px-2.5 py-1 rounded-full">{label}</span> : null;
                })}
                {(!c.referrals || c.referrals.length === 0) && <span className="text-sm text-muted-foreground">{t('dash.detail.none')}</span>}
              </div>
              {c.referral_note && <p className="text-sm text-muted-foreground">{c.referral_note}</p>}
            </section>

            <CaseReferrals
              caseId={caseId}
              province={c.profile?.province ?? null}
              violationTypes={Array.isArray(c.violation_types) ? c.violation_types : []}
              canEdit={access.canEdit}
            />

            {partners.length > 0 && (
              <section className={card}>
                <h2 className={h2}><Building2 className="w-4 h-4" aria-hidden /> {t('dash.detail.localPartners', { province: c.profile?.province ? ` (${c.profile.province})` : '' })}</h2>
                <div className="space-y-2.5">
                  {partners.map((p) => (
                    <div key={p.id} className="border border-border/60 rounded-xl p-3 text-sm">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[p.district, p.province].filter(Boolean).join(' · ') || t('dash.detail.allAreas')}
                        {p.phone ? t('dash.detail.phone', { phone: p.phone }) : ''}{p.email ? ` · ${p.email}` : ''}
                      </p>
                      {Array.isArray(p.services) && p.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.services.map((sv, i) => <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{sv}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section id="cd-questions" className={cn(card, 'space-y-3 scroll-mt-40')}>
              <h2 className="font-subhead text-base font-semibold flex items-center gap-2">
                <MessageCircleQuestion className="w-4 h-4 text-accent" aria-hidden /> {t('dash.detail.askQuestionsTitle')}
              </h2>
              {questions.map((q) => (
                <div key={q.id} className="border border-border/60 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-medium">{q.question}</p>
                  <p className="font-mono text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString('th-TH')}</p>
                  {q.answer_text || q.answer_audio_url ? (
                    <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5">
                      <p className="text-xs font-semibold text-primary">{t('dash.detail.answerFromReporter')}</p>
                      {q.answer_text && <p className="text-sm">{q.answer_text}</p>}
                      {q.answer_audio_url && (
                        answerAudio[q.id]
                          ? <audio src={answerAudio[q.id]} controls className="w-full h-11" />
                          : <Button size="sm" variant="outline" onClick={() => void playAnswerAudio(q.id, q.answer_audio_url!)}>
                              <Volume2 className="w-4 h-4" /> {t('dash.detail.listenAnswer')}
                            </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('dash.detail.waitingAnswer', { code: c.case_code })}</p>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder={t('dash.detail.questionPlaceholder')}
                  aria-label={t('dash.detail.questionPlaceholder')}
                  className="min-h-[44px] text-sm"
                  maxLength={1000}
                />
                <Button size="icon" className="self-end shrink-0" aria-label={t('cd.askMore')} disabled={!newQuestion.trim()} onClick={() => void askQuestion()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </section>

            <CaseTrainingSamples caseId={caseId} />

            {c.signature_staff && (
              <section className={card}>
                <p className="text-sm text-muted-foreground mb-2">{t('dash.detail.staffSignature', { name: c.signature_staff_name })}</p>
                <img src={c.signature_staff} alt="signature" className="bg-card border border-border rounded-md max-h-24" />
              </section>
            )}
          </div>

          <aside className="order-1 xl:order-2 min-w-0" aria-label={t('cd.next')}>{actionCol}</aside>
        </div>

        {lightbox !== null && photoSigned[lightbox] && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <img src={photoSigned[lightbox]} alt={t('dash.detail.photoAlt', { n: lightbox + 1 })} className="max-h-[85vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
            <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" aria-label="Previous" disabled={lightbox === 0} onClick={() => setLightbox(lightbox - 1)}>‹</Button>
              <Button variant="secondary" onClick={() => setLightbox(null)}>{t('dash.media.close')}</Button>
              <Button variant="secondary" size="icon" aria-label="Next" disabled={lightbox >= photoSigned.length - 1} onClick={() => setLightbox(lightbox + 1)}>›</Button>
            </div>
          </div>
        )}

        <AlertDialog open={!!confirmStatus} onOpenChange={(o) => { if (!o) setConfirmStatus(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmStatus ? t('cd.confirmTitle', { s: t(`status.${confirmStatus}`) }) : ''}</AlertDialogTitle>
              <AlertDialogDescription>{t('cd.confirmBody')}</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('dash.detail.replyPlaceholder')} aria-label={t('cd.msgTitle')} className="min-h-[88px]" maxLength={1000} />
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">{t('cd.cancel')}</AlertDialogCancel>
              <AlertDialogAction className="min-h-11" onClick={() => { const st = confirmStatus; setConfirmStatus(null); if (st) void updateStatus(st); }}>
                {t('cd.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
