import { kfGetJson } from '../../../lib/kfRuntime.js';
import {
  APP_ID,
  getActiveServiceProcessId,
  IT_AGENT_REFEX_PENDING_ACTIVITY_ID,
  EXTROVIS_EMPLOYEE_FEEDBACK_ACTIVITY_ID,
  IT_TECH_PICKUP_REFEX_ACTIVITY_ID,
  REFEX_DEPENDENCY_ASSIGNEE_ACTIVITY_ID,
  REFEX_TECH_SUPPORT_AFTER_DEPENDENCY_ACTIVITY_ID,
  REFEX_AGENT_WORK_ACTIVITY_IDS,
  REFEX_L1_APPROVAL_ACTIVITY_ID,
  REFEX_L2_APPROVAL_ACTIVITY_ID,
  REFEX_IT_MANAGER_APPROVAL_ACTIVITY_ID,
  REFEX_IT_HEAD_APPROVAL_ACTIVITY_ID,
  REFEX_IT_TECH_REOPEN_ACTIVITY_ID,
  extractItemsFromResponse,
  fetchITServiceReport,
  resolveAccountId,
  sortDashboardRowsByTicketOrder,
  getITProcess,
  getActiveDashboardProfile,
  REFEX_REPORT_PAGE_SIZE,
  resolveDisplayRequestId,
  resolveAgentSubmitIdsFromReport,
  fetchITAgentActivityInstanceId,
  isExtrovisServiceDashboardContext,
  isExtrovisReportEntity,
} from '../../../lib/kfITServiceDashboard.js';
import {
  dedupeEmployeeRows,
  enrichEmployeeRowCompletion,
  mapRefexEmployeeRow,
  mergeTechSupportRowWithTask,
} from '../employeedashboard/mapRefexEmployeeRow.js';
import { isAssignedToUser, normalizeAssigneeList } from '../../../lib/kfITServiceDashboard.js';
import {
  fetchRefexProcessProgressCached,
  listCommentActivityInstanceIdsFromProgress,
  collectTechSupportActorsFromProgress,
} from '../employeedashboard/progressApi.js';
import { fetchExtrovisAdminItem } from '../../../lib/extrovisIntegrationApi.js';
import { fetchRefexReportItemsCached, buildRefexReportCacheKey } from '../shared/refexReportCache.js';
import {
  getPersistentReportCache,
  setPersistentReportCache,
  clearPersistentReportCache,
} from '../shared/refexPersistentReportCache.js';
import { toKissflowUtcIso, overlapKissflowSyncIso, buildReportFilterCacheSuffix, startOfLocalDayKissflowIso } from '../shared/refexReportQuery.js';
import {
  collectStepPatternsForMeBucket,
  extractRequestIdFromItem,
  getPendingStepGroups,
  parsePendingActivityCountEntries,
  resolveActivityIdsByStepNames,
  classifyPendingStepName,
  isReopenStepName,
  stepNameMatchesAny,
  stampPendingItemsWithStepName,
} from '../shared/refexPendingByStep.js';
import {
  fetchAllAdminProcessItems,
  collectHeadLiveAssignmentIds,
  REFEX_IT_HEAD_APPROLE_ID,
} from '../shared/fetchKissflowAdminProcessItems.js';

function buildProcessPaths(kfInstance) {
  const accountId = resolveAccountId(kfInstance);
  const appQuery = `_application_id=${encodeURIComponent(APP_ID)}`;
  const processId = getActiveServiceProcessId();
  const base = `/process/2/${accountId}/${processId}`;
  return {
    pendingAtStepPath(activityId, pageNumber = 1, pageSize = REFEX_REPORT_PAGE_SIZE) {
      return `${base}/pending/${encodeURIComponent(activityId)}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    /** Kissflow pending is activity-scoped — count first, then pending/{activityId}. */
    pendingActivityCountPath() {
      return `${base}/pending/activity/count?apply_preference=true&${appQuery}`;
    },
    myItemsPath(status = 'all', pageNumber = 1, pageSize = REFEX_REPORT_PAGE_SIZE) {
      return `${base}/myitems/${status}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    /** Kissflow participated is activity-scoped (not flat /participated). */
    participatedActivityCountPath() {
      return `${base}/participated/activity/count?${appQuery}`;
    },
    participatedAtActivityPath(activityId, pageNumber = 1, pageSize = REFEX_REPORT_PAGE_SIZE) {
      return `${base}/participated/activity/${encodeURIComponent(activityId)}?page_number=${pageNumber}&page_size=${pageSize}&apply_preference=true&${appQuery}`;
    },
    instancePath(instanceId) {
      return `${base}/${encodeURIComponent(instanceId)}?${appQuery}`;
    },
    instanceWithActivityPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}?${appQuery}`;
    },
    /** Closed tickets leave the activity queue — admin item still has IT__Agent_Solution. */
    adminItemPath(instanceId) {
      return `/process/2/${accountId}/admin/${processId}/item/${encodeURIComponent(instanceId)}?${appQuery}`;
    },
  };
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

/** Agent workflow step activity ids — profile-aware (Refex / Extrovis share this flow). */
function getAgentWorkActivityIds() {
  const profile = getActiveDashboardProfile();
  const ids = [...(profile?.agentWorkActivityIds || REFEX_AGENT_WORK_ACTIVITY_IDS)];
  const reopenId = profile?.employeeFeedbackActivityId || profile?.itTechReopenActivityId;
  if (reopenId && !ids.includes(reopenId)) ids.push(reopenId);
  return ids;
}

function isTechSupportTask(item) {
  const activityId = normalizeText(item?._activity_id || item?.Activity_ID || item?.activity_id);
  if (
    activityId === IT_AGENT_REFEX_PENDING_ACTIVITY_ID
    || activityId === REFEX_DEPENDENCY_ASSIGNEE_ACTIVITY_ID
    || activityId === REFEX_TECH_SUPPORT_AFTER_DEPENDENCY_ACTIVITY_ID
    || getAgentWorkActivityIds().includes(activityId)
    || activityId === EXTROVIS_EMPLOYEE_FEEDBACK_ACTIVITY_ID
    || activityId === getActiveDashboardProfile()?.employeeFeedbackActivityId
  ) {
    return true;
  }
  const step = normalizeText(item?._current_step || item?.Current_Step).toLowerCase();
  return step.includes('tech support')
    || step.includes('it agent refex')
    || step.includes('it agent extrovis')
    || step === 'it agent'
    || step.includes('it agent pickup')
    || step.includes('it agent pick up')
    || step.includes('it agent solution')
    || step.includes('it tech pickup')
    || step.includes('it tech pick up')
    || step === 'it tech'
    || step.includes('dependency assigne')
    || step.includes('reopen window')
    || step.includes('it tech reopen');
}

function isRefexServiceMyTaskItem(item) {
  if (isTechSupportTask(item)) return true;
  if (item?._id || item?.Instance_ID || item?.id) return true;
  const step = normalizeText(item?._current_step || item?.Current_Step).toLowerCase();
  return Boolean(step);
}

async function fetchRefexSdkMyTaskItems(kfInstance) {
  const process = getITProcess(kfInstance);
  if (!process?.getMyTasksItems) return [];
  const collected = [];
  try {
    const resp = await process.getMyTasksItems({
      pageNumber: 1,
      pageSize: REFEX_REPORT_PAGE_SIZE,
    });
    collected.push(...extractItemsFromResponse(resp));
  } catch (err) {
    console.warn('Refex getMyTasksItems failed:', err?.message || err);
  }
  return collected;
}

function reportItemId(item) {
  return normalizeText(item?._id || item?.Instance_ID || item?.id);
}

function mergeReportItemsById(...batches) {
  const map = new Map();
  batches.flat().forEach((item) => {
    const id = reportItemId(item);
    if (!id) return;
    map.set(id, item);
  });
  return [...map.values()];
}

async function fetchAllReportItemsUncached(
  kfInstance,
  pageSize = REFEX_REPORT_PAGE_SIZE,
  filters = {},
  maxPages = 30,
) {
  let page = 1;
  let hasMore = true;
  const collected = [];
  const pageCap = Math.max(1, Number(maxPages) || 30);
  while (hasMore && page <= pageCap) {
    const report = await fetchITServiceReport(kfInstance, page, pageSize, filters);
    const items = extractItemsFromResponse(report);
    collected.push(...items);
    hasMore = items.length >= pageSize;
    page += 1;
  }
  return collected;
}

/** Small in-memory cache for $request_id report enrichments. */
const REQUEST_ID_REPORT_TTL_MS = 60_000;
/** @type {Map<string, { at: number, item: any }>} */
const requestIdReportCache = new Map();

/** Expand-panel instance enrich (IT__Agent_Solution) — one call per ticket, TTL cache. */
const INSTANCE_ENRICH_TTL_MS = 60_000;
/** @type {Map<string, { at: number, promise: Promise<any> }>} */
const instanceEnrichCache = new Map();

export function clearRequestIdReportCache() {
  requestIdReportCache.clear();
  instanceEnrichCache.clear();
}

/** Drop TTL enrich cache for one ticket — Comments chat refresh only, not dashboard reload. */
export function clearInstanceEnrichCacheForInstance(kfInstance, instanceId) {
  const id = normalizeText(instanceId);
  if (!id) return;
  const prefix = `${resolveAccountId(kfInstance) || ''}|${id}|`;
  [...instanceEnrichCache.keys()].forEach((key) => {
    if (key.startsWith(prefix)) instanceEnrichCache.delete(key);
  });
}

function resolveRowActivityInstanceId(row) {
  if (!row || typeof row !== 'object') return '';
  const fromReport = resolveAgentSubmitIdsFromReport(row);
  const profileCol = getActiveDashboardProfile()?.serviceCol?.activityInstanceId
    || getActiveDashboardProfile()?.employeeCol?.activityInstanceId
    || '';
  return normalizeText(
    row.techSupportTaskActivityInstanceId
    || row.employeeTaskActivityInstanceId
    || row.activityInstanceId
    || fromReport?.activityInstanceId
    || row?.raw?._activity_instance_id
    || row?.raw?.Activity_Instance_ID
    || (profileCol ? (row?.raw?.[profileCol] ?? row?.raw?.Data?.[profileCol]) : '')
    || row?.techSupportMyTaskItem?._activity_instance_id
    || row?.employeeMyTaskItem?._activity_instance_id
    || '',
  );
}

/**
 * Lazy MIS enrich for Comments.
 * Correct Kissflow sequence:
 *  1) GET .../{instanceId}/progress — pick tech/solution activity_instance_id
 *  2) GET .../{instanceId}/{activityInstanceId} — nested IT__Agent_Solution table
 *  3) Closed tickets: try remaining completed Solution/Tech activity ids, then
 *     GET .../admin/{process}/item/{instanceId} (activity GET 404s after complete)
 * force=true clears TTL cache (Comments refresh button).
 */
export async function fetchTicketInstanceEnrichForRevisions(kfInstance, row, {
  force = false,
  progress = null,
} = {}) {
  const instanceId = normalizeText(row?.id || row?.raw?._id);
  if (!kfInstance?.api || !instanceId) return null;

  const progressPayload = progress || await fetchRefexProcessProgressCached(
    kfInstance,
    instanceId,
    { force },
  );

  const actIds = listCommentActivityInstanceIdsFromProgress(progressPayload, row);
  const rowAct = resolveRowActivityInstanceId(row);
  if (rowAct && !actIds.includes(rowAct)) actIds.push(rowAct);
  if (!actIds.length) {
    try {
      const fallbackAct = normalizeText(await fetchITAgentActivityInstanceId(kfInstance, row));
      if (fallbackAct) actIds.push(fallbackAct);
    } catch {
      /* closed tickets often have no live activity */
    }
  }

  const cacheKey = `${resolveAccountId(kfInstance) || ''}|${instanceId}|comments`;
  const now = Date.now();
  if (force) {
    clearInstanceEnrichCacheForInstance(kfInstance, instanceId);
    [...requestIdReportCache.keys()].forEach((key) => {
      if (key.includes(`|${instanceId}|`)) requestIdReportCache.delete(key);
    });
  }
  const hit = instanceEnrichCache.get(cacheKey);
  if (
    !force
    && hit?.promise
    && (now - hit.at) < INSTANCE_ENRICH_TTL_MS
  ) {
    return hit.promise;
  }

  const promise = (async () => {
    const item = await fetchCommentProcessInstanceItem(kfInstance, instanceId, actIds, row);
    if (!item) return null;
    const mapped = mapRefexEmployeeRow(item);
    let agentSolutions = Array.isArray(mapped.agentSolutions) ? mapped.agentSolutions : [];
    const actors = collectTechSupportActorsFromProgress(progressPayload, row);
    if (actors.length) {
      agentSolutions = agentSolutions.map((entry, index) => {
        if (String(entry?.agentName || '').trim()) return entry;
        const ts = entry?.dateTime ? new Date(entry.dateTime).getTime() : 0;
        let best = actors[Math.min(index, actors.length - 1)];
        let bestDelta = Number.POSITIVE_INFINITY;
        if (Number.isFinite(ts) && ts > 0) {
          actors.forEach((actor) => {
            const delta = Math.abs((actor.timestamp || 0) - ts);
            if (delta < bestDelta) {
              bestDelta = delta;
              best = actor;
            }
          });
        }
        return {
          ...entry,
          agentName: best?.userName || entry?.agentName || '',
        };
      });
    }
    return {
      agentSolutions,
      employeeConfirmations: Array.isArray(mapped.employeeConfirmations) ? mapped.employeeConfirmations : [],
      latestAgentSolution: mapped.latestAgentSolution || '',
      itAgentSolution: mapped.itAgentSolution || '',
      solution: mapped.latestAgentSolution || mapped.solution || '',
      activityInstanceId: actIds[0] || '',
      progress: progressPayload,
      raw: item,
    };
  })();

  instanceEnrichCache.set(cacheKey, { at: now, promise });
  if (instanceEnrichCache.size > 40) {
    const oldest = instanceEnrichCache.keys().next().value;
    if (oldest) instanceEnrichCache.delete(oldest);
  }
  promise.then((result) => {
    if (!result) instanceEnrichCache.delete(cacheKey);
  }).catch(() => {
    instanceEnrichCache.delete(cacheKey);
  });
  return promise;
}

function unwrapInstancePayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw.Data && typeof raw.Data === 'object' && !Array.isArray(raw.Data) ? raw.Data : null;
  if (!data) return raw;
  return { ...data, ...raw };
}

function payloadHasAgentSolutions(item) {
  if (!item || typeof item !== 'object') return false;
  const mapped = mapRefexEmployeeRow(item);
  return Array.isArray(mapped.agentSolutions) && mapped.agentSolutions.length > 0;
}

function commentFileCountFromItem(item) {
  const mapped = mapRefexEmployeeRow(item);
  return (mapped.agentSolutions || []).reduce(
    (count, row) => count + (Array.isArray(row?.attachments) ? row.attachments.length : 0),
    0,
  );
}

function pickRicherCommentItem(left, right) {
  if (!left) return right;
  if (!right) return left;
  const leftRows = mapRefexEmployeeRow(left).agentSolutions || [];
  const rightRows = mapRefexEmployeeRow(right).agentSolutions || [];
  const leftScore = commentFileCountFromItem(left) * 100 + leftRows.length;
  const rightScore = commentFileCountFromItem(right) * 100 + rightRows.length;
  return rightScore > leftScore ? right : left;
}

async function fetchAdminProcessItem(kfInstance, paths, instanceId) {
  try {
    const adminRaw = await kfGetJson(kfInstance, paths.adminItemPath(instanceId));
    return unwrapInstancePayload(adminRaw && typeof adminRaw === 'object' ? adminRaw : null);
  } catch (err) {
    console.warn(`admin item ${instanceId} enrich failed:`, err?.message || err);
    return null;
  }
}

/** MIS / landing — activity GET first. Closed tickets fall back to admin item. */
async function fetchProcessInstanceItem(kfInstance, instanceId, activityInstanceIds = '') {
  const id = normalizeText(instanceId);
  if (!kfInstance?.api || !id) return null;
  const paths = buildProcessPaths(kfInstance);
  const acts = Array.isArray(activityInstanceIds)
    ? activityInstanceIds.map((value) => normalizeText(value)).filter(Boolean)
    : [normalizeText(activityInstanceIds)].filter(Boolean);
  let firstItem = null;
  for (const act of acts.slice(0, 6)) {
    try {
      const withAct = await kfGetJson(kfInstance, paths.instanceWithActivityPath(id, act));
      const item = unwrapInstancePayload(withAct && typeof withAct === 'object' ? withAct : null);
      if (!item) continue;
      if (payloadHasAgentSolutions(item)) return item;
      if (!firstItem) firstItem = item;
    } catch (err) {
      console.warn(`process instance ${id}/${act} enrich failed:`, err?.message || err);
    }
  }
  const adminItem = await fetchAdminProcessItem(kfInstance, paths, id);
  if (adminItem && (payloadHasAgentSolutions(adminItem) || !firstItem)) return adminItem;
  return firstItem;
}

function isExtrovisCommentTicket(row) {
  if (isExtrovisServiceDashboardContext()) return true;
  return isExtrovisReportEntity(
    row?.entity || row?.entityKey || row?.raw?.Entity || row?.Entity || '',
  );
}

/** One process-report row by `$request_id` — Refex and Extrovis record details. */
async function fetchCommentItemFromReport(kfInstance, row, instanceId) {
  const requestId = normalizeText(
    row?.requestId
    || extractRequestIdFromItem(row)
    || extractRequestIdFromItem(row?.raw || row),
  );
  if (!requestId || requestId === '—') return null;
  const cacheKey = `${resolveAccountId(kfInstance) || ''}|report-comment|${instanceId}|${requestId}`;
  const hit = requestIdReportCache.get(cacheKey);
  if (hit && (Date.now() - hit.at) < REQUEST_ID_REPORT_TTL_MS) return hit.item;

  try {
    const report = await fetchITServiceReport(kfInstance, 1, 25, {
      requestId,
    });
    const items = extractItemsFromResponse(report);
    const match = items.find((item) => normalizeText(item?._id) === instanceId)
      || items.find((item) => normalizeText(extractRequestIdFromItem(item)) === requestId)
      || items[0]
      || null;
    if (match) requestIdReportCache.set(cacheKey, { at: Date.now(), item: match });
    return match;
  } catch (err) {
    console.warn(`comment report ${requestId} enrich failed:`, err?.message || err);
    return null;
  }
}

/** Chat refresh — same Kissflow order as Refex One: admin item, then activity item. */
async function fetchCommentProcessInstanceItem(kfInstance, instanceId, activityInstanceIds = '', row = null) {
  const id = normalizeText(instanceId);
  if (!kfInstance?.api || !id) return null;
  const paths = buildProcessPaths(kfInstance);
  const acts = Array.isArray(activityInstanceIds)
    ? activityInstanceIds.map((value) => normalizeText(value)).filter(Boolean)
    : [normalizeText(activityInstanceIds)].filter(Boolean);
  let firstItem = null;

  const tryActivityGets = async () => {
    let best = firstItem;
    for (const act of acts.slice(0, 6)) {
      try {
        const withAct = await kfGetJson(kfInstance, paths.instanceWithActivityPath(id, act));
        const item = unwrapInstancePayload(withAct && typeof withAct === 'object' ? withAct : null);
        if (!item) continue;
        best = pickRicherCommentItem(best, item);
        if (!firstItem) firstItem = item;
        // Live Solution GET carries Table:: attachments. Stop once files are present.
        if (payloadHasAgentSolutions(best) && commentFileCountFromItem(best) > 0) return best;
      } catch (err) {
        console.warn(`process instance ${id}/${act} enrich failed:`, err?.message || err);
      }
    }
    return best;
  };

  if (isExtrovisCommentTicket(row)) {
    // Refex One: GET /process/2/{account}/admin/{process}/{instance} first.
    // That item carries Table::IT__Agent_Solution attachments. Activity GET is next.
    // All_tickets $request_id has comment text and no Attachments column.
    let adminItem = null;
    try {
      adminItem = unwrapInstancePayload(await fetchExtrovisAdminItem(kfInstance, id));
    } catch (err) {
      console.warn(`keyed admin item ${id} enrich failed:`, err?.message || err);
      adminItem = await fetchAdminProcessItem(kfInstance, paths, id);
    }
    if (
      adminItem
      && payloadHasAgentSolutions(adminItem)
      && commentFileCountFromItem(adminItem) > 0
    ) {
      return adminItem;
    }
    const activityItem = await tryActivityGets();
    const live = pickRicherCommentItem(adminItem, activityItem);
    if (live && payloadHasAgentSolutions(live)) return live;
    const reportItem = await fetchCommentItemFromReport(kfInstance, row, id);
    return pickRicherCommentItem(live, reportItem);
  }

  return fetchProcessInstanceItem(kfInstance, instanceId, activityInstanceIds);
}

/** True when an instance/report payload has enough MIS to paint the table. */
function hasUsefulMisFields(item) {
  if (!item || typeof item !== 'object') return false;
  if (extractRequestIdFromItem(item)) return true;
  return Boolean(
    normalizeText(item.Ticket_Type)
    || normalizeText(item.Category)
    || normalizeText(item.Source)
    || normalizeText(item.Requester_Name)
    || normalizeText(item.Requester_Email)
    || normalizeText(item.Description)
    || normalizeText(item.Criticality)
    || normalizeText(item.Statu_1),
  );
}

function resolveTaskActivityInstanceId(task) {
  return normalizeText(
    task?._activity_instance_id
    || task?.Activity_Instance_ID
    || task?._entity_id
    || task?._current_context?.[0]?._context_activity_instance_id
    || '',
  );
}

/**
 * MIS payload for a pending/task row.
 * Only: GET .../{instanceId}/{activityInstanceId}
 * Do NOT call bare /{instanceId} (404) or process-report $request_id (empty + rate-limits 429).
 */
async function fetchMisEnrichmentItem(kfInstance, task, reportFilters = {}) {
  void reportFilters;
  if (!task || !kfInstance?.api) return null;
  const instanceId = normalizeText(task?._id || task?.Instance_ID || task?.id);
  const actId = resolveTaskActivityInstanceId(task);
  if (!instanceId || !actId) return null;
  return fetchProcessInstanceItem(kfInstance, instanceId, actId);
}

/** True when a Kissflow field value is missing / blank / empty list. */
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

/**
 * Merge overlay onto base without letting blank pending/task fields wipe report data.
 * Overlay still wins for live workflow keys (step, assignees, activity id, status).
 */
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
    // Never let weak "Other(s)" / blank overwrite a stronger report value.
    if (isBlankMergeValue(next) && !isBlankMergeValue(prev)) return;
    out[key] = next;
  });
  return out;
}

/**
 * Enrich pending-bucket tasks with full MIS rows.
 * Path: pending/{ActivityId} → GET /{instanceId}/{activityInstanceId} only.
 * Keep concurrency low — Kissflow returns 429 when many instance calls fire at once.
 */
async function enrichPendingItemsByRequestId(kfInstance, pendingItems = [], reportFilters = {}) {
  const list = Array.isArray(pendingItems) ? pendingItems : [];
  if (!list.length) return [];
  const enriched = await mapPool(list, 3, async (task) => {
    const reportItem = await fetchMisEnrichmentItem(kfInstance, task, reportFilters);
    if (!reportItem) return task;
    // Instance is the MIS source of truth; pending only overlays live workflow keys.
    return mergePreferFilled(reportItem, task);
  });
  return enriched;
}

function reportItemHasFilledCol(item, colId) {
  if (!colId) return true;
  return !isBlankMergeValue(item?.[colId] ?? item?.Data?.[colId] ?? item?.data?.[colId]);
}

/**
 * Hydrate sparse MIS only when we already have an activity instance id.
 * Skip bare /{instanceId} and $request_id (404 / empty / 429 storms).
 */
function isSparseMisReportItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (!resolveTaskActivityInstanceId(item)) return false;
  if (hasUsefulMisFields(item)) {
    const nativeCore = !isBlankMergeValue(item?.Category)
      && !isBlankMergeValue(item?.Source)
      && !isBlankMergeValue(item?.Ticket_Type);
    if (nativeCore) return false;
  }
  const requestId = extractRequestIdFromItem(item)
    || resolveDisplayRequestId({ raw: item, id: item?._id }, item?._id);
  const col = getActiveDashboardProfile()?.serviceCol || {};
  const hasCore = reportItemHasFilledCol(item, col.category)
    && reportItemHasFilledCol(item, col.source)
    && reportItemHasFilledCol(item, col.ticketType);
  return !hasCore || !requestId;
}

async function mapPool(items, concurrency, mapper) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];
  const limit = Math.max(1, Math.min(concurrency || 6, list.length));
  const out = new Array(list.length);
  let cursor = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (cursor < list.length) {
      const idx = cursor;
      cursor += 1;
      out[idx] = await mapper(list[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Hydrate sparse MIS rows via process instance + activity instance only.
 */
async function enrichSparseReportItemsByRequestId(
  kfInstance,
  reportItems = [],
  reportFilters = {},
  { force = false, maxItems = 0 } = {},
) {
  const list = Array.isArray(reportItems) ? reportItems : [];
  if (!list.length || !kfInstance?.api) return list;
  const budget = maxItems > 0 ? maxItems : (force ? 40 : 20);
  const sparseIdx = [];
  list.forEach((item, idx) => {
    if (isSparseMisReportItem(item)) sparseIdx.push(idx);
  });
  if (!sparseIdx.length) return list;
  const targetIdx = sparseIdx.slice(0, budget);
  const enrichedSlice = await mapPool(targetIdx, 3, async (idx) => {
    const item = list[idx];
    const reportItem = await fetchMisEnrichmentItem(kfInstance, item, reportFilters);
    if (!reportItem) return item;
    return mergePreferFilled(reportItem, item);
  });
  const out = list.slice();
  targetIdx.forEach((idx, i) => {
    out[idx] = enrichedSlice[i];
  });
  return out;
}

function stampLiveBucketMeta(taskItem, profileId = '') {
  const step = normalizeText(taskItem?._current_step || taskItem?.Current_Step);
  const group = classifyPendingStepName(step, profileId);
  return {
    isLiveBucketPending: true,
    liveBucketStepGroup: group,
    isLiveReopenPending: group === 'reopen' || isReopenStepName(step, profileId),
    isLiveApprovalPending: group === 'approval',
  };
}

function withOptionalSapFilter(filters = {}, extra = {}) {
  const next = { ...extra };
  if (filters.sap === true || String(filters.sap || '').toLowerCase() === 'true') {
    next.sap = true;
  }
  return next;
}

/**
 * Full report once → IndexedDB cache.
 * Later refreshes: $status=InProgress + $modified_at_gt (and Completed delta) merge into cache.
 * Always also pulls `$created_at_gt` = start of local day so My Team Today is not empty.
 * force=true (or filters.fullReload) skips delta and rebuilds the full report cache.
 */
async function fetchAllReportItems(kfInstance, { force = false, filters = {} } = {}) {
  const baseKey = buildRefexReportCacheKey(kfInstance);
  const filterSuffix = buildReportFilterCacheSuffix(filters);
  const persistKey = `${baseKey}|${filterSuffix}`;
  const wantFull = Boolean(force || filters.fullReload);
  const skipEnrich = Boolean(filters.skipEnrich);
  const reportOnlyFullLoad = Boolean(filters.reportOnlyFullLoad);
  const todayCreatedGt = startOfLocalDayKissflowIso(new Date());
  const fetchPages = (pageFilters = {}, maxPages = 30) => fetchAllReportItemsUncached(
    kfInstance,
    REFEX_REPORT_PAGE_SIZE,
    withOptionalSapFilter(filters, pageFilters),
    maxPages,
  );
  // Modified / created pulls stay on one page. A date filter Kissflow ignores
  // must not walk the whole report (that is what made landing and Refresh slow).
  const fetchDeltaPages = (pageFilters = {}) => fetchPages(pageFilters, 1);

  const loadFull = async () => {
    // CEO/Admin oversight — one paginated Main Report walk; no per-ticket instance enrich.
    if (reportOnlyFullLoad) {
      const items = await fetchPages({
        entity: filters.entity || '',
      });
      const lastSyncAt = toKissflowUtcIso(new Date());
      await setPersistentReportCache(persistKey, { items, lastSyncAt });
      return items;
    }
    // Full walk + explicit Today/recent pulls. Main report index often lags brand-new
    // email tickets; `$created_at_gt` / recent InProgress catch My Team Today.
    const recentGt = toKissflowUtcIso(new Date(Date.now() - 3 * 60 * 60 * 1000));
    const [items, todayItems, recentInProgress, recentCreated] = await Promise.all([
      fetchPages({
        entity: filters.entity || '',
      }),
      todayCreatedGt
        ? fetchPages({
          entity: filters.entity || '',
          createdAtGt: todayCreatedGt,
        }).catch((err) => {
          console.warn('Full today-created report failed:', err?.message || err);
          return [];
        })
        : Promise.resolve([]),
      recentGt
        ? fetchPages({
          entity: filters.entity || '',
          status: 'InProgress',
          modifiedAtGt: recentGt,
        }).catch((err) => {
          console.warn('Full recent InProgress report failed:', err?.message || err);
          return [];
        })
        : Promise.resolve([]),
      recentGt
        ? fetchPages({
          entity: filters.entity || '',
          createdAtGt: recentGt,
        }).catch((err) => {
          console.warn('Full recent created report failed:', err?.message || err);
          return [];
        })
        : Promise.resolve([]),
    ]);
    const merged = mergeReportItemsById(items, todayItems, recentInProgress, recentCreated);
    const enriched = skipEnrich
      ? merged
      : await enrichSparseReportItemsByRequestId(
        kfInstance,
        merged,
        filters,
        { force: true, maxItems: 80 },
      );
    const lastSyncAt = toKissflowUtcIso(new Date());
    await setPersistentReportCache(persistKey, { items: enriched, lastSyncAt });
    return enriched;
  };

  if (wantFull) {
    await clearPersistentReportCache(persistKey);
    return fetchRefexReportItemsCached(
      kfInstance,
      loadFull,
      { force: true },
    );
  }

  const persisted = await getPersistentReportCache(persistKey);
  if (persisted?.items?.length && persisted.lastSyncAt) {
    try {
      const since = overlapKissflowSyncIso(persisted.lastSyncAt);
      const [inProgressDelta, completedDelta, rejectedDelta, draftDelta, createdDelta, todayCreatedDelta] = await Promise.all([
        fetchDeltaPages({
          entity: filters.entity || '',
          status: 'InProgress',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('InProgress delta report failed:', err?.message || err);
          return [];
        }),
        fetchDeltaPages({
          entity: filters.entity || '',
          status: 'Completed',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('Completed delta report failed:', err?.message || err);
          return [];
        }),
        // Rejected by Manager/Head — keep cache in sync for Rejected KPI.
        fetchDeltaPages({
          entity: filters.entity || '',
          status: 'Rejected',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('Rejected delta report failed:', err?.message || err);
          return [];
        }),
        // Email channel can land as Draft before first submit.
        fetchDeltaPages({
          entity: filters.entity || '',
          status: 'Draft',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('Draft delta report failed:', err?.message || err);
          return [];
        }),
        // Brand-new tickets (email) can miss $modified_at_gt when the report indexes late.
        fetchDeltaPages({
          entity: filters.entity || '',
          createdAtGt: since,
        }).catch((err) => {
          console.warn('Created-at delta report failed:', err?.message || err);
          return [];
        }),
        // My Team Today — always re-pull everything created since local midnight.
        todayCreatedGt
          ? fetchDeltaPages({
            entity: filters.entity || '',
            createdAtGt: todayCreatedGt,
          }).catch((err) => {
            console.warn('Today created report failed:', err?.message || err);
            return [];
          })
          : Promise.resolve([]),
      ]);
      const deltaMerged = mergeReportItemsById(
        [],
        inProgressDelta,
        completedDelta,
        rejectedDelta,
        draftDelta,
        createdDelta,
        todayCreatedDelta,
      );
      const enrichedDelta = skipEnrich
        ? deltaMerged
        : await enrichSparseReportItemsByRequestId(
          kfInstance,
          deltaMerged,
          filters,
          { force: false, maxItems: 80 },
        );
      const merged = mergeReportItemsById(
        persisted.items,
        enrichedDelta,
      );
      // Also backfill sparse rows already in cache (email tickets with blank MIS).
      const sparseBackfill = skipEnrich
        ? []
        : await enrichSparseReportItemsByRequestId(
          kfInstance,
          merged.filter(isSparseMisReportItem).slice(0, 40),
          filters,
          { force: false, maxItems: 40 },
        );
      const finalMerged = mergeReportItemsById(merged, sparseBackfill);
      const lastSyncAt = toKissflowUtcIso(new Date());
      await setPersistentReportCache(persistKey, { items: finalMerged, lastSyncAt });
      return finalMerged;
    } catch (err) {
      console.warn('Report delta merge failed — falling back to full:', err?.message || err);
    }
  }

  return fetchRefexReportItemsCached(
    kfInstance,
    loadFull,
    { force: true },
  );
}

/**
 * Landing seed APIs — pending/activity/count by StepName + $request_id enrich.
 * Does not scan the full report for Me.
 */
async function fetchTechSupportLandingTaskItemsUncached(kfInstance) {
  if (!kfInstance?.api) return [];
  const [pending, sdkItems] = await Promise.all([
    fetchAccessiblePendingItemsCached(
      kfInstance,
      REFEX_REPORT_PAGE_SIZE,
      null,
      getMeBucketStepPatterns('agent'),
    ).catch((err) => {
      console.warn('pending/activity/count landing failed:', err?.message || err);
      return { items: [] };
    }),
    fetchRefexSdkMyTaskItems(kfInstance).catch((err) => {
      console.warn('getMyTasksItems landing failed:', err?.message || err);
      return [];
    }),
  ]);
  const items = mergeRawItems(pending.items || [], sdkItems).filter(isRefexServiceMyTaskItem);
  // Landing seed: map pending + SDK my-tasks immediately. Skip $request_id enrich.
  return items;
}

/**
 * Full my-task APIs — pending bucket by StepName (Open work + Reopen).
 */
async function fetchTechSupportTaskItemsUncached(kfInstance) {
  if (!kfInstance?.api) return [];
  const [accessiblePending, sdkItems] = await Promise.all([
    fetchAccessiblePendingItemsCached(
      kfInstance,
      REFEX_REPORT_PAGE_SIZE,
      null,
      getMeBucketStepPatterns('agent'),
    ).catch((err) => {
      console.warn('pending/activity/count task fetch failed:', err?.message || err);
      return { items: [] };
    }),
    fetchRefexSdkMyTaskItems(kfInstance).catch((err) => {
      console.warn('getMyTasksItems task fetch failed:', err?.message || err);
      return [];
    }),
  ]);
  const items = mergeRawItems(accessiblePending.items || [], sdkItems).filter(isRefexServiceMyTaskItem);
  // Keep live `_current_step` from pending/myitems. Instance enrich overwrites
  // blank pending steps and undercounts Open / My Tickets / Closed.
  return items;
}

const ACCESSIBLE_PENDING_TTL_MS = 15000;
/** @type {{ key: string, at: number, promise: Promise<any>|null }} */
let accessiblePendingCache = { key: '', at: 0, promise: null };

function fetchAccessiblePendingItemsCached(kfInstance, pageSize, allowedIds, stepPatterns = null) {
  const key = [
    resolveAccountId(kfInstance) || '',
    pageSize,
    (allowedIds || []).join(','),
    (stepPatterns || []).join(','),
  ].join('|');
  const now = Date.now();
  if (
    accessiblePendingCache.promise
    && accessiblePendingCache.key === key
    && (now - accessiblePendingCache.at) < ACCESSIBLE_PENDING_TTL_MS
  ) {
    return accessiblePendingCache.promise;
  }
  const promise = fetchAccessiblePendingItems(kfInstance, pageSize, allowedIds, stepPatterns);
  accessiblePendingCache = { key, at: now, promise };
  return promise;
}

const TASK_ITEMS_TTL_MS = 15000;
/** @type {{ key: string, at: number, promise: Promise<any[]>|null }} */
let taskItemsCache = { key: '', at: 0, promise: null };
/** @type {{ key: string, at: number, promise: Promise<any[]>|null }} */
let landingTaskItemsCache = { key: '', at: 0, promise: null };

/** Drop pending/my-task TTL caches so force Refresh always hits Kissflow. */
export function clearRefexPendingTaskCaches() {
  accessiblePendingCache = { key: '', at: 0, promise: null };
  taskItemsCache = { key: '', at: 0, promise: null };
  landingTaskItemsCache = { key: '', at: 0, promise: null };
}

/** Fast landing seed — inprogress + SDK only. */
export function fetchTechSupportLandingTaskItems(kfInstance, { force = false } = {}) {
  if (!kfInstance?.api) return Promise.resolve([]);
  const key = `${resolveAccountId(kfInstance) || ''}|landing`;
  const now = Date.now();
  const cache = landingTaskItemsCache;
  if (!force && cache.promise && cache.key === key && (now - cache.at) < TASK_ITEMS_TTL_MS) {
    return cache.promise;
  }
  const promise = fetchTechSupportLandingTaskItemsUncached(kfInstance);
  landingTaskItemsCache = { key, at: now, promise };
  return promise;
}

/**
 * Coalesces seed + background full-dataset task fetches into one network round
 * (same pattern as fetchEmployeeTaskItems).
 */
export function fetchTechSupportTaskItems(kfInstance, { force = false } = {}) {
  if (!kfInstance?.api) return Promise.resolve([]);
  const key = `${resolveAccountId(kfInstance) || ''}|${(getAgentWorkActivityIds() || []).join(',')}`;
  const now = Date.now();
  const cache = taskItemsCache;
  if (!force && cache.promise && cache.key === key && (now - cache.at) < TASK_ITEMS_TTL_MS) {
    return cache.promise;
  }
  const promise = fetchTechSupportTaskItemsUncached(kfInstance);
  taskItemsCache = { key, at: now, promise };
  return promise;
}

/**
 * Participated items for signed-in user — Kissflow pattern:
 * 1) GET .../participated/activity/count  → activities + Count
 * 2) GET .../participated/activity/{activityId}?page_number=… for each Count > 0
 * Uses relative SDK paths (prod/dev host comes from Kissflow embed — no development- prefix).
 */
async function fetchParticipatedItems(kfInstance, pageSize = 100) {
  if (!kfInstance?.api) return [];
  const paths = buildProcessPaths(kfInstance);

  let activityCounts = [];
  try {
    const countResp = await kfGetJson(kfInstance, paths.participatedActivityCountPath());
    activityCounts = Array.isArray(countResp)
      ? countResp
      : (Array.isArray(countResp?.Data) ? countResp.Data : []);
  } catch (err) {
    console.warn('Refex participated/activity/count unavailable:', err?.message || err);
    return [];
  }

  const activityIds = activityCounts
    .filter((row) => Number(row?.Count) > 0 && normalizeText(row?._id))
    .map((row) => normalizeText(row._id));

  if (!activityIds.length) return [];

  const batches = await Promise.all(activityIds.map(async (activityId) => {
    const collected = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 30) {
      try {
        const resp = await kfGetJson(
          kfInstance,
          paths.participatedAtActivityPath(activityId, page, pageSize),
        );
        const items = extractItemsFromResponse(resp);
        collected.push(...items);
        hasMore = items.length >= pageSize;
        page += 1;
      } catch (err) {
        console.warn(
          `Refex participated/activity/${activityId} page ${page} failed:`,
          err?.message || err,
        );
        break;
      }
    }
    return collected;
  }));

  return batches.flat();
}

async function fetchParticipatedAndCompleted(kfInstance) {
  if (!kfInstance?.api) return { completed: [], participated: [] };
  const paths = buildProcessPaths(kfInstance);

  const [completedResult, participatedResult] = await Promise.all([
    kfGetJson(kfInstance, paths.myItemsPath('completed', 1, 500))
      .then((resp) => extractItemsFromResponse(resp))
      .catch((err) => {
        console.warn('Refex tech support completed failed:', err?.message || err);
        return [];
      }),
    fetchParticipatedItems(kfInstance),
  ]);

  return { completed: completedResult, participated: participatedResult };
}

/** Signed-in user's Kissflow completed queue — Me Closed source (not participated history). */
async function fetchCompletedMyItems(kfInstance) {
  if (!kfInstance?.api) return [];
  const paths = buildProcessPaths(kfInstance);
  try {
    const resp = await kfGetJson(kfInstance, paths.myItemsPath('completed', 1, 500));
    return extractItemsFromResponse(resp);
  } catch (err) {
    console.warn('Agent completed myitems failed:', err?.message || err);
    return [];
  }
}

/** Mark rows the signed-in user participated in (Me scope / Closed / Rejected). */
function stampParticipatedRows(rows, participatedIds) {
  if (!(participatedIds instanceof Set) || !participatedIds.size) return rows || [];
  return (rows || []).map((row) => (
    participatedIds.has(row?.id)
      ? { ...row, isParticipatedByUser: true }
      : row
  ));
}


function getServiceReopenActivityIds() {
  const profile = getActiveDashboardProfile();
  const ids = [];
  const push = (id) => {
    const token = normalizeText(id);
    if (token && !ids.includes(token)) ids.push(token);
  };
  push(profile?.itTechReopenActivityId);
  push(profile?.employeeFeedbackActivityId);
  push(profile?.employeeFeedbackActivityIdLegacy);
  if (profile?.id === 'extrovis') {
    push(EXTROVIS_EMPLOYEE_FEEDBACK_ACTIVITY_ID);
  } else {
    push(REFEX_IT_TECH_REOPEN_ACTIVITY_ID);
  }
  return ids;
}

function isReopenPendingItem(item) {
  const step = normalizeText(item?._current_step || item?.Current_Step);
  if (isReopenStepName(step, getActiveDashboardProfile()?.id || '')) return true;
  const act = normalizeText(item?._activity_id || item?.Activity_ID || item?.activity_id);
  // Fallback: activity id from profile (count may have stamped _activity_id only).
  const profile = getActiveDashboardProfile();
  const reopenIds = [
    profile?.employeeFeedbackActivityId,
    profile?.itTechReopenActivityId,
    profile?.employeeFeedbackActivityIdLegacy,
  ].filter(Boolean);
  return Boolean(act && reopenIds.includes(act));
}

function collectReopenPendingIds(items = []) {
  return collectInstanceIdSet((items || []).filter(isReopenPendingItem));
}

/** Live IT Tech Reopen / ReOpen Window pending — StepName from activity count. */
async function fetchServiceReopenPendingItems(kfInstance) {
  if (!kfInstance?.api) return { items: [], authoritative: false };
  return fetchAccessiblePendingItemsCached(
    kfInstance,
    REFEX_REPORT_PAGE_SIZE,
    null,
    getReopenStepPatterns(),
  );
}

function getServiceApprovalActivityIds() {
  const profile = getActiveDashboardProfile();
  const profileIds = profile?.serviceApprovalActivityIds || {};
  // Extrovis service flow has no L1/L2/IT Manager/IT Head approval steps —
  // never fall back to Refex activity ids on the Extrovis process (empty pending).
  // Use PickUp as the monitoring "Agent Pending" pool when no explicit ids exist.
  if (profile?.id === 'extrovis') {
    const explicit = [profileIds.l1, profileIds.l2, profileIds.itManager, profileIds.itHead].filter(Boolean);
    if (explicit.length) return explicit;
    const pickupId = profile?.agentPendingActivityId || profile?.agentWorkActivityIds?.[0];
    return pickupId ? [pickupId] : [];
  }
  return [
    profileIds.l1 || REFEX_L1_APPROVAL_ACTIVITY_ID,
    profileIds.l2 || REFEX_L2_APPROVAL_ACTIVITY_ID,
    profileIds.itManager || REFEX_IT_MANAGER_APPROVAL_ACTIVITY_ID,
    profileIds.itHead || REFEX_IT_HEAD_APPROVAL_ACTIVITY_ID,
  ].filter(Boolean);
}

/** Pending tickets at L1 / L2 / IT Manager / IT Head approval steps (all pages). */
async function fetchPendingItemsAtActivity(kfInstance, activityId, pageSize = REFEX_REPORT_PAGE_SIZE) {
  if (!kfInstance?.api || !activityId) return [];
  const paths = buildProcessPaths(kfInstance);
  const collected = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 30) {
    try {
      const resp = await kfGetJson(
        kfInstance,
        paths.pendingAtStepPath(activityId, page, pageSize),
      );
      const items = extractItemsFromResponse(resp);
      collected.push(...items);
      hasMore = items.length >= pageSize;
      page += 1;
    } catch (err) {
      console.warn(`Refex approval pending/${activityId} page ${page} failed:`, err?.message || err);
      break;
    }
  }
  return collected;
}

function parsePendingActivityCountRows(countResp) {
  return parsePendingActivityCountEntries(countResp).map((row) => row.id);
}

/**
 * Resolve pending activity ids from count API by StepName (never hardcode Activity_*).
 * @param {any} countResp
 * @param {string[]} stepPatterns
 * @returns {string[]}
 */
function resolvePendingActivityIdsFromCount(countResp, stepPatterns = []) {
  const entries = parsePendingActivityCountEntries(countResp);
  return resolveActivityIdsByStepNames(entries, stepPatterns);
}

function getMeBucketStepPatterns(role = 'agent') {
  const profile = getActiveDashboardProfile();
  return collectStepPatternsForMeBucket(profile?.id || 'refex', { role });
}

function getReopenStepPatterns() {
  const groups = getPendingStepGroups(getActiveDashboardProfile()?.id || 'refex');
  return groups.reopen || [];
}

function getApprovalStepPatterns(role = 'first') {
  const groups = getPendingStepGroups(getActiveDashboardProfile()?.id || 'refex');
  if (role === 'final') return groups.approvalHead || [];
  if (role === 'first') return groups.approvalManager || [];
  return [
    ...(groups.approvalL1 || []),
    ...(groups.approvalL2 || []),
    ...(groups.approvalManager || []),
    ...(groups.approvalHead || []),
  ];
}

function getOpenWorkStepPatterns() {
  const profile = getActiveDashboardProfile();
  const groups = getPendingStepGroups(profile?.id || 'refex');
  return [
    ...(groups.open || []),
    ...(groups.myTickets || []),
  ];
}

function getPendingCountFallbackActivityIds() {
  // Fallback only when count API fails — prefer profile ids, never invent new ones.
  const profile = getActiveDashboardProfile();
  const ids = [...(profile?.agentWorkActivityIds || getAgentWorkActivityIds())];
  if (profile?.id !== 'extrovis') {
    getServiceApprovalActivityIds().forEach((id) => {
      if (id && !ids.includes(id)) ids.push(id);
    });
  }
  return ids;
}

/**
 * Kissflow pending is activity-scoped:
 * 1) GET .../pending/activity/count?apply_preference=true
 * 2) Match StepName → take `_id` from count rows
 * 3) GET .../pending/{activityId} for each matched id with Count > 0
 * Falls back to profile activity ids only if count fails.
 * @returns {{ items: any[], activityIds: string[], authoritative: boolean, countEntries: any[] }}
 */
async function fetchAccessiblePendingItems(
  kfInstance,
  pageSize = REFEX_REPORT_PAGE_SIZE,
  allowedIds = null,
  stepPatterns = null,
) {
  if (!kfInstance?.api) {
    return { items: [], activityIds: [], authoritative: false, countEntries: [] };
  }
  const paths = buildProcessPaths(kfInstance);
  const patterns = Array.isArray(stepPatterns) && stepPatterns.length
    ? stepPatterns
    : null;
  const allowed = Array.isArray(allowedIds) && allowedIds.length
    ? new Set(allowedIds.filter(Boolean))
    : null;

  let activityIds = [];
  let countEntries = [];
  let countOk = false;
  try {
    const countResp = await kfGetJson(kfInstance, paths.pendingActivityCountPath());
    countEntries = parsePendingActivityCountEntries(countResp);
    countOk = true;
    if (patterns) {
      activityIds = resolveActivityIdsByStepNames(countEntries, patterns);
      if (!activityIds.length) {
        activityIds = getPendingCountFallbackActivityIds();
      }
    } else {
      activityIds = countEntries.map((entry) => entry.id);
      if (allowed) activityIds = activityIds.filter((id) => allowed.has(id));
    }
  } catch (err) {
    console.warn('pending/activity/count failed:', err?.message || err);
    if (allowed) activityIds = [...allowed];
    else if (patterns) activityIds = getPendingCountFallbackActivityIds();
    else activityIds = getPendingCountFallbackActivityIds();
  }
  let anyOk = false;
  let pendingItems = [];
  if (activityIds.length) {
    const stepByActivity = new Map(
      (countEntries || []).map((entry) => [entry.id, entry.stepName]),
    );
    const batches = await Promise.all(activityIds.map(async (activityId) => {
      try {
        const items = await fetchPendingItemsAtActivity(kfInstance, activityId, pageSize);
        anyOk = true;
        return stampPendingItemsWithStepName(
          items,
          activityId,
          stepByActivity.get(activityId) || '',
        );
      } catch (err) {
        console.warn(`pending/${activityId} failed:`, err?.message || err);
        return [];
      }
    }));
    pendingItems = batches.flat();
  }

  // pending/activity/count omits group-assigned PickUp (IT Agents Extrovis).
  // myitems/inprogress still lists those tickets with the live step.
  let myItems = [];
  try {
    myItems = await fetchMyItemsInProgressPages(kfInstance, pageSize);
  } catch (err) {
    console.warn('myitems/inprogress pending merge failed:', err?.message || err);
  }
  if (patterns) {
    myItems = myItems.filter((item) => {
      const step = item?._current_step || item?.Current_Step;
      if (!step) return true;
      return stepNameMatchesAny(step, patterns);
    });
  }
  const items = mergeRawItems(pendingItems, myItems);
  return {
    items,
    activityIds,
    authoritative: countOk || anyOk || items.length > 0,
    countEntries,
  };
}

function isExtrovisFetchProfile() {
  return getActiveDashboardProfile()?.id === 'extrovis';
}

/**
 * Pending tickets at L1 / L2 / IT Manager / IT Head approval steps.
 * Extrovis: pending/activity/count → pending/{PickUp|Solution|ReOpen Window|…}.
 * @returns {{ items: any[], authoritative: boolean }}
 * authoritative=true when at least one pending/{activity} call succeeded
 * (empty items still means the live queue is empty — drop stale report rows).
 */
async function fetchServiceApprovalPendingItems(kfInstance) {
  if (!kfInstance?.api) return { items: [], authoritative: false };
  if (isExtrovisFetchProfile()) {
    const accessible = await fetchAccessiblePendingItemsCached(
      kfInstance,
      REFEX_REPORT_PAGE_SIZE,
      null,
      getOpenWorkStepPatterns(),
    );
    // Extrovis has no L1/L2 approval queue — do not stamp liveApprovalPendingKnown.
    return { items: accessible.items || [], authoritative: false };
  }
  const accessible = await fetchAccessiblePendingItemsCached(
    kfInstance,
    REFEX_REPORT_PAGE_SIZE,
    null,
    getApprovalStepPatterns('monitoring'),
  );
  return { items: accessible.items || [], authoritative: accessible.authoritative };
}

function collectInstanceIdSet(items = []) {
  const ids = new Set();
  (items || []).forEach((item) => {
    const id = normalizeText(item?._id || item?.Instance_ID || item?.id);
    if (id) ids.add(id);
  });
  return ids;
}

/**
 * Removed: `$assigned_to` on Service_Items_Refex_A00 returns 0 rows and was
 * incorrectly fired on Refresh. My Team uses IndexedDB + $modified_at_gt /
 * $status=InProgress|Completed deltas via fetchAllReportItems.
 */

function scoreTaskItem(item, user = null) {
  let score = 0;
  const status = normalizeText(item?._status || item?.Status).toLowerCase();
  if (status === 'inprogress') score += 4;
  if (status === 'pending') score += 2;
  if (user) {
  const assigned = item?._current_assigned_to;
  const assignedList = normalizeAssigneeList(assigned);
  if (isAssignedToUser(assignedList, user)) score += 8;
  }
  const step = normalizeText(item?._current_step || item?.Current_Step).toLowerCase();
  if (step.includes('tech support after dependency')) score += 3;
  if (step.includes('dependency assigne')) score += 3;
  if (step.includes('it agent solution') || step.includes('it tech support')) score += 4;
  if (step.includes('reopen window') || step.includes('it tech reopen')) score += 3;
  if (
    step.includes('it agent pickup')
    || step.includes('it agent pick up')
    || step.includes('it tech pickup')
    || step.includes('it tech pick up')
  ) score += 2;
  return score;
}

function indexTasksByInstanceId(taskItems = [], user = null) {
  const map = new Map();
  taskItems.forEach((item) => {
    const id = normalizeText(item?._id || item?.Instance_ID);
    if (!id) return;
    const existing = map.get(id);
    if (!existing) {
      map.set(id, item);
      return;
    }
    if (scoreTaskItem(item, user) > scoreTaskItem(existing, user)) {
      map.set(id, item);
    }
  });
  return map;
}

function indexByInstanceId(items = []) {
  const map = new Map();
  items.forEach((item) => {
    const id = normalizeText(item?._id || item?.Instance_ID);
    if (id) map.set(id, item);
  });
  return map;
}

function mergeRawItems(...lists) {
  const map = new Map();
  lists.flat().forEach((item) => {
    const id = normalizeText(item?._id || item?.Instance_ID);
    if (!id) return;
    const prev = map.get(id);
    map.set(id, prev ? mergePreferFilled(prev, item) : item);
  });
  return [...map.values()];
}

/**
 * @param {Set<string>|null} [liveApprovalPendingIds]
 *   When set, Pending Approval uses live pending/{activity} membership as truth
 *   so approved/rejected tickets leave the list even if Main Report step is stale.
 */
function mapMergedRows(mergedRaw, completedById, taskById, user, {
  liveApprovalPendingIds = null,
  liveReopenPendingIds = null,
  participatedIds = null,
  liveBucketPendingIds = null,
} = {}) {
  const liveKnown = liveApprovalPendingIds instanceof Set;
  const reopenKnown = liveReopenPendingIds instanceof Set;
  const bucketKnown = liveBucketPendingIds instanceof Set;
  const profileId = getActiveDashboardProfile()?.id || '';
  const rows = mergedRaw
    .map((item) => mapRefexEmployeeRow(item))
    .map((row) => enrichEmployeeRowCompletion(row, completedById))
    .map((row) => {
      const task = taskById.get(row.id);
      // Do not overlay a live approval task when Kissflow already removed it from pending.
      const skipStaleApprovalTask = liveKnown
        && task
        && !liveApprovalPendingIds.has(row.id)
        && (() => {
          const step = normalizeText(task?._current_step || task?.Current_Step).toLowerCase();
          return step.includes('approval') || step.includes('l1') || step.includes('l2')
            || step.includes('it manager') || step.includes('it head');
        })();
      const merged = skipStaleApprovalTask
        ? row
        : mergeTechSupportRowWithTask(row, task, user);
      const bucketMeta = task ? stampLiveBucketMeta(task, profileId) : null;
      const next = {
        ...merged,
        ...(bucketMeta || {}),
        ...(liveKnown ? {
          liveApprovalPendingKnown: true,
          isLiveApprovalPending: liveApprovalPendingIds.has(row.id),
        } : {}),
        ...(reopenKnown ? {
          liveReopenPendingKnown: true,
          isLiveReopenPending: liveReopenPendingIds.has(row.id),
        } : {}),
        ...(bucketKnown ? {
          isLiveBucketPending: liveBucketPendingIds.has(row.id) || Boolean(bucketMeta?.isLiveBucketPending),
        } : {}),
      };
      return next;
    });

  const ordered = sortDashboardRowsByTicketOrder(dedupeEmployeeRows(rows), 'asc') || [];
  // Participated stamps are no longer used for Me Closed / Me scope.
  void participatedIds;
  return ordered;
}

/**
 * Admin Get All Items as the canonical dataset for faster landing.
 * Me live stamps come from `_current_assigned_to` AppRole id when `roleId` is set.
 * Oversight (Admin / CEO) skips Me stamps so Open/Closed stay report-wide.
 * Closed By / KPI matchers stay unchanged. Falls through to the caller on error.
 */
export async function fetchRefexAdminCanonicalTickets(kfInstance, user = null, {
  roleId = '',
  oversight = false,
} = {}) {
  const processId = getActiveServiceProcessId();
  const items = await fetchAllAdminProcessItems(kfInstance, processId);
  if (oversight || !roleId) {
    return mapMergedRows(mergeRawItems(items), new Map(), new Map(), user, {});
  }
  const liveBucketPendingIds = collectHeadLiveAssignmentIds(items, roleId);
  const liveApprovalPendingIds = new Set();
  const liveReopenPendingIds = new Set();
  items.forEach((item) => {
    const id = String(item?._id || item?.Id || '').trim();
    if (!id || !liveBucketPendingIds.has(id)) return;
    const step = item?._current_step || item?.Current_Step || '';
    const kind = classifyPendingStepName(step, getActiveDashboardProfile()?.id === 'extrovis' ? 'extrovis' : 'refex');
    if (kind === 'approval') liveApprovalPendingIds.add(id);
    if (kind === 'reopen') liveReopenPendingIds.add(id);
  });
  return mapMergedRows(mergeRawItems(items), new Map(), new Map(), user, {
    liveApprovalPendingIds,
    liveReopenPendingIds,
    liveBucketPendingIds,
  });
}

/**
 * IT Head Refex — Admin Get All Items + Head AppRole Me stamps.
 */
export async function fetchRefexHeadAdminCanonicalTickets(kfInstance, user = null) {
  const roleId = getActiveDashboardProfile()?.itHeadAppRoleId || REFEX_IT_HEAD_APPROLE_ID;
  return fetchRefexAdminCanonicalTickets(kfInstance, user, { roleId });
}

/**
 * Fast landing seed — pending bucket by StepName only (no $request_id enrich).
 */
export async function fetchRefexTechSupportMyTaskSeed(kfInstance, user = null, { force = false } = {}) {
  const taskItems = await fetchTechSupportLandingTaskItems(kfInstance, { force });
  const taskById = indexTasksByInstanceId(taskItems, user);
  const mergedRaw = mergeRawItems(taskItems);
  const liveBucketPendingIds = collectInstanceIdSet(taskItems);
  const liveReopenPendingIds = collectReopenPendingIds(taskItems);
  return mapMergedRows(mergedRaw, new Map(), taskById, user, {
    liveBucketPendingIds,
    liveReopenPendingIds,
  });
}

function cloneMappedRowsForCache(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  try {
    return JSON.parse(JSON.stringify(rows));
  } catch (err) {
    console.warn('Agent mapped cache clone failed:', err?.message || err);
    return [];
  }
}

export function buildAgentTechSupportPersistKey(kfInstance, user = null, reportFilters = {}) {
  const baseKey = buildRefexReportCacheKey(kfInstance);
  const filterSuffix = buildReportFilterCacheSuffix(reportFilters);
  const userId = String(user?._id || user?.Id || user?.Email || 'anon').trim();
  return `${baseKey}|techSupportMapped|${userId}|${filterSuffix}`;
}

export async function persistAgentTechSupportMappedRows(kfInstance, user, reportFilters, rows) {
  const incoming = cloneMappedRowsForCache(rows);
  if (!incoming.length) return false;
  try {
    const persistKey = buildAgentTechSupportPersistKey(kfInstance, user, reportFilters);
    const previous = await getPersistentReportCache(persistKey);
    const items = cloneMappedRowsForCache(retainCachedClosedRows(previous?.items, incoming));
    if (!items.length) return false;
    return await setPersistentReportCache(persistKey, {
      items,
      lastSyncAt: toKissflowUtcIso(new Date()),
    });
  } catch (err) {
    console.warn('Agent Closed cache persist failed:', err?.message || err);
    return false;
  }
}

/**
 * Instant paint from IndexedDB (previous session mapped rows, including Me Closed).
 * Local only — pair with My Task seed for live pending accuracy.
 */
export async function hydrateRefexTechSupportFromPersistentCache(
  kfInstance,
  user = null,
  reportFilters = {},
) {
  if (!kfInstance) return null;
  try {
    const persisted = await getPersistentReportCache(
      buildAgentTechSupportPersistKey(kfInstance, user, reportFilters),
    );
    if (!persisted?.items?.length) return null;
    const usable = persisted.items.some((row) => (
      row?.isLiveBucketPending
      || row?.completedItem
      || row?.techSupportMyTaskItem
      || row?.isProcessCompleted === true
    ));
    if (!usable) return null;
    return persisted.items;
  } catch (err) {
    console.warn('Agent Closed cache hydrate failed:', err?.message || err);
    return null;
  }
}

/**
 * When the latest fetch is pending-only (completed queue empty/failed), keep
 * prior Closed rows whose ids are not in the new set. Same-id live rows win.
 */
export function retainCachedClosedRows(previous = [], next = []) {
  const nextRows = Array.isArray(next) ? next : [];
  const prevRows = Array.isArray(previous) ? previous : [];
  if (!prevRows.length) return nextRows;
  const nextIds = new Set(nextRows.map((row) => row?.id).filter(Boolean));
  const retained = prevRows.filter((row) => {
    if (!row?.id || nextIds.has(row.id)) return false;
    return Boolean(row.completedItem)
      || row.isProcessCompleted === true
      || String(row.status || '').toLowerCase() === 'completed';
  });
  if (!retained.length) return nextRows;
  return nextRows.concat(retained);
}

/**
 * Keep cached Closed / completedItem rows, overlay live pending seed so
 * reopen and My Task stay current without dropping Closed on landing.
 */
export function mergeTechSupportLandingRows(hydrated = [], seedRows = []) {
  const cached = Array.isArray(hydrated) ? hydrated : [];
  const live = Array.isArray(seedRows) ? seedRows : [];
  if (!cached.length) return live;
  if (!live.length) return cached;

  const byId = new Map();
  cached.forEach((row) => {
    if (row?.id) byId.set(row.id, row);
  });
  live.forEach((seed) => {
    if (!seed?.id) return;
    const prev = byId.get(seed.id);
    if (!prev) {
      byId.set(seed.id, seed);
      return;
    }
    byId.set(seed.id, {
      ...prev,
      ...seed,
      completedItem: prev.completedItem || seed.completedItem,
      itAgentActivities: (Array.isArray(seed.itAgentActivities) && seed.itAgentActivities.length)
        ? seed.itAgentActivities
        : prev.itAgentActivities,
      techSupportMyTaskItem: seed.techSupportMyTaskItem || prev.techSupportMyTaskItem,
      techSupportTaskActivityInstanceId:
        seed.techSupportTaskActivityInstanceId || prev.techSupportTaskActivityInstanceId,
      isLiveBucketPending: seed.isLiveBucketPending ?? prev.isLiveBucketPending,
      isLiveReopenPending: seed.isLiveReopenPending ?? prev.isLiveReopenPending,
      raw: prev.raw && seed.raw ? { ...prev.raw, ...seed.raw } : (seed.raw || prev.raw),
    });
  });
  return Array.from(byId.values());
}

/** Normalized Refex Tech Support service queue dataset for agent dashboards. */
export async function fetchRefexTechSupportTickets(
  kfInstance,
  user = null,
  {
    forceRefresh = false,
    softRefresh = false,
    reportFilters = {},
    useAdminItemDataset = false,
  } = {},
) {
  if (forceRefresh) {
    clearRequestIdReportCache();
    clearRefexPendingTaskCaches();
  }

  const loadReportItems = async ({ force, filters }) => {
    if (useAdminItemDataset) {
      try {
        return await fetchAllAdminProcessItems(kfInstance, getActiveServiceProcessId());
      } catch (err) {
        console.warn('Agent Admin Get All Items failed, falling back to report:', err?.message || err);
      }
    }
    return fetchAllReportItems(kfInstance, { force, filters });
  };

  let rows;
  // Soft refresh — report delta into IndexedDB + live pending bucket merge.
  if (softRefresh && !forceRefresh) {
    const [reportItems, taskItems, completed] = await Promise.all([
      loadReportItems({ force: false, filters: reportFilters }).catch((err) => {
        console.warn('Agent report soft load failed:', err?.message || err);
        return [];
      }),
      fetchTechSupportTaskItems(kfInstance, { force: false }),
      fetchCompletedMyItems(kfInstance).catch(() => []),
    ]);
    const taskById = indexTasksByInstanceId(taskItems, user);
    const liveBucketPendingIds = collectInstanceIdSet(taskItems);
    const liveReopenPendingIds = collectReopenPendingIds(taskItems);
    rows = mapMergedRows(
      mergeRawItems(reportItems, taskItems, completed),
      indexByInstanceId(completed),
      taskById,
      user,
      {
        liveBucketPendingIds,
        liveReopenPendingIds,
      },
    );
  } else {
    // Report + live tasks + myitems/completed. Do not walk participated history —
    // Me Closed is Closed By / solver at IT Agent Solution (Non-Refex) or
    // IT Tech Support (Refex), plus tickets in the user's completed queue.
    const [reportItems, taskItems, completed] = await Promise.all([
      loadReportItems({ force: forceRefresh, filters: reportFilters }).catch((err) => {
        console.warn('Agent report load failed:', err?.message || err);
        return [];
      }),
      fetchTechSupportTaskItems(kfInstance, { force: forceRefresh }),
      fetchCompletedMyItems(kfInstance).catch(() => []),
    ]);

    const taskById = indexTasksByInstanceId(taskItems, user);
    const liveBucketPendingIds = collectInstanceIdSet(taskItems);
    const liveReopenPendingIds = collectReopenPendingIds(taskItems);

    rows = mapMergedRows(
      mergeRawItems(reportItems, taskItems, completed),
      indexByInstanceId(completed),
      taskById,
      user,
      {
        liveBucketPendingIds,
        liveReopenPendingIds,
      },
    );
  }

  await persistAgentTechSupportMappedRows(kfInstance, user, reportFilters, rows);
  return rows;
}

/**
 * CEO / Admin oversight — Main Report (+ entity filter on Extrovis) + live pending pools.
 * No per-ticket instance/$request_id enrich, no myitems/participated walks.
 */
function buildOversightReportFilters(reportFilters = {}) {
  return {
    ...reportFilters,
    skipEnrich: true,
    reportOnlyFullLoad: true,
  };
}

function mapMonitoringOversightRows(
  reportItems,
  approvalPendingResult,
  reopenPendingResult,
  user = null,
) {
  const approvalPending = approvalPendingResult?.items || [];
  const reopenPending = reopenPendingResult?.items || [];
  const liveIds = approvalPendingResult?.authoritative
    ? collectInstanceIdSet(approvalPending)
    : null;
  const liveReopenIds = reopenPendingResult?.authoritative
    ? collectInstanceIdSet(reopenPending)
    : collectReopenPendingIds(reopenPending);
  const liveBucketPendingIds = collectInstanceIdSet([...approvalPending, ...reopenPending]);
  const taskById = indexTasksByInstanceId([...approvalPending, ...reopenPending], user);
  return mapMergedRows(
    mergeRawItems(reportItems, approvalPending, reopenPending),
    new Map(),
    taskById,
    user,
    {
      liveApprovalPendingIds: liveIds,
      liveReopenPendingIds: liveReopenIds.size ? liveReopenIds : null,
      liveBucketPendingIds,
    },
  );
}

/**
 * Monitoring view — all Refex service queue tickets; merges live my-task items when user is provided.
 * softRefresh: report delta + approval pending pools (keeps Pending Approval accurate).
 * oversightMode: CEO/Admin — report + pending pools only (no N+1 instance enrich).
 * @param {{ forceRefresh?: boolean, softRefresh?: boolean, reportFilters?: object, oversightMode?: boolean }} [options]
 */
export async function fetchRefexMonitoringServiceTickets(
  kfInstance,
  user = null,
  { forceRefresh = false, softRefresh = false, reportFilters = {}, oversightMode = false, useAdminItemDataset = false, adminDatasetRoleId = '' } = {},
) {
  if (forceRefresh) {
    clearRequestIdReportCache();
    clearRefexPendingTaskCaches();
  }

  if (useAdminItemDataset) {
    try {
      return await fetchRefexAdminCanonicalTickets(kfInstance, user, {
        roleId: adminDatasetRoleId || '',
        oversight: Boolean(oversightMode) || !adminDatasetRoleId,
      });
    } catch (err) {
      console.warn('Admin Get All Items failed, falling back to report+pending:', err?.message || err);
    }
  }

  if (oversightMode) {
    const oversightFilters = buildOversightReportFilters(reportFilters);
    const [reportItems, approvalPendingResult, reopenPendingResult] = await Promise.all([
      fetchAllReportItems(kfInstance, {
        force: forceRefresh,
        filters: oversightFilters,
      }).catch((err) => {
        console.warn('Oversight report load failed:', err?.message || err);
        return [];
      }),
      fetchServiceApprovalPendingItems(kfInstance),
      fetchServiceReopenPendingItems(kfInstance),
    ]);
    return mapMonitoringOversightRows(
      reportItems,
      approvalPendingResult,
      reopenPendingResult,
      user,
    );
  }
  // Soft refresh — report delta + live pending + completed so My Team Closed
  // is not empty (soft path previously skipped completed/participated).
  if (softRefresh && !forceRefresh) {
    const [reportItems, approvalPendingResult, reopenPendingResult, openWorkPendingResult, { completed, participated }] = await Promise.all([
      fetchAllReportItems(kfInstance, {
        force: false,
        filters: reportFilters,
      }).catch((err) => {
        console.warn('Monitoring soft report load failed:', err?.message || err);
        return [];
      }),
      fetchServiceApprovalPendingItems(kfInstance),
      fetchServiceReopenPendingItems(kfInstance),
      user
        ? fetchAccessiblePendingItemsCached(
          kfInstance,
          REFEX_REPORT_PAGE_SIZE,
          null,
          getOpenWorkStepPatterns(),
        ).catch(() => ({ items: [], authoritative: false }))
        : Promise.resolve({ items: [], authoritative: false }),
      fetchParticipatedAndCompleted(kfInstance).catch(() => ({ completed: [], participated: [] })),
    ]);
    const approvalPending = approvalPendingResult.items || [];
    const reopenPending = reopenPendingResult.items || [];
    const openWorkPending = openWorkPendingResult.items || [];
    const enrichedOpenWork = user
      ? await enrichPendingItemsByRequestId(kfInstance, openWorkPending, reportFilters)
      : openWorkPending;
    const enrichedReopen = user
      ? await enrichPendingItemsByRequestId(kfInstance, reopenPending, reportFilters)
      : reopenPending;
    const enrichedApproval = user
      ? await enrichPendingItemsByRequestId(kfInstance, approvalPending, reportFilters)
      : approvalPending;
    const liveIds = approvalPendingResult.authoritative
      ? collectInstanceIdSet(approvalPending)
      : null;
    const liveReopenIds = reopenPendingResult.authoritative
      ? collectInstanceIdSet(reopenPending)
      : collectReopenPendingIds(reopenPending);
    const liveBucketPendingIds = collectInstanceIdSet([
      ...approvalPending,
      ...reopenPending,
      ...openWorkPending,
    ]);
    const taskById = indexTasksByInstanceId(
      [...enrichedApproval, ...enrichedReopen, ...enrichedOpenWork],
      user,
    );
    const completedById = indexByInstanceId(completed);
    return mapMergedRows(
      mergeRawItems(
        reportItems,
        completed,
        participated,
        enrichedApproval,
        enrichedReopen,
        enrichedOpenWork,
      ),
      completedById,
      taskById,
      user,
      {
        liveApprovalPendingIds: liveIds,
        liveReopenPendingIds: liveReopenIds.size ? liveReopenIds : null,
        liveBucketPendingIds,
        participatedIds: collectInstanceIdSet(participated),
      },
    );
  }

  const [reportItems, taskItems, approvalPendingResult, reopenPendingResult, openWorkPendingResult, { completed, participated }] = await Promise.all([
    fetchAllReportItems(kfInstance, { force: forceRefresh, filters: reportFilters }).catch((err) => {
      console.warn('Monitoring report load failed:', err?.message || err);
      return [];
    }),
    user ? fetchTechSupportTaskItems(kfInstance) : Promise.resolve([]),
    fetchServiceApprovalPendingItems(kfInstance),
    fetchServiceReopenPendingItems(kfInstance),
    user
      ? fetchAccessiblePendingItemsCached(
        kfInstance,
        REFEX_REPORT_PAGE_SIZE,
        null,
        getOpenWorkStepPatterns(),
      ).catch(() => ({ items: [], authoritative: false }))
      : Promise.resolve({ items: [], authoritative: false }),
    fetchParticipatedAndCompleted(kfInstance).catch(() => ({ completed: [], participated: [] })),
  ]);
  const approvalPending = approvalPendingResult.items || [];
  const reopenPending = reopenPendingResult.items || [];
  const openWorkPending = openWorkPendingResult.items || [];
  const enrichedOpenWork = user
    ? await enrichPendingItemsByRequestId(kfInstance, openWorkPending, reportFilters)
    : openWorkPending;
  const enrichedReopen = user
    ? await enrichPendingItemsByRequestId(kfInstance, reopenPending, reportFilters)
    : reopenPending;
  const enrichedApproval = user
    ? await enrichPendingItemsByRequestId(kfInstance, approvalPending, reportFilters)
    : approvalPending;
  const enrichedTasks = user
    ? await enrichPendingItemsByRequestId(kfInstance, taskItems, reportFilters)
    : taskItems;
  const liveIds = approvalPendingResult.authoritative
    ? collectInstanceIdSet(approvalPending)
    : null;
  const liveReopenIds = reopenPendingResult.authoritative
    ? collectInstanceIdSet(reopenPending)
    : collectReopenPendingIds([...enrichedTasks, ...enrichedReopen, ...enrichedApproval]);
  const liveBucketPendingIds = collectInstanceIdSet([
    ...enrichedTasks,
    ...enrichedApproval,
    ...enrichedReopen,
    ...enrichedOpenWork,
  ]);
  const completedById = indexByInstanceId(completed);
  const taskById = indexTasksByInstanceId(
    [...enrichedTasks, ...enrichedApproval, ...enrichedReopen, ...enrichedOpenWork],
    user,
  );
  const mergedRaw = mergeRawItems(
    reportItems,
    completed,
    enrichedApproval,
    enrichedReopen,
    enrichedOpenWork,
    ...(user ? [enrichedTasks] : []),
  );

  return mapMergedRows(mergedRaw, completedById, taskById, user, {
    liveApprovalPendingIds: liveIds,
    liveReopenPendingIds: liveReopenIds.size ? liveReopenIds : null,
    liveBucketPendingIds,
    participatedIds: collectInstanceIdSet(participated),
  });
}

/** Instant paint from IndexedDB + live approval pending (so Pending Approval is not empty on reopen). */
export async function hydrateRefexMonitoringFromPersistentCache(
  kfInstance,
  user = null,
  reportFilters = {},
  { skipEnrich = true, skipPendingFetch = false } = {},
) {
  const baseKey = buildRefexReportCacheKey(kfInstance);
  const filterSuffix = buildReportFilterCacheSuffix(reportFilters);
  const persistKey = `${baseKey}|${filterSuffix}`;
  const persisted = await getPersistentReportCache(persistKey);
  if (!persisted?.items?.length) return null;

  if (skipPendingFetch) {
    return mapMergedRows(persisted.items, new Map(), new Map(), user, {});
  }

  let approvalPending = [];
  let openWorkPending = [];
  let liveIds = null;
  let liveReopenIds = null;
  let liveBucketPendingIds = null;
  try {
    const [approvalPendingResult, reopenPendingResult, openWorkPendingResult] = await Promise.all([
      fetchServiceApprovalPendingItems(kfInstance),
      fetchServiceReopenPendingItems(kfInstance),
      user
        ? fetchAccessiblePendingItemsCached(
          kfInstance,
          REFEX_REPORT_PAGE_SIZE,
          null,
          getOpenWorkStepPatterns(),
        ).catch(() => ({ items: [], authoritative: false }))
        : Promise.resolve({ items: [], authoritative: false }),
    ]);
    approvalPending = approvalPendingResult.items || [];
    const reopenPending = reopenPendingResult.items || [];
    openWorkPending = openWorkPendingResult.items || [];
    const enrichedOpenWork = (user && !skipEnrich)
      ? await enrichPendingItemsByRequestId(kfInstance, openWorkPending, reportFilters)
      : openWorkPending;
    const enrichedReopen = (user && !skipEnrich)
      ? await enrichPendingItemsByRequestId(kfInstance, reopenPending, reportFilters)
      : reopenPending;
    const enrichedApproval = (user && !skipEnrich)
      ? await enrichPendingItemsByRequestId(kfInstance, approvalPending, reportFilters)
      : approvalPending;
    liveIds = approvalPendingResult.authoritative
      ? collectInstanceIdSet(approvalPending)
      : null;
    liveReopenIds = reopenPendingResult.authoritative
      ? collectInstanceIdSet(reopenPending)
      : collectReopenPendingIds(reopenPending);
    liveBucketPendingIds = collectInstanceIdSet([
      ...approvalPending,
      ...reopenPending,
      ...openWorkPending,
    ]);
    approvalPending = [...enrichedApproval, ...enrichedReopen, ...enrichedOpenWork];
  } catch (err) {
    console.warn('Hydrate approval pending failed:', err?.message || err);
  }
  const taskById = indexTasksByInstanceId(approvalPending, user);
  return mapMergedRows(
    mergeRawItems(persisted.items, approvalPending),
    new Map(),
    taskById,
    user,
    {
      liveApprovalPendingIds: liveIds,
      liveReopenPendingIds: liveReopenIds instanceof Set && liveReopenIds.size
        ? liveReopenIds
        : null,
      liveBucketPendingIds,
    },
  );
}

/**
 * Fast monitoring seed when user is present — My Task APIs only.
 * Admin (user=null) has no seed; callers should wait for full report.
 * Prefer fetchRefexApproverMeLandingSeed for Manager/Head Me landing (much lighter).
 */
export async function fetchRefexMonitoringMyTaskSeed(kfInstance, user = null, { force = false } = {}) {
  // Seed includes personal tasks + live approval pending pools so IT Head/Manager
  // My Team → Pending Approval is not empty while the full report loads.
  const [myTaskRows, approvalPendingResult, reopenPendingResult] = await Promise.all([
    user ? fetchRefexTechSupportMyTaskSeed(kfInstance, user, { force }) : Promise.resolve([]),
    fetchServiceApprovalPendingItems(kfInstance),
    fetchServiceReopenPendingItems(kfInstance),
  ]);
  const approvalPending = approvalPendingResult.items || [];
  const reopenPending = reopenPendingResult.items || [];
  const liveIds = approvalPendingResult.authoritative
    ? collectInstanceIdSet(approvalPending)
    : null;
  const liveReopenIds = reopenPendingResult.authoritative
    ? collectInstanceIdSet(reopenPending)
    : null;

  // Stamp live membership on personal seed rows so approved ghosts drop immediately.
  const stampedMyTasks = (myTaskRows || []).map((row) => ({
    ...row,
    ...(liveIds ? {
      liveApprovalPendingKnown: true,
      isLiveApprovalPending: liveIds.has(row.id),
    } : {}),
    ...(liveReopenIds ? {
      liveReopenPendingKnown: true,
      isLiveReopenPending: liveReopenIds.has(row.id),
    } : {}),
  }));

  if (!approvalPending.length && !reopenPending.length) return stampedMyTasks;

  const completedById = new Map();
  const taskById = indexTasksByInstanceId([...approvalPending, ...reopenPending], user);
  const approvalRows = mapMergedRows(
    mergeRawItems(approvalPending, reopenPending),
    completedById,
    taskById,
    user,
    { liveApprovalPendingIds: liveIds, liveReopenPendingIds: liveReopenIds },
  );
  return dedupeEmployeeRows([...(stampedMyTasks || []), ...(approvalRows || [])]);
}

/** Landing page size — keep first paint small (full report still uses REFEX_REPORT_PAGE_SIZE). */
const APPROVER_ME_LANDING_PAGE_SIZE = 100;

async function fetchMyItemsInProgressPages(kfInstance, pageSize = REFEX_REPORT_PAGE_SIZE) {
  if (!kfInstance?.api) return [];
  const paths = buildProcessPaths(kfInstance);
  const collected = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 30) {
    try {
      const resp = await kfGetJson(kfInstance, paths.myItemsPath('inprogress', page, pageSize));
      const items = extractItemsFromResponse(resp);
      collected.push(...items);
      hasMore = items.length >= pageSize;
      page += 1;
    } catch (err) {
      console.warn(`Refex myitems/inprogress page ${page} failed:`, err?.message || err);
      break;
    }
  }
  return collected;
}

/**
 * IT Manager / IT Head Me landing — pending bucket by StepName + $request_id enrich.
 * Refex: role approval + open work + reopen currently in the user's bucket.
 * Extrovis: PickUp / Solution / Dependency / ReOpen Window in the user's bucket.
 * Does not include participated history.
 */
export async function fetchRefexApproverMeLandingSeed(
  kfInstance,
  user = null,
  { role = 'first', force = false } = {},
) {
  if (!kfInstance?.api || !user) return [];
  void force;
  const profile = getActiveDashboardProfile();
  const isExtrovis = profile?.id === 'extrovis';
  const meRole = role === 'final' ? 'final' : 'first';

  const pendingResult = await fetchAccessiblePendingItemsCached(
    kfInstance,
    APPROVER_ME_LANDING_PAGE_SIZE,
    null,
    getMeBucketStepPatterns(isExtrovis ? 'agent' : meRole),
  ).catch((err) => {
    console.warn('Approver Me landing pending/activity/count failed:', err?.message || err);
    return { items: [], authoritative: false };
  });

  const pendingItems = pendingResult.items || [];
  // Landing must stay fast — paint pending first; skip per-ticket $request_id enrich here.
  // Background ensureRefexMappedDataset / soft refresh fills MIS columns.
  const enrichedPending = pendingItems;

  // Closed-by Completed query is expensive — skip on landing seed; background load covers Closed KPI.
  const closedByItems = [];

  const merged = mergeRawItems(enrichedPending, closedByItems);
  const liveBucketPendingIds = collectInstanceIdSet(pendingItems);
  const liveApprovalIds = collectInstanceIdSet(
    pendingItems.filter((item) => {
      const step = normalizeText(item?._current_step || item?.Current_Step);
      return classifyPendingStepName(step, profile?.id || '') === 'approval';
    }),
  );
  const liveReopenIds = collectReopenPendingIds(pendingItems);

  return mapMergedRows(
    merged,
    new Map(),
    indexTasksByInstanceId(enrichedPending, user),
    user,
    {
      liveApprovalPendingIds: isExtrovis ? null : liveApprovalIds,
      liveReopenPendingIds: liveReopenIds,
      liveBucketPendingIds,
    },
  );
}

/**
 * Admin / CEO fast landing — live pending pools only (no Main Report walk).
 * Skips $request_id enrich so first paint stays under ~2s; background load fills MIS + Closed.
 */
export async function fetchRefexOversightLandingSeed(
  kfInstance,
  user = null,
  { reportFilters = {} } = {},
) {
  if (!kfInstance?.api) return [];
  void reportFilters;
  const [approvalPendingResult, reopenPendingResult, openWorkPendingResult] = await Promise.all([
    fetchServiceApprovalPendingItems(kfInstance),
    fetchServiceReopenPendingItems(kfInstance),
    user
      ? fetchAccessiblePendingItemsCached(
        kfInstance,
        APPROVER_ME_LANDING_PAGE_SIZE,
        null,
        getOpenWorkStepPatterns(),
      ).catch(() => ({ items: [], authoritative: false }))
      : Promise.resolve({ items: [], authoritative: false }),
  ]);
  const approvalPending = approvalPendingResult.items || [];
  const reopenPending = reopenPendingResult.items || [];
  const openWorkPending = openWorkPendingResult.items || [];
  if (!approvalPending.length && !reopenPending.length && !openWorkPending.length) return [];

  const liveIds = approvalPendingResult.authoritative
    ? collectInstanceIdSet(approvalPending)
    : null;
  const liveReopenIds = reopenPendingResult.authoritative
    ? collectInstanceIdSet(reopenPending)
    : collectReopenPendingIds(reopenPending);
  const liveBucketPendingIds = collectInstanceIdSet([
    ...approvalPending,
    ...reopenPending,
    ...openWorkPending,
  ]);
  const taskById = indexTasksByInstanceId(
    [...approvalPending, ...reopenPending, ...openWorkPending],
    user,
  );
  return mapMergedRows(
    mergeRawItems(approvalPending, reopenPending, openWorkPending),
    new Map(),
    taskById,
    user,
    {
      liveApprovalPendingIds: liveIds,
      liveReopenPendingIds: liveReopenIds.size ? liveReopenIds : null,
      liveBucketPendingIds,
    },
  );
}
