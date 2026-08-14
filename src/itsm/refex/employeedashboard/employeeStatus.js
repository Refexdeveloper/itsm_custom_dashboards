import {
  EMPLOYEE_APPROVAL_STEP_LABEL,
  TICKET_STATUS,
  IT_AGENT_STEP_LABEL,
} from './constants.js';
import {
  hasCurrentActiveWorkflowTask,
  isCurrentActiveTaskAssignedToUser,
  isServiceQueueSlaBreachedTicket,
  isEmployeeApprovalRefexStep as isEmployeeFeedbackStageFromReport,
  isRefexServiceClosedTicket,
  getActiveDashboardProfile,
} from '../../../lib/kfITServiceDashboard.js';

function norm(value) {
  return String(value ?? '').trim();
}

function normLower(value) {
  return norm(value).toLowerCase();
}

function isWithdrawn(row) {
  const wf = normLower(row?.systemStatus || row?.workflowStatus);
  const statu = normLower(row?.statu || row?.statusLabel);
  return wf === 'withdrawn' || statu === 'withdrawn';
}

function isInProgressWorkflow(row) {
  const wf = normLower(row?.systemStatus || row?.workflowStatus);
  const statu = normLower(row?.statu || row?.statusLabel);
  return wf === 'inprogress' || wf === 'in progress' || statu === 'inprogress' || statu === 'in progress';
}

export function isProcessCompleted(row) {
  if (row?.isProcessCompleted === true) return true;
  const wf = normLower(row?.systemStatus || row?.workflowStatus || row?.status);
  return wf === 'completed' || wf === 'complete';
}

const OPEN_WORKFLOW_STEPS = new Set([
  IT_AGENT_STEP_LABEL,
  'IT Agent',
  'IT Tech',
  'IT Tech Support',
  'IT Tech Pickup',
  'IT Agent PickUp',
  'IT Agent Solution',
  'Start',
  'L1 Approval',
  'L1 Manager',
  'L2 Approval',
  'L2 Manager',
  'IT Manager Approval',
  'IT Manager',
  'IT Head Approval',
  'Dependency Assigne',
  'IT Tech Support After Dependency',
]);

export function isItAgentRefexStep(stepName) {
  return norm(stepName) === IT_AGENT_STEP_LABEL;
}

export function isEmployeeApprovalRefexStep(stepName) {
  const step = normLower(stepName);
  return step === EMPLOYEE_APPROVAL_STEP_LABEL.toLowerCase()
    || step.includes('it tech reopen')
    || step.includes('reopen window')
    || step.includes('employee verification')
    || step.includes('employee feedback')
    || step.includes('employee approval');
}

function readReopenedYesFromRaw(row) {
  const colId = getActiveDashboardProfile()?.serviceCol?.reopenedTicket
    || getActiveDashboardProfile()?.employeeCol?.reopenedTicket;
  if (!colId) return false;
  const raw = row?.raw ?? row;
  const value = raw?.[colId] ?? raw?.Data?.[colId] ?? raw?.data?.[colId];
  if (value === true || value === 1) return true;
  const token = String(value ?? '').trim().toLowerCase();
  return token === 'yes' || token === 'true' || token === '1';
}

export function isReopenedTicket(row) {
  if (!row) return false;
  if (row.reopenedTicket === true) return true;
  if (readReopenedYesFromRaw(row)) return true;
  const statusKey = normLower(row?.status || row?.statusLabel);
  return statusKey === 'reopened';
}

function hasEmployeeApprovalTask(row) {
  return Boolean(row?.employeeMyTaskItem);
}

export function getActiveWorkflowStep(row) {
  return norm(row?.activeWorkflowStep || row?.currentStep);
}

/** IT Tech Reopen (48h) / legacy Employee Feedback — treated as Closed. */
function isTechReopenClosedStage(row) {
  if (hasEmployeeApprovalTask(row)) return true;
  const hint = normLower(row?.employeeDisplayStatusHint);
  if (hint === 'closed' || hint.includes('reopen') || hint.includes('employee feedback')) {
    return true;
  }
  if (isEmployeeApprovalRefexStep(getActiveWorkflowStep(row))) return true;
  return isEmployeeFeedbackStageFromReport(row);
}

function isOpenTicket(row) {
  if (!row || isWithdrawn(row) || isProcessCompleted(row)) return false;
  if (isTechReopenClosedStage(row)) return false;
  if (isReopenedTicket(row)) return false;

  const step = getActiveWorkflowStep(row);
  if (OPEN_WORKFLOW_STEPS.has(step)) return true;

  if (isInProgressWorkflow(row) && step && !isEmployeeApprovalRefexStep(step)) {
    return true;
  }

  return isItAgentRefexStep(step);
}

/** Employee-facing display status — UI mapping only (tabs / form open). */
export function getEmployeeDisplayStatus(row, user = null) {
  void user;
  if (!row || isWithdrawn(row)) return null;

  if (isProcessCompleted(row) || isTechReopenClosedStage(row)) {
    return TICKET_STATUS.Closed;
  }

  if (isReopenedTicket(row)) {
    return TICKET_STATUS.Reopened;
  }

  if (isOpenTicket(row)) {
    return TICKET_STATUS.Open;
  }

  return null;
}

function isRejectedDisplayTicket(row) {
  if (!row) return false;
  const candidates = [
    row.systemStatus,
    row.workflowStatus,
    row.status,
    row.statusLabel,
    row.itemStatusRaw,
    row.itemStatus,
    row.statu,
  ];
  for (const value of candidates) {
    const token = normLower(value).replace(/[\s_-]+/g, '');
    if (token === 'rejected' || token === 'reject' || token === 'declined') return true;
  }
  return false;
}

/** Display-only: rejected tickets are terminal like Closed (Closed By / Closed Date). */
export function isRejectedMisTicket(row) {
  return isRejectedDisplayTicket(row);
}

function isTechReopenStepName(row) {
  const step = getActiveWorkflowStep(row).toLowerCase();
  return step.includes('tech reopen') || step.includes('reopen window');
}

function isClosedMisStatus(row) {
  if (!row) return false;
  if (isRejectedDisplayTicket(row)) return true;
  if (isRefexServiceClosedTicket(row)) return true;
  if (isTechReopenClosedStage(row) || isTechReopenStepName(row)) return true;
  const wf = normLower(row?.raw?._status || row?.workflowStatus);
  return wf === 'completed' || wf === 'complete';
}

/**
 * MIS table Ticket Status from step/status:
 * InProgress → Open; Rejected / Completed / Tech Reopen → Closed.
 */
export function getMisTicketStatus(row, user = null) {
  void user;
  if (isClosedMisStatus(row)) return TICKET_STATUS.Closed;
  return TICKET_STATUS.Open;
}

export function canShowEmployeeFeedbackActions(row, user) {
  void user;
  if (row?.employeeMyTaskItem) return true;
  if (isEmployeeApprovalRefexStep(getActiveWorkflowStep(row))) return true;
  if (isEmployeeFeedbackStageFromReport(row)) return true;
  const step = normLower(getActiveWorkflowStep(row));
  return step === 'employee verification' || step.includes('it tech reopen');
}

export function isEmployeeFeedbackMissing(row) {
  return !hasEmployeeSubmittedFeedback(row);
}

export function hasEmployeeSubmittedFeedback(row) {
  if ((row?.employeeConfirmations || []).length > 0) return true;
  const comments = norm(row?.employeeComments);
  const ratings = row?.employeeRatings;
  const hasRating = ratings != null && ratings !== '' && Number(ratings) > 0;
  return Boolean(comments) || hasRating;
}

/** @deprecated */
export const canShowEmployeeReviewAction = canShowEmployeeFeedbackActions;

export function matchesEmployeeStatusFilter(row, tabKey, user) {
  if (tabKey === 'All') return true;
  if (tabKey === 'SlaBreached') {
    return isServiceQueueSlaBreachedTicket(row);
  }
  // Employee Feedback card removed — reopen stage lives under Closed.
  if (tabKey === 'EmployeeFeedback' || tabKey === 'AwaitingYourConfirmation') {
    return false;
  }
  const status = getEmployeeDisplayStatus(row, user);
  if (!status) return false;
  return status === TICKET_STATUS[tabKey] || status === tabKey;
}
