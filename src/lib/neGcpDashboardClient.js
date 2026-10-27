/**
 * Notification Engine (GCP) Tech Helpdesk APIs.
 * Used only by NewCeo / Travel / Expense CEO — no Kissflow ticket/report calls.
 * Landing: cache + dashboard first, inventory after. Does not change incremental sync.
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

async function getJson(path) {
  const url = `${NE_GCP_API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GCP dashboard ${res.status} ${path}`);
  }
  const body = await res.json();
  if (body && body.success === false) {
    throw new Error(body.error || `GCP dashboard failed ${path}`);
  }
  return body.data || body;
}

/** Engagement metrics and app roster. Not awaited on landing — fast=1 used to block the first paint. */
export async function fetchNeAppDashboard(appId = NE_ITSM_APP_ID) {
  const data = await getJson(
    `/dashboard/application/${encodeURIComponent(appId)}?environment=production&period=fy&fast=1&stale=1`,
  );
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data;
}

export async function fetchNeAppInventory(appId = NE_ITSM_APP_ID) {
  const data = await getJson(
    `/dashboard/application/${encodeURIComponent(appId)}/records?environment=production&inventory=1`,
  );
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchNeItsmDashboard() {
  return fetchNeAppDashboard(NE_ITSM_APP_ID);
}

export async function fetchNeItsmInventory() {
  return fetchNeAppInventory(NE_ITSM_APP_ID);
}

export async function loadNeAppGcpPayload(appId = NE_ITSM_APP_ID, { onPartial, onError } = {}) {
  const emit = (payload) => {
    if (!payload) return;
    writeNeGcpMemory(appId, payload);
    onPartial?.(payload);
  };

  const cachedDash = readNeGcpDashboardCache(appId);
  const mem = readNeGcpMemory(appId);
  if (cachedDash || mem?.records?.length) {
    emit({ dashboard: cachedDash || mem?.dashboard || null, records: mem?.records || [] });
  }

  const latestDashboard = () => readNeGcpMemory(appId)?.dashboard || readNeGcpDashboardCache(appId) || null;
  const latestRecords = () => readNeGcpMemory(appId)?.records || [];

  void fetchNeAppDashboard(appId).then((dashboard) => {
    if (!dashboard) return;
    writeNeGcpDashboardCache(appId, dashboard);
    emit({ dashboard, records: latestRecords() });
  }).catch((err) => {
    console.warn('GCP engagement metrics load failed:', err?.message || err);
  });

  const invPromise = fetchNeAppInventory(appId).then((records) => {
    const full = { dashboard: latestDashboard(), records };
    writeNeGcpMemory(appId, full);
    void writeNeGcpRecordsCache(appId, records);
    emit(full);
    return full;
  });
  const idbPromise = mem?.records?.length ? Promise.resolve(mem.records) : readNeGcpRecordsCache(appId);
  void idbPromise.then((idbRecords) => {
    if (idbRecords?.length) {
      emit({
        dashboard: latestDashboard(),
        records: idbRecords,
      });
    }
  }).catch(() => {});

  void invPromise.catch((err) => {
    console.warn('GCP inventory load failed:', err?.message || err);
    if (typeof onError === 'function') onError(err);
  });
  return { dashboard: cachedDash || mem?.dashboard || null, records: mem?.records || [] };
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
