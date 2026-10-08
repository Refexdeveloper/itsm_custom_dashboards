/**
 * Resolve Kissflow pending activity ids from pending/activity/count by StepName.
 * Do not hardcode Activity_* ids for runtime lookups — ids can change per env.
 */

import { getActiveServiceCol } from '../../../lib/kfITServiceDashboard.js';

function norm(value) {
  return String(value ?? '').trim();
}

function normLower(value) {
  return norm(value).toLowerCase();
}

/** Compact token for fuzzy StepName matching. */
export function compactStepToken(value) {
  return normLower(value).replace(/[\s_-]+/g, '');
}

/**
 * Refex / Extrovis StepName groups used to pick `_id` from activity count rows.
 * Patterns are matched against StepName (includes / equality on compact tokens).
 */
export const REFEX_PENDING_STEP_GROUPS = {
  open: [
    'IT Tech',
    'IT Tech Pickup',
    'IT Tech Pick Up',
  ],
  myTickets: [
    'IT Tech Support',
    'Dependency Assigne',
    'Dependency Assignee',
    'IT Tech Support After Dependency',
    'Tech Support After Dependency',
  ],
  reopen: [
    'IT Tech Reopen',
    'Ticket Reopen',
    'Employee Feedback',
  ],
  approvalManager: [
    'IT Manager Approval',
    'IT Manager',
  ],
  approvalHead: [
    'IT Head Approval',
    'IT Head',
  ],
  approvalL1: ['L1 Approval', 'L1 Manager'],
  approvalL2: ['L2 Approval', 'L2 Manager'],
};

export const EXTROVIS_PENDING_STEP_GROUPS = {
  open: [
    'IT Agent PickUp',
    'IT Agent Pickup',
    'IT Agent Pick Up',
  ],
  myTickets: [
    'IT Agent Solution',
    'Dependency Assigne',
    'Dependency Assignee',
    'After Dependency',
    'IT Agent After Dependency',
    'IT Tech Support After Dependency',
    'Tech Support After Dependency',
  ],
  reopen: [
    'ReOpen Window',
    'Reopen Window',
  ],
};

export function getPendingStepGroups(profileId = '') {
  const id = normLower(profileId);
  if (id === 'extrovis') return EXTROVIS_PENDING_STEP_GROUPS;
  return REFEX_PENDING_STEP_GROUPS;
}

function stepNameMatchesPattern(stepName, pattern) {
  const step = norm(stepName);
  const want = norm(pattern);
  if (!step || !want) return false;
  if (step === want) return true;
  const a = compactStepToken(step);
  const b = compactStepToken(want);
  if (!a || !b) return false;
  if (a === b) return true;
  // Avoid matching "IT Tech" against "IT Tech Reopen" / "IT Tech Support".
  if (a === 'ittech' || a === 'ittechpickup') {
    return b === 'ittech' || b === 'ittechpickup';
  }
  if (b === 'ittech') {
    return a === 'ittech' || a === 'ittechpickup';
  }
  if (b === 'ittechsupport') {
    return a === 'ittechsupport' || (a.includes('ittechsupport') && !a.includes('after'));
  }
  if (b.includes('reopen') || b.includes('reopenwindow') || b.includes('feedback')) {
    return a.includes('reopen') || a.includes('feedback');
  }
  return a.includes(b) || b.includes(a);
}

export function stepNameMatchesAny(stepName, patterns = []) {
  return (patterns || []).some((pattern) => stepNameMatchesPattern(stepName, pattern));
}

export function isReopenStepName(stepName, profileId = '') {
  const groups = getPendingStepGroups(profileId);
  return stepNameMatchesAny(stepName, groups.reopen || []);
}

export function isOpenBucketStepName(stepName, profileId = '') {
  const groups = getPendingStepGroups(profileId);
  if (isReopenStepName(stepName, profileId)) return false;
  if (stepNameMatchesAny(stepName, groups.open || [])) return true;
  // Extrovis My Tickets steps are active work but not Open KPI.
  if (normLower(profileId) === 'extrovis') return false;
  // Refex Dependency / After Dependency sit in Open pipeline for Manager/Head.
  return stepNameMatchesAny(stepName, [
    'Dependency Assigne',
    'Dependency Assignee',
    'IT Tech Support After Dependency',
  ]);
}

export function isApprovalStepName(stepName, profileId = '') {
  if (normLower(profileId) === 'extrovis') return false;
  const groups = getPendingStepGroups(profileId);
  return stepNameMatchesAny(stepName, [
    ...(groups.approvalManager || []),
    ...(groups.approvalHead || []),
    ...(groups.approvalL1 || []),
    ...(groups.approvalL2 || []),
  ]);
}

export function classifyPendingStepName(stepName, profileId = '') {
  if (isReopenStepName(stepName, profileId)) return 'reopen';
  if (isApprovalStepName(stepName, profileId)) return 'approval';
  const groups = getPendingStepGroups(profileId);
  if (stepNameMatchesAny(stepName, groups.open || [])) return 'open';
  if (stepNameMatchesAny(stepName, groups.myTickets || [])) return 'myTickets';
  if (isOpenBucketStepName(stepName, profileId)) return 'open';
  return 'other';
}

/**
 * Normalize pending/activity/count payload rows.
 * @returns {{ id: string, stepName: string, count: number }[]}
 */
export function parsePendingActivityCountEntries(countResp) {
  const rows = Array.isArray(countResp)
    ? countResp
    : (Array.isArray(countResp?.Data) ? countResp.Data : []);
  return rows
    .map((row) => {
      const id = norm(row?._id || row?.Id || row?.id);
      const stepName = norm(row?.StepName || row?.stepName || row?.Name || row?.name);
      const count = Number(row?.Count ?? row?.count ?? 0);
      return { id, stepName, count };
    })
    .filter((row) => row.id && row.count > 0);
}

/**
 * Pick activity `_id` values from count API by matching StepName patterns.
 */
/**
 * Kissflow pending/{activityId} often omits `_current_step`.
 * Stamp StepName from pending/activity/count so Open / My Tickets / Closed match.
 */
export function stampPendingItemsWithStepName(items = [], activityId = '', stepName = '') {
  const step = norm(stepName);
  const act = norm(activityId);
  return (items || []).map((item) => {
    if (!item || typeof item !== 'object') return item;
    const next = { ...item };
    if (act && !norm(next._activity_id || next.Activity_ID || next.activity_id)) {
      next._activity_id = act;
    }
    // Always overwrite — pending/{activity} often has a blank or leftover step.
    // The count API StepName is the activity these items are actually sitting in.
    if (step) {
      next._current_step = step;
      next.Current_Step = step;
    }
    return next;
  });
}

export function resolveActivityIdsByStepNames(countEntries = [], stepPatterns = []) {
  const patterns = (stepPatterns || []).filter(Boolean);
  if (!patterns.length) return [];
  const ids = [];
  const seen = new Set();
  (countEntries || []).forEach((entry) => {
    if (!entry?.id || seen.has(entry.id)) return;
    if (!stepNameMatchesAny(entry.stepName, patterns)) return;
    seen.add(entry.id);
    ids.push(entry.id);
  });
  return ids;
}

export function collectStepPatternsForMeBucket(profileId = '', { role = 'agent' } = {}) {
  const groups = getPendingStepGroups(profileId);
  const patterns = [
    ...(groups.open || []),
    ...(groups.myTickets || []),
    ...(groups.reopen || []),
  ];
  if (normLower(profileId) === 'extrovis') return patterns;
  if (role === 'final') {
    patterns.push(...(groups.approvalHead || []));
  } else if (role === 'first') {
    patterns.push(...(groups.approvalManager || []));
  } else if (role === 'monitoring' || role === 'agent') {
    // Agent Me does not need approval steps; monitoring may include all.
    if (role === 'monitoring') {
      patterns.push(
        ...(groups.approvalL1 || []),
        ...(groups.approvalL2 || []),
        ...(groups.approvalManager || []),
        ...(groups.approvalHead || []),
      );
    }
  }
  return patterns;
}

export function extractRequestIdFromItem(item) {
  if (!item || typeof item !== 'object') return '';
  const requestCol = getActiveServiceCol()?.requestId;
  const candidates = [
    item.Request_ID,
    item.request_id,
    item.RequestId,
    item.requestId,
    requestCol ? item?.[requestCol] : null,
    // Refex + Extrovis report column fallbacks when profile is not set yet.
    item?.Column_0jda6rzCc3,
    item?.Column_y4srngcUo1,
    item?.Data?.Request_ID,
    item?.data?.Request_ID,
    item?._name,
    item?.Name,
  ];
  for (const value of candidates) {
    const text = norm(value);
    // Prefer real IT-… request ids over Kissflow instance ids.
    if (text && /^IT[-_]/i.test(text)) return text;
  }
  // Pending payloads sometimes only carry Request ID under a Column_* key.
  try {
    for (const value of Object.values(item)) {
      if (typeof value !== 'string') continue;
      const text = norm(value);
      if (text && /^IT[-_][A-Z0-9][-_A-Za-z0-9]*$/i.test(text)) return text;
    }
  } catch {
    // ignore
  }
  for (const value of candidates) {
    const text = norm(value);
    if (text && !/^Pk[A-Za-z0-9_-]+$/.test(text) && !/^Ac[A-Za-z0-9_-]+$/.test(text)) {
      return text;
    }
  }
  return '';
}
