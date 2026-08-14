/**
 * Limit expensive full-report reloads to once per local calendar day.
 * Soft Refresh stays delta-based the rest of the day (smooth UX).
 * First Refresh of the day upgrades to a full IndexedDB rebuild so admin
 * field edits/deletes are picked up.
 */

const STORAGE_KEY = 'refexItsm.dailyFullRefresh.v1';

/** In-memory fallback when localStorage is unavailable (Node / private mode). */
let memoryStore = {};

/** Local calendar day key — YYYY-MM-DD. */
export function getCalendarDayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readStore() {
  if (typeof localStorage === 'undefined') return { ...memoryStore };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { ...memoryStore };
  }
}

function writeStore(store) {
  memoryStore = { ...(store || {}) };
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore));
  } catch {
    // Quota / private mode — memoryStore still works for this session.
  }
}

export function shouldRunDailyFullRefresh(scopeKey) {
  const key = String(scopeKey || '').trim();
  if (!key) return false;
  const today = getCalendarDayKey();
  if (!today) return false;
  const store = readStore();
  return store[key] !== today;
}

export function markDailyFullRefreshDone(scopeKey, dayKey = getCalendarDayKey()) {
  const key = String(scopeKey || '').trim();
  if (!key || !dayKey) return;
  const store = readStore();
  store[key] = dayKey;
  writeStore(store);
}

/**
 * Returns true once per day per scopeKey, then marks the day as done.
 * Concurrent callers in the same tick may both get true — acceptable for refresh.
 */
export function consumeDailyFullRefresh(scopeKey) {
  if (!shouldRunDailyFullRefresh(scopeKey)) return false;
  markDailyFullRefreshDone(scopeKey);
  return true;
}
