/**
 * Client-side filters / KPI counts for the GCP Tech Helpdesk payload.
 * Mirrors Notification Engine Company + User + Period — no Kissflow matchers.
 */

import { displayItsmPersonName, formatSlaDuration, isItsmBotOrSystemActor } from './kfITServiceDashboard.js';
import { canonicalizeTicketStage } from '../itsm/refex/employeedashboard/ticketStage.js';

export function istTodayYmd(now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function istParts(now = new Date()) {
  const [year, month, day] = istTodayYmd(now).split('-').map((n) => Number(n));
  return { year, month, day };
}

export function ymdFromIso(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(raw));
  } catch {
    return raw.slice(0, 10);
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function addDaysYmd(ymd, deltaDays) {
  const [y, m, d] = String(ymd || '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12));
  return dt.toISOString().slice(0, 10);
}

function mondayOf(ymd) {
  const [y, m, d] = String(ymd || '').slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = dt.getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  return addDaysYmd(ymd, -back);
}

function minYmd(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

/** Inclusive IST window — same presets as GCP Tech Helpdesk. */
export function resolveGcpPeriodRange(periodKey, now = new Date(), extras = {}) {
  const today = istTodayYmd(now);
  const { year, month } = istParts(now);
  const key = periodKey === 'daily' ? 'today' : periodKey === 'monthly' ? 'month' : periodKey;
  const dateFrom = String(extras.dateFrom || '').slice(0, 10);
  const dateTo = String(extras.dateTo || '').slice(0, 10);
  const calendarYear = Number(extras.calendarYear || year);
  const calendarMonth = Number(extras.calendarMonth || month);

  if (key === 'all') return { from: '', to: '' };
  if (key === 'today') return { from: today, to: today };
  if (key === 'month') {
    return { from: `${year}-${pad2(month)}-01`, to: today };
  }
  if (key === 'quarterly') {
    const qStart = Math.floor((month - 1) / 3) * 3 + 1;
    return { from: `${year}-${pad2(qStart)}-01`, to: today };
  }
  if (key === 'weekly') {
    if (dateFrom && dateTo) return { from: dateFrom, to: minYmd(dateTo, today) };
    return { from: mondayOf(today), to: today };
  }
  if (key === 'year') {
    const y = calendarYear || year;
    const end = y >= year ? today : `${y}-12-31`;
    return { from: `${y}-01-01`, to: minYmd(end, today) };
  }
  if (key === 'pick_month') {
    const lastDay = new Date(Date.UTC(calendarYear, calendarMonth, 0)).getUTCDate();
    const from = `${calendarYear}-${pad2(calendarMonth)}-01`;
    const end = `${calendarYear}-${pad2(calendarMonth)}-${pad2(lastDay)}`;
    return { from, to: minYmd(end, today) };
  }
  if (key === 'custom') {
    const from = dateFrom || today;
    const to = minYmd(dateTo || today, today);
    return { from: from <= to ? from : to, to };
  }
  const fyStartYear = month >= 4 ? year : year - 1;
  return { from: `${fyStartYear}-04-01`, to: today };
}

function compactName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Same compact key as NE `compactMisName` — drops trailing initials so "porchezhiyan M" matches "porchezhiyan". */
function compactMisName(value) {
  const parts = compactName(value).split(' ').filter(Boolean);
  while (parts.length > 1 && parts[parts.length - 1].length === 1) parts.pop();
  return parts.join('');
}

const NAME_ALIASES = {
  balarajuilaiveni: 'balarajuilaveni',
  kotipatchava: 'koteswararaopatchava',
};

function personMergeKey(value) {
  const compact = compactMisName(value) || compactName(value).replace(/\s+/g, '');
  if (!compact) return '';
  const aliased = NAME_ALIASES[compact] || compact;
  return aliased.replace(/ilaiveni/g, 'ilaveni');
}

function preferredPersonLabel(current, next) {
  const left = String(current || '').trim();
  const right = String(next || '').trim();
  if (!left) return right;
  if (!right) return left;
  const leftCased = left !== left.toLowerCase();
  const rightCased = right !== right.toLowerCase();
  if (rightCased && !leftCased) return right;
  if (right.length > left.length) return right;
  return left;
}

export function ceoStageLabel(value) {
  return canonicalizeTicketStage(value);
}

export function compareCreatedDesc(a, b) {
  const left = new Date(a?.created_at || a?.createdAtRaw || 0).getTime() || 0;
  const right = new Date(b?.created_at || b?.createdAtRaw || 0).getTime() || 0;
  if (right !== left) return right - left;
  return String(b?.request_id || b?.requestId || '').localeCompare(String(a?.request_id || a?.requestId || ''));
}

export function normalizeCompanyText(value) {
  return compactName(value);
}

export function companyIdFromLabel(label) {
  return normalizeCompanyText(label).replace(/\s+/g, '-');
}

function isEntityBucketLabel(value) {
  return /^(refex|extrovis|venwind|refex group|pharmacare|pharma pack|pharmapack|modepro|kavis|kavispharma)$/i.test(
    String(value || '').trim(),
  );
}

export function resolveCompanyIdFromText(raw) {
  const norm = normalizeCompanyText(raw);
  if (!norm) return '';
  if (norm === 'extrovis' || norm.includes('extrovis')) return 'extrovis';
  if (norm.includes('pharmacare') || norm.includes('pharma pack') || norm === 'pharmapack') return 'pharmacare';
  if (norm === 'modepro' || norm.includes('modepro') || norm.includes('mode pro')) return 'modepro';
  if (norm.includes('kavis')) return 'kavispharma';
  if (norm === 'refex' || norm === 'refex group') return '';
  return companyIdFromLabel(raw);
}

/** Same ITSM company match as GCP Tech Helpdesk — catalog id, not fuzzy name contains. */
export function recordMatchesCompany(row, companyKey) {
  if (!companyKey || companyKey === 'all') return true;
  const filter = resolveCompanyIdFromText(companyKey) || companyIdFromLabel(companyKey);
  if (!filter) return true;

  if (filter === 'extrovis' || filter === 'pharmacare' || filter === 'modepro' || filter === 'kavispharma') {
    const hay = normalizeCompanyText([
      row?.company_name,
      row?.company,
      row?.company_key,
      row?.entity,
      row?.entity_key,
    ].filter(Boolean).join(' '));
    if (filter === 'extrovis') return hay.includes('extrovis');
    if (filter === 'pharmacare') return hay.includes('pharmacare') || hay.includes('pharma pack') || hay.includes('pharmapack');
    if (filter === 'modepro') return hay.includes('modepro') || hay.includes('mode pro');
    return hay.includes('kavis');
  }

  const resolved = resolveCompanyIdFromText(row?.company_name)
    || resolveCompanyIdFromText(row?.company)
    || resolveCompanyIdFromText(row?.company_key);
  if (resolved) return resolved === filter;
  const text = String(row?.company_name || row?.company || '').trim();
  if (text && !isEntityBucketLabel(text)) return false;
  return filter === 'refex-industries-limited';
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function currentIndianFyStartYear(now = new Date()) {
  const { year, month } = istParts(now);
  return month >= 4 ? year : year - 1;
}

export function indianFyBounds(startYear, now = new Date()) {
  const today = istTodayYmd(now);
  const from = `${startYear}-04-01`;
  const end = `${startYear + 1}-03-31`;
  return {
    from,
    to: minYmd(end, today),
    label: `FY ${startYear}–${String(startYear + 1).slice(2)}`,
  };
}

export function availableIndianFyStartYears(span = 4, now = new Date()) {
  const cur = currentIndianFyStartYear(now);
  return Array.from({ length: span }, (_, index) => cur - index);
}

export function availableCalendarYears(span = 5, now = new Date()) {
  const { year } = istParts(now);
  return Array.from({ length: span }, (_, index) => year - index);
}

export function availableMonthsForYear(year, now = new Date()) {
  const parts = istParts(now);
  if (year < parts.year) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (year > parts.year) return [];
  return Array.from({ length: parts.month }, (_, index) => index + 1);
}

export function formatShortDay(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return ymd || '—';
  const [year, month, day] = ymd.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function weeksInMonth(year, month, now = new Date()) {
  const today = istTodayYmd(now);
  const monthStart = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  const currentFrom = mondayOf(today);
  const prevFrom = addDaysYmd(currentFrom, -7);
  const weeks = [];
  let cursor = mondayOf(monthStart);
  while (cursor <= monthEnd && cursor <= today) {
    const to = minYmd(addDaysYmd(cursor, 6), today);
    if (to >= monthStart && cursor <= monthEnd) {
      const isCurrent = cursor === currentFrom;
      const isPrevious = cursor === prevFrom;
      weeks.push({
        id: cursor,
        label: isCurrent ? 'Current week' : isPrevious ? 'Previous week' : `Week ${weeks.length + 1}`,
        from: cursor,
        to,
        badge: isCurrent ? 'THIS WEEK' : isPrevious ? 'LAST WEEK' : '',
        isCurrent,
      });
    }
    cursor = addDaysYmd(cursor, 7);
  }
  return weeks.reverse();
}

export function periodSummaryLabel(period, extras = {}, now = new Date()) {
  const today = istTodayYmd(now);
  const { year, month } = istParts(now);
  const calendarYear = Number(extras.calendarYear || year);
  const calendarMonth = Number(extras.calendarMonth || month);
  const dateFrom = String(extras.dateFrom || '').slice(0, 10);
  const dateTo = String(extras.dateTo || '').slice(0, 10);
  const key = period === 'today' ? 'daily' : period === 'month' ? 'monthly' : period;
  if (key === 'all') return 'All time';
  if (key === 'daily') return `Today`;
  if (key === 'monthly') return 'MTD';
  if (key === 'quarterly') return 'QTD';
  if (key === 'weekly') {
    if (dateFrom && dateTo) return `${formatShortDay(dateFrom)} → ${dateFrom === dateTo ? 'Today' : formatShortDay(dateTo)}`;
    return 'Current week';
  }
  if (key === 'fy') return indianFyBounds(currentIndianFyStartYear(now), now).label;
  if (key === 'year') return `Year ${calendarYear}`;
  if (key === 'pick_month') return `${MONTH_NAMES[calendarMonth - 1] || ''} ${calendarYear}`.trim();
  if (key === 'custom' && dateFrom && dateTo) {
    const fyStart = currentIndianFyStartYear(now);
    for (const start of availableIndianFyStartYears(4, now)) {
      const bounds = indianFyBounds(start, now);
      if (dateFrom === bounds.from && (dateTo === bounds.to || (start === fyStart && dateTo === today))) {
        return bounds.label;
      }
    }
    return `${formatShortDay(dateFrom)} → ${formatShortDay(dateTo)}`;
  }
  return 'Period';
}

export function recordMatchesUser(row, userKey) {
  if (!userKey) return true;
  const wantKey = personMergeKey(userKey);
  if (!wantKey) return true;
  const assigned = personMergeKey(humanAssigneeName(row) || row?.assigned_to);
  return Boolean(assigned && (assigned === wantKey || assigned.includes(wantKey) || wantKey.includes(assigned)));
}

export function recordMatchesPeriod(row, periodKey, now = new Date(), extras = {}) {
  const key = periodKey === 'daily' ? 'today' : periodKey === 'monthly' ? 'month' : periodKey;
  const { from, to } = resolveGcpPeriodRange(key, now, extras);
  if (!from && !to) return true;
  const created = ymdFromIso(row?.created_at);
  const closed = ymdFromIso(row?.closed_at);
  if (key === 'today') {
    return created === from || closed === from;
  }
  if (!created) return false;
  if (from && created < from) return false;
  if (to && created > to) return false;
  return true;
}

/** Refex IT Tech Reopen / Ticket Reopen + Extrovis ReOpen Window. Not Ticket Reopened. */
export function isGcpReopenHoldStep(row) {
  const hay = `${row?.current_step || ''} ${row?.status_raw || ''} ${row?.form_status || ''} ${row?.itemStatus || ''}`.toLowerCase();
  if (!hay.trim() || hay.includes('reopened')) return false;
  return (
    hay.includes('it tech reopen')
    || hay.includes('ticket reopen')
    || hay.includes('reopen window')
    || hay.includes('employee feedback')
  );
}

/** Closed Today = moved onto Ticket Reopen today. Never comment-bumped modified_at. */
export function gcpClosedTodayAt(row) {
  const reopenAt = String(row?.reopen_entered_at || '').trim();
  if (reopenAt) return reopenAt;
  if (isGcpReopenHoldStep(row)) return String(row?.agent_closed_at || '').trim() || '';
  return String(row?.closed_at || row?.closedOn || '').trim();
}

export function ceoRowMatchesKpi(row, kpiFocus, now = new Date()) {
  const status = String(row?.status || row?.ticketStatus || '').toLowerCase();
  const today = istTodayYmd(now);
  if (!kpiFocus) return true;
  if (kpiFocus === 'open') return status === 'open';
  if (kpiFocus === 'closed') return status === 'closed';
  if (kpiFocus === 'rejected') return status === 'rejected';
  if (kpiFocus === 'opened_today') return ymdFromIso(row?.created_at) === today;
  if (kpiFocus === 'closed_today') return status === 'closed' && ymdFromIso(gcpClosedTodayAt(row)) === today;
  return true;
}

export function filterGcpRecords(rows, {
  company = '',
  user = '',
  period = 'fy',
  dateFrom = '',
  dateTo = '',
  calendarYear,
  calendarMonth,
} = {}, now = new Date()) {
  return (rows || []).filter((row) => (
    recordMatchesCompany(row, company)
    && recordMatchesUser(row, user)
    && recordMatchesPeriod(row, period, now, { dateFrom, dateTo, calendarYear, calendarMonth })
  ));
}

export function summarizeGcpRecords(rows, now = new Date()) {
  const today = istTodayYmd(now);
  let open = 0;
  let closed = 0;
  let rejected = 0;
  let openedToday = 0;
  let closedToday = 0;
  const source = { Email: 0, WhatsApp: 0, Mobile: 0, Web: 0, Other: 0 };
  const todaySource = { Email: 0, WhatsApp: 0, Mobile: 0, Web: 0, Other: 0 };

  for (const row of rows || []) {
    const status = String(row?.status || '').toLowerCase();
    if (status === 'rejected') rejected += 1;
    else if (status === 'closed') closed += 1;
    else open += 1;

    const created = ymdFromIso(row?.created_at);
    const closedAt = status === 'closed' ? ymdFromIso(gcpClosedTodayAt(row)) : '';
    if (created === today) openedToday += 1;
    if (closedAt === today) closedToday += 1;

    const channel = classifyItsmSourceChannel(row?.source || row?.source_channel);
    source[channel] += 1;
    if (status === 'open' && created === today) todaySource[channel] += 1;
  }

  return {
    total: open + closed + rejected,
    open,
    closed,
    rejected,
    openedToday,
    closedToday,
    source,
    todaySource,
  };
}

export function engagementFromDashboard(dashboard) {
  const metrics = dashboard?.metrics || {};
  const roster = Array.isArray(dashboard?.app_users) ? dashboard.app_users : [];
  const usersCard = Number(metrics.total_users || roster.length || 0);
  return {
    adoptionOverall: Number(metrics.sign_in_rate_overall ?? metrics.user_adoption_pct ?? 0),
    adoptionToday: Number(metrics.sign_in_rate_today ?? 0),
    signedInToday: Number(metrics.signed_in_today ?? 0),
    usersCard,
    roster,
    ticketUsers: Array.isArray(dashboard?.users) ? dashboard.users : [],
  };
}

function isNonHumanItsmName(value) {
  if (isItsmBotOrSystemActor(value)) return true;
  const token = compactMisName(value) || compactName(value).replace(/\s+/g, '');
  return token === 'itsm'
    || token === 'itsmsa'
    || token.startsWith('itsmbot')
    || token === 'itsmserviceaccount'
    || token === 'itagents'
    || token === 'itagentsextrovis'
    || token === 'firstapproverextrovis'
    || token === 'firstapprover';
}

function humanLabel(value) {
  const name = displayItsmPersonName(String(value || '').trim());
  if (!name || name === '—' || name === '-') return '';
  if (isNonHumanItsmName(name)) return '';
  return name;
}

function humanAssigneeName(row) {
  return humanLabel(row?.assigned_to) || humanLabel(row?.closed_by);
}

function buildRosterLookup(roster = []) {
  const byKey = new Map();
  for (const user of roster || []) {
    const name = String(user?.user_name || '').trim();
    const key = personMergeKey(name);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, user);
      continue;
    }
    const prevTs = prev.last_sign_in ? new Date(prev.last_sign_in).getTime() : 0;
    const nextTs = user.last_sign_in ? new Date(user.last_sign_in).getTime() : 0;
    if (nextTs > prevTs) byKey.set(key, user);
  }
  return byKey;
}

function findRosterProfile(name, rosterByKey) {
  const key = personMergeKey(name);
  if (!key) return null;
  if (rosterByKey.has(key)) return rosterByKey.get(key);
  if (key.length < 5) return null;
  const hits = [];
  for (const [rosterKey, user] of rosterByKey.entries()) {
    if (rosterKey.startsWith(key) || key.startsWith(rosterKey)) {
      hits.push(user);
    }
  }
  return hits.length === 1 ? hits[0] : null;
}

/** Copy Kissflow last_sign_in onto ticket assignees — same rules as NE overlayRosterSignIn. */
export function overlayRosterSignIn(users, roster = []) {
  const rosterByKey = buildRosterLookup(roster);
  return (users || []).map((user) => {
    if (user.last_sign_in) return user;
    const profile = findRosterProfile(user.user_name, rosterByKey);
    if (!profile?.last_sign_in) return user;
    return {
      ...user,
      last_sign_in: profile.last_sign_in,
      ever_logged_in: profile.ever_logged_in ?? true,
      is_active: profile.is_active ?? user.is_active,
    };
  });
}

export function misUsersFromRecords(rows, roster = []) {
  const map = new Map();
  for (const row of rows || []) {
    const name = humanAssigneeName(row);
    if (!name) continue;
    const id = personMergeKey(name);
    const hit = map.get(id) || {
      user_id: id,
      user_name: name,
      open: 0,
      closed: 0,
      rejected: 0,
      total: 0,
      last_sign_in: null,
      closure_ratio: 0,
    };
    const status = String(row?.status || '').toLowerCase();
    if (status === 'rejected') hit.rejected += 1;
    else if (status === 'closed') hit.closed += 1;
    else hit.open += 1;
    hit.total = hit.open + hit.closed + hit.rejected;
    hit.closure_ratio = hit.open + hit.closed > 0
      ? Math.round((hit.closed / (hit.open + hit.closed)) * 1000) / 10
      : 0;
    hit.user_name = preferredPersonLabel(hit.user_name, name);
    map.set(id, hit);
  }
  const withCounts = overlayRosterSignIn([...map.values()], roster).filter((u) => u.total > 0);
  const rosterHasLogins = (roster || []).some((u) => u.last_sign_in || u.ever_logged_in);
  return (rosterHasLogins
    ? withCounts.filter((u) => u.last_sign_in || u.ever_logged_in)
    : withCounts)
    .sort((a, b) => b.closed - a.closed || b.total - a.total);
}

export function userFilterOptions(rows, roster = []) {
  const seen = new Map();
  for (const row of rows || []) {
    const name = humanAssigneeName(row);
    if (!name || name === '—' || name === '-') continue;
    const id = personMergeKey(name);
    const hit = seen.get(id);
    if (!hit) seen.set(id, { key: id, label: name });
    else hit.label = preferredPersonLabel(hit.label, name);
  }
  const fromTickets = [...seen.values()];
  const ticketNames = new Set(fromTickets.map((o) => personMergeKey(o.label)));
  for (const user of roster || []) {
    const name = String(user.user_name || '').trim();
    if (!name || isNonHumanItsmName(name) || ticketNames.has(personMergeKey(name))) continue;
    if (!(Number(user.total || 0) > 0)) continue;
    const id = personMergeKey(name);
    fromTickets.push({ key: id, label: name });
    ticketNames.add(id);
  }
  fromTickets.sort((a, b) => a.label.localeCompare(b.label));
  return [{ key: '', label: 'All Users' }, ...fromTickets];
}

export function classifyItsmSourceChannel(value) {
  const s = String(value || '').toLowerCase().trim();
  if (!s || s === '—' || s === '-') return 'Other';
  if (s.includes('whats')) return 'WhatsApp';
  if (s.includes('email') || s.includes('e-mail') || s.includes('e mail') || s === 'mail') return 'Email';
  if (s.includes('mobile') || s.includes('android') || s.includes('ios') || s.includes('phone') || s.includes('sms') || /\bapp\b/.test(s)) {
    return 'Mobile';
  }
  if (s.includes('web') || s.includes('portal') || s.includes('browser') || s.includes('desktop') || s.includes('kissflow')) {
    return 'Web';
  }
  if (s === 'email' || s === 'whatsapp' || s === 'mobile' || s === 'web' || s === 'other') {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return 'Other';
}

export function emptyItsmSourceCounts() {
  return { Email: 0, WhatsApp: 0, Mobile: 0, Web: 0, Other: 0 };
}

/** All-tickets + today-open source panels. Same channels as newceo / NE. */
export function countItsmSourcePanels(rows, now = new Date()) {
  const summary = summarizeGcpRecords(rows, now);
  return { all: summary.source, today: summary.todaySource };
}

export function sourceRows(counts) {
  return ['Email', 'WhatsApp', 'Mobile', 'Web'].map((name) => ({
    label: name,
    count: Number((counts && counts[name]) || 0),
  }));
}

export const NEW_CEO_CTO_EMAIL = 'srivaths.varadharajan@refex.co.in';

export function readKissflowSessionUser(kf) {
  const user = kf?.user || (typeof window !== 'undefined' ? window.kf?.user : null) || {};
  const firstLast = [user.FirstName || user.firstName, user.LastName || user.lastName].filter(Boolean).join(' ');
  return {
    name: String(
      user.Name
      || user.name
      || user.DisplayName
      || user.displayName
      || user.FullName
      || user.fullName
      || firstLast
      || '',
    ).trim(),
    email: String(user.Email || user.email || user.Mail || user.mail || '').trim(),
  };
}

/** Display-only title under the greeting. Srivaths → GCTO; everyone else → GCEO. */
export function resolveNewCeoHeaderTitle({ name = '', email = '' } = {}) {
  const emailTok = String(email || '').trim().toLowerCase();
  const nameTok = String(name || '').toLowerCase();
  if (emailTok === NEW_CEO_CTO_EMAIL || nameTok.includes('srivaths')) {
    return 'Group Chief Technical Officer';
  }
  return 'Group Chief Executive Officer';
}

function titleCaseStatus(status) {
  const raw = String(status || '').trim().toLowerCase();
  if (raw === 'closed') return 'Closed';
  if (raw === 'rejected') return 'Rejected';
  if (raw === 'open') return 'Open';
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Open';
}

function truthyFlag(value) {
  const token = String(value || '').trim().toLowerCase();
  return token === 'true' || token === 'yes' || token === '1' || token === 'breached' || token === 'y';
}

function minutesBetween(from, to) {
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return (end.getTime() - start.getTime()) / 60000;
}

function parseCeoSlaMinutes(value) {
  if (value == null || value === '' || value === '—') return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value > 1_000_000 ? value / 60000 : value;
  }
  const trimmed = String(value).trim();
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber > 1_000_000 ? asNumber / 60000 : asNumber;
  }
  const hm = trimmed.match(/^(\d+)\s*:\s*(\d+)$/);
  if (hm) return (Number(hm[1]) * 60) + Number(hm[2]);
  return 0;
}

const PENDING_APPROVAL_SLA_MINUTES = 120;

function isPendingApprovalSlaRow(row) {
  const text = [
    row?.form_status,
    row?.ticketStage,
    row?.current_step,
    row?.currentStep,
    row?.itemStatus,
  ].map((value) => String(value || '').toLowerCase()).join(' ');
  return text.includes('pending') && text.includes('approv');
}

/** Head clock: Closure Time → TAT → 120 min Pending Approval → ExpectedAt. Display only. */
export function headSlaBudgetMinutes(row) {
  if (isPendingApprovalSlaRow(row)) return PENDING_APPROVAL_SLA_MINUTES;
  const closure = parseCeoSlaMinutes(row?.closure_minutes || row?.closureMinutes);
  if (closure > 0) return closure;
  const tat = parseCeoSlaMinutes(row?.tat_minutes || row?.tatMinutes);
  if (tat > 0) return tat;
  const sla = parseCeoSlaMinutes(row?.sla_minutes || row?.slaMinutes);
  if (sla > 0) return sla;
  const expected = minutesBetween(
    row?.created_at || row?.createdAtRaw,
    row?.expected_at || row?.expectedAt || row?.sla_expected_at,
  );
  return expected && expected > 0 ? expected : 0;
}

/** Head-style SLA badge + timing from GCP fields only (no Kissflow matchers). Never paints No SLA. */
export function ceoSlaMisDisplay(row, now = new Date()) {
  const form = String(row?.form_status || row?.ticketStage || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (form === 'onhold' || form === 'hold') {
    return { primary: 'Hold', sub: null, state: 'hold' };
  }
  const budget = headSlaBudgetMinutes(row);
  const elapsedFromClock = minutesBetween(row?.created_at || row?.createdAtRaw, row?.closed_at || row?.closedAtRaw || now);
  const elapsedFromField = Number(row?.sla_elapsed || row?.slaElapsedMinutes || 0);
  const elapsed = Number.isFinite(elapsedFromClock) && elapsedFromClock >= 0
    ? elapsedFromClock
    : (Number.isFinite(elapsedFromField) && elapsedFromField > 0 ? elapsedFromField : null);
  const closed = String(row?.status || '').toLowerCase() === 'closed'
    || String(row?.status || '').toLowerCase() === 'rejected';
  const breached = truthyFlag(row?.sla_breached || row?.slaBreached)
    || String(row?.itemStatus || '').toLowerCase().includes('breach')
    || (budget > 0 && elapsed != null && elapsed > budget);
  if (breached) {
    const over = budget > 0 && elapsed != null ? Math.max(0, elapsed - budget) : elapsed;
    return {
      primary: 'Breached',
      sub: over > 0 ? `Exceeded by ${formatSlaDuration(over)}` : null,
      state: 'breached',
    };
  }
  if (closed) {
    return {
      primary: 'Not Breached',
      sub: elapsed != null && budget > 0
        ? `${formatSlaDuration(elapsed)} / ${formatSlaDuration(budget)}`
        : (elapsed != null ? formatSlaDuration(elapsed) : null),
      state: 'ok',
    };
  }
  if (budget > 0 && elapsed != null && elapsed <= budget) {
    return {
      primary: 'On track',
      sub: `${formatSlaDuration(budget - elapsed)} left`,
      state: 'ok',
    };
  }
  return { primary: 'On track', sub: null, state: 'ok' };
}

export function gcpSlaLabel(row, now = new Date()) {
  return ceoSlaMisDisplay(row, now).primary;
}

export function compareCompanyFilterLabel(a, b) {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  const leftDigit = /^[0-9]/.test(left);
  const rightDigit = /^[0-9]/.test(right);
  if (leftDigit !== rightDigit) return leftDigit ? 1 : -1;
  return left.localeCompare(right, 'en', { sensitivity: 'base' });
}

export function sortNewCeoCompanyOptions(options = []) {
  const pinned = [];
  const rest = [];
  for (const row of options) {
    if (!row?.key || row.key === 'all') pinned.push(row);
    else rest.push(row);
  }
  rest.sort((a, b) => compareCompanyFilterLabel(a.label, b.label));
  return [...pinned, ...rest];
}

export function buildNewCeoCompanyOptions(nameOptions = []) {
  return sortNewCeoCompanyOptions((nameOptions || []).map((row) => {
    if (!row?.key) return { key: '', label: row?.label || 'All Companies' };
    const extra = String(row.key).toLowerCase();
    if (extra === 'extrovis') return { key: 'extrovis', label: row.label || 'Extrovis' };
    if (extra === 'pharmapack' || extra === 'pharmacare') return { key: 'pharmacare', label: row.label || 'Pharmacare' };
    if (extra === 'modepro') return { key: 'modepro', label: row.label || 'Modepro' };
    if (extra === 'kavis' || extra === 'kavispharma') return { key: 'kavispharma', label: row.label || 'Kavispharma' };
    return { key: companyIdFromLabel(row.label || row.key), label: row.label || row.key };
  }));
}

/** Head Closed Date chain on GCP fields — display only. KPI Closed Today uses gcpClosedTodayAt. */
export function ceoClosedOnDisplay(row) {
  const status = String(row?.status || '').toLowerCase();
  const stage = String(row?.form_status || row?.current_step || row?.ticketStage || '').toLowerCase();
  const closed = status === 'closed'
    || status === 'rejected'
    || /complet|closed|reopen|employee feedback/.test(stage);
  if (!closed) return '';
  return String(
    row?.closed_at
    || row?.closedOn
    || row?.closedAtRaw
    || row?.agent_closed_at
    || row?.modified_at
    || row?.modifiedAtRaw
    || '',
  );
}

/** Map a GCP inventory row onto CEO MIS table fields. No Kissflow matchers. */
export function mapGcpRecordToCeoRow(row) {
  const status = titleCaseStatus(row?.status);
  const assigned = humanAssigneeName(row);
  const closed = String(row?.status || '').toLowerCase() === 'closed'
    || String(row?.status || '').toLowerCase() === 'rejected';
  const closedBy = closed ? (humanLabel(row?.closed_by) || assigned) : '';
  const assignedDisplay = assigned || '';
  const slaMinutes = parseCeoSlaMinutes(row?.sla_minutes || row?.closure_minutes || row?.tat_minutes);
  const displayClosedAt = ceoClosedOnDisplay(row);
  const stage = ceoStageLabel(row?.form_status || row?.stages || '')
    || (closed ? 'Closed' : '');
  const slaDisplay = ceoSlaMisDisplay({ ...row, sla_minutes: slaMinutes || row?.sla_minutes, closed_at: displayClosedAt, created_at: row?.created_at });
  return {
    id: String(row?.id || row?.instance_id || row?.request_id || ''),
    requestId: String(row?.request_id || '').trim(),
    summary: String(row?.subject || row?.summary || '').trim() || '—',
    subject: String(row?.subject || row?.summary || '').trim(),
    requesterName: String(row?.requested_by || '').trim(),
    createdBy: String(row?.requested_by || '').trim(),
    assignedTo: assignedDisplay,
    assignedToDisplay: assignedDisplay,
    closedBy,
    source: String(row?.source || row?.source_channel || '').trim(),
    ticketStatus: status,
    itemStatus: String(row?.status_raw || row?.current_step || status).trim(),
    currentStep: stage,
    ticketStage: stage,
    processStages: stage,
    company: String(row?.company_name || row?.company || '').trim(),
    companyName: String(row?.company_name || row?.company || '').trim(),
    company_key: row?.company_key || '',
    entity: String(row?.entity || '').trim(),
    createdAtRaw: row?.created_at || '',
    requestedDate: row?.created_at || '',
    requestedDateTimeRaw: row?.created_at || '',
    modifiedAtRaw: row?.modified_at || row?.closed_at || '',
    closedOn: displayClosedAt || '',
    closedAtRaw: displayClosedAt || '',
    reopenedOn: row?.reopened_at || '',
    reopenedAtRaw: row?.reopened_at || '',
    ticketType: String(row?.ticket_type || row?.request_type || '').trim(),
    description: String(row?.description || '').trim(),
    category: String(row?.category || '').trim(),
    subCategory: String(row?.sub_category || '').trim(),
    criticality: String(row?.criticality || '').trim(),
    expected_at: row?.expected_at || row?.expectedAt || '',
    slaMinutes: slaMinutes || undefined,
    tatMinutes: Number(row?.tat_minutes || 0) || undefined,
    closureMinutes: Number(row?.closure_minutes || 0) || undefined,
    serviceQueueSlaMinutes: slaMinutes || undefined,
    slaBreached: slaDisplay.state === 'breached',
    slaLabel: slaDisplay.primary,
    slaSub: slaDisplay.sub,
    slaState: slaDisplay.state,
    isProcessCompleted: String(row?.status || '').toLowerCase() === 'closed',
    status: String(row?.status || '').toLowerCase(),
    created_at: row?.created_at,
    closed_at: row?.closed_at || null,
    agent_closed_at: row?.agent_closed_at || null,
    reopen_entered_at: row?.reopen_entered_at || null,
    current_step: String(row?.current_step || row?.form_status || '').trim(),
    status_raw: String(row?.status_raw || '').trim(),
    sourceKey: String(row?.source || row?.source_channel || '').trim(),
  };
}
