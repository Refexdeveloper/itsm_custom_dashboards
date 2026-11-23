/**
 * Client-side filters / KPI counts for the GCP Tech Helpdesk payload.
 * Mirrors Notification Engine Company + User + Period — no Kissflow matchers.
 */

import { displayItsmPersonName, formatSlaDuration, isItsmBotOrSystemActor } from './kfITServiceDashboard.js';
import { canonicalizeTicketStage, getRefexReportStagesLabel } from '../itsm/refex/employeedashboard/ticketStage.js';

/** Lowercase text for one MIS row. Display fields only; does not change KPI matchers. */
export function misRowSearchText(row, extras = []) {
  const parts = [];
  const push = (value) => {
    if (value == null || value === '') return;
    const kind = typeof value;
    if (kind === 'string' || kind === 'number' || kind === 'boolean') {
      parts.push(String(value));
      return;
    }
    if (kind !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const name = value.Name || value.name || value.Email || value.email || value.label;
    if (name != null && name !== '') parts.push(String(name));
  };
  if (row && typeof row === 'object') Object.values(row).forEach(push);
  extras.forEach(push);
  return parts.join(' ').toLowerCase();
}

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
  if (kpiFocus === 'sla_breached') return ceoSlaMisDisplay(row, now).state === 'breached';
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
  let slaBreached = 0;
  const source = { Email: 0, WhatsApp: 0, Mobile: 0, Web: 0, Other: 0 };
  const todaySource = { Email: 0, WhatsApp: 0, Mobile: 0, Web: 0, Other: 0 };

  for (const row of rows || []) {
    const status = String(row?.status || row?.ticketStatus || '').toLowerCase();
    if (status === 'rejected') rejected += 1;
    else if (status === 'closed') closed += 1;
    else open += 1;

    const created = ymdFromIso(row?.created_at);
    const closedAt = status === 'closed' ? ymdFromIso(gcpClosedTodayAt(row)) : '';
    if (created === today) openedToday += 1;
    if (closedAt === today) closedToday += 1;
    if (ceoSlaMisDisplay(row, now).state === 'breached') slaBreached += 1;

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
    slaBreached,
    source,
    todaySource,
  };
}

export function sourceCountsFromBreakdownRows(rows) {
  const out = emptyItsmSourceCounts();
  for (const row of rows || []) {
    const name = String(row?.name || row?.label || '').trim();
    const count = Number(row?.count || 0);
    if (!count) continue;
    if (name === 'Email' || name === 'WhatsApp' || name === 'Mobile' || name === 'Web' || name === 'Other') {
      out[name] += count;
    } else {
      out[classifyItsmSourceChannel(name)] += count;
    }
  }
  return out;
}

/** First-paint ticket KPIs from the small dashboard payload — same numbers NE shows before inventory. */
export function ticketKpisFromDashboard(dashboard) {
  const metrics = dashboard?.metrics || {};
  const open = Number(metrics.open ?? metrics.open_tickets ?? metrics.pending ?? 0);
  const closed = Number(metrics.closed ?? metrics.closed_tickets ?? metrics.completed ?? 0);
  const rejected = Number(metrics.rejected || 0);
  const total = Number(metrics.total ?? metrics.total_items ?? 0) || (open + closed + rejected);
  return {
    total,
    open,
    closed,
    rejected,
    openedToday: Number(metrics.opened_today || 0),
    closedToday: Number(metrics.closed_today || 0),
    slaBreached: Number(metrics.sla_breached || metrics.slaBreached || 0),
    source: sourceCountsFromBreakdownRows(dashboard?.by_source_all || dashboard?.by_source),
    todaySource: sourceCountsFromBreakdownRows(dashboard?.by_source_today),
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

function adoptionUserKeys(user) {
  return [
    String(user?.user_id || '').trim().toLowerCase(),
    personMergeKey(user?.user_name),
    String(user?.email || '').trim().toLowerCase(),
  ].filter(Boolean);
}

/**
 * Company-scoped Kissflow roster for Adoption report / Users card.
 * Keeps roster people whose company matches, or who appear in company-scoped tickets.
 */
export function scopeAdoptionRoster(roster = [], {
  company = '',
  ticketUsers = [],
} = {}) {
  const filter = String(company || '').trim();
  if (!filter || filter === 'all') return roster || [];

  const ticketKeys = new Set();
  for (const user of ticketUsers || []) {
    for (const key of adoptionUserKeys(user)) ticketKeys.add(key);
  }

  const out = [];
  const seen = new Set();
  for (const user of roster || []) {
    const keys = adoptionUserKeys(user);
    const dedupe = keys[0] || keys.join('|');
    if (!dedupe || seen.has(dedupe)) continue;
    const stamped = String(user?.company || user?.company_name || user?.company_key || '').trim();
    // Do not apply the ITSM blank→RIL ticket default on roster profiles.
    const profileMatch = stamped
      ? (
        recordMatchesCompany(user, filter)
        || recordMatchesCompany({
          company: user?.company,
          company_name: user?.company || user?.company_name,
          company_key: user?.company_key,
        }, filter)
      )
      : false;
    const ticketMatch = keys.some((key) => ticketKeys.has(key));
    if (!profileMatch && !ticketMatch) continue;
    seen.add(dedupe);
    out.push(user);
  }
  return out;
}

/** Match Adoption roster rows to the CEO User filter (id / name / email). */
export function adoptionRosterMatchesUser(user, userKey) {
  if (!userKey) return true;
  const sel = String(userKey || '').trim().toLowerCase();
  if (!sel) return true;
  const want = personMergeKey(userKey);
  const have = personMergeKey(user?.user_name);
  if (have && want && (have === want || have.includes(want) || want.includes(have))) return true;
  const id = String(user?.user_id || user?.user_name || '').trim().toLowerCase();
  const email = String(user?.email || '').trim().toLowerCase();
  if (email && (email === sel || email.includes(sel) || sel.includes(email))) return true;
  if (want && adoptionUserKeys(user).some((key) => key === want || key === sel)) return true;
  return id === sel || id.includes(sel) || sel.includes(id);
}

/** Restrict Adoption roster / Users card to the selected User filter. */
export function filterAdoptionRosterByUser(roster = [], userKey = '') {
  if (!userKey) return roster || [];
  return (roster || []).filter((user) => adoptionRosterMatchesUser(user, userKey));
}

function isNonHumanItsmName(value) {
  if (isItsmBotOrSystemActor(value)) return true;
  const token = compactMisName(value) || compactName(value).replace(/\s+/g, '');
  return token === 'itsm'
    || token === 'ithelpdesk'
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
export const NEW_CEO_MD_EMAIL = 'aniljain@refex.co.in';
export const NEW_CEO_GCEO_EMAIL = 'dinesh@refex.co.in';

function firstViewerText(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text && text.toLowerCase() !== 'user') return text;
  }
  return '';
}

function designationByKey(data) {
  if (!data || typeof data !== 'object') return '';
  for (const [key, value] of Object.entries(data)) {
    if (!/designation/i.test(key) || value == null || typeof value === 'object') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function firstDesignationText(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (!text || text === '—' || text.toLowerCase() === 'user') continue;
    return text;
  }
  return '';
}

/** Job title on the Kissflow user, component inputs, or `user_title`. Skips a value that is just the person's name. */
export function readViewerDesignation(data, name = '') {
  if (!data || typeof data !== 'object') return '';
  const nested = data.user && typeof data.user === 'object' ? data.user : {};
  const nameKey = String(name || data.Name || data.name || nested.Name || nested.name || '').trim().toLowerCase();
  const text = firstDesignationText(
    data.Designation_1,
    data.designation_1,
    data.Designation,
    data.designation,
    data.Employee_designation,
    data.JobTitle,
    data.jobTitle,
    data.Job_Title,
    data.user_title,
    data.userTitle,
    data.UserTitle,
    data.title,
    data.Title,
    nested.Designation_1,
    nested.designation_1,
    nested.Designation,
    nested.designation,
    nested.Employee_designation,
    nested.JobTitle,
    nested.jobTitle,
    nested.user_title,
    nested.userTitle,
    nested.title,
    nested.Title,
    designationByKey(data),
    designationByKey(nested),
  );
  if (nameKey && text.toLowerCase() === nameKey) return '';
  return text;
}

/** Kissflow component inputs and kf.user share the same name/email fields. */
export function readCeoViewerParams(data) {
  if (!data || typeof data !== 'object') return { name: '', email: '', designation: '' };
  const nested = data.user && typeof data.user === 'object' ? data.user : {};
  const name = firstViewerText(
    data.user_name,
    data.userName,
    data.UserName,
    data.Name,
    data.name,
    data.DisplayName,
    data.displayName,
    nested.Name,
    nested.name,
    nested.user_name,
    nested.userName,
  );
  return {
    name,
    email: firstViewerText(
      data.user_email,
      data.userEmail,
      data.Email,
      data.email,
      data.Mail,
      nested.Email,
      nested.email,
    ),
    designation: readViewerDesignation(data, name),
  };
}

function readLocationViewer() {
  if (typeof window === 'undefined') return { name: '', email: '', designation: '' };
  const bags = [];
  try {
    bags.push(new URLSearchParams(window.location.search));
  } catch {
    /* ignore malformed search */
  }
  const hash = String(window.location.hash || '').replace(/^#/, '');
  if (hash.includes('=')) {
    try {
      bags.push(new URLSearchParams(hash));
    } catch {
      /* ignore malformed hash */
    }
  }
  const pick = (keys) => {
    for (const params of bags) {
      for (const key of keys) {
        const text = firstViewerText(params.get(key));
        if (text) return text;
      }
    }
    return '';
  };
  return {
    name: pick(['user_name', 'userName', 'Name', 'name']),
    email: pick(['user_email', 'userEmail', 'Email', 'email']),
    designation: pick(['user_title', 'userTitle', 'Designation', 'designation', 'JobTitle']),
  };
}

const ceoParamWatches = new WeakSet();

/** One Kissflow watchParams subscription. Component inputs can carry the signed-in name. */
export function ensureCeoViewerParamWatch(kf, onIdentity) {
  const watch = kf?.context?.watchParams;
  if (!kf || typeof watch !== 'function' || ceoParamWatches.has(kf)) return;
  ceoParamWatches.add(kf);
  try {
    watch.call(kf.context, (data) => {
      const next = readCeoViewerParams(data);
      if (next.name || next.email) onIdentity(next);
    });
  } catch {
    ceoParamWatches.delete(kf);
  }
}

export function readKissflowSessionUser(kf) {
  const user = kf?.user || (typeof window !== 'undefined' ? window.kf?.user : null) || {};
  const fromUser = readCeoViewerParams(user);
  const fromLocation = readLocationViewer();
  const firstLast = [user.FirstName || user.firstName, user.LastName || user.lastName].filter(Boolean).join(' ');
  const name = firstViewerText(
    fromUser.name,
    user.FullName,
    user.fullName,
    firstLast,
    fromLocation.name,
  );
  return {
    name,
    email: firstViewerText(fromUser.email, fromLocation.email),
    designation: firstDesignationText(
      readViewerDesignation(user, name),
      fromUser.designation,
      fromLocation.designation,
    ),
  };
}

/**
 * Display-only line under the greeting.
 * Srivaths, Anil Jain, and Dinesh keep their fixed titles.
 * Any other viewer uses `designation` when the caller has one; otherwise Group Chief Executive Officer.
 */
export function resolveNewCeoHeaderTitle({ name = '', email = '', designation = '' } = {}) {
  const emailTok = String(email || '').trim().toLowerCase();
  const nameTok = String(name || '').toLowerCase();
  if (emailTok === NEW_CEO_CTO_EMAIL || nameTok.includes('srivaths')) {
    return 'Group Chief Technical Officer';
  }
  if (emailTok === NEW_CEO_MD_EMAIL || nameTok.includes('anil jain') || nameTok.includes('aniljain')) {
    return 'Managing Director / Chairman';
  }
  if (emailTok === NEW_CEO_GCEO_EMAIL || nameTok.includes('dinesh')) {
    return 'Group Chief Executive Officer';
  }
  const jobTitle = String(designation || '').trim();
  if (jobTitle && jobTitle !== '—') return jobTitle;
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

function ceoStageToken(value) {
  return String(value || '').toLowerCase().replace(/[\s_-]+/g, '');
}

function isCeoExtrovisRow(row) {
  const blob = [
    row?.entity,
    row?.entity_key,
    row?.request_id,
    row?.requestId,
    row?.process_id,
    row?.company,
    row?.company_name,
    row?.companyName,
  ].map((value) => String(value || '').toLowerCase()).join(' ');
  return blob.includes('extrovis');
}

function isCeoExtrovisPickupStep(row) {
  const step = String(row?.current_step || row?.currentStep || '').toLowerCase();
  return step.includes('pickup') || step.includes('pick up') || step.includes('pick-up');
}

/** aasik / HTML Admin Open SLA live stage — GCP fields. */
function isCeoSlaStageInProgress(row) {
  const process = ceoStageToken(row?.process_stages || row?.processStages);
  const display = ceoStageToken(
    row?.ticketStage || row?.form_status || row?.stages || '',
  );
  const stepToken = ceoStageToken(row?.current_step || row?.currentStep || '');
  if (isCeoExtrovisRow(row)) {
    if (process === 'inprogress') return true;
    return display === 'inprogress';
  }
  if (process) return process === 'inprogress';
  if (display === 'inprogress') return true;
  // Cache may store process_status as current_step.
  if (stepToken === 'inprogress') return true;
  // HTML Admin: empty Stages on an open agent-pipeline row still clocks.
  const step = String(row?.current_step || row?.currentStep || '').toLowerCase();
  if (stepToken === 'completed' || stepToken === 'open') return false;
  const agentPipeline = step.includes('it tech') || step.includes('tech support')
    || step.includes('pickup') || step.includes('pick up') || step.includes('dependency')
    || step.includes('it agent') || step.includes('solution');
  return agentPipeline;
}

function isCeoSlaHoldRow(row) {
  const statusToken = String(row?.status || row?.ticketStatus || '').toLowerCase();
  const closed = statusToken === 'closed'
    || statusToken === 'rejected'
    || statusToken === 'completed';
  if (closed) return false;
  const form = ceoStageToken(
    row?.ticketStage || row?.form_status || row?.stages || '',
  );
  const process = ceoStageToken(row?.process_stages || row?.processStages);
  if (form === 'onhold' || form === 'hold') return true;
  if (isCeoExtrovisRow(row)) {
    if (isCeoExtrovisPickupStep(row)) return false;
    return !isCeoSlaStageInProgress(row);
  }
  if (isPendingApprovalSlaRow(row)) return false;
  if (isCeoSlaStageInProgress(row)) return false;
  if (!process && !form) return false;
  return true;
}

/**
 * Head / aasik_ITSM SLA badge — Refex vs Extrovis entity rules.
 * InProgress (or empty Stages on an open Refex ticket) uses modified + Closure Time.
 */
export function ceoSlaMisDisplay(row, now = new Date()) {
  const statusToken = String(row?.status || row?.ticketStatus || '').toLowerCase();
  const closed = statusToken === 'closed'
    || statusToken === 'rejected'
    || statusToken === 'completed';
  if (isCeoSlaHoldRow(row)) {
    return { primary: 'Hold', sub: null, state: 'hold' };
  }
  const budget = headSlaBudgetMinutes(row);
  const clockStart = !closed
    ? (
      isCeoExtrovisRow(row) && isCeoExtrovisPickupStep(row)
        ? (row?.created_at || row?.createdAtRaw || row?.modified_at || row?.modifiedAtRaw)
        : (row?.modified_at || row?.modifiedAtRaw || row?.created_at || row?.createdAtRaw)
    )
    : (row?.created_at || row?.createdAtRaw);
  const elapsedFromClock = minutesBetween(clockStart, row?.closed_at || row?.closedAtRaw || now);
  const elapsedFromField = Number(row?.sla_elapsed || row?.slaElapsedMinutes || 0);
  const elapsed = Number.isFinite(elapsedFromClock) && elapsedFromClock >= 0
    ? elapsedFromClock
    : (Number.isFinite(elapsedFromField) && elapsedFromField > 0 ? elapsedFromField : null);
  // HTML report / Admin: Closed SLA = Status/flag breached only.
  // Open SLA = agent pipeline + InProgress + (flag OR modified clock > Closure_Time).
  const statusBreached = truthyFlag(row?.sla_breached || row?.slaBreached)
    || String(row?.itemStatus || row?.status_raw || '').toLowerCase().includes('breach');
  const step = String(row?.current_step || row?.currentStep || '').toLowerCase();
  const agentPipeline = step.includes('it tech') || step.includes('tech support')
    || step.includes('pickup') || step.includes('pick up') || step.includes('dependency')
    || step.includes('it agent') || step.includes('solution');
  const approvalStep = isPendingApprovalSlaRow(row)
    || /\bl1\b/.test(step) || /\bl2\b/.test(step)
    || step.includes('manager approval') || step.includes('head approval');
  let breached = false;
  if (closed) {
    breached = statusBreached;
  } else if (approvalStep) {
    breached = false;
  } else if (agentPipeline && isCeoSlaStageInProgress(row)) {
    breached = statusBreached || (budget > 0 && elapsed != null && elapsed > budget);
  } else {
    breached = statusBreached;
  }
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
  const statusToken = String(row?.status || '').toLowerCase();
  const stageToken = String(row?.form_status || row?.current_step || row?.ticketStage || '').toLowerCase();
  const closed = statusToken === 'closed'
    || statusToken === 'rejected'
    || statusToken === 'completed'
    || /complet|closed|reopen|employee feedback/.test(stageToken);
  const closedBy = closed ? (humanLabel(row?.closed_by) || assigned) : '';
  const assignedDisplay = assigned || (closed ? closedBy : '');
  const slaMinutes = parseCeoSlaMinutes(row?.sla_minutes || row?.closure_minutes || row?.tat_minutes);
  const displayClosedAt = ceoClosedOnDisplay(row);
  // Stage = backend entity-aware form_status (Refex Stages / Extrovis Statu_1).
  // Ticket Status Closed → Stage Closed (stored Stages can lag as InProgress).
  const stageRaw = String(row?.form_status || row?.stages || '').trim();
  const processStagesRaw = String(row?.process_stages || row?.processStages || '').trim();
  const stage = closed ? 'Closed' : (ceoStageLabel(stageRaw) || '');
  const slaDisplay = ceoSlaMisDisplay({
    ...row,
    form_status: closed ? 'Closed' : (stageRaw || row?.form_status),
    process_stages: processStagesRaw || row?.process_stages,
    processStages: processStagesRaw || row?.processStages,
    ticketStage: stage,
    sla_minutes: slaMinutes || row?.sla_minutes,
    closed_at: displayClosedAt,
    created_at: row?.created_at,
    modified_at: row?.modified_at,
    current_step: row?.current_step,
  });
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
    processStages: processStagesRaw || stage,
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

function kissflowCeoStatus(row) {
  const token = String(row?.ticketStatus || row?.itemStatus || row?.status || '').toLowerCase();
  if (token.includes('reject')) return 'rejected';
  if (
    token.includes('closed')
    || token.includes('completed')
    || row?.isProcessCompleted
  ) return 'closed';
  return 'open';
}

/** Map IT Head Me landing rows onto the New CEO table. Does not change Me matchers. */
export function mapKissflowServiceRowToCeoRow(row) {
  const status = kissflowCeoStatus(row);
  const assigned = String(row?.assignedTo || row?.assignedToDisplay || '').trim();
  const closedBy = String(row?.closedBy || '').trim();
  const createdAt = row?.createdAtRaw || row?.requestedDateTimeRaw || row?.created_at || '';
  const closedAt = row?.closedAtRaw || row?.closedOn || row?.closed_at || '';
  // Closed Ticket Status → Stage Closed (stale Stages InProgress must not win).
  const stage = (status === 'closed' || status === 'rejected')
    ? 'Closed'
    : (
      getRefexReportStagesLabel(row)
      || String(row?.processStages || row?.ticketStage || row?.currentStep || '').trim()
    );
  const slaDisplay = ceoSlaMisDisplay({
    ...row,
    created_at: createdAt,
    closed_at: closedAt,
    form_status: stage,
    sla_minutes: row?.serviceQueueSlaMinutes || row?.slaMinutes,
  });
  return {
    ...mapGcpRecordToCeoRow({
      id: row?.id,
      instance_id: row?.id,
      request_id: row?.requestId,
      subject: row?.subject || row?.summary,
      summary: row?.summary || row?.subject,
      requested_by: row?.requesterName || row?.createdBy,
      assigned_to: assigned,
      closed_by: closedBy,
      source: row?.source,
      status,
      status_raw: row?.itemStatusRaw || row?.ticketStatus || '',
      form_status: stage,
      current_step: row?.currentStep || stage,
      company_name: row?.companyName || row?.company,
      company: row?.companyName || row?.company,
      entity: row?.entity,
      created_at: createdAt,
      modified_at: row?.modifiedAtRaw || '',
      closed_at: closedAt,
      ticket_type: row?.ticketType,
      description: row?.description,
      category: row?.category,
      sub_category: row?.subCategory,
      criticality: row?.criticality,
      sla_minutes: row?.serviceQueueSlaMinutes || row?.slaMinutes,
      tat_minutes: row?.tatMinutes,
      closure_minutes: row?.closureMinutes,
    }),
    ticketStatus: String(row?.ticketStatus || titleCaseStatus(status)).trim() || titleCaseStatus(status),
    slaLabel: slaDisplay.primary,
    slaSub: slaDisplay.sub,
    slaState: slaDisplay.state,
    slaBreached: slaDisplay.state === 'breached',
  };
}
