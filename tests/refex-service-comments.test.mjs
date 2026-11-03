/**
 * Refex service comments (Agent Refex, IT Manager, IT Head, Common Refex):
 * same payload + admin PUT as Extrovis, compose only at IT Tech Support.
 * Extrovis behaviour must be identical with the Refex switch on or off.
 * Run via: node tests/refex-service-comments.test.mjs
 */
import assert from 'node:assert/strict';
import * as KF from '../src/lib/kfITServiceDashboard.js';
import {
  isRefexSolutionCommentStep,
  isRefexEmployeeVisibleComment,
  isEmployeeVisibleComment,
  setRefexServiceComments,
  COMMENT_CHANNEL_INTERNAL,
  COMMENT_CHANNEL_USER,
} from '../src/itsm/refex/employeedashboard/commentChannel.js';
import {
  canComposeAgentTicketComment,
  ticketIsAtRefexSolutionCommentStep,
  saveAgentSolutionComment,
  buildAgentSolutionCommentPayload,
} from '../src/itsm/refex/employeedashboard/agentSolutionCommentApi.js';
import {
  resolveCommentMailRecipients,
  buildCommentMailPayload,
} from '../src/itsm/refex/employeedashboard/commentNotifyMail.js';

const progressAt = (name, act = 'PkActLive') => ({
  Steps: [
    { Name: 'IT Tech', NodeType: 'UserTask', _status: 'Completed', _activity_instance_id: 'PkActPick' },
    { Name: name, NodeType: 'UserTask', _status: 'InProgress', _activity_instance_id: act },
  ],
});

// --- Step rule ---
for (const [step, ok] of [
  ['IT Tech Support', true],
  ['IT Tech Support After Dependency', true],
  ['IT Tech', false],
  ['IT Manager Approval', false],
  ['IT Head Approval', false],
  ['Dependency Assigne', false],
  ['IT Tech Reopen', false],
  ['', false],
]) {
  assert.equal(isRefexSolutionCommentStep(step), ok, `step "${step}"`);
}

// --- Common Refex employee view: hide only explicit Internal (legacy rows stay) ---
assert.equal(isRefexEmployeeVisibleComment({ commentsType: 'User' }), true);
assert.equal(isRefexEmployeeVisibleComment({ commentsType: 'Internal' }), false);
assert.equal(isRefexEmployeeVisibleComment({ resolution: 'legacy solution' }), true);
assert.equal(isRefexEmployeeVisibleComment({ role: 'reopen' }), true);
assert.equal(isEmployeeVisibleComment({ resolution: 'legacy solution' }), false, 'Extrovis rule unchanged');

// --- Extrovis identical with Refex switch on / off ---
KF.setITDashboardProfile(KF.EXTROVIS_PROFILE);
const extrovisMatrix = () => {
  const out = [];
  for (const tabKey of ['AssignedToMe', 'Open', 'OpenTickets', 'AllTickets', 'Closed', 'PendingTask']) {
    for (const role of ['', 'employee']) {
      for (const scope of ['me', 'team']) {
        for (const row of [
          { id: 'E1', currentStep: 'IT Agent Solution' },
          { id: 'E2', currentStep: 'IT Agent PickUp' },
          null,
        ]) {
          out.push(canComposeAgentTicketComment({ extrovis: true, tabKey, role, scope, row }));
        }
      }
    }
  }
  return JSON.stringify(out);
};
setRefexServiceComments(false);
const extrovisOff = extrovisMatrix();
setRefexServiceComments(true);
const extrovisOn = extrovisMatrix();
assert.equal(extrovisOn, extrovisOff, 'Extrovis compose rules unchanged by the Refex switch');
setRefexServiceComments(false);

// --- Refex: switch off keeps today's rules ---
KF.setITDashboardProfile(KF.REFEX_PROFILE);
assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'OpenTickets' }), true);
assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'AllTickets' }), false);

// --- Refex: switch on — solution step only ---
setRefexServiceComments(true);
const supportRow = { id: 'R1', currentStep: 'IT Tech Support' };
const pickupRow = { id: 'R2', currentStep: 'IT Tech' };
const approvalRow = { id: 'R3', currentStep: 'IT Head Approval' };
assert.equal(ticketIsAtRefexSolutionCommentStep({ row: supportRow }), true);
assert.equal(ticketIsAtRefexSolutionCommentStep({ row: pickupRow }), false);
assert.equal(ticketIsAtRefexSolutionCommentStep({ row: pickupRow, progress: progressAt('IT Tech Support') }), true);
assert.equal(ticketIsAtRefexSolutionCommentStep({ row: supportRow, progress: progressAt('IT Tech') }), false);
for (const tabKey of ['OpenTickets', 'AllTickets', 'PendingTask']) {
  assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey, row: supportRow }), true, `agent ${tabKey}`);
  assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey, row: pickupRow }), false);
  assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey, row: approvalRow }), false);
}
assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'Closed', row: supportRow }), false);
assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'OpenTickets' }), false, 'no row → no compose');
assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'OpenTickets', role: 'employee', row: supportRow }), true);
assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'AllTickets', role: 'employee', row: supportRow }), false);

// --- Refex save: admin PUT, Extrovis payload shape ---
function makeKf({ step = 'IT Tech Support', existing = [] } = {}) {
  const calls = [];
  const api = async (path, config = {}) => {
    const method = config.method || 'GET';
    calls.push({ method, path, body: config.body ? JSON.parse(config.body) : null });
    if (path.includes('/progress')) return { data: progressAt(step) };
    if (path.includes('/admin/') && method === 'GET') {
      return { data: { _id: 'PkInst1', 'Table::IT__Agent_Solution': existing } };
    }
    return { data: { Success: 'ok' } };
  };
  return { calls, kf: { api, account: { _id: 'AcTEST' }, user: { Name: 'Agent User' } } };
}
globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });

for (const [role, commentsType, expectChannel] of [
  ['agent', COMMENT_CHANNEL_USER, COMMENT_CHANNEL_USER],
  ['agent', '', COMMENT_CHANNEL_INTERNAL],
  ['employee', COMMENT_CHANNEL_INTERNAL, COMMENT_CHANNEL_USER],
]) {
  const { kf, calls } = makeKf({ existing: [{ _id: 'IT__Agent_Solution_old', Name_1: 'Old', Resolution: 'Earlier' }] });
  await saveAgentSolutionComment(kf, { id: 'PkInst1', entity: 'Refex', requestId: 'IT-IC-Refex-1' }, {
    comment: 'Hello', authorName: 'Agent User', commentsType, role,
  });
  const put = calls.find((c) => c.method === 'PUT');
  assert.ok(put, `${role}: admin PUT sent`);
  assert.match(put.path, /\/process\/2\/AcTEST\/admin\/Live_IT_Service_Request_A00\/PkInst1\?/, 'Refex process admin PUT');
  const rows = put.body['Table::IT__Agent_Solution'];
  assert.equal(rows.length, 2, 'existing rows kept, new row appended');
  const row = rows[1];
  assert.deepEqual(Object.keys(row).sort(), ['Comments_2', 'Name_1', 'Resolution', 'Stages_1', '_id'], 'same row shape as Extrovis');
  assert.equal(row.Stages_1, 'InProgress');
  assert.equal(row.Comments_2, expectChannel, `${role}/${commentsType || 'default'} channel`);
  assert.ok(!calls.some((c) => c.method === 'POST' && /\/submit/.test(c.path)), 'never /submit');
  const expected = buildAgentSolutionCommentPayload({
    instanceId: 'PkInst1', comment: 'Hello', authorName: 'Agent User', extrovis: true,
    rowId: row._id, commentsType: expectChannel,
  });
  assert.deepEqual(row, expected['Table::IT__Agent_Solution'][0], 'identical to the Extrovis payload builder');
}

// Not at IT Tech Support → refused before any write.
{
  const { kf, calls } = makeKf({ step: 'IT Tech' });
  await assert.rejects(
    saveAgentSolutionComment(kf, { id: 'PkInst1', entity: 'Refex' }, { comment: 'Hi', authorName: 'Agent User' }),
    /IT Tech Support/,
  );
  assert.ok(!calls.some((c) => c.method === 'PUT' || c.method === 'POST'), 'no write at pickup');
}
setRefexServiceComments(false);

// --- Mail: Refex identity, Extrovis unchanged ---
const refexEmployee = resolveCommentMailRecipients({ refex: true, role: 'employee', requesterEmail: 'emp@refex.co.in' });
assert.deepEqual(refexEmployee, { to: ['helpdesk@refex.co.in'], cc: [], from: 'helpdesk@refex.co.in' });
const refexAgent = resolveCommentMailRecipients({ refex: true, role: 'agent', requesterEmail: 'emp@refex.co.in', sap: true });
assert.deepEqual(refexAgent, { to: ['emp@refex.co.in'], cc: ['helpdesk@refex.co.in'], from: 'helpdesk@refex.co.in' });
const extrovisEmployee = resolveCommentMailRecipients({ role: 'employee', entity: 'Extrovis' });
assert.equal(extrovisEmployee.from, 'itsupport@extrovis.com', 'Extrovis sender unchanged');
assert.equal(buildCommentMailPayload({ refex: true, commentsType: COMMENT_CHANNEL_INTERNAL, row: { id: 'x' } }), null, 'Internal never mails');
assert.ok(buildCommentMailPayload({ refex: true, commentsType: COMMENT_CHANNEL_USER, role: 'employee', row: { id: 'x', entity: 'Venwind' } }));
assert.equal(
  buildCommentMailPayload({ refex: true, commentsType: COMMENT_CHANNEL_USER, role: 'employee', row: { id: 'x', entity: 'Venwind' } }).from,
  'helpdesk@refex.co.in',
  'Refex process ticket never falls back to the Extrovis sender',
);

console.log('Refex service comments: OK');
process.exit(0);
