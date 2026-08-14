/** Refex Employee Dashboard — Kissflow field / activity constants (from Service_Items_Refex_A00). */

import { REFEX_EMPLOYEE_COL, REFEX_EMPLOYEE_TABLE_COL } from '../../../lib/itDashboardProfiles.js';
import { isExtrovisServiceDashboardContext } from '../../../lib/kfITServiceDashboard.js';

// Column maps now live with the entity profiles (Refex + Extrovis share this flow).
export { REFEX_EMPLOYEE_COL, REFEX_EMPLOYEE_TABLE_COL };

export const EMPLOYEE_APPROVAL_ACTIVITY_ID = 'Activity_Ot8GrzZvSl';
/** Legacy Employee Feedback activity — older in-flight Refex tickets. */
export const EMPLOYEE_APPROVAL_ACTIVITY_ID_LEGACY = 'Activity_OCGdY6c0WJ';
export const DEPENDENCY_ASSIGNEE_ACTIVITY_ID = 'Activity_4ec092cgUY';
export const TECH_SUPPORT_AFTER_DEPENDENCY_ACTIVITY_ID = 'Activity_tPGd7-Oggb';
export const L1_APPROVAL_ACTIVITY_ID = 'Activity_oghxnzOkyH';
export const L2_APPROVAL_ACTIVITY_ID = 'Activity_WRjo7uuuOz';
export const IT_MANAGER_APPROVAL_ACTIVITY_ID = 'Activity_-_FFwHdMSN';
export const IT_HEAD_APPROVAL_ACTIVITY_ID = 'Activity_ZPJhIX0l3A';
export const IT_TECH_PICKUP_ACTIVITY_ID = 'Activity_br-intVidq';
export const IT_TECH_SUPPORT_ACTIVITY_ID = 'Activity_9h2Y_0Yvdw';

/** @deprecated Prefer IT Tech Reopen — legacy step label for older tickets. */
export const EMPLOYEE_APPROVAL_STEP_LABEL = 'IT Tech Reopen';

export const IT_AGENT_STEP_LABEL = 'IT Agent Refex';

export const REFEX_PROCESS_NAME = 'Refex';

/** Employee-facing ticket status (not workflow stage). */
export const TICKET_STATUS = {
  Open: 'Open',
  /** @deprecated Removed from UI — IT Tech Reopen maps to Closed. */
  EmployeeFeedback: 'Employee Feedback',
  /** @deprecated use Closed (IT Tech Reopen) */
  AwaitingYourConfirmation: 'Employee Feedback',
  Closed: 'Closed',
  Rejected: 'Rejected',
  Reopened: 'Reopened',
};

/** @deprecated use TICKET_STATUS */
export const EMPLOYEE_DISPLAY_STATUS = TICKET_STATUS;

export const STATUS_FILTER_TABS = [
  { key: 'All', label: 'All Tickets', tooltip: 'Financial Year Tickets' },
  { key: 'Open', label: 'Open', tooltip: 'Currently Open Tickets' },
  { key: 'SlaBreached', label: 'SLA Breached', tooltip: 'Tickets that breached SLA' },
  { key: 'Closed', label: 'Closed', tooltip: 'Successfully Closed Tickets' },
  { key: 'Reopened', label: 'Reopened', tooltip: 'Tickets Reopened by You' },
];

export const KPI_CARDS = [
  { key: 'All', label: 'All Tickets', filterKey: 'All', sub: 'All your requests', tone: 'blue' },
  { key: 'open', label: 'Open Tickets', filterKey: 'Open', sub: 'Currently open', tone: 'blue' },
  { key: 'slaBreached', label: 'SLA Breached', filterKey: 'SlaBreached', sub: 'SLA breached tickets', tone: 'red' },
  { key: 'closed', label: 'Closed Tickets', filterKey: 'Closed', sub: 'Successfully completed', tone: 'green' },
  { key: 'reopened', label: 'Reopened Tickets', filterKey: 'Reopened', sub: 'Sent back to agent', tone: 'orange' },
];

const FIXED_COLUMNS = [
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
  { key: 'viewDetails', label: '' },
];

/** MIS Ticket Status filter — Open / Closed only. */
export const MIS_TICKET_STATUS_FILTER_OPTIONS = [
  TICKET_STATUS.Open,
  TICKET_STATUS.Closed,
];

export function getEmployeeMisColumns() {
  if (isExtrovisServiceDashboardContext()) {
    return FIXED_COLUMNS.filter(
      (col) => !['source', 'ticketType', 'category', 'subCategory'].includes(col.key),
    );
  }
  return FIXED_COLUMNS;
}
