import { AlertTriangle, Phone, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/i18n';
import {
  Q2_ITEM_IDS, Q9_ITEM_IDS, Q9_SCALE_IDS, q9Level, NRM_SECTIONS, NRM_UNDER18_ID,
  nrmPositive, HOTLINE_1323, SAFETY_PLAN_STEP_IDS, type ScreeningResult,
} from '@/lib/screeningTools';

export interface ScreeningDraft {
  q2: (0 | 1)[];
  q9: number[];
  nrm: Record<string, boolean[]>;
  nrmUnder18: boolean;
}

export const emptyScreening = (): ScreeningDraft => ({
  q2: [0, 0],
  q9: Array(9).fill(0),
  nrm: Object.fromEntries(NRM_SECTIONS.map((s) => [s.key, s.items.map(() => false)])),
  nrmUnder18: false,
});

export function summarizeScreening(d: ScreeningDraft): ScreeningResult {
  const q9Total = d.q9.reduce((a, b) => a + b, 0);
  return {
    q2: d.q2,
    q2Positive: d.q2.some((v) => v === 1),
    q9: d.q9,
    q9Total,
    q9Level: q9Level(q9Total).label,
    suicidalItem: d.q9[8] ?? 0,
    nrm: d.nrm,
    nrmUnder18: d.nrmUnder18,
    nrmPositive: nrmPositive(d.nrm, d.nrmUnder18),
    completedAt: new Date().toISOString(),
  };
}

export function ScreeningTools({ value, onChange, showMental = true }: { value: ScreeningDraft; onChange: (v: ScreeningDraft) => void; showMental?: boolean }) {
  const { t } = useI18n();
  const q9Total = value.q9.reduce((a, b) => a + b, 0);
  const lvl = q9Level(q9Total);
  const q2Pos = value.q2.some((v) => v === 1);
  const suicidal = (value.q9[8] ?? 0) > 0;
  const nrmPos = nrmPositive(value.nrm, value.nrmUnder18);

  const toneCls: Record<string, string> = {
    green: 'bg-success/10 text-success border-success/30',
    yellow: 'bg-warning/10 text-warning border-warning/30',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    red: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-4">
      {showMental ? (<>
      {/* 2Q */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-sm font-medium mb-1">{t('tools.q2.title')}</p>
        <p className="text-[11px] text-muted-foreground mb-3">{t('tools.q2.subtitle')}</p>
        {Q2_ITEM_IDS.map((qid, i) => (
          <div key={qid} className="flex items-start gap-3 py-2 border-b border-border/60 last:border-none">
            <p className="text-sm flex-1 leading-relaxed">{i + 1}. {t(`tools.q.${qid}`)}</p>
            <div className="flex gap-1 shrink-0">
              {([0, 1] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { const q2 = [...value.q2] as (0 | 1)[]; q2[i] = v; onChange({ ...value, q2 }); }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${value.q2[i] === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary'}`}
                >
                  {v === 1 ? t('tools.q2.yes') : t('tools.q2.no')}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className={`text-xs mt-3 px-3 py-2 rounded-lg border ${q2Pos ? toneCls.amber : toneCls.green}`}>
          {t('tools.q2.resultLabel')}: {q2Pos ? t('tools.q2.abnormal') : t('tools.q2.normal')}
        </p>
      </div>

      {/* 9Q */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-sm font-medium mb-1">{t('tools.q9.title')}</p>
        <p className="text-[11px] text-muted-foreground mb-3">{t('tools.q9.subtitle')}</p>
        {Q9_ITEM_IDS.map((qid, i) => (
          <div key={qid} className={`py-2.5 border-b border-border/60 last:border-none ${i === 8 ? 'bg-destructive/5 -mx-4 px-4 rounded-lg' : ''}`}>
            <p className="text-sm mb-2 leading-relaxed">{i + 1}. {t(`tools.q.${qid}`)}</p>
            <div className="grid grid-cols-4 gap-1">
              {Q9_SCALE_IDS.map((s) => (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => { const q9 = [...value.q9]; q9[i] = s.v; onChange({ ...value, q9 }); }}
                  className={`text-[11px] px-1 py-1.5 rounded-lg border transition ${value.q9[i] === s.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary'}`}
                >
                  {t(`tools.q9.scale.${s.id}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className={`text-xs mt-3 px-3 py-2 rounded-lg border ${toneCls[lvl.tone]}`}>
          {t('tools.q9.totalLabel')}: <strong className="tabular-nums">{q9Total}</strong> — {t(`tools.level.${lvl.id}`)}
        </div>
      </div>

      {/* Escalation protocol */}
      {suicidal && (
        <div className="border-2 border-destructive rounded-2xl p-4 bg-destructive/5">
          <p className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4" /> {t('tools.escalation.title')}
          </p>
          <a
            href={`tel:${HOTLINE_1323.tel}`}
            className="flex items-center justify-center gap-2 w-full bg-destructive text-destructive-foreground rounded-xl py-3 font-medium mb-3"
          >
            <Phone className="w-4 h-4" /> {t('tools.escalation.call')} {t('tools.escalation.hotlineName')}
          </a>
          <p className="text-[11px] text-muted-foreground mb-2">{t('tools.escalation.hotlineNote')}</p>
          <p className="text-xs font-medium mb-1">{t('tools.escalation.safetyPlanTitle')}</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside leading-relaxed">
            {SAFETY_PLAN_STEP_IDS.map((sid) => <li key={sid}>{t(`tools.q.${sid}`)}</li>)}
          </ol>
        </div>
      )}

      </>) : (
        <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">{t('intake.assess.mentalHint')}</p>
      )}
      {/* NRM */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-sm font-medium mb-1">{t('tools.nrm.title')}</p>
        <p className="text-[11px] text-muted-foreground mb-3">{t('tools.nrm.subtitle')}</p>
        {NRM_SECTIONS.map((s) => (
          <div key={s.key} className="mb-3">
            <p className="text-xs font-medium text-primary mb-1.5">{t(s.titleId)}</p>
            {s.items.map((itemId, i) => (
              <label key={itemId} className="flex items-start gap-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.nrm[s.key]?.[i] ?? false}
                  onChange={(e) => {
                    const arr = [...(value.nrm[s.key] || s.items.map(() => false))];
                    arr[i] = e.target.checked;
                    onChange({ ...value, nrm: { ...value.nrm, [s.key]: arr } });
                  }}
                  className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                />
                <span className="text-sm leading-relaxed">{t(`tools.q.${itemId}`)}</span>
              </label>
            ))}
          </div>
        ))}
        <label className="flex items-center gap-2.5 py-1.5 cursor-pointer border-t border-border pt-3">
          <input
            type="checkbox"
            checked={value.nrmUnder18}
            onChange={(e) => onChange({ ...value, nrmUnder18: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm font-medium">{t(NRM_UNDER18_ID)}</span>
        </label>
        <p className={`text-xs mt-3 px-3 py-2 rounded-lg border ${nrmPos ? toneCls.red : toneCls.green}`}>
          {t('tools.nrm.resultLabel')}: {nrmPos ? t('tools.nrm.positive') : t('tools.nrm.negative')}
        </p>
        {value.nrmUnder18 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {t('tools.nrm.minorNote')}
          </p>
        )}
      </div>
    </div>
  );
}
