/**
 * Pure logic coverage for Refex Open/Closed, reopen activity ids, SLA filter.
 * Run via: node scripts/test-refex-logic.mjs
 */
import assert from 'node:assert/strict';
import {
  setITDashboardProfile,
  REFEX_PROFILE,
  EXTROVIS_PROFILE,
  isRefexServiceClosedTicket,
  isRefexServiceOpenTicket,
  matchesRefexTechSupportTab,
  getMisSlaFilterState,
  getMisSlaFilterOptionsForRows,
  getRefexTechReopenMisDisplay,
  resolveITServiceViewDetailsIds,
  canShowServiceRecordEditIcon,
  IT_TECH_REOPEN_WINDOW_MS,
  EXTROVIS_REOPEN_WINDOW_MS,
  getReopenWindowMs,
  matchesMisDuePriorityRow,
  isServiceQueueClosedSlaBreachedTicket,
  matchesRefexApproverPendingTaskRow,
  matchesRefexMonitoringServiceTab,
  getDashboardRowDateMs,
  applyDashboardDateRangeFilter,
  matchesExtrovisOpenTicketRow,
  matchesExtrovisMyTaskRow,
  matchesRefexOpenTicketRow,
  matchesRefexMeOnlyScope,
  matchesRefexServiceTeamScope,
  matchesRefexSplitMyTaskRow,
  getApproverServiceTabs,
  isRefexServiceRejectedTicket,
  isServiceQueueSlaBreachedTicket,
  isServiceQueueAnySlaBreachedTicket,
  looksLikeKissflowInstanceId,
  resolveDisplayRequestId,
  getCurrentStepValue,
  getAgentQueueTabs,
} from '../src/lib/kfITServiceDashboard.js';
import { getMisTicketStatus } from '../src/itsm/refex/employeedashboard/employeeStatus.js';
import { getPersonInitials, getRequestTypeShort, getMisCategoryLabel, getMisSubCategoryLabel, getMisCriticalityLabel, getMisTicketTypeLabel, getPersonAvatarTone } from '../src/itsm/refex/shared/misCompactDisplay.js';
import { getClosedByDisplay, getAssignedToDisplay } from '../src/itsm/refex/employeedashboard/closedBy.js';
import { getClosedOnRaw } from '../src/itsm/refex/employeedashboard/employeeDates.js';
import { getRefexServiceQueueMisColumns } from '../src/itsm/refex/shared/refexServiceQueueColumns.js';
import { getRejectionReasonDisplay } from '../src/components/it/mis/misExpandContent.js';

setITDashboardProfile(REFEX_PROFILE);

const reopenCol = REFEX_PROFILE.serviceCol.itTechReopenActivity
  || REFEX_PROFILE.serviceCol.employeeApprovalRefex;
const techSupportCol = REFEX_PROFILE.serviceCol.itAgentRefexActivity;
const currentStepCol = REFEX_PROFILE.serviceCol.currentStep;

function mkReopenRow({
  id = 'PkReopen1',
  activityId = 'ActReopenLive1',
  withMyTask = true,
  assignee = null,
  modifiedAt = new Date().toISOString(),
  staleActivityId = 'ActStaleSupport',
} = {}) {
  const user = assignee || { _id: 'UsEmp1', Email: 'emp@refex.co.in', Name: 'Employee' };
  const raw = {
    _id: id,
    _status: 'InProgress',
    _modified_at: modifiedAt,
    _activity_instance_id: staleActivityId,
    Statu_1: 'Closed',
    [currentStepCol]: 'IT Tech Reopen',
    [reopenCol]: [{ _id: activityId, Status: 'InProgress' }],
    [techSupportCol]: [{ _id: staleActivityId, Status: 'Completed' }],
  };
  return {
    id,
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech Reopen',
    activeWorkflowStep: 'IT Tech Reopen',
    refexTechSupportStatus: 'close',
    itemStatusRaw: 'Closed',
    modifiedAtRaw: modifiedAt,
    assignedToRaw: [user],
    activityInstanceId: staleActivityId,
    techSupportMyTaskItem: withMyTask
      ? {
        _id: id,
        _status: 'InProgress',
        _current_step: 'IT Tech Reopen',
        _activity_instance_id: activityId,
        _current_assigned_to: [user],
      }
      : null,
    techSupportTaskActivityInstanceId: withMyTask ? activityId : '',
    raw,
  };
}

function mkOpenTechRow({ id = 'PkOpen1' } = {}) {
  return {
    id,
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech Support',
    activeWorkflowStep: 'IT Tech Support',
    refexTechSupportStatus: 'open',
    itemStatusRaw: 'Open',
    assignedToRaw: [{ _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Agent' }],
    techSupportMyTaskItem: {
      _id: id,
      _status: 'InProgress',
      _current_step: 'IT Tech Support',
      _activity_instance_id: 'ActSupport1',
      _current_assigned_to: [{ _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Agent' }],
    },
    raw: {
      _id: id,
      _status: 'InProgress',
      [currentStepCol]: 'IT Tech Support',
      [techSupportCol]: [{ _id: 'ActSupport1', Status: 'InProgress' }],
      Statu_1: 'Open',
    },
  };
}

const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Agent' };
const employee = { _id: 'UsEmp1', Email: 'emp@refex.co.in', Name: 'Employee' };

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`     ${err.message}`);
  }
}

check('IT Tech Reopen is Closed (not Open)', () => {
  const row = mkReopenRow();
  assert.equal(isRefexServiceClosedTicket(row), true);
  assert.equal(isRefexServiceOpenTicket(row), false);
});

check('IT Tech Support InProgress is Open', () => {
  const row = mkOpenTechRow();
  assert.equal(isRefexServiceOpenTicket(row), true);
  assert.equal(isRefexServiceClosedTicket(row), false);
});

check('My Tickets excludes IT Tech Reopen', () => {
  const row = mkReopenRow({ assignee: agent, withMyTask: true });
  assert.equal(matchesRefexTechSupportTab(row, 'AssignedToMe', agent), false);
  assert.equal(matchesRefexTechSupportTab(row, 'Closed', agent), true);
});

check('Me = own + participated; My Team excludes Me rows', () => {
  const otherAgent = { _id: 'UsAgent2', Email: 'other@refex.co.in', Name: 'Other' };
  const mine = mkOpenTechRow({ id: 'PkMineMe1' });
  const participated = {
    ...mkOpenTechRow({ id: 'PkPart1' }),
    id: 'PkPart1',
    isParticipatedByUser: true,
    assignedToRaw: [otherAgent],
    techSupportMyTaskItem: null,
    techSupportTaskOwnedByUser: false,
  };
  const otherRr = {
    id: 'PkOtherTeam1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech',
    activeWorkflowStep: 'IT Tech',
    itemStatusRaw: 'Open',
    assignedToRaw: [otherAgent],
    techSupportMyTaskItem: null,
    raw: {
      _id: 'PkOtherTeam1',
      _status: 'InProgress',
      _current_assigned_to: [otherAgent],
      [currentStepCol]: 'IT Tech',
      Statu_1: 'Open',
    },
  };
  assert.equal(matchesRefexMeOnlyScope(mine, agent, { role: 'agent' }), true);
  assert.equal(matchesRefexMeOnlyScope(participated, agent, { role: 'agent' }), true);
  assert.equal(matchesRefexMeOnlyScope(otherRr, agent, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(mine, agent, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(participated, agent, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(otherRr, agent, { role: 'agent' }), true);
});

check('Agent Open Tickets = my RR IT Tech only (not other agents)', () => {
  const otherAgent = { _id: 'UsAgent2', Email: 'other@refex.co.in', Name: 'Other' };
  const othersSupport = mkOpenTechRow({ id: 'PkOtherSupport' });
  othersSupport.assignedToRaw = [otherAgent];
  othersSupport.techSupportMyTaskItem = {
    ...othersSupport.techSupportMyTaskItem,
    _current_assigned_to: [otherAgent],
  };
  const myRr = {
    id: 'PkMyRr1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech',
    activeWorkflowStep: 'IT Tech',
    itemStatusRaw: 'Open',
    assignedToRaw: [agent],
    techSupportMyTaskItem: {
      _id: 'PkMyRr1',
      _status: 'InProgress',
      _current_step: 'IT Tech',
      _activity_instance_id: 'ActRr1',
      _current_assigned_to: [agent],
    },
    raw: {
      _id: 'PkMyRr1',
      _status: 'InProgress',
      _current_assigned_to: [agent],
      [currentStepCol]: 'IT Tech',
      Statu_1: 'Open',
    },
  };
  const otherRr = {
    ...myRr,
    id: 'PkOtherRr1',
    assignedToRaw: [otherAgent],
    techSupportMyTaskItem: {
      _id: 'PkOtherRr1',
      _status: 'InProgress',
      _current_step: 'IT Tech',
      _activity_instance_id: 'ActRr2',
      _current_assigned_to: [otherAgent],
    },
    raw: {
      _id: 'PkOtherRr1',
      _status: 'InProgress',
      _current_assigned_to: [otherAgent],
      [currentStepCol]: 'IT Tech',
      Statu_1: 'Open',
    },
  };
  assert.equal(matchesRefexTechSupportTab(othersSupport, 'OpenTickets', agent), false);
  assert.equal(matchesRefexTechSupportTab(othersSupport, 'AssignedToMe', agent), false);
  assert.equal(matchesRefexTechSupportTab(myRr, 'OpenTickets', agent), true);
  assert.equal(matchesRefexTechSupportTab(otherRr, 'OpenTickets', agent), false);
  assert.equal(matchesRefexTechSupportTab(mkOpenTechRow(), 'AssignedToMe', agent), true);
  // Refex IT Agent Open = own RR + own Tech Support (not other agents).
  assert.equal(matchesRefexTechSupportTab(mkOpenTechRow(), 'OpenTickets', agent), true);
  // Monitoring (no user) still sees all IT Tech RR tickets.
  assert.equal(matchesRefexOpenTicketRow(otherRr, null), true);
});

check('Refex agent Open / SLA exclude other agents and participated-only', () => {
  const otherAgent = { _id: 'UsAgent2', Email: 'other@refex.co.in', Name: 'Other' };
  const participatedOpen = {
    ...mkOpenTechRow({ id: 'PkPartSla1' }),
    id: 'PkPartSla1',
    isParticipatedByUser: true,
    assignedToRaw: [otherAgent],
    slaBreached: true,
    slaElapsedMinutes: 200,
    serviceQueueSlaMinutes: 60,
    techSupportMyTaskItem: {
      _id: 'PkPartSla1',
      _status: 'InProgress',
      _current_step: 'IT Tech Support',
      _activity_instance_id: 'ActPartSla1',
      _current_assigned_to: [otherAgent],
    },
  };
  assert.equal(matchesRefexTechSupportTab(participatedOpen, 'OpenTickets', agent), false);
  assert.equal(matchesRefexTechSupportTab(participatedOpen, 'SlaBreached', agent), false);
  assert.equal(matchesRefexTechSupportTab(mkOpenTechRow(), 'SlaBreached', agent), false);
});

check('resolveITServiceViewDetailsIds prefers live reopen activity id', () => {
  const row = mkReopenRow({ activityId: 'ActReopenLive1', staleActivityId: 'ActStaleSupport' });
  const ids = resolveITServiceViewDetailsIds(row);
  assert.equal(ids.instanceId, 'PkReopen1');
  assert.equal(ids.activityInstanceId, 'ActReopenLive1');
  assert.notEqual(ids.activityInstanceId, 'ActStaleSupport');
});

check('resolveITServiceViewDetailsIds uses StepField when mytask missing', () => {
  const row = mkReopenRow({ withMyTask: false, activityId: 'ActFromStepField' });
  row.activityInstanceId = 'ActStaleSupport';
  row.raw._activity_instance_id = 'ActStaleSupport';
  const ids = resolveITServiceViewDetailsIds(row);
  assert.equal(ids.activityInstanceId, 'ActFromStepField');
});

check('canShowServiceRecordEditIcon on Closed reopen when assigned', () => {
  const row = mkReopenRow({ assignee: employee, withMyTask: true });
  assert.equal(
    canShowServiceRecordEditIcon(row, employee, { dashboard: 'agent', tabKey: 'Closed' }),
    true,
  );
});

check('canShowServiceRecordEditIcon on Closed reopen without mytask (Reopen window)', () => {
  const row = mkReopenRow({ assignee: employee, withMyTask: false });
  assert.equal(
    canShowServiceRecordEditIcon(row, employee, { dashboard: 'agent', tabKey: 'Closed' }),
    true,
  );
  assert.equal(
    canShowServiceRecordEditIcon(row, employee, { dashboard: 'employee', tabKey: 'Closed' }),
    true,
  );
});

check('Completed step does not open form (only IT Tech Reopen)', () => {
  const row = mkReopenRow({ assignee: employee, withMyTask: false });
  row.currentStep = 'Completed';
  row.activeWorkflowStep = 'Completed';
  row.raw[currentStepCol] = 'Completed';
  row.raw._status = 'Completed';
  row.isProcessCompleted = true;
  assert.equal(
    canShowServiceRecordEditIcon(row, employee, { dashboard: 'agent', tabKey: 'Closed' }),
    false,
  );
});

check('Due includes open tickets; reopen window is not closed-breached', () => {
  const open = mkOpenTechRow();
  assert.equal(matchesMisDuePriorityRow(open), true);

  const reopen = mkReopenRow();
  assert.equal(isServiceQueueClosedSlaBreachedTicket(reopen), false);
  // Reopen is Closed hold — not part of open Due set.
  assert.equal(matchesMisDuePriorityRow(reopen), false);
});

check('Pending Approval drops rows not in live pending (post approve/reject cache)', () => {
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Head' };
  const ghost = {
    id: 'PkGhostHead1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Head Approval',
    activeWorkflowStep: 'IT Head Approval',
    itemStatusRaw: 'Open',
    assignedToRaw: [{ Kind: 'AppRole', Name: 'IT Head' }],
    liveApprovalPendingKnown: true,
    isLiveApprovalPending: false,
    raw: {
      _id: 'PkGhostHead1',
      _status: 'InProgress',
      [currentStepCol]: 'IT Head Approval',
    },
  };
  assert.equal(
    matchesRefexApproverPendingTaskRow(ghost, head, 'me', 'final'),
    false,
  );
  assert.equal(
    canShowServiceRecordEditIcon(ghost, head, { dashboard: 'approver', tabKey: 'PendingTask' }),
    false,
  );

  const live = { ...ghost, isLiveApprovalPending: true, id: 'PkLiveHead1' };
  assert.equal(
    matchesRefexApproverPendingTaskRow(live, head, 'me', 'final'),
    true,
  );
});

check('Head/Manager My Team still shows L1/email tickets not in personal pending', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Head' };
  const l1Col = REFEX_PROFILE.serviceCol.l1ApprovalActivity;
  const emailRow = {
    id: 'PkEmailL1Today1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'L1 Approval',
    activeWorkflowStep: 'L1 Approval',
    itemStatusRaw: 'Open',
    source: 'Email',
    liveApprovalPendingKnown: true,
    isLiveApprovalPending: false,
    raw: {
      _id: 'PkEmailL1Today1',
      _status: 'InProgress',
      _created_at: '2026-08-14T04:30:00Z',
      Source: 'Email',
      [currentStepCol]: 'L1 Approval',
      [l1Col]: [{ _id: 'ActL1Email1', Status: 'InProgress' }],
    },
  };
  assert.equal(matchesRefexApproverPendingTaskRow(emailRow, head, 'me', 'final'), false);
  assert.equal(matchesRefexApproverPendingTaskRow(emailRow, head, 'team', 'final'), true);
  assert.equal(matchesRefexApproverPendingTaskRow(emailRow, head, 'team', 'first'), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(emailRow, 'AllTickets', head, 'team', 'final'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(emailRow, 'PendingTask', head, 'team', 'final'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(emailRow, 'OpenTickets', head, 'team', 'final'),
    false,
  );
});

check('Email tickets with only _created_at stay inside the FY date filter', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const row = {
    id: 'PkEmailDate1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'L1 Approval',
    source: 'Email',
    requestedDateTimeRaw: null,
    createdAtRaw: null,
    raw: { _id: 'PkEmailDate1', _status: 'InProgress', _created_at: '2026-08-14T05:00:00Z' },
  };
  const ms = getDashboardRowDateMs(row);
  assert.ok(Number.isFinite(ms), 'expected _created_at fallback');
  const kept = applyDashboardDateRangeFilter([row], { from: '2026-04-01', to: '2026-08-14' });
  assert.equal(kept.length, 1);
  const undatedOpen = {
    ...row,
    id: 'PkEmailNoDate1',
    raw: { _id: 'PkEmailNoDate1', _status: 'InProgress' },
  };
  const keptUndated = applyDashboardDateRangeFilter([undatedOpen], { from: '2026-04-01', to: '2026-08-14' });
  assert.equal(keptUndated.length, 1, 'undated live email ticket must stay visible');
});

check('Participated stamp includes ticket in Me Closed / Rejected', () => {
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Head' };
  const closedParticipated = {
    id: 'PkPartClosed1',
    status: 'Completed',
    systemStatus: 'Completed',
    currentStep: 'Completed',
    itemStatusRaw: 'Closed',
    isParticipatedByUser: true,
    isProcessCompleted: true,
    raw: { _id: 'PkPartClosed1', _status: 'Completed', Statu_1: 'Closed' },
  };
  assert.equal(
    matchesRefexMonitoringServiceTab(closedParticipated, 'Closed', head, 'me', 'final'),
    true,
  );

  const rejectedParticipated = {
    id: 'PkPartRej1',
    status: 'Rejected',
    systemStatus: 'Rejected',
    currentStep: 'IT Head Approval',
    itemStatusRaw: 'Rejected',
    isParticipatedByUser: true,
    raw: { _id: 'PkPartRej1', _status: 'Rejected', Statu_1: 'Rejected' },
  };
  assert.equal(
    matchesRefexMonitoringServiceTab(rejectedParticipated, 'Rejected', head, 'me', 'final'),
    true,
  );
});

check('Manager/Head Me Closed includes IT Tech Reopen they already approved', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const manager = { _id: 'UsMgr1', Email: 'mgr@refex.co.in', Name: 'Priya Manager' };
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Arun Head' };
  const otherMgr = { _id: 'UsMgr2', Email: 'other-mgr@refex.co.in', Name: 'Other Manager' };
  const managerCol = REFEX_PROFILE.serviceCol.itManagerApprovalActivity;
  const headCol = REFEX_PROFILE.serviceCol.itHeadApprovalActivity;

  const managerApprovedReopen = mkReopenRow({
    id: 'PkMgrReopenMe1',
    withMyTask: false,
    assignee: employee,
  });
  managerApprovedReopen.raw[managerCol] = [{
    _id: 'ActMgrDone1',
    Status: 'Completed',
    ActedBy: [manager],
  }];

  assert.equal(isRefexServiceClosedTicket(managerApprovedReopen), true);
  assert.equal(matchesRefexApproverPendingTaskRow(managerApprovedReopen, manager, 'me', 'first'), false);
  assert.equal(matchesRefexMeOnlyScope(managerApprovedReopen, manager, { role: 'first' }), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(managerApprovedReopen, 'Closed', manager, 'me', 'first'),
    true,
  );
  assert.equal(matchesRefexServiceTeamScope(managerApprovedReopen, manager, { role: 'first' }), false);
  assert.equal(matchesRefexMeOnlyScope(managerApprovedReopen, otherMgr, { role: 'first' }), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(managerApprovedReopen, 'Closed', otherMgr, 'me', 'first'),
    false,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(managerApprovedReopen, 'Closed', otherMgr, 'team', 'first'),
    true,
  );

  const headApprovedReopen = mkReopenRow({
    id: 'PkHeadReopenMe1',
    withMyTask: false,
    assignee: employee,
  });
  headApprovedReopen.raw[headCol] = [{
    _id: 'ActHeadDone1',
    Status: 'Completed',
    ActedBy: [head],
  }];
  assert.equal(matchesRefexApproverPendingTaskRow(headApprovedReopen, head, 'me', 'final'), false);
  assert.equal(matchesRefexMeOnlyScope(headApprovedReopen, head, { role: 'final' }), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(headApprovedReopen, 'Closed', head, 'me', 'final'),
    true,
  );
  assert.equal(matchesRefexMeOnlyScope(headApprovedReopen, manager, { role: 'first' }), false);

  const l1Col = REFEX_PROFILE.serviceCol.l1ApprovalActivity;
  const l1OnlyReopen = mkReopenRow({
    id: 'PkL1ReopenNotMgr1',
    withMyTask: false,
    assignee: employee,
  });
  l1OnlyReopen.raw[l1Col] = [{
    _id: 'ActL1Done1',
    Status: 'Completed',
    ActedBy: [manager],
  }];
  assert.equal(matchesRefexMeOnlyScope(l1OnlyReopen, manager, { role: 'first' }), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(l1OnlyReopen, 'Closed', manager, 'me', 'first'),
    false,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(l1OnlyReopen, 'Closed', manager, 'team', 'first'),
    true,
  );

  const foreignReopen = mkReopenRow({
    id: 'PkForeignReopen1',
    withMyTask: false,
    assignee: employee,
  });
  assert.equal(matchesRefexMeOnlyScope(foreignReopen, manager, { role: 'first' }), false);
  assert.equal(matchesRefexMeOnlyScope(foreignReopen, head, { role: 'final' }), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(foreignReopen, 'Closed', manager, 'team', 'first'),
    true,
  );
});

check('Rejected is not Pending/Closed; matches Rejected tab', () => {
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Head' };
  const rejected = {
    id: 'PkRej1',
    status: 'Rejected',
    systemStatus: 'Rejected',
    currentStep: 'IT Head Approval',
    activeWorkflowStep: 'IT Head Approval',
    itemStatusRaw: 'Rejected',
    modifiedBy: head.Name,
    raw: {
      _id: 'PkRej1',
      _status: 'Rejected',
      _modified_by: head,
      [currentStepCol]: 'IT Head Approval',
      Statu_1: 'Rejected',
    },
  };
  assert.equal(isRefexServiceRejectedTicket(rejected), true);
  assert.equal(isRefexServiceClosedTicket(rejected), false);
  assert.equal(
    matchesRefexApproverPendingTaskRow(rejected, head, 'me', 'final'),
    false,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(rejected, 'Rejected', head, 'me', 'final'),
    true,
  );
});

check('reopen MIS SLA state is reopen (not ok/warning/breached)', () => {
  const fresh = mkReopenRow({ modifiedAt: new Date().toISOString() });
  assert.equal(getMisSlaFilterState(fresh), 'reopen');

  const expired = mkReopenRow({
    modifiedAt: new Date(Date.now() - (IT_TECH_REOPEN_WINDOW_MS + 60_000)).toISOString(),
  });
  assert.equal(getMisSlaFilterState(expired), 'reopen');
});

check('SLA filter options include Reopen for IT Tech Reopen rows', () => {
  const reopenRows = [mkReopenRow()];
  const opts = getMisSlaFilterOptionsForRows(reopenRows);
  assert.ok(opts.length > 0, 'expected SLA options for reopen rows');
  assert.ok(opts.some((o) => o.value === 'reopen'), 'expected Reopen filter option');
});

check('getRefexTechReopenMisDisplay shows Reopen window only', () => {
  const row = mkReopenRow();
  const display = getRefexTechReopenMisDisplay(row);
  assert.equal(display.primary, 'Reopen window');
  assert.equal(display.sub, null);
  assert.equal(display.state, 'reopen');

  const expired = mkReopenRow({
    modifiedAt: new Date(Date.now() - (IT_TECH_REOPEN_WINDOW_MS + 60_000)).toISOString(),
  });
  const expiredDisplay = getRefexTechReopenMisDisplay(expired);
  assert.equal(expiredDisplay.primary, 'Reopen window');
  assert.notEqual(expiredDisplay.primary, 'Auto-close due');
});

check('progress branch fallback builds workflow journey', async () => {
  const { parseRefexProgress } = await import('../src/itsm/refex/employeedashboard/progressApi.js');
  const progress = {
    _status: 'InProgress',
    Steps: [
      { Name: 'Start', NodeType: 'StartEvent', _status: 'Completed', ActedAt: '2026-01-01T10:00:00Z' },
      {
        Name: 'Branch',
        Process: [
          {
            ProcessName: 'Service Branch',
            Steps: [
              {
                Name: 'IT Manager Approval',
                _status: 'Completed',
                ActedAt: '2026-01-02T10:00:00Z',
                ActedBy: { Name: 'Mgr' },
              },
              {
                Name: 'IT Tech Support',
                _status: 'InProgress',
                AssignedTo: { Name: 'Agent' },
                _note: 'Fixed VPN',
              },
            ],
          },
        ],
      },
    ],
  };
  const parsed = parseRefexProgress(progress, { currentStep: 'IT Tech Support' }, 'Open');
  assert.ok(parsed.journey.length >= 2, 'expected workflow steps from fallback branch');
  assert.ok(parsed.journey.some((n) => n.label === 'Tech Support' || n.label === 'IT Manager Approval'));
});

check('collectConversationEntries uses solution fallback', async () => {
  const { collectConversationEntries, shouldShowRevisions } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  const entries = collectConversationEntries({
    solution: 'Laptop reimaged',
    latestAgentSolution: '—',
    agentSolutions: [],
  });
  assert.equal(shouldShowRevisions(entries), true);
  assert.ok(entries.some((e) => e.comment === 'Laptop reimaged'));
});

// --- Extrovis (profile switch) ---
setITDashboardProfile(EXTROVIS_PROFILE);

const extPickupCol = EXTROVIS_PROFILE.serviceCol.itAgentPickupActivity;
const extSolutionCol = EXTROVIS_PROFILE.serviceCol.itAgentActivity;
const extCurrentStepCol = EXTROVIS_PROFILE.serviceCol.currentStep;
const extReopenCol = EXTROVIS_PROFILE.serviceCol.itTechReopenActivity
  || EXTROVIS_PROFILE.serviceCol.employeeApprovalRefex;

function mkExtPickupRow({ id = 'PkExtOpen1' } = {}) {
  const raw = {
    _id: id,
    _status: 'InProgress',
    [extCurrentStepCol]: 'IT Agent PickUp',
    [extPickupCol]: [{ _id: 'ActPick1', Status: 'InProgress' }],
  };
  return {
    id,
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Agent PickUp',
    activeWorkflowStep: 'IT Agent PickUp',
    raw,
  };
}

function mkExtSolutionRow({
  id = 'PkExtMine1',
  user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' },
} = {}) {
  const raw = {
    _id: id,
    _status: 'InProgress',
    _current_assigned_to: [user],
    Assigned_To: user,
    [extCurrentStepCol]: 'IT Agent Solution',
    [extSolutionCol]: [{ _id: 'ActSol1', Status: 'InProgress' }],
  };
  return {
    id,
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Agent Solution',
    activeWorkflowStep: 'IT Agent Solution',
    assignedToRaw: [user],
    techSupportTaskOwnedByUser: true,
    raw,
  };
}

check('Extrovis Open = PickUp only; My Tickets = Solution owned work', () => {
  const user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const open = mkExtPickupRow();
  const mine = mkExtSolutionRow({ user });
  assert.equal(matchesExtrovisOpenTicketRow(open, user), true);
  assert.equal(matchesExtrovisMyTaskRow(open, user), false);
  assert.equal(matchesExtrovisOpenTicketRow(mine, user), false);
  assert.equal(matchesExtrovisMyTaskRow(mine, user), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(open, 'OpenTickets', user, 'me', 'first'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(mine, 'AssignedToMe', user, 'me', 'first'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(open, 'AssignedToMe', user, 'me', 'first'),
    false,
  );
});

check('Extrovis Statu_1 Closed while holding Solution stays My Tickets, not Closed', () => {
  const user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const holding = mkExtSolutionRow({ id: 'PkExtHoldClosedStatus', user });
  holding.itemStatusRaw = 'Closed';
  holding.raw.Statu_1 = 'Closed';
  holding.raw.Validation = 'Closed';
  holding.lastCompletedStep = 'ReOpen Window';
  assert.equal(isRefexServiceClosedTicket(holding), false);
  assert.equal(matchesExtrovisMyTaskRow(holding, user), true);
  assert.equal(matchesExtrovisOpenTicketRow(holding, user), false);
  assert.equal(matchesRefexMonitoringServiceTab(holding, 'Closed', user, 'me', 'first'), false);
  assert.equal(matchesRefexMonitoringServiceTab(holding, 'AssignedToMe', user, 'me', 'first'), true);
});

check('Extrovis live Solution step is not shown as ReOpen Window', () => {
  const user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const row = mkExtSolutionRow({ id: 'PkExtFy0260003', user });
  row.itemStatusRaw = 'Open';
  row.raw.Statu_1 = 'Open';
  row.lastCompletedStep = 'ReOpen Window';
  row.currentStep = 'IT Agent Solution';
  row.activeWorkflowStep = 'IT Agent Solution';
  row.raw[extCurrentStepCol] = 'IT Agent Solution';
  row.raw[extReopenCol] = [{ _id: 'ActStaleReopen', Status: '' }];
  row.techSupportMyTaskItem = {
    _id: 'PkExtFy0260003',
    _status: 'InProgress',
    _current_step: 'IT Agent Solution',
    _activity_id: 'Activity_XVeFnZdKon',
    _current_assigned_to: [user],
  };
  assert.equal(getCurrentStepValue(row), 'IT Agent Solution');
  assert.equal(isRefexServiceClosedTicket(row), false);
  assert.equal(matchesExtrovisMyTaskRow(row, user), true);
  assert.equal(matchesRefexMonitoringServiceTab(row, 'Closed', user, 'me', 'agent'), false);
});

check('Extrovis monitoring tabs have no Pending Approval', () => {
  const tabs = getApproverServiceTabs('Extrovis');
  assert.ok(!tabs.some((t) => t.key === 'PendingTask'));
  assert.ok(!tabs.some((t) => /pending approval/i.test(t.label || '')));
  assert.ok(tabs.some((t) => t.key === 'OpenTickets'));
  assert.ok(tabs.some((t) => t.key === 'AssignedToMe'));
});

check('Extrovis reopen window is 7 days (Refex stays 48h)', () => {
  assert.equal(getReopenWindowMs(), EXTROVIS_REOPEN_WINDOW_MS);
  assert.equal(EXTROVIS_REOPEN_WINDOW_MS, 7 * 24 * 60 * 60 * 1000);
  setITDashboardProfile(REFEX_PROFILE);
  assert.equal(getReopenWindowMs(), IT_TECH_REOPEN_WINDOW_MS);
  setITDashboardProfile(EXTROVIS_PROFILE);
  const reopenRaw = {
    _id: 'PkExtReopen1',
    _status: 'InProgress',
    Statu_1: 'Closed',
    [extCurrentStepCol]: 'ReOpen Window',
    [extReopenCol]: [{ _id: 'ActReopen1', Status: 'InProgress' }],
  };
  const reopenRow = {
    id: 'PkExtReopen1',
    status: 'InProgress',
    currentStep: 'ReOpen Window',
    activeWorkflowStep: 'ReOpen Window',
    itemStatusRaw: 'Closed',
    raw: reopenRaw,
  };
  assert.equal(isRefexServiceClosedTicket(reopenRow), true);
  assert.equal(matchesExtrovisMyTaskRow(reopenRow, { Email: 'a@x.com' }), false);
});

check('Extrovis My Team = everyone except signed-in user (PickUp stays on Team)', () => {
  const me = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const other = { _id: 'UsAgent2', Email: 'other@extrovis.com', Name: 'Other' };
  const pickup = mkExtPickupRow({ id: 'PkExtTeamPick1' });
  const mine = mkExtSolutionRow({ id: 'PkExtTeamMine1', user: me });
  const others = mkExtSolutionRow({ id: 'PkExtTeamOther1', user: other });
  others.techSupportTaskOwnedByUser = false;
  assert.equal(matchesRefexMeOnlyScope(pickup, me, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(pickup, me, { role: 'agent' }), true);
  assert.equal(matchesRefexMeOnlyScope(mine, me, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(mine, me, { role: 'agent' }), false);
  assert.equal(matchesRefexMeOnlyScope(others, me, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(others, me, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(others, me, { role: 'first' }), true);
});

check('Extrovis ReOpen Window is clickable from All Tickets', () => {
  const user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const reopenRow = {
    id: 'PkExtReopenClick1',
    status: 'InProgress',
    currentStep: 'ReOpen Window',
    activeWorkflowStep: 'ReOpen Window',
    itemStatusRaw: 'Closed',
    raw: {
      _id: 'PkExtReopenClick1',
      _status: 'InProgress',
      Statu_1: 'Closed',
      [extCurrentStepCol]: 'ReOpen Window',
      [extReopenCol]: [{ _id: 'ActReopenClick1', Status: 'InProgress' }],
    },
  };
  assert.equal(
    canShowServiceRecordEditIcon(reopenRow, user, { dashboard: 'agent', tabKey: 'AllTickets' }),
    true,
  );
  assert.equal(
    canShowServiceRecordEditIcon(reopenRow, user, { dashboard: 'agent', tabKey: 'Closed' }),
    true,
  );
  const pickup = mkExtPickupRow({ id: 'PkExtPickClick1' });
  assert.equal(
    canShowServiceRecordEditIcon(pickup, user, { dashboard: 'agent', tabKey: 'AllTickets' }),
    true,
  );
});

check('Closed KPI ignores Status/Statu_1; uses ReOpen Window or Completed only', () => {
  const solutionClosedStatus = mkExtSolutionRow({ id: 'PkExtFalseClosed1' });
  solutionClosedStatus.itemStatusRaw = 'Closed';
  solutionClosedStatus.status = 'Completed';
  solutionClosedStatus.systemStatus = 'Completed';
  solutionClosedStatus.isProcessCompleted = true;
  solutionClosedStatus.raw.Statu_1 = 'Closed';
  solutionClosedStatus.raw.Validation = 'Closed';
  solutionClosedStatus.raw._status = 'InProgress';
  assert.equal(isRefexServiceClosedTicket(solutionClosedStatus), false);
  assert.equal(isRefexServiceOpenTicket(solutionClosedStatus), true);
  assert.equal(getMisTicketStatus(solutionClosedStatus), 'Open');
  assert.equal(
    matchesRefexMonitoringServiceTab(solutionClosedStatus, 'Closed', { Email: 'a@x.com' }, 'team', 'first'),
    false,
  );
  const pickupClosedStatus = mkExtPickupRow({ id: 'PkExtFalseClosedPick1' });
  pickupClosedStatus.itemStatusRaw = 'Closed';
  pickupClosedStatus.status = 'Completed';
  pickupClosedStatus.systemStatus = 'Closed';
  pickupClosedStatus.isProcessCompleted = true;
  pickupClosedStatus.raw.Statu_1 = 'Closed';
  pickupClosedStatus.raw.Validation = 'Closed';
  pickupClosedStatus.raw._status = 'InProgress';
  assert.equal(
    matchesRefexMonitoringServiceTab(pickupClosedStatus, 'Closed', { Email: 'a@x.com' }, 'me', 'first'),
    false,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(pickupClosedStatus, 'OpenTickets', { Email: 'a@x.com' }, 'me', 'first'),
    true,
  );
});

check('Extrovis MIS drops Source/Type/Category/Sub Category', () => {
  const keys = getRefexServiceQueueMisColumns().map((col) => col.key);
  assert.equal(keys.includes('source'), false);
  assert.equal(keys.includes('ticketType'), false);
  assert.equal(keys.includes('category'), false);
  assert.equal(keys.includes('subCategory'), false);
  assert.ok(keys.includes('closedBy'));
  assert.ok(keys.includes('reopenedOn'));
});

setITDashboardProfile(REFEX_PROFILE);

check('Refex Dependency + After Dependency are My Tickets and row-clickable', () => {
  const user = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Agent' };
  const depCol = REFEX_PROFILE.serviceCol.dependencyAssigneeActivity;
  const afterCol = REFEX_PROFILE.serviceCol.techSupportAfterDependencyActivity;
  const depRow = {
    id: 'PkDep1',
    status: 'InProgress',
    currentStep: 'Dependency Assignee',
    activeWorkflowStep: 'Dependency Assignee',
    assignedToRaw: [user],
    techSupportMyTaskItem: {
      _id: 'PkDep1',
      _status: 'InProgress',
      _current_step: 'Dependency Assignee',
      _activity_instance_id: 'ActDep1',
      _current_assigned_to: [user],
    },
    raw: {
      _id: 'PkDep1',
      _status: 'InProgress',
      [currentStepCol]: 'Dependency Assignee',
      [depCol]: [{ _id: 'ActDep1', Status: 'InProgress' }],
      _current_assigned_to: [user],
    },
  };
  const afterRow = {
    id: 'PkAfter1',
    status: 'InProgress',
    currentStep: 'Tech Support After Dependency',
    activeWorkflowStep: 'Tech Support After Dependency',
    assignedToRaw: [user],
    raw: {
      _id: 'PkAfter1',
      _status: 'InProgress',
      [currentStepCol]: 'Tech Support After Dependency',
      [afterCol]: [{ _id: 'ActAfter1', Status: 'InProgress' }],
      _current_assigned_to: [user],
    },
  };
  assert.equal(matchesRefexSplitMyTaskRow(depRow, user), true);
  assert.equal(matchesRefexTechSupportTab(depRow, 'AssignedToMe', user), true);
  assert.equal(
    canShowServiceRecordEditIcon(depRow, user, { dashboard: 'agent', tabKey: 'AssignedToMe' }),
    true,
  );
  assert.equal(
    canShowServiceRecordEditIcon(depRow, user, { dashboard: 'agent', tabKey: 'AllTickets' }),
    true,
  );
  assert.equal(matchesRefexSplitMyTaskRow(afterRow, user), true);
  assert.equal(matchesRefexTechSupportTab(afterRow, 'AssignedToMe', user), true);
});

check('Closed SLA breach is counted separately from open SLA breach', () => {
  const closedBreached = {
    id: 'PkClosedSla1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    itemStatusRaw: 'Closed',
    refexTechSupportStatus: 'close',
    currentStep: 'Completed',
    slaBreached: true,
    slaElapsedMinutes: 200,
    serviceQueueSlaMinutes: 60,
    raw: {
      _id: 'PkClosedSla1',
      _status: 'Completed',
      Statu_1: 'Closed',
      [currentStepCol]: 'Completed',
    },
  };
  assert.equal(isServiceQueueClosedSlaBreachedTicket(closedBreached), true);
  assert.equal(isServiceQueueAnySlaBreachedTicket(closedBreached), true);
  assert.equal(isServiceQueueSlaBreachedTicket(closedBreached), false);
});

check('MIS person initials and request type codes', () => {
  assert.equal(getPersonInitials('Mohamed Aasik'), 'MA');
  assert.equal(getPersonInitials('Arun Kumar'), 'AK');
  assert.equal(getPersonInitials('Gowtham'), 'GW');
  assert.equal(getRequestTypeShort('Service Request'), 'SR');
  assert.equal(getRequestTypeShort('Incident'), 'IC');
});

check('MIS service columns follow the shared order', () => {
  const keys = getRefexServiceQueueMisColumns().map((col) => col.key);
  assert.deepEqual(keys, [
    'expand',
    'requestId',
    'requester',
    'assignedTo',
    'sla',
    'createdOn',
    'ticketStatus',
    'source',
    'ticketType',
    'category',
    'subCategory',
    'criticality',
    'closedBy',
    'closedOn',
    'reopenedOn',
  ]);
});

check('Rejected tickets show status, closed by, and rejection reason', () => {
  const rejected = {
    id: 'PkReject1',
    systemStatus: 'Rejected',
    status: 'Rejected',
    itemStatusRaw: 'Rejected',
    modifiedBy: 'Priya Sharma',
    managerComments: 'Duplicate request — already logged.',
    raw: { _status: 'Rejected', _modified_by: { Name: 'Priya Sharma' } },
  };
  assert.equal(isRefexServiceRejectedTicket(rejected), true);
  assert.equal(getMisTicketStatus(rejected), 'Closed');
  assert.equal(getClosedByDisplay(rejected), 'Priya Sharma');
  assert.equal(getRejectionReasonDisplay(rejected), 'Duplicate request — already logged.');
});

check('Pending my-task rows stay clickable outside AssignedToMe', () => {
  const user = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Agent' };
  const depRow = {
    id: 'PkDepClick1',
    status: 'InProgress',
    currentStep: 'Dependency Assignee',
    activeWorkflowStep: 'Dependency Assignee',
    assignedToRaw: [user],
    techSupportMyTaskItem: {
      _id: 'PkDepClick1',
      _status: 'InProgress',
      _current_step: 'Dependency Assignee',
      _activity_instance_id: 'ActDepClick1',
      _current_assigned_to: [user],
    },
    raw: {
      _id: 'PkDepClick1',
      _status: 'InProgress',
      [currentStepCol]: 'Dependency Assignee',
      _current_assigned_to: [user],
    },
  };
  assert.equal(
    canShowServiceRecordEditIcon(depRow, user, { dashboard: 'agent', tabKey: 'AllTickets' }),
    true,
  );
  assert.equal(
    canShowServiceRecordEditIcon(depRow, user, { dashboard: 'agent', tabKey: 'SlaBreached' }),
    true,
  );
});

check('Open tickets hide Closed Date; empty category/criticality fill; assigned-to fallback', () => {
  const openRow = {
    id: 'PkOpenFill1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech Support',
    activeWorkflowStep: 'IT Tech Support',
    itemStatusRaw: 'Open',
    assignedTo: '',
    assignedToUser: 'asik',
    createdBy: 'Mohamed Aasik',
    requesterName: 'Mohamed Aasik',
    modifiedAtRaw: '2026-08-06T10:33:00.000Z',
    ticketType: 'Service Request',
  };
  assert.equal(getClosedOnRaw(openRow), null);
  assert.equal(getClosedByDisplay(openRow), '—');
  assert.equal(getAssignedToDisplay(openRow), 'asik');
  assert.equal(getMisTicketTypeLabel(openRow), 'Service Request');
  assert.equal(getMisCategoryLabel(openRow), 'Others');
  assert.equal(getMisSubCategoryLabel(openRow), 'Others');
  assert.equal(getMisCriticalityLabel(openRow), 'Low');
  assert.equal(getMisTicketStatus(openRow), 'Open');
  assert.notEqual(getPersonAvatarTone('Mohamed Aasik').bg, getPersonAvatarTone('asik').bg);
});

check('Empty ticket type and Tech Reopen step map to Others / Closed', () => {
  assert.equal(getMisTicketTypeLabel({}), 'Others');
  assert.equal(getMisTicketStatus({
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech Reopen',
    activeWorkflowStep: 'IT Tech Reopen',
  }), 'Closed');
  assert.equal(getMisTicketStatus({
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    raw: { _status: 'Completed' },
  }), 'Closed');
});

check('Status Closed at IT Tech Support is not Closed KPI', () => {
  const row = mkOpenTechRow({ id: 'PkFalseClosed1' });
  row.itemStatusRaw = 'Closed';
  row.raw.Statu_1 = 'Closed';
  assert.equal(isRefexServiceClosedTicket(row), false);
  assert.equal(isRefexServiceOpenTicket(row), true);
});

check('Request ID never shows Kissflow _id junk when a real id exists', () => {
  const instanceId = 'PkServiceItemBLbcD57I';
  assert.equal(looksLikeKissflowInstanceId('BLbcD57I', instanceId), true);
  assert.equal(looksLikeKissflowInstanceId('ITSR-1001', instanceId), false);
  assert.equal(resolveDisplayRequestId({
    id: instanceId,
    requestId: 'BLbcD57I',
    raw: { _id: instanceId, Request_ID: 'ITSR-1001' },
  }, instanceId), 'ITSR-1001');
  assert.equal(resolveDisplayRequestId({
    id: instanceId,
    requestId: 'BLbcD57I',
    raw: { _id: instanceId },
  }, instanceId), '');
});

check('First Level Extrovis Solution My Tickets opens even when PickUp-only liveApproval is stamped', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const row = mkExtSolutionRow({ id: 'PkExtFirstLevelOpen1', user });
  row.liveApprovalPendingKnown = true;
  row.isLiveApprovalPending = false;
  row.techSupportMyTaskItem = {
    _id: 'PkExtFirstLevelOpen1',
    _current_step: 'IT Agent Solution',
    _activity_id: 'Activity_XVeFnZdKon',
    _activity_instance_id: 'ActSolLive1',
    _current_assigned_to: [user],
  };
  row.techSupportTaskActivityInstanceId = 'ActSolLive1';
  assert.equal(
    canShowServiceRecordEditIcon(row, user, { dashboard: 'approver', tabKey: 'AssignedToMe' }),
    true,
  );
  assert.equal(
    canShowServiceRecordEditIcon(row, user, { dashboard: 'approver', tabKey: 'AllTickets' }),
    true,
  );
  assert.equal(resolveITServiceViewDetailsIds(row).activityInstanceId, 'ActSolLive1');
});

check('Non-Refex queue tabs are SR & INC / Change', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const tabs = getAgentQueueTabs();
  assert.equal(tabs[0].label, 'SR & INC');
  assert.equal(tabs[1].label, 'Change');
  setITDashboardProfile(REFEX_PROFILE);
  const refexTabs = getAgentQueueTabs();
  assert.equal(refexTabs[0].label, 'Service');
  assert.equal(refexTabs[1].label, 'Change');
  setITDashboardProfile(EXTROVIS_PROFILE);
});

check('Workflow rail stops at live IT Agent Solution — does not show ReOpen Window', async () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const { trimWorkflowJourney } = await import('../src/itsm/refex/employeedashboard/progressApi.js');
  const journey = [
    { type: 'step', label: 'Opened', name: 'Start', status: 'Completed' },
    { type: 'step', label: 'Open Ticket', name: 'IT Agent PickUp', status: 'Completed' },
    { type: 'step', label: 'Tech Support', name: 'IT Agent Solution', status: 'InProgress' },
    { type: 'step', label: 'Ticket Can be Reopened', name: 'ReOpen Window', status: 'InProgress' },
  ];
  const row = mkExtSolutionRow({ id: 'PkExtWfLive1' });
  row.techSupportMyTaskItem = { _current_step: 'IT Agent Solution' };
  const trimmed = trimWorkflowJourney(journey, row, 'Open');
  assert.equal(trimmed.some((n) => n.label === 'Ticket Can be Reopened' || n.name === 'ReOpen Window'), false);
  assert.equal(trimmed.some((n) => n.name === 'IT Agent Solution' || n.label === 'Tech Support'), true);
});

check('Closed tickets always have Closed By', () => {
  const closed = {
    id: 'PkClosedFill1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    itemStatusRaw: 'Closed',
    assignedTo: 'asik',
    createdBy: 'Mohamed Aasik',
    raw: { _status: 'Completed' },
  };
  assert.equal(getMisTicketStatus(closed), 'Closed');
  assert.equal(getClosedByDisplay(closed), 'asik');
});

if (failed) {
  console.error(`\n${failed} logic test(s) failed`);
  process.exit(1);
}
console.log('\nAll Refex + Extrovis logic tests passed');
