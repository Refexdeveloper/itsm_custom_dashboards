import {
  ceoClosedOnDisplay,
  ceoRowMatchesKpi,
  ceoSlaMisDisplay,
  ceoStageLabel,
  compareCreatedDesc,
  filterGcpRecords,
  mapGcpRecordToCeoRow,
  mapKissflowServiceRowToCeoRow,
  misUsersFromRecords,
  resolveGcpPeriodRange,
  readKissflowSessionUser,
  resolveNewCeoHeaderTitle,
  sortNewCeoCompanyOptions,
  summarizeGcpRecords,
  userFilterOptions,
  classifyItsmSourceChannel,
  countItsmSourcePanels,
  ticketKpisFromDashboard,
  engagementFromDashboard,
} from '../src/lib/neGcpDashboardMath.js';
import { appendNeEmbedViewerParams } from '../src/lib/neEmbedViewerUrl.js';

const now = new Date('2026-10-05T06:30:00.000Z');
const rows = [
  { assigned_to: 'Sakthivel', assignee_id: 'Us-1', status: 'open', company_name: 'Extrovis', source: 'Email', created_at: '2026-10-05T04:00:00.000Z' },
  { assigned_to: 'Deepan Duraisamy', assignee_id: 'Us-2', status: 'closed', company_name: 'Refex Industries Limited', source: 'Web', created_at: '2026-09-01T04:00:00.000Z', closed_at: '2026-10-05T05:00:00.000Z' },
  { assigned_to: 'Sakthivel', assignee_id: 'Us-1', status: 'rejected', company_name: 'Extrovis', source: 'Mobile', created_at: '2026-04-02T04:00:00.000Z' },
];

const fy = resolveGcpPeriodRange('fy', now);
if (fy.from !== '2026-04-01') throw new Error(`FY start ${fy.from}`);

const extrovis = filterGcpRecords(rows, { company: 'extrovis', period: 'all' }, now);
if (extrovis.length !== 2) throw new Error(`Extrovis count ${extrovis.length}`);
const industries = filterGcpRecords(rows, { company: 'refex-industries-limited', period: 'all' }, now);
if (industries.length !== 1 || industries[0].assigned_to !== 'Deepan Duraisamy') {
  throw new Error(`Industries company filter ${industries.length}`);
}
const industriesByName = filterGcpRecords(rows, { company: 'Refex Industries Limited', period: 'all' }, now);
if (industriesByName.length !== 1) throw new Error('company name should resolve to catalog id');

const deepan = filterGcpRecords(rows, { user: 'Deepan Duraisamy', period: 'all' }, now);
if (deepan.length !== 1) throw new Error(`Deepan count ${deepan.length}`);

const today = summarizeGcpRecords(filterGcpRecords(rows, { period: 'daily' }, now), now);
if (today.total !== 2) throw new Error(`Today total ${today.total}`);
if (today.openedToday !== 1) throw new Error(`Opened today ${today.openedToday}`);
if (today.closedToday !== 1) throw new Error(`Closed today ${today.closedToday}`);

const reopenToday = summarizeGcpRecords([
  {
    status: 'closed',
    current_step: 'IT Tech Reopen',
    created_at: '2026-09-01T04:00:00.000Z',
    reopen_entered_at: '2026-10-05T08:00:00.000Z',
    modified_at: '2026-10-05T09:00:00.000Z',
  },
  {
    status: 'closed',
    current_step: 'ReOpen Window',
    created_at: '2026-09-01T04:00:00.000Z',
    agent_closed_at: '2026-10-05T08:10:00.000Z',
  },
  {
    status: 'closed',
    current_step: 'Ticket Reopen',
    created_at: '2026-09-01T04:00:00.000Z',
    modified_at: '2026-10-05T09:00:00.000Z',
  },
  {
    status: 'closed',
    current_step: 'Completed',
    created_at: '2026-09-01T04:00:00.000Z',
    closed_at: '2026-09-02T05:00:00.000Z',
  },
], now);
if (reopenToday.closedToday !== 2) {
  throw new Error(`Reopen-step Closed today ${reopenToday.closedToday}`);
}
if (!ceoRowMatchesKpi({
  status: 'closed',
  current_step: 'IT Tech Reopen',
  reopen_entered_at: '2026-10-05T08:00:00.000Z',
}, 'closed_today', now)) {
  throw new Error('closed_today kpi should match Reopen-step move');
}

const all = summarizeGcpRecords(rows, now);
if (all.open !== 1 || all.closed !== 1 || all.rejected !== 1) throw new Error('status mix');
if (all.source.Email !== 1 || all.source.Web !== 1 || all.source.Mobile !== 1) throw new Error('source mix');

const kissflowViewer = readKissflowSessionUser({
  user: { Name: 'Dinesh Kumar', Email: 'dinesh@refex.co.in' },
});
if (kissflowViewer.name !== 'Dinesh Kumar' || kissflowViewer.email !== 'dinesh@refex.co.in') {
  throw new Error(`Kissflow viewer ${kissflowViewer.name}`);
}
const paramViewer = readKissflowSessionUser({
  user: { user_name: 'Srivaths Varadharajan', user_email: 'srivaths.varadharajan@refex.co.in' },
});
if (paramViewer.name !== 'Srivaths Varadharajan') throw new Error(`param viewer ${paramViewer.name}`);
if (readKissflowSessionUser({ user: { Name: 'User' } }).name !== '') {
  throw new Error('placeholder User must not become the greeting');
}

if (resolveNewCeoHeaderTitle({ name: 'Anil Jain' }) !== 'Managing Director / Chairman') {
  throw new Error('MD title');
}
if (resolveNewCeoHeaderTitle({ name: 'Srivaths Varadharajan', email: 'srivaths.varadharajan@refex.co.in' }) !== 'Group Chief Technical Officer') {
  throw new Error('GCTO title');
}

const embedHref = appendNeEmbedViewerParams(
  'https://refex-admin-ui-dhwffeu7pq-el.a.run.app/applications/production-IT_Service_Management_A00?tab=dashboard&embed=1',
  { name: 'Anil Jain', title: 'Group Chief Executive Officer' },
);
if (!embedHref.includes('user_name=Anil+Jain') && !embedHref.includes('user_name=Anil%20Jain')) {
  throw new Error(`embed missing user_name ${embedHref}`);
}
if (!embedHref.includes('user_title=Group+Chief+Executive+Officer') && !embedHref.includes('Group%20Chief%20Executive%20Officer')) {
  throw new Error(`embed missing user_title ${embedHref}`);
}
const skipped = appendNeEmbedViewerParams('https://refexgroup.kissflow.com/view/app', { name: 'Anil Jain' });
if (skipped.includes('user_name=')) throw new Error('non-NE url should stay unchanged');

const mapped = mapGcpRecordToCeoRow({
  id: '1',
  request_id: 'SR-9',
  subject: 'VPN',
  requested_by: 'Agnes Simon',
  assigned_to: 'Deepan Duraisamy',
  closed_by: 'Sakthivel',
  status: 'closed',
  source: 'Email',
  current_step: 'Completed',
  company_name: 'Extrovis',
  created_at: '2026-09-01T04:00:00.000Z',
  closed_at: '2026-10-05T05:00:00.000Z',
  ticket_type: 'Incident',
  category: 'Network',
  sub_category: 'VPN',
  criticality: 'High',
  form_status: 'On Hold',
  sla_breached: 'true',
  reopened_at: '2026-10-04T08:00:00.000Z',
});
if (mapped.requestId !== 'SR-9' || mapped.ticketStatus !== 'Closed' || mapped.assignedTo !== 'Deepan Duraisamy') {
  throw new Error('ceo row map');
}
if (
  mapped.ticketType !== 'Incident'
  || mapped.category !== 'Network'
  || mapped.subCategory !== 'VPN'
  || mapped.criticality !== 'High'
  || mapped.closedBy !== 'Sakthivel'
  || mapped.ticketStage !== 'OnHold'
  || mapped.slaLabel !== 'Hold'
  || !mapped.reopenedOn
) {
  throw new Error('ceo mis extras');
}

const week = resolveGcpPeriodRange('weekly', now);
if (week.from !== '2026-10-05' || week.to !== '2026-10-05') throw new Error(`week ${week.from} ${week.to}`);
const qtd = resolveGcpPeriodRange('quarterly', now);
if (qtd.from !== '2026-10-01') throw new Error(`qtd ${qtd.from}`);

const sorted = sortNewCeoCompanyOptions([
  { key: '', label: 'All Companies' },
  { key: '3i', label: '3i Medical Technologies Private Limited' },
  { key: 'extrovis', label: 'Extrovis' },
  { key: 'aj', label: 'AJ Office' },
]);
if (sorted[0].label !== 'All Companies') throw new Error('company pin');
if (sorted[1].label !== 'AJ Office' || sorted.at(-1).label.startsWith('3i') === false) throw new Error('company sort');

const users = misUsersFromRecords([
  { assigned_to: 'ITSM BOT', closed_by: 'Sakthivel', status: 'closed' },
  { assigned_to: 'Deepan Duraisamy', status: 'open' },
]);
if (users.some((row) => String(row.user_name).toLowerCase().includes('bot'))) throw new Error('bot leaked');
if (!users.some((row) => row.user_name === 'Sakthivel')) throw new Error('bot ticket should count under human');

const sla = ceoSlaMisDisplay({
  status: 'open',
  form_status: 'InProgress',
  sla_minutes: 60,
  created_at: '2026-09-17T06:30:00.000Z',
  modified_at: '2026-09-17T06:30:00.000Z',
  sla_breached: true,
}, now);
if (sla.primary !== 'Breached' || !String(sla.sub || '').startsWith('Exceeded by')) {
  throw new Error(`sla display ${sla.primary} ${sla.sub}`);
}
const openNoBudget = ceoSlaMisDisplay({ status: 'open', form_status: 'InProgress' }, now);
if (openNoBudget.primary !== 'On track') throw new Error(`no sla label ${openNoBudget.primary}`);
const openHold = ceoSlaMisDisplay({ status: 'open', form_status: 'Pending with Vendor' }, now);
if (openHold.primary !== 'Hold') throw new Error(`non inprogress should be Hold ${openHold.primary}`);
const openClock = ceoSlaMisDisplay({
  status: 'open',
  form_status: 'InProgress',
  closure_minutes: 120,
  modified_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
  created_at: '2026-04-01T00:00:00.000Z',
}, now);
if (openClock.primary !== 'On track') throw new Error(`inprogress should use modified time ${openClock.primary}`);
const mappedDesc = mapGcpRecordToCeoRow({
  status: 'open',
  subject: 'VPN down',
  description: 'Office VPN fails',
  category: 'Network',
  ticket_type: 'Incident',
});
if (mappedDesc.description !== 'Office VPN fails') throw new Error('description missing on ceo row');
const split = mapGcpRecordToCeoRow({
  status: 'open',
  subject: 'Laptop battery',
  summary: 'Laptop battery',
  description: 'Battery issue in my laptop',
});
if (split.summary !== 'Laptop battery' || split.description !== 'Battery issue in my laptop') {
  throw new Error('subject/description should stay separate like Head');
}

if (resolveNewCeoHeaderTitle({ name: 'Srivaths' }) !== 'Group Chief Technical Officer') {
  throw new Error('srivaths title');
}

const sakthivelOpts = userFilterOptions([
  { assigned_to: 'sakthivel', assignee_id: 'Us-1', status: 'open' },
  { assigned_to: 'Sakthivel', assignee_id: 'Us-2', status: 'closed' },
]);
if (sakthivelOpts.filter((row) => /sakthivel/i.test(row.label)).length !== 1) {
  throw new Error('sakthivel user filter should merge');
}

if (ceoStageLabel('Completed') !== 'Closed' || ceoStageLabel('InProgress') !== 'InProgress') {
  throw new Error('completed should display as closed');
}

const mappedClosed = mapGcpRecordToCeoRow({
  status: 'closed',
  current_step: 'Completed',
  created_at: '2026-09-01T04:00:00.000Z',
  agent_closed_at: '2026-09-02T10:00:00.000Z',
  assigned_to: 'Sakthivel',
});
if (mappedClosed.ticketStage !== 'Closed' || !mappedClosed.closedOn) {
  throw new Error('closed date from agent solution / completed stage');
}

const latestFirst = [
  { created_at: '2026-09-01T00:00:00.000Z', requestId: 'A' },
  { created_at: '2026-10-05T00:00:00.000Z', requestId: 'B' },
].sort(compareCreatedDesc);
if (latestFirst[0].requestId !== 'B') throw new Error('latest created first');

const signedIn = misUsersFromRecords(
  [
    { assigned_to: 'porchezhiyan M', status: 'open' },
    { assigned_to: 'Vishnu', status: 'closed' },
    { assigned_to: 'IT Agents Extrovis', closed_by: 'Sakthivel', status: 'closed' },
  ],
  [
    { user_name: 'porchezhiyan', last_sign_in: '2026-10-05T09:30:00.000Z' },
    { user_name: 'Vishnu Gullapally', last_sign_in: '2026-10-04T08:00:00.000Z' },
    { user_name: 'Sakthivel', last_sign_in: '2026-10-03T08:00:00.000Z' },
  ],
);
const porche = signedIn.find((u) => /porchezhiyan/i.test(u.user_name));
const vishnu = signedIn.find((u) => /vishnu/i.test(u.user_name));
const sakthivel = signedIn.find((u) => /sakthivel/i.test(u.user_name));
if (!porche?.last_sign_in) throw new Error('porchezhiyan last sign-in should match roster');
if (!vishnu?.last_sign_in) throw new Error('Vishnu last sign-in should match Vishnu Gullapally');
if (!sakthivel?.last_sign_in) throw new Error('pool assignee should use closer last sign-in');
if (signedIn.some((u) => /it agents/i.test(u.user_name))) throw new Error('IT Agents should not appear in MIS');

if (ceoClosedOnDisplay({
  status: 'closed',
  modified_at: '2026-09-02T10:00:00.000Z',
}) !== '2026-09-02T10:00:00.000Z') {
  throw new Error('closed date should use Head modified_at fallback');
}

const poolClosed = mapGcpRecordToCeoRow({
  id: '2',
  request_id: 'SR-10',
  assigned_to: 'IT Agents Extrovis',
  closed_by: 'Sakthivel',
  status: 'closed',
  modified_at: '2026-09-02T10:00:00.000Z',
});
if (poolClosed.assignedTo !== 'Sakthivel' || poolClosed.closedBy !== 'Sakthivel') {
  throw new Error('closed pool assignee should show Head solver');
}
if (poolClosed.closedOn !== '2026-09-02T10:00:00.000Z') {
  throw new Error('closed date should show when only modified_at is present');
}

const openWithCloser = mapGcpRecordToCeoRow({
  id: '3',
  request_id: 'SR-11',
  assigned_to: 'Deepan Duraisamy',
  closed_by: 'Sakthivel',
  status: 'open',
  form_status: 'InProgress',
});
if (openWithCloser.closedBy) {
  throw new Error('open ticket must not show closed by');
}
if (openWithCloser.assignedTo !== 'Deepan Duraisamy') {
  throw new Error('open assigned to should stay');
}

const kpiOpen = mapGcpRecordToCeoRow({ status: 'open', form_status: 'Pending with Vendor' });
const kpiClosed = mapGcpRecordToCeoRow({ status: 'closed', form_status: 'Closed' });
if (!ceoRowMatchesKpi(kpiOpen, 'open') || ceoRowMatchesKpi(kpiOpen, 'closed')) {
  throw new Error('open kpi should keep open rows only');
}
if (!ceoRowMatchesKpi(kpiClosed, 'closed') || ceoRowMatchesKpi(kpiClosed, 'open')) {
  throw new Error('closed kpi should keep closed rows only');
}

const balarajuOpts = userFilterOptions([
  { assigned_to: 'Balaraju Ilaiveni', status: 'open' },
  { assigned_to: 'Balaraju Ilaveni', status: 'closed' },
]);
if (balarajuOpts.filter((row) => /balaraju/i.test(row.label)).length !== 1) {
  throw new Error('Balaraju spelling variants must merge in user filter');
}
const balarajuTickets = filterGcpRecords([
  { assigned_to: 'Balaraju Ilaiveni', status: 'open', created_at: '2026-09-01T00:00:00.000Z' },
  { assigned_to: 'Balaraju Ilaveni', status: 'closed', created_at: '2026-09-02T00:00:00.000Z' },
], { user: 'Balaraju Ilaiveni', period: 'all' });
if (balarajuTickets.length !== 2) {
  throw new Error('selecting one Balaraju spelling must match both ticket names');
}

if (classifyItsmSourceChannel('Pending Email') !== 'Email') throw new Error('email source classify');
if (classifyItsmSourceChannel('WhatsApp Bot') !== 'WhatsApp') throw new Error('whatsapp source classify');
const sourcePanels = countItsmSourcePanels([
  { source: 'Email', status: 'open', created_at: '2026-10-05T04:00:00.000Z' },
  { source: 'Web Portal', status: 'closed', created_at: '2026-09-01T04:00:00.000Z', closed_at: '2026-09-02T04:00:00.000Z' },
], now);
if (sourcePanels.all.Email !== 1 || sourcePanels.all.Web !== 1) throw new Error('source panel all');
if (sourcePanels.today.Email !== 1 || sourcePanels.today.Web !== 0) throw new Error('source panel today');

const misFiltered = [
  { assigned_to: 'Sakthivel', status: 'open', company_name: 'Extrovis', source: 'Email', created_at: '2026-10-05T04:00:00.000Z', category: 'Network' },
  { assigned_to: 'Deepan Duraisamy', status: 'closed', company_name: 'Refex Industries Limited', source: 'Web', created_at: '2026-09-01T04:00:00.000Z', closed_at: '2026-10-05T05:00:00.000Z', category: 'Hardware' },
].filter((row) => String(row.category) === 'Network');
const misKpis = summarizeGcpRecords(misFiltered, now);
if (misKpis.total !== 1 || misKpis.open !== 1 || misKpis.closed !== 0) {
  throw new Error('MIS filter must change KPI cards');
}

function misKpiGridForCount(count) {
  const n = Number(count) || 0;
  if (n <= 4) return 'it-kpi-grid';
  const cols = Math.min(6, Math.max(3, Math.ceil(n / 2)));
  if (cols === 4) return 'it-kpi-grid';
  return `it-kpi-grid-${cols}`;
}
if (misKpiGridForCount(4) !== 'it-kpi-grid') throw new Error('4 cards stay 4-up');
if (misKpiGridForCount(8) !== 'it-kpi-grid') throw new Error('8 cards should be 4+4');
if (misKpiGridForCount(10) !== 'it-kpi-grid-5') throw new Error('10 cards should be 5+5');
if (misKpiGridForCount(12) !== 'it-kpi-grid-6') throw new Error('12 cards should be 6+6');
if (misKpiGridForCount(6) !== 'it-kpi-grid-3') throw new Error('6 cards should be 3+3');

const mappedStatus = summarizeGcpRecords([
  { ticketStatus: 'Closed', created_at: '2026-09-01T00:00:00.000Z' },
  { ticketStatus: 'Open', created_at: '2026-09-02T00:00:00.000Z' },
], now);
if (mappedStatus.closed !== 1 || mappedStatus.open !== 1 || mappedStatus.total !== 2) {
  throw new Error('summarize must read ticketStatus on mapped CEO rows');
}

const dashKpis = ticketKpisFromDashboard({
  metrics: { total: 1248, open: 195, closed: 1028, rejected: 25 },
  by_source_all: [
    { name: 'Email', count: 698 },
    { name: 'WhatsApp', count: 44 },
    { name: 'Mobile', count: 39 },
    { name: 'Web', count: 467 },
  ],
  by_source_today: [{ name: 'Email', count: 2 }],
});
if (dashKpis.total !== 1248 || dashKpis.open !== 195 || dashKpis.closed !== 1028 || dashKpis.rejected !== 25) {
  throw new Error('dashboard overlay must seed ticket KPI cards');
}
if (dashKpis.source.Email !== 698 || dashKpis.source.Web !== 467) {
  throw new Error('dashboard overlay must seed ticket source');
}
if (dashKpis.todaySource.Email !== 2) {
  throw new Error('dashboard overlay must seed today source');
}

const meMapped = mapKissflowServiceRowToCeoRow({
  id: 'PkMe1',
  requestId: 'IT-IC-Refex-FY026-000169',
  requesterName: 'Gowtham S',
  assignedTo: 'Srivaths Varadharajan',
  ticketStatus: 'Open',
  currentStep: 'IT Head Approval',
  companyName: 'Refex Industries Limited',
  createdAtRaw: '2026-10-05T04:00:00.000Z',
  source: 'Email',
});
if (meMapped.requestId !== 'IT-IC-Refex-FY026-000169') throw new Error('Me row request id');
if (meMapped.status !== 'open') throw new Error(`Me row status ${meMapped.status}`);
if (meMapped.requesterName !== 'Gowtham S') throw new Error('Me row requester');
if (meMapped.assignedTo !== 'Srivaths Varadharajan') throw new Error('Me row assignee');

const engagement = engagementFromDashboard({
  metrics: {
    total_users: 16,
    signed_in_today: 12,
    sign_in_rate_overall: 94,
    sign_in_rate_today: 75,
  },
  app_users: [{ user_name: 'Agnes Simon', last_sign_in: '2026-10-27T04:00:00.000Z', ever_logged_in: true }],
  users: [],
});
if (engagement.adoptionOverall !== 94 || engagement.signedInToday !== 12 || engagement.usersCard !== 16) {
  throw new Error('engagement cards must read the dashboard roster metrics');
}
if (!engagement.roster[0]?.last_sign_in) throw new Error('roster sign-in must stay on the dashboard payload');

console.log('newceo gcp math ok');
