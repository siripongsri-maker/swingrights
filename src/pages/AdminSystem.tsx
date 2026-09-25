import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n';

interface StaffRow { id: string; name: string | null; status: string; roles: string[]; assigned_open: number; views_30d: number; exports_30d: number; last_login: string | null }
interface ReporterRow { id: string; name: string | null; gender: string | null; provider: string | null; has_emergency: boolean; cases: number; created_at: string; last_login: string | null }
interface UsersOverview { staff: StaffRow[]; reporters: ReporterRow[]; visits_total: number; visitors_total: number; visits_daily: { day: string; visits: number; visitors: number }[]; top_paths: Record<string, number> }
interface LogRow { at: string; kind: string; action: string; case_code: string | null; actor: string | null; detail: string | null }

const KINDS = ['all', 'view', 'export', 'change', 'ai'] as const;

export default function AdminSystem() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const locale = lang === 'th' ? 'th-TH' : 'en-GB';
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : t('sys.never'));
  const [kind, setKind] = useState<(typeof KINDS)[number]>('all');

  const usersQ = useQuery({
    queryKey: ['admin-users-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_users_overview' as never);
      if (error) throw error;
      return data as unknown as UsersOverview;
    },
  });
  const logQ = useQuery({
    queryKey: ['admin-log', kind],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_activity_log' as never, { _kind: kind, _limit: 300 } as never);
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
  });

  const downloadLog = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['at,kind,action,case_code,actor,detail', ...(logQ.data ?? []).map((r) => [r.at, r.kind, r.action, r.case_code, r.actor, r.detail].map(esc).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `swing-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    void supabase.auth.getUser().then(({ data }) => data.user && supabase.from('case_exports').insert({ format: 'activity_log_csv', detail: kind, exported_by: data.user.id } as never).then(() => undefined));
  };

  const u = usersQ.data;
  const maxV = Math.max(...(u?.visits_daily ?? []).map((d) => d.visits), 1);
  const loading = <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => navigate('/admin')} className="text-sidebar-foreground hover:bg-sidebar-accent">
            <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <h1 className="font-display text-lg">{t('sys.title')}</h1>
            <p className="text-xs opacity-80">{t('sys.subtitle')}</p>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="staff">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="staff">{t('sys.tab.staff')}</TabsTrigger>
            <TabsTrigger value="reporters">{t('sys.tab.reporters')}</TabsTrigger>
            <TabsTrigger value="visitors">{t('sys.tab.visitors')}</TabsTrigger>
            <TabsTrigger value="logs">{t('sys.tab.logs')}</TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            {!u ? loading : (
              <Table head={[t('sys.col.name'), t('sys.col.roles'), t('sys.col.status'), t('sys.col.open'), t('sys.col.views'), t('sys.col.exports'), t('sys.col.lastLogin')]}
                rows={u.staff.map((s) => [s.name ?? '—', s.roles.join(', ') || '—', s.status, s.assigned_open, s.views_30d, s.exports_30d, fmt(s.last_login)])}
                empty={t('sys.none')} />
            )}
          </TabsContent>

          <TabsContent value="reporters">
            {!u ? loading : (
              <>
                <p className="text-sm mb-3">{t('sys.reportersCount')}: <span className="font-mono font-semibold">{u.reporters.length}</span></p>
                <Table head={[t('sys.col.name'), t('sys.col.gender'), t('sys.col.method'), t('sys.col.cases'), t('sys.col.emergency'), t('sys.col.signup'), t('sys.col.lastLogin')]}
                  rows={u.reporters.map((r) => [r.name ?? '—', r.gender ? t(`report.about.gender.${r.gender}`) : '—', r.provider ?? '—', r.cases, r.has_emergency ? '✓' : '—', fmt(r.created_at), fmt(r.last_login)])}
                  empty={t('sys.none')} />
              </>
            )}
          </TabsContent>

          <TabsContent value="visitors">
            {!u ? loading : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <Stat n={u.visits_total} label={t('sys.visits')} />
                  <Stat n={u.visitors_total} label={t('sys.visitors')} />
                </div>
                <div className="bg-card border border-border rounded-[20px] p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('sys.daily')}</p>
                  <div className="flex items-end gap-[3px] h-32">
                    {u.visits_daily.map((d) => (
                      <div key={d.day} className="flex-1 flex flex-col justify-end h-full">
                        <div className="bg-primary/80 rounded-t-sm min-h-[2px]" style={{ height: `${(d.visits / maxV) * 100}%` }} title={`${d.day}: ${d.visits} / ${d.visitors}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                    <span>{u.visits_daily[0]?.day}</span><span>{u.visits_daily[u.visits_daily.length - 1]?.day}</span>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-[20px] p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('sys.topPaths')}</p>
                  <Table head={['Path', t('sys.visits')]} rows={Object.entries(u.top_paths).sort((a, b) => b[1] - a[1]).map(([p, n]) => [p, n])} empty={t('sys.none')} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {KINDS.map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${kind === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>
                  {t(`sys.log.${k}`)}
                </button>
              ))}
              <Button size="sm" variant="outline" className="ms-auto" onClick={downloadLog} disabled={!logQ.data?.length}>
                <Download className="w-3.5 h-3.5" /> {t('sys.log.csv')}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">{t('sys.log.note')}</p>
            {logQ.isLoading ? loading : (
              <Table head={[t('sys.col.time'), t('sys.col.type'), t('sys.col.action'), t('sys.col.case'), t('sys.col.actor'), t('sys.col.detail')]}
                rows={(logQ.data ?? []).map((r) => [fmt(r.at), t(`sys.log.${r.kind}`), r.action, r.case_code ?? '—', r.actor ?? '—', r.detail ?? ''])}
                empty={t('sys.none')} mono={[3]} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="bg-card border border-border rounded-[20px] p-4 text-center">
      <p className="font-mono text-2xl font-semibold text-primary tabular-nums">{n}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Table({ head, rows, empty, mono = [] }: { head: string[]; rows: (string | number)[][]; empty: string; mono?: number[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-6 text-center bg-card border border-border rounded-[20px]">{empty}</p>;
  return (
    <div className="overflow-x-auto bg-card border border-border rounded-[20px]">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="text-start font-medium px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              {r.map((c, j) => <td key={j} className={`px-3 py-2 ${typeof c === 'number' || mono.includes(j) ? 'font-mono tabular-nums' : ''} ${j === r.length - 1 ? 'max-w-[320px] break-words' : 'whitespace-nowrap'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
