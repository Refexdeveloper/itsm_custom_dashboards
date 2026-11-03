/**
 * IT Head: twin soft ensure joins one walk; identical instance enrich GETs share.
 * Run via: node scripts/test-head-twin-load-and-enrich.mjs
 */
import assert from 'node:assert/strict';
import { setITDashboardProfile, REFEX_PROFILE } from '../src/lib/kfITServiceDashboard.js';
import {
  ensureRefexMappedDataset,
  invalidateRefexMappedDataset,
  setJoinInflightMappedLoads,
} from '../src/itsm/refex/shared/refexDatasetStore.js';
import {
  setRefexPendingRequestSharing,
  clearRefexPendingTaskCaches,
  clearRequestIdReportCache,
} from '../src/itsm/refex/techsupport/fetchRefexTechSupportTickets.js';
import { setItHeadPerformanceMode } from '../src/lib/itHeadPerformanceMode.js';

setITDashboardProfile(REFEX_PROFILE);

function makeKf({ delayMs = 40 } = {}) {
  const calls = [];
  const pendingItems = Array.from({ length: 5 }, (_, i) => ({
    _id: `PkInst${i}`,
    Request_ID: `IT-IC-Refex-FY026-00010${i}`,
    _activity_instance_id: `PkAct${i}`,
    _current_step: i % 2 ? 'IT Tech Reopen' : 'IT Head Approval',
    _created_at: '2026-10-30T10:00:00Z',
    _modified_at: '2026-11-01T10:00:00Z',
    _status: 'InProgress',
    _current_assigned_to: [{ _id: 'UsHEAD', Name: 'Head User' }],
    Category: 'Network',
    Source: 'Email',
    Ticket_Type: 'Incident',
  }));

  const api = async (path) => {
    calls.push(path.split('?')[0]);
    await new Promise((r) => setTimeout(r, delayMs));
    if (path.includes('/pending/activity/count')) {
      return {
        data: {
          Data: [
            { _id: 'Activity_head', StepName: 'IT Head Approval', Count: 3 },
            { _id: 'Activity_reopen', StepName: 'IT Tech Reopen', Count: 2 },
            { _id: 'Activity_tech', StepName: 'IT Tech', Count: 0 },
          ],
        },
      };
    }
    const pending = path.match(/\/pending\/(Activity_[a-z]+)\?/);
    if (pending) {
      const step = pending[1] === 'Activity_reopen' ? 'IT Tech Reopen' : 'IT Head Approval';
      const slice = pendingItems.filter((row) => row._current_step === step);
      return { data: { Data: slice } };
    }
    if (path.includes('/myitems/')) return { data: { Data: [] } };
    if (path.includes('/participated/')) return { data: { Data: [] } };
    if (path.includes('process-report')) return { data: { Data: [] } };
    // Instance enrich: /process/2/{account}/Live_…/{instance}/{activity}
    const inst = path.match(/\/(PkInst\d+)\/(PkAct\d+)/);
    if (inst) {
      const row = pendingItems.find((r) => r._id === inst[1]);
      return { data: { Data: { ...(row || {}), Description: 'enriched' } } };
    }
    if (path.includes('/admin/')) return { data: { Data: {} } };
    return { data: { Data: [] } };
  };

  return {
    calls,
    kf: {
      api,
      account: { _id: 'AcTEST' },
      user: { _id: 'UsHEAD', Name: 'Head User', Email: 'head@refex.co.in' },
    },
  };
}

const user = { _id: 'UsHEAD', Name: 'Head User', Email: 'head@refex.co.in' };

function countPaths(calls, part) {
  return calls.filter((c) => c.includes(part)).length;
}

// --- Twin soft ensure joins when mode on ---
{
  invalidateRefexMappedDataset();
  clearRefexPendingTaskCaches();
  clearRequestIdReportCache();
  setJoinInflightMappedLoads(false);
  setRefexPendingRequestSharing(false);

  const off = makeKf({ delayMs: 50 });
  const offPromise = Promise.all([
    ensureRefexMappedDataset('monitoring', off.kf, user, { softRefresh: true }),
    ensureRefexMappedDataset('monitoring', off.kf, user, { softRefresh: true }),
  ]);
  const offRows = await offPromise;
  assert.equal(offRows[0].length, offRows[1].length);
  const offCounts = countPaths(off.calls, '/pending/activity/count');
  assert.ok(offCounts >= 2, `mode off should race twin soft loads (got ${offCounts} counts)`);

  invalidateRefexMappedDataset();
  clearRefexPendingTaskCaches();
  clearRequestIdReportCache();
  setJoinInflightMappedLoads(true);

  const on = makeKf({ delayMs: 50 });
  const onRows = await Promise.all([
    ensureRefexMappedDataset('monitoring', on.kf, user, { softRefresh: true }),
    ensureRefexMappedDataset('monitoring', on.kf, user, { softRefresh: true }),
  ]);
  assert.equal(onRows[0].length, onRows[1].length);
  const onCounts = countPaths(on.calls, '/pending/activity/count');
  // One soft walk still fans out to approval/reopen/open-work pools (several counts).
  // Joining must cut the twin race roughly in half — not restart a second walk.
  assert.ok(
    onCounts < offCounts,
    `mode on must join twin soft loads (off=${offCounts}, on=${onCounts})`,
  );
  assert.ok(
    onCounts <= Math.ceil(offCounts / 2) + 1,
    `joined walk should be about half the raced counts (off=${offCounts}, on=${onCounts})`,
  );
  setJoinInflightMappedLoads(false);
  console.log(`twin soft ensure: off counts=${offCounts}, on counts=${onCounts}`);
}

// --- Instance enrich sharing across a twin soft race (pre-join behaviour) ---
{
  invalidateRefexMappedDataset();
  clearRefexPendingTaskCaches();
  clearRequestIdReportCache();
  // Keep join OFF so both soft walks run — same tickets enriched twice without sharing.
  setJoinInflightMappedLoads(false);
  setRefexPendingRequestSharing(false);

  const off = makeKf({ delayMs: 5 });
  await Promise.all([
    ensureRefexMappedDataset('monitoring', off.kf, user, { softRefresh: true }),
    ensureRefexMappedDataset('monitoring', off.kf, user, { softRefresh: true }),
  ]);
  const offInst = off.calls.filter((c) => /PkInst\d+\/PkAct\d+/.test(c)).length;

  invalidateRefexMappedDataset();
  clearRefexPendingTaskCaches();
  clearRequestIdReportCache();
  setJoinInflightMappedLoads(false);
  setRefexPendingRequestSharing(true);

  const on = makeKf({ delayMs: 5 });
  await Promise.all([
    ensureRefexMappedDataset('monitoring', on.kf, user, { softRefresh: true }),
    ensureRefexMappedDataset('monitoring', on.kf, user, { softRefresh: true }),
  ]);
  const onInst = on.calls.filter((c) => /PkInst\d+\/PkAct\d+/.test(c)).length;

  setRefexPendingRequestSharing(false);
  assert.ok(offInst > 0, 'enrich should call instance GETs');
  assert.ok(
    onInst < offInst,
    `sharing must cut duplicate instance GETs across twin loads (off=${offInst}, on=${onInst})`,
  );
  // 5 unique tickets; twin race without sharing ≈ 10; with sharing ≈ 5.
  assert.ok(
    onInst <= 5,
    `shared enrich should be about one GET per ticket (got ${onInst})`,
  );
  console.log(`instance enrich GETs (twin race): off=${offInst}, on=${onInst}`);
}

// --- A Kissflow write must never be followed by pre-write data ---
{
  const { kfMutateJson, trackKfProcessWrites, getKfWriteEpoch } = await import('../src/lib/kfRuntime.js');

  // 1) Refresh after an action does not join a load that started before the action.
  invalidateRefexMappedDataset();
  clearRefexPendingTaskCaches();
  clearRequestIdReportCache();
  setItHeadPerformanceMode(true);
  const before = makeKf({ delayMs: 60 });
  const staleLoad = ensureRefexMappedDataset('monitoring', before.kf, user, { softRefresh: true });
  await kfMutateJson(before.kf, '/process/2/AcTEST/x/PkInst0/PkAct0/submit', { method: 'POST', body: {} });
  const afterWrite = ensureRefexMappedDataset('monitoring', before.kf, user, { softRefresh: true });
  assert.notEqual(afterWrite, staleLoad, 'post-write refresh must start its own load');
  await Promise.all([staleLoad, afterWrite]);
  const countsAfterWrite = countPaths(before.calls, '/pending/activity/count');
  assert.ok(countsAfterWrite >= 2, `post-write refresh re-reads pending (counts=${countsAfterWrite})`);

  // 2) Forced Refresh never joins an in-flight soft load.
  invalidateRefexMappedDataset();
  clearRefexPendingTaskCaches();
  const forceKf = makeKf({ delayMs: 60 });
  const softLoad = ensureRefexMappedDataset('monitoring', forceKf.kf, user, { softRefresh: true });
  const forceLoad = ensureRefexMappedDataset('monitoring', forceKf.kf, user, { forceRefresh: true });
  assert.notEqual(forceLoad, softLoad, 'force Refresh must not join a soft load');
  await Promise.all([softLoad, forceLoad]);

  // 3) Shared pending GET is dropped by a write (no 5 s stale pending list).
  invalidateRefexMappedDataset();
  clearRefexPendingTaskCaches();
  const shareKf = makeKf({ delayMs: 5 });
  await ensureRefexMappedDataset('monitoring', shareKf.kf, user, { softRefresh: true });
  const c1 = countPaths(shareKf.calls, '/pending/activity/count');
  await ensureRefexMappedDataset('monitoring', shareKf.kf, user, { softRefresh: true });
  const c2 = countPaths(shareKf.calls, '/pending/activity/count');
  assert.equal(c2, c1, 'within 5 s and no write, identical pending count is shared');
  const epoch = getKfWriteEpoch();
  const proc = trackKfProcessWrites({ submitItem: async () => 'ok', getItem: () => 'read' });
  assert.equal(proc.getItem(), 'read', 'SDK reads pass through');
  assert.equal(getKfWriteEpoch(), epoch, 'SDK reads do not count as writes');
  assert.equal(await proc.submitItem({}), 'ok', 'SDK submit result passes through');
  assert.ok(getKfWriteEpoch() > epoch, 'SDK submit counts as a write');
  await ensureRefexMappedDataset('monitoring', shareKf.kf, user, { softRefresh: true });
  const c3 = countPaths(shareKf.calls, '/pending/activity/count');
  assert.ok(c3 > c2, `after a write the pending count is fetched again (${c2} → ${c3})`);
  setItHeadPerformanceMode(false);
  console.log(`write safety: post-write counts=${countsAfterWrite}, shared ${c1}→${c2}, after write ${c3}`);
}

console.log('IT Head twin load + enrich sharing: OK');
process.exit(0);
