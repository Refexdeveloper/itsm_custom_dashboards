/**
 * Refex full service-queue dataset cache (mapped rows).
 * Initial landing uses My Task seed only; this store loads the Main Report
 * after paint and reuses the result for My Team / silent enrichment.
 * Mapping and matchers are unchanged — this only controls when fetch runs.
 */
import {
  fetchRefexTechSupportTickets,
  fetchRefexMonitoringServiceTickets,
} from '../techsupport/fetchRefexTechSupportTickets.js';
import { fetchRefexEmployeeTickets } from '../employeedashboard/fetchEmployeeTickets.js';
import {
  buildRefexReportCacheKey,
  invalidateRefexReportCache,
} from './refexReportCache.js';
import { clearPersistentReportCache } from './refexPersistentReportCache.js';
import { buildReportFilterCacheSuffix } from './refexReportQuery.js';
import { consumeDailyFullRefresh } from './refexDailyFullRefresh.js';

/** @type {Map<string, { rows: any[], at: number }>} */
const mappedCache = new Map();

/** @type {Map<string, Promise<any[]>>} */
const inflightMapped = new Map();

function datasetKey(kind, kfInstance, userId = '') {
  return `${kind}|${buildRefexReportCacheKey(kfInstance)}|${userId || 'anon'}`;
}

function resolveUserId(user) {
  return String(user?._id || user?.Id || user?.Email || '').trim();
}

export function getCachedRefexMappedRows(kind, kfInstance, user = null, reportFilters = {}) {
  const filterSuffix = JSON.stringify(reportFilters || {});
  const key = `${datasetKey(kind, kfInstance, resolveUserId(user))}|${filterSuffix}`;
  return mappedCache.get(key)?.rows ?? null;
}

export function setCachedRefexMappedRows(kind, kfInstance, user, rows, reportFilters = {}) {
  const filterSuffix = JSON.stringify(reportFilters || {});
  const key = `${datasetKey(kind, kfInstance, resolveUserId(user))}|${filterSuffix}`;
  mappedCache.set(key, { rows: Array.isArray(rows) ? rows : [], at: Date.now() });
}

export function invalidateRefexMappedDataset(kind = null, kfInstance = null, user = null, {
  clearPersistent = false,
  reportFilters = {},
} = {}) {
  if (!kind) {
    mappedCache.clear();
    inflightMapped.clear();
    invalidateRefexReportCache();
    if (clearPersistent) void clearPersistentReportCache();
    return;
  }
  const filterSuffix = JSON.stringify(reportFilters || {});
  const key = `${datasetKey(kind, kfInstance, resolveUserId(user))}|${filterSuffix}`;
  mappedCache.delete(key);
  inflightMapped.delete(key);
  // Also clear legacy key without filter suffix.
  mappedCache.delete(datasetKey(kind, kfInstance, resolveUserId(user)));
  if (kfInstance) invalidateRefexReportCache(buildRefexReportCacheKey(kfInstance));
  if (clearPersistent) void clearPersistentReportCache();
}

/**
 * Ensure full mapped dataset is available. Uses cache when present;
 * coalesces concurrent callers; forceRefresh bypasses memory cache.
 * softRefresh = Refresh button — report delta most of the day; first Refresh
 * of each local calendar day upgrades to a full IndexedDB rebuild (admin edits).
 */
export async function ensureRefexMappedDataset(
  kind,
  kfInstance,
  user = null,
  { forceRefresh = false, softRefresh = false, reportFilters = {} } = {},
) {
  const filterSuffix = JSON.stringify(reportFilters || {});
  const key = `${datasetKey(kind, kfInstance, resolveUserId(user))}|${filterSuffix}`;
  const dayScope = buildRefexReportCacheKey(kfInstance);
  let nextForce = Boolean(forceRefresh);
  let nextSoft = Boolean(softRefresh) && !nextForce;

  // Once per day: Refresh upgrades soft → full so admin field edits/deletes sync.
  // UI stays silent (no center loader); only the data fetch is heavier.
  if (nextSoft && !nextForce && consumeDailyFullRefresh(dayScope)) {
    nextForce = true;
    nextSoft = false;
    const persistKey = `${dayScope}|${buildReportFilterCacheSuffix(reportFilters || {})}`;
    await clearPersistentReportCache(persistKey);
    invalidateRefexReportCache(dayScope);
  }

  // Soft refresh always revalidates via delta, but keeps IndexedDB.
  if (!nextForce && !nextSoft) {
    const hit = mappedCache.get(key);
    if (hit?.rows) return hit.rows;
    const pending = inflightMapped.get(key);
    if (pending) return pending;
  } else {
    mappedCache.delete(key);
    inflightMapped.delete(key);
  }

  const promise = (async () => {
    let rows = [];
    if (kind === 'techSupport') {
      rows = await fetchRefexTechSupportTickets(kfInstance, user, {
        forceRefresh: nextForce,
        softRefresh: nextSoft,
        reportFilters,
      });
    } else if (kind === 'employee') {
      rows = await fetchRefexEmployeeTickets(kfInstance, user, {
        forceRefresh: nextForce,
        softRefresh: nextSoft,
        reportFilters,
      });
    } else {
      rows = await fetchRefexMonitoringServiceTickets(kfInstance, user, {
        forceRefresh: nextForce,
        softRefresh: nextSoft,
        reportFilters,
      });
    }
    mappedCache.set(key, { rows: Array.isArray(rows) ? rows : [], at: Date.now() });
    return mappedCache.get(key).rows;
  })().finally(() => {
    inflightMapped.delete(key);
  });

  inflightMapped.set(key, promise);
  return promise;
}

/**
 * Schedule full dataset load off the critical path.
 * @param {{ forceRefresh?: boolean, onReady?: Function, loadFn?: Function|null, delayMs?: number }} [options]
 * delayMs > 0 waits that long, then uses requestIdleCallback so Me landing stays fast.
 */
export function scheduleRefexMappedDatasetLoad(kind, kfInstance, user, {
  forceRefresh = false,
  onReady,
  loadFn = null,
  delayMs = 0,
} = {}) {
  const run = () => {
    const load = typeof loadFn === 'function'
      ? loadFn()
      : ensureRefexMappedDataset(kind, kfInstance, user, { forceRefresh });
    Promise.resolve(load)
      .then((rows) => {
        if (typeof onReady === 'function') onReady(rows);
      })
      .catch((err) => {
        console.warn(`Refex ${kind} background dataset load failed:`, err?.message || err);
        // Always settle so callers are not left waiting.
        if (typeof onReady === 'function') onReady(null);
      });
  };

  const start = () => {
    if (
      delayMs > 0
      && typeof window !== 'undefined'
      && typeof window.requestIdleCallback === 'function'
    ) {
      window.requestIdleCallback(run, { timeout: Math.max(1500, delayMs) });
      return;
    }
    run();
  };

  if (delayMs > 0) {
    setTimeout(start, delayMs);
    return;
  }

  // Immediate background schedule (My Team / explicit warm).
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      setTimeout(run, 0);
    });
  } else {
    setTimeout(run, 0);
  }
}
