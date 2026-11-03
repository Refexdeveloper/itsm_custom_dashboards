/**
 * IT Head performance mode must not change any data:
 *  - mapped rows, KPI matchers and date text identical with the mode off / on
 *  - Kissflow GETs that never answer fail after the timeout (only when on)
 * Run via: node scripts/test-head-performance-mode.mjs
 */
import assert from 'node:assert/strict';
import * as KF from '../src/lib/kfITServiceDashboard.js';
import { kfGetJson, kfMutateJson, setKfReadTimeout } from '../src/lib/kfRuntime.js';
import { setItHeadPerformanceMode, IT_HEAD_KF_READ_TIMEOUT_MS } from '../src/lib/itHeadPerformanceMode.js';
import { MOCK_IT_MANAGER_TASKS, MOCK_IT_MANAGER_USER } from '../src/mocks/itManagerTasks.js';
import { MOCK_IT_REPORT } from '../src/mocks/itServiceRequests.js';
import { MOCK_IT_ADMIN_REPORT } from '../src/mocks/itAdminTasks.js';

KF.setITDashboardProfile(KF.REFEX_PROFILE);

// Real-shaped rows plus case variants so the case-insensitive fallback is exercised.
const base = [
  ...(MOCK_IT_MANAGER_TASKS.Data || []),
  ...(MOCK_IT_REPORT.Data || []),
  ...(MOCK_IT_ADMIN_REPORT.Data || []),
];
const variants = [];
base.forEach((item, i) => {
  variants.push(item);
  const lower = {};
  Object.entries(item).forEach(([k, v]) => { lower[i % 2 ? k.toLowerCase() : k.toUpperCase()] = v; });
  variants.push(lower);
  variants.push({ Data: item });
});
const rows = [];
for (let n = 0; n < 40; n += 1) variants.forEach((v) => rows.push(v));

const MATCHERS = [
  'isRefexServiceClosedTicket', 'isRefexServiceOpenTicket', 'isRefexServiceRejectedTicket',
  'isRefexServiceProcessCompleted', 'isServiceQueueSlaBreachedTicket', 'isServiceQueueClosedSlaBreachedTicket',
  'isServiceQueueAnySlaBreachedTicket', 'isActiveServiceQueueTicket', 'isServiceSlaPendingApprovalRow',
  'isSlaHoldRow', 'isServiceReopenedTicket', 'isITTechReopenStep', 'isLiveBucketPendingRow',
  'isTicketClosedByUser', 'matchesRefexMeOnlyScope',
].filter((name) => typeof KF[name] === 'function');

function snapshot() {
  const mapped = rows.map((r) => KF.mapReportRow(r));
  const flags = mapped.map((row) => MATCHERS.map((name) => {
    try { return KF[name](row, MOCK_IT_MANAGER_USER); } catch (e) { return `ERR:${e.message}`; }
  }));
  return { mapped: JSON.stringify(mapped), flags: JSON.stringify(flags), count: mapped.length };
}

function timed(fn) {
  const t = process.hrtime.bigint();
  const out = fn();
  return { out, ms: Number(process.hrtime.bigint() - t) / 1e6 };
}

setItHeadPerformanceMode(false);
const offRun = timed(snapshot);
setItHeadPerformanceMode(true);
const onRun = timed(snapshot);
setItHeadPerformanceMode(false);

assert.equal(onRun.out.count, offRun.out.count);
assert.equal(onRun.out.mapped, offRun.out.mapped, 'mapped rows must be identical');
assert.equal(onRun.out.flags, offRun.out.flags, 'KPI / Me matchers must be identical');
console.log(`rows ${offRun.out.count}, matchers ${MATCHERS.length}: mode off ${offRun.ms.toFixed(0)} ms, on ${onRun.ms.toFixed(0)} ms`);

// Per-ticket step/status cache: re-running matchers on the SAME mapped rows (a tab /
// My Team click) must give identical flags, warm cache included, and must not leak
// across an entity profile switch.
const mappedOnce = rows.map((r) => KF.mapReportRow(r));
const flagsFor = () => JSON.stringify(mappedOnce.map((row) => MATCHERS.map((name) => {
  try { return KF[name](row, MOCK_IT_MANAGER_USER); } catch (e) { return `ERR:${e.message}`; }
})));
const STEP_HELPERS = ['getCurrentStepValue', 'isEmployeeApprovalRefexStep', 'isITTechReopenStep']
  .filter((name) => typeof KF[name] === 'function');
const stepsFor = () => JSON.stringify(mappedOnce.map((row) => STEP_HELPERS.map((name) => KF[name](row))));
for (const profile of [KF.REFEX_PROFILE, KF.EXTROVIS_PROFILE, KF.REFEX_PROFILE]) {
  KF.setITDashboardProfile(profile);
  setItHeadPerformanceMode(false);
  const offFlags = flagsFor();
  const offSteps = stepsFor();
  setItHeadPerformanceMode(true);
  const cold = timed(flagsFor);
  const warm = timed(flagsFor);
  const onSteps = stepsFor();
  setItHeadPerformanceMode(false);
  assert.equal(cold.out, offFlags, `matchers identical (cold cache, ${profile.id})`);
  assert.equal(warm.out, offFlags, `matchers identical (warm cache, ${profile.id})`);
  assert.equal(onSteps, offSteps, `step helpers identical (${profile.id})`);
  console.log(`re-filter same rows (${profile.id}): cold ${cold.ms.toFixed(0)} ms, warm ${warm.ms.toFixed(0)} ms`);
}
KF.setITDashboardProfile(KF.REFEX_PROFILE);

// Date text identical for every hour across two years, both formatting paths.
const dates = [];
for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2027, 0, 1); t += 3600000 * 7) dates.push(new Date(t).toISOString());
dates.push('2026-11-02 10:15:00 Asia/Kolkata', '', null, 'not a date', '—');
const fmtAll = () => dates.map((d) => [KF.formatDisplayDateTime(d)]);
setItHeadPerformanceMode(false);
const datesOff = JSON.stringify(fmtAll());
setItHeadPerformanceMode(true);
const datesOn = JSON.stringify(fmtAll());
setItHeadPerformanceMode(false);
assert.equal(datesOn, datesOff, 'display dates must be identical');

// Timeout: on → a hung GET rejects; off → it keeps waiting; writes never time out.
const hung = { api: () => new Promise(() => {}), account: { _id: 'AcTEST' } };
setKfReadTimeout(80);
await assert.rejects(kfGetJson(hung, '/process/2/AcTEST/x/pending/activity/count?a=1'), /timed out/);
let mutateSettled = false;
kfMutateJson(hung, '/x', { method: 'POST', body: {} }).then(() => { mutateSettled = true; }, () => { mutateSettled = true; });
await new Promise((r) => setTimeout(r, 150));
assert.equal(mutateSettled, false, 'writes must not be timed out');
setKfReadTimeout(0);
let getSettled = false;
kfGetJson(hung, '/y').then(() => { getSettled = true; }, () => { getSettled = true; });
await new Promise((r) => setTimeout(r, 150));
assert.equal(getSettled, false, 'mode off keeps the old behaviour');

const ok = { api: async () => ({ data: { Data: [1, 2] } }), account: { _id: 'AcTEST' } };
setItHeadPerformanceMode(true);
assert.deepEqual(await kfGetJson(ok, '/z'), { Data: [1, 2] }, 'normal GETs unchanged with timeout on');
setItHeadPerformanceMode(false);
assert.equal(IT_HEAD_KF_READ_TIMEOUT_MS, 45000);

console.log('IT Head performance mode: OK');
process.exit(0);
