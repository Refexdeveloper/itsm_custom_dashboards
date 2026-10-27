/** ITSM Health Monitor — horizontal SLA health strip (IT Head standard design). */
import ITMisHealthCard from './mis/ITMisHealthCard.jsx';
import { MIS_HEALTH_MONITOR_GRID } from './mis/misKpiLayout.js';
import { buildMisHealthKpiCards } from './mis/buildMisHealthKpiCards.js';

export default function ITSMHealthMonitor({ metrics, className = '' }) {
  if (!metrics) return null;

  const cards = buildMisHealthKpiCards(metrics);
  if (!cards.length) return null;

  return (
    <section className={`min-w-0 ${className}`} aria-label="Health Monitor">
      <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 sm:text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--it-brand)]" aria-hidden />
        Health Monitor
      </p>
      <div className={`mx-auto min-w-0 ${MIS_HEALTH_MONITOR_GRID}`}>
        {cards.map((card, idx) => (
          <div key={card.label} className="h-full min-w-0">
            <ITMisHealthCard {...card} delay={0.04 + idx * 0.03} />
          </div>
        ))}
      </div>
    </section>
  );
}
