/**
 * Five-slot insight row: 15% | 15% | 40% | 15% | 15%
 * Mobile: 2-column stack with donut spanning full width between KPI pairs.
 */
export const MIS_CENTER_INSIGHT_GRID =
  'grid min-w-0 grid-cols-2 items-stretch gap-2.5 sm:gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,8fr)_minmax(0,3fr)_minmax(0,3fr)]';

export const MIS_CENTER_DONUT_SPAN = 'col-span-2 min-w-0 md:col-span-1';

export const MIS_CENTER_KPI_SLOT = 'flex min-h-0 min-w-0';

export const MIS_CENTER_LEFT_COUNT = 2;
export const MIS_CENTER_RIGHT_COUNT = 2;

export const MIS_DONUT_PRIORITY_COLORS = {
  Critical: '#E53935',
  High: '#FB8C00',
  Medium: '#F59E0B',
  Low: '#22C55E',
  Unknown: '#94A3B8',
};

export const MIS_DONUT_STATUS_COLORS = {
  Open: '#2B5AED',
  'Open Tickets': '#2B5AED',
  InProgress: '#8B5CF6',
  'In Progress': '#8B5CF6',
  Pending: '#F59E0B',
  PendingTask: '#F59E0B',
  'Pending Task': '#F59E0B',
  'Pending Approval': '#F59E0B',
  AgentPending: '#F59E0B',
  Implementation: '#0891B2',
  'In Implementation': '#0891B2',
  Hold: '#64748B',
  HoldTasks: '#64748B',
  'On Hold': '#64748B',
  Resolved: '#22C55E',
  Completed: '#22C55E',
  Cancelled: '#94A3B8',
  InApproval: '#EA580C',
  'In Approval': '#EA580C',
  FirstLevelPending: '#C026D3',
  Rejected: '#DC2626',
};

export const MIS_DONUT_CHART_PALETTE = [
  '#2B5AED',
  '#8B5CF6',
  '#22C55E',
  '#FB8C00',
  '#E53935',
  '#0891B2',
  '#EA580C',
  '#64748B',
];

export function colorForDonutSegment(name, index = 0, type = 'default') {
  if (type === 'priority') {
    return MIS_DONUT_PRIORITY_COLORS[name] || MIS_DONUT_PRIORITY_COLORS.Unknown;
  }
  if (type === 'status') {
    return MIS_DONUT_STATUS_COLORS[name] || MIS_DONUT_CHART_PALETTE[index % MIS_DONUT_CHART_PALETTE.length];
  }
  return MIS_DONUT_CHART_PALETTE[index % MIS_DONUT_CHART_PALETTE.length];
}
