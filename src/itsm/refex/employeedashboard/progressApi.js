import { kfGetJson } from '../../../lib/kfRuntime.js';
import {
  APP_ID,
  getActiveServiceProcessId,
  resolveAccountId,
  getActiveDashboardProfile,
  getReopenWindowMs,
  formatDisplayDateTime,
  getRefexClosedAtRaw,
  getCurrentStepValue,
} from '../../../lib/kfITServiceDashboard.js';
import {
  EMPLOYEE_APPROVAL_STEP_LABEL,
  IT_AGENT_STEP_LABEL,
  REFEX_PROCESS_NAME,
  TICKET_STATUS,
} from './constants.js';

function norm(value) {
  return String(value ?? '').trim();
}

/** Progress branch name — profile-aware (Refex / Extrovis run the same flow shape). */
function processBranchName() {
  return getActiveDashboardProfile()?.processBranchName || REFEX_PROCESS_NAME;
}

function normLower(value) {
  return norm(value).toLowerCase();
}

function toTimestamp(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function isReopenWorkflowStepName(stepName) {
  const name = norm(stepName);
  const lower = normLower(stepName);
  return name === EMPLOYEE_APPROVAL_STEP_LABEL
    || lower === 'employee verification'
    || lower === 'employee feedback'
    || lower.includes('reopen window')
    || lower.includes('it tech reopen')
    || lower === 'it tech reopen';
}

function isTechSupportDisplayLabel(label) {
  const token = normLower(label);
  return token === 'tech support'
    || token === 'it tech support'
    || token === 'open ticket'
    || token === 'it tech';
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

export function buildProgressPath(kfInstance, instanceId) {
  const accountId = resolveAccountId(kfInstance);
  const appQuery = `_application_id=${encodeURIComponent(APP_ID)}`;
  const processId = getActiveServiceProcessId();
  return `/process/2/${accountId}/${processId}/${encodeURIComponent(instanceId)}/progress?${appQuery}`;
}

export async function fetchRefexProcessProgress(kfInstance, instanceId) {
  if (!kfInstance?.api || !instanceId) return null;
  try {
    return await kfGetJson(kfInstance, buildProgressPath(kfInstance, instanceId));
  } catch (err) {
    console.warn('Refex progress API failed:', err?.message || err);
    return null;
  }
}

function isProgressCompleted(progress) {
  const status = normLower(progress?._status || progress?.Status || progress?.status);
  return status === 'completed' || status === 'closed';
}

function normalizeProgressStep(step, index = 0, dueLookup = new Map()) {
  if (!step) return null;
  const name = norm(step?.Name || step?.name || step?.Step_Name);
  if (!name) return null;
  const activityInstanceId = norm(
    step?._activity_instance_id || step?.activityInstanceId || step?.Activity_Instance_ID,
  );
  const expectedAt = step?.ExpectedAt
    || step?.expectedAt
    || step?.DueAt
    || step?.dueAt
    || dueLookup.get(activityInstanceId)
    || null;

  return {
    id: norm(step?._id || step?.Id || `${name}-${index}`),
    activityInstanceId,
    name,
    nodeType: norm(step?.NodeType || step?.nodeType),
    status: norm(step?._status || step?.Status || step?.status),
    actedAt: step?.ActedAt || step?.actedAt || step?.CompletedAt || null,
    actedBy: formatPerson(step?.ActedBy || step?.actedBy),
    assignedTo: formatPerson(step?.AssignedTo || step?.assignedTo),
    note: step?._note ?? step?.Note ?? step?.note ?? step?._Note ?? null,
    moveToType: norm(step?.MoveToType || step?.moveToType),
    sendBackOut: norm(step?.SendBackOut || step?.sendBackOut),
    expectedAt,
    timestamp: toTimestamp(step?.ActedAt || step?.actedAt || step?.CompletedAt),
  };
}

function isTechSlaStepName(stepName) {
  const name = normLower(stepName);
  if (!name) return false;
  return name.includes('tech support')
    || name === 'it tech'
    || name.includes('it tech')
    || name.includes('pickup')
    || name.includes('pick up')
    || name.includes('it agent');
}

function computeClosureDeadline(startRaw, closureMinutes) {
  const minutes = Number(closureMinutes);
  if (!startRaw || !Number.isFinite(minutes) || minutes <= 0) return null;
  const startMs = new Date(startRaw).getTime();
  if (!Number.isFinite(startMs)) return null;
  return new Date(startMs + minutes * 60 * 1000).toISOString();
}

function buildDueLookup(row) {
  const map = new Map();
  const closureMinutes = row?.closureMinutes ?? row?.serviceQueueSlaMinutes;
  [...(row?.itAgentActivities || []), ...(row?.employeeApprovalActivities || [])].forEach((entry) => {
    const id = norm(entry?.id);
    if (!id) return;
    if (entry?.expectedAt) {
      map.set(id, entry.expectedAt);
      return;
    }
    // Fallback deadline: ActedAt (or row modified_at) + Closure_Time for tech steps.
    const start = entry?.actedAt
      || (normLower(entry?.status) === 'inprogress' ? (row?.modifiedAtRaw || null) : null);
    const deadline = computeClosureDeadline(start, closureMinutes);
    if (deadline) map.set(id, deadline);
  });
  return map;
}

function branchNameMatches(entry, wanted) {
  const name = norm(entry?.ProcessName || entry?.processName || entry?.Name || entry?.name);
  if (!name || !wanted) return false;
  if (name === wanted) return true;
  const a = name.toLowerCase();
  const b = wanted.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function stepsFromBranch(branch, dueLookup) {
  const rawSteps = branch?.Steps || branch?.steps || [];
  return (Array.isArray(rawSteps) ? rawSteps : [])
    .map((entry, index) => normalizeProgressStep(entry, index, dueLookup))
    .filter(Boolean);
}

function pickBestProcessBranch(processes, dueLookup) {
  const list = Array.isArray(processes) ? processes : [];
  if (!list.length) return [];
  const wanted = processBranchName();
  const exact = list.find((entry) => branchNameMatches(entry, wanted));
  if (exact) return stepsFromBranch(exact, dueLookup);
  // Fallback — first branch that actually has activity steps (preview / renamed branches).
  const withSteps = list.find((entry) => {
    const raw = entry?.Steps || entry?.steps || [];
    return Array.isArray(raw) && raw.length > 0;
  });
  return withSteps ? stepsFromBranch(withSteps, dueLookup) : [];
}

function collectRefexBranchSteps(progress, dueLookup = new Map()) {
  const rootSteps = progress?.Steps || progress?.steps || [];
  if (Array.isArray(rootSteps)) {
    for (const step of rootSteps) {
      const processes = step?.Process || step?.process || [];
      const fromNested = pickBestProcessBranch(processes, dueLookup);
      if (fromNested.length) return fromNested;
    }
  }

  const fromRootProcess = pickBestProcessBranch(
    progress?.Process || progress?.process || [],
    dueLookup,
  );
  if (fromRootProcess.length) return fromRootProcess;

  // Last resort — root activity steps (exclude pure Start/End events).
  if (Array.isArray(rootSteps) && rootSteps.length) {
    return rootSteps
      .filter((step) => {
        const nodeType = norm(step?.NodeType || step?.nodeType);
        return nodeType !== 'StartEvent' && nodeType !== 'EndEvent';
      })
      .map((entry, index) => normalizeProgressStep(entry, index, dueLookup))
      .filter(Boolean);
  }
  return [];
}

function findRootStep(progress, matcher) {
  const rootSteps = progress?.Steps || progress?.steps || [];
  if (!Array.isArray(rootSteps)) return null;
  return rootSteps.find(matcher) || null;
}

export function mapWorkflowStepLabel(stepName, { isCompleted = false } = {}) {
  const name = norm(stepName);
  if (name === 'Start' || name === 'Started') return 'Opened';
  if (name === 'L1 Approval' || name === 'L1 Manager') return 'L1 Approval';
  if (name === 'L2 Approval' || name === 'L2 Manager') return 'L2 Approval';
  if (name === 'IT Manager Approval' || name === 'IT Manager') return 'IT Manager Approval';
  if (name === 'IT Head Approval') return 'IT Head Approval';
  // Kissflow Goto / rework loops → Revised (all Refex dashboards).
  if (normLower(name).startsWith('goto') || normLower(name).includes('goto(')) {
    return 'Revised';
  }
  // Same flow, entity-specific step names: Refex "IT Tech Support", Extrovis PickUp / Solution.
  if (name === IT_AGENT_STEP_LABEL || name === 'IT Tech Support' || name === 'IT Agent' || name === 'IT Agent Solution') {
    return 'Tech Support';
  }
  if (name === 'IT Agent PickUp' || name === 'IT Tech Pickup') return 'Open Ticket';
  if (name === 'Dependency Assigne') return 'Dependency Assignee';
  if (isReopenWorkflowStepName(name)) return 'Ticket Can be Reopened';
  if (name === 'Completed') return isCompleted ? 'Closed' : 'Closed';
  return name;
}

function buildJourneyNode(step, { subtitle = '', row = null, isCompleted = false } = {}) {
  const actor = step.actedBy || step.assignedTo || '';
  let expectedAt = step.expectedAt || null;
  // Pending / InProgress tech steps: show deadline from ActedAt|modified_at + Closure_Time.
  if (!expectedAt && row && isTechSlaStepName(step.name)) {
    const start = step.actedAt
      || (normLower(step.status) === 'inprogress'
        ? (row?.modifiedAtRaw || row?.raw?._modified_at || null)
        : null);
    expectedAt = computeClosureDeadline(start, row?.closureMinutes ?? row?.serviceQueueSlaMinutes);
  }

  let label = mapWorkflowStepLabel(step.name, { isCompleted });
  let nodeSubtitle = subtitle || (step.name === 'Start' || step.name === 'Started' ? 'Ticket Raised' : '');

  if (isReopenWorkflowStepName(step.name)) {
    label = 'Ticket Can be Reopened';
    if (!expectedAt && row) {
      const closedAt = getRefexClosedAtRaw(row) || step.actedAt || row?.modifiedAtRaw;
      if (closedAt) {
        const startMs = new Date(closedAt).getTime();
        if (Number.isFinite(startMs)) {
          expectedAt = new Date(startMs + getReopenWindowMs(row)).toISOString();
        }
      }
    }
    nodeSubtitle = expectedAt
      ? `till ${formatDisplayDateTime(expectedAt)}`
      : 'till the due date';
  }

  if (label === 'Completed' || (norm(step.name) === 'Completed' && isCompleted)) {
    label = 'Closed';
  }

  const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
  const pendingClock = statusToken === 'inprogress' || statusToken === 'open' || !step.actedAt;
  return {
    type: 'step',
    id: step.id,
    label,
    subtitle: nodeSubtitle,
    actorName: actor,
    actedAt: step.actedAt,
    expectedAt,
    status: step.status,
    isOverdue: Boolean(expectedAt
      ? (pendingClock
        ? Date.now() > toTimestamp(expectedAt)
        : toTimestamp(step.actedAt) > toTimestamp(expectedAt))
      : false),
  };
}

/**
 * Collapse Goto / Revised loops: show Revised on the right (count 1–N),
 * hide the immediate following Tech Support re-entry to remove empty space.
 */
export function compactRevisedWorkflowJourney(journey = []) {
  const out = [];
  let i = 0;
  while (i < journey.length) {
    const node = journey[i];
    const isRevised = node.label === 'Revised'
      || (node.type === 'transition' && normLower(node.label) === 'revised');

    if (isRevised) {
      let count = 0;
      let actedAt = null;
      while (i < journey.length) {
        const n = journey[i];
        const revised = n.label === 'Revised'
          || (n.type === 'transition' && normLower(n.label) === 'revised');
        if (revised) {
          count += 1;
          actedAt = n.actedAt || actedAt;
          i += 1;
          continue;
        }
        // Skip duplicate Tech Support / Open Ticket right after Revised.
        if (n.type !== 'transition' && isTechSupportDisplayLabel(n.label)) {
          i += 1;
          continue;
        }
        break;
      }
      out.push({
        type: 'revised',
        label: count > 1 ? `Revised (${count})` : 'Revised',
        layout: 'left',
        count,
        actedAt,
      });
      continue;
    }

    out.push(node);
    i += 1;
  }
  return out;
}

function buildTransitionNode(label) {
  return {
    type: 'transition',
    label,
  };
}

export function buildWorkflowJourney(progress, row = null) {
  if (!progress) return [];

  const dueLookup = buildDueLookup(row);
  const refexSteps = collectRefexBranchSteps(progress, dueLookup);
  const journey = [];
  const completed = isProgressCompleted(progress);

  const startRaw = findRootStep(
    progress,
    (step) => step?.NodeType === 'StartEvent' || norm(step?.Name) === 'Start',
  );
  if (startRaw) {
    const start = normalizeProgressStep(startRaw, 0, dueLookup);
    if (start) {
      journey.push(buildJourneyNode(start, {
        subtitle: 'Ticket Raised',
        row,
        isCompleted: completed,
      }));
    }
  }

  refexSteps.forEach((step) => {
    // Hide skipped / cancelled branch steps from the MIS workflow rail.
    const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
    if (statusToken === 'skipped' || statusToken === 'cancelled' || statusToken === 'canceled') {
      return;
    }

    journey.push(buildJourneyNode(step, { row, isCompleted: completed }));
    const isSendBack = statusToken === 'sentback'
      || (normLower(step.moveToType) === 'sendback' && statusToken !== 'completed');
    if (isSendBack) {
      journey.push({
        type: 'transition',
        label: 'Ticket Reopened',
        actedAt: step.actedAt || null,
        note: norm(step.note) || '',
      });
    } else if (
      normLower(step.moveToType) === 'goto'
      && !normLower(step.name).startsWith('goto')
    ) {
      journey.push({
        type: 'transition',
        label: 'Revised',
        actedAt: step.actedAt || null,
        note: norm(step.note) || '',
      });
    }
  });

  const endRaw = findRootStep(
    progress,
    (step) => step?.NodeType === 'EndEvent' || norm(step?.Name) === 'Completed',
  );
  if (endRaw && completed) {
    const end = normalizeProgressStep(endRaw, journey.length, dueLookup);
    if (end) journey.push(buildJourneyNode(end, { row, isCompleted: true }));
  }

  return compactRevisedWorkflowJourney(journey);
}

function isInProgressStatus(status) {
  const token = normLower(status);
  return token === 'inprogress' || token === 'open';
}

function isSentBackStatus(status) {
  return normLower(status) === 'sentback';
}

function findLastActiveIndex(journey) {
  let lastIdx = -1;
  journey.forEach((node, idx) => {
    if (node.type === 'transition' || node.type === 'revised') return;
    if (isInProgressStatus(node.status) || node.actedAt) {
      lastIdx = idx;
    }
  });
  return lastIdx;
}

function nodeMatchesLiveStep(node, liveStep) {
  const live = normLower(liveStep);
  const label = normLower(node?.label);
  const name = normLower(node?.name);
  if (!live || node?.type === 'transition' || node?.type === 'revised') return false;
  if (label === live || name === live) return true;
  if (live.includes('solution') && (label === 'tech support' || name.includes('solution') || label.includes('solution'))) {
    return true;
  }
  if (
    (live.includes('pickup') || live.includes('pick up'))
    && (label === 'open ticket' || name.includes('pickup') || label.includes('pickup'))
  ) {
    return true;
  }
  if (live.includes('dependency') && (label.includes('dependency') || name.includes('dependency'))) {
    return true;
  }
  if (live.includes('tech support') && (label === 'tech support' || name.includes('tech support'))) {
    return true;
  }
  return false;
}

/** Show workflow history only up to the current live Kissflow step. */
export function trimWorkflowJourney(journey = [], row = null, ticketStatus = null) {
  if (!journey.length) return [];

  const isClosed = Boolean(
    row?.isProcessCompleted || ticketStatus === TICKET_STATUS.Closed,
  );
  if (isClosed) return journey;

  let trimmed = journey.filter((node) => {
    if (node.type === 'transition' || node.type === 'revised') return true;
    return node.label !== 'Completed' && node.label !== 'Closed';
  });

  const liveStep = norm(getCurrentStepValue(row) || row?.activeWorkflowStep || row?.currentStep);
  const atReopenNow = isReopenWorkflowStepName(liveStep);

  let matchIdx = -1;
  if (liveStep) {
    trimmed.forEach((node, idx) => {
      if (nodeMatchesLiveStep(node, liveStep)) matchIdx = idx;
    });
  }

  const lastActiveIdx = matchIdx >= 0 ? matchIdx : findLastActiveIndex(trimmed);
  if (lastActiveIdx >= 0) {
    let end = lastActiveIdx + 1;
    // Keep Revised / transition markers that sit right after the last active step.
    while (
      end < trimmed.length
      && (trimmed[end].type === 'revised' || trimmed[end].type === 'transition')
    ) {
      end += 1;
    }
    trimmed = trimmed.slice(0, end);
  }

  // Keep full active path. Stop before reopen hold unless that is the live Kissflow step.
  if (!atReopenNow && ticketStatus !== TICKET_STATUS.Closed) {
    const simple = [];
    for (const node of trimmed) {
      if (node.type === 'transition' || node.type === 'revised') {
        simple.push(node);
        continue;
      }
      if (
        node.label === 'Employee Approval'
        || node.label === 'Employee Feedback'
        || node.label === 'Ticket Can be Reopened'
      ) break;
      simple.push(node);
    }
    return simple.length ? simple : trimmed;
  }

  if (ticketStatus === TICKET_STATUS.EmployeeFeedback) {
    return trimmed.filter((node) => (
      node.type === 'transition'
      || node.type === 'revised'
      || (node.label !== 'Completed' && node.label !== 'Closed')
    ));
  }

  return trimmed;
}

export function getProgressCompletedAt(progress) {
  if (!progress) return null;
  const endRaw = findRootStep(
    progress,
    (step) => step?.NodeType === 'EndEvent' || norm(step?.Name) === 'Completed',
  );
  if (endRaw?.CompletedAt || endRaw?.ActedAt) {
    return endRaw.CompletedAt || endRaw.ActedAt;
  }
  if (progress?.CompletedAt) return progress.CompletedAt;
  return null;
}

export function parseRefexProgress(progress, row = null, ticketStatus = null) {
  if (!progress) {
    return {
      steps: [],
      journey: [],
      isCompleted: false,
      activeStepName: '',
    };
  }

  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup).filter((step) => {
    const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
    return statusToken !== 'skipped' && statusToken !== 'cancelled' && statusToken !== 'canceled';
  });
  const fullJourney = buildWorkflowJourney(progress, row);
  const journey = trimWorkflowJourney(fullJourney, row, ticketStatus);

  return {
    steps,
    journey,
    isCompleted: isProgressCompleted(progress),
    activeStepName: getCurrentStepValue(row)
      || (steps.find((step) => isInProgressStatus(step.status))?.name)
      || (steps.length ? steps[steps.length - 1].name : ''),
  };
}

function isTechSupportProgressStep(stepName) {
  const label = mapWorkflowStepLabel(stepName);
  const token = normLower(stepName).replace(/[\s_-]+/g, '');
  return label === 'Tech Support'
    || token.includes('ittechsupport')
    || token.includes('itagentsolution')
    || token.includes('techsupportafterdependency')
    || token.includes('dependencyassigne');
}

/**
 * Reopen reasons from progress sendback notes (Kissflow stores sendback Note on the step).
 * Used by Resolution History across all MIS dashboards.
 */
export function collectReopenNotesFromProgress(progress, row = null) {
  if (!progress) return [];
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const employeeName = norm(row?.requesterName) || formatPerson(row?.createdBy) || 'Employee';
  const entries = [];

  steps.forEach((step, index) => {
    const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
    const isSendBack = statusToken === 'sentback'
      || (normLower(step.moveToType) === 'sendback' && statusToken !== 'completed');
    const note = norm(step.note);
    if (!isSendBack || !note) return;
    entries.push({
      role: 'reopen',
      userName: formatPerson(step.actedBy) || employeeName,
      comment: note,
      rating: null,
      dateTime: step.actedAt || null,
      timestamp: toTimestamp(step.actedAt),
      recordId: norm(step.id) || `reopen-note-${index}`,
      sourceOrder: index,
    });
  });

  return entries;
}

/**
 * Rejection notes from Kissflow progress (step Note when Manager/Head reject).
 */
export function collectRejectionNotesFromProgress(progress, row = null) {
  if (!progress) return [];
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const entries = [];

  steps.forEach((step, index) => {
    const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
    const moveToken = normLower(step.moveToType).replace(/[\s_-]+/g, '');
    const isReject = statusToken === 'rejected'
      || statusToken === 'reject'
      || statusToken === 'declined'
      || moveToken === 'reject'
      || moveToken === 'rejected';
    const note = norm(step.note);
    if (!isReject || !note) return;
    entries.push({
      role: 'reject',
      userName: formatPerson(step.actedBy) || 'Approver',
      comment: note,
      note,
      dateTime: step.actedAt || null,
      timestamp: toTimestamp(step.actedAt),
      recordId: norm(step.id) || `reject-note-${index}`,
      sourceOrder: index,
    });
  });

  return entries;
}

/**
 * Tech Support resolution notes from completed progress steps (when report StepField table is empty).
 */
export function collectAgentResolutionNotesFromProgress(progress, row = null) {
  if (!progress) return [];
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const entries = [];

  steps.forEach((step, index) => {
    if (!isTechSupportProgressStep(step.name)) return;
    const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
    if (statusToken === 'sentback' || statusToken === 'skipped' || statusToken === 'cancelled') return;
    const note = norm(step.note);
    if (!note) return;
    entries.push({
      role: 'itAgent',
      userName: formatPerson(step.actedBy) || 'Tech Support',
      comment: note,
      resolution: note,
      rating: null,
      dateTime: step.actedAt || null,
      timestamp: toTimestamp(step.actedAt),
      recordId: norm(step.id) || `progress-agent-note-${index}`,
      sourceOrder: index,
    });
  });

  return entries;
}

const PROGRESS_TTL_MS = 30000;
/** @type {{ key: string, at: number, promise: Promise<any>|null }} */
let progressCache = { key: '', at: 0, promise: null };

/** Coalesce expand-panel progress fetches (workflow + resolution history). */
export function fetchRefexProcessProgressCached(kfInstance, instanceId, { force = false } = {}) {
  if (!kfInstance?.api || !instanceId) return Promise.resolve(null);
  const key = `${resolveAccountId(kfInstance) || ''}|${instanceId}`;
  const now = Date.now();
  if (
    !force
    && progressCache.promise
    && progressCache.key === key
    && (now - progressCache.at) < PROGRESS_TTL_MS
  ) {
    return progressCache.promise;
  }
  const promise = fetchRefexProcessProgress(kfInstance, instanceId);
  progressCache = { key, at: now, promise };
  return promise;
}

/** @deprecated use mapWorkflowStepLabel — workflow labels only, not ticket status. */
export function mapEmployeeFacingStep(stepName) {
  return mapWorkflowStepLabel(stepName);
}
