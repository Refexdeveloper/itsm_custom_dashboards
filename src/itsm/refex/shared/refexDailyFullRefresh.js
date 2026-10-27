/**
 * Limit expensive full-report reloads to once every 7 local calendar days.
 * Soft Refresh stays delta-based the rest of the week.
 * The first soft refresh after that gap upgrades to a full IndexedDB rebuild
 * so admin field edits and deletes are picked up.
 */

const STORAGE_KEY = 'refexItsm.dailyFullRefresh.v1';
const FULL_REFRESH_INTERVAL_DAYS = 7;

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

function parseCalendarDay(dayKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || '').trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function calendarDaysSince(dayKey, now = new Date()) {
  const stored = parseCalendarDay(dayKey);
  const today = parseCalendarDay(getCalendarDayKey(now));
  if (!stored || !today) return null;
  return Math.round((today.getTime() - stored.getTime()) / 86400000);
}

export function shouldRunDailyFullRefresh(scopeKey, now = new Date()) {
  const key = String(scopeKey || '').trim();
  if (!key) return false;
  const today = getCalendarDayKey(now);
  if (!today) return false;
  const store = readStore();
  const elapsed = calendarDaysSince(store[key], now);
  if (elapsed == null) return true;
  return elapsed >= FULL_REFRESH_INTERVAL_DAYS;
}

export function markDailyFullRefreshDone(scopeKey, dayKey = getCalendarDayKey()) {
  const key = String(scopeKey || '').trim();
  if (!key || !dayKey) return;
  const store = readStore();
  store[key] = dayKey;
  writeStore(store);
}

/**
 * Returns true at most once every 7 local days per scopeKey, then marks that day.
 * Concurrent callers in the same tick may both get true — acceptable for refresh.
 */
export function consumeDailyFullRefresh(scopeKey) {
  if (!shouldRunDailyFullRefresh(scopeKey)) return false;
  markDailyFullRefreshDone(scopeKey);
  return true;
}
