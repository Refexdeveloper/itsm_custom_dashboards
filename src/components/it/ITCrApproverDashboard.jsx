/* eslint-disable max-lines -- dual-queue approver dashboard (service + change requests) */
import { useState, useContext, useEffect, useLayoutEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import {
  Loader2, Send, ChevronDown, ChevronUp, CheckCircle2, Stamp, Users,
} from 'lucide-react';
import {
  fetchRefexApproverMeLandingSeed,
  fetchRefexOversightLandingSeed,
  fetchRefexAdminCanonicalTickets,
  hydrateRefexMonitoringFromPersistentCache,
  clearRequestIdReportCache,
  clearRefexPendingTaskCaches,
} from '../../itsm/refex/techsupport/fetchRefexTechSupportTickets.js';
import {
  ensureRefexMappedDataset,
  scheduleRefexMappedDatasetLoad,
  invalidateRefexMappedDataset,
  getCachedRefexMappedRows,
  setCachedRefexMappedRows,
} from '../../itsm/refex/shared/refexDatasetStore.js';
import { getMisTicketStatus } from '../../itsm/refex/employeedashboard/employeeStatus.js';
import { getRefexReportStagesLabel, getRefexReportStatusLabel } from '../../itsm/refex/employeedashboard/ticketStage.js';
import { MIS_TICKET_STATUS_FILTER_OPTIONS } from '../../itsm/refex/employeedashboard/constants.js';
import { getRefexServiceQueueMisColumns, applyExtrovisMisColumnLayout } from '../../itsm/refex/shared/refexServiceQueueColumns.js';
import { KissflowSDKContext } from '../../sdk/index.js';
import {
  IT_THEME,
  ITDashboardBackground,
  ITDashboardHeader,
  ITDashboardShell,
  ITDashboardDataSection,
  ITTableSectionHeader,
  ITTabButton,
  ITTableSkeleton,
  ITEmptyTickets,
  ITTicketMobileCard,
  ITCriticalityBadge,
  ITItemStatusBadge,
  ITTableFooter,
  ITContentPanel,
  ITSlaBadge,
  getSlaTableRowClass,
  ITDashboardDialog,
  ITTableIconButton,
  ITCompletedSlaOutcomeBadge,
  ITSimpleSlaResultBadge,
  itFormInput,
  itFormPanel,
  itBtnPrimaryFull,
  itSectionAccent,
  useITListPagination,
  ITTablePagination,
  ITVerticalWorkflowStrip,
  ITCompactSlaStrip,
  useMisTableFilters,
  ITMisTableFilters,
  ITMisSelectField,
} from './ITDashboardUI.jsx';
import { useIsMisModern } from '../../context/ITDashboardUiContext.jsx';
import {
  misModernTableHeadClass,
  misModernMobileListClass,
} from './mis/ITMisEmployeeUI.jsx';
import { ITMisDualQueuePageChrome } from './mis/ITMisDualQueuePageChrome.jsx';
import { countItsmSourcePanels } from '../../lib/neGcpDashboardMath.js';
import { getMisSourceLabel } from '../../itsm/refex/shared/misCompactDisplay.js';
import {
  REFEX_TABLE_ROW_CLASS,
  REFEX_TABLE_CELL_CLASS,
  REFEX_TABLE_HEAD_CELL,
  RefexTablePaginationFooter,
  RefexLiveClockText,
  refexStickyHeadClass,
  refexStickyCellClass,
  renderRefexMisTableHeadLabel,
  getRefexServiceMisHeadLabelProps,
} from '../../itsm/refex/shared/RefexItsmSharedUI.jsx';
import { IT_TYPE } from './itDesignTokens.js';
import { ITQueueAnalyticsPanel, ITCrHeroIcon } from './ITDashboardAnalytics.jsx';
// Health Monitor — disabled for now; re-enable when needed
// import ITSMHealthMonitor from './ITSMHealthMonitor.jsx';
import { useITDashboardPeriodFilter } from './useITDashboardPeriodFilter.jsx';
import { useApproverAdaptivePeriodFilter } from './useApproverAdaptivePeriodFilter.jsx';
import { APPROVER_PERIOD_OPTIONS } from './ITAgentWorkbench.jsx';
import { useITDashboardSilentRefresh } from './useITDashboardSilentRefresh.js';
import { useITEditRecordRefreshBindings } from './useITEditRecordRefreshBindings.js';
import { MisTicketAttachmentsLikeComments } from './mis/ITMisExpandPrimitives.jsx';
import {
  QueueSwitch,
  ApproverServiceExpandPanel,
  getApproverServiceTableColumns,
  renderServiceTableCell,
  renderCrTableCell,
  buildSlaMobileField,
  buildCompletedMobileFields,
  buildCrCompletedMobileFields,
  mergeDashboardRowsById,
  withTableActionsColumn,
  CR_COMPLETED_COLUMNS,
  formatRequestId,
  ExpandPanelShell,
  useExpandTicketAttachments,
  buildMisCrOverview,
  buildMisCrDetails,
  buildServiceWorkflowAside,
  ExpandDetailGrid,
  ExpandDocumentsSection,
  ExpandWorkflowSlaSection,
  renderEditRecordTableCell,
  handleDashboardRowClick,
  isTableInteractionColumn,
  tableInteractionCellClass,
  renderTakeActionGroup,
} from './ITDashboardShared.jsx';
import {
  fetchITApproverDashboardData,
  fetchITApproverDashboardDataForEntity,
  withEntityDashboardProfile,
  mapReportRow,
  mapChangeRequestRow,
  filterCrApproverVisibleRows,
  filterEntityScopedRows,
  filterRowsByEntityKey,
  getActiveDashboardProfile,
  setITDashboardProfile,
  resolveEntityProfile,
  IT_DASHBOARD_SERVER_PAGE_SIZE,
  FIRST_LEVEL_APPROVER_TABS,
  FINAL_LEVEL_APPROVER_TABS,
  getFinalLevelApproverTabs,
  formatCrWorkflowStepDisplay,
  ITSM_ENTITY_OPTIONS,
  ITSM_DEFAULT_ENTITY,
  APPROVER_SERVICE_TABS,
  getApproverServiceTabs,
  isRefexServiceDashboardContext,
  isExtrovisServiceDashboardContext,
  isExtrovisReportEntity,
  isExtrovisAllEntityTab,
  EXTROVIS_DASHBOARD_DEFAULT_ENTITY,
  resolveEntityProcessDatasetKey,
  sharesEntityProcessDataset,
  resolveModernMisChromeEntityKey,
  usesModernMisChrome,
  EXTROVIS_DASHBOARD_ENTITY_OPTIONS,
  REFEX_COMPANY_NAME_OPTIONS,
  EXTRA_COMPANY_NAME_OPTIONS,
  resolveDefaultServiceStatusTab,
  countCriticalHighPriorityRows,
  applyApproverServiceFilters,
  applyMisColumnFilters,
  computeApproverServiceKpisFromRows,
  computeITSMHealthMetrics,
  computeChangeTypeBreakdown,
  computeCrCriticalityBreakdown,
  computeApproverServicePriorityBreakdown,
  computeCategoryBreakdown,
  matchesApproverServiceTab,
  matchesRefexMonitoringServiceTab,
  matchesRefexApproverPendingTaskRow,
  matchesRefexApproverReopenClosedRow,
  isITTechReopenStep,
  isPersonallyAssignedToUser,
  isITHeadApprovalStep,
  countServiceSlaKpiSplit,
  isRefexServiceOpenTicket,
  isRefexServiceClosedTicket,
  isRefexServiceProcessCompleted,
  isDashboardRowCreatedToday,
  isEmployeeApprovalRefexStep,
  getDashboardRowDateMs,
  dashboardDateRangeIncludesToday,
  resolveKfUserProfile,
  resolveItsmHeaderRoleLabel,
  applyFirstLevelApproverFilters,
  applyFinalLevelApproverFilters,
  matchesFirstLevelApproverTab,
  matchesFinalLevelApproverTab,
  computeFirstLevelApproverKpisFromRows,
  computeFinalLevelApproverKpisFromRows,
  computeSlaKpisFromRows,
  computeUserQueuePendingCounts,
  getCrWorkflowHandlers,
  getCrWorkflowStepTimes,
  CHANGE_REQUEST_WORKFLOW_STEPS,
  CR_FIRST_APPROVER_STEP,
  CR_FINAL_APPROVER_STEP,
  CR_IMPLEMENTATION_STEP,
  getChangeRequestStepIndex,
  submitITChangeRequestApproval,
  hydrateCrRowFromInstance,
  isCrAtStep,
  isMyCrApproverItem,
  isMyCrApproverPendingItem,
  isCrCompletedItem,
  canShowCrApproverEditIcon,
  canShowServiceRecordEditIcon,
  getCrImplementationTaskStatus,
  getSlaTiming,
  getCompletedResolutionTiming,
  getRowStartDateLabel,
  getRowEndDateLabel,
  openITCreateTicketPage,
  openITAgentCreateChangeRequestPage,
  matchesDashboardMeScope,
  matchesRefexAgentMeScope,
  matchesRefexMeOnlyScope,
  matchesCommonPersonalScope,
  matchesRefexMyTaskRow,
  matchesExtrovisOpenTicketRow,
  matchesOpenPickupTicketRow,
  isExtrovisAgentPickupStep,
} from '../../lib/kfITServiceDashboard.js';
import { MOCK_IT_CHANGE_REQUEST } from '../../mocks/itChangeRequests.js';
import { MOCK_IT_MANAGER_TASKS } from '../../mocks/itManagerTasks.js';
import ITServiceReassignDialog from './ITServiceReassignDialog.jsx';
import { canAdminKeyedReassign } from '../../lib/extrovisIntegrationApi.js';

const BASE_TABLE_COLUMNS = [
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
];

const IMPLEMENTATION_TASK_STATUS_COLUMN = { key: 'taskStatus', label: 'Task Status' };

/** First-level approvers who may create change requests from the header action. */
const FIRST_LEVEL_CR_CREATE_USER_NAMES = new Set(['balaraju ilaiveni']);

function canFirstLevelApproverCreateCr(role, userName, user) {
  if (role !== 'first') return false;
  const name = (userName || user?.Name || '').trim().toLowerCase();
  return FIRST_LEVEL_CR_CREATE_USER_NAMES.has(name);
}

function isBalarajuSelfRaisedCr(row, user, userName) {
  if (!canFirstLevelApproverCreateCr('first', userName, user)) return false;
  const selfName = (userName || user?.Name || '').trim().toLowerCase();
  const requester = (row?.requesterName || row?.createdBy || '').trim().toLowerCase();
  if (selfName && requester && requester === selfName) return true;
  const selfEmail = String(user?.Email ?? '').trim().toLowerCase();
  const requesterEmail = String(row?.requesterEmail || row?.createdByEmail || '').trim().toLowerCase();
  return Boolean(selfEmail && requesterEmail && selfEmail === requesterEmail);
}

function buildTableColumns(activeTab) {
  if (activeTab === 'Completed') {
    return applyExtrovisMisColumnLayout(CR_COMPLETED_COLUMNS);
  }
  let cols = [...BASE_TABLE_COLUMNS];
  if (activeTab === 'Implementation') {
    const statusIdx = cols.findIndex((col) => col.key === 'ticketStatus');
    cols.splice(statusIdx >= 0 ? statusIdx : cols.length, 0, IMPLEMENTATION_TASK_STATUS_COLUMN);
  }
  return applyExtrovisMisColumnLayout(cols);
}

const ROLE_META = {
  first: {
    roleKey: 'firstLevelApprover',
    approverStep: CR_FIRST_APPROVER_STEP,
    tabs: FIRST_LEVEL_APPROVER_TABS,
    defaultTab: 'PendingTask',
    subtitle: 'Service requests & change request approvals',
    includeFirstLevelQueue: false,
    applyFilters: applyFirstLevelApproverFilters,
    matchesTab: matchesFirstLevelApproverTab,
    computeKpis: computeFirstLevelApproverKpisFromRows,
  },
  final: {
    roleKey: 'finalLevelApprover',
    approverStep: CR_FINAL_APPROVER_STEP,
    tabs: FINAL_LEVEL_APPROVER_TABS,
    defaultTab: 'PendingTask',
    subtitle: 'Service requests & change request approvals',
    includeFirstLevelQueue: true,
    applyFilters: applyFinalLevelApproverFilters,
    matchesTab: matchesFinalLevelApproverTab,
    computeKpis: computeFinalLevelApproverKpisFromRows,
  },
};


function getRowApprovalComment(row, approverStep) {
  if (approverStep === CR_FINAL_APPROVER_STEP) {
    const text = row?.finalComments;
    return text && text !== '—' ? text : '';
  }
  const text = row?.solution;
  return text && text !== '—' ? text : '';
}

function emptyFormFromRow(row, approverStep) {
  return { comments: getRowApprovalComment(row, approverStep) };
}

function CrApproverApprovalForm({
  form,
  approverStep,
  onChange,
  onSubmit,
  submitting = false,
  submitError = '',
}) {
  return (
    <div className={itFormPanel()}>
      <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${itSectionAccent()}`}>Approval Comments</p>
      <label className="mb-2 block text-sm font-bold text-[#44546F]">
        {approverStep === CR_FINAL_APPROVER_STEP ? 'Final Comments *' : 'Solution *'}
      </label>
      <textarea
        value={form.comments}
        onChange={(e) => onChange({ ...form, comments: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        rows={4}
        placeholder="Enter your approval comments..."
        required
        className={`${itFormInput()} resize-none`}
      />
      {submitError && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>
      )}
      <button
        type="button"
        disabled={submitting}
        onClick={(e) => { e.stopPropagation(); onSubmit(); }}
        className={`${itBtnPrimaryFull()} mt-4`}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Submitting...' : 'Submit Approval'}
      </button>
    </div>
  );
}

function CrExpandPanel({
  row,
  form,
  approverStep,
  canEdit,
  showSubmitForm = false,
  showComments,
  activeTab = 'PendingTask',
  submitting,
  submitError,
  onChange,
  onSubmit,
}) {
  const isCompletedView = activeTab === 'Completed';
  const showSlaInExpand = activeTab === 'Completed';
  const showApprovalComments = showComments && getRowApprovalComment(row, approverStep);
  const extraTiles = [];
  if (showApprovalComments) {
    extraTiles.push({
      label: approverStep === CR_FINAL_APPROVER_STEP ? 'Final Comments' : 'Solution',
      value: getRowApprovalComment(row, approverStep),
      multiline: true,
    });
  }
  if (isCompletedView) {
    extraTiles.push({ label: 'Final Status', value: getCrImplementationTaskStatus(row) });
  }
  const ticketFiles = useExpandTicketAttachments(row);
  const overviewForCard = { ...row, attachments: [] };

  return (
    <ExpandPanelShell
      workflow={buildServiceWorkflowAside({
        row,
        showSlaInExpand,
        showHandlers: true,
        variant: 'cr',
      })}
      main={buildMisCrOverview(
        overviewForCard,
        { extraTiles },
        (
          <>
            <MisTicketAttachmentsLikeComments attachments={ticketFiles} />
            {canEdit && showSubmitForm ? (
              <CrApproverApprovalForm
                form={form}
                approverStep={approverStep}
                onChange={onChange}
                onSubmit={onSubmit}
                submitting={submitting}
                submitError={submitError}
              />
            ) : isCompletedView && isCrCompletedItem(row) ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Workflow completed
              </div>
            ) : null}
          </>
        ),
      )}
    />
  );
}

function resolveApproverMappingEntityKey(entityKey, wrapMappingInEntityProfile) {
  if (wrapMappingInEntityProfile) return entityKey;
  const profile = getActiveDashboardProfile();
  if (profile?.label) return profile.label;
  return entityKey;
}

function mapApproverFetchResult(result, {
  entityKey,
  wrapMappingInEntityProfile,
  applyEntityKeyFilter,
  includeFirstLevelQueue,
  user,
}) {
  const mapRows = () => {
    const mappedService = filterEntityScopedRows(
      (result.serviceItems || []).map(mapReportRow),
      { kind: 'service' },
    );
    const mappedCrRaw = (result.crItems || []).map(mapChangeRequestRow);
    return {
      serviceRows: applyEntityKeyFilter
        ? filterRowsByEntityKey(mappedService, entityKey)
        : mappedService,
      crRows: filterCrApproverVisibleRows(
        applyEntityKeyFilter ? filterRowsByEntityKey(mappedCrRaw, entityKey) : mappedCrRaw,
        user,
        {
          includeFirstLevelQueue,
          liveInstanceIds: result.liveInstanceIds,
        },
      ),
    };
  };

  const profile = getActiveDashboardProfile();
  const mappingEntityKey = resolveApproverMappingEntityKey(entityKey, wrapMappingInEntityProfile);
  if ((wrapMappingInEntityProfile || profile?.id) && mappingEntityKey) {
    return withEntityDashboardProfile(mappingEntityKey, async () => mapRows());
  }
  return Promise.resolve(mapRows());
}

export default function ITCrApproverDashboard({
  role = 'first',
  defaultEntity = ITSM_DEFAULT_ENTITY,
  skipEntityFilter = false,
  entityOptions = ITSM_ENTITY_OPTIONS,
  enableHeaderEntitySelect = false,
  /** IT Head — service queue only (no Service / Change tab switch). */
  hideQueueSwitch = false,
  /** IT Head — Weekly / Monthly / FY period picker + Today snapshot cards. */
  adaptivePeriod = false,
  /** Show Due overlay on adaptive period (Refex). Extrovis hides Due. */
  showDue = false,
  /** Override chrome title (e.g. Admin Dashboard). */
  poolLabel = '',
  /** Role name shown under the greeting (IT Head, Admin, …). */
  headerRoleLabel = '',
  /** IT Head Refex — documented Admin Get All Items as the canonical dataset. */
  useAdminItemDataset = false,
  /** Hide New Service Request (Admin oversight). */
  hideCreateTicket = false,
  /** Admin — no Me / My Team; show every ticket in the report. */
  hideScopeSwitch = false,
  /** Common Refex — hide Me | My Team and keep only the signed-in user's tickets. */
  personalOnly = false,
  /** canShowServiceRecordEditIcon dashboard key — approver | admin. */
  editDashboard = 'approver',
  /** IT Head Refex only — Source counts under KPI row (easy to remove). */
  showSourceBreakdown = false,
  /** CEO — Assigned To filter in header toolbar (MIS options) beside Entity. */
  showHeaderPeopleFilters = false,
  /** Refex — Company_Name filter in header beside Entity. */
  showHeaderCompanyFilter = false,
  showHeaderRequesterFilter = true,
  headerAssignedFilterLabel = 'IT Agents',
  /** CEO — external Engagement Report link (header toolbar). */
  engagementReportUrl = '',
  engagementReportLabel = 'Engagement Report',
}) {
  const isMisModern = useIsMisModern();
  const showMisChrome = isMisModern;
  const meta = ROLE_META[role] || ROLE_META.first;
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);
  const user = kfInstance?.user;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [connected, setConnected] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeQueue, setActiveQueue] = useState('ServiceQueue');
  const [serviceRows, setServiceRows] = useState([]);
  const [crRows, setCrRows] = useState([]);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState(() => (
    isExtrovisServiceDashboardContext(defaultEntity) ? 'desc' : 'asc'
  ));
  const [serviceTab, setServiceTab] = useState(() => {
    if (hideScopeSwitch) return 'AllTickets';
    if (isExtrovisServiceDashboardContext()) return 'OpenTickets';
    if (isRefexServiceDashboardContext(defaultEntity)) return 'PendingTask';
    return 'AgentPending';
  });
  const [activeTab, setActiveTab] = useState(meta.defaultTab);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [dialogRowId, setDialogRowId] = useState(null);
  const [reassignRowId, setReassignRowId] = useState(null);
  const [fromMyTasksApi, setFromMyTasksApi] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [rowForms, setRowForms] = useState({});
  const [submitErrors, setSubmitErrors] = useState({});
  const [serverPage, setServerPage] = useState(1);
  const [hasMoreService, setHasMoreService] = useState(false);
  const [hasMoreCr, setHasMoreCr] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [entityTab, setEntityTab] = useState(defaultEntity);
  const [scope, setScope] = useState('me');
  const datasetGenRef = useRef(0);
  const lastLoadedKeyRef = useRef('');
  const entityTabRef = useRef(entityTab);
  entityTabRef.current = entityTab;
  const [datasetReady, setDatasetReady] = useState(false);
  const [teamDatasetLoading, setTeamDatasetLoading] = useState(false);
  const [liveCrInstanceIds, setLiveCrInstanceIds] = useState(() => new Set());
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const userProfile = useMemo(() => resolveKfUserProfile(user), [user]);
  const classicPeriod = useITDashboardPeriodFilter({
    enabled: !adaptivePeriod,
    options: APPROVER_PERIOD_OPTIONS,
    defaultKey: 'fy',
  });
  const adaptivePeriodHook = useApproverAdaptivePeriodFilter({
    enabled: adaptivePeriod,
    showDue: showDue && !isExtrovisServiceDashboardContext(),
  });
  const { applyPeriod, periodFilterEl, periodKey, periodRange, dueOnly = false } = adaptivePeriod
    ? adaptivePeriodHook
    : classicPeriod;
  const createSrHandler = useCallback(
    () => openITCreateTicketPage(kfInstance),
    [kfInstance],
  );

  const isServiceQueue = activeQueue === 'ServiceQueue';
  const isFinalRole = role === 'final';
  // Show entity dropdown when enabled; Extrovis process still skips client entity wipe
  // for the Extrovis option (process is Extrovis-only). Empty tabs stay empty for Modepro/etc.
  const useEntityDropdown = (isFinalRole && !skipEntityFilter) || enableHeaderEntitySelect
    || getActiveDashboardProfile()?.id === 'extrovis';

  // Multi-entity Head: sync Kissflow report profile to the selected entity (Refex ↔ Extrovis).
  if (useEntityDropdown) {
    const nextProfile = resolveEntityProfile(entityTab);
    if (nextProfile) setITDashboardProfile(nextProfile);
  }
  useLayoutEffect(() => {
    if (!useEntityDropdown) return undefined;
    const nextProfile = resolveEntityProfile(entityTab);
    if (nextProfile) setITDashboardProfile(nextProfile);
    return undefined;
  }, [entityTab, useEntityDropdown]);

  const isRefexService = isRefexServiceDashboardContext(entityTab);
  // Profile-locked Extrovis First/Final keep Extrovis chrome for empty Modepro/Kavis tabs.
  const profileLockedExtrovis = getActiveDashboardProfile()?.id === 'extrovis';
  const isExtrovisService = isExtrovisServiceDashboardContext(entityTab)
    || (profileLockedExtrovis && !isRefexService);
  // Keep the same Refex/Extrovis MIS chrome (KPI cards, tabs, table, filters) for every
  // entity option — including empty Kavis / Modepro / Pharma Pack selections.
  const chromeEntityKey = resolveModernMisChromeEntityKey(entityTab);
  const modernMisChrome = showMisChrome && (
    usesModernMisChrome(entityTab)
    || useEntityDropdown
    || hideQueueSwitch
    || skipEntityFilter
  );
  const refexWorkflow = Boolean(modernMisChrome || isRefexService || isExtrovisService);
  const showCreateSrAction = (isRefexService || isExtrovisService) && !hideCreateTicket;
  const showScopeSwitch = Boolean(skipEntityFilter || refexWorkflow) && !hideScopeSwitch && !personalOnly;
  /** Admin oversight — ignore Me/Team and treat every tab as the full report. */
  const monitoringScope = hideScopeSwitch ? 'all' : (personalOnly ? 'me' : scope);
  const approverEmail = String(user?.Email || user?.email || '').trim();
  const canReassignServiceRow = (row) => canAdminKeyedReassign({
    email: approverEmail,
    scope: monitoringScope,
    row,
    isExtrovis: isExtrovisService,
    isRefex: isRefexService,
    tabKey: serviceTab,
    role,
    headerRoleLabel,
  });
  const showServiceReassignColumn = isServiceQueue && (
    (isExtrovisService && monitoringScope === 'team' && serviceTab !== 'Closed')
    || (isRefexService && (serviceTab === 'OpenTickets' || serviceTab === 'PendingTask')
      && /it head|it manager/i.test(String(headerRoleLabel || '')))
  );

  // Hover "+" menu — Service / Change create options (Extrovis approver dashboards).
  const createMenuOptions = useMemo(() => (
    isExtrovisService
      ? [
        { key: 'service', label: 'Service & Incident', onClick: () => openITCreateTicketPage(kfInstance) },
        { key: 'change', label: 'Change Request', onClick: () => openITAgentCreateChangeRequestPage(kfInstance) },
      ]
      : null
  ), [kfInstance, isExtrovisService]);

  useEffect(() => {
    // Service-only surfaces: Refex Manager (no CR) and Head/Admin (hideQueueSwitch).
    // Do NOT use modernMisChrome — Extrovis First/Final need a working Change Request tab.
    if ((isRefexService || hideQueueSwitch) && activeQueue !== 'ServiceQueue') {
      setActiveQueue('ServiceQueue');
    }
  }, [isRefexService, hideQueueSwitch, activeQueue]);

  const crTabs = useMemo(
    () => (isFinalRole ? getFinalLevelApproverTabs(entityTab) : meta.tabs),
    [isFinalRole, entityTab, meta.tabs],
  );
  const approverServiceTabs = useMemo(
    () => getApproverServiceTabs(chromeEntityKey || entityTab),
    [chromeEntityKey, entityTab],
  );
  const visibleApproverServiceTabs = useMemo(() => {
    if (!showScopeSwitch || !refexWorkflow) return approverServiceTabs;
    // Active Tickets merged into Open Tickets — hide Active everywhere on Manager/Head.
    let tabs = approverServiceTabs.filter((tab) => tab.key !== 'Active');
    if (scope === 'me') {
      // Extrovis Me: My Tickets = owned Solution/Dependency work (no Pending Approval).
      // Refex Me: Pending Approval is personal — hide AssignedToMe.
      return isExtrovisService
        ? tabs
        : tabs.filter((tab) => tab.key !== 'AssignedToMe');
    }
    if (scope === 'team') {
      return tabs.filter((tab) => tab.key !== 'AssignedToMe');
    }
    return tabs;
  }, [approverServiceTabs, showScopeSwitch, refexWorkflow, scope, isExtrovisService]);
  const showEntityFilter = useEntityDropdown;
  // Extrovis First Level Me — hide header Entity. My Team keeps it. Me matchers unchanged.
  const showEntitySelectUi = showEntityFilter
    && !(isExtrovisService && !isFinalRole && showScopeSwitch && scope === 'me');
  // Extrovis All + named entities share one process report. Kissflow $entity
  // on All_tickets returns empty, so named tabs client-filter only.
  const useServerEntityFilter = false;
  const applyEntityKeyFilter = false;
  const applyDisplayEntityFilter = useEntityDropdown && (
    isExtrovisReportEntity(entityTab) || isRefexServiceDashboardContext(entityTab)
  );
  const processDatasetKey = resolveEntityProcessDatasetKey(entityTab);
  const reportFilters = useMemo(() => (
    useServerEntityFilter ? { entity: entityTab } : {}
  ), [useServerEntityFilter, entityTab]);
  const wrapMappingInEntityProfile = useEntityDropdown;
  const activeSubTab = isServiceQueue ? serviceTab : activeTab;

  // Full report rebuild for My Team only — CEO/Admin entity switches use loadDashboard cache-first.
  useEffect(() => {
    if (!refexWorkflow || !kfInstance?.api) return;
    if (hideScopeSwitch) return;
    if (!showScopeSwitch || scope !== 'team') return;
    let cancelled = false;
    const gen = ++datasetGenRef.current;
    (async () => {
      setTeamDatasetLoading(true);
      try {
        clearRequestIdReportCache();
        const rows = await withEntityDashboardProfile(entityTab, () => (
          ensureRefexMappedDataset('monitoring', kfInstance, user, {
            forceRefresh: false,
            softRefresh: true,
            reportFilters,
            weeklyRefreshScope: 'oversight',
            keepCachedReport: true,
          })
        ));
        if (cancelled || gen !== datasetGenRef.current) return;
        let scoped = rows;
        if (applyEntityKeyFilter) scoped = filterRowsByEntityKey(rows, entityTab);
        setServiceRows(scoped);
        setDatasetReady(true);
        setLastUpdatedAt(new Date());
      } catch (err) {
        console.warn('Full oversight dataset ensure failed:', err?.message || err);
      } finally {
        if (!cancelled) setTeamDatasetLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scope, refexWorkflow, showScopeSwitch, hideScopeSwitch, kfInstance, user, processDatasetKey, applyEntityKeyFilter, isExtrovisService, reportFilters]);

  const entityScopedServiceRows = useMemo(() => {
    if (!showEntityFilter) return serviceRows;
    if (applyDisplayEntityFilter) return filterRowsByEntityKey(serviceRows, entityTab);
    return serviceRows;
  }, [serviceRows, entityTab, showEntityFilter, applyDisplayEntityFilter]);

  const entityScopedCrRows = useMemo(() => {
    if (hideQueueSwitch) return [];
    if (!showEntityFilter) return crRows;
    if (applyDisplayEntityFilter) return filterRowsByEntityKey(crRows, entityTab);
    return crRows;
  }, [crRows, entityTab, showEntityFilter, hideQueueSwitch, applyDisplayEntityFilter]);

  const approverRoleKey = isFinalRole ? 'final' : 'first';
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const filterServiceRowsByScope = useCallback((rows) => {
    const meRole = approverRoleKey === 'final' ? 'final' : 'first';
    if (personalOnly) {
      return (rows || []).filter((row) => matchesCommonPersonalScope(row, user, { role: meRole }));
    }
    if (hideScopeSwitch || !showScopeSwitch) return rows || [];
    if (scope === 'me') {
      // Me = their bucket + their closed/open tickets only.
      return (rows || []).filter((row) => matchesRefexMeOnlyScope(row, user, { role: meRole }));
    }
    if (!user) return rows || [];
    // My Team — full queue, including the signed-in user's tickets.
    return rows || [];
  }, [hideScopeSwitch, showScopeSwitch, personalOnly, scope, user, approverRoleKey]);

  // Period filter — for the *current* week/month/FY only, keep live Open / Pending
  // outside the date range so those KPIs never go empty. Past FY / month / week
  // must stay strict (no live re-inject) — otherwise FY 25–26 shows today's tickets.
  const scopedServiceRows = useMemo(() => {
    const periodRows = applyPeriod(entityScopedServiceRows);
    if (!adaptivePeriod || !refexWorkflow || dueOnly) return periodRows;
    if (!dashboardDateRangeIncludesToday(periodRange)) return periodRows;
    const kept = new Set(periodRows.map((row) => row.id).filter(Boolean));
    const meRole = approverRoleKey === 'final' ? 'final' : 'first';
    const livePending = (entityScopedServiceRows || []).filter((row) => {
      if (!row?.id || kept.has(row.id)) return false;
      if (!hideScopeSwitch && scope === 'me') {
        if (matchesRefexApproverPendingTaskRow(row, user, 'me', approverRoleKey)) return true;
        if (matchesRefexMonitoringServiceTab(row, 'OpenTickets', user, 'me', approverRoleKey)) return true;
        if (matchesRefexMeOnlyScope(row, user, { role: meRole })) return true;
        return false;
      }
      // Admin / Team — live pending / open / today-created (not Closed/reopen outside FY).
      if (
        isDashboardRowCreatedToday(row)
        && !isRefexServiceClosedTicket(row)
        && !isRefexServiceProcessCompleted(row)
        && !isITTechReopenStep(row)
        && !isEmployeeApprovalRefexStep(row)
      ) return true;
      if (
        matchesRefexApproverPendingTaskRow(row, user, hideScopeSwitch ? 'all' : 'team', approverRoleKey)
        || matchesRefexMonitoringServiceTab(row, 'OpenTickets', user, hideScopeSwitch ? 'all' : 'team', approverRoleKey)
      ) return true;
      return isRefexServiceOpenTicket(row) && getDashboardRowDateMs(row) == null;
    });
    return livePending.length ? [...periodRows, ...livePending] : periodRows;
  }, [
    applyPeriod,
    adaptivePeriod,
    dueOnly,
    refexWorkflow,
    periodRange,
    entityScopedServiceRows,
    user,
    scope,
    hideScopeSwitch,
    approverRoleKey,
  ]);
  const scopedCrRows = useMemo(
    () => applyPeriod(entityScopedCrRows),
    [applyPeriod, entityScopedCrRows],
  );

  const effectiveServiceRows = useMemo(
    () => filterServiceRowsByScope(scopedServiceRows),
    [filterServiceRowsByScope, scopedServiceRows],
  );

  // Today snapshot — Me/Team scope without Weekly/Monthly/FY period filter.
  const todayScopeServiceRows = useMemo(
    () => filterServiceRowsByScope(entityScopedServiceRows),
    [filterServiceRowsByScope, entityScopedServiceRows],
  );

  const loadDashboard = useCallback(async ({ silent = false, background = false, force = false, isStale = null } = {}) => {
    if (kfInstance && !kfInstance?.api && !sdkReady) return { didLoad: false };
    if (!sdkReady && !lastLoadedKeyRef.current) {
      return { didLoad: false };
    }

    const entityTabNow = entityTabRef.current;

    const loadKey = `${user?._id || user?.Id || ''}|${user?.Email || ''}|${processDatasetKey}|${role}`;
    // Hard refresh = explicit force OR entity/role switch.
    // Soft refresh = Refresh button / silent / background — must NOT wipe cache or full-walk.
    const hardRefresh = Boolean(force) || (
      Boolean(lastLoadedKeyRef.current) && lastLoadedKeyRef.current !== loadKey
    );
    const softRefresh = Boolean(silent || background) && !hardRefresh;
    const entityOrRoleChanged = Boolean(lastLoadedKeyRef.current)
      && lastLoadedKeyRef.current !== loadKey;

    if (!hardRefresh && !softRefresh && lastLoadedKeyRef.current === loadKey) {
      if (!isStale?.()) {
        setLoading(false);
        setRefreshing(false);
        setDatasetReady(true);
      }
      return { didLoad: true };
    }

    const cachedMonitoring = (!softRefresh && kfInstance?.api && !force)
      ? getCachedRefexMappedRows('monitoring', kfInstance, user, reportFilters)
      : null;

    if (!silent && !background) {
      const oversightEntitySwitch = hideScopeSwitch && entityOrRoleChanged && !force;
      const oversightColdStart = hideScopeSwitch && !cachedMonitoring?.length && !entityOrRoleChanged && !force;
      if (!oversightEntitySwitch && !oversightColdStart) setLoading(true);
      setServerPage(1);
      // Keep prior rows visible when cache exists — avoids blank splash on reload.
      if (!cachedMonitoring?.length) {
        if (!hideScopeSwitch || !entityOrRoleChanged) {
          setServiceRows([]);
          setCrRows([]);
        }
      }
      if (!cachedMonitoring?.length) {
        setDatasetReady(false);
      }
    } else if (!background) {
      setRefreshing(true);
      setServerPage(1);
    }
    setLoadError('');

    try {
      if (kfInstance?.api) {
        const isRefexLoad = isRefexServiceDashboardContext(entityTabNow);
        const isExtrovisLoad = isExtrovisServiceDashboardContext(entityTabNow)
          || isExtrovisReportEntity(entityTabNow);

        if (isRefexLoad || isExtrovisLoad) {
          setConnected(true);
          setFromMyTasksApi(true);
          setHasMoreService(false);
          setUserName(kfInstance?.user?.Name || '');

          const gen = ++datasetGenRef.current;
          const runUnderEntity = (fn) => withEntityDashboardProfile(entityTabNow, fn);

          // Me soft refresh is unchanged. My Team, Admin, and Group CEO merge the
          // cached report with a delta. The full walk is at most once every 7 days.
          const refreshSkipsFullWalk = hideScopeSwitch
            || showHeaderPeopleFilters
            || scopeRef.current === 'team';
          if (softRefresh && !refreshSkipsFullWalk) {
            try {
              const rows = await runUnderEntity(() => (
                ensureRefexMappedDataset('monitoring', kfInstance, user, {
                  forceRefresh: false,
                  softRefresh: true,
                  reportFilters,
                  oversightMode: hideScopeSwitch,
                })
              ));
              if (isStale?.() || gen !== datasetGenRef.current) return;
              if (Array.isArray(rows) && rows.length) {
                const scoped = applyEntityKeyFilter
                  ? filterRowsByEntityKey(rows, entityTabNow)
                  : rows;
                if (scoped.length) {
                  setServiceRows((prev) => (
                    scoped.length >= (prev?.length || 0)
                      ? scoped
                      : mergeDashboardRowsById(prev, scoped)
                  ));
                }
              }
              setDatasetReady(true);
              setLastUpdatedAt(new Date());
            } catch (softErr) {
              console.warn('Soft refresh failed:', softErr?.message || softErr);
            }
            if (!isStale?.()) {
              setLoading(false);
              setRefreshing(false);
              lastLoadedKeyRef.current = loadKey;
            }
            return { didLoad: true };
          }

          // My Team / Admin / Group CEO Refresh — keep the rows on screen and merge
          // the report delta. Does not clear the Me cache or change Me matchers.
          if ((softRefresh || force) && refreshSkipsFullWalk) {
            // Drop the 15s pending cache so this click reads new and modified
            // tickets. The saved report stays and the delta is merged into it.
            clearRefexPendingTaskCaches();
            try {
              const rows = await runUnderEntity(() => (
                ensureRefexMappedDataset('monitoring', kfInstance, user, {
                  forceRefresh: false,
                  softRefresh: true,
                  reportFilters,
                  oversightMode: hideScopeSwitch,
                  weeklyRefreshScope: 'oversight',
                  keepCachedReport: true,
                })
              ));
              if (isStale?.() || gen !== datasetGenRef.current) return { didLoad: true };
              if (Array.isArray(rows) && rows.length) {
                const scoped = applyEntityKeyFilter
                  ? filterRowsByEntityKey(rows, entityTabNow)
                  : rows;
                if (scoped.length) {
                  setServiceRows((prev) => mergeDashboardRowsById(prev, scoped));
                }
              }
              setDatasetReady(true);
              setLastUpdatedAt(new Date());
            } catch (deltaErr) {
              console.warn('Oversight delta refresh failed:', deltaErr?.message || deltaErr);
              setLoadError(deltaErr?.message || 'Refresh failed');
            }
            if (isExtrovisLoad && !hideQueueSwitch) {
              withEntityDashboardProfile(entityTabNow, () => (
                fetchITApproverDashboardData(kfInstance, 1, IT_DASHBOARD_SERVER_PAGE_SIZE, { skipServiceFetch: true })
              ))
                .then(async (crResult) => {
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  const { crRows: nextCrRows } = await mapApproverFetchResult(crResult, {
                    entityKey: entityTabNow,
                    wrapMappingInEntityProfile,
                    applyEntityKeyFilter,
                    includeFirstLevelQueue: meta.includeFirstLevelQueue,
                    user,
                  });
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  setLiveCrInstanceIds(crResult.liveInstanceIds || new Set());
                  setCrRows(nextCrRows);
                  setHasMoreCr(crResult.hasMoreCr ?? false);
                })
                .catch((crErr) => {
                  console.warn('Extrovis change request fetch failed:', crErr?.message || crErr);
                });
            }
            if (!isStale?.()) {
              setLoading(false);
              setRefreshing(false);
              lastLoadedKeyRef.current = loadKey;
            }
            return { didLoad: true };
          }

          // Me Refresh — full rebuild. My Team / Admin / Group CEO already returned above.
          if (force) {
            invalidateRefexMappedDataset('monitoring', kfInstance, user, {
              clearPersistent: true,
              reportFilters,
            });
            try {
              const rows = await runUnderEntity(() => (
                ensureRefexMappedDataset('monitoring', kfInstance, user, {
                  forceRefresh: true,
                  softRefresh: false,
                  reportFilters,
                  oversightMode: hideScopeSwitch,
                })
              ));
              if (isStale?.() || gen !== datasetGenRef.current) return { didLoad: true };
              const scoped = applyEntityKeyFilter
                ? filterRowsByEntityKey(rows || [], entityTabNow)
                : (rows || []);
              if (scoped.length) {
                setServiceRows((prev) => (
                  scoped.length >= (prev?.length || 0)
                    ? scoped
                    : mergeDashboardRowsById(prev, scoped)
                ));
              }
              setDatasetReady(true);
              setLastUpdatedAt(new Date());
            } catch (forceErr) {
              console.warn('Force refresh failed:', forceErr?.message || forceErr);
              setLoadError(forceErr?.message || 'Refresh failed');
            }
            // Extrovis CR queue still refreshes on force (service path returned above).
            if (isExtrovisLoad && !hideQueueSwitch) {
              withEntityDashboardProfile(entityTabNow, () => (
                fetchITApproverDashboardData(kfInstance, 1, IT_DASHBOARD_SERVER_PAGE_SIZE, { skipServiceFetch: true })
              ))
                .then(async (crResult) => {
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  const { crRows: nextCrRows } = await mapApproverFetchResult(crResult, {
                    entityKey: entityTabNow,
                    wrapMappingInEntityProfile,
                    applyEntityKeyFilter,
                    includeFirstLevelQueue: meta.includeFirstLevelQueue,
                    user,
                  });
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  setLiveCrInstanceIds(crResult.liveInstanceIds || new Set());
                  setCrRows(nextCrRows);
                  setHasMoreCr(crResult.hasMoreCr ?? false);
                })
                .catch((crErr) => {
                  console.warn('Extrovis change request fetch failed:', crErr?.message || crErr);
                });
            }
            if (!isStale?.()) {
              setLoading(false);
              setRefreshing(false);
              lastLoadedKeyRef.current = loadKey;
            }
            return { didLoad: true };
          }

          // Hard entity switch — only explicit Refresh clears memory cache (keep IndexedDB).
          if (force && hardRefresh && entityOrRoleChanged) {
            invalidateRefexMappedDataset('monitoring', kfInstance, user, {
              clearPersistent: true,
              reportFilters,
            });
          }

          // Change Request queue — defer on Extrovis so Me landing is not blocked.
          if (isExtrovisLoad && !hideQueueSwitch) {
            const loadCr = () => {
              withEntityDashboardProfile(entityTabNow, () => (
                fetchITApproverDashboardData(kfInstance, 1, IT_DASHBOARD_SERVER_PAGE_SIZE, { skipServiceFetch: true })
              ))
                .then(async (crResult) => {
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  const { crRows: nextCrRows } = await mapApproverFetchResult(crResult, {
                    entityKey: entityTabNow,
                    wrapMappingInEntityProfile,
                    applyEntityKeyFilter,
                    includeFirstLevelQueue: meta.includeFirstLevelQueue,
                    user,
                  });
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  setLiveCrInstanceIds(crResult.liveInstanceIds || new Set());
                  setCrRows(nextCrRows);
                  setHasMoreCr(crResult.hasMoreCr ?? false);
                })
                .catch((crErr) => {
                  console.warn('Extrovis change request fetch failed:', crErr?.message || crErr);
                });
            };
            if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
              window.requestIdleCallback(loadCr, { timeout: 4000 });
            } else {
              setTimeout(loadCr, 2500);
            }
          } else {
            setHasMoreCr(false);
            setLiveCrInstanceIds(new Set());
            setCrRows([]);
          }

          {
            let painted = false;
            const cached = !force
              ? getCachedRefexMappedRows('monitoring', kfInstance, user, reportFilters)
              : null;

            if (cached?.length) {
              const scopedCached = applyEntityKeyFilter
                ? filterRowsByEntityKey(cached, entityTabNow)
                : cached;
              setServiceRows(scopedCached);
              setDatasetReady(true);
              if (!silent) setLoading(false);
              painted = true;
            }

            // Instant paint from IndexedDB (previous session) and/or fast oversight seed.
            // CEO/Admin cold start: parallel lightweight hydrate + pending pools (no full report block).
            if (!force && !painted) {
              try {
                if (hideScopeSwitch) {
                  const [hydrated, seedRows, adminRows] = await Promise.all([
                    runUnderEntity(() => (
                      hydrateRefexMonitoringFromPersistentCache(kfInstance, user, reportFilters, {
                        skipEnrich: true,
                        skipPendingFetch: true,
                      })
                    )).catch(() => null),
                    runUnderEntity(() => (
                      fetchRefexOversightLandingSeed(kfInstance, user, { reportFilters })
                    )).catch(() => []),
                    useAdminItemDataset
                      ? runUnderEntity(() => (
                        fetchRefexAdminCanonicalTickets(kfInstance, user, { oversight: true })
                      )).catch(() => [])
                      : Promise.resolve([]),
                  ]);
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  const landingRows = hydrated?.length
                    ? hydrated
                    : (adminRows?.length ? adminRows : seedRows);
                  if (landingRows?.length) {
                    const scopedLanding = applyEntityKeyFilter
                      ? filterRowsByEntityKey(landingRows, entityTabNow)
                      : landingRows;
                    setServiceRows(scopedLanding);
                    setDatasetReady(true);
                    if (!silent) setLoading(false);
                    painted = true;
                    if (!hydrated?.length) setRefreshing(true);
                  }
                } else {
                  const hydrated = await runUnderEntity(() => (
                    hydrateRefexMonitoringFromPersistentCache(kfInstance, user, reportFilters)
                  ));
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  if (hydrated?.length) {
                    const scopedHydrated = applyEntityKeyFilter
                      ? filterRowsByEntityKey(hydrated, entityTabNow)
                      : hydrated;
                    setServiceRows(scopedHydrated);
                    setDatasetReady(true);
                    if (!silent) setLoading(false);
                    painted = true;
                  }
                }
              } catch (hydrateErr) {
                console.warn('Persistent cache hydrate failed:', hydrateErr?.message || hydrateErr);
              }
            }

            // Me landing seed only when nothing cached yet (never on force Refresh).
            if (!force && !painted && !hideScopeSwitch) {
              try {
                const profileNow = getActiveDashboardProfile();
                const adminMeRoleId = isFinalRole
                  ? (profileNow?.itHeadAppRoleId || '')
                  : (profileNow?.itManagerAppRoleId || '');
                const useFastAdminMe = Boolean(useAdminItemDataset && adminMeRoleId);
                let seedRows = [];
                if (useFastAdminMe) {
                  try {
                    seedRows = await runUnderEntity(() => (
                      fetchRefexAdminCanonicalTickets(kfInstance, user, { roleId: adminMeRoleId })
                    ));
                    if (seedRows?.length) {
                      setCachedRefexMappedRows('monitoring', kfInstance, user, seedRows, reportFilters);
                    }
                  } catch (adminErr) {
                    console.warn('Admin Get All Items landing failed:', adminErr?.message || adminErr);
                    seedRows = await runUnderEntity(() => (
                      fetchRefexApproverMeLandingSeed(kfInstance, user, {
                        role: isFinalRole ? 'final' : 'first',
                        force: false,
                      })
                    ));
                  }
                } else {
                  seedRows = await runUnderEntity(() => (
                    fetchRefexApproverMeLandingSeed(kfInstance, user, {
                      role: isFinalRole ? 'final' : 'first',
                      force: false,
                    })
                  ));
                }
                if (isStale?.() || gen !== datasetGenRef.current) return;
                const scopedSeed = applyEntityKeyFilter
                  ? filterRowsByEntityKey(seedRows, entityTabNow)
                  : seedRows;
                setServiceRows(scopedSeed);
                setDatasetReady(true);
                if (!silent) setLoading(false);
                if (seedRows?.length) painted = true;
              } catch (seedErr) {
                console.warn('Approver Me landing seed failed:', seedErr?.message || seedErr);
                setDatasetReady(true);
                if (!silent) setLoading(false);
              }
            }

            // Background: delta if IndexedDB exists, else one full walk.
            // Extrovis All_tickets walks are heavy — give Me landing more headroom.
            const profileNow = getActiveDashboardProfile();
            const adminMeRoleId = hideScopeSwitch
              ? ''
              : (isFinalRole
                ? (profileNow?.itHeadAppRoleId || '')
                : (profileNow?.itManagerAppRoleId || ''));
            const useFastAdminItems = Boolean(useAdminItemDataset);
            const deferFullMs = painted
              ? 400
              : (hideScopeSwitch
                ? 600
                : (scopeRef.current === 'team'
                  ? 0
                  : (isExtrovisLoad ? 3500 : 2500)));
            scheduleRefexMappedDatasetLoad('monitoring', kfInstance, user, {
              forceRefresh: Boolean(force),
              delayMs: deferFullMs,
              onReady: (rows) => {
                if (isStale?.() || gen !== datasetGenRef.current) return;
                if (Array.isArray(rows) && rows.length) {
                  const scoped = applyEntityKeyFilter
                    ? filterRowsByEntityKey(rows, entityTabNow)
                    : rows;
                  if (scoped.length) {
                    setServiceRows((prev) => (
                      scoped.length >= (prev?.length || 0)
                        ? scoped
                        : mergeDashboardRowsById(prev, scoped)
                    ));
                  }
                }
                setDatasetReady(true);
                setLastUpdatedAt(new Date());
                setRefreshing(false);
              },
              loadFn: () => runUnderEntity(() => ensureRefexMappedDataset('monitoring', kfInstance, user, {
                forceRefresh: Boolean(force),
                softRefresh: (painted || (hideScopeSwitch && entityOrRoleChanged)) && !force,
                reportFilters,
                oversightMode: hideScopeSwitch,
                useAdminItemDataset: useFastAdminItems,
                adminDatasetRoleId: adminMeRoleId,
              })),
            });
            if (!isStale?.()) {
              if (painted) setLoading(false);
              lastLoadedKeyRef.current = loadKey;
            }
          }
        } else {
        const fetchFn = useEntityDropdown
          ? () => fetchITApproverDashboardDataForEntity(
            kfInstance,
            entityTabNow,
            1,
            IT_DASHBOARD_SERVER_PAGE_SIZE,
            {},
          )
          : () => fetchITApproverDashboardData(
            kfInstance,
            1,
            IT_DASHBOARD_SERVER_PAGE_SIZE,
            {},
          );
        const result = await fetchFn();
        if (isStale?.()) return;
        setConnected(true);
        setFromMyTasksApi(result.fromMyTasksApi);
        setHasMoreService(result.hasMoreService ?? false);
        setHasMoreCr(result.hasMoreCr ?? false);
        const { serviceRows: nextServiceRows, crRows: nextCrRows } = await mapApproverFetchResult(result, {
          entityKey: entityTabNow,
          wrapMappingInEntityProfile,
          applyEntityKeyFilter,
          includeFirstLevelQueue: meta.includeFirstLevelQueue,
          user,
        });
        if (isStale?.()) return;
        setLiveCrInstanceIds(result.liveInstanceIds || new Set());
        setServiceRows(nextServiceRows);
        setCrRows(nextCrRows);
        setUserName(kfInstance?.user?.Name || '');
        setDatasetReady(true);
        }
      } else {
        if (isStale?.()) return;
        setConnected(false);
        const previewUser = user || { Email: 'mohamedaasik.m@refex.co.in', _id: 'UsDYHFU4f3ES', Name: 'Mohamed Aasik Ilahi M' };
        setServiceRows(filterEntityScopedRows((MOCK_IT_MANAGER_TASKS.Data || []).map(mapReportRow), { kind: 'service' }));
        const mapped = (MOCK_IT_CHANGE_REQUEST.Data || []).map(mapChangeRequestRow);
        setCrRows(filterCrApproverVisibleRows(mapped, previewUser, {
          includeFirstLevelQueue: meta.includeFirstLevelQueue,
        }));
        setUserName(previewUser.Name || 'Approver');
        setDatasetReady(true);
      }
    } catch (e) {
      if (isStale?.()) return;
      setServiceRows([]);
      setCrRows([]);
      setLoadError(e?.message || 'Failed to load approver dashboard');
      setDatasetReady(true);
    } finally {
      if (isStale?.()) return;
      const oversightEntitySwitch = hideScopeSwitch && entityOrRoleChanged && !force;
      setLoading(false);
      if (!oversightEntitySwitch) setRefreshing(false);
      setLastUpdatedAt(new Date());
      // Never force-reset the active queue — Extrovis Change Request tab must stay selected.
      lastLoadedKeyRef.current = loadKey;
    }
    return { didLoad: true };
  }, [
    kfInstance,
    user,
    sdkReady,
    meta.includeFirstLevelQueue,
    processDatasetKey,
    useEntityDropdown,
    wrapMappingInEntityProfile,
    applyEntityKeyFilter,
    reportFilters,
    role,
    hideQueueSwitch,
    hideScopeSwitch,
    isFinalRole,
    useAdminItemDataset,
    showHeaderPeopleFilters,
  ]);

  const { requestRefresh } = useITDashboardSilentRefresh(kfInstance, loadDashboard, [sdkReady, processDatasetKey]);
  const onManualRefresh = useCallback(() => {
    const skipsFullWalk = hideScopeSwitch
      || showHeaderPeopleFilters
      || scopeRef.current === 'team';
    requestRefresh(skipsFullWalk ? {} : { force: true });
  }, [hideScopeSwitch, showHeaderPeopleFilters, requestRefresh]);
  const applyEditedRow = useCallback((row) => {
    if (!row?.id) return;
    setServiceRows((prev) => mergeDashboardRowsById(prev, [row]));
  }, []);
  const { getEditRecordCellProps } = useITEditRecordRefreshBindings(kfInstance, requestRefresh, applyEditedRow);

  const handleEntityChange = useCallback((nextEntity) => {
    const raw = String(nextEntity ?? '').trim();
    const next = (!raw || isExtrovisAllEntityTab(raw))
      && (getActiveDashboardProfile()?.id === 'extrovis' || isExtrovisServiceDashboardContext(entityTab))
      ? EXTROVIS_DASHBOARD_DEFAULT_ENTITY
      : raw;
    if (!next || next === entityTab) return;
    // Switch Kissflow process/profile immediately so the next fetch cannot
    // briefly hit Refex APIs while React state for entityTab is still updating.
    const nextProfile = resolveEntityProfile(next);
    if (nextProfile) setITDashboardProfile(nextProfile);

    // Refex ↔ Venwind share one cached report — client-filter only, no wipe/refetch.
    if (sharesEntityProcessDataset(entityTab, next)) {
      setEntityTab(next);
      return;
    }

    const nextReportFilters = {};
    const cached = kfInstance?.api
      ? getCachedRefexMappedRows('monitoring', kfInstance, user, nextReportFilters)
      : null;
    const scopedCached = cached?.length && useEntityDropdown && isExtrovisReportEntity(next)
      ? filterRowsByEntityKey(cached, next)
      : cached;

    if (hideScopeSwitch) {
      if (scopedCached?.length) {
        setServiceRows(scopedCached);
        setDatasetReady(true);
      }
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
      setDatasetReady(false);
      setServiceRows([]);
      setCrRows([]);
    }
    setEntityTab(next);
  }, [entityTab, kfInstance, user, hideScopeSwitch, useEntityDropdown]);

  useEffect(() => {
    setExpandedRowId(null);
    setDialogRowId(null);
    setSearch('');
  }, [activeQueue, activeTab, serviceTab, entityTab, role]);

  const matchServiceQueueTab = useCallback((row, tabKey) => (
    refexWorkflow
      ? matchesRefexMonitoringServiceTab(row, tabKey, user, monitoringScope, approverRoleKey)
      : matchesApproverServiceTab(row, tabKey)
  ), [refexWorkflow, user, monitoringScope, approverRoleKey]);

  const isTodaySnapshotTab = adaptivePeriod && (
    serviceTab === 'TodayOpen'
    || serviceTab === 'TodayClosed'
    || serviceTab === 'TodaySlaBreached'
  );

  // Me → Pending Approval (Refex) / Open Tickets (Extrovis PickUp pool).
  // My Team / Admin (no scope) → All Tickets. Preserve the active tab when still visible.
  useEffect(() => {
    if (!refexWorkflow || !isServiceQueue) return;
    if (!showScopeSwitch && !hideScopeSwitch) return;
    const preferMe = isExtrovisService ? 'OpenTickets' : 'PendingTask';
    const validKeys = visibleApproverServiceTabs.map((tab) => tab.key);
    setServiceTab((current) => {
      if (validKeys.includes(current)) return current;
      return resolveDefaultServiceStatusTab(visibleApproverServiceTabs, {
        prefer: hideScopeSwitch || scope !== 'me' ? 'AllTickets' : preferMe,
      });
    });
  }, [scope, showScopeSwitch, hideScopeSwitch, refexWorkflow, isServiceQueue, visibleApproverServiceTabs, isExtrovisService]);

      // Due → All Tickets so Due-only open+breached set is visible without other tab filters.
  useEffect(() => {
    if (!dueOnly || !refexWorkflow || !isServiceQueue) return;
    setServiceTab('AllTickets');
  }, [dueOnly, refexWorkflow, isServiceQueue]);

  const misFilterResetKey = hideScopeSwitch || showHeaderPeopleFilters
    ? `${activeQueue}-${entityTab}`
    : `${activeQueue}-${scope}`;
  const resolveTicketStatus = useCallback((row) => (
    isRefexService && isServiceQueue
      ? (getRefexReportStatusLabel(row) || getMisTicketStatus(row) || 'Open')
      : getMisTicketStatus(row)
  ), [isRefexService, isServiceQueue]);
  const resolveStage = useCallback((row) => (
    isRefexService && isServiceQueue ? getRefexReportStagesLabel(row) : null
  ), [isRefexService, isServiceQueue]);
  // MIS filters (incl. created date) apply to the whole scope so KPI cards update with the table.
  const misFilters = useMisTableFilters(effectiveServiceRows, misFilterResetKey, {
    categoryField: isServiceQueue ? 'category' : 'changeType',
    resolveTicketStatus: refexWorkflow && isServiceQueue ? resolveTicketStatus : null,
    resolveStage: isRefexService && isServiceQueue ? resolveStage : null,
  });

  const headerRequesterOptions = useMemo(
    () => [
      { value: '', label: 'All Requesters' },
      ...(misFilters.requesterOptions || []).map((name) => ({ value: name, label: name })),
    ],
    [misFilters.requesterOptions],
  );
  const headerAssignedToOptions = useMemo(
    () => [
      {
        value: '',
        label: headerAssignedFilterLabel.startsWith('All')
          ? headerAssignedFilterLabel
          : `All ${headerAssignedFilterLabel}`,
      },
      ...(misFilters.assignedToOptions || []).map((name) => ({ value: name, label: name })),
    ],
    [misFilters.assignedToOptions, headerAssignedFilterLabel],
  );
  const showCompanyHeaderFilter = isServiceQueue && !personalOnly;
  const headerCompanyOptions = useMemo(
    () => REFEX_COMPANY_NAME_OPTIONS.map((opt) => ({
      value: opt.key,
      label: opt.label,
    })),
    [],
  );

  const misScopedServiceRows = useMemo(() => {
    if (!isServiceQueue) return effectiveServiceRows;
    return applyMisColumnFilters(effectiveServiceRows, {
      ...misFilters.params,
      categoryField: 'category',
    });
  }, [isServiceQueue, effectiveServiceRows, misFilters.params]);

  // Today cards + Today-* table tabs ignore Weekly/Monthly/FY period.
  const todayMisScopedServiceRows = useMemo(() => {
    if (!adaptivePeriod || !isServiceQueue) return [];
    return applyMisColumnFilters(todayScopeServiceRows, {
      ...misFilters.params,
      categoryField: 'category',
    });
  }, [adaptivePeriod, isServiceQueue, todayScopeServiceRows, misFilters.params]);

  const todaySnapshotMetrics = useMemo(() => {
    if (!adaptivePeriod || !refexWorkflow || !isServiceQueue) return null;
    let todayOpen = 0;
    let todayClosed = 0;
    let todaySlaBreached = 0;
    todayMisScopedServiceRows.forEach((row) => {
      if (matchServiceQueueTab(row, 'TodayOpen')) todayOpen += 1;
      if (matchServiceQueueTab(row, 'TodayClosed')) todayClosed += 1;
      if (matchServiceQueueTab(row, 'TodaySlaBreached')) todaySlaBreached += 1;
    });
    return { todayOpen, todayClosed, todaySlaBreached };
  }, [
    adaptivePeriod,
    refexWorkflow,
    isServiceQueue,
    todayMisScopedServiceRows,
    matchServiceQueueTab,
  ]);

  const serviceRowsForActiveTab = isTodaySnapshotTab
    ? todayMisScopedServiceRows
    : misScopedServiceRows;

  const crKpis = useMemo(
    () => meta.computeKpis(scopedCrRows, user, liveCrInstanceIds),
    [scopedCrRows, user, meta, liveCrInstanceIds],
  );
  const serviceKpis = useMemo(
    () => computeApproverServiceKpisFromRows(misScopedServiceRows, { entityTab }),
    [misScopedServiceRows, entityTab],
  );
  const crSlaKpis = useMemo(() => computeSlaKpisFromRows(scopedCrRows), [scopedCrRows]);
  const serviceSlaKpis = useMemo(() => computeSlaKpisFromRows(misScopedServiceRows), [misScopedServiceRows]);

  const crTabCounts = useMemo(() => {
    const counts = {};
    crTabs.forEach((tab) => {
      counts[tab.key] = scopedCrRows.filter((r) => meta.matchesTab(r, tab.key, user, liveCrInstanceIds)).length;
    });
    return counts;
  }, [scopedCrRows, user, meta, liveCrInstanceIds, crTabs]);

  const serviceTabCounts = useMemo(() => {
    const counts = {};
    visibleApproverServiceTabs.forEach((tab) => {
      counts[tab.key] = misScopedServiceRows.filter((row) => matchServiceQueueTab(row, tab.key)).length;
    });
    return counts;
  }, [misScopedServiceRows, visibleApproverServiceTabs, matchServiceQueueTab]);

  const queuePendingCounts = useMemo(() => {
    const counts = computeUserQueuePendingCounts({
      kind: isFinalRole ? 'approver-final' : 'approver-first',
      serviceRows: misScopedServiceRows,
      crRows: scopedCrRows,
      user,
      liveCrInstanceIds,
    });
    return { ...counts, ServiceQueue: null };
  }, [isFinalRole, misScopedServiceRows, scopedCrRows, user, liveCrInstanceIds]);

  const refexMonitoringMetrics = useMemo(() => {
    if (!refexWorkflow || !isServiceQueue) return null;
    const uniqueIds = new Set(misScopedServiceRows.map((row) => row.id).filter(Boolean));
    const slaSplit = countServiceSlaKpiSplit(misScopedServiceRows, matchServiceQueueTab);
    return {
      totalTickets: uniqueIds.size,
      activeTickets: serviceTabCounts.Active ?? 0,
      closedTickets: serviceTabCounts.Closed ?? 0,
      slaBreached: slaSplit.slaBreached,
      slaBreachedOpen: slaSplit.slaBreachedOpen,
      slaBreachedClosed: slaSplit.slaBreachedClosed,
      reopened: serviceTabCounts.Reopened ?? 0,
      criticalHighCount: countCriticalHighPriorityRows(misScopedServiceRows),
    };
  }, [refexWorkflow, isServiceQueue, misScopedServiceRows, serviceTabCounts, matchServiceQueueTab]);

  const refexCenterMetrics = useMemo(() => {
    if (!isServiceQueue) {
      if (!isExtrovisService) return null;
      // Change Request queue — same clickable KPI card pattern as the service queue.
      return {
        role: 'crQueue',
        crCards: crTabs.map((tab) => ({
          label: tab.label,
          filterKey: tab.key,
          value: crTabCounts[tab.key] ?? 0,
        })),
      };
    }
    if (!refexWorkflow) return null;
    // Extrovis: no Pending Approval — same KPI set as tech support (Open / My / Closed / SLA / Reopened).
    if (isExtrovisService) {
      return {
        role: 'techSupport',
        scope,
        totalTickets: refexMonitoringMetrics?.totalTickets ?? 0,
        openTickets: serviceTabCounts.OpenTickets ?? 0,
        myTasks: serviceTabCounts.AssignedToMe ?? 0,
        closedTickets: refexMonitoringMetrics?.closedTickets ?? 0,
        slaBreached: refexMonitoringMetrics?.slaBreached ?? 0,
        slaBreachedOpen: refexMonitoringMetrics?.slaBreachedOpen ?? 0,
        slaBreachedClosed: refexMonitoringMetrics?.slaBreachedClosed ?? 0,
        reopened: refexMonitoringMetrics?.reopened ?? 0,
      };
    }
    return {
      role: 'monitoring',
      scope,
      totalTickets: refexMonitoringMetrics?.totalTickets ?? 0,
      openTickets: refexWorkflow ? (serviceTabCounts.OpenTickets ?? 0) : null,
      pendingTasks: serviceTabCounts.PendingTask ?? 0,
      myTasks: serviceTabCounts.PendingTask ?? serviceTabCounts.AssignedToMe ?? 0,
      activeTickets: 0,
      closedTickets: refexMonitoringMetrics?.closedTickets ?? 0,
      rejectedTickets: serviceTabCounts.Rejected ?? 0,
      slaBreached: refexMonitoringMetrics?.slaBreached ?? 0,
      slaBreachedOpen: refexMonitoringMetrics?.slaBreachedOpen ?? 0,
      slaBreachedClosed: refexMonitoringMetrics?.slaBreachedClosed ?? 0,
      reopened: refexMonitoringMetrics?.reopened ?? 0,
    };
  }, [refexWorkflow, isExtrovisService, isServiceQueue, scope, refexMonitoringMetrics, serviceTabCounts, crTabs, crTabCounts]);

  // Same dual-panel Source UI as newceo / NE. Ignore Source column so all 4 channels stay visible.
  const sourceBreakdownCounts = useMemo(() => {
    if (!showSourceBreakdown || !isServiceQueue || !refexWorkflow) return null;
    const paramsNoSource = {
      ...misFilters.params,
      source: '',
      categoryField: 'category',
    };
    const pool = applyMisColumnFilters(effectiveServiceRows, paramsNoSource).map((row) => {
      const ticketStatus = String(row?.ticketStatus || '').toLowerCase();
      return {
        source: getMisSourceLabel(row),
        status: ticketStatus === 'closed' || ticketStatus === 'rejected' ? ticketStatus : 'open',
        created_at: row?.requestedDateTimeRaw || row?.createdAtRaw || row?.created_at,
        closed_at: row?.closedOn || row?.closedAtRaw || row?.closed_at,
      };
    });
    return countItsmSourcePanels(pool);
  }, [
    showSourceBreakdown,
    isServiceQueue,
    refexWorkflow,
    misFilters.params,
    effectiveServiceRows,
  ]);

  const handleServiceTabChange = useCallback((key) => {
    setServiceTab(key);
  }, []);

  const scopedRowsForInsight = isServiceQueue ? misScopedServiceRows : scopedCrRows;
  const insightMetrics = useMemo(() => {
    return {
      totalInScope: scopedRowsForInsight.length,
      activePipeline: isServiceQueue
        ? (serviceTabCounts.OpenTickets ?? 0)
        : crTabs
          .filter((tab) => tab.key !== 'Completed')
          .reduce((sum, tab) => sum + (crTabCounts[tab.key] ?? 0), 0),
      criticalHighCount: countCriticalHighPriorityRows(scopedRowsForInsight),
    };
  }, [isServiceQueue, scopedRowsForInsight, serviceTabCounts, crTabCounts, crTabs]);

  const tabScopedRows = useMemo(() => (
    isServiceQueue
      ? serviceRowsForActiveTab.filter((row) => matchServiceQueueTab(row, serviceTab))
      : scopedCrRows.filter((row) => meta.matchesTab(row, activeTab, user, liveCrInstanceIds))
  ), [isServiceQueue, serviceRowsForActiveTab, scopedCrRows, serviceTab, activeTab, user, meta, liveCrInstanceIds, matchServiceQueueTab]);

  const filteredTasks = useMemo(() => {
    const crScope = showScopeSwitch && scope === 'me' ? 'me' : 'team';
    const serviceScope = hideScopeSwitch
      ? 'all'
      : (personalOnly ? 'me' : (showScopeSwitch && refexWorkflow ? scope : 'team'));
    if (isServiceQueue) {
      return applyApproverServiceFilters(serviceRowsForActiveTab, {
        search,
        statusTab: serviceTab,
        user,
        scope: serviceScope,
        sortOrder,
        role: approverRoleKey,
        entityTab: chromeEntityKey || entityTab,
        useMonitoringMatcher: refexWorkflow,
      });
    }
    return applyMisColumnFilters(
      meta.applyFilters(scopedCrRows, {
        search,
        statusTab: activeTab,
        user,
        liveInstanceIds: liveCrInstanceIds,
        scope: crScope,
      }),
      { ...misFilters.params, categoryField: 'changeType' },
    );
  }, [
    showScopeSwitch,
    hideScopeSwitch,
    personalOnly,
    scope,
    refexWorkflow,
    isServiceQueue,
    serviceRowsForActiveTab,
    scopedCrRows,
    search,
    serviceTab,
    activeTab,
    user,
    meta,
    liveCrInstanceIds,
    misFilters.params,
    sortOrder,
    approverRoleKey,
    chromeEntityKey,
    entityTab,
  ]);

  const {
    page, setPage, totalPages, totalItems, pagedItems, rangeStart, rangeEnd,
  } = useITListPagination(filteredTasks, [
    activeQueue,
    activeSubTab,
    search,
    role,
    periodKey,
    misFilters.category,
    misFilters.criticality,
    misFilters.entity,
    misFilters.ticketType,
    misFilters.assignedTo,
    misFilters.requester,
    misFilters.createdDateFrom,
    misFilters.createdDateTo,
    misFilters.closedDateFrom,
    misFilters.closedDateTo,
    misFilters.sla,
    misFilters.source,
  ]);

  const hasMoreOnServer = isServiceQueue ? hasMoreService : hasMoreCr;
  const loadedQueueTotal = isServiceQueue ? effectiveServiceRows.length : scopedCrRows.length;

  const loadMore = useCallback(async () => {
    if (!kfInstance?.api || loadingMore || !hasMoreOnServer) return;
    if (isRefexServiceDashboardContext(entityTab)) return;
    setLoadingMore(true);
    try {
      const nextPage = serverPage + 1;
      // Extrovis service rows come from the shared dataset — page CR only.
      const fetchOptions = isExtrovisService ? { skipServiceFetch: true } : {};
      const fetchFn = useEntityDropdown
        ? () => fetchITApproverDashboardDataForEntity(kfInstance, entityTab, nextPage, IT_DASHBOARD_SERVER_PAGE_SIZE, fetchOptions)
        : () => fetchITApproverDashboardData(kfInstance, nextPage, IT_DASHBOARD_SERVER_PAGE_SIZE, fetchOptions);
      const result = await fetchFn();
      const { serviceRows: nextServiceRows, crRows: nextCrRows } = await mapApproverFetchResult(result, {
        entityKey: entityTab,
        wrapMappingInEntityProfile,
        applyEntityKeyFilter,
        includeFirstLevelQueue: meta.includeFirstLevelQueue,
        user,
      });
      if (!isExtrovisService) {
        setServiceRows((prev) => mergeDashboardRowsById(prev, nextServiceRows));
        setHasMoreService(result.hasMoreService ?? false);
      }
      setLiveCrInstanceIds((prev) => new Set([...prev, ...(result.liveInstanceIds || [])]));
      setCrRows((prev) => mergeDashboardRowsById(prev, nextCrRows));
      setServerPage(nextPage);
      setHasMoreCr(result.hasMoreCr ?? false);
    } catch (e) {
      setLoadError(e?.message || 'Failed to load more records');
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMoreOnServer,
    kfInstance,
    loadingMore,
    meta.includeFirstLevelQueue,
    serverPage,
    user,
    entityTab,
    useEntityDropdown,
    wrapMappingInEntityProfile,
    applyEntityKeyFilter,
    isExtrovisService,
  ]);

  const showSlaInExpand = isServiceQueue
    ? serviceTab === 'Resolved' || serviceTab === 'Cancelled'
    : activeTab === 'Completed';

  const tableColumns = useMemo(() => {
    if (isServiceQueue) {
      const cols = refexWorkflow
        ? getRefexServiceQueueMisColumns(serviceTab, {
          role: 'monitoring',
          includeAction: showServiceReassignColumn,
        })
        : getApproverServiceTableColumns(serviceTab, { isRefexService });
      return withTableActionsColumn(cols, showServiceReassignColumn);
    }
    const showCrTakeActionColumn = activeTab === 'PendingTask'
      || (role === 'first' && activeTab === 'Implementation');
    return withTableActionsColumn(buildTableColumns(activeTab), showCrTakeActionColumn);
  }, [isServiceQueue, serviceTab, activeTab, role, isRefexService, refexWorkflow, showServiceReassignColumn]);

  const serviceCategoryData = useMemo(
    () => computeCategoryBreakdown(effectiveServiceRows),
    [effectiveServiceRows],
  );
  const servicePriorityData = useMemo(
    () => computeApproverServicePriorityBreakdown(effectiveServiceRows),
    [effectiveServiceRows],
  );
  const crCategoryData = useMemo(
    () => computeChangeTypeBreakdown(scopedCrRows),
    [scopedCrRows],
  );
  const crPriorityData = useMemo(
    () => computeCrCriticalityBreakdown(scopedCrRows),
    [scopedCrRows],
  );

  const dialogRow = useMemo(
    () => (dialogRowId ? filteredTasks.find((r) => r.id === dialogRowId) : null),
    [dialogRowId, filteredTasks],
  );

  const canEditRow = useCallback((row) => (
    !isServiceQueue
    && activeTab === 'PendingTask'
    && isMyCrApproverPendingItem(row, user, meta.approverStep, liveCrInstanceIds)
  ), [isServiceQueue, activeTab, meta.approverStep, user, liveCrInstanceIds]);

  const canBalarajuImplementationApprove = useCallback((row) => (
    role === 'first'
    && activeTab === 'Implementation'
    && !isServiceQueue
    && isBalarajuSelfRaisedCr(row, user, userName)
    && matchesFirstLevelApproverTab(row, 'Implementation', user, liveCrInstanceIds)
  ), [role, activeTab, isServiceQueue, user, userName, liveCrInstanceIds]);

  const canApproveCrRow = useCallback((row) => (
    canEditRow(row) || canBalarajuImplementationApprove(row)
  ), [canEditRow, canBalarajuImplementationApprove]);

  const prepareRowForAction = (row) => {
    setSubmitErrors((prev) => ({ ...prev, [row.id]: '' }));
    setRowForms((prev) => ({ ...prev, [row.id]: prev[row.id] || emptyFormFromRow(row, meta.approverStep) }));
    if (kfInstance?.api && !isServiceQueue) {
      const step = activeTab === 'Implementation' ? CR_IMPLEMENTATION_STEP : meta.approverStep;
      if (activeTab === 'Implementation' || activeTab === 'PendingTask') {
        hydrateCrRowFromInstance(kfInstance, row, step).then((h) => {
          if (h?.id) setCrRows((p) => p.map((r) => (r.id === h.id ? h : r)));
        }).catch(() => {});
      }
    }
  };

  const openActionDialog = (row, e) => {
    e?.stopPropagation();
    setDialogRowId(row.id);
    prepareRowForAction(row);
  };

  const toggleRow = (row) => {
    if (expandedRowId === row.id) { setExpandedRowId(null); return; }
    setExpandedRowId(row.id);
    prepareRowForAction(row);
  };

  const handleSubmit = async (row) => {
    if (!canApproveCrRow(row)) return;
    const form = rowForms[row.id] || emptyFormFromRow(row, meta.approverStep);
    if (!String(form.comments || '').trim()) {
      setSubmitErrors((prev) => ({
        ...prev,
        [row.id]: meta.approverStep === CR_FINAL_APPROVER_STEP
          ? 'Final Comments are required before submitting approval'
          : 'Solution is required before submitting approval',
      }));
      return;
    }

    setSubmittingId(row.id);
    setSubmitErrors((prev) => ({ ...prev, [row.id]: '' }));
    try {
      const latestRow = crRows.find((r) => r.id === row.id) || row;
      await submitITChangeRequestApproval(kfInstance, latestRow, form, meta.approverStep);
      setExpandedRowId(null);
      setDialogRowId(null);
      requestRefresh();
    } catch (e) {
      setSubmitErrors((prev) => ({ ...prev, [row.id]: e?.message || 'Submit failed' }));
    } finally {
      setSubmittingId(null);
    }
  };

  const renderCell = (col, row) => {
    const crCanEdit = !isServiceQueue && canShowCrApproverEditIcon(row, user, {
      role,
      tabKey: activeTab,
      approverStep: meta.approverStep,
      liveInstanceIds: liveCrInstanceIds,
      userName,
    });
    const serviceCanEdit = isServiceQueue && canShowServiceRecordEditIcon(row, user, {
      dashboard: editDashboard || 'approver',
      tabKey: serviceTab,
    });

    if (col.key === 'takeAction') {
      const actions = (() => {
        if (isServiceQueue && canReassignServiceRow(row)) {
          return (
            <ITTableIconButton
              label="Reassign ticket"
              icon={Users}
              variant="secondary"
              onClick={(e) => {
                e?.stopPropagation();
                setReassignRowId(row.id);
              }}
            />
          );
        }
        if (!canApproveCrRow(row)) return null;
        return (
          <ITTableIconButton
            label="Approve change request"
            icon={Stamp}
            variant="success"
            onClick={(e) => openActionDialog(row, e)}
          />
        );
      })();
      return renderTakeActionGroup(
        actions,
        renderEditRecordTableCell(kfInstance, row, {
          queueType: isServiceQueue ? 'service' : 'cr',
          canEdit: isServiceQueue ? serviceCanEdit : crCanEdit,
          ...getEditRecordCellProps(isServiceQueue ? 'service' : 'cr'),
        }),
      );
    }
    if (col.key === 'viewDetails') {
      return renderEditRecordTableCell(kfInstance, row, {
        queueType: isServiceQueue ? 'service' : 'cr',
        canEdit: isServiceQueue ? serviceCanEdit : crCanEdit,
        ...getEditRecordCellProps(isServiceQueue ? 'service' : 'cr'),
      });
    }
    if (isServiceQueue) {
      if (col.key === 'itemStatus') {
        return <ITItemStatusBadge status={row.itemStatusRaw} label={row.itemStatus} />;
      }
      return renderServiceTableCell(col, row, {
        refexLayout: refexWorkflow,
        isCompletedTab: serviceTab === 'Resolved' || serviceTab === 'Cancelled' || serviceTab === 'Completed' || serviceTab === 'Closed',
        statusTab: serviceTab,
      });
    }

    switch (col.key) {
      case 'taskStatus': {
        const status = getCrImplementationTaskStatus(row);
        const waiting = status === 'Waiting to Pick';
        return (
          <span className={`rounded-[3px] border px-1.5 py-0.5 text-[11px] font-semibold ${
            waiting
              ? 'border-[#FFE380] bg-[#FFF7D6] text-[#7F5F01]'
              : 'border-[#BAF3DB] bg-[#E3FCEF] text-[#216E4E]'
          }`}
          >
            {status}
          </span>
        );
      }
      case 'date': return row.requestedDate;
      case 'actions': {
        if (!canApproveCrRow(row)) return null;
        return (
          <ITTableIconButton
            label="Approve change request"
            icon={Stamp}
            variant="success"
            onClick={(e) => openActionDialog(row, e)}
          />
        );
      }
      default:
        return renderCrTableCell(col, row);
    }
  };

  const crHeroStats = role === 'first'
    ? [
      { label: 'Pending', value: crKpis.pending },
      { label: 'Implementation', value: crKpis.implementation },
      { label: 'Completed', value: crKpis.completed },
    ]
    : [
      { label: 'Pending', value: crKpis.pending },
      { label: isRefexService ? 'IT Manager Pending' : 'First Level Pending', value: crKpis.firstLevelPending },
      { label: 'Implementation', value: crKpis.implementation },
    ];

  const statusTabsForQueue = (isServiceQueue ? visibleApproverServiceTabs : crTabs).map((tab) => ({
    key: tab.key,
    label: tab.label,
  }));
  const tabCountsForQueue = isServiceQueue ? serviceTabCounts : crTabCounts;
  const slaKpisForQueue = isServiceQueue ? serviceSlaKpis : crSlaKpis;
  const healthRows = isServiceQueue ? effectiveServiceRows : scopedCrRows;
  const healthMetrics = useMemo(
    () => computeITSMHealthMetrics(healthRows, { queueType: isServiceQueue ? 'service' : 'cr' }),
    [healthRows, isServiceQueue],
  );
  // const healthMonitorEl = <ITSMHealthMonitor metrics={healthMetrics} />;
  const refexLayout = showMisChrome && refexWorkflow;
  const tableHeadClass = refexLayout ? misModernTableHeadClass : (showMisChrome ? misModernTableHeadClass : IT_THEME.tableHead);
  const mobileListClass = showMisChrome ? misModernMobileListClass : IT_THEME.mobileList;
  const rowHoverClass = refexLayout ? ' transition hover:bg-slate-50' : (showMisChrome ? ' transition-colors hover:bg-slate-50' : '');
  const resolvedEntityOptions = isExtrovisService
    ? (entityOptions?.some((o) => o.key === 'Kavis' || o.key === 'PharmaPack' || o.key === 'KavisPharma')
      ? entityOptions
      : EXTROVIS_DASHBOARD_ENTITY_OPTIONS)
    : entityOptions;

  const classicChrome = (
    <>
      <ITDashboardHeader
        roleKey={meta.roleKey}
        userName={userName}
        connected={connected}
        loading={loading}
        refreshing={refreshing}
        loadError={loadError}
        onRefresh={onManualRefresh}
        userProfile={userProfile}
        lastUpdatedAt={lastUpdatedAt}
        entitySelect={showEntitySelectUi ? {
          value: entityTab,
          onChange: handleEntityChange,
          options: entityOptions,
          label: 'Entity',
        } : undefined}
        periodFilter={periodFilterEl}
        {...(showCreateSrAction ? {
          onCreateTicket: createSrHandler,
          createTicketLabel: 'New Service Request',
        } : {})}
      />
      {/* Health Monitor — disabled for now
      {healthMonitorEl}
      */}
      {isRefexService || hideQueueSwitch ? null : (
        <QueueSwitch activeQueue={activeQueue} onChange={setActiveQueue} pendingCounts={queuePendingCounts} />
      )}
      {isServiceQueue ? (
        <ITQueueAnalyticsPanel
          heroTitle="Service Oversight"
          heroSubtitle="Assigned service pipeline"
          heroTotal={effectiveServiceRows.length}
          heroStats={[
            { label: 'Agent Pending', value: serviceKpis.agentPendingTasks },
            ...(isRefexService ? [] : [{ label: 'Open', value: serviceKpis.openTickets }]),
            { label: 'Resolved', value: serviceKpis.resolved },
          ]}
          statusTabs={visibleApproverServiceTabs.map((tab) => ({ key: tab.key, label: tab.label }))}
          tabCounts={serviceTabCounts}
          activeTab={serviceTab}
          onTabChange={setServiceTab}
          categoryTitle="Tickets by Category"
          categorySubtitle="All service requests in scope"
          categoryData={serviceCategoryData}
          priorityTitle="Active Tickets by Priority"
          prioritySubtitle="Agent pending, open, and on hold"
          priorityData={servicePriorityData}
          priorityEmptyLabel="No active service tickets"
          slaAtRisk={serviceSlaKpis.slaAtRisk}
          slaBreached={serviceSlaKpis.slaBreached}
          loading={loading}
        />
      ) : (
        <ITQueueAnalyticsPanel
          heroTitle={role === 'first' ? 'First Level Approvals' : 'Final Level Approvals'}
          heroSubtitle="Change requests awaiting your action"
          heroTotal={scopedCrRows.length}
          heroIcon={ITCrHeroIcon}
          heroStats={crHeroStats}
          statusTabs={crTabs.map((tab) => ({ key: tab.key, label: tab.label }))}
          tabCounts={crTabCounts}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          categoryTitle="By Change Type"
          categorySubtitle="Distribution of change requests"
          categoryData={crCategoryData}
          categoryEmptyLabel="No change request data yet"
          priorityTitle="Active CRs by Risk"
          prioritySubtitle="Pending and implementation queue"
          priorityData={crPriorityData}
          priorityEmptyLabel="No active change requests"
          slaAtRisk={crSlaKpis.slaAtRisk}
          slaBreached={crSlaKpis.slaBreached}
          slaSubtitle="Active change requests"
          loading={loading}
        />
      )}
    </>
  );

  const classicTableHeader = (
    <ITTableSectionHeader
      roleKey={meta.roleKey}
      compact
      search={{ value: search, onChange: (e) => setSearch(e.target.value) }}
      tabs={(isServiceQueue ? visibleApproverServiceTabs : crTabs).map((tab) => (
        <ITTabButton
          key={tab.key}
          active={activeSubTab === tab.key}
          label={tab.label}
          count={(isServiceQueue ? serviceTabCounts : crTabCounts)[tab.key] ?? 0}
          onClick={() => (isServiceQueue ? setServiceTab(tab.key) : setActiveTab(tab.key))}
        />
      ))}
    />
  );

  const misFiltersEl = (
    <>
      <ITMisTableFilters
        variant={refexLayout ? 'refex' : 'default'}
        category={misFilters.category}
        onCategoryChange={misFilters.setCategory}
        categoryOptions={misFilters.categoryOptions}
        categoryLabel={isServiceQueue ? 'Category' : 'Change Type'}
        criticality={misFilters.criticality}
        onCriticalityChange={misFilters.setCriticality}
        criticalityOptions={misFilters.criticalityOptions}
        criticalityLabel={isServiceQueue ? (refexLayout ? 'Criticality' : 'Priority') : 'Change Risk'}
        hideCategory={isServiceQueue && refexLayout}
        hideCriticality={isServiceQueue && refexLayout}
        ticketType={misFilters.ticketType}
        onTicketTypeChange={misFilters.setTicketType}
        ticketTypeOptions={misFilters.ticketTypeOptions}
        showTicketType={isServiceQueue && !refexLayout}
        entity={misFilters.entity}
        onEntityChange={misFilters.setEntity}
        entityOptions={misFilters.entityOptions}
        showEntity={isServiceQueue && showEntityFilter && !refexLayout}
        onClear={misFilters.clearFilters}
        hasActive={misFilters.hasActive}
      />
    </>
  );

  const ClassicTableWrap = showMisChrome
    ? ({ children }) => children
    : ({ children }) => (
      <ITDashboardDataSection>
        {classicTableHeader}
        {children}
      </ITDashboardDataSection>
    );

  const sharedChromeProps = {
    refexLayout,
    compactKpiCards: true,
    showScopeSwitch,
    scope,
    onScopeChange: setScope,
    showQueueSwitch: !hideQueueSwitch && !isRefexService,
    showEntitySelect: showEntitySelectUi,
    entityTab,
    onEntityChange: handleEntityChange,
    entityOptions: resolvedEntityOptions,
    showCompanyFilter: showCompanyHeaderFilter,
    company: misFilters.company,
    onCompanyChange: (value) => {
      const extra = EXTRA_COMPANY_NAME_OPTIONS.find((opt) => opt.key === value || opt.label === value);
      if (extra) handleEntityChange(extra.key);
      misFilters.setCompany(value);
    },
    companyOptions: headerCompanyOptions,
    showPeopleFilters: showHeaderPeopleFilters && isServiceQueue,
    showRequesterFilter: showHeaderRequesterFilter,
    assignedFilterLabel: headerAssignedFilterLabel,
    requester: misFilters.requester,
    onRequesterChange: misFilters.setRequester,
    requesterOptions: headerRequesterOptions,
    assignedTo: misFilters.assignedTo,
    onAssignedToChange: misFilters.setAssignedTo,
    assignedToOptions: headerAssignedToOptions,
    headerProps: {
      userName,
      companyName: userProfile.company || userProfile.entity,
      connected,
      loading,
      refreshing,
      loadError,
      onRefresh: onManualRefresh,
      lastUpdatedAt,
      liveClock: refexLayout ? <RefexLiveClockText /> : undefined,
      periodFilter: periodFilterEl,
      showEntitySelect: showEntitySelectUi,
      entityTab,
      onEntityChange: handleEntityChange,
      entityOptions: resolvedEntityOptions,
      showCompanyFilter: showCompanyHeaderFilter,
      company: misFilters.company,
      onCompanyChange: (value) => {
      const extra = EXTRA_COMPANY_NAME_OPTIONS.find((opt) => opt.key === value || opt.label === value);
      if (extra) handleEntityChange(extra.key);
      misFilters.setCompany(value);
    },
      companyOptions: headerCompanyOptions,
      showPeopleFilters: showHeaderPeopleFilters && isServiceQueue,
      showRequesterFilter: showHeaderRequesterFilter,
      assignedFilterLabel: headerAssignedFilterLabel,
      requester: misFilters.requester,
      onRequesterChange: misFilters.setRequester,
      requesterOptions: headerRequesterOptions,
      assignedTo: misFilters.assignedTo,
      onAssignedToChange: misFilters.setAssignedTo,
      assignedToOptions: headerAssignedToOptions,
      engagementReportUrl,
      engagementReportLabel,
      ...(showCreateSrAction ? {
        onCreateTicket: createSrHandler,
        createTicketLabel: isExtrovisService ? 'New' : 'New Service Request',
        createMenuOptions,
      } : {}),
      roleLabel: resolveItsmHeaderRoleLabel({
        headerRoleLabel,
        role,
        hideScopeSwitch,
        showHeaderPeopleFilters,
        extrovis: isExtrovisService,
        userEmail: user?.Email || user?.email || '',
        userName: userName || user?.Name || userProfile?.name || '',
      }),
      poolLabel: poolLabel || ((showScopeSwitch || isExtrovisService)
        ? (isExtrovisService
          ? (role === 'first' ? 'First Level Approver Dashboard' : 'Final Level Approver Dashboard')
          : (role === 'first' ? 'IT Manager Dashboard' : 'IT Head Dashboard'))
        : undefined),
    },
    activeQueue,
    onQueueChange: setActiveQueue,
    queuePendingCounts,
    insightMetrics,
    refexMonitoringMetrics,
    refexCenterMetrics,
    sourceBreakdownCounts: showSourceBreakdown ? sourceBreakdownCounts : null,
    todaySnapshotMetrics,
    statusTabs: statusTabsForQueue,
    tabCounts: tabCountsForQueue,
    slaKpis: slaKpisForQueue,
    tableTitle: isServiceQueue ? 'Service oversight' : (role === 'first' ? 'First level approvals' : 'Final level approvals'),
    tableSubtitle: isServiceQueue ? 'Assigned service pipeline' : 'Change requests awaiting your action',
    search,
    onSearchChange: (e) => setSearch(e.target.value),
    filters: misFiltersEl,
    activeTab: activeSubTab,
    onTabChange: (key) => (isServiceQueue ? handleServiceTabChange(key) : setActiveTab(key)),
    resultCount: filteredTasks.length,
    searchTerm: search.trim(),
    loading: (loading || ((hideScopeSwitch || scope === 'team') && teamDatasetLoading)) && filteredTasks.length === 0,
    kpiLoading: (loading || ((hideScopeSwitch || scope === 'team') && teamDatasetLoading)) && !effectiveServiceRows.length,
    insightLayout: refexLayout ? 'center-donut' : undefined,
  };

  const tableBusy = (loading || ((hideScopeSwitch || scope === 'team') && teamDatasetLoading)) && filteredTasks.length === 0;

  const tableBody = (
    <ClassicTableWrap>
      <>
        <div className={IT_THEME.tableDesktop}>
          <table className={`w-full text-left text-sm ${refexLayout ? 'min-w-[880px]' : 'min-w-[960px]'}`}>
            <thead className={tableHeadClass}>
              <tr>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap ${refexLayout ? `${REFEX_TABLE_HEAD_CELL} ${refexStickyHeadClass(col)}` : `px-4 py-3 ${tableInteractionCellClass(col, showMisChrome)}`}`}
                  >
                    {refexLayout
                      ? renderRefexMisTableHeadLabel(col, getRefexServiceMisHeadLabelProps({
                        col,
                        misFilters,
                        sortOrder,
                        onSortOrderChange: setSortOrder,
                        ticketStatusOptions: MIS_TICKET_STATUS_FILTER_OPTIONS,
                        tabRows: tabScopedRows,
                      }))
                      : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableBusy ? (
                <ITTableSkeleton colSpan={tableColumns.length} />
              ) : filteredTasks.length === 0 ? (
                <tr><td colSpan={tableColumns.length} className={refexLayout ? 'p-8' : undefined}><ITEmptyTickets title="No records" subtitle={connected ? `No matching ${isServiceQueue ? 'service requests' : 'change requests'} in this tab` : 'Preview mode — mock data'} /></td></tr>
              ) : (
                pagedItems.map((row) => {
                  const isExpanded = expandedRowId === row.id;
                  const canEdit = canApproveCrRow(row);
                  const rowBg = 'bg-white';
                  const serviceCanEdit = isServiceQueue && canShowServiceRecordEditIcon(row, user, {
                    dashboard: editDashboard || 'approver',
                    tabKey: serviceTab,
                  });
                  const crCanEdit = !isServiceQueue && canShowCrApproverEditIcon(row, user, {
                    role,
                    tabKey: activeTab,
                    approverStep: meta.approverStep,
                    liveInstanceIds: liveCrInstanceIds,
                    userName,
                  });
                  const formOpenOptions = {
                    queueType: isServiceQueue ? 'service' : 'cr',
                    ...getEditRecordCellProps(isServiceQueue ? 'service' : 'cr'),
                  };
                  return (
                    <Fragment key={row.id}>
                      <tr
                        onClick={(e) => handleDashboardRowClick(e, kfInstance, row, {
                          canOpenForm: isServiceQueue
                            ? !(isExtrovisService && monitoringScope === 'team' && isExtrovisAgentPickupStep(row)) && serviceCanEdit
                            : (crCanEdit || canEdit),
                          onToggleExpand: () => toggleRow(row),
                          formOptions: formOpenOptions,
                        })}
                        className={`group cursor-pointer ${refexLayout ? REFEX_TABLE_ROW_CLASS : IT_THEME.tableRow}${rowHoverClass} ${getSlaTableRowClass(row, { expanded: isExpanded })}`}
                      >
                        <td className={refexLayout ? `${REFEX_TABLE_CELL_CLASS} ${refexStickyCellClass({ key: 'expand' }, rowBg)}` : `px-3 py-3 ${IT_THEME.chevron}`} data-stop-row-nav>
                          {refexLayout ? (
                            <button
                              type="button"
                              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(row);
                              }}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          ) : (
                            isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </td>
                        {tableColumns.slice(1).map((col) => (
                          <td
                            key={col.key}
                            onClick={isTableInteractionColumn(col) ? (e) => e.stopPropagation() : undefined}
                            className={refexLayout
                              ? `${REFEX_TABLE_CELL_CLASS} ${refexStickyCellClass(col, rowBg)} ${col.key === 'date' ? IT_TYPE.meta : ''}`
                              : `px-4 py-3 ${col.key === 'date' ? IT_THEME.metaText : 'text-[#44546F]'} ${tableInteractionCellClass(col, showMisChrome)}`}
                          >
                            {renderCell(col, row)}
                          </td>
                        ))}
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td colSpan={tableColumns.length} className="p-0">
                            {isServiceQueue ? (
                              <ApproverServiceExpandPanel
                                row={row}
                                showSlaInExpand={showSlaInExpand}
                                serviceTab={serviceTab}
                                scope={monitoringScope}
                              />
                            ) : (
                              <CrExpandPanel
                                row={row}
                                approverStep={meta.approverStep}
                                form={rowForms[row.id] || emptyFormFromRow(row, meta.approverStep)}
                                canEdit={canEdit}
                                showSubmitForm={false}
                                showComments={!canEdit}
                                activeTab={activeTab}
                                submitting={submittingId === row.id}
                                submitError={submitErrors[row.id]}
                                onChange={(next) => setRowForms((p) => ({ ...p, [row.id]: next }))}
                                onSubmit={() => handleSubmit(row)}
                              />
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      <div className={mobileListClass}>
            {tableBusy ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200/60" />) : filteredTasks.length === 0 ? (
              <ITEmptyTickets title="No records" subtitle={`No matching ${isServiceQueue ? 'service requests' : 'change requests'}`} />
            ) : pagedItems.map((row) => {
              const isExpanded = expandedRowId === row.id;
              const canEdit = canApproveCrRow(row);
              const isCompletedTab = isServiceQueue ? serviceTab === 'Completed' : activeTab === 'Completed';
              const showSla = !isCompletedTab;
              return (
                <ITTicketMobileCard
                  key={row.id}
                  expanded={isExpanded}
                  onToggle={() => toggleRow(row)}
                  requestId={formatRequestId(row)}
                  title={isServiceQueue ? row.summary : row.summary}
                  subtitle={isCompletedTab ? (isServiceQueue ? row.itemStatus : row.statusLabel) : formatCrWorkflowStepDisplay(row, entityTab)}
                  badges={(
                    <>
                      <ITCriticalityBadge criticality={row.criticality} />
                      {showSla && <ITSlaBadge row={row} />}
                    </>
                  )}
                  fields={[
                    ...(isCompletedTab
                      ? (isServiceQueue ? buildCompletedMobileFields(row) : buildCrCompletedMobileFields(row))
                      : [buildSlaMobileField(row)]),
                    ...(!isServiceQueue && activeTab === 'Implementation'
                      ? [{ label: 'Task Status', value: getCrImplementationTaskStatus(row) }]
                      : []),
                  ]}
                  footerAction={isServiceQueue && canReassignServiceRow(row) ? (
                    <div className="flex items-center justify-end gap-1">
                      <ITTableIconButton
                        label="Reassign ticket"
                        icon={Users}
                        variant="secondary"
                        onClick={(e) => {
                          e?.stopPropagation();
                          setReassignRowId(row.id);
                        }}
                      />
                    </div>
                  ) : canEdit ? (
                    <div className="flex items-center justify-end gap-1">
                      <ITTableIconButton
                        label="Approve change request"
                        icon={Stamp}
                        variant="success"
                        onClick={(e) => openActionDialog(row, e)}
                      />
                    </div>
                  ) : null}
                >
                  {isServiceQueue ? (
                    <ApproverServiceExpandPanel
                      row={row}
                      showSlaInExpand={showSlaInExpand}
                      serviceTab={serviceTab}
                      scope={monitoringScope}
                    />
                  ) : (
                    <CrExpandPanel
                      row={row}
                      approverStep={meta.approverStep}
                      form={rowForms[row.id] || emptyFormFromRow(row, meta.approverStep)}
                      canEdit={canEdit}
                      showSubmitForm={false}
                      showComments={!canEdit}
                      activeTab={activeTab}
                      submitting={submittingId === row.id}
                      submitError={submitErrors[row.id]}
                      onChange={(next) => setRowForms((p) => ({ ...p, [row.id]: next }))}
                      onSubmit={() => handleSubmit(row)}
                    />
                  )}
                </ITTicketMobileCard>
              );
            })}
          </div>

          {!loading && filteredTasks.length > 0 && (
            refexLayout ? (
              <RefexTablePaginationFooter>
                <ITTablePagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  onPageChange={setPage}
                  hasMoreOnServer={hasMoreOnServer && connected}
                  loadingMore={loadingMore}
                  onLoadMore={loadMore}
                  loadedTotal={loadedQueueTotal}
                  itemLabel="tickets"
                />
              </RefexTablePaginationFooter>
            ) : (
            <ITTablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setPage}
              hasMoreOnServer={hasMoreOnServer && connected}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              loadedTotal={loadedQueueTotal}
            />
            )
          )}

          {!showMisChrome && !loading && filteredTasks.length > 0 && (
            <ITTableFooter>
              {filteredTasks.length} record{filteredTasks.length === 1 ? '' : 's'} in this tab
              {search.trim() ? ` matching "${search.trim()}"` : ''}
              {' · '}
              {loadedQueueTotal} loaded
              {fromMyTasksApi && !isServiceQueue ? ' · live' : ''}
            </ITTableFooter>
          )}
          </>
    </ClassicTableWrap>
  );

  return (
    <>
      <ITMisDualQueuePageChrome
        isMisModern={isMisModern}
        classicChrome={classicChrome}
        {...sharedChromeProps}
        showEntitySelect={showEntitySelectUi}
        entityTab={entityTab}
        onEntityChange={handleEntityChange}
        entityOptions={resolvedEntityOptions}
        insightLayout="center-donut"
      >
        {tableBody}
      </ITMisDualQueuePageChrome>

      {isServiceQueue ? (
        <ITServiceReassignDialog
          open={!!reassignRowId}
          onClose={() => setReassignRowId(null)}
          row={serviceRows.find((r) => r.id === reassignRowId) || null}
          kfInstance={kfInstance}
          adminKeyed={canReassignServiceRow(serviceRows.find((r) => r.id === reassignRowId) || null)}
          onReassigned={requestRefresh}
        />
      ) : null}

      {!isServiceQueue && dialogRow && (
          <ITDashboardDialog
            open={!!dialogRow}
            onClose={() => setDialogRowId(null)}
            title="Submit Approval"
            subtitle={`${formatRequestId(dialogRow)} · ${dialogRow.summary}`}
          >
            <CrApproverApprovalForm
              form={rowForms[dialogRow.id] || emptyFormFromRow(dialogRow, meta.approverStep)}
              approverStep={meta.approverStep}
              onChange={(next) => setRowForms((p) => ({ ...p, [dialogRow.id]: next }))}
              onSubmit={() => handleSubmit(dialogRow)}
              submitting={submittingId === dialogRow.id}
              submitError={submitErrors[dialogRow.id]}
            />
          </ITDashboardDialog>
        )}
    </>
  );
}
