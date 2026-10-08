/**
 * Notification Engine (GCP) Tech Helpdesk APIs.
 * Used only by newceodashboard — no Kissflow ticket/report calls.
 */
export const NE_GCP_API_BASE = 'https://refex-backend-api-dhwffeu7pq-el.a.run.app/api/v1';
export const NE_ITSM_APP_ID = 'IT_Service_Management_A00';

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

export async function fetchNeItsmDashboard() {
  return getJson(`/dashboard/application/${encodeURIComponent(NE_ITSM_APP_ID)}?environment=Production&fast=1&stale=1`);
}

export async function fetchNeItsmInventory() {
  const data = await getJson(
    `/dashboard/application/${encodeURIComponent(NE_ITSM_APP_ID)}/records?environment=production&inventory=1`,
  );
  return Array.isArray(data.items) ? data.items : [];
}

export async function loadNeItsmGcpPayload() {
  const [dashboard, records] = await Promise.all([
    fetchNeItsmDashboard(),
    fetchNeItsmInventory(),
  ]);
  return { dashboard, records };
}
