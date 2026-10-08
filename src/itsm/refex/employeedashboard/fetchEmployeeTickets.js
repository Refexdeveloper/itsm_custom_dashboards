import { kfGetJson } from '../../../lib/kfRuntime.js';
import {
  APP_ID,
  getActiveServiceProcessId,
  extractItemsFromResponse,
  fetchITServiceReport,
  isMyItem,
  resolveAccountId,
  sortMisTableRows,
  getActiveDashboardProfile,
  REFEX_REPORT_PAGE_SIZE,
  resolveDisplayRequestId,
} from '../../../lib/kfITServiceDashboard.js';
import {
  EMPLOYEE_APPROVAL_ACTIVITY_ID,
  EMPLOYEE_APPROVAL_ACTIVITY_ID_LEGACY,
  EMPLOYEE_APPROVAL_STEP_LABEL,
} from './constants.js';
import { isInCurrentFinancialYear } from './financialYear.js';
import {
  dedupeEmployeeRows,
  enrichEmployeeRowCompletion,
  mapRefexEmployeeRow,
  mergeEmployeeRowWithTask,
} from './mapRefexEmployeeRow.js';
import { fetchRefexReportItemsCached, buildRefexReportCacheKey } from '../shared/refexReportCache.js';
import {
  getPersistentReportCache,
  setPersistentReportCache,
  clearPersistentReportCache,
} from '../shared/refexPersistentReportCache.js';
import { toKissflowUtcIso, overlapKissflowSyncIso, buildReportFilterCacheSuffix, startOfLocalDayKissflowIso } from '../shared/refexReportQuery.js';
import {
  extractRequestIdFromItem,
  getPendingStepGroups,
  parsePendingActivityCountEntries,
  resolveActivityIdsByStepNames,
  stampPendingItemsWithStepName,
  isReopenStepName,
} from '../shared/refexPendingByStep.js';
import { isEmployeeLivePendingApproval } from './employeeStatus.js';

/** Employee Feedback / Reopen activity ids — profile only (do not mix Refex ids into Extrovis). */
function getEmployeeFeedbackActivityIds() {
  const profile = getActiveDashboardProfile();
  const ids = [
    profile?.employeeFeedbackActivityId,
    profile?.employeeFeedbackActivityIdLegacy,
  ].filter(Boolean);
  // Legacy packs with no profile feedback id — Refex reopen constants only.
  if (!ids.length) {
    ids.push(EMPLOYEE_APPROVAL_ACTIVITY_ID, EMPLOYEE_APPROVAL_ACTIVITY_ID_LEGACY);
  }
  return [...new Set(ids)];
}
function buildProcessPaths(kfInstance) {
  const accountId = resolveAccountId(kfInstance);
  const appQuery = `_application_id=${encodeURIComponent(APP_ID)}`;
  const processId = getActiveServiceProcessId();
  const base = `/process/2/${accountId}/${processId}`;
  return {
    pendingAtStepPath(activityId, pageNumber = 1, pageSize = REFEX_REPORT_PAGE_SIZE) {
      return `${base}/pending/${encodeURIComponent(activityId)}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    pendingActivityCountPath() {
      return `${base}/pending/activity/count?apply_preference=true&${appQuery}`;
    },
    myItemsPath(status = 'all', pageNumber = 1, pageSize = REFEX_REPORT_PAGE_SIZE) {
      return `${base}/myitems/${status}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    instancePath(instanceId) {
      return `${base}/${encodeURIComponent(instanceId)}?${appQuery}`;
    },
    instanceWithActivityPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}?${appQuery}`;
    },
  };
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function isEmployeeApprovalTask(item) {
  const step = normalizeText(item?._current_step || item?.Current_Step);
  const profileId = getActiveDashboardProfile()?.id || '';
  if (isReopenStepName(step, profileId)) return true;
  const activityId = normalizeText(item?._activity_id || item?.Activity_ID || item?.activity_id);
  if (getEmployeeFeedbackActivityIds().includes(activityId)) return true;
  const lower = step.toLowerCase();
  return lower === EMPLOYEE_APPROVAL_STEP_LABEL.toLowerCase()
    || lower.includes('employee verification')
    || lower.includes('employee feedback')
    || lower.includes('employee approval')
    || lower.includes('reopen');
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

async function fetchPendingItemsAtActivity(
  kfInstance,
  activityId,
  { pageSize = REFEX_REPORT_PAGE_SIZE, keepAll = false } = {},
) {
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
      const items = extractItemsFromResponse(resp).filter((item) => keepAll || isEmployeeApprovalTask(item));
      collected.push(...items);
      hasMore = items.length >= pageSize;
      page += 1;
    } catch (err) {
      console.warn(`Refex employee pending/${activityId} page ${page} failed:`, err?.message || err);
      break;
    }
  }
  return collected;
}

/**
 * Full report once → IndexedDB cache.
 * Later refreshes: InProgress/Completed + $modified_at_gt (+ optional $entity) merge into cache.
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
      const todayCreatedGt = startOfLocalDayKissflowIso(new Date());
      const [inProgressDelta, completedDelta, createdDelta, todayCreatedDelta] = await Promise.all([
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          status: 'InProgress',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('Employee InProgress delta failed:', err?.message || err);
          return [];
        }),
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          status: 'Completed',
          modifiedAtGt: since,
        }).catch((err) => {
          console.warn('Employee Completed delta failed:', err?.message || err);
          return [];
        }),
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          createdAtGt: since,
        }).catch((err) => {
          console.warn('Employee created-at delta failed:', err?.message || err);
          return [];
        }),
        todayCreatedGt
          ? fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
            entity: filters.entity || '',
            createdAtGt: todayCreatedGt,
          }).catch((err) => {
            console.warn('Employee today created failed:', err?.message || err);
            return [];
          })
          : Promise.resolve([]),
      ]);
      const merged = mergeReportItemsById(
        persisted.items,
        inProgressDelta,
        completedDelta,
        createdDelta,
        todayCreatedDelta,
      );
      const lastSyncAt = toKissflowUtcIso(new Date());
      await setPersistentReportCache(persistKey, { items: merged, lastSyncAt });
      return merged;
    } catch (err) {
      console.warn('Employee report delta merge failed — full reload:', err?.message || err);
    }
  }

  return fetchRefexReportItemsCached(
    kfInstance,
    loadFull,
    { force: true },
  );
}

function stampEmployeeLivePending(items = [], kind = 'reopen') {
  const approval = kind === 'approval';
  return (Array.isArray(items) ? items : []).map((task) => ({
    ...task,
    isLiveBucketPending: true,
    isLiveReopenPending: approval ? false : true,
    isLiveApprovalPending: approval,
    liveApprovalPendingKnown: approval,
  }));
}

async function enrichEmployeePendingByRequestId(kfInstance, pendingItems = []) {
  const list = Array.isArray(pendingItems) ? pendingItems : [];
  if (!list.length) return [];

  const isBlank = (value) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'string') {
      const token = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
      if (!token || token === '—' || token === 'other' || token === 'others' || token === 'na' || token === 'n/a') {
        return true;
      }
    }
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  };
  const assigneeHasName = (value) => {
    if (!value) return false;
    const names = Array.isArray(value) ? value : [value];
    return names.some((entry) => {
      if (!entry) return false;
      if (typeof entry === 'string') return Boolean(entry.trim()) && entry.trim() !== '—';
      return Boolean(String(entry?.Name || entry?.name || entry?.Email || entry?.email || '').trim());
    });
  };
  const mergePreferFilled = (base = {}, overlay = {}) => {
    const prefer = new Set([
      '_current_step',
      'Current_Step',
      '_current_assigned_to',
      '_activity_instance_id',
      'Activity_Instance_ID',
      '_status',
      'Statu',
      '_modified_at',
      '_modified_by',
    ]);
    const out = { ...base };
    Object.keys(overlay || {}).forEach((key) => {
      const next = overlay[key];
      if (prefer.has(key)) {
        if (key === '_current_assigned_to') {
          if (assigneeHasName(next)) out[key] = next;
          return;
        }
        if (!isBlank(next)) out[key] = next;
        return;
      }
      if (isBlank(next) && !isBlank(out[key])) return;
      out[key] = next;
    });
    return out;
  };

  return Promise.all(list.map(async (task) => {
    const approval = task?.isLiveApprovalPending === true && task?.isLiveReopenPending !== true;
    const stamp = approval
      ? { isLiveBucketPending: true, isLiveApprovalPending: true, liveApprovalPendingKnown: true, isLiveReopenPending: false }
      : { isLiveBucketPending: true, isLiveReopenPending: true };
    const paths = buildProcessPaths(kfInstance);
    let reportItem = null;

    // Only GET /{instanceId}/{activityInstanceId} — bare /{id} is 404; $request_id is empty/429.
    const instanceId = normalizeText(task?._id || task?.Instance_ID);
    const act = normalizeText(
      task?._activity_instance_id
      || task?.Activity_Instance_ID
      || task?._entity_id
      || '',
    );
    if (instanceId && act) {
      try {
        reportItem = await kfGetJson(kfInstance, paths.instanceWithActivityPath(instanceId, act));
      } catch (err) {
        console.warn(`Employee instance ${instanceId}/${act} enrich failed:`, err?.message || err);
      }
    }

    if (!reportItem) return { ...task, ...stamp };
    return { ...mergePreferFilled(reportItem, task), ...stamp };
  }));
}

/** Pending/activity pages only — shared by landing seed and full enrich path. */
async function fetchEmployeePendingRawUncached(kfInstance) {
  if (!kfInstance?.api) return [];
  const paths = buildProcessPaths(kfInstance);
  const profileId = getActiveDashboardProfile()?.id || 'refex';
  const groups = getPendingStepGroups(profileId);
  const reopenPatterns = groups.reopen || [];
  const approvalPatterns = profileId === 'extrovis'
    ? []
    : [...(groups.approvalL1 || []), ...(groups.approvalL2 || [])];

  let reopenIds = [];
  let approvalIds = [];
  let stepById = new Map();
  try {
    const countResp = await kfGetJson(kfInstance, paths.pendingActivityCountPath());
    const entries = parsePendingActivityCountEntries(countResp);
    stepById = new Map(entries.map((entry) => [entry.id, entry.stepName]));
    reopenIds = resolveActivityIdsByStepNames(entries, reopenPatterns);
    approvalIds = resolveActivityIdsByStepNames(entries, approvalPatterns);
  } catch (err) {
    console.warn('Employee pending/activity/count failed:', err?.message || err);
    reopenIds = getEmployeeFeedbackActivityIds();
  }

  const [reopenBatches, approvalBatches] = await Promise.all([
    Promise.all(reopenIds.map((activityId) => fetchPendingItemsAtActivity(kfInstance, activityId))),
    Promise.all(approvalIds.map((activityId) => (
      fetchPendingItemsAtActivity(kfInstance, activityId, { keepAll: true })
    ))),
  ]);

  const stampWithStep = (items, activityId, kind) => stampEmployeeLivePending(
    stampPendingItemsWithStepName(items, activityId, stepById.get(activityId) || ''),
    kind,
  );

  return [
    ...reopenIds.flatMap((activityId, idx) => stampWithStep(reopenBatches[idx] || [], activityId, 'reopen')),
    ...approvalIds.flatMap((activityId, idx) => stampWithStep(approvalBatches[idx] || [], activityId, 'approval')),
  ];
}

const PENDING_RAW_TTL_MS = 15000;
/** @type {{ key: string, at: number, promise: Promise<any[]>|null }} */
let pendingRawCache = { key: '', at: 0, promise: null };

function fetchEmployeePendingRaw(kfInstance, { force = false } = {}) {
  if (!kfInstance?.api) return Promise.resolve([]);
  const key = `${resolveAccountId(kfInstance) || ''}|${getEmployeeFeedbackActivityIds().join(',')}`;
  const now = Date.now();
  if (
    !force
    && pendingRawCache.promise
    && pendingRawCache.key === key
    && (now - pendingRawCache.at) < PENDING_RAW_TTL_MS
  ) {
    return pendingRawCache.promise;
  }
  const promise = fetchEmployeePendingRawUncached(kfInstance);
  pendingRawCache = { key, at: now, promise };
  return promise;
}

/** Landing seed: already stamped reopen + L1/L2; skip instance enrich (slow N+1). */
async function fetchEmployeeLandingTaskItemsUncached(kfInstance) {
  return fetchEmployeePendingRaw(kfInstance);
}

async function fetchEmployeeTaskItemsUncached(kfInstance) {
  const items = await fetchEmployeePendingRaw(kfInstance);
  return enrichEmployeePendingByRequestId(kfInstance, items);
}

const TASK_ITEMS_TTL_MS = 15000;
/** @type {{ key: string, at: number, promise: Promise<any[]>|null }} */
let taskItemsCache = { key: '', at: 0, promise: null };
/** @type {{ key: string, at: number, promise: Promise<any[]>|null }} */
let landingTaskItemsCache = { key: '', at: 0, promise: null };

function employeeTaskCacheKey(kfInstance) {
  return `${resolveAccountId(kfInstance) || ''}|${getEmployeeFeedbackActivityIds().join(',')}`;
}

/**
 * Landing-only task fetch (no instance enrich). Shares pending/activity pages with
 * the full path via `pendingRawCache`; enrich runs only on background load.
 */
export function fetchEmployeeLandingTaskItems(kfInstance, { force = false } = {}) {
  if (!kfInstance?.api) return Promise.resolve([]);
  const key = employeeTaskCacheKey(kfInstance);
  const now = Date.now();
  if (
    !force
    && landingTaskItemsCache.promise
    && landingTaskItemsCache.key === key
    && (now - landingTaskItemsCache.at) < TASK_ITEMS_TTL_MS
  ) {
    return landingTaskItemsCache.promise;
  }
  const promise = fetchEmployeeLandingTaskItemsUncached(kfInstance);
  landingTaskItemsCache = { key, at: now, promise };
  return promise;
}

/**
 * Full task fetch with instance enrich. Coalesces within TTL so soft refresh /
 * background load reuse one enrich round.
 */
export function fetchEmployeeTaskItems(kfInstance, { force = false } = {}) {
  if (!kfInstance?.api) return Promise.resolve([]);
  const key = employeeTaskCacheKey(kfInstance);
  const now = Date.now();
  const cache = taskItemsCache;
  if (!force && cache.promise && cache.key === key && (now - cache.at) < TASK_ITEMS_TTL_MS) {
    return cache.promise;
  }
  const promise = fetchEmployeeTaskItemsUncached(kfInstance);
  taskItemsCache = { key, at: now, promise };
  return promise;
}

async function fetchCompletedItems(kfInstance) {
  if (!kfInstance?.api) return [];
  const paths = buildProcessPaths(kfInstance);
  try {
    const resp = await kfGetJson(kfInstance, paths.myItemsPath('completed', 1, 500));
    return extractItemsFromResponse(resp);
  } catch (err) {
    console.warn('Refex employee completed items failed:', err?.message || err);
    return [];
  }
}

function indexTasksByInstanceId(taskItems = []) {
  const map = new Map();
  taskItems.forEach((item) => {
    const id = normalizeText(item?._id || item?.Instance_ID);
    if (!id) return;
    const existing = map.get(id);
    if (!existing) {
      map.set(id, item);
      return;
    }
    const existingInProgress = normalizeText(existing?._status || existing?.Status).toLowerCase() === 'inprogress';
    const nextInProgress = normalizeText(item?._status || item?.Status).toLowerCase() === 'inprogress';
    if (!existingInProgress && nextInProgress) {
      map.set(id, item);
    }
  });
  return map;
}

function indexCompletedByInstanceId(items = []) {
  const map = new Map();
  items.forEach((item) => {
    const id = normalizeText(item?._id || item?.Instance_ID);
    if (!id) return;
    map.set(id, item);
  });
  return map;
}

function mapEmployeeRows(reportOrTaskItems, completedById, taskById, user) {
  const rows = reportOrTaskItems
    .map((item) => mapRefexEmployeeRow(item))
    .map((row) => enrichEmployeeRowCompletion(row, completedById))
    .map((row) => mergeEmployeeRowWithTask(row, taskById.get(row.id), user))
    .filter((row) => {
      if (isEmployeeLivePendingApproval(row)) return true;
      if (!isMyItem(row, user)) return false;
      const raw = row.createdAtRaw || row.requestedDateTimeRaw || row.requestedDate;
      if (!raw) return true;
      return isInCurrentFinancialYear(raw);
    });

  const deduped = dedupeEmployeeRows(rows);
  return sortMisTableRows(deduped, 'asc') || [];
}

/**
 * Fast landing seed — Employee Feedback pending only (no Main Report, no instance enrich).
 */
export async function fetchRefexEmployeeMyTaskSeed(kfInstance, user, { force = false } = {}) {
  const taskItems = await fetchEmployeeLandingTaskItems(kfInstance, { force });
  const taskById = indexTasksByInstanceId(taskItems);
  return mapEmployeeRows(taskItems, new Map(), taskById, user);
}

/**
 * Instant paint from IndexedDB (previous session report rows filtered to Me).
 * Does not hit Kissflow — pair with seed for live reopen accuracy.
 */
export async function hydrateRefexEmployeeFromPersistentCache(kfInstance, user, reportFilters = {}) {
  if (!kfInstance || !user) return null;
  const baseKey = buildRefexReportCacheKey(kfInstance);
  const filterSuffix = buildReportFilterCacheSuffix(reportFilters);
  const persistKey = `${baseKey}|${filterSuffix}`;
  const persisted = await getPersistentReportCache(persistKey);
  if (!persisted?.items?.length) return null;
  return mapEmployeeRows(persisted.items, new Map(), new Map(), user);
}

/**
 * Prefer IndexedDB fullness, overlay live seed rows so Feedback actions keep
 * `employeeMyTaskItem` and reopen tickets not yet in the report still appear.
 */
export function mergeEmployeeLandingRows(hydrated = [], seedRows = []) {
  const reportRows = Array.isArray(hydrated) ? hydrated : [];
  const liveRows = Array.isArray(seedRows) ? seedRows : [];
  if (!reportRows.length) return liveRows;
  if (!liveRows.length) return reportRows;

  const byId = new Map();
  reportRows.forEach((row) => {
    if (row?.id) byId.set(row.id, row);
  });
  liveRows.forEach((seed) => {
    if (!seed?.id) return;
    const prev = byId.get(seed.id);
    if (!prev) {
      byId.set(seed.id, seed);
      return;
    }
    byId.set(seed.id, {
      ...prev,
      ...seed,
      employeeMyTaskItem: seed.employeeMyTaskItem || prev.employeeMyTaskItem,
      employeeTaskActivityInstanceId:
        seed.employeeTaskActivityInstanceId || prev.employeeTaskActivityInstanceId,
      employeeDisplayStatusHint: seed.employeeDisplayStatusHint || prev.employeeDisplayStatusHint,
      raw: prev.raw && seed.raw ? { ...prev.raw, ...seed.raw } : (seed.raw || prev.raw),
    });
  });
  return Array.from(byId.values());
}

export async function fetchRefexEmployeeTickets(
  kfInstance,
  user,
  { forceRefresh = false, softRefresh = false, reportFilters = {} } = {},
) {
  if (softRefresh && !forceRefresh) {
    const [reportItems, taskItems] = await Promise.all([
      fetchAllReportItems(kfInstance, { force: false, filters: reportFilters }).catch((err) => {
        console.warn('Employee report soft load failed:', err?.message || err);
        return [];
      }),
      fetchEmployeeTaskItems(kfInstance),
    ]);
    const taskById = indexTasksByInstanceId(taskItems);
    return mapEmployeeRows(reportItems, new Map(), taskById, user);
  }

  // Task items reuse the seed's fetch (TTL cache) instead of forcing a
  // second identical round of myitems calls in the same load cycle.
  const [reportItems, taskItems, completedItems] = await Promise.all([
    fetchAllReportItems(kfInstance, { force: forceRefresh, filters: reportFilters }).catch((err) => {
      console.warn('Employee report load failed:', err?.message || err);
      return [];
    }),
    fetchEmployeeTaskItems(kfInstance),
    fetchCompletedItems(kfInstance).catch(() => []),
  ]);

  const taskById = indexTasksByInstanceId(taskItems);
  const completedById = indexCompletedByInstanceId(completedItems);

  return mapEmployeeRows(reportItems, completedById, taskById, user);
}
