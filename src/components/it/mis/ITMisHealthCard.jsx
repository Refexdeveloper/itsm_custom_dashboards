import { motion } from 'framer-motion';
import { useCountUp } from '../ITDashboardUI.jsx';
import { IT_TYPE, IT_KPI_ACCENT, IT_SURFACE } from '../itDesignTokens.js';

function ProgressBar({ pct, color, trackClass, delay = 0 }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full ${trackClass}`}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-[#0d9488] to-[#2dd4bf]"
        style={color ? { background: color } : undefined}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
      />
    </div>
  );
}

/** Health monitor metric card — enterprise KPI layout with progress bar. */
export default function ITMisHealthCard({
  label,
  value,
  footnote,
  icon: Icon,
  border,
  wash,
  radial,
  iconGradient,
  accent,
  watermark,
  barPct = 0,
  barColor,
  barTrack,
  delay = 0,
  isPercent = false,
}) {
  const isTextValue = typeof value === 'string' && (String(value).includes('%') || String(value).includes(' ') || value === '—');
  const numeric = isPercent ? parseInt(String(value).replace('%', ''), 10) : value;
  const animated = useCountUp(isTextValue && !isPercent ? 0 : numeric);
  const displayValue = isTextValue ? value : (isPercent ? `${animated}%` : animated);

  const cardBorder = border || IT_KPI_ACCENT.brand.border;
  const cardWash = wash || IT_KPI_ACCENT.brand.wash;
  const cardRadial = radial || IT_KPI_ACCENT.brand.radial;
  const cardIconGradient = iconGradient || IT_KPI_ACCENT.brand.iconGradient;
  const valueClass = accent || IT_KPI_ACCENT.brand.accent;
  const watermarkClass = watermark || IT_KPI_ACCENT.brand.watermark;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative h-full min-h-[112px] overflow-hidden rounded-2xl border bg-white it-kpi-card lg:min-h-[168px] ${IT_SURFACE.shadowKpi} ${cardBorder}`}
    >
      <span aria-hidden className={`pointer-events-none absolute inset-0 ${cardWash}`} />
      <span aria-hidden className={`pointer-events-none absolute inset-0 opacity-[0.82] ${cardRadial}`} />
      <span aria-hidden className={`pointer-events-none absolute bottom-1 right-1 opacity-[0.13] ${watermarkClass}`}>
        <Icon className="h-12 w-12 md:h-14 md:w-14" strokeWidth={1.25} />
      </span>
      <div className="relative z-10 flex h-full flex-col p-3 sm:p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ${cardIconGradient}`}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <p className={`text-lg font-bold tabular-nums leading-none sm:text-xl ${valueClass}`}>{displayValue}</p>
        </div>
        <p className={`mt-2 truncate ${IT_TYPE.kpiLabel}`}>{label}</p>
        <div className="mt-1.5">
          <ProgressBar pct={barPct} color={barColor} trackClass={barTrack || 'bg-slate-100/80'} delay={delay + 0.08} />
        </div>
        {footnote ? (
          <p className="mt-1 truncate text-[10px] font-medium text-slate-500 sm:text-[11px]">{footnote}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
