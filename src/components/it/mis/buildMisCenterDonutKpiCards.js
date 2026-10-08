import {
  ClipboardList,
  Layers,
  Activity,
  Timer,
  ClockAlert,
  GitBranch,
  Inbox,
  UserCheck,
  Ticket,
  Ban,
} from 'lucide-react';
import { colorForDonutSegment, MIS_CENTER_LEFT_COUNT, MIS_CENTER_RIGHT_COUNT } from './misDonutLayout.js';
import { IT_KPI_ACCENT } from '../itDesignTokens.js';

const BASE_PALETTE = [
  IT_KPI_ACCENT.brand,
  IT_KPI_ACCENT.violet,
  IT_KPI_ACCENT.success,
  IT_KPI_ACCENT.warning,
  IT_KPI_ACCENT.error,
];

/**
 * Four insight KPIs for center-donut row: 2 left | donut | 2 right.
 * SLA breach detail stays in the Health Monitor row below.
 */
export function buildMisCenterDonutKpiCards({
  queueType = 'service',
  activeQueue = 'ServiceQueue',
  queuePendingCounts = null,
  totalInScope = 0,
  activePipeline = 0,
  sla = {},
  criticalHighCount = 0,
} = {}) {
  const isCr = queueType === 'cr' || activeQueue === 'ChangeRequests';
  const pending = queuePendingCounts
    ? (activeQueue === 'ServiceQueue'
      ? (queuePendingCounts.ServiceQueue ?? 0)
      : (queuePendingCounts.ChangeRequests ?? 0))
    : 0;

  const cards = [
    {
      label: 'Action Required',
      value: pending,
      icon: ClipboardList,
      ...BASE_PALETTE[0],
    },
    {
      label: isCr ? 'Active Change Requests' : 'Active Pipeline',
      value: activePipeline,
      icon: isCr ? GitBranch : Activity,
      ...BASE_PALETTE[1],
    },
    {
      label: isCr ? 'Total Change Requests' : 'Total Service Requests',
      value: totalInScope,
      icon: Layers,
      ...BASE_PALETTE[2],
    },
    {
      label: 'Nearing SLA',
      value: sla.slaAtRisk ?? 0,
      icon: Timer,
      isSla: true,
      ...BASE_PALETTE[3],
    },
  ];

  return {
    leftCards: cards.slice(0, MIS_CENTER_LEFT_COUNT),
    rightCards: cards.slice(MIS_CENTER_LEFT_COUNT, MIS_CENTER_LEFT_COUNT + MIS_CENTER_RIGHT_COUNT),
  };
}

function buildSlaBreachedKpiCard({ slaBreached = 0, slaBreachedOpen = null, slaBreachedClosed = null } = {}) {
  return {
    label: 'SLA Breached',
    filterKey: 'SlaBreached',
    value: (slaBreachedOpen != null || slaBreachedClosed != null)
      ? ((slaBreachedOpen ?? 0) + (slaBreachedClosed ?? 0))
      : slaBreached,
    sub: (slaBreachedOpen != null || slaBreachedClosed != null)
      ? `Open ${slaBreachedOpen ?? 0} · Closed ${slaBreachedClosed ?? 0}`
      : undefined,
    icon: ClockAlert,
    isSla: true,
    ...BASE_PALETTE[3],
  };
}

/** Icons for change-request queue KPI cards, keyed by status tab. */
const CR_QUEUE_CARD_ICONS = {
  AllTickets: Ticket,
  InApproval: UserCheck,
  PendingTask: ClipboardList,
  FirstLevelPending: Timer,
  Implementation: Activity,
  Completed: Inbox,
};

/** Refex KPI filter cards — role/scope-specific; each card maps to an existing status tab key. */
export function buildMisRefexCenterDonutKpiCards({
  role = 'monitoring',
  scope = 'me',
  myTasks = 0,
  pendingTasks = null,
  employeeFeedback = 0,
  totalTickets = 0,
  activeTickets = 0,
  openTickets = null,
  closedTickets = 0,
  rejectedTickets = 0,
  slaBreached = 0,
  slaBreachedOpen = null,
  slaBreachedClosed = null,
  reopened = 0,
  crCards = null,
  /** Refex IT Agent only — hide My Tickets card (merged into Open Tickets). */
  mergeMyTicketsIntoOpen = false,
} = {}) {
  const allTicketsCard = {
    label: 'All Tickets',
    filterKey: 'AllTickets',
    value: totalTickets,
    icon: Ticket,
    ...BASE_PALETTE[2],
  };

  let kpiCards = [];

  if (role === 'crQueue') {
    kpiCards = (crCards || []).map((card, index) => ({
      icon: CR_QUEUE_CARD_ICONS[card.filterKey] || GitBranch,
      ...card,
      ...BASE_PALETTE[index % BASE_PALETTE.length],
    }));
  } else if (role === 'techSupport') {
    void reopened;
    kpiCards = [
      allTicketsCard,
      // Extrovis keeps My Tickets + Open Tickets. Refex IT Agent merges them into Open.
      ...(scope === 'team' || mergeMyTicketsIntoOpen ? [] : [{
        label: 'My Tickets',
        filterKey: 'AssignedToMe',
        value: myTasks,
        icon: ClipboardList,
        ...BASE_PALETTE[0],
      }]),
      ...(typeof openTickets === 'number' ? [{
        label: 'Open Tickets',
        filterKey: 'OpenTickets',
        value: openTickets,
        icon: Inbox,
        ...BASE_PALETTE[1],
      }] : []),
      buildSlaBreachedKpiCard({ slaBreached, slaBreachedOpen, slaBreachedClosed }),
      {
        label: 'Closed',
        filterKey: 'Closed',
        value: closedTickets,
        icon: Inbox,
        ...BASE_PALETTE[2],
      },
    ];
  } else {
    const pendingValue = typeof pendingTasks === 'number' ? pendingTasks : myTasks;
    void activeTickets;
    void scope;
    void employeeFeedback;
    void reopened;
    kpiCards = [
      allTicketsCard,
      {
        label: 'Pending Approval',
        filterKey: 'PendingTask',
        value: pendingValue,
        icon: ClipboardList,
        ...BASE_PALETTE[0],
      },
      ...(typeof openTickets === 'number' ? [{
        label: 'Open Tickets',
        filterKey: 'OpenTickets',
        value: openTickets,
        icon: Inbox,
        ...BASE_PALETTE[1],
      }] : []),
      {
        label: 'Closed Tickets',
        filterKey: 'Closed',
        value: closedTickets,
        icon: Inbox,
        ...BASE_PALETTE[2],
      },
      {
        label: 'Rejected',
        filterKey: 'Rejected',
        value: rejectedTickets,
        icon: Ban,
        ...BASE_PALETTE[4],
      },
      buildSlaBreachedKpiCard({ slaBreached, slaBreachedOpen, slaBreachedClosed }),
    ];
  }

  return {
    kpiCards,
    leftCards: kpiCards.slice(0, MIS_CENTER_LEFT_COUNT),
    rightCards: kpiCards.slice(MIS_CENTER_LEFT_COUNT, MIS_CENTER_LEFT_COUNT + MIS_CENTER_RIGHT_COUNT),
  };
}

const PREFERENCE_SERVICE = ['status', 'priority', 'category', 'sla'];
const PREFERENCE_CR = ['status', 'category', 'priority', 'sla'];

/** Superset MIS tabs — excluded from donut slices; center total uses these counts instead. */
const DONUT_SUPERSET_STATUS_TAB_KEYS = new Set(['All', 'AllTickets']);

function sumValues(data = []) {
  return (data || []).reduce((sum, item) => sum + (item?.value ?? 0), 0);
}

function resolveDonutCenterTotal(tabCounts = {}, segmentTotal = 0) {
  const superset = tabCounts?.AllTickets ?? tabCounts?.All;
  if (superset != null && superset > 0) return superset;
  return segmentTotal;
}

function buildMisDonutCandidates({
  activeQueue = 'ServiceQueue',
  statusTabs = [],
  tabCounts = {},
  priorityData = [],
  categoryData = [],
  slaKpis = {},
  healthMetrics = null,
} = {}) {
  const isCr = activeQueue === 'ChangeRequests';

  const statusData = (statusTabs || [])
    .filter((tab) => !DONUT_SUPERSET_STATUS_TAB_KEYS.has(tab.key))
    .map((tab) => ({ name: tab.label || tab.key, value: tabCounts?.[tab.key] ?? 0 }))
    .filter((item) => item.value > 0);

  const statusSegmentTotal = sumValues(statusData);

  const priorityFiltered = (priorityData || []).filter((item) => (item?.value ?? 0) > 0);
  const categoryFiltered = (categoryData || []).filter((item) => (item?.value ?? 0) > 0);

  const atRisk = healthMetrics?.atRisk ?? slaKpis?.slaAtRisk ?? 0;
  const breached = healthMetrics?.breached ?? slaKpis?.slaBreached ?? 0;
  const onTime = healthMetrics?.onTrack ?? Math.max(0, (healthMetrics?.openWithSla ?? 0) - atRisk - breached);
  const slaData = [
    { name: 'On time', value: onTime },
    { name: 'At risk', value: atRisk },
    { name: 'Breached', value: breached },
  ].filter((item) => item.value > 0);

  return [
    {
      type: 'status',
      title: isCr ? 'Change Request Status' : 'Ticket Status',
      data: statusData,
      total: statusSegmentTotal,
      centerTotal: resolveDonutCenterTotal(tabCounts, statusSegmentTotal),
    },
    {
      type: 'category',
      title: isCr ? 'Change Type Distribution' : 'Request Type Distribution',
      data: categoryFiltered,
      total: sumValues(categoryFiltered),
      centerTotal: sumValues(categoryFiltered),
    },
    {
      type: 'priority',
      title: isCr ? 'Criticality Distribution' : 'Priority Distribution',
      data: priorityFiltered,
      total: sumValues(priorityFiltered),
      centerTotal: sumValues(priorityFiltered),
    },
    {
      type: 'sla',
      title: 'SLA Distribution',
      data: slaData,
      total: sumValues(slaData),
      centerTotal: sumValues(slaData),
    },
  ].filter((item) => item.total > 0);
}

export function resolveMisDonutDistribution({
  activeQueue = 'ServiceQueue',
  statusTabs = [],
  tabCounts = {},
  priorityData = [],
  categoryData = [],
  slaKpis = {},
  healthMetrics = null,
} = {}) {
  const isCr = activeQueue === 'ChangeRequests';
  const candidates = buildMisDonutCandidates({
    activeQueue,
    statusTabs,
    tabCounts,
    priorityData,
    categoryData,
    slaKpis,
    healthMetrics,
  });

  const preference = isCr ? PREFERENCE_CR : PREFERENCE_SERVICE;
  for (const type of preference) {
    const match = candidates.find((item) => item.type === type);
    if (match) return match;
  }

  return {
    type: 'default',
    title: isCr ? 'Change Request Overview' : 'Service Queue Overview',
    data: [],
    centerTotal: resolveDonutCenterTotal(tabCounts, 0),
  };
}

/** Top graphical charts for First/Final / modern MIS insight row (status + priority/category). */
export function resolveMisDonutChartSet(context = {}, { limit = 2 } = {}) {
  const isCr = context.activeQueue === 'ChangeRequests';
  const preference = isCr ? PREFERENCE_CR : PREFERENCE_SERVICE;
  const candidates = buildMisDonutCandidates(context);
  const charts = [];
  for (const type of preference) {
    const match = candidates.find((item) => item.type === type);
    if (match) charts.push(match);
    if (charts.length >= limit) break;
  }
  return charts;
}

export function mapDonutSegments(distributionData = [], type = 'default') {
  return (distributionData || [])
    .filter((item) => (item?.value ?? 0) > 0)
    .map((item, index) => ({
      label: item.name,
      value: item.value,
      color: colorForDonutSegment(item.name, index, type),
    }));
}

/** Center label beneath the donut total count. */
export function resolveMisDonutCenterLabel({
  activeQueue = 'ServiceQueue',
  distributionTitle = '',
} = {}) {
  const title = distributionTitle || '';
  if (activeQueue === 'ChangeRequests') {
    if (/approval/i.test(title)) return 'Total approvals';
    return 'Total changes';
  }
  if (/request type/i.test(title)) return 'Total requests';
  return 'Total tickets';
}

/** Short card title for the donut header (sentence-style casing). */
export function resolveMisDonutCardTitle(distributionTitle = '', activeQueue = 'ServiceQueue') {
  const title = distributionTitle || '';
  if (/change request status/i.test(title)) return 'Change status';
  if (/ticket status/i.test(title)) return 'Ticket status';
  if (/approval/i.test(title)) return 'Approval status';
  if (/change type/i.test(title)) return 'Change types';
  if (/request type/i.test(title)) return 'Request types';
  if (/priority/i.test(title)) return 'Priority mix';
  if (/criticality/i.test(title)) return 'Criticality mix';
  if (/sla/i.test(title)) return 'SLA overview';
  return activeQueue === 'ChangeRequests' ? 'Change status' : 'Ticket status';
}

/** @deprecated Use buildMisCenterDonutKpiCards */
export const buildMisApproverCenterKpiCards = buildMisCenterDonutKpiCards;
