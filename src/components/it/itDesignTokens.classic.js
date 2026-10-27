/**
 * CLASSIC ITSM theme snapshots.
 * Revert KPI colors: in itDesignTokens.js set `export const IT_KPI_ACCENT = IT_KPI_ACCENT_CLASSIC`.
 * Revert chrome (teal): in itDesignTokens.js set `export const IT_BRAND = IT_BRAND_CLASSIC`
 *   and restore `--it-brand*` / `--it-page-bg` in it-dashboard.css to the values below.
 * Revert size: MIS_INSIGHT_CARD_HEIGHT / itKpiCardShell → min-h-[112px] lg:min-h-[132px]
 *   and IT_TYPE.kpiValue → text-[24px] sm:text-[32px]
 * Prior KPI size (pre-NE 128/148): IT_KPI_SIZE_PRIOR — min-h-[96px] lg:min-h-[120px],
 *   value text-[22px] / label 9px–11px uppercase.
 */

/** Last live KPI card size + type before NE EmbedKpiCard (2026-10-22). */
export const IT_KPI_SIZE_PRIOR = {
  shell: 'min-h-[96px] lg:min-h-[120px] p-2.5 sm:p-3',
  kpiValue: 'text-[22px] font-bold tabular-nums leading-none tracking-tight @[9.5rem]:text-[24px] @[17rem]:text-4xl',
  kpiLabel: 'text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-[11px] sm:tracking-[0.14em]',
  iconBox: 'h-8 w-8 rounded-[10px] sm:h-9 sm:w-9 sm:rounded-[11px]',
  icon: 'h-3.5 w-3.5 sm:h-4 sm:w-4',
};

/** Teal chrome before NE ice-blue (2026-10-22). */
export const IT_BRAND_CLASSIC = {
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryDarker: '#047857',
  light: '#2dd4bf',
  soft: '#f0fdfa',
  muted: '#ccfbf1',
  border: '#99f6e4',
  borderStrong: '#5eead4',
  glow: 'rgba(13, 148, 136, 0.18)',
  gradient: 'bg-gradient-to-r from-[#0d9488] to-[#059669]',
  gradientHover: 'hover:from-[#0f766e] hover:to-[#047857]',
  gradientBr: 'bg-gradient-to-br from-[#0d9488] to-[#059669]',
  gradientBrHover: 'hover:from-[#0f766e] hover:to-[#047857]',
  gradientAction: 'bg-gradient-to-r from-[#0d9488] to-[#059669]',
  gradientActionHover: 'hover:from-[#0f766e] hover:to-[#047857]',
  shadow: 'shadow-[#0d9488]/20',
};
/** Pre-PT employee dashboard KPI_TONE (RefexEmployeeDashboard). */
export const IT_EMPLOYEE_KPI_TONE_CLASSIC = {
  blue: {
    modernBg: 'from-sky-50/90 via-white to-indigo-50/70',
    accent: 'text-[#2B5AED]',
    ring: 'ring-sky-500/15',
    iconColor: 'text-[#0d9488]',
    iconBg: 'bg-[#0d9488]',
    text: 'text-[#047857]',
  },
  green: {
    modernBg: 'from-[#f0fdfa]/90 via-white to-[#f0fdfa]/70',
    accent: 'text-[#22C55E]',
    ring: 'ring-emerald-500/15',
    iconColor: 'text-[#43A047]',
    iconBg: 'bg-[#107C10]',
    text: 'text-[#216E4E]',
  },
  orange: {
    modernBg: 'from-orange-50/90 via-white to-amber-50/70',
    accent: 'text-[#FB8C00]',
    ring: 'ring-orange-500/15',
    iconColor: 'text-[#FB8C00]',
    iconBg: 'bg-[#E56910]',
    text: 'text-[#7F5F01]',
  },
  red: {
    modernBg: 'from-rose-50/90 via-white to-red-50/70',
    accent: 'text-[#E53935]',
    ring: 'ring-red-500/15',
    iconColor: 'text-[#E53935]',
    iconBg: 'bg-[#D13438]',
    text: 'text-[#AE2A19]',
  },
  violet: {
    modernBg: 'from-violet-50/90 via-white to-purple-50/70',
    accent: 'text-[#8B5CF6]',
    ring: 'ring-violet-500/15',
    iconColor: 'text-[#8B5CF6]',
    iconBg: 'bg-[#8B5CF6]',
    text: 'text-[#6D28D9]',
  },
};

export const IT_KPI_ACCENT_CLASSIC = {
  brand: {
    border: 'border-teal-200',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-teal-50/80',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(13,148,136,0.20)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-[#0d9488] to-[#059669]',
    accent: 'text-[#0f766e]',
    watermark: 'text-[#0d9488]',
  },
  success: {
    border: 'border-emerald-300',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-emerald-50/90',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(16,185,129,0.18)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    accent: 'text-emerald-700',
    watermark: 'text-emerald-500',
  },
  warning: {
    border: 'border-amber-300',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-amber-50/85',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(245,158,11,0.20)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
    accent: 'text-amber-700',
    watermark: 'text-amber-500',
  },
  error: {
    border: 'border-red-300',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-red-50/90',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(239,68,68,0.18)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-red-500 to-red-600',
    accent: 'text-red-700',
    watermark: 'text-red-500',
  },
  violet: {
    border: 'border-violet-300',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-violet-50/85',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(139,92,246,0.18)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-violet-500 to-violet-600',
    accent: 'text-violet-700',
    watermark: 'text-violet-500',
  },
  slate: {
    border: 'border-slate-300',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-slate-100/90',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(100,116,139,0.16)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-slate-500 to-slate-600',
    accent: 'text-slate-700',
    watermark: 'text-slate-500',
  },
  cyan: {
    border: 'border-cyan-300',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-cyan-50/85',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(6,182,212,0.18)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    accent: 'text-cyan-700',
    watermark: 'text-cyan-500',
  },
  fuchsia: {
    border: 'border-fuchsia-300',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-fuchsia-50/85',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(192,38,211,0.18)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
    accent: 'text-fuchsia-700',
    watermark: 'text-fuchsia-500',
  },
};
