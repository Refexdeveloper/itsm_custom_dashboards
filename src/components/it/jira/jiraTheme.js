/**
 * ITSM semantic styling — priority, workflow status, and legacy Jira-compat exports.
 */
import { IT_PRIORITY, IT_SLA, IT_TICKET_STATUS } from '../itDesignTokens.js';

export const JIRA_THEME = {
  bg: '#f6f7f9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  headerBar: '#0f766e',
  primary: '#0d9488',
  primaryHover: '#0f766e',
  primaryDark: '#047857',
  primarySoft: '#f0fdfa',
  primaryRing: '#99f6e4',
  text: '#0F172A',
  textSub: '#475569',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  success: '#059669',
  successSoft: '#ECFDF5',
  danger: '#DC2626',
  rowHover: '#F8FAFC',
  rowActive: '#f0fdfa',
  tableHead: '#F1F5F9',
};

export const JIRA_CRITICALITY_STYLE = {
  Critical: IT_PRIORITY.Critical.badge,
  High: IT_PRIORITY.High.badge,
  Medium: IT_PRIORITY.Medium.badge,
  Low: IT_PRIORITY.Low.badge,
};

export const JIRA_ITEM_STATUS_STYLE = {
  Completed: `${IT_TICKET_STATUS.resolved.badge}`,
  Resolved: `${IT_TICKET_STATUS.resolved.badge}`,
  Closed: `${IT_TICKET_STATUS.closed.badge}`,
  'On Hold': `${IT_TICKET_STATUS.onHold.badge}`,
  Hold: `${IT_TICKET_STATUS.onHold.badge}`,
  Picked: `${IT_TICKET_STATUS.inProgress.badge}`,
  'In Progress': `${IT_TICKET_STATUS.inProgress.badge}`,
  'Not Picked Yet': `${IT_TICKET_STATUS.open.badge}`,
  'Not picked yet': `${IT_TICKET_STATUS.open.badge}`,
  Open: `${IT_TICKET_STATUS.open.badge}`,
  Cancelled: `${IT_TICKET_STATUS.cancelled.badge}`,
  'Employee Feedback': `${IT_TICKET_STATUS.feedback.badge}`,
  Reopened: `${IT_TICKET_STATUS.reopened.badge}`,
  'In Approval': `${IT_TICKET_STATUS.approval.badge}`,
};

export const JIRA_SLA_STYLE = {
  ok: IT_SLA.onTrack.badge,
  warning: IT_SLA.atRisk.badge,
  breached: IT_SLA.breached.badge,
  none: IT_SLA.none.badge,
  completed: IT_SLA.none.badge,
};

export const JIRA_PRIORITY_DOT = {
  Critical: IT_PRIORITY.Critical.dot,
  High: IT_PRIORITY.High.dot,
  Medium: IT_PRIORITY.Medium.dot,
  Low: IT_PRIORITY.Low.dot,
};

export const JIRA_SLA_DOT = {
  ok: IT_SLA.onTrack.dot,
  warning: IT_SLA.atRisk.dot,
  breached: IT_SLA.breached.dot,
  none: IT_SLA.none.dot,
};
