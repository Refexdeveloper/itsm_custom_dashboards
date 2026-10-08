import {
  MIS_CENTER_KPI_SLOT,
} from './misDonutLayout.js';
import {
  MIS_INSIGHT_CARD_HEIGHT_CLASS,
  MIS_INSIGHT_CARD_HEIGHT_COMPACT_CLASS,
  kpiStripClass,
  misKpiGridForCount,
  useKpiStripWide,
} from './misKpiLayout.js';
import {
  buildMisCenterDonutKpiCards,
  buildMisRefexCenterDonutKpiCards,
} from './buildMisCenterDonutKpiCards.js';
import { ITMisKpiStatCard } from './ITMisEmployeeUI.jsx';

function KpiSlot({ card, delay, loading = false, active = false, onClick, compact = false }) {
  return (
    <div className={`${MIS_CENTER_KPI_SLOT} ${compact ? MIS_INSIGHT_CARD_HEIGHT_COMPACT_CLASS : MIS_INSIGHT_CARD_HEIGHT_CLASS}`}>
      <ITMisKpiStatCard
        {...card}
        delay={delay}
        insightRow
        compact={compact}
        loading={loading}
        active={active}
        onClick={onClick}
      />
    </div>
  );
}

/**
 * Shared KPI strip for Refex + Extrovis modern dashboards.
 * No donut charts — Extrovis previously rendered dual graphs under KPIs.
 */
export default function ITMisCenterDonutInsightRow({
  insightMetrics = {},
  activeQueue,
  queuePendingCounts,
  slaKpis = {},
  refexLayout = false,
  refexCenterMetrics = null,
  loading = false,
  activeFilterKey = '',
  onFilterChange,
  compactKpiCards = true,
}) {
  const [stripRef, stripWide] = useKpiStripWide();
  const refexBuilt = refexCenterMetrics
    ? buildMisRefexCenterDonutKpiCards(refexCenterMetrics)
    : null;
  const fallbackBuilt = !refexBuilt
    ? buildMisCenterDonutKpiCards({
      queueType: activeQueue === 'ChangeRequests' ? 'cr' : 'service',
      activeQueue,
      queuePendingCounts,
      sla: slaKpis,
      ...insightMetrics,
    })
    : null;

  const kpiCards = refexBuilt?.kpiCards
    || [
      ...(fallbackBuilt?.leftCards || []),
      ...(fallbackBuilt?.rightCards || []),
    ];

  let delayIndex = 0;
  const nextDelay = () => {
    const delay = 0.04 + delayIndex * 0.03;
    delayIndex += 1;
    return delay;
  };

  // Always KPI strip only for modern Refex/Extrovis layout — never show a donut.
  if (refexLayout || refexCenterMetrics) {
    return (
      <section ref={stripRef} className={kpiStripClass(stripWide, 'space-y-3')}>
        <div className={`min-w-0 ${misKpiGridForCount(kpiCards.length)}`}>
          {kpiCards.map((card) => (
            <KpiSlot
              key={card.filterKey || card.label}
              card={card}
              delay={nextDelay()}
              loading={loading}
              active={activeFilterKey === card.filterKey}
              compact={compactKpiCards}
              onClick={onFilterChange && card.filterKey
                ? () => onFilterChange(card.filterKey)
                : undefined}
            />
          ))}
        </div>
      </section>
    );
  }

  // Legacy non-refex insight path — still KPI-only (no donut).
  const { leftCards = [], rightCards = [] } = fallbackBuilt || {};
  return (
    <section ref={stripRef} className={kpiStripClass(stripWide, 'px-3 py-3 sm:px-6 sm:py-4')}>
      <div className={`mx-auto min-w-0 max-w-[1400px] ${misKpiGridForCount(leftCards.length + rightCards.length)}`}>
        {[...leftCards, ...rightCards].map((card) => (
          <KpiSlot key={card.label} card={card} delay={nextDelay()} loading={loading} />
        ))}
      </div>
    </section>
  );
}
