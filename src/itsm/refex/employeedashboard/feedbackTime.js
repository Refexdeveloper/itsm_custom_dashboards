import { TICKET_STATUS } from './constants.js';
import { getEmployeeDisplayStatus } from './employeeStatus.js';

function norm(value) {
  return String(value ?? '').trim();
}

function parseTs(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** In-progress Employee Feedback StepField entry from Column_pCWmiiKhh4. */
export function getEmployeeFeedbackInProgressActivity(row) {
  return (row?.employeeApprovalActivities || []).find(
    (entry) => norm(entry?.status).toLowerCase() === 'inprogress',
  ) || null;
}

/** Kissflow ExpectedAt on the active Employee Feedback activity — used as the feedback deadline. */
export function getEmployeeFeedbackExpectedAtRaw(row) {
  return getEmployeeFeedbackInProgressActivity(row)?.expectedAt || null;
}

export function getFeedbackExpiryMs(row) {
  const expectedAt = parseTs(getEmployeeFeedbackExpectedAtRaw(row));
  if (expectedAt) return expectedAt.getTime();
  return null;
}

export function isFeedbackExpired(row, now = Date.now()) {
  const expiry = getFeedbackExpiryMs(row);
  if (expiry == null) return false;
  return expiry <= now;
}

export function getFeedbackRemainingMs(row, now = Date.now()) {
  const expiry = getFeedbackExpiryMs(row);
  if (expiry == null) return null;
  return Math.max(0, expiry - now);
}

export function formatFeedbackTimeLeft(row, now = Date.now()) {
  return formatReopenTimeLeft(row, now);
}

export function formatReopenTimeLeft(row, now = Date.now()) {
  const status = getEmployeeDisplayStatus(row);
  if (status !== TICKET_STATUS.EmployeeFeedback) return '—';

  if (isFeedbackExpired(row, now)) return 'Expired';

  const remaining = getFeedbackRemainingMs(row, now);
  if (remaining == null) return '—';

  const totalMinutes = Math.floor(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return 'Less than 1m left';
}

export function isFeedbackTimeWarning(row, now = Date.now()) {
  return isReopenTimeWarning(row, now);
}

export function isReopenTimeWarning(row, now = Date.now()) {
  const remaining = getFeedbackRemainingMs(row, now);
  if (remaining == null) return false;
  return remaining <= 6 * 60 * 60 * 1000;
}
