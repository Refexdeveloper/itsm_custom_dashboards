import { MIS_MAX_KPI_CARDS } from './misKpiLayout.js';
import { IT_KPI_ACCENT } from '../itDesignTokens.js';

import {
  ClipboardList,
  Layers,
  Activity,
  Timer,
  ClockAlert,
  Flame,
  Inbox,
  PauseCircle,
  MessageCircle,
  UserCheck,
  Hammer,
  Headset,
  GitBranch,
  LayoutGrid,
  Hourglass,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Gauge,
  CalendarCheck,
  Archive,
  RotateCcw,
} from 'lucide-react';

const PALETTE = [
  IT_KPI_ACCENT.brand,
  IT_KPI_ACCENT.violet,
  IT_KPI_ACCENT.success,
  IT_KPI_ACCENT.warning,
  IT_KPI_ACCENT.error,
  IT_KPI_ACCENT.slate,
  IT_KPI_ACCENT.cyan,
  IT_KPI_ACCENT.fuchsia,
];

const TAB_ICON = {
  Open: Inbox,
  OpenTickets: Inbox,
  InProgress: Activity,
  PendingTask: ClipboardList,
  Pending: ClipboardList,
  HoldTasks: PauseCircle,
  OnHold: PauseCircle,
  Hold: PauseCircle,
  Resolved: CheckCircle2,
  Completed: CheckCircle2,
  Cancelled: XCircle,
  AgentPending: Headset,
  InApproval: UserCheck,
  Implementation: Hammer,
  FirstLevelPending: Hourglass,
  All: LayoutGrid,
  ITAgent: Headset,
};

const EXTENDED_KPI_ACCENT = {
  'Open Tickets': IT_KPI_ACCENT.brand,
  'In Progress': IT_KPI_ACCENT.violet,
  'Pending Response': IT_KPI_ACCENT.cyan,
  'On Hold': IT_KPI_ACCENT.warning,
  'Resolved Today': IT_KPI_ACCENT.success,
  'Closed Today': IT_KPI_ACCENT.slate,
  'Cancelled': IT_KPI_ACCENT.error,
  'SLA At Risk': IT_KPI_ACCENT.warning,
  'SLA Compliance': IT_KPI_ACCENT.cyan,
  Overdue: IT_KPI_ACCENT.error,
  Critical: IT_KPI_ACCENT.error,
  'High Priority': IT_KPI_ACCENT.warning,
  'In Approval': IT_KPI_ACCENT.violet,
  'In Implementation': IT_KPI_ACCENT.brand,
  'Completed Today': IT_KPI_ACCENT.success,
  'Total Volume': IT_KPI_ACCENT.slate,
};

function withPalette(cards, { semantic = false } = {}) {
  return cards.slice(0, MIS_MAX_KPI_CARDS).map((card, idx) => {
    const p = semantic && EXTENDED_KPI_ACCENT[card.label]
      ? EXTENDED_KPI_ACCENT[card.label]
      : PALETTE[idx % PALETTE.length];
    return { ...p, ...card };
  });
}

/** Full operational KPI strip — fills dashboard width without empty gaps. */
export function buildMisExtendedKpiCards(metrics = {}, { queueType = 'service' } = {}) {
  const isCr = queueType === 'cr';
  const m = metrics || {};

  if (isCr) {
    return withPalette([
      { label: 'In Approval', value: m.openTickets ?? 0, sub: 'Awaiting sign-off', icon: UserCheck },
      { label: 'In Implementation', value: m.inProgress ?? 0, sub: 'Changes in flight', icon: Hammer },
      { label: 'Completed Today', value: m.resolvedToday ?? 0, sub: 'Closed today', icon: CalendarCheck },
      { label: 'Total Volume', value: (m.openTickets ?? 0) + (m.inProgress ?? 0) + (m.cancelled ?? 0) + (m.resolvedToday ?? 0), sub: 'In current view', icon: Layers },
      { label: 'SLA Compliance', value: `${m.slaCompliancePct ?? 0}%`, sub: 'Resolved within SLA', icon: Gauge },
      { label: 'Overdue', value: m.overdueTickets ?? 0, sub: 'SLA breached', icon: ClockAlert, isSla: true },
      { label: 'Critical', value: m.criticalTickets ?? 0, sub: 'Critical risk', icon: Flame },
      { label: 'High Priority', value: m.highPriorityTickets ?? 0, sub: 'High risk', icon: AlertTriangle },
    ], { semantic: true });
  }

  return withPalette([
    { label: 'Open Tickets', value: m.openTickets ?? 0, sub: 'Awaiting assignment', icon: Inbox },
    { label: 'In Progress', value: m.inProgress ?? 0, sub: 'Being worked on', icon: Activity },
    { label: 'Pending Response', value: m.pendingUserResponse ?? 0, sub: 'Waiting on requester', icon: MessageCircle },
    { label: 'On Hold', value: m.onHold ?? 0, sub: 'Paused tickets', icon: PauseCircle },
    { label: 'Resolved Today', value: m.resolvedToday ?? 0, sub: 'Completed today', icon: CheckCircle2 },
    { label: 'Closed Today', value: m.closedToday ?? 0, sub: 'All closures today', icon: Archive },
    { label: 'Cancelled', value: m.cancelled ?? 0, sub: 'Withdrawn tickets', icon: XCircle },
    { label: 'SLA At Risk', value: m.slaAtRisk ?? 0, sub: 'Approaching deadline', icon: Timer, isSla: true },
    { label: 'SLA Compliance', value: `${m.slaCompliancePct ?? 0}%`, sub: 'Resolved within SLA', icon: Gauge },
    { label: 'Overdue', value: m.overdueTickets ?? 0, sub: 'SLA breached', icon: ClockAlert, isSla: true },
    { label: 'Critical', value: m.criticalTickets ?? 0, sub: 'Critical priority', icon: Flame },
    { label: 'High Priority', value: m.highPriorityTickets ?? 0, sub: 'High priority', icon: AlertTriangle },
  ], { semantic: true });
}

/**
 * ITSM insight KPIs — uses extended operational cards when extendedMetrics is provided.
 */
export function buildMisItsmInsightKpiCards({
  queueType = 'service',
  activeQueue = 'ServiceQueue',
  queuePendingCounts = null,
  totalInScope = 0,
  activePipeline = 0,
  sla = {},
  hasHealthMonitor = false,
  criticalHighCount = 0,
  extendedMetrics = null,
} = {}) {
  const isCr = queueType === 'cr' || activeQueue === 'ChangeRequests';

  if (extendedMetrics) {
    return buildMisExtendedKpiCards(extendedMetrics, { queueType: isCr ? 'cr' : 'service' });
  }

  const pending = queuePendingCounts
    ? (activeQueue === 'ServiceQueue'
      ? (queuePendingCounts.ServiceQueue ?? 0)
      : (queuePendingCounts.ChangeRequests ?? 0))
    : 0;

  const cards = [
    {
      label: 'Action Required',
      value: pending,
      sub: isCr ? 'Awaiting your action' : 'Tasks assigned to you',
      icon: ClipboardList,
    },
    {
      label: isCr ? 'Active Change Requests' : 'Active Pipeline',
      value: activePipeline,
      sub: isCr ? 'Open change requests' : 'Non-completed requests',
      icon: isCr ? GitBranch : Activity,
    },
    {
      label: isCr ? 'Total Change Requests' : 'Total Service Requests',
      value: totalInScope,
      sub: 'Records in current view',
      icon: Layers,
    },
  ];

  if (hasHealthMonitor) {
    cards.push({
      label: 'Critical / High',
      value: criticalHighCount,
      sub: 'Priority workload',
      icon: Flame,
    });
  } else {
    cards.push(
      {
        label: 'Nearing SLA',
        value: sla.slaAtRisk ?? 0,
        sub: 'Approaching deadline',
        icon: Timer,
        isSla: true,
      },
      {
        label: 'SLA Breached',
        value: sla.slaBreached ?? 0,
        sub: 'Past SLA deadline',
        icon: ClockAlert,
        isSla: true,
      },
    );
  }

  return withPalette(cards);
}

/** Refex IT Manager / IT Head monitoring KPI strip. */
export function buildMisRefexMonitoringKpiCards({
  totalTickets = 0,
  activeTickets = 0,
  slaBreached = 0,
  criticalHighCount = 0,
} = {}) {
  return withPalette([
    {
      label: 'Active Tickets',
      value: activeTickets,
      sub: 'Tech Support workload',
      icon: Activity,
    },
    {
      label: 'SLA Breached',
      value: slaBreached,
      sub: 'Past Closure Time SLA',
      icon: ClockAlert,
      isSla: true,
    },
    {
      label: 'Total Tickets',
      value: totalTickets,
      sub: 'Records in current view',
      icon: Layers,
    },
    {
      label: 'Critical / High',
      value: criticalHighCount,
      sub: 'Priority workload',
      icon: Flame,
    },
  ]);
}

/** Employee dashboard — extended metrics when provided, else summary strip. */
export function buildMisEmployeeInsightKpiCards({
  totalRecords = 0,
  activeWorkload = 0,
  slaAtRisk = 0,
  slaBreached = 0,
  criticalHighCount = 0,
  extendedMetrics = null,
} = {}) {
  if (extendedMetrics) {
    return buildMisExtendedKpiCards(extendedMetrics, { queueType: 'service' });
  }

  return withPalette([
    {
      label: 'Total Requests',
      value: totalRecords,
      sub: 'All your tickets',
      icon: Inbox,
    },
    {
      label: 'Active Workload',
      value: activeWorkload,
      sub: 'In progress & on hold',
      icon: Activity,
    },
    {
      label: 'Nearing SLA',
      value: slaAtRisk,
      sub: 'Approaching deadline',
      icon: Timer,
      isSla: true,
    },
    {
      label: 'SLA Breached',
      value: slaBreached,
      sub: 'Past SLA deadline',
      icon: ClockAlert,
      isSla: true,
    },
    {
      label: 'Critical / High',
      value: criticalHighCount,
      sub: 'Priority tickets',
      icon: Flame,
    },
  ].slice(0, 4));
}

/** @deprecated Use buildMisItsmInsightKpiCards — kept for classic analytics references. */
export function buildMisKpiCardsFromTabs(statusTabs, tabCounts, sla = {}) {
  return buildMisItsmInsightKpiCards({
    totalInScope: (statusTabs || []).reduce((sum, tab) => sum + (tabCounts?.[tab.key] ?? 0), 0),
    activePipeline: (statusTabs || [])
      .filter((tab) => !['Resolved', 'Completed', 'Cancelled'].includes(tab.key))
      .reduce((sum, tab) => sum + (tabCounts?.[tab.key] ?? 0), 0),
    sla,
    hasHealthMonitor: false,
  });
}

export { TAB_ICON, Timer as Clock, AlertTriangle, Inbox as FolderOpen, Activity as ListTodo };
