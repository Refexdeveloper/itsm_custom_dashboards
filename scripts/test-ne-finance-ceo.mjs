import assert from 'node:assert/strict';
import { filterGcpRecords } from '../src/lib/neGcpDashboardMath.js';
import {
  TRAVEL_PROCESS_SECTIONS,
  annotateTravelBookingFareRows,
  countByStatus,
  fareTrendFilterLabel,
  filterFinanceVisibleRows,
  formatInr,
  sumRecordAmount,
  travelColumnsForPack,
  travelExpandTiles,
  travelPackMatches,
  solarPackCountsFromRecords,
  solarRowMatchesPack,
} from '../src/lib/neFinanceDashboardMath.js';

const rows = [
  { request_id: 'EXP-1', expense_type: 'Local Conveyance', status: 'open', amount: 900, process_id: 'Expense_Management_A00' },
  { request_id: 'EXP-2', expense_type: 'Food Allowance', status: 'closed', amount: 800, process_id: 'Expense_Management_A00' },
  { request_id: 'TR-1', subject: 'Travel request', status: 'open', amount: 4000, process_id: 'Travel_Management_A00' },
];

assert.equal(sumRecordAmount(rows, 'open'), 4900);
assert.equal(countByStatus(rows, 'closed'), 1);
assert.equal(formatInr(800), '₹800');

const openOnly = filterFinanceVisibleRows(rows, { kpiFocus: 'open' });
assert.equal(openOnly.length, 2);
assert.deepEqual(openOnly.map((row) => row.request_id), ['EXP-1', 'TR-1']);

const booking = TRAVEL_PROCESS_SECTIONS.find((section) => section.kind === 'booking');
assert.equal(travelPackMatches(rows[2], booking.match), true);
assert.equal(travelPackMatches(rows[0], booking.match), false);

const bookingRows = filterFinanceVisibleRows(rows, { travelPack: { key: 'booking' } });
assert.equal(bookingRows.length, 1);
assert.equal(bookingRows[0].request_id, 'TR-1');
const bookingOpen = filterFinanceVisibleRows(rows, { travelPack: { key: 'booking', metric: 'open' } });
assert.equal(bookingOpen.length, 1);
const bookingClosed = filterFinanceVisibleRows(rows, { travelPack: { key: 'booking', metric: 'closed' } });
assert.equal(bookingClosed.length, 0);
const searched = filterFinanceVisibleRows(rows, { search: 'food' });
assert.equal(searched.length, 1);
assert.equal(searched[0].request_id, 'EXP-2');

assert.deepEqual(
  travelColumnsForPack('booking').map((col) => col.id).filter((id) => [
    'reference_fare', 'policy_deviation_cost', 'deviation_pct', 'sla', 'fare_trend',
  ].includes(id)),
  ['reference_fare', 'policy_deviation_cost', 'deviation_pct', 'sla', 'fare_trend'],
);
assert.equal(fareTrendFilterLabel('Flat', 0), '■0%');
assert.equal(fareTrendFilterLabel('Up', 0.001), '■0%');
assert.equal(fareTrendFilterLabel('Down', -0.004), '■0%');
assert.equal(fareTrendFilterLabel('Up', 0.45), '▲45%');

const fareRows = annotateTravelBookingFareRows([
  { id: '1', process_id: 'Travel_Management_A02', travel_mode: 'Air', from_city: 'Chennai', to_city: 'Pune', amount: 5605, created_at: '2026-01-01' },
  { id: '2', process_id: 'Travel_Management_A02', travel_mode: 'Air', from_city: 'Chennai', to_city: 'Pune', amount: 5822, created_at: '2026-02-01' },
  { id: '3', process_id: 'Travel_Management_A02', travel_mode: 'Air', from_city: 'Chennai', to_city: 'Pune', amount: 8466, created_at: '2026-03-01', departure_date: '2026-03-13' },
]);
assert.equal(fareRows[2].reference_fare, 5822);
assert.equal(fareRows[2].fare_trend, 'Up');
const expand = travelExpandTiles(fareRows[2], { includeFareDetails: true });
assert.equal(expand.some((tile) => tile.label === 'Fare trend' && tile.value === '▲45%'), true);
assert.equal(travelExpandTiles(fareRows[2]).some((tile) => tile.label === 'Fare trend'), false);

const solarRows = [
  { request_id: 'S1', current_step: 'HO Review', status: 'open' },
  { request_id: 'S2', current_step: 'BU Approval', status: 'open' },
  { request_id: 'S3', current_step: 'Finance Processing', status: 'closed' },
];
const solarCounts = solarPackCountsFromRecords(solarRows);
assert.equal(solarCounts.operation.open, 1);
assert.equal(solarCounts.operation.closed, 2);
assert.equal(solarCounts.finance.open, 1);
assert.equal(solarCounts.finance.closed, 1);
assert.equal(solarRowMatchesPack(solarRows[0], 'operation', 'open'), true);
assert.equal(solarRowMatchesPack(solarRows[1], 'finance', 'open'), true);
const solarFiltered = filterFinanceVisibleRows(solarRows, { solarPack: { key: 'operation', metric: 'open' } });
assert.equal(solarFiltered.length, 1);
assert.equal(solarFiltered[0].request_id, 'S1');

const headerRows = [
  { request_id: 'A', company_name: 'Extrovis', assigned_to: 'Ravi Kumar', created_at: '2026-10-01T04:00:00Z', status: 'open' },
  { request_id: 'B', company_name: 'Refex Industries Limited', assigned_to: 'Meera', created_at: '2026-10-02T04:00:00Z', status: 'open' },
];
const companyScoped = filterGcpRecords(headerRows, { company: 'extrovis', period: 'fy' }, new Date('2026-10-15T06:00:00Z'));
assert.deepEqual(companyScoped.map((row) => row.request_id), ['A']);
const userScoped = filterGcpRecords(headerRows, { user: 'Ravi Kumar', period: 'fy' }, new Date('2026-10-15T06:00:00Z'));
assert.deepEqual(userScoped.map((row) => row.request_id), ['A']);

console.log('OK  NE finance CEO packs without claim-type cards');
