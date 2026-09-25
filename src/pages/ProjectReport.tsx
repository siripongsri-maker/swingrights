import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, Loader2, Printer, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { PROJECT_REPORT_DICT } from '@/i18n/dict/projectReport';
import { BRANCHES } from '@/lib/screening';
import { BrandLockup } from '@/components/BrandLogo';
import { PartnerBar } from '@/components/PartnerBar';

type Count = number | string;
type Summary = {
  from: string; to: string; branch: string | null;
  total_cases: Count;
  cases_by_branch: Record<string, Count>;
  cases_by_violation_type: Record<string, Count>;
  cases_by_client_group: Record<string, Count>;
  cases_by_severity: Record<string, Count>;
  cases_by_occupation: Record<string, Count>;
  cases_by_nationality: Record<string, Count>;
  cases_by_gender: Record<string, Count>;
  cases_by_language: Record<string, Count>;
  cases_by_source: Record<string, Count>;
  referrals_by_partner: Record<string, Count>;
  trafficking_count: Count;
  sla_met_count: Count; sla_total: Count; sla_percent: number | null;
  referrals_count: Count; referrals_accepted_count: Count;
  emergency_fund_cases: Count; suicide_risk_count: Count;
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const SITES = ['Silom', 'Pattaya', 'Saphan Khwai', 'Phetkasem 48', 'Udomsuk', 'Online'];

export default function ProjectReport() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [from, setFrom] = useState('2026-07-01');
  const [to, setTo] = useState(todayIso());
  const [branch, setBranch] = useState('all');
  const [rl, setRl] = useState<'th' | 'en'>(lang === 'th' ? 'th' : 'en');
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const r = (k: string) => PROJECT_REPORT_DICT[k]?.[rl] ?? k;
  const branchOpts = Array.from(new Set([...SITES, ...BRANCHES]));

  const generate = async () => {
    setLoading(true);
    const { data: d, error } = await supabase.rpc('project_summary' as never, {
      _from: from, _to: to, _branch: branch === 'all' ? null : branch,
    } as never);
    setLoading(false);
    if (error) { toast.error(t('prep.error')); return; }
    setData(d as unknown as Summary);
  };

  const logDownload = async (kind: 'csv' | 'pdf') => {
    const { error } = await supabase.from('case_exports').insert({
      format: 'project_summary',
      detail: `${from}..${to}${branch !== 'all' ? ` branch=${branch}` : ''} (${kind})`,
    } as never);
    if (error) console.error('export log failed', error);
  };

  const downloadCsv = async () => {
    if (!data) return;
    const rows: [string, Count | string][] = [
      [r('prep.period'), `${from} – ${to}`],
      [r('prep.branch'), data.branch ?? r('prep.allBranches')],
      [r('prep.total'), data.total_cases],
      [r('prep.sla'), `${data.sla_met_count} / ${data.sla_total}${data.sla_percent != null ? ` (${data.sla_percent}%)` : ''}`],
      [r('prep.referrals'), data.referrals_count],
      [`${r('prep.referrals')} – ${r('prep.accepted')}`, data.referrals_accepted_count],
      [r('prep.emergency'), data.emergency_fund_cases],
      [r('prep.suicide'), data.suicide_risk_count],
      [r('prep.trafficking'), data.trafficking_count],
    ];
    const add = (label: string, m: Record<string, Count>) =>
      Object.entries(m || {}).forEach(([k, v]) => rows.push([`${label}: ${k}`, v]));
    add(r('prep.byBranch'), data.cases_by_branch);
    add(r('prep.byViolation'), data.cases_by_violation_type);
    add(r('prep.byOccupation'), data.cases_by_occupation);
    add(r('prep.byGroup'), data.cases_by_client_group);
    add(r('prep.bySeverity'), data.cases_by_severity);
    add(r('prep.byNationality'), data.cases_by_nationality);
    add(r('prep.byGender'), data.cases_by_gender);
    add(r('prep.byLanguage'), data.cases_by_language);
    add(r('prep.bySource'), data.cases_by_source);
    add(r('prep.byPartner'), data.referrals_by_partner);
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [[r('prep.csv.metric'), r('prep.csv.value')], ...rows].map((x) => x.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `swing-project-summary_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    await logDownload('csv');
  };

  const printPdf = async () => {
    await logDownload('pdf');
    window.print();
  };

  const Breakdown = ({ title, m }: { title: string; m: Record<string, Count> }) => {
    const entries = Object.entries(m || {});
    return (
      <div className="border border-border rounded-xl p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
        {entries.length === 0 ? <p className="text-xs text-muted-foreground">{r('prep.none')}</p> : (
          <table className="w-full text-sm">
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k} className="border-t border-border/50 first:border-0">
                  <td className="py-1 pe-2">{k}</td>
                  <td className="py-1 text-end font-medium tabular-nums">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const Stat = ({ label, value, sub }: { label: string; value: Count; sub?: string }) => (
    <div className="border border-border rounded-xl p-3 bg-primary-soft/40">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-medium tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('prep.back')}
        </Button>

        <div className="bg-card border border-border rounded-xl p-4 shadow-card grid gap-3 sm:grid-cols-4 sm:items-end">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">{t('prep.from')}</span>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">{t('prep.to')}</span>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">{t('prep.branch')}</span>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('prep.allBranches')}</SelectItem>
                {branchOpts.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <Button onClick={generate} disabled={loading || !from || !to}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />} {t('prep.generate')}
          </Button>
        </div>

        {data && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('prep.reportLang')}</span>
              {(['th', 'en'] as const).map((l) => (
                <Button key={l} size="sm" variant={rl === l ? 'default' : 'outline'} onClick={() => setRl(l)}>
                  {l === 'th' ? 'ไทย' : 'English'}
                </Button>
              ))}
              <div className="ms-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="w-4 h-4" /> {t('prep.csv')}</Button>
                <Button size="sm" onClick={printPdf}><Printer className="w-4 h-4" /> {t('prep.pdf')}</Button>
              </div>
            </div>

            <article id="project-report" lang={rl} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
              <header className="border-b border-border pb-3">
                <BrandLockup className="mb-4 w-40" />
                <h1 className="font-display text-xl font-medium">{r('prep.title')}</h1>
                <p className="text-xs text-muted-foreground">{r('prep.subtitle')}</p>
                <p className="text-xs mt-1">
                  {r('prep.period')}: {from} – {to} · {r('prep.branch')}: {data.branch ?? r('prep.allBranches')} · {r('prep.generatedAt')}: {new Date().toLocaleDateString(rl === 'th' ? 'th-TH' : 'en-GB')}
                </p>
              </header>
              <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label={r('prep.total')} value={data.total_cases} />
                <Stat label={r('prep.sla')} value={data.sla_percent != null ? `${data.sla_percent}%` : '–'} sub={`${data.sla_met_count} / ${data.sla_total}`} />
                <Stat label={r('prep.referrals')} value={data.referrals_count} sub={`${data.referrals_accepted_count} ${r('prep.accepted')}`} />
                <Stat label={r('prep.emergency')} value={data.emergency_fund_cases} />
                <Stat label={r('prep.suicide')} value={data.suicide_risk_count} />
                <Stat label={r('prep.trafficking')} value={data.trafficking_count} />
              </section>
              <section className="grid sm:grid-cols-2 gap-3">
                <Breakdown title={r('prep.byBranch')} m={data.cases_by_branch} />
                <Breakdown title={r('prep.byGroup')} m={data.cases_by_client_group} />
                <Breakdown title={r('prep.byViolation')} m={data.cases_by_violation_type} />
                <Breakdown title={r('prep.byOccupation')} m={data.cases_by_occupation} />
                <Breakdown title={r('prep.bySeverity')} m={data.cases_by_severity} />
                <Breakdown title={r('prep.byNationality')} m={data.cases_by_nationality} />
                <Breakdown title={r('prep.byGender')} m={data.cases_by_gender} />
                <Breakdown title={r('prep.byLanguage')} m={data.cases_by_language} />
                <Breakdown title={r('prep.bySource')} m={data.cases_by_source} />
                <Breakdown title={r('prep.byPartner')} m={data.referrals_by_partner} />
              </section>
              <p className="text-[11px] text-muted-foreground border-t border-border pt-2">{r('prep.note')}</p>
              <PartnerBar className="shadow-none" />
            </article>
          </>
        )}
      </main>
    </div>
  );
}
