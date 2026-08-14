import { isProcessCompleted, isRejectedMisTicket, getMisTicketStatus } from './employeeStatus.js';
import { formatRequesterDisplay } from '../../../lib/kfITServiceDashboard.js';

function norm(value) {
  return String(value ?? '').trim();
}

function formatPerson(value) {
  if (!value) return '';
  if (typeof value === 'string') return norm(value);
  if (Array.isArray(value)) {
    return value.map(formatPerson).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return norm(value?.Name || value?.name || value?.Email || value?.email);
  }
  return norm(value);
}

function isSystemActor(name) {
  const token = norm(name).toLowerCase();
  if (!token) return false;
  return token.includes('system')
    || token.includes('automation')
    || token.includes('kissflow')
    || token.includes('auto complete')
    || token.includes('auto-completed');
}

function pickLatestItAgentHandler(row) {
  const activities = row?.itAgentActivities || [];
  let bestName = '';
  let bestTs = 0;

  activities.forEach((entry) => {
    const name = formatPerson(entry?.actedBy);
    if (!name || isSystemActor(name)) return;
    const ts = entry?.actedAt ? new Date(entry.actedAt).getTime() : 0;
    if (!Number.isNaN(ts) && ts >= bestTs) {
      bestTs = ts;
      bestName = name;
    }
  });

  if (bestName) return bestName;

  const solutions = row?.agentSolutions || [];
  for (let i = solutions.length - 1; i >= 0; i -= 1) {
    const name = formatPerson(solutions[i]?.agentName);
    if (name && !isSystemActor(name)) return name;
  }

  const completedBy = formatPerson(row?.completedBy);
  if (completedBy && !isSystemActor(completedBy)) return completedBy;

  const assignedUser = formatPerson(row?.assignedToUserRaw || row?.assignedToUser);
  if (assignedUser && !isSystemActor(assignedUser)) return assignedUser;

  const assigned = formatPerson(row?.assignedToDisplay || row?.assignedToRaw || row?.assignedTo);
  if (assigned && !isSystemActor(assigned) && assigned !== '—') {
    return assigned;
  }

  const modifiedBy = formatPerson(row?.modifiedBy);
  if (modifiedBy && !isSystemActor(modifiedBy)) return modifiedBy;

  return '';
}

/** IT Agent who handled the ticket before closure — Closed By column (Closed / Rejected). */
export function getClosedByDisplay(row) {
  if (!row) return '—';
  const rejected = isRejectedMisTicket(row);
  const closed = isProcessCompleted(row) || getMisTicketStatus(row) === 'Closed';
  // Open / Reopened rows stay blank; Closed and Rejected must show who closed it.
  if (!closed && !rejected) return '—';

  if (rejected) {
    const rejector = formatPerson(row?.modifiedBy)
      || formatPerson(row?.raw?._modified_by)
      || formatPerson(row?.completedBy);
    if (rejector && !isSystemActor(rejector)) return rejector;
  }

  const fromAgent = pickLatestItAgentHandler(row);
  if (fromAgent) return fromAgent;

  const assigned = formatPerson(row?.assignedToDisplay || row?.assignedTo);
  if (assigned && !isSystemActor(assigned) && assigned !== '—') return assigned;

  const created = formatPerson(row?.createdBy) || formatRequesterDisplay(row);
  if (created && created !== '—') return created;

  return '—';
}

/** Assigned To display — live assignee, then last agent, then requester. */
export function getAssignedToDisplay(row) {
  if (!row) return '—';
  const live = formatPerson(row?.assignedToDisplay || row?.assignedTo);
  if (live && live !== '—') return live;

  const assignedUser = formatPerson(row?.assignedToUserRaw || row?.assignedToUser);
  if (assignedUser && !isSystemActor(assignedUser)) return assignedUser;

  const lastAgent = pickLatestItAgentHandler(row);
  if (lastAgent) return lastAgent;

  const requester = formatRequesterDisplay(row);
  if (requester && requester !== '—') return requester;

  return '—';
}
