import {
  mapReportRow,
  isSlaBreached,
  isAssignedToUser,
  normalizeAssigneeList,
  dedupeAssigneeList,
  resolveAgentSubmitIdsFromReport,
  getActiveDashboardProfile,
  resolveDisplayRequestId,
} from '../../../lib/kfITServiceDashboard.js';
import { getReopenedOnRaw } from './employeeDates.js';
import { REFEX_EMPLOYEE_COL, REFEX_EMPLOYEE_TABLE_COL } from './constants.js';

/** Active profile column map — Refex and Extrovis share this row shape. */
function activeEmployeeCol() {
  return getActiveDashboardProfile()?.employeeCol || REFEX_EMPLOYEE_COL;
}

function activeEmployeeTableCol() {
  return getActiveDashboardProfile()?.employeeTableCol || REFEX_EMPLOYEE_TABLE_COL;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(v) {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') {
    if (v?.Name != null) return String(v.Name).trim();
    if (v?.label != null) return String(v.label).trim();
    if (v?.value != null) return normalizeText(v.value);
  }
  return String(v).trim();
}

function stringifyFieldValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return normalizeText(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const parts = value.map(stringifyFieldValue).filter(Boolean);
    return parts.length ? parts.join(', ') : '';
  }
  if (typeof value === 'object') {
    if (value.Name != null) return normalizeText(value.Name);
    if (value.label != null) return normalizeText(value.label);
    if (value.value != null) return stringifyFieldValue(value.value);
  }
  return normalizeText(value);
}

function getCol(item, key) {
  const id = activeEmployeeCol()[key];
  if (!id) return undefined;
  return item?.[id] ?? item?.Data?.[id] ?? item?.data?.[id];
}

function getNativeField(item, ...keys) {
  for (const key of keys) {
    const value = item?.[key] ?? item?.Data?.[key] ?? item?.data?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function parseUserRef(value) {
  if (!value) return { id: '', name: '', email: '' };
  if (typeof value === 'object') {
    return {
      id: normalizeText(value?._id || value?.id),
      name: normalizeText(value?.Name || value?.name),
      email: normalizeText(value?.Email || value?.email),
    };
  }
  return { id: '', name: normalizeText(value), email: '' };
}

function extractRequestId(item) {
  return resolveDisplayRequestId({ raw: item, id: item?._id }, item?._id) || '—';
}

function extractCriticality(item) {
  const fromCol = stringifyFieldValue(getCol(item, 'criticality'));
  if (fromCol) return fromCol;
  const native = stringifyFieldValue(getNativeField(item, 'Criticality', 'criticality'));
  return native || '—';
}

function isReopenedYes(value) {
  if (value === true || value === 1) return true;
  const token = normalizeText(value).toLowerCase();
  return token === 'yes' || token === 'true';
}

function formatAssignedList(value) {
  if (value == null || value === '' || value === '—') return '';
  if (typeof value === 'string') return normalizeText(value);
  const list = dedupeAssigneeList(value);
  if (list.length) {
    const names = [];
    const seen = new Set();
    list.forEach((entry) => {
      const name = typeof entry === 'object'
        ? normalizeText(entry?.Name || entry?.name)
        : normalizeText(entry);
      const token = name.toLowerCase();
      if (!name || seen.has(token)) return;
      seen.add(token);
      names.push(name);
    });
    return names.join(', ');
  }
  if (typeof value === 'object') {
    return normalizeText(value?.Name || value?.name);
  }
  return normalizeText(value);
}

function formatActedBy(value) {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.map(formatActedBy).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return normalizeText(value?.Name || value?.name);
  }
  return normalizeText(value);
}

function parseItAgentActivities(item) {
  // Include Pickup + Tech Support + After Dependency (current + legacy) for Closed By / Assigned To.
  const merged = [
    ...asArray(getCol(item, 'itAgentRefex')),
    ...asArray(getCol(item, 'itAgentRefexActivity')),
    ...asArray(getCol(item, 'itAgentActivity')),
    ...asArray(getCol(item, 'itAgentRefexActivityLegacy')),
    ...asArray(getCol(item, 'itTechActivity')),
    ...asArray(getCol(item, 'itAgentPickupActivity')),
    ...asArray(getCol(item, 'itAgentPickupActivityLegacy')),
    ...asArray(getCol(item, 'techSupportAfterDependencyActivity')),
    ...asArray(getCol(item, 'techSupportAfterDependencyActivityLegacy')),
  ];
  const seen = new Set();
  return merged.map((entry) => ({
    id: normalizeText(entry?._id),
    status: normalizeText(entry?.Status),
    actedAt: entry?.ActedAt || null,
    expectedAt: entry?.ExpectedAt || null,
    actedBy: formatActedBy(entry?.ActedBy || entry?.AssignedTo),
    slaBreached: normalizeText(entry?.SLABreached),
  })).filter((entry) => {
    if (!entry.id) return true;
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function extractEscalation(item, itAgentActivities, slaBreachedFlag) {
  const native = getNativeField(item, 'Escalation', 'Escalated', 'Is_Escalated', 'escalation');
  if (native != null && native !== '') return native;

  const fromSlaCol = stringifyFieldValue(getCol(item, 'slaBreached'));
  if (fromSlaCol) {
    const lower = fromSlaCol.toLowerCase();
    if (lower === 'yes' || lower === 'true') return 'Yes';
    if (lower === 'no' || lower === 'false') return 'No';
    return fromSlaCol;
  }

  for (let i = itAgentActivities.length - 1; i >= 0; i -= 1) {
    const token = normalizeText(itAgentActivities[i]?.slaBreached).toLowerCase();
    if (token === 'yes') return 'Yes';
    if (token === 'no') return 'No';
  }

  if (slaBreachedFlag) return 'Yes';
  return null;
}

function parseStepActivities(item) {
  const merged = [
    ...asArray(getCol(item, 'employeeApprovalRefex')),
    ...asArray(getCol(item, 'employeeApprovalRefexLegacy')),
  ];
  const seen = new Set();
  return merged.map((entry) => ({
    id: normalizeText(entry?._id),
    status: normalizeText(entry?.Status),
    actedAt: entry?.ActedAt || null,
    expectedAt: entry?.ExpectedAt || null,
    actedBy: formatActedBy(entry?.ActedBy),
    slaBreached: normalizeText(entry?.SLABreached),
  })).filter((entry) => {
    if (!entry.id) return true;
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function parseEmployeeConfirmations(item) {
  const raw = getCol(item, 'employeeConfirmation');
  const tableCol = activeEmployeeTableCol();
  return asArray(raw).map((entry) => ({
    id: normalizeText(entry?._id),
    recordId: normalizeText(entry?._id),
    comments: normalizeText(entry?.[tableCol.employeeConfirmationComments]),
    ratings: entry?.[tableCol.employeeConfirmationRatings] ?? null,
    dateTime: entry?.[tableCol.employeeConfirmationDateTime] || null,
  })).filter((entry) => entry.comments || entry.ratings != null);
}

function pickSolutionTextFromTableRow(row, tableCol) {
  const configured = normalizeText(row?.[tableCol.itAgentSolutionResolution]);
  if (configured) return configured;
  // Defensive fallbacks — older report schemas / native field aliases.
  const aliases = [
    row?.Resolution,
    row?.resolution,
    row?.Comments,
    row?.comments,
    row?.It_Agent_Solution,
    row?.Solution,
    row?.solution,
  ];
  for (const value of aliases) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return '';
}

function parseAgentSolutions(item) {
  const table = getCol(item, 'itAgentSolutionTable');
  const text = normalizeText(getCol(item, 'itAgentSolutionText'))
    || normalizeText(getCol(item, 'solution'))
    || normalizeText(getNativeField(item, 'It_Agent_Solution', 'Solution'));
  const tableCol = activeEmployeeTableCol();
  const fromTable = asArray(table)
    .map((row) => ({
      id: normalizeText(row?._id),
      recordId: normalizeText(row?._id),
      resolution: pickSolutionTextFromTableRow(row, tableCol),
      dateTime: row?.[tableCol.itAgentSolutionDateTime]
        || row?.Date_Time
        || row?.dateTime
        || null,
      agentName: normalizeText(
        row?.Column_agentName
        || row?.Agent_Name
        || row?.ActedBy
        || row?.actedBy
        || row?.Name,
      ),
    }))
    .filter((row) => row.resolution);

  if (text && text !== '—') {
    const alreadyIncluded = fromTable.some((row) => row.resolution === text);
    if (!alreadyIncluded) {
      fromTable.push({
        id: 'it-agent-solution-text',
        recordId: 'it-agent-solution-text',
        resolution: text,
        dateTime: null,
        agentName: '',
      });
    }
  }
  return fromTable;
}

function extractReferenceMinutes(value, attributeKey) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'object') {
    const raw = value?.[attributeKey]
      ?? value?.TurnAround_Time_TAT
      ?? value?.Closure_Time
      ?? value?.value;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function pickInProgressEmployeeActivity(activities = []) {
  const inProgress = activities.find((entry) => normalizeText(entry.status).toLowerCase() === 'inprogress');
  return inProgress?.id || '';
}

export function mapRefexEmployeeRow(item) {
  const base = mapReportRow(item);
  const employeeApprovalActivities = parseStepActivities(item);
  const itAgentActivities = parseItAgentActivities(item);
  const employeeConfirmations = parseEmployeeConfirmations(item);
  const agentSolutions = parseAgentSolutions(item);
  const requestId = extractRequestId(item);
  const criticality = extractCriticality(item);
  const reopenedTicket = isReopenedYes(getCol(item, 'reopenedTicket'));
  const statu = normalizeText(getCol(item, 'status'));
  const systemStatus = normalizeText(getCol(item, 'systemStatus') || getNativeField(item, '_status', 'Statu'));
  const currentStep = normalizeText(getCol(item, 'currentStep') || getNativeField(item, '_current_step'));
  const slaBreached = isSlaBreached(item) || isSlaBreached(base);
  const tatMinutes = extractReferenceMinutes(getCol(item, 'tatMinutes'), 'TurnAround_Time_TAT');
  const closureMinutes = extractReferenceMinutes(getCol(item, 'closureMinutes'), 'Closure_Time');
  const businessCloseStatus = normalizeText(
    getNativeField(item, 'Statu_1')
    || getCol(item, 'statusValidation')
    || getNativeField(item, 'Validation', 'Status_Validation'),
  );
  const businessCloseToken = businessCloseStatus.toLowerCase().replace(/[\s_-]+/g, '');
  const refexTechSupportStatus = (
    businessCloseToken in { yes: 1, no: 1, true: 1, false: 1 }
      ? ''
      : businessCloseStatus
  ) || normalizeText(
    getCol(item, 'statusValidation')
    || getNativeField(item, 'Statu_1', 'Validation', 'Status_Validation'),
  );
  const itAgentSolution = normalizeText(getCol(item, 'itAgentSolutionText')) || '';
  // Prefer workflow Assigned To for display — do not merge Assigned To User (duplicates names).
  const assignedToRaw = dedupeAssigneeList(
    getCol(item, 'currentAssignedTo')
    || getNativeField(item, '_current_assigned_to')
    || base.assignedToRaw,
  );
  const assignedToUserRaw = dedupeAssigneeList(
    getCol(item, 'assignedToUser')
    || base.assignedToUserRaw,
  );
  let assignedToDisplay = formatAssignedList(assignedToRaw) || formatAssignedList(base.assignedTo);
  const employeeTaskActivityInstanceId = pickInProgressEmployeeActivity(employeeApprovalActivities);
  // Only compute reopen stamp from real send-backs / reopen flag (never normal feedback).
  const reopenedAtRaw = getReopenedOnRaw({
    employeeConfirmations,
    employeeApprovalActivities,
    reopenedTicket,
    reopenedAtRaw: null,
  });

  // Extrovis has no separate Item Status field — reuse Statu / system status.
  // Prefer Statu_1 Open/Closed over Validation Yes/No for open/close buckets.
  const resolvedItemStatusRaw = (
    businessCloseToken in { open: 1, closed: 1, close: 1, completed: 1, resolved: 1, inprogress: 1 }
      ? businessCloseStatus
      : ''
  ) || normalizeText(base.itemStatusRaw) || systemStatus || statu || '';
  const isTerminal = ['completed', 'closed', 'withdrawn'].includes(systemStatus.toLowerCase())
    || ['completed', 'closed', 'withdrawn'].includes(statu.toLowerCase())
    || businessCloseToken in { closed: 1, close: 1, completed: 1, resolved: 1 };
  const resolvedStatus = isTerminal ? 'Completed' : (base.status || 'InProgress');

  // Closed tickets often clear `_current_assigned_to` — fall back to last agent / Assigned To User.
  if (!assignedToDisplay || assignedToDisplay === '—') {
    if (isTerminal) {
      let bestName = '';
      let bestTs = 0;
      itAgentActivities.forEach((entry) => {
        const name = normalizeText(entry?.actedBy);
        if (!name) return;
        const ts = entry?.actedAt ? new Date(entry.actedAt).getTime() : 0;
        if (!Number.isNaN(ts) && ts >= bestTs) {
          bestTs = ts;
          bestName = name;
        }
      });
      assignedToDisplay = bestName
        || formatAssignedList(assignedToUserRaw)
        || normalizeText(base.completedBy)
        || normalizeText(base.modifiedBy)
        || '';
    } else {
      assignedToDisplay = formatAssignedList(assignedToUserRaw) || assignedToDisplay;
    }
  }

  return {
    ...base,
    requestId,
    criticality,
    status: resolvedStatus,
    statusLabel: resolvedStatus === 'InProgress' ? 'In Progress' : resolvedStatus,
    itemStatusRaw: resolvedItemStatusRaw,
    itemStatus: isTerminal ? 'Closed' : (resolvedItemStatusRaw || base.itemStatus),
    statu,
    systemStatus,
    workflowStatus: systemStatus || statu || base.workflowStatus,
    currentStep: currentStep || base.currentStep,
    activeWorkflowStep: currentStep || base.activeWorkflowStep,
    employeeApprovalActivities,
    itAgentActivities,
    employeeConfirmations,
    agentSolutions,
    employeeComments: normalizeText(getCol(item, 'employeeComments')) || '',
    employeeRatings: getCol(item, 'employeeRatings') ?? null,
    reopenedTicket,
    reopenedAtRaw,
    escalation: extractEscalation(item, itAgentActivities, slaBreached),
    assignedToRaw,
    assignedToUserRaw,
    assignedToDisplay,
    assignedTo: assignedToDisplay || base.assignedTo,
    isProcessCompleted: isTerminal || Boolean(base.isProcessCompleted),
    closedAtRaw: null,
    progressRaw: null,
    employeeMyTaskItem: null,
    employeeTaskActivityInstanceId,
    employeeTaskOwnedByUser: false,
    employeeDisplayStatusHint: '',
    latestAgentSolution: agentSolutions[agentSolutions.length - 1]?.resolution
      || normalizeText(base.solution)
      || normalizeText(getCol(item, 'itAgentSolutionText'))
      || '—',
    slaBreached,
    tatMinutes,
    closureMinutes,
    serviceQueueSlaMinutes: closureMinutes,
    refexTechSupportStatus,
    itAgentSolution,
    createdOnLabel: base.requestedDate || base.createdAt,
    source: normalizeText(getCol(item, 'source')) || base.source || '—',
    closedAtRaw: (() => {
      const step = currentStep.toLowerCase();
      if (step.includes('it tech reopen') || step.includes('employee feedback')) {
        return getNativeField(item, '_modified_at') || base.modifiedAtRaw || null;
      }
      return null;
    })(),
  };
}

export function mergeEmployeeRowWithTask(row, taskItem, user) {
  if (!taskItem) return row;
  const taskActId = normalizeText(
    taskItem?._activity_instance_id
    || taskItem?.activityInstanceId
    || taskItem?.Activity_Instance_ID,
  );
  const instanceId = normalizeText(taskItem?._id || taskItem?.Instance_ID);
  if (instanceId && instanceId !== row.id) return row;

  const assignedList = normalizeAssigneeList(taskItem?._current_assigned_to);
  const ownedByUser = user ? isAssignedToUser(assignedList, user) : true;

  return {
    ...row,
    employeeMyTaskItem: taskItem,
    employeeTaskActivityInstanceId: taskActId || row.employeeTaskActivityInstanceId,
    employeeTaskOwnedByUser: ownedByUser,
    employeeDisplayStatusHint: 'Closed',
    assignedToRaw: assignedList.length ? assignedList : normalizeAssigneeList(row.assignedToRaw),
    assignedToDisplay: formatAssignedList(assignedList) || row.assignedToDisplay,
    currentStep: normalizeText(taskItem?._current_step) || row.currentStep,
    activeWorkflowStep: normalizeText(taskItem?._current_step) || row.activeWorkflowStep,
    raw: row.raw ? { ...row.raw, ...taskItem } : taskItem,
  };
}

export function mergeTechSupportRowWithTask(row, taskItem, user) {
  if (!taskItem) return row;
  const taskActId = normalizeText(
    taskItem?._activity_instance_id
    || taskItem?.activityInstanceId
    || taskItem?.Activity_Instance_ID,
  );
  const instanceId = normalizeText(taskItem?._id || taskItem?.Instance_ID);
  if (instanceId && instanceId !== row.id) return row;

  const assignedList = dedupeAssigneeList(taskItem?._current_assigned_to);
  const ownedByUser = user
    ? (isAssignedToUser(assignedList, user) || isAssignedToUser(row.assignedToUserRaw, user))
    : true;
  const mergedRaw = row.raw ? { ...row.raw, ...taskItem } : taskItem;
  const reportIds = resolveAgentSubmitIdsFromReport({ ...row, raw: mergedRaw });
  const resolvedActivityId = reportIds.activityInstanceId || taskActId || row.activityInstanceId;
  // Display: live task assignee only (already a single list). Keep Assigned To User for matching.
  const displayAssignees = assignedList.length
    ? assignedList
    : dedupeAssigneeList(row.assignedToRaw);

  return {
    ...row,
    techSupportMyTaskItem: taskItem,
    techSupportTaskActivityInstanceId: resolvedActivityId,
    techSupportTaskOwnedByUser: ownedByUser,
    activityInstanceId: resolvedActivityId,
    assignedToRaw: displayAssignees,
    assignedToDisplay: formatAssignedList(displayAssignees) || row.assignedToDisplay,
    assignedTo: formatAssignedList(displayAssignees) || row.assignedTo || row.assignedToDisplay,
    currentStep: normalizeText(taskItem?._current_step) || row.currentStep,
    activeWorkflowStep: normalizeText(taskItem?._current_step) || row.activeWorkflowStep,
    raw: mergedRaw,
  };
}

export function enrichEmployeeRowCompletion(row, completedById = new Map()) {
  const completedItem = completedById.get(row.id);
  const completedFromApi = Boolean(completedItem);
  const businessClose = normalizeText(
    row?.itemStatusRaw || row?.itemStatus || row?.refexTechSupportStatus || row?.raw?.Statu_1,
  ).toLowerCase().replace(/[\s_-]+/g, '');
  const systemCompleted = ['completed', 'closed', 'withdrawn'].includes(
    normalizeText(row.systemStatus).toLowerCase(),
  ) || ['completed', 'closed', 'withdrawn'].includes(normalizeText(row.statu).toLowerCase())
    || businessClose in { closed: 1, close: 1, completed: 1, resolved: 1 };

  const closedAtRaw = completedItem?._modified_at
    || completedItem?.Modified_At
    || completedItem?.completedAt
    || (systemCompleted ? row.modifiedAtRaw : null);

  const reopenedAtRaw = getReopenedOnRaw(row);
  return {
    ...row,
    completedItem: completedItem || row.completedItem || null,
    isProcessCompleted: completedFromApi || systemCompleted,
    closedAtRaw,
    // Never stamp a reopen date from normal feedback onto closed tickets.
    reopenedAtRaw: (row.reopenedTicket || reopenedAtRaw) ? reopenedAtRaw : null,
  };
}

export function dedupeEmployeeRows(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    if (!row?.id) return;
    const prev = map.get(row.id);
    if (!prev) {
      map.set(row.id, row);
      return;
    }
    map.set(row.id, {
      ...prev,
      ...row,
      employeeMyTaskItem: row.employeeMyTaskItem || prev.employeeMyTaskItem,
      techSupportMyTaskItem: row.techSupportMyTaskItem || prev.techSupportMyTaskItem,
      techSupportTaskActivityInstanceId: row.techSupportTaskActivityInstanceId || prev.techSupportTaskActivityInstanceId,
      techSupportTaskOwnedByUser: row.techSupportTaskOwnedByUser || prev.techSupportTaskOwnedByUser,
      employeeTaskActivityInstanceId: row.employeeTaskActivityInstanceId || prev.employeeTaskActivityInstanceId,
      employeeTaskOwnedByUser: row.employeeTaskOwnedByUser || prev.employeeTaskOwnedByUser,
      reopenedTicket: row.reopenedTicket || prev.reopenedTicket,
      isProcessCompleted: row.isProcessCompleted || prev.isProcessCompleted,
      closedAtRaw: row.closedAtRaw || prev.closedAtRaw,
      reopenedAtRaw: row.reopenedAtRaw || prev.reopenedAtRaw,
      completedItem: row.completedItem || prev.completedItem,
      agentSolutions: row.agentSolutions?.length ? row.agentSolutions : prev.agentSolutions,
      itAgentActivities: row.itAgentActivities?.length ? row.itAgentActivities : prev.itAgentActivities,
    });
  });
  return [...map.values()];
}
