/**
 * ITSM design tokens — single source for surfaces, typography, and control sizing.
 * Enterprise IT Service Management palette (ServiceNow / Jira SM / Freshservice inspired).
 */
export const IT_BRAND = {
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryDarker: '#047857',
  light: '#2dd4bf',
  soft: '#f0fdfa',
  muted: '#ccfbf1',
  border: '#99f6e4',
  borderStrong: '#5eead4',
  glow: 'rgba(13, 148, 136, 0.18)',
  /** Teal → emerald gradient surfaces */
  gradient: 'bg-gradient-to-r from-[#0d9488] to-[#059669]',
  gradientHover: 'hover:from-[#0f766e] hover:to-[#047857]',
  gradientBr: 'bg-gradient-to-br from-[#0d9488] to-[#059669]',
  gradientBrHover: 'hover:from-[#0f766e] hover:to-[#047857]',
  gradientAction: 'bg-gradient-to-r from-[#0d9488] to-[#059669]',
  gradientActionHover: 'hover:from-[#0f766e] hover:to-[#047857]',
  shadow: 'shadow-[#0d9488]/20',
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
export const IT_STEP_BADGE = 'bg-teal-50 text-teal-800';

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

/** Enterprise KPI card accent presets — mirrors ref_2 enterpriseSurfaces.js */
export const IT_KPI_ACCENT = {
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
  pageBg: 'bg-[#f6f7f9]',
  card: 'bg-white',
  border: 'border border-slate-200/90',
  borderMis: 'border border-slate-200/90',
  borderRow: 'border-slate-200',
  borderDivider: 'border-slate-200/90',
  borderB: 'border-b border-slate-200/90',
  borderBRow: 'border-b border-slate-200',
  borderT: 'border-t border-slate-200/90',
  borderInput: 'border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  borderFilter: 'border border-teal-200 bg-white shadow-[0_1px_3px_rgba(13,148,136,0.10)]',
  toolbarPrimary: 'border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
  toolbarSecondary: 'border border-slate-200 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  tableHead:
    'bg-gradient-to-b from-[#f1f5f9] to-[#e8edf2] border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600',
  tableHeadMis:
    'bg-gradient-to-b from-[#f1f5f9] to-[#e8edf2] border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600',
  sectionHead: 'bg-gradient-to-r from-white via-teal-50/30 to-emerald-50/40 border-b border-slate-200/90',
  mutedBg: 'bg-slate-50/80',
  footerBg: 'bg-slate-50/90',
  radius: 'rounded-xl',
  radiusCard: 'rounded-2xl',
  radiusPill: 'rounded-full',
  radiusTab: 'rounded-full',
  radiusBadge: 'rounded-full',
  shadow: 'shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
  shadowKpi: 'shadow-[0_1px_0_rgba(15,23,42,0.05),0_2px_8px_rgba(15,23,42,0.08),0_8px_20px_rgba(13,148,136,0.06)]',
  shadowCard: 'shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_rgba(15,23,42,0.06)]',
  shadowTable: 'shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.08),0_0_0_1px_rgba(148,163,184,0.16)]',
  shadowDialog: 'shadow-[0_24px_56px_-12px_rgba(15,23,42,0.24)]',
  shadowDropdown: 'shadow-[0_12px_32px_rgba(15,23,42,0.12),0_0_0_1px_rgba(148,163,184,0.14)]',
};

export const IT_TYPE = {
  pageTitle: 'text-base font-semibold tracking-tight text-slate-800 sm:text-lg',
  pageSubtitle: 'text-xs font-medium text-slate-500 sm:text-sm',
  entityName: 'text-xs font-medium text-slate-500 sm:text-sm',
  sectionTitle: 'text-sm font-semibold tracking-tight text-slate-800 sm:text-base',
  sectionSubtitle: 'text-xs text-slate-500 sm:text-sm',
  label: IT_CTRL.label,
  body: 'text-sm text-slate-700',
  meta: 'text-xs font-medium text-slate-500',
  kpiValue: 'text-3xl font-bold tabular-nums tracking-tight sm:text-4xl',
  kpiLabel: 'text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 sm:text-[11px]',
  btn: IT_CTRL.textSemibold,
};

export const IT_INTERACTION = {
  transition: IT_CTRL.transition,
  hoverRow: 'hover:bg-slate-50/90',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/20 focus-visible:ring-offset-1',
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
  return `relative border-t border-[#0d9488]/12 bg-gradient-to-b from-[#f0fdfa]/50 via-[#f8fafc] to-white ${extra}`;
}

export function itHeaderShell(extra = '') {
  return `rounded-2xl border border-white/80 bg-white/90 px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(13,148,136,0.05)] backdrop-blur-md sm:px-4 sm:py-3.5 lg:rounded-3xl ${extra}`;
}

export function itAvatarGradient(extra = '') {
  return `flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0d9488] via-[#0d9488] to-[#059669] text-sm font-bold text-white shadow-md shadow-[#0d9488]/25 ring-2 ring-white/90 ${extra}`;
}

export function itExpandBtn(expanded = false, compact = false) {
  const size = compact ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl';
  return expanded
    ? `${size} flex shrink-0 items-center justify-center bg-gradient-to-r from-[#0d9488] to-[#059669] text-white shadow-md shadow-[#0d9488]/20 transition-colors touch-manipulation`
    : `${size} flex shrink-0 items-center justify-center border border-[#99f6e4] bg-[#f0fdfa] text-[#0f766e] transition-colors hover:bg-[#ccfbf1] touch-manipulation`;
}

export function itKpiCardShell(borderClass = IT_KPI_ACCENT.brand.border, extra = '') {
  return `group relative min-h-[96px] overflow-hidden rounded-2xl border bg-white md:min-h-[108px] ${IT_SURFACE.shadowKpi} ${borderClass} ${extra}`;
}

/* ── Toolbar / header control helpers (h-9 unified, pill-shaped) ── */

export function itToolbarBtnSecondary(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} ${IT_SURFACE.toolbarSecondary} ${IT_CTRL.px} text-xs font-semibold text-slate-700 sm:text-sm ${IT_CTRL.transition} hover:border-[#99f6e4] hover:bg-[#f0fdfa] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

export function itToolbarBtnPrimary(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} border-0 bg-gradient-to-r from-[#0d9488] to-[#059669] ${IT_CTRL.px} ${IT_CTRL.textSemibold} text-white shadow-md shadow-[#0d9488]/18 ${IT_CTRL.transition} hover:from-[#0f766e] hover:to-[#047857] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

export function itToolbarIconBtn(extra = '') {
  return `inline-flex ${IT_CTRL.height} w-9 shrink-0 items-center justify-center ${IT_CTRL.radiusPill} ${IT_SURFACE.toolbarSecondary} text-slate-600 ${IT_CTRL.transition} hover:border-[#99f6e4] hover:bg-[#f0fdfa] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
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
    return `${base} bg-gradient-to-r from-[#0d9488] to-[#059669] text-white shadow-md shadow-[#0d9488]/18 ${extra}`;
  }
  return `${base} text-slate-600 hover:bg-[#f0fdfa] hover:text-[#0f766e] ${extra}`;
}

export function itToolbarSelectShell(extra = '') {
  return `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} ${IT_SURFACE.toolbarPrimary} pl-2.5 pr-2 ${IT_CTRL.transition} ${extra}`;
}

export function itChip(active = false, extra = '') {
  const base = `inline-flex ${IT_CTRL.height} items-center ${IT_CTRL.gap} ${IT_CTRL.px} ${IT_CTRL.radiusPill} ${IT_CTRL.textSemibold} ${IT_CTRL.transition}`;
  if (active) {
    return `${base} bg-gradient-to-r from-[#0d9488] to-[#059669] text-white shadow-md shadow-[#0d9488]/18 ${extra}`;
  }
  return `${base} border border-slate-300/80 bg-slate-100 text-slate-700 hover:border-[#99f6e4] hover:bg-[#f0fdfa] hover:text-[#0f766e] ${extra}`;
}

/** Inline tab count — plain number beside label, no nested pill badge */
export function itTabCount(active = false, onSolid = true, extra = '') {
  const tone = onSolid
    ? (active ? 'font-bold text-white/90' : 'font-semibold text-slate-500')
    : (active ? 'font-bold text-[#0f766e]/80' : 'font-semibold text-slate-400');
  return `tabular-nums ${tone} ${extra}`.trim();
}

/* ── Input / select helpers ── */

export function itInput(extra = '') {
  return `w-full ${IT_CTRL.minHeight} ${IT_CTRL.radius} ${IT_SURFACE.borderInput} px-3 text-sm text-slate-800 outline-none ${IT_CTRL.transition} placeholder:text-slate-400 focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/20 ${extra}`;
}

export function itSearchInput(extra = '') {
  return `w-full ${IT_CTRL.minHeight} ${IT_CTRL.radiusPill} ${IT_SURFACE.borderInput} pl-10 pr-3 text-sm text-slate-800 outline-none ${IT_CTRL.transition} placeholder:text-slate-400 focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/20 ${extra}`;
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
    'hover:border-[#2dd4bf]',
    'focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/20',
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
    'focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/20',
    'disabled:cursor-not-allowed disabled:opacity-50',
    extra,
  ].filter(Boolean).join(' ');
}

export function itClearFilterBtn(extra = '') {
  return `${itBtnSecondary(`${IT_CTRL.height} inline-flex shrink-0 items-center gap-1.5 px-3`)} ${extra}`;
}

/* ── Button helpers (forms / dialogs) ── */

export function itBtnPrimary(extra = '') {
  return `inline-flex ${IT_CTRL.minHeight} items-center justify-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} border-0 bg-gradient-to-r from-[#0d9488] to-[#059669] px-4 text-sm font-semibold text-white shadow-md shadow-[#0d9488]/18 ${IT_CTRL.transition} hover:from-[#0f766e] hover:to-[#047857] disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
}

export function itBtnSecondary(extra = '') {
  return `inline-flex ${IT_CTRL.minHeight} items-center justify-center ${IT_CTRL.gap} ${IT_CTRL.radiusPill} border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 ${IT_SURFACE.shadow} ${IT_CTRL.transition} hover:border-[#99f6e4] hover:bg-[#f0fdfa] disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
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
