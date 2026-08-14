/**
 * MIS-modern vs classic Jira button / form / dialog class helpers.
 */
import {
  IT_SURFACE,
  itBtnPrimary as tokenBtnPrimary,
  itBtnSecondary as tokenBtnSecondary,
  itBtnGhost as tokenBtnGhost,
  itInput as tokenInput,
  itFormSelect as tokenFormSelect,
} from '../itDesignTokens.js';
import { isMisModernUi } from '../../../lib/itDashboardUi.js';

export function itBtnPrimary(extra = '') {
  if (isMisModernUi()) return tokenBtnPrimary(extra);
  return `inline-flex items-center justify-center gap-2 rounded-[3px] border-0 bg-gradient-to-r from-[#0d9488] to-[#059669] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#0f766e] hover:to-[#047857] disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
}

export function itBtnPrimaryFull(extra = '') {
  if (isMisModernUi()) return `${tokenBtnPrimary('w-full')} ${extra}`;
  return `flex w-full items-center justify-center gap-2 rounded-[3px] bg-gradient-to-r from-[#0d9488] to-[#059669] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#0f766e] hover:to-[#047857] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

export function itBtnSecondary(extra = '') {
  if (isMisModernUi()) return tokenBtnSecondary(extra);
  return `inline-flex items-center justify-center gap-2 ${IT_SURFACE.radius} ${IT_SURFACE.border} bg-white px-4 py-2 text-sm font-semibold text-[#44546F] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
}

export function itBtnGhost(extra = '') {
  if (isMisModernUi()) return tokenBtnGhost(extra);
  return `inline-flex items-center justify-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold text-[#44546F] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
}

export function itFormInput(extra = '') {
  if (isMisModernUi()) return tokenInput(extra);
  return `w-full rounded-[3px] ${IT_SURFACE.borderInput} bg-white px-3 py-2 text-sm font-medium text-[#172B4D] outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25 ${extra}`;
}

export function itFormSelect(extra = '') {
  if (isMisModernUi()) return tokenFormSelect(extra);
  return `w-full rounded-[3px] ${IT_SURFACE.borderInput} bg-white px-3 py-2 text-sm font-medium text-[#172B4D] outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25 ${extra}`;
}

export function itFormPanel(extra = '') {
  if (isMisModernUi()) {
    return `rounded-lg ${IT_SURFACE.border} bg-white p-4 ${IT_SURFACE.shadowCard} ${extra}`;
  }
  return `rounded-lg ${IT_SURFACE.border} bg-white p-4 ${IT_SURFACE.shadow} ${extra}`;
}

export function itReadOnlyField(extra = '') {
  if (isMisModernUi()) {
    return `rounded-lg ${IT_SURFACE.border} ${IT_SURFACE.mutedBg} px-3 py-2.5 text-sm font-medium text-slate-800 ${extra}`;
  }
  return `rounded-[3px] ${IT_SURFACE.border} ${IT_SURFACE.mutedBg} px-3 py-2.5 text-sm font-medium text-[#172B4D] ${extra}`;
}

export function itDialogFooter(extra = '') {
  return `flex items-center justify-end gap-2 ${IT_SURFACE.borderT} ${IT_SURFACE.footerBg} px-4 py-3 sm:px-5 ${extra}`;
}

export function itDialogToolbar(extra = '') {
  return `flex items-center justify-end ${IT_SURFACE.borderB} ${IT_SURFACE.mutedBg} px-4 py-2 sm:px-5 ${extra}`;
}

export function itDialogBody(extra = '') {
  if (isMisModernUi()) {
    return `${IT_SURFACE.borderT} bg-white px-4 py-3 sm:px-5 ${extra}`;
  }
  return `px-4 py-3 sm:px-5 ${extra}`;
}

export function itPaginationBtn(active = false, extra = '') {
  if (isMisModernUi()) {
    return active
      ? `inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold bg-gradient-to-r from-[#0d9488] to-[#059669] text-white shadow-md shadow-[#0d9488]/20 ${extra}`
      : `inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#99f6e4] hover:bg-[#f0fdfa] disabled:cursor-not-allowed disabled:opacity-40 ${extra}`;
  }
  return active
    ? `inline-flex h-8 min-w-[2rem] items-center justify-center rounded-[3px] border-0 bg-gradient-to-r from-[#0d9488] to-[#059669] px-2 text-xs font-semibold text-white shadow-sm transition ${extra}`
    : `inline-flex h-8 min-w-[2rem] items-center justify-center rounded-[3px] border border-gray-300 bg-gray-50 px-2 text-xs font-medium text-[#626F86] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${extra}`;
}

export function itLoadMoreBtn(extra = '') {
  if (isMisModernUi()) {
    return `inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#99f6e4] bg-[#f0fdfa] px-4 py-2 text-sm font-semibold text-[#0f766e] transition-colors hover:bg-[#ccfbf1] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
  }
  return `inline-flex shrink-0 items-center justify-center gap-2 rounded-[3px] border border-[#99f6e4] bg-[#f0fdfa] px-4 py-2 text-sm font-semibold text-[#047857] transition hover:bg-[#DEEBFF] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

export function itSectionAccent() {
  return isMisModernUi() ? 'text-[#0d9488]' : 'text-[#0d9488]';
}

export function itFormLabel(extra = '') {
  if (isMisModernUi()) return `mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 ${extra}`;
  return `mb-2 block text-sm font-medium text-[#44546F] ${extra}`;
}

export function itCommentBubbleMine() {
  return isMisModernUi() ? 'bg-[#0d9488] text-white' : 'bg-[#0d9488] text-white';
}

export function itCommentBubbleOther() {
  return isMisModernUi()
    ? 'border border-slate-200 bg-slate-50 text-slate-800'
    : `${IT_SURFACE.border} ${IT_SURFACE.mutedBg} text-[#172B4D]`;
}

export function itTableActionIconWrap(variant = 'primary', mis = isMisModernUi()) {
  if (!mis) return '';
  if (variant === 'secondary') {
    return 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-white';
  }
  return 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white';
}

export function itTableActionBtn(variant = 'primary', extra = '', mis = isMisModernUi()) {
  if (!mis) {
    return variant === 'secondary'
      ? `inline-flex items-center gap-1.5 rounded-[3px] border border-[#99f6e4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#047857] transition hover:bg-[#f0fdfa] disabled:cursor-not-allowed disabled:opacity-50 ${extra}`
      : `inline-flex items-center gap-1.5 rounded-[3px] border border-[#047857] bg-[#0d9488] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;
  }

  const base = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${extra}`;

  switch (variant) {
    case 'secondary':
      return `${base} border border-[#99f6e4] bg-[#f0fdfa] text-[#0f766e] hover:bg-[#ccfbf1]`;
    case 'success':
      return `${base} border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`;
    case 'warning':
      return `${base} border border-amber-500 bg-amber-500 text-white hover:bg-amber-600`;
    default:
      return `${base} border-0 bg-gradient-to-r from-[#0d9488] to-[#059669] text-white shadow-md shadow-[#0d9488]/20 hover:from-[#0f766e] hover:to-[#047857]`;
  }
}
