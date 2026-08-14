/**
 * Pending refresh markers + reload scheduling after Kissflow form edit.
 * Uses localStorage, sessionStorage, and Kissflow app variables because
 * openPage navigation often keeps the dashboard mounted without firing
 * focus / visibility events.
 */

const DEFAULT_RETRY_DELAYS_MS = [0, 400, 1200, 2500];

export const IT_DASHBOARD_PENDING_REFRESH_KEY = 'it-dashboard-pending-refresh';
export const IT_DASHBOARD_PENDING_REFRESH_VAR = 'it_dashboard_pending_refresh';

function writeStorageMarker(marker) {
  try {
    localStorage.setItem(IT_DASHBOARD_PENDING_REFRESH_KEY, marker);
  } catch {
    /* storage unavailable */
  }
  try {
    sessionStorage.setItem(IT_DASHBOARD_PENDING_REFRESH_KEY, marker);
  } catch {
    /* storage unavailable */
  }
}

function readStorageMarker() {
  try {
    return localStorage.getItem(IT_DASHBOARD_PENDING_REFRESH_KEY)
      || sessionStorage.getItem(IT_DASHBOARD_PENDING_REFRESH_KEY)
      || '';
  } catch {
    return '';
  }
}

function clearStorageMarker() {
  try {
    localStorage.removeItem(IT_DASHBOARD_PENDING_REFRESH_KEY);
  } catch {
    /* storage unavailable */
  }
  try {
    sessionStorage.removeItem(IT_DASHBOARD_PENDING_REFRESH_KEY);
  } catch {
    /* storage unavailable */
  }
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

export function markITDashboardPendingRefresh(kfInstance = null) {
  const marker = String(Date.now());
  writeStorageMarker(marker);
  try {
    const setVar = kfInstance?.app?.setVariable;
    if (typeof setVar === 'function') {
      Promise.resolve(setVar.call(kfInstance.app, IT_DASHBOARD_PENDING_REFRESH_VAR, marker)).catch(() => {});
    }
  } catch {
    /* Kissflow app variable unavailable */
  }
  return marker;
}

export function clearITDashboardPendingRefresh(kfInstance = null) {
  clearStorageMarker();
  try {
    const setVar = kfInstance?.app?.setVariable;
    if (typeof setVar === 'function') {
      Promise.resolve(setVar.call(kfInstance.app, IT_DASHBOARD_PENDING_REFRESH_VAR, '')).catch(() => {});
    }
  } catch {
    /* Kissflow app variable unavailable */
  }
}

export function hasITDashboardPendingRefresh() {
  return Boolean(readStorageMarker());
}

export function getITDashboardPendingRefreshAgeMs() {
  const marker = readStorageMarker();
  const ts = Number(marker);
  if (!Number.isFinite(ts) || ts <= 0) return 0;
  return Math.max(0, Date.now() - ts);
}

export async function hasITDashboardPendingRefreshAsync(kfInstance = null) {
  if (hasITDashboardPendingRefresh()) return true;
  try {
    const getVar = kfInstance?.app?.getVariable;
    if (typeof getVar !== 'function') return false;
    const value = await getVar.call(kfInstance.app, IT_DASHBOARD_PENDING_REFRESH_VAR);
    return Boolean(normalizeText(value));
  } catch {
    return false;
  }
}

export function createFormReturnRefreshScheduler(requestRefresh, retryDelaysMs = DEFAULT_RETRY_DELAYS_MS) {
  let session = 0;
  let timers = [];

  const clearTimers = () => {
    timers.forEach((timerId) => clearTimeout(timerId));
    timers = [];
  };

  const schedule = (sessionId) => {
    clearTimers();
    retryDelaysMs.forEach((delay) => {
      const timerId = setTimeout(() => {
        if (session !== sessionId) return;
        requestRefresh({ background: true });
      }, delay);
      timers.push(timerId);
    });
  };

  return {
    trigger() {
      const sessionId = ++session;
      schedule(sessionId);
      return sessionId;
    },

    cancel() {
      session += 1;
      clearTimers();
    },
  };
}
