import {
  CircleCheckBig,
  Timer,
  ShieldX,
  Gauge,
  PauseCircle,
  UserCheck,
  CalendarClock,
} from 'lucide-react';
import { IT_KPI_ACCENT } from '../itDesignTokens.js';

const HEALTH_PALETTE = [
  { ...IT_KPI_ACCENT.success, barColor: '#10b981', barTrack: 'bg-emerald-100/80' },
  { ...IT_KPI_ACCENT.warning, barColor: '#f59e0b', barTrack: 'bg-amber-100/80' },
  { ...IT_KPI_ACCENT.error, barColor: '#ef4444', barTrack: 'bg-red-100/80' },
  { ...IT_KPI_ACCENT.brand, barColor: '#0f6cbd', barTrack: 'bg-blue-100/90' },
  { ...IT_KPI_ACCENT.warning, barColor: '#f97316', barTrack: 'bg-orange-100/90' },
  { ...IT_KPI_ACCENT.error, barColor: '#e11d48', barTrack: 'bg-rose-100/90' },
];

/** Health monitor metrics as MIS health card props with progress bars. */
export function buildMisHealthKpiCards(metrics) {
  if (!metrics) return [];

  const {
    onTrack,
    atRisk,
    breached,
    slaCompliancePct,
    onHold,
    inApproval,
    aging,
    queueType = 'service',
    queueSecondary,
    openTotal = 0,
    openWithSla = 0,
    queueSecondaryPct,
  } = metrics;

  const total = Math.max(openTotal, 1);
  const pct = (n) => Math.round((n / total) * 100);
  const slaPct = (n) => Math.round((n / Math.max(openWithSla, 1)) * 100);
  const isCrQueue = queueType === 'cr';
  const secondaryCount = queueSecondary ?? (isCrQueue ? inApproval : onHold);
  const secondaryPct = queueSecondaryPct ?? pct(secondaryCount);

  const items = [
    {
      label: 'On Track',
      value: onTrack,
      footnote: openWithSla ? `${slaPct(onTrack)}% of ${openWithSla} with SLA` : 'No open SLA tickets',
      icon: CircleCheckBig,
      barPct: slaPct(onTrack),
      isPercent: false,
    },
    {
      label: 'At Risk',
      value: atRisk,
      footnote: openWithSla ? `${slaPct(atRisk)}% of ${openWithSla} with SLA` : 'No open SLA tickets',
      icon: Timer,
      barPct: slaPct(atRisk),
    },
    {
      label: 'SLA Breached',
      value: breached,
      footnote: openWithSla ? `${slaPct(breached)}% of ${openWithSla} with SLA` : 'No open SLA tickets',
      icon: ShieldX,
      barPct: slaPct(breached),
    },
    {
      label: 'SLA Compliance',
      value: `${slaCompliancePct ?? 0}%`,
      footnote: 'Resolved within SLA',
      icon: Gauge,
      barPct: slaCompliancePct ?? 0,
      isPercent: true,
    },
    {
      label: isCrQueue ? 'In Approval' : 'On Hold',
      value: secondaryCount,
      footnote: isCrQueue ? `${secondaryPct}% in approval` : `Across ${openTotal} open`,
      icon: isCrQueue ? UserCheck : PauseCircle,
      barPct: secondaryPct,
    },
    {
      label: 'Aging Open',
      value: aging,
      footnote: `${pct(aging)}% open > 3 days`,
      icon: CalendarClock,
      barPct: pct(aging),
    },
  ];

  return items.map((item, idx) => ({
    ...item,
    ...HEALTH_PALETTE[idx % HEALTH_PALETTE.length],
  }));
}
