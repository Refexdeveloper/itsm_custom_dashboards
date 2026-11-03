import assert from 'node:assert/strict';
import {
  isRefexItManagerFormReturnDashboard,
  peekFormReturnView,
  peekRefexManagerFormReturnView,
  releaseRefexManagerFormReturnView,
  resolveMeTeamFormReturnKey,
  writeFormReturnView,
  writeRefexManagerFormReturnView,
  REFEX_MANAGER_FORM_RETURN_VIEW_KEY,
} from '../src/components/it/refexManagerFormReturnView.js';

const memory = new Map();
globalThis.sessionStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};

function reset() {
  memory.clear();
}

assert.equal(isRefexItManagerFormReturnDashboard({
  role: 'first',
  headerRoleLabel: 'IT Manager',
  defaultEntity: 'Refex',
}), true);
assert.equal(isRefexItManagerFormReturnDashboard({
  role: 'final',
  headerRoleLabel: 'IT Head',
  defaultEntity: 'Refex',
}), false);
assert.equal(isRefexItManagerFormReturnDashboard({
  role: 'first',
  headerRoleLabel: 'First Level Approver',
  defaultEntity: 'Extrovis',
}), false);
assert.equal(isRefexItManagerFormReturnDashboard({
  role: 'final',
  headerRoleLabel: 'Group CEO',
  defaultEntity: 'Refex',
}), false);

const managerKey = resolveMeTeamFormReturnKey({
  role: 'first',
  headerRoleLabel: 'IT Manager',
  defaultEntity: 'Refex',
});
const headKey = resolveMeTeamFormReturnKey({
  role: 'final',
  headerRoleLabel: 'IT Head',
  defaultEntity: 'Refex',
});
const ceoKey = resolveMeTeamFormReturnKey({
  role: 'final',
  headerRoleLabel: 'Group CEO',
  defaultEntity: 'Refex',
});
const agentRefexKey = resolveMeTeamFormReturnKey({
  headerRoleLabel: 'IT Agent',
  poolLabel: 'Refex',
});
const agentExtrovisKey = resolveMeTeamFormReturnKey({
  headerRoleLabel: 'IT Agent',
  poolLabel: 'Extrovis',
});
assert.equal(managerKey, REFEX_MANAGER_FORM_RETURN_VIEW_KEY);
assert.notEqual(headKey, managerKey);
assert.notEqual(ceoKey, headKey);
assert.notEqual(agentRefexKey, agentExtrovisKey);
assert.equal(resolveMeTeamFormReturnKey({
  role: 'final',
  headerRoleLabel: 'Admin',
  defaultEntity: 'Refex',
  hideScopeSwitch: true,
}), '');
assert.equal(resolveMeTeamFormReturnKey({
  role: 'final',
  headerRoleLabel: 'Common Refex Dashboard',
  defaultEntity: 'Refex',
  personalOnly: true,
}), '');
assert.equal(resolveMeTeamFormReturnKey({
  headerRoleLabel: 'IT Agent',
  poolLabel: 'Extrovis',
  hideMeTeam: true,
}), '');

reset();
assert.equal(peekRefexManagerFormReturnView(), null, 'normal landing has no return view');

reset();
assert.equal(writeRefexManagerFormReturnView({ scope: 'team', serviceTab: 'OpenTickets' }), true);
const saved = peekRefexManagerFormReturnView();
assert.equal(saved.scope, 'team');
assert.equal(saved.serviceTab, 'OpenTickets');

reset();
writeRefexManagerFormReturnView({ scope: 'me', serviceTab: 'PendingTask' });
assert.equal(peekRefexManagerFormReturnView().scope, 'me');

reset();
memory.set(REFEX_MANAGER_FORM_RETURN_VIEW_KEY, JSON.stringify({
  scope: 'team',
  serviceTab: 'AllTickets',
  at: Date.now() - (13 * 60 * 60 * 1000),
}));
assert.equal(peekRefexManagerFormReturnView(), null, 'a view from a previous day is ignored');

reset();
writeRefexManagerFormReturnView({ scope: 'team', serviceTab: 'Closed' });
releaseRefexManagerFormReturnView();
assert.equal(peekRefexManagerFormReturnView(), null, 'released view does not change the next landing');

reset();
writeFormReturnView(headKey, { scope: 'team', serviceTab: 'AllTickets' });
assert.equal(peekFormReturnView(headKey).scope, 'team');
assert.equal(peekRefexManagerFormReturnView(), null, 'another dashboard does not read the IT Head view');

console.log('refex manager form return view ok');
