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
  isL1ApprovalStep,
  isL2ApprovalStep,
  isExtrovisServiceDashboardContext,
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
  if (!row) return false;
  const raw = row?.raw ?? row;
  const wf = normLower(raw?._status || row?.systemStatus || row?.workflowStatus || row?.status)
    .replace(/[\s_-]+/g, '');
  // Live InProgress beats a stale isProcessCompleted / Statu_1 Closed stamp.
  if (wf === 'inprogress' || wf === 'pending' || wf === 'draft' || wf === 'assigned') {
    return false;
  }
  if (row?.isProcessCompleted === true) return true;
  return wf === 'completed' || wf === 'complete' || wf === 'withdrawn';
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
    || step === 'ticket reopen'
    || (step.includes('ticket reopen') && !step.includes('reopened'))
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
  // Reopened flag stays Open (KPI merged); row tag identifies reopened tickets.

  const step = getActiveWorkflowStep(row);
  if (OPEN_WORKFLOW_STEPS.has(step)) return true;

  if (isInProgressWorkflow(row) && step && !isEmployeeApprovalRefexStep(step)) {
    return true;
  }

  if (isReopenedTicket(row)) return true;

  return isItAgentRefexStep(step);
}

/** Employee-facing display status — UI mapping only (tabs / form open). */
export function getEmployeeDisplayStatus(row, user = null) {
  void user;
  if (!row || isWithdrawn(row)) return null;

  if (isProcessCompleted(row) || isTechReopenClosedStage(row)) {
    return TICKET_STATUS.Closed;
  }

  // Open unless workflow is actually closed. Missing currentStep / Status=Open
  // must not hide the row from the default Open landing tab.
  return TICKET_STATUS.Open;
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
  // Only the live current step — lastCompletedStep alone must not mark Open as Closed.
  const step = getActiveWorkflowStep(row).toLowerCase();
  if (!step) return false;
  return step.includes('tech reopen')
    || step === 'ticket reopen'
    || (step.includes('ticket reopen') && !step.includes('reopened'))
    || step.includes('reopen window')
    || step.includes('employee feedback');
}

function isClosedMisStatus(row) {
  if (!row) return false;
  if (isRejectedDisplayTicket(row)) return true;
  // Ticket Status Closed is ReOpen Window / Completed only — never Statu_1 / Stage Closed.
  if (isEmployeeFeedbackStageFromReport(row)) return true;
  if (isRefexServiceClosedTicket(row)) return true;
  if (isProcessCompleted(row)) return true;
  if (isTechReopenStepName(row) && !isProcessCompleted(row)) return true;
  const wf = normLower(row?.raw?._status || row?.workflowStatus || row?.systemStatus)
    .replace(/[\s_-]+/g, '');
  return wf === 'completed' || wf === 'complete' || wf === 'withdrawn';
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

/** Live L1/L2 in the signed-in user's pending bucket — HOD/PM approve from Employee. */
export function isEmployeeLivePendingApproval(row) {
  if (!row || isExtrovisServiceDashboardContext()) return false;
  if (!(isL1ApprovalStep(row) || isL2ApprovalStep(row))) return false;
  if (row.isLiveApprovalPending === true) return true;
  if (row.liveApprovalPendingKnown === true) return row.isLiveApprovalPending === true;
  return row.isLiveBucketPending === true && row.isLiveReopenPending !== true;
}

export function matchesEmployeeStatusFilter(row, tabKey, user) {
  if (tabKey === 'PendingTask' || tabKey === 'PendingApproval') {
    return isEmployeeLivePendingApproval(row);
  }
  if (tabKey === 'All') return true;
  if (tabKey === 'SlaBreached') {
    return isServiceQueueSlaBreachedTicket(row)
      && getEmployeeDisplayStatus(row, user) === TICKET_STATUS.Open;
  }
  // Employee Feedback card removed — reopen stage lives under Closed.
  if (tabKey === 'EmployeeFeedback' || tabKey === 'AwaitingYourConfirmation') {
    return false;
  }
  // Legacy Reopened tab → Open (KPI merged; row tag identifies reopened).
  if (tabKey === 'Reopened') {
    return isReopenedTicket(row) && getEmployeeDisplayStatus(row, user) === TICKET_STATUS.Open;
  }
  const status = getEmployeeDisplayStatus(row, user);
  if (!status) return false;
  return status === TICKET_STATUS[tabKey] || status === tabKey;
}
