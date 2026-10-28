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
  getRefexServiceSlaMisDisplay,
  getSlaTiming,
  getServiceQueueSlaMinutes,
  PENDING_APPROVAL_SLA_MINUTES,
  EXTROVIS_PICKUP_TAT_MINUTES,
  isSlaHoldRow,
  formatServiceWorkflowStepDisplay,
  resolveITServiceViewDetailsIds,
  canShowServiceRecordEditIcon,
  IT_TECH_REOPEN_WINDOW_MS,
  EXTROVIS_REOPEN_WINDOW_MS,
  getReopenWindowMs,
  matchesMisDuePriorityRow,
  isServiceQueueClosedSlaBreachedTicket,
  matchesRefexApproverPendingTaskRow,
  matchesRefexApproverReopenClosedRow,
  matchesRefexMonitoringServiceTab,
  getDashboardRowDateMs,
  applyDashboardDateRangeFilter,
  dashboardDateRangeIncludesToday,
  matchesExtrovisOpenTicketRow,
  matchesExtrovisMyTaskRow,
  matchesRefexOpenTicketRow,
  matchesRefexMeOnlyScope,
  matchesRefexServiceTeamScope,
  matchesRefexSplitMyTaskRow,
  isTicketClosedByUser,
  pickLatestTicketSolver,
  isItsmBotOrSystemActor,
  getApproverServiceTabs,
  isRefexServiceRejectedTicket,
  isServiceQueueSlaBreachedTicket,
  isServiceQueueAnySlaBreachedTicket,
  countServiceSlaKpiSplit,
  looksLikeKissflowInstanceId,
  resolveAccountId,
  DEV_ACCOUNT_ID,
  DEFAULT_ACCOUNT_ID,
  getReportPath,
  extractItemsFromResponse,
  resolveDisplayRequestId,
  resolveItsmHeaderRoleLabel,
  sortMisTableRows,
  sortDashboardRowsByCreatedDate,
  sortDashboardRowsByTicketOrder,
  getCurrentStepValue,
  getAgentQueueTabs,
  isDashboardRowCreatedToday,
  getCompletedResolutionTiming,
  collectAssigneeFilterOptions,
  displayItsmPersonName,
  matchesCommonPersonalScope,
  pickServiceTicketAttachments,
  collectRequesterFilterOptions,
  applyMisColumnFilters,
  resolveAttachmentUrl,
  isImageAttachment,
  EXTROVIS_DASHBOARD_DEFAULT_ENTITY,
  EXTROVIS_DASHBOARD_ENTITY_OPTIONS,
  isExtrovisAllEntityTab,
  isExtrovisReportEntity,
  isExtrovisServiceDashboardContext,
  assignedToLabelForDisplay,
  WAITING_FOR_PICKUP_LABEL,
  filterRowsByEntityKey,
  resolveEntityProfile,
  resolveModernMisChromeEntityKey,
  usesModernMisChrome,
  resolveEntityProcessDatasetKey,
  sharesEntityProcessDataset,
} from '../src/lib/kfITServiceDashboard.js';
import { collectConversationEntries } from '../src/itsm/refex/employeedashboard/buildRevisions.js';
import { getMisTicketStatus } from '../src/itsm/refex/employeedashboard/employeeStatus.js';
import { mapRefexEmployeeRow, enrichEmployeeRowCompletion } from '../src/itsm/refex/employeedashboard/mapRefexEmployeeRow.js';
import { getPersonInitials, getRequestTypeShort, getMisCategoryLabel, getMisSubCategoryLabel, getMisCriticalityLabel, getMisTicketTypeLabel, getMisSourceLabel, getPersonAvatarTone } from '../src/itsm/refex/shared/misCompactDisplay.js';
import { getClosedByDisplay, getAssignedToDisplay } from '../src/itsm/refex/employeedashboard/closedBy.js';
import { getClosedOnRaw } from '../src/itsm/refex/employeedashboard/employeeDates.js';
import {
  shouldNotifyUserCommentEmail,
  resolveCommentMailRecipients,
  resolveCommentRequesterEmail,
  resolveAssignedGreetingName,
  buildCommentMailPayload,
  commentMailSubject,
  COMMENT_MAIL_SUPPORT_TO,
} from '../src/itsm/refex/employeedashboard/commentNotifyMail.js';
import {
  getExtrovisSapModule,
  hidesExtrovisAgentMeTeamAndOpenKpi,
  isExtrovisSapTicket,
  getExtrovisAgentLockedEntity,
  hidesExtrovisAgentEntityFilter,
  isExtrovisAgentSapTeamOnly,
  isExtrovisAgentSapTeamEntityRow,
} from '../src/lib/extrovisSapTicket.js';
import { getRefexServiceQueueMisColumns } from '../src/itsm/refex/shared/refexServiceQueueColumns.js';
import { getRejectionReasonDisplay, getRejectedByDisplay, buildServiceStatusTiles } from '../src/components/it/mis/misExpandContent.js';
import {
  itemAssignedToAppRole,
  collectHeadLiveAssignmentIds,
  mergeAdminItemsById,
  extractAdminItemPage,
  buildAdminProcessItemPath,
  REFEX_IT_HEAD_APPROLE_ID,
} from '../src/itsm/refex/shared/fetchKissflowAdminProcessItems.js';
import {
  stampPendingItemsWithStepName,
  parsePendingActivityCountEntries,
  resolveActivityIdsByStepNames,
  collectStepPatternsForMeBucket,
  classifyPendingStepName,
} from '../src/itsm/refex/shared/refexPendingByStep.js';

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
    isLiveBucketPending: Boolean(withMyTask),
    isLiveReopenPending: Boolean(withMyTask),
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
    processStages: 'InProgress',
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
const pendingChecks = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      pendingChecks.push(result.then(
        () => {
          console.log(`OK  ${name}`);
        },
        (err) => {
          failed += 1;
          console.error(`FAIL ${name}`);
          console.error(`     ${err.message}`);
        },
      ));
      return;
    }
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

check('Me = live bucket + closed-by; My Team excludes Me rows', () => {
  const otherAgent = { _id: 'UsAgent2', Email: 'other@refex.co.in', Name: 'Other' };
  const mine = mkOpenTechRow({ id: 'PkMineMe1' });
  mine.isLiveBucketPending = true;
  const participatedOnly = {
    ...mkOpenTechRow({ id: 'PkPart1' }),
    id: 'PkPart1',
    isParticipatedByUser: true,
    assignedToRaw: [otherAgent],
    techSupportMyTaskItem: null,
    techSupportTaskOwnedByUser: false,
    isLiveBucketPending: false,
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
  assert.equal(matchesRefexMeOnlyScope(participatedOnly, agent, { role: 'agent' }), false);
  assert.equal(matchesRefexMeOnlyScope(otherRr, agent, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(mine, agent, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(participatedOnly, agent, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(otherRr, agent, { role: 'agent' }), true);
});

check('Common personal scope keeps requester-opened tickets and own tasks only', () => {
  const hod = { _id: 'UsHod1', Email: 'hod@refex.co.in', Name: 'HOD' };
  const other = { _id: 'UsOther1', Email: 'other@refex.co.in', Name: 'Other' };
  const openedByHod = {
    id: 'PkOpened1',
    requesterEmail: 'hod@refex.co.in',
    createdById: 'UsHod1',
    currentStep: 'IT Tech Support',
    isLiveBucketPending: false,
  };
  const teamTicket = {
    id: 'PkTeam1',
    requesterEmail: 'other@refex.co.in',
    createdById: 'UsOther1',
    currentStep: 'IT Tech Support',
    isLiveBucketPending: false,
    assignedToRaw: [other],
  };
  const hodTask = {
    id: 'PkHodTask1',
    requesterEmail: 'other@refex.co.in',
    currentStep: 'IT Head Approval',
    isLiveBucketPending: true,
    isLiveApprovalPending: true,
  };
  assert.equal(matchesCommonPersonalScope(openedByHod, hod, { role: 'final' }), true);
  assert.equal(matchesCommonPersonalScope(hodTask, hod, { role: 'final' }), true);
  assert.equal(matchesCommonPersonalScope(teamTicket, hod, { role: 'final' }), false);
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

check('Due includes only open SLA-breached tickets (not all open, not closed)', () => {
  const open = mkOpenTechRow();
  assert.equal(matchesMisDuePriorityRow(open), false, 'plain open is not Due');

  const breachedOpen = mkOpenTechRow({ id: 'PkDueBreach1' });
  breachedOpen.slaBreached = true;
  assert.equal(matchesMisDuePriorityRow(breachedOpen), true, 'open breached should match Due');

  const reopen = mkReopenRow();
  assert.equal(isServiceQueueClosedSlaBreachedTicket(reopen), false);
  assert.equal(matchesMisDuePriorityRow(reopen), false, 'reopen window is not Due');

  const closedBreached = {
    ...mkReopenRow({ id: 'PkClosedBreach1' }),
    currentStep: 'Completed',
    activeWorkflowStep: 'Completed',
    isProcessCompleted: true,
    systemStatus: 'Completed',
    status: 'Completed',
    itemStatusRaw: 'Closed',
    slaBreached: true,
    raw: { _id: 'PkClosedBreach1', _status: 'Completed', Statu_1: 'Closed' },
  };
  assert.equal(matchesMisDuePriorityRow(closedBreached), false, 'closed breached is not Due');
});

check('Pending Other does not wipe report Incident/Source/Assignee on merge', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const ticketTypeCol = REFEX_PROFILE.serviceCol.ticketType;
  const sourceCol = REFEX_PROFILE.serviceCol.source;
  const report = {
    _id: 'PkMergeKeep1',
    Request_ID: 'IT-IC-Refex-FY026-000169',
    [ticketTypeCol]: 'Incident',
    [sourceCol]: 'Email',
    _current_assigned_to: [{ _id: 'UsAgent1', Name: 'Aasik' }],
    Category: 'Hardware Incident',
  };
  const pending = {
    _id: 'PkMergeKeep1',
    Request_ID: 'IT-IC-Refex-FY026-000169',
    [ticketTypeCol]: 'Others',
    [sourceCol]: '',
    _current_assigned_to: [{ _id: 'ArRole1' }],
    _current_step: 'IT Tech Reopen',
    Category: '',
  };
  // Simulate mergePreferFilled behavior used in fetch layer.
  const isBlank = (value) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'string') {
      const token = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
      if (!token || token === '—' || token === 'other' || token === 'others') return true;
    }
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  };
  const assigneeHasName = (value) => Array.isArray(value)
    && value.some((e) => e && (e.Name || e.name || e.Email));
  const merged = { ...report };
  Object.keys(pending).forEach((key) => {
    const next = pending[key];
    if (key === '_current_assigned_to') {
      if (assigneeHasName(next)) merged[key] = next;
      return;
    }
    if (['_current_step'].includes(key)) {
      if (!isBlank(next)) merged[key] = next;
      return;
    }
    if (isBlank(next) && !isBlank(merged[key])) return;
    merged[key] = next;
  });
  assert.equal(merged[ticketTypeCol], 'Incident');
  assert.equal(merged[sourceCol], 'Email');
  assert.equal(merged._current_assigned_to[0].Name, 'Aasik');
  assert.equal(merged.Category, 'Hardware Incident');
  assert.equal(merged._current_step, 'IT Tech Reopen');
  assert.equal(getMisTicketTypeLabel({
    ticketType: 'Others',
    requestId: 'IT-IC-Refex-FY026-000169',
    raw: merged,
  }), 'Incident');
  assert.equal(getMisSourceLabel({
    source: merged[sourceCol],
    raw: { ...merged, Source: merged[sourceCol] },
  }), 'Email');
});

check('My Team Closed count stays > 0 when Head only last-touched approvals', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Arun Head' };
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const rows = [1, 2, 3].map((n) => {
    const row = mkReopenRow({
      id: `PkTeamClosedCount${n}`,
      withMyTask: false,
      assignee: employee,
      modifiedAt: '2026-08-18T12:00:00Z',
    });
    row.closedBy = agent.Name;
    row.completedBy = head.Name;
    row.modifiedBy = head.Name;
    row.closedAtRaw = '2026-08-18T12:00:00Z';
    row.modifiedAtRaw = '2026-08-18T12:00:00Z';
    row.itAgentActivities = [{
      id: `ActClose${n}`,
      status: 'Completed',
      actedAt: '2026-08-18T11:00:00Z',
      actedBy: agent.Name,
    }];
    return row;
  });
  const teamClosed = rows.filter((row) => (
    matchesRefexServiceTeamScope(row, head, { role: 'final' })
    && matchesRefexMonitoringServiceTab(row, 'Closed', head, 'team', 'final')
  ));
  assert.equal(teamClosed.length, 3, 'Team Closed KPI must count other closed tickets');
  const periodKept = applyDashboardDateRangeFilter(teamClosed, {
    from: '2026-08-01',
    to: '2026-08-31',
  });
  assert.equal(periodKept.length, 3);
});

check('Request type Other falls back to Incident from detail / sibling fields', () => {
  assert.equal(getMisTicketTypeLabel({ ticketType: 'Other', ticketTypeDetail: 'Incident' }), 'Incident');
  assert.equal(getMisTicketTypeLabel({ ticketType: 'Others', requestType: 'Service Request' }), 'Service Request');
  assert.equal(getMisTicketTypeLabel({ ticketType: 'Incident' }), 'Incident');
  assert.equal(getMisTicketTypeLabel({ ticketType: 'Other' }), 'Other');
  assert.equal(
    getMisTicketTypeLabel({ ticketType: 'Others', requestId: 'IT-IC-Refex-FY026-000169' }),
    'Incident',
  );
  assert.equal(
    getMisTicketTypeLabel({ ticketType: 'Others', requestId: 'IT-SR-Refex-FY026-000002' }),
    'Service Request',
  );
});

check('Head completedBy=modifiedBy does not steal Team Closed into Me', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Arun Head' };
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const closed = mkReopenRow({
    id: 'PkHeadStealClosed1',
    withMyTask: false,
    assignee: employee,
  });
  closed.closedBy = agent.Name;
  closed.completedBy = head.Name;
  closed.modifiedBy = head.Name;
  closed.itAgentActivities = [{
    id: 'ActAgentClose1',
    status: 'Completed',
    actedAt: '2026-08-10T10:00:00Z',
    actedBy: agent.Name,
  }];
  assert.equal(matchesRefexMeOnlyScope(closed, head, { role: 'final' }), false);
  assert.equal(matchesRefexServiceTeamScope(closed, head, { role: 'final' }), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(closed, 'Closed', head, 'team', 'final'),
    true,
  );
});

check('Period filter uses Closed Date for reopen/closed tickets', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const row = mkReopenRow({
    id: 'PkClosedPeriod1',
    withMyTask: false,
    assignee: employee,
    modifiedAt: '2026-08-18T10:00:00Z',
  });
  row.createdAtRaw = '2025-01-05T10:00:00Z';
  row.requestedDateTimeRaw = '2025-01-05T10:00:00Z';
  row.closedAtRaw = '2026-08-18T10:00:00Z';
  row.modifiedAtRaw = '2026-08-18T10:00:00Z';
  const kept = applyDashboardDateRangeFilter([row], { from: '2026-08-01', to: '2026-08-31' });
  assert.equal(kept.length, 1, 'closed this month must stay even when created last year');
});

check('Team Closed keeps other agents closed tickets; Me Closed is closed-by only', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const other = { _id: 'UsAgent2', Email: 'other@refex.co.in', Name: 'Other' };
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Arun Head' };

  const otherClosed = mkReopenRow({
    id: 'PkTeamClosedKeep1',
    withMyTask: false,
    assignee: employee,
  });
  otherClosed.completedBy = other.Name;
  otherClosed.closedBy = other.Name;
  otherClosed.itAgentActivities = [{
    id: 'ActOther1',
    status: 'Completed',
    actedAt: '2026-08-10T10:00:00Z',
    actedBy: other.Name,
  }];
  // Head only approved earlier — completedBy must not put this on Head Me.
  otherClosed.modifiedBy = head.Name;
  assert.equal(matchesRefexMeOnlyScope(otherClosed, head, { role: 'final' }), false);
  assert.equal(matchesRefexServiceTeamScope(otherClosed, head, { role: 'final' }), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(otherClosed, 'Closed', head, 'team', 'final'),
    true,
  );

  const mineClosed = {
    ...otherClosed,
    id: 'PkMeClosedKeep1',
    completedBy: agent.Name,
    closedBy: agent.Name,
    itAgentActivities: [{
      id: 'ActMine1',
      status: 'Completed',
      actedAt: '2026-08-10T11:00:00Z',
      actedBy: agent.Name,
    }],
  };
  assert.equal(matchesRefexMeOnlyScope(mineClosed, agent, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(mineClosed, agent, { role: 'agent' }), false);
  assert.equal(matchesRefexTechSupportTab(mineClosed, 'Closed', agent), true);
});

check('Today Open / Today Closed use Open/Closed matchers with today dates', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const todayIso = new Date().toISOString();
  const openToday = mkOpenTechRow({ id: 'PkTodayOpen1' });
  openToday.isLiveBucketPending = true;
  openToday.techSupportMyTaskItem = { _id: 'PkTodayOpen1', _current_step: 'IT Tech Support' };
  openToday.createdAtRaw = todayIso;
  openToday.requestedDateTimeRaw = todayIso;
  openToday.raw._created_at = todayIso;
  assert.equal(matchesRefexTechSupportTab(openToday, 'TodayOpen', agent), true);

  // Email / L1 tickets created today must appear on Team Today Open (not only IT Tech).
  const l1Today = {
    id: 'PkL1Today1',
    requestId: 'IT-IC-Refex-FY026-000169',
    status: 'InProgress',
    itemStatusRaw: 'Open',
    createdAtRaw: todayIso,
    requestedDateTimeRaw: todayIso,
    raw: {
      _id: 'PkL1Today1',
      _status: 'InProgress',
      _current_step: 'L1 Approval',
      _created_at: todayIso,
      Request_ID: 'IT-IC-Refex-FY026-000169',
    },
  };
  assert.equal(matchesRefexMonitoringServiceTab(l1Today, 'TodayOpen', agent, 'team'), true);
  assert.equal(matchesRefexTechSupportTab(l1Today, 'TodayOpen', agent), true);

  const closedToday = mkReopenRow({
    id: 'PkTodayClosed1',
    withMyTask: false,
    assignee: employee,
  });
  closedToday.completedBy = agent.Name;
  closedToday.closedBy = agent.Name;
  closedToday.closedAtRaw = todayIso;
  closedToday.modifiedAtRaw = todayIso;
  closedToday.itAgentActivities = [{
    id: 'ActToday1',
    status: 'Completed',
    actedAt: todayIso,
    actedBy: agent.Name,
  }];
  assert.equal(matchesRefexTechSupportTab(closedToday, 'TodayClosed', agent), true);
  // Closed by the agent → Me Today Closed; My Team is the full queue so it stays.
  assert.equal(
    matchesRefexMonitoringServiceTab(closedToday, 'TodayClosed', agent, 'me'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(closedToday, 'TodayClosed', agent, 'team'),
    true,
  );
  const peer = { _id: 'UPeer1', Email: 'peer@refex.co.in', Name: 'Peer Agent' };
  assert.equal(
    matchesRefexMonitoringServiceTab(closedToday, 'TodayClosed', peer, 'team'),
    true,
  );
});

check('Approver completedBy alone does not claim Me Closed on open tickets', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Arun Head' };
  const open = mkOpenTechRow({ id: 'PkHeadCompletedByOpen1' });
  open.completedBy = head.Name;
  open.modifiedBy = head.Name;
  assert.equal(isTicketClosedByUser(open, head), false);
  assert.equal(matchesRefexMeOnlyScope(open, head, { role: 'final' }), false);
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

check('Admin scope=all shows every approval pending (including personal Head)', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Head' };
  const personalHead = {
    id: 'PkHeadMine',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Head Approval',
    activeWorkflowStep: 'IT Head Approval',
    itemStatusRaw: 'Open',
    assignedToRaw: [{ Kind: 'User', _id: 'UsHead1', Email: 'head@refex.co.in' }],
    liveApprovalPendingKnown: true,
    isLiveApprovalPending: true,
  };
  const l1Other = {
    id: 'PkL1Other',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'L1 Approval',
    activeWorkflowStep: 'L1 Approval',
    itemStatusRaw: 'Open',
    assignedToRaw: [{ Kind: 'User', Email: 'other@refex.co.in' }],
    liveApprovalPendingKnown: true,
    isLiveApprovalPending: false,
  };
  assert.equal(matchesRefexApproverPendingTaskRow(personalHead, head, 'all', 'final'), true);
  assert.equal(matchesRefexApproverPendingTaskRow(l1Other, head, 'all', 'final'), true);
  assert.equal(matchesRefexApproverPendingTaskRow(l1Other, head, 'me', 'final'), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(
      { id: 'PkClosedMine', status: 'Completed', systemStatus: 'Completed', itemStatusRaw: 'Closed', closedBy: head },
      'Closed',
      head,
      'all',
      'final',
    ),
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

check('My Team Pending Approval keeps only the current approval step', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Head' };
  const manager = { _id: 'UsMgr1', Email: 'manager@refex.co.in', Name: 'Manager' };
  const l1Col = REFEX_PROFILE.serviceCol.l1ApprovalActivity;
  const movedOn = {
    id: 'PkMovedOffL1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech Support',
    activeWorkflowStep: 'IT Tech Support',
    itemStatusRaw: 'Open',
    lastCompletedStep: 'L1 Approval',
    raw: {
      _id: 'PkMovedOffL1',
      _status: 'InProgress',
      _activity_id: 'Activity_oghxnzOkyH',
      [currentStepCol]: 'IT Tech Support',
      [l1Col]: [{ _id: 'ActOldL1', Status: 'InProgress' }],
    },
  };
  assert.equal(matchesRefexApproverPendingTaskRow(movedOn, head, 'team', 'final'), false);
  assert.equal(matchesRefexApproverPendingTaskRow(movedOn, manager, 'team', 'first'), false);
  assert.equal(matchesRefexMonitoringServiceTab(movedOn, 'PendingTask', head, 'team', 'final'), false);

  const bareManagerStep = {
    id: 'PkBareManager',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Manager',
    raw: { _id: 'PkBareManager', _status: 'InProgress', [currentStepCol]: 'IT Manager' },
  };
  assert.equal(matchesRefexApproverPendingTaskRow(bareManagerStep, manager, 'team', 'first'), false);

  const headStep = {
    id: 'PkHeadStep',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Head Approval',
    raw: { _id: 'PkHeadStep', _status: 'InProgress', [currentStepCol]: 'IT Head Approval' },
  };
  assert.equal(matchesRefexApproverPendingTaskRow(headStep, head, 'team', 'final'), true);
  assert.equal(matchesRefexApproverPendingTaskRow(headStep, manager, 'team', 'first'), false);
  assert.equal(matchesRefexApproverPendingTaskRow(headStep, head, 'me', 'final'), false);
  assert.equal(matchesRefexApproverPendingTaskRow(movedOn, head, 'all', 'final'), false);
  const l1Now = {
    id: 'PkL1Now',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'L1 Approval',
    raw: { _id: 'PkL1Now', _status: 'InProgress', [currentStepCol]: 'L1 Approval' },
  };
  assert.equal(matchesRefexApproverPendingTaskRow(l1Now, head, 'all', 'final'), true);
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
  // Undated open stays visible only when the selected period includes today.
  const today = new Date();
  const toToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const keptUndatedCurrent = applyDashboardDateRangeFilter(
    [undatedOpen],
    { from: '2026-04-01', to: toToday },
  );
  assert.equal(keptUndatedCurrent.length, 1, 'undated live email ticket must stay in current FY');
});

check('Past FY does not inherit undated open or current-year tickets', () => {
  setITDashboardProfile(REFEX_PROFILE);
  assert.equal(
    dashboardDateRangeIncludesToday({ from: '2025-04-01', to: '2026-03-31' }, new Date('2026-08-21T12:00:00+05:30')),
    false,
  );
  assert.equal(
    dashboardDateRangeIncludesToday({ from: '2026-04-01', to: '2026-08-21' }, new Date('2026-08-21T12:00:00+05:30')),
    true,
  );

  const undatedOpen = {
    id: 'PkUndatedPastFy',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech Support',
    itemStatusRaw: 'Open',
    raw: { _id: 'PkUndatedPastFy', _status: 'InProgress' },
  };
  const currentOpen = {
    id: 'PkCurrentOpenPastFy',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech Support',
    itemStatusRaw: 'Open',
    createdAtRaw: '2026-08-10T10:00:00Z',
    requestedDateTimeRaw: '2026-08-10T10:00:00Z',
    raw: {
      _id: 'PkCurrentOpenPastFy',
      _status: 'InProgress',
      _created_at: '2026-08-10T10:00:00Z',
    },
  };
  const pastFyClosed = {
    id: 'PkPastFyClosed',
    status: 'Completed',
    systemStatus: 'Completed',
    itemStatusRaw: 'Closed',
    createdAtRaw: '2025-06-01T10:00:00Z',
    closedAtRaw: '2025-07-15T10:00:00Z',
    raw: {
      _id: 'PkPastFyClosed',
      _status: 'Completed',
      _created_at: '2025-06-01T10:00:00Z',
      _modified_at: '2025-07-15T10:00:00Z',
    },
  };
  const pastRange = { from: '2025-04-01', to: '2026-03-31' };
  assert.equal(applyDashboardDateRangeFilter([undatedOpen], pastRange).length, 0);
  assert.equal(applyDashboardDateRangeFilter([currentOpen], pastRange).length, 0);
  assert.equal(applyDashboardDateRangeFilter([pastFyClosed], pastRange).length, 1);
});

check('Participated-only tickets stay off Me Closed / Rejected', () => {
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
    false,
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
    false,
  );

  const rejectedByHead = {
    ...rejectedParticipated,
    id: 'PkPartRej2',
    modifiedBy: head,
    raw: { _id: 'PkPartRej2', _status: 'Rejected', _modified_by: head },
  };
  assert.equal(
    matchesRefexMonitoringServiceTab(rejectedByHead, 'Rejected', head, 'me', 'final'),
    true,
  );
});

check('Manager/Head Me Closed includes live-bucket Reopen only (not ActedBy history)', () => {
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
  // ActedBy-only history is not Me Closed.
  assert.equal(matchesRefexMeOnlyScope(managerApprovedReopen, manager, { role: 'first' }), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(managerApprovedReopen, 'Closed', manager, 'me', 'first'),
    false,
  );
  assert.equal(matchesRefexServiceTeamScope(managerApprovedReopen, manager, { role: 'first' }), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(managerApprovedReopen, 'Closed', otherMgr, 'team', 'first'),
    true,
  );

  const liveBucketReopen = mkReopenRow({
    id: 'PkMgrLiveBucketReopen1',
    withMyTask: true,
    assignee: manager,
  });
  liveBucketReopen.liveReopenPendingKnown = true;
  liveBucketReopen.isLiveReopenPending = true;
  liveBucketReopen.isLiveBucketPending = true;
  assert.equal(matchesRefexMeOnlyScope(liveBucketReopen, manager, { role: 'first' }), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(liveBucketReopen, 'Closed', manager, 'me', 'first'),
    true,
  );
  assert.equal(matchesRefexServiceTeamScope(liveBucketReopen, manager, { role: 'first' }), false);

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
  assert.equal(matchesRefexMeOnlyScope(headApprovedReopen, head, { role: 'final' }), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(headApprovedReopen, 'Closed', head, 'me', 'final'),
    false,
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

check('IT Tech Reopen only on Me when live in user bucket (not AppRole alone)', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const manager = { _id: 'UsMgr1', Email: 'mgr@refex.co.in', Name: 'Priya Manager' };
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Arun Head' };

  const managerRoleReopen = mkReopenRow({
    id: 'PkMgrRoleReopen1',
    withMyTask: false,
    assignee: employee,
  });
  managerRoleReopen.assignedToRaw = [{ Kind: 'AppRole', Name: 'IT Manager' }];
  managerRoleReopen.raw._current_assigned_to = managerRoleReopen.assignedToRaw;

  assert.equal(isRefexServiceClosedTicket(managerRoleReopen), true);
  assert.equal(matchesRefexApproverPendingTaskRow(managerRoleReopen, manager, 'me', 'first'), false);
  // AppRole alone does not create Me Reopen.
  assert.equal(matchesRefexApproverReopenClosedRow(managerRoleReopen, manager, 'first'), false);
  assert.equal(matchesRefexMeOnlyScope(managerRoleReopen, manager, { role: 'first' }), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(managerRoleReopen, 'Closed', manager, 'me', 'first'),
    false,
  );
  assert.equal(matchesRefexServiceTeamScope(managerRoleReopen, manager, { role: 'first' }), true);

  const livePendingReopen = mkReopenRow({
    id: 'PkLiveReopenPending1',
    withMyTask: true,
    assignee: manager,
  });
  // AppRole assignees still in Head/Manager live pending bucket → Me (Q1 his bucket).
  livePendingReopen.assignedToRaw = [{ Kind: 'AppRole', Name: 'IT Manager' }, { Kind: 'AppRole', Name: 'IT Head' }];
  livePendingReopen.raw._current_assigned_to = livePendingReopen.assignedToRaw;
  if (livePendingReopen.techSupportMyTaskItem) {
    livePendingReopen.techSupportMyTaskItem = {
      ...livePendingReopen.techSupportMyTaskItem,
      _current_assigned_to: livePendingReopen.assignedToRaw,
    };
  }
  livePendingReopen.techSupportTaskOwnedByUser = false;
  livePendingReopen.liveReopenPendingKnown = true;
  livePendingReopen.isLiveReopenPending = true;
  livePendingReopen.isLiveBucketPending = true;
  assert.equal(matchesRefexApproverReopenClosedRow(livePendingReopen, manager, 'first'), true);
  assert.equal(matchesRefexApproverReopenClosedRow(livePendingReopen, head, 'final'), true);
  // Live in Manager/Head pending bucket → Me (Q1), even when assignee is AppRole.
  assert.equal(matchesRefexMeOnlyScope(livePendingReopen, manager, { role: 'first' }), true);
  assert.equal(matchesRefexServiceTeamScope(livePendingReopen, manager, { role: 'first' }), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(livePendingReopen, 'Closed', manager, 'me', 'first'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(livePendingReopen, 'Closed', manager, 'team', 'first'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(livePendingReopen, 'PendingTask', head, 'me', 'final'),
    false,
  );
  assert.equal(getRefexTechReopenMisDisplay(livePendingReopen).primary, 'Reopen window');

  // Personally assigned live reopen stays on Me.
  const personalLiveReopen = mkReopenRow({
    id: 'PkPersonalLiveReopen1',
    withMyTask: true,
    assignee: manager,
  });
  personalLiveReopen.liveReopenPendingKnown = true;
  personalLiveReopen.isLiveReopenPending = true;
  personalLiveReopen.isLiveBucketPending = true;
  assert.equal(matchesRefexMeOnlyScope(personalLiveReopen, manager, { role: 'first' }), true);
  assert.equal(matchesRefexServiceTeamScope(personalLiveReopen, manager, { role: 'first' }), false);

  const leftReopenQueue = {
    ...livePendingReopen,
    id: 'PkLeftReopenQueue1',
    isLiveReopenPending: false,
    isLiveBucketPending: false,
    techSupportMyTaskItem: null,
    liveReopenPendingKnown: true,
  };
  assert.equal(matchesRefexApproverReopenClosedRow(leftReopenQueue, manager, 'first'), false);
});

check('Manager/Head My Team shows all other tasks except personal Me work', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const manager = { _id: 'UsMgr1', Email: 'mgr@refex.co.in', Name: 'Priya Manager' };
  const otherAgent = { _id: 'UsAgent2', Email: 'other@refex.co.in', Name: 'Other' };
  const managerCol = REFEX_PROFILE.serviceCol.itManagerApprovalActivity;

  const personallyApproved = mkReopenRow({
    id: 'PkMgrPersonalClosed1',
    withMyTask: false,
    assignee: employee,
  });
  personallyApproved.raw[managerCol] = [{
    _id: 'ActMgrDoneTeam1',
    Status: 'Completed',
    ActedBy: [manager],
  }];
  // ActedBy-only is Team, not Me.
  assert.equal(matchesRefexMeOnlyScope(personallyApproved, manager, { role: 'first' }), false);
  assert.equal(matchesRefexServiceTeamScope(personallyApproved, manager, { role: 'first' }), true);

  const otherOpen = mkOpenTechRow({ id: 'PkTeamOtherOpen1' });
  otherOpen.assignedToRaw = [otherAgent];
  otherOpen.techSupportMyTaskItem = null;
  otherOpen.techSupportTaskOwnedByUser = false;
  otherOpen.raw._current_assigned_to = [otherAgent];
  assert.equal(matchesRefexMeOnlyScope(otherOpen, manager, { role: 'first' }), false);
  assert.equal(matchesRefexServiceTeamScope(otherOpen, manager, { role: 'first' }), true);

  const otherClosed = mkReopenRow({
    id: 'PkTeamOtherClosed1',
    withMyTask: false,
    assignee: employee,
  });
  assert.equal(matchesRefexMeOnlyScope(otherClosed, manager, { role: 'first' }), false);
  assert.equal(matchesRefexServiceTeamScope(otherClosed, manager, { role: 'first' }), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(otherClosed, 'Closed', manager, 'team', 'first'),
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

check('reopen MIS SLA shows last Solution status, not a live Reopen window', () => {
  const fresh = mkReopenRow({ modifiedAt: new Date().toISOString() });
  assert.notEqual(getMisSlaFilterState(fresh), 'reopen');
  assert.notEqual(getRefexServiceSlaMisDisplay(fresh).primary, 'Reopen window');

  const expired = mkReopenRow({
    modifiedAt: new Date(Date.now() - (IT_TECH_REOPEN_WINDOW_MS + 60_000)).toISOString(),
  });
  assert.notEqual(getMisSlaFilterState(expired), 'reopen');
});

check('SLA filter options do not treat Reopen as a live SLA state', () => {
  const reopenRows = [mkReopenRow()];
  const opts = getMisSlaFilterOptionsForRows(reopenRows);
  assert.equal(opts.some((o) => o.value === 'reopen'), false);
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
            ProcessName: 'Stub Branch',
            Steps: [
              {
                Name: 'L1 Approval',
                _status: 'Completed',
                ActedAt: '2026-01-01T11:00:00Z',
                ActedBy: { Name: 'Mgr' },
              },
            ],
          },
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
  assert.ok(parsed.journey.some((n) => n.label === 'Tech Support'));
  assert.equal(
    parsed.journey.filter((n) => n.type === 'step').slice(-1)[0]?.label,
    'Tech Support',
  );
});

check('assigned to hides ITSM Bot and keeps the human', () => {
  assert.equal(
    getAssignedToDisplay({
      assignedTo: 'ITSM Bot, Vishnu',
      currentStep: 'IT Agent Solution',
      status: 'Open',
    }),
    'Vishnu',
  );
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

check('collectConversationEntries uses exact IT__Agent_Solution table Name', async () => {
  const { collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  const entries = collectConversationEntries({
    solution: 'Should not replace table rows',
    itAgentSolution: 'Should not replace table rows',
    agentSolutions: [
      {
        id: 'sol1',
        recordId: 'sol1',
        resolution: 'Reset password',
        agentName: 'Nagesh Boyina',
        dateTime: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'sol2',
        recordId: 'sol2',
        resolution: 'Installed VPN',
        agentName: 'agent@refex.co.in',
        dateTime: '2026-09-02T10:00:00.000Z',
      },
      {
        id: 'it-agent-solution-text',
        recordId: 'it-agent-solution-text',
        resolution: 'Installed VPN',
        agentName: '',
      },
    ],
    assignedToDisplay: 'Nagesh Boyina',
    modifiedBy: { Name: 'Nagesh Boyina', Email: 'nagesh@refex.co.in' },
  });
  assert.equal(entries.filter((e) => e.role === 'itAgent').length, 2);
  const first = entries.find((e) => e.comment === 'Reset password');
  const second = entries.find((e) => e.comment === 'Installed VPN');
  assert.equal(first?.userName, 'Nagesh Boyina');
  // Exact table Name — even when email-shaped.
  assert.equal(second?.userName, 'agent@refex.co.in');
});

check('collectConversationEntries keeps exact table Name; empty Name uses modifiedBy', async () => {
  const { collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  const withTableName = collectConversationEntries({
    agentSolutions: [
      {
        id: 'sol1',
        recordId: 'sol1',
        resolution: 'Fixed printer',
        agentName: 'Employee',
        dateTime: '2026-09-03T12:00:00.000Z',
      },
    ],
    progressTechActors: [
      {
        userName: 'Priya Agent',
        dateTime: '2026-09-03T12:00:00.000Z',
        timestamp: Date.parse('2026-09-03T12:00:00.000Z'),
      },
    ],
  });
  assert.equal(withTableName[0]?.userName, 'Employee');

  const emptyName = collectConversationEntries({
    agentSolutions: [
      {
        id: 'sol2',
        recordId: 'sol2',
        resolution: 'ffff',
        agentName: '',
        modifiedBy: { Name: 'asik' },
        dateTime: '2026-09-08T10:55:41.000Z',
      },
    ],
  });
  assert.equal(emptyName[0]?.userName, 'asik');
});

check('collectConversationEntries keeps all table rows and drops progress/text duplicates', async () => {
  const { collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  const entries = collectConversationEntries({
    agentSolutions: [
      {
        id: 'a1',
        recordId: 'a1',
        resolution: 'First fix',
        agentName: 'Asik',
        dateTime: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'a2',
        recordId: 'a2',
        resolution: 'Second fix',
        agentName: 'Asik',
        dateTime: '2026-09-02T10:00:00.000Z',
      },
      {
        id: 'a3',
        recordId: 'a3',
        resolution: 'Third fix',
        agentName: 'Asik',
        dateTime: '2026-09-03T10:00:00.000Z',
      },
      {
        id: 'it-agent-solution-text',
        recordId: 'it-agent-solution-text',
        resolution: 'Third fix',
      },
      {
        id: 'progress-agent-note-0',
        recordId: 'progress-agent-note-0',
        resolution: 'First fix',
        agentName: 'Asik',
        dateTime: '2026-09-01T10:00:00.000Z',
      },
    ],
  });
  const agent = entries.filter((e) => e.role === 'itAgent');
  assert.equal(agent.length, 3);
  assert.deepEqual(agent.map((e) => e.comment), ['First fix', 'Second fix', 'Third fix']);
});

check('collectConversationEntries drops same-minute duplicate table rows', async () => {
  const { collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  const entries = collectConversationEntries({
    agentSolutions: [
      {
        id: 'row-a',
        recordId: 'row-a',
        resolution: 'Thanks, this helped.',
        agentName: 'Asik',
        dateTime: '2026-10-07T10:00:10.000Z',
      },
      {
        id: 'row-b',
        recordId: 'row-b',
        resolution: 'Thanks, this helped.',
        agentName: 'Asik',
        dateTime: '2026-10-07T10:00:40.000Z',
      },
    ],
  });
  const agent = entries.filter((e) => e.role === 'itAgent');
  assert.equal(agent.length, 1);
  assert.equal(agent[0].comment, 'Thanks, this helped.');
});

check('collectConversationEntries shows agent + employee notes sorted by time without duplicates', async () => {
  const { collectConversationEntries, mergeAgentSolutionLists } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  const merged = mergeAgentSolutionLists(
    [{ id: 'a1', recordId: 'a1', resolution: 'VPN fixed', agentName: 'Asik', dateTime: '2026-09-01T09:00:00.000Z' }],
    [
      { id: 'a1', recordId: 'a1', resolution: 'VPN fixed', agentName: 'Asik', dateTime: '2026-09-01T09:00:00.000Z' },
      { id: 'a2', recordId: 'a2', resolution: 'Laptop reimaged', agentName: 'Nagesh', dateTime: '2026-09-01T11:00:00.000Z' },
    ],
  );
  assert.equal(merged.length, 2);

  const entries = collectConversationEntries({
    agentSolutions: [
      ...merged,
      { id: 'it-agent-solution-text', recordId: 'it-agent-solution-text', resolution: 'VPN fixed' },
    ],
    employeeConfirmations: [
      {
        id: 'e1',
        recordId: 'e1',
        comments: 'Thanks, working now',
        dateTime: '2026-09-01T12:00:00.000Z',
        userName: 'Requester',
      },
      {
        id: 'e2',
        recordId: 'e2',
        comments: 'VPN fixed',
        dateTime: '2026-09-01T09:05:00.000Z',
      },
    ],
    requesterName: 'Requester',
  });
  assert.equal(entries.filter((e) => e.role === 'itAgent').length, 2);
  // Duplicate employee copy of agent table text is dropped.
  assert.equal(entries.filter((e) => e.role === 'employee').length, 1);
  assert.deepEqual(entries.map((e) => e.comment), [
    'VPN fixed',
    'Laptop reimaged',
    'Thanks, working now',
  ]);
});

check('Extrovis empty Column_* table does not block IT__Agent_Solution nested rows', async () => {
  const { setITDashboardProfile } = await import('../src/lib/kfITServiceDashboard.js');
  const { EXTROVIS_PROFILE } = await import('../src/lib/itDashboardProfiles.js');
  const { mapRefexEmployeeRow } = await import(
    '../src/itsm/refex/employeedashboard/mapRefexEmployeeRow.js'
  );
  const { getTableAgentSolutions } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  setITDashboardProfile(EXTROVIS_PROFILE);
  const tableCol = EXTROVIS_PROFILE.employeeCol.itAgentSolutionTable;
  const resCol = EXTROVIS_PROFILE.employeeTableCol.itAgentSolutionResolution;
  const nameCol = EXTROVIS_PROFILE.employeeTableCol.itAgentSolutionName;
  const mapped = mapRefexEmployeeRow({
    _id: 'PkExtTest1',
    [tableCol]: [],
    It_Agent_Solution: 'Latest textarea only',
    IT__Agent_Solution: [
      { _id: 'r1', [resCol]: 'First note', [nameCol]: 'Asik' },
      { _id: 'r2', [resCol]: 'Second note', [nameCol]: 'Asik' },
    ],
  });
  const table = getTableAgentSolutions(mapped.agentSolutions);
  assert.equal(table.length, 2);
  assert.deepEqual(table.map((e) => e.resolution), ['First note', 'Second note']);
});

check('Instance GET Table::IT__Agent_Solution prefix maps comments for UI refresh', async () => {
  const { setITDashboardProfile } = await import('../src/lib/kfITServiceDashboard.js');
  const { EXTROVIS_PROFILE } = await import('../src/lib/itDashboardProfiles.js');
  const { mapRefexEmployeeRow } = await import(
    '../src/itsm/refex/employeedashboard/mapRefexEmployeeRow.js'
  );
  const { getTableAgentSolutions, collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  setITDashboardProfile(EXTROVIS_PROFILE);
  const mapped = mapRefexEmployeeRow({
    _id: 'PkE9dH3clUku',
    Column_qr_9gP_vE5: [],
    It_Agent_Solution: 'Test Compketedmte agemt',
    'Table::IT__Agent_Solution': [
      {
        _id: 'IT__Agent_Solution_d7ee849499',
        Resolution: 'ffff',
        ITAgentDate_Time: '2026-09-08T10:55:41Z',
        Name_1: 'Test Automate',
        _created_by: { Name: 'asik' },
      },
    ],
  });
  const table = getTableAgentSolutions(mapped.agentSolutions);
  assert.equal(table.some((e) => e.resolution === 'ffff'), true);
  const entries = collectConversationEntries(mapped);
  assert.equal(entries.some((e) => e.comment === 'ffff'), true);
});

check('Chat refresh keeps every Table::IT__Agent_Solution row, including repeated text', async () => {
  const { setITDashboardProfile } = await import('../src/lib/kfITServiceDashboard.js');
  const { EXTROVIS_PROFILE } = await import('../src/lib/itDashboardProfiles.js');
  const { mapRefexEmployeeRow } = await import(
    '../src/itsm/refex/employeedashboard/mapRefexEmployeeRow.js'
  );
  const { getTableAgentSolutions, collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  setITDashboardProfile(EXTROVIS_PROFILE);
  const tableRows = [
    {
      _id: 'IT__Agent_Solution_e1fda58144',
      Resolution: 'check that perfectly worked or not',
      ITAgentDate_Time: '2026-09-08T12:04:18Z',
      Name_1: 'asik',
    },
    {
      _id: 'IT__Agent_Solution_b7a40620a3',
      Resolution: 'Could you please share an update?',
      ITAgentDate_Time: '2026-09-08T12:04:33Z',
      Name_1: 'Test Automate',
    },
    {
      _id: 'IT__Agent_Solution_c621308207',
      Resolution: 'yes what kind of update u need',
      ITAgentDate_Time: '2026-09-08T12:19:46Z',
      Name_1: 'asik',
    },
    {
      _id: 'IT__Agent_Solution_4896c95819',
      Resolution: 'This is still not resolved. Please check again.',
      ITAgentDate_Time: '2026-09-08T12:24:51Z',
      Name_1: 'Test Automate',
    },
    {
      _id: 'IT__Agent_Solution_11d1094128',
      Resolution: 'This is still not resolved. Please check again.',
      ITAgentDate_Time: '2026-09-08T11:38:14Z',
      Name_1: 'Test Automate',
    },
    {
      _id: 'IT__Agent_Solution_ab3a754fe5',
      Resolution: 'let check it out',
      ITAgentDate_Time: '2026-09-08T12:26:23Z',
      Name_1: 'asik',
    },
    {
      _id: 'IT__Agent_Solution_d1cae7c4fb',
      Resolution: 'why what happen',
      ITAgentDate_Time: '2026-09-08T12:29:23Z',
      Name_1: 'asik',
    },
    {
      _id: 'IT__Agent_Solution_85180bc842',
      Resolution: 'Could you please share an update?',
      ITAgentDate_Time: '2026-09-08T12:29:46Z',
      Name_1: 'Test Automate',
    },
  ];
  const mapped = mapRefexEmployeeRow({
    _id: 'PkE9dH3clUku',
    Request_ID: 'IT-SR-Extrovis-FY026-0007',
    // Truncated Column_* must not hide the full Table:: payload.
    Column_qr_9gP_vE5: tableRows.slice(-3),
    It_Agent_Solution: 'Test Compketedmte agemt',
    'Table::IT__Agent_Solution': tableRows,
  });
  const table = getTableAgentSolutions(mapped.agentSolutions);
  assert.equal(table.length, 8);
  const entries = collectConversationEntries({ agentSolutions: table });
  const comments = entries.map((entry) => entry.comment);
  assert.equal(comments.filter((text) => text === 'Could you please share an update?').length, 2);
  assert.equal(comments.filter((text) => text === 'This is still not resolved. Please check again.').length, 2);
  assert.equal(comments.includes('check that perfectly worked or not'), true);
  assert.equal(comments.includes('yes what kind of update u need'), true);
  assert.equal(comments.includes('let check it out'), true);
  assert.equal(comments.includes('why what happen'), true);
  assert.equal(entries.length, 8);
});

check('Extrovis chat does not treat datetime or sentence as fake User comments/files', async () => {
  const { setITDashboardProfile } = await import('../src/lib/kfITServiceDashboard.js');
  const { EXTROVIS_PROFILE } = await import('../src/lib/itDashboardProfiles.js');
  const { mapRefexEmployeeRow } = await import(
    '../src/itsm/refex/employeedashboard/mapRefexEmployeeRow.js'
  );
  const { getTableAgentSolutions, collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  const { commentMatchesChannel, COMMENT_CHANNEL_USER } = await import(
    '../src/itsm/refex/employeedashboard/commentChannel.js'
  );
  setITDashboardProfile(EXTROVIS_PROFILE);
  const mapped = mapRefexEmployeeRow({
    _id: 'PkEHIe0asVg_',
    'Table::IT__Agent_Solution': [
      {
        _id: 'IT__Agent_Solution_19effac940',
        Name_1: 'Syed Ajju',
        Resolution: 'Thanks, this helped.',
        Comments_2: 'User',
        Stages_1: 'InProgress',
        Column_R_u4Nyl5q_: '2026-10-07T06:33:28Z',
        ITAgentDate_Time: '2026-10-07T06:33:28Z',
      },
      {
        _id: 'IT__Agent_Solution_blank_dt',
        Name_1: 'Vishnu Gullapally',
        Resolution: '',
        Comments_2: 'User',
        Stages_1: 'InProgress',
        Column_R_u4Nyl5q_: '2026-10-07T06:33:28Z',
      },
      {
        _id: 'IT__Agent_Solution_27fa70c39d',
        Name_1: 'Vishnu Gullapally',
        Resolution: 'iii',
        Comments_2: 'User',
        Attachments: [{
          id: 'Attach_JbSpXTo6WK',
          name: 'Screenshot 2026-10-06 at 3.18.19 PM.png',
          key: 'Live_IT_Service_Request_Extrovis_A00/PkEHIe0asVg_/PkEHJhNP0ytT/IT__Agent_Solution/IT__Agent_Solution_27fa70c39d/Attach_JbSpXTo6WK/shot.png',
        }],
      },
    ],
  });
  const table = getTableAgentSolutions(mapped.agentSolutions);
  const comments = table.map((row) => row.resolution);
  assert.equal(comments.includes('Thanks, this helped.'), true);
  assert.equal(comments.includes('2026-10-07T06:33:28Z'), false);
  assert.equal(comments.includes('InProgress'), false);
  const thanks = table.find((row) => row.resolution === 'Thanks, this helped.');
  assert.equal((thanks?.attachments || []).length, 0);
  const withFile = table.find((row) => row.resolution === 'iii');
  assert.equal(withFile?.attachments?.[0]?.id, 'Attach_JbSpXTo6WK');
  const entries = collectConversationEntries(mapped).filter((entry) => (
    commentMatchesChannel(entry, COMMENT_CHANNEL_USER)
  ));
  assert.equal(entries.some((entry) => entry.comment === '2026-10-07T06:33:28Z'), false);
  assert.equal(entries.some((entry) => entry.comment === 'Thanks, this helped.' && !(entry.attachments || []).length), true);
});

check('Extrovis refresh keeps every User text and file from admin Table::', async () => {
  const { setITDashboardProfile } = await import('../src/lib/kfITServiceDashboard.js');
  const { EXTROVIS_PROFILE } = await import('../src/lib/itDashboardProfiles.js');
  const { mapRefexEmployeeRow } = await import(
    '../src/itsm/refex/employeedashboard/mapRefexEmployeeRow.js'
  );
  const { getTableAgentSolutions, collectConversationEntries, mergeAgentSolutionLists } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  setITDashboardProfile(EXTROVIS_PROFILE);
  const shot = (id, key) => ([{
    id,
    name: `${id}.png`,
    key: `Live_IT_Service_Request_Extrovis_A00/PkEHIe0asVg_/PkEHJhNP0ytT/IT__Agent_Solution/${key}/${id}/shot.png`,
    fileExtension: 'png',
    mimeType: 'image/png',
    photos: [{ key: `Live_IT_Service_Request_Extrovis_A00/PkEHIe0asVg_/PkEHJhNP0ytT/IT__Agent_Solution/${key}/${id}/shot.png` }],
  }]);
  const adminRows = [
    { _id: 'IT__Agent_Solution_66e0c7fb46', _created_at: '2026-09-29T06:54:15Z', Name_1: 'Vishnu Gullapally', Resolution: 'Please provide the remote access.', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_a22e980917', _created_at: '2026-09-29T06:55:06Z', Name_1: 'Syed Ajju', Resolution: 'Sure, I will do that', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'PkEHItb5To8A', _created_at: '2026-09-29T06:55:47Z', Name_1: 'Vishnu Gullapally', Resolution: 'Resolved', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_e9e3b23a13', _created_at: '2026-09-29T07:11:28Z', Name_1: 'Vishnu Gullapally', Resolution: 'Sure, I will get back to you', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'PkEHJhREybTa', _created_at: '2026-09-29T07:46:17Z', Name_1: 'Vishnu Gullapally', Resolution: 'Resolved', Comments_2: 'User', Stages_1: 'Pending with Vendor', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_035b793cae', _created_at: '2026-10-07T06:22:28Z', Name_1: 'Vishnu Gullapally', Resolution: 'Need update', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_19effac940', _created_at: '2026-10-07T06:23:03Z', Name_1: 'Syed Ajju', Resolution: 'Thanks, this helped.', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_c54c2eaee0', _created_at: '2026-10-07T06:23:27Z', Name_1: 'Syed Ajju', Resolution: 'This is still not resolved. Please check again.', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_1c6b3fe132', _created_at: '2026-10-07T06:23:52Z', Name_1: 'Syed Ajju', Resolution: 'uuuuu', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_27fa70c39d', _created_at: '2026-10-07T06:24:15Z', Name_1: 'Vishnu Gullapally', Resolution: 'iii', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z', Attachments: shot('Attach_JbSpXTo6WK', 'IT__Agent_Solution_27fa70c39d') },
    { _id: 'IT__Agent_Solution_5b38e8b6f2', _created_at: '2026-10-07T06:24:42Z', Name_1: 'Syed Ajju', Resolution: 'ooo', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z', Attachments: shot('Attach_0d14ab5397', 'IT__Agent_Solution_5b38e8b6f2') },
    { _id: 'IT__Agent_Solution_b4cdc07a3a', _created_at: '2026-10-07T06:43:47Z', Name_1: 'Vishnu Gullapally', Resolution: 'ijok', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_537c2c6474', _created_at: '2026-10-07T06:44:06Z', Name_1: 'Syed Ajju', Resolution: 'sdsd', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z' },
    { _id: 'IT__Agent_Solution_e02b47e4ff', _created_at: '2026-10-07T06:44:24Z', Name_1: 'Syed Ajju', Resolution: 'kk', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:24Z', Attachments: shot('Attach_52ef222655', 'IT__Agent_Solution_e02b47e4ff') },
    { _id: 'IT__Agent_Solution_351344c5c7', _created_at: '2026-10-07T06:44:30Z', Name_1: 'Vishnu Gullapally', Resolution: 'iii', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:30Z' },
    { _id: 'IT__Agent_Solution_c89fbf80f7', _created_at: '2026-10-07T06:44:46Z', Name_1: 'Vishnu Gullapally', Resolution: 'kkk', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:44:46Z' },
    { _id: 'IT__Agent_Solution_048df60129', _created_at: '2026-10-07T06:45:00Z', Name_1: 'Vishnu Gullapally', Resolution: 'kdsksdk', Comments_2: 'User', Stages_1: 'InProgress', ITAgentDate_Time: '2026-10-07T06:45:00Z', Attachments: shot('Attach_4TvHjUaLMK', 'IT__Agent_Solution_048df60129') },
  ];
  const activityRows = adminRows.map((row) => {
    const copy = { ...row };
    delete copy.Attachments;
    return copy;
  });
  const seed = mapRefexEmployeeRow({
    _id: 'PkEHIe0asVg_',
    Column_qr_9gP_vE5: activityRows,
  });
  const refreshed = mapRefexEmployeeRow({
    _id: 'PkEHIe0asVg_',
    'Table::IT__Agent_Solution': adminRows,
  });
  const merged = mergeAgentSolutionLists(
    getTableAgentSolutions(seed.agentSolutions),
    getTableAgentSolutions(refreshed.agentSolutions),
  );
  const entries = collectConversationEntries({ agentSolutions: merged });
  assert.equal(entries.length, 17);
  assert.equal(entries.filter((entry) => entry.comment === 'iii').length, 2);
  assert.equal(entries.filter((entry) => entry.comment === 'Resolved').length, 2);
  const iiiWithFile = entries.find((entry) => (
    entry.comment === 'iii' && entry.recordId === 'IT__Agent_Solution_27fa70c39d'
  ));
  assert.equal(iiiWithFile?.attachments?.[0]?.id, 'Attach_JbSpXTo6WK');
  assert.equal(entries.filter((entry) => (entry.attachments || []).length).length, 4);
  assert.deepEqual(
    entries.filter((entry) => (entry.attachments || []).length).map((entry) => entry.comment).sort(),
    ['iii', 'kdsksdk', 'kk', 'ooo'],
  );
});

check('Shorter attachment table does not drop other User comments', async () => {
  const { setITDashboardProfile } = await import('../src/lib/kfITServiceDashboard.js');
  const { EXTROVIS_PROFILE } = await import('../src/lib/itDashboardProfiles.js');
  const { mapRefexEmployeeRow } = await import(
    '../src/itsm/refex/employeedashboard/mapRefexEmployeeRow.js'
  );
  const { getTableAgentSolutions, collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  const { commentMatchesChannel, COMMENT_CHANNEL_USER } = await import(
    '../src/itsm/refex/employeedashboard/commentChannel.js'
  );
  setITDashboardProfile(EXTROVIS_PROFILE);
  const mapped = mapRefexEmployeeRow({
    _id: 'PkUserCommentsMerge',
    Column_qr_9gP_vE5: [
      { Name_1: 'Vishnu', Resolution: 'hi how r u', Comments_2: 'User' },
      { Name_1: 'Aasik', Resolution: 'ya fine', Comments_2: 'User Comments' },
      { Name_1: 'Aasik', Resolution: 'i have attached the screenshot', Comments_2: 'User' },
      { Name_1: 'Agent', Resolution: 'internal only', Comments_2: 'Internal' },
    ],
    'Table::IT__Agent_Solution': {
      0: {
        _id: 'IT__Agent_Solution_aaaaaaaaaa',
        Name_1: 'Aasik',
        Resolution: 'i have attached the screenshot',
        Comments_2: 'User',
        Attachments: [{ id: 'Attach_1', name: 'shot.png', key: 'k1' }],
      },
    },
  });
  const table = getTableAgentSolutions(mapped.agentSolutions);
  const userRows = table.filter((row) => commentMatchesChannel(row, COMMENT_CHANNEL_USER));
  assert.deepEqual(userRows.map((row) => row.resolution), [
    'hi how r u',
    'ya fine',
    'i have attached the screenshot',
  ]);
  const attached = userRows.find((row) => row.resolution === 'i have attached the screenshot');
  assert.equal(attached?.id, 'IT__Agent_Solution_aaaaaaaaaa');
  assert.equal(attached?.attachments?.[0]?.name, 'shot.png');
  const entries = collectConversationEntries({ agentSolutions: userRows });
  assert.equal(entries.length, 3);
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
    Statu_1: 'Open',
    [extCurrentStepCol]: 'IT Agent PickUp',
    [extPickupCol]: [{ _id: 'ActPick1', Status: 'InProgress' }],
  };
  return {
    id,
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Agent PickUp',
    activeWorkflowStep: 'IT Agent PickUp',
    itemStatusRaw: 'Open',
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

check('Extrovis PickUp Assigned To displays Waiting for Pickup', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const pickup = { currentStep: 'IT Agent PickUp', assignedTo: 'IT Agents Extrovis' };
  const solution = { currentStep: 'IT Agent Solution', assignedTo: 'Kishore Yepuri' };
  assert.equal(assignedToLabelForDisplay(pickup, pickup.assignedTo), WAITING_FOR_PICKUP_LABEL);
  assert.equal(assignedToLabelForDisplay(solution, solution.assignedTo), 'Kishore Yepuri');
  assert.equal(getAssignedToDisplay(pickup), WAITING_FOR_PICKUP_LABEL);
  assert.equal(getAssignedToDisplay(solution), 'Kishore Yepuri');
});

check('Extrovis Open = IT Agent PickUp; My Tickets = Solution owned work', () => {
  const user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const open = mkExtPickupRow();
  open.isLiveBucketPending = true;
  open.techSupportMyTaskItem = {
    _id: open.id,
    _status: 'InProgress',
    _current_step: 'IT Agent PickUp',
  };
  const mine = mkExtSolutionRow({ user });
  mine.isLiveBucketPending = true;
  mine.raw.Statu_1 = 'Open';
  mine.itemStatusRaw = 'Open';
  mine.techSupportMyTaskItem = {
    _id: mine.id,
    _status: 'InProgress',
    _current_step: 'IT Agent Solution',
    _current_assigned_to: [user],
  };
  assert.equal(matchesExtrovisOpenTicketRow(open, user), true);
  assert.equal(matchesExtrovisMyTaskRow(open, user), false);
  assert.equal(matchesExtrovisOpenTicketRow(mine, user), false);
  assert.equal(matchesExtrovisMyTaskRow(mine, user), true);
  assert.equal(matchesRefexTechSupportTab(open, 'OpenTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(mine, 'OpenTickets', user), false);
  assert.equal(
    matchesRefexMonitoringServiceTab(open, 'OpenTickets', user, 'me', 'first'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(mine, 'OpenTickets', user, 'me', 'first'),
    false,
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

check('Extrovis My Team Open = Ticket Status Open; Stage / Statu_1 is not required', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const pickup = mkExtPickupRow({ id: 'PkExtTeamOpenPick1' });
  const inProgress = mkExtSolutionRow({ id: 'PkExtTeamOpenSol1', user });
  inProgress.raw.Statu_1 = 'InProgress';
  inProgress.itemStatusRaw = 'Open';
  inProgress.ticketStage = 'InProgress';
  inProgress.processStages = 'InProgress';
  inProgress.techSupportMyTaskItem = {
    _id: inProgress.id,
    _status: 'InProgress',
    _current_step: 'IT Agent Solution',
    _current_assigned_to: [user],
  };
  const onHold = mkExtSolutionRow({ id: 'PkExtTeamOpenHold1', user });
  onHold.raw.Statu_1 = 'OnHold';
  onHold.itemStatusRaw = 'Open';
  onHold.ticketStage = 'OnHold';
  const closed = {
    id: 'PkExtTeamOpenClosed1',
    status: 'Completed',
    systemStatus: 'Completed',
    currentStep: 'ReOpen Window',
    activeWorkflowStep: 'ReOpen Window',
    itemStatusRaw: 'Closed',
    raw: {
      _id: 'PkExtTeamOpenClosed1',
      _status: 'Completed',
      Statu_1: 'Closed',
      [extCurrentStepCol]: 'ReOpen Window',
    },
  };
  assert.equal(matchesExtrovisOpenTicketRow(pickup, user, { scope: 'team' }), true);
  assert.equal(matchesExtrovisOpenTicketRow(inProgress, user), false);
  assert.equal(matchesExtrovisOpenTicketRow(inProgress, user, { scope: 'me' }), false);
  assert.equal(matchesExtrovisOpenTicketRow(inProgress, user, { scope: 'team' }), true);
  assert.equal(matchesExtrovisOpenTicketRow(onHold, user, { scope: 'team' }), true);
  assert.equal(matchesExtrovisOpenTicketRow(closed, user, { scope: 'team' }), false);
  assert.equal(matchesExtrovisOpenTicketRow(closed, user, { scope: 'all' }), false);
  assert.equal(getMisTicketStatus(inProgress), 'Open');
  assert.equal(getMisTicketStatus(onHold), 'Open');
  assert.equal(getMisTicketStatus(closed), 'Closed');
  assert.equal(
    matchesRefexMonitoringServiceTab(inProgress, 'OpenTickets', user, 'team', 'first'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(inProgress, 'OpenTickets', user, 'team', 'final'),
    true,
  );
  assert.equal(
    matchesRefexMonitoringServiceTab(inProgress, 'OpenTickets', user, 'me', 'first'),
    false,
  );
  assert.equal(matchesRefexTechSupportTab(inProgress, 'OpenTickets', user), false);
  assert.equal(matchesExtrovisMyTaskRow(inProgress, user), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(closed, 'OpenTickets', user, 'team'),
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

check('Extrovis My Team = everyone except signed-in user bucket', () => {
  const me = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const other = { _id: 'UsAgent2', Email: 'other@extrovis.com', Name: 'Other' };
  const pickupInBucket = mkExtPickupRow({ id: 'PkExtTeamPick1' });
  pickupInBucket.isLiveBucketPending = true;
  pickupInBucket.techSupportMyTaskItem = {
    _id: 'PkExtTeamPick1',
    _status: 'InProgress',
    _current_step: 'IT Agent PickUp',
  };
  const pickupNotMine = mkExtPickupRow({ id: 'PkExtTeamPick2' });
  const mine = mkExtSolutionRow({ id: 'PkExtTeamMine1', user: me });
  mine.isLiveBucketPending = true;
  mine.techSupportMyTaskItem = {
    _id: 'PkExtTeamMine1',
    _status: 'InProgress',
    _current_step: 'IT Agent Solution',
    _current_assigned_to: [me],
  };
  const others = mkExtSolutionRow({ id: 'PkExtTeamOther1', user: other });
  others.techSupportTaskOwnedByUser = false;
  assert.equal(matchesRefexMeOnlyScope(pickupInBucket, me, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(pickupInBucket, me, { role: 'agent' }), false);
  assert.equal(matchesRefexMeOnlyScope(pickupNotMine, me, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(pickupNotMine, me, { role: 'agent' }), true);
  assert.equal(matchesRefexMeOnlyScope(mine, me, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(mine, me, { role: 'agent' }), false);
  assert.equal(matchesRefexMeOnlyScope(others, me, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(others, me, { role: 'agent' }), true);
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
  pickupClosedStatus.isLiveBucketPending = true;
  pickupClosedStatus.techSupportMyTaskItem = {
    _id: pickupClosedStatus.id,
    _status: 'InProgress',
    _current_step: 'IT Agent PickUp',
  };
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
  assert.equal(keys.includes('reopenedOn'), false);
  assert.ok(keys.includes('subject'));
  assert.ok(keys.includes('stages'));
  assert.equal(getRefexServiceQueueMisColumns().find((col) => col.key === 'stages')?.label, 'Stage');
  const statusIdx = keys.indexOf('ticketStatus');
  assert.equal(keys[statusIdx + 1], 'stages');
  assert.equal(keys[statusIdx + 2], 'subject');
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
    'stages',
    'source',
    'ticketType',
    'category',
    'subCategory',
    'criticality',
    'closedBy',
    'closedOn',
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
  assert.equal(getRejectedByDisplay(rejected), 'Priya Sharma');
});

check('Completed tickets do not show Reopen; only live Ticket Reopen does', () => {
  const liveReopen = mkReopenRow({ id: 'PkLiveReopenStep1' });
  assert.equal(formatServiceWorkflowStepDisplay(liveReopen), 'Ticket Can be Reopened');
  assert.equal(getRefexTechReopenMisDisplay(liveReopen).primary, 'Reopen window');
  assert.notEqual(getRefexServiceSlaMisDisplay(liveReopen).state, 'reopen');
  assert.notEqual(getRefexServiceSlaMisDisplay(liveReopen).primary, 'Reopen window');

  const completed = {
    id: 'PkCompletedNotReopen1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'IT Tech Reopen',
    activeWorkflowStep: 'IT Tech Reopen',
    raw: { _status: 'Completed' },
  };
  assert.equal(formatServiceWorkflowStepDisplay(completed), 'Closed');
  assert.equal(getRefexTechReopenMisDisplay(completed).primary, '—');
  assert.notEqual(getRefexServiceSlaMisDisplay(completed).state, 'reopen');
});

check('Rejected progress note and actor land on workflow + expand tiles', async () => {
  const { parseRefexProgress, collectRejectionNotesFromProgress, trimWorkflowJourney } = await import(
    '../src/itsm/refex/employeedashboard/progressApi.js'
  );
  const progress = {
    ProcessName: 'Workflow',
    _status: 'Rejected',
    Steps: [
      {
        Name: 'Start',
        NodeType: 'StartEvent',
        _status: 'Completed',
        ActedBy: [{ Name: 'porchezhiyan' }],
      },
      { Name: 'L1 Approval', _status: 'Skipped', NodeType: 'UserTask' },
      {
        Name: 'IT Manager Approval',
        _status: 'Completed',
        NodeType: 'UserTask',
        ActedBy: [{ Name: 'sakthivel' }],
      },
      {
        Name: 'IT Head Approval',
        _status: 'Rejected',
        NodeType: 'UserTask',
        _note: 'change category as printer access',
        ActedBy: [{ Name: 'Mugesh M' }],
        ActedAt: '2026-08-07T12:33:35Z',
      },
    ],
  };
  const row = {
    id: 'PkDxdiXyQhca',
    status: 'Rejected',
    systemStatus: 'Rejected',
    currentStep: 'IT Head Approval',
  };
  const notes = collectRejectionNotesFromProgress(progress, row);
  assert.equal(notes.length >= 1, true);
  assert.equal(notes[0].comment, 'change category as printer access');
  assert.equal(notes[0].userName, 'Mugesh M');

  const parsed = parseRefexProgress(progress, row, 'Open');
  const rejectedNode = parsed.journey.find((node) => node.isRejected || String(node.status).toLowerCase() === 'rejected');
  assert.ok(rejectedNode, 'expected rejected workflow step');
  assert.equal(rejectedNode.note, 'change category as printer access');
  assert.equal(rejectedNode.actorName, 'Mugesh M');
  assert.equal(parsed.journey.some((node) => node.label === 'Ticket Can be Reopened'), false);

  // My Team report lag: stale current_step still IT Manager — must not hide Rejected.
  const staleTeamRow = {
    ...row,
    currentStep: 'IT Manager Approval',
    activeWorkflowStep: 'IT Manager Approval',
    assignedToDisplay: 'IT Manager',
    raw: { _status: 'Rejected', _current_step: 'IT Manager Approval' },
  };
  const staleParsed = parseRefexProgress(progress, staleTeamRow, null);
  const staleReject = staleParsed.journey.find((node) => node.isRejected || String(node.status).toLowerCase() === 'rejected');
  assert.ok(staleReject, 'stale IT Manager current_step must still show Rejected');
  assert.equal(staleReject.label, 'IT Head Approval');
  assert.equal(staleReject.actorName, 'Mugesh M');
  assert.equal(
    staleParsed.journey.some((n) => n.label === 'IT Manager Approval' && String(n.status).toLowerCase() === 'inprogress'),
    false,
  );

  const completedJourney = [
    { type: 'step', label: 'Opened', status: 'Completed' },
    { type: 'step', label: 'Tech Support', status: 'Completed' },
    { type: 'step', label: 'Ticket Can be Reopened', name: 'IT Tech Reopen', status: 'Completed' },
    { type: 'step', label: 'Closed', status: 'Completed' },
  ];
  const trimmedCompleted = trimWorkflowJourney(
    completedJourney,
    { isProcessCompleted: true, status: 'Completed', systemStatus: 'Completed' },
    'Closed',
  );
  assert.equal(trimmedCompleted.some((n) => n.label === 'Ticket Can be Reopened'), false);

  const tiles = buildServiceStatusTiles({
    ...row,
    progressRejectionNotes: notes,
  });
  assert.equal(tiles.some((t) => t.label === 'Rejected By' && t.value === 'Mugesh M'), true);
  assert.equal(tiles.some((t) => t.label === 'Rejection Notes' && t.value === 'change category as printer access'), true);
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

check('Workflow rail: live IT Tech Support does not match After Dependency; hides not-started Goto', async () => {
  setITDashboardProfile(REFEX_PROFILE);
  const { parseRefexProgress } = await import('../src/itsm/refex/employeedashboard/progressApi.js');
  const progress = {
    _status: 'InProgress',
    Steps: [
      {
        Name: 'Start',
        NodeType: 'StartEvent',
        _status: 'Completed',
        ActedAt: '2026-09-08T09:36:00.000Z',
        ActedBy: [{ Name: 'asik' }],
      },
      {
        Process: [{
          ProcessName: 'Refex',
          Steps: [
            {
              Name: 'IT Tech',
              _status: 'Completed',
              _activity_instance_id: 'ActTech1',
              ActedAt: '2026-09-08T10:01:00.000Z',
              ActedBy: [{ Name: 'asik' }],
            },
            {
              Name: 'IT Tech Support',
              _status: 'InProgress',
              _activity_instance_id: 'ActSupport1',
              AssignedTo: [{ Name: 'asik' }],
              ExpectedAt: '2026-09-09T10:01:00.000Z',
            },
            {
              Name: 'Goto-IT Tech Support',
              _status: 'NotStarted',
              _activity_instance_id: 'ActGoto1',
            },
            {
              Name: 'Dependency Assigne',
              _status: 'NotStarted',
              _activity_instance_id: 'ActDep1',
            },
            {
              Name: 'IT Tech Support After Dependency',
              _status: 'NotStarted',
              _activity_instance_id: 'ActAfter1',
              AssignedTo: [{ Name: 'asik' }],
            },
          ],
        }],
      },
    ],
  };
  const row = {
    id: 'PkWfGoto1',
    currentStep: 'IT Tech Support',
    activeWorkflowStep: 'IT Tech Support',
    techSupportMyTaskItem: { _current_step: 'IT Tech Support' },
  };
  const parsed = parseRefexProgress(progress, row, 'Open');
  const labels = parsed.journey.map((n) => n.label || n.name);
  assert.equal(labels.some((l) => /revised/i.test(String(l))), false);
  assert.equal(labels.some((l) => /goto/i.test(String(l))), false);
  assert.equal(labels.some((l) => /after dependency/i.test(String(l))), false);
  assert.equal(labels.some((l) => /dependency/i.test(String(l))), false);
  assert.ok(labels.includes('Tech Support') || labels.includes('IT Tech Support'));
  assert.ok(labels.includes('IT Tech') || labels.includes('Opened'));
});

check('Workflow Revised markers count completed Goto only (skip ≠ revision)', async () => {
  setITDashboardProfile(REFEX_PROFILE);
  const { parseRefexProgress } = await import('../src/itsm/refex/employeedashboard/progressApi.js');
  const progress = {
    _status: 'InProgress',
    Steps: [
      { Name: 'Start', NodeType: 'StartEvent', _status: 'Completed', ActedAt: '2026-09-08T09:00:00.000Z' },
      {
        Process: [{
          ProcessName: 'Refex',
          Steps: [
            {
              Name: 'IT Tech',
              _status: 'Completed',
              ActedAt: '2026-09-08T09:10:00.000Z',
              ActedBy: [{ Name: 'asik' }],
              MoveToType: 'Goto',
            },
            {
              Name: 'Goto-IT Tech Support',
              _status: 'Completed',
              ActedAt: '2026-09-08T09:11:00.000Z',
            },
            {
              Name: 'IT Tech Support',
              _status: 'Completed',
              ActedAt: '2026-09-08T09:20:00.000Z',
              ActedBy: [{ Name: 'asik' }],
            },
            {
              Name: 'Goto-IT Tech Support',
              _status: 'Completed',
              ActedAt: '2026-09-08T09:21:00.000Z',
            },
            {
              Name: 'IT Tech Support',
              _status: 'InProgress',
              AssignedTo: [{ Name: 'asik' }],
            },
          ],
        }],
      },
    ],
  };
  const row = {
    id: 'PkWfRev2',
    currentStep: 'IT Tech Support',
    activeWorkflowStep: 'IT Tech Support',
  };
  const parsed = parseRefexProgress(progress, row, 'Open');
  const revised = parsed.journey.filter((n) => n.type === 'revised');
  assert.equal(revised.length, 2);
  assert.equal(revised[0].label, 'Revised');
  assert.equal(revised[1].label, 'Revised (2)');

  setITDashboardProfile(EXTROVIS_PROFILE);
  const extProgress = {
    _status: 'InProgress',
    Steps: [
      { Name: 'Start', NodeType: 'StartEvent', _status: 'Completed', ActedAt: '2026-09-08T09:00:00.000Z' },
      {
        Process: [{
          ProcessName: 'Extrovis',
          Steps: [
            {
              Name: 'IT Agent PickUp',
              _status: 'Completed',
              ActedAt: '2026-09-08T09:10:00.000Z',
              MoveToType: 'Goto',
            },
            {
              Name: 'IT Agent Solution',
              _status: 'Skipped',
            },
            {
              Name: 'IT Agent Solution',
              _status: 'InProgress',
              AssignedTo: [{ Name: 'asik' }],
            },
          ],
        }],
      },
    ],
  };
  const extParsed = parseRefexProgress(
    extProgress,
    { id: 'PkExtSkip1', currentStep: 'IT Agent Solution', activeWorkflowStep: 'IT Agent Solution' },
    'Open',
  );
  assert.equal(extParsed.journey.some((n) => n.type === 'revised' || /revised/i.test(String(n.label))), false);
  setITDashboardProfile(REFEX_PROFILE);
});

check('Pending activity ids resolve from StepName (not hardcoded Activity_*)', () => {
  const stamped = stampPendingItemsWithStepName(
    [{ _id: 'PkPickBlank', _activity_id: '' }],
    'Activity_9gAyNCIowD',
    'IT Agent PickUp',
  );
  assert.equal(stamped[0]._current_step, 'IT Agent PickUp');
  assert.equal(stamped[0]._activity_id, 'Activity_9gAyNCIowD');
  const overwritten = stampPendingItemsWithStepName(
    [{ _id: 'PkKeep', _current_step: 'IT Agent Solution' }],
    'Activity_XVeFnZdKon',
    'IT Agent PickUp',
  );
  assert.equal(overwritten[0]._current_step, 'IT Agent PickUp');
  const count = [
    { _id: 'Activity_DynamicReopen1', StepName: 'IT Tech Reopen', Count: 12 },
    { _id: 'Activity_DynamicOpen1', StepName: 'IT Tech Support', Count: 3 },
    { _id: 'Activity_Zero', StepName: 'IT Tech', Count: 0 },
  ];
  const entries = parsePendingActivityCountEntries(count);
  assert.equal(entries.length, 2);
  const reopenIds = resolveActivityIdsByStepNames(entries, ['IT Tech Reopen']);
  assert.deepEqual(reopenIds, ['Activity_DynamicReopen1']);
  const openIds = resolveActivityIdsByStepNames(entries, collectStepPatternsForMeBucket('refex', { role: 'agent' }));
  assert.equal(openIds.includes('Activity_DynamicOpen1'), true);
  assert.equal(openIds.includes('Activity_DynamicReopen1'), true);
});

check('Report path supports $request_id enrichment', async () => {
  const { getReportPath, DEFAULT_ACCOUNT_ID } = await import('../src/lib/kfITServiceDashboard.js');
  const path = getReportPath(DEFAULT_ACCOUNT_ID, 1, 10, { requestId: 'IT-IC-Refex-FY026-000169' });
  assert.equal(path.includes('%24request_id=IT-IC-Refex-FY026-000169') || path.includes('$request_id=IT-IC-Refex-FY026-000169'), true);
});

check('Extrovis comment fallback report uses Request ID column param', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const path = getReportPath(DEFAULT_ACCOUNT_ID, 1, 25, {
    requestId: 'IT-SR-Extrovis-FY026-0040',
  });
  assert.equal(path.includes('IT-SR-Extrovis-FY026-0040'), true);
  assert.equal(path.includes('$request_id=') || path.includes('%24request_id='), true);
  assert.equal(path.includes('Column_y4srngcUo1'), false);
  setITDashboardProfile(REFEX_PROFILE);
  const refexPath = getReportPath(DEFAULT_ACCOUNT_ID, 1, 10, { requestId: 'IT-IC-Refex-FY026-000169' });
  assert.equal(refexPath.includes('$request_id=') || refexPath.includes('%24request_id='), true);
});

check('Extrovis All_tickets Column_* comments display after report refresh', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const reportRow = {
    _id: 'PkEN7ASr69Uq',
    Column_y4srngcUo1: 'IT-SR-Extrovis-FY026-0040',
    Column_qr_9gP_vE5: [
      {
        Column_KzHlT9k9fc: 'ok let me check it out - test',
        Column_R_u4Nyl5q_: '2026-10-15T07:04:31Z',
        Column_EA6Nomn1w4: 'InProgress',
        Column_ZipK5a_k8Y: 'Balaraju Ilaveni',
        Column_x6WUN8QD4O: 'User',
      },
      {
        Column_KzHlT9k9fc: 'Thanks',
        Column_R_u4Nyl5q_: '2026-10-15T07:04:31Z',
        Column_EA6Nomn1w4: 'InProgress',
        Column_ZipK5a_k8Y: 'Balaraju Ilaveni',
        Column_x6WUN8QD4O: 'Internal',
      },
      {
        Column_KzHlT9k9fc: 'Not resolved',
        Column_R_u4Nyl5q_: '2026-10-15T07:04:31Z',
        Column_EA6Nomn1w4: 'InProgress',
        Column_ZipK5a_k8Y: 'Balaraju Ilaveni',
        Column_x6WUN8QD4O: 'Internal',
      },
    ],
  };
  const fromEnvelope = extractItemsFromResponse({
    Id: 'All_tickets_A00',
    Columns: [{ Id: 'Column_qr_9gP_vE5' }],
    Data: [reportRow],
  });
  const fromUnwrapped = extractItemsFromResponse(reportRow);
  assert.equal(fromEnvelope.length, 1);
  assert.equal(fromUnwrapped.length, 1);
  const mapped = mapRefexEmployeeRow(fromUnwrapped[0]);
  const entries = collectConversationEntries(mapped);
  assert.deepEqual(entries.map((entry) => entry.comment), [
    'ok let me check it out - test',
    'Thanks',
    'Not resolved',
  ]);
  setITDashboardProfile(REFEX_PROFILE);
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

check('Auto-closure by ITSM BOT matches Me Closed to the human solver', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const other = { _id: 'UsAgent2', Email: 'other@refex.co.in', Name: 'Other' };
  const bot = { _id: 'UsBot1', Email: 'itsm-bot@refex.co.in', Name: 'ITSM BOT' };

  const autoClosed = {
    id: 'PkAutoClose1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    activeWorkflowStep: 'Completed',
    itemStatusRaw: 'Closed',
    closedBy: bot.Name,
    completedBy: bot.Name,
    modifiedBy: bot,
    assignedTo: bot.Name,
    assignedToDisplay: bot.Name,
    assignedToRaw: [bot],
    itAgentActivities: [
      { id: 'ActSolve1', status: 'Completed', actedAt: '2026-08-18T10:00:00Z', actedBy: agent.Name },
      { id: 'ActBot1', status: 'Completed', actedAt: '2026-08-20T10:00:00Z', actedBy: bot.Name },
    ],
    agentSolutions: [{ agentName: agent.Name, resolution: 'Fixed' }],
    raw: { _id: 'PkAutoClose1', _status: 'Completed', _modified_by: bot, _current_step: 'Completed' },
  };

  assert.equal(isItsmBotOrSystemActor(bot.Name), true);
  assert.equal(normalizeSolverName(pickLatestTicketSolver(autoClosed)), 'aasik');
  assert.equal(isTicketClosedByUser(autoClosed, agent), true);
  assert.equal(isTicketClosedByUser(autoClosed, other), false);
  assert.equal(matchesRefexMeOnlyScope(autoClosed, agent, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(autoClosed, agent, { role: 'agent' }), false);
  assert.equal(matchesRefexMeOnlyScope(autoClosed, other, { role: 'agent' }), false);
  assert.equal(getClosedByDisplay(autoClosed), 'Aasik');
  // Assigned To must show the human solver, not ITSM BOT.
  assert.equal(getAssignedToDisplay(autoClosed), 'Aasik');
});

check('Me Closed uses IT Agent Solution / IT Tech Support solver, not PickUp', () => {
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const pickup = { _id: 'UsAgent2', Email: 'other@refex.co.in', Name: 'Other' };

  setITDashboardProfile(EXTROVIS_PROFILE);
  const extClosed = {
    id: 'PkExtSolved1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    itemStatusRaw: 'Closed',
    assignedTo: pickup.Name,
    assignedToDisplay: pickup.Name,
    itAgentActivities: [
      { step: 'IT Agent PickUp', actedBy: pickup.Name, actedAt: '2026-08-01T10:00:00Z', status: 'Completed' },
      { step: 'IT Agent Solution', actedBy: agent.Name, actedAt: '2026-08-02T10:00:00Z', status: 'Completed' },
    ],
    raw: {
      _id: 'PkExtSolved1',
      _status: 'Completed',
      'IT Agent Solution': [{ ActedBy: { Name: agent.Name }, Status: 'Completed' }],
    },
  };
  assert.equal(normalizeSolverName(pickLatestTicketSolver(extClosed)), 'aasik');
  assert.equal(isTicketClosedByUser(extClosed, agent), true);
  assert.equal(isTicketClosedByUser(extClosed, pickup), false);
  assert.equal(matchesRefexTechSupportTab(extClosed, 'Closed', agent), true);
  assert.equal(matchesRefexMeOnlyScope(extClosed, agent, { role: 'agent' }), true);

  setITDashboardProfile(REFEX_PROFILE);
  const refexClosed = {
    id: 'PkRefexSolved1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    itemStatusRaw: 'Closed',
    assignedTo: pickup.Name,
    itAgentActivities: [
      { step: 'IT Tech', actedBy: pickup.Name, actedAt: '2026-08-01T10:00:00Z', status: 'Completed' },
      { step: 'IT Tech Support', actedBy: agent.Name, actedAt: '2026-08-02T10:00:00Z', status: 'Completed' },
    ],
    raw: {
      _id: 'PkRefexSolved1',
      _status: 'Completed',
      'IT Tech Support': [{ ActedBy: { Name: agent.Name }, Status: 'Completed' }],
    },
  };
  assert.equal(normalizeSolverName(pickLatestTicketSolver(refexClosed)), 'aasik');
  assert.equal(isTicketClosedByUser(refexClosed, agent), true);
  assert.equal(matchesRefexTechSupportTab(refexClosed, 'Closed', agent), true);
});

check('myitems completed stamp counts as Me Closed for the signed-in user', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const row = {
    id: 'PkCompletedQueue1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    itemStatusRaw: 'Closed',
    completedItem: { _id: 'PkCompletedQueue1', _modified_at: '2026-08-02T10:00:00Z' },
    raw: { _id: 'PkCompletedQueue1', _status: 'Completed' },
  };
  assert.equal(isTicketClosedByUser(row, agent), true);
  assert.equal(matchesRefexTechSupportTab(row, 'Closed', agent), true);
  assert.equal(matchesRefexMeOnlyScope(row, agent, { role: 'agent' }), true);
});

check('Agent landing merge keeps cached Closed when seed is open-only', async () => {
  const {
    mergeTechSupportLandingRows,
    buildAgentTechSupportPersistKey,
  } = await import('../src/itsm/refex/techsupport/fetchRefexTechSupportTickets.js');
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const closed = {
    id: 'PkClosedCache1',
    status: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    itemStatusRaw: 'Closed',
    completedItem: { _id: 'PkClosedCache1' },
    itAgentActivities: [
      { step: 'IT Tech Support', actedBy: agent.Name, actedAt: '2026-08-02T10:00:00Z', status: 'Completed' },
    ],
  };
  const openSeed = {
    id: 'PkOpenSeed1',
    status: 'InProgress',
    currentStep: 'IT Tech Support',
    itemStatusRaw: 'Open',
    techSupportMyTaskItem: { _id: 'PkOpenSeed1' },
    isLiveBucketPending: true,
  };
  const overlayOpen = {
    id: 'PkClosedCache1',
    status: 'InProgress',
    currentStep: 'IT Tech Reopen',
    itemStatusRaw: 'Closed',
    techSupportMyTaskItem: { _id: 'PkClosedCache1', _current_step: 'IT Tech Reopen' },
    isLiveBucketPending: true,
  };

  const merged = mergeTechSupportLandingRows([closed], [openSeed, overlayOpen]);
  const byId = Object.fromEntries(merged.map((row) => [row.id, row]));
  assert.equal(Boolean(byId.PkClosedCache1.completedItem), true);
  assert.equal(Boolean(byId.PkClosedCache1.techSupportMyTaskItem), true);
  assert.equal(Boolean(byId.PkOpenSeed1.techSupportMyTaskItem), true);
  assert.equal(isTicketClosedByUser(byId.PkClosedCache1, agent), true);

  const persistKey = buildAgentTechSupportPersistKey({ accountId: 'Ac1' }, agent, { skipEnrich: true });
  assert.ok(persistKey.includes('techSupportMapped'));
  assert.ok(persistKey.includes('UsAgent1'));

  const { retainCachedClosedRows } = await import('../src/itsm/refex/techsupport/fetchRefexTechSupportTickets.js');
  const kept = retainCachedClosedRows([closed], [openSeed]);
  assert.equal(kept.some((row) => row.id === 'PkClosedCache1' && row.completedItem), true);
  const replaced = retainCachedClosedRows(
    [closed],
    [{ ...closed, id: 'PkClosedCache1', completedItem: null, status: 'InProgress' }],
  );
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].status, 'InProgress');
});

function normalizeSolverName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  return String(value?.Name || value?.name || '').trim().toLowerCase();
}

check('Reopen window Me = personal/live for agent; live AppRole bucket is Me for Head', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const agent = { _id: 'UsAgent1', Email: 'agent@refex.co.in', Name: 'Aasik' };
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Arun Head' };

  const agentLiveReopen = mkReopenRow({
    id: 'PkAgentReopenWin1',
    withMyTask: true,
    assignee: agent,
  });
  agentLiveReopen.isLiveBucketPending = true;
  agentLiveReopen.isLiveReopenPending = true;
  assert.equal(matchesRefexMeOnlyScope(agentLiveReopen, agent, { role: 'agent' }), true);
  assert.equal(
    matchesRefexMonitoringServiceTab(agentLiveReopen, 'Closed', agent, 'me'),
    true,
  );

  // Live AppRole-only in Head pending bucket → Me (Q1).
  const headAppRoleReopen = mkReopenRow({
    id: 'PkHeadAppRoleReopen1',
    withMyTask: true,
    assignee: employee,
  });
  headAppRoleReopen.assignedToRaw = [{ Kind: 'AppRole', Name: 'IT Head' }];
  headAppRoleReopen.raw._current_assigned_to = headAppRoleReopen.assignedToRaw;
  headAppRoleReopen.techSupportMyTaskItem = {
    ...headAppRoleReopen.techSupportMyTaskItem,
    _current_assigned_to: headAppRoleReopen.assignedToRaw,
  };
  headAppRoleReopen.techSupportTaskOwnedByUser = false;
  headAppRoleReopen.isLiveBucketPending = true;
  headAppRoleReopen.isLiveReopenPending = true;
  headAppRoleReopen.liveReopenPendingKnown = true;
  assert.equal(matchesRefexMeOnlyScope(headAppRoleReopen, head, { role: 'final' }), true);
  assert.equal(matchesRefexServiceTeamScope(headAppRoleReopen, head, { role: 'final' }), false);
});

check('Simple Me vs My Team: Me = own bucket/closed; Team = everything else', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const me = { _id: 'UsMe1', Email: 'me@refex.co.in', Name: 'Me User' };
  const other = { _id: 'UsOther1', Email: 'other@refex.co.in', Name: 'Other User' };

  const myOpen = mkOpenTechRow({ id: 'PkSimpleMeOpen1' });
  myOpen.isLiveBucketPending = true;
  myOpen.assignedToRaw = [me];
  myOpen.techSupportMyTaskItem = {
    _id: 'PkSimpleMeOpen1',
    _current_step: 'IT Tech Support',
    _current_assigned_to: [me],
  };

  const myClosed = {
    id: 'PkSimpleMeClosed1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    itemStatusRaw: 'Closed',
    closedBy: me.Name,
    itAgentActivities: [{
      id: 'ActMe1',
      status: 'Completed',
      actedAt: '2026-08-18T10:00:00Z',
      actedBy: me.Name,
    }],
    raw: { _id: 'PkSimpleMeClosed1', _status: 'Completed' },
  };

  const theirOpen = mkOpenTechRow({ id: 'PkSimpleTeamOpen1' });
  theirOpen.isLiveBucketPending = false;
  theirOpen.techSupportMyTaskItem = null;
  theirOpen.assignedToRaw = [other];
  theirOpen.techSupportTaskOwnedByUser = false;

  const theirClosed = mkReopenRow({
    id: 'PkSimpleTeamClosed1',
    withMyTask: false,
    assignee: employee,
  });
  theirClosed.closedBy = other.Name;
  theirClosed.itAgentActivities = [{
    id: 'ActOther1',
    status: 'Completed',
    actedAt: '2026-08-18T11:00:00Z',
    actedBy: other.Name,
  }];

  assert.equal(matchesRefexMeOnlyScope(myOpen, me, { role: 'agent' }), true);
  assert.equal(matchesRefexMeOnlyScope(myClosed, me, { role: 'agent' }), true);
  assert.equal(matchesRefexMeOnlyScope(theirOpen, me, { role: 'agent' }), false);
  assert.equal(matchesRefexMeOnlyScope(theirClosed, me, { role: 'final' }), false);

  assert.equal(matchesRefexServiceTeamScope(myOpen, me, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(myClosed, me, { role: 'agent' }), false);
  assert.equal(matchesRefexServiceTeamScope(theirOpen, me, { role: 'agent' }), true);
  assert.equal(matchesRefexServiceTeamScope(theirClosed, me, { role: 'final' }), true);
});

check('Me Closed: lastCompleted reopen does not force Reopen Window / Closed Open status', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const lastCompletedCol = REFEX_PROFILE.serviceCol.lastCompletedStep;
  const sourceCol = REFEX_PROFILE.serviceCol.source;
  const categoryCol = REFEX_PROFILE.serviceCol.category;
  const createdCol = REFEX_PROFILE.serviceCol.createdAt;
  const techCol = REFEX_PROFILE.serviceCol.itAgentRefexActivity;
  const reopenActCol = REFEX_PROFILE.serviceCol.itTechReopenActivity;
  const closureCol = REFEX_PROFILE.serviceCol.closureMinutes;
  const now = new Date();
  const todayIso = now.toISOString();

  const completedPoisoned = mapRefexEmployeeRow({
    _id: 'PkClosedPoison1',
    _status: 'Completed',
    _modified_at: '2026-08-18T12:00:00.000Z',
    _created_at: '2026-08-10T08:00:00.000Z',
    [currentStepCol]: '',
    [lastCompletedCol]: 'IT Tech Reopen',
    [sourceCol]: 'Email',
    [categoryCol]: 'Network',
    [closureCol]: { Closure_Time: 240 },
    [techCol]: [{
      _id: 'ActTechPoison1',
      Status: 'Completed',
      ActedAt: '2026-08-10T09:00:00.000Z',
      ActedBy: { Name: 'Aasik' },
    }],
    [reopenActCol]: [{
      _id: 'ActReopenPoison1',
      Status: 'Completed',
      ActedAt: '2026-08-10T10:00:00.000Z',
      ActedBy: { Name: 'ITSM BOT' },
    }],
  });
  assert.equal(completedPoisoned.currentStep, '');
  assert.equal(completedPoisoned.lastCompletedStep, 'IT Tech Reopen');
  assert.equal(getMisTicketStatus(completedPoisoned), 'Closed');
  assert.notEqual(getRefexServiceSlaMisDisplay(completedPoisoned, { isCompletedTab: true }).state, 'reopen');
  assert.equal(getRefexServiceSlaMisDisplay(completedPoisoned, { isCompletedTab: true }).primary, 'Not Breached');
  assert.equal(getMisSourceLabel(completedPoisoned), 'Email');
  assert.equal(getMisCategoryLabel(completedPoisoned), 'Network');

  const openPoisoned = mapRefexEmployeeRow({
    _id: 'PkOpenPoison1',
    _status: 'InProgress',
    _modified_at: todayIso,
    _created_at: todayIso,
    Statu_1: 'Closed',
    [currentStepCol]: '',
    [lastCompletedCol]: 'IT Tech Reopen',
    [createdCol]: todayIso,
    [sourceCol]: 'Email',
    [techCol]: [{
      _id: 'ActTechOpen1',
      Status: 'InProgress',
      ActedAt: todayIso,
      ActedBy: { Name: 'Aasik' },
    }],
  });
  assert.equal(openPoisoned.isProcessCompleted, false);
  assert.equal(getMisTicketStatus(openPoisoned), 'Open');
  assert.equal(isRefexServiceOpenTicket(openPoisoned), true);
  assert.equal(isDashboardRowCreatedToday(openPoisoned, now), true);

  const breached = {
    ...completedPoisoned,
    id: 'PkSlaBreach1',
    closureMinutes: 60,
    serviceQueueSlaMinutes: 60,
    itAgentActivities: [
      {
        id: 'ActTechBreach1',
        step: 'IT Tech Support',
        status: 'InProgress',
        actedAt: '2026-08-10T09:00:00.000Z',
        actedBy: 'Aasik',
      },
      {
        id: 'ActTechBreachDone',
        step: 'IT Tech Support',
        status: 'Completed',
        actedAt: '2026-08-10T12:00:00.000Z',
        actedBy: 'Aasik',
      },
      {
        id: 'ActReopenBreach1',
        step: 'IT Tech Reopen',
        status: 'Completed',
        actedAt: '2026-08-10T15:00:00.000Z',
        actedBy: 'ITSM BOT',
      },
    ],
  };
  const timing = getCompletedResolutionTiming(breached);
  assert.equal(timing.hasData, true);
  assert.equal(timing.outcome, 'breached');
  assert.equal(getRefexServiceSlaMisDisplay(breached, { isCompletedTab: true }).primary, 'Breached');
});

check('Today created ISO helper and Request ID extract from Column_*', async () => {
  const { startOfLocalDayKissflowIso } = await import('../src/itsm/refex/shared/refexReportQuery.js');
  const { extractRequestIdFromItem } = await import('../src/itsm/refex/shared/refexPendingByStep.js');
  const iso = startOfLocalDayKissflowIso(new Date('2026-08-20T15:30:00+05:30'));
  assert.equal(iso.endsWith('Z'), true);
  assert.equal(iso.includes('2026-08-20') || iso.includes('2026-08-19'), true);
  assert.equal(
    extractRequestIdFromItem({ Column_0jda6rzCc3: 'IT-IC-Refex-FY026-000169', _id: 'PkX' }),
    'IT-IC-Refex-FY026-000169',
  );
  assert.equal(
    extractRequestIdFromItem({ Some_Other: 'IT-IC-Refex-FY026-000170', _id: 'PkY' }),
    'IT-IC-Refex-FY026-000170',
  );
  assert.equal(
    extractRequestIdFromItem({ Column_y4srngcUo1: 'IT-SR-Extrovis-FY026-000010', _id: 'PkZ' }),
    'IT-SR-Extrovis-FY026-000010',
  );
});

check('Process instance payload paints MIS for IT-IC-Refex-FY026-000169 (no report)', () => {
  setITDashboardProfile(REFEX_PROFILE);
  // Live GET .../PkE08g6z5mx3/PkE2fOcnFaRO — native fields, not Column_*.
  const instance = {
    _id: 'PkE08g6z5mx3',
    _current_step: 'IT Tech Reopen',
    _status: 'InProgress',
    _created_at: '2026-08-13T06:42:41Z',
    _modified_at: '2026-08-20T05:21:42Z',
    _activity_instance_id: 'PkE2fOcnFaRO',
    _activity_id: 'Activity_Ot8GrzZvSl',
    Request_ID: 'IT-IC-Refex-FY026-000169',
    Ticket_Type: 'Incident',
    Category: 'Email Incident',
    SubCategory: 'Email Delivery',
    Criticality: 'Medium',
    Source: 'Email',
    Statu_1: 'Closed',
    Requester_Name: 'Narendra K',
    Requester_Email: 'narendra.k@refex.co.in',
    Description: 'Subject: Regarding Laptop handover',
    last_completed_step_name: 'IT Tech',
    _current_assigned_to: [
      { _id: 'RoDiFpJErVMD', Name: 'IT Manager Refex', Kind: 'AppRole' },
      { _id: 'UsDhZxWqhfsC', Name: 'porchezhiyan', Kind: 'User' },
    ],
  };
  const pendingStub = {
    _id: 'PkE08g6z5mx3',
    _current_step: 'IT Tech Reopen',
    _activity_instance_id: 'PkE2fOcnFaRO',
    _activity_id: 'Activity_Ot8GrzZvSl',
    _status: 'InProgress',
  };
  // Simulate enrich: instance MIS + pending workflow overlay.
  const merged = { ...instance, ...pendingStub, Request_ID: instance.Request_ID };
  const row = mapRefexEmployeeRow(merged);
  assert.equal(row.requestId, 'IT-IC-Refex-FY026-000169');
  assert.equal(getMisTicketTypeLabel(row), 'Incident');
  assert.equal(getMisSourceLabel(row), 'Email');
  assert.equal(getMisCategoryLabel(row), 'Email Incident');
  assert.notEqual(row.requestId, '—');
  assert.notEqual(row.requestId, row.id);
  assert.equal(matchesRefexMonitoringServiceTab(row, 'Closed', null, 'team'), true);
});

check('SLA Open is a subset of Open Tickets (Pending Approval is not SLA Open)', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Head' };
  const pendingSla = {
    id: 'PkL1Sla1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'L1 Approval',
    activeWorkflowStep: 'L1 Approval',
    itemStatusRaw: 'Open',
    slaBreached: true,
    slaElapsedMinutes: 200,
    serviceQueueSlaMinutes: 60,
    assignedToRaw: [{ Kind: 'User', Email: 'other@refex.co.in' }],
    raw: { _id: 'PkL1Sla1', _status: 'InProgress' },
  };
  const openSla = {
    ...mkOpenTechRow({ id: 'PkOpenSla1' }),
    slaBreached: true,
    slaElapsedMinutes: 200,
    serviceQueueSlaMinutes: 60,
  };
  assert.equal(matchesRefexMonitoringServiceTab(pendingSla, 'OpenTickets', head, 'team', 'final'), false);
  assert.equal(matchesRefexMonitoringServiceTab(pendingSla, 'SlaBreached', head, 'team', 'final'), false);
  assert.equal(matchesRefexMonitoringServiceTab(openSla, 'OpenTickets', head, 'team', 'final'), true);
  assert.equal(matchesRefexMonitoringServiceTab(openSla, 'SlaBreached', head, 'team', 'final'), true);
  const split = countServiceSlaKpiSplit([pendingSla, openSla], (row, tab) => (
    matchesRefexMonitoringServiceTab(row, tab, head, 'team', 'final')
  ));
  assert.equal(split.slaBreachedOpen, 1);
});

check('Header role label comes from the installed pack, not Kissflow AppRoles', () => {
  assert.equal(resolveItsmHeaderRoleLabel({ headerRoleLabel: 'IT Head' }), 'IT Head');
  assert.equal(resolveItsmHeaderRoleLabel({ pack: 'employee' }), 'Employee');
  assert.equal(resolveItsmHeaderRoleLabel({ pack: 'agent' }), 'IT Agent');
  assert.equal(resolveItsmHeaderRoleLabel({ role: 'first' }), 'IT Manager');
  assert.equal(resolveItsmHeaderRoleLabel({ role: 'final' }), 'IT Head');
  assert.equal(resolveItsmHeaderRoleLabel({ role: 'final', hideScopeSwitch: true }), 'Admin');
  assert.equal(resolveItsmHeaderRoleLabel({
    role: 'final', hideScopeSwitch: true, showHeaderPeopleFilters: true,
  }), 'Group CEO');
  assert.equal(resolveItsmHeaderRoleLabel({ role: 'first', extrovis: true }), 'First Level Approver');
  assert.equal(resolveItsmHeaderRoleLabel({ role: 'final', extrovis: true }), 'Final Level Approver');
  assert.equal(resolveItsmHeaderRoleLabel({
    headerRoleLabel: 'Group CEO',
    showHeaderPeopleFilters: true,
  }), 'Group CEO');
  assert.equal(resolveItsmHeaderRoleLabel({
    headerRoleLabel: 'Group CEO',
    hideScopeSwitch: true,
    showHeaderPeopleFilters: true,
    userEmail: 'srivaths.varadharajan@refex.co.in',
  }), 'Group Chief Technical Officer');
  assert.equal(resolveItsmHeaderRoleLabel({
    pack: 'employee',
    userEmail: 'srivaths.varadharajan@refex.co.in',
  }), 'Group Chief Technical Officer');
  assert.equal(resolveItsmHeaderRoleLabel({
    headerRoleLabel: 'Group CEO',
    userEmail: 'aniljain@refex.co.in',
  }), 'Managing Director / Chairman');
  assert.equal(resolveItsmHeaderRoleLabel({
    headerRoleLabel: 'Group CEO',
    userEmail: 'dinesh@refex.co.in',
  }), 'Group Chief Executive Officer');
  assert.equal(resolveItsmHeaderRoleLabel({
    headerRoleLabel: 'IT Head',
    userEmail: 'mohamedaasik.m@refex.co.in',
  }), 'IT Head');
  assert.equal(resolveItsmHeaderRoleLabel({
    headerRoleLabel: 'IT Head',
    userName: 'Srivaths Varadharajan',
  }), 'Group Chief Technical Officer');
  assert.equal(resolveItsmHeaderRoleLabel({
    headerRoleLabel: 'IT Head',
    userName: 'Anil Jain',
  }), 'Managing Director / Chairman');
  assert.equal(resolveItsmHeaderRoleLabel({
    headerRoleLabel: 'IT Head',
    userName: 'Dinesh',
  }), 'Group Chief Executive Officer');
});

check('Head Me SLA includes personal pending-approval breaches; Team L1 pending is not SLA Open', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const head = { _id: 'UsHead1', Email: 'head@refex.co.in', Name: 'Head' };
  const pendingHeadSla = {
    id: 'PkHeadPendSla1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Head Approval',
    activeWorkflowStep: 'IT Head Approval',
    itemStatusRaw: 'Open',
    slaBreached: true,
    slaElapsedMinutes: 200,
    serviceQueueSlaMinutes: 60,
    isLiveBucketPending: true,
    isLiveApprovalPending: true,
    assignedToRaw: [{ Kind: 'AppRole', Name: 'IT Head' }],
    raw: { _id: 'PkHeadPendSla1', _status: 'InProgress', _current_step: 'IT Head Approval' },
  };
  const pendingL1Sla = {
    id: 'PkL1SlaMe1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'L1 Approval',
    activeWorkflowStep: 'L1 Approval',
    itemStatusRaw: 'Open',
    slaBreached: true,
    slaElapsedMinutes: 200,
    serviceQueueSlaMinutes: 60,
    assignedToRaw: [{ Kind: 'User', Email: 'other@refex.co.in' }],
    raw: { _id: 'PkL1SlaMe1', _status: 'InProgress', _current_step: 'L1 Approval' },
  };
  const openSla = {
    ...mkOpenTechRow({ id: 'PkOpenSlaHead1' }),
    slaBreached: true,
    slaElapsedMinutes: 200,
    serviceQueueSlaMinutes: 60,
  };

  assert.equal(matchesRefexMonitoringServiceTab(pendingHeadSla, 'OpenTickets', head, 'me', 'final'), false);
  assert.equal(matchesRefexMonitoringServiceTab(pendingHeadSla, 'PendingTask', head, 'me', 'final'), true);
  assert.equal(matchesRefexMonitoringServiceTab(pendingHeadSla, 'SlaBreached', head, 'me', 'final'), true);
  assert.equal(matchesRefexMonitoringServiceTab(pendingHeadSla, 'SlaBreached', head, 'team', 'final'), false);
  assert.equal(matchesRefexMonitoringServiceTab(pendingL1Sla, 'SlaBreached', head, 'me', 'final'), false);
  assert.equal(matchesRefexMonitoringServiceTab(pendingL1Sla, 'SlaBreached', head, 'team', 'final'), false);
  assert.equal(matchesRefexMonitoringServiceTab(openSla, 'SlaBreached', head, 'team', 'final'), true);

  const splitMe = countServiceSlaKpiSplit([pendingHeadSla, pendingL1Sla], (row, tab) => (
    matchesRefexMonitoringServiceTab(row, tab, head, 'me', 'final')
  ));
  assert.equal(splitMe.slaBreachedOpen, 1);
  assert.equal(splitMe.slaBreachedClosed, 0);

  const splitTeam = countServiceSlaKpiSplit([pendingHeadSla, pendingL1Sla, openSla], (row, tab) => (
    matchesRefexMonitoringServiceTab(row, tab, head, 'team', 'final')
  ));
  assert.equal(splitTeam.slaBreachedOpen, 1);
});

check('Manager Me SLA includes IT Manager Approval breaches; Agent Open SLA is unchanged', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const manager = { _id: 'UsMgr1', Email: 'mgr@refex.co.in', Name: 'Manager' };
  const pendingMgrSla = {
    id: 'PkMgrPendSla1',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Manager Approval',
    activeWorkflowStep: 'IT Manager Approval',
    itemStatusRaw: 'Open',
    slaBreached: true,
    slaElapsedMinutes: 200,
    serviceQueueSlaMinutes: 60,
    isLiveBucketPending: true,
    isLiveApprovalPending: true,
    assignedToRaw: [{ Kind: 'AppRole', Name: 'IT Manager' }],
    raw: { _id: 'PkMgrPendSla1', _status: 'InProgress', _current_step: 'IT Manager Approval' },
  };
  assert.equal(matchesRefexMonitoringServiceTab(pendingMgrSla, 'OpenTickets', manager, 'me', 'first'), false);
  assert.equal(matchesRefexMonitoringServiceTab(pendingMgrSla, 'SlaBreached', manager, 'me', 'first'), true);
  assert.equal(matchesRefexMonitoringServiceTab(pendingMgrSla, 'SlaBreached', manager, 'team', 'first'), false);
  const split = countServiceSlaKpiSplit([pendingMgrSla], (row, tab) => (
    matchesRefexMonitoringServiceTab(row, tab, manager, 'me', 'first')
  ));
  assert.equal(split.slaBreachedOpen, 1);
  assert.equal(matchesRefexTechSupportTab(pendingMgrSla, 'SlaBreached', manager), false);
});

check('Extrovis closed Assigned To prefers Solution solver over PickUp assignee', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const closed = {
    id: 'PkExtClosed1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    currentStep: 'Completed',
    activeWorkflowStep: 'Completed',
    itemStatusRaw: 'Closed',
    assignedTo: 'Vishnu Gullapally',
    assignedToDisplay: 'Vishnu Gullapally',
    assignedToUserRaw: [{ Name: 'Vishnu Gullapally' }],
    itAgentActivities: [
      {
        id: 'pickup1',
        step: 'IT Tech',
        status: 'Completed',
        actedAt: '2026-08-24T18:00:00Z',
        actedBy: 'Vishnu Gullapally',
      },
      {
        id: 'solution1',
        step: 'IT Tech Support',
        status: 'Completed',
        actedAt: '2026-08-21T14:20:00Z',
        actedBy: 'Nagesh Boyina',
      },
    ],
    agentSolutions: [{ agentName: 'Nagesh Boyina', resolution: 'Resolved.' }],
    raw: { _id: 'PkExtClosed1', _status: 'Completed', _current_step: 'Completed' },
  };
  assert.equal(getAssignedToDisplay(closed), 'Nagesh Boyina');
  assert.equal(getClosedByDisplay(closed), 'Nagesh Boyina');
  assert.equal(normalizeSolverName(pickLatestTicketSolver(closed)), 'nagesh boyina');
});

check('Extrovis closed solver reads Solution StepField before PickUp on raw report row', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const rawItem = {
    _id: 'PkExtRaw1',
    _status: 'Completed',
    _current_step: 'Completed',
    Column_7Fn1867jLF: [{ Name: 'Vishnu Gullapally' }],
    Column_9uwhycudkA: [{ Name: 'Vishnu Gullapally' }],
    Column_7WajlrHQ7C: [{
      _id: 'pickup1',
      Status: 'Completed',
      ActedAt: '2026-08-24T18:00:00Z',
      ActedBy: { Name: 'Vishnu Gullapally' },
    }],
    'Column_hqa27TIa-1': [{
      _id: 'solution1',
      Status: 'Completed',
      ActedAt: '2026-08-21T14:20:00Z',
      ActedBy: { Name: 'Nagesh Boyina' },
    }],
    _modified_by: { Name: 'Nagesh Boyina' },
  };
  const mapped = mapRefexEmployeeRow(rawItem);
  assert.equal(normalizeSolverName(mapped.assignedToDisplay), 'nagesh boyina');
  assert.equal(normalizeSolverName(getAssignedToDisplay(mapped)), 'nagesh boyina');
});

check('Extrovis closed solver uses modifiedBy when only PickUp assignee is on report', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const closed = {
    id: 'PkExtMod1',
    status: 'Completed',
    systemStatus: 'Completed',
    assignedToDisplay: 'Vishnu Gullapally',
    assignedToUserRaw: [{ Name: 'Vishnu Gullapally' }],
    itAgentActivities: [{
      id: 'pickup1',
      step: 'IT Tech',
      status: 'Completed',
      actedAt: '2026-08-24T18:00:00Z',
      actedBy: 'Vishnu Gullapally',
    }],
    modifiedBy: 'Nagesh Boyina',
    raw: {
      _id: 'PkExtMod1',
      _status: 'Completed',
      _modified_by: { Name: 'Nagesh Boyina' },
      Column_7WajlrHQ7C: [{
        Status: 'Completed',
        ActedBy: { Name: 'Vishnu Gullapally' },
      }],
    },
  };
  assert.equal(normalizeSolverName(pickLatestTicketSolver(closed)), 'nagesh boyina');
  assert.equal(getAssignedToDisplay(closed), 'Nagesh Boyina');
});

check('Requester / Assigned To filter options dedupe case and alias fields', () => {
  const rows = [
    {
      requesterName: 'Mohamed Aasik',
      createdBy: 'mohamed aasik',
      assignedTo: 'Priya Manager',
      assignedToDisplay: 'priya manager',
      assignedToRaw: [{ Name: 'Priya Manager', Email: 'priya@refex.co.in' }],
    },
    {
      requester: 'Jane Doe',
      requesterName: 'jane doe',
      assignedTo: 'ITSM BOT, Priya Manager',
      assignedToRaw: [{ Name: 'Priya Manager' }],
    },
  ];
  const requesters = collectRequesterFilterOptions(rows);
  const assignees = collectAssigneeFilterOptions(rows);
  assert.equal(requesters.length, 2);
  assert.equal(assignees.length, 2);
  assert.ok(requesters.some((n) => n.toLowerCase() === 'mohamed aasik'));
  assert.ok(requesters.some((n) => n.toLowerCase() === 'jane doe'));
  assert.ok(assignees.some((n) => n.toLowerCase() === 'priya manager'));
  assert.ok(assignees.some((n) => n.toLowerCase() === 'itsm bot'));
  const filtered = applyMisColumnFilters(rows, { requester: 'mohamed aasik' });
  assert.equal(filtered.length, 1);
});

check('Assigned To merges Porcheiziyan / Porcheiziyan M and aliases IT Manager/Head', () => {
  assert.equal(displayItsmPersonName('IT Manager'), 'Sakthivel');
  assert.equal(displayItsmPersonName('IT Head'), 'Mugesh');
  const assignees = collectAssigneeFilterOptions([
    { assignedToDisplay: 'Porcheiziyan' },
    { assignedToDisplay: 'Porcheiziyan M' },
    { assignedToDisplay: 'IT Manager' },
  ]);
  assert.equal(assignees.filter((n) => /porcheiziyan/i.test(n)).length, 1);
  assert.ok(assignees.includes('Sakthivel'));
  assert.ok(!assignees.includes('IT Manager'));
  const filtered = applyMisColumnFilters(
    [
      { assignedToDisplay: 'Porcheiziyan' },
      { assignedToDisplay: 'Porcheiziyan M' },
    ],
    { assignedTo: 'Porcheiziyan M' },
  );
  assert.equal(filtered.length, 2);
});

check('Comments save payload: Refex omits Stages_1; Extrovis includes it; row id is 10 hex', async () => {
  const {
    generateAgentSolutionRowId,
    buildAgentSolutionCommentPayload,
    resolveCommentAuthorName,
  } = await import('../src/itsm/refex/employeedashboard/agentSolutionCommentApi.js');

  const rowId = generateAgentSolutionRowId();
  assert.match(rowId, /^IT__Agent_Solution_[0-9a-f]{10}$/);
  assert.notEqual(generateAgentSolutionRowId(), rowId);

  assert.equal(resolveCommentAuthorName({ Name: 'Aasik' }), 'Aasik');
  assert.equal(resolveCommentAuthorName({ Name: 'aasik@refex.co.in', FirstName: 'Aasik' }), 'Aasik');
  assert.equal(resolveCommentAuthorName({ Name: 'aasik@refex.co.in' }), '');

  const refex = buildAgentSolutionCommentPayload({
    instanceId: 'PkComment1',
    comment: 'Need the asset tag',
    authorName: 'Aasik',
    extrovis: false,
    rowId,
  });
  assert.equal(refex._id, 'PkComment1');
  assert.equal(refex['Table::IT__Agent_Solution'].length, 1);
  assert.equal(refex['Table::IT__Agent_Solution'][0]._id, rowId);
  assert.equal(refex['Table::IT__Agent_Solution'][0].Name_1, 'Aasik');
  assert.equal(refex['Table::IT__Agent_Solution'][0].Resolution, 'Need the asset tag');
  assert.equal('Stages_1' in refex['Table::IT__Agent_Solution'][0], false);
  assert.equal('It_Agent_Solution' in refex, false);

  const extrovis = buildAgentSolutionCommentPayload({
    instanceId: 'PkComment1',
    comment: 'Need the asset tag',
    authorName: 'Aasik',
    extrovis: true,
    rowId,
  });
  assert.equal(extrovis['Table::IT__Agent_Solution'][0].Stages_1, 'InProgress');
  assert.equal(extrovis['Table::IT__Agent_Solution'][0].Comments_2, 'Internal');
  assert.equal('It_Agent_Solution' in extrovis, false);

  const userComment = buildAgentSolutionCommentPayload({
    instanceId: 'PkComment1',
    comment: 'Need the asset tag',
    authorName: 'Aasik',
    extrovis: true,
    rowId,
    commentsType: 'User',
  });
  assert.equal(userComment['Table::IT__Agent_Solution'][0].Comments_2, 'User');
  assert.equal('Comments_2' in refex['Table::IT__Agent_Solution'][0], false);

  const employeeHelpdesk = buildAgentSolutionCommentPayload({
    instanceId: 'PkComment1',
    comment: 'Still not working',
    authorName: 'Aasik',
    extrovis: true,
    rowId,
    commentsType: 'User',
    attachments: [{ name: 'error.png', id: 'Attach_emp' }],
  });
  assert.equal(employeeHelpdesk['Table::IT__Agent_Solution'][0].Comments_2, 'User');
  assert.equal(employeeHelpdesk['Table::IT__Agent_Solution'][0].Attachments[0].name, 'error.png');

  const withFiles = buildAgentSolutionCommentPayload({
    instanceId: 'PkComment1',
    comment: '',
    authorName: 'Aasik',
    extrovis: true,
    rowId,
    attachments: [{ name: 'shot.png', id: 'Attach_abc' }],
  });
  assert.equal(withFiles['Table::IT__Agent_Solution'][0].Resolution, '');
  assert.equal(withFiles['Table::IT__Agent_Solution'][0].Attachments.length, 1);
  assert.equal(refex['Table::IT__Agent_Solution'][0].Attachments, undefined);
});

check('Non-Refex Comments_2 channel matching and MIS labels', async () => {
  const {
    commentMatchesChannel,
    isEmployeeVisibleComment,
    getExtrovisMisSubjectLabel,
    getExtrovisMisStagesLabel,
    COMMENT_CHANNEL_INTERNAL,
    COMMENT_CHANNEL_USER,
  } = await import('../src/itsm/refex/employeedashboard/commentChannel.js');
  assert.equal(commentMatchesChannel({ commentsType: '' }, COMMENT_CHANNEL_INTERNAL), true);
  assert.equal(commentMatchesChannel({ commentsType: '' }, COMMENT_CHANNEL_USER), false);
  assert.equal(commentMatchesChannel({ role: 'reopen', commentsType: '' }, COMMENT_CHANNEL_USER), true);
  assert.equal(commentMatchesChannel({ role: 'reopen', commentsType: 'Internal' }, COMMENT_CHANNEL_INTERNAL), false);
  assert.equal(isEmployeeVisibleComment({ role: 'reopen', comment: 'Need this reopened' }), true);
  assert.equal(commentMatchesChannel({ commentsType: 'Internal' }, COMMENT_CHANNEL_USER), false);
  assert.equal(commentMatchesChannel({ commentsType: 'External' }, COMMENT_CHANNEL_INTERNAL), true);
  assert.equal(commentMatchesChannel({ commentsType: 'User' }, COMMENT_CHANNEL_INTERNAL), false);
  assert.equal(commentMatchesChannel({ commentsType: { Name: 'User' } }, COMMENT_CHANNEL_USER), true);
  assert.equal(commentMatchesChannel({ commentsType: { Name: 'Internal' } }, COMMENT_CHANNEL_USER), false);
  assert.equal(isEmployeeVisibleComment({ commentsType: 'User' }), true);
  assert.equal(isEmployeeVisibleComment({ commentsType: 'Internal' }), false);
  assert.equal(isEmployeeVisibleComment({ commentsType: '' }), false);
  assert.equal(getExtrovisMisSubjectLabel({ subject: '' }), '-');
  assert.equal(getExtrovisMisSubjectLabel({ subject: 'VPN down' }), 'VPN down');
  setITDashboardProfile(EXTROVIS_PROFILE);
  assert.equal(getExtrovisMisStagesLabel({ processStages: 'OnHold' }, 'OpenTickets'), 'OnHold');
  assert.equal(getExtrovisMisStagesLabel({ processStages: '' }, 'OpenTickets'), '');
  assert.equal(getExtrovisMisStagesLabel({ processStages: 'InProgress' }, 'AssignedToMe'), 'InProgress');
  assert.equal(getExtrovisMisStagesLabel({ processStages: 'InProgress' }, 'Closed'), 'Closed');
  assert.equal(getExtrovisMisStagesLabel({ processStages: 'Closed', ticketStage: 'Closed' }, 'OpenTickets'), 'Closed');
  setITDashboardProfile(REFEX_PROFILE);
  assert.equal(getExtrovisMisStagesLabel({ processStages: 'Hold', currentStep: 'IT Tech Support' }, 'OpenTickets'), 'OnHold');
  assert.equal(getExtrovisMisStagesLabel({ processStages: 'Pending with Vendor' }, 'OpenTickets'), 'Pending with Vendor');
});

check('Employee Open landing keeps Status=Open tickets without currentStep', async () => {
  const { getEmployeeDisplayStatus, matchesEmployeeStatusFilter } = await import(
    '../src/itsm/refex/employeedashboard/employeeStatus.js'
  );
  const row = {
    id: 'open-no-step',
    ticketStage: 'Open',
    processStages: 'Open',
    statu: 'Open',
    systemStatus: 'InProgress',
    workflowStatus: 'InProgress',
    currentStep: '',
  };
  assert.equal(getEmployeeDisplayStatus(row), 'Open');
  assert.equal(matchesEmployeeStatusFilter(row, 'Open', null), true);
  const closedByStatus = enrichEmployeeRowCompletion({
    id: 'status-closed-live',
    statu: 'Closed',
    ticketStage: 'Closed',
    systemStatus: 'InProgress',
    raw: { _status: 'InProgress' },
  });
  assert.equal(closedByStatus.isProcessCompleted, false);
});

check('Employee Pending Approval is live L1/L2 only and stays out of My Tickets KPIs', async () => {
  const { computeEmployeeKpis, filterEmployeeRows } = await import(
    '../src/itsm/refex/employeedashboard/computeKpis.js'
  );
  const { isEmployeeLivePendingApproval } = await import(
    '../src/itsm/refex/employeedashboard/employeeStatus.js'
  );
  const user = { Email: 'hod@refex.co.in', _id: 'hod-1' };
  const mineOpen = {
    id: 'mine-open',
    requesterEmail: 'hod@refex.co.in',
    currentStep: 'IT Tech Support',
    ticketStage: 'Open',
    processStages: 'Open',
    statu: 'Open',
    systemStatus: 'InProgress',
    workflowStatus: 'InProgress',
  };
  const teamL1 = {
    id: 'team-l1',
    requesterEmail: 'teammate@refex.co.in',
    currentStep: 'L1 Approval',
    isLiveApprovalPending: true,
    liveApprovalPendingKnown: true,
    isLiveBucketPending: true,
    isLiveReopenPending: false,
    ticketStage: 'Open',
    processStages: 'Open',
    statu: 'Open',
    systemStatus: 'InProgress',
    workflowStatus: 'InProgress',
  };
  assert.equal(isEmployeeLivePendingApproval(teamL1), true);
  assert.equal(isEmployeeLivePendingApproval(mineOpen), false);
  const kpis = computeEmployeeKpis([mineOpen, teamL1], user);
  assert.equal(kpis.All, 1);
  assert.equal(kpis.open, 1);
  assert.equal(kpis.pendingApproval, 1);
  assert.equal(filterEmployeeRows([mineOpen, teamL1], { statusTab: 'Open', user }).length, 1);
  assert.equal(filterEmployeeRows([mineOpen, teamL1], { statusTab: 'PendingTask', user }).length, 1);
});

check('Kissflow account id prefers SDK then development vs live host', () => {
  assert.equal(resolveAccountId({ account: { _id: DEV_ACCOUNT_ID } }), DEV_ACCOUNT_ID);
  assert.equal(resolveAccountId({ account: { _id: DEFAULT_ACCOUNT_ID } }), DEFAULT_ACCOUNT_ID);
});

check('Kissflow attachment Url/photos resolve for comment screenshots', () => {
  assert.equal(resolveAttachmentUrl({ Url: 'https://storage.example/shot.png', name: 'shot.png' }), 'https://storage.example/shot.png');
  assert.equal(resolveAttachmentUrl({
    name: 'shot.png',
    photos: [{ Url: 'https://storage.example/thumb.png' }],
  }), 'https://storage.example/thumb.png');
  assert.equal(isImageAttachment({ name: 'shot.png' }), true);
  assert.equal(isImageAttachment({ name: 'notes.pdf' }), false);
  assert.equal(isImageAttachment({ photos: [{ size: '100x100' }] }), true);
});

check('Kissflow comment attachments map a single file object and upload/2 object path', async () => {
  const { buildKissflowUploadObjectPath, getKissflowAttachmentKey } = await import('../src/lib/kfFileBlob.js');
  const key = getKissflowAttachmentKey({
    key: 'Live_IT_Service_Request_Extrovis_A00/PkE3Aostr_Bz/PkE48YUGGvpd/IT__Agent_Solution/IT__Agent_Solution_d7d3546607/Attach_VRfFTQUSXX/Screenshot.png',
  }, { thumbnail: false });
  assert.equal(key.includes('Attach_VRfFTQUSXX'), true);
  const thumb = buildKissflowUploadObjectPath('AcCMptp3yqcn', key, { thumbnail: true });
  assert.equal(thumb.startsWith('/upload/2/AcCMptp3yqcn/Live_IT_Service_Request_Extrovis_A00/'), true);
  assert.equal(thumb.endsWith('/Attach_VRfFTQUSXX/photos/100x100.png'), true);
  assert.equal(thumb.includes('?key='), false);
  assert.equal(thumb.includes('/file/2/'), false);
  const original = buildKissflowUploadObjectPath('AcCMptp3yqcn', key, { thumbnail: false });
  assert.equal(original.endsWith('/Attach_VRfFTQUSXX/Screenshot.png'), true);

  const { getAttachmentKind, decodeAttachmentText } = await import('../src/lib/kfFileBlob.js');
  assert.equal(getAttachmentKind({ name: 'notes.txt', mimeType: 'text/plain' }), 'text');
  assert.equal(getAttachmentKind({
    key: 'Live_IT_Service_Request_Extrovis_A00/Pk1/Pk2/IT__Agent_Solution/row1/Attach_abc/notes.txt',
  }), 'text');
  const txtPath = buildKissflowUploadObjectPath(
    'AcCMptp3yqcn',
    'Live_IT_Service_Request_Extrovis_A00/Pk1/Pk2/IT__Agent_Solution/row1/Attach_abc/notes.txt',
    { thumbnail: true },
  );
  assert.equal(txtPath.endsWith('/notes.txt'), true);
  assert.equal(txtPath.includes('/photos/'), false);
  const utf8 = await decodeAttachmentText(new Blob(['hello from txt'], { type: 'text/plain' }));
  assert.equal(utf8, 'hello from txt');
  const utf16 = new Uint8Array([0xFF, 0xFE, 0x48, 0x00, 0x69, 0x00]);
  assert.equal(await decodeAttachmentText(new Blob([utf16])), 'Hi');

  const { isGcsSignedUrl, gcsSignedUrlIsFresh, getKissflowAttachmentPreviewSrc, isPlayablePreviewUrl } = await import('../src/lib/kfFileBlob.js');
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const now = new Date();
  const date = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const gcs = `https://storage.googleapis.com/aries-cs-doc-p001/AcCMptp3yqcn/file.png?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Date=${date}&X-Goog-Expires=300&X-Goog-Signature=abc`;
  assert.equal(isGcsSignedUrl(gcs), true);
  assert.equal(gcsSignedUrlIsFresh(gcs), true);
  assert.equal(isPlayablePreviewUrl(gcs), true);
  assert.equal(isPlayablePreviewUrl('https://development-refexgroup.kissflow.com/upload/2/acct/notes.txt'), false);
  assert.equal(isPlayablePreviewUrl('blob:https://development-refexgroup.kissflow.com/abc'), true);
  assert.equal(isGcsSignedUrl('/upload/2/AcCMptp3yqcn/file.png'), false);
  assert.equal(getKissflowAttachmentPreviewSrc(null, { Url: gcs, name: 'file.png' }), gcs);
  assert.equal(getKissflowAttachmentPreviewSrc(null, { key, name: 'Screenshot.png' }), '');
  const { peekKissflowAttachmentCache, loadKissflowAttachment } = await import('../src/lib/kfFileBlob.js');
  const cached = await loadKissflowAttachment(null, { Url: gcs, key: 'cache-key.png' }, { thumbnail: true });
  assert.equal(cached.url, gcs);
  assert.equal(peekKissflowAttachmentCache({ key: 'cache-key.png' }, { thumbnail: true }), gcs);
  assert.equal(gcsSignedUrlIsFresh('https://storage.googleapis.com/x/file.png?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Date=20200101T000000Z&X-Goog-Expires=300&X-Goog-Signature=abc'), false);

  setITDashboardProfile(EXTROVIS_PROFILE);
  const mapped = mapRefexEmployeeRow({
    _id: 'PkAttach1',
    'Table::IT__Agent_Solution': [{
      _id: 'IT__Agent_Solution_aaaaaaaaaa',
      Resolution: 'Internal',
      Comments_2: 'Internal',
      Name_1: 'asik',
      Attachments: {
        id: 'Attach_1',
        name: 'shot.png',
        key: 'process/PkAttach1/shot.png',
        photos: [{ size: '100x100', key: 'process/PkAttach1/100x100.png' }],
      },
    }],
  });
  assert.equal(mapped.agentSolutions[0].attachments.length, 1);
  assert.equal(mapped.agentSolutions[0].attachments[0].name, 'shot.png');
  setITDashboardProfile(REFEX_PROFILE);
});

check('Extrovis comments omit IT Tech Support progress notes', async () => {
  const { collectAgentResolutionNotesFromProgress } = await import(
    '../src/itsm/refex/employeedashboard/progressApi.js'
  );
  setITDashboardProfile(EXTROVIS_PROFILE);
  const notes = collectAgentResolutionNotesFromProgress({
    Steps: [
      {
        Name: 'IT Tech Support',
        NodeType: 'UserTask',
        _status: 'Completed',
        Note: 'Progress duplicate',
        ActedBy: { Name: 'Asik' },
        ActedAt: '2026-09-01T10:00:00Z',
        _activity_instance_id: 'act-tech',
      },
    ],
  });
  assert.equal(notes.length, 0);
  setITDashboardProfile(REFEX_PROFILE);
});

check('Comment authors match signed-in name (WhatsApp mine)', async () => {
  const { commentAuthorsMatch } = await import(
    '../src/itsm/refex/employeedashboard/agentSolutionCommentApi.js'
  );
  assert.equal(commentAuthorsMatch('Aasik', 'Aasik'), true);
  assert.equal(commentAuthorsMatch('Mohamed Aasik', 'Aasik'), true);
  assert.equal(commentAuthorsMatch('Aasik', 'Mohamed Aasik'), true);
  assert.equal(commentAuthorsMatch('Priya Manager', 'Aasik'), false);
  assert.equal(commentAuthorsMatch('aasik@refex.co.in', 'Aasik'), false);
});

check('Comments save picks the live InProgress activity, not a completed step', async () => {
  const {
    pickInProgressAgentCommentActivity,
    listCommentActivityInstanceIdsFromProgress,
    listInProgressCommentActivityIdsFromProgress,
  } = await import(
    '../src/itsm/refex/employeedashboard/progressApi.js'
  );

  const picked = pickInProgressAgentCommentActivity({
    Steps: [
      {
        Name: 'IT Tech Pickup',
        NodeType: 'UserTask',
        _status: 'Completed',
        _activity_instance_id: 'act-pickup-done',
      },
      {
        Name: 'IT Tech Support',
        NodeType: 'UserTask',
        _status: 'InProgress',
        _activity_instance_id: 'act-support-live',
      },
    ],
  }, { id: 'Pk1' });
  assert.equal(picked?.activityInstanceId, 'act-support-live');

  const closedIds = listCommentActivityInstanceIdsFromProgress({
    Steps: [
      {
        Name: 'IT Agent PickUp',
        NodeType: 'UserTask',
        _status: 'Completed',
        _activity_instance_id: 'act-ext-pickup',
      },
      {
        Name: 'IT Agent Solution',
        NodeType: 'UserTask',
        _status: 'Completed',
        _activity_instance_id: 'act-ext-solution',
      },
    ],
  }, { id: 'PkClosedComments' });
  assert.equal(closedIds[0], 'act-ext-solution');
  assert.ok(closedIds.includes('act-ext-pickup'));

  const afterDep = pickInProgressAgentCommentActivity({
    Steps: [
      {
        Name: 'IT Tech Support After Dependency',
        NodeType: 'UserTask',
        _status: 'InProgress',
        _activity_instance_id: 'act-after-dep',
      },
    ],
  }, { id: 'PkAfter' });
  assert.equal(afterDep?.activityInstanceId, 'act-after-dep');

  const completedOnly = pickInProgressAgentCommentActivity({
    Steps: [
      {
        Name: 'IT Agent PickUp',
        NodeType: 'UserTask',
        _status: 'Completed',
        _activity_instance_id: 'act-ext-pickup',
      },
    ],
  }, { id: 'PkDone' });
  assert.equal(completedOnly, null);

  const employeeLive = listInProgressCommentActivityIdsFromProgress({
    Steps: [
      {
        Name: 'IT Agent PickUp',
        NodeType: 'UserTask',
        _status: 'Completed',
        _activity_instance_id: 'act-pick',
      },
      {
        Name: 'IT Agent Solution',
        NodeType: 'UserTask',
        _status: 'InProgress',
        _activity_instance_id: 'act-sol',
      },
    ],
  }, { id: 'PkEmpOpen1' });
  assert.deepEqual(employeeLive, ['act-sol']);

  const {
    listInProgressSolutionCommentActivityIdsFromProgress,
  } = await import('../src/itsm/refex/employeedashboard/progressApi.js');
  const pickupOnlyIds = listInProgressSolutionCommentActivityIdsFromProgress({
    Steps: [
      {
        Name: 'IT Agent PickUp',
        NodeType: 'UserTask',
        _status: 'InProgress',
        _activity_instance_id: 'act-pick-live',
      },
    ],
  }, { id: 'PkEmpPickup' });
  assert.deepEqual(pickupOnlyIds, []);
  const solutionOnlyIds = listInProgressSolutionCommentActivityIdsFromProgress({
    Steps: [
      {
        Name: 'IT Agent PickUp',
        NodeType: 'UserTask',
        _status: 'Completed',
        _activity_instance_id: 'act-pick-done',
      },
      {
        Name: 'IT Agent Solution',
        NodeType: 'UserTask',
        _status: 'InProgress',
        _activity_instance_id: 'act-sol-live',
      },
    ],
  }, { id: 'PkEmpSolution' });
  assert.deepEqual(solutionOnlyIds, ['act-sol-live']);
});

check('Comments send follows KPI cards on every dashboard (no step filter)', async () => {
  const { canComposeAgentTicketComment } = await import(
    '../src/itsm/refex/employeedashboard/agentSolutionCommentApi.js'
  );
  assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'OpenTickets' }), true);
  assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'Open' }), true);
  assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'AssignedToMe' }), false);
  assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'AllTickets' }), false);
  assert.equal(canComposeAgentTicketComment({ extrovis: false, tabKey: 'Closed' }), false);
  assert.equal(canComposeAgentTicketComment({ extrovis: true, tabKey: 'AssignedToMe' }), true);
  assert.equal(canComposeAgentTicketComment({ extrovis: true, tabKey: 'Open' }), true);
  assert.equal(canComposeAgentTicketComment({ extrovis: true, tabKey: 'OpenTickets' }), false);
  assert.equal(canComposeAgentTicketComment({ extrovis: true, tabKey: 'AllTickets' }), false);
  assert.equal(canComposeAgentTicketComment({ extrovis: true, tabKey: 'Closed' }), false);
});

check('Employee Extrovis comments compose only at IT Agent Solution, not PickUp', async () => {
  const { isExtrovisSolutionCommentStep } = await import(
    '../src/itsm/refex/employeedashboard/commentChannel.js'
  );
  const {
    canComposeAgentTicketComment,
    ticketIsAtExtrovisSolutionCommentStep,
  } = await import(
    '../src/itsm/refex/employeedashboard/agentSolutionCommentApi.js'
  );
  assert.equal(isExtrovisSolutionCommentStep('IT Agent Solution'), true);
  assert.equal(isExtrovisSolutionCommentStep('IT Agent PickUp'), false);
  assert.equal(isExtrovisSolutionCommentStep('IT Agent Pick'), false);

  const pickupProgress = {
    Steps: [
      {
        Name: 'IT Agent PickUp',
        NodeType: 'UserTask',
        _status: 'InProgress',
        _activity_instance_id: 'act-pick-live',
      },
    ],
  };
  const solutionProgress = {
    Steps: [
      {
        Name: 'IT Agent PickUp',
        NodeType: 'UserTask',
        _status: 'Completed',
        _activity_instance_id: 'act-pick-done',
      },
      {
        Name: 'IT Agent Solution',
        NodeType: 'UserTask',
        _status: 'InProgress',
        _activity_instance_id: 'act-sol-live',
      },
    ],
  };
  const pickupRow = { id: 'TkPickup', currentStep: 'IT Agent PickUp' };
  const solutionRow = { id: 'TkSolution', currentStep: 'IT Agent Solution' };

  assert.equal(ticketIsAtExtrovisSolutionCommentStep({ row: pickupRow, progress: pickupProgress }), false);
  assert.equal(ticketIsAtExtrovisSolutionCommentStep({ row: solutionRow, progress: solutionProgress }), true);
  assert.equal(ticketIsAtExtrovisSolutionCommentStep({ row: pickupRow }), false);
  assert.equal(ticketIsAtExtrovisSolutionCommentStep({ row: solutionRow }), true);

  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'Open',
    role: 'employee',
    row: pickupRow,
    progress: pickupProgress,
  }), false);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'Open',
    role: 'employee',
    row: solutionRow,
    progress: solutionProgress,
  }), true);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'Closed',
    role: 'employee',
    row: solutionRow,
    progress: solutionProgress,
  }), false);

  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'AssignedToMe',
    row: solutionRow,
    progress: solutionProgress,
  }), true);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'AllTickets',
    row: solutionRow,
    progress: solutionProgress,
  }), true);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'OpenTickets',
    row: solutionRow,
    progress: solutionProgress,
  }), false);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'OpenTickets',
    scope: 'me',
    row: pickupRow,
    progress: pickupProgress,
  }), false);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'OpenTickets',
    scope: 'team',
    row: pickupRow,
    progress: pickupProgress,
  }), false);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'OpenTickets',
    scope: 'team',
    row: solutionRow,
    progress: solutionProgress,
  }), true);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'AllTickets',
    row: pickupRow,
    progress: pickupProgress,
  }), false);
  assert.equal(canComposeAgentTicketComment({
    extrovis: true,
    tabKey: 'Closed',
    row: solutionRow,
    progress: solutionProgress,
  }), false);
});

check('Extrovis employee Send uses admin PUT, not process.update-item', async () => {
  const src = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/itsm/refex/employeedashboard/agentSolutionCommentApi.js', import.meta.url),
    'utf8',
  ));
  assert.equal(/if \(extrovis && !employee\)/.test(src), false);
  assert.equal(/if \(extrovis\) \{\s*\n\s*await putExtrovisAdminComment/.test(src), true);
  assert.equal(/process\.updateItem/.test(src), true);
});

check('Kishore Team Solution reassign uses admin assigned-from, not PickUp', async () => {
  const {
    canKishoreTeamSolutionReassign,
    canAdminKeyedReassign,
    pickReassignedFrom,
    pickLiveSolutionContext,
  } = await import('../src/lib/extrovisIntegrationApi.js');

  const solutionRow = { id: 'PkSol', currentStep: 'IT Agent Solution' };
  const pickupRow = { id: 'PkPick', currentStep: 'IT Agent PickUp' };
  const kishore = 'Kishore.Yepuri@extrovis.com';

  assert.equal(canKishoreTeamSolutionReassign({
    email: kishore,
    scope: 'team',
    row: solutionRow,
    isExtrovis: true,
    tabKey: 'AllTickets',
  }), true);
  assert.equal(canKishoreTeamSolutionReassign({
    email: kishore,
    scope: 'me',
    row: solutionRow,
    isExtrovis: true,
    tabKey: 'AssignedToMe',
  }), false);
  assert.equal(canKishoreTeamSolutionReassign({
    email: kishore,
    scope: 'team',
    row: pickupRow,
    isExtrovis: true,
    tabKey: 'OpenTickets',
  }), false);
  assert.equal(canKishoreTeamSolutionReassign({
    email: kishore,
    scope: 'team',
    row: solutionRow,
    isExtrovis: true,
    tabKey: 'Closed',
  }), false);
  assert.equal(canKishoreTeamSolutionReassign({
    email: 'jon.hudanich@kavispharma.com',
    scope: 'team',
    row: solutionRow,
    isExtrovis: true,
    tabKey: 'AllTickets',
  }), false);
  assert.equal(canKishoreTeamSolutionReassign({
    email: kishore,
    scope: 'team',
    row: solutionRow,
    isExtrovis: false,
    tabKey: 'AllTickets',
  }), false);
  assert.equal(canAdminKeyedReassign({
    email: kishore,
    scope: 'team',
    row: solutionRow,
    isExtrovis: true,
    tabKey: 'AllTickets',
    role: 'first',
  }), true);
  assert.equal(canAdminKeyedReassign({
    email: kishore,
    scope: 'team',
    row: solutionRow,
    isExtrovis: true,
    tabKey: 'AllTickets',
    role: 'final',
  }), true);
  assert.equal(canAdminKeyedReassign({
    email: 'head@refex.co.in',
    scope: 'team',
    row: { id: 'PkRefex1', currentStep: 'IT Tech' },
    isRefex: true,
    tabKey: 'OpenTickets',
    role: 'final',
    headerRoleLabel: 'IT Head',
  }), true);
  assert.equal(canAdminKeyedReassign({
    email: 'manager@refex.co.in',
    scope: 'me',
    row: { id: 'PkRefex2', currentStep: 'IT Manager Approval' },
    isRefex: true,
    tabKey: 'PendingTask',
    role: 'first',
    headerRoleLabel: 'IT Manager',
  }), true);
  assert.equal(canAdminKeyedReassign({
    email: 'admin@refex.co.in',
    scope: 'all',
    row: { id: 'PkRefex3' },
    isRefex: true,
    tabKey: 'OpenTickets',
    role: 'final',
    headerRoleLabel: 'Admin',
  }), false);
  assert.equal(canAdminKeyedReassign({
    email: 'agent@refex.co.in',
    scope: 'team',
    row: { id: 'PkAgentOpen', currentStep: 'IT Tech Support' },
    isRefex: true,
    tabKey: 'OpenTickets',
    headerRoleLabel: 'IT Agent',
  }), true);
  assert.equal(canAdminKeyedReassign({
    email: 'agent@refex.co.in',
    scope: 'me',
    row: { id: 'PkAgentMe', currentStep: 'IT Tech Support' },
    isRefex: true,
    tabKey: 'OpenTickets',
    headerRoleLabel: 'IT Agent',
  }), false);
  assert.equal(canAdminKeyedReassign({
    email: 'agent@refex.co.in',
    scope: 'team',
    row: { id: 'PkAgentClosed' },
    isRefex: true,
    tabKey: 'Closed',
    headerRoleLabel: 'IT Agent',
  }), false);
  assert.equal(canAdminKeyedReassign({
    email: 'agent@refex.co.in',
    scope: 'team',
    row: { id: 'PkAgentPending' },
    isRefex: true,
    tabKey: 'PendingTask',
    headerRoleLabel: 'IT Agent',
  }), false);
  assert.equal(canAdminKeyedReassign({
    email: 'agent@refex.co.in',
    scope: 'team',
    row: { id: 'PkAgentExt', currentStep: 'IT Agent PickUp' },
    isExtrovis: true,
    isRefex: false,
    tabKey: 'OpenTickets',
    headerRoleLabel: 'IT Agent',
  }), true);
  assert.equal(canAdminKeyedReassign({
    email: 'first@extrovis.com',
    scope: 'team',
    row: { id: 'PkFirstOpen', currentStep: 'IT Agent PickUp' },
    isExtrovis: true,
    tabKey: 'OpenTickets',
    headerRoleLabel: 'First Level Approver',
  }), true);
  assert.equal(canAdminKeyedReassign({
    email: 'final@extrovis.com',
    scope: 'me',
    row: { id: 'PkFinalMe', currentStep: 'IT Agent PickUp' },
    isExtrovis: true,
    tabKey: 'OpenTickets',
    headerRoleLabel: 'Final Level Approver',
  }), false);

  const item = {
    _current_step: 'IT Agent Solution',
    _current_assigned_to: [{ _id: 'UsNow', Name: 'Current', Kind: 'User' }],
    _current_context: [
      {
        _context_current_step: 'IT Agent Solution',
        _context_activity_instance_id: 'ActSol',
        _context_assigned_to: [{ _id: 'UsNow', Name: 'Current', Kind: 'User' }],
        _context_reassignments: [
          {
            To: { _id: 'UsNow', Name: 'Current', Kind: 'User' },
            From: [
              { _id: 'UsD4P9CEW5oa', Name: 'Balaraju Ilaveni', Kind: 'User' },
              { _id: 'UsDYHFU4f3ES', Name: 'asik', Kind: 'User' },
            ],
          },
        ],
      },
    ],
  };
  assert.equal(pickLiveSolutionContext(item)?._context_activity_instance_id, 'ActSol');
  assert.deepEqual(pickReassignedFrom(item), [
    { _id: 'UsD4P9CEW5oa', Name: 'Balaraju Ilaveni', Kind: 'User' },
    { _id: 'UsDYHFU4f3ES', Name: 'asik', Kind: 'User' },
  ]);

  const noHistory = {
    _current_step: 'IT Agent Solution',
    _current_assigned_to: [{ _id: 'UsNow', Name: 'Current', Kind: 'User' }],
    _current_context: [
      {
        _context_current_step: 'IT Agent Solution',
        _context_activity_instance_id: 'ActSol',
        _context_assigned_to: [{ _id: 'UsNow', Name: 'Current', Kind: 'User' }],
        _context_reassignments: [],
      },
    ],
  };
  assert.deepEqual(pickReassignedFrom(noHistory), [
    { _id: 'UsNow', Name: 'Current', Kind: 'User' },
  ]);
});

check('Venwind entity tab includes Venwind rows; Refex tab excludes them', async () => {
  const {
    filterRowsByEntityKey,
    extractRefexCompanyNameFromItem,
    resolveModernMisChromeEntityKey,
    usesModernMisChrome,
    resolveEntityProcessDatasetKey,
    sharesEntityProcessDataset,
    getApproverServiceTabs,
    REFEX_MONITORING_SERVICE_TABS,
  } = await import('../src/lib/kfITServiceDashboard.js');

  const venwind = {
    id: 'PkVen1',
    requestId: 'IT-SR-FY026-0101',
    companyName: 'Venwind Refex Power Limited',
    company: 'Venwind Refex Power Limited',
    entity: 'Refex',
  };
  const venwindLookup = {
    id: 'PkVen2',
    requestId: 'IT-SR-FY026-0102',
    entity: 'Refex',
    raw: {
      Column_bRn4sBWeeF: [{ Company_Name: 'Venwind Refex Power Limited' }],
    },
  };
  const refexRow = {
    id: 'PkRef1',
    requestId: 'IT-SR-FY026-0007',
    companyName: 'Refex Industries Limited',
    company: 'Refex Industries Limited',
    entity: 'Refex',
  };

  const venwindOnly = filterRowsByEntityKey([venwind, venwindLookup, refexRow], 'Venwind');
  assert.deepEqual(venwindOnly.map((row) => row.id).sort(), ['PkVen1', 'PkVen2']);

  const refexOnly = filterRowsByEntityKey([venwind, venwindLookup, refexRow], 'Refex');
  assert.deepEqual(refexOnly.map((row) => row.id), ['PkRef1']);

  assert.equal(
    extractRefexCompanyNameFromItem({ Column_bRn4sBWeeF: [{ Company_Name: 'Venwind Refex Power Limited' }] }),
    'Venwind Refex Power Limited',
  );

  assert.equal(resolveModernMisChromeEntityKey('Venwind'), 'Refex');
  assert.equal(usesModernMisChrome('Venwind'), true);
  assert.equal(resolveEntityProcessDatasetKey('Venwind'), 'RefexProcess');
  assert.equal(resolveEntityProcessDatasetKey('Refex'), 'RefexProcess');
  assert.equal(sharesEntityProcessDataset('Refex', 'Venwind'), true);
  assert.equal(sharesEntityProcessDataset('Refex', 'Extrovis'), false);
  assert.equal(getApproverServiceTabs('Venwind'), REFEX_MONITORING_SERVICE_TABS);
});

check('Extrovis entity All shows every ticket; named entity filters the row set', () => {
  assert.equal(EXTROVIS_DASHBOARD_DEFAULT_ENTITY, 'all');
  assert.equal(EXTROVIS_DASHBOARD_ENTITY_OPTIONS[0].key, 'all');
  assert.equal(EXTROVIS_DASHBOARD_ENTITY_OPTIONS[0].label, 'All');
  assert.equal(isExtrovisAllEntityTab('all'), true);
  assert.equal(isExtrovisAllEntityTab('All'), true);
  assert.equal(isExtrovisReportEntity('all'), false);
  assert.equal(isExtrovisServiceDashboardContext('all'), true);
  assert.equal(resolveModernMisChromeEntityKey('all'), 'Extrovis');
  assert.equal(usesModernMisChrome('all'), true);
  assert.equal(resolveEntityProcessDatasetKey('all'), 'ExtrovisProcess');
  assert.equal(resolveEntityProcessDatasetKey('Kavis'), 'ExtrovisProcess');
  assert.equal(resolveEntityProcessDatasetKey('Extrovis'), 'ExtrovisProcess');
  assert.equal(sharesEntityProcessDataset('all', 'Kavis'), true);
  assert.equal(resolveEntityProfile('all')?.id, 'extrovis');

  const rows = [
    { id: 'E1', entity: 'Extrovis' },
    { id: 'K1', entity: 'Kavis' },
    { id: 'M1', entity: 'Modepro' },
  ];
  assert.deepEqual(filterRowsByEntityKey(rows, 'all').map((row) => row.id), ['E1', 'K1', 'M1']);
  assert.deepEqual(filterRowsByEntityKey(rows, 'Kavis').map((row) => row.id), ['K1']);
  assert.deepEqual(filterRowsByEntityKey(rows, 'Extrovis').map((row) => row.id), ['E1']);
});

check('Workflow hides ITSM BOT actor on auto-closed steps', async () => {
  const { parseRefexProgress } = await import('../src/itsm/refex/employeedashboard/progressApi.js');
  const progress = {
    _status: 'Completed',
    Steps: [
      { Name: 'Start', NodeType: 'StartEvent', _status: 'Completed', ActedBy: { Name: 'Employee' } },
      {
        Process: [{
          ProcessName: 'Extrovis',
          Steps: [
            {
              Name: 'IT Agent Solution',
              _status: 'Completed',
              NodeType: 'UserTask',
              ActedBy: { Name: 'Aasik' },
              ActedAt: '2026-09-01T10:00:00Z',
              _activity_instance_id: 'ActSol1',
            },
          ],
        }],
      },
      {
        Name: 'Completed',
        NodeType: 'EndEvent',
        _status: 'Completed',
        ActedBy: { Name: 'ITSM BOT' },
        ActedAt: '2026-09-03T10:00:00Z',
      },
    ],
  };
  const parsed = parseRefexProgress(progress, {
    id: 'PkBotClose1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
  }, 'Closed');
  const closed = parsed.journey.find((node) => node.label === 'Closed');
  assert.ok(closed, 'expected Closed workflow step');
  assert.equal(Boolean(closed.actorName) && /itsm|bot/i.test(closed.actorName), false);
  const tech = parsed.journey.find((node) => node.label === 'Tech Support');
  assert.equal(tech?.actorName, 'Aasik');
});

check('Closed comments prefer the longer instance note over a truncated report cell', async () => {
  const { mergeAgentSolutionLists } = await import('../src/itsm/refex/employeedashboard/buildRevisions.js');
  const merged = mergeAgentSolutionLists(
    [{ recordId: 'sol1', resolution: 'Short…', comment: 'Short…', agentName: 'Aasik' }],
    [{ recordId: 'sol1', resolution: 'Short note plus the rest of the technician comment.', comment: 'Short note plus the rest of the technician comment.', agentName: 'Aasik' }],
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].resolution.includes('rest of the technician comment'), true);
});

check('Chat refresh cache helper is exported and safe', async () => {
  const { clearInstanceEnrichCacheForInstance } = await import(
    '../src/itsm/refex/techsupport/fetchRefexTechSupportTickets.js'
  );
  assert.equal(typeof clearInstanceEnrichCacheForInstance, 'function');
  clearInstanceEnrichCacheForInstance(null, '');
  clearInstanceEnrichCacheForInstance({ accountId: 'AcCMptlq60zH' }, 'PkChat1');
});

check('Extrovis MIS table sorts newest created date first; Refex stays FCFS', () => {
  const older = { requestId: 'IT-1', createdAtRaw: '2026-01-01T08:00:00.000Z' };
  const newer = { requestId: 'IT-99', createdAtRaw: '2026-09-16T08:00:00.000Z' };
  const rows = [newer, older];

  setITDashboardProfile(REFEX_PROFILE);
  const refexOrdered = sortMisTableRows(rows, 'asc');
  assert.equal(refexOrdered[0].requestId, 'IT-1');
  assert.equal(refexOrdered[1].requestId, 'IT-99');

  setITDashboardProfile(EXTROVIS_PROFILE);
  const extrovisOrdered = sortMisTableRows(rows, 'asc');
  assert.equal(extrovisOrdered[0].requestId, 'IT-99');
  assert.equal(extrovisOrdered[0].createdAtRaw, '2026-09-16T08:00:00.000Z');
  assert.equal(extrovisOrdered[1].requestId, 'IT-1');

  const byCreated = sortDashboardRowsByCreatedDate(rows, 'desc');
  assert.equal(byCreated[0].createdAtRaw, '2026-09-16T08:00:00.000Z');
  const fcfs = sortDashboardRowsByTicketOrder(rows, 'asc');
  assert.equal(fcfs[0].requestId, 'IT-1');

  setITDashboardProfile(REFEX_PROFILE);
});

check('Admin Get All Items Me uses AppRole id, not role name; Me + Team = unique total', () => {
  const headRole = REFEX_IT_HEAD_APPROLE_ID;
  const meItem = {
    _id: 'PkMe1',
    _current_step: 'IT Head Approval',
    _current_assigned_to: [{ _id: headRole, Name: 'IT Head Refex', Kind: 'AppRole' }],
  };
  const teamItem = {
    _id: 'PkTeam1',
    _current_step: 'IT Tech',
    _current_assigned_to: [{ _id: 'RoDiFpJErVMD', Name: 'IT Manager Refex', Kind: 'AppRole' }],
  };
  const namedOnly = {
    _id: 'PkName1',
    _current_assigned_to: [{ _id: 'RoOther', Name: 'IT Head Refex', Kind: 'AppRole' }],
  };
  assert.equal(itemAssignedToAppRole(meItem, headRole), true);
  assert.equal(itemAssignedToAppRole(teamItem, headRole), false);
  assert.equal(itemAssignedToAppRole(namedOnly, headRole), false);
  const merged = mergeAdminItemsById([[meItem, teamItem], [meItem]]);
  assert.equal(merged.length, 2);
  const meIds = collectHeadLiveAssignmentIds(merged, headRole);
  assert.equal(meIds.size, 1);
  assert.equal(meIds.has('PkMe1'), true);
  assert.equal(meIds.size + (merged.length - meIds.size), merged.length);
  assert.equal(
    buildAdminProcessItemPath('AcCMptlq60zH', 'Live_IT_Service_Request_A00', 1, 100),
    '/process/2/AcCMptlq60zH/admin/Live_IT_Service_Request_A00/item?page_number=1&page_size=100',
  );
  assert.equal(extractAdminItemPage({ Data: [meItem] }).length, 1);
});

check('Refex report maps Stages column GooYV3HuY1', () => {
  setITDashboardProfile(REFEX_PROFILE);
  assert.equal(REFEX_PROFILE.serviceCol.stages, 'Column_GooYV3HuY1');
  const keys = getRefexServiceQueueMisColumns().map((col) => col.key);
  assert.equal(keys.includes('stages'), true);
});

check('Refex Pending Approval uses a static 120 minute SLA', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const headCol = REFEX_PROFILE.serviceCol.itHeadApprovalActivity;
  const enteredAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const pending = {
    id: 'PkPend120',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Head Approval',
    activeWorkflowStep: 'IT Head Approval',
    itemStatusRaw: 'Open',
    modifiedAtRaw: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    raw: {
      _id: 'PkPend120',
      _status: 'InProgress',
      _current_step: 'IT Head Approval',
      [headCol]: [{ Status: 'InProgress', ActedAt: enteredAt }],
    },
  };
  assert.equal(getServiceQueueSlaMinutes(pending), PENDING_APPROVAL_SLA_MINUTES);
  const timing = getSlaTiming(pending);
  assert.equal(timing.hasSla, true);
  assert.equal(timing.slaMinutes, 120);
  assert.equal(timing.state, 'ok');
  assert.ok(timing.elapsedMinutes < 60, 'clock starts at approval ActedAt, not last modified');
  const display = getRefexServiceSlaMisDisplay(pending);
  assert.notEqual(display.primary, 'Hold');
  assert.notEqual(display.primary, '—');
});

check('Refex open SLA is Hold unless Stages is InProgress', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const hold = {
    ...mkOpenTechRow({ id: 'PkHoldSla1' }),
    processStages: 'Hold',
    closureMinutes: 120,
    modifiedAtRaw: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  };
  assert.equal(isSlaHoldRow(hold), true);
  assert.equal(getRefexServiceSlaMisDisplay(hold).primary, 'Hold');
  assert.equal(isServiceQueueSlaBreachedTicket(hold), false);

  const live = {
    ...mkOpenTechRow({ id: 'PkInProgSla1' }),
    processStages: 'InProgress',
    closureMinutes: 120,
    modifiedAtRaw: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  };
  assert.equal(isSlaHoldRow(live), false);
  const liveDisplay = getRefexServiceSlaMisDisplay(live);
  assert.equal(liveDisplay.primary === 'On track' || liveDisplay.primary === 'At risk', true);

  const displayedInProgress = {
    ...mkOpenTechRow({ id: 'PkBlankStageOpen' }),
    processStages: '',
    reportStages: 'InProgress',
    closureMinutes: 120,
    modifiedAtRaw: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  };
  assert.equal(isSlaHoldRow(displayedInProgress), false);
  assert.notEqual(getRefexServiceSlaMisDisplay(displayedInProgress).primary, 'Hold');
});

check('Closed / Reopen SLA freezes last IT Agent Solution result with times', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const closedOnTime = {
    id: 'PkClosedSol1',
    status: 'Completed',
    systemStatus: 'Completed',
    isProcessCompleted: true,
    itemStatusRaw: 'Closed',
    currentStep: 'Completed',
    closureMinutes: 240,
    serviceQueueSlaMinutes: 240,
    itAgentActivities: [
      { step: 'IT Tech Support', status: 'InProgress', actedAt: '2026-08-10T09:00:00.000Z' },
      { step: 'IT Tech Support', status: 'Completed', actedAt: '2026-08-10T10:00:00.000Z' },
    ],
    modifiedAtRaw: '2026-08-10T10:00:00.000Z',
    raw: { _id: 'PkClosedSol1', _status: 'Completed' },
  };
  const onTime = getRefexServiceSlaMisDisplay(closedOnTime, { isCompletedTab: true });
  assert.equal(onTime.primary, 'Not Breached');
  assert.equal(onTime.state, 'ok');
  assert.equal(onTime.sub, '1h / 4h');

  const closedBreached = {
    ...closedOnTime,
    id: 'PkClosedSolBreach',
    itAgentActivities: [
      { step: 'IT Tech Support', status: 'InProgress', actedAt: '2026-08-10T09:00:00.000Z' },
      { step: 'IT Tech Support', status: 'Completed', actedAt: '2026-08-10T15:00:00.000Z' },
    ],
    modifiedAtRaw: '2026-08-10T15:00:00.000Z',
    closedAtRaw: '2026-08-10T15:00:00.000Z',
  };
  const breached = getRefexServiceSlaMisDisplay(closedBreached, { isCompletedTab: true });
  assert.equal(breached.primary, 'Breached');
  assert.equal(breached.sub, '6h / 4h');

  const reopen = mkReopenRow({ id: 'PkReopenSlaLast' });
  reopen.closureMinutes = 240;
  reopen.serviceQueueSlaMinutes = 240;
  reopen.itAgentActivities = [
    { step: 'IT Tech Support', status: 'Completed', actedAt: '2026-08-10T09:00:00.000Z' },
  ];
  const reopenDisplay = getRefexServiceSlaMisDisplay(reopen);
  assert.equal(reopenDisplay.primary === 'Not Breached' || reopenDisplay.primary === 'Breached', true);
  assert.notEqual(reopenDisplay.primary, 'Reopen window');
});

check('Extrovis PickUp uses created+TAT; My Tickets clock only when InProgress', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const user = { _id: 'UsAgent1', Email: 'agent@extrovis.com', Name: 'Agent' };
  const pickupCreated = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const pickup = {
    ...mkExtPickupRow({ id: 'PkExtNoSlaPick' }),
    processStages: 'InProgress',
    createdAtRaw: pickupCreated,
    requestedDateTimeRaw: pickupCreated,
    tatMinutes: 120,
    closureMinutes: 480,
    slaBreached: true,
    isLiveBucketPending: true,
  };
  assert.equal(getServiceQueueSlaMinutes(pickup), 120);
  const pickupDisplay = getRefexServiceSlaMisDisplay(pickup);
  assert.notEqual(pickupDisplay.primary, 'Hold');
  assert.equal(pickupDisplay.primary === 'On track' || pickupDisplay.primary === 'At risk', true);
  assert.ok(pickupDisplay.sub, 'PickUp TAT shows remaining time from created');
  assert.equal(isServiceQueueSlaBreachedTicket(pickup), false);

  const pickupOld = {
    ...pickup,
    id: 'PkExtPickOld',
    createdAtRaw: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    requestedDateTimeRaw: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  };
  assert.equal(getRefexServiceSlaMisDisplay(pickupOld).primary, 'Breached');
  assert.equal(isServiceQueueSlaBreachedTicket(pickupOld), false);
  assert.equal(EXTROVIS_PICKUP_TAT_MINUTES, 120);

  const solutionHold = {
    ...mkExtSolutionRow({ id: 'PkExtSolHold', user }),
    processStages: 'Hold',
    ticketStage: 'Hold',
    closureMinutes: 120,
    modifiedAtRaw: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    isLiveBucketPending: true,
    techSupportMyTaskItem: {
      _id: 'PkExtSolHold',
      _status: 'InProgress',
      _current_step: 'IT Agent Solution',
      _current_assigned_to: [user],
    },
  };
  assert.equal(getRefexServiceSlaMisDisplay(solutionHold).primary, 'Hold');
  assert.equal(isServiceQueueSlaBreachedTicket(solutionHold), false);

  const solutionStageOnly = {
    ...mkExtSolutionRow({ id: 'PkExtSolStage', user }),
    processStages: '',
    ticketStage: 'InProgress',
    closureMinutes: 120,
    modifiedAtRaw: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    isLiveBucketPending: true,
    raw: {
      ...mkExtSolutionRow({ id: 'PkExtSolStage', user }).raw,
      Statu_1: 'InProgress',
      Column_ps84EEKkEI: 'InProgress',
    },
    techSupportMyTaskItem: {
      _id: 'PkExtSolStage',
      _status: 'InProgress',
      _current_step: 'IT Agent Solution',
      _current_assigned_to: [user],
    },
  };
  assert.equal(isSlaHoldRow(solutionStageOnly), false);
  const stageOnlyDisplay = getRefexServiceSlaMisDisplay(solutionStageOnly);
  assert.notEqual(stageOnlyDisplay.primary, 'Hold');
  assert.equal(stageOnlyDisplay.primary === 'On track' || stageOnlyDisplay.primary === 'At risk', true);

  const solutionLive = {
    ...mkExtSolutionRow({ id: 'PkExtSolLive', user }),
    processStages: 'InProgress',
    closureMinutes: 120,
    modifiedAtRaw: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    isLiveBucketPending: true,
    techSupportMyTaskItem: {
      _id: 'PkExtSolLive',
      _status: 'InProgress',
      _current_step: 'IT Agent Solution',
      _current_assigned_to: [user],
    },
  };
  const live = getRefexServiceSlaMisDisplay(solutionLive);
  assert.equal(live.primary === 'On track' || live.primary === 'At risk', true);

  const afterDepCol = EXTROVIS_PROFILE.serviceCol.techSupportAfterDependencyActivity;
  const afterDep = {
    id: 'PkExtAfterSla',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'IT Tech Support After Dependency',
    activeWorkflowStep: 'IT Tech Support After Dependency',
    processStages: 'InProgress',
    closureMinutes: 120,
    modifiedAtRaw: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    assignedToRaw: [user],
    isLiveBucketPending: true,
    techSupportMyTaskItem: {
      _id: 'PkExtAfterSla',
      _status: 'InProgress',
      _current_step: 'IT Tech Support After Dependency',
      _current_assigned_to: [user],
    },
    raw: {
      _id: 'PkExtAfterSla',
      _status: 'InProgress',
      [extCurrentStepCol]: 'IT Tech Support After Dependency',
      [afterDepCol]: [{ _id: 'ActAfterSla1', Status: 'InProgress' }],
    },
  };
  const afterDisplay = getRefexServiceSlaMisDisplay(afterDep);
  assert.equal(afterDisplay.primary === 'On track' || afterDisplay.primary === 'At risk', true);

  const depCol = EXTROVIS_PROFILE.serviceCol.dependencyAssigneeActivity;
  const waitingDepLive = {
    id: 'PkExtDepLive',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'Dependency Assignee',
    activeWorkflowStep: 'Dependency Assignee',
    processStages: 'InProgress',
    ticketStage: 'InProgress',
    closureMinutes: 120,
    modifiedAtRaw: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    raw: {
      _id: 'PkExtDepLive',
      _status: 'InProgress',
      [extCurrentStepCol]: 'Dependency Assignee',
      [depCol]: [{ _id: 'ActDepLive', Status: 'InProgress' }],
      Statu_1: 'InProgress',
    },
  };
  const depLive = getRefexServiceSlaMisDisplay(waitingDepLive);
  assert.notEqual(depLive.primary, 'Hold');
  assert.equal(depLive.primary === 'On track' || depLive.primary === 'At risk', true);

  const waitingDepHold = {
    id: 'PkExtDepHold',
    status: 'InProgress',
    systemStatus: 'InProgress',
    currentStep: 'Dependency Assignee',
    activeWorkflowStep: 'Dependency Assignee',
    processStages: 'Hold',
    ticketStage: 'Hold',
    closureMinutes: 120,
    slaBreached: true,
    raw: {
      _id: 'PkExtDepHold',
      _status: 'InProgress',
      [extCurrentStepCol]: 'Dependency Assignee',
      [depCol]: [{ _id: 'ActDepHold', Status: 'InProgress' }],
      Statu_1: 'Hold',
    },
  };
  assert.equal(getRefexServiceSlaMisDisplay(waitingDepHold).primary, 'Hold');
  assert.equal(isServiceQueueSlaBreachedTicket(waitingDepHold), false);
  setITDashboardProfile(REFEX_PROFILE);
});

check('Blank pending/{activity} rows count after StepName stamp', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const user = { Name: 'asik', Email: 'asik@extrovis.com', _id: 'UsAsik' };
  const overwritten = stampPendingItemsWithStepName(
    [{ _id: 'PkLeftover', _current_step: 'IT Agent Solution' }],
    'Activity_9gAyNCIowD',
    'IT Agent PickUp',
  );
  assert.equal(overwritten[0]._current_step, 'IT Agent PickUp');
  const stamped = stampPendingItemsWithStepName(
    [{ _id: 'PkNoStepPick', isLiveBucketPending: true }],
    'Activity_9gAyNCIowD',
    'IT Agent PickUp',
  ).map((item) => ({
    ...item,
    id: item._id,
    currentStep: item._current_step,
    isLiveBucketPending: true,
    liveBucketStepGroup: 'open',
    techSupportMyTaskItem: item,
  }));
  assert.equal(matchesRefexTechSupportTab(stamped[0], 'OpenTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(stamped[0], 'AllTickets', user), true);
  const staleReportPick = {
    id: 'PkStalePick',
    currentStep: 'IT Agent Solution',
    isLiveBucketPending: true,
    liveBucketStepGroup: 'open',
    techSupportMyTaskItem: { _id: 'PkStalePick' },
  };
  assert.equal(matchesRefexTechSupportTab(staleReportPick, 'OpenTickets', user), true);
  const liveMineNoAssignee = {
    id: 'PkSolNoAssign',
    currentStep: '',
    isLiveBucketPending: true,
    liveBucketStepGroup: 'myTickets',
    techSupportMyTaskItem: { _id: 'PkSolNoAssign' },
  };
  assert.equal(matchesRefexTechSupportTab(liveMineNoAssignee, 'AssignedToMe', user), true);
  const stampedSol = stampPendingItemsWithStepName(
    [{ _id: 'PkNoStepSol', _current_assigned_to: user }],
    'Activity_XVeFnZdKon',
    'IT Agent Solution',
  ).map((item) => ({
    ...item,
    id: item._id,
    currentStep: item._current_step,
    assignedToRaw: user,
    techSupportTaskOwnedByUser: true,
    isLiveBucketPending: true,
    techSupportMyTaskItem: item,
  }));
  assert.equal(matchesRefexTechSupportTab(stampedSol[0], 'AssignedToMe', user), true);
  const stampedRe = stampPendingItemsWithStepName(
    [{ _id: 'PkNoStepRe' }],
    'Activity_7rCa3_zSic',
    'ReOpen Window',
  ).map((item) => ({
    ...item,
    id: item._id,
    currentStep: item._current_step,
    isLiveReopenPending: true,
    isLiveBucketPending: true,
    itemStatusRaw: 'Closed',
    raw: item,
  }));
  assert.equal(matchesRefexTechSupportTab(stampedRe[0], 'Closed', user), true);
  setITDashboardProfile(REFEX_PROFILE);
});

check('Refex pending count keeps IT Tech / IT Tech Support / IT Tech Reopen split', () => {
  setITDashboardProfile(REFEX_PROFILE);
  const user = { Name: 'asik', Email: 'asik@refex.co.in', _id: 'UsAsik' };
  assert.equal(classifyPendingStepName('IT Tech', 'refex'), 'open');
  assert.equal(classifyPendingStepName('IT Tech Support', 'refex'), 'myTickets');
  assert.equal(classifyPendingStepName('IT Tech Reopen', 'refex'), 'reopen');
  assert.equal(classifyPendingStepName('IT Agent Solution', 'extrovis'), 'myTickets');
  const openRow = stampPendingItemsWithStepName(
    [{ _id: 'PkRefexTech' }],
    'Activity_br-intVidq',
    'IT Tech',
  ).map((item) => ({
    ...item,
    id: item._id,
    currentStep: item._current_step,
    isLiveBucketPending: true,
    liveBucketStepGroup: 'open',
    techSupportMyTaskItem: item,
    assignedToRaw: user,
  }))[0];
  const mineRow = stampPendingItemsWithStepName(
    [{ _id: 'PkRefexSupport', _current_assigned_to: user }],
    'Activity_9h2Y_0Yvdw',
    'IT Tech Support',
  ).map((item) => ({
    ...item,
    id: item._id,
    currentStep: item._current_step,
    isLiveBucketPending: true,
    liveBucketStepGroup: 'myTickets',
    techSupportMyTaskItem: item,
    techSupportTaskOwnedByUser: true,
    assignedToRaw: user,
  }))[0];
  const closedRow = stampPendingItemsWithStepName(
    [{ _id: 'PkRefexReopen' }],
    'Activity_Ot8GrzZvSl',
    'IT Tech Reopen',
  ).map((item) => ({
    ...item,
    id: item._id,
    currentStep: item._current_step,
    isLiveBucketPending: true,
    isLiveReopenPending: true,
    liveBucketStepGroup: 'reopen',
    techSupportMyTaskItem: item,
    raw: item,
  }))[0];
  assert.equal(matchesRefexTechSupportTab(openRow, 'OpenTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(openRow, 'AssignedToMe', user), false);
  // Refex Agent Open includes IT Tech Support / Dependency in the live bucket.
  assert.equal(matchesRefexTechSupportTab(mineRow, 'OpenTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(mineRow, 'AssignedToMe', user), true);
  assert.equal(matchesRefexTechSupportTab(mineRow, 'Closed', user), false);
  assert.equal(matchesRefexTechSupportTab(closedRow, 'Closed', user), true);
  assert.equal(matchesRefexTechSupportTab(closedRow, 'OpenTickets', user), false);
  assert.equal(matchesRefexTechSupportTab(closedRow, 'AssignedToMe', user), false);
  setITDashboardProfile(REFEX_PROFILE);
});

check('Agent All Tickets includes live PickUp + My Tickets + Closed union', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const user = { Name: 'asik', Email: 'asik@extrovis.com', _id: 'UsAsik' };
  const pickup = {
    id: 'PkPick1',
    currentStep: 'IT Agent PickUp',
    isLiveBucketPending: true,
    techSupportMyTaskItem: { _current_step: 'IT Agent PickUp' },
  };
  const mine = {
    id: 'PkSol1',
    currentStep: 'IT Agent Solution',
    assignedTo: 'asik',
    assignedToRaw: { Name: 'asik', Email: 'asik@extrovis.com', _id: 'UsAsik' },
    techSupportTaskOwnedByUser: true,
    isLiveBucketPending: true,
    techSupportMyTaskItem: { _current_step: 'IT Agent Solution', _current_assigned_to: user },
  };
  const reopen = {
    id: 'PkRe1',
    currentStep: 'ReOpen Window',
    isLiveReopenPending: true,
    isLiveBucketPending: true,
    itemStatusRaw: 'Closed',
    raw: { _current_step: 'ReOpen Window' },
  };
  assert.equal(matchesRefexTechSupportTab(pickup, 'AllTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(pickup, 'OpenTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(mine, 'AllTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(mine, 'AssignedToMe', user), true);
  assert.equal(matchesRefexTechSupportTab(reopen, 'AllTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(reopen, 'Closed', user), true);
  const historyOnly = {
    id: 'PkOldClosed',
    currentStep: 'Completed',
    isProcessCompleted: true,
    itemStatusRaw: 'Closed',
    handled: true,
    assignedToRaw: user,
  };
  // Live All Tickets includes any closed row; Me/Team is applied by the dashboard.
  assert.equal(matchesRefexTechSupportTab(historyOnly, 'AllTickets', user), true);
  setITDashboardProfile(REFEX_PROFILE);
});

check('Non-Refex pending/activity/count maps PickUp / Solution / ReOpen Window', () => {
  setITDashboardProfile(EXTROVIS_PROFILE);
  const user = { Name: 'asik', Email: 'asik@extrovis.com', _id: 'UsAsik' };
  const count = [
    { _id: 'Activity_9gAyNCIowD', StepName: 'IT Agent PickUp', Count: 18 },
    { _id: 'Activity_XVeFnZdKon', StepName: 'IT Agent Solution', Count: 10 },
    { _id: 'Activity_7rCa3_zSic', StepName: 'ReOpen Window', Count: 4 },
  ];
  const entries = parsePendingActivityCountEntries(count);
  assert.equal(classifyPendingStepName('IT Agent PickUp', 'extrovis'), 'open');
  assert.equal(classifyPendingStepName('IT Agent Solution', 'extrovis'), 'myTickets');
  assert.equal(classifyPendingStepName('ReOpen Window', 'extrovis'), 'reopen');
  assert.equal(resolveActivityIdsByStepNames(entries, ['IT Agent PickUp']).join(','), 'Activity_9gAyNCIowD');
  assert.equal(resolveActivityIdsByStepNames(entries, ['IT Agent Solution']).join(','), 'Activity_XVeFnZdKon');
  assert.equal(resolveActivityIdsByStepNames(entries, ['ReOpen Window']).join(','), 'Activity_7rCa3_zSic');
  const pickup = {
    id: 'PkPickCount',
    currentStep: 'IT Agent PickUp',
    isLiveBucketPending: true,
    liveBucketStepGroup: 'open',
    techSupportMyTaskItem: { _current_step: 'IT Agent PickUp' },
  };
  const mine = {
    id: 'PkSolCount',
    currentStep: 'IT Agent Solution',
    isLiveBucketPending: true,
    liveBucketStepGroup: 'myTickets',
    techSupportMyTaskItem: { _current_step: 'IT Agent Solution' },
  };
  const reopen = {
    id: 'PkReCount',
    currentStep: 'ReOpen Window',
    isLiveBucketPending: true,
    isLiveReopenPending: true,
    liveBucketStepGroup: 'reopen',
    itemStatusRaw: 'Closed',
    raw: { _current_step: 'ReOpen Window' },
  };
  assert.equal(matchesRefexTechSupportTab(pickup, 'OpenTickets', user), true);
  assert.equal(matchesRefexTechSupportTab(pickup, 'AssignedToMe', user), false);
  assert.equal(matchesRefexTechSupportTab(mine, 'AssignedToMe', user), true);
  assert.equal(matchesRefexTechSupportTab(mine, 'OpenTickets', user), false);
  assert.equal(matchesRefexTechSupportTab(reopen, 'Closed', user), true);
  assert.equal(matchesRefexTechSupportTab(reopen, 'OpenTickets', user), false);
  setITDashboardProfile(REFEX_PROFILE);
});

check('pickServiceTicketAttachments reads Supporting_Documents array or map', () => {
  const fromArray = pickServiceTicketAttachments({
    Supporting_Documents: [{ name: 'shot.png', url: 'https://example.com/shot.png' }],
  });
  assert.equal(fromArray.length, 1);
  assert.equal(fromArray[0].name, 'shot.png');
  const fromMap = pickServiceTicketAttachments({
    Supporting_Documents: {
      a: { Name: 'note.txt', URL: 'https://example.com/note.txt' },
    },
  });
  assert.equal(fromMap.length, 1);
  assert.equal(fromMap[0].Name, 'note.txt');
});

check('User comment email skips Internal and routes agent vs employee', () => {
  assert.equal(shouldNotifyUserCommentEmail({ extrovis: true, commentsType: 'User' }), true);
  assert.equal(shouldNotifyUserCommentEmail({ extrovis: true, commentsType: 'Internal' }), false);
  assert.equal(shouldNotifyUserCommentEmail({ extrovis: true, commentsType: 'External' }), false);
  assert.equal(shouldNotifyUserCommentEmail({ extrovis: false, commentsType: 'User' }), false);

  const agent = resolveCommentMailRecipients({
    role: 'agent',
    requesterEmail: 'employee@extrovis.com',
    entity: 'Extrovis',
  });
  assert.deepEqual(agent.to, ['employee@extrovis.com']);
  assert.deepEqual(agent.cc, ['itsupport@extrovis.com']);
  assert.equal(agent.from, 'itsupport@extrovis.com');

  const kavis = resolveCommentMailRecipients({
    role: 'agent',
    requesterEmail: 'employee@kavispharma.com',
    entity: 'KavisPharma',
  });
  assert.deepEqual(kavis.to, ['employee@kavispharma.com']);
  assert.deepEqual(kavis.cc, ['Jon.Hudanich@kavispharma.com', 'Vidhya.Kumar@kavispharma.com']);
  assert.equal(kavis.from, 'itsupport@kavispharma.com');

  const modepro = resolveCommentMailRecipients({
    role: 'employee',
    entity: 'ModePro',
  });
  assert.deepEqual(modepro.to, ['pradip.kakade@modepro.com']);
  assert.deepEqual(modepro.cc, ['pradip.kakade@modepro.com']);
  assert.equal(modepro.from, 'itsupport@modepro.com');
  assert.equal(modepro.to.includes('itsupport@extrovis.com'), false);

  const kavisEmployee = resolveCommentMailRecipients({
    role: 'employee',
    entity: 'KavisPharma',
  });
  assert.deepEqual(kavisEmployee.to, ['jon.hudanich@kavispharma.com', 'vidhya.kumar@kavispharma.com']);
  assert.equal(kavisEmployee.to.includes('itsupport@extrovis.com'), false);
  assert.equal(kavisEmployee.from, 'itsupport@kavispharma.com');

  const modeproAgentMissing = resolveCommentMailRecipients({
    role: 'agent',
    requesterEmail: '',
    entity: 'ModePro',
  });
  assert.deepEqual(modeproAgentMissing.to, ['pradip.kakade@modepro.com']);

  const pharma = resolveCommentMailRecipients({
    role: 'employee',
    entity: 'Pharma Pack',
  });
  assert.deepEqual(pharma.to, COMMENT_MAIL_SUPPORT_TO);
  assert.deepEqual(pharma.cc, ['itsupport@extrovis.com']);

  const blank = resolveCommentMailRecipients({ role: 'employee', entity: '' });
  assert.deepEqual(blank.to, COMMENT_MAIL_SUPPORT_TO);
  assert.deepEqual(blank.cc, ['itsupport@extrovis.com']);
  assert.equal(blank.from, 'itsupport@extrovis.com');

  const sapAgent = resolveCommentMailRecipients({
    role: 'agent',
    requesterEmail: 'employee@kavispharma.com',
    entity: 'KavisPharma',
    sap: true,
  });
  assert.equal(sapAgent.from, 'itsupport@kavispharma.com');
  assert.deepEqual(sapAgent.to, ['employee@kavispharma.com']);
  assert.deepEqual(sapAgent.cc, [
    'kishore.yepuri@extrovis.com',
    'Sarwar.Syed@nttdata.com',
    'Chandana.Metikala@nttdata.com',
  ]);

  const sapUser = resolveCommentMailRecipients({
    role: 'employee',
    entity: 'ModePro',
    sap: 'Yes',
  });
  assert.equal(sapUser.from, 'itsupport@modepro.com');
  assert.deepEqual(sapUser.to, ['pradip.kakade@modepro.com']);
  assert.deepEqual(sapUser.cc, [
    'kishore.yepuri@extrovis.com',
    'Sarwar.Syed@nttdata.com',
    'Chandana.Metikala@nttdata.com',
  ]);
  assert.equal(sapUser.to.includes('itsupport@extrovis.com'), false);

  const employee = resolveCommentMailRecipients({ role: 'employee', entity: 'Extrovis' });
  assert.deepEqual(employee.to, COMMENT_MAIL_SUPPORT_TO);
  assert.deepEqual(employee.cc, ['itsupport@extrovis.com']);

  assert.equal(
    commentMailSubject('EXT-1042'),
    'Tech Help Desk - New Comment Added | Ticket EXT-1042',
  );

  assert.equal(buildCommentMailPayload({
    extrovis: true,
    commentsType: 'Internal',
    role: 'agent',
    row: { requestId: 'EXT-1', requesterEmail: 'a@b.com' },
    comment: 'secret',
    authorName: 'Agent',
  }), null);

  const payload = buildCommentMailPayload({
    extrovis: true,
    commentsType: 'User',
    role: 'agent',
    row: { requestId: 'EXT-1042', requesterEmail: 'employee@extrovis.com', id: 'inst-1', entity: 'Kavis Pharma' },
    comment: '<script>alert(1)</script>',
    authorName: 'Vishnu',
  });
  assert.ok(payload);
  assert.deepEqual(payload.to, ['employee@extrovis.com']);
  assert.deepEqual(payload.cc, ['Jon.Hudanich@kavispharma.com', 'Vidhya.Kumar@kavispharma.com']);
  assert.equal(payload.from, 'itsupport@kavispharma.com');
  assert.equal(payload.subject, 'Tech Help Desk - New Comment Added | Ticket EXT-1042');
  assert.equal(payload.html.includes('<script>'), false);
  assert.equal(payload.html.includes('&lt;script&gt;'), true);
  assert.equal(payload.html.includes('aasik-refex-report-assets/refexone-logo.png'), true);
  assert.equal(payload.html.includes('#315E89'), true);
  assert.equal(payload.html.includes('#EEF4FA'), true);
  assert.equal(payload.html.includes('Ticket Details'), true);
  assert.equal(payload.html.includes('Ticket Type'), false);
  assert.equal(payload.html.includes('>Category<'), false);
  assert.equal(payload.html.includes('Latest Comment'), true);
  assert.equal(payload.html.includes('#222831'), true);

  assert.equal(resolveCommentRequesterEmail({
    createdByEmail: 'owner@extrovis.com',
  }), '');
  assert.equal(resolveCommentRequesterEmail({
    requesterEmail: 'req@extrovis.com',
    createdByEmail: 'owner@extrovis.com',
  }), 'req@extrovis.com');
  const createdByPayload = buildCommentMailPayload({
    extrovis: true,
    commentsType: 'User',
    role: 'agent',
    row: { requestId: 'EXT-9', createdByEmail: 'owner@extrovis.com' },
    comment: 'hello',
    authorName: 'Vishnu',
  });
  assert.ok(createdByPayload);
  assert.deepEqual(createdByPayload.to, COMMENT_MAIL_SUPPORT_TO);
  assert.deepEqual(createdByPayload.cc, ['itsupport@extrovis.com']);
  assert.equal(createdByPayload.from, 'itsupport@extrovis.com');
  assert.equal(resolveAssignedGreetingName({
    assignedToRaw: [{ Kind: 'User', Name: 'Vishnu Kumar' }],
  }), 'Vishnu');
  assert.equal(resolveAssignedGreetingName({
    assignedTo: 'Vishnu Kumar (user), IT Agents Extrovis (role)',
  }), 'Vishnu');
});

check('Process activity comment rows keep Attachments that the All_tickets report omits', async () => {
  const { setITDashboardProfile } = await import('../src/lib/kfITServiceDashboard.js');
  const { EXTROVIS_PROFILE } = await import('../src/lib/itDashboardProfiles.js');
  const { mapRefexEmployeeRow } = await import(
    '../src/itsm/refex/employeedashboard/mapRefexEmployeeRow.js'
  );
  const { collectConversationEntries } = await import(
    '../src/itsm/refex/employeedashboard/buildRevisions.js'
  );
  setITDashboardProfile(EXTROVIS_PROFILE);
  const file = {
    id: 'Attach_c081c82e06',
    name: 'Screenshot.png',
    key: 'Live_IT_Service_Request_Extrovis_A00/PkERZs0a6Fn3/PkERZt8_ejsp/IT__Agent_Solution/IT__Agent_Solution_037ee6d58e/Attach_c081c82e06/Screenshot.png',
    size: 81655,
    fileExtension: 'png',
    mimeType: 'image/png',
    photos: [{ key: 'Live_IT_Service_Request_Extrovis_A00/PkERZs0a6Fn3/PkERZt8_ejsp/IT__Agent_Solution/IT__Agent_Solution_037ee6d58e/Attach_c081c82e06/photos/100x100.png' }],
  };
  const mapped = mapRefexEmployeeRow({
    _id: 'PkERZs0a6Fn3',
    _activity_instance_id: 'PkERZt8_ejsp',
    'Table::IT__Agent_Solution': [
      {
        _id: 'IT__Agent_Solution_037ee6d58e',
        _created_at: '2026-10-27T11:18:47Z',
        Name_1: 'Syed Ajju',
        Comments_2: 'User',
        Stages_1: 'InProgress',
        Attachments: [file],
      },
      {
        _id: 'IT__Agent_Solution_7aa4672c0f',
        _created_at: '2026-10-27T11:20:21Z',
        Resolution: 'Thanks',
        Name_1: 'Vishnu Gullapally',
        Comments_2: 'User',
      },
    ],
  });
  const entries = collectConversationEntries({ agentSolutions: mapped.agentSolutions });
  const withFile = entries.find((entry) => entry.recordId === 'IT__Agent_Solution_037ee6d58e');
  assert.equal(withFile?.attachments?.[0]?.id, 'Attach_c081c82e06');
  assert.equal(entries.some((entry) => entry.comment === 'Thanks'), true);
});

check('Extrovis comment rows keep attachment files that are not on the Extrovis upload path', () => {
  const mapped = mapRefexEmployeeRow({
    _id: 'PkAttach1',
    Column_qr_9gP_vE5: [{
      _id: 'sol-1',
      Resolution: 'See the screenshot',
      Column_OtherFile: [{
        id: 'file-1',
        name: 'photo.png',
        key: 'AcC/photos/photo.png',
        size: 12,
      }],
    }],
  });
  const files = mapped.agentSolutions?.[0]?.attachments || [];
  assert.equal(files.length, 1);
  assert.equal(files[0].name, 'photo.png');
});

check('Extrovis SAP expand and NTT hide list do not change Me matchers', () => {
  assert.equal(isExtrovisSapTicket({ sap: true, sapModule: 'SD' }), true);
  assert.equal(getExtrovisSapModule({ sap: true, sapModule: 'SD' }), 'SD');
  assert.equal(isExtrovisSapTicket({ sap: false, ticketType: 'Incident' }), false);
  assert.equal(isExtrovisSapTicket({ raw: { 'Column_l8-JThY4eN': true, 'Column_xAD9rXgk8-': 'MM' } }), true);
  assert.equal(getExtrovisSapModule({ raw: { 'Column_xAD9rXgk8-': 'MM' } }), 'MM');
  assert.equal(hidesExtrovisAgentMeTeamAndOpenKpi('Sumeet.Dongre@bs.nttdata.com'), true);
  assert.equal(hidesExtrovisAgentMeTeamAndOpenKpi('vishnu@extrovis.com'), false);
});

check('Extrovis IT Agent locked-entity users hide the filter and stay on their entity', () => {
  assert.equal(getExtrovisAgentLockedEntity('Jon.Hudanich@kavispharma.com'), 'Kavis');
  assert.equal(getExtrovisAgentLockedEntity('Vidhya.Kumar@kavispharma.com'), 'Kavis');
  assert.equal(getExtrovisAgentLockedEntity('pradip.kakade@modepro.com'), 'ModePro');
  assert.equal(hidesExtrovisAgentEntityFilter('jon.hudanich@kavispharma.com'), true);
  assert.equal(hidesExtrovisAgentEntityFilter('vishnu@extrovis.com'), false);
  assert.equal(getExtrovisAgentLockedEntity('kishore.yepuri@extrovis.com'), '');
  assert.equal(isExtrovisAgentSapTeamOnly('Kishore.Yepuri@extrovis.com'), true);
  assert.equal(isExtrovisAgentSapTeamOnly('Sarwar.Syed@nttdata.com'), true);
  assert.equal(isExtrovisAgentSapTeamOnly('Chandana.Metikala@nttdata.com'), true);
  assert.equal(isExtrovisAgentSapTeamOnly('jon.hudanich@kavispharma.com'), false);
  assert.equal(isExtrovisAgentSapTeamEntityRow({ entity: 'KavisPharma' }), true);
  assert.equal(isExtrovisAgentSapTeamEntityRow({ entity: 'Modepro' }), true);
  assert.equal(isExtrovisAgentSapTeamEntityRow({ entity: 'Pharma Pack' }), false);
  assert.equal(hidesExtrovisAgentMeTeamAndOpenKpi('jon.hudanich@kavispharma.com'), false);
});

check('All_tickets $sap=true is opt-in and does not change the default report path', () => {
  const sapPath = getReportPath(DEFAULT_ACCOUNT_ID, 1, 100, { sap: true });
  const normalPath = getReportPath(DEFAULT_ACCOUNT_ID, 1, 100, {});
  assert.equal(sapPath.includes('$sap=true'), true);
  assert.equal(normalPath.includes('$sap='), false);
});

check('CEO header titles follow Srivaths / Anil / Dinesh emails', async () => {
  const { resolveNewCeoHeaderTitle } = await import('../src/lib/neGcpDashboardMath.js');
  assert.equal(resolveNewCeoHeaderTitle({ email: 'srivaths.varadharajan@refex.co.in' }), 'Group Chief Technical Officer');
  assert.equal(resolveNewCeoHeaderTitle({ email: 'aniljain@refex.co.in' }), 'Managing Director / Chairman');
  assert.equal(resolveNewCeoHeaderTitle({ email: 'dinesh@refex.co.in' }), 'Group Chief Executive Officer');
});

await Promise.all(pendingChecks);
if (failed) {
  console.error(`\n${failed} logic test(s) failed`);
  process.exit(1);
}
console.log('\nAll Refex + Extrovis logic tests passed');
