import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv.slice(2).find((arg) => !arg.startsWith('--')) || '.');
const probeOriginal = process.argv.includes('--baseline');
const scaleArg = process.argv.find((s) => s.startsWith('--burst='));
const burst = scaleArg ? Number(scaleArg.split('=')[1]) : 501;
const volume = scaleArg ? burst : 502;
const load = (path) => import(pathToFileURL(resolve(root, 'src', path)).href);
const { REFEX_PROFILE, setITDashboardProfile } = await load('lib/kfITServiceDashboard.js');
const { setDashboardPerformanceMode } = await load('lib/dashboardPerformanceMode.js');
const { noteKfWrite } = await load('lib/kfRuntime.js');
const store = await load('itsm/refex/shared/refexDatasetStore.js');
setITDashboardProfile(REFEX_PROFILE);
setDashboardPerformanceMode(true);

const RealDate = Date;
let now = Date.parse('2026-11-24T05:00:00Z');
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [now]));
  }
  static now() {
    return now;
  }
};
const entries = new Map();
// Model the IndexedDB requests used by the report store, including read-before-write.
globalThis.indexedDB = {
  open() {
    const db = {
      transaction() {
        const tx = {
          objectStore() {
            return {
              get(key) {
                const req = {};
                queueMicrotask(() => {
                  req.result = structuredClone(entries.get(key));
                  req.onsuccess();
                  queueMicrotask(() => tx.oncomplete?.());
                });
                return req;
              },
              put(value) {
                entries.set(value.key, structuredClone(value));
                queueMicrotask(() => tx.oncomplete?.());
              },
              delete(key) {
                entries.delete(key);
                queueMicrotask(() => tx.oncomplete?.());
              },
            };
          },
        };
        return tx;
      },
    };
    const req = { result: db };
    queueMicrotask(() => req.onsuccess());
    return req;
  },
};
const user = { _id: 'FixtureHead', Email: 'head@example.invalid' };
const opts = {
  softRefresh: true,
  keepCachedReport: true,
  reportFilters: probeOriginal ? {} : { headReportUser: user._id },
};
const oldDate = '2026-10-01T08:00:00Z';
let fixtures = Array.from({ length: volume }, (_, i) => ({
  _id: 'item' + i,
  Request_ID: 'IT-' + i,
  _created_at: oldDate,
  _modified_at: oldDate,
  _status: 'InProgress',
  Category: 'Network',
  Source: 'Email',
  Ticket_Type: 'Incident',
  revision: 0,
}));
let fault = '',
  calls = [];
const kf = {
  account: { _id: 'test' },
  user,
  async api(path, options) {
    assert.equal(options.method, 'GET');
    const url = new URL(path, 'https://fixture.invalid');
    const p = url.searchParams;
    const modified = p.get('$modified_at_gt'),
      created = p.get('$created_at_gt'),
      status = p.get('$status');
    const page = Number(p.get('page_number')),
      size = Number(p.get('page_size'));
    const report = url.pathname.includes('/process-report/');
    calls.push({ report, modified, created, status, page });
    if (!report) return { data: { Data: [] } };
    if (fault === 'error' && status === 'InProgress' && page === 1)
      throw Error('fixture request failed');
    if (fault === 'error2' && status === 'InProgress' && page === 2)
      throw Error('fixture page two failed');
    const filtered = fixtures.filter(
      (r) =>
        (!status || r._status === status) &&
        (!modified || fault === 'ignored' || Date.parse(r._modified_at) > Date.parse(modified)) &&
        (!created || Date.parse(r._created_at) > Date.parse(created)),
    );
    const offset = fault === 'repeat' ? 0 : (page - 1) * size;
    return { data: { Data: filtered.slice(offset, offset + size) } };
  },
};
const ensure = (extra = {}) =>
  store.ensureRefexMappedDataset('monitoring', kf, user, { ...opts, ...extra });
const last = () => [...entries.values()][0];
const outcome = {};
await ensure();
assert.equal(last().items.length, volume);
now += 3600_000;
fixtures = fixtures.map((r, i) =>
  i < burst ? { ...r, _modified_at: new Date().toISOString(), revision: 1 } : r,
);
calls = [];
const start = performance.now();
const changed = await ensure();
outcome.burstElapsedS = (performance.now() - start) / 1000;
outcome.burstUpdated = last().items.filter((r) => r.revision === 1).length;
outcome.burstPageNumbers = calls.filter((c) => c.status === 'InProgress').map((c) => c.page);
assert.equal(outcome.burstUpdated, probeOriginal ? Math.min(500, burst) : burst);
calls = [];
const switched = await ensure({ reuseFreshTeamSnapshot: true, weeklyRefreshScope: 'oversight' });
outcome.validSwitchGets = calls.length;
assert.deepEqual(changed, switched);
assert.equal(calls.length === 0, !probeOriginal);
if (scaleArg) {
  console.log(JSON.stringify({ burst, ...outcome }));
  process.exit(0);
}
calls = [];
await ensure();
outcome.manualRefreshReportGets = calls.filter((c) => c.report).length;
assert.ok(outcome.manualRefreshReportGets >= 6);

for (const scenario of ['error', 'error2', 'repeat', 'ignored']) {
  const saved = last().lastSyncAt;
  now += 3600_000;
  fixtures = fixtures.map((r, i) =>
    i < burst ? { ...r, _modified_at: scenario === 'ignored' ? oldDate : new Date().toISOString() } : r,
  );
  fault = scenario;
  let failed = false;
  try {
    await ensure();
  } catch {
    failed = true;
  }
  outcome[scenario] = { rejected: failed, cursorKept: last().lastSyncAt === saved };
  if (!probeOriginal) {
    assert.ok(failed, scenario);
    assert.equal(last().lastSyncAt, saved, scenario);
  }
  fault = '';
  await ensure();
}
if (!probeOriginal) {
  noteKfWrite();
  calls = [];
  await ensure({ reuseFreshTeamSnapshot: true });
  assert.ok(calls.some((c) => c.report));
  now += 16_000;
  calls = [];
  await ensure({ reuseFreshTeamSnapshot: true });
  assert.ok(calls.some((c) => c.report));
  outcome.writeAndExpiry = 'revalidated';
  const [key] = entries.keys();
  const { setPersistentReportCache } = await load('itsm/refex/shared/refexPersistentReportCache.js');
  const { items, revision, lastSyncAt } = last();
  assert.equal(await setPersistentReportCache(key, { items, lastSyncAt }, revision - 1), 'conflict');
  assert.equal(last().revision, revision);
  outcome.staleWriter = 'rejected';
  // A saved, valid empty snapshot remains eligible for deltas on the next load.
  fixtures = [];
  await ensure({ forceRefresh: true });
  calls = [];
  await ensure();
  assert.equal(calls.filter((c) => c.report && !c.status && !c.created && !c.modified).length, 0);
  outcome.emptySnapshot = 'delta';
}
console.log(JSON.stringify(outcome));
process.exit(0);
