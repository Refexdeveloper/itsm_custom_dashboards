import { isProcessCompleted, isRejectedMisTicket, getMisTicketStatus } from './employeeStatus.js';

function norm(value) {
  return String(value ?? '').trim();
}

function toTimestamp(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function pickLatestTimestamp(entries = []) {
  let best = null;
  let bestTs = 0;
  entries.forEach((value) => {
    const ts = toTimestamp(value);
    if (ts && ts >= bestTs) {
      bestTs = ts;
      best = value;
    }
  });
  return best;
}

function isLowRatingSendBack(entry) {
  const rating = Number(entry?.ratings ?? entry?.rating);
  if (Number.isFinite(rating) && rating > 0 && rating <= 3) return true;
  const comment = norm(entry?.comments || entry?.comment).toLowerCase();
  return comment.includes('not solved') || comment.includes('not resolved');
}

function isMarkedReopened(row) {
  if (!row) return false;
  if (row.reopenedTicket === true || row.reopenedTicket === 1) return true;
  const token = norm(row.reopenedTicket).toLowerCase();
  return token === 'yes' || token === 'true' || token === '1';
}

/**
 * Reopened On — only when the ticket was actually sent back / reopened.
 * Do NOT use normal employee feedback timestamps (that falsely filled Closed rows).
 */
export function getReopenedOnRaw(row) {
  if (!row) return null;

  const confirmations = (row.employeeConfirmations || []).filter(
    (entry) => entry?.comments || entry?.ratings != null,
  );
  const reopenedEntries = confirmations.filter(isLowRatingSendBack);
  if (reopenedEntries.length > 0) {
    const latest = pickLatestTimestamp(reopenedEntries.map((entry) => entry.dateTime));
    if (latest) return latest;
  }

  const sendBacks = (row.employeeApprovalActivities || []).filter(
    (entry) => norm(entry.status).toLowerCase() === 'sendback',
  );
  const latestSendBack = pickLatestTimestamp(sendBacks.map((entry) => entry.actedAt));
  if (latestSendBack) return latestSendBack;

  // Stored reopen stamp only when the Reopened flag is set — never for normal Closed tickets.
  if (isMarkedReopened(row) && row.reopenedAtRaw) return row.reopenedAtRaw;

  return null;
}

export function hasReopenedStamp(row) {
  return Boolean(getReopenedOnRaw(row)) || isMarkedReopened(row);
}

export function getCreatedOnRaw(row) {
  return row?.createdAtRaw || row?.requestedDateTimeRaw || row?.requestedDate || null;
}

export function getClosedOnRaw(row) {
  if (!row) return null;
  const status = getMisTicketStatus(row);
  const closed = status === 'Closed'
    || status === 'Rejected'
    || isProcessCompleted(row)
    || isRejectedMisTicket(row);
  if (!closed) return null;

  // IT Tech Reopen / Closed comparison uses last modified_at.
  const step = String(row?.currentStep || row?.activeWorkflowStep || '').toLowerCase();
  if (step.includes('it tech reopen') || step.includes('employee feedback')) {
    return row.modifiedAtRaw
      || row.raw?._modified_at
      || row.closedAtRaw
      || null;
  }
  if (status === 'Rejected' || isRejectedMisTicket(row)) {
    return row.modifiedAtRaw
      || row.raw?._modified_at
      || row.closedAtRaw
      || null;
  }
  return row.closedAtRaw
    || row.completedItem?._modified_at
    || row.completedItem?.Modified_At
    || row.completedItem?.completedAt
    || row.modifiedAtRaw
    || row.raw?._modified_at
    || null;
}

/** MIS table date-only display — DD MMM YYYY (e.g. 03 Jul 2026). */
export function formatMisTableDate(value) {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/** MIS table time line — e.g. 10:30 AM */
export function formatMisTableTime(value) {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getContextDateRaw(row, statusTab = 'All', columnKey = '') {
  if (columnKey === 'createdOn') {
    return getCreatedOnRaw(row);
  }
  if (columnKey === 'closedOn') {
    return getClosedOnRaw(row);
  }
  if (columnKey === 'reopenedOn') {
    return getReopenedOnRaw(row);
  }
  if (statusTab === 'Reopened') {
    return getReopenedOnRaw(row);
  }
  return getCreatedOnRaw(row);
}
