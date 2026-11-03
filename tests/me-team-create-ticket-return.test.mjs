/**
 * My Team → Create Ticket → Kissflow Back must land on My Team again
 * (same as opening a row form). Me landing without a saved view stays Me.
 * Run via: node tests/me-team-create-ticket-return.test.mjs
 */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useMeTeamFormReturn } from '../src/components/it/useMeTeamFormReturn.js';
import {
  peekFormReturnView,
  resolveMeTeamFormReturnKey,
} from '../src/components/it/refexManagerFormReturnView.js';

const memory = new Map();
globalThis.sessionStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};
globalThis.window = globalThis.window || {
  setTimeout: (...a) => setTimeout(...a),
  clearTimeout: (...a) => clearTimeout(...a),
};

const PACKS = [
  { role: 'final', headerRoleLabel: 'IT Head', defaultEntity: 'Refex' },
  { role: 'first', headerRoleLabel: 'IT Manager', defaultEntity: 'Refex' },
  { role: 'first', headerRoleLabel: 'First Level Approver', defaultEntity: 'Extrovis' },
  { role: 'final', headerRoleLabel: 'Final Level Approver', defaultEntity: 'Extrovis' },
  { headerRoleLabel: 'IT Agent', poolLabel: 'Refex' },
];

function renderHook(props) {
  let api = null;
  function Probe() {
    api = useMeTeamFormReturn(props);
    return null;
  }
  renderToString(React.createElement(Probe));
  return api;
}

/** What the dashboard's initial useState reads after Back remounts it. */
function landingScope(formReturnKey) {
  if (!formReturnKey) return 'me';
  return peekFormReturnView(formReturnKey)?.scope === 'team' ? 'team' : 'me';
}

for (const pack of PACKS) {
  memory.clear();
  const formReturnKey = resolveMeTeamFormReturnKey(pack);
  assert.ok(formReturnKey, `${pack.headerRoleLabel} has a Me/My Team return key`);

  // Normal landing — no saved view → Me.
  assert.equal(landingScope(formReturnKey), 'me', `${pack.headerRoleLabel}: normal landing is Me`);

  // My Team + Create Ticket → Back → My Team.
  let opened = 0;
  const api = renderHook({
    formReturnKey,
    scope: 'team',
    serviceTab: 'OpenTickets',
    getEditRecordCellProps: () => ({}),
  });
  const create = api.withFormReturn(() => { opened += 1; return 'page'; });
  assert.equal(create(), 'page', 'open result passes through');
  assert.equal(opened, 1, 'create page opened once');
  assert.deepEqual(
    peekFormReturnView(formReturnKey),
    { scope: 'team', serviceTab: 'OpenTickets' },
    `${pack.headerRoleLabel}: My Team view saved before Create Ticket opens`,
  );
  assert.equal(landingScope(formReturnKey), 'team', `${pack.headerRoleLabel}: Back lands on My Team`);

  // Me + Create Ticket → Back → Me (unchanged behaviour).
  memory.clear();
  const meApi = renderHook({
    formReturnKey,
    scope: 'me',
    serviceTab: 'PendingTask',
    getEditRecordCellProps: () => ({}),
  });
  meApi.withFormReturn(() => Promise.resolve('page'))();
  assert.equal(landingScope(formReturnKey), 'me', `${pack.headerRoleLabel}: Me stays Me`);

  // Row form path still saves the view (existing behaviour).
  memory.clear();
  const rowApi = renderHook({
    formReturnKey,
    scope: 'team',
    serviceTab: 'Closed',
    getEditRecordCellProps: () => ({ onBeforeEdit: () => {} }),
  });
  rowApi.getFormEditProps('service').onBeforeEdit({ id: 'Pk1' });
  assert.equal(landingScope(formReturnKey), 'team', `${pack.headerRoleLabel}: row form still returns to My Team`);
}

// Packs without Me / My Team (Admin, CEO, Employee) — wrapper is a no-op.
memory.clear();
const noKey = resolveMeTeamFormReturnKey({ hideScopeSwitch: true, headerRoleLabel: 'Admin' });
assert.equal(noKey, '');
const adminApi = renderHook({ formReturnKey: noKey, scope: 'me', serviceTab: '', getEditRecordCellProps: () => ({}) });
let adminOpened = 0;
adminApi.withFormReturn(() => { adminOpened += 1; })();
assert.equal(adminOpened, 1);
assert.equal(memory.size, 0, 'no saved view for packs without Me / My Team');

console.log('Me / My Team Create Ticket return: OK');
process.exit(0);
