import { kfGetJson } from '../../../lib/kfRuntime.js';
import {
  APP_ID,
  getActiveServiceProcessId,
  extractItemsFromResponse,
  fetchITServiceReport,
  isMyItem,
  resolveAccountId,
  sortDashboardRowsByTicketOrder,
  getActiveDashboardProfile,
  REFEX_REPORT_PAGE_SIZE,
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
import { toKissflowUtcIso, buildReportFilterCacheSuffix } from '../shared/refexReportQuery.js';

/** Employee Feedback step activity ids — profile-aware (Refex / Extrovis share this flow). */
function getEmployeeFeedbackActivityIds() {
  const profile = getActiveDashboardProfile();
  const ids = [
    profile?.employeeFeedbackActivityId,
    profile?.employeeFeedbackActivityIdLegacy,
    EMPLOYEE_APPROVAL_ACTIVITY_ID,
    EMPLOYEE_APPROVAL_ACTIVITY_ID_LEGACY,
  ].filter(Boolean);
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
    myItemsPath(status = 'all', pageNumber = 1, pageSize = REFEX_REPORT_PAGE_SIZE) {
      return `${base}/myitems/${status}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
  };
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function isEmployeeApprovalTask(item) {
  const activityId = normalizeText(item?._activity_id || item?.Activity_ID || item?.activity_id);
  if (getEmployeeFeedbackActivityIds().includes(activityId)) return true;
  const step = normalizeText(item?._current_step || item?.Current_Step).toLowerCase();
  return step === EMPLOYEE_APPROVAL_STEP_LABEL.toLowerCase()
    || step.includes('employee verification')
    || step.includes('employee feedback')
    || step.includes('employee approval');
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
      const [inProgressDelta, completedDelta] = await Promise.all([
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          status: 'InProgress',
          modifiedAtGt: persisted.lastSyncAt,
        }).catch((err) => {
          console.warn('Employee InProgress delta failed:', err?.message || err);
          return [];
        }),
        fetchAllReportItemsUncached(kfInstance, REFEX_REPORT_PAGE_SIZE, {
          entity: filters.entity || '',
          status: 'Completed',
          modifiedAtGt: persisted.lastSyncAt,
        }).catch((err) => {
          console.warn('Employee Completed delta failed:', err?.message || err);
          return [];
        }),
      ]);
      const merged = mergeReportItemsById(persisted.items, inProgressDelta, completedDelta);
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

async function fetchEmployeeTaskItemsUncached(kfInstance) {
  const paths = buildProcessPaths(kfInstance);

  const pendingPromises = getEmployeeFeedbackActivityIds().map((activityId) => (
    kfGetJson(kfInstance, paths.pendingAtStepPath(activityId, 1, REFEX_REPORT_PAGE_SIZE))
      .then((resp) => extractItemsFromResponse(resp).filter(isEmployeeApprovalTask))
      .catch((err) => {
        console.warn(`Refex employee pending/${activityId} failed:`, err?.message || err);
        return [];
      })
  ));

  // Employee Feedback tasks assigned to me live in myitems/inprogress;
  // myitems/pending and myitems/all were redundant and have been removed.
  const inProgressPromise = kfGetJson(kfInstance, paths.myItemsPath('inprogress', 1, REFEX_REPORT_PAGE_SIZE))
    .then((resp) => extractItemsFromResponse(resp).filter(isEmployeeApprovalTask))
    .catch((err) => {
      console.warn('Refex employee myitems/inprogress failed:', err?.message || err);
      return [];
    });

  const batches = await Promise.all([...pendingPromises, inProgressPromise]);
  return batches.flat();
}

const TASK_ITEMS_TTL_MS = 15000;
let taskItemsCache = { key: '', at: 0, promise: null };

/**
 * Coalesces the seed load and the background full-dataset load into a single
 * network round: within the TTL both reuse the same in-flight/settled promise.
 */
export function fetchEmployeeTaskItems(kfInstance, { force = false } = {}) {
  if (!kfInstance?.api) return Promise.resolve([]);
  const key = `${resolveAccountId(kfInstance) || ''}|${getEmployeeFeedbackActivityIds().join(',')}`;
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
    .filter((row) => isMyItem(row, user))
    .filter((row) => {
      const raw = row.createdAtRaw || row.requestedDateTimeRaw || row.requestedDate;
      if (!raw) return true;
      return isInCurrentFinancialYear(raw);
    })
    .map((row) => enrichEmployeeRowCompletion(row, completedById))
    .map((row) => mergeEmployeeRowWithTask(row, taskById.get(row.id), user));

  const deduped = dedupeEmployeeRows(rows);
  return sortDashboardRowsByTicketOrder(deduped, 'asc') || [];
}

/**
 * Fast landing seed — Employee Feedback pending/myitems only (no Main Report walk).
 */
export async function fetchRefexEmployeeMyTaskSeed(kfInstance, user, { force = false } = {}) {
  const taskItems = await fetchEmployeeTaskItems(kfInstance, { force });
  const taskById = indexTasksByInstanceId(taskItems);
  return mapEmployeeRows(taskItems, new Map(), taskById, user);
}

export async function fetchRefexEmployeeTickets(
  kfInstance,
  user,
  { forceRefresh = false, softRefresh = false, reportFilters = {} } = {},
) {
  if (softRefresh && !forceRefresh) {
    const [reportItems, taskItems] = await Promise.all([
      fetchAllReportItems(kfInstance, { force: false, filters: reportFilters }),
      fetchEmployeeTaskItems(kfInstance),
    ]);
    const taskById = indexTasksByInstanceId(taskItems);
    return mapEmployeeRows(reportItems, new Map(), taskById, user);
  }

  // Task items reuse the seed's fetch (TTL cache) instead of forcing a
  // second identical round of myitems calls in the same load cycle.
  const [reportItems, taskItems, completedItems] = await Promise.all([
    fetchAllReportItems(kfInstance, { force: forceRefresh, filters: reportFilters }),
    fetchEmployeeTaskItems(kfInstance),
    fetchCompletedItems(kfInstance),
  ]);

  const taskById = indexTasksByInstanceId(taskItems);
  const completedById = indexCompletedByInstanceId(completedItems);

  return mapEmployeeRows(reportItems, completedById, taskById, user);
}
