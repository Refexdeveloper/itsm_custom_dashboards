import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [root = '.', edition = 'candidate'] = process.argv.slice(2);
const source = (path) => import(pathToFileURL(resolve(root, 'src', path)).href);
const lib = await source('lib/kfITServiceDashboard.js');
const { fetchRefexApproverMeLandingSeed, fetchRefexMonitoringServiceTickets } = await source(
  'itsm/refex/techsupport/fetchRefexTechSupportTickets.js',
);
const { setDashboardPerformanceMode } = await source('lib/dashboardPerformanceMode.js');
lib.setITDashboardProfile(lib.REFEX_PROFILE);
setDashboardPerformanceMode(true);
const user = { _id: 'FixtureHead', Email: 'head@example.invalid' };
const calls = new Map();
function record(name, page) {
  if (!calls.has(name)) calls.set(name, new Set());
  calls.get(name).add(page);
}
const sample = (id, step = 'IT Head Approval') => ({
  _id: id,
  Request_ID: id,
  Category: 'Network',
  Source: 'Email',
  Ticket_Type: 'Incident',
  _current_step: step,
  _created_at: '2026-09-10T00:00:00Z',
  _modified_at: '2026-10-01T00:00:00Z',
  _status: 'InProgress',
});
const count = 503;
const sourceRows = Array.from({ length: count }, (_, i) => sample('Fixture' + i));
const history = Array.from({ length: 202 }, (_, i) => sample('Hist' + i));
const completed = Array.from({ length: 501 }, (_, i) => ({
  ...sample('Done' + i),
  _status: 'Completed',
}));
const sdkTasks = async (args) => {
  record('SDK my tasks', Number(args.page_number || args.pageNumber || 1));
  return { Data: [] };
};
const proc = { getMyTasksItems: sdkTasks };
const kf = {
  account: { _id: 'AcFixture' },
  user,
  context: { getProcess: () => proc },
  getProcess: () => proc,
  process: proc,
  api: async (path, options) => {
    assert.equal(options.method, 'GET');
    const u = new URL(path, 'https://fixture.invalid'),
      p = u.pathname,
      q = u.searchParams,
      page = +q.get('page_number') || 1,
      size = +q.get('page_size') || 1;
    const getPage = (label, rows) => {
      record(label + ' size ' + size, page);
      return rows.slice((page - 1) * size, page * size);
    };
    let data = [];
    if (p.endsWith('/pending/activity/count'))
      data = [{ _id: 'Activity_head', StepName: 'IT Head Approval', Count: count }];
    else if (p.includes('/pending/Activity_head')) data = getPage('pending', sourceRows);
    else if (p.includes('/myitems/inprogress')) data = getPage('inprogress', sourceRows);
    else if (p.includes('/myitems/completed')) data = getPage('completed', completed);
    else if (p.endsWith('/participated/activity/count')) data = [{ _id: 'Activity_hist', Count: 202 }];
    else if (p.includes('/participated/activity/Activity_hist')) data = getPage('participated', history);
    else if (p.startsWith('/process-report/') && !Array.from(q.keys()).some((k) => k.startsWith('$')))
      data = getPage('report', sourceRows);
    return { data: { Data: data } };
  },
};
const seed = await fetchRefexApproverMeLandingSeed(kf, user, { role: 'final' });
assert.equal(seed.length, count);
const reportFilters = edition === 'candidate' ? { headReportUser: user._id } : {};
const rows = await fetchRefexMonitoringServiceTickets(kf, user, { reportFilters });
assert.deepEqual([...calls.get('pending size 100')], [1, 2, 3, 4, 5, 6]);
assert.deepEqual([...calls.get('inprogress size 100')], [1, 2, 3, 4, 5, 6]);
assert.deepEqual([...calls.get('participated size 100')], [1, 2, 3]);
assert.deepEqual([...calls.get('report size 500')], [1, 2]);
const completedPages = [...calls.get('completed size 500')];
assert.equal(
  rows.some((row) => row.id === 'Done499'),
  true,
);
assert.deepEqual(completedPages, edition === 'candidate' ? [1, 2] : [1]);
assert.equal(
  rows.some((row) => row.id === 'Done500'),
  edition === 'candidate',
);
console.log(
  JSON.stringify({
    edition,
    rows: rows.length,
    queuePages: Object.fromEntries([...calls].map(([k, v]) => [k, [...v]])),
    completedTruth: 501,
    completedFound: rows.filter((row) => row.id.startsWith('Done')).length,
    completedPages,
    lastCompletedFound: rows.some((row) => row.id === 'Done500'),
  }),
);
