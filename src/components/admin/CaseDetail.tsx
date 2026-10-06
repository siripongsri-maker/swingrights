import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CaseStatus, STATUS_LABEL, BRANCHES, VIOLATION_TYPES } from '@/lib/screening';
import { q9Level } from '@/lib/screeningTools';
import { printCaseReport, logExport, AI_DISCLAIMER, type CaseReportData } from '@/lib/caseReport';
import { useCaseAlerts, type CaseAlert } from '@/hooks/useCaseAlerts';
import { useAccess, useRoleLabels } from '@/hooks/useAccess';

import {
  Loader2, LogOut, Plus, ShieldCheck, ArrowLeft, Download, FileText, MapPin,
  Search, ChevronLeft, ChevronRight, UserCheck, UserCog, CalendarClock, BellRing, ShieldAlert, Check,
  MessageCircleQuestion, Send, AlertTriangle, Clock, HelpCircle, Building2, Volume2, ChevronDown, Printer, Scale, Share2, HeartHandshake, Flag, History,
  EyeOff, RotateCcw, Info,
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

export interface Staff { id: string; display_name: string | null; email: string | null }

const hoursLeft = (createdAt: string) => 24 - (Date.now() - new Date(createdAt).getTime()) / 3_600_000;

/** SLA pill. `long` adds the words "no reply yet" / "for the first reply" (case header). */
function SlaPill({ c, long = false }: { c: { created_at: string; first_response_at: string | null }; long?: boolean }) {
  const { t } = useI18n();
  const base = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums';
  if (c.first_response_at) return <span className={cn(base, 'bg-muted text-muted-foreground')}><Check className="h-3.5 w-3.5" aria-hidden />{t('staff.sla.done')}</span>;
  const left = hoursLeft(c.created_at);
  if (left <= 0) return <span className={cn(base, 'bg-destructive text-destructive-foreground')}><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{t(long ? 'cd.sla.over' : 'staff.sla.over', { h: Math.max(1, Math.ceil(-left)) })}</span>;
  const h = Math.ceil(left);
  const label = t(long ? 'cd.sla.left' : 'staff.sla.left', { h });
  return left < 6
    ? <span className={cn(base, 'bg-sevYellow-bg text-sevYellow-fg')}><Clock className="h-3.5 w-3.5" aria-hidden />{label}</span>
    : <span className={cn(base, 'bg-sevGreen-bg text-sevGreen-fg')}><Clock className="h-3.5 w-3.5" aria-hidden />{label}</span>;
}

/** Staff intake saves violation types as Thai labels, self-report saves ids. Show both as ids. */
const typeId = (x: string) => VIOLATION_TYPES.find((v) => v.label === x)?.id ?? x;

/** Where the back link goes, by the `from` state the case links pass (falls back to the queue). */
const BACK_LABEL: Record<string, string> = {
  '/admin/cases': 'staff.nav.cases',
  '/admin/caseload': 'staff.nav.caseload',
};

/** Staff case detail page (/admin/case/:id). */
export function CaseDetail({ caseId, staff, staffName, onChanged }: {
  caseId: string; staff: Staff[]; staffName: (id: string | null) => string | null;
  /** @deprecated Not used. The page goes back itself (in-app history, else /admin). */
  onBack?: () => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const access = useAccess();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  // Back: only step back when the previous entry is inside the app (history.length counts
  // other sites too). A case opened from a fresh tab or a pasted link goes to the queue.
  const backFrom = (location.state as { from?: string } | null)?.from;
  const backLabel = t(BACK_LABEL[backFrom ?? ''] ?? 'staff.nav.queue');
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/admin'));
  const [note, setNote] = useState('');
  // Draft shown in the "completed / cancelled" confirm dialog. One-tap status changes never
  // carry the message draft; only the send button or this dialog sends a note to the reporter.
  const [confirmNote, setConfirmNote] = useState('');
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
  // Photo lightbox: focus moves in on open and back to the thumbnail on close
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxLast = useRef<number | null>(null);
  const lightboxOpen = lightbox !== null;
  const photoCount = photoSigned.length;

  useEffect(() => { if (lightbox !== null) lightboxLast.current = lightbox; }, [lightbox]);

  useEffect(() => {
    if (!lightboxOpen) return;
    lightboxCloseRef.current?.focus();
    // Same array object for the page's life; ref callbacks update its entries in place
    const thumbs = thumbRefs.current;
    return () => {
      const i = lightboxLast.current;
      if (i !== null) thumbs[i]?.focus();
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    // Esc closes the photo (QuickExit still counts the press for its double-Esc shortcut).
    // Arrow keys step through photos. Tab stays inside the lightbox.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightbox(null); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = (e.key === 'ArrowRight') !== (document.documentElement.dir === 'rtl') ? 1 : -1;
        setLightbox((i) => (i === null ? i : Math.min(Math.max(i + step, 0), photoCount - 1)));
        return;
      }
      const box = lightboxRef.current;
      if (e.key !== 'Tab' || !box) return;
      const items = Array.from(box.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!box.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxOpen, photoCount]);

  const revealPii = async () => {
    setPiiLoading(true);
    const { data, error } = await supabase.rpc('get_case_pii' as any, { _case_id: caseId });
    setPiiLoading(false);
    if (error) { toast.error(t('dash.detail.piiNoAccess')); return; }
    setPii(data as any);
  };

  const { data: c, isLoading, isError, isFetching, refetch } = useQuery({
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
    toast.success(t('cd.sendQuestionSuccess'));
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

  /**
   * Writes a status and/or a note for the reporter. The note is passed in explicitly, so a
   * one-tap status change never sends the unsent message draft. Returns true on success.
   */
  const updateStatus = async (status: CaseStatus, msgIn = ''): Promise<boolean> => {
    const msg = msgIn.trim().slice(0, 1000);
    if (status === c?.status && !msg) return false;
    setSaving(true);
    try {
      if (status !== c?.status) {
        const { error } = await supabase.from('cases').update({ status } as never).eq('id', caseId);
        if (error) { toast.error(t('dash.detail.statusUpdateFailed')); return false; }
      }
      const { error: tErr } = await supabase.from('case_timeline').insert({ case_id: caseId, status, note: msg || null } as never);
      if (tErr) { toast.error(t('dash.detail.saveFailed')); return false; }
      toast.success(status !== c?.status ? t('dash.detail.statusUpdateSuccess') : t('cd.replySent'));
      qc.invalidateQueries({ queryKey: ['case', caseId] });
      qc.invalidateQueries({ queryKey: ['case-timeline', caseId] });
      onChanged();
      return true;
    } finally { setSaving(false); }
  };


  if (isLoading) {
    return (
      <div role="status" className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden />
        <span className="sr-only">{t('cd.loading')}</span>
      </div>
    );
  }
  // Wrong or stale id, no connection, or retries used up: say so instead of spinning forever
  if (isError || !c) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4" role="alert">
          <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-base leading-relaxed">{t('cd.loadError')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button disabled={isFetching} onClick={() => void refetch()}>
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <RotateCcw className="w-4 h-4" aria-hidden />} {t('cd.retry')}
            </Button>
            <Button asChild variant="outline"><Link to="/admin">{t('staff.nav.queue')}</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const s = c.screening || {};

  const DOC_ICONS: Record<DocKind, React.ReactNode> = {
    complaint: <Scale className="w-4 h-4 shrink-0" aria-hidden />,
    statement: <FileText className="w-4 h-4 shrink-0" aria-hidden />,
    referral: <Share2 className="w-4 h-4 shrink-0" aria-hidden />,
    assistance: <HeartHandshake className="w-4 h-4 shrink-0" aria-hidden />,
  };

  // ดึง PII ผ่าน RPC (masked-by-default) ก่อนออกเอกสารทุกประเภท
  // The document gets the data, but the people card stays masked unless staff pressed reveal.
  const withPii = async (fn: (full: CaseReportData) => void) => {
    const p = pii ?? (await (async () => {
      const { data } = await supabase.rpc('get_case_pii' as any, { _case_id: caseId });
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
    { label: '9Q', value: q9 === null ? '-' : `${q9} · ${t(`tools.level.${q9Level(q9).id}`)}`, tone: q9 === null ? 'none' : q9 >= 19 ? 'danger' : q9 >= 7 ? 'watch' : 'ok' },
    { label: t('cd.selfHarm'), value: c.suicide_risk ? t('dash.detail.riskFound') : t('dash.detail.riskNotFound'), tone: c.suicide_risk ? 'danger' : 'ok' },
    { label: 'NRM', value: (s.nrmPositive === undefined ? '-' : s.nrmPositive ? t('dash.detail.nrmTrafficking') : t('dash.detail.nrmNotYet')) + (s.nrmUnder18 ? t('dash.detail.nrmMinor') : ''), tone: s.nrmPositive === undefined ? 'none' : s.nrmPositive ? 'danger' : 'ok' },
  ];
  const toneCls = { ok: 'bg-sevGreen-bg text-sevGreen-fg border-transparent', watch: 'bg-sevYellow-bg text-sevYellow-fg border-transparent', danger: 'bg-sevRed-bg text-sevRed-fg border-transparent', none: 'bg-muted/50 text-muted-foreground border-border' };
  const source = c.source || c.channel || c.profile?.source;
  const sourceLabel = source === 'self' || source === 'staff' ? t(`cd.source.${source}`) : source ? String(source) : '';

  // Who can write what (mirrors RLS, so controls are disabled instead of failing):
  // - canEdit (any active non-viewer): message to the reporter, questions to the reporter.
  // - canEditCase (admin/manager, or the caseworker assigned to this case): every update to the
  //   case row (status, follow-up, types, AI reviewed), answer edits and referrals.
  // - canManage: assignee changes and "take this case" (a caseworker cannot assign a case).
  const canEditCase = access.canManage || (access.canEdit && access.roles.includes('caseworker') && !!access.uid && c.assigned_to === access.uid);
  const accessHint = access.loading ? null : !access.canEdit ? t('cd.readOnly') : !canEditCase ? t('cd.editHint') : null;

  const pickStatus = (st: CaseStatus) => {
    if (st === c.status) return;
    if (st === 'completed' || st === 'cancelled') { setConfirmNote(note); setConfirmStatus(st); }
    else void updateStatus(st);
  };

  const aiLvlKey = ({ high: 'severity.red', medium: 'severity.yellow', low: 'severity.green' } as Record<string, string>)[c.ai_result?.riskLevel ?? ''];

  const caseMeta = (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-mono text-[28px] font-semibold leading-tight tracking-wide break-all">{c.case_code}</h1>
        <StatusBadge value={c.status} />
        {c.severity && <SeverityBadge value={c.severity} />}
        {!c.first_response_at && <SlaPill c={c} long />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-mono">{new Date(c.created_at).toLocaleString('th-TH')}</span>
        {(c.profile?.branch || c.profile?.province) && <> · {c.profile?.branch || c.profile?.province}</>}
        {sourceLabel && <> · {sourceLabel}</>}
      </p>
    </>
  );

  const followValue = c.follow_up_at ? new Date(c.follow_up_at).toISOString().slice(0, 10) : '';
  const saveFollow = (v: string) => {
    if (v === followValue) return;
    void patchCase({ follow_up_at: v ? new Date(v).toISOString() : null }, t('dash.detail.followUpSetToast'));
  };

  const actionCol = (
    <div className="space-y-4">
      <section className={card}>
        <h2 className={h2}>{t('cd.next')}</h2>
        {accessHint && (
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {accessHint}
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">{t('dash.detail.assignee')}</label>
            <div className="flex flex-col gap-2">
              <Select value={c.assigned_to ?? 'none'} onValueChange={(v) => patchCase({ assigned_to: v === 'none' ? null : v }, t('dash.detail.assignedToast'))} disabled={!access.canManage}>
                <SelectTrigger className="h-11" aria-label={t('dash.detail.assignee')}><SelectValue placeholder={t('dash.detail.selectStaff')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('dash.filter.unassigned')}</SelectItem>
                  {staff.map((st) => <SelectItem key={st.id} value={st.id}>{st.display_name || st.email}</SelectItem>)}
                </SelectContent>
              </Select>
              {access.canManage && access.uid && c.assigned_to !== access.uid && (
                <Button variant="outline" onClick={() => patchCase({ assigned_to: access.uid }, t('dash.detail.assignedToast'))}>
                  <UserCheck className="w-4 h-4" /> {t('cd.claimSelf')}
                </Button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="cd-follow" className="block text-sm text-muted-foreground mb-1.5">{t('dash.detail.followUpDate')}</label>
            <Input id="cd-follow" key={followValue} type="date" defaultValue={followValue} disabled={!canEditCase}
              onBlur={(e) => saveFollow(e.target.value)} className="h-11" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1.5" id="cd-status-label">{t('cd.status')}</p>
            {/* Plain toggle buttons: each tap is an action (or opens a confirm), so no arrow-key selection */}
            <div role="group" aria-labelledby="cd-status-label" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(['received', 'inprogress', 'completed', 'cancelled'] as CaseStatus[]).map((st) => (
                <button key={st} type="button" aria-pressed={c.status === st} disabled={saving || !canEditCase}
                  onClick={() => pickStatus(st)}
                  className={cn('inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
                    c.status === st ? 'bg-primary text-primary-foreground shadow-card' : 'text-foreground hover:bg-card disabled:hover:bg-transparent disabled:text-muted-foreground')}>
                  {c.status === st && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                  {t(`status.${st}`)}
                </button>
              ))}
            </div>
          </div>
          <Button asChild variant="outline" className="w-full sm:hidden">
            <Link to={`/admin/partner-search?case=${c.id}`}><MapPin className="w-4 h-4" aria-hidden /> {t('psearch.nearButton')}</Link>
          </Button>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}><Send className="w-4 h-4 text-accent" aria-hidden />{t('cd.msgTitle')}</h2>
        {access.canEdit || access.loading ? (
          <>
            <p className="text-sm text-muted-foreground mb-2" id="cd-msg-hint">{t('cd.replyHint')}</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('dash.detail.replyPlaceholder')} aria-label={t('cd.msgTitle')} aria-describedby="cd-msg-hint" className="min-h-[96px]" maxLength={1000} disabled={!access.canEdit} />
            <Button variant="action" className="w-full mt-3" disabled={!access.canEdit || !note.trim() || saving}
              onClick={async () => { if (await updateStatus(c.status as CaseStatus, note)) setNote(''); }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t('cd.sendMsg')}
            </Button>
            <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => document.getElementById('cd-questions')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}>
              <MessageCircleQuestion className="w-4 h-4" aria-hidden /> {t('cd.askMore')}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('cd.readOnly')}</p>
        )}
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
            <button type="button" onClick={goBack} className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg pe-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="w-4 h-4 shrink-0 rtl:-scale-x-100" aria-hidden /> <span className="truncate">{backLabel}</span>
            </button>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <Link to={`/admin/partner-search?case=${c.id}`} className="hidden sm:inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden /> {t('psearch.nearButton')}
              </Link>
              {/* Documents: icon only on phones so the row fits 360px in every language */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="w-11 px-0 sm:w-auto sm:px-3" aria-label={t('dash.detail.docsMenu')}>
                    <FileText className="w-4 h-4" aria-hidden />
                    <span className="hidden sm:inline">{t('dash.detail.docsMenu')}</span>
                    <ChevronDown className="hidden sm:block w-4 h-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
                  <DropdownMenuItem className="min-h-11" onClick={() => void withPii((full) => printCaseReport(full))}>
                    <Printer className="w-4 h-4" /> {t('dash.detail.fullReportPdf')}
                  </DropdownMenuItem>
                  {DOC_KINDS.map((dk) => (
                    <DropdownMenuItem key={dk.key} className="min-h-11" onClick={() => void reviewDocument(dk.key)}>
                      {DOC_ICONS[dk.key]} {t(`docs.${dk.key}.title`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <QuickExitSlot always />
            </div>
          </div>
          {/* Phones keep only the action row sticky; the case code and badges scroll with the page */}
          <div className="mt-1 hidden sm:block">{caseMeta}</div>
        </div>
      </header>
      <div className="mx-auto max-w-[1280px] px-4 pt-3 sm:hidden">{caseMeta}</div>

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
                canEdit={canEditCase}
                audioSigned={audioSigned}
                staffObs={c.staff_observations ?? undefined}
                staffName={(id) => staffName(id ?? null) || t('dash.staffFallback')}
              />
            </section>

            {c.ai_result && (
              <section className={card}>
                <h2 className={h2}>{t('dash.detail.aiOpinion')}</h2>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden" role="img" aria-label={`${aiLvlKey ? t(aiLvlKey) : ''} ${c.ai_result.riskScore}`.trim()}>
                    <div className={`h-full ${c.ai_result.riskLevel === 'high' ? 'bg-destructive' : c.ai_result.riskLevel === 'medium' ? 'bg-warning' : 'bg-success'}`} style={{ width: `${c.ai_result.riskScore}%` }} />
                  </div>
                  {aiLvlKey && <span className="text-sm font-semibold" aria-hidden>{t(aiLvlKey)}</span>}
                  <span className="font-mono font-semibold tabular-nums" aria-hidden>{c.ai_result.riskScore}</span>
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
                    <CollapsibleTrigger className="group mt-1 inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-semibold text-sevYellow-fg underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {t('cd.aiLimits')} <ChevronDown className="h-4 w-4 transition-transform motion-reduce:transition-none group-data-[state=open]:rotate-180" aria-hidden />
                    </CollapsibleTrigger>
                    <CollapsibleContent><p className="pb-2 text-sm leading-relaxed text-sevYellow-fg">{t('cd.aiDisclaimer')}</p></CollapsibleContent>
                  </Collapsible>
                  <Button size="sm" variant={c.ai_reviewed ? 'outline' : 'default'} className="mt-1 h-auto min-h-11 whitespace-normal text-start"
                    disabled={c.ai_reviewed || !canEditCase}
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
                {pii ? (
                  <Button size="sm" variant="outline" onClick={() => setPii(null)}>
                    <EyeOff className="w-4 h-4" aria-hidden /> {t('cd.hidePii')}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={piiLoading} onClick={revealPii}>
                    {piiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} {t('dash.detail.revealPii')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('dash.detail.piiHint')}</p>
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
                  <p>{[c.profile?.subdistrict && t('cd.subdistrict', { name: c.profile.subdistrict }), c.profile?.district && t('cd.district', { name: c.profile.district }), c.profile?.province || c.profile?.branch].filter(Boolean).join(' ') || '-'}</p>
                  {c.profile?.geo && (
                    <Button type="button" variant="link" size="sm" className="px-0" aria-expanded={showMap} onClick={() => setShowMap((current) => !current)}>
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
              <h2 className={cn(h2, 'mb-1')}>{t('cd.types')}</h2>
              <p className="mb-3 text-sm text-muted-foreground">{t('cd.typesHint')}</p>
              <div className="flex flex-wrap gap-2">
                {(['body', 'mental', 'labor', 'health', 'property', 'other'] as const).map((k) => {
                  const staffTypes: string[] = Array.isArray(c.violation_types) ? c.violation_types : [];
                  const profile = (c.profile ?? {}) as { initialViolationTypes?: unknown };
                  const initTypes: string[] = Array.isArray(profile.initialViolationTypes) ? profile.initialViolationTypes : [];
                  const fromReporter = initTypes.some((x) => typeId(x) === k);
                  const fromStaff = staffTypes.some((x) => typeId(x) === k);
                  const active = fromReporter || fromStaff;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={!canEditCase || fromReporter}
                      aria-pressed={active}
                      title={fromReporter ? t('cd.typeReporter') : undefined}
                      onClick={() => patchCase({ violation_types: fromStaff ? staffTypes.filter((x) => typeId(x) !== k) : [...staffTypes, k] }, t('dash.detail.typesSaved'))}
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
                        <button key={i} type="button" ref={(el) => { thumbRefs.current[i] = el; }} onClick={() => setLightbox(i)}
                          className="block aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
                          <img src={url} loading="lazy" alt={t('dash.detail.photoAlt', { n: i + 1 })} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('dash.media.note')}</p>
              </section>
            )}

            {/* Older cases kept referral chips on the case row; new referrals live in CaseReferrals */}
            {((Array.isArray(c.referrals) && c.referrals.length > 0) || c.referral_note) && (
              <section className={card}>
                <h2 className={h2}>{t('dash.detail.referrals')}</h2>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(Array.isArray(c.referrals) ? c.referrals : []).map((r: unknown, i: number) => {
                    const label = referralLabel(r);
                    return label ? <span key={i} className="text-xs bg-primary-soft text-primary px-2.5 py-1 rounded-full">{label}</span> : null;
                  })}
                </div>
                {c.referral_note && <p className="text-sm text-muted-foreground">{c.referral_note}</p>}
              </section>
            )}

            <CaseReferrals
              caseId={caseId}
              province={c.profile?.province ?? null}
              violationTypes={Array.isArray(c.violation_types) ? c.violation_types : []}
              canEdit={canEditCase}
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

            <section id="cd-questions" className={cn(card, 'space-y-3 scroll-mt-24 sm:scroll-mt-40')}>
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
                    <p className="text-sm text-muted-foreground">{t('cd.waitingAnswer', { code: c.case_code })}</p>
                  )}
                </div>
              ))}
              {access.canEdit ? (
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
              ) : !access.loading && (
                <p className="text-sm text-muted-foreground">{t('cd.readOnly')}</p>
              )}
            </section>

            <CaseTrainingSamples caseId={caseId} />

            {c.signature_staff && (
              <section className={card}>
                <p className="text-sm text-muted-foreground mb-2">{t('cd.staffSignature', { name: c.signature_staff_name })}</p>
                <img src={c.signature_staff} alt={t('cd.signatureAlt')} className="bg-card border border-border rounded-md max-h-24" />
              </section>
            )}
          </div>

          {/* Sticky on desktop with its own scroll, so the send button and timeline stay reachable */}
          <aside className="order-1 xl:order-2 min-w-0 xl:sticky xl:top-40 xl:self-start xl:max-h-[calc(100dvh-11rem)] xl:overflow-y-auto xl:overscroll-contain xl:-mx-2 xl:px-2 xl:pb-2" aria-label={t('cd.next')}>{actionCol}</aside>
        </div>

        {lightbox !== null && photoSigned[lightbox] && (
          <div ref={lightboxRef} role="dialog" aria-modal="true" aria-label={t('cd.photoCount', { n: lightbox + 1, total: photoCount })}
            className="fixed inset-0 z-50 flex flex-col bg-foreground/85" onClick={() => setLightbox(null)}>
            <div className="flex items-center justify-between gap-2 p-3" onClick={(e) => e.stopPropagation()}>
              <QuickExitSlot always />
              <p className="text-sm font-medium text-background tabular-nums" aria-hidden>{t('cd.photoCount', { n: lightbox + 1, total: photoCount })}</p>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center px-4">
              <img src={photoSigned[lightbox]} alt={t('dash.detail.photoAlt', { n: lightbox + 1 })} className="max-h-full max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="flex justify-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" aria-label={t('cd.prevPhoto')} disabled={lightbox === 0} onClick={() => setLightbox(lightbox - 1)}>
                <ChevronLeft className="w-5 h-5 rtl:-scale-x-100" aria-hidden />
              </Button>
              <Button ref={lightboxCloseRef} variant="secondary" onClick={() => setLightbox(null)}>{t('dash.media.close')}</Button>
              <Button variant="secondary" size="icon" aria-label={t('cd.nextPhoto')} disabled={lightbox >= photoCount - 1} onClick={() => setLightbox(lightbox + 1)}>
                <ChevronRight className="w-5 h-5 rtl:-scale-x-100" aria-hidden />
              </Button>
            </div>
          </div>
        )}

        <AlertDialog open={!!confirmStatus} onOpenChange={(o) => { if (!o) setConfirmStatus(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmStatus ? t('cd.confirmTitle', { s: t(`status.${confirmStatus}`) }) : ''}</AlertDialogTitle>
              <AlertDialogDescription>{t('cd.confirmBody')}</AlertDialogDescription>
            </AlertDialogHeader>
            {/* Starts with the unsent draft so staff see exactly what goes to the reporter */}
            <Textarea value={confirmNote} onChange={(e) => setConfirmNote(e.target.value)} placeholder={t('dash.detail.replyPlaceholder')} aria-label={t('cd.msgTitle')} className="min-h-[88px]" maxLength={1000} disabled={!access.canEdit} />
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">{t('cd.cancel')}</AlertDialogCancel>
              <AlertDialogAction className="min-h-11" onClick={() => {
                const st = confirmStatus;
                const m = access.canEdit ? confirmNote : '';
                setConfirmStatus(null);
                if (st) void updateStatus(st, m).then((ok) => { if (ok && m.trim() && m === note) setNote(''); });
              }}>
                {t('cd.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
