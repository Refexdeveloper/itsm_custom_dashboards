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
  isExtrovisServiceDashboardContext,
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
  if (!lower) return false;
  // "Ticket Reopened" is a send-back transition, not the hold step.
  if (lower.includes('reopened')) return false;
  return name === EMPLOYEE_APPROVAL_STEP_LABEL
    || lower === 'employee verification'
    || lower === 'employee feedback'
    || lower === 'ticket reopen'
    || lower.includes('ticket reopen')
    || lower.includes('reopen window')
    || lower.includes('it tech reopen')
    || lower === 'it tech reopen';
}

function isRejectedStepStatus(status) {
  const token = normLower(status).replace(/[\s_-]+/g, '');
  return token === 'rejected' || token === 'reject' || token === 'declined';
}

function isProgressRejected(progress) {
  return isRejectedStepStatus(progress?._status || progress?.Status || progress?.status);
}

function isRowProcessRejected(row, ticketStatus = null) {
  if (ticketStatus === TICKET_STATUS.Rejected || isRejectedStepStatus(ticketStatus)) return true;
  if (!row) return false;
  const candidates = [
    row.systemStatus,
    row.workflowStatus,
    row.status,
    row.statusLabel,
    row.itemStatusRaw,
    row.itemStatus,
    row.statu,
    row?.raw?._status,
  ];
  return candidates.some((value) => isRejectedStepStatus(value));
}

function journeyHasRejectedStep(journey = []) {
  return (journey || []).some((node) => (
    node?.type === 'step'
    && (node.isRejected || isRejectedStepStatus(node.status))
  ));
}

function isRowProcessCompleted(row) {
  if (!row) return false;
  if (row.isProcessCompleted === true) return true;
  const wf = normLower(row?.systemStatus || row?.workflowStatus || row?.status || row?.raw?._status);
  return wf === 'completed' || wf === 'complete';
}

export function isItsmBotName(text) {
  const compact = normLower(text).replace(/[\s_-]+/g, '');
  if (!compact) return false;
  return compact.includes('itsmbot') || compact === 'bot' || compact.endsWith('bot');
}

function isGenericWorkflowActorLabel(text) {
  return /^(employee|user|agent|tech\s*support|it\s*agent|it\s*tech|system|bot|approle|itsm\s*bot)$/i.test(norm(text))
    || isItsmBotName(text);
}

function uniquePersonParts(parts) {
  const seen = new Set();
  const unique = [];
  (parts || []).forEach((part) => {
    const label = norm(part);
    if (!label || isGenericWorkflowActorLabel(label)) return;
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
    // Kissflow ActedBy / AssignedTo — prefer human Name; never use generic Kind / BOT labels.
    const nested = value?.User || value?.user || value?.Users || value?.users
      || value?.Members || value?.members;
    const fromNested = nested && nested !== value ? formatPerson(nested) : '';
    const name = norm(value?.Name || value?.name || value?.FullName || value?.displayName);
    if (isGenericWorkflowActorLabel(name)) return fromNested;
    if (name && fromNested && fromNested.toLowerCase() !== name.toLowerCase()) {
      return uniquePersonParts([name, fromNested]);
    }
    if (name && !/^(user|employee|approle|system|bot)$/i.test(name)) return name;
    return fromNested || '';
  }
  return uniquePersonParts([norm(value)]);
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

function rawBranchScore(branch) {
  const raw = branch?.Steps || branch?.steps || [];
  const list = Array.isArray(raw) ? raw : [];
  let live = 0;
  list.forEach((step) => {
    const token = normLower(step?._status || step?.Status || step?.status).replace(/[\s_-]+/g, '');
    if (token === 'inprogress' || token === 'open') live += 1;
  });
  return [live, list.length];
}

function pickBestProcessBranch(processes, dueLookup) {
  const list = Array.isArray(processes) ? processes : [];
  if (!list.length) return [];
  const wanted = processBranchName();
  const named = list.filter((entry) => branchNameMatches(entry, wanted));
  const withSteps = (named.length ? named : list).filter((entry) => {
    const raw = entry?.Steps || entry?.steps || [];
    return Array.isArray(raw) && raw.length > 0;
  });
  if (!withSteps.length) return [];
  withSteps.sort((left, right) => {
    const [liveA, lenA] = rawBranchScore(left);
    const [liveB, lenB] = rawBranchScore(right);
    if (liveB !== liveA) return liveB - liveA;
    return lenB - lenA;
  });
  return stepsFromBranch(withSteps[0], dueLookup);
}

function collectAllProcessBranches(progress) {
  const out = [];
  const rootSteps = progress?.Steps || progress?.steps || [];
  if (Array.isArray(rootSteps)) {
    rootSteps.forEach((step) => {
      const processes = step?.Process || step?.process || [];
      if (Array.isArray(processes) && processes.length) out.push(...processes);
    });
  }
  const rootProcess = progress?.Process || progress?.process || [];
  if (Array.isArray(rootProcess) && rootProcess.length) out.push(...rootProcess);
  return out;
}

function collectRefexBranchSteps(progress, dueLookup = new Map()) {
  const fromNested = pickBestProcessBranch(collectAllProcessBranches(progress), dueLookup);
  if (fromNested.length) return fromNested;

  // Last resort — root activity steps (exclude pure Start/End events).
  const rootSteps = progress?.Steps || progress?.steps || [];
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
  // Completed Goto / rework loops → Revised. Not-started Goto nodes are hidden in buildWorkflowJourney.
  if (normLower(name).startsWith('goto') || normLower(name).includes('goto(')) {
    return 'Revised';
  }
  // Same flow, entity-specific step names: Refex "IT Tech Support", Extrovis PickUp / Solution.
  if (name === IT_AGENT_STEP_LABEL || name === 'IT Tech Support' || name === 'IT Agent' || name === 'IT Agent Solution') {
    return 'Tech Support';
  }
  if (name === 'IT Agent PickUp' || name === 'IT Tech Pickup') return 'Open Ticket';
  if (name === 'Dependency Assigne') return 'Dependency Assignee';
  if (isReopenWorkflowStepName(name)) return isCompleted ? 'Closed' : 'Ticket Can be Reopened';
  if (name === 'Completed') return isCompleted ? 'Closed' : 'Closed';
  return name;
}

function isGotoWorkflowStepName(stepName) {
  const n = normLower(stepName);
  return n.startsWith('goto') || n.includes('goto(');
}

function isStepCompletedLike(step) {
  const statusToken = normLower(step?.status).replace(/[\s_-]+/g, '');
  return statusToken === 'completed'
    || statusToken === 'sentback'
    || statusToken === 'rejected'
    || Boolean(step?.actedAt && statusToken !== 'inprogress' && statusToken !== 'open' && statusToken !== 'notstarted');
}

function buildJourneyNode(step, { subtitle = '', row = null, isCompleted = false } = {}) {
  const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
  const completedLike = statusToken === 'completed'
    || statusToken === 'sentback'
    || statusToken === 'rejected'
    || Boolean(step.actedAt && statusToken !== 'inprogress' && statusToken !== 'open');
  // Completed / historical steps → ActedBy; live pending → AssignedTo (skip AppRole labels when possible).
  const acted = step.actedBy && !isGenericWorkflowActorLabel(step.actedBy) ? step.actedBy : '';
  const assigned = step.assignedTo && !isGenericWorkflowActorLabel(step.assignedTo) ? step.assignedTo : '';
  // Never fall back to ITSM BOT / system actors — leave the step, hide the bot name.
  const actor = completedLike
    ? (acted || assigned || '')
    : (assigned || acted || '');
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

  if (isReopenWorkflowStepName(step.name) && !isCompleted) {
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
  } else if (isReopenWorkflowStepName(step.name) && isCompleted) {
    label = 'Closed';
    nodeSubtitle = '';
  }

  if (label === 'Completed' || (norm(step.name) === 'Completed' && isCompleted)) {
    label = 'Closed';
  }

  const pendingClock = statusToken === 'inprogress' || statusToken === 'open' || !step.actedAt;
  const note = norm(step.note);
  return {
    type: 'step',
    id: step.id,
    name: step.name,
    label,
    subtitle: nodeSubtitle,
    actorName: actor,
    actedAt: step.actedAt,
    expectedAt,
    status: step.status,
    note,
    isRejected: isRejectedStepStatus(step.status),
    isOverdue: Boolean(expectedAt
      ? (pendingClock
        ? Date.now() > toTimestamp(expectedAt)
        : toTimestamp(step.actedAt) > toTimestamp(expectedAt))
      : false),
  };
}

/**
 * Collapse legacy bare "Revised" transitions only.
 * Numbered Goto revisions (type: revised, count 1..N) stay as separate timeline markers.
 */
export function compactRevisedWorkflowJourney(journey = []) {
  const out = [];
  let i = 0;
  while (i < journey.length) {
    const node = journey[i];

    // Already-numbered Goto revisions — keep each marker; do not merge into one pill.
    if (node.type === 'revised' && Number(node.count) > 0) {
      out.push(node);
      i += 1;
      continue;
    }

    const isLegacyRevised = node.label === 'Revised'
      || (node.type === 'transition' && normLower(node.label) === 'revised');

    if (isLegacyRevised) {
      let count = 0;
      let actedAt = null;
      while (i < journey.length) {
        const n = journey[i];
        if (n.type === 'revised' && Number(n.count) > 0) break;
        const revised = n.label === 'Revised'
          || (n.type === 'transition' && normLower(n.label) === 'revised');
        if (revised) {
          count += 1;
          actedAt = n.actedAt || actedAt;
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

function buildGotoRevisedMarker(step, revisionNumber) {
  const count = Math.max(1, Number(revisionNumber) || 1);
  return {
    type: 'revised',
    label: count === 1 ? 'Revised' : `Revised (${count})`,
    layout: 'left',
    count,
    actedAt: step?.actedAt || null,
    name: step?.name || '',
    status: step?.status || 'Completed',
  };
}

/**
 * Workflow rail from Kissflow progress API.
 * Revised markers come only from completed Goto-* steps (1st Goto → Revised, 2nd → Revised (2)).
 * Skipped / cancelled / not-started Goto never create a revision (Extrovis skip path).
 */
export function buildWorkflowJourney(progress, row = null) {
  if (!progress) return [];

  const dueLookup = buildDueLookup(row);
  const refexSteps = collectRefexBranchSteps(progress, dueLookup);
  const journey = [];
  const completed = isProgressCompleted(progress);
  let gotoRevisionCount = 0;

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
    const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
    // Skipped / cancelled — never a Revised marker (Extrovis may skip Solution without Goto).
    if (statusToken === 'skipped' || statusToken === 'cancelled' || statusToken === 'canceled') {
      return;
    }

    // Goto-* section from progress API → numbered Revised only when completed/acted.
    if (isGotoWorkflowStepName(step.name)) {
      if (!isStepCompletedLike(step)) return;
      gotoRevisionCount += 1;
      journey.push(buildGotoRevisedMarker(step, gotoRevisionCount));
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
    }
    // Do not invent Revised from MoveToType=Goto on non-Goto steps — only Goto-* sections count.
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

  const liveToken = live.replace(/[\s_-]+/g, '');
  const nameToken = name.replace(/[\s_-]+/g, '');
  const labelToken = label.replace(/[\s_-]+/g, '');
  if (liveToken && (liveToken === nameToken || liveToken === labelToken)) return true;

  // Exact-ish aliases only — do not let "IT Tech Support" match "…After Dependency".
  if (live.includes('solution') && (label === 'tech support' || name.includes('solution'))) {
    return !name.includes('after dependency') && !name.includes('afterdependency');
  }
  if (
    (live.includes('pickup') || live.includes('pick up'))
    && (label === 'open ticket' || name.includes('pickup') || label.includes('pickup'))
  ) {
    return true;
  }
  if (live.includes('dependency') && !live.includes('after') && (label.includes('dependency') || name.includes('dependency'))) {
    return !name.includes('after') && !label.includes('after');
  }
  if (
    live.includes('tech support')
    && !live.includes('after')
    && (label === 'tech support' || name === 'it tech support' || name.includes('tech support'))
  ) {
    return !name.includes('after dependency')
      && !name.includes('afterdependency')
      && !label.includes('after');
  }
  return false;
}

/** Show workflow history only up to the current live Kissflow step. */
export function trimWorkflowJourney(journey = [], row = null, ticketStatus = null) {
  if (!journey.length) return [];

  const processRejected = isRowProcessRejected(row, ticketStatus) || journeyHasRejectedStep(journey);
  const processCompleted = isRowProcessCompleted(row);
  const liveStep = norm(getCurrentStepValue(row) || row?.activeWorkflowStep || row?.currentStep);
  const atReopenNow = isReopenWorkflowStepName(liveStep) && !processCompleted && !processRejected;
  const isClosed = Boolean(processCompleted || ticketStatus === TICKET_STATUS.Closed);

  const withoutReopenHold = (nodes) => (nodes || []).filter((node) => {
    if (node.type === 'transition' || node.type === 'revised') return true;
    return node.label !== 'Ticket Can be Reopened';
  });

  // Rejected is terminal. My Team report rows often keep a stale `_current_step`
  // (e.g. IT Manager Approval) — do not trim to that live step or show it as assigned.
  if (processRejected) {
    const nodes = withoutReopenHold(journey);
    let lastRejectIdx = -1;
    nodes.forEach((node, idx) => {
      if (node.type === 'step' && (node.isRejected || isRejectedStepStatus(node.status))) {
        lastRejectIdx = idx;
      }
    });
    if (lastRejectIdx >= 0) return nodes.slice(0, lastRejectIdx + 1);
    const lastActiveIdx = findLastActiveIndex(nodes);
    return lastActiveIdx >= 0 ? nodes.slice(0, lastActiveIdx + 1) : nodes;
  }

  // Completed tickets must not keep the reopen hold — only a live Ticket Reopen step shows it.
  if (processCompleted) return withoutReopenHold(journey);
  if (isClosed && atReopenNow) return journey;
  if (isClosed) return withoutReopenHold(journey);

  let trimmed = journey.filter((node) => {
    if (node.type === 'transition' || node.type === 'revised') return true;
    return node.label !== 'Completed' && node.label !== 'Closed';
  });

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
  const rejected = isProgressRejected(progress) || isRowProcessRejected(row, ticketStatus);
  const effectiveStatus = rejected ? TICKET_STATUS.Rejected : ticketStatus;
  const fullJourney = buildWorkflowJourney(progress, row);
  const journey = trimWorkflowJourney(fullJourney, row, effectiveStatus);
  const rejectedStep = [...steps].reverse().find((step) => isRejectedStepStatus(step.status));

  return {
    steps,
    journey,
    isCompleted: isProgressCompleted(progress),
    activeStepName: rejected
      ? (rejectedStep?.name || '')
      : (
        getCurrentStepValue(row)
        || (steps.find((step) => isInProgressStatus(step.status))?.name)
        || (steps.length ? steps[steps.length - 1].name : '')
      ),
  };
}

function isTechSupportProgressStep(stepName) {
  const label = mapWorkflowStepLabel(stepName);
  const token = normLower(stepName).replace(/[\s_-]+/g, '');
  return label === 'Tech Support'
    || label === 'Open Ticket'
    || token.includes('ittechsupport')
    || token.includes('itagentsolution')
    || token.includes('itagentpickup')
    || token.includes('ittechpickup')
    || token.includes('techsupportafterdependency')
    || token.includes('dependencyassigne');
}

/** Prefer Solution / IT Tech Support over PickUp — nested IT__Agent_Solution lives on solution steps. */
function techActivityPreferScore(stepName) {
  const token = normLower(stepName).replace(/[\s_-]+/g, '');
  if (token.includes('itagentsolution') || token.includes('solution')) return 50;
  if (token.includes('techsupportafterdependency')) return 40;
  if (token.includes('ittechsupport') || token === 'ittech' || token.includes('itagent')) return 30;
  if (token.includes('dependency')) return 20;
  if (token.includes('pickup') || token.includes('pick')) return 5;
  return 10;
}

/** Activity instance id for GET /{instanceId}/{activityInstanceId} — prefer live/owned tech step. */
export function pickTechSupportActivityInstanceIdFromProgress(progress, row = null) {
  if (!progress) return '';
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const ranked = steps.filter((step) => step.activityInstanceId);
  if (!ranked.length) return '';

  const isLive = (step) => {
    const token = normLower(step.status).replace(/[\s_-]+/g, '');
    return token === 'inprogress' || token === 'open';
  };
  const tech = ranked.filter((step) => isTechSupportProgressStep(step.name));
  const pool = tech.length ? tech : ranked;

  const pickBest = (list) => {
    if (!list.length) return null;
    return [...list].sort((a, b) => {
      const scoreDiff = techActivityPreferScore(b.name) - techActivityPreferScore(a.name);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.timestamp || 0) - (a.timestamp || 0);
    })[0];
  };

  const liveTech = pickBest(pool.filter((step) => isLive(step)));
  if (liveTech?.activityInstanceId) return liveTech.activityInstanceId;

  // Prefer completed Solution / Tech Support (has nested table) over older PickUp.
  const actedTech = pickBest(pool.filter((step) => step.actedAt || techActivityPreferScore(step.name) >= 30));
  if (actedTech?.activityInstanceId) return actedTech.activityInstanceId;

  return pickBest(pool)?.activityInstanceId || '';
}

/** Ranked activity ids for Comments GET — live first, then completed Solution/Tech, then others. */
export function listCommentActivityInstanceIdsFromProgress(progress, row = null) {
  const ids = [];
  const push = (value) => {
    const id = norm(value);
    if (id && !ids.includes(id)) ids.push(id);
  };
  const live = pickInProgressAgentCommentActivity(progress, row);
  if (live?.activityInstanceId) push(live.activityInstanceId);
  push(pickTechSupportActivityInstanceIdFromProgress(progress, row));
  if (!progress) return ids;
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const ranked = [...steps]
    .filter((step) => step.activityInstanceId)
    .sort((a, b) => {
      const scoreDiff = techActivityPreferScore(b.name) - techActivityPreferScore(a.name);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  ranked.forEach((step) => push(step.activityInstanceId));
  return ids;
}

function isLiveProgressStatus(status) {
  const token = normLower(status).replace(/[\s_-]+/g, '');
  return token === 'inprogress' || token === 'open';
}

/**
 * Live InProgress user-task for Comments save (process POST, not /submit).
 * KPI cards already choose the tickets — do not filter by workflow step name.
 * Never post to a completed activity (PickUp, etc.).
 */
export function pickInProgressAgentCommentActivity(progress, row = null) {
  if (!progress) return null;
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const live = steps.filter((step) => (
    step.activityInstanceId
    && isLiveProgressStatus(step.status)
    && normLower(step.nodeType) !== 'startevent'
    && normLower(step.nodeType) !== 'endevent'
  ));
  if (!live.length) return null;
  const userTask = live.filter((step) => !step.nodeType || normLower(step.nodeType) === 'usertask');
  const pool = userTask.length ? userTask : live;
  const picked = pool[pool.length - 1];
  return {
    activityInstanceId: picked.activityInstanceId,
    stepName: picked.name,
  };
}

/** All live InProgress user-task ids for comment POST — Solution/Tech first, then PickUp. */
export function listInProgressCommentActivityIdsFromProgress(progress, row = null) {
  if (!progress) return [];
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const live = steps.filter((step) => (
    step.activityInstanceId
    && isLiveProgressStatus(step.status)
    && normLower(step.nodeType) !== 'startevent'
    && normLower(step.nodeType) !== 'endevent'
  ));
  const userTask = live.filter((step) => !step.nodeType || normLower(step.nodeType) === 'usertask');
  const pool = userTask.length ? userTask : live;
  const ranked = [...pool].sort((a, b) => {
    const scoreDiff = techActivityPreferScore(b.name) - techActivityPreferScore(a.name);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.timestamp || 0) - (a.timestamp || 0);
  });
  const ids = [];
  ranked.forEach((step) => {
    const id = norm(step.activityInstanceId);
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

/** Live IT Agent Solution activity ids only — Employee Extrovis send never uses PickUp. */
export function listInProgressSolutionCommentActivityIdsFromProgress(progress, row = null) {
  if (!progress) return [];
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const ids = [];
  steps.forEach((step) => {
    if (!step.activityInstanceId || !isLiveProgressStatus(step.status)) return;
    if (normLower(step.nodeType) === 'startevent' || normLower(step.nodeType) === 'endevent') return;
    const token = normLower(step.name).replace(/[\s_-]+/g, '');
    if (!token || token.includes('pickup') || token.includes('pick') || token.includes('reopen')) return;
    if (!(token.includes('itagentsolution') || (token.includes('solution') && !token.includes('dependency')))) {
      return;
    }
    const id = norm(step.activityInstanceId);
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

/** Tech-support ActedBy timeline — used to name IT__Agent_Solution Comments rows. */
export function collectTechSupportActorsFromProgress(progress, row = null) {
  if (!progress) return [];
  const dueLookup = buildDueLookup(row);
  const steps = collectRefexBranchSteps(progress, dueLookup);
  const actors = [];
  steps.forEach((step, index) => {
    if (!isTechSupportProgressStep(step.name)) return;
    const statusToken = normLower(step.status).replace(/[\s_-]+/g, '');
    if (statusToken === 'skipped' || statusToken === 'cancelled' || statusToken === 'canceled') return;
    // Prefer ActedBy (who worked the step). AssignedTo is often an AppRole.
    const acted = formatPerson(step.actedBy);
    const assigned = formatPerson(step.assignedTo);
    const userName = (acted && !isGenericWorkflowActorLabel(acted) ? acted : '')
      || (assigned && !isGenericWorkflowActorLabel(assigned) ? assigned : '')
      || acted
      || assigned;
    if (!userName) return;
    actors.push({
      userName,
      dateTime: step.actedAt || null,
      timestamp: toTimestamp(step.actedAt),
      stepName: step.name,
      activityInstanceId: step.activityInstanceId || '',
      recordId: norm(step.id) || `tech-actor-${index}`,
    });
  });
  return actors;
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
      commentsType: 'User',
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
    const moveToken = normLower(step.moveToType).replace(/[\s_-]+/g, '');
    const isReject = isRejectedStepStatus(step.status)
      || moveToken === 'reject'
      || moveToken === 'rejected';
    if (!isReject) return;
    const note = norm(step.note);
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
  // Extrovis comments live only on IT__Agent_Solution — progress IT Tech Support notes duplicate the thread.
  if (isExtrovisServiceDashboardContext()) return [];
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
/** @type {Map<string, { at: number, promise: Promise<any> }>} */
const progressCacheByInstance = new Map();

export function clearProgressCacheForInstance(kfInstance, instanceId) {
  if (!instanceId) return;
  const prefix = `${resolveAccountId(kfInstance) || ''}|${instanceId}`;
  [...progressCacheByInstance.keys()].forEach((key) => {
    if (key === prefix || key.startsWith(`${prefix}|`)) progressCacheByInstance.delete(key);
  });
}

/** Coalesce expand-panel progress fetches (workflow + resolution history). */
export function fetchRefexProcessProgressCached(kfInstance, instanceId, { force = false } = {}) {
  if (!kfInstance?.api || !instanceId) return Promise.resolve(null);
  const key = `${resolveAccountId(kfInstance) || ''}|${instanceId}`;
  const now = Date.now();
  if (force) progressCacheByInstance.delete(key);
  const hit = progressCacheByInstance.get(key);
  if (
    !force
    && hit?.promise
    && (now - hit.at) < PROGRESS_TTL_MS
  ) {
    return hit.promise;
  }
  const promise = fetchRefexProcessProgress(kfInstance, instanceId);
  progressCacheByInstance.set(key, { at: now, promise });
  if (progressCacheByInstance.size > 40) {
    const oldest = progressCacheByInstance.keys().next().value;
    if (oldest) progressCacheByInstance.delete(oldest);
  }
  return promise;
}

/** @deprecated use mapWorkflowStepLabel — workflow labels only, not ticket status. */
export function mapEmployeeFacingStep(stepName) {
  return mapWorkflowStepLabel(stepName);
}
