/* eslint-disable max-lines -- shared IT Agent-style expand panels & queue UI */
import { useState, useEffect, useMemo, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Send, PauseCircle, Paperclip, CheckCircle2, GitBranch, Wrench, Pencil,
} from 'lucide-react';
import {
  IT_THEME,
  ITDetailTile,
  ITContentPanel,
  ITSlaBadge,
  ITCriticalityBadge,
  ITItemStatusBadge,
  ITCompactWorkflowStrip,
  ITVerticalWorkflowStrip,
  ITCompactSlaStrip,
  ITCompactCompletedResolutionStrip,
  ITCompletedResolutionTime,
  ITCompletedSlaOutcomeBadge,
  ITSimpleSlaResultBadge,
  ITMisSelectField,
  itFormInput,
  itFormLabel,
  itFormPanel,
  itBtnPrimaryFull,
  itSectionAccent,
  ITTableIconButton,
  itTableViewDetailsCellClass,
  itTableActionsCellClass,
  itTableTakeActionCellClass,
} from './ITDashboardUI.jsx';
import {
  MisDetailCard,
  MisWorkflowPanel,
  MisTabbedExpandShell,
  MisResolutionHistoryPanel,
  visibleMisTiles,
} from './mis/ITMisExpandPrimitives.jsx';
import {
  buildServiceOverviewTiles,
  buildServiceDetailTiles,
  buildCrOverviewTiles,
  buildCrDetailTiles,
} from './mis/misExpandContent.js';
import { isMisModernUi } from '../../lib/itDashboardUi.js';
import {
  getAgentQueueTabs,
  ITEM_STATUS_OPTIONS,
  WORKFLOW_STEPS,
  CHANGE_REQUEST_WORKFLOW_STEPS,
  getWorkflowStepIndex,
  getChangeRequestStepIndex,
  normalizeServiceWorkflowStep,
  getSlaTiming,
  getCompletedResolutionTiming,
  getRowStartDateLabel,
  getRowEndDateLabel,
  getSimpleSlaResultLabel,
  isAgentWorkflowSubmitStatus,
  isCrImplementationWorkflowSubmitStatus,
  CR_IMPLEMENTATION_STATUS_OPTIONS,
  filterAgentItemStatusOptions,
  filterCrImplementationFinalStatusOptions,
  getCanonicalAgentItemStatusToken,
  getServiceWorkflowHandlers,
  getCrWorkflowHandlers,
  getServiceWorkflowStepTimes,
  getCrWorkflowStepTimes,
  getCrCurrentStepValue,
  formatCrWorkflowStepDisplay,
  formatServiceWorkflowStepDisplay,
  CR_IMPLEMENTATION_SUBMIT_STATUS,
  openITServiceRequestDetailsPage,
  openITChangeRequestDetailsPage,
  formatRequesterDisplay,
  usesRefexServiceWorkflow,
  resolveAttachmentUrl,
  resolveDisplayRequestId,
  getCurrentStepValue,
} from '../../lib/kfITServiceDashboard.js';
import RefexProgressWorkflowAside from '../../itsm/refex/employeedashboard/RefexProgressWorkflowAside.jsx';
import {
  collectConversationEntries,
} from '../../itsm/refex/employeedashboard/buildRevisions.js';
import {
  collectAgentResolutionNotesFromProgress,
  collectReopenNotesFromProgress,
  collectRejectionNotesFromProgress,
  fetchRefexProcessProgressCached,
} from '../../itsm/refex/employeedashboard/progressApi.js';
import { getRejectionReasonDisplay } from './mis/misExpandContent.js';
import { KissflowSDKContext } from '../../sdk/index.js';
import {
  RefexMisDateTimeCell,
  RefexServiceSlaCell,
  RefexServiceTatCell,
} from '../../itsm/refex/shared/refexServiceMisCells.jsx';
import {
  EscalationBadge,
  AssignedToCell,
  ClosedByCell,
  RequesterCell,
  getMisCategoryLabel,
  getMisSubCategoryLabel,
  getMisCriticalityLabel,
} from '../../itsm/refex/employeedashboard/tableHelpers.jsx';
import { MisRequestTypeCell } from '../../itsm/refex/shared/misCompactCells.jsx';
import { mapRefexServiceTabToStatusKey, getRefexServiceQueueMisColumns, applyExtrovisMisColumnLayout } from '../../itsm/refex/shared/refexServiceQueueColumns.js';
import { getMisTicketStatus } from '../../itsm/refex/employeedashboard/employeeStatus.js';
import { TicketStatusBadge } from '../../itsm/refex/employeedashboard/tableHelpers.jsx';

export const SERVICE_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'requester', label: 'Requester' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'sla', label: 'SLA' },
  { key: 'createdOn', label: 'Created Date' },
  { key: 'ticketStatus', label: 'Ticket Status' },
  { key: 'source', label: 'Source' },
  { key: 'ticketType', label: 'Request Type' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'closedBy', label: 'Closed By' },
  { key: 'closedOn', label: 'Closed Date' },
  { key: 'reopenedOn', label: 'Reopened On' },
];

/** Refex service MIS tables — same column order as all dashboards. */
export const REFEX_SERVICE_MIS_COLUMNS = [...SERVICE_COLUMNS];

export const CR_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Change Req ID' },
  { key: 'requester', label: 'Requester' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'sla', label: 'SLA' },
  { key: 'createdOn', label: 'Created Date' },
  { key: 'ticketStatus', label: 'Ticket Status' },
  { key: 'source', label: 'Source' },
  { key: 'changeType', label: 'Request Type' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'closedBy', label: 'Closed By' },
  { key: 'closedOn', label: 'Closed Date' },
  { key: 'reopenedOn', label: 'Reopened On' },
];

export const EMPLOYEE_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'requester', label: 'Requester' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'sla', label: 'SLA' },
  { key: 'createdOn', label: 'Created Date' },
  { key: 'ticketStatus', label: 'Ticket Status' },
  { key: 'source', label: 'Source' },
  { key: 'ticketType', label: 'Request Type' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'closedBy', label: 'Closed By' },
  { key: 'closedOn', label: 'Closed Date' },
  { key: 'reopenedOn', label: 'Reopened On' },
];

/** Employee active tabs — category-focused columns (no requester). */
export const EMPLOYEE_ACTIVE_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'sla', label: 'SLA' },
];

export const EMPLOYEE_ACTIVE_WITH_END_COLUMNS = [
  ...EMPLOYEE_ACTIVE_COLUMNS.slice(0, -1),
  { key: 'endDate', label: 'End Date' },
  { key: 'sla', label: 'SLA' },
];

export const EMPLOYEE_IN_PROGRESS_COLUMNS = [
  ...EMPLOYEE_ACTIVE_COLUMNS.slice(0, -1),
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'endDate', label: 'End Date' },
  { key: 'sla', label: 'SLA' },
];

export const EMPLOYEE_HOLD_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'sla', label: 'SLA' },
];

export const EMPLOYEE_TERMINAL_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'slaResult', label: 'SLA Result' },
];

export const COMPLETED_RESOLUTION_TIME_COLUMN = { key: 'resolutionTime', label: 'Time to Complete' };
export const COMPLETED_SLA_OUTCOME_COLUMN = { key: 'slaOutcome', label: 'SLA Result' };
export const COMPLETED_START_DATE_COLUMN = { key: 'startDate', label: 'Start Date' };
export const COMPLETED_END_DATE_COLUMN = { key: 'endDate', label: 'End Date' };
export const COMPLETED_SLA_RESULT_COLUMN = { key: 'slaResult', label: 'SLA Result' };

export const SERVICE_COMPLETED_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'requester', label: 'Requester' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'sla', label: 'SLA' },
  { key: 'createdOn', label: 'Created Date' },
  { key: 'ticketStatus', label: 'Ticket Status' },
  { key: 'source', label: 'Source' },
  { key: 'ticketType', label: 'Request Type' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'closedBy', label: 'Closed By' },
  { key: 'closedOn', label: 'Closed Date' },
  { key: 'reopenedOn', label: 'Reopened On' },
];

export const REFEX_SERVICE_COMPLETED_COLUMNS = [...SERVICE_COMPLETED_COLUMNS];

export const CR_COMPLETED_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Change Req ID' },
  { key: 'requester', label: 'Requester' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'sla', label: 'SLA' },
  { key: 'createdOn', label: 'Created Date' },
  { key: 'ticketStatus', label: 'Ticket Status' },
  { key: 'source', label: 'Source' },
  { key: 'changeType', label: 'Request Type' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'closedBy', label: 'Closed By' },
  { key: 'closedOn', label: 'Closed Date' },
  { key: 'reopenedOn', label: 'Reopened On' },
];

export function injectCompletedTableColumns(columns, { includeResolutionTime = true } = {}) {
  const without = columns.filter((col) => !['currentStep', 'sla'].includes(col.key));
  const dateIdx = without.findIndex((col) => col.key === 'date');
  const insertAt = dateIdx >= 0 ? dateIdx : without.length;
  const completedCols = includeResolutionTime
    ? [COMPLETED_RESOLUTION_TIME_COLUMN, COMPLETED_SLA_OUTCOME_COLUMN]
    : [COMPLETED_SLA_OUTCOME_COLUMN];
  return [
    ...without.slice(0, insertAt),
    ...completedCols,
    ...without.slice(insertAt),
  ];
}

export const EMPLOYEE_COMPLETED_COLUMNS = injectCompletedTableColumns(
  EMPLOYEE_COLUMNS.filter((col) => !['currentStep', 'assignedTo', 'sla'].includes(col.key)),
);

export const COMPLETED_BY_COLUMN = { key: 'completedBy', label: 'Completed By' };
export const CANCELLED_BY_COLUMN = { key: 'cancelledBy', label: 'Cancelled By' };

export function injectTerminalByColumn(columns, byColumn) {
  const without = columns.filter((col) => !['currentStep', 'sla', 'assignedTo'].includes(col.key));
  const dateIdx = without.findIndex((col) => col.key === 'date');
  const insertAt = dateIdx >= 0 ? dateIdx : without.length;
  return injectCompletedTableColumns([
    ...without.slice(0, insertAt),
    byColumn,
    ...without.slice(insertAt),
  ]);
}

/** Employee table columns per Item_Status tab */
export function getEmployeeTableColumns(activeTab) {
  let columns;
  if (activeTab === 'Open') {
    columns = EMPLOYEE_ACTIVE_COLUMNS;
  } else if (activeTab === 'InProgress') {
    columns = EMPLOYEE_IN_PROGRESS_COLUMNS;
  } else if (activeTab === 'Hold') {
    columns = EMPLOYEE_HOLD_COLUMNS;
  } else if (activeTab === 'Resolved' || activeTab === 'Cancelled') {
    columns = EMPLOYEE_TERMINAL_COLUMNS;
  } else {
    columns = EMPLOYEE_ACTIVE_WITH_END_COLUMNS;
  }
  return columns;
}

export function buildEmployeeCompletedMobileFields(row) {
  return [
    { label: 'Category', value: row.category },
    { label: 'Sub Category', value: row.subCategory },
    { label: 'Start Date', value: getRowStartDateLabel(row) },
    { label: 'End Date', value: getRowEndDateLabel(row) },
    { label: 'SLA Result', value: getSimpleSlaResultLabel(row) },
  ];
}

export function formatRequestId(row) {
  const label = resolveDisplayRequestId(row, row?.id);
  return label || '—';
}

export function getServiceTableColumns({
  includeSla = true,
  isCompletedTab = false,
  isOpenQueueTab = false,
  isTerminalTab = false,
  isRefexService = false,
} = {}) {
  if (isCompletedTab || isTerminalTab) {
    const cols = isRefexService ? REFEX_SERVICE_COMPLETED_COLUMNS : SERVICE_COMPLETED_COLUMNS;
    return withViewDetailsColumn(applyExtrovisMisColumnLayout(cols));
  }
  let columns = isRefexService
    ? [...REFEX_SERVICE_MIS_COLUMNS]
    : (includeSla ? SERVICE_COLUMNS : SERVICE_COLUMNS.filter((col) => col.key !== 'sla'));
  if (!includeSla && isRefexService) {
    columns = columns.filter((col) => col.key !== 'sla');
  }
  if (isOpenQueueTab) {
    columns = columns.filter((col) => col.key !== 'currentStep');
  }
  return withViewDetailsColumn(applyExtrovisMisColumnLayout(columns));
}

/** Approver service queue columns — always shows requester + assignee */
export function getApproverServiceTableColumns(serviceTab, { isRefexService = false } = {}) {
  if (isRefexService) {
    return withViewDetailsColumn(getRefexServiceQueueMisColumns(serviceTab, { role: 'monitoring' }));
  }
  const isTerminal = serviceTab === 'Resolved' || serviceTab === 'Cancelled' || serviceTab === 'Completed' || serviceTab === 'Closed';
  if (isTerminal) {
    const cols = isRefexService ? REFEX_SERVICE_COMPLETED_COLUMNS : SERVICE_COMPLETED_COLUMNS;
    return withViewDetailsColumn(cols);
  }
  return getServiceTableColumns({ isOpenQueueTab: serviceTab === 'OpenTickets', isRefexService });
}

export function getCrTableColumns({ includeSla = true, isCompletedTab = false } = {}) {
  if (isCompletedTab) {
    return withViewDetailsColumn(applyExtrovisMisColumnLayout(CR_COMPLETED_COLUMNS));
  }
  const columns = includeSla
    ? CR_COLUMNS
    : CR_COLUMNS.filter((col) => col.key !== 'sla');
  return withViewDetailsColumn(applyExtrovisMisColumnLayout(columns));
}

export function buildCompletedMobileFields(row) {
  return [
    { label: 'Requester', value: formatRequesterDisplay(row) },
    { label: 'Category', value: row.category },
    { label: 'Sub Category', value: row.subCategory },
    { label: 'Dept', value: row.department || '—' },
    { label: 'Location', value: row.location || '—' },
    { label: 'Start Date', value: getRowStartDateLabel(row) },
    { label: 'End Date', value: getRowEndDateLabel(row) },
    { label: 'SLA Result', value: getSimpleSlaResultLabel(row) },
  ];
}

export function buildCrCompletedMobileFields(row) {
  return [
    { label: 'Requester', value: row.requesterName || row.createdBy || '—' },
    { label: 'Category', value: row.category },
    { label: 'Sub Category', value: row.subCategory },
    { label: 'Start Date', value: getRowStartDateLabel(row) },
    { label: 'End Date', value: getRowEndDateLabel(row) },
    { label: 'SLA Result', value: getSimpleSlaResultLabel(row) },
  ];
}

export function buildApproverCompletedMobileFields(row) {
  return buildCompletedMobileFields(row);
}

export function buildSlaMobileField(row) {
  const timing = getSlaTiming(row);
  return { label: 'SLA', value: timing.hasSla ? timing.shortLabel : '—' };
}

export const TABLE_ACTIONS_COLUMN = { key: 'actions', label: 'Take action' };
export const TABLE_VIEW_DETAILS_COLUMN = { key: 'viewDetails', label: '' };
export const TABLE_TAKE_ACTION_COLUMN = { key: 'takeAction', label: 'Take action' };

export function renderTakeActionGroup(...nodes) {
  const items = nodes.flat().filter(Boolean);
  return (
    <div className="inline-flex items-center justify-end gap-0.5">
      {items}
    </div>
  );
}

export function withViewDetailsColumn(columns) {
  if ((columns || []).some((col) => col.key === 'viewDetails')) return columns;
  return [...(columns || []), TABLE_VIEW_DETAILS_COLUMN];
}

export function renderEditRecordTableCell(kfInstance, row, {
  queueType = 'service',
  canEdit = false,
  openRecord = null,
  onBeforeEdit = null,
  onAfterEdit = null,
  onAfterEditComplete = null,
  onEditOpenFailed = null,
} = {}) {
  if (!canEdit) return null;

  const open = () => openDashboardRecordForm(kfInstance, row, {
    queueType,
    openRecord,
    onBeforeEdit,
    onAfterEdit,
    onAfterEditComplete,
    onEditOpenFailed,
  });

  return (
    <EditRecordIconButton onOpen={open} />
  );
}

export async function openDashboardRecordForm(kfInstance, row, {
  queueType = 'service',
  openRecord = null,
  onBeforeEdit = null,
  onAfterEdit = null,
  onAfterEditComplete = null,
  onEditOpenFailed = null,
} = {}) {
  if (typeof onBeforeEdit === 'function') onBeforeEdit();
  let openResult = false;
  try {
    if (typeof openRecord === 'function') {
      openResult = await openRecord(kfInstance, row);
    } else if (queueType === 'cr') {
      openResult = await openITChangeRequestDetailsPage(kfInstance, row);
    } else {
      openResult = await openITServiceRequestDetailsPage(kfInstance, row);
    }
  } catch (err) {
    if (typeof onEditOpenFailed === 'function') onEditOpenFailed();
    throw err;
  } finally {
    if (typeof onAfterEditComplete === 'function') {
      onAfterEditComplete(openResult);
    } else if (
      (openResult === true || openResult === 'page')
      && typeof onAfterEdit === 'function'
    ) {
      onAfterEdit();
    }
  }
  return openResult;
}

export function shouldIgnoreDashboardRowClick(event) {
  return Boolean(event?.target?.closest?.(
    'button, a, input, select, textarea, [role="button"], [data-stop-row-nav]',
  ));
}

/** Row click — open Kissflow form when edit is available, otherwise expand/collapse. */
export function handleDashboardRowClick(event, kfInstance, row, {
  canOpenForm = false,
  onToggleExpand = null,
  formOptions = {},
} = {}) {
  if (shouldIgnoreDashboardRowClick(event)) return;
  if (canOpenForm) {
    openDashboardRecordForm(kfInstance, row, formOptions).catch((err) => {
      console.warn('Row form open failed:', err?.message || err);
    });
    return;
  }
  if (typeof onToggleExpand === 'function') onToggleExpand();
}

export function createDashboardRowClickHandler(kfInstance, row, options = {}) {
  return (event) => {
    handleDashboardRowClick(event, kfInstance, row, {
      canOpenForm: true,
      formOptions: options,
    });
  };
}

/** @deprecated Use renderEditRecordTableCell with canEdit */
export function renderViewDetailsTableCell(kfInstance, row, options = {}) {
  return renderEditRecordTableCell(kfInstance, row, options);
}

function EditRecordIconButton({ onOpen }) {
  return (
    <ITTableIconButton
      label="Edit ticket"
      icon={Pencil}
      onClick={(e) => {
        e.stopPropagation();
        onOpen().catch((err) => {
          console.warn('Edit ticket failed:', err?.message || err);
        });
      }}
    />
  );
}

export function isTableInteractionColumn(col) {
  return col?.key === 'actions' || col?.key === 'viewDetails' || col?.key === 'takeAction';
}

export function tableInteractionCellClass(col, mis = false) {
  if (col?.key === 'takeAction') return itTableTakeActionCellClass(mis);
  if (col?.key === 'viewDetails') return itTableViewDetailsCellClass(mis);
  if (col?.key === 'actions') return itTableActionsCellClass(mis);
  return '';
}

export function mergeDashboardRowsById(existing = [], incoming = []) {
  if (!incoming.length) return existing;
  const map = new Map(existing.map((row) => [row.id, row]));
  incoming.forEach((row) => {
    if (row?.id) map.set(row.id, row);
  });
  return Array.from(map.values());
}

export function withTableActionsColumn(columns, enabled) {
  if (!enabled) return withViewDetailsColumn(columns);
  const without = (columns || []).filter((col) => !['actions', 'viewDetails', 'takeAction'].includes(col.key));
  return [...without, TABLE_TAKE_ACTION_COLUMN];
}

export function AgentServiceWorkForm({
  form,
  onChange,
  onSubmit,
  submitting = false,
  submitError = '',
  itemStatusOptions = ITEM_STATUS_OPTIONS,
  loadingStatusOptions = false,
  row,
}) {
  const statusPool = itemStatusOptions?.length ? itemStatusOptions : ITEM_STATUS_OPTIONS;
  const statusOptions = filterAgentItemStatusOptions(row, statusPool);
  const selectedToken = getCanonicalAgentItemStatusToken(form.itemStatus);

  const showHoldReason = selectedToken === 'onhold';
  const showPendingReason = selectedToken === 'pendinguserresponse';
  const showCancellationReason = selectedToken === 'cancelled';
  const showSolution = selectedToken === 'resolved';
  const isCompleting = isAgentWorkflowSubmitStatus(form.itemStatus);

  const submitLabel = isCompleting ? 'Update & Submit' : 'Update';

  return (
    <div className={itFormPanel()}>
      <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${itSectionAccent()}`}>Agent Work</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ITMisSelectField
            label="Item Status *"
            value={form.itemStatus}
            onChange={(e) => onChange({ ...form, itemStatus: e.target.value })}
            options={statusOptions}
            placeholder={loadingStatusOptions ? 'Loading...' : 'Select status'}
            disabled={loadingStatusOptions}
            variant="form"
            className="w-full max-w-none sm:max-w-none"
          />
        </div>
        <AnimatePresence>
          {showHoldReason && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden lg:col-span-2">
              <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-900"><PauseCircle className="h-4 w-4" />Reason for Hold *</label>
              <textarea value={form.holdReason} onChange={(e) => onChange({ ...form, holdReason: e.target.value })} rows={3} className={`${itFormInput()} resize-none`} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showPendingReason && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-violet-900">Reason for Pending *</label>
              <textarea value={form.pendingReason} onChange={(e) => onChange({ ...form, pendingReason: e.target.value })} rows={3} className={`${itFormInput()} resize-none`} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showCancellationReason && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-rose-900">Cancellation Reason *</label>
              <textarea value={form.cancellationReason} onChange={(e) => onChange({ ...form, cancellationReason: e.target.value })} rows={3} className={`${itFormInput()} resize-none`} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showSolution && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-[#44546F]">Solution *</label>
              <textarea value={form.solution} onChange={(e) => onChange({ ...form, solution: e.target.value })} rows={4} className={`${itFormInput()} resize-none`} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {submitError && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>}
      <button type="button" disabled={submitting} onClick={onSubmit} className={`${itBtnPrimaryFull()} mt-4`}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

export function RefexTechSupportWorkForm({
  form,
  onChange,
  onSubmit,
  submitting = false,
  submitError = '',
}) {
  const statusValue = form?.status || '';
  const isClose = normalizeText(statusValue).toLowerCase() === 'close';
  const submitLabel = isClose ? 'Update & Submit' : 'Update';

  return (
    <div className={itFormPanel()}>
      <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${itSectionAccent()}`}>Tech Support</p>
      <div className="grid gap-4">
        <div>
          <ITMisSelectField
            label="Status *"
            value={statusValue}
            onChange={(e) => onChange({ ...form, status: e.target.value })}
            options={['Open', 'Close']}
            placeholder="Select status"
            variant="form"
            className="w-full max-w-none sm:max-w-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-[#44546F]">Tech Support Comments *</label>
          <textarea
            value={form?.comments || ''}
            onChange={(e) => onChange({ ...form, comments: e.target.value })}
            rows={4}
            placeholder="Enter Tech Support comments…"
            className={`${itFormInput()} resize-none`}
          />
        </div>
      </div>
      {submitError ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>
      ) : null}
      <button type="button" disabled={submitting} onClick={onSubmit} className={`${itBtnPrimaryFull()} mt-4`}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

export function ManagerReviewForm({
  form,
  onChange,
  onSubmit,
  submitting = false,
  submitError = '',
}) {
  return (
    <div className={itFormPanel()}>
      <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${itSectionAccent()}`}>Manager Review</p>
      <label className="mb-2 block text-sm font-bold text-[#44546F]">
        Manager Comments
        <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
      </label>
      <textarea
        value={form.managerComments}
        onChange={(e) => onChange({ ...form, managerComments: e.target.value })}
        rows={5}
        placeholder="Add manager comments or approval notes..."
        className={`${itFormInput()} resize-none`}
      />
      {submitError && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>}
      <button type="button" disabled={submitting} onClick={onSubmit} className={`${itBtnPrimaryFull()} mt-4`}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  );
}

export function CrImplementationWorkForm({
  row,
  form,
  onChange,
  onSubmit,
  submitting = false,
  submitError = '',
}) {
  const comments = form.comments || '';

  return (
    <div className={itFormPanel()}>
      <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${itSectionAccent()}`}>Complete Implementation</p>
      <div>
        <label className="mb-2 block text-sm font-bold text-[#44546F]">Comments *</label>
        <textarea
          value={comments}
          onChange={(e) => onChange({ ...form, finalStatus: CR_IMPLEMENTATION_SUBMIT_STATUS, comments: e.target.value })}
          rows={4}
          className={`${itFormInput()} resize-none`}
          placeholder="Add implementation comments (required)..."
        />
      </div>
      {submitError && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>}
      <button type="button" disabled={submitting} onClick={onSubmit} className={`${itBtnPrimaryFull()} mt-4`}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {submitting ? 'Submitting...' : 'Mark as Completed'}
      </button>
    </div>
  );
}

export function renderServiceTableCell(col, row, { refexLayout = false, isCompletedTab = false, statusTab = 'All' } = {}) {
  const mappedStatusTab = refexLayout ? mapRefexServiceTabToStatusKey(statusTab) : statusTab;
  switch (col.key) {
    case 'requestId':
      return (
        <>
          <p className={IT_THEME.requestId}>{formatRequestId(row)}</p>
          {!refexLayout ? <p className={IT_THEME.subMetaText}>{row.ticketType}</p> : null}
        </>
      );
    case 'requester':
      return <RequesterCell row={row} />;
    case 'assignedTo':
      if (refexLayout) return <AssignedToCell row={row} />;
      return <span className="max-w-[140px] truncate">{row.assignedTo}</span>;
    case 'escalation':
      return refexLayout ? <EscalationBadge value={row.escalation} /> : '—';
    case 'closedBy':
      return <ClosedByCell row={row} />;
    case 'completedBy': return <span className="max-w-[140px] truncate">{row.completedBy || row.assignedTo || '—'}</span>;
    case 'cancelledBy': return <span className="max-w-[140px] truncate">{row.cancelledBy || row.assignedTo || '—'}</span>;
    case 'ticketType': return <MisRequestTypeCell value={row.ticketType} />;
    case 'category': return getMisCategoryLabel(row);
    case 'subCategory': return getMisSubCategoryLabel(row);
    case 'department': return row.department || '—';
    case 'location': return row.location || '—';
    case 'criticality': return <ITCriticalityBadge criticality={getMisCriticalityLabel(row)} />;
    case 'source': return row.source && row.source !== '—' ? row.source : '—';
    case 'ticketStatus': {
      const status = getMisTicketStatus(row) || 'Open';
      return <TicketStatusBadge status={status} />;
    }
    case 'itemStatus': return <ITItemStatusBadge status={row.itemStatus} />;
    case 'sla':
      if (refexLayout) {
        return <RefexServiceSlaCell row={row} isCompletedTab={isCompletedTab} />;
      }
      return <ITSlaBadge row={row} />;
    case 'tat':
      if (refexLayout) {
        return <RefexServiceTatCell row={row} isCompletedTab={isCompletedTab} />;
      }
      return '—';
    case 'currentStep': return <span className={IT_THEME.stepBadge}>{formatServiceWorkflowStepDisplay(row)}</span>;
    case 'startDate':
    case 'endDate':
    case 'createdOn':
    case 'closedOn':
    case 'reopenedOn':
      if (refexLayout) {
        const columnKey = col.key === 'startDate' ? 'createdOn' : col.key === 'endDate' ? 'closedOn' : col.key;
        return <RefexMisDateTimeCell row={row} statusTab={mappedStatusTab} columnKey={columnKey} />;
      }
      if (col.key === 'startDate') return getRowStartDateLabel(row);
      if (col.key === 'endDate') return getRowEndDateLabel(row);
      return row.requestedDate;
    case 'slaResult':
      if (refexLayout) {
        return <RefexServiceSlaCell row={row} isCompletedTab />;
      }
      return <ITSimpleSlaResultBadge row={row} />;
    case 'resolutionTime': return <ITCompletedResolutionTime row={row} />;
    case 'slaOutcome':
      if (refexLayout) {
        return <RefexServiceSlaCell row={row} isCompletedTab />;
      }
      return <ITSimpleSlaResultBadge row={row} />;
    case 'date': return row.requestedDate;
    default: return '—';
  }
}

export function renderCrTableCell(col, row) {
  switch (col.key) {
    case 'requestId':
      return <p className={IT_THEME.requestId}>{formatRequestId(row)}</p>;
    case 'changeType':
    case 'ticketType':
      return <MisRequestTypeCell value={row.changeType || row.ticketType} />;
    case 'requester':
      return <RequesterCell row={row} />;
    case 'assignedTo':
      return <AssignedToCell row={row} />;
    case 'closedBy':
      return <ClosedByCell row={row} />;
    case 'source':
      return row.source && row.source !== '—' ? row.source : '—';
    case 'ticketStatus': {
      const status = getMisTicketStatus(row) || row.itemStatus || row.statusLabel || 'Open';
      return <TicketStatusBadge status={status} />;
    }
    case 'category': return getMisCategoryLabel(row);
    case 'subCategory': return getMisSubCategoryLabel(row);
    case 'criticality': return <ITCriticalityBadge criticality={getMisCriticalityLabel(row)} />;
    case 'sla': return <ITSlaBadge row={row} />;
    case 'currentStep': return <span className={IT_THEME.stepBadge}>{formatCrWorkflowStepDisplay(row)}</span>;
    case 'startDate':
    case 'endDate':
    case 'createdOn':
    case 'closedOn':
    case 'reopenedOn':
      if (col.key === 'startDate' || col.key === 'createdOn') return getRowStartDateLabel(row);
      if (col.key === 'endDate' || col.key === 'closedOn') return getRowEndDateLabel(row);
      return row.requestedDate;
    case 'slaResult': return <ITSimpleSlaResultBadge row={row} />;
    case 'resolutionTime': return <ITCompletedResolutionTime row={row} />;
    case 'slaOutcome': return <ITSimpleSlaResultBadge row={row} />;
    case 'date': return row.requestedDate;
    default: return '—';
  }
}

function hasExpandDetailValue(value) {
  const text = String(value ?? '').trim();
  return !!text && text !== '—';
}

function buildServiceContextTiles(row, { showEntity = true } = {}) {
  const tiles = [];
  if (showEntity) tiles.push({ label: 'Entity', value: row?.entity });
  tiles.push(
    { label: 'Department', value: row?.department },
    { label: 'Location', value: row?.location },
    { label: 'Sub-Category', value: row?.subCategory },
  );
  return tiles;
}

function resolveServiceStripCurrentStep(row) {
  const live = getCurrentStepValue(row) || row?.activeWorkflowStep || row?.currentStep;
  const norm = normalizeServiceWorkflowStep(live);
  if (norm && norm.toLowerCase() !== 'start' && norm !== '—') return norm;
  const lastNorm = normalizeServiceWorkflowStep(row?.lastCompletedStep);
  const lastLower = String(lastNorm || '').toLowerCase();
  // Never paint ReOpen Window from lastCompletedStep while the ticket is still live work.
  if (lastNorm && !lastLower.includes('reopen')) return lastNorm;
  return live || '';
}

function buildServiceWorkflowAside({ row, showSlaInExpand = false, showHandlers = false, variant = 'service', hideUnassignedStepTimes = false }) {
  const steps = variant === 'cr' ? CHANGE_REQUEST_WORKFLOW_STEPS : WORKFLOW_STEPS;
  const getIndex = variant === 'cr' ? getChangeRequestStepIndex : getWorkflowStepIndex;
  const handlers = showHandlers
    ? (variant === 'cr' ? getCrWorkflowHandlers(row) : getServiceWorkflowHandlers(row))
    : {};
  const stepTimes = showHandlers
    ? (variant === 'cr' ? getCrWorkflowStepTimes(row) : getServiceWorkflowStepTimes(row))
    : {};
  const completedTiming = getCompletedResolutionTiming(row);
  const slaTiming = getSlaTiming(row);
  const showSla = showSlaInExpand && (completedTiming.hasData || slaTiming.hasSla);
  const entityKey = row?.entity || '';
  const displayCurrentStep = variant === 'cr'
    ? (getCrCurrentStepValue(row) || row?.currentStep)
    : resolveServiceStripCurrentStep(row);

  const strip = (
    <ITVerticalWorkflowStrip
      steps={steps}
      currentStep={displayCurrentStep}
      lastCompletedStep={row.lastCompletedStep}
      getIndex={getIndex}
      handlers={handlers}
      stepTimes={stepTimes}
      variant={variant}
      hideUnassignedStepTimes={hideUnassignedStepTimes}
      entityKey={entityKey}
    />
  );

  const slaPanel = showSla
    ? (completedTiming.hasData
      ? <ITCompactCompletedResolutionStrip row={row} />
      : <ITCompactSlaStrip row={row} />)
    : null;

  if (isMisModernUi()) {
    return <MisWorkflowPanel workflow={strip} sla={slaPanel} />;
  }

  return (
    <>
      {strip}
      {slaPanel}
    </>
  );
}

function buildMisServiceOverview(row, options = {}, footer = null) {
  const { detailOptions = {}, ...overviewOptions } = options;
  const tiles = [
    ...buildServiceOverviewTiles(row, overviewOptions),
    ...buildServiceDetailTiles(row, detailOptions),
  ];
  return (
    <MisDetailCard
      tiles={visibleMisTiles(tiles)}
      attachments={row.attachments}
      footer={footer}
    />
  );
}

function buildMisServiceDetails(row, options = {}) {
  return (
    <MisDetailCard
      tiles={visibleMisTiles(buildServiceDetailTiles(row, options))}
      attachments={row.attachments}
    />
  );
}

function buildMisCrOverview(row, options = {}, footer = null) {
  const tiles = [
    ...buildCrOverviewTiles(row, options),
    ...buildCrDetailTiles(row),
  ];
  return (
    <MisDetailCard
      tiles={visibleMisTiles(tiles)}
      attachments={row.attachments}
      footer={footer}
    />
  );
}

function buildMisCrDetails(row) {
  return (
    <MisDetailCard
      tiles={visibleMisTiles(buildCrDetailTiles(row))}
      attachments={row.attachments}
    />
  );
}

export function ServiceHoldPendingComments({ row }) {
  const showHold = hasExpandDetailValue(row?.holdReason);
  const showPending = hasExpandDetailValue(row?.pendingReason);
  const showCancel = hasExpandDetailValue(row?.cancellationReason);
  if (!showHold && !showPending && !showCancel) return null;

  return (
    <>
      {showPending && (
        <ITContentPanel label="Reason for Pending">
          <p className="text-sm whitespace-pre-wrap text-[#44546F]">{row.pendingReason}</p>
        </ITContentPanel>
      )}
      {showHold && (
        <ITContentPanel label="Reason for Hold">
          <p className="text-sm whitespace-pre-wrap text-[#44546F]">{row.holdReason}</p>
        </ITContentPanel>
      )}
      {showCancel && (
        <ITContentPanel label="Cancellation Reason">
          <p className="text-sm whitespace-pre-wrap text-[#44546F]">{row.cancellationReason}</p>
        </ITContentPanel>
      )}
    </>
  );
}

export function EntitySwitch({ activeEntity, onChange, tabs = [] }) {
  if (!tabs.length) return null;
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
      {tabs.map((tab) => {
        const active = activeEntity === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-[3px] px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-[#f0fdfa] text-[#047857] ring-1 ring-inset ring-[#99f6e4]'
                : 'text-[#44546F] hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function QueueSwitch({ activeQueue, onChange, pendingCounts = null }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2 sm:px-4">
      {getAgentQueueTabs().map((tab) => {
        const active = activeQueue === tab.key;
        const Icon = tab.key === 'ServiceQueue' ? Wrench : GitBranch;
        void pendingCounts;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-[3px] px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-[#f0fdfa] text-[#047857] ring-1 ring-inset ring-[#99f6e4]'
                : 'text-[#44546F] hover:bg-gray-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function SupportingDocumentsList({ attachments }) {
  if (!Array.isArray(attachments) || !attachments.length) {
    return (
      <div className="rounded-[3px] border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#626F86]">
        No supporting documents
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {attachments.map((file) => {
        const url = resolveAttachmentUrl(file);
        const name = file?.name || 'file';
        const inner = (
          <>
            <Paperclip className="h-4 w-4 shrink-0 text-[#0d9488]" />
            <span className="truncate font-medium">{name}</span>
          </>
        );
        return (
          <li key={file?.id || file?.name}>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-[3px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#44546F] hover:border-[#99f6e4] hover:bg-[#f0fdfa]/30"
              >
                {inner}
              </a>
            ) : (
              <div className="flex items-center gap-2 rounded-[3px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#44546F]">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function buildServiceResolutionHistoryAside(row) {
  return <ServiceResolutionHistoryAside row={row} />;
}

/** Resolution history with reopen comments + agent notes from progress API. */
function ServiceResolutionHistoryAside({ row, progressRefreshKey = 0 }) {
  const { kf: kfFromContext } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);
  const instanceId = row?.id || '';
  const [progressReopenNotes, setProgressReopenNotes] = useState(row?.progressReopenNotes || []);
  const [progressAgentNotes, setProgressAgentNotes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadProgressNotes() {
      if (!instanceId || !kfInstance?.api) return;
      const progress = await fetchRefexProcessProgressCached(kfInstance, instanceId);
      if (cancelled || !progress) return;
      setProgressReopenNotes(collectReopenNotesFromProgress(progress, row));
      setProgressAgentNotes(collectAgentResolutionNotesFromProgress(progress, row));
    }
    loadProgressNotes();
    return () => { cancelled = true; };
    // row identity changes often — resolve notes from instanceId + refresh key only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kfInstance, instanceId, progressRefreshKey]);

  const entries = useMemo(() => {
    const fromProgress = (progressAgentNotes || []).map((entry) => ({
      resolution: entry.comment || entry.resolution,
      comment: entry.comment || entry.resolution,
      dateTime: entry.dateTime,
      agentName: entry.userName,
      recordId: entry.recordId,
      id: entry.recordId,
    }));
    const enrichedRow = {
      ...row,
      solution: row?.latestAgentSolution || row?.solution || row?.itAgentSolution,
      latestAgentSolution: row?.latestAgentSolution || row?.solution || row?.itAgentSolution,
      agentSolutions: [
        ...(Array.isArray(row?.agentSolutions) ? row.agentSolutions : []),
        ...fromProgress,
      ],
      progressReopenNotes,
    };
    return collectConversationEntries(enrichedRow);
  }, [row, progressReopenNotes, progressAgentNotes]);

  // Always keep the Resolution History tab visible (empty state when none yet).
  return <MisResolutionHistoryPanel entries={entries} />;
}

export function ExpandPanelShell({
  main,
  aside,
  workflow,
  tracking,
  resolutionHistory,
  revisionCount = null,
  layout,
  persistKey = '',
}) {
  const misTabbed = layout === 'mis-tabbed' || (!layout && isMisModernUi());
  const historyPanel = resolutionHistory || tracking;
  if (misTabbed) {
    // Opacity-only enter — height:0 clips async workflow / resolution history loads.
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <MisTabbedExpandShell
          persistKey={persistKey}
          overview={main}
          workflow={workflow}
          resolutionHistory={historyPanel}
          revisionCount={revisionCount}
        />
      </motion.div>
    );
  }
  const hasAside = (aside != null && aside !== false) || (workflow != null && workflow !== false);
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-5 lg:px-6">
        {hasAside ? (
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="min-w-0 space-y-3 sm:space-y-4 lg:col-span-7 xl:col-span-8">{main}</div>
            <div className="min-w-0 space-y-3 sm:space-y-4 lg:col-span-5 xl:col-span-4 lg:border-l lg:border-gray-200 lg:pl-6">
              {workflow}
              {aside}
            </div>
          </div>
        ) : (
          <div className="w-full space-y-3 sm:space-y-4">{main}</div>
        )}
      </div>
    </motion.div>
  );
}

export function ExpandDetailGrid({ tiles, compact = false }) {
  const visible = (tiles || []).filter((t) => t?.value && t.value !== '—');
  if (!visible.length) return null;
  return (
    <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
      {visible.map(({ label, value }) => (
        <ITDetailTile key={label} label={label} value={value} />
      ))}
    </div>
  );
}

export function ExpandDocumentsSection({ attachments, variant = 'default' }) {
  if (!attachments?.length) return null;

  if (variant === 'mis-inline') {
    return (
      <div className="min-w-0 border-b border-gray-200 py-2.5 last:border-0 sm:col-span-full sm:py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Supporting Documents</p>
        <div className="mt-1.5">
          <SupportingDocumentsList attachments={attachments} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#626F86]">
        <Paperclip className="h-3.5 w-3.5" />
        Supporting Documents
      </p>
      <SupportingDocumentsList attachments={attachments} />
    </div>
  );
}

/** Workflow always shown; SLA only when table row has no SLA column */
export function ExpandWorkflowSlaSection({
  row,
  steps,
  getIndex,
  currentStep,
  lastCompletedStep,
  showSlaInExpand = false,
  workflowVariant = 'service',
}) {
  const completedTiming = getCompletedResolutionTiming(row);
  const slaTiming = getSlaTiming(row);
  const showSla = showSlaInExpand && (completedTiming.hasData || slaTiming.hasSla);
  const displayCurrentStep = workflowVariant === 'service'
    ? resolveServiceStripCurrentStep({ currentStep, lastCompletedStep })
    : (getCrCurrentStepValue(row) || currentStep);
  const displayLastCompletedStep = workflowVariant === 'service'
    ? normalizeServiceWorkflowStep(lastCompletedStep)
    : lastCompletedStep;

  return (
    <div className={`grid w-full gap-3 ${showSla ? 'lg:grid-cols-2' : ''}`}>
      <ITCompactWorkflowStrip
        steps={steps}
        currentStep={displayCurrentStep}
        lastCompletedStep={displayLastCompletedStep}
        getIndex={getIndex}
        variant={workflowVariant}
        entityKey={row?.entity || ''}
      />
      {showSla ? (
        completedTiming.hasData
          ? <ITCompactCompletedResolutionStrip row={row} />
          : <ITCompactSlaStrip row={row} />
      ) : null}
    </div>
  );
}

function buildRefexProgressWorkflowAside({ row, showSlaInExpand = false }) {
  return <RefexProgressWorkflowAside row={row} showSlaInExpand={showSlaInExpand} />;
}

function isRejectedExpandRow(row) {
  const candidates = [
    row?.systemStatus,
    row?.workflowStatus,
    row?.status,
    row?.statusLabel,
    row?.itemStatusRaw,
    row?.itemStatus,
  ];
  return candidates.some((value) => {
    const token = String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    return token === 'rejected' || token === 'reject' || token === 'declined';
  });
}

function useRowWithRejectionNotes(row) {
  const { kf: kfFromContext } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);
  const [progressRejectionNotes, setProgressRejectionNotes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isRejectedExpandRow(row) || !row?.id || !kfInstance?.api) return;
      if (getRejectionReasonDisplay(row)) return;
      const progress = await fetchRefexProcessProgressCached(kfInstance, row.id);
      if (cancelled || !progress) return;
      setProgressRejectionNotes(collectRejectionNotesFromProgress(progress, row));
    }
    load();
    return () => { cancelled = true; };
  }, [row, kfInstance]);

  return useMemo(
    () => ({ ...row, progressRejectionNotes }),
    [row, progressRejectionNotes],
  );
}

export function AgentServiceExpandPanel({
  row, form, canEdit, submitting, submitError, onChange, onSubmit,
  itemStatusOptions = ITEM_STATUS_OPTIONS,
  loadingStatusOptions = false,
  showSubmitForm = false,
  showSlaInExpand = false,
  useRefexProgressWorkflow = usesRefexServiceWorkflow(),
}) {
  const overviewRow = useRowWithRejectionNotes(row);
  const statusPool = itemStatusOptions?.length ? itemStatusOptions : ITEM_STATUS_OPTIONS;
  const statusOptions = filterAgentItemStatusOptions(row, statusPool);
  const workflowAside = useRefexProgressWorkflow
    ? buildRefexProgressWorkflowAside({ row, showSlaInExpand })
    : buildServiceWorkflowAside({
      row,
      showSlaInExpand,
      showHandlers: true,
      variant: 'service',
      hideUnassignedStepTimes: true,
    });

  return (
    <ExpandPanelShell
      persistKey={row?.id || ''}
      workflow={workflowAside}
      main={buildMisServiceOverview(
        overviewRow,
        {
          showEntity: true,
          showDeptLocation: true,
          detailOptions: { showEntity: true, showDeptLocation: true, showRequester: false },
        },
        canEdit && showSubmitForm ? (
          <AgentServiceWorkForm
            row={row}
            form={form}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            submitError={submitError}
            itemStatusOptions={statusOptions}
            loadingStatusOptions={loadingStatusOptions}
          />
        ) : null,
      )}
      resolutionHistory={buildServiceResolutionHistoryAside(row)}
    />
  );
}

export function ManagerServiceExpandPanel({
  row, form, canEdit, showAgentWork, submitting, submitError, onChange, onSubmit,
  showSubmitForm = false,
  showSlaInExpand = false,
}) {
  const overviewRow = useRowWithRejectionNotes(row);
  const extraTiles = showAgentWork && hasExpandDetailValue(row.solution)
    ? [{ label: 'Agent Solution', value: row.solution, multiline: true }]
    : [];
  if (!canEdit && hasExpandDetailValue(row.managerComments)) {
    extraTiles.push({ label: 'Manager Comments', value: row.managerComments, multiline: true });
  }

  return (
    <ExpandPanelShell
      persistKey={row?.id || ''}
      workflow={buildServiceWorkflowAside({ row, showSlaInExpand, showHandlers: true, variant: 'service' })}
      main={buildMisServiceOverview(
        overviewRow,
        {
          showEntity: false,
          showDeptLocation: true,
          extraTiles,
          includeSolution: !showAgentWork,
          detailOptions: { showEntity: false, showDeptLocation: true, showRequester: true },
        },
        canEdit && showSubmitForm ? (
          <ManagerReviewForm
            form={form}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        ) : null,
      )}
      resolutionHistory={buildServiceResolutionHistoryAside(row)}
    />
  );
}

export function EmployeeServiceExpandPanel({
  row,
  showSlaInExpand = false,
  showEntityInAside = true,
  showWorkflowHandlers = false,
  headerActions = null,
  useRefexProgressWorkflow = usesRefexServiceWorkflow(),
}) {
  const overviewRow = useRowWithRejectionNotes(row);
  const workflowAside = useRefexProgressWorkflow
    ? buildRefexProgressWorkflowAside({ row, showSlaInExpand })
    : buildServiceWorkflowAside({
      row,
      showSlaInExpand,
      showHandlers: showWorkflowHandlers,
      variant: 'service',
      hideUnassignedStepTimes: true,
    });

  return (
    <ExpandPanelShell
      persistKey={row?.id || ''}
      workflow={workflowAside}
      main={buildMisServiceOverview(
        overviewRow,
        {
          showEntity: showEntityInAside,
          showDeptLocation: false,
          detailOptions: { showEntity: showEntityInAside, showDeptLocation: false },
        },
        headerActions ? <div className="flex flex-wrap items-center justify-end gap-2">{headerActions}</div> : null,
      )}
      resolutionHistory={buildServiceResolutionHistoryAside(row)}
    />
  );
}

/** First / final approver service queue expand — no entity tile, workflow handlers shown */
export function ApproverServiceExpandPanel({ row, showSlaInExpand = false }) {
  return (
    <EmployeeServiceExpandPanel
      row={row}
      showSlaInExpand={showSlaInExpand}
      showEntityInAside={false}
      showWorkflowHandlers
    />
  );
}

export function AdminServiceExpandPanel({ row, showSlaInExpand = false }) {
  const useRefexProgressWorkflow = normalizeText(row?.entity) === 'Refex'
    || usesRefexServiceWorkflow(row?.entity);
  const workflowAside = useRefexProgressWorkflow
    ? buildRefexProgressWorkflowAside({ row, showSlaInExpand })
    : buildServiceWorkflowAside({ row, showSlaInExpand, showHandlers: true, variant: 'service' });

  return (
    <ExpandPanelShell
      persistKey={row?.id || ''}
      workflow={workflowAside}
      main={buildMisServiceOverview(row, {
        showEntity: true,
        showDeptLocation: true,
        showRequester: true,
        detailOptions: { showEntity: true, showDeptLocation: true, showRequester: true },
      })}
      resolutionHistory={buildServiceResolutionHistoryAside(row)}
    />
  );
}

export function CrExpandPanel({
  row,
  form = { finalStatus: '', comments: '' },
  canEdit = false,
  isCompleted = false,
  submitting = false,
  submitError = '',
  onChange = () => {},
  onSubmit = () => {},
  readOnly = false,
  finalStatusOptions = CR_IMPLEMENTATION_STATUS_OPTIONS,
  loadingStatusOptions = false,
  showSubmitForm = false,
  showSlaInExpand = false,
}) {
  const statusPool = finalStatusOptions?.length ? finalStatusOptions : CR_IMPLEMENTATION_STATUS_OPTIONS;
  const statusOptions = filterCrImplementationFinalStatusOptions(row, statusPool);

  return (
    <ExpandPanelShell
      persistKey={row?.id || ''}
      workflow={buildServiceWorkflowAside({ row, showSlaInExpand, showHandlers: true, variant: 'cr' })}
      main={buildMisCrOverview(
        row,
        {},
        !readOnly && canEdit && showSubmitForm ? (
          <CrImplementationWorkForm
            row={row}
            form={form}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            submitError={submitError}
            finalStatusOptions={statusOptions}
            loadingStatusOptions={loadingStatusOptions}
          />
        ) : isCompleted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Implementation completed
          </div>
        ) : null,
      )}
    />
  );
}

export {
  buildMisServiceOverview,
  buildMisServiceDetails,
  buildMisCrOverview,
  buildMisCrDetails,
  buildServiceWorkflowAside,
};
