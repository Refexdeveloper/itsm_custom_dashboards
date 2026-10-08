import { motion } from 'framer-motion';
import { useCountUp } from '../ITDashboardUI.jsx';
import { IT_TYPE, IT_SURFACE, IT_KPI_ACCENT } from '../itDesignTokens.js';

const DONUT_SIZE_DEFAULT = 'h-[5.25rem] w-[5.25rem] sm:h-[6.125rem] sm:w-[6.125rem]';
const DONUT_SIZE_INSIGHT = 'h-[3.75rem] w-[3.75rem] sm:h-[4rem] sm:w-[4rem]';

function DonutRing({ segments, className = DONUT_SIZE_DEFAULT }) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const viewBox = 100;
  const cx = 50;
  const cy = 50;
  const stroke = 7;
  const r = 39.5;

  if (!total) {
    return (
      <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className={className} aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
      </svg>
    );
  }

  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className={className} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
      {segments.map((seg) => {
        const fraction = seg.value / total;
        const dash = fraction * circumference;
        const circle = (
          <circle
            key={seg.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return circle;
      })}
    </svg>
  );
}

function DonutLegendList({ items, compact = false, multiColumn = false }) {
  const listClass = multiColumn
    ? 'grid min-h-0 grid-cols-2 gap-x-3 gap-y-1'
    : compact
      ? 'min-h-0 space-y-1'
      : 'flex min-h-0 flex-1 flex-col justify-center gap-y-0.5';
  const textClass = compact
    ? 'text-[10px] leading-snug text-slate-600'
    : 'text-[10px] leading-tight text-slate-600 sm:text-[11px]';

  return (
    <ul className={listClass}>
      {items.map((segment) => (
        <li
          key={segment.label}
          className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1.5 ${textClass}`}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2"
            style={{ backgroundColor: segment.color }}
            aria-hidden
          />
          <span className="break-words leading-snug">{segment.label}</span>
          <span className="shrink-0 tabular-nums font-semibold text-slate-800">{segment.value}</span>
        </li>
      ))}
    </ul>
  );
}

function DonutSummaryPanel({ items, totalLabel, total, animatedTotal, compact = false, multiColumn = false }) {
  const hasItems = items.length > 0;

  if (compact) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center py-0.5">
        {hasItems ? (
          <DonutLegendList items={items} compact multiColumn={multiColumn} />
        ) : (
          <p className="text-[10px] text-slate-500">No data yet</p>
        )}
        {hasItems ? (
          <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-1.5 text-[10px]">
            <span className="font-semibold text-slate-600">{totalLabel}</span>
            <span className="shrink-0 tabular-nums text-sm font-bold leading-none text-slate-800">
              {total ? animatedTotal : '—'}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-center gap-1">
      {hasItems ? (
        <DonutLegendList items={items} multiColumn={multiColumn} />
      ) : (
        <p className="text-[10px] text-slate-500 sm:text-[11px]">No distribution data yet</p>
      )}

      {hasItems ? (
        <>
          <div className="h-px w-full shrink-0 bg-slate-200/80" aria-hidden />
          <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-[10px] sm:text-[11px]">
            <span className="font-semibold text-slate-700">{totalLabel}</span>
            <span className="shrink-0 tabular-nums text-sm font-bold text-[#172B4D] sm:text-base">
              {total ? animatedTotal : '—'}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Enterprise donut + summary card — aligns with KPI row height when insightRow is set.
 */
export default function ITMisDonutCard({
  title = 'Ticket status',
  centerLabel = 'Total tickets',
  centerTotal = null,
  segments = [],
  delay = 0,
  insightRow = false,
  loading = false,
}) {
  const activeSegments = segments.filter((segment) => segment.value > 0);
  const segmentTotal = activeSegments.reduce((sum, segment) => sum + segment.value, 0);
  const total = centerTotal != null && centerTotal > 0 ? centerTotal : segmentTotal;
  const animatedTotal = useCountUp(total, 900, { frozen: loading });
  const displayTotal = loading ? 0 : (total ? animatedTotal : '—');
  const donutSize = insightRow ? DONUT_SIZE_INSIGHT : DONUT_SIZE_DEFAULT;
  const accent = IT_KPI_ACCENT.brand;
  const multiColumnLegend = activeSegments.length > 4;

  if (insightRow) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={`relative flex h-full min-h-0 w-full min-w-0 rounded-2xl border bg-white it-kpi-card ${accent.border} ${IT_SURFACE.shadowKpi}`}
      >
        <span aria-hidden className={`pointer-events-none absolute inset-0 ${accent.wash}`} />
        <span aria-hidden className={`pointer-events-none absolute inset-0 opacity-[0.82] ${accent.radial}`} />
        <div className={`relative z-10 flex h-full min-h-0 w-full gap-2 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5 ${
          multiColumnLegend ? 'flex-col sm:flex-row sm:items-center' : 'items-center'
        }`}>
          <div className={`flex min-w-0 shrink-0 flex-col justify-center ${multiColumnLegend ? 'sm:flex-[0.34]' : 'flex-[0.42] sm:flex-[0.38]'}`}>
            <p className={`leading-tight ${IT_TYPE.kpiLabel}`}>{title}</p>
            <div className="relative mx-auto mt-1 flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center sm:mx-0 sm:h-[4rem] sm:w-[4rem]">
              <DonutRing segments={activeSegments} className={`${donutSize} max-h-full max-w-full`} />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold tabular-nums leading-none text-[#0d9488]">
                  {displayTotal}
                </span>
              </div>
            </div>
          </div>
          {!multiColumnLegend ? (
            <div className="mx-0.5 w-px shrink-0 self-stretch bg-slate-200/80" aria-hidden />
          ) : null}
          <DonutSummaryPanel
            items={activeSegments}
            totalLabel={centerLabel}
            total={total}
            animatedTotal={displayTotal}
            compact
            multiColumn={multiColumnLegend}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#2dd4bf] bg-white ${IT_SURFACE.shadowKpi}`}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-[#ccfbf1]/75" />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(155%_118%_at_88%_88%,rgba(13, 148, 136,0.22)_0%,transparent_72%)] opacity-80" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col max-md:gap-1.5 md:flex-row md:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-[1.55] flex-col justify-center border-slate-200/80 px-2.5 py-2 max-md:border-b max-md:pb-2 md:border-r md:px-3 md:py-2.5">
          <p className={`mb-1 truncate text-center md:text-left ${IT_TYPE.kpiLabel}`}>
            {title}
          </p>
          <div className="flex flex-1 items-center justify-center">
            <div className="relative flex shrink-0 items-center justify-center">
              <DonutRing segments={activeSegments} className={donutSize} />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-1.5 text-center">
                <span className={`text-base font-bold tabular-nums leading-none sm:text-lg ${IT_TYPE.kpiValue} text-[#0d9488]`}>
                  {displayTotal}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center px-2.5 py-2 md:px-3 md:py-2.5">
          <DonutSummaryPanel
            items={activeSegments}
            totalLabel={centerLabel}
            total={total}
            animatedTotal={displayTotal}
            multiColumn={activeSegments.length > 4}
          />
        </div>
      </div>
    </motion.div>
  );
}
