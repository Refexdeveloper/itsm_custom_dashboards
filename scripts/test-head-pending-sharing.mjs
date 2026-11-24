/**
 * IT Head pending request sharing: identical pending GETs collapse to one call
 * and every caller still gets the same rows as without sharing.
 * Run via: node scripts/test-head-pending-sharing.mjs
 */
import assert from 'node:assert/strict';
import { setITDashboardProfile, REFEX_PROFILE } from '../src/lib/kfITServiceDashboard.js';
import {
  setRefexPendingRequestSharing,
  clearRefexPendingTaskCaches,
  fetchRefexApproverMeLandingSeed,
  hydrateRefexMonitoringFromPersistentCache,
  fetchRefexMonitoringServiceTickets,
} from '../src/itsm/refex/techsupport/fetchRefexTechSupportTickets.js';

setITDashboardProfile(REFEX_PROFILE);

const STEPS = [
  ['Activity_head', 'IT Head Approval', 3],
  ['Activity_mgr', 'IT Manager Approval', 2],
  ['Activity_tech', 'IT Tech', 2],
  ['Activity_reopen', 'IT Tech Reopen', 1],
];

function makeKf() {
  const calls = [];
  const item = (id, step) => ({
    _id: id,
    Request_ID: id,
    _current_step: step,
    _created_at: '2026-10-30T10:00:00Z',
    _modified_at: '2026-11-01T10:00:00Z',
    _status: 'InProgress',
    _current_assigned_to: [{ _id: 'UsHEAD', Name: 'Head User' }],
  });
  const api = async (path) => {
    calls.push(path.split('?')[0]);
    await new Promise((r) => setTimeout(r, 15));
    if (path.includes('/pending/activity/count')) {
      return { data: { Data: STEPS.map(([id, StepName, Count]) => ({ _id: id, StepName, Count })) } };
    }
    const pending = path.match(/\/pending\/(Activity_[a-z]+)\?/);
    if (pending) {
      const step = STEPS.find(([id]) => id === pending[1]);
      return { data: { Data: Array.from({ length: step[2] }, (_, i) => item(`${step[0]}_${i}`, step[1])) } };
    }
    if (path.includes('/myitems/inprogress')) return { data: { Data: [item('Activity_tech_0', 'IT Tech')] } };
    return { data: { Data: [] } };
  };
  return {
    calls,
    kf: { api, account: { _id: 'AcTEST' }, user: { _id: 'UsHEAD', Name: 'Head User', Email: 'head@refex.co.in' } },
  };
}

const user = { _id: 'UsHEAD', Name: 'Head User', Email: 'head@refex.co.in' };

async function runHeadLanding(sharing) {
  clearRefexPendingTaskCaches();
  setRefexPendingRequestSharing(sharing);
  const { kf, calls } = makeKf();
  const [seed, hydrated, full] = await Promise.all([
    fetchRefexApproverMeLandingSeed(kf, user, { role: 'final' }),
    hydrateRefexMonitoringFromPersistentCache(kf, user, {}),
    fetchRefexMonitoringServiceTickets(kf, user, {}),
  ]);
  setRefexPendingRequestSharing(false);
  const summary = (rows) => (rows || []).map((r) => [r.id, r.isLiveBucketPending, r.isLiveApprovalPending, r.isLiveReopenPending]).sort();
  return { seed: summary(seed), hydrated: summary(hydrated), full: summary(full), calls };
}

const off = await runHeadLanding(false);
const on = await runHeadLanding(true);

assert.deepEqual(on.seed, off.seed, 'Me landing seed rows must not change');
assert.deepEqual(on.hydrated, off.hydrated, 'IndexedDB hydrate rows must not change');
assert.deepEqual(on.full, off.full, 'Full monitoring rows must not change');

const count = (calls, part) => calls.filter((c) => c.includes(part)).length;
const report = (label, calls) => console.log(
  `${label}: total ${calls.length} | pending/activity/count ${count(calls, '/pending/activity/count')}`
  + ` | pending lists ${count(calls, '/pending/Activity_')} | myitems/inprogress ${count(calls, '/myitems/inprogress')}`,
);
report('sharing off', off.calls);
report('sharing on ', on.calls);

assert.equal(count(on.calls, '/pending/activity/count'), 1, 'count fetched once with sharing');
// Me landing uses page_size 100 and the full load 500 — one call per page size.
assert.equal(count(on.calls, '/myitems/inprogress'), 2, 'inprogress fetched once per page size with sharing');
assert.ok(on.calls.length < off.calls.length, 'sharing must reduce calls');

// Use two consumers with different page sizes so the higher-level landing cache
// cannot satisfy both before the request-sharing layer is reached.
clearRefexPendingTaskCaches();
setRefexPendingRequestSharing(false);
const { kf: kf2, calls: calls2 } = makeKf();
await Promise.all([
  fetchRefexApproverMeLandingSeed(kf2, user, { role: 'final' }),
  fetchRefexMonitoringServiceTickets(kf2, user, {}),
]);
assert.ok(count(calls2, '/pending/activity/count') >= 2, 'other packs (sharing off) keep their own calls');

console.log('IT Head pending sharing: OK');
