import {
  mapReportRow,
  isSlaBreached,
  isAssignedToUser,
  normalizeAssigneeList,
  dedupeAssigneeList,
  resolveAgentSubmitIdsFromReport,
  getActiveDashboardProfile,
  resolveDisplayRequestId,
  resolveServiceTicketTypeText,
  pickLatestTicketSolver,
  extractRefexCompanyNameFromItem,
  isExtrovisServiceDashboardContext,
  displayItsmPersonName,
  isL1ApprovalStep,
  isL2ApprovalStep,
} from '../../../lib/kfITServiceDashboard.js';
import { getReopenedOnRaw } from './employeeDates.js';
import { REFEX_EMPLOYEE_COL, REFEX_EMPLOYEE_TABLE_COL } from './constants.js';
import { readProcessStagesField, readTicketStatusField } from './ticketStage.js';

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

/** Treat em-dash / blank placeholders as empty so Column_* values can win. */
function displayText(v) {
  const text = normalizeText(v);
  if (!text || text === '—') return '';
  return text;
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

/** Avoid letting blank pending/task fields wipe report values on raw merge. */
function isBlankMergeValue(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value === 'string') {
    const token = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (!token || token === '—' || token === 'other' || token === 'others' || token === 'na' || token === 'n/a') {
      return true;
    }
  }
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function assigneeListHasDisplayName(value) {
  if (!value) return false;
  const list = Array.isArray(value) ? value : [value];
  return list.some((entry) => {
    if (!entry) return false;
    if (typeof entry === 'string') return Boolean(entry.trim()) && entry.trim() !== '—';
    return Boolean(String(entry?.Name || entry?.name || entry?.Email || entry?.email || '').trim());
  });
}

function mergePreferFilled(base = {}, overlay = {}, {
  preferOverlayKeys = [
    '_current_step',
    'Current_Step',
    '_current_assigned_to',
    '_activity_instance_id',
    'Activity_Instance_ID',
    '_status',
    'Statu',
    '_modified_at',
    '_modified_by',
  ],
} = {}) {
  const prefer = new Set(preferOverlayKeys);
  const out = { ...(base || {}) };
  Object.keys(overlay || {}).forEach((key) => {
    const next = overlay[key];
    if (prefer.has(key)) {
      if (key === '_current_assigned_to') {
        if (assigneeListHasDisplayName(next)) out[key] = next;
        return;
      }
      if (!isBlankMergeValue(next)) out[key] = next;
      return;
    }
    const prev = out[key];
    if (isBlankMergeValue(next) && !isBlankMergeValue(prev)) return;
    out[key] = next;
  });
  return out;
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
  if (typeof value === 'string') return displayItsmPersonName(normalizeText(value));
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
      names.push(displayItsmPersonName(name));
    });
    return names.join(', ');
  }
  if (typeof value === 'object') {
    return displayItsmPersonName(normalizeText(value?.Name || value?.name));
  }
  return displayItsmPersonName(normalizeText(value));
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

function mapStepFieldActivities(entries, stepName = '') {
  return asArray(entries).map((entry) => ({
    id: normalizeText(entry?._id),
    step: stepName || normalizeText(entry?.StepName || entry?.step || entry?.Name),
    status: normalizeText(entry?.Status),
    actedAt: entry?.ActedAt || null,
    expectedAt: entry?.ExpectedAt || null,
    actedBy: formatActedBy(entry?.ActedBy || entry?.AssignedTo),
    slaBreached: normalizeText(entry?.SLABreached),
  }));
}

function parseItAgentActivities(item) {
  const extrovis = isExtrovisServiceDashboardContext();
  const solutionLabel = extrovis ? 'IT Agent Solution' : 'IT Tech Support';
  // Pickup + Tech Support + Dependency + After Dependency + Reopen (current + legacy).
  const merged = [
    ...mapStepFieldActivities(getCol(item, 'itAgentRefex'), 'IT Tech Support'),
    ...mapStepFieldActivities(getCol(item, 'itAgentRefexActivity') || getNativeField(item, 'IT Tech Support'), 'IT Tech Support'),
    ...mapStepFieldActivities(
      getCol(item, 'itAgentActivity') || getNativeField(item, extrovis ? 'IT Agent Solution' : 'IT Tech Support'),
      solutionLabel,
    ),
    ...mapStepFieldActivities(getCol(item, 'itAgentRefexActivityLegacy'), 'IT Tech Support'),
    ...mapStepFieldActivities(getCol(item, 'itTechActivity'), 'IT Tech'),
    ...mapStepFieldActivities(getCol(item, 'itAgentPickupActivity'), 'IT Tech'),
    ...mapStepFieldActivities(getCol(item, 'itAgentPickupActivityLegacy'), 'IT Tech'),
    ...mapStepFieldActivities(getCol(item, 'dependencyAssigneeActivity'), 'Dependency Assigne'),
    ...mapStepFieldActivities(getCol(item, 'dependencyAssigneeActivityLegacy'), 'Dependency Assigne'),
    ...mapStepFieldActivities(getCol(item, 'techSupportAfterDependencyActivity') || getNativeField(item, 'IT Tech Support After Dependency'), 'IT Tech Support After Dependency'),
    ...mapStepFieldActivities(getCol(item, 'techSupportAfterDependencyActivityLegacy'), 'IT Tech Support After Dependency'),
    ...mapStepFieldActivities(getCol(item, 'itTechReopenActivity'), 'IT Tech Reopen'),
    ...mapStepFieldActivities(getCol(item, 'itTechReopenActivityLegacy'), 'IT Tech Reopen'),
    ...mapStepFieldActivities(getCol(item, 'employeeApprovalRefex'), 'IT Tech Reopen'),
    ...mapStepFieldActivities(getCol(item, 'employeeApprovalRefexLegacy'), 'IT Tech Reopen'),
  ];
  const seen = new Set();
  return merged.filter((entry) => {
    if (!entry.id) return Boolean(entry.actedAt || entry.actedBy);
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
    ...mapStepFieldActivities(getCol(item, 'employeeApprovalRefex'), 'IT Tech Reopen'),
    ...mapStepFieldActivities(getCol(item, 'employeeApprovalRefexLegacy'), 'IT Tech Reopen'),
    ...mapStepFieldActivities(getCol(item, 'itTechReopenActivity'), 'IT Tech Reopen'),
    ...mapStepFieldActivities(getCol(item, 'itTechReopenActivityLegacy'), 'IT Tech Reopen'),
  ];
  const seen = new Set();
  return merged.filter((entry) => {
    if (!entry.id) return Boolean(entry.actedAt || entry.actedBy);
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function parseEmployeeConfirmations(item) {
  const raw = getCol(item, 'employeeConfirmation');
  const tableCol = activeEmployeeTableCol();
  const rows = unwrapNestedTableRows(raw).length
    ? unwrapNestedTableRows(raw)
    : asArray(raw);
  return rows.map((entry) => ({
    id: normalizeText(entry?._id),
    recordId: normalizeText(entry?._id),
    comments: normalizeText(entry?.[tableCol.employeeConfirmationComments]),
    ratings: entry?.[tableCol.employeeConfirmationRatings] ?? null,
    dateTime: entry?.[tableCol.employeeConfirmationDateTime] || null,
  })).filter((entry) => entry.comments || entry.ratings != null);
}

function isIsoDateTimeText(text) {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?)?$/.test(String(text || '').trim());
}

function isWorkflowStatusText(text) {
  const compact = String(text || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  return /^(inprogress|pendingwithvendor|employee|open|closed|reopen|pickup|solution|dependency|pending|user|internal|external)$/.test(compact);
}

function pickSolutionTextFromTableRow(row, tableCol) {
  const aliases = [
    tableCol.itAgentSolutionResolution ? row?.[tableCol.itAgentSolutionResolution] : null,
    row?.Resolution,
    row?.resolution,
    row?.Column_KzHlT9k9fc,
    row?.Column_RHq6XN6hvD,
  ];
  let bestConfigured = '';
  for (const value of aliases) {
    const text = normalizeText(value);
    if (!text || isIsoDateTimeText(text) || isWorkflowStatusText(text)) continue;
    if (text.length > bestConfigured.length) bestConfigured = text;
  }
  return bestConfigured;
}

/** Exact Name from IT__Agent_Solution table; if blank → row `_modified_by`. */
function pickSolutionAgentNameFromTableRow(row, tableCol) {
  const tableNameCandidates = [
    tableCol.itAgentSolutionName ? row?.[tableCol.itAgentSolutionName] : null,
    row?.Name_1,
    row?.Column_ZipK5a_k8Y,
    row?.Column_mvjPOUTegd,
    row?.Agent_Name,
    row?.agentName,
    row?.Name,
  ];
  for (const value of tableNameCandidates) {
    if (value == null || value === '') continue;
    if (typeof value === 'object') {
      const name = normalizeText(value?.Name || value?.name || value?.FullName || value?.displayName);
      if (name) return name;
      continue;
    }
    const text = normalizeText(value);
    if (text) return text; // exact table value (incl. Employee / email)
  }

  // Empty table Name → last modified by on the nested row.
  const modified = row?._modified_by || row?._Modified_By || row?.ModifiedBy || row?.modifiedBy;
  if (modified) {
    if (typeof modified === 'object') {
      const name = normalizeText(modified?.Name || modified?.name);
      if (name) return name;
    } else {
      const text = normalizeText(modified);
      if (text) return text;
    }
  }
  return '';
}

/** Unwrap Kissflow nested-table payloads into a flat row array. */
function unwrapNestedTableRows(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') return []; // textarea / scalar — never a nested table
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.Values)) return raw.Values;
  if (Array.isArray(raw?.values)) return raw.values;
  if (Array.isArray(raw?.Data)) return raw.Data;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.Rows)) return raw.Rows;
  if (Array.isArray(raw?.rows)) return raw.rows;
  if (typeof raw === 'object') {
    const numericKeys = Object.keys(raw).filter((key) => /^\d+$/.test(key));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => raw[key])
        .filter((row) => row && typeof row === 'object');
    }
  }
  return [];
}

function looksLikeAttachmentFile(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const id = String(item.id || item._id || '').trim();
  const key = String(item.key || item.Key || '').trim();
  if (id.toLowerCase().startsWith('attach_')) return true;
  return key.includes('/IT__Agent_Solution/') || key.includes('/upload/2/');
}

function asAttachmentList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(looksLikeAttachmentFile);
  const unwrapped = unwrapNestedTableRows(raw);
  if (unwrapped.length) return unwrapped.filter(looksLikeAttachmentFile);
  if (looksLikeAttachmentFile(raw)) return [raw];
  return [];
}

function pickNestedCommentAttachments(row) {
  const tableCol = activeEmployeeTableCol();
  const named = [
    row?.Attachments,
    row?.attachments,
    tableCol?.itAgentSolutionAttachments ? row?.[tableCol.itAgentSolutionAttachments] : undefined,
    row?.Column_zXMX1EDrCx,
  ];
  for (const value of named) {
    const direct = asAttachmentList(value);
    if (direct.length) return direct;
  }
  return [];
}

/**
 * IT__Agent_Solution nested table only.
 * Never treat It_Agent_Solution textarea (Extrovis/Refex) as the table — empty Column_*
 * arrays must not block the real IT__Agent_Solution payload.
 */
function pickAgentSolutionTableRows(item) {
  const tableColId = activeEmployeeCol().itAgentSolutionTable;
  const candidates = [
    getCol(item, 'itAgentSolutionTable'),
    tableColId ? (item?.[tableColId] ?? item?.Data?.[tableColId] ?? item?.data?.[tableColId]) : undefined,
    // Kissflow instance GET often returns nested tables as Table::<Id>
    item?.['Table::IT__Agent_Solution'],
    item?.Data?.['Table::IT__Agent_Solution'],
    item?.data?.['Table::IT__Agent_Solution'],
    item?.IT__Agent_Solution,
    item?.Data?.IT__Agent_Solution,
    item?.data?.IT__Agent_Solution,
  ];
  // Union every nested-table copy. A 1-row Attachments table must not hide
  // the longer Column_* / Table:: User comment list.
  const out = [];
  const byId = new Map();
  const byText = new Map();
  const seen = new Set();
  const replace = (prev, next) => {
    const idx = out.indexOf(prev);
    if (idx >= 0) out[idx] = next;
    const nextId = normalizeText(next?._id || next?.Id || next?.id);
    const nextText = normalizeText(next?.Resolution || next?.resolution || '');
    if (nextId) byId.set(nextId, next);
    if (nextText) byText.set(nextText, next);
  };
  for (const candidate of candidates) {
    if (candidate == null || seen.has(candidate)) continue;
    seen.add(candidate);
    const rows = unwrapNestedTableRows(candidate).filter((row) => row && typeof row === 'object' && !Array.isArray(row));
    for (const row of rows) {
      const id = normalizeText(row?._id || row?.Id || row?.id);
      const text = normalizeText(row?.Resolution || row?.resolution || '');
      const files = pickNestedCommentAttachments(row).length;
      const prevById = id ? byId.get(id) : null;
      if (prevById) {
        if (files > pickNestedCommentAttachments(prevById).length) replace(prevById, row);
        continue;
      }
      const prevByText = text ? byText.get(text) : null;
      const prevTextId = normalizeText(prevByText?._id || prevByText?.Id || prevByText?.id);
      if (prevByText && (!id || !prevTextId)) {
        if (files > pickNestedCommentAttachments(prevByText).length || (id && !prevTextId)) {
          replace(prevByText, row);
        }
        continue;
      }
      out.push(row);
      if (id) byId.set(id, row);
      if (text) byText.set(text, row);
    }
  }
  return out;
}

function parseAgentSolutions(item) {
  const text = normalizeText(getCol(item, 'itAgentSolutionText'))
    || normalizeText(getCol(item, 'solution'))
    || normalizeText(getNativeField(item, 'It_Agent_Solution', 'Solution'));
  const tableCol = activeEmployeeTableCol();
  const fromTable = pickAgentSolutionTableRows(item)
    .map((row) => {
      const agentName = pickSolutionAgentNameFromTableRow(row, tableCol);
      const modifiedBy = row?._modified_by || row?._Modified_By || null;
      return {
        id: normalizeText(row?._id),
        recordId: normalizeText(row?._id),
        resolution: pickSolutionTextFromTableRow(row, tableCol),
        dateTime: row?._created_at
          || row?._Created_At
          || row?.[tableCol.itAgentSolutionDateTime]
          || row?.Date_Time
          || row?.ITAgentDate_Time
          || row?.dateTime
          || row?._modified_at
          || null,
        agentName,
        modifiedBy,
        stages: normalizeText(
          (tableCol.itAgentSolutionStages && row?.[tableCol.itAgentSolutionStages])
          || row?.Column_EA6Nomn1w4
          || row?.Stages_1
          || row?.Stages
          || '',
        ),
        commentsType: normalizeText(
          (tableCol.itAgentSolutionCommentsType && row?.[tableCol.itAgentSolutionCommentsType])
          || row?.Column_x6WUN8QD4O
          || row?.Comments_2
          || row?.commentsType
          || '',
        ),
        attachments: pickNestedCommentAttachments(row),
      };
    })
    .filter((row) => {
      const text = normalizeText(row.resolution);
      if (isIsoDateTimeText(text) || isWorkflowStatusText(text)) {
        return Boolean(row.attachments && row.attachments.length);
      }
      return Boolean(text || (row.attachments && row.attachments.length));
    });

  // Textarea field is a single latest note — only add when not already a table row.
  if (text && text !== '—') {
    const alreadyIncluded = fromTable.some((row) => row.resolution === text);
    if (!alreadyIncluded) {
      const itemModified = item?._modified_by || item?.Data?._modified_by || null;
      let textAgentName = '';
      if (itemModified && typeof itemModified === 'object') {
        textAgentName = normalizeText(itemModified?.Name || itemModified?.name);
      }
      fromTable.push({
        id: 'it-agent-solution-text',
        recordId: 'it-agent-solution-text',
        resolution: text,
        dateTime: null,
        agentName: textAgentName,
        modifiedBy: itemModified,
        stages: '',
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
  const systemStatus = normalizeText(
    getCol(item, 'systemStatus')
    || getNativeField(item, '_status', 'Statu')
    || base.systemStatus,
  );
  // Live current step only — never lastCompletedStep (that made Closed look like Reopen).
  const liveCurrentStep = displayText(getCol(item, 'currentStep'))
    || displayText(getNativeField(item, '_current_step'))
    || displayText(base.currentStep);
  const lastCompletedStep = displayText(getCol(item, 'lastCompletedStep'))
    || displayText(getNativeField(item, 'last_completed_step_name'))
    || displayText(base.lastCompletedStep);
  const currentStep = liveCurrentStep;
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
  const resolvedTicketType = resolveServiceTicketTypeText({
    ...base,
    raw: item,
    ticketType: base.ticketType,
    ticketTypeDetail: stringifyFieldValue(getCol(item, 'ticketTypeDetail'))
      || stringifyFieldValue(getNativeField(item, 'Ticket_Type_Detail', 'Ticket_Type', 'Request_Type')),
    requestId: requestId !== '—' ? requestId : base.requestId,
  });
  const resolvedSource = displayText(base.source)
    || displayText(getCol(item, 'source'))
    || displayText(getCol(item, 'entitySource'))
    || displayText(getNativeField(
      item,
      'Source',
      'source',
      'Channel',
      'Entity_Source',
      'Raised_By',
    ))
    || '—';
  const resolvedCategory = displayText(base.category)
    || displayText(stringifyFieldValue(getCol(item, 'category')))
    || displayText(stringifyFieldValue(getNativeField(item, 'Category', 'category')))
    || '—';
  const resolvedSubCategory = displayText(base.subCategory)
    || displayText(stringifyFieldValue(getCol(item, 'subCategory')))
    || displayText(stringifyFieldValue(getNativeField(item, 'SubCategory', 'subCategory', 'Sub_Category')))
    || '—';
  let closedByDisplay = '';
  const isBotName = (name) => {
    const token = String(name || '').toLowerCase().replace(/[\s_-]+/g, '');
    return token.includes('itsmbot')
      || token === 'bot'
      || token.endsWith('bot')
      || token.includes('system')
      || token.includes('automation')
      || token.includes('autoclose')
      || token.includes('kissflow');
  };
  {
    const solver = pickLatestTicketSolver({
      itAgentActivities,
      agentSolutions,
      assignedToUserRaw,
      assignedToDisplay,
      closedBy: base.closedBy,
      completedBy: base.completedBy,
      modifiedBy: base.modifiedBy,
      status: base.status,
      systemStatus,
      raw: item,
    });
    const solverName = solver ? normalizeText(typeof solver === 'string' ? solver : (solver?.Name || solver?.name)) : '';
    closedByDisplay = solverName
      || (() => {
        const baseClosed = normalizeText(base.closedBy);
        return !isBotName(baseClosed) ? baseClosed : '';
      })();
  }

  // Extrovis has no separate Item Status field — reuse Statu / system status.
  // Prefer Statu_1 Open/Closed over Validation Yes/No for open/close buckets.
  const resolvedItemStatusRaw = (
    businessCloseToken in { open: 1, closed: 1, close: 1, completed: 1, resolved: 1, inprogress: 1 }
      ? businessCloseStatus
      : ''
  ) || normalizeText(base.itemStatusRaw) || systemStatus || statu || '';
  // Kissflow process terminal only — Statu_1 / Validation Closed is business status, not Completed.
  const systemToken = systemStatus.toLowerCase().replace(/[\s_-]+/g, '');
  const nativeWf = normalizeText(getNativeField(item, '_status')).toLowerCase().replace(/[\s_-]+/g, '');
  const isTerminal = ['completed', 'complete', 'withdrawn'].includes(systemToken)
    || ['completed', 'complete', 'withdrawn'].includes(nativeWf);
  // Live reopen hold only from real current-step column (not lastCompletedStep).
  const liveStepOnly = liveCurrentStep;
  const liveReopenHold = Boolean(liveStepOnly)
    && /it tech reopen|employee feedback|ticket reopen|reopen window/i.test(liveStepOnly)
    && !isTerminal;
  const resolvedStatus = (isTerminal || liveReopenHold)
    ? 'Completed'
    : (displayText(base.status) || 'InProgress');
  // Open pipeline: never stamp Ticket Status Closed from Statu_1 alone.
  const openPipeline = !isTerminal && !liveReopenHold
    && (systemToken === 'inprogress' || nativeWf === 'inprogress' || !systemToken);
  const displayItemStatus = (isTerminal || liveReopenHold)
    ? 'Closed'
    : (openPipeline ? 'Open' : (resolvedItemStatusRaw || base.itemStatus || 'Open'));

  const assignedIsBot = (() => {
    const token = String(assignedToDisplay || '').toLowerCase().replace(/[\s_-]+/g, '');
    return token.includes('itsmbot')
      || token === 'bot'
      || token.endsWith('bot')
      || token.includes('system')
      || token.includes('automation')
      || token.includes('autoclose')
      || token.includes('kissflow');
  })();

  // Closed / reopen: Assigned To = human solver (Solution/Tech Support), not PickUp pool / Assigned To User.
  if (isTerminal || liveReopenHold) {
    const solver = pickLatestTicketSolver({
      itAgentActivities,
      agentSolutions,
      assignedToUserRaw,
      assignedToDisplay,
      closedBy: closedByDisplay,
      completedBy: base.completedBy,
      modifiedBy: base.modifiedBy,
      status: resolvedStatus,
      systemStatus,
      raw: item,
    });
    const solverName = solver
      ? normalizeText(typeof solver === 'string' ? solver : (solver?.Name || solver?.name))
      : '';
    if (solverName) {
      assignedToDisplay = solverName;
      if (!closedByDisplay) closedByDisplay = solverName;
    } else if (!assignedToDisplay || assignedToDisplay === '—' || assignedIsBot) {
      const modifiedBy = normalizeText(base.modifiedBy);
      assignedToDisplay = closedByDisplay
        || (!isBotName(modifiedBy) ? modifiedBy : '')
        || (assignedIsBot ? '' : normalizeText(base.assignedTo))
        || '';
    }
  } else if (!assignedToDisplay || assignedToDisplay === '—' || assignedIsBot) {
    assignedToDisplay = formatAssignedList(assignedToUserRaw) || assignedToDisplay;
  }

  return {
    ...base,
    requestId,
    criticality,
    ticketType: resolvedTicketType,
    category: resolvedCategory,
    subCategory: resolvedSubCategory,
    status: resolvedStatus,
    statusLabel: resolvedStatus === 'InProgress' ? 'In Progress' : resolvedStatus,
    itemStatusRaw: resolvedItemStatusRaw,
    itemStatus: displayItemStatus,
    statu,
    systemStatus,
    workflowStatus: systemStatus || base.workflowStatus,
    currentStep: displayText(currentStep) || displayText(base.currentStep) || '',
    activeWorkflowStep: displayText(currentStep) || displayText(base.activeWorkflowStep) || '',
    lastCompletedStep: lastCompletedStep || '',
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
    createdAtRaw: base.createdAtRaw
      || getCol(item, 'createdAt')
      || getCol(item, 'requestedDateTime')
      || getNativeField(item, '_created_at')
      || null,
    requestedDateTimeRaw: base.requestedDateTimeRaw
      || getCol(item, 'requestedDateTime')
      || getCol(item, 'createdAt')
      || getNativeField(item, '_created_at')
      || null,
    modifiedAtRaw: base.modifiedAtRaw
      || getCol(item, 'modifiedAt')
      || getNativeField(item, '_modified_at')
      || null,
    progressRaw: null,
    employeeMyTaskItem: null,
    employeeTaskActivityInstanceId,
    employeeTaskOwnedByUser: false,
    employeeDisplayStatusHint: '',
    subject: displayText(
      stringifyFieldValue(getCol(item, 'subject'))
      || stringifyFieldValue(getNativeField(item, 'Subject', 'subject'))
    ) || '',
    ticketStage: readTicketStatusField({ raw: item, id: item?._id || item?.Id || base.id }) || '',
    processStages: readProcessStagesField({ raw: item, id: item?._id || item?.Id || base.id }) || '',
    latestAgentSolution: agentSolutions[agentSolutions.length - 1]?.resolution
      || normalizeText(base.solution)
      || normalizeText(getCol(item, 'itAgentSolutionText'))
      || '—',
    slaBreached,
    tatMinutes,
    closureMinutes,
    serviceQueueSlaMinutes: (() => {
      const step = liveCurrentStep.toLowerCase();
      const pickup = step.includes('pickup') || step.includes('pick up') || step.includes('pick-up');
      if (pickup) return tatMinutes || closureMinutes;
      return closureMinutes || tatMinutes;
    })(),
    companyName: base.companyName || extractRefexCompanyNameFromItem(item) || '',
    company: base.companyName || base.company || extractRefexCompanyNameFromItem(item) || '',
    refexTechSupportStatus,
    itAgentSolution,
    createdOnLabel: base.requestedDate || base.createdAt,
    source: resolvedSource,
    closedBy: isTerminal
      ? (closedByDisplay || base.closedBy || '')
      : (base.closedBy || ''),
    // Keep completedBy as agent closer only — never copy modifiedBy (approver).
    completedBy: closedByDisplay || base.completedBy || '',
    closedAtRaw: (() => {
      const step = liveCurrentStep.toLowerCase();
      if (step.includes('it tech reopen') || step.includes('employee feedback') || step.includes('ticket reopen')) {
        return getNativeField(item, '_modified_at') || base.modifiedAtRaw || base.closedAtRaw || null;
      }
      if (isTerminal) {
        return getNativeField(item, '_modified_at') || base.modifiedAtRaw || base.closedAtRaw || null;
      }
      return base.closedAtRaw || null;
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
  const approvalPending = taskItem?.isLiveApprovalPending === true
    || isL1ApprovalStep(taskItem)
    || isL2ApprovalStep(taskItem);
  const liveStep = normalizeText(taskItem?._current_step) || row.currentStep;

  return {
    ...row,
    employeeMyTaskItem: taskItem,
    employeeTaskActivityInstanceId: taskActId || row.employeeTaskActivityInstanceId,
    employeeTaskOwnedByUser: ownedByUser,
    ...(approvalPending
      ? {
        isLiveApprovalPending: true,
        liveApprovalPendingKnown: true,
        isLiveBucketPending: true,
        isLiveReopenPending: false,
      }
      : { employeeDisplayStatusHint: 'Closed' }),
    assignedToRaw: assignedList.length ? assignedList : normalizeAssigneeList(row.assignedToRaw),
    assignedToDisplay: formatAssignedList(assignedList) || row.assignedToDisplay,
    currentStep: liveStep,
    activeWorkflowStep: liveStep || row.activeWorkflowStep,
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
  const mergedRaw = row.raw ? mergePreferFilled(row.raw, taskItem) : taskItem;
  const reportIds = resolveAgentSubmitIdsFromReport({ ...row, raw: mergedRaw });
  const resolvedActivityId = reportIds.activityInstanceId || taskActId || row.activityInstanceId;
  // Display: live task assignee when it has a usable name; otherwise keep report assignee.
  const taskAssigneeLabel = formatAssignedList(assignedList);
  const displayAssignees = taskAssigneeLabel
    ? assignedList
    : dedupeAssigneeList(row.assignedToRaw);
  const nextAssignedDisplay = taskAssigneeLabel
    || formatAssignedList(displayAssignees)
    || row.assignedToDisplay
    || row.assignedTo
    || '';

  return {
    ...row,
    techSupportMyTaskItem: taskItem,
    techSupportTaskActivityInstanceId: resolvedActivityId,
    techSupportTaskOwnedByUser: ownedByUser,
    activityInstanceId: resolvedActivityId,
    assignedToRaw: displayAssignees.length ? displayAssignees : (row.assignedToRaw || []),
    assignedToDisplay: nextAssignedDisplay,
    assignedTo: nextAssignedDisplay,
    currentStep: normalizeText(taskItem?._current_step) || row.currentStep,
    activeWorkflowStep: normalizeText(taskItem?._current_step) || row.activeWorkflowStep,
    raw: mergedRaw,
  };
}

export function enrichEmployeeRowCompletion(row, completedById = new Map()) {
  const completedItem = completedById.get(row.id);
  const completedFromApi = Boolean(completedItem);
  const systemCompleted = ['completed', 'complete', 'withdrawn'].includes(
    normalizeText(row.systemStatus).toLowerCase().replace(/[\s_-]+/g, ''),
  ) || ['completed', 'complete', 'withdrawn'].includes(
    normalizeText(row.raw?._status).toLowerCase().replace(/[\s_-]+/g, ''),
  );

  const closedAtRaw = completedItem?._modified_at
    || completedItem?.Modified_At
    || completedItem?.completedAt
    || row.closedAtRaw
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
