/**
 * IndexedDB persistence for process-report items.
 * Full report cached once; later refreshes merge InProgress/Completed deltas.
 */

const DB_NAME = 'refexItsmReportCache';
const DB_VERSION = 1;
const STORE = 'reports';

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

export async function getPersistentReportCache(key) {
  const db = await openDb();
  if (!db || !key) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const row = req.result;
        if (!row || !Array.isArray(row.items)) {
          resolve(null);
          return;
        }
        resolve({
          items: row.items,
          lastSyncAt: row.lastSyncAt || '',
          at: row.at || 0,
        });
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function setPersistentReportCache(key, { items, lastSyncAt }) {
  const db = await openDb();
  if (!db || !key) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({
        key,
        items: Array.isArray(items) ? items : [],
        lastSyncAt: lastSyncAt || '',
        at: Date.now(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function clearPersistentReportCache(key = null) {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      if (key) store.delete(key);
      else store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
