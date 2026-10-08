/** Kissflow IT Service Management — report mapping & helpers */

import { kfGetJson, kfMutateJson, kfPostProcessJson, kfPostCommentJson, resolveKissflowOrigin } from './kfRuntime.js';
import { EXTROVIS_PROFILE, REFEX_PROFILE } from './itDashboardProfiles.js';
import {
  normalizeWorkflowStepName,
  resolveRefexStepFieldMetaForStep,
  listRefexStepFieldColumnIds,
} from '../itsm/refex/shared/refexServiceStepFields.js';
import {
  readTicketStatusField,
  readProcessStagesField,
  rememberTicketStageOverlay,
} from '../itsm/refex/employeedashboard/ticketStage.js';

export { EXTROVIS_PROFILE, REFEX_PROFILE } from './itDashboardProfiles.js';

export const APP_ID = 'IT_Service_Management_A00';
/** Default/Refex service process. Extrovis uses Live_IT_Service_Request_Extrovis_A00 via profile. */
export const PROCESS_ID = 'Live_IT_Service_Request_A00';
export const EXTROVIS_PROCESS_ID = 'Live_IT_Service_Request_Extrovis_A00';
export const REPORT_ID = 'IT_Service_Items_A00';
export const DEFAULT_ACCOUNT_ID = 'AcCMptlq60zH';
/** Development Kissflow account — never fall back to live when the host is development. */
export const DEV_ACCOUNT_ID = 'AcCMptp3yqcn';
export const CREATE_TICKET_PAGE_ID = 'Create_Ticket_Page_New_A00';
export const CREATE_AGENT_CR_PAGE_ID = 'Create_IT_Agent_Ticket_A00';
export const CHANGE_REQUEST_PROCESS_ID = 'Live_IT_Change_Request_A00';
export const CHANGE_REQUEST_REPORT_ID = 'IT_Change_Request_Report_A00';

export const DEV_KISSFLOW_ORIGIN = 'https://development-refexgroup.kissflow.com';
export const LIVE_KISSFLOW_ORIGIN = 'https://refexgroup.kissflow.com';

/** Report column Id → internal key (IT_Service_Items_A00) */
export const COL = {
  requesterEmail: 'Column__SdDpYraVa',
  requesterName: 'Column_iqzbamsa-x',
  requesterL1ManagerEmail: 'Column_wm857j_G6d',
  requesterL2ManagerEmail: 'Column_5qhn1PwCZY',
  requestedDate: 'Column_tlsLsrvf31',
  requestedDateTime: 'Column_0lF86sTbFy',
  status: 'Column_YgghxGDIE0',
  ticketType: 'Column_vW-7Jwyvqb',
  entity: 'Column_9vqh3QtxP1',
  entitySelect: 'Column_T9agNYt0hP',
  department: 'Column_ype_hrsE6R',
  location: 'Column_oIWjkaiijB',
  category: 'Column_9oE6HPRxGd',
  subCategory: 'Column_OHkPEsIs52',
  summary: 'Column_RBeiS2lPsx',
  description: 'Column_IzPDi-9gKZ',
  attachments: 'Column__BtedDtO-X',
  criticality: 'Column_AZfxrxgc1d',
  itemStatus: 'Column_h0m9vgD5Rp',
  solution: 'Column_dGW_vJHwUt',
  holdReason: 'Column_YtIXp7-amh',
  pendingReason: 'Column_I8x774F-fu',
  cancellationReason: 'Column_bCoa7zTwxn',
  slaMinutes: 'Column_EezOqIO3Qm',
  slaElapsedMinutes: 'Column_qDHEjJRw_T',
  slaLastResumedAt: 'Column_o4FSHKijWN',
  slaIsPaused: 'Column_rxZyYy0c-b',
  slaRemainingMinutes: 'Column_Mad8vYMJT6',
  slaBreached: 'Column_qG4mgtZVzY',
  slaPausedAt: 'Column_lLQSIKteNx',
  requestId: 'Column_mounmTXexo',
  lastCompletedStep: 'Column_1yQHmlT_Vg',
  instanceId: 'Column_Obgqqp1A7K',
  activityInstanceId: 'Column_BMWx0FTCMQ',
  name: 'Column_X32-P1G_I7',
  createdBy: 'Column_W-h9b7hSrN',
  modifiedBy: 'Column_bUiNa4fgFJ',
  createdAt: 'Column_889aIgmiYj',
  modifiedAt: 'Column_b36S6oBN7i',
  flowName: 'Column_iuGsD9vcZg',
  currentStep: 'Column_AAzsUJZUKJ',
  assignedTo: 'Column_EFGiyrKONc',
  systemStatus: 'Column_W1mzfPpAP3',
  /** StepField — Extrovis / default IT Agent queue */
  itAgentActivity: 'Column_VUib0NBqXS',
  /** StepField — Refex IT Agent queue */
  itAgentRefexActivity: 'Column_Da28fQh8yD',
};

export const WORKFLOW_STEPS = ['Start', 'IT Agent'];

export const STATUS_TABS = [
  { key: 'InProgress', label: 'In Progress', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]', sdkStatus: 'inprogress' },
  { key: 'Completed', label: 'Completed', gradient: 'from-[#107C10] to-[#0B6A0B]', sdkStatus: 'completed' },
];

/** IT Employee dashboard — filter by Item_Status_1 lifecycle */
export const EMPLOYEE_STATUS_TABS = [
  { key: 'Open', label: 'Open Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'InProgress', label: 'In Progress', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'Hold', label: 'On Hold', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'Resolved', label: 'Resolved', gradient: 'from-[#107C10] to-[#0B6A0B]' },
  { key: 'Cancelled', label: 'Cancelled', gradient: 'from-[#D13438] to-[#A4262C]' },
];

/** IT Agent dashboard — top-level queue switch */
export const AGENT_QUEUE_TABS = [
  { key: 'ServiceQueue', label: 'Service', subtitle: 'Service Request & Incident', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'ChangeRequests', label: 'Change', subtitle: 'Change Requests', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
];

/** IT Agent dashboard tabs — filter by Item_Status + assignment */
export const AGENT_STATUS_TABS = [
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'PendingTask', label: 'Pending Task', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'HoldTasks', label: 'Hold', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'Resolved', label: 'Resolved', gradient: 'from-[#107C10] to-[#0B6A0B]' },
  { key: 'Cancelled', label: 'Cancelled', gradient: 'from-[#D13438] to-[#A4262C]' },
];

/**
 * Extrovis IT Agent — same buckets as AGENT_STATUS_TABS plus All Tickets / SLA
 * for Refex-style KPI filter cards (Open Ticket ownership workflow).
 */
export const EXTROVIS_AGENT_STATUS_TABS = [
  { key: 'AllTickets', label: 'All Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'PendingTask', label: 'My Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'HoldTasks', label: 'On Hold', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'SlaBreached', label: 'SLA Breached', gradient: 'from-[#D13438] to-[#A4262C]' },
  { key: 'Resolved', label: 'Closed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
  { key: 'Cancelled', label: 'Cancelled', gradient: 'from-[#D13438] to-[#A4262C]' },
];

/** Refex IT Manager / IT Head — service queue monitoring tabs. */
export const REFEX_MONITORING_SERVICE_TABS = [
  { key: 'AllTickets', label: 'All Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'PendingTask', label: 'Pending Approval', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'AssignedToMe', label: 'My Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'SlaBreached', label: 'SLA Breached', gradient: 'from-[#D13438] to-[#A4262C]' },
  { key: 'Rejected', label: 'Rejected', gradient: 'from-[#D13438] to-[#A4262C]' },
  { key: 'Closed', label: 'Closed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

/** Refex IT Admin — organization-wide monitoring tabs (no My Tickets / Active — Active folded into Open). */
export const REFEX_ADMIN_SERVICE_TABS = [
  { key: 'AllTickets', label: 'All Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'Closed', label: 'Closed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

/**
 * Refex Tech Support — Extrovis-parity tabs.
 * Flow: Start → IT Tech (Open / RR) → IT Tech Support (My Tickets) → … → IT Tech Reopen (Closed).
 * Reopened KPI removed — reopened tickets live under Open Tickets with a row tag.
 */
export const REFEX_TECH_SUPPORT_STATUS_TABS = [
  { key: 'AllTickets', label: 'All Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'AssignedToMe', label: 'My Tickets', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'SlaBreached', label: 'SLA Breached', gradient: 'from-[#D13438] to-[#A4262C]' },
  { key: 'Closed', label: 'Closed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

/**
 * Extrovis IT Agent — Refex cards plus Open Tickets (IT Agent PickUp pool).
 * Reopened KPI removed — reopened tickets live under My Tickets with a row tag.
 */
export const EXTROVIS_TECH_SUPPORT_STATUS_TABS = [
  { key: 'AllTickets', label: 'All Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'AssignedToMe', label: 'My Tickets', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'SlaBreached', label: 'SLA Breached', gradient: 'from-[#D13438] to-[#A4262C]' },
  { key: 'Closed', label: 'Closed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

/**
 * Extrovis First/Final / monitoring — no approval Pending.
 * Open = IT Agent PickUp only; My Tickets = owned Solution / Dependency / After Dependency.
 * Closed includes ReOpen Window (7 days).
 */
export const EXTROVIS_MONITORING_SERVICE_TABS = [
  { key: 'AllTickets', label: 'All Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'AssignedToMe', label: 'My Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'SlaBreached', label: 'SLA Breached', gradient: 'from-[#D13438] to-[#A4262C]' },
  { key: 'Closed', label: 'Closed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

export const AGENT_CR_TABS = [
  { key: 'InApproval', label: 'In Approval', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'Implementation', label: 'Implementation', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'Completed', label: 'Completed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

/** First Approver - IT Manager dashboard tabs (change requests) */
export const FIRST_LEVEL_APPROVER_TABS = [
  { key: 'PendingTask', label: 'Pending Task', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'Implementation', label: 'Implementation', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'Completed', label: 'Completed Task', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

/** Final Approver - IT Head dashboard tabs (change requests) */
export const FINAL_LEVEL_APPROVER_TABS = [
  { key: 'PendingTask', label: 'Pending Task', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'FirstLevelPending', label: 'First Approver Pending', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'Implementation', label: 'Implementation', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'Completed', label: 'Completed Task', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

/** Final-level approver CR tabs — entity-aware pending-stage labels (display only). */
export function getFinalLevelApproverTabs(entityTab = '') {
  const isRefex = usesRefexServiceWorkflow(entityTab);
  return FINAL_LEVEL_APPROVER_TABS.map((tab) => {
    if (tab.key === 'FirstLevelPending') {
      return { ...tab, label: isRefex ? 'IT Manager Pending' : 'First Level Approver Pending' };
    }
    return tab;
  });
}

/** Entity key for workflow step display labels. */
export function resolveWorkflowLabelEntityKey(rowOrEntity = '') {
  if (rowOrEntity && typeof rowOrEntity === 'object') {
    const fromRow = normalizeText(
      rowOrEntity.entity || resolveServiceItemEntityKey(rowOrEntity.raw ?? rowOrEntity),
    );
    if (fromRow) return fromRow;
  }
  const token = normalizeText(typeof rowOrEntity === 'string' ? rowOrEntity : '');
  if (token) return token;
  const profile = getActiveDashboardProfile();
  return normalizeText(profile?.label || profile?.id || '');
}

/** Map internal workflow step names to user-facing labels (Extrovis vs Refex). */
export function formatWorkflowStepDisplayLabel(stepName, { entityKey = '', row = null } = {}) {
  const entity = entityKey || resolveWorkflowLabelEntityKey(row);
  const isRefex = usesRefexServiceWorkflow(entity);
  const step = normalizeText(stepName);
  if (!step || step === '—') return '—';
  // Kissflow Goto / rework loops → Revised on all Refex dashboards.
  if (step.toLowerCase().startsWith('goto') || step.toLowerCase().includes('goto(')) {
    return 'Revised';
  }
  if (step.toLowerCase() === 'employee verification') return 'Ticket Can be Reopened';
  if (step.toLowerCase() === 'employee feedback') return 'Ticket Can be Reopened';
  if (step.toLowerCase() === 'ticket reopen') return 'Ticket Can be Reopened';
  if (step.toLowerCase() === 'reopen window' || step.toLowerCase().includes('reopen window')) {
    return 'Ticket Can be Reopened';
  }
  if (step.toLowerCase() === 'it tech reopen' || step.toLowerCase().includes('it tech reopen')) {
    return 'Ticket Can be Reopened';
  }
  if (step.toLowerCase() === 'it tech pickup') return 'IT Tech';
  if (step.toLowerCase().includes('dependency assigne')) return 'Dependency Assignee';

  if (crStepMatches(step, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS)) {
    return isRefex ? 'IT Head' : 'Final Level Approver';
  }
  if (crStepMatches(step, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS)) {
    return isRefex ? 'IT Manager' : 'First Level Approver';
  }
  if (crStepMatches(step, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS)) {
    return 'Implementation';
  }
  if (
    normalizeServiceWorkflowStep(step) === IT_AGENT_STEP
    || step === IT_AGENT_REFEX_STEP
    || step === IT_TECH_SUPPORT_REFEX_STEP
    || step === IT_TECH_REFEX_STEP
    || step === IT_TECH_PICKUP_REFEX_STEP
    || step === IT_TECH_REOPEN_REFEX_STEP
    || step === IT_AGENT_EXTROVIS_STEP
    || step === IT_AGENT_PICKUP_STEP
    || step === IT_AGENT_SOLUTION_STEP
  ) {
    const lower = step.toLowerCase();
    if (lower.includes('reopen')) return 'Ticket Can be Reopened';
    if (lower === 'it tech' || lower.includes('pickup') || lower.includes('pick up')) return 'IT Tech';
    if (lower.includes('tech support') && !lower.includes('after')) return 'IT Tech Support';
    return isRefex ? 'Tech Support' : 'IT Agent';
  }
  if (step.toLowerCase() === 'start' || step.toLowerCase() === 'started') return 'Opened';
  if (step.toLowerCase() === 'completed') return 'Closed';
  if (
    step.toLowerCase().includes('it manager approval')
    || step === IT_MANAGER_APPROVAL_STEP
    || step === IT_MANAGER_STEP
  ) {
    return 'IT Manager Approval';
  }
  if (step.toLowerCase().includes('it head approval') || step === IT_HEAD_APPROVAL_STEP) {
    return 'IT Head Approval';
  }
  if (step.toLowerCase() === 'l1 approval' || step.toLowerCase() === 'l1 manager') {
    return 'L1 Approval';
  }
  if (step.toLowerCase() === 'l2 approval' || step.toLowerCase() === 'l2 manager') {
    return 'L2 Approval';
  }
  return step;
}

export function formatCrWorkflowStepDisplay(row, entityKey = '') {
  const step = getCrCurrentStepValue(row) || normalizeText(row?.currentStep);
  return formatWorkflowStepDisplayLabel(step, { entityKey, row });
}

export function formatServiceWorkflowStepDisplay(row, entityKey = '') {
  if (isRefexServiceProcessCompleted(row)) return 'Closed';
  const rawStep = getCurrentStepValue(row) || row?.currentStep;
  const step = normalizeServiceWorkflowStep(rawStep) || rawStep;
  return formatWorkflowStepDisplayLabel(step, { entityKey, row });
}

/** Refex Company_Name dropdown — Live_IT_Service_Request_A00 (manual list; matches Kissflow field). */
export const REFEX_COMPANY_NAME_LIST = [
  '3i Medical Equipment Manufacturing Private Limited',
  '3i Medical Technologies Private Limited',
  'AJ Office',
  'Adonis Medical Systems Private Limited',
  'Athenese Energy Private Limited',
  'Engender Developers Private Limited',
  'Refex Airports Retail Private Limited',
  'Refex Airports Retail Srinagar Private Limited',
  'Refex Capital Advisors LLP',
  'Refex Green Energy Limited',
  'Refex Green Mobility Limited',
  'Refex Green Power Limited',
  'Refex Holding Private Limited',
  'Refex Industries Limited',
  'Refex Life Sciences Private Limited',
  'Refex Renewables & Infrastructure Limited',
  'Refex Shared Services Private Limited',
  'Refex Sustainability Solutions Private Limited',
  'Refex EV Fleet Services Private Limited',
  'STPL Horticulture Private Limited',
  'Scorch Solar Energy Private Limited',
  'Sherisha Solar Spv Two Private Limited',
  'Singe Solar Energy Private Limited',
  'Sourashakthi Energy Private Limited',
  'Spangle Energy Private Limited',
  'Sparzana Aviation Private Limited',
  'Torrid Solar Power Private Limited',
  'Venwind Refex Power Limited',
  'Vyzag Bio-Energy Fuel Private Limited',
];

/** Header / toolbar select options — { key, label } for ITMisSelectField. */
export const EXTRA_COMPANY_NAME_OPTIONS = [
  { key: 'Extrovis', label: 'Extrovis' },
  { key: 'PharmaPack', label: 'Pharmacare' },
  { key: 'ModePro', label: 'Modepro' },
  { key: 'Kavis', label: 'Kavispharma' },
];

export const REFEX_COMPANY_NAME_OPTIONS = [
  { key: '', label: 'All Companies' },
  ...EXTRA_COMPANY_NAME_OPTIONS,
  ...REFEX_COMPANY_NAME_LIST.map((name) => ({ key: name, label: name })),
];

function normalizeCompanyFilterToken(value) {
  return normalizeText(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Default company when user_details_lookup Company_Name is blank. */
export const REFEX_DEFAULT_COMPANY_NAME = 'Refex Industries Limited';

/** Match ticket Company Name from user_details_lookup (not Entity). */
export function matchesRefexCompanyFilter(row, company = '') {
  const wanted = normalizeCompanyFilterToken(company);
  if (!wanted) return true;
  const extra = EXTRA_COMPANY_NAME_OPTIONS.find((opt) => normalizeCompanyFilterToken(opt.key) === wanted
    || normalizeCompanyFilterToken(opt.label) === wanted);
  if (extra) {
    const hay = normalizeCompanyFilterToken(
      [row?.entity, row?.entityKey, row?.companyName, row?.company].filter(Boolean).join(' '),
    );
    if (wanted.includes('extrovis')) return hay.includes('extrovis');
    if (wanted.includes('pharmacare') || wanted.includes('pharma')) {
      return hay.includes('pharmacare') || hay.includes('pharma pack') || hay.includes('pharmapack');
    }
    if (wanted.includes('mode')) return hay.includes('modepro') || hay.includes('mode pro');
    if (wanted.includes('kavis')) return hay.includes('kavis');
  }
  const rowCompany = normalizeCompanyFilterToken(
    row?.companyName || row?.company || '',
  );
  // Blank lookup → treat as Refex Industries Limited (common for older rows).
  const effective = rowCompany || normalizeCompanyFilterToken(REFEX_DEFAULT_COMPANY_NAME);
  return effective === wanted;
}

/** Final level approver — entity filter options (service + change requests) */
export const FINAL_LEVEL_ENTITY_OPTIONS = [
  { key: 'Extrovis', label: 'Extrovis' },
  { key: 'Kavis', label: 'Kavis' },
  { key: 'PharmaPack', label: 'Pharma Pack' },
  { key: 'ModePro', label: 'Modepro' },
  { key: 'Refex', label: 'Refex' },
  { key: 'Venwind', label: 'Venwind' },
];

/**
 * Admin header entity list — same as Extrovis First/Final (Extrovis, Kavis,
 * Pharma Pack, Modepro) plus Refex.
 */
export const ADMIN_DASHBOARD_ENTITY_OPTIONS = FINAL_LEVEL_ENTITY_OPTIONS;

export const ADMIN_DASHBOARD_DEFAULT_ENTITY = 'Extrovis';

/** Final approver header entity selector (Modepro + Extrovis). */
export const FINAL_APPROVER_ENTITY_OPTIONS = [
  { key: 'ModePro', label: 'Modepro' },
  { key: 'Extrovis', label: 'Extrovis' },
];

/** Admin / legacy entity selector (Modepro, Extrovis, Refex). */
export const ITSM_ENTITY_OPTIONS = [
  { key: 'ModePro', label: 'Modepro' },
  { key: 'Extrovis', label: 'Extrovis' },
  { key: 'Refex', label: 'Refex' },
];

export const ITSM_DEFAULT_ENTITY = 'ModePro';

export const FINAL_LEVEL_DEFAULT_ENTITY = FINAL_LEVEL_ENTITY_OPTIONS[0]?.key || 'Extrovis';

/** @deprecated use FINAL_LEVEL_ENTITY_OPTIONS */
export const FINAL_LEVEL_ENTITY_TABS = FINAL_LEVEL_ENTITY_OPTIONS;

/** Service request oversight tabs on approver dashboards */
export const APPROVER_SERVICE_TABS = [
  { key: 'AgentPending', label: 'Agent Pending Tasks', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'OnHold', label: 'On Hold', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'Resolved', label: 'Resolved', gradient: 'from-[#107C10] to-[#0B6A0B]' },
  { key: 'Cancelled', label: 'Cancelled', gradient: 'from-[#D13438] to-[#A4262C]' },
];

/** Extrovis IT Manager / IT Head — Refex-style KPI tabs with Open Ticket ownership. */
export const EXTROVIS_APPROVER_SERVICE_TABS = [
  { key: 'AllTickets', label: 'All Tickets', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'AgentPending', label: 'Agent Pending', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'OpenTickets', label: 'Open Tickets', gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]' },
  { key: 'OnHold', label: 'On Hold', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'SlaBreached', label: 'SLA Breached', gradient: 'from-[#D13438] to-[#A4262C]' },
  { key: 'Resolved', label: 'Closed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
  { key: 'Cancelled', label: 'Cancelled', gradient: 'from-[#D13438] to-[#A4262C]' },
];

export const CR_FIRST_APPROVER_STEP = 'First Approver - IT Manager';
export const CR_FINAL_APPROVER_STEP = 'Final Approver - IT Head';
export const CR_IMPLEMENTATION_STEP = 'Implementation';
export const CR_IMPLEMENTATION_STATUS_OPTIONS = ['Picked', 'Completed'];
export const CR_IMPLEMENTATION_SUBMIT_STATUS = 'Completed';
export const CHANGE_REQUEST_WORKFLOW_STEPS = ['Start', CR_FIRST_APPROVER_STEP, CR_FINAL_APPROVER_STEP, CR_IMPLEMENTATION_STEP];

export const CR_COL = {
  requesterEmail: 'Column_-BMqFmhcjD',
  requesterName: 'Column_aSfExkdn1n',
  requestedDate: 'Column_CfnpI0WfZs',
  requestedDateTime: 'Column_NVG77RuP6w',
  status: 'Column_-P8pK-jH3f',
  ticketType: 'Column_35XdcpC8mV',
  category: 'Column_KXcqaFTF2u',
  subCategory: 'Column_78IQSfCTZ1',
  summary: 'Column_GJjL9mdkas',
  description: 'Column_Q-tearKUrH',
  attachments: 'Column_2UC3FnfCOI',
  criticality: 'Column_FOyWAeIw64',
  solution: 'Column_Qc3F8i0ILc',
  slaMinutes: 'Column_6FEEbVGpOh',
  requestId: 'Column_zJdeaoDWy8',
  lastCompletedStep: 'Column_QlLTvvnovg',
  instanceId: 'Column_6sisIX1XPC',
  activityInstanceId: 'Column_8aHLbMTa2j',
  plannedStart: 'Column_sjdmLpA2Wb',
  plannedEnd: 'Column_gCl5rjfQCF',
  onBehalfOf: 'Column_IMjMuGfTll',
  changeType: 'Column_vC8LXivuJo',
  impact: 'Column_L0w7nVlD_d',
  urgency: 'Column_3AbaPPOxbs',
  changeReason: 'Column_xKWFANk1dj',
  implementationPlan: 'Column_9s2my22WQl',
  backoutPlan: 'Column_OB5svLEKkw',
  testPlan: 'Column_ryWBS0Rj1T',
  finalComments: 'Column_PizerYIPb2',
  finalStatus: 'Column_rQfVpq_mbW',
  comments: 'Column_zuFw27tL5V',
  name: 'Column_cur8He1ZtM',
  createdBy: 'Column_TS3_Q8nuPB',
  modifiedBy: 'Column_O_rqIdBwqO',
  createdAt: 'Column_XILUKIzeKE',
  modifiedAt: 'Column_w6mLYTixxw',
  flowName: 'Column_ENGW8MIyNj',
  currentStep: 'Column_2nr58fXvtk',
  assignedTo: 'Column_Q7Ygw5jzjd',
  systemStatus: 'Column_Kyw2P3delW',
  /** Entity label — Refex vs Extrovis (Column_bmKcae3MCg) */
  entity: 'Column_bmKcae3MCg',
  /** Entity select — ModePro / KavisPharma / Extrovis / Refex */
  entitySelect: 'Column_3BS3PmwiFu',
  /** Refex — StepField (First Level Refex, Final Approver Refex, Implementation Refex) */
  firstApproverStepActivity: 'Column_H3T-K5hqQ6',
  finalApproverStepActivity: 'Column_kcKan9YBYo',
  implementationStepActivity: 'Column_xCbOWkV2TB',
  /** Extrovis — StepField (First Level Extrovis, Final Level Extrovis, Implementation Extrovis) */
  extrovisFirstApproverStepActivity: 'Column_3T-ElbLwVv',
  extrovisFinalApproverStepActivity: 'Column_UQK_zwxLVI',
  extrovisImplementationStepActivity: 'Column_4PxkyuKAL9',
  /** @deprecated Legacy open-activities column */
  openActivityInstances: 'Column_glrT0fNnpV',
  /** @deprecated */
  pendingActivityInstances: 'Column_9RjY3tJJY8',
};

const CR_FIELD = {
  requesterEmail: ['Column_-BMqFmhcjD', 'Requester_Email'],
  requesterName: ['Column_aSfExkdn1n', 'Requester_Name'],
  requestedDate: ['Column_CfnpI0WfZs', 'Requested_Date'],
  requestedDateTime: ['Column_NVG77RuP6w', 'Requester_Date__Time'],
  status: ['Column_-P8pK-jH3f', 'Statu', 'Column_Kyw2P3delW', '_status'],
  ticketType: ['Column_35XdcpC8mV', 'Ticket_Type'],
  entity: ['Column_bmKcae3MCg', 'Entity'],
  entitySelect: ['Column_3BS3PmwiFu', 'Entity_1'],
  category: ['Column_KXcqaFTF2u', 'Category'],
  subCategory: ['Column_78IQSfCTZ1', 'SubCategory'],
  summary: ['Column_GJjL9mdkas', 'Summary'],
  description: ['Column_Q-tearKUrH', 'Description'],
  attachments: ['Column_2UC3FnfCOI', 'Supporting_Documents'],
  criticality: ['Column_FOyWAeIw64', 'Criticality'],
  solution: ['Column_Qc3F8i0ILc', 'Solution'],
  slaMinutes: ['Column_6FEEbVGpOh', 'SLA_Timing_Min'],
  requestId: ['Column_zJdeaoDWy8', 'Request_ID'],
  lastCompletedStep: ['Column_QlLTvvnovg', 'last_completed_step_name'],
  instanceId: ['Column_6sisIX1XPC', 'Instance_ID', '_id'],
  activityInstanceId: ['Column_8aHLbMTa2j', 'Activity_Instance_ID'],
  openActivityInstances: [
    'Column_H3T-K5hqQ6',
    'Column_kcKan9YBYo',
    'Column_xCbOWkV2TB',
    'Column_3T-ElbLwVv',
    'Column_UQK_zwxLVI',
    'Column_4PxkyuKAL9',
    // Legacy Extrovis StepField ids (older reports)
    'Column_MhUcSbiQlz',
    'Column_5WevFedgrg',
    'Column_-Hxitv7cQD',
    'Column_glrT0fNnpV',
    'Column_9RjY3tJJY8',
  ],
  plannedStart: ['Column_sjdmLpA2Wb', 'Planned_Date'],
  plannedEnd: ['Column_gCl5rjfQCF', 'Planned_End'],
  onBehalfOf: ['Column_IMjMuGfTll', 'Raise_the_request_on_behalf_of'],
  changeType: ['Column_vC8LXivuJo', 'Change_Type'],
  impact: ['Column_L0w7nVlD_d', 'Impact'],
  urgency: ['Column_3AbaPPOxbs', 'Urgency'],
  changeReason: ['Column_xKWFANk1dj', 'Change_Reason'],
  implementationPlan: ['Column_9s2my22WQl', 'Implementation_Plans'],
  backoutPlan: ['Column_OB5svLEKkw', 'Backout_Plan'],
  testPlan: ['Column_ryWBS0Rj1T', 'Test_Plan'],
  finalComments: ['Column_PizerYIPb2', 'Final_Comments'],
  finalStatus: ['Column_rQfVpq_mbW', 'final_status'],
  comments: ['Column_zuFw27tL5V', 'Comments'],
  name: ['Column_cur8He1ZtM', 'Name', '_name'],
  createdBy: ['Column_TS3_Q8nuPB', '_created_by'],
  modifiedBy: ['Column_O_rqIdBwqO', '_modified_by'],
  createdAt: ['Column_XILUKIzeKE', '_created_at'],
  modifiedAt: ['Column_w6mLYTixxw', '_modified_at'],
  flowName: ['Column_ENGW8MIyNj', '_flow_name'],
  currentStep: ['Column_2nr58fXvtk', '_current_step'],
  assignedTo: ['Column_Q7Ygw5jzjd', '_current_assigned_to'],
};

export const CR_FORM_FIELDS = {
  finalStatus: 'final_status',
  finalComments: 'Final_Comments',
  solution: 'Solution',
  comments: 'Comments',
};

const CR_FIRST_APPROVER_ACTIVITY_IDS = [
  CR_FIRST_APPROVER_STEP,
  'First Approver - IT Manager',
  'First Level Extrovis',
  'First Level Refex',
  'First_Approver_IT_Manager',
  'First_Approver_IT_Manager_A00',
  'First Level Approver',
  'First_Level_Approver',
  'First_Level_Approver_A00',
  'CR First Approver',
  'CR_First_Approver',
  'CR_First_Approver_A00',
];
const CR_FINAL_APPROVER_ACTIVITY_IDS = [
  CR_FINAL_APPROVER_STEP,
  'Final Approver - IT Head',
  'Final Level Extrovis',
  'Final Approver Refex',
  'Final_Approver_IT_Head',
  'Final_Approver_IT_Head_A00',
  'Final Level Approver',
  'Final_Level_Approver',
  'Final_Level_Approver_A00',
  'Final Approver',
  'CR Final Approver',
  'CR_Final_Approver',
  'CR_Final_Approver_A00',
];
const CR_IMPLEMENTATION_ACTIVITY_IDS = [
  CR_IMPLEMENTATION_STEP,
  'Implementation',
  'Implementation Extrovis',
  'Implementation Refex',
  'Implementation_A00',
  'IT Agent Refex',
  'IT Agent Extrovis',
];

function getCrActivityIdsForStep(step) {
  if (step === CR_FINAL_APPROVER_STEP) return CR_FINAL_APPROVER_ACTIVITY_IDS;
  if (step === CR_IMPLEMENTATION_STEP) return CR_IMPLEMENTATION_ACTIVITY_IDS;
  return CR_FIRST_APPROVER_ACTIVITY_IDS;
}

/** IT Manager dashboard tabs — service queue oversight (agent pending + completed) */
export const MANAGER_STATUS_TABS = [
  { key: 'AgentPending', label: 'Agent Pending Tasks', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]', sdkStatus: 'agent' },
  { key: 'Completed', label: 'Completed', gradient: 'from-[#107C10] to-[#0B6A0B]', sdkStatus: 'completed' },
];

/** IT Admin dashboard tabs — service requests: Start → IT Agent (no IT Manager step) */
export const ADMIN_STATUS_TABS = [
  { key: 'All', label: 'All', gradient: 'from-[var(--it-brand-darker)] to-[#022f7a]' },
  { key: 'ITAgent', label: 'IT Agent', gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]' },
  { key: 'Completed', label: 'Completed', gradient: 'from-[#107C10] to-[#0B6A0B]' },
];

export const IT_AGENT_FORM_FIELDS = {
  itemStatus: 'Item_Status_1',
  solution: 'Resolution_Notes',
  holdReason: 'Reason_for_Hold',
  pendingReason: 'Reason_for_Pending',
  cancellationReason: 'Cancellation_Reason',
  slaIsPaused: 'SLA_Is_Paused',
  slaPausedAt: 'SLA_Paused_At',
  slaElapsedMinutes: 'SLA_Elapsed_Minutes',
  slaRemainingMinutes: 'SLA_Remaining_Minutes',
  slaLastResumedAt: 'SLA_Last_Resumed_At',
  assignedTo: '_current_assigned_to',
};

/** Kissflow native keys for Request_Tracking table field (API body). */
export const REQUEST_TRACKING_NATIVE_FIELDS = {
  table: 'Table::Request_Tracking',
  status: 'Statu_1',
  comments: 'Comments',
  dateTime: 'Date__Time',
};

function withNativeFieldKeys(colKey, ...nativeKeys) {
  const keys = colKey ? [colKey] : [];
  nativeKeys.forEach((key) => {
    if (key && !keys.includes(key)) keys.push(key);
  });
  return keys;
}

function buildServiceFieldMap(col) {
  return {
    requesterEmail: withNativeFieldKeys(col.requesterEmail, 'Requester_Email'),
    requesterName: withNativeFieldKeys(col.requesterName, 'Requester_Name'),
    requestedDate: withNativeFieldKeys(col.requestedDate, 'Requested_Date'),
    requestedDateTime: withNativeFieldKeys(col.requestedDateTime, 'Requester_Date__Time'),
    status: withNativeFieldKeys(col.status, col.systemStatus, 'Statu', '_status'),
    ticketType: withNativeFieldKeys(col.ticketType, col.ticketTypeDetail, 'Ticket_Type', 'Request_Type'),
    ticketTypeDetail: withNativeFieldKeys(col.ticketTypeDetail, 'Ticket_Type_Detail'),
    entity: withNativeFieldKeys(col.entity, 'Entity'),
    entitySelect: withNativeFieldKeys(col.entitySelect, 'Entity_1'),
    department: withNativeFieldKeys(col.department, 'Department'),
    location: withNativeFieldKeys(col.location, 'Location'),
    category: withNativeFieldKeys(col.category, 'Category'),
    subCategory: withNativeFieldKeys(col.subCategory, 'SubCategory'),
    summary: withNativeFieldKeys(col.summary, 'Summary'),
    description: withNativeFieldKeys(col.description, 'Description'),
    attachments: withNativeFieldKeys(col.attachments, 'Supporting_Documents'),
    criticality: withNativeFieldKeys(col.criticality, 'Criticality'),
    itemStatus: withNativeFieldKeys(col.itemStatus, col.status, col.systemStatus, 'Item_Status_1', 'Statu', '_status'),
    solution: withNativeFieldKeys(col.solution, 'Resolution_Notes', 'Solution'),
    holdReason: withNativeFieldKeys(col.holdReason, 'Reason_for_Hold'),
    pendingReason: withNativeFieldKeys(col.pendingReason, 'Reason_for_Pending'),
    cancellationReason: withNativeFieldKeys(col.cancellationReason, 'Cancellation_Reason'),
    slaMinutes: withNativeFieldKeys(col.slaMinutes, 'SLA_Timing_Min'),
    tatMinutes: withNativeFieldKeys(col.tatMinutes, 'TAT_Minutes'),
    closureMinutes: withNativeFieldKeys(col.closureMinutes, 'Closure_Time'),
    slaElapsedMinutes: withNativeFieldKeys(col.slaElapsedMinutes, 'SLA_Elapsed_Minutes'),
    slaLastResumedAt: withNativeFieldKeys(col.slaLastResumedAt, 'SLA_Last_Resumed_At'),
    slaIsPaused: withNativeFieldKeys(col.slaIsPaused, 'SLA_Is_Paused'),
    slaRemainingMinutes: withNativeFieldKeys(col.slaRemainingMinutes, 'SLA_Remaining_Minutes'),
    slaBreached: withNativeFieldKeys(col.slaBreached, 'SLA_Breached'),
    slaPausedAt: withNativeFieldKeys(col.slaPausedAt, 'SLA_Paused_At'),
    requestId: withNativeFieldKeys(col.requestId, 'Request_ID'),
    lastCompletedStep: withNativeFieldKeys(col.lastCompletedStep, 'last_completed_step_name'),
    instanceId: withNativeFieldKeys(col.instanceId, 'Instance_ID', '_id'),
    activityInstanceId: withNativeFieldKeys(col.activityInstanceId, 'Activity_Instance_ID'),
    name: withNativeFieldKeys(col.name, 'Name', '_name'),
    createdBy: withNativeFieldKeys(col.createdBy, '_created_by'),
    modifiedBy: withNativeFieldKeys(col.modifiedBy, '_modified_by'),
    createdAt: withNativeFieldKeys(col.createdAt, '_created_at'),
    modifiedAt: withNativeFieldKeys(col.modifiedAt, '_modified_at'),
    flowName: withNativeFieldKeys(col.flowName, '_flow_name'),
    currentStep: withNativeFieldKeys(col.currentStep, '_current_step'),
    assignedTo: withNativeFieldKeys(col.assignedTo, '_current_assigned_to'),
    source: withNativeFieldKeys(col.source, col.entitySource, 'Source', 'Channel', 'Raised_By'),
    entitySource: withNativeFieldKeys(col.entitySource, 'Entity_Source'),
    requestTracking: withNativeFieldKeys(col.requestTracking, REQUEST_TRACKING_NATIVE_FIELDS.table),
    userDetailsLookup: withNativeFieldKeys(col.userDetailsLookup, 'user_details_lookup'),
  };
}

function buildCrFieldMap(col) {
  const openActivityInstances = [
    col.firstApproverStepActivity,
    col.finalApproverStepActivity,
    col.implementationStepActivity,
    col.extrovisFirstApproverStepActivity,
    col.extrovisFinalApproverStepActivity,
    col.extrovisImplementationStepActivity,
    col.openActivityInstances,
    col.pendingActivityInstances,
  ].filter(Boolean);

  return {
    requesterEmail: [col.requesterEmail, 'Requester_Email'],
    requesterName: [col.requesterName, 'Requester_Name'],
    requestedDate: [col.requestedDate, 'Requested_Date'],
    requestedDateTime: [col.requestedDateTime, 'Requester_Date__Time'],
    status: [col.status, 'Statu', col.systemStatus, '_status'],
    ticketType: [col.ticketType, 'Ticket_Type'],
    entity: [col.entity, 'Entity'],
    entitySelect: [col.entitySelect, 'Entity_1'],
    category: [col.category, 'Category'],
    subCategory: [col.subCategory, 'SubCategory'],
    summary: [col.summary, 'Summary'],
    description: [col.description, 'Description'],
    attachments: [col.attachments, 'Supporting_Documents'],
    criticality: [col.criticality, 'Criticality'],
    solution: [col.solution, 'Solution'],
    slaMinutes: [col.slaMinutes, 'SLA_Timing_Min'],
    requestId: [col.requestId, 'Request_ID'],
    lastCompletedStep: [col.lastCompletedStep, 'last_completed_step_name'],
    instanceId: [col.instanceId, 'Instance_ID', '_id'],
    activityInstanceId: [col.activityInstanceId, 'Activity_Instance_ID'],
    openActivityInstances,
    plannedStart: [col.plannedStart, 'Planned_Date'],
    plannedEnd: [col.plannedEnd, 'Planned_End'],
    onBehalfOf: [col.onBehalfOf, 'Raise_the_request_on_behalf_of'],
    changeType: [col.changeType, 'Change_Type'],
    impact: [col.impact, 'Impact'],
    urgency: [col.urgency, 'Urgency'],
    changeReason: [col.changeReason, 'Change_Reason'],
    implementationPlan: [col.implementationPlan, 'Implementation_Plans'],
    backoutPlan: [col.backoutPlan, 'Backout_Plan'],
    testPlan: [col.testPlan, 'Test_Plan'],
    finalComments: [col.finalComments, 'Final_Comments'],
    finalStatus: [col.finalStatus, 'final_status'],
    comments: [col.comments, 'Comments'],
    name: [col.name, 'Name', '_name'],
    createdBy: [col.createdBy, '_created_by'],
    modifiedBy: [col.modifiedBy, '_modified_by'],
    createdAt: [col.createdAt, '_created_at'],
    modifiedAt: [col.modifiedAt, '_modified_at'],
    flowName: [col.flowName, '_flow_name'],
    currentStep: [col.currentStep, '_current_step'],
    assignedTo: [col.assignedTo, '_current_assigned_to'],
  };
}

/** Report column Ids — primary keys for row reads (rebuilt when entity profile is active). */
let FIELD = buildServiceFieldMap(COL);
let crFieldMap = null;

let activeDashboardProfile = null;
let activeServiceCol = COL;
let activeCrCol = CR_COL;
let activeServiceReportId = REPORT_ID;
let activeCrReportId = CHANGE_REQUEST_REPORT_ID;
let activeServiceProcessId = PROCESS_ID;

export function getActiveDashboardProfile() {
  return activeDashboardProfile;
}

export function getActiveServiceCol() {
  return activeServiceCol;
}

export function getActiveCrCol() {
  return activeCrCol;
}

/** Active entity's service process Id (Extrovis_A00 vs shared Refex process). */
export function getActiveServiceProcessId() {
  return activeServiceProcessId || PROCESS_ID;
}

function crField() {
  return crFieldMap || CR_FIELD;
}

export function setITDashboardProfile(profile) {
  activeDashboardProfile = profile || null;
  if (profile) {
    activeServiceCol = profile.serviceCol;
    activeCrCol = profile.crCol;
    activeServiceReportId = profile.serviceReportId;
    activeCrReportId = profile.crReportId;
    activeServiceProcessId = profile.processId || PROCESS_ID;
    FIELD = buildServiceFieldMap(profile.serviceCol);
    crFieldMap = buildCrFieldMap(profile.crCol);
  } else {
    activeServiceCol = COL;
    activeCrCol = CR_COL;
    activeServiceReportId = REPORT_ID;
    activeCrReportId = CHANGE_REQUEST_REPORT_ID;
    activeServiceProcessId = PROCESS_ID;
    FIELD = buildServiceFieldMap(COL);
    crFieldMap = null;
  }
}

export const KPI_VARS = {
  userName: 'User_Name',
  totalRecords: 'total_records',
  openTickets: 'open_tickets',
  completedRecords: 'completed_records',
  slaBreached: 'sla_breached',
};

export const AGENT_KPI_VARS = {
  userName: 'User_Name',
  totalRecords: 'total_records_agent',
  openTickets: 'open_agents',
  completedRecords: 'completed_agents',
  pendingTasks: 'pending_agents',
};

export const MANAGER_KPI_VARS = {
  userName: 'User_Name',
  totalRecords: 'total_manager',
  openTickets: 'open_manager',
  completedRecords: 'completed_manager',
  pendingTasks: 'pending_manager',
  agentPendingTasks: 'pending_full_manager',
};

export const ADMIN_KPI_VARS = {
  userName: 'User_Name',
  totalRecords: 'total_admin',
  openRecords: 'open_admin',
  completedRecords: 'completed_admin',
  pendingRecords: 'pending_admin',
};

export const MANAGER_FORM_FIELDS = {
  managerComments: 'Manager_Comments',
};

export const IT_AGENT_STEP = 'IT Agent';
export const IT_AGENT_REFEX_STEP = 'IT Agent Refex';
export const IT_TECH_SUPPORT_REFEX_STEP = 'IT Tech Support';
/** Refex round-robin entry step (formerly "IT Tech Pickup"). */
export const IT_TECH_REFEX_STEP = 'IT Tech';
/** Alias — older tickets / docs may still say Pickup. */
export const IT_TECH_PICKUP_REFEX_STEP = 'IT Tech Pickup';
export const IT_AGENT_EXTROVIS_STEP = 'IT Agent Extrovis';
/** Extrovis open-pool step — tickets available to all IT Agents Extrovis. */
export const IT_AGENT_PICKUP_STEP = 'IT Agent PickUp';
/** Extrovis owned-work step — after pickup (Refex Tech Support equivalent). */
export const IT_AGENT_SOLUTION_STEP = 'IT Agent Solution';
export const EMPLOYEE_APPROVAL_REFEX_STEP = 'Employee Approval Refex';
export const EMPLOYEE_FEEDBACK_REFEX_STEP = 'Employee Feedback';
/** Refex final hold step (48h) before Completed — replaces Employee Feedback. */
export const IT_TECH_REOPEN_REFEX_STEP = 'IT Tech Reopen';
export const IT_AGENT_ACTIVITY_ID = 'IT Agent';
export const START_STEP = WORKFLOW_STEPS[0];
export const IT_MANAGER_STEP = 'IT Manager';
/** Refex service-request approval steps (before / around agent work). */
export const L1_APPROVAL_STEP = 'L1 Approval';
export const L2_APPROVAL_STEP = 'L2 Approval';
export const IT_MANAGER_APPROVAL_STEP = 'IT Manager Approval';
export const IT_HEAD_APPROVAL_STEP = 'IT Head Approval';

/** Kissflow workflow activity ids — agent open-queue pending API (Extrovis_A00 process) */
export const IT_AGENT_EXTROVIS_PENDING_ACTIVITY_ID = 'Activity_9gAyNCIowD';
export const IT_AGENT_EXTROVIS_SOLUTION_ACTIVITY_ID = 'Activity_XVeFnZdKon';
export const EXTROVIS_DEPENDENCY_ASSIGNEE_ACTIVITY_ID = 'Activity_mtwvpxK-0q';
export const EXTROVIS_TECH_SUPPORT_AFTER_DEPENDENCY_ACTIVITY_ID = 'Activity_XSuxhIx9TQ';
export const EXTROVIS_EMPLOYEE_FEEDBACK_ACTIVITY_ID = 'Activity_7rCa3_zSic';
export const IT_AGENT_REFEX_PENDING_ACTIVITY_ID = 'Activity_9h2Y_0Yvdw';
export const IT_TECH_PICKUP_REFEX_ACTIVITY_ID = 'Activity_br-intVidq';
/** Same activity id as IT Tech Pickup — step renamed to IT Tech. */
export const IT_TECH_REFEX_ACTIVITY_ID = IT_TECH_PICKUP_REFEX_ACTIVITY_ID;
export const REFEX_DEPENDENCY_ASSIGNEE_ACTIVITY_ID = 'Activity_4ec092cgUY';
export const REFEX_TECH_SUPPORT_AFTER_DEPENDENCY_ACTIVITY_ID = 'Activity_tPGd7-Oggb';
export const REFEX_EMPLOYEE_FEEDBACK_ACTIVITY_ID = 'Activity_Ot8GrzZvSl';
/** Same activity id as former Employee Feedback — step renamed to IT Tech Reopen. */
export const REFEX_IT_TECH_REOPEN_ACTIVITY_ID = REFEX_EMPLOYEE_FEEDBACK_ACTIVITY_ID;
export const REFEX_L1_APPROVAL_ACTIVITY_ID = 'Activity_oghxnzOkyH';
export const REFEX_L2_APPROVAL_ACTIVITY_ID = 'Activity_WRjo7uuuOz';
export const REFEX_IT_MANAGER_APPROVAL_ACTIVITY_ID = 'Activity_-_FFwHdMSN';
export const REFEX_IT_HEAD_APPROVAL_ACTIVITY_ID = 'Activity_ZPJhIX0l3A';

export const REFEX_AGENT_WORK_ACTIVITY_IDS = [
  IT_TECH_REFEX_ACTIVITY_ID,
  IT_AGENT_REFEX_PENDING_ACTIVITY_ID,
  REFEX_DEPENDENCY_ASSIGNEE_ACTIVITY_ID,
  REFEX_TECH_SUPPORT_AFTER_DEPENDENCY_ACTIVITY_ID,
  REFEX_IT_TECH_REOPEN_ACTIVITY_ID,
];

export const REFEX_SERVICE_APPROVAL_ACTIVITY_IDS = [
  REFEX_L1_APPROVAL_ACTIVITY_ID,
  REFEX_L2_APPROVAL_ACTIVITY_ID,
  REFEX_IT_MANAGER_APPROVAL_ACTIVITY_ID,
  REFEX_IT_HEAD_APPROVAL_ACTIVITY_ID,
];

const IT_AGENT_ACTIVITY_IDS = [
  IT_AGENT_EXTROVIS_PENDING_ACTIVITY_ID,
  IT_AGENT_EXTROVIS_SOLUTION_ACTIVITY_ID,
  IT_TECH_REFEX_ACTIVITY_ID,
  IT_AGENT_REFEX_PENDING_ACTIVITY_ID,
  IT_AGENT_STEP,
  IT_AGENT_REFEX_STEP,
  IT_AGENT_PICKUP_STEP,
  IT_AGENT_SOLUTION_STEP,
  IT_TECH_REFEX_STEP,
  IT_TECH_PICKUP_REFEX_STEP,
  'IT Agent',
  'IT Agent Refex',
  'IT_Agent',
  'IT_Agent_A00',
];

function getAgentPendingActivityIdsForFetch() {
  if (activeDashboardProfile?.id === 'extrovis') {
    // Same flow as Refex — IT Agent, Dependency Assignee, After Dependency.
    return activeDashboardProfile.agentWorkActivityIds
      || [activeDashboardProfile.agentPendingActivityId || IT_AGENT_EXTROVIS_PENDING_ACTIVITY_ID];
  }
  if (activeDashboardProfile?.id === 'refex') {
    return REFEX_AGENT_WORK_ACTIVITY_IDS;
  }
  return IT_AGENT_ACTIVITY_IDS;
}

function isEntityScopedDashboardProfile() {
  const id = activeDashboardProfile?.id;
  return id === 'extrovis' || id === 'refex';
}

/** Refex auto-assigns — no Open / Open Tickets service tab. Venwind shares Refex process. */
export function isRefexServiceDashboardContext(entityTab = '') {
  const tab = normalizeText(entityTab);
  // Explicit entity selection wins (multi-entity Head / Admin dropdowns).
  if (tab) return tab === 'Refex' || tab === 'Venwind';
  return activeDashboardProfile?.id === 'refex';
}

/** Entity keys that share Live_IT_Service_Request_Extrovis_A00 / All_tickets_A00. */
export const EXTROVIS_REPORT_ENTITY_KEYS = new Set([
  'Extrovis',
  'Kavis',
  'KavisPharma',
  'PharmaPack',
  'ModePro',
  'Modepro',
]);

/** True when the entity tab loads the Extrovis All_tickets report (filter by Entity field). */
export function isExtrovisReportEntity(entityTab = '') {
  return EXTROVIS_REPORT_ENTITY_KEYS.has(normalizeText(entityTab));
}

export function isExtrovisServiceDashboardContext(entityTab = '') {
  const tab = normalizeText(entityTab);
  // Extrovis-family tabs (Kavis / Pharma Pack / Modepro) share the Extrovis process.
  if (tab) return isExtrovisReportEntity(tab);
  return activeDashboardProfile?.id === 'extrovis';
}

/** Queue switch labels — Extrovis/Modepro family uses SR & INC, Refex stays Service. */
export function getAgentQueueTabs() {
  if (isExtrovisServiceDashboardContext()) {
    return [
      {
        key: 'ServiceQueue',
        label: 'SR & INC',
        subtitle: 'Service Request & Incident',
        gradient: 'from-[var(--it-brand-primary)] to-[var(--it-brand-darker)]',
      },
      {
        key: 'ChangeRequests',
        label: 'Change',
        subtitle: 'Change Requests',
        gradient: 'from-[var(--it-brand-darker)] to-[var(--it-brand-darker)]',
      },
    ];
  }
  return AGENT_QUEUE_TABS;
}

/**
 * Refex-style MIS chrome (KPI cards, column filters, layout).
 * UI-only — does not change Refex/Extrovis data-loading paths.
 */
export function isModernMisServiceLayoutContext(entityTab = '') {
  return isRefexServiceDashboardContext(entityTab) || isExtrovisServiceDashboardContext(entityTab);
}

/**
 * Extrovis runs the exact same service workflow as Refex (same steps, statuses,
 * cards, and MIS tables) — only the report/columns differ. Shared matcher gate.
 */
export function usesRefexServiceWorkflow(entityTab = '') {
  return isRefexServiceDashboardContext(entityTab) || isExtrovisServiceDashboardContext(entityTab);
}

/** Agent / Manager Extrovis entity selector (API profile switch + client filter). */
export const EXTROVIS_DASHBOARD_ENTITY_OPTIONS = [
  { key: 'Extrovis', label: 'Extrovis' },
  { key: 'Kavis', label: 'Kavis' },
  { key: 'PharmaPack', label: 'Pharma Pack' },
  { key: 'ModePro', label: 'Modepro' },
];

/**
 * @deprecated Empty placeholder tabs removed — Kavis / Pharma Pack / Modepro share
 * the Extrovis All_tickets report and filter by the Entity column.
 */
export function isEmptyExtrovisEntityTab(_entityTab = '') {
  return false;
}

/**
 * Shared Kissflow process / mapped-dataset key.
 * Refex and Venwind are the same All_tickets report — client-filter only.
 */
export function resolveEntityProcessDatasetKey(entityTab = '') {
  if (isRefexServiceDashboardContext(entityTab)) return 'RefexProcess';
  return normalizeText(entityTab) || 'default';
}

export function sharesEntityProcessDataset(a = '', b = '') {
  return resolveEntityProcessDatasetKey(a) === resolveEntityProcessDatasetKey(b);
}

/**
 * Entity key used for shared Refex/Extrovis MIS chrome (tabs, KPI cards, table).
 * Extrovis-family entities (Kavis / Modepro / Pharma Pack) keep Extrovis chrome.
 * Venwind shares Refex chrome (same process, company filter).
 */
export function resolveModernMisChromeEntityKey(entityTab = '') {
  const tab = normalizeText(entityTab);
  if (tab === 'Refex' || tab === 'Venwind' || isRefexServiceDashboardContext(tab)) return 'Refex';
  if (tab === 'Extrovis' || isExtrovisReportEntity(tab)) return 'Extrovis';
  if (!tab) {
    if (activeDashboardProfile?.id === 'refex') return 'Refex';
    if (activeDashboardProfile?.id === 'extrovis') return 'Extrovis';
  }
  return tab;
}

/** True when the dashboard should render Refex/Extrovis MIS chrome for this entity. */
export function usesModernMisChrome(entityTab = '') {
  const key = resolveModernMisChromeEntityKey(entityTab);
  return key === 'Refex' || key === 'Extrovis';
}

const REFEX_HIDDEN_SERVICE_TAB_KEYS = new Set(['Open']);

export function filterServiceQueueStatusTabs(tabs, { entityTab = '' } = {}) {
  if (!usesRefexServiceWorkflow(entityTab)) return tabs || [];
  return (tabs || []).filter((tab) => !REFEX_HIDDEN_SERVICE_TAB_KEYS.has(tab.key));
}

export function getEmployeeStatusTabs(entityTab = '') {
  return filterServiceQueueStatusTabs(EMPLOYEE_STATUS_TABS, { entityTab });
}

export function getAgentStatusTabs(entityTab = '') {
  const chromeKey = resolveModernMisChromeEntityKey(entityTab);
  if (isExtrovisServiceDashboardContext(chromeKey) || (!normalizeText(entityTab) && isExtrovisServiceDashboardContext())) {
    return EXTROVIS_TECH_SUPPORT_STATUS_TABS;
  }
  if (isRefexServiceDashboardContext(chromeKey) || (!normalizeText(entityTab) && isRefexServiceDashboardContext())) {
    return REFEX_TECH_SUPPORT_STATUS_TABS;
  }
  if (usesModernMisChrome(entityTab)) {
    return chromeKey === 'Extrovis' ? EXTROVIS_TECH_SUPPORT_STATUS_TABS : REFEX_TECH_SUPPORT_STATUS_TABS;
  }
  return filterServiceQueueStatusTabs(AGENT_STATUS_TABS, { entityTab });
}

export function getApproverServiceTabs(entityTab = '') {
  const chromeKey = resolveModernMisChromeEntityKey(entityTab);
  if (chromeKey === 'Extrovis' || (!normalizeText(entityTab) && isExtrovisServiceDashboardContext())) {
    return EXTROVIS_MONITORING_SERVICE_TABS;
  }
  if (chromeKey === 'Refex' || usesModernMisChrome(entityTab) || (!normalizeText(entityTab) && isRefexServiceDashboardContext())) {
    return REFEX_MONITORING_SERVICE_TABS;
  }
  return filterServiceQueueStatusTabs(APPROVER_SERVICE_TABS, { entityTab });
}

export function getAdminServiceTabs(entityTab = '') {
  if (usesModernMisChrome(entityTab) || usesRefexServiceWorkflow(entityTab)) {
    return REFEX_ADMIN_SERVICE_TABS;
  }
  return ADMIN_STATUS_TABS;
}

export function resolveDefaultServiceStatusTab(tabs, { prefer = 'PendingTask' } = {}) {
  const keys = (tabs || []).map((tab) => tab.key);
  if (keys.includes(prefer)) return prefer;
  if (prefer === 'PendingTask' && keys.includes('InProgress')) return 'InProgress';
  if (prefer === 'OpenTickets' && keys.includes('PendingTask')) return 'PendingTask';
  if (prefer === 'Open' && keys.includes('InProgress')) return 'InProgress';
  return keys[0] || prefer;
}

export function countCriticalHighPriorityRows(rows = []) {
  return (rows || []).filter((row) => {
    const p = normalizeText(row?.criticality).toLowerCase();
    return p === 'critical' || p === 'high';
  }).length;
}

function inferEntityKeyFromStepLabel(stepLabel) {
  const token = normalizeText(stepLabel).toLowerCase().replace(/[\s_-]+/g, '');
  if (!token) return '';
  if (token.includes('refex')) return 'Refex';
  if (token.includes('extrovis')) return 'Extrovis';
  return '';
}

function resolveServiceItemEntityKey(item) {
  if (!item) return '';

  // Prefer the report Entity column (Extrovis All_tickets is multi-entity).
  const fromFields = readServiceEntityKey(item);
  if (fromFields) return fromFields;

  // Dedicated Refex process — blank Entity defaults to Refex.
  if (activeDashboardProfile?.id === 'refex') return 'Refex';

  const fromStep = inferEntityKeyFromStepLabel(getCurrentStepValue(item));
  if (fromStep) return fromStep;

  const fromLastStep = inferEntityKeyFromStepLabel(
    normalizeText(getItemValue(item, FIELD.lastCompletedStep)),
  );
  if (fromLastStep) return fromLastStep;

  const serviceCol = getActiveServiceCol();
  if (
    serviceCol.itAgentRefexActivity
    && pickSrInProgressActivityFromColumn(item, serviceCol.itAgentRefexActivity)
  ) {
    return 'Refex';
  }
  if (
    serviceCol.itAgentActivity
    && pickSrInProgressActivityFromColumn(item, serviceCol.itAgentActivity)
  ) {
    return 'Extrovis';
  }

  return '';
}

function detectCrItemEntityKey(item) {
  if (!item) return '';
  const fromFields = normalizeEntityKey({
    entity: stringifyKfValue(getCrItemValue(item, crField().entity))
      || stringifyKfValue(getCrItemValue(item, crField().entitySelect)),
  });
  if (fromFields) return fromFields;

  const parent = getCrParentEntity(item);
  if (parent === 'refex') return 'Refex';
  if (parent === 'extrovis') return 'Extrovis';

  const fromStep = inferEntityKeyFromStepLabel(getCrCurrentStepValue(item));
  if (fromStep) return fromStep;

  const crCol = getActiveCrCol();
  const refexCount = [
    crCol.firstApproverStepActivity,
    crCol.finalApproverStepActivity,
    crCol.implementationStepActivity,
  ].reduce((count, col) => count + pickCrStepFieldEntries(item, col).length, 0);
  const extrovisCount = [
    crCol.extrovisFirstApproverStepActivity,
    crCol.extrovisFinalApproverStepActivity,
    crCol.extrovisImplementationStepActivity,
  ].reduce((count, col) => count + pickCrStepFieldEntries(item, col).length, 0);
  if (refexCount > 0 && extrovisCount === 0) return 'Refex';
  if (extrovisCount > 0 && refexCount === 0) return 'Extrovis';

  return '';
}

function resolveDashboardEntityKey(itemOrRow, { kind = 'service' } = {}) {
  if (!itemOrRow) return '';
  // Prefer mapped Entity field (Extrovis All_tickets is multi-entity).
  const rowEntity = normalizeEntityKey(itemOrRow);
  if (rowEntity) return rowEntity;

  // Dedicated Refex process only — blank Entity defaults to Refex.
  if (kind !== 'cr' && activeDashboardProfile?.id === 'refex') return 'Refex';

  const raw = itemOrRow?.raw ?? itemOrRow;
  return kind === 'cr' ? detectCrItemEntityKey(raw) : resolveServiceItemEntityKey(raw);
}

function readServiceEntityKey(item) {
  const raw = stringifyKfValue(getItemValue(item, FIELD.entity))
    || stringifyKfValue(getItemValue(item, FIELD.entitySelect));
  return normalizeEntityKey({ entity: raw });
}

export function matchesActiveDashboardEntityItem(item, { trustEmptyEntity = false, kind = 'service' } = {}) {
  if (!isEntityScopedDashboardProfile()) return true;
  // Dedicated Extrovis/Refex service process — all report rows belong here.
  if (kind !== 'cr' && (activeDashboardProfile.id === 'extrovis' || activeDashboardProfile.id === 'refex')) {
    return true;
  }
  const key = resolveDashboardEntityKey(item, { kind });
  if (!key) return true;
  if (activeDashboardProfile.id === 'extrovis') return key === 'Extrovis';
  if (activeDashboardProfile.id === 'refex') return key === 'Refex';
  return false;
}

export function matchesActiveDashboardEntityRow(row, { trustEmptyEntity = false, kind = '' } = {}) {
  if (!isEntityScopedDashboardProfile()) return true;
  const resolvedKind = kind || (row?.queueType === 'change' ? 'cr' : 'service');
  if (resolvedKind !== 'cr' && (activeDashboardProfile.id === 'extrovis' || activeDashboardProfile.id === 'refex')) {
    return true;
  }
  const key = resolveDashboardEntityKey(row, { kind: resolvedKind });
  if (!key) {
    return trustEmptyEntity
      || matchesActiveDashboardEntityItem(row?.raw, { kind: resolvedKind, trustEmptyEntity: true });
  }
  if (activeDashboardProfile.id === 'extrovis') return key === 'Extrovis';
  if (activeDashboardProfile.id === 'refex') return key === 'Refex';
  return false;
}

export function filterEntityScopedRows(rows, { kind = '' } = {}) {
  if (!isEntityScopedDashboardProfile()) return rows || [];
  return (rows || []).filter((row) => matchesActiveDashboardEntityRow(row, { kind, trustEmptyEntity: false }));
}

function getCrPendingActivityIdsForEntityFetch() {
  const fromProfile = activeDashboardProfile?.crPendingActivityIds;
  if (fromProfile?.length) return fromProfile;
  if (activeDashboardProfile?.id === 'extrovis') {
    return ['First Level Extrovis', 'Final Level Extrovis', 'Implementation Extrovis'];
  }
  if (activeDashboardProfile?.id === 'refex') {
    return ['First Level Refex', 'Final Approver Refex', 'Implementation Refex'];
  }
  return [];
}

const IT_MANAGER_ACTIVITY_IDS = ['IT Manager', 'IT_Manager', 'IT_Manager_A00'];

function buildITProcessApiPaths(kfInstance) {
  const accountId = resolveAccountId(kfInstance);
  const appQuery = `_application_id=${encodeURIComponent(APP_ID)}`;
  const processId = getActiveServiceProcessId();
  const base = `/process/2/${accountId}/${processId}`;
  return {
    pendingAtStepPath(activityId, pageNumber = 1, pageSize = 100) {
      return `${base}/pending/${encodeURIComponent(activityId)}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    myItemsPath(status = 'all', pageNumber = 1, pageSize = 100) {
      return `${base}/myitems/${status}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    participatedActivityCountPath() {
      return `${base}/participated/activity/count?${appQuery}`;
    },
    participatedAtActivityPath(activityId, pageNumber = 1, pageSize = 100) {
      return `${base}/participated/activity/${encodeURIComponent(activityId)}?page_number=${pageNumber}&page_size=${pageSize}&apply_preference=true&${appQuery}`;
    },
    /** @deprecated Kissflow uses activity-scoped participated APIs. */
    participatedPath(pageNumber = 1, pageSize = 100) {
      return `${base}/participated?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    instancePath(instanceId) {
      return `${base}/${encodeURIComponent(instanceId)}?${appQuery}`;
    },
    instanceWithActivityPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}?${appQuery}`;
    },
    instanceSubmitPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/submit?${appQuery}`;
    },
    instanceReassignPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/reassign?${appQuery}`;
    },
    instanceFieldDropdownPath(instanceId, activityInstanceId, fieldName) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/${encodeURIComponent(fieldName)}/dropdown?&${appQuery}`;
    },
    instanceActivityPath(instanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/activity?${appQuery}`;
    },
    taskCommentsPath(instanceId) {
      return `${base}/task/${encodeURIComponent(instanceId)}/comment?${appQuery}`;
    },
    taskActivityCommentPath(instanceId, activityInstanceId) {
      return `${base}/task/${encodeURIComponent(instanceId)}/activity/${encodeURIComponent(activityInstanceId)}/comment?${appQuery}`;
    },
    assigneeReassigneesPath(instanceId, activityInstanceId, pageNumber = 1, pageSize = 50) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/assignee/reassignees?page_number=${pageNumber}&page_size=${pageSize}&${appQuery}`;
    },
  };
}

/** @deprecated Kissflow assigns EventId per comment session — use fetchITServiceCommentSession instead. */
export const IT_SERVICE_COMMENT_EVENT_ID = 'Ev_WPYv9EwODF';

export function parseKfCommentText(comment) {
  if (!comment) return '';
  const raw = normalizeText(comment.RawContent);
  if (raw) return raw;
  const blocks = Array.isArray(comment.Content) ? comment.Content : [];
  const lines = blocks.map((block) => {
    const nodes = Array.isArray(block?.nodes) ? block.nodes : [];
    return nodes.map((node) => normalizeText(node?.text)).join('');
  });
  return lines.join('\n').trim();
}

function pickCommentEventId(resp) {
  if (!resp || typeof resp !== 'object') return '';
  const direct = normalizeText(
    resp?.EventId || resp?.eventId || resp?.CommentEventId || resp?.commentEventId,
  );
  if (direct) return direct;
  for (const value of Object.values(resp)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = pickCommentEventId(value);
      if (nested) return nested;
    }
  }
  return '';
}

/** Kissflow UI generates a fresh Ev_* id per comment POST — not returned by GET on activity comment. */
export function createCommentEventId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    let suffix = '';
    for (let i = 0; i < bytes.length; i += 1) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
    return `Ev_${suffix}`;
  }
  return `Ev_${Math.random().toString(36).slice(2, 12)}`;
}

export function normalizeKfCommentsResponse(resp) {
  const list = Array.isArray(resp?.Comments) ? resp.Comments : [];
  return [...list].sort((a, b) => {
    const ta = new Date(a?._created_at || 0).getTime() || 0;
    const tb = new Date(b?._created_at || 0).getTime() || 0;
    return ta - tb;
  });
}

/** Load comments from task-level GET; EventId for POST is generated client-side (activity comment URL is POST-only). */
export async function fetchITServiceCommentSession(kfInstance, row, { role = 'agent' } = {}) {
  const { instanceId, activityInstanceId } = await resolveITServiceCommentActivityId(kfInstance, row, { role });
  if (!instanceId) {
    return { comments: [], eventId: createCommentEventId(), instanceId: '', activityInstanceId: '' };
  }

  const paths = buildITProcessApiPaths(kfInstance);
  let comments = [];

  try {
    const resp = await kfGetJson(kfInstance, paths.taskCommentsPath(instanceId));
    comments = normalizeKfCommentsResponse(resp);
  } catch (err) {
    console.warn('task comment list failed:', err?.message || err);
  }

  const eventId = pickCommentEventId(comments.length ? { Comments: comments } : {}) || createCommentEventId();

  return { comments, eventId, instanceId, activityInstanceId };
}

export async function fetchITServiceRequestComments(kfInstance, instanceId) {
  const id = normalizeText(instanceId);
  if (!id) return [];
  const session = await fetchITServiceCommentSession(kfInstance, { id });
  return session.comments;
}

async function fetchITServiceOpenActivityInstanceId(kfInstance, instanceId, hintId = '') {
  if (!instanceId || !kfInstance?.api) return normalizeText(hintId);

  const paths = buildITProcessApiPaths(kfInstance);
  try {
    const activities = await kfGetJson(kfInstance, paths.instanceActivityPath(instanceId));
    const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);
    for (const act of list || []) {
      const actId = normalizeText(
        act?._activity_instance_id || act?._id || act?.Id || act?.activity_instance_id,
      );
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      if (
        actId
        && actStatus !== 'completed'
        && actStatus !== 'cancelled'
        && actStatus !== 'canceled'
      ) {
        return actId;
      }
    }
  } catch (err) {
    console.warn('open activity lookup failed:', err?.message || err);
  }

  return normalizeText(hintId);
}

function pickEmployeeCommentActivityInstanceId(item) {
  if (!item) return '';
  const serviceCol = getActiveServiceCol();
  const candidates = [
    getItemValue(item, FIELD.activityInstanceId),
    item?.[serviceCol.activityInstanceId],
    item._activity_instance_id,
    item._context_activity_instance_id,
  ];
  for (const candidate of candidates) {
    const id = pickFirstId(candidate);
    if (id) return id;
  }
  return '';
}

function pickAgentCommentActivityInstanceId(item) {
  if (!item) return '';
  return pickSrOpenActivityInstanceIdFromReport(item) || pickActivityInstanceId(item);
}

async function fetchITServiceRequesterActivityInstanceId(kfInstance, instanceId, item) {
  const fromReport = pickEmployeeCommentActivityInstanceId(item);
  if (fromReport) return fromReport;
  if (!instanceId || !kfInstance?.api) return '';

  const paths = buildITProcessApiPaths(kfInstance);
  const agentSteps = new Set([
    IT_AGENT_STEP.toLowerCase(),
    IT_AGENT_REFEX_STEP.toLowerCase(),
    IT_AGENT_EXTROVIS_STEP.toLowerCase(),
    IT_AGENT_PICKUP_STEP.toLowerCase(),
    IT_AGENT_SOLUTION_STEP.toLowerCase(),
    IT_TECH_SUPPORT_REFEX_STEP.toLowerCase(),
  ]);

  try {
    const activities = await kfGetJson(kfInstance, paths.instanceActivityPath(instanceId));
    const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);
    for (const act of list || []) {
      const step = normalizeText(
        act?.Name || act?.Activity_Name || act?.activity_name || act?.Step_Name || act?.step_name,
      ).toLowerCase();
      const actId = normalizeText(
        act?._activity_instance_id || act?._id || act?.Id || act?.activity_instance_id,
      );
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      if (!actId || actStatus === 'completed' || actStatus === 'cancelled' || actStatus === 'canceled') {
        continue;
      }
      if (!agentSteps.has(step)) return actId;
    }
  } catch (err) {
    console.warn('requester activity lookup failed:', err?.message || err);
  }

  return '';
}

export async function resolveITServiceCommentActivityId(kfInstance, row, { role = 'agent' } = {}) {
  const instanceId = normalizeText(row?.id);
  const item = row?.raw ?? row;
  let activityInstanceId = '';

  if (role === 'employee') {
    activityInstanceId = pickEmployeeCommentActivityInstanceId(item);
    if (!activityInstanceId && instanceId && kfInstance?.api) {
      try {
        activityInstanceId = await fetchITServiceRequesterActivityInstanceId(kfInstance, instanceId, item);
      } catch {
        activityInstanceId = '';
      }
    }
  } else {
    activityInstanceId = pickAgentCommentActivityInstanceId(item)
      || normalizeText(row?.activityInstanceId);

    if (!activityInstanceId) {
      const ids = resolveAgentSubmitIdsFromReport(row);
      activityInstanceId = normalizeText(ids.activityInstanceId);
    }

    if (!activityInstanceId && instanceId && kfInstance?.api) {
      try {
        activityInstanceId = await fetchITServiceOpenActivityInstanceId(
          kfInstance,
          instanceId,
          pickAgentCommentActivityInstanceId(item),
        );
      } catch {
        activityInstanceId = '';
      }
    }

    if (!activityInstanceId && kfInstance?.api) {
      try {
        activityInstanceId = await fetchITAgentActivityInstanceId(kfInstance, row);
      } catch {
        activityInstanceId = '';
      }
    }
  }

  return { instanceId, activityInstanceId };
}

export async function postITServiceRequestComment(kfInstance, row, text, eventId = '', { role = 'agent' } = {}) {
  const message = normalizeText(text);
  if (!message) throw new Error('Comment cannot be empty');

  const { instanceId, activityInstanceId } = await resolveITServiceCommentActivityId(kfInstance, row, { role });
  if (!instanceId || !activityInstanceId) {
    throw new Error('Could not resolve activity for this ticket. Try again in a moment.');
  }

  let resolvedEventId = normalizeText(eventId) || createCommentEventId();

  const paths = buildITProcessApiPaths(kfInstance);
  const payload = {
    Content: [{
      type: 'paragraph',
      data: {},
      nodes: [{ type: 'text', text: message }],
    }],
    InstanceName: normalizeText(row?.name) || normalizeText(row?.flowName) || 'Live IT Service Request',
    AtMention: {},
    EventId: resolvedEventId,
  };

  const result = await kfPostCommentJson(
    kfInstance,
    paths.taskActivityCommentPath(instanceId, activityInstanceId),
    payload,
  );

  const nextEventId = createCommentEventId();
  return { ...result, eventId: nextEventId };
}

export function extractItemsFromResponse(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  const keys = ['Data', 'data', 'items', 'Items', 'records', 'Records'];
  for (const key of keys) {
    if (Array.isArray(resp[key])) return resp[key];
  }
  if (Array.isArray(resp?.data?.items)) return resp.data.items;
  if (Array.isArray(resp?.Data?.items)) return resp.Data.items;
  return [];
}

export const IT_DASHBOARD_SERVER_PAGE_SIZE = 100;

/** Refex / Extrovis monitoring + employee report walk page size. */
export const REFEX_REPORT_PAGE_SIZE = 500;

export function reportPageHasMore(items, pageSize = IT_DASHBOARD_SERVER_PAGE_SIZE) {
  return Array.isArray(items) && items.length >= pageSize;
}

function mergeUniqueItems(batches) {
  const byId = new Map();
  for (const batch of batches) {
    for (const item of batch || []) {
      const id = normalizeText(item?._id || item?._item_id);
      if (!id) continue;
      const existing = byId.get(id);
      byId.set(id, existing ? mergeITItemWithReport(item, existing) : item);
    }
  }
  return Array.from(byId.values());
}

export const ITEM_STATUS_OPTIONS = [
  'Open',
  'In Progress',
  'Pending User Response',
  'Cancelled',
  'Hold',
  'Resolved',
];

/** Statuses shown on Pending Task → Update (after accept / in progress) */
export const AGENT_UPDATE_STATUS_ALIASES = [
  'Pending User Response',
  'Cancelled',
  'Hold',
  'Resolved',
];

export const AGENT_TERMINAL_STATUS_ALIASES = ['Resolved', 'Cancelled'];
export const AGENT_HOLD_STATUS_ALIASES = ['On Hold', 'Hold'];
export const AGENT_PENDING_USER_STATUS_ALIASES = [
  'Pending with User',
  'Pending User Response',
  'Pending Notes from User',
  'Pending for User',
];
export const AGENT_IN_PROGRESS_STATUS_ALIASES = ['In Progress', 'Picked'];

export const AGENT_WORKFLOW_SUBMIT_STATUS = 'Resolved';

export const SLA_AT_RISK_REMAINING_MINUTES = 30;
export const SLA_AT_RISK_PERCENT_USED = 75;
/** Pending Approval has no Stages / Closure_Time — static 120 minute budget. */
export const PENDING_APPROVAL_SLA_MINUTES = 120;
/** Extrovis Open Tickets (PickUp) — TAT clock from created time when field is empty. */
export const EXTROVIS_PICKUP_TAT_MINUTES = 120;

function normalizeProcessStageToken(value) {
  return normalizeText(value).toLowerCase().replace(/[\s_-]+/g, '');
}

/** Extrovis My Tickets work steps — Solution / Dependency / After Dependency. */
function isExtrovisOwnedWorkStep(row) {
  if (!row || isExtrovisAgentPickupStep(row)) return false;
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;
  const step = normalizeText(getCurrentStepValue(row) || row?.currentStep).toLowerCase();
  if (!step) return false;
  if (step.includes('reopen') || step.includes('employee feedback') || step.includes('approval')) {
    return false;
  }
  return step.includes('solution')
    || step.includes('dependency')
    || step.includes('after dependency')
    || step.includes('it agent');
}

/**
 * Extrovis live SLA stage — process Stages or the Stage column (Statu_1).
 * Stage InProgress must start the clock even when process Stages is empty.
 */
function isExtrovisLiveSlaStage(row) {
  if (isServiceProcessStageInProgress(row)) return true;
  const ticketStage = readTicketStatusField(row) || row?.ticketStage || '';
  return normalizeProcessStageToken(ticketStage) === 'inprogress';
}

function getExtrovisPickupSlaStartRaw(itemOrRow) {
  if (!itemOrRow) return null;
  return itemOrRow?.createdAtRaw
    || itemOrRow?.requestedDateTimeRaw
    || itemOrRow?.raw?._created_at
    || getItemValue(itemOrRow?.raw ?? itemOrRow, [
      getActiveServiceCol()?.createdAt,
      FIELD.createdAt,
      FIELD.requestedDateTime,
    ])
    || null;
}

export function getServiceProcessStagesValue(row) {
  if (!row) return '';
  // SLA Hold/InProgress uses process Stages only — never Statu_1 / Ticket Status.
  return readProcessStagesField(row) || '';
}

export function isServiceProcessStageInProgress(row) {
  return normalizeProcessStageToken(getServiceProcessStagesValue(row)) === 'inprogress';
}

export function isServiceSlaPendingApprovalRow(row) {
  if (!row) return false;
  if (activeDashboardProfile?.id === 'extrovis') return false;
  if (isRefexServiceClosedTicket(row) || isRefexServiceProcessCompleted(row)) return false;
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;
  return isRefexServiceApprovalStep(row);
}

/** IT Agent Solution (Extrovis) / IT Tech Support (Refex) — plus After Dependency. */
export function isItAgentSolutionSlaStep(row) {
  if (!row) return false;
  const step = normalizeText(getCurrentStepValue(row) || row?.currentStep).toLowerCase();
  if (!step) return false;
  if (
    step.includes('reopen')
    || step.includes('employee feedback')
    || step.includes('pickup')
    || step.includes('pick up')
    || step.includes('pick-up')
    || step.includes('approval')
  ) {
    return false;
  }
  if (step.includes('after dependency') || step.includes('afterdependency')) return true;
  if (step.includes('it agent solution')) return true;
  if (step.includes('solution') && !step.includes('dependency')) return true;
  if (step.includes('tech support') && !step.includes('reopen')) return true;
  return false;
}

function isAgentSolutionSlaActivity(entry) {
  if (!entry) return false;
  if (isItsmBotOrSystemActor(entry?.actedBy)) return false;
  const step = normalizeText(entry?.step || entry?.stepName || entry?.name).toLowerCase();
  if (!step) return false;
  if (step.includes('reopen') || step.includes('employee feedback')) return false;
  if (step.includes('pickup') || step.includes('pick up') || step.includes('pick-up')) return false;
  if (step.includes('approval')) return false;
  if (step.includes('after dependency') || step.includes('afterdependency')) return true;
  if (step.includes('dependency')) return false;
  return step.includes('solution') || step.includes('tech support');
}

function getAgentSolutionSlaActivities(itemOrRow) {
  const activities = Array.isArray(itemOrRow?.itAgentActivities) ? itemOrRow.itAgentActivities : [];
  return activities.filter(isAgentSolutionSlaActivity);
}

function getRowLastModifiedRaw(itemOrRow) {
  if (!itemOrRow) return null;
  return itemOrRow?.modifiedAtRaw
    || itemOrRow?.raw?._modified_at
    || itemOrRow?.techSupportMyTaskItem?._modified_at
    || getItemValue(itemOrRow?.raw ?? itemOrRow, [
      getActiveServiceCol()?.modifiedAt,
      FIELD.modifiedAt,
    ])
    || null;
}

function readStepFieldActedAt(value) {
  const list = Array.isArray(value) ? value : (value ? [value] : []);
  const inProgress = list.find((entry) => {
    const status = normalizeText(entry?.Status ?? entry?.status).toLowerCase().replace(/[\s_-]+/g, '');
    return status === 'inprogress' && (entry?.ActedAt || entry?.actedAt);
  });
  if (inProgress) return inProgress.ActedAt || inProgress.actedAt;
  return null;
}

/** Pending Approval SLA start = when the ticket entered that approval step (ActedAt). */
function getPendingApprovalSlaStartRaw(itemOrRow) {
  if (!itemOrRow) return null;
  const raw = itemOrRow?.raw ?? itemOrRow;
  const col = getActiveServiceCol() || {};
  const columnKeys = [
    col.itHeadApprovalActivity,
    col.itManagerApprovalActivity,
    col.l2ApprovalActivity,
    col.l1ApprovalActivity,
    col.itHeadApprovalActivityLegacy,
    col.itManagerApprovalActivityLegacy,
    col.l2ApprovalActivityLegacy,
    col.l1ApprovalActivityLegacy,
  ].filter(Boolean);
  for (const key of columnKeys) {
    const actedAt = readStepFieldActedAt(raw?.[key] ?? itemOrRow?.[key]);
    if (actedAt) return actedAt;
  }
  const pools = [
    ...(Array.isArray(itemOrRow?.itAgentActivities) ? itemOrRow.itAgentActivities : []),
    ...(Array.isArray(itemOrRow?.employeeApprovalActivities) ? itemOrRow.employeeApprovalActivities : []),
  ];
  const live = pools.find((entry) => {
    const step = normalizeText(entry?.step || entry?.stepName || entry?.name).toLowerCase();
    const status = normalizeText(entry?.status).toLowerCase().replace(/[\s_-]+/g, '');
    return step.includes('approv') && status === 'inprogress' && entry?.actedAt;
  });
  if (live?.actedAt) return live.actedAt;
  const anyApproval = pools.find((entry) => {
    const step = normalizeText(entry?.step || entry?.stepName || entry?.name).toLowerCase();
    return step.includes('approv') && entry?.actedAt;
  });
  return anyApproval?.actedAt
    || itemOrRow?.createdAtRaw
    || itemOrRow?.requestedDateTimeRaw
    || raw?._created_at
    || null;
}

function getAgentSolutionSlaStartRaw(itemOrRow) {
  const activities = getAgentSolutionSlaActivities(itemOrRow);
  const inProgress = activities.find(
    (entry) => normalizeText(entry?.status).toLowerCase() === 'inprogress' && entry?.actedAt,
  );
  if (inProgress?.actedAt) return inProgress.actedAt;
  let earliestMs = null;
  let earliestRaw = null;
  activities.forEach((entry) => {
    if (!entry?.actedAt) return;
    const ms = new Date(entry.actedAt).getTime();
    if (!Number.isFinite(ms)) return;
    if (earliestMs == null || ms < earliestMs) {
      earliestMs = ms;
      earliestRaw = entry.actedAt;
    }
  });
  return earliestRaw || getRowLastModifiedRaw(itemOrRow);
}

function getAgentSolutionSlaEndRaw(itemOrRow) {
  const activities = getAgentSolutionSlaActivities(itemOrRow);
  let latestMs = null;
  let latestRaw = null;
  activities.forEach((entry) => {
    if (!entry?.actedAt) return;
    const status = normalizeText(entry?.status).toLowerCase();
    if (status !== 'completed' && status !== 'complete') return;
    const ms = new Date(entry.actedAt).getTime();
    if (!Number.isFinite(ms)) return;
    if (latestMs == null || ms > latestMs) {
      latestMs = ms;
      latestRaw = entry.actedAt;
    }
  });
  if (latestRaw) return latestRaw;
  return itemOrRow?.closedAtRaw || getRowLastModifiedRaw(itemOrRow);
}

function formatSlaElapsedBudgetSub(elapsedMinutes, slaMinutes) {
  if (Number.isFinite(slaMinutes) && slaMinutes > 0 && Number.isFinite(elapsedMinutes) && elapsedMinutes >= 0) {
    return `${formatSlaDuration(elapsedMinutes)} / ${formatSlaDuration(slaMinutes)}`;
  }
  if (Number.isFinite(elapsedMinutes) && elapsedMinutes > 0) {
    return formatSlaDuration(elapsedMinutes);
  }
  return null;
}

/** Open + not InProgress Stages → Hold (no live clock). Pending Approval is never Hold. */
export function isSlaHoldRow(row) {
  if (!row) return false;
  if (isServiceSlaPendingApprovalRow(row)) return false;
  if (isRefexServiceClosedTicket(row) || isRefexServiceProcessCompleted(row)) return false;
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;
  if (activeDashboardProfile?.id === 'extrovis') {
    // Open Tickets (PickUp) use created+TAT — never Hold.
    if (isExtrovisAgentPickupStep(row)) return false;
    // My Tickets: clock only while Stage is InProgress; other stages stay Hold.
    if (isExtrovisOwnedWorkStep(row)) return !isExtrovisLiveSlaStage(row);
    return true;
  }
  if (!isActiveServiceQueueTicket(row)) return false;
  return !isServiceProcessStageInProgress(row);
}

function isOpenSlaClockEligible(row) {
  if (!row || isSlaHoldRow(row)) return false;
  if (isServiceSlaPendingApprovalRow(row)) return true;
  if (isRefexServiceClosedTicket(row) || isRefexServiceProcessCompleted(row)) return false;
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;
  if (activeDashboardProfile?.id === 'extrovis') {
    if (isExtrovisAgentPickupStep(row)) return true;
    return isExtrovisOwnedWorkStep(row) && isExtrovisLiveSlaStage(row);
  }
  return isActiveServiceQueueTicket(row) && isServiceProcessStageInProgress(row);
}

function getFrozenAgentSolutionSlaDisplay(row) {
  const empty = { primary: '—', sub: null, state: 'none' };
  if (!row) return empty;
  const slaMinutes = getServiceQueueSlaMinutes(row);
  const startRaw = getAgentSolutionSlaStartRaw(row);
  const endRaw = getAgentSolutionSlaEndRaw(row);
  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;
  const hasRange = start && end
    && !Number.isNaN(start.getTime())
    && !Number.isNaN(end.getTime())
    && end >= start;
  const kissflowElapsed = Number(row?.slaElapsedMinutes);
  const hasKfElapsed = Number.isFinite(kissflowElapsed) && kissflowElapsed >= 0;
  const resolvedMinutes = hasRange
    ? (end.getTime() - start.getTime()) / 60000
    : (hasKfElapsed ? kissflowElapsed : null);
  const hasSla = Number.isFinite(slaMinutes) && slaMinutes > 0;
  const itemStatus = normalizeText(row?.itemStatusRaw || row?.itemStatus).toLowerCase();
  const breachedFlag = row?.slaBreached === true || String(row?.slaBreached).toLowerCase() === 'true';
  if (resolvedMinutes == null && !hasSla && !breachedFlag && !itemStatus.includes('breach')) {
    return { primary: 'Not Breached', sub: null, state: 'ok' };
  }
  const elapsed = resolvedMinutes == null ? 0 : resolvedMinutes;
  const breached = itemStatus.includes('breach')
    || (hasSla && elapsed > slaMinutes)
    || (!hasSla && breachedFlag);
  return {
    primary: breached ? 'Breached' : 'Not Breached',
    sub: formatSlaElapsedBudgetSub(elapsed, hasSla ? slaMinutes : 0),
    state: breached ? 'breached' : 'ok',
  };
}

function formatSlaDuration(totalMinutes) {
  const mins = Math.abs(Math.round(totalMinutes));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (hours < 24) {
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const parts = [`${days}d`];
  if (remHours) parts.push(`${remHours}h`);
  if (remainder) parts.push(`${remainder}m`);
  return parts.join(' ');
}

export { formatSlaDuration };

/** Readable SLA duration — e.g. 12 hrs, 1 day 5 hrs (for badges and labels). */
function formatSlaReadableDuration(totalMinutes) {
  return formatCompletedResolutionDuration(totalMinutes);
}

function formatSlaOverdueShort(totalMinutes) {
  return `${formatSlaReadableDuration(totalMinutes)} over`;
}

function formatSlaRemainingShort(totalMinutes) {
  return `${formatSlaReadableDuration(totalMinutes)} left`;
}

/** Human-readable duration for Completed tab — uses days once 24+ hours. */
export function formatCompletedResolutionDuration(totalMinutes) {
  const mins = Math.abs(Math.round(totalMinutes));
  if (mins < 60) return `${mins} min`;

  const totalHours = Math.floor(mins / 60);
  const remainderMins = mins % 60;

  if (totalHours < 24) {
    if (remainderMins === 0) {
      return totalHours === 1 ? '1 hr' : `${totalHours} hrs`;
    }
    const hrLabel = totalHours === 1 ? '1 hr' : `${totalHours} hrs`;
    return `${hrLabel} ${remainderMins} min`;
  }

  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  const dayPart = days === 1 ? '1 day' : `${days} days`;

  if (remHours === 0 && remainderMins === 0) return dayPart;

  const parts = [dayPart];
  if (remHours > 0) parts.push(remHours === 1 ? '1 hr' : `${remHours} hrs`);
  if (remainderMins > 0) parts.push(`${remainderMins} min`);
  return parts.join(' ');
}

/**
 * Refex SLA clock starts when work hits IT Tech / IT Tech Support
 * (StepField ActedAt). Prefer the latest tech-support ActedAt (not earliest),
 * then created/requested for older tickets without step history.
 */
function getRefexTechStepSlaStartTime(itemOrRow) {
  if (!itemOrRow) return null;
  const activities = Array.isArray(itemOrRow?.itAgentActivities) ? itemOrRow.itAgentActivities : [];

  const inProgress = activities.find(
    (entry) => normalizeText(entry?.status).toLowerCase() === 'inprogress' && entry?.actedAt,
  );
  if (inProgress?.actedAt) return inProgress.actedAt;

  // Latest completed tech-support ActedAt = when the agent finished / owned the work.
  // Prefer tech / support steps; skip reopen / feedback (those are end times).
  let latestMs = null;
  let latestRaw = null;
  activities.forEach((entry) => {
    if (!entry?.actedAt) return;
    if (isItsmBotOrSystemActor(entry?.actedBy)) return;
    const step = normalizeText(entry?.step || entry?.stepName || entry?.name).toLowerCase();
    if (step.includes('reopen') || step.includes('employee feedback')) return;
    const ms = new Date(entry.actedAt).getTime();
    if (!Number.isFinite(ms)) return;
    if (latestMs == null || ms > latestMs) {
      latestMs = ms;
      latestRaw = entry.actedAt;
    }
  });
  if (latestRaw) return latestRaw;

  const step = getCurrentStepValue(itemOrRow).toLowerCase();
  const onTechStep = step.includes('it tech')
    || step.includes('tech support')
    || step.includes('it agent');
  if (onTechStep) {
    return itemOrRow?.modifiedAtRaw
      || itemOrRow?.raw?._modified_at
      || itemOrRow?.techSupportMyTaskItem?._modified_at
      || null;
  }
  return null;
}

/** End of SLA clock: IT Tech Reopen ActedAt when present, else last modified. */
function getRefexSlaEndTime(itemOrRow) {
  if (!itemOrRow) return null;
  const activityPools = [
    ...(Array.isArray(itemOrRow?.itAgentActivities) ? itemOrRow.itAgentActivities : []),
    ...(Array.isArray(itemOrRow?.employeeApprovalActivities) ? itemOrRow.employeeApprovalActivities : []),
  ];
  let reopenMs = null;
  let reopenRaw = null;
  activityPools.forEach((entry) => {
    const step = normalizeText(entry?.step || entry?.stepName || entry?.name).toLowerCase();
    const looksReopen = step.includes('reopen') || step.includes('employee feedback');
    if (!looksReopen || !entry?.actedAt) return;
    const ms = new Date(entry.actedAt).getTime();
    if (!Number.isFinite(ms)) return;
    if (reopenMs == null || ms > reopenMs) {
      reopenMs = ms;
      reopenRaw = entry.actedAt;
    }
  });
  if (reopenRaw) return reopenRaw;

  return itemOrRow?.closedAtRaw
    || itemOrRow?.modifiedAtRaw
    || itemOrRow?.raw?._modified_at
    || getItemValue(itemOrRow?.raw ?? itemOrRow, [
      getActiveServiceCol()?.modifiedAt,
      FIELD.modifiedAt,
    ])
    || null;
}

function getSlaStartTime(itemOrRow) {
  const techStart = getRefexTechStepSlaStartTime(itemOrRow);
  if (techStart) return techStart;
  // Extrovis My Tickets — prefer last modified when on Solution / Dependency.
  if (activeDashboardProfile?.id === 'extrovis') {
    const step = normalizeText(getCurrentStepValue(itemOrRow) || itemOrRow?.currentStep).toLowerCase();
    const onOwnedWork = step.includes('solution')
      || step.includes('dependency')
      || step.includes('after dependency');
    if (onOwnedWork) {
      return itemOrRow?.modifiedAtRaw
        || itemOrRow?.raw?._modified_at
        || itemOrRow?.techSupportMyTaskItem?._modified_at
        || null;
    }
  }
  return itemOrRow?.requestedDateTimeRaw
    ?? itemOrRow?.createdAtRaw
    ?? itemOrRow?.[COL.requestedDateTime]
    ?? itemOrRow?.[COL.createdAt]
    ?? null;
}

function getRowTimestampRaw(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value && value !== '—') return value;
  }
  return null;
}

/** Completed items — resolution duration and SLA outcome from tech-step → reopen/modified. */
export function getCompletedResolutionTiming(row) {
  const empty = {
    hasData: false,
    resolutionMinutes: 0,
    resolutionLabel: '—',
    slaMinutes: 0,
    outcome: 'none',
    outcomeLabel: '—',
    marginLabel: '—',
  };

  if (!row) return empty;

  const startRaw = (
    usesRefexServiceWorkflow()
      ? (getRefexTechStepSlaStartTime(row)
        || getRowTimestampRaw(row, 'requestedDateTimeRaw', 'createdAtRaw'))
      : getRowTimestampRaw(row, 'requestedDateTimeRaw', 'createdAtRaw')
  ) ?? row?.raw?._created_at ?? null;
  // User rule: end = IT Tech Reopen ActedAt when present, else last modified.
  const endRaw = (
    usesRefexServiceWorkflow()
      ? getRefexSlaEndTime(row)
      : null
  )
    || getRowTimestampRaw(row, 'modifiedAtRaw', 'closedAtRaw')
    || row?.raw?._modified_at
    || null;

  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return empty;
  }

  const resolutionMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  const slaMinutes = usesRefexServiceWorkflow()
    ? getServiceQueueSlaMinutes(row)
    : Number(row.slaMinutes);
  const hasSla = Number.isFinite(slaMinutes) && slaMinutes > 0;
  const itemStatus = normalizeText(row.itemStatusRaw || row.itemStatus).toLowerCase();
  const breachedByStatus = itemStatus.includes('breach');

  let outcome = 'none';
  let outcomeLabel = '—';
  let marginLabel = '—';
  if (hasSla || breachedByStatus) {
    const breached = breachedByStatus || (hasSla && resolutionMinutes > slaMinutes);
    outcome = breached ? 'breached' : 'ok';
    outcomeLabel = breached ? 'Breached' : 'On Time';
    if (hasSla) {
      const margin = Math.abs(resolutionMinutes - slaMinutes);
      marginLabel = breached
        ? `Exceeded by ${formatSlaDuration(margin)}`
        : `${formatSlaDuration(margin)} under SLA`;
    }
  }

  return {
    hasData: true,
    resolutionMinutes,
    resolutionLabel: formatSlaDuration(resolutionMinutes),
    slaMinutes: hasSla ? slaMinutes : 0,
    outcome,
    outcomeLabel,
    marginLabel,
  };
}

function isTerminalStatusToken(raw) {
  const token = normalizeText(raw).toLowerCase().replace(/[\s_-]+/g, '');
  return (
    token === 'completed'
    || token === 'closed'
    || token === 'close'
    || token === 'resolved'
    || token === 'withdrawn'
    || token === 'cancelled'
    || token === 'canceled'
    || token === 'rejected'
    || token === 'reject'
    || token === 'declined'
  );
}

/** Statu_1 / Validation Open|Closed — never a Kissflow process status. */
function isItemOpenCloseStatusToken(raw) {
  const token = normalizeText(raw).toLowerCase().replace(/[\s_-]+/g, '');
  return token === 'open' || token === 'closed' || token === 'close';
}

/** Kissflow `_status` / current step Completed — not Statu_1 Closed. */
function isKissflowWorkflowCompletedToken(raw) {
  const token = normalizeText(raw).toLowerCase().replace(/[\s_-]+/g, '');
  return token === 'completed' || token === 'complete';
}

/** Kissflow / business status = Rejected (Manager/Head reject). */
export function isRefexServiceRejectedTicket(row) {
  if (!row) return false;
  const raw = row.raw ?? row;
  const serviceCol = getActiveServiceCol() || {};
  const candidates = [
    row.systemStatus,
    row.workflowStatus,
    row.status,
    row.statusLabel,
    row.itemStatusRaw,
    row.itemStatus,
    raw?._status,
    raw?.[serviceCol.systemStatus],
    readBusinessCloseStatus(row),
  ];
  for (const value of candidates) {
    const token = normalizeText(value).toLowerCase().replace(/[\s_-]+/g, '');
    if (token === 'rejected' || token === 'reject' || token === 'declined') return true;
  }
  return false;
}

/** Kissflow process `_status` or step Completed — never Statu_1 / Validation Closed. */
export function isRefexServiceProcessCompleted(rowOrItem) {
  if (!rowOrItem) return false;

  const raw = rowOrItem.raw ?? rowOrItem;
  const serviceCol = getActiveServiceCol() || {};
  const wfStatus = raw?._status;
  if (isKissflowWorkflowCompletedToken(wfStatus)) return true;
  // Live InProgress / Pending beats a stale mapped isProcessCompleted (Extrovis Statu_1 Closed).
  if (wfStatus) {
    const token = normalizeText(wfStatus).toLowerCase().replace(/[\s_-]+/g, '');
    if (
      token === 'inprogress'
      || token === 'pending'
      || token === 'draft'
      || token === 'assigned'
    ) {
      return false;
    }
  }
  if (isItemOpenCloseStatusToken(wfStatus)) return false;

  if (rowOrItem.isProcessCompleted === true) return true;

  const candidates = [
    rowOrItem.systemStatus,
    rowOrItem.workflowStatus,
    rowOrItem.status,
    getItemValue(raw, [serviceCol.systemStatus, FIELD.systemStatus, '_status']),
  ];
  for (const value of candidates) {
    if (isKissflowWorkflowCompletedToken(value)) return true;
    if (isItemOpenCloseStatusToken(value)) return false;
  }

  const step = normalizeText(getCurrentStepValue(rowOrItem) || rowOrItem?.currentStep || rowOrItem?.activeWorkflowStep);
  return isKissflowWorkflowCompletedToken(step);
}

/**
 * Business-closed ticket even when Kissflow `_status` is still InProgress
 * (e.g. Statu_1=Closed at Employee Feedback after agent Close / accidental submit).
 */
function readBusinessCloseStatus(rowOrItem) {
  if (!rowOrItem) return '';
  const raw = rowOrItem.raw ?? rowOrItem;
  const serviceCol = getActiveServiceCol() || {};
  const candidates = [
    rowOrItem.itemStatusRaw,
    rowOrItem.itemStatus,
    rowOrItem.refexTechSupportStatus,
    rowOrItem.status,
    rowOrItem.statusLabel,
    rowOrItem.statu,
    getItemValue(raw, [
      serviceCol.itemStatus,
      serviceCol.statusValidation,
      serviceCol.status,
      'Statu_1',
      'Validation',
      'Status_Validation',
    ]),
    raw?.Statu_1,
    raw?.Validation,
  ];
  for (const value of candidates) {
    const text = normalizeText(value);
    if (!text) continue;
    const token = text.toLowerCase().replace(/[\s_-]+/g, '');
    // Validation Yes/No is not an open/close signal.
    if (token === 'yes' || token === 'no' || token === 'true' || token === 'false') continue;
    return text;
  }
  return '';
}

function isRefexServiceRowResolved(row) {
  if (isRefexServiceProcessCompleted(row)) return true;
  if (isRefexServiceRejectedTicket(row)) return true;
  return false;
}

/** Refex 48h IT Tech Reopen hold window (ms). */
export const IT_TECH_REOPEN_WINDOW_MS = 48 * 60 * 60 * 1000;
/** Extrovis ReOpen Window hold (7 days). */
export const EXTROVIS_REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Profile-aware reopen hold duration. */
export function getReopenWindowMs(rowOrEntity = null) {
  if (typeof rowOrEntity === 'string' && isExtrovisServiceDashboardContext(rowOrEntity)) {
    return EXTROVIS_REOPEN_WINDOW_MS;
  }
  if (rowOrEntity && typeof rowOrEntity === 'object') {
    const entityKey = resolveServiceItemEntityKey(rowOrEntity.raw ?? rowOrEntity)
      || resolveWorkflowLabelEntityKey(rowOrEntity);
    if (entityKey && isExtrovisServiceDashboardContext(entityKey)) return EXTROVIS_REOPEN_WINDOW_MS;
  }
  if (activeDashboardProfile?.id === 'extrovis') return EXTROVIS_REOPEN_WINDOW_MS;
  return IT_TECH_REOPEN_WINDOW_MS;
}

/**
 * Closed KPI — step only, not Status / Statu_1 / Validation:
 * Refex: IT Tech Reopen; Extrovis: ReOpen Window; plus Kissflow `_status`/step Completed.
 */
export function isRefexServiceClosedTicket(row) {
  if (!row) return false;
  if (isRefexServiceRejectedTicket(row)) return false;
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return true;
  return isRefexServiceProcessCompleted(row);
}

/**
 * Open for Refex = still InProgress work that is not Closed by the rules above.
 * Approvals stay out of Open on Manager/Head (Pending Approval owns them).
 */
export function isRefexServiceOpenTicket(row, { excludeApprovals = false } = {}) {
  if (!row) return false;
  if (isRefexServiceRejectedTicket(row)) return false;
  if (isRefexServiceClosedTicket(row)) return false;
  if (isAgentItemStatusCancelled(row)) return false;
  if (excludeApprovals && isRefexServiceApprovalStep(row)) return false;
  return true;
}

/** Closed Date / reopen-window anchor — prefer modified_at for IT Tech Reopen. */
export function getRefexClosedAtRaw(row) {
  if (!row) return null;
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) {
    return row?.modifiedAtRaw
      || row?.raw?._modified_at
      || row?.closedAtRaw
      || row?.completedAtRaw
      || null;
  }
  return row?.closedAtRaw
    || row?.completedItem?._modified_at
    || row?.completedItem?.Modified_At
    || row?.completedItem?.completedAt
    || row?.modifiedAtRaw
    || row?.raw?._modified_at
    || null;
}

/**
 * MIS SLA cell for IT Tech Reopen — show "Reopen window" only (no auto-close copy).
 */
export function getRefexTechReopenMisDisplay(row, { now = new Date() } = {}) {
  const empty = { primary: '—', sub: null, state: 'none' };
  if (!row || isRefexServiceProcessCompleted(row)) return empty;
  if (!(isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row))) return empty;
  void now;
  return {
    primary: 'Reopen window',
    sub: null,
    state: 'reopen',
  };
}

/** Refex Service Queue MIS SLA cell — primary badge + resolution/exceeded caption. */
export function getRefexServiceSlaMisDisplay(row, { isCompletedTab = false } = {}) {
  const empty = { primary: '—', sub: null, state: 'none' };
  if (!row) return empty;

  const isClosedOrReopen = isCompletedTab
    || isRefexServiceRowResolved(row)
    || isRefexServiceClosedTicket(row)
    || isITTechReopenStep(row)
    || isEmployeeApprovalRefexStep(row);

  // Closed / Reopen: freeze last IT Agent Solution SLA (Breached / Not Breached + times).
  if (isClosedOrReopen) {
    return getFrozenAgentSolutionSlaDisplay(row);
  }

  if (isSlaHoldRow(row)) {
    return { primary: 'Hold', sub: null, state: 'hold' };
  }

  const timing = getSlaTiming(row);
  if (!timing.hasSla) {
    return { primary: 'On track', sub: null, state: 'ok' };
  }

  let sub = null;
  if (timing.state === 'breached') {
    const exceeded = Number.isFinite(timing.elapsedMinutes) && Number.isFinite(timing.slaMinutes)
      ? Math.max(0, timing.elapsedMinutes - timing.slaMinutes)
      : 0;
    if (exceeded > 0) sub = `Exceeded by ${formatSlaDuration(exceeded)}`;
  } else if (Number.isFinite(timing.remainingMinutes) && timing.remainingMinutes > 0) {
    sub = `${formatSlaDuration(timing.remainingMinutes)} left`;
  } else if (Number.isFinite(timing.elapsedMinutes) && timing.elapsedMinutes > 0) {
    sub = `${formatSlaDuration(timing.elapsedMinutes)} elapsed`;
  }

  const primary = timing.state === 'breached'
    ? 'Breached'
    : timing.state === 'warning'
      ? 'At risk'
      : timing.state === 'paused'
        ? 'Paused'
        : 'On track';

  return { primary, sub, state: timing.state };
}

export function formatItDashboardDateOnly(value) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function getRowStartDateLabel(row) {
  return formatItDashboardDateOnly(row?.createdAtRaw || row?.requestedDateTimeRaw);
}

export function getRowEndDateLabel(row) {
  return formatItDashboardDateOnly(row?.modifiedAtRaw);
}

export function getSimpleSlaResultLabel(row) {
  const timing = getCompletedResolutionTiming(row);
  if (!timing.hasData || timing.outcome === 'none') return '—';
  return timing.outcome === 'breached' ? 'Breached' : 'Not Breached';
}

export function isSimpleSlaBreached(row) {
  const timing = getCompletedResolutionTiming(row);
  return timing.hasData && timing.outcome === 'breached';
}

function isSlaTrackingComplete(itemOrRow) {
  // Statu_1 / Validation "Closed" is not process complete — SLA still runs on live Solution / Tech steps.
  if (usesRefexServiceWorkflow()) {
    return isRefexServiceProcessCompleted(itemOrRow) || isRefexServiceClosedTicket(itemOrRow);
  }
  const status = normalizeText(itemOrRow?.status ?? itemOrRow?.[COL.status] ?? itemOrRow?.statusLabel).toLowerCase();
  return status === 'completed' || status === 'closed';
}

function parseKissflowSlaMinutes(value) {
  if (value == null || value === '' || value === '—') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value > 1_000_000) return value / 60000;
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return asNumber > 1_000_000 ? asNumber / 60000 : asNumber;
    }
    const hm = trimmed.match(/^(\d+)\s*:\s*(\d+)$/);
    if (hm) return (Number(hm[1]) * 60) + Number(hm[2]);
    const hoursMins = trimmed.match(/^(\d+)\s*h(?:ours?)?(?:\s*(\d+)\s*m(?:in(?:utes?)?)?)?$/i);
    if (hoursMins) {
      return (Number(hoursMins[1]) * 60) + (hoursMins[2] ? Number(hoursMins[2]) : 0);
    }
    return null;
  }
  if (typeof value === 'object') {
    const nested = value.Closure_Time
      ?? value.TurnAround_Time_TAT
      ?? value.SLA_Timing_Min
      ?? value.SLA_Minutes
      ?? value.Minutes
      ?? value.minutes
      ?? value.value;
    if (nested != null && nested !== value) {
      const parsed = parseKissflowSlaMinutes(nested);
      if (parsed != null) return parsed;
    }
    const hours = Number(value.Hours ?? value.hours);
    const mins = Number(value.Minutes ?? value.minutes);
    const total = (Number.isFinite(hours) ? hours * 60 : 0) + (Number.isFinite(mins) ? mins : 0);
    return total > 0 ? total : null;
  }
  return null;
}

function getSlaMinutesFromLiveExpectedAt(row) {
  const activities = Array.isArray(row?.itAgentActivities) ? row.itAgentActivities : [];
  const live = activities.find((entry) => {
    const status = normalizeText(entry?.status).toLowerCase();
    return status === 'inprogress' && entry?.expectedAt;
  });
  const task = row?.techSupportMyTaskItem;
  const expectedRaw = live?.expectedAt
    || task?.ExpectedAt
    || task?._expected_at
    || task?.expectedAt
    || null;
  if (!expectedRaw) return null;
  const expectedMs = new Date(expectedRaw).getTime();
  if (!Number.isFinite(expectedMs)) return null;
  const startRaw = live?.actedAt
    || row?.requestedDateTimeRaw
    || row?.createdAtRaw
    || row?.raw?._created_at
    || null;
  const startMs = startRaw ? new Date(startRaw).getTime() : NaN;
  if (!Number.isFinite(startMs) || expectedMs <= startMs) return null;
  return (expectedMs - startMs) / 60000;
}

/** Service Queue configured SLA — Closure Time, TAT, native SLA minutes, or live ExpectedAt. */
export function getServiceQueueSlaMinutes(row) {
  if (!row) return null;
  if (isServiceSlaPendingApprovalRow(row)) return PENDING_APPROVAL_SLA_MINUTES;
  const raw = row?.raw ?? row;
  const col = getActiveServiceCol() || {};

  // Extrovis Open (PickUp): prefer TAT. My Tickets / closed: prefer Closure_Time.
  // Note: usesRefexServiceWorkflow() is true for Extrovis too — gate on profile id.
  const isExtrovisProfile = activeDashboardProfile?.id === 'extrovis';
  const extrovisOpenPickup = isExtrovisProfile && isExtrovisAgentPickupStep(row);
  const orderedMapped = extrovisOpenPickup
    ? [
      row?.tatMinutes,
      row?.slaMinutes === '—' ? null : row?.slaMinutes,
    ]
    : [
      row?.closureMinutes,
      row?.serviceQueueSlaMinutes,
      row?.tatMinutes,
      row?.slaMinutes === '—' ? null : row?.slaMinutes,
    ];
  for (const value of orderedMapped) {
    const parsed = parseKissflowSlaMinutes(value);
    if (parsed != null) return parsed;
  }

  const fieldCandidates = extrovisOpenPickup
    ? [
      col.tatMinutes,
      'TurnAround_Time_TAT',
    ]
    : [
      col.closureMinutes,
      col.tatMinutes,
      col.slaMinutes,
      'Closure_Time',
      'closure_time',
      'TurnAround_Time_TAT',
      'SLA_Timing_Min',
      'SLA_Minutes',
    ].filter(Boolean);
  const fromFields = getItemValue(raw, fieldCandidates.filter(Boolean));
  const fromFieldsParsed = parseKissflowSlaMinutes(fromFields);
  if (fromFieldsParsed != null) return fromFieldsParsed;

  for (const value of extrovisOpenPickup
    ? [raw?.TurnAround_Time_TAT]
    : [raw?.Closure_Time, raw?.TurnAround_Time_TAT, raw?.SLA_Timing_Min]) {
    const parsed = parseKissflowSlaMinutes(value);
    if (parsed != null) return parsed;
  }

  if (extrovisOpenPickup) return EXTROVIS_PICKUP_TAT_MINUTES;

  const fromExpected = getSlaMinutesFromLiveExpectedAt(row);
  if (fromExpected != null && fromExpected > 0) return fromExpected;

  if (!isExtrovisProfile && !usesRefexServiceWorkflow()) {
    const sla = parseKissflowSlaMinutes(readSlaRowValue(row, COL.slaMinutes, 'slaMinutes'));
    return sla;
  }
  if (isExtrovisProfile) return extrovisOpenPickup ? EXTROVIS_PICKUP_TAT_MINUTES : null;
  return null;
}

function readSlaRowValue(itemOrRow, colKey, flatKey) {
  const raw = itemOrRow?.raw ?? itemOrRow;
  return itemOrRow?.[flatKey] ?? itemOrRow?.[colKey] ?? raw?.[colKey];
}

/** Refex Service Queue TAT — TurnAround_Time_TAT in minutes. */
export function getServiceQueueTatMinutes(row) {
  if (!row) return null;
  const tat = Number(row?.tatMinutes);
  return Number.isFinite(tat) && tat > 0 ? tat : null;
}

/** Refex Service Queue MIS TAT cell — mirrors SLA display using TAT minutes. */
export function getRefexServiceTatMisDisplay(row, { isCompletedTab = false } = {}) {
  const tat = getServiceQueueTatMinutes(row);
  if (!tat) return { primary: '—', sub: null, state: 'none' };
  return getRefexServiceSlaMisDisplay(
    { ...row, closureMinutes: tat, serviceQueueSlaMinutes: tat },
    { isCompletedTab },
  );
}

function isRefexClosureSlaBreached(row) {
  const slaMinutes = getServiceQueueSlaMinutes(row);
  if (slaMinutes == null) return false;
  const kissflowElapsed = Number(row?.slaElapsedMinutes);
  if (Number.isFinite(kissflowElapsed) && kissflowElapsed > slaMinutes) return true;
  if (row?.slaBreached === true || String(row?.slaBreached).toLowerCase() === 'true') return true;
  const timing = getRefexServiceSlaMisDisplay(row, { isCompletedTab: isRefexServiceRowResolved(row) });
  return timing.state === 'breached';
}

/** SLA timing for open service requests — used for badges, KPIs, and progress UI. */
export function getSlaTiming(itemOrRow) {
  const empty = {
    hasSla: false,
    state: 'none',
    slaMinutes: 0,
    elapsedMinutes: 0,
    remainingMinutes: 0,
    percentUsed: 0,
    label: '—',
    shortLabel: '—',
  };

  if (!itemOrRow) return empty;

  if (isSlaHoldRow(itemOrRow)) {
    return {
      ...empty,
      state: 'hold',
      label: 'Hold',
      shortLabel: 'Hold',
    };
  }

  if (isSlaTrackingComplete(itemOrRow)) {
    return { ...empty, state: 'completed' };
  }

  if (!isOpenSlaClockEligible(itemOrRow)) {
    return empty;
  }

  const itemStatus = normalizeText(itemOrRow?.itemStatus ?? itemOrRow?.[COL.itemStatus]).toLowerCase();
  if (itemStatus.includes('breach')) {
    return {
      ...empty,
      hasSla: true,
      state: 'breached',
      label: 'SLA breached',
      shortLabel: 'Breached',
    };
  }

  let slaMinutes = getServiceQueueSlaMinutes(itemOrRow);
  if (slaMinutes == null) {
    if (usesRefexServiceWorkflow()) return empty;
    slaMinutes = Number(readSlaRowValue(itemOrRow, COL.slaMinutes, 'slaMinutes'));
  }
  if (!Number.isFinite(slaMinutes) || slaMinutes <= 0) return empty;

  const pending = isServiceSlaPendingApprovalRow(itemOrRow);
  const extrovisPickup = activeDashboardProfile?.id === 'extrovis' && isExtrovisAgentPickupStep(itemOrRow);
  const lastModified = getRowLastModifiedRaw(itemOrRow);
  const pickupCreated = extrovisPickup ? getExtrovisPickupSlaStartRaw(itemOrRow) : null;
  const pendingStart = pending ? getPendingApprovalSlaStartRaw(itemOrRow) : null;
  const pendingFlag = itemOrRow?.slaBreached === true
    || String(itemOrRow?.slaBreached).toLowerCase() === 'true';
  if (pending && !pendingStart && pendingFlag) {
    return {
      hasSla: true,
      state: 'breached',
      slaMinutes,
      elapsedMinutes: slaMinutes,
      remainingMinutes: 0,
      percentUsed: 100,
      label: 'SLA breached',
      shortLabel: 'Breached',
    };
  }

  // Pending = approval ActedAt. Extrovis PickUp = created. Open InProgress = last modified.
  const techStepStart = pending
    ? pendingStart
    : extrovisPickup
      ? pickupCreated
      : (lastModified || getRefexTechStepSlaStartTime(itemOrRow));
  const useTechStepClock = Boolean(techStepStart) || pending;

  if (!useTechStepClock) {
    const kissflowBreached = readSlaRowValue(itemOrRow, COL.slaBreached, 'slaBreached');
    if (kissflowBreached === true || String(kissflowBreached).toLowerCase() === 'true') {
      const elapsed = Number(readSlaRowValue(itemOrRow, COL.slaElapsedMinutes, 'slaElapsedMinutes'));
      return {
        hasSla: true,
        state: 'breached',
        slaMinutes,
        elapsedMinutes: Number.isFinite(elapsed) ? elapsed : slaMinutes,
        remainingMinutes: 0,
        percentUsed: 100,
        label: 'SLA breached',
        shortLabel: 'Breached',
      };
    }

    const kissflowPaused = readSlaRowValue(itemOrRow, COL.slaIsPaused, 'slaIsPaused');
    const isPaused = kissflowPaused === true || String(kissflowPaused).toLowerCase() === 'true';
    const kissflowRemaining = Number(readSlaRowValue(itemOrRow, COL.slaRemainingMinutes, 'slaRemainingMinutes'));
    const kissflowElapsed = Number(readSlaRowValue(itemOrRow, COL.slaElapsedMinutes, 'slaElapsedMinutes'));

    if (isPaused && Number.isFinite(kissflowRemaining)) {
      const percentUsed = Math.min(100, Math.max(0, ((slaMinutes - kissflowRemaining) / slaMinutes) * 100));
      return {
        hasSla: true,
        state: 'paused',
        slaMinutes,
        elapsedMinutes: Number.isFinite(kissflowElapsed) ? kissflowElapsed : slaMinutes - kissflowRemaining,
        remainingMinutes: kissflowRemaining,
        percentUsed,
        label: `${formatSlaRemainingShort(kissflowRemaining)} left · paused`,
        shortLabel: 'Paused',
      };
    }

    if (Number.isFinite(kissflowRemaining) && kissflowRemaining >= 0) {
      const elapsedMinutes = Number.isFinite(kissflowElapsed)
        ? kissflowElapsed
        : slaMinutes - kissflowRemaining;
      const percentUsed = Math.min(100, Math.max(0, (elapsedMinutes / slaMinutes) * 100));

      if (kissflowRemaining <= 0) {
        return {
          hasSla: true,
          state: 'breached',
          slaMinutes,
          elapsedMinutes,
          remainingMinutes: 0,
          percentUsed: 100,
          label: 'SLA breached',
          shortLabel: 'Breached',
        };
      }

      if (kissflowRemaining <= SLA_AT_RISK_REMAINING_MINUTES || percentUsed >= SLA_AT_RISK_PERCENT_USED) {
        return {
          hasSla: true,
          state: 'warning',
          slaMinutes,
          elapsedMinutes,
          remainingMinutes: kissflowRemaining,
          percentUsed,
          label: `${formatSlaReadableDuration(kissflowRemaining)} left · at risk`,
          shortLabel: formatSlaRemainingShort(kissflowRemaining),
        };
      }

      return {
        hasSla: true,
        state: 'ok',
        slaMinutes,
        elapsedMinutes,
        remainingMinutes: kissflowRemaining,
        percentUsed,
        label: formatSlaRemainingShort(kissflowRemaining),
        shortLabel: formatSlaRemainingShort(kissflowRemaining),
      };
    }
  }

  const startTime = pending
    ? pendingStart
    : extrovisPickup
      ? (pickupCreated || getSlaStartTime(itemOrRow))
      : (lastModified || getSlaStartTime(itemOrRow));
  if (!startTime) return empty;

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return empty;

  const elapsedMinutes = (Date.now() - start.getTime()) / (1000 * 60);
  const remainingMinutes = slaMinutes - elapsedMinutes;
  const percentUsed = Math.min(100, Math.max(0, (elapsedMinutes / slaMinutes) * 100));

  if (elapsedMinutes > slaMinutes) {
    const overdue = elapsedMinutes - slaMinutes;
    const overLabel = formatSlaReadableDuration(overdue);
    return {
      hasSla: true,
      state: 'breached',
      slaMinutes,
      elapsedMinutes,
      remainingMinutes,
      percentUsed: 100,
      label: `Breached ${overLabel} ago`,
      shortLabel: formatSlaOverdueShort(overdue),
    };
  }

  if (remainingMinutes <= SLA_AT_RISK_REMAINING_MINUTES || percentUsed >= SLA_AT_RISK_PERCENT_USED) {
    return {
      hasSla: true,
      state: 'warning',
      slaMinutes,
      elapsedMinutes,
      remainingMinutes,
      percentUsed,
      label: `${formatSlaReadableDuration(remainingMinutes)} left · at risk`,
      shortLabel: formatSlaRemainingShort(remainingMinutes),
    };
  }

  return {
    hasSla: true,
    state: 'ok',
    slaMinutes,
    elapsedMinutes,
    remainingMinutes,
    percentUsed,
    label: formatSlaRemainingShort(remainingMinutes),
    shortLabel: formatSlaRemainingShort(remainingMinutes),
  };
}

export function isSlaAtRisk(itemOrRow) {
  return getSlaTiming(itemOrRow).state === 'warning';
}

function rowHasActivitySlaBreached(row) {
  const activities = row?.itAgentActivities;
  if (!Array.isArray(activities)) return false;
  return activities.some((entry) => {
    const step = normalizeText(entry?.step || entry?.stepName || entry?.name).toLowerCase();
    // Do not count SLABreached on IT Tech Reopen / ReOpen Window — use solution steps only.
    if (step.includes('reopen') || step.includes('employee feedback')) return false;
    const flag = entry?.slaBreached;
    if (flag === true) return true;
    const token = normalizeText(flag).toLowerCase();
    return token === 'yes' || token === 'true';
  });
}

/** Service Request / Incident only — excludes Change Request ticket types. */
export function isServiceOrIncidentTicket(row) {
  const type = normalizeText(row?.ticketType).toLowerCase();
  const requestId = normalizeText(row?.requestId).toLowerCase();
  if (type.includes('change request') || requestId.startsWith('it-cr')) return false;
  if (!type || type === '—') return true;
  return type.includes('service') || type.includes('incident');
}

/** Active service/incident row — excludes closed/completed terminal workflow states. */
export function isActiveServiceQueueTicket(row) {
  if (!row || !isServiceOrIncidentTicket(row)) return false;
  if (row.isProcessCompleted) return false;
  // ReOpen / IT Tech Reopen is Closed — never Open SLA.
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;
  if (isRefexServiceRowResolved(row)) return false;
  if (isAgentItemStatusResolved(row)) return false;

  const token = getCanonicalAgentItemStatusToken(getRawItemStatus(row));
  if (['resolved', 'cancelled', 'completed', 'closed'].includes(token)) return false;

  const statusLabel = normalizeText(row?.statusLabel || row?.itemStatus || row?.itemStatusRaw).toLowerCase();
  if (statusLabel.includes('resolved') || statusLabel.includes('closed') || statusLabel.includes('cancelled')) {
    return false;
  }

  const wf = normalizeText(row?.systemStatus || row?.workflowStatus || row?.statu).toLowerCase();
  if (['completed', 'closed', 'withdrawn'].includes(wf)) return false;

  return true;
}

function hasStrictActiveSlaBreachStatus(row) {
  if (isSlaHoldRow(row) || !isOpenSlaClockEligible(row)) return false;

  const display = getRefexServiceSlaMisDisplay(row, { isCompletedTab: false });
  if (display.primary === 'Breached' && display.state === 'breached') return true;

  const timing = getSlaTiming(row);
  if (timing.hasSla && timing.state === 'breached') return true;

  const slaFlag = row?.slaBreached;
  if (slaFlag === true || String(slaFlag).toLowerCase() === 'true') return true;

  const itemStatus = normalizeText(row?.itemStatus ?? row?.itemStatusRaw).toLowerCase();
  if (itemStatus === 'sla breached' || itemStatus === 'breached') return true;

  return false;
}

/** SLA-breached active service queue row — used by open-only SLA KPIs. */
export function isServiceQueueSlaBreachedTicket(row) {
  if (!isActiveServiceQueueTicket(row)) return false;
  // Extrovis PickUp TAT is MIS-only — do not move Open SLA KPI onto Open Tickets.
  if (activeDashboardProfile?.id === 'extrovis' && isExtrovisAgentPickupStep(row)) return false;
  return hasStrictActiveSlaBreachStatus(row);
}

/**
 * Closed/completed ticket whose MIS SLA cell shows Breached
 * (last IT Agent Solution / After Dependency status).
 * Live Reopen still uses that frozen last status for the Closed SLA KPI.
 */
export function isServiceQueueClosedSlaBreachedTicket(row) {
  if (!row || !isServiceOrIncidentTicket(row)) return false;

  const closed = Boolean(
    row.isProcessCompleted
    || isRefexServiceProcessCompleted(row)
    || isRefexServiceRowResolved(row)
    || isAgentItemStatusResolved(row)
    || isRefexServiceClosedTicket(row)
    || isITTechReopenStep(row)
    || isEmployeeApprovalRefexStep(row)
  );
  if (!closed) return false;

  const display = getRefexServiceSlaMisDisplay(row, { isCompletedTab: true });
  return display.state === 'breached';
}

/** Open or closed SLA breach — SlaBreached tab + Open·Closed KPI split. */
export function isServiceQueueAnySlaBreachedTicket(row) {
  return isServiceQueueSlaBreachedTicket(row) || isServiceQueueClosedSlaBreachedTicket(row);
}

/**
 * SLA KPI Open · Closed split.
 * Closed SLA ⊂ Closed. Open SLA follows the SlaBreached tab matcher
 * (Open Tickets, plus Manager/Head Me pending-approval breaches).
 * Team / Admin still exclude Pending Approval from Open SLA.
 * @param {(row: object, tabKey: string) => boolean} matchTab
 */
export function countServiceSlaKpiSplit(rows, matchTab) {
  let slaBreachedOpen = 0;
  let slaBreachedClosed = 0;
  (rows || []).forEach((row) => {
    if (typeof matchTab === 'function') {
      if (matchTab(row, 'Closed') && (
        isServiceQueueClosedSlaBreachedTicket(row) || isServiceQueueAnySlaBreachedTicket(row)
      )) {
        slaBreachedClosed += 1;
        return;
      }
      if (isServiceQueueSlaBreachedTicket(row) && matchTab(row, 'SlaBreached')) {
        slaBreachedOpen += 1;
      }
      return;
    }
    if (isServiceQueueClosedSlaBreachedTicket(row)) slaBreachedClosed += 1;
    else if (isServiceQueueSlaBreachedTicket(row)) slaBreachedOpen += 1;
  });
  return {
    slaBreachedOpen,
    slaBreachedClosed,
    slaBreached: slaBreachedOpen + slaBreachedClosed,
  };
}

export function isSlaBreached(itemOrRow) {
  const serviceCol = getActiveServiceCol();
  const itemStatus = normalizeText(
    itemOrRow?.itemStatus
    ?? itemOrRow?.itemStatusRaw
    ?? itemOrRow?.[serviceCol.itemStatus]
    ?? itemOrRow?.[serviceCol.status],
  ).toLowerCase();
  if (itemStatus.includes('breach')) return true;
  if (rowHasActivitySlaBreached(itemOrRow)) return true;
  if (isSlaTrackingComplete(itemOrRow)) {
    return isRefexClosureSlaBreached(itemOrRow) || getCompletedResolutionTiming(itemOrRow).outcome === 'breached';
  }
  return getSlaTiming(itemOrRow).state === 'breached';
}

function resolveKissflowBaseUrl(kfInstance = null) {
  return resolveKissflowOrigin(kfInstance);
}

/** Create-ticket page Id — Extrovis uses Extrovis_Create_Employee_Ticket_A00; others keep default. */
export function getActiveCreateTicketPageId() {
  return getActiveDashboardProfile()?.createTicketPageId || CREATE_TICKET_PAGE_ID;
}

export function getITCreateTicketPageUrl() {
  return `${resolveKissflowBaseUrl()}/view/application/${APP_ID}/page/${getActiveCreateTicketPageId()}`;
}

/** Resolve a clickable URL from a Kissflow attachment/file object. */
export function resolveAttachmentUrl(file) {
  if (!file || typeof file !== 'object') return null;
  const candidates = [
    file.url,
    file.URL,
    file.Url,
    file.download_url,
    file.downloadUrl,
    file.File_URL,
    file.file_url,
    file.href,
    file.link,
    file.preview_url,
    file.previewUrl,
  ];
  const photos = Array.isArray(file.photos) ? file.photos : [];
  photos.forEach((photo) => {
    if (!photo || typeof photo !== 'object') return;
    candidates.push(photo.url, photo.URL, photo.Url, photo.href, photo.link);
  });
  for (const candidate of candidates) {
    const token = String(candidate ?? '').trim();
    if (token && (token.startsWith('http') || token.startsWith('/'))) return token;
  }
  return null;
}

export function isImageAttachment(file) {
  if (!file || typeof file !== 'object') return false;
  const mime = String(file.mimeType || file.type || file.contentType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  if (Array.isArray(file.photos) && file.photos.length) return true;
  const name = String(file.name || file.Name || '');
  const ext = String(file.fileExtension || file.FileExtension || '').replace(/^\./, '');
  return Boolean(/\.(png|jpe?g|gif|webp|bmp)$/i.test(name) || /^(png|jpe?g|gif|webp|bmp)$/i.test(ext));
}

/** Open the Kissflow Create Ticket page (new ticket — no instance params). */
export function openITCreateTicketPage(kfInstance) {
  openITCreateTicketPageWithContext(kfInstance, {});
}

/** Reassign — open create ticket page with instance + activity context. */
export function openITReassignTicketPage(kfInstance, row) {
  const instanceId = normalizeText(row?.id || row?.raw?._id);
  const activityInstanceId = normalizeText(
    row?.activityInstanceId || pickActivityInstanceId(row?.raw ?? row),
  );
  openITCreateTicketPageWithContext(kfInstance, { instanceId, activityInstanceId });
}

function openITCreateTicketPageWithContext(kfInstance, { instanceId = '', activityInstanceId = '' } = {}) {
  const sdk = kfInstance || (typeof window !== 'undefined' ? window.kf : null);
  const inst = normalizeText(instanceId);
  const act = normalizeText(activityInstanceId);
  const pageParams = inst
    ? {
      instance_id: inst,
      _id: inst,
      Instance_ID: inst,
      ...(act ? {
        activity_instance_id: act,
        _activity_instance_id: act,
        Activity_Instance_ID: act,
      } : {}),
    }
    : undefined;

  const createPageId = getActiveCreateTicketPageId();
  if (sdk?.app?.openPage && typeof sdk.app.openPage === 'function') {
    try {
      return sdk.app.openPage(createPageId, pageParams)
        .then(() => 'page')
        .catch((e) => {
          console.warn('Create ticket openPage failed, using URL fallback:', e?.message || e);
          return openITCreateTicketPageUrlFallback(inst, act);
        });
    } catch (e) {
      console.warn('Create ticket openPage failed, using URL fallback:', e?.message || e);
    }
  }

  return Promise.resolve(openITCreateTicketPageUrlFallback(inst, act));
}

function openITCreateTicketPageUrlFallback(inst, act) {
  const url = new URL(getITCreateTicketPageUrl());
  if (inst) {
    url.searchParams.set('instance_id', inst);
    url.searchParams.set('_id', inst);
  }
  if (act) {
    url.searchParams.set('activity_instance_id', act);
    url.searchParams.set('_activity_instance_id', act);
  }
  try {
    const target = window.top && window.top !== window ? window.top : window;
    target.location.assign(url.toString());
  } catch {
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }
  return 'redirect';
}

export function getITAgentCreateChangeRequestPageUrl() {
  return `${resolveKissflowBaseUrl()}/view/application/${APP_ID}/page/${CREATE_AGENT_CR_PAGE_ID}`;
}

/** Open the Kissflow Create Change Request page (IT Agent). */
export function openITAgentCreateChangeRequestPage(kfInstance) {
  openITAgentCreateChangeRequestPageWithContext(kfInstance, {});
}

function openITAgentCreateChangeRequestPageWithContext(kfInstance, { instanceId = '', activityInstanceId = '' } = {}) {
  const sdk = kfInstance || (typeof window !== 'undefined' ? window.kf : null);
  const inst = normalizeText(instanceId);
  const act = normalizeText(activityInstanceId);
  const pageParams = inst
    ? {
      instance_id: inst,
      _id: inst,
      Instance_ID: inst,
      ...(act ? {
        activity_instance_id: act,
        _activity_instance_id: act,
        Activity_Instance_ID: act,
      } : {}),
    }
    : undefined;

  if (sdk?.app?.openPage && typeof sdk.app.openPage === 'function') {
    try {
      return sdk.app.openPage(CREATE_AGENT_CR_PAGE_ID, pageParams)
        .then(() => 'page')
        .catch((e) => {
          console.warn('Create CR openPage failed, using URL fallback:', e?.message || e);
          return openITAgentCreateChangeRequestPageUrlFallback(inst, act);
        });
    } catch (e) {
      console.warn('Create CR openPage failed, using URL fallback:', e?.message || e);
    }
  }

  return Promise.resolve(openITAgentCreateChangeRequestPageUrlFallback(inst, act));
}

function openITAgentCreateChangeRequestPageUrlFallback(inst, act) {
  const url = new URL(getITAgentCreateChangeRequestPageUrl());
  if (inst) {
    url.searchParams.set('instance_id', inst);
    url.searchParams.set('_id', inst);
  }
  if (act) {
    url.searchParams.set('activity_instance_id', act);
    url.searchParams.set('_activity_instance_id', act);
  }
  try {
    const target = window.top && window.top !== window ? window.top : window;
    target.location.assign(url.toString());
  } catch {
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }
  return 'redirect';
}

export function resolveITServiceViewDetailsIds(row) {
  const item = row?.raw ?? row;
  const instanceId = normalizeText(
    getItemValue(item, FIELD.instanceId)
    || item?.[getActiveServiceCol().instanceId]
    || row?.id
    || item?._id,
  );

  // Live pending/{activity} activity id always wins — report root / leftover StepField
  // ids open the wrong Kissflow form (read-only or a prior step).
  const fromMyTask = normalizeText(
    row?.employeeMyTaskItem?._activity_instance_id
    || row?.techSupportMyTaskItem?._activity_instance_id
    || row?.techSupportTaskActivityInstanceId
    || row?.employeeTaskActivityInstanceId,
  );
  if (fromMyTask) {
    return { instanceId, activityInstanceId: fromMyTask };
  }
  const atReopen = isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row);

  // Explicit reopen StepField (even when Current step mapping is blank).
  const fromReopenCol = atReopen
    ? normalizeText(
      pickSrInProgressActivityFromColumn(item, getActiveServiceCol().itTechReopenActivity)
      || pickSrInProgressActivityFromColumn(item, getActiveServiceCol().employeeApprovalRefex)
      || pickSrInProgressActivityFromColumn(item, getActiveServiceCol().itTechReopenActivityLegacy)
      || pickSrInProgressActivityFromColumn(item, getActiveServiceCol().employeeApprovalRefexLegacy),
    )
    : '';

  const fromReport = fromReopenCol
    || pickSrOpenActivityInstanceIdFromReport(item)
    || (atReopen ? '' : pickActivityInstanceId(item));
  let activityInstanceId = normalizeText(
    fromReport
    || (!atReopen ? row?.activityInstanceId : '')
    || fromMyTask
    || (atReopen
      ? normalizeText(item?._activity_instance_id || item?._context_activity_instance_id)
      : ''),
  );
  if (!activityInstanceId && !atReopen) {
    activityInstanceId = pickSrTerminalActivityInstanceIdFromReport(item);
  }
  if (!activityInstanceId && fromMyTask) {
    activityInstanceId = fromMyTask;
  }
  return { instanceId, activityInstanceId };
}

export async function resolveITServiceViewDetailsIdsLive(kfInstance, row) {
  const item = row?.raw ?? row;
  const syncIds = resolveITServiceViewDetailsIds(row);
  const { instanceId } = syncIds;
  if (!instanceId) return { instanceId: '', activityInstanceId: '' };

  const atReopen = isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row);

  // Prefer live pending/mytask activity_instance_id for reopen — report StepField
  // can be empty or fall back to a prior-step id (form opens read-only).
  // Do not prefer report root `_activity_instance_id` ahead of StepField.
  const fromMyTask = normalizeText(
    row?.employeeMyTaskItem?._activity_instance_id
    || row?.techSupportMyTaskItem?._activity_instance_id
    || row?.techSupportTaskActivityInstanceId
    || row?.employeeTaskActivityInstanceId,
  );
  if (fromMyTask) {
    return { instanceId, activityInstanceId: fromMyTask };
  }

  // Reopen StepField first (IT Tech Reopen column), then generic current-step picker.
  if (atReopen) {
    const fromReopenCol = normalizeText(
      pickSrInProgressActivityFromColumn(item, getActiveServiceCol().itTechReopenActivity)
      || pickSrInProgressActivityFromColumn(item, getActiveServiceCol().employeeApprovalRefex)
      || pickSrInProgressActivityFromColumn(item, getActiveServiceCol().itTechReopenActivityLegacy)
      || pickSrInProgressActivityFromColumn(item, getActiveServiceCol().employeeApprovalRefexLegacy),
    );
    if (fromReopenCol) {
      return { instanceId, activityInstanceId: fromReopenCol };
    }
  }

  // Current step → StepField column → in-progress `_id`
  const fromReportStep = pickSrOpenActivityInstanceIdFromReport(item);
  if (fromReportStep) {
    return { instanceId, activityInstanceId: fromReportStep };
  }

  if (!kfInstance?.api) {
    return syncIds;
  }

  if (isServiceRowTerminalForView(row) && !atReopen) {
    const terminal = pickSrTerminalActivityInstanceIdFromReport(item);
    if (terminal) return { instanceId, activityInstanceId: terminal };
  }

  const fromRootActivity = normalizeText(
    item?._activity_instance_id || item?._context_activity_instance_id,
  );
  if (fromMyTask) {
    return { instanceId, activityInstanceId: fromMyTask };
  }
  if (fromRootActivity && !atReopen) {
    return { instanceId, activityInstanceId: fromRootActivity };
  }

  if (
    isITAgentStep(row)
    || isDependencyAssigneeStep(row)
    || isTechSupportAfterDependencyStep(row)
    || atReopen
    || isITManagerApprovalStep(row)
    || isITHeadApprovalStep(row)
    || isL1ApprovalStep(row)
    || isL2ApprovalStep(row)
  ) {
    try {
      const agentIds = await resolveITAgentActivityForSubmit(kfInstance, row);
      if (agentIds.activityInstanceId) {
        return {
          instanceId: agentIds.instanceId || instanceId,
          activityInstanceId: agentIds.activityInstanceId,
        };
      }
    } catch (err) {
      console.warn('service view activity resolve failed:', err?.message || err);
    }
  } else {
    try {
      const requesterActivityId = await fetchITServiceRequesterActivityInstanceId(kfInstance, instanceId, item);
      if (requesterActivityId) {
        return { instanceId, activityInstanceId: requesterActivityId };
      }
    } catch (err) {
      console.warn('requester view activity resolve failed:', err?.message || err);
    }
  }

  return { instanceId, activityInstanceId: syncIds.activityInstanceId || '' };
}

export function resolveITCrViewDetailsIds(row) {
  const item = row?.raw ?? row;
  const instanceId = resolveCrProcessInstanceId(item) || normalizeText(row?.id);
  const step = getCrCurrentStepValue(item) || normalizeText(row?.currentStep);
  let activityInstanceId = normalizeText(
    pickCrReportActivityInstanceId(item, step)
    || pickCrOpenActivityInstanceIdFromReport(item, step)
    || row?.activityInstanceId
    || pickCrReportActivityInstanceId(item)
    || pickCrOpenActivityInstanceIdFromReport(item),
  );
  if (!activityInstanceId) {
    activityInstanceId = pickCrTerminalActivityInstanceIdFromReport(item);
  }
  return { instanceId, activityInstanceId };
}

/** Pick an activity id that still exists on the instance (avoids stale report ids). */
async function pickValidServiceViewActivityId(kfInstance, instanceId, hintId = '') {
  if (!kfInstance?.api || !instanceId) return normalizeText(hintId);

  const paths = buildITProcessApiPaths(kfInstance);
  const agentSteps = new Set([
    IT_AGENT_STEP.toLowerCase(),
    IT_AGENT_REFEX_STEP.toLowerCase(),
    IT_AGENT_EXTROVIS_STEP.toLowerCase(),
    IT_AGENT_PICKUP_STEP.toLowerCase(),
    IT_AGENT_SOLUTION_STEP.toLowerCase(),
    IT_TECH_SUPPORT_REFEX_STEP.toLowerCase(),
  ]);

  try {
    const activities = await kfGetJson(kfInstance, paths.instanceActivityPath(instanceId));
    const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);
    const hint = normalizeText(hintId);
    const openActs = [];
    let lastCompletedId = '';

    for (const act of list || []) {
      const actId = normalizeText(
        act?._activity_instance_id || act?.activity_instance_id || act?._id || act?.Id,
      );
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      const step = normalizeText(
        act?.Name || act?.Activity_Name || act?.activity_name || act?.Step_Name || act?.step_name,
      ).toLowerCase();
      if (!actId) continue;
      if (actStatus === 'completed' || actStatus === 'cancelled' || actStatus === 'canceled') {
        lastCompletedId = actId;
      } else {
        openActs.push({ actId, step });
      }
    }

    if (hint) {
      if (openActs.some((entry) => entry.actId === hint)) return hint;
      if (hint === lastCompletedId) return hint;
    }

    const agentOpen = openActs.find((entry) => agentSteps.has(entry.step));
    if (agentOpen) return agentOpen.actId;

    if (openActs.length) return openActs[0].actId;
    return lastCompletedId;
  } catch (err) {
    console.warn('service view activity lookup failed:', err?.message || err);
    return normalizeText(hintId);
  }
}

async function pickValidCrViewActivityId(kfInstance, instanceId, hintId = '') {
  if (!kfInstance?.api || !instanceId) return normalizeText(hintId);

  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  try {
    const activities = await kfGetJson(kfInstance, paths.instanceActivityPath(instanceId));
    const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);
    const hint = normalizeText(hintId);
    const openIds = [];
    let lastCompletedId = '';

    for (const act of list || []) {
      const actId = normalizeText(
        act?._activity_instance_id || act?.activity_instance_id || act?._id || act?.Id,
      );
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      if (!actId) continue;
      if (actStatus === 'completed' || actStatus === 'cancelled' || actStatus === 'canceled') {
        lastCompletedId = actId;
      } else {
        openIds.push(actId);
      }
    }

    if (hint && openIds.includes(hint)) return hint;
    if (hint && hint === lastCompletedId) return hint;
    if (openIds.length) return openIds[0];
    return lastCompletedId || normalizeText(hintId);
  } catch (err) {
    console.warn('CR view activity lookup failed:', err?.message || err);
    return normalizeText(hintId);
  }
}

function isServiceRowTerminalForView(row) {
  const token = getCanonicalAgentItemStatusToken(getRawItemStatus(row));
  return token === 'resolved' || token === 'cancelled';
}

export async function resolveITCrViewDetailsIdsLive(kfInstance, row) {
  const item = row?.raw ?? row;
  const step = getCrCurrentStepValue(item) || normalizeText(row?.currentStep);
  const fromReport = resolveCrSubmitIdsFromReport(row, step);
  const instanceId = fromReport.instanceId || normalizeText(row?.id);

  if (!instanceId) return { instanceId: '', activityInstanceId: '' };
  if (!kfInstance?.api) {
    return { instanceId, activityInstanceId: fromReport.activityInstanceId || '' };
  }

  if (fromReport.activityInstanceId) {
    return { instanceId, activityInstanceId: fromReport.activityInstanceId };
  }

  if (isCrCompletedItem(row)) {
    return {
      instanceId,
      activityInstanceId: pickCrTerminalActivityInstanceIdFromReport(item) || '',
    };
  }

  if (crStepMatches(step, CR_IMPLEMENTATION_STEP)) {
    const implId = pickFreshImplementationActivityId(item);
    if (implId) return { instanceId, activityInstanceId: implId };
  }

  const hint = resolveITCrViewDetailsIds(row).activityInstanceId;
  return { instanceId, activityInstanceId: hint || '' };
}

async function openITProcessForm(kfInstance, process, { instanceId = '', activityInstanceId = '' } = {}) {
  const inst = normalizeText(instanceId);
  const act = normalizeText(activityInstanceId);
  if (!process?.openForm || !inst || !act) return false;
  try {
    await process.openForm({ _id: inst, _activity_instance_id: act });
    return true;
  } catch (err) {
    console.warn('process.openForm failed:', err?.message || err);
    return false;
  }
}

/** Open service request activity in Create Ticket page.
 *  @returns {Promise<true|'page'|'redirect'|false>} */
export async function openITServiceRequestDetailsPage(kfInstance, row) {
  const { instanceId, activityInstanceId } = await resolveITServiceViewDetailsIdsLive(kfInstance, row);
  const sdk = kfInstance || (typeof window !== 'undefined' ? window.kf : null);
  const process = getITProcess(sdk);
  const opened = await openITProcessForm(sdk, process, { instanceId, activityInstanceId });
  if (opened) return true;
  return openITCreateTicketPageWithContext(sdk, { instanceId, activityInstanceId });
}

/** Edit service record — same Create Ticket page as New Request (with instance context). Skips in-app openForm. */
export async function openITEditServiceRecordPage(kfInstance, row) {
  const { instanceId, activityInstanceId } = await resolveITServiceViewDetailsIdsLive(kfInstance, row);
  const sdk = kfInstance || (typeof window !== 'undefined' ? window.kf : null);
  return openITCreateTicketPageWithContext(sdk, { instanceId, activityInstanceId });
}

/** Open change request activity in Create Change Request page.
 *  @returns {Promise<true|'page'|'redirect'|false>} */
export async function openITChangeRequestDetailsPage(kfInstance, row) {
  const { instanceId, activityInstanceId } = await resolveITCrViewDetailsIdsLive(kfInstance, row);
  const sdk = kfInstance || (typeof window !== 'undefined' ? window.kf : null);
  const process = getChangeRequestProcess(sdk);
  const opened = await openITProcessForm(sdk, process, { instanceId, activityInstanceId });
  if (opened) return true;
  return openITAgentCreateChangeRequestPageWithContext(sdk, { instanceId, activityInstanceId });
}

/** Edit change request — same Create CR page as New Change Request (with instance context). Skips in-app openForm. */
export async function openITEditChangeRequestPage(kfInstance, row) {
  const { instanceId, activityInstanceId } = await resolveITCrViewDetailsIdsLive(kfInstance, row);
  const sdk = kfInstance || (typeof window !== 'undefined' ? window.kf : null);
  return openITAgentCreateChangeRequestPageWithContext(sdk, { instanceId, activityInstanceId });
}

export function resolveAccountId(kfInstance) {
  const sdkAccountId = String(
    kfInstance?.account?._id
    || kfInstance?.account?.Id
    || kfInstance?.account?.id
    || '',
  ).trim();
  if (sdkAccountId) return sdkAccountId;

  const candidates = [];
  const push = (v) => { if (v) candidates.push(String(v)); };
  push(typeof window !== 'undefined' ? window?.location?.href : '');
  push(typeof window !== 'undefined' ? window?.location?.pathname : '');
  push(typeof document !== 'undefined' ? document?.referrer : '');
  try {
    push(typeof window !== 'undefined' ? window?.parent?.location?.href : '');
  } catch {
    // cross-origin parent
  }

  // Live URLs use /process/2/{accountId}/… — must match process, not only process-report.
  const re = /\/(?:flow|case|metadata|process-report|process|view\/process)\/2\/([^/]+)/i;
  const storeRe = /kissflow\.store\/([^/]+)\//i;
  for (const raw of candidates) {
    const match = raw.match(re) || raw.match(storeRe);
    if (match?.[1]) return match[1];
  }
  const origin = String(resolveKissflowOrigin(kfInstance) || '').toLowerCase();
  if (origin.includes('development-refexgroup')) return DEV_ACCOUNT_ID;
  return DEFAULT_ACCOUNT_ID;
}

export function getReportPath(accountId, page = 1, pageSize = 100, filters = {}) {
  const processId = getActiveServiceProcessId();
  // Lazy import avoided — build query inline-compatible with Kissflow `$` params.
  const pageNum = Math.max(1, Number(page) || 1);
  const size = Math.max(1, Number(pageSize) || 100);
  const parts = [
    `page_number=${pageNum}`,
    `page_size=${size}`,
    `_application_id=${encodeURIComponent(APP_ID)}`,
  ];
  const append = (key, value) => {
    const v = String(value ?? '').trim();
    if (!v) return;
    parts.push(`${key}=${encodeURIComponent(v)}`);
  };
  append('$status', filters.status);
  append('$status_OC', filters.statusOc);
  append('$modified_at_gt', filters.modifiedAtGt);
  append('$modified_at_lt', filters.modifiedAtLt);
  append('$modified_at_bt', filters.modifiedAtBt);
  append('$created_at_gt', filters.createdAtGt);
  append('$entity', filters.entity);
  append('$created_by_contain', filters.createdByContain);
  append('$modified_by_contain', filters.modifiedByContain);
  // Kissflow assignee filter — User Id (or email) so assigned tickets are not missed.
  append('$assigned_to', filters.assignedTo);
  // Prefer one Request-ID filter per call — combining unknown `$request_id` with a
  // Column_* filter can AND to an empty result set.
  if (filters.requestIdColumn && filters.requestId) {
    append(`$${filters.requestIdColumn}`, filters.requestId);
  } else {
    append('$request_id', filters.requestId);
  }
  return `/process-report/2/${accountId}/${processId}/${activeServiceReportId}?${parts.join('&')}`;
}

export function getChangeRequestReportPath(accountId, page = 1, pageSize = 100) {
  return `/process-report/2/${accountId}/${CHANGE_REQUEST_PROCESS_ID}/${activeCrReportId}?page_number=${page}&page_size=${pageSize}&_application_id=${APP_ID}`;
}

function normalizeText(v) {
  return String(v ?? '').trim();
}

function isOpaqueUserId(token) {
  const t = normalizeText(token);
  if (!t) return true;
  if (t === '[object Object]') return true;
  if (/^(Activity_|Column_)/i.test(t)) return true;
  if (/^[a-f0-9]{16,}$/i.test(t)) return true;
  return false;
}

const ITSM_PERSON_ALIASES = {
  'it manager': 'Sakthivel',
  'it manager refex': 'Sakthivel',
  'it manager approval': 'Sakthivel',
  'first approver - it manager': 'Sakthivel',
  'first approver it manager': 'Sakthivel',
  'it head': 'Mugesh',
  'it head refex': 'Mugesh',
  'it head approval': 'Mugesh',
  'final approver - it head': 'Mugesh',
  'final approver it head': 'Mugesh',
};

export function displayItsmPersonName(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const key = text.toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  return ITSM_PERSON_ALIASES[key] || text;
}

function compactPersonFilterKey(value) {
  const parts = String(value || '').trim().toLowerCase()
    .replace(/\./g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  while (parts.length > 1 && parts[parts.length - 1].length === 1) parts.pop();
  return parts.join('');
}

/** Readable display name from Kissflow user object, array, or string — never raw IDs. */
function resolvePersonDisplayName(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const t = normalizeText(value);
    if (isOpaqueUserId(t)) return '';
    return displayItsmPersonName(t);
  }
  if (Array.isArray(value)) {
    const names = value.map(resolvePersonDisplayName).filter(Boolean);
    return names.length ? [...new Set(names)].join(', ') : '';
  }
  if (typeof value === 'object') {
    const name = normalizeText(
      value.Name || value.name || value.FullName || value.fullName || value.displayName,
    );
    if (name && !isOpaqueUserId(name)) return displayItsmPersonName(name);
    return '';
  }
  const text = stringifyKfValue(value);
  return text && !isOpaqueUserId(text) ? text : '';
}

/** Service request requester — original raiser, not assignee or actor. */
export function formatRequesterDisplay(row) {
  if (!row || typeof row !== 'object') return '—';
  const requesterRaw = row.requesterNameRaw ?? row.requesterName;
  const fromRequester = resolvePersonDisplayName(requesterRaw);
  const fromCreated = resolvePersonDisplayName(row.createdBy);
  const name = fromRequester || fromCreated;
  return name || '—';
}

function normalizeEmail(v) {
  return normalizeText(v).toLowerCase();
}

/** Normalize email for user matching — trim and lowercase. */
export function normalizeUserEmail(v) {
  return normalizeEmail(v);
}

function parseUserRef(ref) {
  if (!ref || typeof ref !== 'object') return { id: '', name: '', email: '' };
  return {
    id: normalizeText(ref._id || ref.Id || ref.id),
    name: normalizeText(ref.Name || ref.name),
    email: normalizeEmail(ref.Email || ref.email),
  };
}

/** Coerce Kissflow assignee payloads (array, single user/role object, or null) to an array. */
export function normalizeAssigneeList(value) {
  if (value == null || value === '' || value === '—') return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'object') return [value];
  const text = normalizeText(value);
  return text ? [{ Name: text }] : [];
}

/**
 * Flatten AppRole / group assignees that embed member Users (Working Knowledge).
 * Keeps the role shell and nested people so both IT Manager members can match.
 */
export function expandAssigneeEntries(value) {
  const out = [];
  const seen = new Set();
  const push = (entry) => {
    if (!entry || typeof entry !== 'object') return;
    const key = [
      normalizeText(entry._id || entry.Id || entry.id),
      normalizeEmail(entry.Email || entry.email),
      normalizeText(entry.Name || entry.name).toLowerCase(),
      normalizeText(entry.Kind || entry.kind).toLowerCase(),
    ].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };

  normalizeAssigneeList(value).forEach((entry) => {
    push(entry);
    const nested = entry?.Users
      || entry?.users
      || entry?.Members
      || entry?.members
      || entry?.User
      || entry?.user
      || entry?.WorkingKnowledge
      || entry?.working_knowledge
      || entry?.Working_Knowledge;
    if (Array.isArray(nested)) nested.forEach(push);
    else if (nested && typeof nested === 'object') push(nested);
  });
  return out;
}

/** Dedupe assignees by person identity (id → email → name) so MIS cells show one name. */
export function dedupeAssigneeList(value) {
  const list = normalizeAssigneeList(value);
  const byId = new Set();
  const byEmail = new Set();
  const byName = new Set();
  const result = [];

  list.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const id = normalizeText(entry._id || entry.Id || entry.id);
    const email = normalizeEmail(entry.Email || entry.email || entry._email);
    const name = normalizeText(entry.Name || entry.name).toLowerCase();

    if (id && byId.has(id)) return;
    if (email && byEmail.has(email)) return;
    if (name && byName.has(name)) return;

    if (id) byId.add(id);
    if (email) byEmail.add(email);
    if (name) byName.add(name);
    result.push(entry);
  });

  return result;
}

function formatAssignedTo(list) {
  const assignees = dedupeAssigneeList(list);
  const names = [];
  const seenNames = new Set();
  assignees.forEach((a) => {
    const name = normalizeText(a?.Name || a?.name);
    const token = name.toLowerCase();
    if (!name || seenNames.has(token)) return;
    seenNames.add(token);
    names.push(name);
  });
  return names.length ? names.join(', ') : '—';
}

function isHumanActorName(name) {
  const token = normalizeText(name).toLowerCase();
  if (!token || token === '—') return false;
  return !['it agents', 'it agent', 'it manager', 'it admin'].includes(token);
}

function formatActedBy(value) {
  if (!value) return '—';
  const list = Array.isArray(value) ? value : [value];
  const names = list
    .map((user) => {
      if (typeof user === 'string') return normalizeText(user);
      return normalizeText(user?.Name || user?.name);
    })
    .filter(isHumanActorName);
  return names.length ? names.join(', ') : '—';
}

function pickSrStepFieldEntries(item, columnKey) {
  const col = normalizeText(columnKey);
  if (!col || !item) return [];
  const raw = getItemValue(item, [col]) ?? item?.[col];
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
}

function pickActedByFromStepEntry(entry) {
  if (!entry) return '';
  const actedBy = entry.ActedBy ?? entry.actedBy ?? entry.Acted_By;
  const assignedTo = entry.AssignedTo ?? entry.assignedTo ?? entry.Assignee ?? entry._assigned_to;
  const fromActed = formatActedBy(actedBy);
  if (fromActed !== '—') return fromActed;
  const fromAssigned = formatActedBy(assignedTo);
  return fromAssigned !== '—' ? fromAssigned : '';
}

function isTerminalStepActivityStatus(status) {
  const token = normalizeText(status).toLowerCase();
  return token === 'completed' || token === 'cancelled' || token === 'canceled' || token === 'resolved';
}

/** Agent work StepField columns (current + legacy) — excludes IT Tech Reopen / Feedback. */
function getAgentWorkStepFieldColumnKeys(item) {
  const serviceCol = getActiveServiceCol();
  const extrovis = isExtrovisServiceDashboardContext();
  // Admin Get All Items uses native step names; reports use Column_*.
  const nativeSolver = extrovis
    ? ['IT Agent Solution', 'IT Tech Support After Dependency']
    : ['IT Tech Support', 'IT Tech Support After Dependency'];
  // Solver / Solution columns before PickUp pool — closed Extrovis rows keep stale pickup assignee.
  return [
    ...nativeSolver,
    serviceCol.itAgentActivity,
    serviceCol.itAgentRefexActivity,
    serviceCol.itAgentRefexActivityLegacy,
    getSrItAgentStepActivityColumn(item),
    serviceCol.techSupportAfterDependencyActivity,
    serviceCol.techSupportAfterDependencyActivityLegacy,
    serviceCol.dependencyAssigneeActivity,
    serviceCol.dependencyAssigneeActivityLegacy,
    serviceCol.itTechActivity,
    serviceCol.itAgentPickupActivity,
    serviceCol.itAgentPickupActivityLegacy,
  ];
}

/** Approval StepFields for this dashboard role only — not L1/L2 or the other role. */
function getApproverWorkStepFieldColumnKeys(role = 'first') {
  const serviceCol = getActiveServiceCol();
  if (role === 'final') {
    return [
      serviceCol.itHeadApprovalActivity,
      serviceCol.itHeadApprovalActivityLegacy,
    ];
  }
  if (role === 'first') {
    return [
      serviceCol.itManagerApprovalActivity,
      serviceCol.itManagerApprovalActivityLegacy,
    ];
  }
  return [
    serviceCol.itHeadApprovalActivity,
    serviceCol.itHeadApprovalActivityLegacy,
    serviceCol.itManagerApprovalActivity,
    serviceCol.itManagerApprovalActivityLegacy,
  ];
}

function stepEntryMatchesUser(entry, user) {
  if (!entry || !user) return false;
  const actedBy = entry.ActedBy ?? entry.actedBy ?? entry.Acted_By;
  if (personMatchesUser(actedBy, user)) return true;
  const assignedTo = entry.AssignedTo ?? entry.assignedTo ?? entry.Assignee ?? entry._assigned_to;
  if (personMatchesUser(assignedTo, user)) return true;
  const name = pickActedByFromStepEntry(entry);
  return Boolean(name && personMatchesUser(name, user));
}

function resolveItAgentActedByFromColumns(item, columnKeys = []) {
  if (!item) return '—';

  const seen = new Set();
  for (const columnKey of columnKeys) {
    const col = normalizeText(columnKey);
    if (!col || seen.has(col)) continue;
    seen.add(col);

    const entries = pickSrStepFieldEntries(item, col);
    for (const entry of entries) {
      const status = entry?.Status ?? entry?.status ?? entry?._status;
      const name = pickActedByFromStepEntry(entry);
      if (name && isTerminalStepActivityStatus(status)) return name;
    }
    for (let idx = entries.length - 1; idx >= 0; idx -= 1) {
      const name = pickActedByFromStepEntry(entries[idx]);
      if (name) return name;
    }
  }

  return '—';
}

/** Solver / Solution StepFields only — excludes PickUp pool columns. */
function getSolverStepFieldColumnKeys(item) {
  const serviceCol = getActiveServiceCol();
  const extrovis = isExtrovisServiceDashboardContext();
  const nativeSolver = extrovis
    ? ['IT Agent Solution', 'IT Tech Support After Dependency']
    : ['IT Tech Support', 'IT Tech Support After Dependency'];
  return [
    ...nativeSolver,
    serviceCol.itAgentActivity,
    serviceCol.itAgentRefexActivity,
    serviceCol.itAgentRefexActivityLegacy,
    getSrItAgentStepActivityColumn(item),
    serviceCol.techSupportAfterDependencyActivity,
    serviceCol.techSupportAfterDependencyActivityLegacy,
    serviceCol.dependencyAssigneeActivity,
    serviceCol.dependencyAssigneeActivityLegacy,
    serviceCol.itTechActivity,
  ];
}

function resolveItAgentSolverActedBy(item) {
  return resolveItAgentActedByFromColumns(item, getSolverStepFieldColumnKeys(item));
}

/** IT Agent step ActedBy — Refex / Extrovis StepFields (current + legacy columns). */
function resolveItAgentActedBy(item) {
  return resolveItAgentActedByFromColumns(item, getAgentWorkStepFieldColumnKeys(item));
}

/** Resolved/cancelled actor — IT Agent StepField ActedBy, then assignee fallback. */
function resolveServiceTerminalActor(item, assignedRaw, modifiedBy) {
  const actedBy = resolveItAgentActedBy(item);
  if (actedBy && actedBy !== '—') return actedBy;

  const assigned = formatAssignedTo(assignedRaw);
  if (assigned && assigned !== '—' && isHumanActorName(assigned)) return assigned;

  return isHumanActorName(modifiedBy.name) ? modifiedBy.name : '—';
}

function parseKissflowDateTime(value) {
  if (value == null || value === '') return null;
  let raw = value;
  if (typeof raw === 'object') {
    raw = raw.ISODate || raw.isoDate || raw.Date || raw.date
      || raw.value || raw.Value || raw._created_at || raw.datetime || '';
  }
  raw = String(raw).trim();
  if (!raw || raw === '—') return null;
  // Strip trailing IANA zone label e.g. " Asia/Kolkata" that breaks Date parsing.
  raw = raw.replace(/\s+[A-Za-z]+(?:\/[A-Za-z_]+)+\s*$/, '');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateTime(value) {
  const d = parseKissflowDateTime(value);
  if (!d) return normalizeText(value) || '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDisplayDateTime(value) {
  const d = parseKissflowDateTime(value);
  if (!d) return normalizeText(value) || '—';
  const day = d.getDate();
  const month = d.toLocaleString('en-IN', { month: 'long' });
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours %= 12;
  if (hours === 0) hours = 12;
  const minStr = String(minutes).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}.${minStr} ${ampm}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return normalizeText(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Map legacy Refex agent step aliases for display / index helpers. */
export function normalizeServiceWorkflowStep(stepName) {
  const s = normalizeText(stepName);
  if (!s || s === '—') return s;
  const lower = s.toLowerCase();
  // Keep real approval steps distinct — do not collapse Manager/Head into IT Agent.
  if (
    lower.includes('it manager approval')
    || lower.includes('it head approval')
    || lower === 'l1 approval'
    || lower === 'l2 approval'
    || lower === 'l1 manager'
    || lower === 'l2 manager'
  ) {
    return s;
  }
  if (lower === IT_AGENT_REFEX_STEP.toLowerCase()) return IT_AGENT_STEP;
  return s;
}

export function getWorkflowStepIndex(stepName) {
  const s = normalizeServiceWorkflowStep(stepName);
  const idx = WORKFLOW_STEPS.findIndex((step) => step.toLowerCase() === s.toLowerCase());
  return idx >= 0 ? idx : 0;
}

/** Kissflow logged-in user profile for dashboard header. */
export function resolveKfUserProfile(user) {
  const roleRaw = user?.Role || user?.Roles?.[0];
  const role = typeof roleRaw === 'string'
    ? roleRaw.trim()
    : String(roleRaw?.Name || roleRaw?.name || '').trim();
  const designation = normalizeText(user?.Designation || user?.Title || user?.JobTitle);
  const company = normalizeText(user?.Company || user?.Entity || user?.Organization);
  const entity = normalizeText(user?.Entity || user?.Company || user?.Organization);
  const department = normalizeText(user?.Department);
  return {
    name: normalizeText(user?.Name) || 'User',
    role,
    designation,
    company: company || entity || department,
    entity: entity || department,
    department,
  };
}

/** Display-only header override — does not change Me / Team / KPI matchers. */
export const GROUP_CTO_HEADER_EMAIL = 'srivaths.varadharajan@refex.co.in';

function headerEmailToken(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Header line under the greeting — pack role, not Kissflow AppRoles.
 * One user can hold many AppRoles; the installed zip is the dashboard they are in.
 */
export function resolveItsmHeaderRoleLabel({
  headerRoleLabel = '',
  pack = '',
  role = '',
  hideScopeSwitch = false,
  showHeaderPeopleFilters = false,
  extrovis = false,
  userEmail = '',
} = {}) {
  if (headerEmailToken(userEmail) === GROUP_CTO_HEADER_EMAIL) return 'Group CTO';
  const explicit = normalizeText(headerRoleLabel);
  if (explicit) return explicit;
  const packKey = normalizeText(pack).toLowerCase();
  if (packKey === 'employee') return 'Employee';
  if (packKey === 'agent') return 'IT Agent';
  if (hideScopeSwitch && showHeaderPeopleFilters) return 'Group CEO';
  if (hideScopeSwitch) return 'Admin';
  if (extrovis) {
    if (role === 'first') return 'First Level Approver';
    if (role === 'final') return 'Final Level Approver';
  }
  if (role === 'first') return 'IT Manager';
  if (role === 'final') return 'IT Head';
  return '';
}

function isServiceWorkflowTerminal(row) {
  return isAgentItemStatusResolved(row) || isAgentItemStatusCancelled(row);
}

function resolveServiceWorkflowActiveIndex(row) {
  const liveStep = getCurrentStepValue(row) || row?.currentStep || row?.activeWorkflowStep;
  const currentNorm = normalizeServiceWorkflowStep(liveStep);
  let activeIdx = getWorkflowStepIndex(currentNorm || liveStep);
  const lastNorm = normalizeServiceWorkflowStep(row?.lastCompletedStep);
  const lastLower = normalizeText(lastNorm).toLowerCase();
  const liveIsReopen = normalizeText(liveStep).toLowerCase().includes('reopen');
  // Stale lastCompletedStep (ReOpen Window) must not jump past live Solution / PickUp.
  if (lastNorm && (liveIsReopen || (!lastLower.includes('reopen') && lastLower !== 'completed'))) {
    activeIdx = Math.max(activeIdx, getWorkflowStepIndex(lastNorm));
  }
  if (isServiceWorkflowTerminal(row)) {
    const agentIdx = WORKFLOW_STEPS.indexOf(IT_AGENT_STEP);
    if (agentIdx >= 0) activeIdx = Math.max(activeIdx, agentIdx);
  }
  return activeIdx;
}

function resolveVisibleStepHandler(row, step, stepIdx, activeIdx) {
  if (stepIdx > activeIdx) return '';
  if (stepIdx === 0) {
    return normalizeText(row?.requesterName || row?.createdBy) || '—';
  }
  if (step === IT_AGENT_STEP) {
    const actedBy = resolveItAgentActedBy(row?.raw ?? row);
    if (actedBy && actedBy !== '—') return actedBy;
    const item = row?.raw ?? row;
    const fromRaw = formatAssignedTo(
      row?.assignedToRaw ?? getItemValue(item, FIELD.assignedTo) ?? item?.[getActiveServiceCol().assignedTo],
    );
    if (fromRaw && fromRaw !== '—' && isHumanActorName(fromRaw)) return fromRaw;
    const assigned = normalizeText(row?.assignedTo);
    if (isHumanActorName(assigned)) return assigned;
    if (isServiceWorkflowTerminal(row)) {
      for (const actor of [row?.completedBy, row?.cancelledBy, row?.modifiedBy]) {
        const name = normalizeText(actor);
        if (isHumanActorName(name)) return name;
      }
    }
    return '—';
  }
  return normalizeText(row?.modifiedBy || row?.assignedTo) || '—';
}

/** Handler name per workflow step for service requests. */
export function getServiceWorkflowHandlers(row) {
  const activeIdx = resolveServiceWorkflowActiveIndex(row);
  const handlers = {};
  WORKFLOW_STEPS.forEach((step, idx) => {
    const name = resolveVisibleStepHandler(row, step, idx, activeIdx);
    if (name) handlers[step] = name;
  });
  return handlers;
}

/** Handler name per workflow step for change requests. */
export function getCrWorkflowHandlers(row) {
  const item = row?.raw ?? row;
  const completed = isCrCompletedItem(row);
  const activeIdx = completed
    ? CHANGE_REQUEST_WORKFLOW_STEPS.length - 1
    : getChangeRequestStepIndex(row?.currentStep);
  const handlers = {};
  CHANGE_REQUEST_WORKFLOW_STEPS.forEach((step, idx) => {
    if (idx === 0) {
      handlers[step] = normalizeText(row?.createdBy || row?.requesterName) || '—';
      return;
    }

    const assignee = resolveCrStepAssignee(item, step, row);
    if (assignee && assignee !== '—') {
      handlers[step] = assignee;
      return;
    }

    if (idx <= activeIdx) handlers[step] = '—';
  });
  return handlers;
}

/** Timestamp per CR workflow step (from StepField ActedAt or created date). */
export function getCrWorkflowStepTimes(row) {
  const item = row?.raw ?? row;
  const times = {};
  CHANGE_REQUEST_WORKFLOW_STEPS.forEach((step, idx) => {
    if (idx === 0) {
      const created = formatDateTime(row?.createdAtRaw || row?.requestedDateTimeRaw);
      if (created) times[step] = created;
      return;
    }
    const columnKey = getCrStepActivityColumn(step, item);
    if (!columnKey) return;
    const entries = pickCrStepFieldEntries(item, columnKey);
    for (const entry of entries) {
      const stamp = pickStepTimestampFromEntry(entry);
      if (stamp) {
        times[step] = stamp;
        return;
      }
    }
  });
  return times;
}

/** Timestamp per service workflow step. */
export function getServiceWorkflowStepTimes(row) {
  const item = row?.raw ?? row;
  const times = {};
  WORKFLOW_STEPS.forEach((step, idx) => {
    if (idx === 0) {
      const created = formatDateTime(row?.createdAtRaw || row?.requestedDateTimeRaw);
      if (created) times[step] = created;
      return;
    }
    if (step === IT_AGENT_STEP || step === IT_AGENT_REFEX_STEP) {
      const columnKeys = [
        getSrItAgentStepActivityColumn(item),
        getActiveServiceCol().itAgentActivity,
        getActiveServiceCol().itAgentRefexActivity,
      ];
      const seen = new Set();
      for (const columnKey of columnKeys) {
        const col = normalizeText(columnKey);
        if (!col || seen.has(col)) continue;
        seen.add(col);
        const entries = pickSrStepFieldEntries(item, col);
        for (const entry of entries) {
          const stamp = pickStepTimestampFromEntry(entry);
          if (stamp) {
            times[step] = stamp;
            return;
          }
        }
      }
    }
  });
  return times;
}

export function isAssignedToUser(assignedList, user) {
  if (!user) return false;
  const list = expandAssigneeEntries(assignedList);
  if (!list.length) return false;
  const userId = normalizeText(user._id || user.Id);
  const userName = normalizeText(user.Name || user.FirstName).toLowerCase();
  const userEmail = normalizeEmail(user.Email);

  return list.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    // AppRole pool shell is not a personal assignment (nested Users already expanded).
    const kind = normalizeText(entry.Kind || entry.kind).toLowerCase();
    if (kind === 'approle' || kind === 'role') return false;
    const entryId = normalizeText(entry._id || entry.Id || entry.id);
    const entryName = normalizeText(entry.Name || entry.name).toLowerCase();
    const entryEmail = normalizeEmail(entry.Email || entry.email || entry._email);
    if (userId && entryId && userId === entryId) return true;
    if (userEmail && entryEmail && userEmail === entryEmail) return true;
    if (userEmail && entryName && entryName === userEmail) return true;
    if (userName && entryName && userName === entryName) return true;
    return false;
  });
}

function extractAssigneesFromActivityEntry(entry) {
  if (!entry || typeof entry !== 'object') return [];
  const collected = [];
  const sources = [
    entry.AssignedTo,
    entry.assignedTo,
    entry.Assignee,
    entry._assigned_to,
    entry.ActedBy,
    entry.actedBy,
  ];
  sources.forEach((source) => {
    if (!source) return;
    if (Array.isArray(source)) collected.push(...source.filter(Boolean));
    else collected.push(source);
  });
  return collected;
}

function pickCurrentStepInProgressActivityEntry(item) {
  if (!item) return null;
  const stepColumn = getSrStepFieldColumnForCurrentStep(item);
  if (!stepColumn) return null;

  const entries = pickSrStepFieldEntries(item, stepColumn);
  for (const entry of entries) {
    const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status).toLowerCase();
    const token = status.replace(/[\s_-]+/g, '');
    if (
      token === 'inprogress'
      || token === 'open'
      || token === 'notpickedyet'
      || token === 'waitingforitagentapproval'
    ) {
      return entry;
    }
  }
  return null;
}

/** Extrovis report field for the personally assigned agent (separate from AppRole pool). */
function getExtrovisAssignedToUserValue(rowOrItem) {
  const item = rowOrItem?.raw ?? rowOrItem;
  const col = getActiveServiceCol()?.assignedToUser;
  if (!col || !item) return null;
  return getItemValue(item, [col]) ?? item?.[col] ?? rowOrItem?.assignedToUserRaw ?? null;
}

function getCurrentTaskAssigneeList(row) {
  const task = row?.techSupportMyTaskItem || row?.employeeMyTaskItem;
  if (task?._current_assigned_to) {
    return dedupeAssigneeList(task._current_assigned_to);
  }

  const item = row?.raw ?? row;
  const activeEntry = pickCurrentStepInProgressActivityEntry(item);
  const fromActivity = extractAssigneesFromActivityEntry(activeEntry);
  if (fromActivity.length) return dedupeAssigneeList(fromActivity);

  const fromRow = dedupeAssigneeList(row?.assignedToRaw);
  if (fromRow.length) return fromRow;

  return dedupeAssigneeList(getExtrovisAssignedToUserValue(row));
}

/** True when the ticket has a live in-progress workflow task at the current step. */
export function hasCurrentActiveWorkflowTask(row) {
  if (!row) return false;

  const task = row?.techSupportMyTaskItem || row?.employeeMyTaskItem;
  if (task) {
    const status = normalizeText(task?._status || task?.Status).toLowerCase();
    if (!status || (status !== 'completed' && status !== 'cancelled' && status !== 'canceled')) {
      return true;
    }
  }

  const item = row?.raw ?? row;
  const stepColumn = getSrStepFieldColumnForCurrentStep(item);
  if (stepColumn && pickSrInProgressActivityFromColumn(item, stepColumn)) return true;

  const currentStep = getCurrentStepValue(item);
  if (!currentStep) return false;
  return Boolean(pickCurrentStepInProgressActivityEntry(item));
}

/**
 * Extrovis My Tasks — IT Agent Solution step assigned to the signed-in user.
 * PickUp stays under Open Tickets (IT Agents Extrovis pool).
 */
export function matchesExtrovisMyTaskRow(row, user) {
  if (!row || !user) return false;
  if (!normalizeText(row?.id)) return false;
  // PickUp is Open Tickets (shared pool) — never My Tickets.
  if (isExtrovisAgentPickupStep(row) || matchesExtrovisOpenTicketRow(row, user)) return false;
  // ReOpen Window / Completed are Closed. Statu_1 Closed while holding Solution stays here.
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;
  if (isRefexServiceProcessCompleted(row) || isAgentItemStatusCancelled(row)) return false;
  // Live pending/{Solution|Dependency} in this user's bucket — Kissflow often
  // omits assignee on those payloads, same as it omits `_current_step`.
  if (isLiveBucketPendingRow(row) && normalizeText(row?.liveBucketStepGroup).toLowerCase() === 'mytickets') {
    return true;
  }
  // Owned work: Solution, Dependency Assigne, After Dependency — pending/{Solution} stamps mytask.
  const atOwnedStep = isExtrovisAgentSolutionStep(row)
    || isDependencyAssigneeStep(row)
    || isTechSupportAfterDependencyStep(row);
  if (!atOwnedStep) return false;
  if (row?.techSupportTaskOwnedByUser) return true;
  if (row?.techSupportMyTaskItem) {
    const fromTask = row.techSupportMyTaskItem._current_assigned_to
      || row.techSupportMyTaskItem.AssignedTo
      || row.techSupportMyTaskItem._assigned_to;
    if (isAssignedToUser(fromTask, user)) return true;
  }
  if (isAssignedToUser(getCurrentTaskAssigneeList(row), user)) return true;
  if (isAssignedToUser(row?.assignedToRaw, user)) return true;
  if (isAssignedToUser(getExtrovisAssignedToUserValue(row), user)) return true;
  return false;
}

/**
 * Refex My Tasks — IT Tech Support / Dependency / After Dependency assigned to the user.
 * IT Tech (round-robin) stays under Open Tickets when assigned to this user.
 */
export function matchesRefexSplitMyTaskRow(row, user) {
  if (!row || !user) return false;
  if (!normalizeText(row?.id)) return false;
  // IT Tech Reopen is Closed (actionable via Closed + mytask merge) — not My Tickets.
  if (isEmployeeApprovalRefexStep(row) || isRefexServiceClosedTicket(row)) return false;
  if (isRefexServiceProcessCompleted(row) || isAgentItemStatusCancelled(row)) return false;
  if (isRefexTechPickupStep(row)) return false;
  // Live pending/{IT Tech Support|Dependency} in this user's bucket.
  if (isLiveBucketPendingRow(row) && normalizeText(row?.liveBucketStepGroup).toLowerCase() === 'mytickets') {
    return true;
  }
  // Owned work includes Dependency Assignee + Tech Support After Dependency.
  const atOwnedWork = isRefexTechSupportOwnedStep(row)
    || isDependencyAssigneeStep(row)
    || isTechSupportAfterDependencyStep(row);
  if (!atOwnedWork) return false;
  if (row?.techSupportTaskOwnedByUser) return true;
  if (isAssignedToUser(getCurrentTaskAssigneeList(row), user)) return true;
  if (isAssignedToUser(row?.assignedToRaw, user)) return true;
  if (isAssignedToUser(getExtrovisAssignedToUserValue(row), user)) return true;
  // Live pending/{activity} merge — only when the pending task is assigned to this user.
  if (row?.techSupportMyTaskItem) {
    const fromTask = row.techSupportMyTaskItem._current_assigned_to
      || row.techSupportMyTaskItem.AssignedTo
      || row.techSupportMyTaskItem._assigned_to;
    if (isAssignedToUser(fromTask, user)) return true;
  }
  return false;
}

/**
 * Refex / Extrovis My Tasks — step-split owned work when applicable.
 */
export function matchesRefexMyTaskRow(row, user) {
  if (!row || !user) return false;
  if (!normalizeText(row?.id)) return false;
  if (isExtrovisServiceDashboardContext()) {
    return matchesExtrovisMyTaskRow(row, user);
  }
  if (isRefexServiceDashboardContext()) {
    return matchesRefexSplitMyTaskRow(row, user);
  }
  if (!hasCurrentActiveWorkflowTask(row)) return false;
  return isCurrentActiveTaskAssignedToUser(row, user);
}

/** Resolve activity_instance_id from current step → StepField column → in-progress `_id`. */
export function resolveCurrentActivityInstanceIdFromReport(rowOrItem) {
  const item = rowOrItem?.raw ?? rowOrItem;
  return pickSrOpenActivityInstanceIdFromReport(item)
    || pickActivityInstanceId(item)
    || '';
}

/** Current active workflow task is assigned to the signed-in user (email-first). */
export function isCurrentActiveTaskAssignedToUser(row, user) {
  if (!row || !user) return false;
  if (row?.techSupportTaskOwnedByUser || row?.employeeTaskOwnedByUser) return true;
  return isAssignedToUser(getCurrentTaskAssigneeList(row), user);
}

export function isDependencyAssigneeStep(rowOrItem) {
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  if (step.includes('dependency assigne')) return true;
  const col = getActiveServiceCol()?.dependencyAssigneeActivity;
  return isBlankWorkflowStep(step) && hasStepFieldInProgress(rowOrItem, col);
}

export function isTechSupportAfterDependencyStep(rowOrItem) {
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  if (step.includes('tech support after dependency')) return true;
  const col = getActiveServiceCol()?.techSupportAfterDependencyActivity;
  return isBlankWorkflowStep(step) && hasStepFieldInProgress(rowOrItem, col);
}

/** IT Tech Support, Dependency Assignee, or IT Tech Support After Dependency. */
export function isRefexAgentAssignableWorkStep(rowOrItem) {
  return isITAgentStep(rowOrItem)
    || isDependencyAssigneeStep(rowOrItem)
    || isTechSupportAfterDependencyStep(rowOrItem);
}

export function isRefexAgentWorkStep(rowOrItem) {
  return isRefexAgentAssignableWorkStep(rowOrItem);
}

function stringifyKfValue(val) {
  if (val == null) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val).trim();
  }
  if (Array.isArray(val)) {
    const parts = val.map(stringifyKfValue).filter(Boolean);
    return parts.length ? parts.join(', ') : '';
  }
  if (typeof val === 'object') {
    if (val.Name != null) return String(val.Name).trim();
    if (val._name != null) return String(val._name).trim();
    if (val.label != null) return String(val.label).trim();
    if (val.value != null) return stringifyKfValue(val.value);
  }
  return '';
}

function getItemValue(item, fieldKeys) {
  if (!item || !fieldKeys?.length) return undefined;
  const sources = [item, item?.Data, item?.data].filter(Boolean);

  for (const src of sources) {
    for (const key of fieldKeys) {
      const v = src[key];
      if (v !== undefined && v !== null && v !== '') return v;
    }

    const lowerKeys = new Set(fieldKeys.map((k) => String(k).toLowerCase()));
    for (const [k, v] of Object.entries(src)) {
      if (v !== undefined && v !== null && v !== '' && lowerKeys.has(String(k).toLowerCase())) {
        return v;
      }
    }
  }

  return undefined;
}

function mapFieldText(item, fieldKeys) {
  const text = stringifyKfValue(getItemValue(item, fieldKeys));
  return text || '—';
}

/** Weak / placeholder ticket-type labels — prefer a concrete sibling field when present. */
function isWeakTicketTypeLabel(value) {
  const token = normalizeText(value).toLowerCase().replace(/[\s_-]+/g, '');
  return !token || token === '—' || token === 'other' || token === 'others' || token === 'na' || token === 'n/a';
}

/** Infer Request Type from Request ID codes: IT-IC-… → Incident, IT-SR-… → Service Request. */
export function inferTicketTypeFromRequestId(requestId) {
  const token = normalizeText(requestId).toUpperCase();
  if (!token || token === '—') return '';
  // Patterns: IT-IC-Refex-FY026-000169, IC-Refex-…, /IC/, _IC_
  if (/(^|[-_/])IC([-_/]|$)/.test(token) || token.includes('-IC-')) return 'Incident';
  if (/(^|[-_/])SR([-_/]|$)/.test(token) || token.includes('-SR-')) return 'Service Request';
  if (/(^|[-_/])CR([-_/]|$)/.test(token) || token.includes('-CR-')) return 'Change Request';
  return '';
}

/**
 * Resolve Request Type for MIS — prefer Incident / Service Request over Other.
 * Checks report ticketType, ticketTypeDetail, native Ticket_Type, then Request ID codes.
 */
export function resolveServiceTicketTypeText(itemOrRow) {
  if (!itemOrRow) return '—';
  const raw = itemOrRow?.raw ?? itemOrRow;
  const serviceCol = getActiveServiceCol() || {};
  const keyLists = [
    FIELD.ticketType,
    FIELD.ticketTypeDetail,
    withNativeFieldKeys(serviceCol.ticketTypeDetail, 'Ticket_Type', 'Request_Type'),
    ['ticketType', 'requestType', 'changeType'],
  ];
  const candidates = [];
  const seen = new Set();
  keyLists.forEach((keys) => {
    if (!keys?.length) return;
    const text = stringifyKfValue(getItemValue(raw, keys))
      || stringifyKfValue(getItemValue(itemOrRow, keys));
    const label = normalizeText(text);
    if (!label || label === '—' || seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    candidates.push(label);
  });
  // Also accept already-mapped row fields (detail expand / hydrated rows).
  ['ticketType', 'ticketTypeDetail', 'requestType', 'changeType'].forEach((key) => {
    const label = normalizeText(itemOrRow?.[key]);
    if (!label || label === '—' || seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    candidates.push(label);
  });
  const preferred = candidates.find((label) => !isWeakTicketTypeLabel(label));
  if (preferred) return preferred;

  const fromId = inferTicketTypeFromRequestId(
    itemOrRow?.requestId
    || resolveDisplayRequestId(itemOrRow, itemOrRow?.id || raw?._id)
    || raw?.Request_ID,
  );
  if (fromId) return fromId;

  return candidates[0] || '—';
}

function mapServiceSourceText(item) {
  const serviceCol = getActiveServiceCol() || {};
  const text = mapFieldText(item, FIELD.source);
  if (text && text !== '—') return text;
  const fallback = mapFieldText(
    item,
    withNativeFieldKeys(serviceCol.entitySource, 'Source', 'Channel', 'Raised_By', 'Entity_Source'),
  );
  return (fallback && fallback !== '—') ? fallback : (text || '—');
}

export const ITEM_STATUS_WAITING_LABEL = 'Waiting for IT Agent Approval';
export const ITEM_STATUS_ASSIGNED_TECH_SUPPORT_LABEL = 'Assigned to Tech Support';

export function formatItemStatusDisplay(raw, { entityKey = '' } = {}) {
  const text = stringifyKfValue(raw);
  if (!text || text.toLowerCase() === 'not picked yet') {
    return usesRefexServiceWorkflow(entityKey)
      ? ITEM_STATUS_ASSIGNED_TECH_SUPPORT_LABEL
      : ITEM_STATUS_WAITING_LABEL;
  }
  const token = getCanonicalAgentItemStatusToken(text);
  if (token === 'resolved') return 'Resolved';
  return text;
}

function mergeITItemWithReport(item, reportItem) {
  if (!reportItem) return item;
  if (!item) return reportItem;

  const merged = { ...reportItem, ...item };
  for (const keys of Object.values(FIELD)) {
    for (const key of keys) {
      const itemVal = item[key];
      const reportVal = reportItem[key];
      if (
        (itemVal === undefined || itemVal === null || itemVal === '')
        && reportVal !== undefined
        && reportVal !== null
        && reportVal !== ''
      ) {
        merged[key] = reportVal;
      }
    }
  }
  return merged;
}

export function normalizeStatusKey(statusLike) {
  const s = normalizeText(statusLike).toLowerCase().replace(/\s+/g, '');
  if (s === 'inprogress') return 'InProgress';
  if (s === 'open') return 'InProgress';
  // Statu_1 / Validation "Closed" is NOT Kissflow process Completed.
  if (s === 'completed' || s === 'complete') return 'Completed';
  if (s === 'reopened') return 'Reopened';
  if (s === 'draft') return 'Draft';
  return normalizeText(statusLike) || 'InProgress';
}

export function matchesStatusTab(row, tabKey) {
  const key = normalizeStatusKey(row?.status);
  if (tabKey === 'InProgress') return key === 'InProgress';
  if (tabKey === 'Completed') return key === 'Completed';
  return true;
}

function normalizeEmployeeItemStatusToken(raw) {
  return normalizeText(raw).toLowerCase().replace(/[\s_-]+/g, '');
}

/** Map Item_Status_1 to employee dashboard tab bucket. */
export function getEmployeeItemStatusBucket(row) {
  const token = normalizeEmployeeItemStatusToken(
    getRawItemStatus(row) || row?.itemStatusRaw || row?.itemStatus,
  );

  if (token === 'open' || token === 'notpickedyet' || token === 'waitingforitagentapproval') {
    return 'Open';
  }

  if (token === '') {
    if (isEntityScopedDashboardProfile()) return 'Resolved';
    return 'Open';
  }

  if (token === 'cancelled' || token === 'canceled') {
    return 'Cancelled';
  }

  if (token === 'resolved' || token === 'closed' || token === 'completed') {
    return 'Resolved';
  }

  const canonical = getCanonicalAgentItemStatusToken(
    getRawItemStatus(row) || row?.itemStatusRaw || row?.itemStatus,
  );
  if (canonical === 'onhold' || canonical === 'pendinguserresponse') {
    return 'Hold';
  }

  return 'InProgress';
}

export function normalizeEmployeeRowForEntityProfile(row) {
  if (!row || !isEntityScopedDashboardProfile()) return row;
  const rawStatus = normalizeText(getRawItemStatus(row));
  if (rawStatus) return row;
  return {
    ...row,
    itemStatusRaw: 'Resolved',
    itemStatus: 'Resolved',
  };
}

export function matchesEmployeeStatusTab(row, tabKey) {
  if (tabKey === 'All' || tabKey === 'AllTickets') return true;
  const bucket = getEmployeeItemStatusBucket(row);
  // Refex hides Open tab — auto-assigned / not-yet-picked tickets still use Open status.
  if (usesRefexServiceWorkflow() && tabKey === 'InProgress') {
    return bucket === 'InProgress' || bucket === 'Open';
  }
  return bucket === tabKey;
}

/** Normalize entity label from service / CR report rows. */
export function normalizeEntityKey(row) {
  const raw = normalizeText(row?.entity);
  const token = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (!token) return '';
  if (token.includes('venwind')) return 'Venwind';
  if (token.includes('modepro')) return 'ModePro';
  if (token.includes('pharmapack') || (token.includes('pharma') && token.includes('pack'))) return 'PharmaPack';
  if (token.includes('kavispharma') || token.includes('kavis')) return 'Kavis';
  if (token.includes('extrovis')) return 'Extrovis';
  if (token.includes('refex')) return 'Refex';
  // Broad Pharma fallback (legacy labels).
  if (token.includes('pharma')) return 'PharmaPack';
  return raw;
}

export function rowLooksLikeVenwind(row) {
  if (!row) return false;
  const parts = [
    row.companyName,
    row.company,
    row.entity,
    row.requestId,
  ];
  const raw = row.raw;
  if (raw) {
    parts.push(extractRefexCompanyNameFromItem(raw));
    parts.push(stringifyKfValue(getItemValue(raw, FIELD.entity)));
    parts.push(stringifyKfValue(getItemValue(raw, FIELD.entitySelect)));
  }
  return parts.some((value) => normalizeCompanyFilterToken(value).includes('venwind'));
}

export function matchesFinalLevelEntityTab(row, entityTab) {
  if (!entityTab) return false;

  const normalizedTab = normalizeEntityKey({ entity: entityTab }) || normalizeText(entityTab);

  // Venwind — Refex process filtered by company / entity / request id.
  if (normalizedTab === 'Venwind') {
    return rowLooksLikeVenwind(row);
  }

  // Dedicated Refex process report — exclude Venwind (own entity tab).
  if (normalizedTab === 'Refex') {
    if (rowLooksLikeVenwind(row)) return false;
    const key = normalizeEntityKey(row);
    if (key && isExtrovisReportEntity(key)) return false;
    return true;
  }

  const kind = row?.queueType === 'change' ? 'cr' : 'service';
  const key = normalizeEntityKey(row) || resolveDashboardEntityKey(row, { kind });

  // Extrovis All_tickets (+ CR Extrovis report) — filter by Entity column.
  if (isExtrovisReportEntity(entityTab)) {
    if (key) return key === normalizedTab;
    // Blank Entity → show under Extrovis only.
    return normalizedTab === 'Extrovis';
  }

  if (key) return key === normalizedTab;
  if (normalizedTab === 'Refex' || normalizedTab === 'Extrovis') return true;
  return false;
}

export function applyFinalLevelEntityFilter(rows, entityTab) {
  if (!entityTab) return [];
  return (rows || []).filter((row) => matchesFinalLevelEntityTab(row, entityTab));
}

export function parseRequestIdSequence(requestId) {
  const raw = String(requestId ?? '').trim();
  if (!raw || raw === '—') return null;
  const match = raw.match(/(\d+)\s*$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Kissflow instance id fragments like BLbcD57I — never show these as Request ID. */
export function looksLikeKissflowInstanceId(value, instanceId = '') {
  const token = String(value ?? '').trim();
  if (!token || token === '—') return true;
  const id = String(instanceId ?? '').trim();
  if (id) {
    if (token === id || token === id.slice(-8) || id.endsWith(token)) return true;
  }
  // Kissflow _id tails like BLbcD57I — mixed-case alphanumeric, typically 8 chars.
  return token.length === 8
    && /^[A-Za-z0-9]{8}$/.test(token)
    && /[A-Z]/.test(token)
    && /[a-z]/.test(token)
    && /\d/.test(token);
}

/** Human Request ID from report/native fields — skips Kissflow _id junk. */
export function resolveDisplayRequestId(rowOrItem, instanceId = '') {
  const raw = rowOrItem?.raw ?? rowOrItem;
  const id = instanceId || rowOrItem?.id || raw?._id || '';
  const serviceCol = getActiveServiceCol() || {};
  const candidates = [
    rowOrItem?.requestId,
    getItemValue(raw, FIELD.requestId),
    getItemValue(raw, [serviceCol.requestId, 'Request_ID', 'request_id', 'RequestId']),
    raw?.[serviceCol.requestId],
    raw?.Request_ID,
    raw?.request_id,
    raw?.Column_0jda6rzCc3,
    raw?.Column_y4srngcUo1,
  ];
  for (const value of candidates) {
    const token = normalizeText(value);
    if (!looksLikeKissflowInstanceId(token, id)) return token;
  }
  return '';
}

function getDashboardRowCreatedMs(row) {
  const rawItem = row?.raw ?? row;
  const raw = row?.createdAtRaw
    || row?.requestedDateTimeRaw
    || row?.requestedDate
    || rawItem?._created_at
    || 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** FCFS sort — ticket sequence ascending by default, created date as fallback. */
export function sortDashboardRowsByTicketOrder(rows, order = 'asc') {
  const dir = order === 'desc' ? -1 : 1;
  return [...(rows || [])].sort((a, b) => {
    const sa = parseRequestIdSequence(a?.requestId);
    const sb = parseRequestIdSequence(b?.requestId);
    if (sa != null && sb != null && sa !== sb) return (sa - sb) * dir;
    if (sa != null && sb == null) return -1 * dir;
    if (sa == null && sb != null) return 1 * dir;
    const ta = getDashboardRowCreatedMs(a);
    const tb = getDashboardRowCreatedMs(b);
    return (ta - tb) * dir;
  });
}

/** Created-date sort — newest first by default. Used by Extrovis / Non-Refex MIS tables. */
export function sortDashboardRowsByCreatedDate(rows, order = 'desc') {
  const dir = order === 'asc' ? 1 : -1;
  return [...(rows || [])].sort((a, b) => {
    const ta = getDashboardRowCreatedMs(a);
    const tb = getDashboardRowCreatedMs(b);
    if (ta !== tb) return (ta - tb) * dir;
    const sa = parseRequestIdSequence(a?.requestId);
    const sb = parseRequestIdSequence(b?.requestId);
    if (sa != null && sb != null && sa !== sb) return (sa - sb) * dir;
    return 0;
  });
}

export function sortDashboardRowsByNewest(rows) {
  if (isExtrovisServiceDashboardContext()) {
    return sortDashboardRowsByCreatedDate(rows, 'desc');
  }
  return sortDashboardRowsByTicketOrder(rows, 'desc');
}

/** MIS table order: Extrovis newest-created first; Refex stays FCFS request-id. */
export function sortMisTableRows(rows, sortOrder = 'asc', entityTab = '') {
  if (isExtrovisServiceDashboardContext(entityTab)) {
    return sortDashboardRowsByCreatedDate(rows, 'desc');
  }
  return sortDashboardRowsByTicketOrder(rows, sortOrder);
}

export function applyEmployeeFilters(rows, {
  search = '',
  statusTab = 'Open',
  category = '',
  criticality = '',
  entity = '',
  ticketType = '',
  categoryField = 'category',
} = {}) {
  let list = rows.filter((row) => matchesEmployeeStatusTab(row, statusTab));
  list = applyMisColumnFilters(list, {
    category, criticality, entity, ticketType, categoryField,
  });
  list = sortDashboardRowsByNewest(list);
  const q = normalizeText(search).toLowerCase();
  if (!q) return list;
  return list.filter((row) =>
    [row.requestId, row.summary, row.ticketType, row.category, row.subCategory, row.itemStatus, row.assignedTo, row.statusLabel, row.name, row.requesterName]
      .some((v) => String(v || '').toLowerCase().includes(q)),
  );
}

export function getRawItemStatus(itemOrRow) {
  if (!itemOrRow) return '';
  if (itemOrRow.itemStatusRaw != null && itemOrRow.itemStatusRaw !== '') {
    return normalizeText(itemOrRow.itemStatusRaw);
  }
  const serviceCol = getActiveServiceCol();
  return stringifyKfValue(
    itemOrRow?.[serviceCol.itemStatus]
    ?? itemOrRow?.[serviceCol.status]
    ?? itemOrRow?.[serviceCol.systemStatus]
    ?? getItemValue(itemOrRow, FIELD.itemStatus),
  );
}

/** Agent tabs — legacy workflow-status filter (manager/admin). */
export function matchesAgentStatusTab(row, tabKey) {
  return matchesAgentServiceTab(row, tabKey, null);
}

function normalizeAgentItemStatusToken(raw) {
  return normalizeText(raw).toLowerCase().replace(/[\s_-]+/g, '');
}

/** Map Kissflow Item_Status labels to canonical tokens for filters/forms. */
export function getCanonicalAgentItemStatusToken(raw) {
  const token = normalizeAgentItemStatusToken(raw);
  if (token === 'hold') return 'onhold';
  if (token === 'canceled') return 'cancelled';
  if (token === 'completed' || token === 'closed') return 'resolved';
  if (
    token === 'pendingwithuser'
    || token === 'pendingnotesfromuser'
    || token === 'pendingforuser'
    || token === 'pendinguserresponse'
  ) {
    return 'pendinguserresponse';
  }
  return token;
}

function isAgentItemStatusOpen(row) {
  const token = normalizeAgentItemStatusToken(getRawItemStatus(row));
  return token === 'open' || token === 'notpickedyet' || token === 'waitingforitagentapproval' || token === '';
}

function isAgentItemStatusInProgress(row) {
  const token = getCanonicalAgentItemStatusToken(getRawItemStatus(row));
  return token === 'inprogress' || token === 'picked';
}

function isAgentItemStatusOnHold(row) {
  return getCanonicalAgentItemStatusToken(getRawItemStatus(row)) === 'onhold';
}

function isAgentItemStatusPendingUser(row) {
  return getCanonicalAgentItemStatusToken(getRawItemStatus(row)) === 'pendinguserresponse';
}

function isAgentItemStatusCancelled(row) {
  const token = getCanonicalAgentItemStatusToken(getRawItemStatus(row));
  return token === 'cancelled';
}

function isAgentItemStatusResolved(row) {
  return getCanonicalAgentItemStatusToken(getRawItemStatus(row)) === 'resolved';
}

/** Refex auto-assign — active agent work may remain Open until the agent picks it up. */
function isRefexAgentActiveItemStatus(row) {
  return isAgentItemStatusInProgress(row) || isAgentItemStatusOpen(row);
}

function resolveAgentPoolRoleToken(row) {
  if (activeDashboardProfile?.id === 'extrovis') return 'it agents extrovis';
  if (activeDashboardProfile?.id === 'refex') return 'it agent refex';
  const entity = normalizeText(row?.entity || resolveServiceItemEntityKey(row?.raw ?? row)).toLowerCase();
  if (entity === 'extrovis') return 'it agents extrovis';
  if (entity === 'refex') return 'it agent refex';
  return 'it agents';
}

function isAgentPoolAssignment(row) {
  const assigned = normalizeAssigneeList(
    row?.assignedToRaw ?? row?.raw?.[getActiveServiceCol().assignedTo],
  );
  if (!assigned.length) return false;
  const poolToken = resolveAgentPoolRoleToken(row);
  return assigned.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const kind = normalizeText(entry.Kind).toLowerCase();
    const name = normalizeText(entry.Name).toLowerCase();
    return kind === 'approle' && name.includes(poolToken);
  });
}

export function isAgentTicketAssignedToUser(row, user) {
  if (!user) return true;
  const assigned = row?.assignedToRaw;
  if (isAssignedToUser(assigned, user)) return true;
  if (isCurrentActiveTaskAssignedToUser(row, user)) return true;
  const userEmail = normalizeEmail(user?.Email);
  const assignedLabel = normalizeText(row?.assignedTo).toLowerCase();
  if (userEmail && assignedLabel.includes(userEmail)) return true;
  const name = normalizeText(user?.Name).toLowerCase();
  return !!name && assignedLabel.includes(name);
}

/** Resolved/cancelled service tickets owned by the signed-in IT Agent (assignee or terminal actor). */
export function isAgentServiceTicketOwnedByUser(row, user) {
  if (!row || !user) return false;
  if (isAgentTicketAssignedToUser(row, user)) return true;
  if (isAssignedToUser(row?.assignedToRaw, user)) return true;

  const userId = normalizeText(user?._id || user?.Id);
  const email = normalizeEmail(user?.Email);
  const name = normalizeText(user?.Name).toLowerCase();

  if (userId && normalizeText(row?.modifiedById) === userId) return true;
  if (email && normalizeEmail(row?.modifiedByEmail) === email) return true;

  const terminalActors = [
    row?.completedBy,
    row?.cancelledBy,
    row?.modifiedBy,
  ].map((value) => normalizeText(value).toLowerCase()).filter(Boolean);

  return !!name && terminalActors.some((actor) => actor.includes(name) || name.includes(actor));
}

/**
 * Live IT Tech Reopen hold only — form open on row click.
 * Step Completed / process Completed → false (no form).
 */
export function isLiveItTechReopenFormStep(row) {
  if (!row) return false;
  if (isRefexServiceProcessCompleted(row)) return false;

  const step = normalizeText(getCurrentStepValue(row) || row?.currentStep || row?.activeWorkflowStep);
  const stepLower = step.toLowerCase();
  if (
    stepLower === 'completed'
    || stepLower === 'complete'
    || stepLower === 'closed'
    || stepLower.includes('end event')
  ) {
    return false;
  }
  // Refex IT Tech Reopen + Extrovis ReOpen Window (blank step uses StepField).
  return isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row);
}

/** Show service Edit icon — actionable from any KPI/tab when the user can work the live step. */
export function canShowServiceRecordEditIcon(row, user, { dashboard = 'agent', tabKey = '' } = {}) {
  if (!row || !user) return false;
  void tabKey;

  if (isLiveItTechReopenFormStep(row) && normalizeText(row?.id)) {
    if (
      dashboard === 'employee'
      || dashboard === 'agent'
      || dashboard === 'approver'
      || dashboard === 'admin'
      || dashboard === 'manager'
    ) {
      return true;
    }
  }

  if (dashboard === 'employee') {
    return false;
  }

  // Extrovis: pending/{activity} (PickUp / Solution / Dependency / ReOpen Window)
  // is the clickable source of truth — do not block on Refex liveApproval flags or Statu_1.
  if (isExtrovisServiceDashboardContext() && normalizeText(row?.id)) {
    if (row?.techSupportMyTaskItem || row?.employeeMyTaskItem) return true;
    if (matchesOpenPickupTicketRow(row, user)) return true;
    if (matchesRefexMyTaskRow(row, user)) return true;
    return false;
  }

  if (dashboard === 'admin' || dashboard === 'manager') {
    if (usesRefexServiceWorkflow()) {
      if (!normalizeText(row?.id)) return false;
      if (matchesOpenPickupTicketRow(row, user)) return true;
      if (matchesRefexMyTaskRow(row, user)) return true;
      if (
        matchesRefexApproverPendingTaskRow(row, user, 'me', 'first')
        || matchesRefexApproverPendingTaskRow(row, user, 'me', 'final')
      ) {
        return row.liveApprovalPendingKnown !== true || row.isLiveApprovalPending === true;
      }
    }
    return isAgentTicketAssignedToUser(row, user) || isAssignedToUser(row?.assignedToRaw, user);
  }

  if (dashboard === 'agent') {
    if (usesRefexServiceWorkflow()) {
      const instanceId = normalizeText(row?.id);
      if (!instanceId) return false;
      if (matchesOpenPickupTicketRow(row, user)) return true;
      if (matchesRefexMyTaskRow(row, user)) return true;
      if (row?.techSupportMyTaskItem && isCurrentActiveTaskAssignedToUser(row, user)) return true;
      return false;
    }
    if (!isAgentTicketAssignedToUser(row, user)) return false;
    return isITAgentStep(row) && !isAgentItemStatusResolved(row) && !isAgentItemStatusCancelled(row);
  }

  if (dashboard === 'approver') {
    if (usesRefexServiceWorkflow()) {
      if (!normalizeText(row?.id)) return false;
      if (
        matchesRefexApproverPendingTaskRow(row, user, 'me', 'first')
        || matchesRefexApproverPendingTaskRow(row, user, 'me', 'final')
      ) {
        if (row.liveApprovalPendingKnown === true && !row.isLiveApprovalPending) {
          return false;
        }
        return true;
      }
      if (matchesOpenPickupTicketRow(row, user)) return true;
      if (matchesRefexMyTaskRow(row, user)) {
        return !isAgentItemStatusResolved(row) && !isAgentItemStatusCancelled(row);
      }
      return false;
    }
    if (!isAgentTicketAssignedToUser(row, user) || !isITAgentStep(row)) return false;
    return !isAgentItemStatusResolved(row) && !isAgentItemStatusCancelled(row);
  }

  return false;
}

/** Show CR Edit icon for agent / admin / manager dashboards. */
export function canShowCrRecordEditIcon(row, user, { dashboard = 'agent', tabKey = '', liveCrIds = null } = {}) {
  if (!row || !user) return false;
  if (dashboard === 'agent') {
    return canEditCrImplementationRow(row, tabKey, liveCrIds, user);
  }
  if (dashboard === 'admin' || dashboard === 'manager') {
    return tabKey !== 'Completed' && isAssignedToUser(row?.assignedToRaw, user);
  }
  return false;
}

const FIRST_LEVEL_CR_SELF_APPROVE_USER_NAMES = new Set(['balaraju ilaiveni']);

function isFirstLevelSelfApproveCrCreator(user, userName) {
  const name = normalizeText(userName || user?.Name).toLowerCase();
  return FIRST_LEVEL_CR_SELF_APPROVE_USER_NAMES.has(name);
}

function isSelfRaisedCrRow(row, user, userName) {
  const selfName = normalizeText(userName || user?.Name).toLowerCase();
  const requester = normalizeText(row?.requesterName || row?.createdBy).toLowerCase();
  if (selfName && requester && requester === selfName) return true;
  const selfEmail = normalizeEmail(user?.Email);
  const requesterEmail = normalizeEmail(row?.requesterEmail || row?.createdByEmail);
  return Boolean(selfEmail && requesterEmail && selfEmail === requesterEmail);
}

/** Show CR Edit icon on first/final approver dashboards when approval action is permitted. */
export function canShowCrApproverEditIcon(row, user, {
  role = 'first',
  tabKey = '',
  approverStep = '',
  liveInstanceIds = null,
  userName = '',
} = {}) {
  if (!row || !user || !approverStep) return false;

  if (role === 'first' && tabKey === 'Implementation') {
    return isFirstLevelSelfApproveCrCreator(user, userName)
      && isSelfRaisedCrRow(row, user, userName)
      && matchesFirstLevelApproverTab(row, 'Implementation', user, liveInstanceIds);
  }

  if (tabKey !== 'PendingTask') return false;
  return isMyCrApproverPendingItem(row, user, approverStep, liveInstanceIds);
}

export function hasAgentUsedHold(row) {
  const value = normalizeText(row?.holdReason);
  return !!value && value !== '—';
}

export function hasAgentUsedPendingUser(row) {
  const value = normalizeText(row?.pendingReason);
  return !!value && value !== '—';
}

function isOnHoldStatusLabel(label) {
  return getCanonicalAgentItemStatusToken(label) === 'onhold';
}

function isPendingUserStatusLabel(label) {
  return getCanonicalAgentItemStatusToken(label) === 'pendinguserresponse';
}

/** Refex Tech Support — Employee Feedback tab / IT Tech Reopen (48h) step. */
export function isEmployeeApprovalRefexStep(row) {
  if (!row) return false;

  // Live pending/{reopen} stamp — authoritative Me Closed reopen hold.
  if (row.isLiveReopenPending === true) return true;

  // Process Completed is never a live Reopen Window (SLA / Open status).
  const raw = row?.raw ?? row;
  const systemStatus = normalizeText(
    row?.systemStatus || row?.workflowStatus || raw?._status,
  ).toLowerCase().replace(/[\s_-]+/g, '');
  if (
    row.isProcessCompleted === true
    || systemStatus === 'completed'
    || systemStatus === 'complete'
    || systemStatus === 'withdrawn'
  ) {
    return false;
  }

  const step = normalizeText(getCurrentStepValue(row) || row?.currentStep);
  const stepLower = step.toLowerCase();
  // Live PickUp / Solution / Tech Support is never the reopen hold — even if
  // lastCompletedStep or a leftover ReOpen Window activity id is still on the report.
  if (
    stepLower.includes('it agent pickup')
    || stepLower.includes('it agent pick up')
    || stepLower.includes('it agent solution')
    || (stepLower.includes('tech support') && !stepLower.includes('reopen'))
    || stepLower === 'it tech'
    || stepLower.includes('dependency')
  ) {
    return false;
  }

  if (
    step === EMPLOYEE_APPROVAL_REFEX_STEP
    || step === EMPLOYEE_FEEDBACK_REFEX_STEP
    || step === IT_TECH_REOPEN_REFEX_STEP
    || stepLower === 'employee feedback'
    || stepLower.includes('employee feedback')
    || stepLower.includes('employee verification')
    || stepLower === 'it tech reopen'
    || stepLower.includes('it tech reopen')
    || stepLower === 'ticket reopen'
    || (stepLower.includes('ticket reopen') && !stepLower.includes('reopened'))
    || stepLower === 'reopen window'
    || stepLower.includes('reopen window')
  ) {
    return true;
  }

  const liveAct = getLiveWorkflowActivityId(row);
  if (
    liveAct === REFEX_IT_TECH_REOPEN_ACTIVITY_ID
    || liveAct === EXTROVIS_EMPLOYEE_FEEDBACK_ACTIVITY_ID
  ) {
    return true;
  }

  // StepField fallback only when Current step is blank — never override PickUp/Solution.
  if (!isBlankWorkflowStep(step)) return false;
  if (inferLiveWorkStepFromStepFields(row)) return false;

  const serviceCol = getActiveServiceCol();
  return Boolean(
    pickSrInProgressActivityFromColumn(raw, serviceCol.itTechReopenActivity)
    || pickSrInProgressActivityFromColumn(raw, serviceCol.employeeApprovalRefex)
    || pickSrInProgressActivityFromColumn(raw, serviceCol.employeeApprovalRefexLegacy)
    || pickSrInProgressActivityFromColumn(raw, serviceCol.itTechReopenActivityLegacy),
  );
}

/** Alias — IT Tech Reopen is the post-work hold step (replaces Employee Feedback). */
export function isITTechReopenStep(row) {
  return isEmployeeApprovalRefexStep(row);
}

function isRefexServiceReopenedTicket(row) {
  if (row?.reopenedTicket === true) return true;
  const statusKey = normalizeStatusKey(row?.status);
  if (statusKey === 'Reopened') return true;
  const token = getCanonicalAgentItemStatusToken(getRawItemStatus(row) || row?.itemStatusRaw || row?.itemStatus);
  return token === 'reopened';
}

/** Public helper for Reopened row tags / filters. */
export function isServiceReopenedTicket(row) {
  return isRefexServiceReopenedTicket(row);
}

/** Former Reopened KPI rows that should appear under Open (Refex) or My Tickets (Extrovis). */
function matchesMergedReopenedWorkRow(row, user) {
  if (!isRefexServiceReopenedTicket(row)) return false;
  if (isRefexServiceClosedTicket(row) || isEmployeeApprovalRefexStep(row)) return false;
  if (isRefexServiceRejectedTicket(row) || isAgentItemStatusCancelled(row)) return false;
  const mine = isAgentTicketAssignedToUser(row, user);
  const handled = isRefexTechSupportTicketHandledByUser(row, user);
  const hasMyTask = Boolean(row?.techSupportMyTaskItem);
  return mine || handled || hasMyTask || isLiveBucketPendingRow(row);
}

function personMatchesUser(nameValue, user) {
  if (!user || !nameValue) return false;
  const userId = normalizeText(user?._id || user?.Id);
  const email = normalizeEmail(user?.Email);
  const name = normalizeText(user?.Name).toLowerCase();
  if (typeof nameValue === 'object' && !Array.isArray(nameValue)) {
    const objId = normalizeText(nameValue?._id || nameValue?.Id);
    const objEmail = normalizeEmail(nameValue?.Email || nameValue?.email);
    const objName = normalizeText(nameValue?.Name || nameValue?.name).toLowerCase();
    if (userId && objId && userId === objId) return true;
    if (email && objEmail && email === objEmail) return true;
    if (name && objName && (objName.includes(name) || name.includes(objName))) return true;
    return false;
  }
  if (Array.isArray(nameValue)) {
    return nameValue.some((entry) => personMatchesUser(entry, user));
  }
  const token = normalizeText(nameValue).toLowerCase();
  if (!token) return false;
  if (name && (token.includes(name) || name.includes(token))) return true;
  if (email && token.includes(email)) return true;
  return false;
}

/**
 * System / automation / ITSM BOT actors — not the human who solved the ticket.
 * 48h auto-closure stamps Completed as closed by ITSM BOT.
 */
export function isItsmBotOrSystemActor(value) {
  if (!value) return false;
  const token = normalizeText(
    typeof value === 'object' && !Array.isArray(value)
      ? (value?.Name || value?.name || value?.Email || value?.email || '')
      : (Array.isArray(value) ? value.map((entry) => (
        typeof entry === 'object'
          ? (entry?.Name || entry?.name || entry?.Email || '')
          : entry
      )).filter(Boolean).join(', ') : value),
  ).toLowerCase().replace(/[\s_-]+/g, '');
  if (!token) return false;
  return token.includes('itsmbot')
    || token === 'bot'
    || token.endsWith('bot')
    || token.includes('system')
    || token.includes('automation')
    || token.includes('kissflow')
    || token.includes('autocomplet')
    || token.includes('autoclos')
    || token.includes('autoclose');
}

/**
 * Who actually solved the ticket (tech-support / solution author).
 * Skips ITSM BOT and other system actors from 48h auto-closure.
 * Prefers Solution / Tech Support / Dependency steps over PickUp pool assignees.
 */
function normalizeAgentStepName(step = '') {
  return String(step || '').trim().toLowerCase();
}

function isPickupPoolAgentStep(step = '') {
  const s = normalizeAgentStepName(step);
  return s.includes('pickup')
    || s.includes('pick up')
    || s === 'it tech'
    || s === 'open ticket'
    || s === 'it agent pickup';
}

function isSolverWorkAgentStep(step = '') {
  const s = normalizeAgentStepName(step);
  if (!s || isPickupPoolAgentStep(step)) return false;
  return s.includes('tech support')
    || s.includes('solution')
    || s.includes('dependency')
    || s.includes('after dependency')
    || s.includes('it agent extrovis');
}

function pickLatestHumanActivityActor(activities = [], { stepFilter = null } = {}) {
  let latestActor = null;
  let latestTs = -1;
  (activities || []).forEach((entry) => {
    if (typeof stepFilter === 'function' && !stepFilter(entry?.step)) return;
    const actor = entry?.actedBy || entry?.assignedTo;
    if (!actor || isItsmBotOrSystemActor(actor)) return;
    const ts = entry?.actedAt ? new Date(entry.actedAt).getTime() : 0;
    const safeTs = Number.isFinite(ts) ? ts : 0;
    if (safeTs >= latestTs) {
      latestTs = safeTs;
      latestActor = actor;
    }
  });
  return latestActor;
}

function isClosedTicketForSolver(row) {
  if (!row) return false;
  if (isRefexServiceProcessCompleted(row) || isRefexServiceClosedTicket(row)) return true;
  const raw = row?.raw ?? row;
  const statusToken = normalizeText(row?.status ?? row?.systemStatus ?? raw?._status)
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  return statusToken === 'completed' || statusToken === 'complete' || statusToken === 'withdrawn';
}

export function pickLatestTicketSolver(row) {
  if (!row) return null;

  const activities = row?.itAgentActivities || [];
  const fromSolverSteps = pickLatestHumanActivityActor(activities, {
    stepFilter: isSolverWorkAgentStep,
  });
  if (fromSolverSteps) return fromSolverSteps;

  const raw = row?.raw ?? row;
  const fromStepFields = resolveItAgentSolverActedBy(raw);
  if (fromStepFields && fromStepFields !== '—' && !isItsmBotOrSystemActor(fromStepFields)) {
    return fromStepFields;
  }

  const fromNonPickup = pickLatestHumanActivityActor(activities, {
    stepFilter: (step) => !isPickupPoolAgentStep(step),
  });
  if (fromNonPickup) return fromNonPickup;

  const solutions = row?.agentSolutions || [];
  for (let i = solutions.length - 1; i >= 0; i -= 1) {
    const name = solutions[i]?.agentName;
    if (name && !isItsmBotOrSystemActor(name)) return name;
  }

  if (row?.closedBy && !isItsmBotOrSystemActor(row.closedBy)) return row.closedBy;
  if (row?.completedBy && !isItsmBotOrSystemActor(row.completedBy)) return row.completedBy;

  const closed = isClosedTicketForSolver(row);
  if (closed) {
    const modifiedBy = formatActedBy(row?.modifiedBy) !== '—'
      ? formatActedBy(row?.modifiedBy)
      : formatActedBy(raw?._modified_by);
    if (modifiedBy && modifiedBy !== '—' && !isItsmBotOrSystemActor(modifiedBy)) {
      return modifiedBy;
    }
  }

  if (!closed) {
    const fromAnyStep = pickLatestHumanActivityActor(activities);
    if (fromAnyStep) return fromAnyStep;
    if (row?.assignedToDisplay && !isItsmBotOrSystemActor(row.assignedToDisplay)) {
      return row.assignedToDisplay;
    }
    if (row?.assignedToUserRaw && !isItsmBotOrSystemActor(row.assignedToUserRaw)) {
      return row.assignedToUserRaw;
    }
  }

  return null;
}

/** True when the ticket was auto-closed (Completed) by ITSM BOT / automation after reopen window. */
export function isAutoClosedByItsmBot(row) {
  if (!row) return false;
  if (!isRefexServiceProcessCompleted(row) && !isRefexServiceClosedTicket(row)) return false;
  const step = normalizeText(row?.currentStep || row?.activeWorkflowStep || row?.raw?._current_step).toLowerCase();
  const atCompleted = step.includes('completed')
    || step.includes('auto clos')
    || step.includes('autoclose')
    || !step;
  if (!atCompleted && isITTechReopenStep(row)) return false;
  return isItsmBotOrSystemActor(row?.closedBy)
    || isItsmBotOrSystemActor(row?.completedBy)
    || isItsmBotOrSystemActor(row?.modifiedBy)
    || isItsmBotOrSystemActor(row?.raw?._modified_by);
}

/**
 * Me Closed ownership — Closed By / solver = signed-in user.
 * Auto-closure (ITSM BOT / 48h): match the human IT Tech who solved it
 * (ActedBy / Assigned To on tech-support steps), not the bot.
 */
export function isTicketClosedByUser(row, user) {
  if (!row || !user) return false;

  if (isRefexServiceRejectedTicket(row)) {
    const raw = row?.raw ?? row;
    const rejector = raw?._modified_by || row?.modifiedBy;
    if (isItsmBotOrSystemActor(rejector)) return false;
    return personMatchesUser(rejector, user);
  }

  const isClosed = isRefexServiceClosedTicket(row)
    || isRefexServiceProcessCompleted(row)
    || isITTechReopenStep(row)
    || isEmployeeApprovalRefexStep(row);
  if (!isClosed) return false;

  // Explicit Closed By when it is a real person (not ITSM BOT).
  if (row?.closedBy && !isItsmBotOrSystemActor(row.closedBy) && personMatchesUser(row.closedBy, user)) {
    return true;
  }

  // myitems/completed is already scoped to the signed-in user (restored Me Closed source).
  if (row?.completedItem) return true;

  // Auto-closure / normal close — match the human IT Tech solver, not Assigned To.
  const solver = pickLatestTicketSolver(row);
  if (solver && personMatchesUser(solver, user)) return true;

  // completedBy when it is a real person (not BOT) and not merely approver modifiedBy.
  if (row?.completedBy && !isItsmBotOrSystemActor(row.completedBy) && personMatchesUser(row.completedBy, user)) {
    if (isItsmBotOrSystemActor(row?.modifiedBy) || isItsmBotOrSystemActor(row?.raw?._modified_by)) {
      return true;
    }
    const completedLabel = normalizeText(row.completedBy).toLowerCase();
    const modifiedLabel = normalizeText(
      typeof row?.modifiedBy === 'object'
        ? (row?.modifiedBy?.Name || row?.modifiedBy?.name || '')
        : row?.modifiedBy,
    ).toLowerCase();
    if (!modifiedLabel || completedLabel !== modifiedLabel) return true;
  }

  return false;
}

/** Live pending task currently in the signed-in user's Kissflow bucket. */
export function isLiveBucketPendingRow(row) {
  if (!row) return false;
  if (row.isLiveBucketPending === true) return true;
  if (row.isLiveReopenPending === true) return true;
  if (row.isLiveApprovalPending === true) return true;
  return false;
}

/** Tech Support handler history — assignee, activity actor, or solution author. */
export function isRefexTechSupportTicketHandledByUser(row, user) {
  if (!row || !user) return false;
  if (isAgentTicketAssignedToUser(row, user)) return true;
  if (row?.techSupportTaskOwnedByUser) return true;

  const activities = row?.itAgentActivities || [];
  for (const entry of activities) {
    if (personMatchesUser(entry?.actedBy, user)) return true;
  }

  const solutions = row?.agentSolutions || [];
  for (const entry of solutions) {
    if (personMatchesUser(entry?.agentName, user)) return true;
  }

  // Agent dashboards map via mapReportRow (no itAgentActivities). After the ticket
  // moves to Employee Feedback, Assigned To is the employee — detect prior agent
  // work from StepField ActedBy / Assigned To User on the report row.
  const raw = row?.raw ?? row;
  const seenCols = new Set();
  for (const columnKey of getAgentWorkStepFieldColumnKeys(raw)) {
    const col = normalizeText(columnKey);
    if (!col || seenCols.has(col)) continue;
    seenCols.add(col);
    for (const entry of pickSrStepFieldEntries(raw, col)) {
      if (stepEntryMatchesUser(entry, user)) return true;
    }
  }

  if (isAssignedToUser(row?.assignedToUserRaw, user)) return true;
  if (isAssignedToUser(getExtrovisAssignedToUserValue(row), user)) return true;
  if (personMatchesUser(row?.completedBy, user)) return true;

  return false;
}

/**
 * Manager / Head already acted on this ticket (approval StepField ActedBy).
 * Needed after the ticket leaves Pending Approval (IT Tech Reopen / Closed) —
 * participated API alone misses many of those rows on Me.
 */
function isRefexApproverTicketHandledByUser(row, user, role = 'first') {
  if (!row || !user) return false;
  const raw = row?.raw ?? row;
  const seen = new Set();
  for (const columnKey of getApproverWorkStepFieldColumnKeys(role)) {
    const col = normalizeText(columnKey);
    if (!col || seen.has(col)) continue;
    seen.add(col);
    for (const entry of pickSrStepFieldEntries(raw, col)) {
      const actedBy = entry?.ActedBy ?? entry?.actedBy ?? entry?.Acted_By;
      if (personMatchesUser(actedBy, user)) return true;
      const status = entry?.Status ?? entry?.status ?? entry?._status;
      if (isTerminalStepActivityStatus(status) && stepEntryMatchesUser(entry, user)) return true;
    }
  }
  return false;
}

function matchesRefexApproverMeHistory(row, user, role = 'first') {
  if (!row || !user) return false;
  if (role !== 'first' && role !== 'final' && role !== 'monitoring') return false;
  return isRefexApproverTicketHandledByUser(row, user, role);
}

/** Agent Me scope — live bucket tasks + tickets closed by the signed-in user. */
export function matchesRefexAgentMeScope(row, user) {
  if (!row || !user) return false;
  if (isLiveBucketPendingRow(row)) return true;
  if (isTicketClosedByUser(row, user)) return true;
  return Boolean(row?.techSupportMyTaskItem);
}

/**
 * Me = signed-in user's own tickets only:
 *  1) Live Open / Pending Approval in their Kissflow bucket
 *  2) Live Reopen in their bucket only (My Task / pending reopen API)
 *  3) Closed they solved (IT Tech ActedBy / Assigned To; BOT auto-close → human solver)
 * My Team = everything else (!Me).
 * @param {'agent'|'first'|'final'|'monitoring'} [role]
 */
export function matchesRefexMeOnlyScope(row, user, { role = 'agent' } = {}) {
  if (!row || !user) return false;

  const reopenHold = Boolean(
    isITTechReopenStep(row)
    || isEmployeeApprovalRefexStep(row),
  );

  if (reopenHold) {
    // Q1: reopen Me = his Kissflow pending/My Task bucket only.
    if (row.liveReopenPendingKnown === true) {
      if (row.isLiveReopenPending === true) return true;
    } else if (row.isLiveReopenPending === true || (
      isLiveBucketPendingRow(row)
      && (row.isLiveReopenPending !== false)
    )) {
      return true;
    }
    // Outside bucket → only if he solved (auto-closure / Completed).
  } else if (isLiveBucketPendingRow(row)) {
    // Open work + Pending Approval in their live bucket.
    return true;
  }

  // Closed / solved by them (BOT auto-close → human IT Tech solver).
  if (isTicketClosedByUser(row, user)) return true;

  // Approver Me pending when bucket stamp is briefly missing after soft refresh.
  if ((role === 'first' || role === 'final')
    && matchesRefexApproverPendingTaskRow(row, user, 'me', role)) {
    return true;
  }

  if (isExtrovisServiceDashboardContext()) {
    if (matchesExtrovisMyTaskRow(row, user)) return true;
    return false;
  }

  // Agent owned my-task stamp (Open / My Tickets) — not reopen (handled above).
  if (!reopenHold && row?.techSupportMyTaskItem && matchesRefexMyTaskRow(row, user)) {
    return true;
  }

  return false;
}

/**
 * Extrovis personal Me — live bucket owned work + closed-by / solver only.
 */
export function matchesExtrovisPersonalMeScope(row, user, { role = 'agent' } = {}) {
  if (!row || !user) return false;
  if (isLiveBucketPendingRow(row)) return true;
  if (isTicketClosedByUser(row, user)) return true;
  void role;
  return false;
}

/** Common Refex — tickets they opened (requester) plus their live tasks / closed-by. */
export function matchesCommonPersonalScope(row, user, { role = 'final' } = {}) {
  if (!row || !user) return false;
  if (isMyItem(row, user)) return true;
  return matchesRefexMeOnlyScope(row, user, { role });
}

function matchesRefexApproverPersonalMeScope(row, user, role = 'first') {
  if (!row || !user) return false;
  return matchesRefexMeOnlyScope(row, user, { role });
}

/**
 * My Team = all tickets except the signed-in user's Me set.
 * @param {'agent'|'first'|'final'|'monitoring'} [role]
 */
export function matchesRefexServiceTeamScope(row, user, { role = 'agent' } = {}) {
  if (!user) return true;
  return !matchesRefexMeOnlyScope(row, user, { role });
}

export function matchesRefexTechSupportTab(row, tabKey, user = null) {
  if (!row) return false;

  const atAgentStep = isITAgentStep(row);
  const mine = isAgentTicketAssignedToUser(row, user);
  const atEmployeeApproval = isEmployeeApprovalRefexStep(row);
  const handled = isRefexTechSupportTicketHandledByUser(row, user);
  const hasMyTask = Boolean(row?.techSupportMyTaskItem);
  const refexStatus = normalizeText(row?.refexTechSupportStatus).toLowerCase();
  const openPickup = matchesOpenPickupTicketRow(row, user);
  const isClosed = isRefexServiceClosedTicket(row);

  if (tabKey === 'AllTickets') {
    // Live published Agent pack (CCDiHg2rN8hi): handled ∪ my-task ∪ assigned
    // ∪ employee-approval ∪ open pickup ∪ closed. Me/Team is applied separately.
    return handled || hasMyTask || mine || atEmployeeApproval || openPickup || isClosed;
  }
  if (tabKey === 'OpenTickets') {
    // Refex IT Agent: own RR + own Tech Support / Dependency only (not other agents).
    // Reopened KPI removed — reopened in-flight work counts as Open Tickets.
    if (isRefexServiceDashboardContext()) {
      if (matchesMergedReopenedWorkRow(row, user)) return true;
      if (!isLiveBucketPendingRow(row) && !hasMyTask) return false;
      return matchesRefexAgentOwnOpenTickets(row, user);
    }
    // Extrovis: shared IT Agent PickUp pool — only when in signed-in user's bucket.
    // Reopened Extrovis work is merged into My Tickets (AssignedToMe), not Open.
    if (isClosed) return false;
    if (!isLiveBucketPendingRow(row) && !hasMyTask) return false;
    return openPickup;
  }
  if (tabKey === 'AssignedToMe') {
    // Split-agent flows: My Tasks = owned Solution / Tech Support (not Reopen — that is Closed).
    if (atEmployeeApproval || isClosed) return false;
    if (isExtrovisServiceDashboardContext()) {
      // Non-Refex: merge former Reopened KPI into My Tickets.
      if (matchesMergedReopenedWorkRow(row, user)) return true;
      return matchesExtrovisMyTaskRow(row, user);
    }
    if (isRefexServiceDashboardContext()) {
      return matchesRefexSplitMyTaskRow(row, user);
    }
    return matchesRefexMyTaskRow(row, user);
  }
  if (tabKey === 'InProgress') {
    if (isClosed) return false;
    const openedByMe = refexStatus === 'open' && handled && atAgentStep;
    const activeMine = isRefexAgentActiveItemStatus(row) && atAgentStep && (mine || handled) && refexStatus !== 'close';
    return openedByMe || activeMine;
  }
  if (tabKey === 'EmployeeFeedback') {
    // Card removed — keep matcher false so leftover filters show nothing.
    return false;
  }
  if (tabKey === 'Reopened') {
    // KPI removed — redirect legacy filter to Open (Refex) / My Tickets (Extrovis).
    if (isExtrovisServiceDashboardContext()) {
      return matchesRefexTechSupportTab(row, 'AssignedToMe', user) && isRefexServiceReopenedTicket(row);
    }
    return matchesRefexTechSupportTab(row, 'OpenTickets', user) && isRefexServiceReopenedTicket(row);
  }
  if (tabKey === 'Closed') {
    if (!isClosed) return false;
    // Me Closed = Closed By signed-in user OR live Reopen task in their bucket.
    if (isLiveItTechReopenTaskOverlay(row) || row.isLiveReopenPending === true) return true;
    return isTicketClosedByUser(row, user);
  }
  if (tabKey === 'SlaBreached') {
    if (isRefexServiceDashboardContext()) {
      return matchesRefexAgentOwnSlaBreached(row, user);
    }
    // Extrovis: SLA Open ⊂ IT Agent Solution (My Tickets); SLA Closed ⊂ Closed.
    if (isClosed) {
      return isServiceQueueClosedSlaBreachedTicket(row)
        && (handled || hasMyTask || mine || openPickup);
    }
    if (isServiceQueueSlaBreachedTicket(row) && matchesExtrovisMyTaskRow(row, user)) return true;
    return false;
  }
  if (tabKey === 'OpenToday' || tabKey === 'TodayOpen') {
    if (!isDashboardRowCreatedToday(row)) return false;
    // Created today and still in flight (any step) — not only IT Tech queue.
    if (isRefexServiceRejectedTicket(row) || isRefexServiceProcessCompleted(row)) return false;
    if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;
    return !isRefexServiceClosedTicket(row);
  }
  if (tabKey === 'ClosedToday' || tabKey === 'TodayClosed') {
    if (!matchesRefexTechSupportTab(row, 'Closed', user)) return false;
    return isDashboardRowClosedToday(row);
  }
  if (tabKey === 'TodaySlaBreached') {
    if (!isDashboardRowCreatedToday(row)) return false;
    return isServiceQueueAnySlaBreachedTicket(row)
      && (handled || hasMyTask || mine || openPickup || isClosed
        || matchesRefexTechSupportTab(row, 'SlaBreached', user));
  }
  return false;
}

/**
 * Refex IT Manager / IT Head monitoring tabs.
 * @param {'first'|'final'|'monitoring'} [role] — approver role for Pending Tasks routing.
 */
export function matchesRefexMonitoringServiceTab(row, tabKey, user = null, scope = 'team', role = 'monitoring') {
  if (!row) return false;
  const atEmployeeApproval = isEmployeeApprovalRefexStep(row);
  const handled = isRefexTechSupportTicketHandledByUser(row, user);
  const hasMyTask = Boolean(row?.techSupportMyTaskItem);
  const mine = isAgentTicketAssignedToUser(row, user);
  const openPickup = matchesOpenPickupTicketRow(row, user);

  if (tabKey === 'AllTickets') return true;
  if (tabKey === 'PendingTask') {
    return matchesRefexApproverPendingTaskRow(row, user, scope, role);
  }
  if (tabKey === 'OpenTickets' || tabKey === 'Active') {
    // Extrovis Open = IT Agent PickUp only (not Solution / Dependency).
    if (isExtrovisServiceDashboardContext()) {
      if (scope === 'me' && !isLiveBucketPendingRow(row)) return false;
      return matchesExtrovisOpenTicketRow(row, user);
    }
    // Refex Open = agent pipeline (not approvals, not reopen-hold). Reopened flag → Open + tag.
    if (isRefexServiceDashboardContext()) {
      if (matchesMergedReopenedWorkRow(row, user)) {
        if (scope === 'me') {
          return matchesRefexMeOnlyScope(row, user, {
            role: (role === 'first' || role === 'final') ? role : 'agent',
          });
        }
        return true;
      }
      if (scope === 'me') {
        if (!isLiveBucketPendingRow(row) && !row?.techSupportMyTaskItem) return false;
        if (row.isLiveReopenPending || isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) {
          return false;
        }
      }
      return isRefexMonitoringOpenTicketRow(row);
    }
    if (isRefexServiceClosedTicket(row) || isRefexServiceProcessCompleted(row) || isRefexServiceRowResolved(row) || isAgentItemStatusCancelled(row)) {
      return false;
    }
    if (openPickup) return true;
    if (isAgentItemStatusResolved(row)) return false;
    return isITAgentStep(row) && !isAgentOpenPickupStep(row);
  }
  if (tabKey === 'OpenToday' || tabKey === 'TodayOpen') {
    if (!isDashboardRowCreatedToday(row)) return false;
    // Today Open = created today and still in flight (any step).
    // Do not require IT Tech / Tech Support — email tickets often sit at L1/Start first.
    if (isRefexServiceRejectedTicket(row) || isRefexServiceProcessCompleted(row)) return false;
    if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;
    return !isRefexServiceClosedTicket(row);
  }
  if (tabKey === 'ClosedToday') {
    if (!matchesRefexMonitoringServiceTab(row, 'Closed', user, scope, role)) return false;
    return isDashboardRowClosedToday(row);
  }
  if (tabKey === 'TodayClosed') {
    if (!matchesRefexMonitoringServiceTab(row, 'Closed', user, scope, role)) return false;
    return isDashboardRowClosedToday(row);
  }
  if (tabKey === 'TodaySlaBreached') {
    // Today snapshot: only tickets created today that are SLA breached.
    if (!isDashboardRowCreatedToday(row)) return false;
    return isServiceQueueAnySlaBreachedTicket(row);
  }
  if (tabKey === 'AssignedToMe') {
    // Extrovis: My Tickets = owned Solution / Dependency / After Dependency (not PickUp).
    // Former Reopened KPI merges here for non-Refex.
    if (isExtrovisServiceDashboardContext()) {
      if (matchesMergedReopenedWorkRow(row, user)) {
        if (scope === 'me') {
          return matchesRefexMeOnlyScope(row, user, {
            role: (role === 'first' || role === 'final') ? role : 'agent',
          });
        }
        return true;
      }
      return matchesExtrovisMyTaskRow(row, user);
    }
    // Refex approver dashboards: My Tickets = pending approvals assigned to me.
    if (role === 'first' || role === 'final') {
      return matchesRefexApproverPendingTaskRow(row, user, 'me', role);
    }
    return matchesRefexMyTaskRow(row, user);
  }
  if (tabKey === 'SlaBreached') {
    // Closed SLA ⊂ Closed. Open SLA ⊂ Open Tickets on Team / Admin.
    // Extrovis live SLA is IT Agent Solution (My Tickets), not PickUp.
    // Manager/Head Me: personal pending-approval work is not Open Tickets
    // (agent pipeline), so count SLA there or the Me card stays at 0.
    if (isServiceQueueClosedSlaBreachedTicket(row)) {
      return matchesRefexMonitoringServiceTab(row, 'Closed', user, scope, role);
    }
    if (!isServiceQueueSlaBreachedTicket(row)) return false;
    if (matchesRefexMonitoringServiceTab(row, 'OpenTickets', user, scope, role)) return true;
    if (
      isExtrovisServiceDashboardContext()
      && matchesRefexMonitoringServiceTab(row, 'AssignedToMe', user, scope, role)
    ) {
      return true;
    }
    if (
      scope === 'me'
      && (role === 'first' || role === 'final')
      && isRefexServiceDashboardContext()
      && matchesRefexApproverPendingTaskRow(row, user, 'me', role)
    ) {
      return true;
    }
    return false;
  }
  if (tabKey === 'EmployeeFeedback') {
    // Removed from Refex dashboards — keep false for safety.
    return false;
  }
  if (tabKey === 'Reopened') {
    // KPI removed — legacy filter redirects to Open (Refex) / My Tickets (Extrovis).
    if (!isRefexServiceReopenedTicket(row)) return false;
    if (isExtrovisServiceDashboardContext()) {
      return matchesRefexMonitoringServiceTab(row, 'AssignedToMe', user, scope, role);
    }
    return matchesRefexMonitoringServiceTab(row, 'OpenTickets', user, scope, role);
  }
  if (tabKey === 'Rejected') {
    if (!isRefexServiceRejectedTicket(row)) return false;
    if (scope === 'me') {
      const raw = row?.raw ?? row;
      return personMatchesUser(raw?._modified_by || row?.modifiedBy, user)
        || isTicketClosedByUser(row, user);
    }
    return true;
  }
  if (tabKey === 'Closed') {
    if (!isRefexServiceClosedTicket(row) && !matchesRefexApproverReopenClosedRow(row, user, role)) {
      return false;
    }
    // Me = own bucket/closed; My Team = everything else (!Me).
    const meRole = (role === 'first' || role === 'final') ? role : 'agent';
    if (scope === 'me') {
      return matchesRefexMeOnlyScope(row, user, { role: meRole });
    }
    if (scope === 'team' && user) {
      return matchesRefexServiceTeamScope(row, user, { role: meRole });
    }
    return true;
  }
  return false;
}

function resolveAgentServiceTabMatcher(tabKey, user, scope = 'me') {
  if (usesRefexServiceWorkflow()) {
    if (scope === 'team') {
      return (row) => matchesRefexMonitoringServiceTab(row, tabKey, user, 'team');
    }
    return (row) => matchesRefexTechSupportTab(row, tabKey, user);
  }
  if (scope === 'team') {
    return (row) => matchesAgentServiceTabTeam(row, tabKey);
  }
  return (row) => matchesAgentServiceTab(row, tabKey, user);
}

/** Service queue tab bucket for IT Agent dashboard. */
export function matchesAgentServiceTab(row, tabKey, user = null) {
  if (!row) return false;

  const atAgentStep = isITAgentStep(row);
  const mine = isAgentTicketAssignedToUser(row, user);

  if (tabKey === 'AllTickets') return true;
  if (tabKey === 'SlaBreached') {
    return isServiceQueueSlaBreachedTicket(row) && (mine || isAgentServiceTicketOwnedByUser(row, user));
  }
  if (tabKey === 'OpenTickets') {
    return isAgentItemStatusOpen(row) && atAgentStep && isAgentPoolAssignment(row);
  }
  if (tabKey === 'PendingTask') {
    const statusOk = usesRefexServiceWorkflow()
      ? isRefexAgentActiveItemStatus(row)
      : isAgentItemStatusInProgress(row);
    return statusOk && atAgentStep && mine;
  }
  if (tabKey === 'HoldTasks') {
    return (isAgentItemStatusOnHold(row) || isAgentItemStatusPendingUser(row)) && mine;
  }
  if (tabKey === 'Cancelled') {
    return isAgentItemStatusCancelled(row) && isAgentServiceTicketOwnedByUser(row, user);
  }
  if (tabKey === 'Resolved') {
    return isAgentItemStatusResolved(row) && isAgentServiceTicketOwnedByUser(row, user);
  }
  return false;
}

/** Agent service tab — team pool view (entity queue, not only my assignment). */
export function matchesAgentServiceTabTeam(row, tabKey) {
  if (!row) return false;
  const atAgentStep = isITAgentStep(row);

  if (tabKey === 'AllTickets') return true;
  if (tabKey === 'SlaBreached') {
    return isServiceQueueSlaBreachedTicket(row);
  }
  if (tabKey === 'OpenTickets') {
    return isAgentItemStatusOpen(row) && atAgentStep && isAgentPoolAssignment(row);
  }
  if (tabKey === 'PendingTask') {
    const statusOk = usesRefexServiceWorkflow()
      ? isRefexAgentActiveItemStatus(row)
      : isAgentItemStatusInProgress(row);
    return statusOk && atAgentStep;
  }
  if (tabKey === 'HoldTasks') {
    return isAgentItemStatusOnHold(row) || isAgentItemStatusPendingUser(row);
  }
  if (tabKey === 'Cancelled') {
    return isAgentItemStatusCancelled(row);
  }
  if (tabKey === 'Resolved') {
    return isAgentItemStatusResolved(row);
  }
  return false;
}

/** Service queue — agent pipeline step (Pickup / Tech Support / Dependency). */
function isApproverServiceAgentFlowStep(row) {
  if (isRefexServiceApprovalStep(row)) return false;
  if (isITAgentStep(row) || isDependencyAssigneeStep(row) || isTechSupportAfterDependencyStep(row)) {
    return true;
  }
  const normalized = normalizeServiceWorkflowStep(getCurrentStepValue(row)).toLowerCase();
  return normalized === IT_AGENT_STEP.toLowerCase();
}

/** Service queue tab bucket for first / final approver oversight (all assignees). */
export function matchesApproverServiceTab(row, tabKey) {
  if (!row) return false;

  const atAgentFlow = isApproverServiceAgentFlowStep(row);

  if (tabKey === 'AllTickets') return true;
  if (tabKey === 'SlaBreached') {
    return isServiceQueueSlaBreachedTicket(row);
  }
  if (tabKey === 'AgentPending') {
    const statusOk = usesRefexServiceWorkflow()
      ? isRefexAgentActiveItemStatus(row)
      : isAgentItemStatusInProgress(row);
    return atAgentFlow && statusOk;
  }
  if (tabKey === 'OpenTickets') {
    return isITAgentStep(row) && isAgentItemStatusOpen(row);
  }
  if (tabKey === 'OnHold') {
    return isAgentItemStatusOnHold(row) || isAgentItemStatusPendingUser(row);
  }
  if (tabKey === 'Closed' || tabKey === 'Resolved') {
    return Boolean(
      row?.isProcessCompleted
      || isRefexServiceProcessCompleted(row)
      || isAgentItemStatusResolved(row)
      || isRefexServiceRowResolved(row),
    );
  }
  if (tabKey === 'Cancelled') {
    return isAgentItemStatusCancelled(row);
  }
  // Pending / Feedback / Reopened are handled by matchesRefexMonitoringServiceTab.
  if (tabKey === 'PendingTask' || tabKey === 'EmployeeFeedback' || tabKey === 'Reopened' || tabKey === 'AssignedToMe') {
    return false;
  }
  return false;
}

export function applyApproverServiceFilters(rows, {
  search = '',
  statusTab = 'AgentPending',
  user = null,
  scope = 'team',
  sortOrder = 'asc',
  entityTab = '',
  role = 'monitoring',
  /** When true, always use Refex/Extrovis monitoring tab matchers (Manager/Head MIS). */
  useMonitoringMatcher = false,
} = {}) {
  // Prefer monitoring matcher for Manager/Head — matchesApproverServiceTab has no Closed/Pending/etc.
  // and entityTab defaults caused KPI counts (monitoring) to disagree with an empty MIS table.
  const useMonitoring = useMonitoringMatcher
    || usesRefexServiceWorkflow(entityTab)
    || usesRefexServiceWorkflow();
  const matchTab = useMonitoring
    ? (row) => matchesRefexMonitoringServiceTab(row, statusTab, user, scope, role)
    : (row) => matchesApproverServiceTab(row, statusTab);
  let list = (rows || []).filter((row) => matchTab(row));
  // Legacy non-monitoring path only — monitoring Me/Team semantics already live in
  // matchesRefexMonitoringServiceTab. An extra matchesDashboardMeScope wipe here caused
  // Closed/AllTickets KPI counts to disagree with an empty MIS table (handled Closed
  // tickets counted but were filtered out of the table).
  if (
    !useMonitoring
    && scope === 'me'
    && user
    && statusTab !== 'PendingTask'
    && statusTab !== 'AssignedToMe'
    && statusTab !== 'OpenTickets'
  ) {
    list = list.filter((row) => matchesDashboardMeScope(row, user));
  }
  list = sortMisTableRows(list, sortOrder, entityTab);
  const q = normalizeText(search).toLowerCase();
  if (!q) return list;
  const refex = useMonitoring || usesRefexServiceWorkflow();
  return list.filter((row) => {
    const fields = refex
      ? [row.requestId, row.ticketType, row.category, row.itemStatus, row.requesterName, row.assignedTo, row.currentStep]
      : [row.requestId, row.summary, row.ticketType, row.category, row.itemStatus, row.requesterName, row.assignedTo, row.currentStep];
    return fields.some((v) => String(v || '').toLowerCase().includes(q));
  });
}

export function computeApproverServiceKpisFromRows(rows, { entityTab = '' } = {}) {
  const tabs = getApproverServiceTabs(entityTab);
  const matchTab = usesRefexServiceWorkflow(entityTab)
    ? matchesRefexMonitoringServiceTab
    : matchesApproverServiceTab;
  const counts = {};
  tabs.forEach((tab) => {
    counts[tab.key] = (rows || []).filter((r) => matchTab(r, tab.key)).length;
  });
  const unique = new Set();
  (rows || []).forEach((row) => {
    if (tabs.some((tab) => matchesApproverServiceTab(row, tab.key))) {
      unique.add(row.id);
    }
  });
  return {
    totalRecords: unique.size,
    agentPendingTasks: counts.AgentPending ?? 0,
    openTickets: counts.OpenTickets ?? 0,
    onHold: counts.OnHold ?? 0,
    resolved: counts.Resolved ?? 0,
    cancelled: counts.Cancelled ?? 0,
    completedRecords: counts.Resolved ?? 0,
  };
}

/** Employee dashboard — row belongs to logged-in user (requester email or created-by). */
export function isMyItem(row, user) {
  if (!row) return false;

  const email = normalizeEmail(user?.Email);
  const userId = normalizeText(user?._id || user?.Id);
  if (!email && !userId) return true;

  const requesterEmail = normalizeEmail(row.requesterEmail);
  if (email && requesterEmail && requesterEmail === email) return true;

  const createdById = normalizeText(row.createdById);
  if (userId && createdById && userId === createdById) return true;

  const createdByEmail = normalizeEmail(row.createdByEmail);
  if (email && createdByEmail && createdByEmail === email) return true;

  return false;
}

function pickFirstId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return normalizeText(raw?._id ?? raw?.id ?? raw);
}

function isRefexSrEntity(item) {
  if (activeDashboardProfile?.id === 'extrovis') return false;
  if (activeDashboardProfile?.id === 'refex') return true;
  const entity = normalizeText(
    getItemValue(item, FIELD.entity) || getItemValue(item, FIELD.entitySelect),
  ).toLowerCase();
  return entity === 'refex';
}

/** Report StepField column for IT Agent — Refex vs Extrovis PickUp / Solution */
function getSrItAgentStepActivityColumn(item = null) {
  const col = getActiveServiceCol();
  if (activeDashboardProfile?.id === 'extrovis') {
    if (item && isExtrovisAgentPickupStep(item)) {
      return col.itAgentPickupActivity || col.itAgentActivity;
    }
    return col.itAgentActivity || col.itAgentPickupActivity;
  }
  if (activeDashboardProfile?.id === 'refex') {
    if (item && isRefexTechPickupStep(item)) {
      return col.itAgentPickupActivity || col.itAgentRefexActivity;
    }
    return col.itAgentRefexActivity || col.itAgentActivity || col.itAgentPickupActivity;
  }
  return item && isRefexSrEntity(item) ? col.itAgentRefexActivity : col.itAgentActivity;
}

function getSrReportActivityEntries(item) {
  if (!item) return [];
  const serviceCol = getActiveServiceCol();
  const columnKeys = [
    serviceCol.employeeApprovalRefex,
    serviceCol.employeeApprovalRefexLegacy,
    serviceCol.techSupportAfterDependencyActivity,
    serviceCol.techSupportAfterDependencyActivityLegacy,
    serviceCol.dependencyAssigneeActivity,
    serviceCol.dependencyAssigneeActivityLegacy,
    serviceCol.itHeadApprovalActivity,
    serviceCol.itManagerApprovalActivity,
    serviceCol.l2ApprovalActivity,
    serviceCol.l1ApprovalActivity,
    serviceCol.itAgentPickupActivity,
    serviceCol.itAgentPickupActivityLegacy,
    getSrItAgentStepActivityColumn(item),
    serviceCol.itAgentActivity,
    serviceCol.itAgentRefexActivity,
    serviceCol.itAgentRefexActivityLegacy,
  ];
  const seen = new Set();
  const entries = [];

  for (const key of columnKeys) {
    const col = normalizeText(key);
    if (!col || seen.has(col)) continue;
    seen.add(col);

    const raw = getItemValue(item, [col]) ?? item?.[col];
    if (!raw) continue;
    const list = Array.isArray(raw) ? raw : [raw];
    entries.push(...list.filter(Boolean));
  }

  return entries;
}

function pickSrInProgressActivityFromColumn(item, columnKey) {
  const col = normalizeText(columnKey);
  if (!col || !item) return '';

  const raw = getItemValue(item, [col]) ?? item?.[col];
  if (!raw) return '';

  const list = Array.isArray(raw) ? raw : [raw];
  for (const entry of list) {
    const id = pickFirstId(entry?._id ?? entry?.id);
    if (!id) continue;
    const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status).toLowerCase();
    const token = status.replace(/[\s_-]+/g, '');
    // Empty Status is leftover history — not a live step (was tagging Solution tickets as ReOpen Window).
    if (
      token === 'inprogress'
      || token === 'open'
      || token === 'notpickedyet'
      || token === 'waitingforitagentapproval'
    ) {
      return id;
    }
  }

  return '';
}

/** Latest non-cancelled `_id` from a report StepField column (fallback when no in-progress row). */
function pickSrLatestActivityFromColumn(item, columnKey) {
  const col = normalizeText(columnKey);
  if (!col || !item) return '';

  const raw = getItemValue(item, [col]) ?? item?.[col];
  if (!raw) return '';

  const list = Array.isArray(raw) ? raw : [raw];
  let bestId = '';
  let bestTs = -1;

  for (const entry of list) {
    const id = pickFirstId(entry?._id ?? entry?.id);
    if (!id) continue;
    const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status).toLowerCase();
    if (status === 'cancelled' || status === 'canceled') continue;
    const ts = Date.parse(entry?.ActedAt || entry?.actedAt || '') || 0;
    if (ts >= bestTs) {
      bestTs = ts;
      bestId = id;
    }
  }

  if (bestId) return bestId;

  const last = list[list.length - 1];
  return pickFirstId(last?._id ?? last?.id);
}

/** Map current workflow step name → report StepField column id (`Column_*`). */
function getSrStepFieldColumnForCurrentStep(item) {
  if (!item) return '';

  const serviceCol = getActiveServiceCol();
  const currentStep = normalizeText(
    getCurrentStepValue(item)
    || getItemValue(item, [serviceCol.currentStep, FIELD.currentStep])
    || item?.[serviceCol.currentStep],
  );
  const stepLower = currentStep.toLowerCase();
  if (!currentStep) return '';

  // IT Tech Reopen (48h) — must win before fuzzy "IT Tech" matching.
  if (
    stepLower.includes('it tech reopen')
    || currentStep === IT_TECH_REOPEN_REFEX_STEP
  ) {
    const primary = serviceCol.itTechReopenActivity || serviceCol.employeeApprovalRefex || '';
    const legacy = serviceCol.itTechReopenActivityLegacy || serviceCol.employeeApprovalRefexLegacy || '';
    if (primary && pickSrInProgressActivityFromColumn(item, primary)) return primary;
    if (legacy && pickSrInProgressActivityFromColumn(item, legacy)) return legacy;
    return primary || legacy;
  }

  if (
    stepLower.includes('employee feedback')
    || stepLower.includes('employee verification')
    || currentStep === EMPLOYEE_FEEDBACK_REFEX_STEP
    || currentStep === EMPLOYEE_APPROVAL_REFEX_STEP
  ) {
    const primary = serviceCol.itTechReopenActivity || serviceCol.employeeApprovalRefex || '';
    const legacy = serviceCol.itTechReopenActivityLegacy || serviceCol.employeeApprovalRefexLegacy || '';
    if (primary && pickSrInProgressActivityFromColumn(item, primary)) return primary;
    if (legacy && pickSrInProgressActivityFromColumn(item, legacy)) return legacy;
    return primary || legacy;
  }

  if (stepLower.includes('it head approval')) {
    return serviceCol.itHeadApprovalActivity || '';
  }
  if (stepLower.includes('it manager approval') || stepLower === IT_MANAGER_STEP.toLowerCase()) {
    return serviceCol.itManagerApprovalActivity || '';
  }
  if (stepLower === 'l2 approval' || stepLower === 'l2 manager' || stepLower.includes('l2 approval')) {
    return serviceCol.l2ApprovalActivity || '';
  }
  if (stepLower === 'l1 approval' || stepLower === 'l1 manager' || stepLower.includes('l1 approval')) {
    return serviceCol.l1ApprovalActivity || '';
  }

  if (stepLower.includes('dependency assigne')) {
    return serviceCol.dependencyAssigneeActivity || '';
  }

  if (stepLower.includes('tech support after dependency')) {
    return serviceCol.techSupportAfterDependencyActivity || '';
  }

  const stepMetaProfileId = activeDashboardProfile?.id === 'extrovis'
    ? 'extrovis'
    : (activeDashboardProfile?.id === 'refex' || isRefexSrEntity(item)) ? 'refex' : '';

  if (stepMetaProfileId) {
    const fromMeta = resolveRefexStepFieldMetaForStep(currentStep, stepMetaProfileId);
    if (fromMeta?.columnId) return fromMeta.columnId;
  }

  if (
    stepLower.includes('tech support')
    || stepLower.includes('it agent refex')
    || currentStep === IT_AGENT_REFEX_STEP
    || currentStep === IT_TECH_SUPPORT_REFEX_STEP
    || currentStep === IT_TECH_PICKUP_REFEX_STEP
    || stepLower === IT_AGENT_STEP.toLowerCase()
    || stepLower.includes('it agent extrovis')
    || stepLower.includes('it agent pickup')
    || stepLower.includes('it agent pick up')
    || stepLower.includes('it agent solution')
    || stepLower.includes('it tech pickup')
    || stepLower.includes('it tech pick up')
    || currentStep === IT_AGENT_PICKUP_STEP
    || currentStep === IT_AGENT_SOLUTION_STEP
  ) {
    return getSrItAgentStepActivityColumn(item) || serviceCol.itAgentActivity || '';
  }

  if (stepMetaProfileId) {
    const normalized = normalizeWorkflowStepName(currentStep);
    for (const columnId of listRefexStepFieldColumnIds(stepMetaProfileId)) {
      if (pickSrInProgressActivityFromColumn(item, columnId)) {
        const meta = resolveRefexStepFieldMetaForStep(currentStep, stepMetaProfileId);
        if (meta?.columnId === columnId) return columnId;
      }
    }
    if (normalized) {
      const fuzzyMeta = resolveRefexStepFieldMetaForStep(currentStep, stepMetaProfileId);
      if (fuzzyMeta?.columnId) return fuzzyMeta.columnId;
    }
  }

  return '';
}

function pickSrActivityInstanceIdForCurrentStep(item) {
  const stepColumn = getSrStepFieldColumnForCurrentStep(item);
  if (!stepColumn) return '';

  const inProgress = pickSrInProgressActivityFromColumn(item, stepColumn);
  if (inProgress) return inProgress;

  return pickSrLatestActivityFromColumn(item, stepColumn);
}

function pickSrOpenActivityInstanceIdFromReport(item) {
  if (!item) return '';

  const fromCurrentStep = pickSrActivityInstanceIdForCurrentStep(item);
  if (fromCurrentStep) return fromCurrentStep;

  // Known current-step column but no in-progress/_id yet — do not fall back to an
  // unrelated open activity (opens Kissflow form read-only with a stale id).
  if (getSrStepFieldColumnForCurrentStep(item)) return '';

  for (const entry of getSrReportActivityEntries(item)) {
    const id = pickFirstId(entry?._id ?? entry?.id);
    if (!id) continue;
    const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status).toLowerCase();
    if (status !== 'completed' && status !== 'cancelled' && status !== 'canceled') return id;
  }

  return '';
}

/** Last completed/cancelled IT Agent step activity — for read-only View Details on terminal tabs. */
function pickSrTerminalActivityInstanceIdFromReport(item) {
  if (!item) return '';

  const stepCol = getSrItAgentStepActivityColumn(item);
  const raw = getItemValue(item, [stepCol]) ?? item?.[stepCol];
  if (raw) {
    const list = Array.isArray(raw) ? raw : [raw];
    let lastTerminalId = '';
    for (const entry of list) {
      const id = pickFirstId(entry?._id ?? entry?.id);
      if (!id) continue;
      const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status).toLowerCase();
      if (status === 'completed' || status === 'cancelled' || status === 'canceled') {
        lastTerminalId = id;
      }
    }
    if (lastTerminalId) return lastTerminalId;
  }

  const fromCol = normalizeText(
    getItemValue(item, FIELD.activityInstanceId) ?? item?.[getActiveServiceCol().activityInstanceId],
  );
  const instanceId = normalizeText(
    getItemValue(item, FIELD.instanceId) ?? item?.[getActiveServiceCol().instanceId] ?? item?._id,
  );
  if (fromCol && fromCol !== instanceId) return fromCol;

  return '';
}

export function pickActivityInstanceId(item) {
  if (!item) return '';

  const fromReportStep = pickSrOpenActivityInstanceIdFromReport(item);
  if (fromReportStep) return fromReportStep;

  const firstCtx = Array.isArray(item?._context) ? item._context[0] : item?._context;
  const candidates = [
    getItemValue(item, FIELD.activityInstanceId),
    item?.[getActiveServiceCol().activityInstanceId],
    item._activity_instance_id,
    item._context_activity_instance_id,
    item._activityInstanceId,
    item.Activity_Instance_Id,
    item._activity_instance?._id,
    item._activity_instance?.id,
    item._context_activity_instance?._id,
    item._context_activity_instance?.id,
    firstCtx?._context_activity_instance_id,
    firstCtx?._context_activity_instance,
  ];

  for (const candidate of candidates) {
    const id = pickFirstId(candidate);
    if (id) return id;
  }

  return '';
}

/** Refex when entity is Refex; otherwise Extrovis step columns. */
function getCrParentEntity(item) {
  const crCol = getActiveCrCol();
  return normalizeText(
    getCrItemValue(item, crField().entity) || item?.[crCol.entity],
  ).toLowerCase();
}

function isRefexCrEntity(item) {
  if (activeDashboardProfile?.id === 'extrovis') return false;
  if (activeDashboardProfile?.id === 'refex') return true;

  const parent = getCrParentEntity(item);
  if (parent === 'refex') return true;
  if (parent === 'extrovis') return false;

  const crCol = getActiveCrCol();
  const refexCount = [
    crCol.firstApproverStepActivity,
    crCol.finalApproverStepActivity,
    crCol.implementationStepActivity,
  ].reduce((n, col) => n + pickCrStepFieldEntries(item, col).length, 0);
  const extrovisCount = [
    crCol.extrovisFirstApproverStepActivity,
    crCol.extrovisFinalApproverStepActivity,
    crCol.extrovisImplementationStepActivity,
  ].reduce((n, col) => n + pickCrStepFieldEntries(item, col).length, 0);
  if (refexCount > 0 && extrovisCount === 0) return true;
  if (extrovisCount > 0 && refexCount === 0) return false;

  return false;
}

function getCrEntityStepActivityColumns(item) {
  const crCol = getActiveCrCol();
  if (isRefexCrEntity(item)) {
    return [
      crCol.firstApproverStepActivity,
      crCol.finalApproverStepActivity,
      crCol.implementationStepActivity,
    ];
  }
  return [
    crCol.extrovisFirstApproverStepActivity,
    crCol.extrovisFinalApproverStepActivity,
    crCol.extrovisImplementationStepActivity,
  ];
}

/** Report StepField column for workflow step — entity-aware (Refex vs Extrovis). */
function getCrStepActivityColumn(stepName, item = null) {
  const crCol = getActiveCrCol();
  const refex = item ? isRefexCrEntity(item) : false;
  if (crStepMatches(stepName, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS)) {
    return refex
      ? crCol.firstApproverStepActivity
      : crCol.extrovisFirstApproverStepActivity;
  }
  if (crStepMatches(stepName, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS)) {
    return refex
      ? crCol.finalApproverStepActivity
      : crCol.extrovisFinalApproverStepActivity;
  }
  if (crStepMatches(stepName, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS)) {
    return refex
      ? crCol.implementationStepActivity
      : crCol.extrovisImplementationStepActivity;
  }
  return '';
}

function pickCrStepFieldEntries(item, columnKey) {
  const col = normalizeText(columnKey);
  if (!col || !item) return [];
  const raw = getCrItemValue(item, [col]) ?? item?.[col];
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
}

function pickAssigneeFromStepEntry(entry) {
  if (!entry) return '';
  const acted = pickActedByFromStepEntry(entry);
  if (acted) return acted;
  const assigned = entry.AssignedTo ?? entry.assignedTo ?? entry.Assignee ?? entry._assigned_to;
  if (assigned == null) return '';
  if (Array.isArray(assigned)) {
    const name = formatAssignedTo(assigned);
    return name && name !== '—' ? name : '';
  }
  const name = formatActedBy(assigned);
  return name && name !== '—' ? name : '';
}

function pickStepTimestampFromEntry(entry) {
  if (!entry) return '';
  const at = entry.ActedAt ?? entry.actedAt ?? entry.CompletedAt ?? entry.completedAt
    ?? entry.StartedAt ?? entry.startedAt ?? entry.ExpectedAt ?? entry.expectedAt;
  return formatDateTime(at);
}

/** ActedBy from entity-specific CR StepField column for a workflow step. */
function resolveCrStepActedBy(item, stepName) {
  if (!item || !stepName) return '—';

  const columnKey = getCrStepActivityColumn(stepName, item);
  if (!columnKey) return '—';

  const entries = pickCrStepFieldEntries(item, columnKey);
  for (const entry of entries) {
    const status = entry?.Status ?? entry?.status ?? entry?._status;
    const name = pickActedByFromStepEntry(entry);
    if (name && isTerminalStepActivityStatus(status)) return name;
  }
  for (let idx = entries.length - 1; idx >= 0; idx -= 1) {
    const name = pickActedByFromStepEntry(entries[idx]);
    if (name) return name;
  }

  return '—';
}

function resolveCrStepAssignee(item, stepName, row = null) {
  const actedBy = resolveCrStepActedBy(item, stepName);
  if (actedBy && actedBy !== '—') return actedBy;

  const columnKey = getCrStepActivityColumn(stepName, item);
  if (columnKey) {
    const entries = pickCrStepFieldEntries(item, columnKey);
    for (const entry of entries) {
      const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status).toLowerCase();
      if (status === 'completed' || status === 'cancelled' || status === 'canceled') continue;
      const name = pickAssigneeFromStepEntry(entry);
      if (name) return name;
    }
    for (const entry of entries) {
      const name = pickAssigneeFromStepEntry(entry);
      if (name) return name;
    }
  }

  const currentStep = getCrCurrentStepValue(item);
  if (row && crStepMatches(currentStep, stepName, getCrActivityIdsForStep(stepName))) {
    const assigned = normalizeText(row?.assignedTo);
    if (isHumanActorName(assigned)) return assigned;
    const assignedRaw = getCrItemValue(item, crField().assignedTo);
    const fromField = formatAssignedTo(assignedRaw);
    if (isHumanActorName(fromField)) return fromField;
  }

  return '—';
}

/** All report StepField activity entries — current step column first (entity-aware). */
function getCrReportActivityEntries(item, stepName = '') {
  if (!item) return [];

  const step = stepName || getCrCurrentStepValue(item);
  const stepCol = getCrStepActivityColumn(step, item);
  const columnKeys = [
    stepCol,
    ...getCrEntityStepActivityColumns(item),
    getActiveCrCol().pendingActivityInstances,
    getActiveCrCol().openActivityInstances,
    ...(crField().openActivityInstances || []),
  ];
  const seen = new Set();
  const entries = [];

  for (const key of columnKeys) {
    const col = normalizeText(key);
    if (!col || seen.has(col)) continue;
    seen.add(col);

    const raw = getCrItemValue(item, [col]) ?? item?.[col];
    if (!raw) continue;
    const list = Array.isArray(raw) ? raw : [raw];
    entries.push(...list.filter(Boolean));
  }

  return entries;
}

/** InProgress _id from a report StepField column (e.g. Column_kcKan9YBYo). */
function pickCrInProgressActivityFromColumn(item, columnKey) {
  if (!item || !columnKey) return '';
  const raw = getCrItemValue(item, [columnKey]) ?? item?.[columnKey];
  if (!raw) return '';
  const list = Array.isArray(raw) ? raw : [raw];
  for (const entry of list) {
    const id = pickFirstId(entry?._id ?? entry?.id);
    if (!id) continue;
    const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status);
    if (isOpenCrActivityStatus(status)) return id;
  }
  return '';
}

/** Live activity id from entity StepField column — never Column_8aHLbMTa2j. */
function pickCrReportActivityInstanceId(item, stepName = '') {
  if (!item) return '';
  const step = stepName || getCrCurrentStepValue(item);
  const stepCol = getCrStepActivityColumn(step, item);
  if (stepCol) {
    const fromStep = pickCrInProgressActivityFromColumn(item, stepCol);
    if (fromStep) return fromStep;
  }
  if (stepName && stepName !== step) {
    const explicitCol = getCrStepActivityColumn(stepName, item);
    if (explicitCol && explicitCol !== stepCol) {
      const fromExplicit = pickCrInProgressActivityFromColumn(item, explicitCol);
      if (fromExplicit) return fromExplicit;
    }
  }
  return pickCrOpenActivityInstanceIdFromReport(item, stepName || step);
}

/** Instance + activity ids from report row — StepField InProgress _id only. */
function resolveCrSubmitIdsFromReport(row, stepName = '') {
  const item = row?.raw ?? row;
  const step = stepName || getCrCurrentStepValue(item);
  const instanceId = resolveCrProcessInstanceId(item) || normalizeText(row?.id);
  const activityInstanceId = normalizeText(pickCrReportActivityInstanceId(item, step));
  return { instanceId, activityInstanceId };
}

/** @deprecated Use resolveCrSubmitIdsFromReport */
function resolveCrApproverSubmitIdsFromReport(row, stepName = '') {
  return resolveCrSubmitIdsFromReport(row, stepName);
}

/** Live open step activity from report StepField columns — InProgress entry _id only. */
function pickCrOpenActivityInstanceIdFromReport(item, stepName = '') {
  if (!item) return '';

  for (const entry of getCrReportActivityEntries(item, stepName)) {
    const id = pickFirstId(entry?._id ?? entry?.id);
    if (!id) continue;
    const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status);
    if (isOpenCrActivityStatus(status)) return id;
  }

  return '';
}

function pickCrCompletedReportActivityIds(item, stepName = '') {
  const ids = new Set();
  for (const entry of getCrReportActivityEntries(item, stepName)) {
    const id = pickFirstId(entry?._id ?? entry?.id);
    if (!id) continue;
    const status = normalizeText(entry?.Status ?? entry?.status ?? entry?._status).toLowerCase();
    if (status === 'completed') ids.add(id);
  }
  return ids;
}

/** Last completed step activity — for read-only View Details on completed CRs. */
function pickCrTerminalActivityInstanceIdFromReport(item) {
  if (!item) return '';

  for (const stepName of [CR_IMPLEMENTATION_STEP, CR_FINAL_APPROVER_STEP, CR_FIRST_APPROVER_STEP]) {
    const ids = pickCrCompletedReportActivityIds(item, stepName);
    if (ids.size) return [...ids].pop();
  }

  const fromCol = normalizeText(
    getCrItemValue(item, crField().activityInstanceId) ?? item?.[getActiveCrCol().activityInstanceId],
  );
  const instanceId = resolveCrProcessInstanceId(item);
  if (fromCol && fromCol !== instanceId) return fromCol;

  return '';
}

/** Pick activity instance id from a Change Request process item. */
export function pickCrActivityInstanceId(item) {
  if (!item) return '';

  const fromStepFields = pickCrReportActivityInstanceId(item)
    || pickCrOpenActivityInstanceIdFromReport(item);
  if (fromStepFields) return fromStepFields;

  const firstCtx = Array.isArray(item?._context) ? item._context[0] : item?._context;
  const candidates = [
    item._context_activity_instance_id,
    firstCtx?._context_activity_instance_id,
    item._context_activity_instance?._id,
    item._context_activity_instance?.id,
    firstCtx?._context_activity_instance,
    item._activity_instance_id,
    item._activity_instance?._id,
    item._activity_instance?.id,
    item._activityInstanceId,
    item.Activity_Instance_Id,
  ];

  for (const candidate of candidates) {
    const id = pickFirstId(candidate);
    if (id) return id;
  }

  return pickActivityInstanceId(item);
}

/** Live workflow context only — never use stale Column_8aHLbMTa2j when Column_glrT0fNnpV exists. */
function pickLiveCrActivityInstanceId(item) {
  if (!item) return '';

  const fromOpenSteps = pickCrOpenActivityInstanceIdFromReport(item);
  if (fromOpenSteps) return fromOpenSteps;

  const firstCtx = Array.isArray(item?._context) ? item._context[0] : item?._context;
  const candidates = [
    item._context_activity_instance_id,
    firstCtx?._context_activity_instance_id,
    item._context_activity_instance?._id,
    item._context_activity_instance?.id,
    firstCtx?._context_activity_instance,
    item._activity_instance_id,
    item._activity_instance?._id,
    item._activity_instance?.id,
    item._activityInstanceId,
    item.Activity_Instance_Id,
  ];

  for (const candidate of candidates) {
    const id = pickFirstId(candidate);
    if (id) return id;
  }

  return pickActivityInstanceId(item);
}

function isOpenCrActivityStatus(status) {
  const s = normalizeText(status).toLowerCase().replace(/\s+/g, '');
  return !s || (s !== 'completed' && s !== 'cancelled' && s !== 'canceled' && s !== 'skipped' && s !== 'withdrawn');
}

function normalizeCrStepToken(name) {
  return normalizeText(name).toLowerCase().replace(/[\s_-]+/g, '');
}

function crStepMatches(candidateStep, targetStep, activityIds = []) {
  const c = normalizeCrStepToken(candidateStep);
  const t = normalizeCrStepToken(targetStep);
  if (!c || !t) return false;
  if (c === t) return true;
  for (const id of activityIds) {
    if (c === normalizeCrStepToken(id)) return true;
  }
  if (t.includes('implementation') && c.includes('implementation')) return true;
  if ((t.includes('first') && t.includes('approver')) && (c.includes('first') && c.includes('approver'))) return true;
  if (t.includes('firstlevel') && c.includes('firstlevel')) return true;
  if ((t.includes('itmanager') || (t.includes('first') && t.includes('manager')))
    && (c.includes('itmanager') || (c.includes('first') && c.includes('manager')))) return true;
  if ((t.includes('final') && t.includes('approver')) && (c.includes('final') && c.includes('approver'))) return true;
  if (t.includes('finallevel') && c.includes('finallevel')) return true;
  if ((t.includes('ithead') || (t.includes('final') && t.includes('head')))
    && (c.includes('ithead') || (c.includes('final') && c.includes('head')))) return true;
  if (c.includes('firstlevel') && (c.includes('refex') || c.includes('extrovis'))
    && !t.includes('final')
    && (t.includes('first') || t.includes('manager') || t.includes('approver'))) return true;
  if ((c.includes('finalapprover') || c.includes('finallevel'))
    && (c.includes('refex') || c.includes('extrovis'))
    && (t.includes('final') || t.includes('head') || t.includes('approver'))) return true;
  if (c.includes('implementation') && (c.includes('refex') || c.includes('extrovis'))
    && t.includes('implementation')) return true;
  return false;
}

function getCrContextEntries(item) {
  if (!item) return [];
  if (Array.isArray(item._context)) return item._context.filter(Boolean);
  if (item._context && typeof item._context === 'object') return [item._context];
  return [];
}

/** Pick the open activity instance id for a specific workflow step (not stale prior-step context). */
function pickCrActivityInstanceIdForStep(item, stepName, activityIds = []) {
  if (!item || !stepName) return '';

  const ids = activityIds.length ? activityIds : getCrActivityIdsForStep(stepName);

  for (const ctx of getCrContextEntries(item)) {
    const ctxStep = ctx?._activity_name ?? ctx?.Activity_Name ?? ctx?.activity_name
      ?? ctx?.Name ?? ctx?.Step_Name ?? ctx?.step_name ?? ctx?._step_name
      ?? ctx?._activity_id ?? ctx?.activity_id;
    if (!crStepMatches(ctxStep, stepName, ids)) continue;

    const actId = pickFirstId(
      ctx?._context_activity_instance_id,
      ctx?._context_activity_instance,
      ctx?._activity_instance_id,
      ctx?.activity_instance_id,
    );
    if (!actId) continue;
    const status = normalizeText(ctx?._status ?? ctx?.Status ?? ctx?.status);
    if (isOpenCrActivityStatus(status)) return actId;
  }

  if (crStepMatches(getCrCurrentStepValue(item), stepName, ids)) {
    const currentActId = pickFirstId(
      item._current_activity_instance_id,
      item._current_activity_instance,
      item._current_context?._context_activity_instance_id,
      item._current_context?._context_activity_instance,
    );
    if (currentActId) return currentActId;
  }

  return '';
}

function pickCrPriorStepActivityIds(item, priorStep) {
  const ids = new Set();
  const priorIds = getCrActivityIdsForStep(priorStep);
  for (const ctx of getCrContextEntries(item)) {
    const ctxStep = ctx?._activity_name ?? ctx?.Activity_Name ?? ctx?.activity_name
      ?? ctx?.Name ?? ctx?.Step_Name ?? ctx?.step_name ?? ctx?._step_name
      ?? ctx?._activity_id ?? ctx?.activity_id;
    if (!crStepMatches(ctxStep, priorStep, priorIds)) continue;
    const actId = pickFirstId(
      ctx?._context_activity_instance_id,
      ctx?._context_activity_instance,
      ctx?._activity_instance_id,
      ctx?.activity_instance_id,
    );
    if (actId) ids.add(actId);
  }
  return ids;
}

function getStaleReportCrActivityId(item) {
  return normalizeText(
    getCrItemValue(item, crField().activityInstanceId) ?? item?.[getActiveCrCol().activityInstanceId],
  );
}

function isStaleCrActivityForStep(item, activityId, stepName) {
  if (!activityId || !item) return false;
  const staleReport = getStaleReportCrActivityId(item);
  if (!staleReport || staleReport !== activityId) return false;
  return crStepMatches(getCrCurrentStepValue(item), stepName, getCrActivityIdsForStep(stepName));
}

function extractCrCurrentStepActivityFromInstance(item, stepName, activityIds = []) {
  if (!item || !stepName) return '';
  if (!crStepMatches(getCrCurrentStepValue(item), stepName, activityIds)) return '';

  const fromStep = pickCrActivityInstanceIdForStep(item, stepName, activityIds);
  if (fromStep) return fromStep;

  const fromCurrent = pickFirstId(
    item._current_activity_instance_id,
    item._current_activity_instance,
    item._current_context?._context_activity_instance_id,
    item._current_context?._context_activity_instance,
    item._activity_instance_id,
  );
  if (fromCurrent && !isWrongStepCrActivityId(item, fromCurrent, stepName)) return fromCurrent;

  return '';
}

function isWrongStepCrActivityId(item, activityId, targetStep) {
  if (!activityId || !item) return true;

  const correct = pickCrActivityInstanceIdForStep(
    item, targetStep, getCrActivityIdsForStep(targetStep),
  );
  if (correct) return correct !== activityId;

  if (crStepMatches(targetStep, CR_FINAL_APPROVER_STEP)) {
    const firstIds = pickCrPriorStepActivityIds(item, CR_FIRST_APPROVER_STEP);
    if (firstIds.has(activityId)) return true;
    if (pickCrCompletedReportActivityIds(item).has(activityId)) return true;
  }
  if (crStepMatches(targetStep, CR_FIRST_APPROVER_STEP)) {
    const startIds = pickCrPriorStepActivityIds(item, 'Start');
    if (startIds.has(activityId)) return true;
  }
  if (crStepMatches(targetStep, CR_IMPLEMENTATION_STEP)) {
    const finalIds = pickCrPriorStepActivityIds(item, CR_FINAL_APPROVER_STEP);
    if (finalIds.has(activityId)) return true;
    const firstIds = pickCrPriorStepActivityIds(item, CR_FIRST_APPROVER_STEP);
    if (firstIds.has(activityId)) return true;
    if (pickCrCompletedReportActivityIds(item).has(activityId)) return true;
  }

  return isStaleCrActivityForStep(item, activityId, targetStep);
}

/** Pending-queue item — root _activity_instance_id is the open task at that step. */
function pickCrPendingQueueActivityId(match, stepName, activityIds = [], { fromPendingQueue = false } = {}) {
  if (!match) return '';
  const fromCtx = pickCrActivityInstanceIdForStep(match, stepName, activityIds);
  if (fromCtx) return fromCtx;
  const fromRoot = pickFirstId(match._activity_instance_id);
  if (!fromRoot) return '';

  // Pending API returns items at the open step — root id is authoritative there.
  if (fromPendingQueue && crStepMatches(getCrCurrentStepValue(match), stepName, activityIds)) {
    return fromRoot;
  }

  if (!isWrongStepCrActivityId(match, fromRoot, stepName)) return fromRoot;
  return '';
}

function resolveCrProcessInstanceId(item) {
  if (!item) return '';
  const fromCol = normalizeText(getCrItemValue(item, crField().instanceId) ?? item?.[getActiveCrCol().instanceId]);
  const fromId = normalizeText(item._id ?? item._item_id);
  if (fromCol && /^PkD/i.test(fromCol)) return fromCol;
  if (fromId && /^PkD/i.test(fromId)) return fromId;
  return fromCol || fromId;
}

function matchCrInstanceId(item, instanceId) {
  const target = normalizeText(instanceId);
  if (!target || !item) return false;
  return [
    item._id,
    item._item_id,
    item?.[getActiveCrCol().instanceId],
    getCrItemValue(item, crField().instanceId),
  ].some((v) => normalizeText(v) === target);
}

/** Approver steps: live _context. Implementation: exclude all prior-step activity ids. */
function collectCrActivityInstanceIds(item) {
  const ids = new Set();
  if (!item || typeof item !== 'object') return ids;

  const walk = (obj, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 10) return;
    if (Array.isArray(obj)) {
      obj.forEach((v) => walk(v, depth + 1));
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      const lk = key.toLowerCase();
      if (typeof val === 'string' && /^PkDg[a-zA-Z0-9_-]+$/.test(val)) {
        if (lk.includes('activity') || lk.includes('instance') || lk.includes('context')) {
          ids.add(val);
        }
      } else if (typeof val === 'object') {
        walk(val, depth + 1);
      }
    }
  };

  walk(item);
  return ids;
}

function getStaleCrActivityIdsForImplementation(item) {
  const stale = new Set();
  const report = normalizeText(getStaleReportCrActivityId(item));
  if (report) stale.add(report);
  for (const id of pickCrPriorStepActivityIds(item, CR_FINAL_APPROVER_STEP)) stale.add(id);
  for (const id of pickCrPriorStepActivityIds(item, CR_FIRST_APPROVER_STEP)) stale.add(id);
  stale.delete('');
  return stale;
}

function pickFreshImplementationActivityId(item) {
  if (!item) return '';

  const fromStepField = pickCrReportActivityInstanceId(item, CR_IMPLEMENTATION_STEP);
  if (fromStepField) return fromStepField;

  const stale = getStaleCrActivityIdsForImplementation(item);
  const fromStep = pickCrActivityInstanceIdForStep(item, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS);
  if (fromStep && !stale.has(fromStep)) return fromStep;

  for (const id of collectCrActivityInstanceIds(item)) {
    if (!stale.has(id)) return id;
  }

  return '';
}

function resolveActivityFromCrItem(item, stepName, activityIds = [], { fromPendingQueue = false } = {}) {
  if (!item) return '';

  const fromReportStepField = pickCrReportActivityInstanceId(item, stepName);
  if (fromReportStepField) return fromReportStepField;

  if (crStepMatches(stepName, CR_IMPLEMENTATION_STEP)) {
    if (fromPendingQueue) {
      return pickCrPendingQueueActivityId(item, stepName, activityIds, { fromPendingQueue: true });
    }
    return pickCrActivityInstanceIdForStep(item, stepName, activityIds)
      || pickFreshImplementationActivityId(item)
      || '';
  }

  // First/Final Approver — step-specific id; myitems root _activity_instance_id is often stale.
  const fromStep = pickCrActivityInstanceIdForStep(item, stepName, activityIds);
  if (fromStep) return fromStep;
  if (fromPendingQueue) {
    return pickCrPendingQueueActivityId(item, stepName, activityIds, { fromPendingQueue: true });
  }
  const fromCurrent = extractCrCurrentStepActivityFromInstance(item, stepName, activityIds);
  if (fromCurrent) return fromCurrent;
  if (crStepMatches(getCrCurrentStepValue(item), stepName, activityIds)) {
    const root = pickFirstId(item._activity_instance_id);
    if (root && !isWrongStepCrActivityId(item, root, stepName)) return root;
  }
  return '';
}

function pickCrApproverActivityFromItem(item, stepName = '', activityIds = [], opts = {}) {
  if (!item || !stepName) return pickLiveCrActivityInstanceId(item);
  return resolveActivityFromCrItem(item, stepName, activityIds, opts);
}

function pickCrRowActivityInstanceId(item) {
  if (!item) return '';
  const step = getCrCurrentStepValue(item);
  if (crStepMatches(step, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS)) {
    return pickCrReportActivityInstanceId(item, CR_IMPLEMENTATION_STEP)
      || pickCrActivityInstanceIdForStep(item, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS);
  }
  if (crStepMatches(step, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS)) {
    return pickCrReportActivityInstanceId(item, CR_FIRST_APPROVER_STEP)
      || pickCrActivityInstanceIdForStep(item, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS);
  }
  if (crStepMatches(step, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS)) {
    return pickCrReportActivityInstanceId(item, CR_FINAL_APPROVER_STEP)
      || pickCrActivityInstanceIdForStep(item, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS);
  }
  return pickCrReportActivityInstanceId(item, step) || pickLiveCrActivityInstanceId(item);
}

function isStaleMyitemsApproverActivityId(row, activityId, approverStep) {
  if (!activityId || !row || !approverStep) return false;
  const item = row?.raw ?? row;
  if (!crStepMatches(getCrCurrentStepValue(item), approverStep)) return false;
  return isWrongStepCrActivityId(item, activityId, approverStep);
}

/** myitems _activity_instance_id at Implementation is stale (prior-step id) — never submit with it. */
function getStaleMyitemsCrActivityId(itemOrRow) {
  const item = itemOrRow?.raw ?? itemOrRow;
  return pickFirstId(
    item?._activity_instance_id,
    getCrItemValue(item, crField().activityInstanceId),
    item?.[getActiveCrCol().activityInstanceId],
  );
}

function isStaleMyitemsImplementationActivityId(row, activityId) {
  if (!activityId || !row) return false;
  const item = row?.raw ?? row;
  if (!crStepMatches(getCrCurrentStepValue(item), CR_IMPLEMENTATION_STEP)) return false;
  const stale = getStaleMyitemsCrActivityId(item);
  return !!stale && stale === activityId;
}

async function isCrActivityOpenForSubmit(kfInstance, instanceId, activityInstanceId) {
  if (!instanceId || !activityInstanceId || !kfInstance?.api) return false;
  if (activityInstanceId === instanceId) return false;
  try {
    const paths = buildChangeRequestProcessApiPaths(kfInstance);
    const resp = await kfGetJson(kfInstance, paths.instanceWithActivityPath(instanceId, activityInstanceId));
    if (resp?.Status === 'not_found' || resp?.ErrorJson) return false;
    if (resp?.status === 'error' || resp?.error_code) return false;
    return true;
  } catch {
    return false;
  }
}

function collectCrActivityCandidatesFromInstanceDetail(item, stepName = CR_IMPLEMENTATION_STEP) {
  if (!item) return [];
  const candidates = [];
  const add = (val) => {
    if (val === undefined || val === null || val === '') return;
    if (Array.isArray(val)) {
      val.forEach(add);
      return;
    }
    const id = pickFirstId(val);
    if (id && /^PkDg/i.test(id) && !candidates.includes(id)) candidates.push(id);
  };

  add(item._activity_instance_id);
  add(item._current_activity_instance_id);
  add(item.CurrentActivityInstance);
  add(item._context_activity_instance_id);
  add(item._context_activity_instance);

  for (const ctx of getCrContextEntries(item)) {
    add(ctx._context_activity_instance_id);
    add(ctx._activity_instance_id);
  }

  const ids = stepName === CR_IMPLEMENTATION_STEP
    ? CR_IMPLEMENTATION_ACTIVITY_IDS
    : getCrActivityIdsForStep(stepName);
  const fromStep = pickCrActivityInstanceIdForStep(item, stepName, ids);
  if (fromStep) add(fromStep);

  return candidates;
}

function extractActivityInstanceIdFromOpenResponse(resp) {
  const data = resp?.data ?? resp ?? {};
  const id = pickFirstId(
    data._activity_instance_id,
    data._context_activity_instance_id,
    data._context_activity_instance,
  );
  if (id && id !== normalizeText(data._id)) return id;
  return '';
}

const crImplementationActivityCache = new Map();
const crApproverActivityCache = new Map();
let crPendingImplementationCache = { at: 0, items: [] };

function crApproverCacheKey(instanceId, stepName) {
  return `${normalizeText(instanceId)}::${normalizeCrStepToken(stepName)}`;
}

/**
 * Open a workflow step — same as native Kissflow (GET then POST on .../{instanceId}/{stepName}).
 */
async function openCrStepActivityId(kfInstance, row, stepName, activityIds, cache = null) {
  const instanceId = resolveCrProcessInstanceId(row?.raw ?? row) || normalizeText(row?.id);
  if (!instanceId || !kfInstance?.api || !stepName) return '';

  const cacheKey = cache ? crApproverCacheKey(instanceId, stepName) : instanceId;
  const memo = cache?.get(cacheKey);
  if (memo) return memo;

  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  const stepIds = activityIds?.length ? activityIds : getCrActivityIdsForStep(stepName);

  for (const stepActivityId of stepIds) {
    const stepPath = paths.instanceStepPath(instanceId, stepActivityId);
    for (const method of ['GET', 'POST']) {
      try {
        const resp = method === 'GET'
          ? await kfGetJson(kfInstance, stepPath)
          : await kfMutateJson(kfInstance, stepPath, { method: 'POST' });

        if (resp?.Status === 'not_found' || resp?.ErrorJson || resp?.status === 'error') continue;

        const data = resp?.data ?? resp ?? {};
        let actId = extractActivityInstanceIdFromOpenResponse(resp);
        if (!actId) {
          actId = pickCrActivityInstanceIdForStep(data, stepName, stepIds);
        }
        if (!actId) {
          const candidates = collectCrActivityCandidatesFromInstanceDetail(data, stepName);
          actId = candidates.find((id) => id !== instanceId) || '';
        }
        if (actId && actId !== instanceId && !isWrongStepCrActivityId(row?.raw ?? row, actId, stepName)) {
          cache?.set(cacheKey, actId);
          return actId;
        }
      } catch {
        // try POST after GET, then next step alias
      }
    }
  }

  return '';
}

async function getCrPendingImplementationItems(kfInstance, page = 1, pageSize = 200) {
  const fresh = Date.now() - crPendingImplementationCache.at < 60000;
  if (fresh && crPendingImplementationCache.items.length) {
    return crPendingImplementationCache.items;
  }
  if (!kfInstance?.api) return [];

  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  try {
    const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(CR_IMPLEMENTATION_STEP, page, pageSize));
    const items = extractItemsFromResponse(resp);
    crPendingImplementationCache = { at: Date.now(), items };
    return items;
  } catch {
    return crPendingImplementationCache.items;
  }
}

/**
 * Open Implementation step — same as native Kissflow (returns e.g. PkDgRb9PrIXC).
 * At most 2 API calls (GET then POST on .../{instanceId}/Implementation). No pending/validation spam.
 */
export async function openCrImplementationActivityId(kfInstance, row) {
  const instanceId = resolveCrProcessInstanceId(row?.raw ?? row) || normalizeText(row?.id);
  if (!instanceId || !kfInstance?.api) return '';

  const fromStepField = pickCrReportActivityInstanceId(row?.raw ?? row, CR_IMPLEMENTATION_STEP);
  if (fromStepField) {
    crImplementationActivityCache.set(instanceId, fromStepField);
    return fromStepField;
  }

  const memo = crImplementationActivityCache.get(instanceId);
  if (memo && !isStaleMyitemsImplementationActivityId(row, memo)) return memo;

  return openCrStepActivityId(
    kfInstance,
    row,
    CR_IMPLEMENTATION_STEP,
    CR_IMPLEMENTATION_ACTIVITY_IDS,
    crImplementationActivityCache,
  );
}

/** Live activity id — StepField column for current step (First / Final / Implementation). */
function resolveCrActivityIdFromRow(row, stepName = '') {
  const item = row?.raw ?? row;
  return pickCrReportActivityInstanceId(item, stepName)
    || pickCrOpenActivityInstanceIdFromReport(item, stepName);
}

/**
 * Resolve live activity for submit — same pattern as working First Level Approver.
 * Order: report InProgress → open native step → pending at step (never stale myitems).
 */
async function resolveCrLiveActivityForSubmit(kfInstance, row, stepName) {
  const instanceId = resolveCrProcessInstanceId(row?.raw ?? row) || normalizeText(row?.id);
  if (!instanceId) return { instanceId: '', activityInstanceId: '' };

  const fromReport = resolveCrSubmitIdsFromReport(row, stepName);
  if (fromReport.activityInstanceId) {
    return fromReport;
  }

  // Implementation — API fallback only when StepField column is empty
  if (!crStepMatches(stepName, CR_IMPLEMENTATION_STEP)) {
    return fromReport;
  }

  const activityIds = getCrActivityIdsForStep(stepName);
  const cache = crImplementationActivityCache;
  const checkItem = row?.raw ?? row;

  let activityInstanceId = pickCrOpenActivityInstanceIdFromReport(checkItem, stepName);
  if (activityInstanceId && isWrongStepCrActivityId(checkItem, activityInstanceId, stepName)) {
    activityInstanceId = '';
  }

  if (!activityInstanceId) {
    activityInstanceId = await openCrStepActivityId(
      kfInstance, row, stepName, activityIds, cache,
    );
  }

  if (!activityInstanceId) {
    activityInstanceId = await findCrPendingActivityInstanceId(
      kfInstance, instanceId, activityIds, stepName,
    );
  }

  if (activityInstanceId && activityInstanceId !== instanceId) {
    cache.set(crApproverCacheKey(instanceId, stepName), activityInstanceId);
  }

  return { instanceId, activityInstanceId };
}

/** SDK save + submit — same pattern as IT Agent service queue. */
async function submitCrWorkflowStep(kfInstance, instanceId, activityInstanceId, payload) {
  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  const process = getChangeRequestProcess(kfInstance);

  await saveCrApprovalFormFields(kfInstance, instanceId, activityInstanceId, payload);

  if (process?.submitItem) {
    await process.submitItem({ instanceId, activityInstanceId });
    return { success: 'Submitted successfully' };
  }

  const submitResp = await kfMutateJson(
    kfInstance,
    paths.instanceSubmitPath(instanceId, activityInstanceId),
    { method: 'POST', body: {} },
  );
  return parseAgentMutationResponse(submitResp, 'Submitted successfully');
}

/** @deprecated Use resolveCrLiveActivityForSubmit */
async function resolveCrImplementationActivityForSubmit(kfInstance, row) {
  return resolveCrLiveActivityForSubmit(kfInstance, row, CR_IMPLEMENTATION_STEP);
}

async function scanPendingForFreshImplementationActivity(kfInstance, instanceId) {
  if (!kfInstance?.api || !instanceId) return '';

  const pendingItems = await getCrPendingImplementationItems(kfInstance);
  const match = pendingItems.find((it) => matchCrInstanceId(it, instanceId));
  return resolveActivityFromCrItem(
    match, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS, { fromPendingQueue: true },
  );
}

async function finalizeCrImplementationActivityId(kfInstance, row, instanceId, activityInstanceId) {
  if (!activityInstanceId) return '';

  const liveItem = await findMyCrInprogressItemByInstanceId(kfInstance, instanceId);
  const checkItem = liveItem || row?.raw || row;
  if (!isWrongStepCrActivityId(checkItem, activityInstanceId, CR_IMPLEMENTATION_STEP)) {
    return activityInstanceId;
  }

  return pickFreshImplementationActivityId(checkItem)
    || await scanPendingForFreshImplementationActivity(kfInstance, instanceId)
    || '';
}

function pickCrActivityIdFromStepList(activities, approverStep) {
  const targetStep = normalizeText(approverStep).toLowerCase();
  const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);

  for (const act of list || []) {
    const step = normalizeText(
      act?.Name || act?.Activity_Name || act?.activity_name || act?.Step_Name || act?.step_name,
    );
    const actId = normalizeText(
      act?._activity_instance_id || act?.activity_instance_id || act?._id || act?.Id,
    );
    const actStatus = normalizeText(act?.Status || act?._status || act?.status);
    if (!actId) continue;
    if (step.toLowerCase() === targetStep && isOpenCrActivityStatus(actStatus)) {
      return actId;
    }
  }

  for (const act of list || []) {
    const actId = normalizeText(
      act?._activity_instance_id || act?.activity_instance_id || act?._id || act?.Id,
    );
    const actStatus = normalizeText(act?.Status || act?._status || act?.status);
    if (actId && isOpenCrActivityStatus(actStatus)) return actId;
  }

  return '';
}

async function resolveITAgentActivityInstanceId(kfInstance, instanceId, hintId = '') {
  const paths = buildITProcessApiPaths(kfInstance);

  try {
    const activities = await kfGetJson(kfInstance, paths.instanceActivityPath(instanceId));
    const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);
    for (const act of list || []) {
      const step = normalizeText(
        act?.Name || act?.Activity_Name || act?.activity_name || act?.Step_Name || act?.step_name,
      );
      const actId = normalizeText(
        act?._activity_instance_id || act?._id || act?.Id || act?.activity_instance_id,
      );
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      if (!actId) continue;
      if (
        (step.toLowerCase() === IT_AGENT_STEP.toLowerCase()
          || step.toLowerCase() === IT_AGENT_REFEX_STEP.toLowerCase()
          || step.toLowerCase() === IT_TECH_SUPPORT_REFEX_STEP.toLowerCase()
          || step.toLowerCase() === IT_AGENT_EXTROVIS_STEP.toLowerCase()
          || step.toLowerCase() === IT_AGENT_PICKUP_STEP.toLowerCase()
          || step.toLowerCase() === IT_AGENT_SOLUTION_STEP.toLowerCase()
          || step.toLowerCase().includes('it agent pickup')
          || step.toLowerCase().includes('it agent solution'))
        && actStatus !== 'completed'
      ) {
        return actId;
      }
    }
    for (const act of list || []) {
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      const actId = normalizeText(
        act?._activity_instance_id || act?._id || act?.Id || act?.activity_instance_id,
      );
      if (actId && actStatus !== 'completed') return actId;
    }
  } catch (err) {
    console.warn('instance activity lookup failed:', err?.message || err);
  }

  return normalizeText(hintId);
}

async function findMyTaskActivityInstanceId(kfInstance, instanceId) {
  if (!instanceId) return '';

  const process = getITProcess(kfInstance);
  if (!process?.getMyTasksItems) return '';

  const activityFilters = ['', ...getAgentPendingActivityIdsForFetch()];
  const seen = new Set();
  for (const activityId of activityFilters) {
    const key = activityId || '__all__';
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const resp = await process.getMyTasksItems({
        activityId: activityId || undefined,
        pageNumber: 1,
        pageSize: 200,
      });
      const match = extractItemsFromResponse(resp).find(
        (it) => normalizeText(it?._id) === instanceId,
      );
      const actId = pickActivityInstanceId(match);
      if (actId) return actId;
    } catch (err) {
      console.warn('getMyTasksItems lookup failed:', err?.message || err);
    }
  }

  return '';
}

async function findAgentPendingActivityInstanceId(kfInstance, instanceId) {
  if (!kfInstance?.api || !instanceId) return '';

  const paths = buildITProcessApiPaths(kfInstance);
  for (const activityId of getAgentPendingActivityIdsForFetch()) {
    try {
      const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(activityId, 1, 200));
      const match = extractItemsFromResponse(resp).find(
        (it) => normalizeText(it?._id) === instanceId,
      );
      const actId = pickActivityInstanceId(match);
      if (actId) return actId;
    } catch {
      // try next activity id
    }
  }

  return '';
}

async function resolveITAgentActivityForSubmit(kfInstance, row, { forWorkflowSubmit = false } = {}) {
  const instanceId = normalizeText(row?.id);
  const fromReport = pickSrOpenActivityInstanceIdFromReport(row?.raw ?? row);
  if (fromReport) {
    return { instanceId, activityInstanceId: fromReport };
  }

  const hintId = pickActivityInstanceId(row?.raw) || normalizeText(row?.activityInstanceId);

  const finders = forWorkflowSubmit
    ? [findMyTaskActivityInstanceId, findAgentPendingActivityInstanceId]
    : [findAgentPendingActivityInstanceId, findMyTaskActivityInstanceId];

  for (const finder of finders) {
    const activityInstanceId = await finder(kfInstance, instanceId, row);
    if (activityInstanceId) return { instanceId, activityInstanceId };
  }

  let activityInstanceId = await resolveITAgentActivityInstanceId(kfInstance, instanceId, hintId);
  if (!activityInstanceId) {
    activityInstanceId = hintId;
  }

  return { instanceId, activityInstanceId };
}

/** Resolve the current IT Agent activity instance id for a dashboard row (e.g. on row expand). */
export async function fetchITAgentActivityInstanceId(kfInstance, row) {
  const { activityInstanceId } = await resolveITAgentActivityForSubmit(kfInstance, row);
  return activityInstanceId;
}

export function resolveAgentSubmitIdsFromReport(row) {
  const item = row?.raw ?? row;
  const instanceId = normalizeText(row?.id || item?._id);
  const activityInstanceId = resolveCurrentActivityInstanceIdFromReport(row);
  return { instanceId, activityInstanceId };
}

function buildAgentAssignedToPayload(user) {
  if (!user?._id && !user?.Id) return {};
  return {
    [IT_AGENT_FORM_FIELDS.assignedTo]: [{
      _id: normalizeText(user._id || user.Id),
      Name: normalizeText(user.Name) || 'User',
      Kind: 'User',
      Email: normalizeEmail(user.Email) || '',
    }],
  };
}

const IT_AGENTS_APP_ROLE = { _id: 'RoDL3kiN3Kwh', Name: 'IT Agents', Kind: 'AppRole' };

function pickAgentPoolReassignFrom(row) {
  const assigned = row?.assignedToRaw ?? row?.raw?.[getActiveServiceCol().assignedTo];
  if (!Array.isArray(assigned)) return [];

  return assigned
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const kind = normalizeText(entry.Kind).toLowerCase();
      const name = normalizeText(entry.Name).toLowerCase();
      return kind === 'approle' && name.includes('it agent');
    })
    .map((entry) => ({
      _id: normalizeText(entry._id) || IT_AGENTS_APP_ROLE._id,
      Name: normalizeText(entry.Name) || IT_AGENTS_APP_ROLE.Name,
      Kind: 'AppRole',
    }));
}

function buildAgentReassignToPayload(user) {
  const id = normalizeText(user?._id || user?.Id);
  if (!id) return null;
  return {
    _id: id,
    Kind: 'User',
    Name: normalizeText(user.Name) || 'User',
    Email: normalizeEmail(user.Email) || '',
  };
}

function buildAgentReassignPayload(row, targetUser, note = '') {
  const reassignedFrom = pickAgentPoolReassignFrom(row);
  const reassignTo = buildAgentReassignToPayload(targetUser);
  if (!reassignTo) throw new Error('Select a user to reassign to.');

  const fallbackRole = activeDashboardProfile?.id === 'refex'
    ? { Name: 'IT Agents Refex', Kind: 'AppRole' }
    : activeDashboardProfile?.id === 'extrovis'
      ? { Name: 'IT Agents Extrovis', Kind: 'AppRole' }
      : IT_AGENTS_APP_ROLE;
  const from = reassignedFrom.length ? reassignedFrom : [fallbackRole];
  const comment = normalizeText(note);
  if (!comment) throw new Error('Notes are required.');

  return {
    reassignedFrom: from,
    reassignTo,
    comment,
    reassignType: 'approver',
    restBody: {
      ReassignedFrom: from,
      ReassignTo: reassignTo,
      Note: comment,
      ReassignType: 'approver',
    },
  };
}

function buildAgentAcceptReassignPayload(row, user, note = 'Accepted') {
  return buildAgentReassignPayload(row, user, note);
}

async function reassignITAgentTicketWithOptions(kfInstance, instanceId, activityInstanceId, options) {
  const process = getITProcess(kfInstance);

  if (process?.reassignItem) {
    const resp = await process.reassignItem({
      instanceId,
      activityInstanceId,
      reassignTo: options.reassignTo,
      comment: options.comment,
      reassignType: options.reassignType,
      reassignedFrom: options.reassignedFrom,
    });
    return parseAgentMutationResponse(resp, 'Ticket reassigned');
  }

  const paths = buildITProcessApiPaths(kfInstance);
  const reassignResp = await kfPostProcessJson(
    kfInstance,
    paths.instanceReassignPath(instanceId, activityInstanceId),
    options.restBody,
  );
  return parseAgentMutationResponse(reassignResp, 'Ticket reassigned');
}

async function reassignITAgentTicket(kfInstance, instanceId, activityInstanceId, row, user) {
  const options = buildAgentAcceptReassignPayload(row, user);
  return reassignITAgentTicketWithOptions(kfInstance, instanceId, activityInstanceId, options);
}

export async function fetchITServiceReassignees(kfInstance, row, page = 1, pageSize = 50) {
  let { instanceId, activityInstanceId } = resolveAgentSubmitIdsFromReport(row);
  if (!activityInstanceId && kfInstance?.api) {
    activityInstanceId = await fetchITAgentActivityInstanceId(kfInstance, row);
  }
  if (!instanceId || !activityInstanceId) {
    throw new Error('Could not resolve activity for reassignment.');
  }

  const paths = buildITProcessApiPaths(kfInstance);
  const resp = await kfGetJson(
    kfInstance,
    paths.assigneeReassigneesPath(instanceId, activityInstanceId, page, pageSize),
  );
  const list = Array.isArray(resp)
    ? resp
    : Array.isArray(resp?.data)
      ? resp.data
      : [];
  return list.filter((entry) => entry && normalizeText(entry._id));
}

export async function reassignITAgentTicketToUser(kfInstance, row, targetUser, note) {
  if (!kfInstance?.api && !getITProcess(kfInstance)?.reassignItem) {
    throw new Error('Reassign not available — open inside Kissflow');
  }

  let { instanceId, activityInstanceId } = resolveAgentSubmitIdsFromReport(row);
  if (!activityInstanceId && kfInstance?.api) {
    activityInstanceId = await fetchITAgentActivityInstanceId(kfInstance, row);
  }
  if (!instanceId || !activityInstanceId) {
    throw new Error('Could not resolve IT Agent activity for this ticket.');
  }

  const options = buildAgentReassignPayload(row, targetUser, note);
  return reassignITAgentTicketWithOptions(kfInstance, instanceId, activityInstanceId, options);
}

function buildSlaPausePayload(row) {
  const timing = getSlaTiming(row);
  const now = new Date().toISOString();
  const payload = {
    [IT_AGENT_FORM_FIELDS.slaIsPaused]: true,
    [IT_AGENT_FORM_FIELDS.slaPausedAt]: now,
  };
  if (Number.isFinite(timing.elapsedMinutes)) {
    payload[IT_AGENT_FORM_FIELDS.slaElapsedMinutes] = Math.round(timing.elapsedMinutes);
  }
  if (Number.isFinite(timing.remainingMinutes)) {
    payload[IT_AGENT_FORM_FIELDS.slaRemainingMinutes] = Math.round(timing.remainingMinutes);
  }
  return payload;
}

function buildSlaResumePayload(row) {
  const timing = getSlaTiming(row);
  const now = new Date().toISOString();
  const payload = {
    [IT_AGENT_FORM_FIELDS.slaIsPaused]: false,
    [IT_AGENT_FORM_FIELDS.slaLastResumedAt]: now,
  };
  if (Number.isFinite(timing.elapsedMinutes)) {
    payload[IT_AGENT_FORM_FIELDS.slaElapsedMinutes] = Math.round(timing.elapsedMinutes);
  }
  if (Number.isFinite(timing.remainingMinutes)) {
    payload[IT_AGENT_FORM_FIELDS.slaRemainingMinutes] = Math.round(timing.remainingMinutes);
  }
  return payload;
}

function getRequestTrackingColKeys() {
  const col = getActiveServiceCol();
  return {
    table: col.requestTracking || REQUEST_TRACKING_NATIVE_FIELDS.table,
    status: col.rtStatus || REQUEST_TRACKING_NATIVE_FIELDS.status,
    comments: col.rtComments || REQUEST_TRACKING_NATIVE_FIELDS.comments,
    dateTime: col.rtDateTime || REQUEST_TRACKING_NATIVE_FIELDS.dateTime,
  };
}

function parseRequestTrackingEntry(entry, keys) {
  if (!entry || typeof entry !== 'object') return null;
  const status = normalizeText(
    entry[keys.status] ?? entry.Statu_1 ?? entry.Status,
  );
  const comments = normalizeText(
    entry[keys.comments] ?? entry.Comments,
  );
  const dateTimeRaw = entry[keys.dateTime] ?? entry.Date__Time;
  const parsedDate = parseKissflowDateTime(dateTimeRaw);
  const dateTime = parsedDate
    ? formatDisplayDateTime(dateTimeRaw)
    : normalizeText(dateTimeRaw);
  if (!status && !comments && !dateTime) return null;
  return {
    id: entry._id || '',
    status: status || '—',
    comments,
    dateTime: dateTime || '—',
    sortKey: parsedDate?.getTime() ?? 0,
  };
}

export function parseRequestTrackingFromItem(item) {
  if (!item) return [];
  const keys = getRequestTrackingColKeys();
  const raw = item?.[keys.table]
    ?? item?.[REQUEST_TRACKING_NATIVE_FIELDS.table]
    ?? item?.Request_Tracking;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((entry) => parseRequestTrackingEntry(entry, keys))
    .filter(Boolean)
    .sort((a, b) => a.sortKey - b.sortKey);
}

function formatRequestTrackingDateTimeForKf(date = new Date()) {
  return formatDisplayDateTime(date);
}

function generateRequestTrackingRowId() {
  const suffix = Math.random().toString(36).slice(2, 12);
  return `Request_Tracking_${suffix}`;
}

async function appendRequestTrackingEntry(kfInstance, instanceId, activityInstanceId, { status, comments = '' }) {
  const F = REQUEST_TRACKING_NATIVE_FIELDS;
  const rowId = generateRequestTrackingRowId();
  const now = formatRequestTrackingDateTimeForKf();

  await saveAgentFormFields(kfInstance, instanceId, activityInstanceId, {
    [F.table]: [{ _id: rowId, _is_created: true }],
  });

  await saveAgentFormFields(kfInstance, instanceId, activityInstanceId, {
    [F.table]: [{ _id: rowId, [F.status]: status }],
  });

  if (comments) {
    await saveAgentFormFields(kfInstance, instanceId, activityInstanceId, {
      [F.table]: [{ _id: rowId, [F.comments]: comments }],
    });
  }

  await saveAgentFormFields(kfInstance, instanceId, activityInstanceId, {
    [F.table]: [{ _id: rowId, [F.dateTime]: now }],
  });
}

async function logRequestTrackingEvents(kfInstance, row, events) {
  if (!events?.length) return;
  const { instanceId, activityInstanceId } = resolveAgentSubmitIdsFromReport(row);
  if (!instanceId || !activityInstanceId) return;
  for (const event of events) {
    await appendRequestTrackingEntry(kfInstance, instanceId, activityInstanceId, event);
  }
}

function buildTrackingEventsForAgentSubmit(formData) {
  const status = normalizeText(formData.itemStatus);
  const token = getCanonicalAgentItemStatusToken(status);
  const events = [];

  if (token === 'onhold') {
    events.push({
      status: 'On Hold',
      comments: normalizeText(formData.holdReason),
    });
  } else if (token === 'pendinguserresponse') {
    events.push({
      status: 'Pending from User',
      comments: normalizeText(formData.pendingReason),
    });
  } else if (token === 'resolved') {
    events.push({
      status: 'Resolved',
      comments: normalizeText(formData.solution),
    });
  } else if (token === 'cancelled') {
    events.push({
      status: 'Cancelled',
      comments: normalizeText(formData.cancellationReason),
    });
  } else if (token === 'inprogress') {
    events.push({ status: 'In Progress' });
  }

  return events;
}

/** Accept ticket — (1) set In Progress, (2) reassign from IT Agents pool to current agent. */
export async function acceptITAgentTicket(kfInstance, row) {
  if (!kfInstance?.api && !getITProcess(kfInstance)?.updateItem) {
    throw new Error('Accept not available — open inside Kissflow');
  }

  const { instanceId, activityInstanceId } = resolveAgentSubmitIdsFromReport(row);
  if (!instanceId || !activityInstanceId) {
    throw new Error('Could not resolve IT Agent activity for this ticket.');
  }

  const statusPayload = {
    _id: instanceId,
    [IT_AGENT_FORM_FIELDS.itemStatus]: 'In Progress',
  };
  await saveAgentFormFields(kfInstance, instanceId, activityInstanceId, statusPayload);

  await logRequestTrackingEvents(kfInstance, row, [
    { status: 'Accepted' },
    { status: 'In Progress' },
  ]);

  await reassignITAgentTicket(kfInstance, instanceId, activityInstanceId, row, kfInstance?.user);

  return { success: 'Ticket accepted' };
}

/** Resume from Hold / Pending with User — back to In Progress (status only). */
export async function resumeITAgentTicket(kfInstance, row) {
  if (!kfInstance?.api && !getITProcess(kfInstance)?.updateItem) {
    throw new Error('Resume not available — open inside Kissflow');
  }

  const { instanceId, activityInstanceId } = resolveAgentSubmitIdsFromReport(row);
  if (!instanceId || !activityInstanceId) {
    throw new Error('Could not resolve IT Agent activity for this ticket.');
  }

  const payload = {
    [IT_AGENT_FORM_FIELDS.itemStatus]: 'In Progress',
  };

  await saveAgentFormFields(kfInstance, instanceId, activityInstanceId, payload);

  await logRequestTrackingEvents(kfInstance, row, [{ status: 'In Progress' }]);

  return { success: 'Ticket resumed' };
}

function normalizeAgentItemStatusForSave(statusLabel) {
  const token = getCanonicalAgentItemStatusToken(statusLabel);
  if (token === 'resolved') return 'Resolved';
  return statusLabel;
}

function buildAgentSubmitPayload(formData) {
  const payload = {
    [IT_AGENT_FORM_FIELDS.itemStatus]: normalizeAgentItemStatusForSave(formData.itemStatus),
  };

  const solution = String(formData.solution ?? '').trim();
  const holdReason = String(formData.holdReason ?? '').trim();
  const pendingReason = String(formData.pendingReason ?? '').trim();
  const cancellationReason = String(formData.cancellationReason ?? '').trim();

  if (solution) payload[IT_AGENT_FORM_FIELDS.solution] = solution;
  if (holdReason) payload[IT_AGENT_FORM_FIELDS.holdReason] = holdReason;
  if (pendingReason) payload[IT_AGENT_FORM_FIELDS.pendingReason] = pendingReason;
  if (cancellationReason) payload[IT_AGENT_FORM_FIELDS.cancellationReason] = cancellationReason;

  return payload;
}

function parseAgentMutationResponse(resp, fallbackMessage) {
  const successText = normalizeText(
    resp?.success || resp?.Success || resp?.message || resp?.en_message,
  );
  if (resp?.status === 'error' || resp?.error_code) {
    throw new Error(successText || 'Request failed');
  }
  if (successText && !/success|saved|submitted|updated/i.test(successText)) {
    throw new Error(successText);
  }
  return resp || { success: fallbackMessage };
}

export function isAgentWorkflowSubmitStatus(itemStatus) {
  return getCanonicalAgentItemStatusToken(itemStatus) === 'resolved'
    || getCanonicalAgentItemStatusToken(itemStatus) === 'cancelled';
}

export function isAgentPausingStatus(itemStatus) {
  const token = getCanonicalAgentItemStatusToken(itemStatus);
  return token === 'onhold' || token === 'pendinguserresponse';
}

export function validateAgentServiceWorkForm(form) {
  const status = normalizeText(form?.itemStatus);
  if (!status) return 'Please select Item Status';

  const token = getCanonicalAgentItemStatusToken(status);
  if (token === 'onhold' && !normalizeText(form?.holdReason)) return 'Reason for Hold is required';
  if (token === 'pendinguserresponse' && !normalizeText(form?.pendingReason)) {
    return 'Reason for Pending is required';
  }
  if (token === 'cancelled' && !normalizeText(form?.cancellationReason)) {
    return 'Cancellation Reason is required';
  }
  if (token === 'resolved' && !normalizeText(form?.solution)) {
    return 'Solution is required';
  }
  return '';
}

/**
 * Kissflow IT Agent service updates (accept / resume / save / submit) require
 * process instance `_id` in the request body — same as CR approver saves.
 */
function withAgentInstanceBody(instanceId, payload = {}) {
  const id = normalizeText(instanceId);
  if (!id) return { ...payload };
  return { ...payload, _id: id };
}

async function saveAgentFormFields(kfInstance, instanceId, activityInstanceId, payload) {
  const id = normalizeText(instanceId);
  if (!id) throw new Error('Missing instance id for this task');
  // Kissflow expects process instance _id in body (root _id), not only in the URL.
  const body = { ...payload, _id: id };
  const process = getITProcess(kfInstance);
  if (process?.updateItem) {
    await process.updateItem({
      instanceId: id,
      activityInstanceId,
      data: body,
    });
    return { success: 'Saved successfully' };
  }

  const paths = buildITProcessApiPaths(kfInstance);
  const updatePath = paths.instanceWithActivityPath(id, activityInstanceId);
  const saveResp = await kfMutateJson(kfInstance, updatePath, {
    method: 'POST',
    body,
  });
  return parseAgentMutationResponse(saveResp, 'Saved successfully');
}

export async function submitITAgentWork(kfInstance, row, formData) {
  if (!kfInstance?.api && !getITProcess(kfInstance)?.updateItem) {
    throw new Error('Submit not available — open inside Kissflow');
  }

  const itemStatus = normalizeText(formData.itemStatus);
  if (!itemStatus) throw new Error('Please select Item Status');

  const isWorkflowSubmit = isAgentWorkflowSubmitStatus(itemStatus);

  const { instanceId, activityInstanceId } = resolveAgentSubmitIdsFromReport(row);
  if (!instanceId) throw new Error('Missing instance id for this task');
  if (!activityInstanceId) {
    throw new Error('Could not resolve IT Agent activity for this task. Open the item in Kissflow once, then retry.');
  }

  const payload = buildAgentSubmitPayload(formData);
  const body = withAgentInstanceBody(instanceId, payload);
  const paths = buildITProcessApiPaths(kfInstance);
  const process = getITProcess(kfInstance);
  const trackingEvents = buildTrackingEventsForAgentSubmit(formData);

  if (isWorkflowSubmit) {
    await saveAgentFormFields(kfInstance, instanceId, activityInstanceId, payload);
    await logRequestTrackingEvents(kfInstance, row, trackingEvents);

    if (process?.submitItem) {
      await process.submitItem({ instanceId, activityInstanceId });
      return { success: 'Submitted successfully' };
    }

    const submitResp = await kfMutateJson(
      kfInstance,
      paths.instanceSubmitPath(instanceId, activityInstanceId),
      { method: 'POST', body },
    );
    return parseAgentMutationResponse(submitResp, 'Submitted successfully');
  }

  await logRequestTrackingEvents(kfInstance, row, trackingEvents);
  return saveAgentFormFields(kfInstance, instanceId, activityInstanceId, payload);
}

export function getITProcess(kfInstance) {
  const processId = getActiveServiceProcessId();
  return kfInstance?.app?.getProcess?.(processId) || kfInstance?.getProcess?.(processId) || null;
}

/** Live work StepField (PickUp / Solution / Dependency) — never ReOpen Window leftovers. */
function inferLiveWorkStepFromStepFields(rowOrItem) {
  const col = getActiveServiceCol() || {};
  const extrovis = isExtrovisServiceDashboardContext();
  const ranked = extrovis
    ? [
      [col.techSupportAfterDependencyActivity, 'IT Tech Support After Dependency'],
      [col.dependencyAssigneeActivity, 'Dependency Assigne'],
      [col.itAgentActivity, 'IT Agent Solution'],
      [col.itAgentPickupActivity, 'IT Agent PickUp'],
    ]
    : [
      [col.techSupportAfterDependencyActivity, 'IT Tech Support After Dependency'],
      [col.dependencyAssigneeActivity, 'Dependency Assigne'],
      [col.itAgentRefexActivity || col.itAgentActivity, 'IT Tech Support'],
      [col.itAgentPickupActivity || col.itTechActivity, 'IT Tech'],
      [col.itHeadApprovalActivity, 'IT Head Approval'],
      [col.itManagerApprovalActivity, 'IT Manager Approval'],
      [col.l2ApprovalActivity, 'L2 Approval'],
      [col.l1ApprovalActivity, 'L1 Approval'],
    ];
  for (const [columnKey, stepName] of ranked) {
    if (hasStepFieldInProgress(rowOrItem, columnKey)) return stepName;
  }
  return '';
}

/** Current workflow step — live pending/mytask and in-progress work StepFields beat stale report/reopen. */
export function getCurrentStepValue(itemOrRow) {
  if (!itemOrRow) return '';
  const task = itemOrRow?.techSupportMyTaskItem || itemOrRow?.employeeMyTaskItem;
  const fromTask = normalizeText(task?._current_step);
  if (fromTask && fromTask !== '—') return fromTask;

  const fromWorkField = inferLiveWorkStepFromStepFields(itemOrRow);
  if (fromWorkField) return fromWorkField;

  const raw = itemOrRow.raw ?? itemOrRow;
  const serviceCol = getActiveServiceCol();
  const step =
    raw?.[serviceCol.currentStep]
    ?? getItemValue(raw, [serviceCol.currentStep, FIELD.currentStep])
    ?? raw?.[COL.currentStep]
    ?? raw?.Column_9WDj8dTOIF
    ?? raw?.Column_27XUPVQc7e
    ?? raw?._current_step
    ?? itemOrRow?.currentStep
    ?? getItemValue(raw, FIELD.currentStep);
  const normalized = normalizeText(step);
  if (normalized && normalized !== '—') return normalized;

  // Only for still-open tickets: blank `_current_step` → last_completed_step_name.
  // Never for Completed — last step is often IT Tech Reopen / Employee Feedback and
  // that falsely marked every Me Closed row as "Reopen window".
  const systemStatus = normalizeText(
    itemOrRow?.systemStatus
    || itemOrRow?.workflowStatus
    || raw?._status
    || getItemValue(raw, [serviceCol.systemStatus, FIELD.systemStatus]),
  ).toLowerCase().replace(/[\s_-]+/g, '');
  if (
    itemOrRow?.isProcessCompleted === true
    || systemStatus === 'completed'
    || systemStatus === 'complete'
    || systemStatus === 'withdrawn'
  ) {
    return '';
  }

  const lastCompleted = normalizeText(
    itemOrRow?.lastCompletedStep
    ?? raw?.[serviceCol.lastCompletedStep]
    ?? getItemValue(raw, [serviceCol.lastCompletedStep, FIELD.lastCompletedStep])
    ?? raw?.[COL.lastCompletedStep],
  );
  return lastCompleted && lastCompleted !== '—' ? lastCompleted : '';
}

function isBlankWorkflowStep(step) {
  const token = normalizeText(step);
  return !token || token === '—';
}

/** Live Kissflow activity Id from pending/my-task item or merged row. */
function getLiveWorkflowActivityId(rowOrItem) {
  if (!rowOrItem) return '';
  const task = rowOrItem?.techSupportMyTaskItem || rowOrItem?.employeeMyTaskItem;
  const raw = rowOrItem?.raw ?? rowOrItem;
  return normalizeText(
    task?._activity_id
    || task?.Activity_ID
    || task?.activity_id
    || raw?._activity_id
    || raw?.Activity_ID
    || raw?.activity_id
    || rowOrItem?._activity_id,
  );
}

function hasStepFieldInProgress(rowOrItem, columnKey) {
  const col = normalizeText(columnKey);
  if (!col) return false;
  return Boolean(pickSrInProgressActivityFromColumn(rowOrItem?.raw ?? rowOrItem, col));
}

function stepNameLooksLikeL1(step) {
  const s = normalizeText(step).toLowerCase();
  if (!s) return false;
  return (
    s === 'l1 approval'
    || s === 'l1 manager'
    || s.includes('l1 approval')
    || s.includes('l1 manager')
    || (s.includes('l1') && s.includes('approv'))
  );
}

function stepNameLooksLikeL2(step) {
  const s = normalizeText(step).toLowerCase();
  if (!s) return false;
  return (
    s === 'l2 approval'
    || s === 'l2 manager'
    || s.includes('l2 approval')
    || s.includes('l2 manager')
    || (s.includes('l2') && s.includes('approv'))
  );
}

function stepNameLooksLikeITManagerApproval(step) {
  const s = normalizeText(step).toLowerCase();
  if (!s) return false;
  if (s.includes('it head')) return false;
  return (
    s.includes('it manager approval')
    || s === IT_MANAGER_APPROVAL_STEP.toLowerCase()
    || s === IT_MANAGER_STEP.toLowerCase()
    || (s.includes('it manager') && s.includes('approv'))
  );
}

function stepNameLooksLikeITHeadApproval(step) {
  const s = normalizeText(step).toLowerCase();
  if (!s) return false;
  return s.includes('it head approval')
    || s === IT_HEAD_APPROVAL_STEP.toLowerCase()
    || (s.includes('it head') && s.includes('approv'));
}

/** L1 Manager approval — Service_Items_Refex_A00 StepField. */
export function isL1ApprovalStep(rowOrItem) {
  if (isRefexServiceProcessCompleted(rowOrItem) || isRefexServiceRowResolved(rowOrItem)) return false;
  if (getLiveWorkflowActivityId(rowOrItem) === REFEX_L1_APPROVAL_ACTIVITY_ID) return true;
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  if (stepNameLooksLikeL2(step) || stepNameLooksLikeITManagerApproval(step) || stepNameLooksLikeITHeadApproval(step)) {
    return false;
  }
  if (stepNameLooksLikeL1(step)) return true;
  const col = getActiveServiceCol()?.l1ApprovalActivity;
  const legacy = getActiveServiceCol()?.l1ApprovalActivityLegacy;
  // Prefer live StepField when current step is blank/stale.
  return (isBlankWorkflowStep(step) || !step) && (
    hasStepFieldInProgress(rowOrItem, col)
    || hasStepFieldInProgress(rowOrItem, legacy)
  );
}

/** L2 Manager approval — Service_Items_Refex_A00 StepField. */
export function isL2ApprovalStep(rowOrItem) {
  if (isRefexServiceProcessCompleted(rowOrItem) || isRefexServiceRowResolved(rowOrItem)) return false;
  if (getLiveWorkflowActivityId(rowOrItem) === REFEX_L2_APPROVAL_ACTIVITY_ID) return true;
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  if (stepNameLooksLikeL1(step) || stepNameLooksLikeITManagerApproval(step) || stepNameLooksLikeITHeadApproval(step)) {
    return false;
  }
  if (stepNameLooksLikeL2(step)) return true;
  const col = getActiveServiceCol()?.l2ApprovalActivity;
  const legacy = getActiveServiceCol()?.l2ApprovalActivityLegacy;
  return (isBlankWorkflowStep(step) || !step) && (
    hasStepFieldInProgress(rowOrItem, col)
    || hasStepFieldInProgress(rowOrItem, legacy)
  );
}

/** IT Manager Approval — after Head path / before IT Tech. */
export function isITManagerApprovalStep(rowOrItem) {
  if (isRefexServiceProcessCompleted(rowOrItem) || isRefexServiceRowResolved(rowOrItem)) return false;
  if (getLiveWorkflowActivityId(rowOrItem) === REFEX_IT_MANAGER_APPROVAL_ACTIVITY_ID) return true;
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  if (stepNameLooksLikeL1(step) || stepNameLooksLikeL2(step) || stepNameLooksLikeITHeadApproval(step)) {
    return false;
  }
  if (stepNameLooksLikeITManagerApproval(step)) return true;
  const col = getActiveServiceCol()?.itManagerApprovalActivity;
  const legacy = getActiveServiceCol()?.itManagerApprovalActivityLegacy;
  return (isBlankWorkflowStep(step) || !step) && (
    hasStepFieldInProgress(rowOrItem, col)
    || hasStepFieldInProgress(rowOrItem, legacy)
  );
}

/** IT Head Approval — after IT Manager, before IT Tech. */
export function isITHeadApprovalStep(rowOrItem) {
  if (isRefexServiceProcessCompleted(rowOrItem) || isRefexServiceRowResolved(rowOrItem)) return false;
  if (getLiveWorkflowActivityId(rowOrItem) === REFEX_IT_HEAD_APPROVAL_ACTIVITY_ID) return true;
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  if (stepNameLooksLikeL1(step) || stepNameLooksLikeL2(step) || stepNameLooksLikeITManagerApproval(step)) {
    return false;
  }
  if (stepNameLooksLikeITHeadApproval(step)) return true;
  const col = getActiveServiceCol()?.itHeadApprovalActivity;
  const legacy = getActiveServiceCol()?.itHeadApprovalActivityLegacy;
  return (isBlankWorkflowStep(step) || !step) && (
    hasStepFieldInProgress(rowOrItem, col)
    || hasStepFieldInProgress(rowOrItem, legacy)
  );
}

export function isRefexServiceApprovalStep(rowOrItem) {
  return isL1ApprovalStep(rowOrItem)
    || isL2ApprovalStep(rowOrItem)
    || isITManagerApprovalStep(rowOrItem)
    || isITHeadApprovalStep(rowOrItem);
}

function isLiveItTechReopenTaskOverlay(row) {
  const task = row?.techSupportMyTaskItem || row?.employeeMyTaskItem;
  if (!task) return false;
  const act = normalizeText(task._activity_id || task.Activity_ID || task.activity_id);
  if (
    act === REFEX_IT_TECH_REOPEN_ACTIVITY_ID
    || act === EXTROVIS_EMPLOYEE_FEEDBACK_ACTIVITY_ID
    || act === (getActiveDashboardProfile()?.itTechReopenActivityId || '')
    || act === (getActiveDashboardProfile()?.employeeFeedbackActivityId || '')
  ) {
    return true;
  }
  const step = normalizeText(task._current_step || task.Current_Step).toLowerCase();
  return step.includes('it tech reopen')
    || step.includes('reopen window')
    || step.includes('employee feedback');
}

/**
 * IT Tech Reopen / ReOpen Window — only when the task is in the signed-in user's
 * live pending bucket (not AppRole-generic assignment).
 */
export function matchesRefexApproverReopenClosedRow(row, user = null, role = 'first') {
  if (!row) return false;
  void role;
  if (isRefexServiceRejectedTicket(row)) return false;
  if (isRefexServiceProcessCompleted(row)) return false;
  if (!(isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row) || isLiveItTechReopenTaskOverlay(row))) {
    return false;
  }

  // Authoritative: pending/{reopen} returned this instance for the current user.
  if (row.liveReopenPendingKnown === true) {
    return row.isLiveReopenPending === true;
  }

  if (isLiveItTechReopenTaskOverlay(row)) return true;
  if (row.isLiveReopenPending === true) return true;
  if (row.isLiveBucketPending === true && (
    isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)
  )) {
    return true;
  }

  // Without a live bucket stamp, do not invent AppRole reopen rows.
  return false;
}

/**
 * Pending Approval for IT Manager / IT Head service dashboards.
 * - Me: role pending queue — personal assignee, IT Manager/Head AppRole pool
 *   (all Working Knowledge members see the same pool), or live pending/mytask items.
 *   Manager → pending/Activity_-_FFwHdMSN; Head → pending/Activity_ZPJhIX0l3A.
 * - My Team: L1 + L2 + IT Manager Approval (+ IT Head Approval on Head dashboard).
 *   Personally assigned role-step tasks stay under Me for that role.
 */
export function matchesRefexApproverPendingTaskRow(row, user = null, scope = 'me', role = 'first') {
  if (!row) return false;

  // Extrovis has no L1/L2 approval Pending. Do not apply Refex liveApproval
  // membership (PickUp-only) — that blocked Solution My Tickets from opening.
  if (isExtrovisServiceDashboardContext()) {
    if (!user) return false;
    return matchesExtrovisMyTaskRow(row, user);
  }

  // IT Tech Reopen is assigned to IT Manager / IT Head — Closed tab, not Pending Approval.
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row) || isLiveItTechReopenTaskOverlay(row)) {
    return false;
  }

  if (
    isRefexServiceRejectedTicket(row)
    || isRefexServiceProcessCompleted(row)
    || isRefexServiceRowResolved(row)
    || isAgentItemStatusResolved(row)
    || isAgentItemStatusCancelled(row)
    || isTerminalStatusToken(readBusinessCloseStatus(row))
  ) {
    return false;
  }

  // Me only — live pending/{activity} (apply_preference) is source of truth after
  // approve/reject. Team / Admin (all) monitoring must keep L1/L2 from the report:
  // Head/Manager pending/activity/count does not include other people's L1/email tickets.
  if (
    scope !== 'team'
    && scope !== 'all'
    && row.liveApprovalPendingKnown === true
    && !row.isLiveApprovalPending
  ) {
    return false;
  }

  const atL1OrL2 = isL1ApprovalStep(row) || isL2ApprovalStep(row);
  const atManagerApproval = isITManagerApprovalStep(row);
  const atHeadApproval = isITHeadApprovalStep(row);

  // My Team — monitoring list (role-aware).
  // Admin (scope=all) — every approval step, including personally assigned ones.
  if (scope === 'all') {
    return atL1OrL2 || atManagerApproval || atHeadApproval;
  }
  if (scope === 'team') {
    if (role === 'final') {
      // Head Team: L1 + L2 + Manager + Head Approval.
      if (!(atL1OrL2 || atManagerApproval || atHeadApproval)) return false;
      // Head Me owns personally assigned Head-approval tasks.
      if (atHeadApproval && user && isPersonallyAssignedToUser(row, user)) return false;
      return true;
    }
    // Manager Team: L1 + L2 + IT Manager Approval.
    if (!(atL1OrL2 || atManagerApproval)) return false;
    if (atManagerApproval && user && isPersonallyAssignedToUser(row, user)) return false;
    return true;
  }

  // Me — Manager → IT Manager Approval; Head → IT Head Approval (no L1/L2 lists).
  if (role === 'monitoring') {
    return atL1OrL2 || atManagerApproval || atHeadApproval;
  }
  if (!user) return false;
  const atMyRoleStep = role === 'final' ? atHeadApproval : atManagerApproval;
  if (!atMyRoleStep) return false;

  // Only show when the approval task is actually in the signed-in user's bucket.
  if (row.liveApprovalPendingKnown === true) {
    return row.isLiveApprovalPending === true;
  }
  if (row.isLiveBucketPending === true || row.isLiveApprovalPending === true) return true;
  if (isLiveRoleApprovalPendingItem(row, role)) return true;

  // Do not invent AppRole-generic pending rows when the bucket is empty.
  return false;
}

/** True when assignee is the IT Manager / IT Head AppRole pool (shared by all members). */
function isServiceApprovalAppRolePool(row, role = 'first') {
  const lists = [
    expandAssigneeEntries(row?.assignedToRaw),
    expandAssigneeEntries(getCurrentTaskAssigneeList(row)),
  ];
  for (const list of lists) {
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      const kind = normalizeText(entry.Kind || entry.kind).toLowerCase();
      if (kind !== 'approle' && kind !== 'role') continue;
      const name = normalizeText(entry.Name || entry.name).toLowerCase();
      if (!name) continue;
      if (role === 'final') {
        // IT Head / IT Head Refex AppRole — do not treat Manager / Agents as Head pool.
        if (name.includes('it manager') || name.includes('it agent')) continue;
        if (
          name === 'it head'
          || name === 'it head refex'
          || name.includes('it head')
          || (name.includes('head') && name.includes('approv'))
        ) {
          return true;
        }
        continue;
      }
      // IT Manager / IT Manager Refex AppRole — do not treat IT Head / Agents as Manager pool.
      if (name.includes('it head') || name.includes('it agent')) continue;
      if (
        name === 'it manager'
        || name === 'it manager refex'
        || name.includes('it manager')
        || (name.includes('manager') && name.includes('approv'))
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Row came from pending/{roleActivityId} or myitems for this approval step. */
function isLiveRoleApprovalPendingItem(row, role = 'first') {
  const expected = role === 'final'
    ? REFEX_IT_HEAD_APPROVAL_ACTIVITY_ID
    : REFEX_IT_MANAGER_APPROVAL_ACTIVITY_ID;
  if (getLiveWorkflowActivityId(row) === expected) return true;
  const task = row?.techSupportMyTaskItem;
  if (!task) return false;
  const step = normalizeText(task._current_step || task.Current_Step).toLowerCase();
  if (role === 'final') return stepNameLooksLikeITHeadApproval(step);
  return stepNameLooksLikeITManagerApproval(step);
}

/** Open Tickets on Manager/Head monitoring — agent pipeline (not approvals, not closed/reopen). */
export function isRefexMonitoringOpenTicketRow(row) {
  if (!row) return false;
  if (!isRefexServiceOpenTicket(row, { excludeApprovals: true })) return false;

  if (matchesOpenPickupTicketRow(row, null)) return true;
  if (isRefexTechSupportOwnedStep(row)) return true;
  if (isDependencyAssigneeStep(row)) return true;
  if (isTechSupportAfterDependencyStep(row)) return true;
  return isITAgentStep(row);
}

/** True when a human user (not only an AppRole pool shell) is the assignee. */
export function isPersonallyAssignedToUser(row, user) {
  if (!row || !user) return false;
  const userId = normalizeText(user?._id || user?.Id);
  const email = normalizeEmail(user?.Email);
  const lists = [
    expandAssigneeEntries(row?.assignedToRaw),
    expandAssigneeEntries(getCurrentTaskAssigneeList(row)),
  ];
  for (const list of lists) {
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      const kind = normalizeText(entry.Kind || entry.kind).toLowerCase();
      if (kind === 'approle' || kind === 'role') continue;
      const entryId = normalizeText(entry._id || entry.Id || entry.id);
      const entryEmail = normalizeEmail(entry.Email || entry.email);
      if (userId && entryId && userId === entryId) return true;
      if (email && entryEmail && email === entryEmail) return true;
    }
  }
  return false;
}

export function isITAgentStep(rowOrItem) {
  if (isRefexServiceApprovalStep(rowOrItem)) return false;
  if (isEmployeeApprovalRefexStep(rowOrItem)) return false;
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  return step === IT_AGENT_STEP.toLowerCase()
    || step === IT_AGENT_REFEX_STEP.toLowerCase()
    || step === IT_TECH_SUPPORT_REFEX_STEP.toLowerCase()
    || step === IT_TECH_REFEX_STEP.toLowerCase()
    || step === IT_TECH_PICKUP_REFEX_STEP.toLowerCase()
    || step === 'it tech'
    || step === IT_AGENT_EXTROVIS_STEP.toLowerCase()
    || step === IT_AGENT_PICKUP_STEP.toLowerCase()
    || step === IT_AGENT_SOLUTION_STEP.toLowerCase()
    || step.includes('it agent pickup')
    || step.includes('it agent pick up')
    || step.includes('it agent solution')
    || step.includes('it tech pickup')
    || step.includes('it tech pick up')
    || (step.includes('it tech support') && !step.includes('reopen'));
}

/** Extrovis open pool — Start → IT Agent PickUp (available to all IT Agents Extrovis). */
export function isExtrovisAgentPickupStep(rowOrItem) {
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  return step === IT_AGENT_PICKUP_STEP.toLowerCase()
    || step.includes('it agent pickup')
    || step.includes('it agent pick up');
}

/** Refex IT Tech step — round-robin auto-assign entry (legacy name: IT Tech Pickup). */
export function isRefexTechPickupStep(rowOrItem) {
  if (isRefexServiceProcessCompleted(rowOrItem)) return false;
  if (isRefexServiceApprovalStep(rowOrItem) && !isBlankWorkflowStep(getCurrentStepValue(rowOrItem))) {
    return false;
  }
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  const isSpecificNonPool = step.includes('tech support')
    || step.includes('reopen')
    || step.includes('after dependency')
    || (step.includes('dependency') && !step.includes('pickup'));
  if (!isSpecificNonPool) {
    if (
      step === 'it tech'
      || step === IT_TECH_REFEX_STEP.toLowerCase()
      || step === IT_TECH_PICKUP_REFEX_STEP.toLowerCase()
      || step.includes('it tech pickup')
      || step.includes('it tech pick up')
    ) {
      return true;
    }
    if (getLiveWorkflowActivityId(rowOrItem) === IT_TECH_REFEX_ACTIVITY_ID) {
      if (!step || isBlankWorkflowStep(step)) return true;
    }
  }
  // Production fallback — blank current step with IT Tech StepField InProgress.
  const col = getActiveServiceCol()?.itTechActivity
    || getActiveServiceCol()?.itAgentPickupActivity;
  const legacy = getActiveServiceCol()?.itAgentPickupActivityLegacy;
  return isBlankWorkflowStep(step) && (
    hasStepFieldInProgress(rowOrItem, col)
    || hasStepFieldInProgress(rowOrItem, legacy)
  );
}

/** Extrovis owned work — after pickup (Refex Tech Support equivalent). */
export function isExtrovisAgentSolutionStep(rowOrItem) {
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  return step === IT_AGENT_SOLUTION_STEP.toLowerCase()
    || step.includes('it agent solution');
}

/** Refex owned work — IT Tech Support after Head approval (not IT Tech / Reopen). */
export function isRefexTechSupportOwnedStep(rowOrItem) {
  if (isRefexServiceProcessCompleted(rowOrItem)) return false;
  if (isRefexTechPickupStep(rowOrItem)) return false;
  if (isEmployeeApprovalRefexStep(rowOrItem)) return false;
  if (isRefexServiceApprovalStep(rowOrItem) && !isBlankWorkflowStep(getCurrentStepValue(rowOrItem))) {
    return false;
  }
  const step = getCurrentStepValue(rowOrItem).toLowerCase();
  if (
    step === IT_TECH_SUPPORT_REFEX_STEP.toLowerCase()
    || step === IT_AGENT_REFEX_STEP.toLowerCase()
    || (step.includes('it tech support') && !step.includes('after dependency') && !step.includes('reopen'))
    || step.includes('it agent refex')
  ) {
    return true;
  }
  // Production fallback — blank current step with Tech Support StepField InProgress.
  const col = getActiveServiceCol()?.itAgentRefexActivity || getActiveServiceCol()?.itAgentActivity;
  const legacy = getActiveServiceCol()?.itAgentRefexActivityLegacy;
  return isBlankWorkflowStep(step) && (
    hasStepFieldInProgress(rowOrItem, col)
    || hasStepFieldInProgress(rowOrItem, legacy)
  );
}

/** Shared open-pool check — Extrovis PickUp or Refex Tech Pickup. */
export function isAgentOpenPickupStep(rowOrItem) {
  return isExtrovisAgentPickupStep(rowOrItem) || isRefexTechPickupStep(rowOrItem);
}

/** Open Tickets — Extrovis IT Agent PickUp (IT Agents Extrovis pool). */
export function matchesExtrovisOpenTicketRow(row, _user = null) {
  if (!row) return false;
  if (isRefexServiceClosedTicket(row) || isRefexServiceRejectedTicket(row) || isAgentItemStatusCancelled(row)) {
    return false;
  }
  if (isLiveBucketPendingRow(row) && normalizeText(row?.liveBucketStepGroup).toLowerCase() === 'open') {
    return true;
  }
  return isExtrovisAgentPickupStep(row);
}

/**
 * Open Tickets — Refex IT Tech (round robin).
 * With a user: only RR tickets assigned to that person (Me / agent Open).
 * Without a user: any ticket at IT Tech (Manager/Head monitoring).
 */
export function matchesRefexOpenTicketRow(row, user = null) {
  if (!row) return false;
  if (isRefexServiceClosedTicket(row) || isRefexServiceRejectedTicket(row) || isAgentItemStatusCancelled(row)) {
    return false;
  }
  if (isLiveBucketPendingRow(row) && normalizeText(row?.liveBucketStepGroup).toLowerCase() === 'open') {
    if (!user) return true;
    if (row?.techSupportMyTaskItem && isCurrentActiveTaskAssignedToUser(row, user)) return true;
    if (isPersonallyAssignedToUser(row, user)) return true;
    if (isAgentTicketAssignedToUser(row, user) && !isAgentPoolAssignment(row)) return true;
    // pending/{IT Tech} in this user's bucket — Kissflow often omits assignee.
    return true;
  }
  if (!isRefexTechPickupStep(row)) return false;
  if (!user) return true;
  // Round-robin assigns a person — never treat another agent's RR ticket as my Open.
  if (row?.techSupportMyTaskItem && isCurrentActiveTaskAssignedToUser(row, user)) return true;
  if (isPersonallyAssignedToUser(row, user)) return true;
  if (isAgentTicketAssignedToUser(row, user) && !isAgentPoolAssignment(row)) return true;
  return false;
}

/** Open Tickets — Extrovis shared PickUp pool, or Refex RR-assigned IT Tech. */
export function matchesOpenPickupTicketRow(row, user = null) {
  if (isExtrovisServiceDashboardContext()) return matchesExtrovisOpenTicketRow(row, user);
  if (isRefexServiceDashboardContext()) return matchesRefexOpenTicketRow(row, user);
  return matchesExtrovisOpenTicketRow(row, user) || matchesRefexOpenTicketRow(row, user);
}

/**
 * Refex IT Agent Open Tickets — only this user's live work:
 * IT Tech RR assigned to them, or IT Tech Support / Dependency / After Dependency pending for them.
 * Never other agents' tickets, never participated-only history.
 */
export function matchesRefexAgentOwnOpenTickets(row, user) {
  if (!row || !user) return false;
  if (isRefexServiceClosedTicket(row) || isEmployeeApprovalRefexStep(row)) return false;
  if (isRefexServiceRejectedTicket(row)) return false;
  if (isAgentItemStatusCancelled(row)) return false;
  if (matchesRefexOpenTicketRow(row, user)) return true;
  if (matchesRefexSplitMyTaskRow(row, user)) return true;
  return false;
}

/** Refex IT Agent SLA — Open subset of own Open Tickets; Closed subset of own Closed. */
export function matchesRefexAgentOwnSlaBreached(row, user) {
  if (!row || !user) return false;
  if (isServiceQueueClosedSlaBreachedTicket(row)) {
    return matchesRefexTechSupportTab(row, 'Closed', user);
  }
  if (!isServiceQueueSlaBreachedTicket(row)) return false;
  return matchesRefexAgentOwnOpenTickets(row, user);
}

export function countAgentPendingTasks(rowsOrItems) {
  return (rowsOrItems || []).filter((row) => getCurrentStepValue(row) === IT_AGENT_STEP).length;
}

/** Current step or last completed step at IT Agent (for Completed tab) */
export function isAgentRelevantItem(item) {
  if (isITAgentStep(item)) return true;
  const lastStep = normalizeText(getItemValue(item, FIELD.lastCompletedStep)).toLowerCase();
  return lastStep === IT_AGENT_STEP.toLowerCase()
    || lastStep === IT_AGENT_REFEX_STEP.toLowerCase()
    || lastStep === IT_AGENT_EXTROVIS_STEP.toLowerCase();
}

/** Direct user assignment or IT Agents AppRole queue */
export function isAgentTaskForUser(item, user) {
  const assigned = getItemValue(item, FIELD.assignedTo);
  if (!user) return true;
  if (isAssignedToUser(assigned, user)) return true;
  if (!Array.isArray(assigned) || assigned.length === 0) return false;

  return assigned.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const kind = normalizeText(entry.Kind).toLowerCase();
    const name = normalizeText(entry.Name).toLowerCase();
    return kind === 'approle' && name.includes('it agent');
  });
}

/** Include open pool, my active/hold work, and resolved agent tickets. */
export function isAgentDashboardItem(item, user) {
  if (!item) return false;

  const itemStatus = stringifyKfValue(getItemValue(item, FIELD.itemStatus));
  const statusToken = getCanonicalAgentItemStatusToken(itemStatus);
  const atAgentStep = isITAgentStep(item);
  const assigned = getItemValue(item, FIELD.assignedTo);
  const pseudoRow = {
    id: normalizeText(item?._id),
    itemStatusRaw: itemStatus,
    assignedToRaw: Array.isArray(assigned) ? assigned : [],
    assignedTo: formatAssignedTo(assigned),
    currentStep: getCurrentStepValue(item),
    raw: item,
  };

  if (AGENT_STATUS_TABS.some((tab) => matchesAgentServiceTab(pseudoRow, tab.key, user))) {
    return true;
  }

  if (['resolved', 'cancelled', 'canceled'].includes(statusToken)) {
    const modifiedBy = parseUserRef(getItemValue(item, FIELD.modifiedBy));
    pseudoRow.completedBy = resolveServiceTerminalActor(item, assigned, modifiedBy);
    pseudoRow.cancelledBy = pseudoRow.completedBy;
    pseudoRow.modifiedBy = modifiedBy.name || '—';
    pseudoRow.modifiedById = modifiedBy.id;
    pseudoRow.modifiedByEmail = modifiedBy.email || '';
    return isAgentServiceTicketOwnedByUser(pseudoRow, user);
  }

  return isAgentTaskForUser(item, user) && atAgentStep;
}

async function fetchAgentTasksFromReport(kfInstance, page, pageSize, user) {
  const report = await fetchITServiceReport(kfInstance, page, pageSize);
  return extractItemsFromResponse(report).filter(
    (item) => isAgentDashboardItem(item, user)
      && matchesActiveDashboardEntityItem(item, { trustEmptyEntity: false }),
  );
}

async function fetchITAgentMyTasksEntityScoped(kfInstance, page, pageSize, user) {
  const paths = buildITProcessApiPaths(kfInstance);
  const collected = [];
  const pendingActivityIds = getAgentPendingActivityIdsForFetch();

  if (kfInstance?.api) {
    for (const activityId of pendingActivityIds) {
      try {
        const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(activityId, page, pageSize));
        const items = extractItemsFromResponse(resp).filter(
          (item) => matchesActiveDashboardEntityItem(item, { trustEmptyEntity: false }),
        );
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn(`pending/${activityId} failed:`, err?.message || err);
      }
    }
  }

  if (kfInstance?.api) {
    for (const status of ['inprogress', 'completed']) {
      try {
        const resp = await kfGetJson(kfInstance, paths.myItemsPath(status, page, pageSize));
        const items = extractItemsFromResponse(resp).filter(
          (item) => isAgentDashboardItem(item, user)
            && matchesActiveDashboardEntityItem(item, { trustEmptyEntity: false }),
        );
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn(`entity-scoped myitems/${status} failed:`, err?.message || err);
      }
    }

    try {
      const items = (await fetchParticipatedItemsByActivity(kfInstance, paths, { page, pageSize }))
        .filter(
          (item) => isAgentDashboardItem(item, user)
            && matchesActiveDashboardEntityItem(item, { trustEmptyEntity: false }),
        );
      if (items.length) collected.push(...items);
    } catch (err) {
      console.warn('entity-scoped participated failed:', err?.message || err);
    }
  }

  let reportItems = [];
  try {
    reportItems = await fetchAgentTasksFromReport(kfInstance, page, pageSize, user);
  } catch (err) {
    console.warn('entity-scoped process-report failed:', err?.message || err);
    if (!collected.length) throw err;
  }

  const items = mergeUniqueItems([reportItems, collected]).filter(
    (item) => matchesActiveDashboardEntityItem(item, { trustEmptyEntity: false }),
  );

  return {
    items,
    fromMyTasksApi: false,
    hasMore: reportPageHasMore(reportItems, pageSize),
    pageSize,
  };
}

export async function fetchITAgentMyTasks(kfInstance, page = 1, pageSize = 100) {
  const user = kfInstance?.user;

  if (isEntityScopedDashboardProfile()) {
    return fetchITAgentMyTasksEntityScoped(kfInstance, page, pageSize, user);
  }

  const paths = buildITProcessApiPaths(kfInstance);
  const collected = [];
  const pendingActivityIds = getAgentPendingActivityIdsForFetch();

  if (kfInstance?.api) {
    for (const activityId of pendingActivityIds) {
      try {
        const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(activityId, page, pageSize));
        const items = extractItemsFromResponse(resp);
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn(`pending/${activityId} failed:`, err?.message || err);
      }
    }

    for (const status of ['inprogress', 'completed', 'all']) {
      try {
        const resp = await kfGetJson(kfInstance, paths.myItemsPath(status, page, pageSize));
        const items = extractItemsFromResponse(resp).filter(
          (item) => isAgentDashboardItem(item, user),
        );
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn(`myitems/${status} failed:`, err?.message || err);
      }
    }

    try {
      const items = (await fetchParticipatedItemsByActivity(kfInstance, paths, { page, pageSize }))
        .filter((item) => isAgentDashboardItem(item, user));
      if (items.length) collected.push(...items);
    } catch (err) {
      console.warn('participated failed:', err?.message || err);
    }
  }

  const process = getITProcess(kfInstance);
  if (process?.getMyTasksItems) {
    const sdkSeen = new Set();
    for (const activityId of ['', ...pendingActivityIds]) {
      try {
        const resp = await process.getMyTasksItems({
          activityId: activityId || '',
          pageNumber: page,
          pageSize,
        });
        const items = extractItemsFromResponse(resp).filter(
          (item) => isAgentRelevantItem(item),
        );
        items.forEach((item) => {
          const id = normalizeText(item?._id);
          if (id && !sdkSeen.has(id)) {
            sdkSeen.add(id);
            collected.push(item);
          }
        });
      } catch (err) {
        console.warn('getMyTasksItems failed:', err?.message || err);
      }
    }
  }

  let items = mergeUniqueItems([collected]);
  let fromMyTasksApi = items.length > 0;
  let reportItems = [];

  try {
    reportItems = await fetchAgentTasksFromReport(kfInstance, page, pageSize, user);
    if (reportItems.length) {
      items = mergeUniqueItems([items, reportItems]);
    }
  } catch (err) {
    console.warn('process-report fallback failed:', err?.message || err);
    if (!items.length) throw err;
  }

  return {
    items,
    fromMyTasksApi,
    hasMore: reportPageHasMore(reportItems, pageSize),
    pageSize,
  };
}

function parseMappedReferenceMinutes(value, attributeKey) {
  if (value == null || value === '' || value === '—') return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'object') {
    const raw = value?.[attributeKey]
      ?? value?.TurnAround_Time_TAT
      ?? value?.Closure_Time
      ?? value?.value;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function pickCompanyNameFromLookup(lookup) {
  if (lookup == null || lookup === '') return '';
  if (Array.isArray(lookup)) {
    for (const entry of lookup) {
      const found = pickCompanyNameFromLookup(entry);
      if (found) return found;
    }
    return '';
  }
  if (typeof lookup === 'string') return normalizeText(lookup);
  if (typeof lookup === 'object') {
    return normalizeText(
      lookup.Company_Name
      || lookup.REFEX_COMPANY_NAME_1
      || lookup['Company Name']
      || lookup.companyName
      || lookup.Company
      || lookup.company
      || lookup.Name
      || lookup.name,
    );
  }
  return '';
}

/** Company from user_details_lookup (Company_Name / REFEX_COMPANY_NAME_1). */
export function extractRefexCompanyNameFromItem(item) {
  if (!item) return '';
  const lookup = getItemValue(item, FIELD.userDetailsLookup)
    || getItemValue(item, ['user_details_lookup', 'Column_bRn4sBWeeF', 'User_Details_Lookup'])
    || item?.user_details_lookup
    || null;
  return pickCompanyNameFromLookup(lookup);
}

export function mapReportRow(item) {
  // Display assignee from workflow Assigned To only — do not merge Assigned To User
  // into the same list (that duplicated names in MIS tables).
  const assignedRaw = dedupeAssigneeList(getItemValue(item, FIELD.assignedTo));
  const assignedToUserRaw = dedupeAssigneeList(
    getItemValue(item, withNativeFieldKeys(getActiveServiceCol()?.assignedToUser, 'Assigned_To_User')),
  );
  const createdBy = parseUserRef(getItemValue(item, FIELD.createdBy));
  const modifiedBy = parseUserRef(getItemValue(item, FIELD.modifiedBy));
  const requesterRaw = getItemValue(item, FIELD.requesterName);
  const systemStatusRaw = stringifyKfValue(
    item?._status
    ?? getItemValue(item, withNativeFieldKeys(getActiveServiceCol()?.systemStatus, '_status')),
  );
  const processCompleted = isRefexServiceProcessCompleted({
    raw: item,
    systemStatus: systemStatusRaw,
    isProcessCompleted: false,
  });
  const rawStatus = getItemValue(item, FIELD.status);
  const status = processCompleted ? 'Completed' : normalizeStatusKey(rawStatus);
  const reopenedCol = getActiveServiceCol()?.reopenedTicket;
  const reopenedRaw = reopenedCol
    ? (getItemValue(item, [reopenedCol]) ?? item?.[reopenedCol])
    : null;
  const reopenedToken = normalizeText(reopenedRaw).toLowerCase();
  const reopenedTicket = !processCompleted && (
    reopenedRaw === true
    || reopenedRaw === 1
    || reopenedToken === 'yes'
    || reopenedToken === 'true'
    || status === 'Reopened'
  );
  const tatMinutes = parseMappedReferenceMinutes(
    getItemValue(item, FIELD.tatMinutes),
    'TurnAround_Time_TAT',
  );
  const closureMinutes = parseMappedReferenceMinutes(
    getItemValue(item, FIELD.closureMinutes),
    'Closure_Time',
  );
  const companyName = extractRefexCompanyNameFromItem(item);

  return {
    id: normalizeText(item?._id),
    requestId: resolveDisplayRequestId({ raw: item, id: item?._id }, item?._id) || '—',
    name: normalizeText(getItemValue(item, FIELD.name)),
    requesterName: resolvePersonDisplayName(requesterRaw) || createdBy.name || '—',
    requesterNameRaw: requesterRaw,
    requesterEmail: normalizeText(getItemValue(item, FIELD.requesterEmail)),
    requestedDate: formatDate(getItemValue(item, FIELD.requestedDate)),
    requestedDateTime: formatDateTime(getItemValue(item, FIELD.requestedDateTime)),
    status,
    statusLabel: status === 'InProgress' ? 'In Progress' : status,
    systemStatus: isItemOpenCloseStatusToken(systemStatusRaw) ? '' : (systemStatusRaw || ''),
    isProcessCompleted: processCompleted,
    reopenedTicket,
    ticketType: resolveServiceTicketTypeText(item),
    category: mapFieldText(item, FIELD.category),
    subCategory: mapFieldText(item, FIELD.subCategory),
    summary: mapFieldText(item, FIELD.summary),
    description: mapFieldText(item, FIELD.description),
    criticality: mapFieldText(item, FIELD.criticality),
    source: mapServiceSourceText(item),
    itemStatusRaw: stringifyKfValue(getItemValue(item, FIELD.itemStatus)),
    itemStatus: formatItemStatusDisplay(getItemValue(item, FIELD.itemStatus)),
    solution: normalizeText(getItemValue(item, FIELD.solution)) || '—',
    holdReason: normalizeText(getItemValue(item, FIELD.holdReason)) || '—',
    pendingReason: normalizeText(getItemValue(item, FIELD.pendingReason)) || '—',
    cancellationReason: normalizeText(getItemValue(item, FIELD.cancellationReason)) || '—',
    entity: mapFieldText(item, FIELD.entity)
      || mapFieldText(item, FIELD.entitySelect)
      || resolveServiceItemEntityKey(item)
      || '',
    companyName,
    company: companyName,
    department: mapFieldText(item, FIELD.department),
    location: mapFieldText(item, FIELD.location),
    managerComments: normalizeText(getItemValue(item, FIELD.managerComments))
      || normalizeText(getItemValue(item, [
        'Manager_Comments',
        'Rejection_Notes',
        'Rejection_Reason',
        'Reject_Reason',
        'Reject_Notes',
      ]))
      || '—',
    rejectionReason: normalizeText(getItemValue(item, [
      'Rejection_Notes',
      'Rejection_Reason',
      'Reject_Reason',
      'Reject_Notes',
      'Manager_Comments',
    ])) || '',
    slaMinutes: getItemValue(item, FIELD.slaMinutes) ?? '—',
    tatMinutes,
    closureMinutes,
    serviceQueueSlaMinutes: closureMinutes || tatMinutes,
    slaElapsedMinutes: getItemValue(item, FIELD.slaElapsedMinutes),
    slaRemainingMinutes: getItemValue(item, FIELD.slaRemainingMinutes),
    slaIsPaused: getItemValue(item, FIELD.slaIsPaused),
    slaPausedAt: getItemValue(item, FIELD.slaPausedAt),
    slaLastResumedAt: getItemValue(item, FIELD.slaLastResumedAt),
    slaBreachedFlag: getItemValue(item, FIELD.slaBreached),
    requestedDateTimeRaw: getItemValue(item, FIELD.requestedDateTime)
      || getItemValue(item, FIELD.createdAt)
      || item?._created_at
      || null,
    slaBreached: isSlaBreached(item),
    lastCompletedStep: normalizeText(getItemValue(item, FIELD.lastCompletedStep)) || '—',
    currentStep: getCurrentStepValue(item) || '—',
    ticketStage: readTicketStatusField({ raw: item, id: item?._id || item?.Id }) || '',
    processStages: readProcessStagesField({ raw: item, id: item?._id || item?.Id }) || '',
    assignedTo: formatAssignedTo(assignedRaw),
    assignedToRaw: assignedRaw,
    assignedToUserRaw,
    flowName: normalizeText(getItemValue(item, FIELD.flowName)) || 'Live IT Service Request',
    createdAt: formatDateTime(getItemValue(item, FIELD.createdAt)),
    modifiedAt: formatDateTime(getItemValue(item, FIELD.modifiedAt)),
    createdAtRaw: getItemValue(item, FIELD.createdAt) || item?._created_at || null,
    modifiedAtRaw: getItemValue(item, FIELD.modifiedAt) || item?._modified_at || null,
    closedAtRaw: (() => {
      const step = String(getCurrentStepValue(item) || '').toLowerCase();
      if (step.includes('it tech reopen') || step.includes('employee feedback') || step.includes('reopen window')) {
        return getItemValue(item, FIELD.modifiedAt) || item?._modified_at || null;
      }
      return null;
    })(),
    createdBy: createdBy.name || '—',
    createdById: createdBy.id,
    createdByEmail: createdBy.email || '',
    modifiedBy: modifiedBy.name || '—',
    modifiedById: modifiedBy.id,
    modifiedByEmail: modifiedBy.email || '',
    completedBy: resolveServiceTerminalActor(item, assignedRaw, modifiedBy),
    closedBy: resolveServiceTerminalActor(item, assignedRaw, modifiedBy),
    cancelledBy: resolveServiceTerminalActor(item, assignedRaw, modifiedBy),
    activityInstanceId: pickActivityInstanceId(item),
    attachments: pickServiceTicketAttachments(item),
    requestTracking: parseRequestTrackingFromItem(item),
    raw: item,
  };
}

function asTicketAttachmentList(raw) {
  if (Array.isArray(raw)) {
    return raw.filter((item) => item && typeof item === 'object' && (
      item.key || item.Key || item.name || item.Name || item.id || item.url || item.URL
    ));
  }
  if (raw && typeof raw === 'object') {
    if (raw.key || raw.Key || raw.name || raw.Name || raw.id || raw.url || raw.URL) {
      return [raw];
    }
    return asTicketAttachmentList(Object.values(raw));
  }
  return [];
}

/** Ticket Supporting_Documents / report attachment columns. */
export function pickServiceTicketAttachments(item) {
  const fromField = asTicketAttachmentList(getItemValue(item, FIELD.attachments));
  if (fromField.length) return fromField;
  const extras = [
    'Supporting_Documents',
    'supporting_documents',
    'Attachment',
    'Attachments',
  ];
  const sources = [item, item?.Data, item?.data].filter(Boolean);
  for (const src of sources) {
    for (const key of extras) {
      const found = asTicketAttachmentList(src?.[key]);
      if (found.length) return found;
    }
  }
  return [];
}

/**
 * Fetch instance attachments only. Does not remap the row (keeps Me/Team stamps).
 */
export async function hydrateITRowAttachmentsOnly(kfInstance, row) {
  if (!kfInstance?.api || !row?.id) return row;
  const existing = asTicketAttachmentList(row.attachments);
  if (existing.length) return { ...row, attachments: existing };

  const paths = buildITProcessApiPaths(kfInstance);
  const activityInstanceId =
    normalizeText(row.activityInstanceId) || pickActivityInstanceId(row.raw);

  try {
    let detail = null;
    if (activityInstanceId) {
      detail = await kfGetJson(
        kfInstance,
        paths.instanceWithActivityPath(row.id, activityInstanceId),
      );
    }
    // Bare GET /{instanceId} is 404 on this process — never call it.
    const files = pickServiceTicketAttachments(detail)
      || pickServiceTicketAttachments(row.raw)
      || existing;
    if (!files.length) return row;
    return {
      ...row,
      attachments: files,
      raw: row.raw ? { ...row.raw, Supporting_Documents: files } : detail,
    };
  } catch (err) {
    console.warn('hydrateITRowAttachmentsOnly failed:', err?.message || err);
    return row;
  }
}

/** Overlay form Status onto an existing mapped row without remapping Me/Team stamps. */
export function applyLiveTicketStageToRow(row, detail) {
  if (!row) return row;
  const mergedRaw = detail
    ? mergeITItemWithReport(detail, row.raw || {})
    : (row.raw || {});
  const stage = readTicketStatusField({
    raw: mergedRaw,
    id: row.id || mergedRaw?._id || mergedRaw?.Id,
    form_status: '',
    ticketStage: '',
    processStages: '',
  });
  if (stage) rememberTicketStageOverlay(row.id || mergedRaw?._id, stage);
  if (!stage && !detail) return row;
  return {
    ...row,
    raw: mergedRaw,
    ticketStage: stage || row.ticketStage || '',
    processStages: readProcessStagesField({
      raw: mergedRaw,
      id: row.id || mergedRaw?._id || mergedRaw?.Id,
      processStages: row.processStages,
      stages: row.stages,
    }) || row.processStages || '',
  };
}

/** Get-item after form return — native Status is current; report columns can stay Open. */
export async function overlayITRowTicketStageFromInstance(kfInstance, row) {
  if (!kfInstance?.api || !row?.id) return row;
  const paths = buildITProcessApiPaths(kfInstance);
  const activityInstanceId =
    normalizeText(row.activityInstanceId) || pickActivityInstanceId(row.raw);
  if (!activityInstanceId) return row;
  try {
    const detail = await kfGetJson(
      kfInstance,
      paths.instanceWithActivityPath(row.id, activityInstanceId),
    );
    if (!detail) return row;
    return applyLiveTicketStageToRow(row, detail);
  } catch (err) {
    console.warn('overlayITRowTicketStageFromInstance failed:', err?.message || err);
    return row;
  }
}

/** Load full instance fields (e.g. Manager_Comments) not always present on report rows. */
export async function hydrateITRowFromInstance(kfInstance, row) {
  if (!kfInstance?.api || !row?.id) return row;

  const paths = buildITProcessApiPaths(kfInstance);
  const activityInstanceId =
    normalizeText(row.activityInstanceId) || pickActivityInstanceId(row.raw);

  try {
    let detail = null;
    if (activityInstanceId) {
      detail = await kfGetJson(
        kfInstance,
        paths.instanceWithActivityPath(row.id, activityInstanceId),
      );
    }
    if (!detail) return row;

    const mergedRaw = mergeITItemWithReport(detail, row.raw || {});
    const hydrated = applyLiveTicketStageToRow(mapReportRow(mergedRaw), detail);
    return {
      ...hydrated,
      activityInstanceId: activityInstanceId || hydrated.activityInstanceId,
    };
  } catch (err) {
    console.warn('hydrateITRowFromInstance failed:', err?.message || err);
    return row;
  }
}

function unwrapReportData(resp) {
  return extractItemsFromResponse(resp);
}

export async function fetchITMyItems(kfInstance, page = 1, pageSize = 100) {
  const process = getITProcess(kfInstance);
  let items = [];
  let fromMyItemsApi = false;

  if (process?.getMyItems) {
    try {
      const resp = await process.getMyItems({
        status: 'all',
        pageNumber: page,
        pageSize,
      });
      items = unwrapReportData(resp);
      fromMyItemsApi = items.length > 0;
    } catch (err) {
      console.warn('getMyItems failed, falling back to process-report', err);
    }
  }

  try {
    const report = await fetchITServiceReport(kfInstance, page, pageSize);
    const reportItems = unwrapReportData(report);

    if (reportItems.length) {
      const reportById = new Map(
        reportItems.map((row) => [normalizeText(row?._id), row]),
      );

      if (items.length) {
        items = items.map((item) => {
          const full = reportById.get(normalizeText(item?._id));
          return mergeITItemWithReport(item, full);
        });
      } else {
        items = reportItems;
        fromMyItemsApi = false;
      }
    }
  } catch (err) {
    if (!items.length) {
      console.warn('process-report failed for my items', err);
    }
  }

  if (!fromMyItemsApi && items.length && kfInstance?.user) {
    items = items.filter((item) => isMyItem(mapReportRow(item), kfInstance.user));
  }

  return { items, fromMyItemsApi, hasMore: reportPageHasMore(items, pageSize), pageSize };
}

/**
 * Employee dashboard — scoped process-report only (no getMyItems merge).
 * Legacy: IT_Service_Items_A00. Entity dashboards: All_tickets_A00 (Extrovis) / Service_Items_Refex_A00.
 */
export async function fetchITEmployeeItems(kfInstance, page = 1, pageSize = 100) {
  const report = await fetchITServiceReport(kfInstance, page, pageSize);
  const items = unwrapReportData(report);
  return {
    items,
    fromMyItemsApi: false,
    hasMore: reportPageHasMore(items, pageSize),
    pageSize,
    reportId: activeServiceReportId,
  };
}

export async function fetchAgentKpiFromVariables(kfInstance) {
  if (!kfInstance?.app?.getVariable) return null;

  const read = async (key) => {
    try {
      return await kfInstance.app.getVariable(key);
    } catch {
      return 0;
    }
  };

  const [userName, totalRecords, openTickets, completedRecords, pendingTasks] = await Promise.all([
    read(AGENT_KPI_VARS.userName),
    read(AGENT_KPI_VARS.totalRecords),
    read(AGENT_KPI_VARS.openTickets),
    read(AGENT_KPI_VARS.completedRecords),
    read(AGENT_KPI_VARS.pendingTasks),
  ]);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    userName: normalizeText(userName) || normalizeText(kfInstance?.user?.Name) || 'User',
    totalRecords: toNum(totalRecords),
    openTickets: toNum(openTickets),
    completedRecords: toNum(completedRecords),
    pendingTasks: toNum(pendingTasks),
  };
}

export function computeAgentKpisFromReportItems(items) {
  let totalRecords = 0;
  let openAgents = 0;
  let pendingAgents = 0;
  let completedAgents = 0;

  (items || []).forEach((item) => {
    totalRecords++;

    const currentStep = getCurrentStepValue(item);
    const itemStatus = normalizeText(getRawItemStatus(item));

    if (currentStep === IT_AGENT_STEP && itemStatus !== 'Completed') {
      openAgents++;
    }

    if (currentStep === IT_AGENT_STEP && itemStatus === 'On Hold') {
      pendingAgents++;
    }

    if (itemStatus === 'Completed') {
      completedAgents++;
    }
  });

  return {
    totalRecords,
    openTickets: openAgents,
    completedRecords: completedAgents,
    pendingTasks: pendingAgents,
  };
}

export function computeAgentKpisFromRows(rows) {
  return computeAgentKpisFromReportItems(rows);
}

export function applyAgentFilters(rows, {
  search = '',
  statusTab = 'PendingTask',
  user = null,
  scope = 'me',
  sortOrder = 'asc',
  entityTab = '',
  ...columnFilters
} = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const matchTab = resolveAgentServiceTabMatcher(statusTab, user, scope);
  let list = safeRows.filter((row) => matchTab(row));
  list = applyMisColumnFilters(list, columnFilters);
  list = sortMisTableRows(list, sortOrder, entityTab);
  const q = normalizeText(search).toLowerCase();
  if (!q) return list;
  const refex = usesRefexServiceWorkflow();
  return list.filter((row) => {
    const fields = refex
      ? [row.requestId, row.ticketType, row.category, row.subCategory, row.itemStatus, row.currentStep, row.name, row.requesterName, row.entity, row.subject, row.processStages, row.ticketStage]
      : [row.requestId, row.summary, row.ticketType, row.category, row.subCategory, row.itemStatus, row.currentStep, row.name, row.requesterName, row.entity, row.subject, row.processStages, row.ticketStage];
    return fields.some((v) => String(v || '').toLowerCase().includes(q));
  });
}

function getCrItemValue(item, fieldKeys) {
  return getItemValue(item, fieldKeys);
}

function mapCrFieldText(item, fieldKeys) {
  return mapFieldText(item, fieldKeys);
}

export function getChangeRequestStepIndex(stepName) {
  const s = normalizeText(stepName);
  if (!s || s === '—') return 0;
  for (let i = 0; i < CHANGE_REQUEST_WORKFLOW_STEPS.length; i += 1) {
    if (crStepMatches(s, CHANGE_REQUEST_WORKFLOW_STEPS[i], getCrActivityIdsForStep(CHANGE_REQUEST_WORKFLOW_STEPS[i]))) {
      return i;
    }
  }
  return 0;
}

function inferCrCurrentStepFromOpenActivities(item) {
  if (!item) return '';
  // Prefer the furthest workflow step with an open activity (implementation → final → first).
  const stepOrder = [CR_IMPLEMENTATION_STEP, CR_FINAL_APPROVER_STEP, CR_FIRST_APPROVER_STEP];
  for (const stepName of stepOrder) {
    const col = getCrStepActivityColumn(stepName, item);
    if (col && pickCrInProgressActivityFromColumn(item, col)) return stepName;
  }
  return '';
}

function hasCrImplementationStepActivity(item) {
  if (!item) return false;
  const col = getCrStepActivityColumn(CR_IMPLEMENTATION_STEP, item);
  if (!col) return false;
  const raw = getCrItemValue(item, [col]) ?? item?.[col];
  if (!raw) return false;
  return (Array.isArray(raw) ? raw : [raw]).filter(Boolean).length > 0;
}

export function getCrCurrentStepValue(itemOrRow) {
  if (!itemOrRow) return '';
  const raw = itemOrRow.raw ?? itemOrRow;
  const crCol = getActiveCrCol();
  let step = normalizeText(
    raw?.[crCol.currentStep]
    ?? itemOrRow?.currentStep
    ?? getCrItemValue(raw, crField().currentStep),
  );
  if (step && step !== '—') return step;

  const lastCompleted = normalizeText(
    raw?.[crCol.lastCompletedStep]
    ?? itemOrRow?.lastCompletedStep
    ?? getCrItemValue(raw, crField().lastCompletedStep),
  );

  const inferredFromActivity = inferCrCurrentStepFromOpenActivities(raw);
  if (inferredFromActivity) return inferredFromActivity;

  if (!isCrWorkflowTerminated(raw) && lastCompleted) {
    const lastNorm = normalizeCrStepToken(lastCompleted);
    if (lastNorm === 'start' || lastCompleted === 'Start') {
      return CR_FIRST_APPROVER_STEP;
    }
    if (crStepMatches(lastCompleted, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS)) {
      return CR_IMPLEMENTATION_STEP;
    }
    if (crStepMatches(lastCompleted, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS)) {
      return CR_FINAL_APPROVER_STEP;
    }
    if (crStepMatches(lastCompleted, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS)) {
      return CR_IMPLEMENTATION_STEP;
    }
  }

  return step === '—' ? '' : step;
}

/** Agent may complete CR work on the Implementation tab — must exist in live myitems/pending. */
export function canEditCrImplementationRow(row, activeTab, liveCrIds = null, user = null) {
  if (activeTab !== 'Implementation') return false;
  if (isCrCompletedItem(row)) return false;
  if (!matchesAgentCrStatusTab(row, 'Implementation')) return false;
  if (liveCrIds && liveCrIds.size > 0 && !liveCrIds.has(normalizeText(row?.id))) return false;
  if (user && !isAgentTicketAssignedToUser(row, user) && !isAssignedToUser(row.assignedToRaw, user)) {
    return false;
  }
  return true;
}

function isCrWorkflowTerminated(raw) {
  const crCol = getActiveCrCol();
  const rawSys = normalizeText(raw?.[crCol.systemStatus]).toLowerCase();
  return rawSys === 'completed' || rawSys === 'withdrawn';
}

export function isCrCompletedItem(rowOrItem) {
  const crCol = getActiveCrCol();
  const raw = rowOrItem?.raw ?? rowOrItem;
  const rawSys = normalizeText(raw?.[crCol.systemStatus]).toLowerCase();

  if (rawSys === 'completed' || rawSys === 'withdrawn') return true;
  if (rawSys === 'inprogress') return false;

  const finalSt = normalizeText(
    rowOrItem?.finalStatus ?? getCrItemValue(raw, crField().finalStatus),
  ).toLowerCase();
  if (finalSt === 'completed') return true;

  const currentStep = normalizeText(
    raw?.[crCol.currentStep] ?? getCrItemValue(raw, crField().currentStep),
  );
  if (currentStep && currentStep !== '—') {
    if (crStepMatches(currentStep, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS)) return false;
    if (crStepMatches(currentStep, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS)) return false;
    if (crStepMatches(currentStep, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS)) {
      return false;
    }
  }

  const lastCompleted = normalizeText(
    raw?.[crCol.lastCompletedStep] ?? getCrItemValue(raw, crField().lastCompletedStep),
  );
  if (lastCompleted && lastCompleted !== '—') {
    if (crStepMatches(lastCompleted, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS)) return false;
    if (crStepMatches(lastCompleted, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS)) return false;
    if (crStepMatches(lastCompleted, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS)) {
      return finalSt === 'completed';
    }
  }

  const wf = normalizeStatusKey(raw?.[crCol.systemStatus] ?? getCrItemValue(raw, ['_status']));
  return wf === 'Completed';
}

function isCrInImplementationPhase(row) {
  if (isCrAtStep(row, CR_IMPLEMENTATION_STEP)) return true;

  const raw = row?.raw ?? row;
  const crCol = getActiveCrCol();
  const lastCompleted = normalizeText(
    raw?.[crCol.lastCompletedStep]
    ?? row?.lastCompletedStep
    ?? getCrItemValue(raw, crField().lastCompletedStep),
  );
  if (lastCompleted && crStepMatches(lastCompleted, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS)) {
    return true;
  }
  if (lastCompleted && crStepMatches(lastCompleted, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS)) {
    return true;
  }
  if (hasCrImplementationStepActivity(raw)) return true;

  const implCol = getCrStepActivityColumn(CR_IMPLEMENTATION_STEP, raw);
  return !!(implCol && pickCrInProgressActivityFromColumn(raw, implCol));
}

export function isMyChangeRequest(row, user) {
  if (!row || !user) return false;

  const email = normalizeEmail(user?.Email);
  const userId = normalizeText(user?._id || user?.Id);
  if (!email && !userId) return true;

  if (email && normalizeEmail(row.requesterEmail) === email) return true;
  if (email && normalizeEmail(row.createdByEmail) === email) return true;
  if (userId && normalizeText(row.createdById) === userId) return true;

  if (isCrAtStep(row, CR_IMPLEMENTATION_STEP) && isAssignedToUser(row.assignedToRaw, user)) return true;

  return false;
}

/** Entity-scoped agent dashboards use an entity-filtered report — include matching CR rows only. */
export function shouldIncludeAgentCrRow(row, user) {
  if (!row) return false;
  if (isEntityScopedDashboardProfile()) {
    return matchesActiveDashboardEntityRow(row, { kind: 'cr', trustEmptyEntity: false });
  }
  return isMyChangeRequest(row, user);
}

export function matchesAgentCrStatusTab(row, tabKey) {
  const completed = isCrCompletedItem(row);

  if (tabKey === 'InApproval') {
    return !completed && (
      isCrAtStep(row, CR_FIRST_APPROVER_STEP) || isCrAtStep(row, CR_FINAL_APPROVER_STEP)
    );
  }
  if (tabKey === 'Implementation') {
    return !completed && isCrInImplementationPhase(row);
  }
  if (tabKey === 'Completed') {
    return completed;
  }
  return true;
}

export function mapChangeRequestRow(item) {
  const assignedRaw = getCrItemValue(item, crField().assignedTo);
  const createdBy = parseUserRef(getCrItemValue(item, crField().createdBy));
  const modifiedBy = parseUserRef(getCrItemValue(item, crField().modifiedBy));
  const onBehalf = parseUserRef(getCrItemValue(item, crField().onBehalfOf));
  const rawStatus = getCrItemValue(item, crField().status);
  const status = normalizeStatusKey(rawStatus);

  return {
    id: resolveCrProcessInstanceId(item),
    queueType: 'change',
    requestId: resolveDisplayRequestId({
      raw: item,
      id: item?._id,
      requestId: getCrItemValue(item, crField().requestId),
    }, item?._id) || '—',
    name: normalizeText(getCrItemValue(item, crField().name)),
    requesterName: normalizeText(getCrItemValue(item, crField().requesterName)) || createdBy.name,
    requesterEmail: normalizeText(getCrItemValue(item, crField().requesterEmail)),
    requestedDate: formatDate(getCrItemValue(item, crField().requestedDate)),
    requestedDateTime: formatDateTime(getCrItemValue(item, crField().requestedDateTime)),
    requestedDateTimeRaw: getCrItemValue(item, crField().requestedDateTime)
      || getCrItemValue(item, crField().createdAt)
      || null,
    createdAt: formatDateTime(getCrItemValue(item, crField().createdAt)),
    modifiedAt: formatDateTime(getCrItemValue(item, crField().modifiedAt)),
    createdAtRaw: getCrItemValue(item, crField().createdAt) || null,
    modifiedAtRaw: getCrItemValue(item, crField().modifiedAt) || null,
    status,
    statusLabel: status === 'InProgress' ? 'In Progress' : status,
    ticketType: mapCrFieldText(item, crField().ticketType),
    category: mapCrFieldText(item, crField().category),
    subCategory: mapCrFieldText(item, crField().subCategory),
    summary: mapCrFieldText(item, crField().summary),
    description: mapCrFieldText(item, crField().description),
    criticality: mapCrFieldText(item, crField().criticality),
    itemStatusRaw: '',
    itemStatus: '—',
    solution: normalizeText(getCrItemValue(item, crField().solution)) || '—',
    slaMinutes: getCrItemValue(item, crField().slaMinutes) ?? '—',
    lastCompletedStep: normalizeText(getCrItemValue(item, crField().lastCompletedStep)) || '—',
    currentStep: getCrCurrentStepValue(item) || '—',
    assignedTo: formatAssignedTo(assignedRaw),
    assignedToRaw: Array.isArray(assignedRaw) ? assignedRaw : [],
    flowName: normalizeText(getCrItemValue(item, crField().flowName)) || 'Live IT Change Request',
    createdBy: createdBy.name || '—',
    createdById: createdBy.id,
    createdByEmail: createdBy.email || '',
    modifiedBy: modifiedBy.name || '—',
    modifiedById: modifiedBy.id,
    onBehalfOf: onBehalf.name || '—',
    changeType: mapCrFieldText(item, crField().changeType),
    entity: normalizeEntityKey({
      entity: stringifyKfValue(getCrItemValue(item, crField().entity))
        || stringifyKfValue(getCrItemValue(item, crField().entitySelect)),
    })
      || detectCrItemEntityKey(item)
      || '',
    impact: mapCrFieldText(item, crField().impact),
    urgency: mapCrFieldText(item, crField().urgency),
    changeReason: mapCrFieldText(item, crField().changeReason),
    plannedStart: formatDisplayDateTime(getCrItemValue(item, crField().plannedStart)),
    plannedEnd: formatDisplayDateTime(getCrItemValue(item, crField().plannedEnd)),
    implementationPlan: mapCrFieldText(item, crField().implementationPlan),
    backoutPlan: mapCrFieldText(item, crField().backoutPlan),
    testPlan: mapCrFieldText(item, crField().testPlan),
    finalComments: mapCrFieldText(item, crField().finalComments),
    finalStatus: mapCrFieldText(item, crField().finalStatus),
    comments: mapCrFieldText(item, crField().comments),
    attachments: Array.isArray(getCrItemValue(item, crField().attachments)) ? getCrItemValue(item, crField().attachments) : [],
    activityInstanceId: pickCrReportActivityInstanceId(item) || pickCrOpenActivityInstanceIdFromReport(item),
    raw: item,
  };
}

/** Implementation tab: waiting until an IT agent picks the task. */
export function getCrImplementationTaskStatus(row) {
  const actedBy = resolveCrStepActedBy(row?.raw ?? row, CR_IMPLEMENTATION_STEP);
  if (actedBy && actedBy !== '—') return `Picked by ${actedBy}`;
  const assigned = normalizeText(row?.assignedTo);
  if (assigned && assigned !== '—' && isHumanActorName(assigned)) return `Picked by ${assigned}`;
  return 'Waiting to Pick';
}

export function computeSlaKpisFromRows(rows) {
  const list = rows || [];
  if (usesRefexServiceWorkflow()) {
    const open = list.filter(isItsmRowActive);
    const openWithSla = open.filter((r) => getServiceQueueSlaMinutes(r) != null || getSlaTiming(r).hasSla);
    return {
      slaAtRisk: openWithSla.filter(isSlaAtRisk).length,
      slaBreached: open.filter(isServiceQueueSlaBreachedTicket).length,
    };
  }
  const open = list.filter(isItsmRowActive);
  const openWithSla = open.filter((r) => getSlaTiming(r).hasSla);
  return {
    slaAtRisk: openWithSla.filter(isSlaAtRisk).length,
    slaBreached: openWithSla.filter(isSlaBreached).length,
  };
}

/** Active (non-terminal) ITSM row for health metrics. */
export function isItsmRowActive(row) {
  if (row?.queueType === 'change') {
    return !isCrCompletedItem(row);
  }

  if (isRefexServiceProcessCompleted(row) || isRefexServiceRowResolved(row)) return false;

  const token = getCanonicalAgentItemStatusToken(getRawItemStatus(row));
  if (['resolved', 'cancelled', 'completed', 'closed'].includes(token)) return false;
  if (isTerminalStatusToken(readBusinessCloseStatus(row))) return false;
  const statusLabel = normalizeText(row?.statusLabel || row?.itemStatus).toLowerCase();
  if (statusLabel.includes('cancelled')) return false;
  if (statusLabel.includes('completed') || statusLabel.includes('resolved') || statusLabel.includes('closed')) {
    return false;
  }
  const workflowStatus = normalizeText(row?.status).toLowerCase();
  if (workflowStatus === 'completed' || workflowStatus === 'closed') return false;
  return true;
}

function isItsmRowOnHold(row) {
  if (row?.queueType === 'change') return false;
  return isAgentItemStatusOnHold(row) || isAgentItemStatusPendingUser(row);
}

function isCrInApproval(row) {
  if (row?.queueType !== 'change' || isCrCompletedItem(row)) return false;
  return isCrAtStep(row, CR_FIRST_APPROVER_STEP) || isCrAtStep(row, CR_FINAL_APPROVER_STEP);
}

function isClosedSlaMeasurable(row) {
  const completed = getCompletedResolutionTiming(row);
  if (completed.hasData && completed.outcome !== 'none') return true;
  return getSlaTiming(row).hasSla;
}

function isClosedSlaCompliant(row) {
  const completed = getCompletedResolutionTiming(row);
  if (completed.hasData && completed.outcome !== 'none') {
    return completed.outcome === 'within';
  }
  return !isSlaBreached(row);
}

function isItsmRowAgingOpen(row, thresholdDays = 3) {
  const raw = row?.createdAtRaw || row?.requestedDateTimeRaw || row?.requestedDate;
  const t = new Date(raw || 0).getTime();
  if (!t || Number.isNaN(t)) return false;
  return (Date.now() - t) > thresholdDays * 24 * 60 * 60 * 1000;
}

/** Health Monitor metrics — mirrors Project Tracker RAG bar for ITSM queues. */
export function computeITSMHealthMetrics(rows, { queueType = 'service' } = {}) {
  const list = rows || [];
  const open = list.filter(isItsmRowActive);
  const openTotal = open.length;
  const total = Math.max(openTotal, 1);
  const pct = (n) => Math.round((n / total) * 100);

  const openWithSla = open.filter((r) => getSlaTiming(r).hasSla);
  const onTrack = openWithSla.filter((r) => getSlaTiming(r).state === 'ok').length;
  const atRisk = openWithSla.filter(isSlaAtRisk).length;
  const breached = openWithSla.filter(isSlaBreached).length;
  const onHold = queueType === 'service' ? open.filter(isItsmRowOnHold).length : 0;
  const inApproval = queueType === 'cr' ? open.filter(isCrInApproval).length : 0;
  const queueSecondary = queueType === 'cr' ? inApproval : onHold;
  const aging = open.filter((r) => isItsmRowAgingOpen(r)).length;

  const closed = list.filter((r) => !isItsmRowActive(r));
  const closedWithSla = closed.filter(isClosedSlaMeasurable);
  const complied = closedWithSla.filter(isClosedSlaCompliant).length;
  const slaCompliancePct = closedWithSla.length
    ? Math.round((complied / closedWithSla.length) * 100)
    : 0;

  return {
    queueType,
    onTrack,
    atRisk,
    breached,
    onHold,
    inApproval,
    queueSecondary,
    aging,
    openTotal,
    openWithSla: openWithSla.length,
    slaCompliancePct,
    pct,
    onTrackPct: pct(onTrack),
    atRiskPct: pct(atRisk),
    breachedPct: pct(breached),
    agingPct: pct(aging),
    queueSecondaryPct: pct(queueSecondary),
  };
}

function isSameCalendarDay(raw, referenceDate = new Date()) {
  if (!raw) return false;
  const now = referenceDate instanceof Date ? referenceDate : new Date();
  let d;
  if (typeof raw === 'string') {
    const text = raw.trim();
    // Date-only (YYYY-MM-DD) — interpret as local calendar day (not UTC midnight).
    const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (dayOnly) {
      d = new Date(Number(dayOnly[1]), Number(dayOnly[2]) - 1, Number(dayOnly[3]));
    } else {
      d = new Date(text);
    }
  } else if (raw instanceof Date) {
    d = raw;
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

/** True when the ticket was created / requested today (local calendar day). */
export function isDashboardRowCreatedToday(row, referenceDate = new Date()) {
  const rawItem = row?.raw ?? row;
  const serviceCol = getActiveServiceCol() || {};
  const candidates = [
    row?.requestedDateTimeRaw,
    row?.createdAtRaw,
    row?.requestedDate,
    row?.createdAt,
    rawItem?._created_at,
    rawItem?._submitted_at,
    rawItem?.CreatedAt,
    rawItem?.SubmittedAt,
    getItemValue(rawItem, [
      serviceCol.requestedDateTime,
      serviceCol.createdAt,
      serviceCol.requestedDate,
      FIELD.requestedDateTime,
      FIELD.createdAt,
      '_created_at',
      '_submitted_at',
    ]),
  ];
  for (const raw of candidates) {
    if (raw == null || raw === '' || raw === '—') continue;
    // Kissflow sometimes nests date values.
    const value = (typeof raw === 'object' && !(raw instanceof Date))
      ? (raw?.value ?? raw?.DateTime ?? raw?.date ?? raw?.datetime ?? null)
      : raw;
    if (value != null && isSameCalendarDay(value, referenceDate)) return true;
  }
  return false;
}

/** True when the ticket was closed / last modified today. */
export function isDashboardRowClosedToday(row, referenceDate = new Date()) {
  const raw = getRefexClosedAtRaw(row)
    || row?.closedAtRaw
    || row?.modifiedAtRaw
    || row?.raw?._modified_at
    || row?.completedAtRaw
    || row?.requestedDateTimeRaw
    || row?.createdAtRaw;
  return isSameCalendarDay(raw, referenceDate);
}

function countRowsByCriticality(rows, level) {
  const token = level.toLowerCase();
  return (rows || []).filter((row) => {
    if (!isItsmRowActive(row)) return false;
    return normalizeText(row?.criticality).toLowerCase() === token;
  }).length;
}

/**
 * Extended operational KPI snapshot — display-only aggregation from loaded rows.
 * mode: agent | team | employee | approver | admin | cr
 */
export function computeItsmExtendedKpiMetrics(rows = [], {
  mode = 'agent',
  queueType = 'service',
  user = null,
} = {}) {
  const list = rows || [];
  const health = computeITSMHealthMetrics(list, { queueType });

  if (queueType === 'cr' || mode === 'cr') {
    const inApproval = list.filter((r) => matchesAgentCrStatusTab(r, 'InApproval')).length;
    const inFlight = list.filter((r) => matchesAgentCrStatusTab(r, 'Implementation')).length;
    const completedToday = list.filter((r) => matchesAgentCrStatusTab(r, 'Completed') && isDashboardRowClosedToday(r)).length;
    const cancelled = list.filter((r) => isCrCompletedItem(r) && normalizeText(r?.statusLabel).toLowerCase().includes('cancel')).length;

    return {
      openTickets: inApproval,
      inProgress: inFlight,
      pendingUserResponse: 0,
      onHold: health.onHold,
      resolvedToday: completedToday,
      closedToday: completedToday,
      cancelled,
      slaAtRisk: health.atRisk,
      slaCompliancePct: health.slaCompliancePct,
      overdueTickets: health.breached,
      criticalTickets: countRowsByCriticality(list, 'critical'),
      highPriorityTickets: countRowsByCriticality(list, 'high'),
    };
  }

  if (mode === 'employee') {
    const refex = usesRefexServiceWorkflow();
    const openTickets = refex
      ? 0
      : list.filter((r) => matchesEmployeeStatusTab(r, 'Open')).length;
    const inProgress = list.filter((r) => matchesEmployeeStatusTab(r, 'InProgress')).length;
    const onHold = list.filter((r) => matchesEmployeeStatusTab(r, 'Hold')).length;
    const pendingUser = list.filter((r) => isAgentItemStatusPendingUser(r) && isItsmRowActive(r)).length;
    const resolvedToday = list.filter((r) => matchesEmployeeStatusTab(r, 'Resolved') && isDashboardRowClosedToday(r)).length;
    const cancelled = list.filter((r) => matchesEmployeeStatusTab(r, 'Cancelled')).length;
    const closedToday = resolvedToday + list.filter((r) => matchesEmployeeStatusTab(r, 'Cancelled') && isDashboardRowClosedToday(r)).length;

    return {
      openTickets,
      inProgress,
      pendingUserResponse: pendingUser,
      onHold,
      resolvedToday,
      closedToday,
      cancelled,
      slaAtRisk: health.atRisk,
      slaCompliancePct: health.slaCompliancePct,
      overdueTickets: health.breached,
      criticalTickets: countRowsByCriticality(list, 'critical'),
      highPriorityTickets: countRowsByCriticality(list, 'high'),
    };
  }

  const matchTab = mode === 'team' || mode === 'admin' || mode === 'approver'
    ? (tab) => (r) => matchesAgentServiceTabTeam(r, tab)
    : (tab) => (r) => matchesAgentServiceTab(r, tab, user);

  const openTickets = list.filter(matchTab('OpenTickets')).length;
  const inProgress = list.filter(matchTab('PendingTask')).length;
  const onHold = list.filter((r) => isAgentItemStatusOnHold(r) && isItsmRowActive(r)).length;
  const pendingUserResponse = list.filter((r) => isAgentItemStatusPendingUser(r) && isItsmRowActive(r)).length;
  const resolvedToday = list.filter((r) => isAgentItemStatusResolved(r) && isDashboardRowClosedToday(r)).length;
  const cancelled = list.filter(matchTab('Cancelled')).length;
  const closedToday = resolvedToday + list.filter((r) => isAgentItemStatusCancelled(r) && isDashboardRowClosedToday(r)).length;

  return {
    openTickets,
    inProgress,
    pendingUserResponse,
    onHold,
    resolvedToday,
    closedToday,
    cancelled,
    slaAtRisk: health.atRisk,
    slaCompliancePct: health.slaCompliancePct,
    overdueTickets: health.breached,
    criticalTickets: countRowsByCriticality(list, 'critical'),
    highPriorityTickets: countRowsByCriticality(list, 'high'),
  };
}

export function resolveEntityProfile(entityKey) {
  if (entityKey === 'Refex' || entityKey === 'Venwind') return REFEX_PROFILE;
  // Extrovis + Kavis / Pharma Pack / Modepro share All_tickets_A00.
  if (entityKey === 'Extrovis' || isExtrovisReportEntity(entityKey)) return EXTROVIS_PROFILE;
  return activeDashboardProfile;
}

/** Temporarily switch Kissflow report profile for entity-scoped API calls. */
export async function withEntityDashboardProfile(entityKey, fn) {
  const prev = activeDashboardProfile;
  const next = resolveEntityProfile(entityKey) || prev;
  try {
    setITDashboardProfile(next);
    return await fn();
  } finally {
    // Only restore nested same-entity calls. Never stomp a newer entity profile
    // (user may have switched Extrovis ↔ Refex while this request was in flight).
    if (activeDashboardProfile?.id === next?.id && prev?.id === next?.id) {
      setITDashboardProfile(prev);
    }
  }
}

export async function fetchITAdminDashboardDataForEntity(kfInstance, entityKey, page = 1, pageSize = 100, options = {}) {
  return withEntityDashboardProfile(entityKey, () => fetchITAdminDashboardData(kfInstance, page, pageSize, options));
}

export async function fetchITAgentDashboardDataForEntity(kfInstance, entityKey, page = 1, pageSize = 100, options = {}) {
  return withEntityDashboardProfile(entityKey, () => fetchITAgentDashboardData(kfInstance, page, pageSize, options));
}

/** Map admin fetch payload under the active entity profile (same pattern as final approver). */
export function mapAdminFetchResult(result, { entityKey } = {}) {
  const mapRows = () => {
    const mappedService = (result.serviceItems || []).map(mapReportRow);
    const mappedCr = (result.changeItems || []).map(mapChangeRequestRow);
    // Refex dedicated process — no client entity filter.
    // Extrovis All_tickets is multi-entity — always filter by Entity column.
    const skipServiceEntityFilter = activeDashboardProfile?.id === 'refex'
      || entityKey === 'Refex';
    const serviceRows = skipServiceEntityFilter
      ? mappedService
      : filterRowsByEntityKey(
        filterEntityScopedRows(mappedService, { kind: 'service' }),
        entityKey,
      );
    return {
      serviceRows,
      crRows: filterRowsByEntityKey(
        filterEntityScopedRows(mappedCr, { kind: 'cr' }),
        entityKey,
      ),
    };
  };

  if (entityKey) {
    return withEntityDashboardProfile(entityKey, async () => mapRows());
  }
  return Promise.resolve(mapRows());
}

export async function fetchITApproverDashboardDataForEntity(kfInstance, entityKey, page = 1, pageSize = 100, options = {}) {
  return withEntityDashboardProfile(entityKey, () => fetchITApproverDashboardData(kfInstance, page, pageSize, options));
}

/** Filter mapped rows to a single entity (ModePro / Extrovis / Refex). */
export function filterRowsByEntityKey(rows, entityKey) {
  if (!entityKey) return rows || [];
  return (rows || []).filter((row) => matchesFinalLevelEntityTab(row, entityKey));
}

const MIS_PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

function normalizeMisFilterValue(value) {
  const v = normalizeText(value);
  return !v || v === '—' ? '' : v;
}

function matchesMisColumnFilter(row, field, selected) {
  if (!selected) return true;
  return normalizeMisFilterValue(row?.[field]) === selected;
}

/** Narrow MIS table rows by category, priority, and optional entity. */
function matchesAssignedToFilter(row, assignedTo = '') {
  const selected = normalizeText(assignedTo);
  if (!selected || selected === 'All') return true;
  const display = normalizeText(row?.assignedToDisplay || row?.assignedTo);
  if (!display || display === '—') return false;
  const selectedKey = compactPersonFilterKey(selected);
  const displayKey = compactPersonFilterKey(display);
  if (selectedKey && displayKey && (displayKey === selectedKey || displayKey.includes(selectedKey) || selectedKey.includes(displayKey))) {
    return true;
  }
  return display.toLowerCase().includes(selected.toLowerCase());
}

function matchesRequesterFilter(row, requester = '') {
  const selected = normalizeText(requester);
  if (!selected || selected === 'All') return true;
  const display = normalizeText(row?.requesterName || row?.requester || row?.createdBy).toLowerCase();
  if (!display || display === '—') return false;
  return display.includes(selected.toLowerCase());
}

/** MIS SLA column filter options (matches getSlaTiming / hold / closed states). */
export const MIS_SLA_FILTER_OPTIONS = [
  { value: 'ok', label: 'On Track' },
  { value: 'warning', label: 'At Risk' },
  { value: 'breached', label: 'Breached' },
  { value: 'hold', label: 'Hold' },
];

/** Normalize SLA timing state for MIS column filter. */
export function getMisSlaFilterState(row) {
  if (isRefexServiceProcessCompleted(row) || isRefexServiceClosedTicket(row)
    || isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) {
    const closedDisplay = getRefexServiceSlaMisDisplay(row, { isCompletedTab: true });
    if (closedDisplay.state === 'breached') return 'breached';
    if (closedDisplay.state === 'ok') return 'ok';
    return 'ok';
  }
  if (isSlaHoldRow(row)) return 'hold';
  const timing = getSlaTiming(row);
  const state = normalizeText(timing?.state).toLowerCase();
  if (state === 'hold') return 'hold';
  if (!timing?.hasSla || !state || state === 'none' || state === 'completed' || state === 'paused') {
    return 'ok';
  }
  if (state === 'ok' || state === 'warning' || state === 'breached') return state;
  return 'ok';
}

/**
 * SLA filter options for the active tab.
 * If no row has a usable SLA/hold state, return empty so the header can hide the filter.
 */
export function getMisSlaFilterOptionsForRows(rows = []) {
  const states = new Set();
  (rows || []).forEach((row) => {
    const state = getMisSlaFilterState(row);
    if (state && state !== 'none') states.add(state);
  });
  if (!states.size) return [];
  return MIS_SLA_FILTER_OPTIONS.filter((opt) => states.has(opt.value));
}

/**
 * Due overlay — only open tickets with SLA breached (same as SLA Breached Open KPI).
 * Applied on top of Weekly / Monthly / FY (does not replace the period filter).
 */
export function matchesMisDuePriorityRow(row) {
  if (!row) return false;

  // Reopen window / completed / rejected are not Due.
  if (isRefexServiceRejectedTicket(row)) return false;
  if (isRefexServiceClosedTicket(row) || isRefexServiceProcessCompleted(row)) return false;
  if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row)) return false;

  return isServiceQueueSlaBreachedTicket(row);
}

function resolveClosedByFilterValue(row) {
  return normalizeMisFilterValue(
    row?.closedBy
    || row?.completedBy
    || row?.modifiedBy
    || row?.assignedToDisplay
    || row?.assignedTo,
  );
}

/** Timestamp used for Reopened On MIS filtering. */
export function getDashboardRowReopenedDateMs(row) {
  const raw = row?.reopenedAtRaw || row?.reopenedOnRaw || null;
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

export function applyMisColumnFilters(rows, {
  category = '',
  criticality = '',
  entity = '',
  company = '',
  ticketType = '',
  assignedTo = '',
  requester = '',
  ticketStatus = '',
  sla = '',
  subCategory = '',
  source = '',
  closedBy = '',
  subject = '',
  stages = '',
  createdDateFrom = '',
  createdDateTo = '',
  closedDateFrom = '',
  closedDateTo = '',
  reopenedDateFrom = '',
  reopenedDateTo = '',
  categoryField = 'category',
  resolveTicketStatus = null,
  resolveStage = null,
} = {}) {
  let list = (rows || []).filter((row) => {
    if (!matchesMisColumnFilter(row, categoryField, category)) return false;
    if (!matchesMisColumnFilter(row, 'subCategory', subCategory)) return false;
    if (!matchesMisColumnFilter(row, 'criticality', criticality)) return false;
    if (!matchesMisColumnFilter(row, 'entity', entity)) return false;
    if (!matchesRefexCompanyFilter(row, company)) return false;
    if (!matchesMisColumnFilter(row, 'ticketType', ticketType)) return false;
    if (!matchesMisColumnFilter(row, 'source', source)) return false;
    if (subject) {
      const actual = normalizeMisFilterValue(row?.subject);
      if (actual !== normalizeMisFilterValue(subject)) return false;
    }
    if (stages) {
      const actual = typeof resolveStage === 'function'
        ? normalizeMisFilterValue(resolveStage(row))
        : normalizeMisFilterValue(row?.ticketStage || row?.processStages);
      if (actual !== normalizeMisFilterValue(stages)) return false;
    }
    if (!matchesAssignedToFilter(row, assignedTo)) return false;
    if (!matchesRequesterFilter(row, requester)) return false;
    if (closedBy) {
      if (resolveClosedByFilterValue(row) !== normalizeMisFilterValue(closedBy)) return false;
    }
    if (ticketStatus) {
      const status = typeof resolveTicketStatus === 'function'
        ? resolveTicketStatus(row)
        : normalizeMisFilterValue(row?.ticketStatus);
      const wanted = normalizeMisFilterValue(ticketStatus);
      const actual = normalizeMisFilterValue(status);
      if (actual !== wanted) {
        // Rejected is treated as Closed for the MIS status filter only.
        if (!(wanted === 'closed' && actual === 'rejected')) return false;
      }
    }
    if (sla) {
      if (getMisSlaFilterState(row) !== normalizeText(sla).toLowerCase()) return false;
    }
    return true;
  });
  if (createdDateFrom || createdDateTo) {
    list = applyDashboardDateRangeFilter(list, {
      from: createdDateFrom,
      to: createdDateTo || createdDateFrom,
    });
  }
  if (closedDateFrom || closedDateTo) {
    list = applyDashboardDateRangeFilter(
      list,
      {
        from: closedDateFrom,
        to: closedDateTo || closedDateFrom,
      },
      getDashboardRowClosedDateMs,
    );
  }
  if (reopenedDateFrom || reopenedDateTo) {
    list = applyDashboardDateRangeFilter(
      list,
      {
        from: reopenedDateFrom,
        to: reopenedDateTo || reopenedDateFrom,
      },
      getDashboardRowReopenedDateMs,
    );
  }
  return list;
}

/** Distinct assignee names for Assigned To filter dropdowns. */
function rememberPersonFilterOption(map, value) {
  const text = resolvePersonDisplayName(value) || displayItsmPersonName(value);
  if (!text || text === '—') return;
  const key = compactPersonFilterKey(text) || text.toLowerCase().replace(/\s+/g, ' ');
  const prev = map.get(key);
  // Same person may appear as "Porcheiziyan" / "Porcheiziyan M" — keep the richest label.
  if (!prev || text.length > prev.length) map.set(key, text);
}

function personFilterOptionsFromMap(map) {
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

export function collectAssigneeFilterOptions(rows) {
  const names = new Map();
  (rows || []).forEach((row) => {
    const display = normalizeText(row?.assignedToDisplay || row?.assignedTo);
    if (display && display !== '—') {
      display.split(',').forEach((part) => rememberPersonFilterOption(names, part.trim()));
    }
    if (Array.isArray(row?.assignedToRaw)) {
      row.assignedToRaw.forEach((entry) => rememberPersonFilterOption(names, entry));
    }
  });
  return personFilterOptionsFromMap(names);
}

/** Distinct requester names for Requester filter dropdowns. */
export function collectRequesterFilterOptions(rows) {
  const names = new Map();
  (rows || []).forEach((row) => {
    [
      row?.requesterName,
      row?.requester,
      row?.createdBy,
      row?.requesterNameRaw,
      row?.createdByRaw,
    ].forEach((candidate) => rememberPersonFilterOption(names, candidate));
  });
  return personFilterOptionsFromMap(names);
}

function parseDashboardDateInput(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const parts = text.split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** True when local today falls inside the dashboard from/to date range (YYYY-MM-DD). */
export function dashboardDateRangeIncludesToday({ from = '', to = '' } = {}, referenceDate = new Date()) {
  if (!from && !to) return true;
  const today = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(today.getTime())) return true;
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayKey = `${y}-${m}-${d}`;
  const fromKey = from || '0000-01-01';
  const toKey = to || '9999-12-31';
  return todayKey >= fromKey && todayKey <= toKey;
}

/** Timestamp used for dashboard date-range filtering (requested date preferred). */
export function getDashboardRowDateMs(row) {
  const rawItem = row?.raw ?? row;
  const parsed = parseKissflowDateTime(
    row?.requestedDateTimeRaw
    || row?.createdAtRaw
    || rawItem?._created_at
    || row?.modifiedAtRaw
    || rawItem?._modified_at,
  );
  return parsed ? parsed.getTime() : null;
}

/** Timestamp used for Closed Date MIS filtering. */
export function getDashboardRowClosedDateMs(row) {
  const raw = row?.closedAtRaw
    || row?.completedItem?._modified_at
    || row?.completedItem?.Modified_At
    || row?.completedItem?.completedAt
    || row?.modifiedAtRaw
    || row?.raw?._modified_at
    || null;
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

/** Keep rows whose date falls within the applied from/to range (inclusive). */
export function applyDashboardDateRangeFilter(
  rows,
  { from = '', to = '' } = {},
  getRowDateMs = getDashboardRowDateMs,
) {
  if (!from && !to) return rows || [];

  const fromDate = parseDashboardDateInput(from);
  const toDate = parseDashboardDateInput(to);
  const fromMs = fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime() : null;
  const toMs = toDate
    ? new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999).getTime()
    : null;
  const resolveMs = typeof getRowDateMs === 'function' ? getRowDateMs : getDashboardRowDateMs;

  return (rows || []).filter((row) => {
    let rowMs = resolveMs(row);
    // Closed / reopen-hold tickets must use Closed Date for period filters —
    // otherwise old Created dates drop tickets that closed this week/FY.
    if (isRefexServiceClosedTicket(row) || isRefexServiceProcessCompleted(row)) {
      const closedMs = getDashboardRowClosedDateMs(row);
      if (closedMs != null) rowMs = closedMs;
    } else if (rowMs == null && (isRefexServiceClosedTicket(row) || isRefexServiceProcessCompleted(row))) {
      rowMs = getDashboardRowClosedDateMs(row);
    }
    if (rowMs == null) {
      // Email / channel tickets often omit Requested DateTime.
      // Keep undated open rows only for the current period (range includes today).
      // Past FY / month / week must stay empty when they have no dated tickets.
      if (!isRefexServiceOpenTicket(row)) return false;
      return dashboardDateRangeIncludesToday({ from, to });
    }
    if (fromMs != null && rowMs < fromMs) return false;
    if (toMs != null && rowMs > toMs) return false;
    return true;
  });
}

/** Distinct values for MIS table filter dropdowns (current tab scope). */
export function collectMisFilterOptions(rows, field) {
  const values = new Set();
  (rows || []).forEach((row) => {
    const v = normalizeMisFilterValue(row?.[field]);
    if (v) values.add(v);
  });
  const list = Array.from(values);
  if (field === 'criticality') {
    const ordered = MIS_PRIORITY_ORDER.filter((name) => list.includes(name));
    const rest = list.filter((name) => !MIS_PRIORITY_ORDER.includes(name)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...rest];
  }
  return list.sort((a, b) => a.localeCompare(b));
}

/** Employee analytics — ticket counts grouped by category (top N). */
export function computeCategoryBreakdown(rows, { field = 'category', limit = 6, fallbackLabel = 'Uncategorized' } = {}) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const raw = normalizeText(row?.[field]);
    const name = !raw || raw === '—' ? fallbackLabel : raw;
    map.set(name, (map.get(name) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function computeEmployeeCategoryBreakdown(rows, limit = 6) {
  return computeCategoryBreakdown(rows, { field: 'category', limit, fallbackLabel: 'Uncategorized' });
}

export function computeEntityBreakdown(rows, limit = 6) {
  return computeCategoryBreakdown(rows, { field: 'entity', limit, fallbackLabel: 'Unknown Entity' });
}

export function computeChangeTypeBreakdown(rows, limit = 6) {
  return computeCategoryBreakdown(rows, { field: 'changeType', limit, fallbackLabel: 'Unspecified' });
}

/** Group rows by criticality (priority / change risk). */
export function computeCriticalityBreakdown(rows, includeRow = () => true) {
  const order = ['Critical', 'High', 'Medium', 'Low'];
  const map = new Map();
  (rows || []).forEach((row) => {
    if (!includeRow(row)) return;
    const name = row?.criticality && row.criticality !== '—' ? row.criticality : 'Unknown';
    map.set(name, (map.get(name) || 0) + 1);
  });
  const known = order.filter((name) => (map.get(name) || 0) > 0).map((name) => ({
    name,
    value: map.get(name),
  }));
  const unknown = map.get('Unknown');
  if (unknown) known.push({ name: 'Unknown', value: unknown });
  return known;
}

/** Employee analytics — open + in-progress tickets by criticality. */
export function computeEmployeePriorityBreakdown(rows) {
  return computeCriticalityBreakdown(rows, (row) => {
    const bucket = getEmployeeItemStatusBucket(row);
    return bucket === 'Open' || bucket === 'InProgress';
  });
}

export function computeAgentPriorityBreakdown(rows, user = null) {
  if (usesRefexServiceWorkflow()) {
    return computeCriticalityBreakdown(rows, (row) =>
      ['AssignedToMe', 'InProgress', 'OpenTickets', 'Reopened'].some(
        (tab) => matchesRefexTechSupportTab(row, tab, user),
      ),
    );
  }
  return computeCriticalityBreakdown(rows, (row) =>
    ['OpenTickets', 'PendingTask', 'HoldTasks'].some((tab) => matchesAgentServiceTab(row, tab, user)),
  );
}

export function computeManagerPriorityBreakdown(rows) {
  return computeCriticalityBreakdown(rows, (row) => matchesManagerStatusTab(row, 'AgentPending'));
}

export function computeAdminPriorityBreakdown(rows) {
  return computeCriticalityBreakdown(rows, (row) => matchesAdminStatusTab(row, 'ITAgent'));
}

export function computeApproverServicePriorityBreakdown(rows) {
  return computeCriticalityBreakdown(rows, (row) =>
    ['AgentPending', 'OpenTickets', 'OnHold'].some((tab) => matchesApproverServiceTab(row, tab)),
  );
}

export function computeCrCriticalityBreakdown(rows) {
  return computeCriticalityBreakdown(rows, (row) => !isCrCompletedItem(row));
}

export function computeAgentServiceKpisFromRows(rows, user = null) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (usesRefexServiceWorkflow()) {
    const assigned = safeRows.filter((r) => matchesRefexTechSupportTab(r, 'AssignedToMe', user)).length;
    const inProgress = safeRows.filter((r) => matchesRefexTechSupportTab(r, 'InProgress', user)).length;
    const reopened = safeRows.filter((r) => matchesRefexTechSupportTab(r, 'Reopened', user)).length;
    const closed = safeRows.filter((r) => matchesRefexTechSupportTab(r, 'Closed', user)).length;
    const { slaAtRisk, slaBreached } = computeSlaKpisFromRows(safeRows);
    return {
      openTickets: assigned,
      pending: inProgress,
      holdTasks: 0,
      resolved: closed,
      cancelled: 0,
      completed: closed,
      assigned,
      inProgress,
      reopened,
      closed,
      slaAtRisk,
      slaBreached,
    };
  }
  const openTickets = safeRows.filter((r) => matchesAgentServiceTab(r, 'OpenTickets', user)).length;
  const pending = safeRows.filter((r) => matchesAgentServiceTab(r, 'PendingTask', user)).length;
  const holdTasks = safeRows.filter((r) => matchesAgentServiceTab(r, 'HoldTasks', user)).length;
  const resolved = safeRows.filter((r) => matchesAgentServiceTab(r, 'Resolved', user)).length;
  const cancelled = safeRows.filter((r) => matchesAgentServiceTab(r, 'Cancelled', user)).length;
  const { slaAtRisk, slaBreached } = computeSlaKpisFromRows(safeRows);
  return { openTickets, pending, holdTasks, resolved, cancelled, completed: resolved, slaAtRisk, slaBreached };
}

export function computeAgentCrKpisFromRows(rows) {
  const inApproval = (rows || []).filter((r) => matchesAgentCrStatusTab(r, 'InApproval')).length;
  const implementation = (rows || []).filter((r) => matchesAgentCrStatusTab(r, 'Implementation')).length;
  const completed = (rows || []).filter((r) => matchesAgentCrStatusTab(r, 'Completed')).length;
  return { inApproval, implementation, completed };
}

export function applyAgentCrFilters(rows, {
  search = '',
  statusTab = 'InApproval',
  category = '',
  criticality = '',
  entity = '',
  ticketType = '',
} = {}) {
  let list = rows.filter((row) => matchesAgentCrStatusTab(row, statusTab));
  list = applyMisColumnFilters(list, {
    category,
    criticality,
    entity,
    ticketType,
    categoryField: 'changeType',
  });
  const q = normalizeText(search).toLowerCase();
  if (q) {
    list = list.filter((row) =>
      [
        row.requestId, row.summary, row.ticketType, row.category, row.changeType,
        row.currentStep, row.statusLabel, row.requesterName, row.changeReason,
      ].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }
  if (isExtrovisServiceDashboardContext()) {
    return sortDashboardRowsByCreatedDate(list, 'desc');
  }
  return list;
}

export async function fetchITChangeRequestReport(kfInstance, page = 1, pageSize = 100) {
  const accountId = resolveAccountId(kfInstance);
  const path = getChangeRequestReportPath(accountId, page, pageSize);

  if (kfInstance?.api) {
    const resp = await kfInstance.api(path, { method: 'GET', headers: { Accept: 'application/json' } });
    return resp?.data ?? resp ?? { Data: [] };
  }

  const base = resolveKissflowBaseUrl();
  const res = await fetch(`${base}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Change request report failed: ${res.status}`);
  return res.json();
}

export async function fetchITAgentDashboardData(kfInstance, page = 1, pageSize = 100, options = {}) {
  const serviceResult = options.skipServiceFetch
    ? { items: [], fromMyTasksApi: false, hasMore: false }
    : await fetchITAgentMyTasks(kfInstance, page, pageSize);

  if (options.skipChangeFetch) {
    return {
      serviceItems: serviceResult.items || [],
      changeItems: [],
      liveCrIds: new Set(),
      fromMyTasksApi: serviceResult.fromMyTasksApi,
      hasMoreService: serviceResult.hasMore ?? false,
      hasMoreChange: false,
      pageSize,
    };
  }

  const crCollected = [];
  const entityScoped = isEntityScopedDashboardProfile();

  if (kfInstance?.api && !entityScoped) {
    const paths = buildChangeRequestProcessApiPaths(kfInstance);
    try {
      const resp = await kfGetJson(kfInstance, paths.myItemsPath('inprogress', page, pageSize));
      const items = extractItemsFromResponse(resp);
      if (items.length) crCollected.push(...items);
    } catch (err) {
      console.warn('CR myitems/inprogress failed:', err?.message || err);
    }
  }

  if (kfInstance?.api) {
    const paths = buildChangeRequestProcessApiPaths(kfInstance);
    const implPendingSteps = entityScoped
      ? (activeDashboardProfile?.id === 'extrovis'
        ? ['Implementation Extrovis']
        : ['Implementation Refex'])
      : [
        CR_IMPLEMENTATION_STEP,
        'Implementation Extrovis',
        'IT Agent Extrovis',
        'Implementation Refex',
        'IT Agent Refex',
      ];
    for (const stepName of implPendingSteps) {
      try {
        const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(stepName, page, pageSize));
        const items = extractItemsFromResponse(resp).filter(
          (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
        );
        if (items.length) {
          crPendingImplementationCache = { at: Date.now(), items };
          crCollected.push(...items);
        }
      } catch (err) {
        console.warn(`CR implementation pending (${stepName}) failed:`, err?.message || err);
      }
    }
  }

  const liveCrIds = new Set(
    crCollected.map((it) => resolveCrProcessInstanceId(it)).filter(Boolean),
  );

  let changeItems = [];
  let changeReportItems = [];
  try {
    const crReport = await fetchITChangeRequestReport(kfInstance, page, pageSize);
    changeReportItems = extractItemsFromResponse(crReport).filter(
      (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
    );
    changeItems = mergeUniqueCrItems([changeReportItems, crCollected]).filter(
      (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
    );
  } catch (err) {
    console.warn('change request report failed:', err?.message || err);
    changeItems = mergeUniqueCrItems([crCollected]).filter(
      (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
    );
  }

  return {
    serviceItems: serviceResult.items || [],
    changeItems,
    liveCrIds,
    fromMyTasksApi: serviceResult.fromMyTasksApi,
    hasMoreService: serviceResult.hasMore ?? false,
    hasMoreChange: reportPageHasMore(changeReportItems, pageSize),
    pageSize,
  };
}

function buildChangeRequestProcessApiPaths(kfInstance) {
  const accountId = resolveAccountId(kfInstance);
  const appQuery = `_application_id=${encodeURIComponent(APP_ID)}`;
  const base = `/process/2/${accountId}/${CHANGE_REQUEST_PROCESS_ID}`;
  return {
    pendingAtStepPath(activityId, pageNumber = 1, pageSize = 100) {
      return `${base}/pending/${encodeURIComponent(activityId)}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    myItemsPath(status = 'all', pageNumber = 1, pageSize = 100) {
      return `${base}/myitems/${status}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    participatedActivityCountPath() {
      return `${base}/participated/activity/count?${appQuery}`;
    },
    participatedAtActivityPath(activityId, pageNumber = 1, pageSize = 100) {
      return `${base}/participated/activity/${encodeURIComponent(activityId)}?page_number=${pageNumber}&page_size=${pageSize}&apply_preference=true&${appQuery}`;
    },
    /** @deprecated Kissflow uses activity-scoped participated APIs. */
    participatedPath(pageNumber = 1, pageSize = 100) {
      return `${base}/participated?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&${appQuery}`;
    },
    instancePath(instanceId) {
      return `${base}/${encodeURIComponent(instanceId)}?${appQuery}`;
    },
    instanceStepPath(instanceId, stepActivityId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(stepActivityId)}?${appQuery}`;
    },
    instanceWithActivityPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}?${appQuery}`;
    },
    instanceSubmitPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/submit?${appQuery}`;
    },
    instanceFieldDropdownPath(instanceId, activityInstanceId, fieldName) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/${encodeURIComponent(fieldName)}/dropdown?&${appQuery}`;
    },
    instanceActivityPath(instanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/activity?${appQuery}`;
    },
  };
}

/**
 * Kissflow participated pattern (Service + CR):
 * count API → then page each activity with Count > 0.
 * Relative paths only — host comes from the embedded Kissflow account (prod has no development- prefix).
 */
async function fetchParticipatedItemsByActivity(kfInstance, paths, {
  page = 1,
  pageSize = 100,
  maxPages = 30,
} = {}) {
  if (!kfInstance?.api || !paths?.participatedActivityCountPath) return [];

  let activityCounts = [];
  try {
    const countResp = await kfGetJson(kfInstance, paths.participatedActivityCountPath());
    activityCounts = Array.isArray(countResp)
      ? countResp
      : (Array.isArray(countResp?.Data) ? countResp.Data : []);
  } catch (err) {
    console.warn('participated/activity/count failed:', err?.message || err);
    return [];
  }

  const activityIds = activityCounts
    .filter((row) => Number(row?.Count) > 0 && normalizeText(row?._id))
    .map((row) => normalizeText(row._id));
  if (!activityIds.length) return [];

  const batches = await Promise.all(activityIds.map(async (activityId) => {
    const collected = [];
    let pageNumber = page;
    let hasMore = true;
    while (hasMore && pageNumber <= maxPages) {
      try {
        const resp = await kfGetJson(
          kfInstance,
          paths.participatedAtActivityPath(activityId, pageNumber, pageSize),
        );
        const items = extractItemsFromResponse(resp);
        collected.push(...items);
        hasMore = items.length >= pageSize;
        pageNumber += 1;
      } catch (err) {
        console.warn(
          `participated/activity/${activityId} page ${pageNumber} failed:`,
          err?.message || err,
        );
        break;
      }
    }
    return collected;
  }));

  return batches.flat();
}

function parseFieldDropdownResponse(resp) {
  const list = Array.isArray(resp)
    ? resp
    : Array.isArray(resp?.data)
      ? resp.data
      : Array.isArray(resp?.Data)
        ? resp.Data
        : [];
  return list.map((opt) => normalizeText(opt)).filter(Boolean);
}

function uniqueStatusOptions(pool) {
  return [...new Set((pool || []).map((opt) => normalizeText(opt)).filter(Boolean))];
}

function pickMatchingStatusOptions(pool, labels) {
  const wanted = new Set(labels.map((label) => getCanonicalAgentItemStatusToken(label)));
  const matched = pool.filter((opt) => wanted.has(getCanonicalAgentItemStatusToken(opt)));
  return matched.length ? matched : labels.map((label) => normalizeText(label)).filter(Boolean);
}

/** Always expose agent update statuses — use Kissflow label when present, else our alias. */
function resolveAgentUpdateStatusOptions(pool) {
  const seen = new Set();
  const options = [];

  for (const alias of AGENT_UPDATE_STATUS_ALIASES) {
    const token = getCanonicalAgentItemStatusToken(alias);
    if (seen.has(token)) continue;
    const poolMatch = pool.find((opt) => getCanonicalAgentItemStatusToken(opt) === token);
    options.push(poolMatch || alias);
    seen.add(token);
  }

  return options;
}

function resolveEffectiveAgentItemStatus(row) {
  const saved = getRawItemStatus(row).toLowerCase();
  return saved && saved !== '—' ? saved : '';
}

function resolveEffectiveCrFinalStatus(row) {
  const saved = normalizeText(row?.finalStatus);
  return saved && saved !== '—' ? saved.toLowerCase() : '';
}

const AGENT_PICK_STATUS_ALIASES = ['Picked', 'Pickup', 'Pick Up', 'In Progress'];
const AGENT_INITIAL_STATUS_ALIASES = [...AGENT_HOLD_STATUS_ALIASES, ...AGENT_PENDING_USER_STATUS_ALIASES];
const AGENT_POST_PICK_STATUS_ALIASES = [...AGENT_TERMINAL_STATUS_ALIASES];

/**
 * Stage Item_Status options for IT Agent service tasks.
 * Hold / Pending with User can each be used only once per ticket.
 */
export function filterAgentItemStatusOptions(row, apiOptions = []) {
  const pool = uniqueStatusOptions(apiOptions?.length ? apiOptions : ITEM_STATUS_OPTIONS);
  const status = getCanonicalAgentItemStatusToken(getRawItemStatus(row));
  const terminals = pickMatchingStatusOptions(pool, AGENT_TERMINAL_STATUS_ALIASES);

  if (status === 'onhold' || status === 'pendinguserresponse') {
    return terminals;
  }

  if (status === 'resolved' || status === 'cancelled') {
    return terminals;
  }

  let options = resolveAgentUpdateStatusOptions(pool).filter(
    (opt) => !['open', 'inprogress'].includes(getCanonicalAgentItemStatusToken(opt)),
  );

  if (hasAgentUsedHold(row)) {
    options = options.filter((opt) => !isOnHoldStatusLabel(opt));
  }
  if (hasAgentUsedPendingUser(row)) {
    options = options.filter((opt) => !isPendingUserStatusLabel(opt));
  }

  return options.length ? options : AGENT_UPDATE_STATUS_ALIASES;
}

/**
 * Stage final_status options for CR Implementation.
 * Empty → Picked only; after pick → Completed only.
 */
export function filterCrImplementationFinalStatusOptions(row, apiOptions = []) {
  const pool = uniqueStatusOptions(apiOptions?.length ? apiOptions : CR_IMPLEMENTATION_STATUS_OPTIONS);
  const status = resolveEffectiveCrFinalStatus(row);
  const assigned = normalizeText(row?.assignedTo);
  const picked = status === 'picked' || status === 'pickup' || status === 'pick up'
    || (!status && assigned && assigned !== '—');

  if (status === 'completed') {
    return pickMatchingStatusOptions(pool, ['Completed']);
  }

  if (picked) {
    return pickMatchingStatusOptions(pool, ['Completed']);
  }

  return pickMatchingStatusOptions(pool, AGENT_PICK_STATUS_ALIASES);
}

/** Fetch Item_Status dropdown for an IT Agent service task row. */
export async function fetchITAgentItemStatusOptions(kfInstance, row) {
  const { instanceId, activityInstanceId } = resolveAgentSubmitIdsFromReport(row);
  if (!instanceId || !activityInstanceId || !kfInstance?.api) {
    return filterAgentItemStatusOptions(row, ITEM_STATUS_OPTIONS);
  }

  const paths = buildITProcessApiPaths(kfInstance);
  try {
    const resp = await kfGetJson(
      kfInstance,
      paths.instanceFieldDropdownPath(instanceId, activityInstanceId, IT_AGENT_FORM_FIELDS.itemStatus),
    );
    const options = parseFieldDropdownResponse(resp);
    const pool = options.length ? options : ITEM_STATUS_OPTIONS;
    return filterAgentItemStatusOptions(row, pool);
  } catch {
    return filterAgentItemStatusOptions(row, ITEM_STATUS_OPTIONS);
  }
}

/** Fetch final_status dropdown for a Change Request Implementation row. */
export async function fetchCrImplementationFinalStatusOptions(kfInstance, row) {
  const { instanceId, activityInstanceId } = await resolveCrLiveActivityForSubmit(
    kfInstance, row, CR_IMPLEMENTATION_STEP,
  );
  if (!instanceId || !activityInstanceId || !kfInstance?.api) {
    return filterCrImplementationFinalStatusOptions(row, CR_IMPLEMENTATION_STATUS_OPTIONS);
  }

  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  try {
    const resp = await kfGetJson(
      kfInstance,
      paths.instanceFieldDropdownPath(instanceId, activityInstanceId, CR_FORM_FIELDS.finalStatus),
    );
    const options = parseFieldDropdownResponse(resp);
    const pool = options.length ? options : CR_IMPLEMENTATION_STATUS_OPTIONS;
    return filterCrImplementationFinalStatusOptions(row, pool);
  } catch {
    return filterCrImplementationFinalStatusOptions(row, CR_IMPLEMENTATION_STATUS_OPTIONS);
  }
}

export function isCrImplementationWorkflowSubmitStatus(finalStatus) {
  return normalizeText(finalStatus).toLowerCase() === CR_IMPLEMENTATION_SUBMIT_STATUS.toLowerCase();
}

function mergeCrItemWithReport(item, reportItem) {
  if (!reportItem) return item;
  if (!item) return reportItem;

  const merged = { ...reportItem, ...item };
  for (const keys of Object.values(CR_FIELD)) {
    for (const key of keys) {
      const itemVal = item[key];
      const reportVal = reportItem[key];
      if (
        (itemVal === undefined || itemVal === null || itemVal === '')
        && reportVal !== undefined
        && reportVal !== null
        && reportVal !== ''
      ) {
        merged[key] = reportVal;
      }
    }
  }
  return merged;
}

function mergeUniqueCrItems(batches) {
  const byId = new Map();
  for (const batch of batches) {
    for (const item of batch || []) {
      const id = normalizeText(item?._id || item?._item_id);
      if (!id) continue;
      const existing = byId.get(id);
      byId.set(id, existing ? mergeCrItemWithReport(item, existing) : item);
    }
  }
  return Array.from(byId.values());
}

function getChangeRequestProcess(kfInstance) {
  return kfInstance?.app?.getProcess?.(CHANGE_REQUEST_PROCESS_ID) || kfInstance?.getProcess?.(CHANGE_REQUEST_PROCESS_ID) || null;
}

function buildCrImplementationSubmitPayload(instanceId, formData) {
  return {
    _id: instanceId,
    [CR_FORM_FIELDS.finalStatus]: String(formData.finalStatus || '').trim(),
    [CR_FORM_FIELDS.comments]: String(formData.comments || '').trim(),
  };
}

async function findMyCrInprogressItemByInstanceId(kfInstance, instanceId) {
  if (!instanceId) return null;

  if (kfInstance?.api) {
    const paths = buildChangeRequestProcessApiPaths(kfInstance);
    try {
      const resp = await kfGetJson(kfInstance, paths.myItemsPath('inprogress', 1, 200));
      const match = extractItemsFromResponse(resp).find(
        (it) => matchCrInstanceId(it, instanceId),
      );
      if (match) return match;
    } catch {
      // myitems only — avoid myitems/all (500 on this process)
    }
  }

  const process = getChangeRequestProcess(kfInstance);
  if (process?.getMyTasksItems) {
    for (const activityId of ['', ...CR_IMPLEMENTATION_ACTIVITY_IDS]) {
      try {
        const resp = await process.getMyTasksItems({
          activityId: activityId || undefined,
          pageNumber: 1,
          pageSize: 200,
        });
        const match = extractItemsFromResponse(resp).find(
          (it) => matchCrInstanceId(it, instanceId),
        );
        if (match) return match;
      } catch (err) {
        console.warn('CR getMyTasksItems item lookup failed:', err?.message || err);
      }
    }
  }

  return null;
}

/** Merge live myitems context over report row — avoids stale activity ids on submit. */
async function enrichCrRowFromMyTasks(kfInstance, row, stepName = CR_IMPLEMENTATION_STEP) {
  const instanceId = normalizeText(row?.id);
  const liveItem = await findMyCrInprogressItemByInstanceId(kfInstance, instanceId);
  if (!liveItem) return row;

  const mergedRaw = mergeCrItemWithReport(liveItem, row?.raw || row);
  const activityIds = getCrActivityIdsForStep(stepName);
  const activityInstanceId = pickCrReportActivityInstanceId(mergedRaw, stepName)
    || pickCrActivityInstanceIdForStep(liveItem, stepName, activityIds)
    || pickCrActivityInstanceIdForStep(mergedRaw, stepName, activityIds);
  return {
    ...row,
    raw: mergedRaw,
    ...(activityInstanceId ? { activityInstanceId } : {}),
  };
}

async function findCrOpenActivityForStepFromInstance(kfInstance, instanceId, stepName, activityIds) {
  if (!kfInstance?.api || !instanceId) return '';

  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  try {
    const detail = await kfGetJson(kfInstance, paths.instancePath(instanceId));
    const item = detail?.data ?? detail ?? {};

    const fromCurrent = extractCrCurrentStepActivityFromInstance(item, stepName, activityIds);
    if (fromCurrent) return fromCurrent;

    for (const listKey of ['_activities', 'Activities', 'activities', '_open_activities', 'open_activities']) {
      const actId = pickCrActivityIdFromStepList(item[listKey], stepName);
      if (actId && !isWrongStepCrActivityId(item, actId, stepName)) return actId;
    }
  } catch (err) {
    console.warn('CR instance open-activity lookup failed:', err?.message || err);
  }
  return '';
}

/** @deprecated Use fetchITCrApproverActivityInstanceId with CR_IMPLEMENTATION_STEP */
export async function fetchITCrImplementationActivityInstanceId(kfInstance, row) {
  return fetchITCrApproverActivityInstanceId(kfInstance, row, CR_IMPLEMENTATION_STEP, { skipCache: true });
}

/** @deprecated Use hydrateCrRowFromInstance with CR_IMPLEMENTATION_STEP */
export async function hydrateCrImplementationRowFromMyTasks(kfInstance, row) {
  return hydrateCrRowFromInstance(kfInstance, row, CR_IMPLEMENTATION_STEP);
}

export async function submitITChangeRequestImplementation(kfInstance, row, formData) {
  if (!kfInstance?.api) throw new Error('Submit not available — open inside Kissflow');

  const finalStatus = String(formData.finalStatus || CR_IMPLEMENTATION_SUBMIT_STATUS).trim()
    || CR_IMPLEMENTATION_SUBMIT_STATUS;
  const comments = String(formData.comments || '').trim();

  const isWorkflowSubmit = isCrImplementationWorkflowSubmitStatus(finalStatus);
  if (isWorkflowSubmit && !comments) {
    throw new Error('Comments are required before marking as completed');
  }

  const { instanceId, activityInstanceId } = await resolveCrLiveActivityForSubmit(
    kfInstance, row, CR_IMPLEMENTATION_STEP,
  );

  if (!instanceId) throw new Error('Missing instance id for this change request');
  if (!activityInstanceId) {
    throw new Error(
      'Could not resolve Implementation activity for this change request. Expand the row, wait a moment, then submit again.',
    );
  }

  const payload = buildCrImplementationSubmitPayload(instanceId, { ...formData, finalStatus });

  if (isWorkflowSubmit) {
    return submitCrWorkflowStep(kfInstance, instanceId, activityInstanceId, payload);
  }

  return saveCrApprovalFormFields(kfInstance, instanceId, activityInstanceId, payload);
}

export function isCrAtStep(row, stepName) {
  return crStepMatches(getCrCurrentStepValue(row), stepName, getCrActivityIdsForStep(stepName));
}

function isCrApproverAppRoleForStep(entry, stepName) {
  if (!entry || typeof entry !== 'object') return false;
  const kind = normalizeText(entry.Kind).toLowerCase();
  if (kind !== 'approle') return false;

  const name = normalizeText(entry.Name).toLowerCase();
  if (!name) return false;

  if (crStepMatches(stepName, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS)) {
    return (name.includes('first') && name.includes('approver'))
      || (name.includes('it manager') && (name.includes('approver') || name.includes('refex') || name.includes('extrovis')))
      || (name.includes('first') && name.includes('it') && name.includes('manager'))
      || (name.includes('itmanager') && (name.includes('refex') || name.includes('extrovis')))
      || (name.includes('firstlevel') && (name.includes('refex') || name.includes('extrovis')));
  }
  if (crStepMatches(stepName, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS)) {
    return (name.includes('final') && name.includes('approver'))
      || (name.includes('it head') && (name.includes('approver') || name.includes('refex') || name.includes('extrovis')))
      || (name.includes('final') && name.includes('it') && name.includes('head'))
      || (name.includes('ithead') && (name.includes('refex') || name.includes('extrovis')))
      || (name.includes('finalapprover') && (name.includes('refex') || name.includes('extrovis')))
      || (name.includes('finallevel') && name.includes('extrovis'));
  }
  if (crStepMatches(stepName, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS)) {
    return name.includes('it agent') || name.includes('implementation');
  }
  return name.includes('approver');
}

/** Pending approval queue — only tasks assigned to the signed-in approver (or in live myitems). */
export function isMyCrApproverPendingItem(row, user, approverStep, liveInstanceIds = null) {
  if (!row || !user || !approverStep) return false;
  if (!isCrAtStep(row, approverStep)) return false;

  const rowId = normalizeText(row.id);
  if (liveInstanceIds && rowId && liveInstanceIds.has(rowId)) return true;

  return isAssignedToUser(row.assignedToRaw, user);
}

export function isMyCrApproverItem(row, user, approverStep = '', liveInstanceIds = null) {
  if (!row || !user) return false;

  const rowId = normalizeText(row.id);
  if (liveInstanceIds && rowId && liveInstanceIds.has(rowId)) {
    if (!approverStep || isCrAtStep(row, approverStep)) return true;
  }

  if (isAssignedToUser(row.assignedToRaw, user)) return true;

  const step = approverStep || getCrCurrentStepValue(row);
  const assigned = row.assignedToRaw;
  if (!Array.isArray(assigned) || assigned.length === 0) return false;

  return assigned.some((entry) => isCrApproverAppRoleForStep(entry, step));
}

function isPastCrStep(row, stepName) {
  const stepIdx = getChangeRequestStepIndex(getCrCurrentStepValue(row));
  const targetIdx = getChangeRequestStepIndex(stepName);
  const lastIdx = getChangeRequestStepIndex(row?.lastCompletedStep);
  return stepIdx > targetIdx || lastIdx >= targetIdx;
}

export function matchesFirstLevelApproverTab(row, tabKey, user, liveInstanceIds = null) {
  const completed = isCrCompletedItem(row);
  const atMyStep = isCrAtStep(row, CR_FIRST_APPROVER_STEP);
  const assigned = isMyCrApproverPendingItem(row, user, CR_FIRST_APPROVER_STEP, liveInstanceIds);

  if (tabKey === 'PendingTask') {
    return !completed && atMyStep && assigned;
  }
  if (tabKey === 'Implementation') {
    return !completed && isCrAtStep(row, CR_IMPLEMENTATION_STEP);
  }
  if (tabKey === 'Completed') {
    return completed;
  }
  return true;
}

/** First-level approver — row appears on at least one CR status tab. */
export function matchesAnyFirstLevelApproverTab(row, user, liveInstanceIds = null) {
  return matchesFirstLevelApproverTab(row, 'PendingTask', user, liveInstanceIds)
    || matchesFirstLevelApproverTab(row, 'Implementation', user, liveInstanceIds)
    || matchesFirstLevelApproverTab(row, 'Completed', user, liveInstanceIds);
}

export function matchesFinalLevelApproverTab(row, tabKey, user, liveInstanceIds = null) {
  const completed = isCrCompletedItem(row);
  const step = getCrCurrentStepValue(row);
  const atImplStep = crStepMatches(step, CR_IMPLEMENTATION_STEP, CR_IMPLEMENTATION_ACTIVITY_IDS);
  const atFinalStep = crStepMatches(step, CR_FINAL_APPROVER_STEP, CR_FINAL_APPROVER_ACTIVITY_IDS);
  const atFirstStep = !atFinalStep
    && !atImplStep
    && crStepMatches(step, CR_FIRST_APPROVER_STEP, CR_FIRST_APPROVER_ACTIVITY_IDS);
  const assigned = isMyCrApproverPendingItem(row, user, CR_FINAL_APPROVER_STEP, liveInstanceIds);

  if (tabKey === 'PendingTask') {
    return !completed && atFinalStep && !atImplStep && assigned;
  }
  if (tabKey === 'FirstLevelPending') {
    return !completed && atFirstStep;
  }
  if (tabKey === 'Implementation') {
    return !completed && atImplStep;
  }
  if (tabKey === 'Completed') {
    return completed;
  }
  return true;
}

export function computeFirstLevelApproverKpisFromRows(rows, user, liveInstanceIds = null) {
  const pending = (rows || []).filter((r) => matchesFirstLevelApproverTab(r, 'PendingTask', user, liveInstanceIds)).length;
  const implementation = (rows || []).filter((r) => matchesFirstLevelApproverTab(r, 'Implementation', user, liveInstanceIds)).length;
  const completed = (rows || []).filter((r) => matchesFirstLevelApproverTab(r, 'Completed', user, liveInstanceIds)).length;
  return { total: (rows || []).length, pending, implementation, completed };
}

export function computeFinalLevelApproverKpisFromRows(rows, user, liveInstanceIds = null) {
  const pending = (rows || []).filter((r) => matchesFinalLevelApproverTab(r, 'PendingTask', user, liveInstanceIds)).length;
  const firstLevelPending = (rows || []).filter((r) => matchesFinalLevelApproverTab(r, 'FirstLevelPending', user, liveInstanceIds)).length;
  const implementation = (rows || []).filter((r) => matchesFinalLevelApproverTab(r, 'Implementation', user, liveInstanceIds)).length;
  const completed = (rows || []).filter((r) => matchesFinalLevelApproverTab(r, 'Completed', user, liveInstanceIds)).length;
  return { total: (rows || []).length, pending, firstLevelPending, implementation, completed };
}

/** Pending tasks available to the signed-in user — shown on Service / Changes queue switch. */
export function computeUserQueuePendingCounts({
  kind = 'agent',
  serviceRows = [],
  crRows = [],
  user = null,
  liveCrInstanceIds = null,
} = {}) {
  let servicePending = 0;
  let crPending = 0;

  switch (kind) {
    case 'agent': {
      const rows = serviceRows || [];
      if (usesRefexServiceWorkflow()) {
        servicePending = rows.filter((row) =>
          matchesRefexTechSupportTab(row, 'AssignedToMe', user)
          || matchesRefexTechSupportTab(row, 'InProgress', user),
        ).length;
      } else {
        servicePending = rows.filter((row) =>
          matchesAgentServiceTab(row, 'OpenTickets', user)
          || matchesAgentServiceTab(row, 'PendingTask', user)
          || matchesAgentServiceTab(row, 'HoldTasks', user),
        ).length;
      }
      crPending = (crRows || []).filter((row) =>
        matchesAgentCrStatusTab(row, 'Implementation'),
      ).length;
      break;
    }
    case 'manager':
      servicePending = (serviceRows || []).filter((row) => matchesManagerStatusTab(row, 'AgentPending')).length;
      crPending = (crRows || []).filter((row) => matchesAgentCrStatusTab(row, 'InApproval')).length;
      break;
    case 'admin':
      servicePending = (serviceRows || []).filter((row) => matchesAdminStatusTab(row, 'ITAgent')).length;
      crPending = (crRows || []).filter((row) => matchesAgentCrStatusTab(row, 'InApproval')).length;
      break;
    case 'approver-first':
      servicePending = (serviceRows || []).filter((row) =>
        matchesRefexMonitoringServiceTab(row, 'PendingTask', user, 'me', 'first')
        || matchesApproverServiceTab(row, 'AgentPending'),
      ).length;
      crPending = (crRows || []).filter((row) =>
        matchesFirstLevelApproverTab(row, 'PendingTask', user, liveCrInstanceIds),
      ).length;
      break;
    case 'approver-final':
      servicePending = (serviceRows || []).filter((row) =>
        matchesRefexMonitoringServiceTab(row, 'PendingTask', user, 'me', 'final')
        || matchesApproverServiceTab(row, 'AgentPending'),
      ).length;
      crPending = (crRows || []).filter((row) =>
        matchesFinalLevelApproverTab(row, 'PendingTask', user, liveCrInstanceIds),
      ).length;
      break;
    default:
      break;
  }

  return {
    ServiceQueue: servicePending,
    ChangeRequests: crPending,
  };
}

export function matchesFirstLevelApproverTabTeam(row, tabKey, user, liveInstanceIds = null) {
  if (tabKey === 'PendingTask') {
    return matchesFirstLevelApproverTab(row, 'PendingTask', user, liveInstanceIds);
  }
  return matchesFirstLevelApproverTab(row, tabKey, user, liveInstanceIds);
}

export function matchesFinalLevelApproverTabTeam(row, tabKey, user, liveInstanceIds = null) {
  if (tabKey === 'PendingTask') {
    return matchesFinalLevelApproverTab(row, 'PendingTask', user, liveInstanceIds);
  }
  return matchesFinalLevelApproverTab(row, tabKey, user, liveInstanceIds);
}

/** Rows tied to the signed-in user — created by, assigned, or participated. */
export function matchesDashboardMeScope(row, user) {
  if (!user) return true;
  if (row?.isParticipatedByUser === true) return true;
  if (isMyItem(row, user)) return true;
  if (isAssignedToUser(row?.assignedToRaw, user)) return true;
  if (isAgentTicketAssignedToUser(row, user)) return true;
  return false;
}

export function applyFirstLevelApproverFilters(rows, { search = '', statusTab = 'PendingTask', user, liveInstanceIds = null, scope = 'me' } = {}) {
  const matchTab = scope === 'team' ? matchesFirstLevelApproverTabTeam : matchesFirstLevelApproverTab;
  let list = rows.filter((row) => matchTab(row, statusTab, user, liveInstanceIds));
  const q = normalizeText(search).toLowerCase();
  if (!q) return list;
  return list.filter((row) =>
    [
      row.requestId, row.summary, row.changeType, row.category, row.criticality,
      row.currentStep, row.comments, row.requesterName, row.changeReason,
    ].some((v) => String(v || '').toLowerCase().includes(q)),
  );
}

export function applyFinalLevelApproverFilters(rows, { search = '', statusTab = 'PendingTask', user, liveInstanceIds = null, scope = 'me' } = {}) {
  const matchTab = scope === 'team' ? matchesFinalLevelApproverTabTeam : matchesFinalLevelApproverTab;
  let list = rows.filter((row) => matchTab(row, statusTab, user, liveInstanceIds));
  const q = normalizeText(search).toLowerCase();
  if (!q) return list;
  return list.filter((row) =>
    [
      row.requestId, row.summary, row.changeType, row.category, row.criticality,
      row.currentStep, row.comments, row.requesterName, row.changeReason,
    ].some((v) => String(v || '').toLowerCase().includes(q)),
  );
}

export function filterCrApproverVisibleRows(rows, user, { includeFirstLevelQueue = false, liveInstanceIds = null } = {}) {
  if (!user) return rows || [];
  let list = rows || [];
  if (isEntityScopedDashboardProfile()) {
    list = list.filter((row) => matchesActiveDashboardEntityRow(row, { kind: 'cr', trustEmptyEntity: false }));
  }
  const filtered = list.filter((row) => {
    if (isMyCrApproverItem(row, user, '', liveInstanceIds)) return true;
    if (includeFirstLevelQueue && isCrAtStep(row, CR_FIRST_APPROVER_STEP) && !isCrCompletedItem(row)) {
      return true;
    }
    if (!includeFirstLevelQueue && !isCrCompletedItem(row) && isCrAtStep(row, CR_FIRST_APPROVER_STEP)) {
      const assigned = row?.assignedToRaw;
      if (Array.isArray(assigned) && assigned.some((entry) => isCrApproverAppRoleForStep(entry, CR_FIRST_APPROVER_STEP))) {
        return true;
      }
    }
    if (isCrCompletedItem(row)) return isPastCrStep(row, CR_FIRST_APPROVER_STEP);
    if (isCrAtStep(row, CR_IMPLEMENTATION_STEP)) return isPastCrStep(row, CR_FIRST_APPROVER_STEP);
    return isPastCrStep(row, CR_FIRST_APPROVER_STEP);
  });
  if (!includeFirstLevelQueue) {
    return filtered.filter((row) => matchesAnyFirstLevelApproverTab(row, user, liveInstanceIds));
  }
  return filtered;
}

function collectCrLiveInstanceIds(items) {
  const ids = new Set();
  for (const item of items || []) {
    const id = normalizeText(item?._id || item?._item_id || item?.Instance_ID);
    if (id) ids.add(id);
  }
  return ids;
}

export async function fetchITCrApproverTasks(kfInstance, page = 1, pageSize = 100) {
  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  const collected = [];
  const participatedIds = new Set();
  const entityScoped = isEntityScopedDashboardProfile();
  const activityIds = entityScoped
    ? getCrPendingActivityIdsForEntityFetch()
    : [...CR_FIRST_APPROVER_ACTIVITY_IDS, ...CR_FINAL_APPROVER_ACTIVITY_IDS];

  if (kfInstance?.api) {
    for (const activityId of activityIds) {
      try {
        const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(activityId, page, pageSize));
        const items = extractItemsFromResponse(resp).filter(
          (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
        );
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn(`CR pending/${activityId} failed:`, err?.message || err);
      }
    }

    if (!entityScoped) {
      for (const status of ['inprogress']) {
        try {
          const resp = await kfGetJson(kfInstance, paths.myItemsPath(status, page, pageSize));
          const items = extractItemsFromResponse(resp);
          if (items.length) collected.push(...items);
        } catch (err) {
          console.warn(`CR myitems/${status} failed:`, err?.message || err);
        }
      }

      try {
        const items = await fetchParticipatedItemsByActivity(kfInstance, paths, { page, pageSize });
        for (const item of items) {
          const id = normalizeText(item?._id || item?._item_id);
          if (id) participatedIds.add(id);
        }
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn('CR participated failed:', err?.message || err);
      }
    }
  }

  const process = getChangeRequestProcess(kfInstance);
  if (process?.getMyTasksItems && !entityScoped) {
    for (const activityId of ['', ...activityIds]) {
      try {
        const resp = await process.getMyTasksItems({
          activityId: activityId || undefined,
          pageNumber: page,
          pageSize,
        });
        const items = extractItemsFromResponse(resp);
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn('CR getMyTasksItems failed:', err?.message || err);
      }
    }
  }

  let items = mergeUniqueCrItems([collected]).filter(
    (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
  );
  const liveInstanceIds = collectCrLiveInstanceIds(items);
  const fromMyTasksApi = items.length > 0;
  let reportItems = [];

  try {
    const report = await fetchITChangeRequestReport(kfInstance, page, pageSize);
    reportItems = extractItemsFromResponse(report).filter(
      (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
    );
    if (reportItems.length) {
      items = mergeUniqueCrItems([items, reportItems]).filter(
        (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
      );
    }
  } catch (err) {
    console.warn('CR process-report failed:', err?.message || err);
    if (!items.length) throw err;
  }

  return {
    items,
    fromMyTasksApi,
    participatedIds,
    liveInstanceIds,
    hasMore: reportPageHasMore(reportItems, pageSize),
    pageSize,
  };
}

async function findCrPendingActivityInstanceId(kfInstance, instanceId, activityIds, stepName = '') {
  if (!kfInstance?.api || !instanceId) return '';

  const targetStep = stepName || CR_IMPLEMENTATION_STEP;
  const paths = buildChangeRequestProcessApiPaths(kfInstance);

  if (crStepMatches(targetStep, CR_IMPLEMENTATION_STEP)) {
    const pendingItems = await getCrPendingImplementationItems(kfInstance);
    const match = pendingItems.find((it) => matchCrInstanceId(it, instanceId));
    const actId = resolveActivityFromCrItem(
      match, targetStep, CR_IMPLEMENTATION_ACTIVITY_IDS, { fromPendingQueue: true },
    );
    if (actId) return actId;
    return '';
  }

  for (const activityId of activityIds) {
    try {
      const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(activityId, 1, 200));
      const match = extractItemsFromResponse(resp).find(
        (it) => matchCrInstanceId(it, instanceId),
      );
      const actId = pickCrActivityInstanceId(match);
      if (actId) return actId;
    } catch {
      // try next activity id
    }
  }
  return '';
}

async function findMyCrTaskActivityInstanceId(kfInstance, instanceId, activityIds, stepName = '') {
  if (!instanceId) return '';

  if (kfInstance?.api) {
    const paths = buildChangeRequestProcessApiPaths(kfInstance);
    try {
      const resp = await kfGetJson(kfInstance, paths.myItemsPath('inprogress', 1, 200));
      const match = extractItemsFromResponse(resp).find(
        (it) => matchCrInstanceId(it, instanceId),
      );
      const actId = pickCrActivityInstanceId(match);
      if (actId) return actId;
    } catch {
      // myitems/inprogress only
    }
  }

  const process = getChangeRequestProcess(kfInstance);
  if (!process?.getMyTasksItems) return '';

  for (const activityId of ['', ...activityIds]) {
    try {
      const resp = await process.getMyTasksItems({
        activityId: activityId || undefined,
        pageNumber: 1,
        pageSize: 200,
      });
      const match = extractItemsFromResponse(resp).find(
        (it) => matchCrInstanceId(it, instanceId),
      );
      const actId = pickCrActivityInstanceId(match);
      if (actId) return actId;
    } catch (err) {
      console.warn('CR getMyTasksItems lookup failed:', err?.message || err);
    }
  }
  return '';
}

async function resolveCrActivityInstanceIdForStep(kfInstance, instanceId, approverStep, hintId = '') {
  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  const targetStep = normalizeText(approverStep).toLowerCase();

  try {
    const activities = await kfGetJson(kfInstance, paths.instanceActivityPath(instanceId));
    const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);
    for (const act of list || []) {
      const step = normalizeText(
        act?.Name || act?.Activity_Name || act?.activity_name || act?.Step_Name || act?.step_name,
      );
      const actId = normalizeText(
        act?._activity_instance_id || act?.activity_instance_id || act?._id || act?.Id,
      );
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      if (!actId) continue;
      if (step.toLowerCase() === targetStep && actStatus !== 'completed') {
        return actId;
      }
    }
    for (const act of list || []) {
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      const actId = normalizeText(
        act?._activity_instance_id || act?.activity_instance_id || act?._id || act?.Id,
      );
      if (actId && actStatus !== 'completed') return actId;
    }
  } catch (err) {
    console.warn('CR activity lookup failed:', err?.message || err);
  }

  try {
    const detail = await kfGetJson(kfInstance, paths.instancePath(instanceId));
    const detailItem = detail?.data ?? detail ?? {};
    const detailStep = normalizeText(getCrCurrentStepValue(detailItem)).toLowerCase();
    if (detailStep === targetStep) {
      if (crStepMatches(approverStep, CR_IMPLEMENTATION_STEP)) {
        const fromDetail = pickFreshImplementationActivityId(detailItem);
        if (fromDetail) return fromDetail;
      } else {
        const fromDetail = pickCrReportActivityInstanceId(detailItem, approverStep)
          || pickCrActivityInstanceId(detailItem);
        if (fromDetail) return fromDetail;
      }
    }
  } catch (err) {
    console.warn('CR instance detail failed:', err?.message || err);
  }

  return normalizeText(hintId);
}

/** CR workflow activity resolver — delegates to live submit resolver (First Level pattern). */
async function resolveCrApproverActivityForSubmit(
  kfInstance,
  row,
  activityIds,
  approverStep,
  { forWorkflowSubmit = true } = {},
) {
  if (crStepMatches(approverStep, CR_IMPLEMENTATION_STEP)) {
    return resolveCrLiveActivityForSubmit(kfInstance, row, CR_IMPLEMENTATION_STEP);
  }
  return resolveCrLiveActivityForSubmit(kfInstance, row, approverStep);
}

/** Resolve the current workflow activity instance id for a change request row. */
export async function fetchITCrApproverActivityInstanceId(kfInstance, row, approverStep, { skipCache = false } = {}) {
  const activityIds = getCrActivityIdsForStep(approverStep);
  const lookupRow = skipCache ? { ...row, activityInstanceId: '' } : row;
  const { activityInstanceId } = await resolveCrApproverActivityForSubmit(
    kfInstance,
    lookupRow,
    activityIds,
    approverStep,
    { forWorkflowSubmit: true },
  );
  return activityInstanceId;
}

/** Load full instance fields and live activity context — mirrors hydrateITRowFromInstance. */
export async function hydrateCrRowFromInstance(kfInstance, row, approverStep = '') {
  if (!kfInstance?.api || !row?.id) return row;

  const step = approverStep || getCrCurrentStepValue(row.raw ?? row) || CR_IMPLEMENTATION_STEP;

  const { instanceId: reportInstanceId, activityInstanceId: reportActivityId } = resolveCrSubmitIdsFromReport(row, step);
  if (reportInstanceId && reportActivityId) {
    return { ...row, id: reportInstanceId, activityInstanceId: reportActivityId };
  }

  const instanceId = resolveCrProcessInstanceId(row.raw ?? row) || normalizeText(row.id);
  const paths = buildChangeRequestProcessApiPaths(kfInstance);

  const { activityInstanceId } = await resolveCrLiveActivityForSubmit(kfInstance, row, step);

  try {
    let detail = null;
    if (activityInstanceId) {
      detail = await kfGetJson(
        kfInstance,
        paths.instanceWithActivityPath(instanceId, activityInstanceId),
      );
    }
    if (!detail || detail?.Status === 'not_found' || detail?.ErrorJson) {
      detail = await kfGetJson(kfInstance, paths.instancePath(instanceId));
    }
    if (!detail || detail?.Status === 'not_found' || detail?.ErrorJson) return row;

    const detailItem = detail?.data ?? detail ?? {};
    const mergedRaw = mergeCrItemWithReport(detailItem, row.raw || row);
    const hydrated = mapChangeRequestRow(mergedRaw);
    const liveActId = activityInstanceId
      || pickCrReportActivityInstanceId(mergedRaw, step)
      || pickCrOpenActivityInstanceIdFromReport(detailItem, step);

    return {
      ...row,
      ...hydrated,
      id: instanceId,
      activityInstanceId: liveActId,
      raw: mergedRaw,
    };
  } catch (err) {
    console.warn('hydrateCrRowFromInstance failed:', err?.message || err);
    return row;
  }
}

function getCrApproverSubmitFieldKey(approverStep) {
  return approverStep === CR_FINAL_APPROVER_STEP
    ? CR_FORM_FIELDS.finalComments
    : CR_FORM_FIELDS.solution;
}

function buildCrApprovalSubmitPayload(instanceId, formData, approverStep) {
  const value = String(formData.comments || '').trim();
  return {
    _id: instanceId,
    [getCrApproverSubmitFieldKey(approverStep)]: value,
  };
}

/** Same as IT Agent save — SDK updateItem via parent bridge (no cross-origin fetch). */
async function saveCrApprovalFormFields(kfInstance, instanceId, activityInstanceId, payload) {
  const process = getChangeRequestProcess(kfInstance);
  // Kissflow expects process instance _id in body (Column_6sisIX1XPC / root _id), not activity instance id.
  const body = { ...payload, _id: instanceId };

  if (process?.updateItem) {
    await process.updateItem({
      instanceId,
      activityInstanceId,
      data: body,
    });
    return { success: 'Saved successfully' };
  }

  const paths = buildChangeRequestProcessApiPaths(kfInstance);
  const savePath = paths.instanceWithActivityPath(instanceId, activityInstanceId);
  const saveResp = await kfMutateJson(kfInstance, savePath, {
    method: 'POST',
    body,
  });
  return parseAgentMutationResponse(saveResp, 'Saved successfully');
}

export async function submitITChangeRequestApproval(kfInstance, row, formData, approverStep) {
  if (!kfInstance?.api) {
    throw new Error('Submit not available — open inside Kissflow');
  }

  const comments = String(formData.comments || '').trim();
  if (!comments) {
    throw new Error('Comments are required before submitting approval');
  }

  const { instanceId, activityInstanceId } = await resolveCrLiveActivityForSubmit(
    kfInstance, row, approverStep,
  );

  if (!instanceId) throw new Error('Missing instance id for this change request');
  if (!activityInstanceId) {
    throw new Error('Could not resolve approver activity for this change request. Expand the row, wait a moment, then submit again.');
  }

  const payload = buildCrApprovalSubmitPayload(instanceId, formData, approverStep);
  return submitCrWorkflowStep(kfInstance, instanceId, activityInstanceId, payload);
}

export async function fetchITServiceReport(kfInstance, page = 1, pageSize = 100, filters = {}) {
  const accountId = resolveAccountId(kfInstance);
  const path = getReportPath(accountId, page, pageSize, filters);

  if (kfInstance?.api) {
    const resp = await kfInstance.api(path, { method: 'GET', headers: { Accept: 'application/json' } });
    return resp?.data ?? resp ?? { Data: [] };
  }

  const base = resolveKissflowBaseUrl();
  const res = await fetch(`${base}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Report failed: ${res.status}`);
  return res.json();
}

export async function fetchKpiFromVariables(kfInstance) {
  if (!kfInstance?.app?.getVariable) return null;

  const read = async (key) => {
    try {
      return await kfInstance.app.getVariable(key);
    } catch {
      return 0;
    }
  };

  const [userName, totalRecords, openTickets, completedRecords, slaBreached] = await Promise.all([
    read(KPI_VARS.userName),
    read(KPI_VARS.totalRecords),
    read(KPI_VARS.openTickets),
    read(KPI_VARS.completedRecords),
    read(KPI_VARS.slaBreached),
  ]);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    userName: normalizeText(userName) || normalizeText(kfInstance?.user?.Name) || 'User',
    totalRecords: toNum(totalRecords),
    openTickets: toNum(openTickets),
    completedRecords: toNum(completedRecords),
    slaBreached: toNum(slaBreached),
  };
}

export function applyITFilters(rows, { search = '', statusTab = 'InProgress' } = {}) {
  let list = rows.filter((row) => matchesStatusTab(row, statusTab));
  const q = normalizeText(search).toLowerCase();
  if (!q) return list;
  return list.filter((row) =>
    [row.requestId, row.summary, row.ticketType, row.category, row.subCategory, row.itemStatus, row.currentStep, row.statusLabel, row.name, row.requesterName]
      .some((v) => String(v || '').toLowerCase().includes(q)),
  );
}

export function computeKpisFromRows(rows, userEmail) {
  const email = normalizeEmail(userEmail);
  const mine = (rows || []).filter((row) => !email || normalizeEmail(row.requesterEmail) === email);

  const inProgress = mine.filter((r) => matchesStatusTab(r, 'InProgress')).length;
  const completedRecords = mine.filter((r) => matchesStatusTab(r, 'Completed')).length;
  const slaBreached = mine.filter((r) => isSlaBreached(r)).length;

  return {
    totalRecords: inProgress + completedRecords,
    openTickets: inProgress,
    completedRecords,
    slaBreached,
  };
}

export function isITManagerStep(rowOrItem) {
  return isITManagerApprovalStep(rowOrItem);
}

export function matchesManagerStatusTab(row, tabKey) {
  const itemStatus = getRawItemStatus(row).toLowerCase();
  const step = getCurrentStepValue(row);

  if (tabKey === 'Completed') return itemStatus === 'completed';
  if (tabKey === 'AgentPending') {
    return isITManagerApprovalStep(row)
      || step === IT_AGENT_STEP
      || step === IT_AGENT_REFEX_STEP
      || isRefexTechSupportOwnedStep(row)
      || isRefexTechPickupStep(row);
  }
  return true;
}

/** Unique rows across Pending Task, Completed, and Agent Pending tabs. */
export function countManagerTotalRecords(rows) {
  return (rows || []).filter((row) =>
    MANAGER_STATUS_TABS.some((tab) => matchesManagerStatusTab(row, tab.key)),
  ).length;
}

/** Manager KPI cards align with tab counts. */
export function computeManagerKpisFromRows(rows) {
  const completedRecords = (rows || []).filter((r) => matchesManagerStatusTab(r, 'Completed')).length;
  const agentPendingTasks = (rows || []).filter((r) => matchesManagerStatusTab(r, 'AgentPending')).length;

  return {
    totalRecords: countManagerTotalRecords(rows),
    completedRecords,
    pendingTasks: agentPendingTasks,
    agentPendingTasks,
  };
}

export function computeManagerKpisFromReportItems(items) {
  return computeManagerKpisFromRows((items || []).map(mapReportRow));
}

export async function fetchManagerKpiFromVariables(kfInstance) {
  if (!kfInstance?.app?.getVariable) return null;

  const read = async (key) => {
    try {
      return await kfInstance.app.getVariable(key);
    } catch {
      return 0;
    }
  };

  const [userName, totalRecords, openTickets, completedRecords, pendingTasks, agentPendingTasks] = await Promise.all([
    read(MANAGER_KPI_VARS.userName),
    read(MANAGER_KPI_VARS.totalRecords),
    read(MANAGER_KPI_VARS.openTickets),
    read(MANAGER_KPI_VARS.completedRecords),
    read(MANAGER_KPI_VARS.pendingTasks),
    read(MANAGER_KPI_VARS.agentPendingTasks),
  ]);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    userName: normalizeText(userName) || normalizeText(kfInstance?.user?.Name) || 'User',
    totalRecords: toNum(totalRecords),
    openTickets: toNum(openTickets),
    completedRecords: toNum(completedRecords),
    pendingTasks: toNum(pendingTasks),
    agentPendingTasks: toNum(agentPendingTasks),
  };
}

export async function fetchITManagerTasks(kfInstance, page = 1, pageSize = 100) {
  const entityScoped = isEntityScopedDashboardProfile();

  if (entityScoped) {
    let reportItems = [];
    try {
      const report = await fetchITServiceReport(kfInstance, page, pageSize);
      reportItems = extractItemsFromResponse(report).filter(
        (item) => matchesActiveDashboardEntityItem(item, { trustEmptyEntity: false }),
      );
    } catch (err) {
      console.warn('entity-scoped manager process-report failed:', err?.message || err);
      throw err;
    }

    return {
      items: reportItems,
      fromMyTasksApi: false,
      hasMore: reportPageHasMore(reportItems, pageSize),
      pageSize,
    };
  }

  const paths = buildITProcessApiPaths(kfInstance);
  const collected = [];

  if (kfInstance?.api) {
    for (const activityId of IT_MANAGER_ACTIVITY_IDS) {
      try {
        const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(activityId, page, pageSize));
        const items = extractItemsFromResponse(resp);
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn(`manager pending/${activityId} failed:`, err?.message || err);
      }
    }

    try {
      const resp = await kfGetJson(kfInstance, paths.participatedPath(page, pageSize));
      const items = extractItemsFromResponse(resp);
      if (items.length) collected.push(...items);
    } catch (err) {
      console.warn('manager participated failed:', err?.message || err);
    }
  }

  const process = getITProcess(kfInstance);
  if (process?.getMyTasksItems) {
    for (const activityId of ['', ...IT_MANAGER_ACTIVITY_IDS]) {
      try {
        const resp = await process.getMyTasksItems({
          activityId: activityId || undefined,
          pageNumber: page,
          pageSize,
        });
        const items = extractItemsFromResponse(resp);
        if (items.length) collected.push(...items);
      } catch (err) {
        console.warn('manager getMyTasksItems failed:', err?.message || err);
      }
    }
  }

  let items = mergeUniqueItems([collected]);
  let fromMyTasksApi = items.length > 0;
  let reportItems = [];

  try {
    const report = await fetchITServiceReport(kfInstance, page, pageSize);
    reportItems = extractItemsFromResponse(report);
    if (reportItems.length) {
      items = mergeUniqueItems([items, reportItems]);
    }
  } catch (err) {
    console.warn('manager process-report failed:', err?.message || err);
    if (!items.length) throw err;
  }

  return {
    items,
    fromMyTasksApi,
    hasMore: reportPageHasMore(reportItems, pageSize),
    pageSize,
  };
}

async function findMyManagerTaskActivityInstanceId(kfInstance, instanceId) {
  if (!instanceId) return '';

  const process = getITProcess(kfInstance);
  if (!process?.getMyTasksItems) return '';

  for (const activityId of ['', ...IT_MANAGER_ACTIVITY_IDS]) {
    try {
      const resp = await process.getMyTasksItems({
        activityId: activityId || undefined,
        pageNumber: 1,
        pageSize: 200,
      });
      const match = extractItemsFromResponse(resp).find(
        (it) => normalizeText(it?._id) === instanceId,
      );
      const actId = pickActivityInstanceId(match);
      if (actId) return actId;
    } catch (err) {
      console.warn('manager getMyTasksItems lookup failed:', err?.message || err);
    }
  }

  return '';
}

async function findManagerPendingActivityInstanceId(kfInstance, instanceId) {
  if (!kfInstance?.api || !instanceId) return '';

  const paths = buildITProcessApiPaths(kfInstance);
  for (const activityId of IT_MANAGER_ACTIVITY_IDS) {
    try {
      const resp = await kfGetJson(kfInstance, paths.pendingAtStepPath(activityId, 1, 200));
      const match = extractItemsFromResponse(resp).find(
        (it) => normalizeText(it?._id) === instanceId,
      );
      const actId = pickActivityInstanceId(match);
      if (actId) return actId;
    } catch {
      // try next activity id
    }
  }

  return '';
}

async function resolveITManagerActivityInstanceId(kfInstance, instanceId, hintId = '') {
  const paths = buildITProcessApiPaths(kfInstance);

  try {
    const activities = await kfGetJson(kfInstance, paths.instanceActivityPath(instanceId));
    const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);
    for (const act of list || []) {
      const step = normalizeText(
        act?.Name || act?.Activity_Name || act?.activity_name || act?.Step_Name || act?.step_name,
      );
      const actId = normalizeText(
        act?._activity_instance_id || act?._id || act?.Id || act?.activity_instance_id,
      );
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      if (!actId) continue;
      if (step.toLowerCase() === IT_MANAGER_STEP.toLowerCase() && actStatus !== 'completed') {
        return actId;
      }
    }
    for (const act of list || []) {
      const actStatus = normalizeText(act?.Status || act?._status || act?.status).toLowerCase();
      const actId = normalizeText(
        act?._activity_instance_id || act?._id || act?.Id || act?.activity_instance_id,
      );
      if (actId && actStatus !== 'completed') return actId;
    }
  } catch (err) {
    console.warn('manager activity lookup failed:', err?.message || err);
  }

  return normalizeText(hintId);
}

async function resolveITManagerActivityForSubmit(kfInstance, row) {
  const instanceId = normalizeText(row?.id);
  const hintId = pickActivityInstanceId(row?.raw) || normalizeText(row?.activityInstanceId);

  for (const finder of [findMyManagerTaskActivityInstanceId, findManagerPendingActivityInstanceId]) {
    const activityInstanceId = await finder(kfInstance, instanceId);
    if (activityInstanceId) return { instanceId, activityInstanceId };
  }

  let activityInstanceId = await resolveITManagerActivityInstanceId(kfInstance, instanceId, hintId);
  if (!activityInstanceId) activityInstanceId = hintId;

  return { instanceId, activityInstanceId };
}

/** Resolve the current IT Manager activity instance id for a dashboard row. */
export async function fetchITManagerActivityInstanceId(kfInstance, row) {
  const { activityInstanceId } = await resolveITManagerActivityForSubmit(kfInstance, row);
  return activityInstanceId;
}

function buildManagerSubmitPayload(instanceId, formData) {
  const value = String(formData.managerComments ?? formData.comments ?? '').trim();
  return {
    _id: instanceId,
    [MANAGER_FORM_FIELDS.managerComments]: value,
  };
}

async function saveManagerFormFields(kfInstance, instanceId, activityInstanceId, payload) {
  const process = getITProcess(kfInstance);
  const body = { ...payload, _id: instanceId };

  if (process?.updateItem) {
    await process.updateItem({
      instanceId,
      activityInstanceId,
      data: body,
    });
    return { success: 'Saved successfully' };
  }

  const paths = buildITProcessApiPaths(kfInstance);
  const saveResp = await kfMutateJson(kfInstance, paths.instanceWithActivityPath(instanceId, activityInstanceId), {
    method: 'POST',
    body,
  });
  return parseAgentMutationResponse(saveResp, 'Saved successfully');
}

export async function submitITManagerWork(kfInstance, row, formData) {
  if (!kfInstance?.api) {
    throw new Error('Submit not available — open inside Kissflow');
  }

  const { instanceId, activityInstanceId } = await resolveITManagerActivityForSubmit(kfInstance, row);
  if (!instanceId) throw new Error('Missing instance id for this task');
  if (!activityInstanceId) {
    throw new Error('Could not resolve IT Manager activity for this task. Open the item in Kissflow once, then retry.');
  }

  const payload = buildManagerSubmitPayload(instanceId, formData);
  const paths = buildITProcessApiPaths(kfInstance);
  const process = getITProcess(kfInstance);

  await saveManagerFormFields(kfInstance, instanceId, activityInstanceId, payload);

  if (process?.submitItem) {
    await process.submitItem({
      instanceId,
      activityInstanceId,
    });
    return { success: 'Submitted successfully' };
  }

  const submitResp = await kfMutateJson(
    kfInstance,
    paths.instanceSubmitPath(instanceId, activityInstanceId),
    { method: 'POST', body: {} },
  );
  return parseAgentMutationResponse(submitResp, 'Submitted successfully');
}

export function applyManagerFilters(rows, {
  search = '',
  statusTab = 'AgentPending',
  category = '',
  criticality = '',
  entity = '',
  ticketType = '',
  categoryField = 'category',
  user = null,
  scope = 'team',
} = {}) {
  let list = rows.filter((row) => matchesManagerStatusTab(row, statusTab));
  if (scope === 'me' && user) {
    list = list.filter((row) => matchesDashboardMeScope(row, user));
  }
  list = applyMisColumnFilters(list, {
    category, criticality, entity, ticketType, categoryField,
  });
  const q = normalizeText(search).toLowerCase();
  if (!q) return list;
  return list.filter((row) =>
    [row.requestId, row.summary, row.ticketType, row.category, row.currentStep, row.itemStatus, row.requesterName, row.managerComments]
      .some((v) => String(v || '').toLowerCase().includes(q)),
  );
}

export function getWorkflowStatusValue(itemOrRow) {
  if (!itemOrRow) return '';
  const raw = itemOrRow.raw ?? itemOrRow;
  const step =
    raw?.[COL.status]
    ?? raw?.Column_oZuycweKUv
    ?? raw?.Column_vlunW1aLEU
    ?? getItemValue(raw, FIELD.status)
    ?? itemOrRow?.status;
  return normalizeText(step);
}

export function getSystemStatusValue(itemOrRow) {
  if (!itemOrRow) return '';
  const raw = itemOrRow.raw ?? itemOrRow;
  return normalizeText(
    raw?.[COL.systemStatus]
    ?? raw?.Column_TPIX5nLWE7
    ?? raw?.Column_McylhavuPn
    ?? itemOrRow?.statusLabel,
  );
}

export function isDraftItem(itemOrRow) {
  const wf = normalizeStatusKey(getWorkflowStatusValue(itemOrRow));
  const sys = normalizeStatusKey(getSystemStatusValue(itemOrRow));
  return wf === 'Draft' || sys === 'Draft';
}

export function isAdminCompletedItem(rowOrItem) {
  const itemStatus = getRawItemStatus(rowOrItem).toLowerCase();
  const wf = normalizeStatusKey(getWorkflowStatusValue(rowOrItem));
  const sys = normalizeStatusKey(getSystemStatusValue(rowOrItem));
  return itemStatus === 'completed' || wf === 'Completed' || sys === 'Completed';
}

/** Admin IT Agent tab: Start / IT Agent / PickUp / Solution (legacy IT Manager included). */
export function isAdminITAgentTabItem(row) {
  if (isDraftItem(row) || isAdminCompletedItem(row)) return false;
  const step = getCurrentStepValue(row);
  return step === IT_AGENT_STEP
    || step === START_STEP
    || step === IT_MANAGER_STEP
    || isITAgentStep(row);
}

export function matchesAdminStatusTab(row, tabKey) {
  if (tabKey === 'All') return !isDraftItem(row);
  if (tabKey === 'ITAgent') return isAdminITAgentTabItem(row);
  if (tabKey === 'Completed') return isAdminCompletedItem(row);
  return true;
}

export function computeAdminKpisFromRows(rows) {
  const totalRecords = (rows || []).filter((r) => matchesAdminStatusTab(r, 'All')).length;
  const itAgent = (rows || []).filter((r) => matchesAdminStatusTab(r, 'ITAgent')).length;
  const completedRecords = (rows || []).filter((r) => matchesAdminStatusTab(r, 'Completed')).length;

  return {
    totalRecords,
    pendingTickets: itAgent,
    completedRecords,
  };
}

export function computeAdminKpisFromReportItems(items) {
  return computeAdminKpisFromRows((items || []).map(mapReportRow));
}

export async function fetchAdminKpiFromVariables(kfInstance) {
  if (!kfInstance?.app?.getVariable) return null;

  const read = async (key) => {
    try {
      return await kfInstance.app.getVariable(key);
    } catch {
      return 0;
    }
  };

  const [userName, totalRecords, openRecords, completedRecords, pendingRecords] = await Promise.all([
    read(ADMIN_KPI_VARS.userName),
    read(ADMIN_KPI_VARS.totalRecords),
    read(ADMIN_KPI_VARS.openRecords),
    read(ADMIN_KPI_VARS.completedRecords),
    read(ADMIN_KPI_VARS.pendingRecords),
  ]);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    userName: normalizeText(userName) || normalizeText(kfInstance?.user?.Name) || 'User',
    totalRecords: toNum(totalRecords),
    openRecords: toNum(openRecords),
    completedRecords: toNum(completedRecords),
    pendingRecords: toNum(pendingRecords),
  };
}

export async function fetchITAdminReportItems(kfInstance, page = 1, pageSize = 100) {
  const report = await fetchITServiceReport(kfInstance, page, pageSize);
  const items = extractItemsFromResponse(report);
  return {
    items,
    fromReportApi: items.length > 0,
    hasMore: reportPageHasMore(items, pageSize),
    pageSize,
  };
}

export async function fetchITApproverDashboardData(kfInstance, page = 1, pageSize = 100, options = {}) {
  const [serviceResult, crResult] = await Promise.all([
    options.skipServiceFetch
      ? Promise.resolve({ items: [], fromMyTasksApi: false, hasMore: false })
      : fetchITManagerTasks(kfInstance, page, pageSize),
    options.skipChangeFetch
      ? Promise.resolve({ items: [], fromMyTasksApi: false, liveInstanceIds: new Set(), hasMore: false })
      : fetchITCrApproverTasks(kfInstance, page, pageSize),
  ]);

  return {
    serviceItems: serviceResult.items || [],
    crItems: crResult.items || [],
    fromMyTasksApi: crResult.fromMyTasksApi,
    liveInstanceIds: crResult.liveInstanceIds || new Set(),
    hasMoreService: serviceResult.hasMore ?? false,
    hasMoreCr: crResult.hasMore ?? false,
    pageSize,
  };
}

export async function fetchITManagerDashboardData(kfInstance, page = 1, pageSize = 100) {
  const serviceResult = await fetchITManagerTasks(kfInstance, page, pageSize);
  const entityScoped = isEntityScopedDashboardProfile();
  let changeItems = [];
  let changeReportItems = [];

  try {
    const crReport = await fetchITChangeRequestReport(kfInstance, page, pageSize);
    changeReportItems = extractItemsFromResponse(crReport).filter(
      (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
    );
    changeItems = changeReportItems;
  } catch (err) {
    console.warn('change request report failed:', err?.message || err);
  }

  return {
    serviceItems: serviceResult.items || [],
    changeItems,
    fromMyTasksApi: serviceResult.fromMyTasksApi,
    hasMoreService: serviceResult.hasMore ?? false,
    hasMoreChange: reportPageHasMore(changeReportItems, pageSize),
    pageSize,
  };
}

export async function fetchITAdminDashboardData(kfInstance, page = 1, pageSize = 100, options = {}) {
  if (options.fetchAll) {
    let nextPage = 1;
    let hasMoreService = true;
    let hasMoreChange = !options.skipChangeFetch;
    const allService = [];
    const allChange = [];
    let fromReportApi = false;

    while ((hasMoreService || hasMoreChange) && nextPage <= 30) {
      const batch = await fetchITAdminDashboardData(kfInstance, nextPage, pageSize, {
        ...options,
        fetchAll: false,
      });
      if (batch.serviceItems?.length) {
        allService.push(...batch.serviceItems);
        fromReportApi = fromReportApi || batch.fromReportApi;
      }
      if (batch.changeItems?.length) {
        allChange.push(...batch.changeItems);
      }
      hasMoreService = batch.hasMoreService ?? false;
      hasMoreChange = batch.hasMoreChange ?? false;
      if (!hasMoreService && !hasMoreChange) break;
      nextPage += 1;
    }

    return {
      serviceItems: allService,
      changeItems: allChange,
      fromReportApi,
      hasMoreService: false,
      hasMoreChange: false,
      pageSize,
    };
  }

  const serviceResult = options.skipServiceFetch
    ? { items: [], fromReportApi: false, hasMore: false, pageSize }
    : await fetchITAdminReportItems(kfInstance, page, pageSize);
  const entityScoped = isEntityScopedDashboardProfile();
  let changeItems = [];
  let changeReportItems = [];

  if (!options.skipChangeFetch) {
    try {
      const crReport = await fetchITChangeRequestReport(kfInstance, page, pageSize);
      changeReportItems = extractItemsFromResponse(crReport).filter(
        (item) => !entityScoped || matchesActiveDashboardEntityItem(item, { kind: 'cr', trustEmptyEntity: false }),
      );
      changeItems = changeReportItems;
    } catch (err) {
      console.warn('change request report failed:', err?.message || err);
    }
  }

  return {
    serviceItems: serviceResult.items || [],
    changeItems,
    fromReportApi: serviceResult.fromReportApi,
    hasMoreService: serviceResult.hasMore ?? false,
    hasMoreChange: options.skipChangeFetch ? false : reportPageHasMore(changeReportItems, pageSize),
    pageSize,
  };
}

export function applyAdminFilters(rows, {
  search = '',
  statusTab = 'All',
  category = '',
  criticality = '',
  entity = '',
  ticketType = '',
  categoryField = 'category',
  user = null,
  scope = 'team',
  sortOrder = 'asc',
  entityTab = '',
} = {}) {
  let list = rows.filter((row) => matchesAdminStatusTab(row, statusTab));
  if (scope === 'me' && user) {
    list = list.filter((row) => matchesDashboardMeScope(row, user));
  }
  list = applyMisColumnFilters(list, {
    category, criticality, entity, ticketType, categoryField,
  });
  const q = normalizeText(search).toLowerCase();
  if (q) {
    list = list.filter((row) =>
      [
        row.requestId, row.summary, row.ticketType, row.category, row.subCategory,
        row.currentStep, row.itemStatus, row.statusLabel, row.requesterName, row.requesterEmail,
        row.criticality, row.assignedTo, row.assignedToDisplay,
      ].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }
  return sortMisTableRows(list, sortOrder, entityTab);
}
