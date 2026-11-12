/**
 * CEO /travel: SLA Breached (created vs departure) + Department by requester — same rules as
 * Notification Engine travelDepartmentSla.ts.
 * Run via: node tests/travel-ceo-sla-department.test.mjs
 */
import assert from 'node:assert/strict';
import {
  buildTravelRequesterDepartments,
  filterFinanceVisibleRows,
  filterTravelRowsByDepartment,
  isTravelSlaBreached,
  travelDepartmentSelectOptions,
  travelRowDepartment,
} from '../src/lib/neFinanceDashboardMath.js';

const NOW = Date.parse('2026-11-03T06:00:00Z');

// Breached only when departure is before created (MIS column). SLA_Deadline ignored.
assert.equal(
  isTravelSlaBreached({
    status: 'open',
    created_at: '2026-11-03T10:00:00Z',
    departure_date: '2026-11-01T10:00:00Z',
    sla_deadline: '2026-11-09T00:00:00Z',
  }, NOW),
  true,
);
assert.equal(
  isTravelSlaBreached({
    status: 'open',
    created_at: '2026-11-01T10:00:00Z',
    departure_date: '2026-11-04T10:00:00Z',
    sla_deadline: '2026-11-01T00:00:00Z',
  }, NOW),
  false,
);
assert.equal(isTravelSlaBreached({ status: 'open', sla_deadline: '2026-11-01T10:00:00Z' }, NOW), false);
assert.equal(isTravelSlaBreached({ status: 'open' }, NOW), false);

const rows = [
  { id: 'e1', process_id: 'Travel expense', requested_by: 'Palani C', department: 'Finance', created_at: '2026-10-01T00:00:00Z' },
  { id: 'e2', process_id: 'Travel expense', requested_by: 'Palani C', department: 'Operations', created_at: '2026-10-20T00:00:00Z' },
  { id: 'e3', process_id: 'Travel expense', requested_by: 'Jagan Mohan', department: 'Business Development' },
  {
    id: 'b1',
    process_id: 'Travel request',
    requested_by: 'Palani C',
    status: 'open',
    created_at: '2026-11-03T10:00:00Z',
    departure_date: '2026-11-01T10:00:00Z',
  },
  {
    id: 'b2',
    process_id: 'Travel request',
    requested_by: 'jagan  mohan',
    status: 'open',
    created_at: '2026-11-01T10:00:00Z',
    departure_date: '2026-11-09T00:00:00Z',
  },
  { id: 'b3', process_id: 'Travel request', requested_by: 'No Expense Person' },
  { id: 'a1', process_id: 'Travel advance', requested_by: 'Jagan Mohan' },
];
const map = buildTravelRequesterDepartments(rows);
assert.equal(travelRowDepartment(rows[3], map), 'Operations', 'latest expense department wins');
assert.equal(travelRowDepartment(rows[4], map), 'Business Development');
assert.equal(travelRowDepartment(rows[5], map), '');
assert.deepEqual(travelDepartmentSelectOptions(rows, map), [
  { key: '', label: 'All Departments' },
  { key: 'Business Development', label: 'Business Development' },
  { key: 'Finance', label: 'Finance' },
  { key: 'Operations', label: 'Operations' },
]);
assert.deepEqual(filterTravelRowsByDepartment(rows, '', map), rows);
assert.deepEqual(filterTravelRowsByDepartment(rows, 'Business Development', map).map((r) => r.id), ['e3', 'b2', 'a1']);

// SLA Breached card → table shows only breached booking rows.
const visible = filterFinanceVisibleRows(rows, { travelPack: { key: 'booking', metric: 'sla' } }, new Date(NOW));
assert.deepEqual(visible.map((r) => r.id), ['b1']);

console.log('Travel CEO SLA + department: OK');
