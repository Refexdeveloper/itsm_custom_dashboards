import assert from 'node:assert/strict';
import {
  TRAVEL_TABLE_COLUMNS,
  annotateTravelBookingFareRows,
  fareTrendFilterLabel,
  isTravelBookingRow,
} from '../src/lib/neFinanceDashboardMath.js';

const bookingCols = TRAVEL_TABLE_COLUMNS.booking.map((col) => col.id);
assert.ok(bookingCols.includes('reference_fare'));
assert.ok(bookingCols.includes('fare_trend'));
assert.equal(isTravelBookingRow({ process_id: 'Travel_Management_A02' }), true);
assert.equal(isTravelBookingRow({ process_id: 'Travel Advance' }), false);

const rows = annotateTravelBookingFareRows([
  { id: '1', process_id: 'Travel_Management_A02', travel_mode: 'Air', from_city: 'Chennai', to_city: 'Pune', amount: 5605, created_at: '2026-01-01' },
  { id: '2', process_id: 'Travel_Management_A02', travel_mode: 'Air', from_city: 'Chennai', to_city: 'Pune', amount: 5822, created_at: '2026-02-01' },
  { id: '3', process_id: 'Travel_Management_A02', travel_mode: 'Air', from_city: 'Chennai', to_city: 'Pune', amount: 8466, created_at: '2026-03-01', departure_date: '2026-03-13' },
]);
assert.equal(rows[2].reference_fare, 5822);
assert.equal(rows[2].fare_trend, 'Up');
assert.equal(fareTrendFilterLabel('Flat', 0), '■0%');
assert.equal(fareTrendFilterLabel('Up', 0.001), '■0%');
console.log('travel CEO fare parity ok');
