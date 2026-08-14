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
  extractItemsFromResponse,
  fetchITServiceReport,
  resolveAccountId,
  sortDashboardRowsByTicketOrder,
  getITProcess,
  getActiveDashboardProfile,
  REFEX_REPORT_PAGE_SIZE,
} from '../../../lib/kfITServiceDashboard.js';
import {
  dedupeEmployeeRows,
  enrichEmployeeRowCompletion,
  mapRefexEmployeeRow,
  mergeTechSupportRowWithTask,
} from '../employeedashboard/mapRefexEmployeeRow.js';
import { isAssignedToUser, normalizeAssigneeList } from '../../../lib/kfITServiceDashboard.js';
import { fetchRefexReportItemsCached, buildRefexReportCacheKey } from '../shared/refexReportCache.js';
import {
  getPersistentReportCache,
  setPersistentReportCache,
  clearPersistentReportCache,
} from '../shared/refexPersistentReportCache.js';
import { toKissflowUtcIso, overlapKissflowSyncIso, buildReportFilterCacheSuffix } from '../shared/refexReportQuery.js';

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
    || step.includes('dependency assigne')
    || step.includes('reopen window')
    || step.includes('it tech reopen');
}

function isRefexServiceMyTaskItem(item) {
  if (isTechSupportTask(item)) return true;
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
) {
  let page = 1;
  let hasMore = true;
  const collected = [];
  while (hasMore && page <= 30) {
    const report = await fetchITServiceReport(kfInstance, page, pageSize, filters);
    const items = extractItemsFromResponse(report);
    collected.push(...items);
    hasMore = items.length >= pageSize;
    page += 1;
  }
  return collected;
}

/**
 * Full report once → IndexedDB cache.
 * Later refreshes: $status=InProgress + $modified_at_gt (and Completed delta) merge into cache.
 * force=true (or filters.fullReload) skips delta and rebuilds the full report cache.
 */
async function fetchAllReportItems(kfInstance, { force = false, filters = {} } = {}) {
  const baseKey = buildRefexReportCacheKey(kfInstance);
  const filterSuffix = buildReportFilterCacheSuffix(filters);
  const persistKey = `${baseKey}|${filterSuffix}`;
  const wantFull = Boolean(force || filters.fullReload);

  const loadFull = async () => {
    const items = await fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
      entity: filters.entity || '',
    });
    const lastSyncAt = toKissflowUtcIso(new Date());
    await setPersistentReportCache(persistKey, { items, lastSyncAt });
    return items;
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
      const [inProgressDelta, completedDelta, rejectedDelta, draftDelta, createdDelta] = await Promise.all([
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          status: 'InProgress',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('InProgress delta report failed:', err?.message || err);
          return [];
        }),
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          status: 'Completed',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('Completed delta report failed:', err?.message || err);
          return [];
        }),
        // Rejected by Manager/Head — keep cache in sync for Rejected KPI.
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          status: 'Rejected',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('Rejected delta report failed:', err?.message || err);
          return [];
        }),
        // Email channel can land as Draft before first submit.
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          status: 'Draft',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('Draft delta report failed:', err?.message || err);
          return [];
        }),
        // Brand-new tickets (email) can miss $modified_at_gt when the report indexes late.
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          createdAtGt: since,
        }).catch((err) => {
          console.warn('Created-at delta report failed:', err?.message || err);
          return [];
        }),
      ]);
      const merged = mergeReportItemsById(
        persisted.items,
        inProgressDelta,
        completedDelta,
        rejectedDelta,
        draftDelta,
        createdDelta,
      );
      const lastSyncAt = toKissflowUtcIso(new Date());
      await setPersistentReportCache(persistKey, { items: merged, lastSyncAt });
      return merged;
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
 * Landing seed APIs — myitems/inprogress + SDK my tasks.
 * Extrovis/Refex also load pending owned-work step so My Tasks can paint without
 * waiting for the full report (Pickup stays Open Tickets via report/pending later).
 */
async function fetchTechSupportLandingTaskItemsUncached(kfInstance) {
  if (!kfInstance?.api) return [];
  const paths = buildProcessPaths(kfInstance);
  const profileId = getActiveDashboardProfile()?.id;
  const isExtrovis = profileId === 'extrovis';
  const isRefex = profileId === 'refex';

  const fetches = [
    fetchRefexSdkMyTaskItems(kfInstance),
    kfGetJson(kfInstance, paths.myItemsPath('inprogress', 1, REFEX_REPORT_PAGE_SIZE))
      .then((resp) => extractItemsFromResponse(resp).filter(isRefexServiceMyTaskItem))
      .catch((err) => {
        console.warn('Refex tech support myitems/inprogress failed:', err?.message || err);
        return [];
      }),
  ];

  if (isExtrovis || isRefex) {
    fetches.push(
      fetchAccessiblePendingItemsCached(kfInstance, REFEX_REPORT_PAGE_SIZE, getAgentWorkActivityIds())
        .then((result) => (result.items || []).filter(isRefexServiceMyTaskItem))
        .catch((err) => {
          console.warn('pending/activity/count landing failed:', err?.message || err);
          return [];
        }),
    );
  }

  const batches = await Promise.all(fetches);
  return batches.flat();
}

/**
 * Full my-task APIs — landing sources + pending/{activityId} for open pools.
 */
async function fetchTechSupportTaskItemsUncached(kfInstance) {
  if (!kfInstance?.api) return [];
  const paths = buildProcessPaths(kfInstance);

  const sdkMyTasksPromise = fetchRefexSdkMyTaskItems(kfInstance);

  const inProgressPromise = kfGetJson(kfInstance, paths.myItemsPath('inprogress', 1, REFEX_REPORT_PAGE_SIZE))
    .then((resp) => extractItemsFromResponse(resp).filter(isRefexServiceMyTaskItem))
    .catch((err) => {
      console.warn('Refex tech support myitems/inprogress failed:', err?.message || err);
      return [];
    });

  const [sdkMyTasks, inProgressItems, accessiblePending] = await Promise.all([
    sdkMyTasksPromise,
    inProgressPromise,
    fetchAccessiblePendingItemsCached(kfInstance, REFEX_REPORT_PAGE_SIZE, getAgentWorkActivityIds()),
  ]);

  return [sdkMyTasks, inProgressItems, ...(accessiblePending.items || [])].flat()
    .filter(isRefexServiceMyTaskItem);
}

const ACCESSIBLE_PENDING_TTL_MS = 15000;
/** @type {{ key: string, at: number, promise: Promise<any>|null }} */
let accessiblePendingCache = { key: '', at: 0, promise: null };

function fetchAccessiblePendingItemsCached(kfInstance, pageSize, allowedIds) {
  const key = [
    resolveAccountId(kfInstance) || '',
    pageSize,
    (allowedIds || []).join(','),
  ].join('|');
  const now = Date.now();
  if (
    accessiblePendingCache.promise
    && accessiblePendingCache.key === key
    && (now - accessiblePendingCache.at) < ACCESSIBLE_PENDING_TTL_MS
  ) {
    return accessiblePendingCache.promise;
  }
  const promise = fetchAccessiblePendingItems(kfInstance, pageSize, allowedIds);
  accessiblePendingCache = { key, at: now, promise };
  return promise;
}

const TASK_ITEMS_TTL_MS = 15000;
/** @type {{ key: string, at: number, promise: Promise<any[]>|null }} */
let taskItemsCache = { key: '', at: 0, promise: null };
/** @type {{ key: string, at: number, promise: Promise<any[]>|null }} */
let landingTaskItemsCache = { key: '', at: 0, promise: null };

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

/** Mark rows the signed-in user participated in (Me scope / Closed / Rejected). */
function stampParticipatedRows(rows, participatedIds) {
  if (!(participatedIds instanceof Set) || !participatedIds.size) return rows || [];
  return (rows || []).map((row) => (
    participatedIds.has(row?.id)
      ? { ...row, isParticipatedByUser: true }
      : row
  ));
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
  const rows = Array.isArray(countResp)
    ? countResp
    : (Array.isArray(countResp?.Data) ? countResp.Data : []);
  return rows
    .filter((row) => Number(row?.Count) > 0 && normalizeText(row?._id || row?.Id || row?.id))
    .map((row) => normalizeText(row._id || row.Id || row.id));
}

function getPendingCountFallbackActivityIds() {
  const profile = getActiveDashboardProfile();
  const ids = [...getAgentWorkActivityIds()];
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
 * 2) GET .../pending/{activityId} for each Count > 0 (intersected with allowed ids)
 * Falls back to allowed ids if count fails.
 * @returns {{ items: any[], activityIds: string[], authoritative: boolean }}
 */
async function fetchAccessiblePendingItems(
  kfInstance,
  pageSize = REFEX_REPORT_PAGE_SIZE,
  allowedIds = null,
) {
  if (!kfInstance?.api) return { items: [], activityIds: [], authoritative: false };
  const paths = buildProcessPaths(kfInstance);
  const allowed = Array.isArray(allowedIds) && allowedIds.length
    ? new Set(allowedIds.filter(Boolean))
    : new Set(getPendingCountFallbackActivityIds());
  let activityIds = [];
  let countOk = false;
  try {
    const countResp = await kfGetJson(kfInstance, paths.pendingActivityCountPath());
    activityIds = parsePendingActivityCountRows(countResp).filter((id) => allowed.has(id));
    countOk = true;
  } catch (err) {
    console.warn('pending/activity/count failed:', err?.message || err);
    activityIds = [...allowed];
  }
  if (!activityIds.length) {
    return { items: [], activityIds: [], authoritative: countOk };
  }
  let anyOk = false;
  const batches = await Promise.all(activityIds.map(async (activityId) => {
    try {
      const items = await fetchPendingItemsAtActivity(kfInstance, activityId, pageSize);
      anyOk = true;
      return items;
    } catch (err) {
      console.warn(`pending/${activityId} failed:`, err?.message || err);
      return [];
    }
  }));
  return {
    items: batches.flat(),
    activityIds,
    authoritative: countOk || anyOk,
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
      getAgentWorkActivityIds(),
    );
    // Extrovis has no L1/L2 approval queue — do not stamp liveApprovalPendingKnown.
    return { items: accessible.items || [], authoritative: false };
  }
  const accessible = await fetchAccessiblePendingItemsCached(
    kfInstance,
    REFEX_REPORT_PAGE_SIZE,
    getServiceApprovalActivityIds(),
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
 * InProgress report rows assigned to the signed-in user ($assigned_to).
 * Merged into monitoring so personally assigned Manager/Head tickets are never missed
 * when pending preference paging or report step fields are stale.
 */
async function fetchAssignedInProgressReportItems(kfInstance, user, reportFilters = {}) {
  const assignedTo = normalizeText(user?._id || user?.Id);
  if (!kfInstance?.api || !assignedTo) return [];
  try {
    return await fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
      entity: reportFilters.entity || '',
      status: 'InProgress',
      assignedTo,
    });
  } catch (err) {
    console.warn('$assigned_to InProgress report failed:', err?.message || err);
    return [];
  }
}

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
    map.set(id, prev ? { ...prev, ...item } : item);
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
  participatedIds = null,
} = {}) {
  const liveKnown = liveApprovalPendingIds instanceof Set;
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
      if (!liveKnown) return merged;
      return {
        ...merged,
        liveApprovalPendingKnown: true,
        isLiveApprovalPending: liveApprovalPendingIds.has(row.id),
      };
    });

  const ordered = sortDashboardRowsByTicketOrder(dedupeEmployeeRows(rows), 'asc') || [];
  return stampParticipatedRows(ordered, participatedIds);
}

/**
 * Fast landing seed — My Task APIs only (inprogress + SDK).
 * Same row mapping/merge rules as the full fetch for task items.
 */
export async function fetchRefexTechSupportMyTaskSeed(kfInstance, user = null, { force = false } = {}) {
  const taskItems = await fetchTechSupportLandingTaskItems(kfInstance, { force });
  const taskById = indexTasksByInstanceId(taskItems, user);
  const mergedRaw = mergeRawItems(taskItems);
  return mapMergedRows(mergedRaw, new Map(), taskById, user);
}

/** Normalized Refex Tech Support service queue dataset for agent dashboards. */
export async function fetchRefexTechSupportTickets(
  kfInstance,
  user = null,
  { forceRefresh = false, softRefresh = false, reportFilters = {} } = {},
) {
  // Soft refresh — report delta into IndexedDB + light my-task merge (no full pending pool walk).
  if (softRefresh && !forceRefresh) {
    const [reportItems, taskItems] = await Promise.all([
      fetchAllReportItems(kfInstance, { force: false, filters: reportFilters }),
      fetchTechSupportTaskItems(kfInstance),
    ]);
    const taskById = indexTasksByInstanceId(taskItems, user);
    return mapMergedRows(mergeRawItems(reportItems, taskItems), new Map(), taskById, user);
  }

  // Task items reuse the seed's fetch (TTL cache) — never force a second myitems round.
  const [reportItems, taskItems, { completed, participated }] = await Promise.all([
    fetchAllReportItems(kfInstance, { force: forceRefresh, filters: reportFilters }),
    fetchTechSupportTaskItems(kfInstance),
    fetchParticipatedAndCompleted(kfInstance),
  ]);

  const mergedRaw = mergeRawItems(reportItems, completed, participated, taskItems);
  const taskById = indexTasksByInstanceId(taskItems, user);
  const completedById = indexByInstanceId(completed);

  return mapMergedRows(mergedRaw, completedById, taskById, user, {
    participatedIds: collectInstanceIdSet(participated),
  });
}

/**
 * Monitoring view — all Refex service queue tickets; merges live my-task items when user is provided.
 * softRefresh: report delta + approval pending pools (keeps Pending Approval accurate).
 * @param {{ forceRefresh?: boolean, softRefresh?: boolean, reportFilters?: object }} [options]
 */
export async function fetchRefexMonitoringServiceTickets(
  kfInstance,
  user = null,
  { forceRefresh = false, softRefresh = false, reportFilters = {} } = {},
) {
  // Soft refresh / Refresh button — report delta + live approval pending (L1/L2/Manager/Head).
  // Skipping approval pending was emptying Pending Approval in production.
  if (softRefresh && !forceRefresh) {
    const [reportItems, approvalPendingResult, assignedItems, participated] = await Promise.all([
      fetchAllReportItems(kfInstance, {
        force: false,
        filters: reportFilters,
      }),
      fetchServiceApprovalPendingItems(kfInstance),
      fetchAssignedInProgressReportItems(kfInstance, user, reportFilters),
      user ? fetchParticipatedItems(kfInstance) : Promise.resolve([]),
    ]);
    const approvalPending = approvalPendingResult.items || [];
    const liveIds = approvalPendingResult.authoritative
      ? collectInstanceIdSet(approvalPending)
      : null;
    const participatedIds = collectInstanceIdSet(participated);
    const taskById = indexTasksByInstanceId(approvalPending, user);
    return mapMergedRows(
      mergeRawItems(reportItems, approvalPending, assignedItems, participated),
      new Map(),
      taskById,
      user,
      { liveApprovalPendingIds: liveIds, participatedIds },
    );
  }

  const [reportItems, taskItems, approvalPendingResult, assignedItems, { completed, participated }] = await Promise.all([
    fetchAllReportItems(kfInstance, { force: forceRefresh, filters: reportFilters }),
    user ? fetchTechSupportTaskItems(kfInstance) : Promise.resolve([]),
    fetchServiceApprovalPendingItems(kfInstance),
    fetchAssignedInProgressReportItems(kfInstance, user, reportFilters),
    fetchParticipatedAndCompleted(kfInstance),
  ]);
  const approvalPending = approvalPendingResult.items || [];
  const liveIds = approvalPendingResult.authoritative
    ? collectInstanceIdSet(approvalPending)
    : null;
  const participatedIds = collectInstanceIdSet(participated);
  const completedById = indexByInstanceId(completed);
  const taskById = indexTasksByInstanceId([...taskItems, ...approvalPending], user);
  const mergedRaw = mergeRawItems(
    reportItems,
    completed,
    participated,
    approvalPending,
    assignedItems,
    ...(user ? [taskItems] : []),
  );

  return mapMergedRows(mergedRaw, completedById, taskById, user, {
    liveApprovalPendingIds: liveIds,
    participatedIds,
  });
}

/** Instant paint from IndexedDB + live approval pending (so Pending Approval is not empty on reopen). */
export async function hydrateRefexMonitoringFromPersistentCache(
  kfInstance,
  user = null,
  reportFilters = {},
) {
  const baseKey = buildRefexReportCacheKey(kfInstance);
  const filterSuffix = buildReportFilterCacheSuffix(reportFilters);
  const persistKey = `${baseKey}|${filterSuffix}`;
  const persisted = await getPersistentReportCache(persistKey);
  if (!persisted?.items?.length) return null;

  let approvalPending = [];
  let assignedItems = [];
  let participated = [];
  let liveIds = null;
  try {
    const [approvalPendingResult, assigned, participatedItems] = await Promise.all([
      fetchServiceApprovalPendingItems(kfInstance),
      fetchAssignedInProgressReportItems(kfInstance, user, reportFilters),
      user ? fetchParticipatedItems(kfInstance) : Promise.resolve([]),
    ]);
    approvalPending = approvalPendingResult.items || [];
    liveIds = approvalPendingResult.authoritative
      ? collectInstanceIdSet(approvalPending)
      : null;
    assignedItems = assigned;
    participated = participatedItems || [];
  } catch (err) {
    console.warn('Hydrate approval pending failed:', err?.message || err);
  }
  const taskById = indexTasksByInstanceId(approvalPending, user);
  return mapMergedRows(
    mergeRawItems(persisted.items, approvalPending, assignedItems, participated),
    new Map(),
    taskById,
    user,
    {
      liveApprovalPendingIds: liveIds,
      participatedIds: collectInstanceIdSet(participated),
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
  const [myTaskRows, approvalPendingResult] = await Promise.all([
    user ? fetchRefexTechSupportMyTaskSeed(kfInstance, user, { force }) : Promise.resolve([]),
    fetchServiceApprovalPendingItems(kfInstance),
  ]);
  const approvalPending = approvalPendingResult.items || [];
  const liveIds = approvalPendingResult.authoritative
    ? collectInstanceIdSet(approvalPending)
    : null;

  // Stamp live membership on personal seed rows so approved ghosts drop immediately.
  const stampedMyTasks = liveIds
    ? (myTaskRows || []).map((row) => ({
      ...row,
      liveApprovalPendingKnown: true,
      isLiveApprovalPending: liveIds.has(row.id),
    }))
    : (myTaskRows || []);

  if (!approvalPending.length) return stampedMyTasks;

  const completedById = new Map();
  const taskById = indexTasksByInstanceId(approvalPending, user);
  const approvalRows = mapMergedRows(
    mergeRawItems(approvalPending),
    completedById,
    taskById,
    user,
    { liveApprovalPendingIds: liveIds },
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
 * IT Manager / IT Head Me landing — minimal APIs only.
 * Refex: SDK + inprogress + role approval pending (Manager/Head step).
 * Extrovis: SDK + inprogress only (no Refex L1/L2/Manager/Head activities on that process).
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
  const profileIds = profile?.serviceApprovalActivityIds || {};
  const roleActivityId = isExtrovis
    ? null
    : (role === 'final'
      ? (profileIds.itHead || REFEX_IT_HEAD_APPROVAL_ACTIVITY_ID)
      : (profileIds.itManager || REFEX_IT_MANAGER_APPROVAL_ACTIVITY_ID));

  const fetches = [
    fetchRefexSdkMyTaskItems(kfInstance).catch((err) => {
      console.warn('Approver Me landing SDK mytasks failed:', err?.message || err);
      return [];
    }),
    fetchMyItemsInProgressPages(kfInstance, APPROVER_ME_LANDING_PAGE_SIZE).catch((err) => {
      console.warn('Approver Me landing myitems/inprogress failed:', err?.message || err);
      return [];
    }),
    // Tickets the user already approved / rejected / acted on.
    fetchParticipatedItems(kfInstance, APPROVER_ME_LANDING_PAGE_SIZE).catch((err) => {
      console.warn('Approver Me landing participated failed:', err?.message || err);
      return [];
    }),
  ];

  /** @type {Promise<{ items: any[], authoritative: boolean }>|null} */
  let rolePendingPromise = null;
  /** Index of participated batch in fetches (always 3rd). */
  const participatedFetchIndex = 2;

  // Extrovis: pending/activity/count → pending/{PickUp|Solution|ReOpen Window|…}.
  if (isExtrovis) {
    fetches.push(
      fetchAccessiblePendingItemsCached(kfInstance, APPROVER_ME_LANDING_PAGE_SIZE, getAgentWorkActivityIds())
        .then((result) => result.items || [])
        .catch((err) => {
          console.warn('Extrovis Me landing pending/activity/count failed:', err?.message || err);
          return [];
        }),
    );
  } else if (roleActivityId) {
    // Canonical role queue (apply_preference, all pages):
    // Manager → pending/Activity_-_FFwHdMSN ; Head → pending/Activity_ZPJhIX0l3A
    rolePendingPromise = fetchPendingItemsAtActivity(
      kfInstance,
      roleActivityId,
      APPROVER_ME_LANDING_PAGE_SIZE,
    )
      .then((items) => ({ items, authoritative: true }))
      .catch((err) => {
        console.warn(`Approver Me landing pending/${roleActivityId} failed:`, err?.message || err);
        return { items: [], authoritative: false };
      });
    fetches.push(rolePendingPromise.then((r) => r.items));
    // Personal InProgress ($assigned_to) — AppRole pool still comes from pending above.
    fetches.push(
      fetchAssignedInProgressReportItems(kfInstance, user, {}).catch(() => []),
    );
  }

  const [batches, rolePendingResult] = await Promise.all([
    Promise.all(fetches),
    rolePendingPromise || Promise.resolve(null),
  ]);
  const merged = batches.flat();
  const liveIds = rolePendingResult?.authoritative
    ? collectInstanceIdSet(rolePendingResult.items)
    : null;
  const participatedIds = collectInstanceIdSet(batches[participatedFetchIndex] || []);

  return mapMergedRows(
    mergeRawItems(merged),
    new Map(),
    indexTasksByInstanceId(merged, user),
    user,
    { liveApprovalPendingIds: liveIds, participatedIds },
  );
}
