/* eslint-disable react-refresh/only-export-components -- shared IT dashboard UI kit (Jira ITSM) */
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy, Headset, UserCog, ServerCog, BadgeCheck, Stamp,
  Ticket, FolderOpen, CheckCircle2, ListTodo, AlertTriangle, Users,
  RotateCcw, Search, Layers, ChevronDown, ChevronUp, Plus, Clock, X, Send, GitBranch,
  ChevronLeft, ChevronRight, Loader2, ShieldCheck, ShieldAlert, CalendarRange,
} from 'lucide-react';
import { getGreetingText } from '../../lib/kfProjectDashboard.js';
import { ITEM_STATUS_WAITING_LABEL, getSlaTiming, getCompletedResolutionTiming, collectMisFilterOptions, collectAssigneeFilterOptions, collectRequesterFilterOptions, formatWorkflowStepDisplayLabel } from '../../lib/kfITServiceDashboard.js';
import { MIS_STAGE_FILTER_OPTIONS, getExtrovisMisStagesLabel } from '../../itsm/refex/employeedashboard/ticketStage.js';
import { isMisModernUi } from '../../lib/itDashboardUi.js';
import { useIsMisModern } from '../../context/ITDashboardUiContext.jsx';
import {
  itBtnPrimary,
  itBtnPrimaryFull,
  itBtnSecondary,
  itFormInput,
  itFormPanel,
  itPaginationBtn,
  itLoadMoreBtn,
  itDialogFooter,
  itTableActionBtn,
  itTableActionIconWrap,
} from './mis/misThemeClasses.js';
import { IT_SURFACE, IT_TYPE, IT_MOTION, IT_PRIORITY, IT_TICKET_STATUS, IT_STEP_BADGE, resolveItemStatusStyle, itInput, itClearFilterBtn, itBadge, itBadgeDot, itTabCount } from './itDesignTokens.js';
import ITMisSelectField from './mis/ITMisSelectField.jsx';
import { JIRA_CRITICALITY_STYLE, JIRA_ITEM_STATUS_STYLE, JIRA_SLA_STYLE, JIRA_SLA_DOT, JIRA_PRIORITY_DOT } from './jira/jiraTheme.js';
import './it-dashboard.css';

export { ITMisSelectField };
export { normalizeSelectOptions } from './mis/ITMisSelectField.jsx';
export { IT_TYPE, IT_MOTION } from './itDesignTokens.js';

/** Lightweight opening overlay — does not block interaction after first paint. */
export function ITDashboardLoadingOverlay({ loading = false }) {
  return (
    <AnimatePresence>
      {loading ? (
        <motion.div
          key="it-dashboard-loading"
          className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-24 sm:pt-28"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#99f6e4]/80 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg shadow-[#0d9488]/10 backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#0d9488]" />
            Loading dashboard…
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Jira Service Management shell — same export names as legacy theme */
export const IT_THEME = {
  page: `it-dashboard min-h-full w-full min-w-0 max-w-full overflow-x-hidden font-sans ${IT_SURFACE.pageBg} text-[#172B4D]`,
  shell: `it-dashboard-shell relative w-full min-w-0 max-w-full min-h-full overflow-x-hidden ${IT_SURFACE.pageBg}`,
  main: 'relative w-full',
  kpiGrid: 'grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
  kpiGrid3: 'grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3',
  kpiGrid5: 'grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5',
  kpiZone: `${IT_SURFACE.borderB} ${IT_SURFACE.mutedBg} px-3 py-3 sm:px-5 sm:py-4`,
  dataSection: IT_SURFACE.card,
  tableDesktop: 'hidden lg:block overflow-x-auto overscroll-x-contain',
  mobileList: 'space-y-2 p-3 sm:p-4 lg:hidden',
  blobA: 'hidden',
  blobB: 'hidden',
  blobC: 'hidden',
  header: 'relative w-full border-b border-[#047857]/40 bg-gradient-to-r from-[#0d9488] to-[#059669]',
  headerIcon: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-white/15 text-white ring-1 ring-inset ring-white/25 sm:h-10 sm:w-10',
  headerTitle: 'text-base font-semibold leading-tight text-white sm:text-lg',
  headerGreeting: 'mt-0.5 text-xs text-white/85 sm:text-sm',
  headerSubtitle: 'mt-0.5 text-[11px] text-white/70 sm:text-xs',
  brandLabel: 'text-[11px] font-semibold uppercase tracking-wide text-[#626F86]',
  nameGradient: 'text-[#172B4D]',
  refreshBtn: 'inline-flex items-center gap-2 rounded-[3px] border border-white/35 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20',
  createTicketBtn: 'inline-flex items-center gap-2 rounded-[3px] bg-white px-3 py-2 text-sm font-semibold text-[#0d9488] shadow-sm transition hover:bg-gray-50',
  previewBadgeHeader: 'rounded-[3px] border border-white/35 bg-white/15 px-2 py-0.5 text-xs font-medium text-white',
  section: `overflow-hidden ${IT_SURFACE.card} ${IT_SURFACE.border} ${IT_SURFACE.shadowTable}`,
  sectionHead: `${IT_SURFACE.sectionHead} px-3 py-3 sm:px-4 sm:py-3`,
  sectionIcon: 'flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0fdfa] text-[#0d9488] ring-1 ring-[#99f6e4]/60',
  tableHead: IT_SURFACE.tableHead,
  tableRow: `cursor-pointer border-t ${IT_SURFACE.borderRow} transition-colors duration-150 hover:bg-slate-50/90`,
  rowHover: 'hover:bg-slate-50/90',
  rowExpanded: 'bg-[#0d9488]/[0.04] ring-1 ring-inset ring-[#0d9488]/10',
  rowSlaBreached: 'border-l-[3px] border-l-red-500 bg-red-50/40',
  rowSlaAtRisk: 'border-l-[3px] border-l-amber-500 bg-amber-50/35',
  expandPanel: `border-t ${IT_SURFACE.borderRow} ${IT_SURFACE.footerBg}`,
  expandIcon: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#99f6e4] bg-[#f0fdfa] text-[#0f766e] transition-colors hover:bg-[#ccfbf1] hover:border-[#2dd4bf]',
  chevron: 'text-slate-500',
  requestId: 'font-semibold text-[#0d9488] hover:text-[#0f766e]',
  metaText: 'text-xs font-medium text-slate-500',
  subMetaText: 'text-[11px] font-medium text-slate-400',
  searchFocus: 'focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25',
  tabInactive: 'text-slate-600 hover:bg-slate-50',
  tabActive: 'bg-[#f0fdfa] text-[#0f766e] ring-1 ring-inset ring-[#99f6e4]',
  stepBadge: `${IT_SURFACE.radiusBadge} ${IT_STEP_BADGE} px-2.5 py-1 text-[11px] font-medium`,
  itemStatusBadge: `${IT_SURFACE.border} ${IT_SURFACE.radiusBadge} border-[#99f6e4] bg-[#f0fdfa] px-1.5 py-0.5 text-[11px] font-semibold text-[#0f766e]`,
  previewBadge: 'rounded-[3px] border border-[#FFE380] bg-[#FFF7D6] px-2 py-0.5 text-xs font-medium text-[#7F5F01]',
  primaryBtn: 'flex w-full items-center justify-center gap-2 rounded-[3px] bg-gradient-to-r from-[#0d9488] to-[#059669] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#0f766e] hover:to-[#047857] disabled:opacity-60',
  sidebarHeader: 'bg-[#047857] px-5 py-4 text-white',
  kpiCard: `${IT_SURFACE.border} ${IT_SURFACE.radius} ${IT_SURFACE.card} p-4 ${IT_SURFACE.shadowCard} transition hover:border-gray-400 sm:p-4`,
  detailTile: `${IT_SURFACE.border} ${IT_SURFACE.radiusBadge} ${IT_SURFACE.card} px-3 py-2`,
  contentPanel: `${IT_SURFACE.border} ${IT_SURFACE.radius} ${IT_SURFACE.card} p-4 ${IT_SURFACE.shadowCard}`,
  formPanel: `${IT_SURFACE.border} ${IT_SURFACE.radius} ${IT_SURFACE.card} p-4 ${IT_SURFACE.shadowCard}`,
  chip: `${IT_SURFACE.border} ${IT_SURFACE.radiusBadge} ${IT_SURFACE.footerBg} px-2 py-0.5 text-xs font-medium text-[#44546F]`,
  mobileCard: `overflow-hidden ${IT_SURFACE.border} ${IT_SURFACE.radius} ${IT_SURFACE.card} ${IT_SURFACE.shadowCard} transition-all`,
  mobileCardExpanded: 'ring-1 ring-[#99f6e4] border-[#99f6e4]',
  mobileField: `min-w-0 rounded-[3px] ${IT_SURFACE.footerBg} px-2.5 py-2`,
  tableFooter: `border-t ${IT_SURFACE.borderRow} ${IT_SURFACE.footerBg} px-3 py-2.5 sm:px-4`,
  formInput: `w-full rounded-[3px] ${IT_SURFACE.borderInput} ${IT_SURFACE.card} px-3 py-2 text-sm font-medium text-[#172B4D] outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25`,
  workflowBox: `rounded-lg ${IT_SURFACE.border} ${IT_SURFACE.card} p-4 ${IT_SURFACE.shadow}`,
};

export const IT_KPI_CARDS = {
  total: { gradient: 'from-[#0d9488] to-[#059669]', glow: '', icon: Ticket, accent: '#0d9488' },
  open: { gradient: 'from-[#0f766e] to-[#047857]', glow: '', icon: FolderOpen, accent: '#0f766e' },
  completed: { gradient: 'from-[#107C10] to-[#0B6A0B]', glow: '', icon: CheckCircle2, accent: '#107C10' },
  pending: { gradient: 'from-[#0d9488] to-[#059669]', glow: '', icon: ListTodo, accent: '#0d9488' },
  sla: { gradient: 'from-[#D13438] to-[#A4262C]', glow: '', icon: ShieldAlert, accent: '#D13438' },
  atRisk: { gradient: 'from-[#E56910] to-[#BF5000]', glow: '', icon: Clock, accent: '#E56910' },
  agentQueue: { gradient: 'from-[#0d9488] to-[#059669]', glow: '', icon: Headset, accent: '#0d9488' },
};

const SLA_BADGE_STYLE = JIRA_SLA_STYLE;

const SLA_DOT_STYLE = JIRA_SLA_DOT;

export function getSlaTableRowClass(row, { expanded = false } = {}) {
  const timing = getSlaTiming(row);
  if (timing.state === 'breached') return expanded ? IT_THEME.rowExpanded : IT_THEME.rowSlaBreached;
  if (timing.state === 'warning') return expanded ? IT_THEME.rowExpanded : IT_THEME.rowSlaAtRisk;
  return expanded ? IT_THEME.rowExpanded : IT_THEME.rowHover;
}

export function ITSlaBadge({ row }) {
  const timing = getSlaTiming(row);
  if (timing.state === 'hold') {
    return (
      <span className={itBadge(SLA_BADGE_STYLE.hold || SLA_BADGE_STYLE.none)}>
        <span className={itBadgeDot(SLA_DOT_STYLE.hold || SLA_DOT_STYLE.none)} aria-hidden />
        Hold
      </span>
    );
  }
  if (!timing.hasSla) {
    const closed = timing.state === 'completed';
    return (
      <span className={itBadge(closed ? SLA_BADGE_STYLE.ok || SLA_BADGE_STYLE.none : SLA_BADGE_STYLE.ok || SLA_BADGE_STYLE.none)}>
        <span className={itBadgeDot(SLA_DOT_STYLE.ok || SLA_DOT_STYLE.none)} aria-hidden />
        {closed ? 'Not Breached' : 'On track'}
      </span>
    );
  }
  const state = timing.state || 'none';
  return (
    <span
      className={itBadge(`max-w-[140px] truncate ${SLA_BADGE_STYLE[state] || SLA_BADGE_STYLE.none}`)}
      title={timing.label}
    >
      <span className={itBadgeDot(SLA_DOT_STYLE[state] || SLA_DOT_STYLE.none)} aria-hidden />
      {timing.shortLabel}
    </span>
  );
}

export function ITCompletedResolutionTime({ row }) {
  const timing = getCompletedResolutionTiming(row);
  if (!timing.hasData) {
    return <span className="text-[#97A0AF]">—</span>;
  }
  return (
    <span className="font-semibold text-[#172B4D]" title={timing.resolutionLabel}>
      {timing.resolutionLabel}
    </span>
  );
}

export function ITSimpleSlaResultBadge({ row }) {
  const timing = getCompletedResolutionTiming(row);
  if (!timing.hasData || timing.outcome === 'none') {
    return (
      <span className={itBadge(SLA_BADGE_STYLE.ok || SLA_BADGE_STYLE.none)}>
        <span className={itBadgeDot(SLA_DOT_STYLE.ok || SLA_DOT_STYLE.none)} aria-hidden />
        On time
      </span>
    );
  }
  const breached = timing.outcome === 'breached';
  const Icon = breached ? ShieldAlert : ShieldCheck;
  return (
    <span
      className={`inline-flex min-w-[5.75rem] items-center justify-center gap-1 whitespace-nowrap ${IT_SURFACE.radiusBadge} px-2.5 py-1 text-[11px] font-medium ${
        breached
          ? 'bg-red-50 text-red-600'
          : 'bg-emerald-50 text-emerald-700'
      }`}
      title={breached ? 'SLA breached' : 'Resolved within SLA'}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {breached ? 'Breached' : 'On time'}
    </span>
  );
}

export function ITCompletedSlaOutcomeBadge({ row }) {
  const timing = getCompletedResolutionTiming(row);
  if (!timing.hasData || timing.outcome === 'none') {
    return (
      <span className={itBadge(SLA_BADGE_STYLE.ok || SLA_BADGE_STYLE.none)}>
        <span className={itBadgeDot(SLA_DOT_STYLE.ok || SLA_DOT_STYLE.none)} aria-hidden />
        On time
      </span>
    );
  }
  const within = timing.outcome === 'within';
  const Icon = within ? ShieldCheck : ShieldAlert;
  return (
    <span
      className={`inline-flex min-w-[5.75rem] items-center justify-center gap-1 whitespace-nowrap ${IT_SURFACE.radiusBadge} px-2.5 py-1 text-[11px] font-medium ${
        within
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600'
      }`}
      title={timing.marginLabel !== '—' ? timing.marginLabel : timing.outcomeLabel}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{within ? 'On time' : 'Breached'}</span>
    </span>
  );
}

export function ITSlaProgressPanel({ row }) {
  const timing = getSlaTiming(row);
  if (!timing.hasSla) {
    return (
      <div className={`${IT_THEME.contentPanel} border-dashed`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#626F86]">SLA</p>
        <p className="mt-2 text-sm text-[#626F86]">On track</p>
      </div>
    );
  }

  const barColor = timing.state === 'breached'
    ? 'bg-[#E34935]'
    : timing.state === 'warning'
      ? 'bg-[#E56910]'
      : 'bg-[#36B37E]';

  return (
    <div className={IT_THEME.contentPanel}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#626F86]">SLA countdown</p>
          <p className={`mt-1 text-base font-semibold ${
            timing.state === 'breached' ? 'text-[#AE2A19]' : timing.state === 'warning' ? 'text-[#7F5F01]' : 'text-[#216E4E]'
          }`}
          >
            {timing.label}
          </p>
        </div>
        <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold ${SLA_BADGE_STYLE[timing.state]}`}>
          {timing.state === 'breached' ? 'Breached' : timing.state === 'warning' ? 'At risk' : 'On track'}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, timing.percentUsed))}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] font-medium text-[#626F86]">
        <span>Target: {Math.round(timing.slaMinutes)} min</span>
        <span>Elapsed: {Math.round(timing.elapsedMinutes)} min</span>
        <span>
          {timing.remainingMinutes >= 0
            ? `Remaining: ${Math.round(timing.remainingMinutes)} min`
            : `Over by: ${Math.round(Math.abs(timing.remainingMinutes))} min`}
        </span>
      </div>
    </div>
  );
}

function shortWorkflowLabel(step, entityKey = '') {
  return formatWorkflowStepDisplayLabel(step, { entityKey });
}

/** Horizontal compact workflow — fits expand panels without a sidebar */
export function ITCompactWorkflowStrip({
  steps,
  currentStep,
  lastCompletedStep,
  getIndex,
  variant = 'service',
  entityKey = '',
}) {
  const activeIdx = getIndex(currentStep);
  const isCr = variant === 'cr';

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <GitBranch className={`h-3.5 w-3.5 shrink-0 ${isCr ? 'text-[#6554C0]' : 'text-[#0d9488]'}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#626F86]">Workflow</span>
      </div>
      <div className="flex items-start gap-0 overflow-x-auto pb-0.5">
        {steps.map((step, idx) => {
          const done = idx < activeIdx
            || (lastCompletedStep && step.toLowerCase() === String(lastCompletedStep).toLowerCase());
          const active = idx === activeIdx;
          const isLast = idx === steps.length - 1;
          return (
            <div key={step} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-[52px] max-w-[80px] shrink-0 flex-col items-center gap-1 px-0.5">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors ${
                    done
                      ? 'bg-[#216E4E] text-white'
                      : active
                        ? isCr
                          ? 'bg-[#6554C0] text-white ring-2 ring-[#EAE6FF]'
                          : 'bg-[#0d9488] text-white ring-2 ring-[#f0fdfa]'
                        : 'border border-gray-200 bg-gray-50 text-[#97A0AF]'
                  }`}
                  title={step}
                >
                  {done && !active ? '✓' : idx + 1}
                </div>
                <span
                  className={`w-full truncate text-center text-[10px] font-medium leading-tight ${
                    active
                      ? isCr ? 'text-[#5243AA]' : 'text-[#047857]'
                      : done ? 'text-[#216E4E]' : 'text-[#97A0AF]'
                  }`}
                  title={step}
                >
                  {shortWorkflowLabel(step, entityKey)}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`mt-3 h-0.5 min-w-[8px] flex-1 rounded-full ${
                    idx < activeIdx ? 'bg-[#36B37E]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Vertical workflow — right rail with handler name under each step */
export function ITVerticalWorkflowStrip({
  steps,
  currentStep,
  lastCompletedStep,
  getIndex,
  handlers = {},
  stepTimes = {},
  variant = 'service',
  hideUnassignedStepTimes = false,
  entityKey = '',
}) {
  const activeIdx = getIndex(currentStep);
  const isCr = variant === 'cr';
  const brandRing = isCr ? 'ring-violet-200' : 'ring-[#99f6e4]';
  const brandBg = isCr ? 'bg-violet-600' : 'bg-gradient-to-br from-[#0d9488] to-[#059669]';
  const brandText = isCr ? 'text-violet-700' : 'text-[#0f766e]';
  const doneBg = 'bg-emerald-600';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_6px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-[#f0fdfa]/70 to-white px-4 py-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isCr ? 'bg-violet-100 text-violet-600' : 'bg-[#0d9488]/10 text-[#0d9488]'}`}>
          <GitBranch className="h-4 w-4" strokeWidth={2} />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Workflow</p>
          <p className="text-xs font-semibold text-slate-700">{isCr ? 'Change request path' : 'Service request path'}</p>
        </div>
      </div>
      <ol className="space-y-0 px-4 py-4">
        {steps.map((step, idx) => {
          const done = idx < activeIdx
            || (lastCompletedStep && step.toLowerCase() === String(lastCompletedStep).toLowerCase());
          const active = idx === activeIdx;
          const handler = handlers[step];
          const showHandler = handler && handler !== '—';
          const stepTime = stepTimes[step];
          const showTime = stepTime && (!hideUnassignedStepTimes || showHandler);
          const isLast = idx === steps.length - 1;

          return (
            <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast ? (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-0.5rem)] w-0.5 ${
                    idx < activeIdx ? 'bg-gradient-to-b from-emerald-400 to-[#0d9488]/30' : 'bg-slate-200'
                  }`}
                  aria-hidden
                />
              ) : null}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-sm ${
                    done && !active
                      ? `${doneBg} text-white`
                      : active
                        ? `${brandBg} text-white ring-4 ${brandRing}`
                        : 'border-2 border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {done && !active ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <span className="leading-none tabular-nums">{idx + 1}</span>
                  )}
                </div>
              </div>
              <div className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition-colors ${
                active
                  ? (isCr ? 'border-violet-200 bg-violet-50/50' : 'border-[#99f6e4] bg-[#f0fdfa]/50')
                  : done
                    ? 'border-emerald-100 bg-emerald-50/40'
                    : 'border-slate-100 bg-slate-50/40'
              }`}
              >
                <p className={`text-xs font-bold leading-tight ${
                  active ? brandText : done ? 'text-emerald-800' : 'text-slate-600'
                }`}
                >
                  {shortWorkflowLabel(step, entityKey)}
                </p>
                {showHandler ? (
                  <p className="mt-1 truncate text-[11px] font-medium text-slate-600" title={handler}>
                    {handler}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">Unassigned</p>
                )}
                {showTime ? (
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400" title={stepTime}>
                    {stepTime}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Compact SLA strip for expand panels when the table row has no SLA column */
export function ITCompactSlaStrip({ row }) {
  const timing = getSlaTiming(row);
  if (!timing.hasSla) return null;

  const barColor = timing.state === 'breached'
    ? 'bg-[#E34935]'
    : timing.state === 'warning'
      ? 'bg-[#E56910]'
      : 'bg-[#36B37E]';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm sm:px-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#0d9488]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">SLA</span>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${SLA_BADGE_STYLE[timing.state]}`}>
          {timing.state === 'breached' ? 'Breached' : timing.state === 'warning' ? 'At risk' : 'On track'}
        </span>
      </div>
      <p className={`truncate text-sm font-bold ${
        timing.state === 'breached' ? 'text-red-700' : timing.state === 'warning' ? 'text-amber-800' : 'text-emerald-700'
      }`}
      >
        {timing.shortLabel}
      </p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, timing.percentUsed))}%` }}
        />
      </div>
      <p className="mt-1.5 truncate text-[10px] font-medium text-slate-400">
        {Math.round(timing.elapsedMinutes)}m elapsed · {Math.round(timing.slaMinutes)}m target
      </p>
    </div>
  );
}

/** Compact resolution summary for completed items in expand panels */
export function ITCompactCompletedResolutionStrip({ row }) {
  const timing = getCompletedResolutionTiming(row);
  if (!timing.hasData) return null;

  const isBreached = timing.outcome === 'breached';
  const isWithin = timing.outcome === 'within';

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#0d9488]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#626F86]">Resolution</span>
        </div>
        {timing.outcome !== 'none' && (
          <span className={`shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${
            isBreached
              ? 'border-[#FFBDAD] bg-[#FFEBE6] text-[#AE2A19]'
              : isWithin
                ? 'border-[#BAF3DB] bg-[#E3FCEF] text-[#216E4E]'
                : 'border-gray-200 bg-gray-50 text-[#626F86]'
          }`}
          >
            {timing.outcomeLabel}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-[#172B4D]">{timing.resolutionLabel}</p>
      {timing.marginLabel !== '—' && (
        <p className="mt-1 truncate text-[10px] font-medium text-[#97A0AF]">{timing.marginLabel}</p>
      )}
    </div>
  );
}

export { itBtnPrimary, itBtnPrimaryFull, itBtnSecondary, itBtnGhost, itFormInput, itFormSelect, itFormPanel, itDialogFooter, itDialogToolbar, itReadOnlyField, itSectionAccent, itFormLabel, itCommentBubbleMine, itCommentBubbleOther, itTableActionBtn, itTableActionIconWrap } from './mis/misThemeClasses.js';

/** Dialog action footer — MIS / classic themed. */
export function ITDialogFooter({ children, className = '' }) {
  return (
    <div className={`${itDialogFooter()} ${className}`}>
      {children}
    </div>
  );
}

/** Modal dialog for row actions (approve, submit work, etc.) */
export function ITDashboardDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const mis = isMisModernUi();

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className={`absolute inset-0 ${mis ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-[#091E42]/55 backdrop-blur-[1px]'}`}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="it-dashboard-dialog-title"
        className={`relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden sm:max-w-xl ${
          mis
            ? 'rounded-2xl border border-gray-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]'
            : 'rounded-lg border border-gray-200 bg-white shadow-2xl'
        }`}
      >
        <div className={`border-b px-4 py-3 sm:px-5 ${
          mis
            ? 'border-slate-200 bg-gradient-to-r from-[#edf1ff] to-[#f0fdfa]'
            : 'border-[#047857]/30 bg-gradient-to-r from-[#0d9488] to-[#047857]'
        }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-2">
              <h2 id="it-dashboard-dialog-title" className={`text-base font-semibold sm:text-lg ${mis ? 'text-slate-900' : 'text-white'}`}>
                {title}
              </h2>
              {subtitle ? (
                <p className={`mt-0.5 truncate text-sm ${mis ? 'text-slate-600' : 'text-white/85'}`}>{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 rounded-lg p-1.5 transition ${
                mis ? 'text-slate-500 hover:bg-white/80' : 'text-white/90 hover:bg-white/15'
              }`}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto ${isMisModernUi() ? 'bg-white' : ''} px-4 py-4 sm:px-5 sm:py-5`}>{children}</div>
        {footer || null}
      </div>
    </div>,
    document.body,
  );
}

export const IT_DASHBOARD_PAGE_SIZE = 10;
export const IT_DASHBOARD_SERVER_PAGE_SIZE = 100;
export const IT_DASHBOARD_MAX_PAGE_BUTTONS = 10;

function getVisiblePageNumbers(currentPage, totalPages, maxButtons = IT_DASHBOARD_MAX_PAGE_BUTTONS) {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - half);
  let end = start + maxButtons - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxButtons + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Client-side paging for filtered table rows (10 per page). */
export function useITListPagination(filteredItems, resetKeys = []) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, resetKeys);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / IT_DASHBOARD_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * IT_DASHBOARD_PAGE_SIZE;
    return filteredItems.slice(start, start + IT_DASHBOARD_PAGE_SIZE);
  }, [filteredItems, safePage]);

  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * IT_DASHBOARD_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * IT_DASHBOARD_PAGE_SIZE, totalItems);

  return {
    page: safePage,
    setPage,
    totalPages,
    totalItems,
    pagedItems,
    rangeStart,
    rangeEnd,
  };
}

/** Table footer: page numbers 1–10 window, prev/next, load more from Kissflow. */
export function ITTablePagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
  hasMoreOnServer = false,
  loadingMore = false,
  onLoadMore,
  loadedTotal,
}) {
  const pageNumbers = getVisiblePageNumbers(page, totalPages);
  const showLoadMore = hasMoreOnServer && typeof onLoadMore === 'function';

  const mis = isMisModernUi();
  const pageBtn = (active, extra = '') => itPaginationBtn(active, extra);

  return (
    <div className={`${IT_THEME.tableFooter} space-y-3`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-[10px] sm:text-xs ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>
          {totalItems === 0 ? (
            'No records to display'
          ) : (
            <>
              Showing <span className={`font-semibold ${mis ? 'text-slate-800' : 'text-[#172B4D]'}`}>{rangeStart}–{rangeEnd}</span>
              {' '}of <span className={`font-semibold ${mis ? 'text-slate-800' : 'text-[#172B4D]'}`}>{totalItems}</span> in this view
              {typeof loadedTotal === 'number' && loadedTotal > totalItems && (
                <> · <span className={`font-semibold ${mis ? 'text-slate-800' : 'text-[#172B4D]'}`}>{loadedTotal}</span> loaded</>
              )}
            </>
          )}
        </p>

        {totalPages > 1 && (
          <nav className="flex flex-wrap items-center gap-1" aria-label="Table pages">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className={pageBtn(false, 'items-center gap-0.5 px-2')}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            {pageNumbers[0] > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onPageChange(1)}
                  className={pageBtn(false)}
                >
                  1
                </button>
                {pageNumbers[0] > 2 && <span className="px-1 text-xs text-[#97A0AF]">…</span>}
              </>
            )}
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                aria-current={n === page ? 'page' : undefined}
                className={pageBtn(n === page)}
              >
                {n}
              </button>
            ))}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="px-1 text-xs text-[#97A0AF]">…</span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(totalPages)}
                  className={pageBtn(false)}
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className={pageBtn(false, 'items-center gap-0.5 px-2')}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        )}
      </div>

      {showLoadMore && (
        <div className={`flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between ${mis ? 'border-slate-200' : 'border-gray-200'}`}>
          <p className={`text-xs ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>
            More records may exist in Kissflow. Load the next batch to include them in this dashboard.
          </p>
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className={itLoadMoreBtn()}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {loadingMore ? 'Loading…' : 'Load more records'}
          </button>
        </div>
      )}
    </div>
  );
}

/** Compact icon-only table control (view, accept, reassign). */
export function ITTableIconButton({
  label,
  onClick,
  disabled = false,
  icon: Icon,
  variant = 'ghost',
  spinning = false,
}) {
  const mis = useIsMisModern();
  const base = `inline-flex h-8 w-8 shrink-0 items-center justify-center ${IT_SURFACE.radius} border transition disabled:cursor-not-allowed disabled:opacity-50`;
  const variants = {
    ghost: mis
      ? 'border-slate-200 bg-white text-slate-600 hover:border-[#0d9488] hover:bg-[#f0fdfa] hover:text-[#0f766e]'
      : 'border-gray-200 bg-white text-[#44546F] hover:border-[#99f6e4] hover:bg-[#f0fdfa] hover:text-[#047857]',
    primary: mis
      ? 'border-[#0d9488] bg-[#0d9488] text-white hover:bg-[#0f766e]'
      : 'border-[#047857] bg-[#0d9488] text-white hover:bg-[#047857]',
    success: 'border-emerald-500/80 bg-emerald-500 text-white hover:bg-emerald-600',
    warning: 'border-amber-400/80 bg-amber-500 text-white hover:bg-amber-600',
    secondary: mis
      ? 'border-[#99f6e4] bg-[#f0fdfa] text-[#0f766e] hover:border-[#0d9488]'
      : 'border-[#99f6e4] bg-[#f0fdfa] text-[#047857] hover:border-[#0d9488]',
  };
  const className = `${base} ${variants[variant] || variants.ghost}`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={className}
    >
      <Icon className={`h-4 w-4 shrink-0${spinning ? ' animate-spin' : ''}`} />
    </button>
  );
}

/** Desktop row action — opens submit/approve dialog (no expand required). */
export function ITTableRowActionButton({
  label,
  onClick,
  disabled = false,
  icon: Icon = Send,
  variant = 'primary',
  size = 'compact',
}) {
  const mis = useIsMisModern();
  const sizeClass = size === 'prominent' ? 'px-3.5 py-2 text-sm' : '';
  const className = itTableActionBtn(variant, sizeClass, mis);
  const iconWrap = itTableActionIconWrap(variant, mis);

  const content = (
    <>
      {iconWrap ? (
        <span className={iconWrap}>
          <Icon className="h-3 w-3 shrink-0" />
        </span>
      ) : (
        <Icon className="h-3.5 w-3.5 shrink-0" />
      )}
      {label}
    </>
  );

  if (mis) {
    return (
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={label}
        whileHover={disabled ? undefined : { scale: 1.03 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        className={`whitespace-nowrap ${className}`}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {content}
    </button>
  );
}

/** Full-width mobile action — same dialog flow as desktop Action column. */
export function ITMobileRowActionButton({
  label,
  onClick,
  disabled = false,
  icon: Icon = Send,
  variant = 'primary',
}) {
  const mis = useIsMisModern();
  const className = mis
    ? itTableActionBtn(variant, 'w-full justify-center px-4 py-2.5 text-sm', mis)
    : `${itBtnPrimaryFull()} gap-2`;
  const iconWrap = itTableActionIconWrap(variant, mis);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {iconWrap ? (
        <span className={iconWrap}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
        </span>
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      {label}
    </button>
  );
}

export function itTableActionCellClass(mis = isMisModernUi()) {
  const sticky = mis
    ? 'sticky right-0 z-10 bg-white shadow-[-8px_0_16px_-8px_rgba(15,23,42,0.08)]'
    : 'sticky right-0 z-10 bg-white shadow-[-6px_0_10px_-6px_rgba(9,30,66,0.15)]';
  return sticky;
}

export function itTableViewDetailsCellClass(mis = isMisModernUi()) {
  return `${itTableActionCellClass(mis)} w-10 px-1`;
}

export function itTableActionsCellClass(mis = isMisModernUi()) {
  return `${itTableActionCellClass(mis)} w-auto px-1`;
}

export function itTableTakeActionCellClass(mis = isMisModernUi()) {
  return `${itTableActionCellClass(mis)} w-auto whitespace-nowrap px-1.5`;
}

export const IT_ROLE_CONFIG = {
  employee: {
    key: 'employee',
    icon: LifeBuoy,
    sectionIcon: LifeBuoy,
    roleLabel: 'Employee Portal',
    subtitle: 'My service requests',
    breadcrumb: 'My requests',
  },
  agent: {
    key: 'agent',
    icon: Headset,
    sectionIcon: Headset,
    roleLabel: 'IT Agent Workspace',
    subtitle: 'Agent queue · Resolve & close',
    breadcrumb: 'Agent queue',
  },
  manager: {
    key: 'manager',
    icon: UserCog,
    sectionIcon: UserCog,
    roleLabel: 'IT Manager Console',
    subtitle: 'Oversight · Agent queue & change requests',
    breadcrumb: 'Manager queue',
  },
  admin: {
    key: 'admin',
    icon: ServerCog,
    sectionIcon: ServerCog,
    roleLabel: 'IT Admin Command Center',
    subtitle: 'All service requests',
    breadcrumb: 'All requests',
  },
  firstLevelApprover: {
    key: 'firstLevelApprover',
    icon: BadgeCheck,
    sectionIcon: BadgeCheck,
    roleLabel: 'First Approver - IT Manager',
    subtitle: 'Service requests & change request approvals',
    breadcrumb: 'First approver queue',
  },
  finalLevelApprover: {
    key: 'finalLevelApprover',
    icon: Stamp,
    sectionIcon: Stamp,
    roleLabel: 'Final Approver - IT Head',
    subtitle: 'Service requests & change request approvals',
    breadcrumb: 'Final approver queue',
  },
};

export const CRITICALITY_STYLE = JIRA_CRITICALITY_STYLE;

export const ITEM_STATUS_STYLE = {
  ...JIRA_ITEM_STATUS_STYLE,
  [ITEM_STATUS_WAITING_LABEL]: JIRA_ITEM_STATUS_STYLE['Not Picked Yet'],
};

export function itemStatusClass(status) {
  const entry = resolveItemStatusStyle(status);
  return entry.badge;
}

export function ITItemStatusBadge({ status, label, className = '' }) {
  const display = label || status || '—';
  if (!display || display === '—') return <span className="text-slate-400">—</span>;
  const entry = resolveItemStatusStyle(status || display);
  return (
    <span className={itBadge(`max-w-[9rem] truncate ${entry.badge} ${className}`)} title={display}>
      <span className={itBadgeDot(entry.dot)} aria-hidden />
      {display}
    </span>
  );
}

export function useCountUp(endValue, duration = 900, { frozen = false } = {}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);

  useEffect(() => {
    if (frozen) {
      ref.current = 0;
      setDisplay(0);
      return undefined;
    }
    const to = Number.isFinite(Number(endValue)) ? Math.round(Number(endValue)) : 0;
    const from = ref.current;
    let raf = 0;
    const t0 = performance.now();
    const ease = (t) => 1 - (1 - t) ** 3;

    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const v = Math.round(from + (to - from) * ease(t));
      setDisplay(v);
      ref.current = v;
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        ref.current = to;
        setDisplay(to);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [endValue, duration, frozen]);

  return display;
}

export function ITKpiCard({ title, value, icon: Icon, gradient, delay = 0, glow: _glow }) {
  const animated = useCountUp(value);
  const card = IT_KPI_CARDS[Object.keys(IT_KPI_CARDS).find((k) => IT_KPI_CARDS[k].icon === Icon) || 'total'] || IT_KPI_CARDS.total;
  const accent = card.accent || '#0d9488';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className={IT_THEME.kpiCard}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#626F86]">{title}</p>
          <p className={`mt-1 ${IT_TYPE.kpiValue} text-[#172B4D]`}>{animated}</p>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] sm:h-10 sm:w-10"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export function useITDashboardFullBleed() {
  useEffect(() => {
    const root = document.getElementById('root');
    const targets = [document.documentElement, document.body, root].filter(Boolean);
    const prev = targets.map((el) => ({
      margin: el.style.margin,
      padding: el.style.padding,
      maxWidth: el.style.maxWidth,
      width: el.style.width,
      background: el.style.background,
    }));

    targets.forEach((el) => {
      el.style.margin = '0';
      el.style.padding = '0';
      el.style.maxWidth = 'none';
      el.style.width = '100%';
    });
    if (document.body) document.body.style.background = '#ffffff';

    return () => {
      targets.forEach((el, i) => {
        el.style.margin = prev[i].margin;
        el.style.padding = prev[i].padding;
        el.style.maxWidth = prev[i].maxWidth;
        el.style.width = prev[i].width;
        if (el === document.body) el.style.background = prev[i].background;
      });
    };
  }, []);
}

export function ITDashboardBackground() {
  useITDashboardFullBleed();
  return null;
}

export function ITDashboardShell({ children, shellClassName = '' }) {
  return (
    <div className={`it-dashboard ${IT_THEME.page}`}>
      <div className={`${IT_THEME.shell} ${shellClassName}`.trim()}>{children}</div>
    </div>
  );
}

export function ITDashboardKpiZone({ className, children }) {
  return (
    <div className={IT_THEME.kpiZone}>
      <section className={className || IT_THEME.kpiGrid}>{children}</section>
    </div>
  );
}

export function ITDashboardHeader({
  roleKey,
  userName,
  title,
  subtitle,
  connected,
  loading,
  refreshing = false,
  loadError,
  onRefresh,
  onCreateTicket,
  createTicketLabel = 'Create request',
  entitySelect,
  userProfile,
  lastUpdatedAt,
  periodFilter = null,
}) {
  const role = IT_ROLE_CONFIG[roleKey];
  const RoleIcon = role.icon;
  const pageTitle = title || role.breadcrumb || role.roleLabel;
  const profile = userProfile || {};
  const displayName = userName || profile.name || 'User';
  const companyName = profile.company || profile.entity || '';
  const lastUpdatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : '';

  return (
    <header className={IT_THEME.header}>
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className={IT_THEME.headerIcon}>
            <RoleIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className={IT_THEME.headerTitle}>
              {pageTitle}
            </h1>
            <p className={IT_THEME.headerGreeting}>
              {getGreetingText()}, {displayName}{' '}
              <span aria-hidden="true">👋</span>
            </p>
            {companyName ? (
              <p className={`mt-0.5 ${IT_TYPE.entityName} text-white/80`}>{companyName}</p>
            ) : null}
            {lastUpdatedLabel ? (
              <p className={IT_THEME.headerSubtitle}>Last updated {lastUpdatedLabel}</p>
            ) : subtitle ? (
              <p className={IT_THEME.headerSubtitle}>{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
          {!connected && !loading && (
            <span className={IT_THEME.previewBadgeHeader}>Preview mode</span>
          )}
          {entitySelect ? (
            <ITMisSelectField
              label={entitySelect.label || 'Entity'}
              showLabel={false}
              toolbar
              value={entitySelect.value}
              onChange={(e) => entitySelect.onChange(e.target.value)}
              options={entitySelect.options || []}
              allowClear={false}
              placeholder={entitySelect.label || 'Entity'}
              variant="header"
              className="min-w-[140px] flex-none sm:max-w-[180px]"
            />
          ) : null}
          {periodFilter ? (
            <div className="flex shrink-0 items-center sm:w-auto">{periodFilter}</div>
          ) : null}
          <button type="button" onClick={onRefresh} disabled={refreshing} className={`${IT_THEME.refreshBtn} flex-1 justify-center sm:flex-none disabled:opacity-60`}>
            <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {onCreateTicket && (
            <button type="button" onClick={onCreateTicket} className={`${IT_THEME.createTicketBtn} flex-1 justify-center sm:flex-none`}>
              <Plus className="h-4 w-4" />
              {createTicketLabel}
            </button>
          )}
        </div>
      </div>
      {loadError && <p className="border-t border-[#FFBDAD] bg-[#FFEBE6] px-4 py-2 text-sm text-[#AE2A19] sm:px-5">{loadError}</p>}
    </header>
  );
}

export function ITSearchInput({ value, onChange, placeholder = 'Search requests...' }) {
  return (
    <div className="relative w-full min-w-0 sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={itInput('py-2 pl-9')}
      />
    </div>
  );
}


function ITMisFilterSelect({ label, value, onChange, options, disabled = false, allowClear = true }) {
  return (
    <ITMisSelectField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      disabled={disabled}
      placeholder="All"
      allowClear={allowClear}
      variant="filter"
    />
  );
}

/** Category + priority (+ optional entity) filters for MIS tables. */
export function ITMisTableFilters({
  category,
  onCategoryChange,
  categoryOptions = [],
  categoryLabel = 'Category',
  criticality,
  onCriticalityChange,
  criticalityOptions = [],
  criticalityLabel = 'Priority',
  ticketType = '',
  onTicketTypeChange,
  ticketTypeOptions = [],
  ticketTypeLabel = 'Request Type',
  showTicketType = false,
  entity = '',
  onEntityChange,
  entityOptions = [],
  showEntity = false,
  showAssignedTo = false,
  assignedTo = '',
  onAssignedToChange,
  assignedToOptions = [],
  showTicketStatus = false,
  ticketStatus = '',
  onTicketStatusChange,
  ticketStatusOptions = [],
  hideCategory = false,
  hideCriticality = false,
  variant = 'default',
  onClear,
  hasActive = false,
}) {
  const isRefex = variant === 'refex';
  if (isRefex) {
    return (
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
        {hideCategory ? null : (
          <ITMisFilterSelect
            label={categoryLabel}
            value={category}
            onChange={onCategoryChange}
            options={categoryOptions}
          />
        )}
        {hideCriticality ? null : (
          <ITMisFilterSelect
            label={criticalityLabel}
            value={criticality}
            onChange={onCriticalityChange}
            options={criticalityOptions}
          />
        )}
        {showTicketType ? (
          <ITMisFilterSelect
            label={ticketTypeLabel}
            value={ticketType}
            onChange={onTicketTypeChange}
            options={ticketTypeOptions}
          />
        ) : null}
        {showTicketStatus ? (
          <ITMisFilterSelect
            label="Ticket Status"
            value={ticketStatus}
            onChange={onTicketStatusChange}
            options={ticketStatusOptions}
          />
        ) : null}
        {showEntity ? (
          <ITMisFilterSelect
            label="Entity"
            value={entity}
            onChange={onEntityChange}
            options={entityOptions}
          />
        ) : null}
        {showAssignedTo ? (
          <ITMisFilterSelect
            label="Assigned To"
            value={assignedTo}
            onChange={onAssignedToChange}
            options={assignedToOptions}
          />
        ) : null}
        {hasActive ? (
          <button type="button" onClick={onClear} className={itClearFilterBtn('self-start sm:self-auto')}>
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-1 flex-wrap gap-2 sm:gap-3">
        {hideCategory ? null : (
        <ITMisFilterSelect
          label={categoryLabel}
          value={category}
          onChange={onCategoryChange}
          options={categoryOptions}
        />
        )}
        <ITMisFilterSelect
          label={criticalityLabel}
          value={criticality}
          onChange={onCriticalityChange}
          options={criticalityOptions}
        />
        {showTicketType ? (
          <ITMisFilterSelect
            label={ticketTypeLabel}
            value={ticketType}
            onChange={onTicketTypeChange}
            options={ticketTypeOptions}
          />
        ) : null}
        {showEntity ? (
          <ITMisFilterSelect
            label="Entity"
            value={entity}
            onChange={onEntityChange}
            options={entityOptions}
          />
        ) : null}
      </div>
      {hasActive ? (
        <button type="button" onClick={onClear} className={itClearFilterBtn('self-start sm:self-auto')}>
          <X className="h-3.5 w-3.5" />
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

/** MIS table filter state — options derived from rows in the active tab. */
export function useMisTableFilters(tabScopedRows, resetKey, { categoryField = 'category', resolveTicketStatus = null, resolveStage = null } = {}) {
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [criticality, setCriticality] = useState('');
  const [entity, setEntity] = useState('');
  const [company, setCompany] = useState('');
  const [ticketType, setTicketType] = useState('');
  const [source, setSource] = useState('');
  const [closedBy, setClosedBy] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [requester, setRequester] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [subject, setSubject] = useState('');
  const [stages, setStages] = useState('');
  const [sla, setSla] = useState('');
  const [createdDateFrom, setCreatedDateFrom] = useState('');
  const [createdDateTo, setCreatedDateTo] = useState('');
  const [closedDateFrom, setClosedDateFrom] = useState('');
  const [closedDateTo, setClosedDateTo] = useState('');
  const [reopenedDateFrom, setReopenedDateFrom] = useState('');
  const [reopenedDateTo, setReopenedDateTo] = useState('');

  useEffect(() => {
    setCategory('');
    setSubCategory('');
    setCriticality('');
    setEntity('');
    setCompany('');
    setTicketType('');
    setSource('');
    setClosedBy('');
    setAssignedTo('');
    setRequester('');
    setTicketStatus('');
    setSubject('');
    setStages('');
    setSla('');
    setCreatedDateFrom('');
    setCreatedDateTo('');
    setClosedDateFrom('');
    setClosedDateTo('');
    setReopenedDateFrom('');
    setReopenedDateTo('');
  }, [resetKey]);

  const categoryOptions = useMemo(
    () => collectMisFilterOptions(tabScopedRows, categoryField),
    [tabScopedRows, categoryField],
  );
  const subCategoryOptions = useMemo(
    () => collectMisFilterOptions(tabScopedRows, 'subCategory'),
    [tabScopedRows],
  );
  const criticalityOptions = useMemo(
    () => collectMisFilterOptions(tabScopedRows, 'criticality'),
    [tabScopedRows],
  );
  const entityOptions = useMemo(
    () => collectMisFilterOptions(tabScopedRows, 'entity'),
    [tabScopedRows],
  );
  const ticketTypeOptions = useMemo(
    () => collectMisFilterOptions(tabScopedRows, 'ticketType'),
    [tabScopedRows],
  );
  const sourceOptions = useMemo(
    () => collectMisFilterOptions(tabScopedRows, 'source'),
    [tabScopedRows],
  );
  const closedByOptions = useMemo(() => {
    const values = new Set();
    (tabScopedRows || []).forEach((row) => {
      const v = String(
        row?.closedBy || row?.completedBy || row?.modifiedBy || row?.assignedToDisplay || row?.assignedTo || '',
      ).trim();
      if (v && v !== '—') values.add(v);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [tabScopedRows]);
  const assignedToOptions = useMemo(
    () => collectAssigneeFilterOptions(tabScopedRows),
    [tabScopedRows],
  );
  const requesterOptions = useMemo(
    () => collectRequesterFilterOptions(tabScopedRows),
    [tabScopedRows],
  );
  const ticketStatusOptions = useMemo(() => {
    if (typeof resolveTicketStatus !== 'function') {
      return collectMisFilterOptions(tabScopedRows, 'ticketStatus');
    }
    const values = new Set();
    (tabScopedRows || []).forEach((row) => {
      const v = String(resolveTicketStatus(row) || '').trim();
      if (v && v !== '—') values.add(v);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [tabScopedRows, resolveTicketStatus]);
  const subjectOptions = useMemo(
    () => collectMisFilterOptions(tabScopedRows, 'subject'),
    [tabScopedRows],
  );
  const stageResolver = resolveStage || getExtrovisMisStagesLabel;
  const stagesOptions = useMemo(() => {
    const values = new Set(MIS_STAGE_FILTER_OPTIONS);
    (tabScopedRows || []).forEach((row) => {
      const v = String(stageResolver(row) || row?.ticketStage || row?.processStages || '').trim();
      if (v && v !== '—' && v !== '-') values.add(v);
    });
    return MIS_STAGE_FILTER_OPTIONS.concat(
      Array.from(values).filter((name) => !MIS_STAGE_FILTER_OPTIONS.includes(name)).sort((a, b) => a.localeCompare(b)),
    );
  }, [tabScopedRows, stageResolver]);

  const clearFilters = () => {
    setCategory('');
    setSubCategory('');
    setCriticality('');
    setEntity('');
    setCompany('');
    setTicketType('');
    setSource('');
    setClosedBy('');
    setAssignedTo('');
    setRequester('');
    setTicketStatus('');
    setSubject('');
    setStages('');
    setSla('');
    setCreatedDateFrom('');
    setCreatedDateTo('');
    setClosedDateFrom('');
    setClosedDateTo('');
    setReopenedDateFrom('');
    setReopenedDateTo('');
  };

  const hasActive = !!(
    category
    || subCategory
    || criticality
    || entity
    || company
    || ticketType
    || source
    || closedBy
    || ticketStatus
    || subject
    || stages
    || sla
    || createdDateFrom
    || createdDateTo
    || closedDateFrom
    || closedDateTo
    || reopenedDateFrom
    || reopenedDateTo
    || (assignedTo && assignedTo !== 'All')
    || (requester && requester !== 'All')
  );

  const params = useMemo(
    () => ({
      category,
      subCategory,
      criticality,
      entity,
      company,
      ticketType,
      source,
      closedBy,
      assignedTo,
      requester,
      ticketStatus,
      subject,
      stages,
      sla,
      createdDateFrom,
      createdDateTo,
      closedDateFrom,
      closedDateTo,
      reopenedDateFrom,
      reopenedDateTo,
      categoryField,
      resolveTicketStatus,
      resolveStage: stageResolver,
    }),
    [
      category,
      subCategory,
      criticality,
      entity,
      company,
      ticketType,
      source,
      closedBy,
      assignedTo,
      requester,
      ticketStatus,
      subject,
      stages,
      sla,
      createdDateFrom,
      createdDateTo,
      closedDateFrom,
      closedDateTo,
      reopenedDateFrom,
      reopenedDateTo,
      categoryField,
      resolveTicketStatus,
      stageResolver,
    ],
  );

  return {
    category,
    setCategory,
    subCategory,
    setSubCategory,
    criticality,
    setCriticality,
    entity,
    setEntity,
    company,
    setCompany,
    ticketType,
    setTicketType,
    source,
    setSource,
    closedBy,
    setClosedBy,
    assignedTo,
    setAssignedTo,
    requester,
    setRequester,
    ticketStatus,
    setTicketStatus,
    subject,
    setSubject,
    stages,
    setStages,
    sla,
    setSla,
    createdDateFrom,
    setCreatedDateFrom,
    createdDateTo,
    setCreatedDateTo,
    closedDateFrom,
    setClosedDateFrom,
    closedDateTo,
    setClosedDateTo,
    reopenedDateFrom,
    setReopenedDateFrom,
    reopenedDateTo,
    setReopenedDateTo,
    categoryOptions,
    subCategoryOptions,
    criticalityOptions,
    entityOptions,
    ticketTypeOptions,
    sourceOptions,
    closedByOptions,
    assignedToOptions,
    requesterOptions,
    ticketStatusOptions,
    subjectOptions,
    stagesOptions,
    clearFilters,
    hasActive,
    params,
  };
}

/** Draft + applied date range — click Apply to filter dashboard data. */
export function useITDashboardDateRange() {
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });

  const apply = () => setApplied({ from: draftFrom, to: draftTo });
  const clear = () => {
    setDraftFrom('');
    setDraftTo('');
    setApplied({ from: '', to: '' });
  };

  const isActive = !!(applied.from || applied.to);
  const hasPendingChanges = draftFrom !== applied.from || draftTo !== applied.to;
  const canApply = hasPendingChanges && (draftFrom || draftTo);

  return {
    draftFrom,
    setDraftFrom,
    draftTo,
    setDraftTo,
    applied,
    apply,
    clear,
    isActive,
    hasPendingChanges,
    canApply,
  };
}

function itDateInputClass(mis = isMisModernUi()) {
  return mis
    ? `w-full min-w-[9.5rem] ${IT_SURFACE.radius} ${IT_SURFACE.borderMis} bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/20`
    : `w-full min-w-[9.5rem] ${IT_SURFACE.radius} ${IT_SURFACE.border} bg-white px-3 py-2 text-sm font-medium text-[#172B4D] outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25`;
}

/** Top-of-dashboard date range bar — Apply filters loaded rows to the selected period. */
export function ITDashboardDateRangeBar({
  from,
  to,
  appliedFrom = '',
  appliedTo = '',
  onFromChange,
  onToChange,
  onApply,
  onClear,
  isActive = false,
  canApply = false,
  className = '',
}) {
  const mis = useIsMisModern();
  const shell = mis
    ? `${IT_SURFACE.borderMis} bg-white ${IT_SURFACE.shadow}`
    : `${IT_SURFACE.border} bg-gray-50`;

  return (
    <div className={`${shell} ${IT_SURFACE.radius} px-3 py-3 sm:px-4 ${className}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={`mt-2 inline-flex h-8 w-8 shrink-0 items-center justify-center ${IT_SURFACE.radiusBadge} border ${
            mis ? 'border-[#99f6e4] bg-[#f0fdfa] text-[#0f766e]' : 'border-[#99f6e4] bg-[#f0fdfa] text-[#047857]'
          }`}>
            <CalendarRange className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wide ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>
              Date range
            </p>
            <p className={`text-sm ${mis ? 'text-slate-600' : 'text-[#44546F]'}`}>
              Select dates and click Apply to show only requests in that period.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[9.5rem] flex-col gap-1">
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>
              From
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className={itDateInputClass(mis)}
            />
          </label>
          <label className="flex min-w-[9.5rem] flex-col gap-1">
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>
              To
            </span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => onToChange(e.target.value)}
              className={itDateInputClass(mis)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApply}
              disabled={!canApply}
              className={mis ? itBtnPrimary('px-4 py-2 text-sm') : `${IT_SURFACE.radius} border border-[#047857] bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Apply
            </button>
            {isActive ? (
              <button
                type="button"
                onClick={onClear}
                className={itBtnSecondary('px-4 py-2 text-sm')}
              >
                Clear dates
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {isActive ? (
        <p className={`mt-2 text-xs font-medium ${mis ? 'text-[#0f766e]' : 'text-[#047857]'}`}>
          Showing data{appliedFrom ? ` from ${appliedFrom}` : ''}{appliedTo ? ` to ${appliedTo}` : ''}
        </p>
      ) : null}
    </div>
  );
}

export function ITTabButton({ active, label, count, onClick }) {
  const mis = isMisModernUi();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
        mis
          ? `${IT_SURFACE.radiusTab} ${active ? 'bg-[#f0fdfa] text-[#0f766e] ring-1 ring-inset ring-[#99f6e4]' : 'text-slate-600 hover:bg-slate-50'}`
          : `${IT_SURFACE.radiusTab} ${active ? IT_THEME.tabActive : IT_THEME.tabInactive}`
      }`}
    >
      {label}
    </button>
  );
}

export function ITDashboardDataSection({ children }) {
  return <section className={IT_THEME.dataSection}>{children}</section>;
}

export function ITTableSectionHeader({ roleKey, title, subtitle, search, tabs, filters, compact = false }) {
  const role = IT_ROLE_CONFIG[roleKey];
  const SectionIcon = role.sectionIcon;

  if (compact) {
    return (
      <div className={IT_THEME.sectionHead}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {tabs ? (
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {tabs}
            </div>
          ) : null}
          {search != null ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <ITSearchInput value={search.value} onChange={search.onChange} placeholder={search.placeholder} />
            </div>
          ) : null}
        </div>
        {filters ? (
          <div className="mt-3 border-t border-gray-200 pt-3">
            {filters}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={IT_THEME.sectionHead}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className={IT_THEME.sectionIcon}>
            <SectionIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#172B4D] sm:text-base">{title || 'Queue'}</h2>
            <p className="text-xs text-[#626F86]">{subtitle}</p>
          </div>
        </div>
        {search != null && (
          <ITSearchInput value={search.value} onChange={search.onChange} placeholder={search.placeholder} />
        )}
      </div>
      {tabs && (
        <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1 sm:mt-3 sm:flex-wrap sm:overflow-visible">
          {tabs}
        </div>
      )}
    </div>
  );
}

export function ITContentPanel({ label, children, className = '' }) {
  return (
    <div className={`${IT_THEME.contentPanel} ${className}`}>
      {label && <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#626F86]">{label}</p>}
      {children}
    </div>
  );
}

export function ITDetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-200 py-2.5 text-sm last:border-0">
      <span className="shrink-0 text-[#626F86]">{label}</span>
      <span className="text-right font-medium text-[#172B4D] break-words [overflow-wrap:anywhere]">{value || '—'}</span>
    </div>
  );
}

export function ITDetailTile({ label, value }) {
  return (
    <div className={IT_THEME.detailTile}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#97A0AF]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[#172B4D] break-words">{value || '—'}</p>
    </div>
  );
}

export function ITTicketDetailsGrid({ row, showAgentWork = false, showManagerComments = false }) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <ITDetailTile label="Request ID" value={row.requestId} />
      <ITDetailTile label="Requester" value={row.requesterName} />
      <ITDetailTile label="Requester Email" value={row.requesterEmail} />
      <ITDetailTile label="Requested" value={row.requestedDateTime || row.requestedDate} />
      <ITDetailTile label="Ticket Type" value={row.ticketType || 'Others'} />
      <ITDetailTile label="Category" value={row.category || 'Others'} />
      <ITDetailTile label="Department" value={row.department} />
      <ITDetailTile label="Location" value={row.location} />
      <ITDetailTile label="Sub-Category" value={row.subCategory || 'Others'} />
      <ITDetailTile label="Priority" value={row.criticality || 'Low'} />
      <ITDetailTile label="SLA (min)" value={row.slaMinutes != null && row.slaMinutes !== '—' ? String(row.slaMinutes) : ''} />
      <ITDetailTile label="Item Status" value={row.itemStatus} />
      <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
        <ITDetailTile label="Summary" value={row.summary} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
        <ITDetailTile label="Description" value={row.description} />
      </div>
      {showAgentWork && (
        <>
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <ITDetailTile label="Agent Solution" value={row.solution} />
          </div>
          <ITDetailTile label="Reason for Hold" value={row.holdReason} />
        </>
      )}
      {showManagerComments && (
        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
          <ITDetailTile label="Manager Comments" value={row.managerComments} />
        </div>
      )}
    </div>
  );
}

export function ITSectionIconBox({ icon: Icon }) {
  return (
    <div className={IT_THEME.sectionIcon}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function ITKpiSection({ className, children }) {
  return (
    <div className={IT_THEME.kpiZone}>
      <section className={className || IT_THEME.kpiGrid}>{children}</section>
    </div>
  );
}

export function ITCriticalityBadge({ criticality }) {
  const label = !criticality || criticality === '—' ? 'Low' : criticality;
  const priority = IT_PRIORITY[label];
  const style = priority?.badge || JIRA_CRITICALITY_STYLE[label] || IT_PRIORITY.Low.badge;
  const dot = priority?.dot || JIRA_PRIORITY_DOT[label] || IT_PRIORITY.Low.dot;
  return (
    <span className={itBadge(style)} title={label}>
      <span className={itBadgeDot(dot)} aria-hidden />
      {label}
    </span>
  );
}

export function ITTableSkeleton({ colSpan, rows = 4 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      <td colSpan={colSpan} className="px-4 py-4">
        <div className="h-4 animate-pulse rounded-lg bg-gradient-to-r from-slate-100 via-slate-200/80 to-slate-100" />
      </td>
    </tr>
  ));
}

export function ITEmptyTickets({ title, subtitle }) {
  return (
    <div className="px-4 py-14 text-center sm:px-6 sm:py-20">
      <div className="it-empty-icon mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f0fdfa] to-[#ccfbf1] text-[#0d9488] shadow-md shadow-[#0d9488]/10 ring-1 ring-[#99f6e4]/60">
        <LifeBuoy className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <p className="mt-5 text-base font-semibold text-slate-800">{title}</p>
      {subtitle && <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function ITMobileFieldGrid({ fields }) {
  if (!fields?.length) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      {fields.map(({ label, value }) => (
        <div key={label} className={IT_THEME.mobileField}>
          <p className="text-[10px] font-semibold uppercase text-[#97A0AF]">{label}</p>
          <p className="mt-0.5 truncate font-medium text-[#172B4D]" title={String(value || '')}>
            {value || '—'}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ITTicketMobileCard({
  expanded,
  onToggle,
  requestId,
  title,
  subtitle,
  badges,
  fields,
  headerAction,
  footerAction,
  children,
}) {
  return (
    <div className={`${IT_THEME.mobileCard} ${expanded ? IT_THEME.mobileCardExpanded : ''}`}>
      <div className={`flex items-start gap-2 p-3 ${expanded ? IT_THEME.rowExpanded : ''}`}>
        <button
          type="button"
          onClick={onToggle}
          className={`min-w-0 flex-1 touch-manipulation text-left ${!expanded ? IT_THEME.rowHover : ''}`}
          aria-expanded={expanded}
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 shrink-0 ${IT_THEME.chevron}`}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${IT_THEME.requestId}`}>{requestId}</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#172B4D]">{title}</p>
              {subtitle && <p className="mt-0.5 truncate text-[11px] text-[#626F86]">{subtitle}</p>}
              {badges && <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>}
              {!expanded && <ITMobileFieldGrid fields={fields} />}
            </div>
          </div>
        </button>
        {headerAction ? <div className="shrink-0 pt-0.5">{headerAction}</div> : null}
      </div>
      {footerAction && (
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-2.5">
          {footerAction}
        </div>
      )}
      {expanded && children && (
        <div className="border-t border-gray-200">{children}</div>
      )}
    </div>
  );
}

export function ITTableFooter({ children }) {
  return (
    <div className={IT_THEME.tableFooter}>
      <p className="text-xs text-[#626F86]">{children}</p>
    </div>
  );
}

export { Layers, Ticket };
