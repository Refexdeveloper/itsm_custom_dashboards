import assert from 'node:assert/strict';
import { dashboardRowMatchesSearch } from '../src/itsm/refex/shared/dashboardRowSearch.js';
import { buildServiceSummaryTiles } from '../src/components/it/mis/misExpandContent.js';

const row = {
  requestId: 'SR-1',
  subject: 'VPN access',
  summary: 'Laptop request',
  description: 'Cannot connect from home',
  category: 'Network',
};

assert.equal(dashboardRowMatchesSearch({ name: 'Printer jam' }, 'printer', []), true);
assert.equal(dashboardRowMatchesSearch(row, 'vpn', []), true);
assert.equal(dashboardRowMatchesSearch(row, 'home', []), true);
assert.equal(dashboardRowMatchesSearch(row, 'laptop', []), true);
assert.equal(dashboardRowMatchesSearch(row, 'network', [row.category]), true);
assert.equal(dashboardRowMatchesSearch(row, 'printer', [row.category]), false);
assert.equal(dashboardRowMatchesSearch(row, '', []), true);

const refexTiles = buildServiceSummaryTiles({
  name: 'Email not syncing',
  description: 'Outlook stays offline',
});
assert.equal(refexTiles[0].label, 'Subject');
assert.equal(refexTiles[0].value, 'Email not syncing');
assert.equal(refexTiles[1].label, 'Description');

const extrovisTiles = buildServiceSummaryTiles({
  subject: 'SAP login',
  summary: 'Different summary',
  description: 'Password reset',
});
assert.equal(extrovisTiles[0].label, 'Subject');
assert.equal(extrovisTiles[0].value, 'SAP login');
assert.equal(extrovisTiles.some((tile) => tile.label === 'Summary'), false);

console.log('dashboard search and subject expand ok');
