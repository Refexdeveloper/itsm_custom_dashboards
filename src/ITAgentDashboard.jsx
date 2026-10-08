/* eslint-disable max-lines -- Kissflow IT Agent dual-queue dashboard */
import { useState, useContext, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { ChevronDown, ChevronUp, Send, CheckCircle2, UserCheck, Users, RefreshCw } from 'lucide-react';
import { KissflowSDKContext } from './sdk/index.js';
import {
  IT_THEME,
  ITDashboardHeader,
  ITDashboardShell,
  ITDashboardDataSection,
  ITTableSectionHeader,
  ITTabButton,
  ITTableSkeleton,
  ITEmptyTickets,
  ITTicketMobileCard,
  ITCriticalityBadge,
  ITTableFooter,
  getSlaTableRowClass,
  ITSlaBadge,
  ITDashboardDialog,
  ITTableIconButton,
  useITListPagination,
  ITTablePagination,
  ITMisTableFilters,
  useMisTableFilters,
  ITMisSelectField,
  itFormPanel,
} from './components/it/ITDashboardUI.jsx';
import { useIsMisModern } from './context/ITDashboardUiContext.jsx';
import {
  misModernTableHeadClass,
  misModernMobileListClass,
} from './components/it/mis/ITMisEmployeeUI.jsx';
import { ITMisDualQueuePageChrome } from './components/it/mis/ITMisDualQueuePageChrome.jsx';
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
} from './itsm/refex/shared/RefexItsmSharedUI.jsx';
import { IT_TYPE } from './components/it/itDesignTokens.js';
import {
  QueueSwitch,
  getServiceTableColumns,
  getCrTableColumns,
  renderServiceTableCell,
  renderCrTableCell,
  buildSlaMobileField,
  buildCompletedMobileFields,
  buildCrCompletedMobileFields,
  formatRequestId,
  withTableActionsColumn,
  mergeDashboardRowsById,
  renderEditRecordTableCell,
  isTableInteractionColumn,
  tableInteractionCellClass,
  renderTakeActionGroup,
  AgentServiceExpandPanel,
  ExpandSafeFrame,
  AgentServiceWorkForm,
  RefexTechSupportWorkForm,
  CrExpandPanel,
  CrImplementationWorkForm,
  createDashboardRowClickHandler,
  handleDashboardRowClick,
} from './components/it/ITDashboardShared.jsx';
import { ITQueueAnalyticsPanel, ITCrHeroIcon } from './components/it/ITDashboardAnalytics.jsx';
// Health Monitor — disabled for now; re-enable when needed
// import ITSMHealthMonitor from './components/it/ITSMHealthMonitor.jsx';
import ITServiceReassignDialog from './components/it/ITServiceReassignDialog.jsx';
import { useITDashboardPeriodFilter } from './components/it/useITDashboardPeriodFilter.jsx';
import { useApproverAdaptivePeriodFilter } from './components/it/useApproverAdaptivePeriodFilter.jsx';
import { useITDashboardSilentRefresh } from './components/it/useITDashboardSilentRefresh.js';
import { useITEditRecordRefreshBindings } from './components/it/useITEditRecordRefreshBindings.js';
import {
  fetchRefexTechSupportMyTaskSeed,
  hydrateRefexTechSupportFromPersistentCache,
  mergeTechSupportLandingRows,
  clearRequestIdReportCache,
} from './itsm/refex/techsupport/fetchRefexTechSupportTickets.js';
import {
  ensureRefexMappedDataset,
  scheduleRefexMappedDatasetLoad,
  invalidateRefexMappedDataset,
  getCachedRefexMappedRows,
  setCachedRefexMappedRows,
} from './itsm/refex/shared/refexDatasetStore.js';
import { getMisTicketStatus } from './itsm/refex/employeedashboard/employeeStatus.js';
import { MIS_TICKET_STATUS_FILTER_OPTIONS } from './itsm/refex/employeedashboard/constants.js';
import { getRefexServiceQueueMisColumns } from './itsm/refex/shared/refexServiceQueueColumns.js';
import {
  emptyRefexTechSupportFormFromRow,
  submitRefexTechSupportWork,
  validateRefexTechSupportWorkForm,
} from './itsm/refex/techsupport/refexTechSupportApi.js';
import {
  fetchITAgentDashboardData,
  mapReportRow,
  mapChangeRequestRow,
  shouldIncludeAgentCrRow,
  filterEntityScopedRows,
  AGENT_CR_TABS,
  getAgentStatusTabs,
  resolveDefaultServiceStatusTab,
  isRefexServiceDashboardContext,
  isExtrovisServiceDashboardContext,
  isExtrovisReportEntity,
  filterRowsByEntityKey,
  EXTROVIS_DASHBOARD_ENTITY_OPTIONS,
  REFEX_COMPANY_NAME_OPTIONS,
  countCriticalHighPriorityRows,
  applyAgentFilters,
  applyAgentCrFilters,
  applyMisColumnFilters,
  matchesAgentServiceTab,
  matchesAgentServiceTabTeam,
  matchesRefexTechSupportTab,
  matchesRefexMonitoringServiceTab,
  countServiceSlaKpiSplit,
  isRefexTechSupportTicketHandledByUser,
  isCurrentActiveTaskAssignedToUser,
  matchesRefexServiceTeamScope,
  matchesRefexAgentMeScope,
  matchesRefexMeOnlyScope,
  isRefexServiceOpenTicket,
  isLiveBucketPendingRow,
  isITTechReopenStep,
  isEmployeeApprovalRefexStep,
  isDashboardRowCreatedToday,
  isRefexServiceClosedTicket,
  isRefexServiceProcessCompleted,
  getDashboardRowDateMs,
  dashboardDateRangeIncludesToday,
  matchesRefexMyTaskRow,
  matchesExtrovisOpenTicketRow,
  matchesOpenPickupTicketRow,
  matchesDashboardMeScope,
  getApproverServiceTabs,
  matchesAgentCrStatusTab,
  computeAgentServiceKpisFromRows,
  computeAgentCrKpisFromRows,
  computeSlaKpisFromRows,
  computeITSMHealthMetrics,
  computeCategoryBreakdown,
  computeChangeTypeBreakdown,
  computeAgentPriorityBreakdown,
  computeCrCriticalityBreakdown,
  computeUserQueuePendingCounts,
  sortDashboardRowsByNewest,
  CR_IMPLEMENTATION_STEP,
  isAgentPausingStatus,
  isAgentWorkflowSubmitStatus,
  submitITAgentWork,
  acceptITAgentTicket,
  resumeITAgentTicket,
  CR_IMPLEMENTATION_SUBMIT_STATUS,
  submitITChangeRequestImplementation,
  canEditCrImplementationRow,
  canShowServiceRecordEditIcon,
  canShowCrRecordEditIcon,
  fetchITAgentActivityInstanceId,
  hydrateITRowAttachmentsOnly,
  hydrateCrRowFromInstance,
  fetchITAgentItemStatusOptions,
  fetchCrImplementationFinalStatusOptions,
  filterAgentItemStatusOptions,
  filterCrImplementationFinalStatusOptions,
  CR_IMPLEMENTATION_STATUS_OPTIONS,
  openITCreateTicketPage,
  openITAgentCreateChangeRequestPage,
  IT_DASHBOARD_SERVER_PAGE_SIZE,
  validateAgentServiceWorkForm,
  getCanonicalAgentItemStatusToken,
  AGENT_UPDATE_STATUS_ALIASES,
  resolveKfUserProfile,
  resolveItsmHeaderRoleLabel,
} from './lib/kfITServiceDashboard.js';
import { MOCK_IT_AGENT_TASKS } from './mocks/itAgentTasks.js';
import { MOCK_IT_CHANGE_REQUEST } from './mocks/itChangeRequests.js';

function emptyServiceFormFromRow(row, { isRefexService = false } = {}) {
  if (isRefexService) return emptyRefexTechSupportFormFromRow(row);
  const rawStatus = row?.itemStatusRaw || '';
  return {
    itemStatus: rawStatus && rawStatus !== '—' ? rawStatus : '',
    solution: row?.solution !== '—' ? row.solution : '',
    holdReason: row?.holdReason !== '—' ? row.holdReason : '',
    pendingReason: row?.pendingReason !== '—' ? row.pendingReason : '',
    cancellationReason: row?.cancellationReason !== '—' ? row.cancellationReason : '',
  };
}

function canAcceptServiceRow(row, activeTab) {
  return activeTab === 'OpenTickets' && (
    matchesOpenPickupTicketRow(row)
    || matchesAgentServiceTab(row, 'OpenTickets', null)
  );
}

function canEditServiceRow(row, activeTab, user, { isRefexService = false } = {}) {
  if (isRefexService) {
    const ownWork = matchesRefexTechSupportTab(row, 'AssignedToMe', user);
    // Refex Open Tickets includes owned Tech Support work (My Tickets merged).
    if (isRefexServiceDashboardContext()) return ownWork;
    return activeTab === 'AssignedToMe' && ownWork;
  }
  return activeTab === 'PendingTask' && matchesAgentServiceTab(row, 'PendingTask', user);
}

function canResumeServiceRow(row, activeTab, user) {
  return activeTab === 'HoldTasks' && matchesAgentServiceTab(row, 'HoldTasks', user);
}

function canReassignServiceRow(row, activeTab) {
  return activeTab === 'OpenTickets' && (
    matchesOpenPickupTicketRow(row)
    || matchesAgentServiceTab(row, 'OpenTickets', null)
  );
}

function validateServiceForm(form, { isRefexService = false } = {}) {
  if (isRefexService) return validateRefexTechSupportWorkForm(form);
  return validateAgentServiceWorkForm(form);
}

function emptyCrFormFromRow(row) {
  return {
    finalStatus: CR_IMPLEMENTATION_SUBMIT_STATUS,
    comments: row?.comments && row.comments !== '—' ? row.comments : '',
  };
}

function canEditCrRow(row, activeTab, liveCrIds, user) {
  return canEditCrImplementationRow(row, activeTab, liveCrIds, user);
}

function ITAgentDashboardContent({
  poolLabel = '',
  headerRoleLabel = 'IT Agent',
  enableServiceComments = false,
  /** Same Weekly / Monthly / FY picker as IT Head. */
  adaptivePeriod = false,
  /** Show Due overlay (Refex). Extrovis hides Due. */
  showDue = false,
  useAdminItemDataset = false,
}) {
  const isMisModern = useIsMisModern();
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);
  const user = kfInstance?.user;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [connected, setConnected] = useState(false);
  const [userName, setUserName] = useState('');
  const [serviceRows, setServiceRows] = useState([]);
  const [crRows, setCrRows] = useState([]);
  const [liveCrIds, setLiveCrIds] = useState(() => new Set());
  const [activeQueue, setActiveQueue] = useState('ServiceQueue');
  const [serviceTab, setServiceTab] = useState(() => {
    if (isExtrovisServiceDashboardContext()) return 'OpenTickets';
    if (isRefexServiceDashboardContext()) return 'OpenTickets';
    return 'OpenTickets';
  });
  const [crTab, setCrTab] = useState(() => (
    isExtrovisServiceDashboardContext() ? 'Implementation' : 'InApproval'
  ));
  const [scope, setScope] = useState('me');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState(() => (
    isExtrovisServiceDashboardContext() ? 'desc' : 'asc'
  ));
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [dialogRowId, setDialogRowId] = useState(null);
  const [fromMyTasksApi, setFromMyTasksApi] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [serviceForms, setServiceForms] = useState({});
  const [crForms, setCrForms] = useState({});
  const [submitErrors, setSubmitErrors] = useState({});
  const [itemStatusOptionsByRow, setItemStatusOptionsByRow] = useState({});
  const [finalStatusOptionsByRow, setFinalStatusOptionsByRow] = useState({});
  const [loadingStatusOptionsRowId, setLoadingStatusOptionsRowId] = useState('');
  const [serverPage, setServerPage] = useState(1);
  const [hasMoreService, setHasMoreService] = useState(false);
  const [hasMoreChange, setHasMoreChange] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [reassignRowId, setReassignRowId] = useState(null);
  const [entityTab, setEntityTab] = useState('Extrovis');
  const classicPeriod = useITDashboardPeriodFilter({ enabled: !adaptivePeriod });
  const adaptivePeriodHook = useApproverAdaptivePeriodFilter({
    enabled: adaptivePeriod,
    showDue: showDue && !isExtrovisServiceDashboardContext(),
  });
  const { applyPeriod, periodFilterEl, periodKey, periodRange, dueOnly = false } = adaptivePeriod
    ? adaptivePeriodHook
    : classicPeriod;
  const scopeRef = useRef(scope);
  const datasetGenRef = useRef(0);
  const lastLoadedKeyRef = useRef('');
  const [datasetReady, setDatasetReady] = useState(false);
  const [teamDatasetLoading, setTeamDatasetLoading] = useState(false);

  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  const userProfile = useMemo(() => resolveKfUserProfile(user), [user]);
  const isRefexService = isRefexServiceDashboardContext();
  const isExtrovisService = isExtrovisServiceDashboardContext();
  // Extrovis shares the exact Refex workflow — same tabs, cards, and matchers.
  const refexWorkflow = isRefexService || isExtrovisService;
  const agentServiceTabs = useMemo(() => getAgentStatusTabs(), [isRefexService, isExtrovisService]);
  const visibleAgentServiceTabs = useMemo(() => {
    if (!refexWorkflow) return agentServiceTabs;
    if (scope === 'me') {
      // Refex IT Agent: My Tickets merged into Open Tickets. Extrovis keeps both.
      return isRefexService
        ? agentServiceTabs.filter((tab) => tab.key !== 'AssignedToMe')
        : agentServiceTabs;
    }
    // My Team — hide personal My Tickets + Active (merged into Open).
    return getApproverServiceTabs().filter((tab) => (
      tab.key !== 'AssignedToMe' && tab.key !== 'Active'
    ));
  }, [agentServiceTabs, refexWorkflow, scope, isRefexService]);

  const matchServiceQueueTab = useCallback((row, tabKey) => {
    if (!refexWorkflow) {
      return scope === 'team'
        ? matchesAgentServiceTabTeam(row, tabKey)
        : matchesAgentServiceTab(row, tabKey, user);
    }
    if (scope === 'team') {
      return matchesRefexMonitoringServiceTab(row, tabKey, user, 'team');
    }
    return matchesRefexTechSupportTab(row, tabKey, user);
  }, [refexWorkflow, scope, user]);

  const preferMeServiceTab = isExtrovisService ? 'OpenTickets' : 'OpenTickets';

  useEffect(() => {
    if (!refexWorkflow) return;
    const validKeys = visibleAgentServiceTabs.map((tab) => tab.key);
    setServiceTab((current) => {
      if (!validKeys.includes(current) || current === 'InProgress') {
        return resolveDefaultServiceStatusTab(visibleAgentServiceTabs, {
          prefer: scope === 'me' ? preferMeServiceTab : 'AllTickets',
        });
      }
      return current;
    });
  }, [refexWorkflow, visibleAgentServiceTabs, scope, preferMeServiceTab]);

  useEffect(() => {
    if (!refexWorkflow) return;
    setServiceTab((current) => {
      const visibleKeys = new Set(visibleAgentServiceTabs.map((tab) => tab.key));
      if (visibleKeys.has(current)) return current;
      return resolveDefaultServiceStatusTab(visibleAgentServiceTabs, {
        prefer: scope === 'me' ? preferMeServiceTab : 'AllTickets',
      });
    });
  }, [scope, refexWorkflow, visibleAgentServiceTabs, preferMeServiceTab]);

  // Due → All Tickets so Due-only open+breached set is visible without other tab filters.
  useEffect(() => {
    if (!dueOnly || !refexWorkflow || activeQueue !== 'ServiceQueue') return;
    setServiceTab('AllTickets');
  }, [dueOnly, refexWorkflow, activeQueue]);

  const loadDashboard = useCallback(async ({ silent = false, background = false, force = false, isStale = null } = {}) => {
    // Avoid a mock-first render when embedded SDK is still initializing.
    if (kfInstance && !kfInstance?.api && !sdkReady) return { didLoad: false };
    if (!sdkReady && !lastLoadedKeyRef.current) {
      return { didLoad: false };
    }

    const loadKey = `${user?._id || user?.Id || ''}|${user?.Email || ''}|${entityTab || ''}`;
    const hardRefresh = Boolean(force) || (
      Boolean(lastLoadedKeyRef.current) && lastLoadedKeyRef.current !== loadKey
    );
    const softRefresh = Boolean(silent || background) && !hardRefresh;
    if (!hardRefresh && !softRefresh && lastLoadedKeyRef.current === loadKey) {
      if (!isStale?.()) {
        setLoading(false);
        setRefreshing(false);
        setDatasetReady(true);
      }
      return { didLoad: true };
    }

    const reportFilters = {
      // Agent Revisions load nested IT__Agent_Solution on expand — skip N+1 report enrich.
      skipEnrich: true,
      ...(isExtrovisService && isExtrovisReportEntity(entityTab) ? { entity: entityTab } : {}),
    };
    const applyEntityScope = (rows) => (
      isExtrovisService && isExtrovisReportEntity(entityTab)
        ? filterRowsByEntityKey(rows || [], entityTab)
        : (rows || [])
    );

    if (!silent && !background) {
      setLoading(true);
      setServerPage(1);
    } else if (!background) {
      setRefreshing(true);
      setServerPage(1);
    }
    setLoadError('');

    try {
      if (kfInstance?.api) {
        if (isRefexServiceDashboardContext() || isExtrovisService) {
          // Same flow as Refex — Me landing only; no Main Report on initial paint.
          setConnected(true);
          setFromMyTasksApi(true);
          setHasMoreService(false);
          setUserName(kfInstance?.user?.Name || '');

          const gen = ++datasetGenRef.current;

          // Soft refresh — delta report only, keep UI + IndexedDB.
          // My Team must not soft-merge: deltas miss rows already on page_size=500.
          const teamNeedsFull = scopeRef.current === 'team';
          if (softRefresh && !teamNeedsFull) {
            try {
              const rows = await ensureRefexMappedDataset('techSupport', kfInstance, user, {
                forceRefresh: false,
                softRefresh: true,
                reportFilters,
                useAdminItemDataset,
              });
              if (isStale?.() || gen !== datasetGenRef.current) return;
              if (Array.isArray(rows) && rows.length) setServiceRows(applyEntityScope(rows));
              setDatasetReady(true);
              setLastUpdatedAt(new Date());
            } catch (softErr) {
              console.warn('Agent soft refresh failed:', softErr?.message || softErr);
            }
            if (!isStale?.()) {
              setLoading(false);
              setRefreshing(false);
              lastLoadedKeyRef.current = loadKey;
            }
            return { didLoad: true };
          }

          if (force || (softRefresh && teamNeedsFull)) {
            invalidateRefexMappedDataset('techSupport', kfInstance, user, {
              clearPersistent: true,
              reportFilters,
            });
            try {
              const seedRows = await fetchRefexTechSupportMyTaskSeed(kfInstance, user, { force: true })
                .catch(() => []);
              if (!(isStale?.() || gen !== datasetGenRef.current) && seedRows.length) {
                setServiceRows(applyEntityScope(seedRows));
                setDatasetReady(true);
              }
              const rows = await ensureRefexMappedDataset('techSupport', kfInstance, user, {
                forceRefresh: true,
                softRefresh: false,
                reportFilters,
                useAdminItemDataset,
              });
              if (isStale?.() || gen !== datasetGenRef.current) return { didLoad: true };
              const next = applyEntityScope(
                (Array.isArray(rows) && rows.length) ? rows : seedRows,
              );
              if (next.length) {
                setServiceRows((prev) => (
                  next.length >= (prev?.length || 0)
                    ? next
                    : mergeTechSupportLandingRows(prev, next)
                ));
              }
              setDatasetReady(true);
              setLastUpdatedAt(new Date());
            } catch (forceErr) {
              console.warn('Agent force refresh failed:', forceErr?.message || forceErr);
              setLoadError(forceErr?.message || 'Refresh failed');
            }
            if (isExtrovisService) {
              fetchITAgentDashboardData(kfInstance, 1, IT_DASHBOARD_SERVER_PAGE_SIZE, { skipServiceFetch: true })
                .then((crResult) => {
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  const mappedCr = (crResult.changeItems || [])
                    .map(mapChangeRequestRow)
                    .filter((row) => shouldIncludeAgentCrRow(row, user));
                  setCrRows(mappedCr);
                  setLiveCrIds(crResult.liveCrIds instanceof Set ? crResult.liveCrIds : new Set());
                  setHasMoreChange(crResult.hasMoreChange ?? false);
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

          if (hardRefresh) {
            invalidateRefexMappedDataset('techSupport', kfInstance, user, {
              clearPersistent: false,
              reportFilters,
            });
          }

          const cached = !force
            ? getCachedRefexMappedRows('techSupport', kfInstance, user, reportFilters)
            : null;

          // Instant paint from session cache when available.
          if (cached?.length) {
            setServiceRows(applyEntityScope(cached));
            setDatasetReady(true);
            if (!silent) setLoading(false);
          }

          let hadClosedCache = Boolean(cached?.length);

          // Change Request queue — defer on Extrovis so Me landing is not blocked.
          if (isExtrovisService) {
            const loadCr = () => {
              fetchITAgentDashboardData(kfInstance, 1, IT_DASHBOARD_SERVER_PAGE_SIZE, { skipServiceFetch: true })
                .then((crResult) => {
                  if (isStale?.() || gen !== datasetGenRef.current) return;
                  const mappedCr = (crResult.changeItems || [])
                    .map(mapChangeRequestRow)
                    .filter((row) => shouldIncludeAgentCrRow(row, user));
                  setCrRows(mappedCr);
                  setLiveCrIds(crResult.liveCrIds instanceof Set ? crResult.liveCrIds : new Set());
                  setHasMoreChange(crResult.hasMoreChange ?? false);
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
            setCrRows([]);
            setLiveCrIds(new Set());
            setHasMoreChange(false);
          }

          // Landing: IndexedDB Closed + live pending seed in parallel. Do not await
          // completed/admin on first paint — Closed is restored from cache on return.
          if (!cached?.length) {
            try {
              const hydratePromise = force
                ? Promise.resolve(null)
                : hydrateRefexTechSupportFromPersistentCache(kfInstance, user, reportFilters)
                  .catch(() => null);
              const seedPromise = fetchRefexTechSupportMyTaskSeed(kfInstance, user, {
                force: Boolean(force),
              }).catch((seedErr) => {
                console.warn('Tech support My Task seed failed:', seedErr?.message || seedErr);
                return [];
              });
              const [hydrated, seedRows] = await Promise.all([hydratePromise, seedPromise]);
              if (isStale?.() || gen !== datasetGenRef.current) return;
              hadClosedCache = Boolean(hydrated?.length);
              const landing = mergeTechSupportLandingRows(hydrated, seedRows);
              if (landing.length) {
                setServiceRows(applyEntityScope(landing));
                if (hydrated?.length) {
                  setCachedRefexMappedRows('techSupport', kfInstance, user, landing, reportFilters);
                }
              }
              setDatasetReady(true);
              if (!silent) setLoading(false);
            } catch (seedErr) {
              console.warn('Tech support landing failed:', seedErr?.message || seedErr);
              setDatasetReady(true);
              if (!silent) setLoading(false);
            }
          }

          // Background enrich — defer so Me landing paints first (especially Extrovis).
          scheduleRefexMappedDatasetLoad('techSupport', kfInstance, user, {
            forceRefresh: Boolean(force),
            delayMs: hadClosedCache ? 800 : (isExtrovisService ? 1800 : 1200),
            onReady: (rows) => {
              if (isStale?.() || gen !== datasetGenRef.current) return;
              if (Array.isArray(rows) && rows.length) {
                const next = applyEntityScope(rows);
                setServiceRows((prev) => (
                  next.length >= (prev?.length || 0)
                    ? next
                    : mergeTechSupportLandingRows(prev, next)
                ));
              }
              setDatasetReady(true);
              setLastUpdatedAt(new Date());
            },
            loadFn: () => ensureRefexMappedDataset('techSupport', kfInstance, user, {
              forceRefresh: Boolean(force),
              softRefresh: hadClosedCache && !force,
              reportFilters,
              useAdminItemDataset,
            }),
          });
        } else {
        const result = await fetchITAgentDashboardData(kfInstance, 1, IT_DASHBOARD_SERVER_PAGE_SIZE);
        if (isStale?.()) return;
        setConnected(true);
        setFromMyTasksApi(result.fromMyTasksApi);
        let mappedService = (result.serviceItems || []).map(mapReportRow);
        const mappedCr = (result.changeItems || []).map(mapChangeRequestRow).filter((row) => shouldIncludeAgentCrRow(row, user));
        mappedService = filterEntityScopedRows(mappedService, { kind: 'service' });
        setServiceRows(mappedService);
        setCrRows(mappedCr);
        setLiveCrIds(result.liveCrIds instanceof Set ? result.liveCrIds : new Set());
        setHasMoreService(result.hasMoreService ?? false);
        setHasMoreChange(result.hasMoreChange ?? false);
        setUserName(kfInstance?.user?.Name || '');
        setDatasetReady(true);
        }
      } else {
        if (isStale?.()) return;
        setConnected(false);
        const previewUser = user || { Email: 'mohamedaasik.m@refex.co.in', _id: 'UsDYHFU4f3ES' };
        setServiceRows(filterEntityScopedRows((MOCK_IT_AGENT_TASKS.Data || []).map(mapReportRow), { kind: 'service' }));
        setCrRows((MOCK_IT_CHANGE_REQUEST.Data || []).map(mapChangeRequestRow).filter((row) => shouldIncludeAgentCrRow(row, previewUser)));
        setLiveCrIds(new Set());
        setUserName('IT Agent');
        setDatasetReady(true);
      }
    } catch (e) {
      if (isStale?.()) return;
      setServiceRows([]);
      setCrRows([]);
      setLiveCrIds(new Set());
      setLoadError(e?.message || 'Failed to load IT agent dashboard');
      setDatasetReady(true);
    } finally {
      if (isStale?.()) return;
      setLoading(false);
      setRefreshing(false);
      setLastUpdatedAt(new Date());
      // Never force-reset the active queue during refresh.
      // This was causing visible flicker (queue switch + filter/search reset) on silent reloads.
      if (!silent && !background) setActiveQueue('ServiceQueue');
      lastLoadedKeyRef.current = loadKey;
    }
    return { didLoad: true };
  }, [kfInstance, user, sdkReady, entityTab, isExtrovisService, useAdminItemDataset]);

  const { requestRefresh } = useITDashboardSilentRefresh(kfInstance, loadDashboard, [sdkReady, entityTab]);
  const applyEditedRow = useCallback((row) => {
    if (!row?.id) return;
    setServiceRows((prev) => mergeDashboardRowsById(prev, [row]));
  }, []);
  const { getEditRecordCellProps } = useITEditRecordRefreshBindings(kfInstance, requestRefresh, applyEditedRow);

  useEffect(() => { setExpandedRowId(null); setDialogRowId(null); setSearch(''); }, [activeQueue, serviceTab, crTab, scope, entityTab]);

  useEffect(() => {
    if (isRefexService && activeQueue !== 'ServiceQueue') {
      setActiveQueue('ServiceQueue');
    }
  }, [isRefexService, activeQueue]);

  // My Team: full report rebuild (not soft delta). Soft IndexedDB deltas often miss
  // brand-new rows that already appear in process-report page_size=500.
  // Bump datasetGenRef so an in-flight Me soft/background load cannot overwrite Team.
  useEffect(() => {
    if (!refexWorkflow || scope !== 'team' || !kfInstance?.api) return;
    let cancelled = false;
    const gen = ++datasetGenRef.current;
    (async () => {
      setTeamDatasetLoading(true);
      try {
        clearRequestIdReportCache();
        const reportFilters = {
          skipEnrich: true,
          ...(isExtrovisService && isExtrovisReportEntity(entityTab) ? { entity: entityTab } : {}),
        };
        invalidateRefexMappedDataset('techSupport', kfInstance, user, {
          clearPersistent: true,
          reportFilters,
        });
        const rows = await ensureRefexMappedDataset('techSupport', kfInstance, user, {
          forceRefresh: true,
          softRefresh: false,
          reportFilters,
          useAdminItemDataset,
        });
        if (cancelled || gen !== datasetGenRef.current) return;
        const scoped = isExtrovisService && isExtrovisReportEntity(entityTab)
          ? filterRowsByEntityKey(rows || [], entityTab)
          : (rows || []);
        setServiceRows(scoped);
        setDatasetReady(true);
        setLastUpdatedAt(new Date());
      } catch (err) {
        console.warn('My Team dataset ensure failed:', err?.message || err);
      } finally {
        if (!cancelled) setTeamDatasetLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scope, refexWorkflow, isExtrovisService, entityTab, kfInstance, user]);

  const isServiceQueue = activeQueue === 'ServiceQueue';
  const activeSubTab = isServiceQueue ? serviceTab : crTab;

  const serviceRowsSorted = useMemo(() => sortDashboardRowsByNewest(serviceRows), [serviceRows]);
  const displayServiceRows = useMemo(
    () => {
      const periodRows = applyPeriod(serviceRowsSorted);
      // Current week/month/FY only — keep live Open outside the date range.
      // Past FY must stay strict (no live re-inject of today's open tickets).
      const withLiveMine = (() => {
        if (!adaptivePeriod || !refexWorkflow || dueOnly) return periodRows;
        if (!dashboardDateRangeIncludesToday(periodRange)) return periodRows;
        const kept = new Set(periodRows.map((row) => row.id).filter(Boolean));
        const extras = serviceRowsSorted.filter((row) => {
          if (!row?.id || kept.has(row.id)) return false;
          // Only live Open work outside the period — never re-inject all Me Closed
          // / reopen (that made prior FY show today's Closed rows).
          if (scope === 'me') {
            if (!isLiveBucketPendingRow(row)) return false;
            if (isITTechReopenStep(row) || isEmployeeApprovalRefexStep(row) || row.isLiveReopenPending) {
              return false;
            }
            return matchesRefexMonitoringServiceTab(row, 'OpenTickets', user, 'me');
          }
          if (!user || matchesRefexMeOnlyScope(row, user, { role: 'agent' })) return false;
          // Today-created still in flight — keep even if Weekly/Monthly excludes them.
          if (
            isDashboardRowCreatedToday(row)
            && !isRefexServiceClosedTicket(row)
            && !isRefexServiceProcessCompleted(row)
            && !isITTechReopenStep(row)
            && !isEmployeeApprovalRefexStep(row)
          ) return true;
          if (matchesRefexMonitoringServiceTab(row, 'OpenTickets', user, 'team')) return true;
          return isRefexServiceOpenTicket(row) && getDashboardRowDateMs(row) == null;
        });
        return extras.length ? [...periodRows, ...extras] : periodRows;
      })();
      if (scope === 'team') {
        if (!refexWorkflow) return withLiveMine;
        if (!user) return withLiveMine;
        // My Team — all except the signed-in user's Me tasks.
        return withLiveMine.filter((row) => matchesRefexServiceTeamScope(row, user, { role: 'agent' }));
      }
      if (!refexWorkflow) return withLiveMine;
      if (!user) return withLiveMine;
      // Me — live bucket + Closed By (same as published live Agent pack).
      return withLiveMine.filter((row) => matchesRefexMeOnlyScope(row, user, { role: 'agent' }));
    },
    [applyPeriod, adaptivePeriod, dueOnly, periodRange, serviceRowsSorted, refexWorkflow, scope, user],
  );
  const displayCrRows = useMemo(
    () => {
      const periodRows = applyPeriod(crRows);
      if (!refexWorkflow || !isExtrovisService) return scope === 'team' ? [] : periodRows;
      if (scope === 'team') {
        if (!user) return periodRows;
        return periodRows.filter((row) => !matchesDashboardMeScope(row, user));
      }
      return periodRows.filter((row) => matchesDashboardMeScope(row, user));
    },
    [applyPeriod, crRows, refexWorkflow, isExtrovisService, scope, user],
  );

  const serviceKpis = useMemo(() => computeAgentServiceKpisFromRows(displayServiceRows, user), [displayServiceRows, user]);
  const crKpis = useMemo(() => computeAgentCrKpisFromRows(displayCrRows), [displayCrRows]);
  const serviceSlaKpis = useMemo(() => computeSlaKpisFromRows(displayServiceRows), [displayServiceRows]);
  const crSlaKpis = useMemo(() => computeSlaKpisFromRows(displayCrRows), [displayCrRows]);

  const serviceCategoryData = useMemo(
    () => computeCategoryBreakdown(displayServiceRows),
    [displayServiceRows],
  );
  const servicePriorityData = useMemo(
    () => computeAgentPriorityBreakdown(displayServiceRows, user),
    [displayServiceRows, user],
  );
  const crCategoryData = useMemo(() => computeChangeTypeBreakdown(displayCrRows), [displayCrRows]);
  const crPriorityData = useMemo(() => computeCrCriticalityBreakdown(displayCrRows), [displayCrRows]);

  const serviceTabCounts = useMemo(() => {
    const counts = {};
    visibleAgentServiceTabs.forEach((tab) => {
      counts[tab.key] = displayServiceRows.filter((r) => matchServiceQueueTab(r, tab.key)).length;
    });
    return counts;
  }, [displayServiceRows, visibleAgentServiceTabs, matchServiceQueueTab]);

  // Today snapshot — Me/Team scope without Weekly/Monthly/FY period filter.
  const todayScopeServiceRows = useMemo(() => {
    if (!adaptivePeriod || !refexWorkflow || !isServiceQueue) return [];
    if (scope === 'team') {
      if (!user) return serviceRowsSorted;
      return serviceRowsSorted.filter((row) => matchesRefexServiceTeamScope(row, user, { role: 'agent' }));
    }
    return serviceRowsSorted.filter((row) => matchesRefexMeOnlyScope(row, user, { role: 'agent' }));
  }, [adaptivePeriod, refexWorkflow, isServiceQueue, scope, user, serviceRowsSorted]);

  const isTodaySnapshotTab = adaptivePeriod && (
    serviceTab === 'TodayOpen'
    || serviceTab === 'TodayClosed'
    || serviceTab === 'TodaySlaBreached'
  );

  const crTabCounts = useMemo(() => {
    const counts = {};
    AGENT_CR_TABS.forEach((tab) => { counts[tab.key] = displayCrRows.filter((r) => matchesAgentCrStatusTab(r, tab.key)).length; });
    return counts;
  }, [displayCrRows]);

  const queuePendingCounts = useMemo(
    () => computeUserQueuePendingCounts({
      kind: 'agent',
      serviceRows: displayServiceRows,
      crRows: displayCrRows,
      user,
      liveCrInstanceIds: liveCrIds,
    }),
    [displayServiceRows, displayCrRows, user, liveCrIds],
  );

  const serviceRowsForActiveTab = isTodaySnapshotTab ? todayScopeServiceRows : displayServiceRows;

  const tabScopedRows = useMemo(() => (
    isServiceQueue
      ? serviceRowsForActiveTab.filter((r) => matchServiceQueueTab(r, serviceTab))
      : displayCrRows.filter((r) => matchesAgentCrStatusTab(r, crTab))
  ), [isServiceQueue, serviceRowsForActiveTab, displayCrRows, serviceTab, crTab, matchServiceQueueTab]);

  const misFilterResetKey = `${activeQueue}-${activeSubTab}-${scope}`;
  const resolveTicketStatus = useCallback((row) => getMisTicketStatus(row), []);
  const misFilters = useMisTableFilters(tabScopedRows, misFilterResetKey, {
    categoryField: isServiceQueue ? 'category' : 'changeType',
    resolveTicketStatus: refexWorkflow && isServiceQueue ? resolveTicketStatus : null,
  });
  const headerCompanyOptions = useMemo(
    () => REFEX_COMPANY_NAME_OPTIONS.map((opt) => ({
      value: opt.key,
      label: opt.label,
    })),
    [],
  );

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

  const filteredTasks = useMemo(() => (
    isServiceQueue
      ? applyAgentFilters(
        isTodaySnapshotTab ? todayMisScopedServiceRows : displayServiceRows,
        { search, statusTab: serviceTab, user, scope, sortOrder, entityTab, ...misFilters.params },
      )
      : applyAgentCrFilters(displayCrRows, { search, statusTab: crTab, ...misFilters.params })
  ), [
    isServiceQueue,
    isTodaySnapshotTab,
    todayMisScopedServiceRows,
    displayServiceRows,
    displayCrRows,
    search,
    serviceTab,
    crTab,
    user,
    scope,
    sortOrder,
    entityTab,
    misFilters.params,
  ]);

  const {
    page,
    setPage,
    totalPages,
    totalItems,
    pagedItems,
    rangeStart,
    rangeEnd,
  } = useITListPagination(filteredTasks, [activeQueue, serviceTab, crTab, search, scope, misFilters.category, misFilters.criticality, periodKey]);

  const hasMoreOnServer = isServiceQueue ? hasMoreService : hasMoreChange;
  const loadedQueueTotal = isServiceQueue ? serviceRows.length : crRows.length;

  const loadMore = useCallback(async () => {
    if (!kfInstance?.api || loadingMore || !hasMoreOnServer) return;
    if (isRefexServiceDashboardContext()) return;
    setLoadingMore(true);
    try {
      const nextPage = serverPage + 1;
      // Extrovis service rows come from the shared dataset — page CR only.
      const result = await fetchITAgentDashboardData(
        kfInstance, nextPage, IT_DASHBOARD_SERVER_PAGE_SIZE,
        isExtrovisService ? { skipServiceFetch: true } : {},
      );
      if (!isExtrovisService) {
        setServiceRows((prev) => mergeDashboardRowsById(
          prev,
          filterEntityScopedRows((result.serviceItems || []).map(mapReportRow), { kind: 'service' }),
        ));
      }
      setCrRows((prev) => mergeDashboardRowsById(
        prev,
        (result.changeItems || []).map(mapChangeRequestRow).filter((row) => shouldIncludeAgentCrRow(row, user)),
      ));
      if (result.liveCrIds instanceof Set) {
        setLiveCrIds((prev) => new Set([...prev, ...result.liveCrIds]));
      }
      setServerPage(nextPage);
      if (!isExtrovisService) setHasMoreService(result.hasMoreService ?? false);
      setHasMoreChange(result.hasMoreChange ?? false);
    } catch (e) {
      setLoadError(e?.message || 'Failed to load more records');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreOnServer, kfInstance, loadingMore, serverPage, user, isExtrovisService, entityTab]);

  const showActionsColumn = isServiceQueue
    ? refexWorkflow
      ? false
      : ['PendingTask', 'HoldTasks', 'OpenTickets'].includes(serviceTab)
    : crTab === 'Implementation';

  const scopedRowsForInsight = isServiceQueue ? displayServiceRows : displayCrRows;
  const insightMetrics = useMemo(() => ({
    totalInScope: scopedRowsForInsight.length,
    activePipeline: isServiceQueue
      ? refexWorkflow
        ? (scope === 'team'
          ? (serviceTabCounts.OpenTickets ?? 0)
          : (serviceTabCounts.AssignedToMe ?? 0)
            + (serviceTabCounts.OpenTickets ?? 0)
            + (serviceTabCounts.Reopened ?? 0))
        : visibleAgentServiceTabs
          .filter((tab) => !['Resolved', 'Cancelled'].includes(tab.key))
          .reduce((sum, tab) => sum + (serviceTabCounts[tab.key] ?? 0), 0)
      : (crTabCounts.InApproval ?? 0) + (crTabCounts.Implementation ?? 0),
    criticalHighCount: countCriticalHighPriorityRows(scopedRowsForInsight),
  }), [isServiceQueue, refexWorkflow, scope, scopedRowsForInsight, visibleAgentServiceTabs, serviceTabCounts, crTabCounts, isExtrovisService]);

  const refexCenterMetrics = useMemo(() => {
    if (!isServiceQueue) {
      if (!isExtrovisService) return null;
      // Change Request queue — same clickable KPI card pattern as the service queue.
      return {
        role: 'crQueue',
        crCards: AGENT_CR_TABS.map((tab) => ({
          label: tab.label,
          filterKey: tab.key,
          value: crTabCounts[tab.key] ?? 0,
        })),
      };
    }
    if (!refexWorkflow) return null;
    const slaSplit = countServiceSlaKpiSplit(scopedRowsForInsight, matchServiceQueueTab);
    const slaOpen = slaSplit.slaBreachedOpen;
    const slaClosed = slaSplit.slaBreachedClosed;
    if (scope === 'team') {
      // Extrovis team: no Pending Approval card.
      if (isExtrovisService) {
        return {
          role: 'techSupport',
          scope,
          totalTickets: scopedRowsForInsight.length,
          openTickets: serviceTabCounts.OpenTickets ?? 0,
          myTasks: serviceTabCounts.AssignedToMe ?? 0,
          closedTickets: serviceTabCounts.Closed ?? 0,
          slaBreached: slaSplit.slaBreached,
          slaBreachedOpen: slaOpen,
          slaBreachedClosed: slaClosed,
          reopened: serviceTabCounts.Reopened ?? 0,
          mergeMyTicketsIntoOpen: false,
        };
      }
      return {
        role: 'monitoring',
        scope,
        totalTickets: scopedRowsForInsight.length,
        openTickets: refexWorkflow ? (serviceTabCounts.OpenTickets ?? 0) : null,
        myTasks: serviceTabCounts.AssignedToMe ?? 0,
        activeTickets: 0,
        closedTickets: serviceTabCounts.Closed ?? 0,
        slaBreached: slaSplit.slaBreached,
        slaBreachedOpen: slaOpen,
        slaBreachedClosed: slaClosed,
        reopened: serviceTabCounts.Reopened ?? 0,
      };
    }
    return {
      role: 'techSupport',
      scope,
      totalTickets: scopedRowsForInsight.length,
      openTickets: refexWorkflow ? (serviceTabCounts.OpenTickets ?? 0) : null,
      myTasks: serviceTabCounts.AssignedToMe ?? 0,
      closedTickets: serviceTabCounts.Closed ?? 0,
      slaBreached: slaSplit.slaBreached,
      slaBreachedOpen: slaOpen,
      slaBreachedClosed: slaClosed,
      reopened: serviceTabCounts.Reopened ?? 0,
      mergeMyTicketsIntoOpen: isRefexService,
    };
  }, [refexWorkflow, isExtrovisService, isServiceQueue, scope, serviceTabCounts, crTabCounts, scopedRowsForInsight, matchServiceQueueTab]);

  const useModernMisColumns = isRefexService || isExtrovisService;
  const tableColumns = useMemo(
    () => withTableActionsColumn(
      isServiceQueue
        ? useModernMisColumns
          ? getRefexServiceQueueMisColumns(serviceTab, {
            role: 'techSupport',
            includeAction: showActionsColumn,
          })
          : getServiceTableColumns({
            isCompletedTab: serviceTab === 'Resolved' || serviceTab === 'Cancelled' || serviceTab === 'Closed',
            isOpenQueueTab: serviceTab === 'OpenTickets',
            isRefexService: false,
          })
        : getCrTableColumns({ isCompletedTab: crTab === 'Completed' }),
      showActionsColumn,
    ),
    [isServiceQueue, serviceTab, crTab, showActionsColumn, isRefexService, useModernMisColumns],
  );

  const showSlaInExpand = isServiceQueue
    ? serviceTab === 'Resolved' || serviceTab === 'Cancelled' || serviceTab === 'Closed'
    : crTab === 'Completed';

  const dialogRow = useMemo(
    () => (dialogRowId ? filteredTasks.find((r) => r.id === dialogRowId) : null),
    [dialogRowId, filteredTasks],
  );

  const reassignRow = useMemo(
    () => (reassignRowId ? serviceRows.find((r) => r.id === reassignRowId) : null),
    [reassignRowId, serviceRows],
  );

  const loadServiceStatusOptions = useCallback(async (row) => {
    if (!row?.id) return;
    setLoadingStatusOptionsRowId(row.id);
    try {
      const latest = serviceRows.find((r) => r.id === row.id) || row;
      const options = kfInstance?.api
        ? await fetchITAgentItemStatusOptions(kfInstance, latest)
        : filterAgentItemStatusOptions(latest, AGENT_UPDATE_STATUS_ALIASES);
      setItemStatusOptionsByRow((prev) => ({ ...prev, [row.id]: options }));
    } catch {
      const latest = serviceRows.find((r) => r.id === row.id) || row;
      setItemStatusOptionsByRow((prev) => ({
        ...prev,
        [row.id]: filterAgentItemStatusOptions(latest, AGENT_UPDATE_STATUS_ALIASES),
      }));
    } finally {
      setLoadingStatusOptionsRowId((current) => (current === row.id ? '' : current));
    }
  }, [kfInstance, serviceRows]);

  const loadCrFinalStatusOptions = useCallback(async (row) => {
    if (!row?.id) return;
    setLoadingStatusOptionsRowId(row.id);
    try {
      const latest = crRows.find((r) => r.id === row.id) || row;
      const options = kfInstance?.api
        ? await fetchCrImplementationFinalStatusOptions(kfInstance, latest)
        : filterCrImplementationFinalStatusOptions(latest, CR_IMPLEMENTATION_STATUS_OPTIONS);
      setFinalStatusOptionsByRow((prev) => ({ ...prev, [row.id]: options }));
    } catch {
      const latest = crRows.find((r) => r.id === row.id) || row;
      setFinalStatusOptionsByRow((prev) => ({
        ...prev,
        [row.id]: filterCrImplementationFinalStatusOptions(latest, CR_IMPLEMENTATION_STATUS_OPTIONS),
      }));
    } finally {
      setLoadingStatusOptionsRowId((current) => (current === row.id ? '' : current));
    }
  }, [kfInstance, crRows]);

  const prepareRowForAction = (row) => {
    setSubmitErrors((prev) => ({ ...prev, [row.id]: '' }));
    if (isServiceQueue) {
      setServiceForms((prev) => ({ ...prev, [row.id]: prev[row.id] || emptyServiceFormFromRow(row, { isRefexService: refexWorkflow }) }));
      if (kfInstance?.api) {
        hydrateITRowAttachmentsOnly(kfInstance, row).then((h) => {
          if (!h?.id || !Array.isArray(h.attachments) || !h.attachments.length) return;
          setServiceRows((p) => p.map((r) => (r.id === h.id ? { ...r, attachments: h.attachments } : r)));
        }).catch(() => {});
      }
      if (canEditServiceRow(row, serviceTab, user, { isRefexService: refexWorkflow })) {
        if (kfInstance?.api) {
          fetchITAgentActivityInstanceId(kfInstance, row).then((actId) => {
            if (!actId) return;
            setServiceRows((p) => p.map((r) => (r.id === row.id ? {
              ...r,
              activityInstanceId: actId,
              techSupportTaskActivityInstanceId: r.techSupportTaskActivityInstanceId || actId,
            } : r)));
          }).catch(() => {});
        }
        loadServiceStatusOptions(row);
      }
    } else {
      setCrForms((prev) => ({ ...prev, [row.id]: prev[row.id] || emptyCrFormFromRow(row) }));
      if (canEditCrRow(row, crTab, liveCrIds, user)) {
        if (kfInstance?.api) {
          hydrateCrRowFromInstance(kfInstance, row, CR_IMPLEMENTATION_STEP).then((h) => {
            if (h?.id) {
              setCrRows((p) => p.map((r) => (r.id === h.id ? h : r)));
              loadCrFinalStatusOptions(h);
            } else {
              loadCrFinalStatusOptions(row);
            }
          }).catch(() => {
            loadCrFinalStatusOptions(row);
          });
        } else {
          loadCrFinalStatusOptions(row);
        }
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

  const handleAccept = async (row, e) => {
    e?.stopPropagation();
    setSubmittingId(row.id);
    setSubmitErrors((p) => ({ ...p, [row.id]: '' }));
    try {
      await acceptITAgentTicket(kfInstance, serviceRows.find((r) => r.id === row.id) || row);
      setExpandedRowId(null);
      setDialogRowId(null);
      setServiceTab(isRefexService ? 'OpenTickets' : (refexWorkflow ? 'AssignedToMe' : 'PendingTask'));
      requestRefresh();
    } catch (err) {
      setSubmitErrors((p) => ({ ...p, [row.id]: err?.message || 'Accept failed' }));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleResume = async (row, e) => {
    e?.stopPropagation();
    setSubmittingId(row.id);
    setSubmitErrors((p) => ({ ...p, [row.id]: '' }));
    try {
      await resumeITAgentTicket(kfInstance, serviceRows.find((r) => r.id === row.id) || row);
      setExpandedRowId(null);
      setDialogRowId(null);
      setServiceTab(isRefexService ? 'OpenTickets' : (refexWorkflow ? 'AssignedToMe' : 'PendingTask'));
      requestRefresh();
    } catch (err) {
      setSubmitErrors((p) => ({ ...p, [row.id]: err?.message || 'Resume failed' }));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReassign = (row, e) => {
    e?.stopPropagation();
    setReassignRowId(row.id);
  };

  const handleServiceSubmit = async (row) => {
    if (!canEditServiceRow(row, serviceTab, user, { isRefexService: refexWorkflow })) return;
    const form = serviceForms[row.id] || emptyServiceFormFromRow(row, { isRefexService: refexWorkflow });
    const validationError = validateServiceForm(form, { isRefexService: refexWorkflow });
    if (validationError) {
      setSubmitErrors((p) => ({ ...p, [row.id]: validationError }));
      return;
    }
    setSubmittingId(row.id);
    setSubmitErrors((p) => ({ ...p, [row.id]: '' }));
    try {
      const latest = serviceRows.find((r) => r.id === row.id) || row;
      if (refexWorkflow) {
        await submitRefexTechSupportWork(kfInstance, latest, form);
        if (String(form?.status || '').trim().toLowerCase() === 'close') {
          setServiceTab('Closed');
        }
      } else {
        await submitITAgentWork(kfInstance, latest, form);
        if (isAgentPausingStatus(form.itemStatus)) {
          setServiceTab('HoldTasks');
        } else if (isAgentWorkflowSubmitStatus(form.itemStatus)) {
          const token = getCanonicalAgentItemStatusToken(form.itemStatus);
          setServiceTab(token === 'cancelled' ? 'Cancelled' : 'Resolved');
        }
      }
      setExpandedRowId(null);
      setDialogRowId(null);
      requestRefresh();
    } catch (e) {
      setSubmitErrors((p) => ({ ...p, [row.id]: e?.message || 'Submit failed' }));
    } finally { setSubmittingId(null); }
  };

  const handleCrSubmit = async (row) => {
    if (!canEditCrRow(row, crTab, liveCrIds, user)) return;
    const form = {
      ...(crForms[row.id] || emptyCrFormFromRow(row)),
      finalStatus: CR_IMPLEMENTATION_SUBMIT_STATUS,
    };
    if (!String(form.comments || '').trim()) {
      setSubmitErrors((p) => ({ ...p, [row.id]: 'Comments are required before marking as completed' }));
      return;
    }
    setSubmittingId(row.id);
    setSubmitErrors((p) => ({ ...p, [row.id]: '' }));
    try {
      const latestRow = crRows.find((r) => r.id === row.id) || row;
      await submitITChangeRequestImplementation(kfInstance, latestRow, form);
      setExpandedRowId(null);
      setDialogRowId(null);
      requestRefresh();
    } catch (e) {
      setSubmitErrors((p) => ({ ...p, [row.id]: e?.message || 'Submit failed' }));
    } finally { setSubmittingId(null); }
  };

  const renderRowActions = (row) => {
    if (isServiceQueue) {
      if (serviceTab === 'OpenTickets') {
        return (
          <>
            <ITTableIconButton
              label={submittingId === row.id ? 'Accepting ticket…' : 'Accept ticket'}
              icon={UserCheck}
              variant="success"
              disabled={submittingId === row.id}
              onClick={(e) => handleAccept(row, e)}
            />
            <ITTableIconButton
              label="Reassign ticket"
              icon={Users}
              variant="secondary"
              onClick={(e) => handleReassign(row, e)}
            />
          </>
        );
      }
      if (serviceTab === 'HoldTasks' && canResumeServiceRow(row, serviceTab, user)) {
        return (
          <ITTableIconButton
            label={submittingId === row.id ? 'Resuming ticket…' : 'Resume ticket'}
            icon={RefreshCw}
            variant="warning"
            spinning={submittingId === row.id}
            disabled={submittingId === row.id}
            onClick={(e) => handleResume(row, e)}
          />
        );
      }
      if (
        (serviceTab === 'PendingTask' || (refexWorkflow && serviceTab === 'AssignedToMe'))
        && canEditServiceRow(row, serviceTab, user, { isRefexService: refexWorkflow })
      ) {
        return (
          <ITTableIconButton
            label={refexWorkflow ? 'Tech Support action' : 'Update ticket'}
            icon={Send}
            variant="primary"
            onClick={(e) => openActionDialog(row, e)}
          />
        );
      }
      return null;
    }

    if (!canEditCrRow(row, crTab, liveCrIds, user)) return null;
    return (
      <ITTableIconButton
        label="Complete implementation"
        icon={CheckCircle2}
        variant="success"
        onClick={(e) => openActionDialog(row, e)}
      />
    );
  };

  const renderCell = (col, row) => {
    const serviceCanEdit = canShowServiceRecordEditIcon(row, user, {
      dashboard: 'agent',
      tabKey: serviceTab,
    });
    const crCanEdit = canShowCrRecordEditIcon(row, user, {
      dashboard: 'agent',
      tabKey: crTab,
      liveCrIds,
    });

    if (col.key === 'takeAction') {
      return renderTakeActionGroup(
        renderRowActions(row),
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
    if (col.key === 'actions') {
      return renderRowActions(row);
    }
    return isServiceQueue
      ? renderServiceTableCell(col, row, {
        refexLayout: isRefexService || isExtrovisService,
        isCompletedTab: serviceTab === 'Resolved' || serviceTab === 'Cancelled' || serviceTab === 'Closed',
        statusTab: serviceTab,
      })
      : renderCrTableCell(col, row);
  };

  const renderActionCellProps = (col) => (
    isTableInteractionColumn(col) ? { onClick: (e) => e.stopPropagation() } : {}
  );

  const statusTabsForQueue = (isServiceQueue ? visibleAgentServiceTabs : AGENT_CR_TABS).map((tab) => ({
    key: tab.key,
    label: tab.label,
  }));
  const tabCountsForQueue = isServiceQueue ? serviceTabCounts : crTabCounts;
  const slaKpisForQueue = isServiceQueue
    ? { slaAtRisk: serviceKpis.slaAtRisk, slaBreached: serviceKpis.slaBreached }
    : crSlaKpis;
  const healthRows = isServiceQueue ? displayServiceRows : displayCrRows;
  const healthMetrics = useMemo(
    () => computeITSMHealthMetrics(healthRows, { queueType: isServiceQueue ? 'service' : 'cr' }),
    [healthRows, isServiceQueue],
  );
  // const healthMonitorEl = <ITSMHealthMonitor metrics={healthMetrics} />;
  const useCenterDonutLayout = isMisModern && (isRefexService || isExtrovisService);
  const refexLayout = (isRefexService || isExtrovisService) && isMisModern;
  const tableHeadClass = refexLayout ? misModernTableHeadClass : (isMisModern ? misModernTableHeadClass : IT_THEME.tableHead);
  const mobileListClass = isMisModern ? misModernMobileListClass : IT_THEME.mobileList;
  const rowHoverClass = refexLayout ? ' transition hover:bg-slate-50' : (isMisModern ? ' transition-colors hover:bg-slate-50' : '');

  const createMenuOptions = useMemo(() => (
    isExtrovisService
      ? [
        { key: 'service', label: 'Service & Incident', onClick: () => openITCreateTicketPage(kfInstance) },
        { key: 'change', label: 'Change Request', onClick: () => openITAgentCreateChangeRequestPage(kfInstance) },
      ]
      : null
  ), [isExtrovisService, kfInstance]);

  const misFiltersEl = (
    <>
      <ITMisTableFilters
        variant={refexLayout ? 'refex' : 'default'}
        category={misFilters.category}
        onCategoryChange={misFilters.setCategory}
        categoryOptions={misFilters.categoryOptions}
        categoryLabel={isServiceQueue ? 'Category' : 'Change Type'}
        hideCategory={isServiceQueue && refexLayout}
        hideCriticality={isServiceQueue && refexLayout}
        criticality={misFilters.criticality}
        onCriticalityChange={misFilters.setCriticality}
        criticalityOptions={misFilters.criticalityOptions}
        criticalityLabel={isServiceQueue ? (refexLayout ? 'Criticality' : 'Priority') : 'Change Risk'}
        ticketType={misFilters.ticketType}
        onTicketTypeChange={misFilters.setTicketType}
        ticketTypeOptions={misFilters.ticketTypeOptions}
        showTicketType={isServiceQueue && !refexLayout}
        onClear={misFilters.clearFilters}
        hasActive={misFilters.hasActive}
      />
    </>
  );

  const periodFilterElForHeader = periodFilterEl;

  const classicChrome = (
    <>
      <ITDashboardHeader
        roleKey="agent"
        userName={userName}
        subtitle={poolLabel ? `${poolLabel} service pool` : undefined}
        connected={connected}
        loading={loading}
        loadError={loadError}
        onRefresh={() => requestRefresh({ force: true })}
        refreshing={refreshing}
        onCreateTicket={() => openITCreateTicketPage(kfInstance)}
        createTicketLabel="New Service Request"
        userProfile={userProfile}
        lastUpdatedAt={lastUpdatedAt}
        periodFilter={periodFilterElForHeader}
      />
      {isRefexService ? null : (
        <QueueSwitch activeQueue={activeQueue} onChange={setActiveQueue} pendingCounts={queuePendingCounts} />
      )}
      {/* Health Monitor — disabled for now
      {healthMonitorEl}
      */}
      {isServiceQueue ? (
        <ITQueueAnalyticsPanel
          heroTitle="My Tickets"
          heroSubtitle="Assigned service tickets"
          heroTotal={displayServiceRows.length}
          heroStats={[
            { label: 'Open', value: serviceKpis.openTickets },
            { label: 'Pending', value: serviceKpis.pending },
            { label: 'Resolved', value: serviceKpis.resolved },
          ]}
          statusTabs={visibleAgentServiceTabs.map((tab) => ({ key: tab.key, label: tab.label }))}
          tabCounts={serviceTabCounts}
          activeTab={serviceTab}
          onTabChange={setServiceTab}
          categoryTitle="Tasks by Category"
          categorySubtitle="All assigned service tickets"
          categoryData={serviceCategoryData}
          priorityTitle="Active Tickets by Priority"
          prioritySubtitle="Open, pending, and on hold"
          priorityData={servicePriorityData}
          priorityEmptyLabel="No active tasks"
          slaAtRisk={serviceKpis.slaAtRisk}
          slaBreached={serviceKpis.slaBreached}
          loading={loading}
        />
      ) : (
        <ITQueueAnalyticsPanel
          heroTitle="My Change Requests"
          heroSubtitle="Change requests you own or implement"
          heroTotal={displayCrRows.length}
          heroIcon={ITCrHeroIcon}
          heroStats={[
            { label: 'In Approval', value: crKpis.inApproval },
            { label: 'Implementation', value: crKpis.implementation },
            { label: 'Completed', value: crKpis.completed },
          ]}
          statusTabs={AGENT_CR_TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
          tabCounts={crTabCounts}
          activeTab={crTab}
          onTabChange={setCrTab}
          categoryTitle="By Change Type"
          categorySubtitle="Distribution of your change requests"
          categoryData={crCategoryData}
          categoryEmptyLabel="No change request data yet"
          priorityTitle="Active CRs by Risk"
          prioritySubtitle="In approval and implementation"
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
      roleKey="agent"
      compact
      search={{ value: search, onChange: (e) => setSearch(e.target.value) }}
      tabs={(isServiceQueue ? visibleAgentServiceTabs : AGENT_CR_TABS).map((tab) => (
        <ITTabButton
          key={tab.key}
          active={activeSubTab === tab.key}
          label={tab.label}
          count={(isServiceQueue ? serviceTabCounts : crTabCounts)[tab.key] ?? 0}
          onClick={() => (isServiceQueue ? setServiceTab(tab.key) : setCrTab(tab.key))}
        />
      ))}
      filters={misFiltersEl}
    />
  );

  const ClassicTableWrap = isMisModern
    ? ({ children }) => children
    : ({ children }) => (
      <div className="mx-3 mb-4 overflow-hidden rounded-lg border border-gray-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_3px_12px_rgba(15,23,42,0.06)] sm:mx-5">
        <ITDashboardDataSection>
          {classicTableHeader}
          {children}
        </ITDashboardDataSection>
      </div>
    );

  return (
    <>
      <ITMisDualQueuePageChrome
        isMisModern={isMisModern}
        refexLayout={refexLayout}
        classicChrome={classicChrome}
        headerProps={{
          userName,
          roleLabel: resolveItsmHeaderRoleLabel({
            headerRoleLabel,
            pack: 'agent',
            userEmail: user?.Email || user?.email || '',
          }),
          poolLabel: isRefexService ? 'Tech Support Dashboard' : (poolLabel || 'Extrovis'),
          companyName: userProfile.company || userProfile.entity,
          connected,
          loading,
          refreshing,
          loadError,
          onRefresh: () => requestRefresh({ force: true }),
          onCreateTicket: () => openITCreateTicketPage(kfInstance),
          createTicketLabel: 'New',
          createMenuOptions,
          lastUpdatedAt,
          liveClock: refexLayout ? <RefexLiveClockText /> : undefined,
          periodFilter: periodFilterElForHeader,
        }}
        showScopeSwitch={isRefexService || isExtrovisService}
        scope={scope}
        onScopeChange={setScope}
        showQueueSwitch={!isRefexService}
        showEntitySelect={isExtrovisService}
        entityTab={entityTab}
        onEntityChange={setEntityTab}
        entityOptions={EXTROVIS_DASHBOARD_ENTITY_OPTIONS}
        showCompanyFilter={false}
        company={misFilters.company}
        onCompanyChange={misFilters.setCompany}
        companyOptions={headerCompanyOptions}
        activeQueue={activeQueue}
        onQueueChange={setActiveQueue}
        queuePendingCounts={queuePendingCounts}
        insightMetrics={insightMetrics}
        statusTabs={statusTabsForQueue}
        tabCounts={tabCountsForQueue}
        slaKpis={slaKpisForQueue}
        tableTitle={isServiceQueue ? (refexWorkflow ? 'Tech Support queue' : 'Service queue') : 'My change requests'}
        tableSubtitle={isServiceQueue
          ? (refexWorkflow ? 'Assigned service tickets and incidents' : 'Open tickets and assigned service tasks')
          : 'Change requests you own or implement'}
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        filters={misFiltersEl}
        activeTab={activeSubTab}
        onTabChange={(key) => (isServiceQueue ? setServiceTab(key) : setCrTab(key))}
        resultCount={filteredTasks.length}
        searchTerm={search.trim()}
        loading={loading && !serviceRows.length}
        kpiLoading={loading && !serviceRows.length}
        insightLayout={useCenterDonutLayout ? 'center-donut' : 'standard'}
        compactKpiCards
        refexCenterMetrics={refexCenterMetrics}
        todaySnapshotMetrics={todaySnapshotMetrics}
      >
        <ClassicTableWrap>
          <>
          <div className={IT_THEME.tableDesktop}>
            <table className={`w-full text-left text-sm ${refexLayout ? 'min-w-[880px]' : 'min-w-[960px]'}`}>
              <thead className={tableHeadClass}>
                <tr>
                  {tableColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`whitespace-nowrap ${refexLayout ? `${REFEX_TABLE_HEAD_CELL} ${refexStickyHeadClass(col)}` : `px-4 py-3 ${tableInteractionCellClass(col, isMisModern)}`}`}
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
                {loading && pagedItems.length === 0 ? (
                  <ITTableSkeleton colSpan={tableColumns.length} />
                ) : filteredTasks.length === 0 ? (
                  <tr><td colSpan={tableColumns.length} className={refexLayout ? 'p-8' : undefined}><ITEmptyTickets title="No records" subtitle={connected ? 'No matching tasks in this tab' : 'Preview mode — mock data'} /></td></tr>
                ) : (
                  pagedItems.map((row) => {
                    const isExpanded = expandedRowId === row.id;
                    const rowBg = 'bg-white';
                    const serviceCanEdit = canShowServiceRecordEditIcon(row, user, {
                      dashboard: 'agent',
                      tabKey: serviceTab,
                    });
                    const crCanEdit = canShowCrRecordEditIcon(row, user, {
                      dashboard: 'agent',
                      tabKey: crTab,
                      liveCrIds,
                    });
                    const formOpenOptions = {
                      queueType: isServiceQueue ? 'service' : 'cr',
                      ...getEditRecordCellProps(isServiceQueue ? 'service' : 'cr'),
                    };
                    return (
                      <Fragment key={row.id}>
                        <tr
                          onClick={(e) => handleDashboardRowClick(e, kfInstance, row, {
                            canOpenForm: isServiceQueue ? serviceCanEdit : crCanEdit,
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
                              {...renderActionCellProps(col)}
                              className={refexLayout
                                ? `${REFEX_TABLE_CELL_CLASS} ${refexStickyCellClass(col, rowBg)} ${col.key === 'date' ? IT_TYPE.meta : ''}`
                                : `px-4 py-3 ${col.key === 'date' ? IT_THEME.metaText : 'text-[#44546F]'} ${tableInteractionCellClass(col, isMisModern)}`}
                            >
                              {renderCell(col, row)}
                            </td>
                          ))}
                        </tr>
                        {isExpanded ? (
                          <tr>
                            <td colSpan={tableColumns.length} className="p-0">
                              {isServiceQueue ? (
                                <ExpandSafeFrame>
                                <AgentServiceExpandPanel
                                  row={row}
                                  form={serviceForms[row.id] || emptyServiceFormFromRow(row)}
                                  canEdit={canEditServiceRow(row, serviceTab, user, { isRefexService: refexWorkflow })}
                                  showSlaInExpand={showSlaInExpand}
                                  showSubmitForm={false}
                                  serviceTab={serviceTab}
                                  enableServiceComments={enableServiceComments}
                                  submitting={submittingId === row.id}
                                  submitError={submitErrors[row.id]}
                                  itemStatusOptions={itemStatusOptionsByRow[row.id]}
                                  loadingStatusOptions={loadingStatusOptionsRowId === row.id}
                                  onChange={(next) => setServiceForms((p) => ({ ...p, [row.id]: next }))}
                                  onSubmit={() => handleServiceSubmit(row)}
                                />
                                </ExpandSafeFrame>
                              ) : (
                                <CrExpandPanel
                                  row={row}
                                  form={crForms[row.id] || emptyCrFormFromRow(row)}
                                  canEdit={canEditCrRow(row, crTab, liveCrIds, user)}
                                  showSlaInExpand={showSlaInExpand}
                                  showSubmitForm={false}
                                  isCompleted={crTab === 'Completed'}
                                  submitting={submittingId === row.id}
                                  submitError={submitErrors[row.id]}
                                  finalStatusOptions={finalStatusOptionsByRow[row.id]}
                                  loadingStatusOptions={loadingStatusOptionsRowId === row.id}
                                  onChange={(next) => setCrForms((p) => ({ ...p, [row.id]: next }))}
                                  onSubmit={() => handleCrSubmit(row)}
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
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200/60" />) : filteredTasks.length === 0 ? (
              <ITEmptyTickets title="No records" subtitle="No matching tasks" />
            ) : pagedItems.map((row) => {
              const isExpanded = expandedRowId === row.id;
              const isResolvedTab = isServiceQueue
                ? serviceTab === 'Resolved' || serviceTab === 'Cancelled'
                : crTab === 'Completed';
              const showSla = !isResolvedTab;
              const mobileFields = [];
              if (isResolvedTab) {
                mobileFields.push(
                  ...(isServiceQueue ? buildCompletedMobileFields(row) : buildCrCompletedMobileFields(row)),
                );
              } else {
                mobileFields.push(buildSlaMobileField(row), { label: 'Date', value: row.requestedDate });
              }

              let footerAction = null;
              if (isServiceQueue) {
                if (serviceTab === 'OpenTickets') {
                  footerAction = (
                    <div className="flex items-center justify-end gap-1">
                      <ITTableIconButton
                        label={submittingId === row.id ? 'Accepting ticket…' : 'Accept ticket'}
                        icon={UserCheck}
                        variant="success"
                        disabled={submittingId === row.id}
                        spinning={submittingId === row.id}
                        onClick={(e) => handleAccept(row, e)}
                      />
                      <ITTableIconButton
                        label="Reassign ticket"
                        icon={Users}
                        variant="secondary"
                        onClick={(e) => handleReassign(row, e)}
                      />
                    </div>
                  );
                } else if (serviceTab === 'HoldTasks') {
                  footerAction = (
                    <div className="flex items-center justify-end gap-1">
                      <ITTableIconButton
                        label={submittingId === row.id ? 'Resuming ticket…' : 'Resume ticket'}
                        icon={RefreshCw}
                        variant="warning"
                        spinning={submittingId === row.id}
                        disabled={submittingId === row.id}
                        onClick={(e) => handleResume(row, e)}
                      />
                    </div>
                  );
                } else if (serviceTab === 'PendingTask') {
                  footerAction = (
                    <div className="flex items-center justify-end gap-1">
                      <ITTableIconButton
                        label="Update ticket"
                        icon={Send}
                        variant="primary"
                        onClick={(e) => openActionDialog(row, e)}
                      />
                    </div>
                  );
                }
              } else if (canEditCrRow(row, crTab, liveCrIds, user)) {
                footerAction = (
                  <div className="flex items-center justify-end gap-1">
                    <ITTableIconButton
                      label="Complete implementation"
                      icon={CheckCircle2}
                      variant="success"
                      onClick={(e) => openActionDialog(row, e)}
                    />
                  </div>
                );
              }

              return (
                <ITTicketMobileCard
                  key={row.id}
                  expanded={isExpanded}
                  onToggle={() => toggleRow(row)}
                  requestId={formatRequestId(row)}
                  title={row.summary}
                  subtitle={row.itemStatus}
                  badges={(<><ITCriticalityBadge criticality={row.criticality} />{showSla && <ITSlaBadge row={row} />}</>)}
                  fields={mobileFields}
                  footerAction={footerAction}
                >
                  {isServiceQueue ? (
                    <ExpandSafeFrame>
                    <AgentServiceExpandPanel row={row} form={serviceForms[row.id] || emptyServiceFormFromRow(row)} canEdit={canEditServiceRow(row, serviceTab, user, { isRefexService: refexWorkflow })} showSlaInExpand={showSlaInExpand} showSubmitForm={false} serviceTab={serviceTab} enableServiceComments={enableServiceComments} submitting={submittingId === row.id} submitError={submitErrors[row.id]} itemStatusOptions={itemStatusOptionsByRow[row.id]} loadingStatusOptions={loadingStatusOptionsRowId === row.id} onChange={(n) => setServiceForms((p) => ({ ...p, [row.id]: n }))} onSubmit={() => handleServiceSubmit(row)} />
                    </ExpandSafeFrame>
                  ) : (
                    <CrExpandPanel row={row} form={crForms[row.id] || emptyCrFormFromRow(row)} canEdit={canEditCrRow(row, crTab, liveCrIds, user)} showSlaInExpand={showSlaInExpand} showSubmitForm={false} isCompleted={crTab === 'Completed'} submitting={submittingId === row.id} submitError={submitErrors[row.id]} finalStatusOptions={finalStatusOptionsByRow[row.id]} loadingStatusOptions={loadingStatusOptionsRowId === row.id} onChange={(n) => setCrForms((p) => ({ ...p, [row.id]: n }))} onSubmit={() => handleCrSubmit(row)} />
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

          {!isMisModern && !loading && filteredTasks.length > 0 && (
            <ITTableFooter>
              {filteredTasks.length} record{filteredTasks.length === 1 ? '' : 's'} in this tab
              {search.trim() ? ` matching "${search.trim()}"` : ''}
              {misFilters.hasActive ? ' · filters applied' : ''}
              {periodKey !== 'all' ? ` · ${periodKey}` : ''}
              {' · '}
              {loadedQueueTotal} loaded
              {poolLabel && isServiceQueue ? ` · ${poolLabel} pool` : ''}
              {fromMyTasksApi && isServiceQueue ? ' · live' : ''}
            </ITTableFooter>
          )}
          </>
        </ClassicTableWrap>
      </ITMisDualQueuePageChrome>

        <ITDashboardDialog
          open={!!dialogRow && ((isServiceQueue && (
            serviceTab === 'PendingTask'
            || (refexWorkflow && serviceTab === 'AssignedToMe')
            || (isRefexService && serviceTab === 'OpenTickets')
          )) || (!isServiceQueue && crTab === 'Implementation'))}
          onClose={() => setDialogRowId(null)}
          title={isServiceQueue ? (refexWorkflow ? 'Tech Support Action' : 'Update Ticket') : 'Complete Implementation'}
          subtitle={dialogRow ? `${formatRequestId(dialogRow)} · ${dialogRow.summary}` : ''}
        >
          <div className={isMisModern ? itFormPanel('border-0 shadow-none p-0') : undefined}>
            {dialogRow && isServiceQueue && (
              serviceTab === 'PendingTask'
              || (refexWorkflow && serviceTab === 'AssignedToMe')
              || (isRefexService && serviceTab === 'OpenTickets')
            ) && (
              refexWorkflow ? (
                <RefexTechSupportWorkForm
                  form={serviceForms[dialogRow.id] || emptyServiceFormFromRow(dialogRow, { isRefexService: true })}
                  onChange={(next) => setServiceForms((p) => ({ ...p, [dialogRow.id]: next }))}
                  onSubmit={() => handleServiceSubmit(dialogRow)}
                  submitting={submittingId === dialogRow.id}
                  submitError={submitErrors[dialogRow.id]}
                />
              ) : (
              <AgentServiceWorkForm
                row={dialogRow}
                form={serviceForms[dialogRow.id] || emptyServiceFormFromRow(dialogRow)}
                onChange={(next) => setServiceForms((p) => ({ ...p, [dialogRow.id]: next }))}
                onSubmit={() => handleServiceSubmit(dialogRow)}
                submitting={submittingId === dialogRow.id}
                submitError={submitErrors[dialogRow.id]}
                itemStatusOptions={itemStatusOptionsByRow[dialogRow.id]}
                loadingStatusOptions={loadingStatusOptionsRowId === dialogRow.id}
              />
              )
            )}
            {dialogRow && !isServiceQueue && crTab === 'Implementation' && (
              <CrImplementationWorkForm
                row={dialogRow}
                form={crForms[dialogRow.id] || emptyCrFormFromRow(dialogRow)}
                onChange={(next) => setCrForms((p) => ({ ...p, [dialogRow.id]: next }))}
                onSubmit={() => handleCrSubmit(dialogRow)}
                submitting={submittingId === dialogRow.id}
                submitError={submitErrors[dialogRow.id]}
                finalStatusOptions={finalStatusOptionsByRow[dialogRow.id]}
                loadingStatusOptions={loadingStatusOptionsRowId === dialogRow.id}
              />
            )}
          </div>
        </ITDashboardDialog>

        <ITServiceReassignDialog
          open={!!reassignRow}
          onClose={() => setReassignRowId(null)}
          row={reassignRow}
          kfInstance={kfInstance}
          onReassigned={requestRefresh}
        />
    </>
  );
}

export default function ITAgentDashboard({
  poolLabel = '',
  headerRoleLabel = 'IT Agent',
  enableServiceComments = false,
  adaptivePeriod = false,
  showDue = false,
  useAdminItemDataset = false,
} = {}) {
  return (
    <ITAgentDashboardContent
      poolLabel={poolLabel}
      headerRoleLabel={headerRoleLabel}
      enableServiceComments={enableServiceComments}
      adaptivePeriod={adaptivePeriod}
      showDue={showDue}
      useAdminItemDataset={useAdminItemDataset}
    />
  );
}
