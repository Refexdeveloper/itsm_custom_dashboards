/**
 * Cache for NewCeo / Travel / Expense CEO GCP payloads.
 * Dashboard (small) → sessionStorage. Records (large) → IndexedDB.
 * Does not touch Kissflow Me / employee landing caches.
 */

const memory = new Map();
const DASH_PREFIX = 'itsm-ne-gcp-dash:';
const DB_NAME = 'itsmNeGcpCache';
const DB_VERSION = 1;
const STORE = 'payloads';

function dashKey(appId) {
  return `${DASH_PREFIX}${appId || 'app'}`;
}

export function readNeGcpMemory(appId) {
  return memory.get(appId) || null;
}

export function writeNeGcpMemory(appId, payload) {
  if (!appId || !payload) return;
  const prev = memory.get(appId) || {};
  memory.set(appId, {
    dashboard: payload.dashboard ?? prev.dashboard ?? null,
    records: Array.isArray(payload.records) ? payload.records : (prev.records || []),
    at: Date.now(),
  });
}

export function readNeGcpDashboardCache(appId) {
  const mem = readNeGcpMemory(appId);
  if (mem?.dashboard) return mem.dashboard;
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(dashKey(appId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeNeGcpDashboardCache(appId, dashboard) {
  if (!appId || !dashboard) return;
  writeNeGcpMemory(appId, { dashboard, records: readNeGcpMemory(appId)?.records });
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(dashKey(appId), JSON.stringify(dashboard));
  } catch {
    /* quota / private mode */
  }
}

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function readNeGcpRecordsCache(appId) {
  const mem = readNeGcpMemory(appId);
  if (mem?.records?.length) return mem.records;
  const db = await openDb();
  if (!db || !appId) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(appId);
      req.onsuccess = () => {
        const row = req.result;
        resolve(Array.isArray(row?.records) ? row.records : []);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function writeNeGcpRecordsCache(appId, records) {
  writeNeGcpMemory(appId, { dashboard: readNeGcpMemory(appId)?.dashboard, records });
  const db = await openDb();
  if (!db || !appId) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({
        key: appId,
        records: Array.isArray(records) ? records : [],
        at: Date.now(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
