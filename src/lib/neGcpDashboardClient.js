/**
 * Notification Engine (GCP) Tech Helpdesk APIs.
 * Used only by NewCeo / Travel / Expense CEO — no Kissflow ticket/report calls.
 * Landing: cache + dashboard first, inventory after. Does not change incremental sync.
 *
 * Mobile / Kissflow: inventory can hang on cellular; KPIs must paint from dashboard
 * and settle the MIS shell even if records are still downloading.
 */
import {
  readNeGcpDashboardCache,
  readNeGcpMemory,
  readNeGcpRecordsCache,
  writeNeGcpDashboardCache,
  writeNeGcpMemory,
  writeNeGcpRecordsCache,
} from './neGcpLandingCache.js';
const NE_GCP_API_BASE_DEFAULT = 'https://refex-backend-api-dhwffeu7pq-el.a.run.app/api/v1';
export const NE_GCP_API_BASE = String(import.meta.env.VITE_NE_GCP_API_BASE || NE_GCP_API_BASE_DEFAULT).replace(/\/$/, '');
export const NE_ITSM_APP_ID = 'IT_Service_Management_A00';
export const NE_TRAVEL_APP_ID = 'Expense_and_Travel_Management_A00';
export const NE_EXPENSE_APP_ID = 'EMS_001_A00';
export const NE_SOLAR_APP_ID = 'Solar_Site_Expense_Governance_Syst_A00';

/** Soft UI settle while inventory keeps downloading in the background (mobile Kissflow). */
const INVENTORY_UI_SETTLE_MS = 18000;
/** Hard abort so hung inventory cannot pin the tab forever on weak networks. */
const INVENTORY_FETCH_TIMEOUT_MS = 55000;
const DASHBOARD_FETCH_TIMEOUT_MS = 90000;

async function getJson(path, { timeoutMs = DASHBOARD_FETCH_TIMEOUT_MS } = {}) {
  const url = `${NE_GCP_API_BASE}${path}`;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl && timeoutMs > 0
    ? setTimeout(() => {
      try { ctrl.abort(); } catch { /* ignore */ }
    }, timeoutMs)
    : null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: ctrl?.signal,
    });
    if (!res.ok) {
      throw new Error(`GCP dashboard ${res.status} ${path}`);
    }
    const body = await res.json();
    if (body && body.success === false) {
      throw new Error(body.error || `GCP dashboard failed ${path}`);
    }
    return body.data || body;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`GCP dashboard timed out after ${timeoutMs}ms (${path})`);
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Engagement metrics and app roster. Not awaited on landing — fast=1 used to block the first paint. */
export async function fetchNeAppDashboard(appId = NE_ITSM_APP_ID) {
  const data = await getJson(
    `/dashboard/application/${encodeURIComponent(appId)}?environment=production&period=fy&fast=1&stale=1`,
    { timeoutMs: DASHBOARD_FETCH_TIMEOUT_MS },
  );
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data;
}

export async function fetchNeAppInventory(appId = NE_ITSM_APP_ID) {
  const data = await getJson(
    `/dashboard/application/${encodeURIComponent(appId)}/records?environment=production&inventory=1`,
    { timeoutMs: INVENTORY_FETCH_TIMEOUT_MS },
  );
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchNeItsmDashboard() {
  return fetchNeAppDashboard(NE_ITSM_APP_ID);
}

export async function fetchNeItsmInventory() {
  return fetchNeAppInventory(NE_ITSM_APP_ID);
}

export async function loadNeAppGcpPayload(appId = NE_ITSM_APP_ID, { onPartial, onError, refresh = false } = {}) {
  const emit = (payload) => {
    if (!payload) return;
    writeNeGcpMemory(appId, payload);
    onPartial?.(payload);
  };

  const cachedDash = readNeGcpDashboardCache(appId);
  const mem = readNeGcpMemory(appId);
  if (!refresh && (cachedDash || mem?.records?.length)) {
    emit({ dashboard: cachedDash || mem?.dashboard || null, records: mem?.records || [] });
  }

  const latestDashboard = () => readNeGcpMemory(appId)?.dashboard || readNeGcpDashboardCache(appId) || null;
  const latestRecords = () => readNeGcpMemory(appId)?.records || [];

  void fetchNeAppDashboard(appId).then((dashboard) => {
    if (!dashboard) return;
    writeNeGcpDashboardCache(appId, dashboard);
    // Mark settled for KPI paint; inventory may still be in flight.
    emit({ dashboard, records: latestRecords(), metricsReady: true });
  }).catch((err) => {
    console.warn('GCP engagement metrics load failed:', err?.message || err);
    emit({
      dashboard: latestDashboard(),
      records: latestRecords(),
      metricsReady: true,
      recordsSettled: true,
    });
    if (typeof onError === 'function' && !latestDashboard() && !latestRecords().length) {
      onError(err);
    }
  });

  const invPromise = fetchNeAppInventory(appId).then((records) => {
    const full = { dashboard: latestDashboard(), records, recordsSettled: true, metricsReady: true };
    writeNeGcpMemory(appId, full);
    void writeNeGcpRecordsCache(appId, records);
    emit(full);
    return full;
  });

  // Soft settle: stop infinite table skeletons when inventory hangs on mobile.
  // KPIs unlock only once dashboard (or cached rows) exists — not empty zeros.
  const softSettleTimer = setTimeout(() => {
    const dash = latestDashboard();
    const rows = latestRecords();
    emit({
      dashboard: dash,
      records: rows,
      metricsReady: Boolean(dash) || rows.length > 0,
      recordsSettled: true,
    });
  }, INVENTORY_UI_SETTLE_MS);

  const clearSoftSettle = () => clearTimeout(softSettleTimer);

  if (!refresh) {
    const idbPromise = mem?.records?.length ? Promise.resolve(mem.records) : readNeGcpRecordsCache(appId);
    void idbPromise.then((idbRecords) => {
      if (idbRecords?.length) {
        emit({
          dashboard: latestDashboard(),
          records: idbRecords,
          metricsReady: true,
        });
      }
    }).catch(() => {});

    void invPromise.then(() => {
      clearSoftSettle();
    }).catch((err) => {
      clearSoftSettle();
      console.warn('GCP inventory load failed:', err?.message || err);
      emit({
        dashboard: latestDashboard(),
        records: latestRecords(),
        recordsSettled: true,
        metricsReady: true,
      });
      if (typeof onError === 'function') onError(err);
    });
    return { dashboard: cachedDash || mem?.dashboard || null, records: mem?.records || [] };
  }

  // Refresh stays on this promise so the header icon keeps spinning until the MIS rows return.
  try {
    const full = await invPromise;
    clearSoftSettle();
    return full;
  } catch (err) {
    clearSoftSettle();
    console.warn('GCP inventory load failed:', err?.message || err);
    if (typeof onError === 'function') onError(err);
    return { dashboard: latestDashboard(), records: latestRecords(), recordsSettled: true, metricsReady: true };
  }
}

export function peekNeAppGcpCache(appId = NE_ITSM_APP_ID) {
  const mem = readNeGcpMemory(appId);
  return {
    dashboard: readNeGcpDashboardCache(appId) || mem?.dashboard || null,
    records: mem?.records || [],
  };
}

export async function loadNeItsmGcpPayload() {
  return loadNeAppGcpPayload(NE_ITSM_APP_ID);
}
