/**
 * Notification Engine Expense / Travel dashboard math for Kissflow CEO packs.
 * Same claim-type and process filters as admin-ui AppDashboardTab — no ITSM Me/landing.
 */

export const TRAVEL_PROCESS_SECTIONS = [
  { kind: 'booking', title: 'Travel Booking', match: /travel_management|travel booking|travel request/i },
  { kind: 'advance', title: 'Travel Advance', match: /advance_payment|travel advance/i },
  { kind: 'expense', title: 'Travel Expense', match: /expense_management|amount claimed|travel expense|expense/i },
];

export const EMS_TABLE_COLUMNS = [
  { id: 'request_id', label: 'Exp ID' },
  { id: 'expense_type', label: 'Expense type' },
  { id: 'requested_by', label: 'Requestor' },
  { id: 'assigned_to', label: 'Assigned to' },
  { id: 'amount', label: 'Amount' },
  { id: 'current_step', label: 'Current step' },
  { id: 'status', label: 'Status' },
  { id: 'entity', label: 'Entity' },
  { id: 'company_name', label: 'Company name' },
  { id: 'expense_date', label: 'Expense date' },
  { id: 'created_at', label: 'Requested on' },
];

export const TRAVEL_TABLE_COLUMNS = {
  all: [
    { id: 'request_id', label: 'Request ID' },
    { id: 'requested_by', label: 'Requestor' },
    { id: 'assigned_to', label: 'Assigned to' },
    { id: 'purpose', label: 'Purpose' },
    { id: 'company_name', label: 'Company name' },
    { id: 'amount', label: 'Booking amount' },
    { id: 'process_id', label: 'Process' },
    { id: 'current_step', label: 'Current step' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created by' },
  ],
  booking: [
    { id: 'request_id', label: 'Request ID' },
    { id: 'requested_by', label: 'Requestor' },
    { id: 'assigned_to', label: 'Assigned to' },
    { id: 'purpose', label: 'Purpose' },
    { id: 'company_name', label: 'Company name' },
    { id: 'trip_type', label: 'Trip type' },
    { id: 'from_city', label: 'From place' },
    { id: 'to_city', label: 'To place' },
    { id: 'travel_mode', label: 'Travel mode' },
    { id: 'amount', label: 'Booking amount' },
    { id: 'reference_fare', label: 'Reference fare' },
    { id: 'policy_deviation_cost', label: 'Policy deviation cost' },
    { id: 'deviation_pct', label: 'Deviation %' },
    { id: 'sla', label: 'SLA' },
    { id: 'fare_trend', label: 'Fare trend' },
    { id: 'current_step', label: 'Current step' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created by' },
  ],
  advance: [
    { id: 'request_id', label: 'Request ID' },
    { id: 'requested_by', label: 'Requestor' },
    { id: 'assigned_to', label: 'Assigned to' },
    { id: 'purpose', label: 'Purpose' },
    { id: 'company_name', label: 'Company name' },
    { id: 'amount', label: 'Advance amount' },
    { id: 'linked_request_id', label: 'Linked request' },
    { id: 'current_step', label: 'Current step' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created by' },
  ],
  expense: [
    { id: 'request_id', label: 'Request ID' },
    { id: 'requested_by', label: 'Requestor' },
    { id: 'assigned_to', label: 'Assigned to' },
    { id: 'purpose', label: 'Purpose' },
    { id: 'company_name', label: 'Company name' },
    { id: 'expense_type', label: 'Expense type' },
    { id: 'raised_amount', label: 'Raised amount' },
    { id: 'amount', label: 'Claim amount' },
    { id: 'expense_date', label: 'Expense date' },
    { id: 'current_step', label: 'Current step' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created by' },
  ],
};

const LAKH = 100000;
const CRORE = 10000000;

export function travelPackMatches(row, match) {
  return match.test(String(row?.process_id || row?.subject || ''));
}

export function travelColumnsForPack(pack) {
  return TRAVEL_TABLE_COLUMNS[pack] || TRAVEL_TABLE_COLUMNS.all;
}

export function sumRecordAmount(rows, status) {
  return (rows || []).reduce((sum, row) => {
    if (status && String(row.status || '').toLowerCase() !== status) return sum;
    const n = Number(row.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function formatInr(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '₹0';
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= CRORE) {
    const units = abs / CRORE;
    return `${sign}₹${Number.isInteger(units) ? units : units.toFixed(1)} Cr`;
  }
  if (abs >= LAKH) {
    const units = abs / LAKH;
    return `${sign}₹${Number.isInteger(units) ? units : units.toFixed(1)} L`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

export function claimsSub(count) {
  const n = Number(count) || 0;
  return `${n.toLocaleString('en-IN')} ${n === 1 ? 'claim' : 'claims'}`;
}

export function requestsSub(count) {
  const n = Number(count) || 0;
  return `${n.toLocaleString('en-IN')} ${n === 1 ? 'request' : 'requests'}`;
}

export function countByStatus(rows, status) {
  return (rows || []).filter((row) => String(row.status || '').toLowerCase() === status).length;
}

function ymdFromIso(value) {
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

function istTodayYmd(now = new Date()) {
  return ymdFromIso(now.toISOString()) || now.toISOString().slice(0, 10);
}

export function financeRowMatchesKpi(row, kpiFocus, now = new Date()) {
  const status = String(row?.status || '').toLowerCase();
  if (!kpiFocus || kpiFocus === 'total') return true;
  if (kpiFocus === 'open') return status === 'open';
  if (kpiFocus === 'closed') return status === 'closed';
  if (kpiFocus === 'rejected') return status === 'rejected';
  const today = istTodayYmd(now);
  if (kpiFocus === 'opened_today') return ymdFromIso(row?.created_at) === today;
  if (kpiFocus === 'closed_today') return status === 'closed' && ymdFromIso(row?.closed_at) === today;
  return true;
}

export function filterFinanceVisibleRows(rows, {
  kpiFocus = '',
  travelPack = null,
  solarPack = null,
  search = '',
} = {}, now = new Date()) {
  const pack = TRAVEL_PROCESS_SECTIONS.find((item) => item.kind === travelPack?.key);
  const q = String(search || '').trim().toLowerCase();
  return (rows || []).filter((row) => {
    if (!financeRowMatchesKpi(row, kpiFocus, now)) return false;
    if (pack && !travelPackMatches(row, pack.match)) return false;
    if (solarPack && !solarRowMatchesPack(row, solarPack.key, solarPack.metric)) return false;
    if (travelPack?.metric === 'open' && String(row.status || '').toLowerCase() !== 'open') return false;
    if (travelPack?.metric === 'closed' && String(row.status || '').toLowerCase() !== 'closed') return false;
    if (q) {
      return [
        row.request_id,
        row.expense_type,
        row.requested_by,
        row.assigned_to,
        row.current_step,
        row.status,
        row.entity,
        row.company_name,
        row.purpose,
        row.process_id,
        row.subject,
      ].some((value) => String(value || '').toLowerCase().includes(q));
    }
    return true;
  });
}

const TRAVEL_FARE_MIN_SAMPLES = 3;

export function isTravelBookingRow(row) {
  const process = String(row?.process_id || row?.subject || '').toLowerCase();
  if (/advance_payment|travel advance|expense_management|travel expense/.test(process)) return false;
  if (/travel_management|travel booking|travel request/.test(process)) return true;
  return !process;
}

function isFlightTravelMode(travelMode) {
  const text = String(travelMode || '').trim().toLowerCase();
  if (!text) return false;
  if (text.includes('flight')) return true;
  return /(^|[^a-z])air([^a-z]|$)/.test(text);
}

function fareRouteCity(value) {
  let text = String(value || '').trim();
  if (!text || text === '—') return '';
  return text.replace(/\s*\([A-Za-z]{3}\)\s*$/g, '').trim().toUpperCase();
}

export function travelFareRoute(fromCity, toCity) {
  const from = fareRouteCity(fromCity);
  const to = fareRouteCity(toCity);
  if (!from || !to) return '';
  return `${from}-${to}`;
}

function medianAmount(values) {
  const sorted = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function formatOverMedianPct(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const pct = Math.round(n * 1000) / 10;
  if (pct === 0) return '0%';
  const shown = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return `${pct > 0 ? '+' : ''}${shown}%`;
}

export function formatFareTrendPct(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${Math.round(Math.abs(n) * 100)}%`;
}

export function travelFareTrendKind(value) {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'up') return 'Up';
  if (key === 'down') return 'Down';
  if (key === 'flat') return 'Flat';
  return null;
}

export function resolveTravelFareTrendDisplay(trend, deviationPct) {
  const kind = travelFareTrendKind(trend);
  if (!kind) return null;
  const rounded = formatFareTrendPct(deviationPct);
  if (kind === 'Flat' || rounded === '0%') return { kind: 'Flat', pct: '0%' };
  if (!rounded) return null;
  return { kind, pct: rounded };
}

export function fareTrendFilterLabel(trend, deviationPct) {
  const display = resolveTravelFareTrendDisplay(trend, deviationPct);
  if (!display) return '';
  const marker = display.kind === 'Up' ? '▲' : display.kind === 'Down' ? '▼' : '■';
  return `${marker}${display.pct}`;
}

export function travelSlaDisplay(row) {
  const created = row?.created_at ? new Date(String(row.created_at)) : null;
  const depart = row?.departure_date ? new Date(String(row.departure_date)) : null;
  if (!created || !depart || Number.isNaN(created.getTime()) || Number.isNaN(depart.getTime())) {
    return { primary: '', sub: null, state: 'none' };
  }
  const days = Math.round((depart.getTime() - created.getTime()) / 86400000);
  const time = days === 0 ? 'Same day' : `${Math.abs(days)}d`;
  if (days < 0) return { primary: 'Breached', sub: time, state: 'breached' };
  return { primary: 'Not breached', sub: time, state: 'ok' };
}

export function travelSlaLabel(row) {
  const sla = travelSlaDisplay(row);
  if (sla.state === 'none') return '';
  return sla.sub ? `${sla.primary} · ${sla.sub}` : sla.primary;
}

function emptyFareAnnotation(row) {
  return {
    ...row,
    reference_fare: null,
    policy_deviation_cost: null,
    deviation_pct: null,
    sla: travelSlaLabel(row) || null,
    fare_trend: null,
  };
}

/** Same route-median fare / SLA / trend rules as Notification Engine Travel Booking. */
export function annotateTravelBookingFareRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const routeAmounts = new Map();
  const routeHistory = new Map();
  for (const row of list) {
    if (!isTravelBookingRow(row) || !isFlightTravelMode(row.travel_mode)) continue;
    const route = travelFareRoute(row.from_city, row.to_city);
    if (!route) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    const bucket = routeAmounts.get(route) || [];
    bucket.push(amount);
    routeAmounts.set(route, bucket);
    const history = routeHistory.get(route) || [];
    const at = row.created_at ? new Date(String(row.created_at)).getTime() : 0;
    history.push({ id: String(row.id || row.request_id || ''), amount, at: Number.isFinite(at) ? at : 0 });
    routeHistory.set(route, history);
  }
  const routeMedians = new Map();
  for (const [route, amounts] of routeAmounts.entries()) {
    if (amounts.length < TRAVEL_FARE_MIN_SAMPLES) continue;
    const mid = medianAmount(amounts);
    if (mid != null) routeMedians.set(route, mid);
  }
  for (const history of routeHistory.values()) {
    history.sort((a, b) => a.at - b.at);
  }

  return list.map((row) => {
    if (!isTravelBookingRow(row)) return row;
    const sla = travelSlaLabel(row) || null;
    if (!isFlightTravelMode(row.travel_mode)) {
      return { ...emptyFareAnnotation(row), sla };
    }
    const route = travelFareRoute(row.from_city, row.to_city);
    const referenceFare = route ? routeMedians.get(route) : undefined;
    const amount = Number(row.amount);
    if (referenceFare == null || !Number.isFinite(amount)) {
      return { ...emptyFareAnnotation(row), sla };
    }
    const deviation = amount - referenceFare;
    const history = route ? routeHistory.get(route) || [] : [];
    const rowId = String(row.id || row.request_id || '');
    const index = history.findIndex((hit) => hit.id === rowId);
    const previous = index > 0 ? history[index - 1] : null;
    const compare = previous ? amount - previous.amount : deviation;
    const fareTrend = compare > 0 ? 'Up' : compare < 0 ? 'Down' : 'Flat';
    return {
      ...row,
      reference_fare: referenceFare,
      policy_deviation_cost: deviation,
      deviation_pct: referenceFare === 0 ? null : deviation / referenceFare,
      sla,
      fare_trend: fareTrend,
    };
  });
}

function tile(label, value) {
  const text = String(value ?? '').trim();
  if (!text || text === '—') return { label, value: '' };
  return { label, value: text };
}

export function travelExpandTiles(row, { includeFareDetails = false } = {}) {
  const fareTiles = includeFareDetails
    ? [
      tile('Reference fare', row.reference_fare == null || row.reference_fare === '' ? '' : formatInr(Number(row.reference_fare))),
      tile('Policy deviation cost', row.policy_deviation_cost == null || row.policy_deviation_cost === '' ? '' : formatInr(Number(row.policy_deviation_cost))),
      tile('Deviation %', formatOverMedianPct(row.deviation_pct)),
      tile('SLA', travelSlaLabel(row)),
      tile('Fare trend', fareTrendFilterLabel(row.fare_trend, row.deviation_pct)),
    ]
    : [];
  return [
    tile('Travel mode', row.travel_mode),
    tile('Airline', row.airline),
    tile('Flight number', row.flight_number),
    tile('Linked travel request', row.linked_request_id),
    tile('Expense type', row.expense_type),
    tile('Designation', row.designation),
    tile('Remarks', row.remarks),
    ...fareTiles,
  ].filter((item) => item.value);
}

export const SOLAR_TABLE_COLUMNS = [
  { id: 'request_id', label: 'Request ID' },
  { id: 'subject', label: 'Site' },
  { id: 'requested_by', label: 'Requestor' },
  { id: 'assigned_to', label: 'Assigned to' },
  { id: 'amount', label: 'Amount' },
  { id: 'current_step', label: 'Current step' },
  { id: 'status', label: 'Status' },
  { id: 'company_name', label: 'Company' },
  { id: 'created_at', label: 'Requested on' },
];

function solarStep(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function solarStatusLabel(step) {
  const s = solarStep(step);
  return ['inprogress', 'in progress', 'completed', 'rejected', 'withdrawn', 'closed', 'open', 'pending', 'draft', 'done'].includes(s);
}

function solarText(val) {
  if (val == null) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  if (Array.isArray(val)) return val.map(solarText).filter(Boolean).join(', ');
  if (typeof val === 'object') return solarText(val.Name || val.name || val.Value || val.value || '');
  return '';
}

function solarContextStep(payload) {
  const ctx = payload?._current_context;
  const list = Array.isArray(ctx) ? ctx : (ctx && typeof ctx === 'object' ? [ctx] : []);
  const usable = (entry) => {
    const step = solarText(entry?._context_current_step);
    if (!step || solarStatusLabel(step)) return '';
    return step;
  };
  for (const entry of list) {
    const status = solarText(entry?._status).toLowerCase();
    if ((status.includes('reject') || status.includes('withdraw')) && usable(entry)) return usable(entry);
  }
  for (const entry of list) {
    const step = usable(entry);
    if (step) return step;
  }
  return '';
}

function pickSolarStep(row) {
  const payload = row?.source_payload || null;
  const candidates = [
    payload?._current_step,
    payload?.Current_Step,
    payload?._activity_name,
    solarContextStep(payload),
    row?.current_step,
    payload?.current_step,
  ];
  for (const candidate of candidates) {
    const text = solarText(candidate);
    if (text && !solarStatusLabel(text)) return text;
  }
  return '';
}

function solarOperationStep(step) {
  const s = solarStep(step);
  if (!s || solarStatusLabel(s)) return false;
  return s === 'start' || s === 'ho review' || s === 'vp approval';
}

function solarFinanceStep(step) {
  const s = solarStep(step);
  if (!s || solarStatusLabel(s)) return false;
  return s === 'bu approval' || s === 'bu approver' || /finance\s*process/.test(s)
    || s === 'completed' || s === 'complete' || /\bpayment\b/.test(s)
    || /disburs/.test(s) || /\bsettlement\b/.test(s) || /\bsettled\b/.test(s);
}

function solarCategory(row) {
  const step = pickSolarStep(row);
  if (solarFinanceStep(step)) return 'Finance';
  if (solarOperationStep(step)) return 'Operation';
  const status = solarStep(row?.status_raw || row?.status || row?.source_payload?._status);
  if (['completed', 'complete', 'closed', 'done'].includes(status)) return 'Finance';
  return 'Operation';
}

function solarBucket(row) {
  const status = String(row?.status || '').toLowerCase();
  const raw = String(row?.status_raw || '').toLowerCase();
  if (status === 'rejected' || raw.includes('reject') || raw.includes('withdraw')) return 'rejected';
  if (status === 'closed' || status === 'completed' || raw === 'completed' || raw === 'closed') return 'closed';
  return 'open';
}

export function solarPackCountsFromRecords(records) {
  const operation = { open: 0, closed: 0, rejected: 0 };
  const finance = { open: 0, closed: 0, rejected: 0 };
  for (const row of records || []) {
    const cat = solarCategory(row);
    const bucket = solarBucket(row);
    if (cat === 'Finance') finance[bucket] += 1;
    else if (bucket === 'rejected') operation.rejected += 1;
    else operation.open += 1;
  }
  operation.closed = finance.open + finance.closed + finance.rejected;
  return { operation, finance };
}

export function solarRowMatchesPack(row, pack, metric) {
  const cat = solarCategory(row);
  const bucket = solarBucket(row);
  if (pack === 'operation' && metric === 'closed') return cat === 'Finance';
  if (pack === 'operation') return cat === 'Operation' && bucket === metric;
  return cat === 'Finance' && bucket === metric;
}
