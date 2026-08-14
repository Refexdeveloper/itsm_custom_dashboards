import { FolderOpen, CheckCircle2, ClockAlert } from 'lucide-react';
import { ITMisKpiStatCard } from './ITMisEmployeeUI.jsx';
import { IT_KPI_ACCENT } from '../itDesignTokens.js';
import { MIS_KPI_GRID_CLASS } from './misKpiLayout.js';

const TODAY_CARDS = [
  {
    key: 'TodayOpen',
    label: 'Today Open',
    sub: 'Opened today · still open',
    icon: FolderOpen,
    ...IT_KPI_ACCENT.brand,
  },
  {
    key: 'TodayClosed',
    label: 'Today Closed',
    sub: 'Closed today',
    icon: CheckCircle2,
    ...IT_KPI_ACCENT.success,
  },
  {
    key: 'TodaySlaBreached',
    label: 'Today SLA Breached',
    sub: 'Breached · open or closed today',
    icon: ClockAlert,
    ...IT_KPI_ACCENT.error,
  },
];

/** Three always-today snapshot cards — sit below main KPI row on IT Head. */
export default function ITTodaySnapshotCards({
  todayOpen = 0,
  todayClosed = 0,
  todaySlaBreached = 0,
  loading = false,
  activeFilterKey = '',
  onFilterChange,
}) {
  const values = {
    TodayOpen: todayOpen,
    TodayClosed: todayClosed,
    TodaySlaBreached: todaySlaBreached,
  };

  return (
    <section className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Today&apos;s snapshot
        </p>
        <p className="text-[11px] font-medium text-slate-400">
          Independent of Weekly / Monthly / FY filter
        </p>
      </div>
      <div className={`min-w-0 ${MIS_KPI_GRID_CLASS}`}>
        {TODAY_CARDS.map((card, index) => (
          <div key={card.key} className="min-h-[88px]">
            <ITMisKpiStatCard
              label={card.label}
              sub={card.sub}
              value={values[card.key] ?? 0}
              icon={card.icon}
              border={card.border}
              wash={card.wash}
              radial={card.radial}
              iconGradient={card.iconGradient}
              accent={card.accent}
              watermark={card.watermark}
              delay={0.04 + index * 0.03}
              insightRow
              loading={loading}
              active={activeFilterKey === card.key}
              onClick={onFilterChange ? () => onFilterChange(card.key) : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
