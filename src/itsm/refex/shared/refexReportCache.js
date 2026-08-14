/**
 * In-memory cache for Refex Service_Items report pages.
 * Reused across tabs/scope within a session; invalidated on force refresh.
 * Does not change mapping or business rules — only avoids repeat HTTP.
 */
import { resolveAccountId, APP_ID, getActiveDashboardProfile, getActiveServiceProcessId } from '../../../lib/kfITServiceDashboard.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** @type {{ key: string, items: any[], at: number } | null} */
let reportCache = null;

/** In-flight fetch coalescing — concurrent callers share one report walk. */
/** @type {Map<string, Promise<any[]>>} */
const inflight = new Map();

export function buildRefexReportCacheKey(kfInstance) {
  const accountId = resolveAccountId(kfInstance) || 'unknown';
  const reportId = getActiveDashboardProfile()?.serviceReportId || 'Service_Items_Refex';
  const processId = getActiveServiceProcessId();
  return `${accountId}|${processId}|${reportId}|${APP_ID}`;
}

export function getCachedRefexReportItems(cacheKey, { ttlMs = DEFAULT_TTL_MS } = {}) {
  if (!reportCache || reportCache.key !== cacheKey) return null;
  if (Date.now() - reportCache.at > ttlMs) return null;
  return reportCache.items;
}

export function setCachedRefexReportItems(cacheKey, items) {
  reportCache = {
    key: cacheKey,
    items: Array.isArray(items) ? items : [],
    at: Date.now(),
  };
}

export function invalidateRefexReportCache(cacheKey = null) {
  if (!cacheKey || reportCache?.key === cacheKey) {
    reportCache = null;
  }
}

/**
 * Return cached report items or run fetchFn once and cache the result.
 * Concurrent callers with the same key await the same promise.
 */
export async function fetchRefexReportItemsCached(kfInstance, fetchFn, { force = false, ttlMs = DEFAULT_TTL_MS } = {}) {
  const key = buildRefexReportCacheKey(kfInstance);
  if (!force) {
    const hit = getCachedRefexReportItems(key, { ttlMs });
    if (hit) return hit;
  } else {
    invalidateRefexReportCache(key);
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = Promise.resolve()
    .then(() => fetchFn(kfInstance))
    .then((items) => {
      const list = Array.isArray(items) ? items : [];
      setCachedRefexReportItems(key, list);
      return list;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
