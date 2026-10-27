import { isProcessCompleted, isRejectedMisTicket, getMisTicketStatus } from './employeeStatus.js';
import {
  formatRequesterDisplay,
  pickLatestTicketSolver,
  isItsmBotOrSystemActor,
  assignedToLabelForDisplay,
  WAITING_FOR_PICKUP_LABEL,
} from '../../../lib/kfITServiceDashboard.js';

function norm(value) {
  return String(value ?? '').trim();
}

function uniquePersonParts(parts) {
  const seen = new Set();
  const unique = [];
  (parts || []).forEach((part) => {
    const label = norm(part);
    if (!label || label === '—') return;
    if (isItsmBotOrSystemActor(label)) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(label);
  });
  return unique.join(', ');
}

function formatPerson(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    return uniquePersonParts(norm(value).split(',').map((part) => part.trim()).filter(Boolean));
  }
  if (Array.isArray(value)) {
    return uniquePersonParts(value.map(formatPerson));
  }
  if (typeof value === 'object') {
    const nested = value?.User || value?.user || value?.Users || value?.users
      || value?.Members || value?.members;
    const fromNested = nested && nested !== value ? formatPerson(nested) : '';
    const name = norm(value?.Name || value?.name || value?.Email || value?.email);
    if (isItsmBotOrSystemActor(name)) return fromNested;
    if (name && fromNested && fromNested.toLowerCase() !== name.toLowerCase()) {
      return uniquePersonParts([name, fromNested]);
    }
    return name || fromNested;
  }
  return uniquePersonParts([norm(value)]);
}

function isSystemActor(name) {
  return isItsmBotOrSystemActor(name);
}

function pickLatestItAgentHandler(row) {
  const solver = pickLatestTicketSolver(row);
  if (solver) return formatPerson(solver);
  return '';
}

/** IT Agent who handled the ticket before closure — Closed By column (Closed / Rejected). */
export function getClosedByDisplay(row) {
  if (!row) return '—';
  const rejected = isRejectedMisTicket(row);
  const step = String(row?.currentStep || row?.activeWorkflowStep || '').toLowerCase();
  const atReopenHold = step.includes('it tech reopen')
    || step.includes('employee feedback')
    || step.includes('ticket reopen')
    || step.includes('reopen window');
  const closed = isProcessCompleted(row)
    || getMisTicketStatus(row) === 'Closed'
    || atReopenHold;
  // Open / Reopened rows stay blank; Closed / Reopen-hold / Rejected must show who closed it.
  if (!closed && !rejected) return '—';

  if (rejected) {
    const rejector = formatPerson(row?.modifiedBy)
      || formatPerson(row?.raw?._modified_by)
      || formatPerson(row?.completedBy);
    if (rejector && !isSystemActor(rejector)) return rejector;
  }

  if (hasMisDisplayValue(row?.closedBy) && !isSystemActor(formatPerson(row.closedBy))) {
    return formatPerson(row.closedBy);
  }

  const fromAgent = pickLatestItAgentHandler(row);
  if (fromAgent) return fromAgent;

  const assigned = formatPerson(row?.assignedToDisplay || row?.assignedTo);
  if (assigned && !isSystemActor(assigned) && assigned !== '—') return assigned;

  const created = formatPerson(row?.createdBy) || formatRequesterDisplay(row);
  if (created && created !== '—') return created;

  return '—';
}

function hasMisDisplayValue(value) {
  const label = formatPerson(value);
  return Boolean(label) && label !== '—';
}

/** Assigned To display — live human assignee; Closed/reopen uses solver (never ITSM BOT). */
export function getAssignedToDisplay(row) {
  if (!row) return '—';
  const rejected = isRejectedMisTicket(row);
  const step = String(row?.currentStep || row?.activeWorkflowStep || '').toLowerCase();
  const atReopenHold = step.includes('it tech reopen')
    || step.includes('employee feedback')
    || step.includes('ticket reopen')
    || step.includes('reopen window');
  const closed = isProcessCompleted(row)
    || getMisTicketStatus(row) === 'Closed'
    || atReopenHold;

  // Closed / reopen / rejected: same human who solved (matches Closed By), not ITSM BOT.
  if (closed || rejected) {
    const solver = pickLatestItAgentHandler(row);
    if (solver) return solver;
    if (hasMisDisplayValue(row?.closedBy) && !isSystemActor(formatPerson(row.closedBy))) {
      return formatPerson(row.closedBy);
    }
  }

  if (assignedToLabelForDisplay(row, '') === WAITING_FOR_PICKUP_LABEL) {
    return WAITING_FOR_PICKUP_LABEL;
  }

  const live = formatPerson(row?.assignedToDisplay || row?.assignedTo);
  if (live && live !== '—' && !isSystemActor(live)) return live;

  const assignedUser = formatPerson(row?.assignedToUserRaw || row?.assignedToUser);
  if (assignedUser && !isSystemActor(assignedUser)) return assignedUser;

  const rawAssigned = formatPerson(
    row?.raw?._current_assigned_to
    || row?.assignedToRaw,
  );
  if (rawAssigned && !isSystemActor(rawAssigned) && rawAssigned !== '—') return rawAssigned;

  const lastAgent = pickLatestItAgentHandler(row);
  if (lastAgent) return lastAgent;

  if (hasMisDisplayValue(row?.closedBy) && !isSystemActor(formatPerson(row.closedBy))) {
    return formatPerson(row.closedBy);
  }

  // Open tickets only — requester as last resort.
  if (!closed && !rejected) {
    const requester = formatRequesterDisplay(row);
    if (requester && requester !== '—') return requester;
  }

  return '—';
}
