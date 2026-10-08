import { isMyItem, isServiceQueueSlaBreachedTicket, sortMisTableRows } from '../../../lib/kfITServiceDashboard.js';

import { EMPLOYEE_DISPLAY_STATUS } from './constants.js';

import { getEmployeeDisplayStatus, isEmployeeLivePendingApproval, matchesEmployeeStatusFilter } from './employeeStatus.js';

export function computeEmployeeKpis(rows, user) {
  const visible = (rows || []).filter((row) => isMyItem(row, user));
  const pendingApproval = (rows || []).filter((row) => isEmployeeLivePendingApproval(row)).length;

  const counts = {
    total: visible.length,
    All: visible.length,
    open: 0,
    closed: 0,
    reopened: 0,
    slaBreached: 0,
    pendingApproval,
  };

  visible.forEach((row) => {
    const status = getEmployeeDisplayStatus(row, user);
    if (status === EMPLOYEE_DISPLAY_STATUS.Open) counts.open += 1;
    if (status === EMPLOYEE_DISPLAY_STATUS.Closed) counts.closed += 1;
    if (status === EMPLOYEE_DISPLAY_STATUS.Reopened) counts.reopened += 1;
    if (status === EMPLOYEE_DISPLAY_STATUS.Open && isServiceQueueSlaBreachedTicket(row)) {
      counts.slaBreached += 1;
    }
  });

  return counts;
}

export function collectFilterOptions(rows) {
  const criticalities = new Set();
  const requestTypes = new Set();
  (rows || []).forEach((row) => {
    if (row.criticality && row.criticality !== '—') criticalities.add(row.criticality);
    if (row.ticketType && row.ticketType !== '—') requestTypes.add(row.ticketType);
  });
  return {
    criticalities: ['All', ...[...criticalities].sort((a, b) => a.localeCompare(b))],
    requestTypes: ['All', ...[...requestTypes].sort((a, b) => a.localeCompare(b))],
  };
}

export function filterEmployeeRows(rows, {
  statusTab = 'All',
  criticality = 'All',
  requestType = 'All',
  search = '',
  user = null,
  sortOrder = 'asc',
} = {}) {
  const q = String(search || '').trim().toLowerCase();

  const filtered = (rows || []).filter((row) => {
    const pendingTab = statusTab === 'PendingTask' || statusTab === 'PendingApproval';
    if (pendingTab) {
      if (!isEmployeeLivePendingApproval(row)) return false;
    } else if (!isMyItem(row, user)) {
      return false;
    }
    if (!matchesEmployeeStatusFilter(row, statusTab, user)) return false;

    if (criticality !== 'All' && row.criticality !== criticality) return false;
    if (requestType !== 'All' && row.ticketType !== requestType) return false;

    if (q) {
      const haystack = [
        row.requestId,
        row.ticketType,
        row.category,
        row.subCategory,
        row.criticality,
        row.description,
        row.source,
        getEmployeeDisplayStatus(row, user),
      ].join(' ').toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  return sortMisTableRows(filtered, sortOrder);
}
