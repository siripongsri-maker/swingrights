import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { Loader2, Clock, ShieldAlert, HeartHandshake, Users, TrendingUp, Bot } from 'lucide-react';

type Map = Record<string, number>;
interface Overview {
  days: number; total: number; new_today: number; new_7d: number; open: number; unassigned_open: number;
  awaiting_response: number; overdue_24h: number; overdue_follow_up: number; sla_total: number; sla_met: number;
  avg_response_hours: number | null; suicide_risk_open: number; high_risk_open: number; trafficking: number;
  pii_flag: number; alerts_unacked: number; referrals_total: number; referrals_accepted: number;
  referrals_declined: number; referrals_pending: number; referrals_by_partner: Map; by_status: Map;
  by_severity: Map; by_branch: Map; by_source: Map; by_language: Map; by_nationality: Map; by_gender: Map;
  by_age: Map; daily: { day: string; n: number }[]; ai_samples: number; ai_rated: number;
}

const LANG_NAME: Record<string, string> = { th: 'ไทย', en: 'English', my: 'မြန်မာ', km: 'ខ្មែរ', lo: 'ລາວ' };

export function DashboardOverview({ branch }: { branch: string | null }) {
  const { t } = useI18n();
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ['overview', branch, days],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_overview' as never, { _branch: branch, _days: days } as never);
      if (error) throw error;
      return data as unknown as Overview;
    },
  });
  const s = q.data;
  const un = (k: string) => (k === 'unspecified' || k === 'unset' ? t('ops.unspecified') : k);
  const rows = (m: Map | undefined, f: (k: string) => string = un) =>
    Object.entries(m ?? {}).map(([k, v]) => ({ label: f(k), value: v })).sort((a, b) => b.value - a.value);

  if (q.isLoading || !s) return <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>;

  const pct = s.sla_total > 0 ? Math.round((s.sla_met / s.sla_total) * 100) : null;
  const ok = pct !== null && pct >= 90;
  const maxDay = Math.max(...s.daily.map((d) => d.n), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{t('ops.range')}</span>
        {[7, 30, 90, 365].map((d) => (
          <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${days === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>
            {t(`ops.range.${d}`)}
          </button>
        ))}
        <span className="text-[11px] text-muted-foreground ms-auto">{t('ops.updated')}</span>
      </div>

      <Section icon={<Users className="w-4 h-4" />} title={t('ops.sec.today')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Tile n={s.new_today} label={t('ops.newToday')} tone="primary" />
          <Tile n={s.new_7d} label={t('ops.new7d')} />
          <Tile n={s.open} label={t('ops.open')} />
          <Tile n={s.unassigned_open} label={t('ops.unassigned')} tone={s.unassigned_open ? 'warn' : undefined} />
        </div>
      </Section>

      <Section icon={<Clock className="w-4 h-4" />} title={t('ops.sec.sla')}>
        <div className="grid sm:grid-cols-[1.4fr_1fr] gap-4 items-center">
          <div>
            <p className="text-xs text-muted-foreground">{t('ops.slaRate')}</p>
            <p className={`text-4xl font-display tabular-nums mt-1 ${pct === null ? 'text-muted-foreground' : ok ? 'text-primary' : 'text-destructive'}`}>
              {pct === null ? '—' : `${pct}%`} <span className="text-base text-muted-foreground">{s.sla_met} / {s.sla_total}</span>
            </p>
            <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden relative">
              <div className={`h-full ${ok ? 'bg-primary' : 'bg-destructive'}`} style={{ width: `${pct ?? 0}%` }} />
              <div className="absolute top-0 bottom-0 w-px bg-foreground/60" style={{ insetInlineStart: '90%' }} />
            </div>
            {s.avg_response_hours !== null && <p className="text-xs text-muted-foreground mt-2">{t('ops.avgHours', { h: s.avg_response_hours })}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Tile n={s.awaiting_response} label={t('ops.awaiting')} small />
            <Tile n={s.overdue_24h} label={t('ops.overdue24')} tone={s.overdue_24h ? 'danger' : undefined} small />
            <Tile n={s.overdue_follow_up} label={t('ops.overdueFollow')} tone={s.overdue_follow_up ? 'warn' : undefined} small />
          </div>
        </div>
      </Section>

      <Section icon={<ShieldAlert className="w-4 h-4" />} title={t('ops.sec.safety')}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Tile n={s.suicide_risk_open} label={t('ops.suicide')} tone={s.suicide_risk_open ? 'danger' : undefined} />
          <Tile n={s.high_risk_open} label={t('ops.highRisk')} tone={s.high_risk_open ? 'danger' : undefined} />
          <Tile n={s.trafficking} label={t('ops.trafficking')} tone={s.trafficking ? 'warn' : undefined} />
          <Tile n={s.alerts_unacked} label={t('ops.alerts')} tone={s.alerts_unacked ? 'warn' : undefined} />
          <Tile n={s.pii_flag} label={t('ops.pii')} />
        </div>
      </Section>

      <Section icon={<HeartHandshake className="w-4 h-4" />} title={t('ops.sec.referrals')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Tile n={s.referrals_total} label={t('ops.ref.total')} tone="primary" />
          <Tile n={s.referrals_accepted} label={t('ops.ref.accepted')} />
          <Tile n={s.referrals_pending} label={t('ops.ref.pending')} tone={s.referrals_pending ? 'warn' : undefined} />
          <Tile n={s.referrals_declined} label={t('ops.ref.declined')} />
        </div>
        <Bars title={t('ops.ref.byPartner')} data={rows(s.referrals_by_partner)} empty={t('sys.none')} />
      </Section>

      <Section icon={<TrendingUp className="w-4 h-4" />} title={t('ops.sec.trend')}>
        <div className="flex items-end gap-[2px] h-28" role="img" aria-label={t('ops.sec.trend')}>
          {s.daily.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col justify-end h-full group relative">
              <div className="bg-primary/80 rounded-t-sm min-h-[2px]" style={{ height: `${(d.n / maxDay) * 100}%` }} title={`${d.day}: ${d.n}`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
          <span>{s.daily[0]?.day}</span><span>{s.daily[s.daily.length - 1]?.day}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 mt-4">
          <Bars title={t('dash.chart.byStatus')} data={rows(s.by_status, (k) => t(`status.${k}`))} empty={t('sys.none')} />
          <Bars title={t('dash.chart.bySeverity')} data={rows(s.by_severity)} empty={t('sys.none')} />
          {branch === null && <Bars title={t('dash.chart.byBranch')} data={rows(s.by_branch)} empty={t('sys.none')} />}
        </div>
      </Section>

      <Section icon={<Users className="w-4 h-4" />} title={t('ops.sec.people')}>
        <div className="grid sm:grid-cols-2 gap-x-6">
          <Bars title={t('ops.byNationality')} data={rows(s.by_nationality)} empty={t('sys.none')} />
          <Bars title={t('ops.byGender')} data={rows(s.by_gender, (k) => (k === 'unspecified' ? t('ops.unspecified') : t(`report.about.gender.${k}`)))} empty={t('sys.none')} />
          <Bars title={t('ops.byAge')} data={rows(s.by_age)} empty={t('sys.none')} />
          <Bars title={t('ops.byLanguage')} data={rows(s.by_language, (k) => LANG_NAME[k] ?? k)} empty={t('sys.none')} />
          <Bars title={t('ops.bySource')} data={rows(s.by_source, (k) => t(`ops.source.${k}`))} empty={t('sys.none')} />
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" />{t('ops.ai', { n: s.ai_samples, r: s.ai_rated })}</p>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-[20px] p-4 sm:p-5 shadow-card">
      <h3 className="font-subhead text-sm font-semibold flex items-center gap-2 mb-3 text-foreground"><span className="text-primary">{icon}</span>{title}</h3>
      {children}
    </section>
  );
}

function Tile({ n, label, tone, small }: { n: number; label: string; tone?: 'primary' | 'warn' | 'danger'; small?: boolean }) {
  const c = tone === 'primary' ? 'text-primary' : tone === 'warn' ? 'text-warning' : tone === 'danger' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-2xl bg-background border border-border p-3 text-center">
      <p className={`font-mono ${small ? 'text-xl' : 'text-2xl'} font-semibold tabular-nums ${c}`}>{n}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function Bars({ title, data, empty }: { title: string; data: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      {data.length === 0 ? <p className="text-xs text-muted-foreground">{empty}</p> : (
        <div className="space-y-1.5">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <span className="text-xs w-28 truncate" title={d.label}>{d.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
              <span className="text-xs font-mono w-8 text-end tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
