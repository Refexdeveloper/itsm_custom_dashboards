/** Refex Service Queue MIS columns — shared across Employee, Tech Support, IT Manager, IT Head. */

import { isExtrovisServiceDashboardContext } from '../../../lib/kfITServiceDashboard.js';

/** Shared MIS column order for all service dashboards. */
const REFEX_SERVICE_FIXED_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'requester', label: 'Requester' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'sla', label: 'SLA' },
  { key: 'createdOn', label: 'Created Date' },
  { key: 'ticketStatus', label: 'Ticket Status' },
  { key: 'source', label: 'Source' },
  { key: 'ticketType', label: 'Request Type' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'closedBy', label: 'Closed By' },
  { key: 'closedOn', label: 'Closed Date' },
  { key: 'reopenedOn', label: 'Reopened On' },
];

const EXTROVIS_CLASSIFICATION_KEYS = new Set(['source', 'ticketType', 'category', 'subCategory', 'changeType']);

/** Extrovis / Modepro — classification fields live in the expand panel, not the table. */
const EXTROVIS_SERVICE_FIXED_COLUMNS = REFEX_SERVICE_FIXED_COLUMNS.filter(
  (col) => !EXTROVIS_CLASSIFICATION_KEYS.has(col.key),
);

/** Map dashboard tab keys to employee-style status keys for date/SLA helpers. */
export function mapRefexServiceTabToStatusKey(tabKey = 'AllTickets') {
  switch (tabKey) {
    case 'AllTickets':
    case 'All':
      return 'All';
    case 'AssignedToMe':
    case 'PendingTask':
    case 'SlaBreached':
      return 'InProgress';
    case 'OpenTickets':
    case 'Open':
      return 'Open';
    case 'Active':
    case 'AgentPending':
      return 'InProgress';
    case 'InProgress':
      return 'InProgress';
    case 'EmployeeFeedback':
      return 'EmployeeFeedback';
    case 'Reopened':
      return 'Reopened';
    case 'Closed':
    case 'Resolved':
    case 'Rejected':
      return 'Closed';
    default:
      return 'All';
  }
}

/**
 * @param {string} statusTab — dashboard tab key
 * @param {{ role?: 'employee'|'techSupport'|'monitoring', includeAction?: boolean }} [options]
 */
export function applyExtrovisMisColumnLayout(columns = []) {
  if (!isExtrovisServiceDashboardContext()) return columns;
  return columns.filter((col) => !EXTROVIS_CLASSIFICATION_KEYS.has(col.key));
}

export function getRefexServiceQueueMisColumns(statusTab = 'AllTickets', options = {}) {
  void statusTab;
  void options;
  if (isExtrovisServiceDashboardContext()) return EXTROVIS_SERVICE_FIXED_COLUMNS;
  return REFEX_SERVICE_FIXED_COLUMNS;
}
