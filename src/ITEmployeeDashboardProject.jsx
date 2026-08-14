/* eslint-disable max-lines -- Kissflow IT Employee dashboard */
import { useState, useContext, useEffect, useMemo, useCallback, Fragment } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Inbox, Activity, PauseCircle, CheckCircle2, XCircle, Ticket } from 'lucide-react';
import { KissflowSDKContext } from './sdk/index.js';
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
  ITSlaBadge,
  getSlaTableRowClass,
  useITListPagination,
  ITTablePagination,
  ITMisTableFilters,
  useMisTableFilters,
  ITDashboardLoadingOverlay,
} from './components/it/ITDashboardUI.jsx';
import { ITEmployeeAnalyticsPanel } from './components/it/ITEmployeeAnalytics.jsx';
import ITMisEmployeeExpandPanel from './components/it/mis/ITMisEmployeeExpandPanel.jsx';
import {
  ITMisEmployeeHeader,
  ITMisEmployeeKpiStrip,
  ITMisTableSectionLabel,
  ITMisRequestsTableHeader,
  ITMisSearchBar,
  ITMisStatusTabs,
  ITMisPageBackground,
  ITMisTableCard,
  ITMisResultsCount,
  ITMisMobileTicketCard,
  ITMisKpiStatCard,
  misModernTableHeadClass,
  misModernMobileListClass,
} from './components/it/mis/ITMisEmployeeUI.jsx';
import { buildMisEmployeeInsightKpiCards } from './components/it/mis/buildMisKpiCards.js';
import { MIS_KPI_GRID_CLASS } from './components/it/mis/misKpiLayout.js';
import {
  REFEX_CONTAINER_CLASS,
  REFEX_TABLE_ROW_CLASS,
  REFEX_TABLE_CELL_CLASS,
  REFEX_TABLE_HEAD_CELL,
  RefexDashboardHeader,
  RefexLiveClockText,
  RefexSearchField,
  RefexTablePaginationFooter,
  renderRefexMisTableHeadLabel,
  getRefexServiceMisHeadLabelProps,
  resolveRefexMisTableTitle,
} from './itsm/refex/shared/RefexItsmSharedUI.jsx';
import { getRefexServiceQueueMisColumns } from './itsm/refex/shared/refexServiceQueueColumns.js';
import { IT_KPI_ACCENT, IT_TYPE } from './components/it/itDesignTokens.js';
import {
  getEmployeeTableColumns,
  formatRequestId,
  buildCompletedMobileFields,
  buildEmployeeCompletedMobileFields,
  EmployeeServiceExpandPanel,
  mergeDashboardRowsById,
  renderServiceTableCell,
  isTableInteractionColumn,
  tableInteractionCellClass,
} from './components/it/ITDashboardShared.jsx';
import { useITDashboardPeriodFilter } from './components/it/useITDashboardPeriodFilter.jsx';
import { useITDashboardSilentRefresh } from './components/it/useITDashboardSilentRefresh.js';
import { useITDashboardUi } from './context/ITDashboardUiContext.jsx';
import {
  fetchITEmployeeItems,
  fetchKpiFromVariables,
  mapReportRow,
  isMyItem,
  getActiveDashboardProfile,
  getEmployeeStatusTabs,
  resolveDefaultServiceStatusTab,
  isRefexServiceDashboardContext,
  isExtrovisServiceDashboardContext,
  countCriticalHighPriorityRows,
  applyEmployeeFilters,
  normalizeEmployeeRowForEntityProfile,
  matchesEmployeeStatusTab,
  sortDashboardRowsByNewest,
  isSlaBreached,
  isSlaAtRisk,
  getSlaTiming,
  openITCreateTicketPage,
  IT_DASHBOARD_SERVER_PAGE_SIZE,
  resolveKfUserProfile,
  computeEmployeeCategoryBreakdown,
  computeEmployeePriorityBreakdown,
  computeItsmExtendedKpiMetrics,
} from './lib/kfITServiceDashboard.js';
import { MOCK_IT_REPORT, MOCK_IT_USER } from './mocks/itServiceRequests.js';

function getTableColumns(activeTab) {
  return getEmployeeTableColumns(activeTab);
}

const EMPLOYEE_TAB_LABELS = {
  Open: 'open tickets',
  InProgress: 'in progress tickets',
  Hold: 'on hold tickets',
  Resolved: 'resolved tickets',
  Cancelled: 'cancelled tickets',
};

function ITEmployeeDashboardContent({
  poolLabel = '',
  uiVariant = 'default',
}) {
  const isMisUi = uiVariant === 'mis' || uiVariant === 'mis-modern';
  const isMisModern = uiVariant === 'mis-modern';
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);

  const previewUser = MOCK_IT_USER;
  const liveUser = kfInstance?.user;
  const user = liveUser || previewUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [connected, setConnected] = useState(false);
  const [userName, setUserName] = useState(previewUser.Name);
  const [allRows, setAllRows] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Open');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [fromMyItemsApi, setFromMyItemsApi] = useState(false);
  const [serverPage, setServerPage] = useState(1);
  const [hasMoreOnServer, setHasMoreOnServer] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const userProfile = useMemo(() => resolveKfUserProfile(user), [user]);
  const { applyPeriod, periodFilterEl, periodKey } = useITDashboardPeriodFilter();
  const dashboardProfileId = getActiveDashboardProfile()?.id ?? 'default';
  const isRefexService = isRefexServiceDashboardContext();
  const isExtrovisService = isExtrovisServiceDashboardContext();
  const refexLayout = isMisModern && isExtrovisService;
  const employeeStatusTabs = useMemo(() => getEmployeeStatusTabs(), [dashboardProfileId]);

  useEffect(() => {
    if (!isRefexService) return;
    if (activeTab === 'Open') {
      setActiveTab(resolveDefaultServiceStatusTab(employeeStatusTabs, { prefer: 'InProgress' }));
    }
  }, [isRefexService, employeeStatusTabs, activeTab]);

  const loadDashboard = useCallback(async ({ silent = false, background = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setServerPage(1);
    } else if (!background) {
      setRefreshing(true);
      setServerPage(1);
    }
    setLoadError('');

    try {
      let items = [];
      let usedMyItemsApi = false;
      let hasMore = false;

      if (kfInstance?.api || kfInstance?.app?.getProcess) {
        const result = await fetchITEmployeeItems(kfInstance, 1, IT_DASHBOARD_SERVER_PAGE_SIZE);
        items = result.items || [];
        usedMyItemsApi = result.fromMyItemsApi;
        hasMore = result.hasMore ?? false;
        setConnected(true);
      } else {
        items = MOCK_IT_REPORT.Data || [];
        setConnected(false);
      }

      setFromMyItemsApi(usedMyItemsApi);
      setHasMoreOnServer(hasMore);

      const mapped = items
        .map(mapReportRow)
        .map(normalizeEmployeeRowForEntityProfile)
        .filter((row) => isMyItem(row, user));

      setAllRows(mapped);

      const kpiFromVars = await fetchKpiFromVariables(kfInstance);
      if (kpiFromVars?.userName) {
        setUserName(kpiFromVars.userName);
      } else {
        setUserName(user?.Name || previewUser.Name);
      }
    } catch (e) {
      setAllRows([]);
      setLoadError(e?.message || 'Failed to load IT service requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdatedAt(new Date());
    }
  }, [kfInstance, user, dashboardProfileId]);

  const { requestRefresh } = useITDashboardSilentRefresh(kfInstance, loadDashboard, [sdkReady]);

  const loadMore = useCallback(async () => {
    if (!kfInstance?.api || loadingMore || !hasMoreOnServer) return;
    setLoadingMore(true);
    try {
      const nextPage = serverPage + 1;
      const result = await fetchITEmployeeItems(kfInstance, nextPage, IT_DASHBOARD_SERVER_PAGE_SIZE);
      const mapped = (result.items || [])
        .map(mapReportRow)
        .map(normalizeEmployeeRowForEntityProfile)
        .filter((row) => isMyItem(row, user));
      setAllRows((prev) => mergeDashboardRowsById(prev, mapped));
      setServerPage(nextPage);
      setHasMoreOnServer(result.hasMore ?? false);
    } catch (e) {
      setLoadError(e?.message || 'Failed to load more records');
    } finally {
      setLoadingMore(false);
    }
  }, [kfInstance, hasMoreOnServer, loadingMore, serverPage, user, dashboardProfileId]);


  useEffect(() => {
    setExpandedRowId(null);
  }, [activeTab]);

  const myItems = useMemo(() => sortDashboardRowsByNewest(allRows), [allRows]);
  const periodItems = useMemo(() => applyPeriod(myItems), [applyPeriod, myItems]);
  const isCompletedTab = activeTab === 'Resolved' || activeTab === 'Cancelled';

  const tabCounts = useMemo(() => {
    const counts = {};
    employeeStatusTabs.forEach((tab) => {
      counts[tab.key] = periodItems.filter((row) => matchesEmployeeStatusTab(row, tab.key)).length;
    });
    return counts;
  }, [periodItems, employeeStatusTabs]);

  const employeeExtendedMetrics = useMemo(
    () => computeItsmExtendedKpiMetrics(periodItems, { mode: 'employee', queueType: 'service' }),
    [periodItems],
  );

  const employeeInsightKpis = useMemo(() => buildMisEmployeeInsightKpiCards({
    extendedMetrics: employeeExtendedMetrics,
  }), [employeeExtendedMetrics]);

  const extrovisKpiCards = useMemo(() => {
    if (!refexLayout) return [];
    const palette = [IT_KPI_ACCENT.brand, IT_KPI_ACCENT.violet, IT_KPI_ACCENT.success, IT_KPI_ACCENT.warning, IT_KPI_ACCENT.error, IT_KPI_ACCENT.slate];
    const cards = [
      { label: 'All Tickets', filterKey: 'All', value: periodItems.length, icon: Ticket },
      { label: 'Open Tickets', filterKey: 'Open', value: tabCounts.Open ?? 0, icon: Inbox },
      { label: 'In Progress', filterKey: 'InProgress', value: tabCounts.InProgress ?? 0, icon: Activity },
      { label: 'On Hold', filterKey: 'Hold', value: tabCounts.Hold ?? 0, icon: PauseCircle },
      { label: 'Resolved', filterKey: 'Resolved', value: tabCounts.Resolved ?? 0, icon: CheckCircle2 },
      { label: 'Cancelled', filterKey: 'Cancelled', value: tabCounts.Cancelled ?? 0, icon: XCircle },
    ];
    return cards.map((card, idx) => ({ ...card, ...(palette[idx % palette.length] || {}) }));
  }, [refexLayout, periodItems.length, tabCounts]);

  const displayKpis = useMemo(() => {
    const openCount = tabCounts.Open ?? 0;
    const inProgressCount = tabCounts.InProgress ?? 0;
    const resolvedCount = tabCounts.Resolved ?? 0;
    const cancelledCount = tabCounts.Cancelled ?? 0;
    const holdCount = tabCounts.Hold ?? 0;
    return {
      totalRecords: openCount + inProgressCount + resolvedCount + cancelledCount + holdCount,
      openTickets: isRefexService ? 0 : openCount,
      inProgressTickets: inProgressCount,
      completedRecords: resolvedCount,
      cancelledTickets: cancelledCount,
      slaBreached: periodItems.filter((row) => isSlaBreached(row)).length,
      slaAtRisk: periodItems.filter((row) => isSlaAtRisk(row)).length,
    };
  }, [periodItems, tabCounts, isRefexService]);

  const categoryData = useMemo(
    () => computeEmployeeCategoryBreakdown(periodItems),
    [periodItems],
  );

  const priorityData = useMemo(
    () => computeEmployeePriorityBreakdown(periodItems),
    [periodItems],
  );

  const tabScopedRows = useMemo(
    () => periodItems.filter((row) => matchesEmployeeStatusTab(row, activeTab)),
    [periodItems, activeTab],
  );
  const misFilters = useMisTableFilters(tabScopedRows, activeTab);

  const filteredTasks = useMemo(
    () => applyEmployeeFilters(periodItems, { search, statusTab: activeTab, ...misFilters.params }),
    [periodItems, search, activeTab, misFilters.params],
  );

  const {
    page,
    setPage,
    totalPages,
    totalItems,
    pagedItems,
    rangeStart,
    rangeEnd,
  } = useITListPagination(filteredTasks, [activeTab, search, misFilters.category, misFilters.criticality, periodKey]);

  const tableColumns = useMemo(
    () => (refexLayout ? getRefexServiceQueueMisColumns(activeTab, { role: 'employee' }) : getTableColumns(activeTab)),
    [activeTab, refexLayout],
  );

  const handleRowClick = (row) => {
    setExpandedRowId((prev) => (prev === row.id ? null : row.id));
  };

  const renderCell = (col, row) => {
    if (col.key === 'requestId') {
      return (
        <span className={isMisModern
          ? 'inline-flex rounded-full bg-[#f0fdfa] px-2.5 py-0.5 text-xs font-semibold text-[#047857]'
          : IT_THEME.requestId}
        >
          {formatRequestId(row)}
        </span>
      );
    }
    return renderServiceTableCell(col, row);
  };

  const renderActionCellProps = (col) => (
    isTableInteractionColumn(col) ? { onClick: (e) => e.stopPropagation() } : {}
  );

  const openTicketCount = isRefexService
    ? (tabCounts.InProgress ?? 0)
    : (tabCounts.Open ?? 0) + (tabCounts.InProgress ?? 0);

  const tableHeaderSubtitle = `${filteredTasks.length} ${EMPLOYEE_TAB_LABELS[activeTab] || 'tickets'} · ${displayKpis.slaAtRisk + displayKpis.slaBreached} SLA at risk`;

  const renderExpandPanel = (row) => {
    if (isMisModern) {
      return (
        <ITMisEmployeeExpandPanel
          row={row}
          showSlaInExpand={isCompletedTab}
          showWorkflowHandlers
        />
      );
    }
    return (
      <EmployeeServiceExpandPanel
        row={row}
        showSlaInExpand={isCompletedTab}
        showWorkflowHandlers
      />
    );
  };
  const emptySubtitle = connected
    ? `No ${EMPLOYEE_TAB_LABELS[activeTab] || 'tickets'} for your account`
    : 'Preview shows mock data when SDK is unavailable';

  const refresh = () => requestRefresh();
  const createTicket = () => openITCreateTicketPage(kfInstance);

  const misTableFilters = (
    <ITMisTableFilters
      category={misFilters.category}
      onCategoryChange={misFilters.setCategory}
      categoryOptions={misFilters.categoryOptions}
      criticality={misFilters.criticality}
      onCriticalityChange={misFilters.setCriticality}
      criticalityOptions={misFilters.criticalityOptions}
      ticketType={misFilters.ticketType}
      onTicketTypeChange={misFilters.setTicketType}
      ticketTypeOptions={misFilters.ticketTypeOptions}
      showTicketType
      onClear={misFilters.clearFilters}
      hasActive={misFilters.hasActive}
    />
  );

  const tableHeadClass = isMisModern
    ? misModernTableHeadClass
    : isMisUi
      ? 'bg-gray-200 text-[11px] font-bold uppercase tracking-wide text-slate-700'
      : IT_THEME.tableHead;

  return (
    <>
      {isMisUi ? <ITMisPageBackground modern={isMisModern} /> : <ITDashboardBackground />}
      <ITDashboardLoadingOverlay loading={loading && isMisUi && !refexLayout} />
      <ITDashboardShell shellClassName={isMisUi ? 'bg-transparent' : 'bg-gray-100'}>
        {refexLayout ? (
          <div className={REFEX_CONTAINER_CLASS}>
            <RefexDashboardHeader
              userName={userName}
              subtitle={poolLabel || 'Extrovis'}
              liveClock={<RefexLiveClockText />}
              loading={loading}
              refreshing={refreshing}
              loadError={loadError}
              onRefresh={refresh}
              onCreateTicket={createTicket}
              createTitle="New"
            />
            <section className="mb-4 min-w-0 overflow-x-hidden">
              <div className={`min-w-0 ${MIS_KPI_GRID_CLASS}`}>
                {extrovisKpiCards.map((card, idx) => (
                  <ITMisKpiStatCard
                    key={card.filterKey}
                    {...card}
                    delay={0.04 + idx * 0.03}
                    insightRow
                    loading={loading}
                    active={activeTab === card.filterKey}
                    onClick={() => setActiveTab(card.filterKey)}
                  />
                ))}
              </div>
            </section>
            <ITMisTableCard modern className="mt-4 overflow-visible">
              <div className="relative z-20 border-b border-slate-100 px-3 py-4 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className={IT_TYPE.sectionTitle}>{resolveRefexMisTableTitle(activeTab, 'My Tickets')}</h2>
                    <p className={`mt-0.5 ${IT_TYPE.meta} text-slate-500`}>Your service requests and incidents</p>
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
                    <RefexSearchField value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className={IT_THEME.tableDesktop}>
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className={misModernTableHeadClass}>
                    <tr>
                      {tableColumns.map((col) => (
                        <th key={col.key} className={`whitespace-nowrap ${REFEX_TABLE_HEAD_CELL}`}>
                          {renderRefexMisTableHeadLabel(col, getRefexServiceMisHeadLabelProps({
                            col,
                            misFilters,
                            ticketStatusOptions: [
                              'Open',
                              'In Progress',
                              'On Hold',
                              'Resolved',
                              'Cancelled',
                            ],
                          }))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && pagedItems.length === 0 ? (
                      <ITTableSkeleton colSpan={tableColumns.length} />
                    ) : filteredTasks.length === 0 ? (
                      <tr><td colSpan={tableColumns.length} className="p-8"><ITEmptyTickets title="No records" subtitle={connected ? 'No matching tickets' : 'Preview mode — mock data'} /></td></tr>
                    ) : pagedItems.map((row) => {
                      const isExpanded = expandedRowId === row.id;
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={`group cursor-pointer ${REFEX_TABLE_ROW_CLASS} ${getSlaTableRowClass(row, { expanded: isExpanded })}`}
                            onClick={() => handleRowClick(row)}
                          >
                            {tableColumns.map((col) => (
                              <td key={col.key} className={REFEX_TABLE_CELL_CLASS}>
                                {col.key === 'expand' ? (
                                  isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                ) : renderCell(col, row)}
                              </td>
                            ))}
                          </tr>
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <tr><td colSpan={tableColumns.length} className="p-0">
                                {isMisModern ? (
                                  <ITMisEmployeeExpandPanel row={row} />
                                ) : (
                                  <EmployeeServiceExpandPanel row={row} />
                                )}
                              </td></tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!loading && filteredTasks.length > 0 ? (
                <RefexTablePaginationFooter>
                  <ITTablePagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    onPageChange={setPage}
                    hasMoreOnServer={hasMoreOnServer}
                    loadingMore={loadingMore}
                    onLoadMore={loadMore}
                  />
                </RefexTablePaginationFooter>
              ) : null}
            </ITMisTableCard>
          </div>
        ) : (
        <>
        {isMisUi ? (
          <>
            <ITMisEmployeeHeader
              modern={isMisModern}
              userName={userName}
              poolLabel={poolLabel}
              companyName={userProfile.company || userProfile.entity}
              connected={connected}
              loading={loading}
              refreshing={refreshing}
              loadError={loadError}
              onRefresh={refresh}
              onCreateTicket={createTicket}
              lastUpdatedAt={lastUpdatedAt}
              periodFilter={periodFilterEl}
            />
            <ITMisEmployeeKpiStrip
              modern={isMisModern}
              customCards={employeeInsightKpis}
            />
          </>
        ) : (
          <>
            <ITDashboardHeader
              roleKey="employee"
              userName={userName}
              subtitle={poolLabel ? `${poolLabel} service requests` : undefined}
              connected={connected}
              loading={loading}
              refreshing={refreshing}
              loadError={loadError}
              onRefresh={refresh}
              onCreateTicket={createTicket}
              createTicketLabel="Create"
              userProfile={userProfile}
              lastUpdatedAt={lastUpdatedAt}
              periodFilter={periodFilterEl}
            />
            <ITEmployeeAnalyticsPanel
              kpis={displayKpis}
              tabCounts={tabCounts}
              statusTabs={employeeStatusTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              categoryData={categoryData}
              priorityData={priorityData}
              loading={loading}
              hideOpenTab={isRefexService}
            />
          </>
        )}

        <div className={
          isMisUi
            ? 'px-4 pb-8 sm:px-6'
            : 'mx-3 mb-4 overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_3px_12px_rgba(15,23,42,0.06)] sm:mx-5'
        }>
        <div className={isMisUi ? 'mx-auto max-w-[1400px]' : undefined}>
        <ITDashboardDataSection>
          {isMisUi ? <ITMisTableSectionLabel label="ALL REQUESTS" modern={isMisModern} /> : null}
          <ITMisTableCard
            modern={isMisModern}
            className={
              isMisUi && !isMisModern
                ? 'overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_3px_12px_rgba(15,23,42,0.06)]'
                : undefined
            }
          >
          {isMisUi ? (
            isMisModern ? (
              <>
                <ITMisRequestsTableHeader
                  subtitle={tableHeaderSubtitle}
                  overdueCount={displayKpis.slaAtRisk + displayKpis.slaBreached}
                  filters={misTableFilters}
                />
                <ITMisStatusTabs
                  modern
                  tabs={employeeStatusTabs}
                  tabCounts={tabCounts}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  rightSlot={(
                    <ITMisSearchBar
                      modern
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  )}
                />
                {!loading && (
                  <ITMisResultsCount
                    modern
                    count={filteredTasks.length}
                    searchTerm={search.trim()}
                  />
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center">
                  <ITMisSearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {misTableFilters}
                </div>
                <ITMisStatusTabs
                  tabs={employeeStatusTabs}
                  tabCounts={tabCounts}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
                {!loading && (
                  <ITMisResultsCount
                    count={filteredTasks.length}
                    searchTerm={search.trim()}
                  />
                )}
              </>
            )
          ) : (
            <ITTableSectionHeader
              roleKey="employee"
              compact
              search={{ value: search, onChange: (e) => setSearch(e.target.value) }}
              tabs={employeeStatusTabs.map((tab) => (
                <ITTabButton
                  key={tab.key}
                  active={activeTab === tab.key}
                  label={tab.label}
                  count={tabCounts[tab.key] ?? 0}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
              filters={misTableFilters}
            />
          )}

          <div className={IT_THEME.tableDesktop}>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  {tableColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`whitespace-nowrap px-4 py-3 ${tableInteractionCellClass(col, isMisModern)}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <ITTableSkeleton colSpan={tableColumns.length} />
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length}>
                      <ITEmptyTickets
                        title={`No ${EMPLOYEE_TAB_LABELS[activeTab] || 'tickets'}`}
                        subtitle={emptySubtitle}
                      />
                    </td>
                  </tr>
                ) : (
                  pagedItems.map((row, rowIdx) => {
                    const isExpanded = expandedRowId === row.id;
                    const rowClass = `${IT_THEME.tableRow} ${getSlaTableRowClass(row, { expanded: isExpanded })}${
                      isMisModern ? ' transition-colors hover:bg-slate-50' : ''
                    }`;
                    const rowCells = (
                      <>
                        <td className={`px-3 py-3 ${IT_THEME.chevron}`}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </td>
                        {tableColumns.slice(1).map((col) => (
                          <td
                            key={col.key}
                            {...renderActionCellProps(col)}
                            className={`px-4 py-3 ${col.key === 'date' ? IT_THEME.metaText : 'text-[#44546F]'} ${tableInteractionCellClass(col, isMisModern)}`}
                          >
                            {renderCell(col, row)}
                          </td>
                        ))}
                      </>
                    );
                    return (
                      <Fragment key={row.id}>
                        {isMisModern ? (
                          <motion.tr
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: rowIdx * 0.035, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => handleRowClick(row)}
                            className={rowClass}
                          >
                            {rowCells}
                          </motion.tr>
                        ) : (
                          <tr onClick={() => handleRowClick(row)} className={rowClass}>
                            {rowCells}
                          </tr>
                        )}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr>
                              <td colSpan={tableColumns.length} className="p-0">
                                {renderExpandPanel(row)}
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={isMisModern ? misModernMobileListClass : IT_THEME.mobileList}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200/60" />
              ))
            ) : filteredTasks.length === 0 ? (
              <ITEmptyTickets
                title={`No ${EMPLOYEE_TAB_LABELS[activeTab] || 'tickets'}`}
                subtitle={emptySubtitle}
              />
            ) : (
              pagedItems.map((row, mobileIdx) => {
                const isExpanded = expandedRowId === row.id;
                const mobileFields = [
                  { label: 'Category', value: row.category },
                  { label: 'Sub-category', value: row.subCategory },
                  { label: 'Created', value: row.requestedDate },
                ];
                if (isCompletedTab) {
                  mobileFields.push(...buildEmployeeCompletedMobileFields(row));
                } else if (activeTab === 'InProgress' || activeTab === 'Hold') {
                  const slaTiming = getSlaTiming(row);
                  mobileFields.push(
                    { label: 'SLA', value: slaTiming.hasSla ? slaTiming.shortLabel : '—' },
                    { label: 'Assigned to', value: row.assignedTo },
                  );
                  if (activeTab === 'Hold' && row.holdReason && row.holdReason !== '—') {
                    mobileFields.push({ label: 'Hold reason', value: row.holdReason, multiline: true });
                  }
                } else {
                  const slaTiming = getSlaTiming(row);
                  mobileFields.push(
                    { label: 'SLA', value: slaTiming.hasSla ? slaTiming.shortLabel : '—' },
                  );
                }
                const expandPanel = renderExpandPanel(row);
                const badges = (
                  <>
                    <ITCriticalityBadge criticality={row.criticality} />
                    <ITItemStatusBadge status={row.itemStatus} />
                    {!isCompletedTab && <ITSlaBadge row={row} />}
                  </>
                );

                if (isMisModern) {
                  return (
                    <ITMisMobileTicketCard
                      key={row.id}
                      index={mobileIdx}
                      expanded={isExpanded}
                      onToggle={() => handleRowClick(row)}
                      requestId={formatRequestId(row)}
                      title={row.summary}
                      subtitle={row.ticketType}
                      badges={badges}
                      fields={mobileFields}
                    >
                      {expandPanel}
                    </ITMisMobileTicketCard>
                  );
                }

                return (
                  <ITTicketMobileCard
                    key={row.id}
                    expanded={isExpanded}
                    onToggle={() => handleRowClick(row)}
                    requestId={formatRequestId(row)}
                    title={row.summary}
                    subtitle={row.ticketType}
                    badges={badges}
                    fields={mobileFields}
                  >
                    {expandPanel}
                  </ITTicketMobileCard>
                );
              })
            )}
          </div>

          {!loading && filteredTasks.length > 0 && (
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
              loadedTotal={myItems.length}
            />
          )}

          {!loading && filteredTasks.length > 0 && (
            <ITTableFooter>
              {filteredTasks.length} request{filteredTasks.length === 1 ? '' : 's'} in this tab
              {search.trim() ? ` matching "${search.trim()}"` : ''}
              {misFilters.hasActive ? ' · filters applied' : ''}
              {' · '}
              {myItems.length} loaded
              {fromMyItemsApi ? ' · live' : ''}
            </ITTableFooter>
          )}
          </ITMisTableCard>
        </ITDashboardDataSection>
        </div>
        </div>
        </>
        )}
      </ITDashboardShell>
    </>
  );
}

export default function ITEmployeeDashboardProject({
  poolLabel = '',
  uiVariant: uiVariantProp,
} = {}) {
  const { uiVariant: ctxVariant } = useITDashboardUi();
  const uiVariant = uiVariantProp ?? ctxVariant ?? 'default';
  return (
    <ITEmployeeDashboardContent
      poolLabel={poolLabel}
      uiVariant={uiVariant}
    />
  );
}

export { ITEmployeeDashboardContent };
