import {
  MIS_CENTER_DONUT_SPAN,
  MIS_CENTER_INSIGHT_GRID,
  MIS_CENTER_KPI_SLOT,
} from './misDonutLayout.js';
import { MIS_INSIGHT_CARD_HEIGHT_CLASS, MIS_KPI_GRID_CLASS } from './misKpiLayout.js';
import {
  buildMisCenterDonutKpiCards,
  buildMisRefexCenterDonutKpiCards,
  resolveMisDonutDistribution,
  resolveMisDonutChartSet,
  resolveMisDonutCenterLabel,
  resolveMisDonutCardTitle,
  mapDonutSegments,
} from './buildMisCenterDonutKpiCards.js';
import { ITMisKpiStatCard } from './ITMisEmployeeUI.jsx';
import ITMisDonutCard from './ITMisDonutCard.jsx';

function KpiSlot({ card, delay, loading = false, active = false, onClick }) {
  return (
    <div className={`${MIS_CENTER_KPI_SLOT} ${MIS_INSIGHT_CARD_HEIGHT_CLASS}`}>
      <ITMisKpiStatCard
        {...card}
        delay={delay}
        insightRow
        loading={loading}
        active={active}
        onClick={onClick}
      />
    </div>
  );
}

function DonutPanel({
  distribution,
  activeQueue,
  delay,
  loading = false,
}) {
  if (!distribution) return null;
  const segments = mapDonutSegments(distribution.data || [], distribution.type);
  const cardTitle = resolveMisDonutCardTitle(distribution.title, activeQueue);
  const centerLabel = resolveMisDonutCenterLabel({
    activeQueue,
    distributionTitle: distribution.title,
  });
  return (
    <div className={`${MIS_CENTER_KPI_SLOT} ${MIS_INSIGHT_CARD_HEIGHT_CLASS} min-h-[9.5rem]`}>
      <ITMisDonutCard
        title={cardTitle}
        centerLabel={centerLabel}
        centerTotal={distribution.centerTotal ?? 0}
        segments={segments}
        delay={delay}
        insightRow
        loading={loading}
      />
    </div>
  );
}

/** Insight row: KPI strip; optional dual donut charts (Extrovis Agent / First / Final only). */
export default function ITMisCenterDonutInsightRow({
  insightMetrics = {},
  activeQueue,
  queuePendingCounts,
  slaKpis = {},
  donutContext = {},
  refexLayout = false,
  refexCenterMetrics = null,
  /** Extrovis Agent / First / Final — show status + priority/category donuts under KPIs. */
  showGraphCharts = false,
  loading = false,
  activeFilterKey = '',
  onFilterChange,
}) {
  const refexBuilt = refexCenterMetrics
    ? buildMisRefexCenterDonutKpiCards(refexCenterMetrics)
    : null;
  const { leftCards, rightCards } = refexBuilt
    ? refexBuilt
    : buildMisCenterDonutKpiCards({
      queueType: activeQueue === 'ChangeRequests' ? 'cr' : 'service',
      activeQueue,
      queuePendingCounts,
      sla: slaKpis,
      ...insightMetrics,
    });
  const refexKpiCards = refexBuilt?.kpiCards || [];

  const chartContext = {
    ...donutContext,
    activeQueue,
    slaKpis,
  };
  const distribution = resolveMisDonutDistribution(chartContext);
  const chartSet = resolveMisDonutChartSet(chartContext, { limit: 2 });
  const segments = mapDonutSegments(distribution.data, distribution.type);
  const cardTitle = resolveMisDonutCardTitle(distribution.title, activeQueue);
  const centerLabel = resolveMisDonutCenterLabel({
    activeQueue,
    distributionTitle: distribution.title,
  });

  let delayIndex = 0;
  const nextDelay = () => {
    const delay = 0.04 + delayIndex * 0.03;
    delayIndex += 1;
    return delay;
  };

  if (refexLayout && refexCenterMetrics) {
    return (
      <section className="min-w-0 space-y-3 overflow-x-hidden">
        <div className={`min-w-0 ${MIS_KPI_GRID_CLASS}`}>
          {refexKpiCards.map((card) => (
            <KpiSlot
              key={card.filterKey || card.label}
              card={card}
              delay={nextDelay()}
              loading={loading}
              active={activeFilterKey === card.filterKey}
              onClick={onFilterChange && card.filterKey
                ? () => onFilterChange(card.filterKey)
                : undefined}
            />
          ))}
        </div>
        {showGraphCharts ? (
          <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2">
            {(chartSet.length
              ? chartSet
              : [
                {
                  type: 'status',
                  title: activeQueue === 'ChangeRequests' ? 'Change Request Status' : 'Ticket Status',
                  data: [],
                  centerTotal: 0,
                },
                {
                  type: 'priority',
                  title: activeQueue === 'ChangeRequests' ? 'Criticality Distribution' : 'Priority Distribution',
                  data: [],
                  centerTotal: 0,
                },
              ]
            ).map((chart) => (
              <DonutPanel
                key={chart.type}
                distribution={chart}
                activeQueue={activeQueue}
                delay={nextDelay()}
                loading={loading}
              />
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={refexLayout ? 'min-w-0 overflow-x-hidden' : 'min-w-0 overflow-x-hidden px-3 py-3 sm:px-6 sm:py-4'}>
      <div className={`min-w-0 ${refexLayout ? '' : 'mx-auto max-w-[1400px]'} ${MIS_CENTER_INSIGHT_GRID}`}>
        {leftCards.map((card) => (
          <KpiSlot key={card.label} card={card} delay={nextDelay()} loading={loading} />
        ))}
        <div className={`${MIS_CENTER_DONUT_SPAN} ${MIS_CENTER_KPI_SLOT} ${MIS_INSIGHT_CARD_HEIGHT_CLASS}`}>
          <ITMisDonutCard
            title={cardTitle}
            centerLabel={centerLabel}
            centerTotal={distribution.centerTotal}
            segments={segments}
            delay={nextDelay()}
            insightRow
            loading={loading}
          />
        </div>
        {rightCards.map((card) => (
          <KpiSlot key={card.label} card={card} delay={nextDelay()} loading={loading} />
        ))}
      </div>
    </section>
  );
}
