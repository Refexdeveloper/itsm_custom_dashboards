/**
 * ITSM design tokens — single source for surfaces, typography, and control sizing.
 * KPI card palette follows Project Tracker / Notification Engine.
 * Chrome (IT_BRAND) follows NE ice-blue.
 * Revert KPI colors: `export const IT_KPI_ACCENT = IT_KPI_ACCENT_CLASSIC`.
 * Revert chrome: `export const IT_BRAND = IT_BRAND_CLASSIC` and restore
 * `--it-brand*` / `--it-page-bg` in it-dashboard.css.
 */
import {
  IT_BRAND_CLASSIC,
  IT_KPI_ACCENT_CLASSIC,
  IT_EMPLOYEE_KPI_TONE_CLASSIC,
  IT_KPI_SIZE_PRIOR,
} from './itDesignTokens.classic.js';

/** Revert KPI colors: `export const IT_KPI_ACCENT = IT_KPI_ACCENT_CLASSIC`. */
/** Revert chrome: `export const IT_BRAND = IT_BRAND_CLASSIC`. */
export { IT_BRAND_CLASSIC, IT_KPI_ACCENT_CLASSIC, IT_EMPLOYEE_KPI_TONE_CLASSIC, IT_KPI_SIZE_PRIOR };
export const IT_BRAND = {
  primary: '#0f6cbd',
  primaryDark: '#0d5ea8',
  primaryDarker: '#0a4d8a',
  light: '#7eb3e8',
  soft: '#eef6ff',
  muted: '#dce8fa',
  border: '#d0e0f5',
  borderStrong: '#93c5fd',
  glow: 'rgba(15, 108, 189, 0.18)',
  /** NE ice-blue gradient surfaces */
  gradient: 'bg-gradient-to-r from-[#0f6cbd] to-[#3977BE]',
  gradientHover: 'hover:from-[#0d5ea8] hover:to-[#0a4d8a]',
  gradientBr: 'bg-gradient-to-br from-[#0f6cbd] to-[#3977BE]',
  gradientBrHover: 'hover:from-[#0d5ea8] hover:to-[#0a4d8a]',
  gradientAction: 'bg-gradient-to-r from-[#0f6cbd] to-[#3977BE]',
  gradientActionHover: 'hover:from-[#0d5ea8] hover:to-[#0a4d8a]',
  shadow: 'shadow-[#0f6cbd]/20',
};

export const IT_COLOR = {
  brand: IT_BRAND.primary,
  brandHover: IT_BRAND.primaryDark,
  brandSoft: IT_BRAND.soft,
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
};

/** ITSM ticket lifecycle — semantic status colors (soft fill, no border) */
export const IT_TICKET_STATUS = {
  open: { dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
  inProgress: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700' },
  pending: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  onHold: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' },
  resolved: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  closed: { dot: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-800' },
  cancelled: { dot: 'bg-red-400', badge: 'bg-red-50 text-red-600' },
  feedback: { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700' },
  reopened: { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700' },
  approval: { dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
};

/** SLA state semantics */
export const IT_SLA = {
  onTrack: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  atRisk: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  breached: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600' },
  hold: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' },
  none: { dot: 'bg-slate-300', badge: 'bg-slate-50 text-slate-500' },
};

/** Change / incident priority (criticality) */
export const IT_PRIORITY = {
  Critical: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600', icon: 'flame' },
  High: { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-600', icon: 'alert' },
  Medium: { dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-600', icon: 'minus' },
  Low: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-500', icon: 'arrow-down' },
};

/** Workflow step pill — borderless soft brand tint */
export const IT_STEP_BADGE = 'bg-sky-50 text-sky-800';

/** Map display status label → semantic ticket status key */
export function resolveItemStatusKey(status) {
  const token = String(status || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!token || token === '—') return null;
  if (token.includes('resolve') || token.includes('complete')) return 'resolved';
  if (token.includes('closed')) return 'closed';
  if (token.includes('cancel') || token.includes('reject')) return 'cancelled';
  if (token.includes('hold')) return 'onHold';
  if (token.includes('pending') || token.includes('waiting')) return 'pending';
  if (token.includes('progress') || token.includes('picked') || token.includes('assigned')) return 'inProgress';
  if (token.includes('reopen')) return 'reopened';
  if (token.includes('feedback') || token.includes('confirm')) return 'feedback';
  if (token.includes('approval')) return 'approval';
  if (token.includes('open') || token.includes('notpicked')) return 'open';
  return 'open';
}

export function resolveItemStatusStyle(status) {
  const key = resolveItemStatusKey(status);
  if (!key) return IT_TICKET_STATUS.open;
  return IT_TICKET_STATUS[key] || IT_TICKET_STATUS.open;
}

/**
 * Project Tracker KPI_THEME (UserSpecificPT / ProjectDashboardPage).
 * Classic teal snapshot: itDesignTokens.classic.js
 */
export const IT_KPI_ACCENT = {
  brand: {
    border: 'border-indigo-200',
    wash: 'bg-gradient-to-br from-sky-50/92 from-[14%] via-white via-[42%] to-indigo-50/72',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(43,90,237,0.18)_0%,transparent_72%)]',
    iconGradient: 'bg-[#2B5AED]/55',
    accent: 'text-[#2B5AED]',
    watermark: 'text-[#2B5AED]',
  },
  success: {
    border: 'border-emerald-200',
    wash: 'bg-gradient-to-br from-emerald-50/92 from-[14%] via-white via-[42%] to-green-50/78',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(34,197,94,0.14)_0%,transparent_72%)]',
    iconGradient: 'bg-[#22C55E]/55',
    accent: 'text-[#22C55E]',
    watermark: 'text-[#22C55E]',
  },
  warning: {
    border: 'border-orange-200',
    wash: 'bg-gradient-to-br from-amber-50/92 from-[14%] via-white via-[42%] to-orange-50/72',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(249,115,22,0.14)_0%,transparent_72%)]',
    iconGradient: 'bg-[#F97316]/55',
    accent: 'text-[#F97316]',
    watermark: 'text-[#F97316]',
  },
  error: {
    border: 'border-rose-200',
    wash: 'bg-gradient-to-br from-rose-50/92 from-[14%] via-white via-[42%] to-red-50/78',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(239,68,68,0.14)_0%,transparent_72%)]',
    iconGradient: 'bg-[#EF4444]/55',
    accent: 'text-[#EF4444]',
    watermark: 'text-[#EF4444]',
  },
  violet: {
    border: 'border-violet-200',
    wash: 'bg-gradient-to-br from-violet-50/92 from-[14%] via-white via-[42%] to-purple-50/72',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(139,92,246,0.16)_0%,transparent_72%)]',
    iconGradient: 'bg-[#8B5CF6]/55',
    accent: 'text-[#8B5CF6]',
    watermark: 'text-[#8B5CF6]',
  },
  slate: {
    border: 'border-slate-200',
    wash: 'bg-gradient-to-br from-white from-[14%] via-white via-[42%] to-slate-100/90',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(100,116,139,0.16)_0%,transparent_72%)]',
    iconGradient: 'bg-gradient-to-br from-slate-500 to-slate-600',
    accent: 'text-slate-700',
    watermark: 'text-slate-500',
  },
  cyan: {
    border: 'border-cyan-200',
    wash: 'bg-gradient-to-br from-cyan-50/92 from-[14%] via-white via-[42%] to-sky-50/75',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(0,132,173,0.16)_0%,transparent_72%)]',
    iconGradient: 'bg-[#0084AD]/55',
    accent: 'text-[#0084AD]',
    watermark: 'text-[#0084AD]',
  },
  fuchsia: {
    border: 'border-fuchsia-200',
    wash: 'bg-gradient-to-br from-fuchsia-50/92 from-[14%] via-white via-[42%] to-pink-50/72',
    radial: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(217,70,239,0.15)_0%,transparent_72%)]',
    iconGradient: 'bg-[#D946EF]/55',
    accent: 'text-[#D946EF]',
    watermark: 'text-[#D946EF]',
  },
};

/** Shared control metrics — all header/toolbar controls align to these. */
export const IT_CTRL = {
  height: 'h-9',
  minHeight: 'min-h-9',
  icon: 'h-4 w-4',
  iconSm: 'h-3.5 w-3.5',
  radius: 'rounded-lg',
  radiusMd: 'rounded-md',
  radiusPill: 'rounded-full',
  text: 'text-xs font-medium sm:text-sm',
  textSemibold: 'text-xs font-semibold sm:text-sm',
  label: 'text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600',
  gap: 'gap-1.5',
  gapToolbar: 'gap-2',
  px: 'px-3',
  transition: 'transition-colors duration-150 ease-out',
};

export const IT_SURFACE = {
  pageBg: 'bg-[var(--it-page-bg,#eef6ff)]',
  card: 'bg-white',
  border: 'border border-slate-200/90',
  borderMis: 'border border-slate-200/90',
  borderRow: 'border-slate-200',
  borderDivider: 'border-slate-200/90',
  borderB: 'border-b border-slate-200/90',
  borderBRow: 'border-b border-slate-200',
  borderT: 'border-t border-slate-200/90',
  borderInput: 'border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  borderFilter: 'border border-sky-200 bg-white shadow-[0_1px_3px_rgba(15,108,189,0.10)]',
  toolbarPrimary: 'border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
  toolbarSecondary: 'border border-slate-200 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  tableHead:
    'bg-gradient-to-b from-[#f1f5f9] to-[#e8edf2] border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600',
  tableHeadMis:
    'bg-gradient-to-b from-[#f1f5f9] to-[#e8edf2] border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600',
  sectionHead: 'bg-gradient-to-r from-white via-sky-50/30 to-indigo-50/40 border-b border-slate-200/90',
  mutedBg: 'bg-slate-50/80',
  footerBg: 'bg-slate-50/90',
  radius: 'rounded-xl',
  radiusCard: 'rounded-2xl',
  radiusPill: 'rounded-full',
  radiusTab: 'rounded-full',
  radiusBadge: 'rounded-full',
  shadow: 'shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
  shadowKpi: 'shadow-[0_1px_0_rgba(15,23,42,0.05),0_2px_8px_rgba(15,23,42,0.08),0_8px_20px_rgba(15,108,189,0.06)]',
  shadowCard: 'shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_rgba(15,23,42,0.06)]',
  shadowTable: 'shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.08),0_0_0_1px_rgba(148,163,184,0.16)]',
  shadowDialog: 'shadow-[0_24px_56px_-12px_rgba(15,23,42,0.24)]',
  shadowDropdown: 'shadow-[0_12px_32px_rgba(15,23,42,0.12),0_0_0_1px_rgba(148,163,184,0.14)]',
};

export const IT_TYPE = {
  pageTitle: 'text-lg font-semibold leading-snug tracking-tight text-slate-800 sm:text-2xl md:text-3xl',
  pageSubtitle: 'text-[11px] font-medium text-slate-500 lg:text-sm',
  entityName: 'text-xs font-medium text-slate-500 sm:text-sm',
  sectionTitle: 'text-sm font-semibold tracking-tight text-slate-800 sm:text-base',
  sectionSubtitle: 'text-xs text-slate-500 sm:text-sm',
  label: IT_CTRL.label,
  body: 'text-sm text-slate-700',
  meta: 'text-xs font-medium text-slate-500',
  kpiValue: 'font-extrabold tabular-nums leading-none tracking-tight text-slate-900 text-[22px] sm:text-[26px] lg:text-[32px]',
  kpiLabel: 'text-[13px] font-semibold leading-tight text-slate-800 sm:text-sm',
  btn: IT_CTRL.textSemibold,
};

export const IT_INTERACTION = {
  transition: IT_CTRL.transition,
  hoverRow: 'hover:bg-slate-50/90',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--it-brand)]/20 focus-visible:ring-offset-1',
};

export const IT_MOTION = {
  fadeUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.18 },
  },
  stagger: (index = 0) => ({ delay: Math.min(index * 0.03, 0.18) }),
};

/* ── Surface helpers (ref_2 vmsTheme parity) ── */

export function itSectionShell(extra = '') {
  return [
    'overflow-hidden rounded-2xl border border-slate-300/90 bg-white',
    IT_SURFACE.shadowTable,
    'lg:rounded-3xl',
    extra,
  ].filter(Boolean).join(' ');
}

export function itAccordionShell(extra = '') {
  return `overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_4px_16px_rgba(15,23,42,0.04)] ${extra}`;
}

export function itExpandPanelShell(extra = '') {
  return `relative border-t border-[var(--it-brand)]/12 bg-gradient-to-b from-[var(--it-brand-soft)]/50 via-[#f8fafc] to-white ${extra}`;
}

export function itHeaderShell(extra = '') {
  return `rounded-2xl border border-white/80 bg-white/90 px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,108,189,0.05)] backdrop-blur-md sm:px-4 sm:py-3.5 lg:rounded-3xl ${extra}`;
}

export function itAvatarGradient(extra = '') {
  return `flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${IT_BRAND.gradientBr} text-sm font-bold text-white shadow-md ${IT_BRAND.shadow} ring-2 ring-white/90 ${extra}`;
}

export function itExpandBtn(expanded = false, compact = false) {
  const size = compact ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl';
  return expanded
    ? `${size} flex shrink-0 items-center justify-center ${IT_BRAND.gradient} text-white shadow-md ${IT_BRAND.shadow} transition-colors touch-manipulation`
    : `${size} flex shrink-0 items-center justify-center border border-[var(--it-brand-border)] bg-[var(--it-brand-soft)] text-[var(--it-brand-dark)] transition-colors hover:bg-[var(--it-brand-muted)] touch-manipulation`;
}

export function itKpiCardShell(borderClass = IT_KPI_ACCENT.brand.border, extra = '') {
  return `group relative h-full min-h-[128px] overflow-hidden rounded-2xl border border-white/80 bg-white @container lg:min-h-[148px] ${IT_SURFACE.shadowKpi} ${borderClass} ${extra}`;
}

/* ── Toolbar / header control helpers (h-9 unified, pill-shaped) ── */

export function itToolbarBtnSecondary(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} ${IT_SURFACE.toolbarSecondary} ${IT_CTRL.px} text-xs font-semibold text-slate-700 sm:text-sm ${IT_CTRL.transition} hover:border-[var(--it-brand-border)] hover:bg-[var(--it-brand-soft)] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

export function itToolbarBtnPrimary(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} border-0 ${IT_BRAND.gradient} ${IT_CTRL.px} ${IT_CTRL.textSemibold} text-white shadow-md ${IT_BRAND.shadow} ${IT_CTRL.transition} ${IT_BRAND.gradientHover} disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

export function itToolbarIconBtn(extra = '') {
  return `inline-flex ${IT_CTRL.height} w-9 shrink-0 items-center justify-center ${IT_CTRL.radiusPill} ${IT_SURFACE.toolbarSecondary} text-slate-600 ${IT_CTRL.transition} hover:border-[var(--it-brand-border)] hover:bg-[var(--it-brand-soft)] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

export function itToolbarShell(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} ${IT_SURFACE.toolbarPrimary} ${IT_CTRL.px} ${IT_CTRL.text} text-slate-700 ${IT_CTRL.transition} ${extra}`;
}

export function itToolbarShellMuted(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} ${IT_SURFACE.toolbarSecondary} ${IT_CTRL.px} text-xs font-medium text-slate-500 sm:text-sm ${IT_CTRL.transition} ${extra}`;
}

export function itToolbarBadge(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.px} ${IT_CTRL.radiusPill} border border-amber-200/70 bg-amber-50/80 text-xs font-semibold text-amber-700/90 ${extra}`;
}

export function itSegmentShell(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.radiusPill} border border-slate-300 bg-slate-100 p-0.5 ${extra}`;
}

export function itSegmentBtn(active = false, extra = '') {
  const h = 'h-[calc(2.25rem-4px)]';
  const base = `inline-flex ${h} items-center px-3 sm:px-3.5 ${IT_CTRL.radiusPill} ${IT_CTRL.textSemibold} ${IT_CTRL.transition}`;
  if (active) {
    return `${base} ${IT_BRAND.gradient} text-white shadow-md ${IT_BRAND.shadow} ${extra}`;
  }
  return `${base} text-slate-600 hover:bg-[var(--it-brand-soft)] hover:text-[var(--it-brand-dark)] ${extra}`;
}

export function itToolbarSelectShell(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} ${IT_SURFACE.toolbarPrimary} pl-2.5 pr-2 ${IT_CTRL.transition} ${extra}`;
}

export function itChip(active = false, extra = '') {
  const base = `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.px} ${IT_CTRL.radiusPill} ${IT_CTRL.textSemibold} ${IT_CTRL.transition}`;
  if (active) {
    return `${base} ${IT_BRAND.gradient} text-white shadow-md ${IT_BRAND.shadow} ${extra}`;
  }
  return `${base} border border-slate-300/80 bg-slate-100 text-slate-700 hover:border-[var(--it-brand-border)] hover:bg-[var(--it-brand-soft)] hover:text-[var(--it-brand-dark)] ${extra}`;
}

/** Inline tab count — plain number beside label, no nested pill badge */
export function itTabCount(active = false, onSolid = true, extra = '') {
  const tone = onSolid
    ? (active ? 'font-bold text-white/90' : 'font-semibold text-slate-500')
    : (active ? 'font-bold text-[var(--it-brand-dark)]/80' : 'font-semibold text-slate-400');
  return `tabular-nums ${tone} ${extra}`.trim();
}

/* ── Input / select helpers ── */

export function itInput(extra = '') {
  return `w-full ${IT_CTRL.minHeight} ${IT_CTRL.radius} ${IT_SURFACE.borderInput} px-3 text-sm text-slate-800 outline-none ${IT_CTRL.transition} placeholder:text-slate-400 focus:border-[var(--it-brand)] focus:ring-2 focus:ring-[var(--it-brand)]/20 ${extra}`;
}

export function itSearchInput(extra = '') {
  return `w-full ${IT_CTRL.minHeight} ${IT_CTRL.radiusPill} ${IT_SURFACE.borderInput} pl-10 pr-3 text-sm text-slate-800 outline-none ${IT_CTRL.transition} placeholder:text-slate-400 focus:border-[var(--it-brand)] focus:ring-2 focus:ring-[var(--it-brand)]/20 ${extra}`;
}

export function itFilterSelect(extra = '') {
  return [
    IT_CTRL.minHeight,
    'it-filter-select w-full cursor-pointer appearance-none',
    IT_CTRL.radiusPill,
    IT_SURFACE.borderFilter,
    'pl-3 pr-9',
    'text-sm font-semibold text-slate-800',
    'outline-none',
    IT_CTRL.transition,
    'hover:border-[var(--it-brand-light)]',
    'focus:border-[var(--it-brand)] focus:ring-2 focus:ring-[var(--it-brand)]/20',
    'disabled:cursor-not-allowed disabled:opacity-50',
    extra,
  ].filter(Boolean).join(' ');
}

/** Table/toolbar filter dropdowns — alias kept for existing imports. */
export function itSelect(extra = '') {
  return itFilterSelect(`sm:w-auto ${extra}`);
}

/** Form / expand-panel selects — rounded-lg, neutral border. */
export function itFormSelect(extra = '') {
  return [
    'w-full',
    IT_CTRL.minHeight,
    'cursor-pointer appearance-none it-form-select',
    IT_CTRL.radius,
    IT_SURFACE.borderInput,
    'px-3 pr-9',
    'text-sm font-medium text-slate-800',
    'outline-none',
    IT_CTRL.transition,
    'focus:border-[var(--it-brand)] focus:ring-2 focus:ring-[var(--it-brand)]/20',
    'disabled:cursor-not-allowed disabled:opacity-50',
    extra,
  ].filter(Boolean).join(' ');
}

export function itClearFilterBtn(extra = '') {
  return `${itBtnSecondary(`${IT_CTRL.height} inline-flex shrink-0 items-center gap-1.5 px-3`)} ${extra}`;
}

/* ── Button helpers (forms / dialogs) ── */

export function itBtnPrimary(extra = '') {
  return `inline-flex ${IT_CTRL.minHeight} items-center justify-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} border-0 ${IT_BRAND.gradient} px-4 text-sm font-semibold text-white shadow-md ${IT_BRAND.shadow} ${IT_CTRL.transition} ${IT_BRAND.gradientHover} disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
}

export function itBtnSecondary(extra = '') {
  return `inline-flex ${IT_CTRL.minHeight} items-center justify-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 ${IT_SURFACE.shadow} ${IT_CTRL.transition} hover:border-[var(--it-brand-border)] hover:bg-[var(--it-brand-soft)] disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
}

export function itBtnGhost(extra = '') {
  return `inline-flex items-center justify-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} px-2.5 py-1.5 text-xs font-semibold text-slate-600 ${IT_CTRL.transition} hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
}

/* ── Badge helper ── */

export function itBadge(extra = '') {
  return `inline-flex items-center gap-1.5 ${IT_SURFACE.radiusBadge} px-2.5 py-1 text-[11px] font-medium leading-tight ${extra}`;
}

/** Status / priority badge with leading dot indicator */
export function itSemanticBadge(badgeClasses, dotClass, extra = '') {
  return itBadge(`${badgeClasses} ${extra}`);
}

export function itBadgeDot(dotClass) {
  return `h-2 w-2 shrink-0 rounded-full ${dotClass}`;
}

/* ── Card surfaces ── */

export function itSurface() {
  return `${IT_SURFACE.border} ${IT_SURFACE.radiusCard} ${IT_SURFACE.shadowCard}`;
}

export function itCardSurface() {
  return `${IT_SURFACE.border} ${IT_SURFACE.radiusCard} ${IT_SURFACE.card} ${IT_SURFACE.shadowCard}`;
}

export function itTableSurface() {
  return itSectionShell();
}
