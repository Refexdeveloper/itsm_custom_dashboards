/**
 * Conditional page chrome for dual-queue IT dashboards (Agent, Manager, Admin, Approver).
 * refexLayout — exact Refex Employee Dashboard design language.
 */
import { motion } from 'framer-motion';
import { ITDashboardBackground, ITDashboardShell } from '../ITDashboardUI.jsx';
import { IT_TYPE, IT_SURFACE } from '../itDesignTokens.js';
import {
  ITMisPageBackground,
  ITMisEmployeeHeader,
  ITMisEmployeeKpiStrip,
  ITMisQueueSwitch,
  ITMisRequestsTableHeader,
  ITMisSearchBar,
  ITMisStatusTabs,
  ITMisTableCard,
  ITMisResultsCount,
  ITMisScopeSwitch,
} from './ITMisEmployeeUI.jsx';
import { buildMisItsmInsightKpiCards, buildMisRefexMonitoringKpiCards } from './buildMisKpiCards.js';
import ITMisCenterDonutInsightRow from './ITMisCenterDonutInsightRow.jsx';
import NewCeoGcpSourceBreakdown from '../newceo/NewCeoGcpSourceBreakdown.jsx';
import ITTodaySnapshotCards from './ITTodaySnapshotCards.jsx';
import RefexActionRequiredTicker from '../../../itsm/refex/shared/RefexActionRequiredTicker.jsx';
import {
  REFEX_CONTAINER_CLASS,
  RefexDashboardHeader,
  RefexPillTabs,
  RefexSearchField,
  resolveRefexMisTableTitle,
} from '../../../itsm/refex/shared/RefexItsmSharedUI.jsx';

export function ITMisDualQueuePageChrome({
  isMisModern,
  refexLayout = false,
  classicChrome,
  headerProps,
  activeQueue,
  onQueueChange,
  showQueueSwitch = true,
  queuePendingCounts = null,
  healthMonitor = null,
  insightMetrics = null,
  insightLayout = 'standard',
  entityTab,
  onEntityChange,
  showEntitySelect = false,
  entityOptions = [],
  showCompanyFilter = false,
  company = '',
  onCompanyChange,
  companyOptions = [],
  showPeopleFilters = false,
  showRequesterFilter = true,
  assignedFilterLabel = 'IT Agents',
  requester = '',
  onRequesterChange,
  requesterOptions = [],
  assignedTo = '',
  onAssignedToChange,
  assignedToOptions = [],
  statusTabs,
  tabCounts,
  slaKpis,
  tableTitle,
  tableSubtitle,
  search,
  onSearchChange,
  filters,
  activeTab,
  onTabChange,
  resultCount,
  searchTerm,
  loading,
  scope = 'me',
  onScopeChange,
  showScopeSwitch = false,
  actionRequiredItems = null,
  actionRequiredMessagePrefix = 'Action required for',
  refexMonitoringMetrics = null,
  refexCenterMetrics = null,
  /** Ticket source panels — same UI as newceo / NE (All tickets + Today open). */
  sourceBreakdownCounts = null,
  todaySnapshotMetrics = null,
  /** When true, KPI/donut counts stay at 0 (seed landed; full dataset still loading). */
  kpiLoading = null,
  compactKpiCards = true,
  children,
}) {
  const entitySelectVisible = Boolean(showEntitySelect || headerProps?.showEntitySelect);
  const resolvedEntityTab = entityTab ?? headerProps?.entityTab;
  const resolvedEntityOptions = entityOptions?.length ? entityOptions : (headerProps?.entityOptions || []);
  const resolvedOnEntityChange = onEntityChange ?? headerProps?.onEntityChange;
  const resolvedKpiLoading = kpiLoading == null ? Boolean(loading) : Boolean(kpiLoading);

  if (!isMisModern) {
    return (
      <>
        <ITDashboardBackground />
        <ITDashboardShell shellClassName="bg-gray-100">
          {classicChrome}
          {children}
        </ITDashboardShell>
      </>
    );
  }

  if (refexLayout) {
    const useCenterDonut = insightLayout === 'center-donut';
    // Instant land with 0 counts; Refresh only spins the header icon (no center overlay).
    const scrollToMisTable = (filterKey) => {
      onTabChange?.(filterKey);
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      const scrollTargetIntoView = () => {
        const el = document.getElementById('itsm-mis-table');
        if (!el) return false;
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        } catch {
          /* ignore */
        }
        // Kissflow page chrome often scrolls a parent, not window.
        let node = el.parentElement;
        while (node && node !== document.body && node !== document.documentElement) {
          const style = window.getComputedStyle(node);
          const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY)
            && node.scrollHeight > node.clientHeight + 8;
          if (canScrollY) {
            const top = el.getBoundingClientRect().top
              - node.getBoundingClientRect().top
              + node.scrollTop
              - 16;
            node.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
            break;
          }
          node = node.parentElement;
        }
        const pageY = el.getBoundingClientRect().top
          + (window.scrollY || document.documentElement.scrollTop || 0)
          - 16;
        window.scrollTo({ top: Math.max(0, pageY), behavior: 'smooth' });
        return true;
      };

      window.requestAnimationFrame(() => {
        if (scrollTargetIntoView()) return;
        window.setTimeout(scrollTargetIntoView, 120);
        window.setTimeout(scrollTargetIntoView, 320);
      });
    };
    const resolvedTableTitle = resolveRefexMisTableTitle(activeTab, tableTitle, activeQueue);

    return (
      <>
        <ITMisPageBackground modern />
        <ITDashboardShell shellClassName="bg-transparent overflow-x-hidden">
          <div className={REFEX_CONTAINER_CLASS}>
            <RefexDashboardHeader
              userName={headerProps?.userName}
              subtitle={headerProps?.roleLabel || headerProps?.poolLabel || headerProps?.companyName}
              liveClock={headerProps?.liveClock}
              loading={loading}
              refreshing={headerProps?.refreshing}
              loadError={headerProps?.loadError}
              onRefresh={headerProps?.onRefresh}
              onCreateTicket={headerProps?.onCreateTicket}
              createTitle={headerProps?.createTicketLabel || 'New'}
              createMenuOptions={headerProps?.createMenuOptions}
              periodFilter={headerProps?.periodFilter}
              showScopeSwitch={showScopeSwitch}
              scope={scope}
              onScopeChange={onScopeChange}
              showQueueSwitch={showQueueSwitch}
              activeQueue={activeQueue}
              onQueueChange={onQueueChange}
              queuePendingCounts={queuePendingCounts}
              showEntitySelect={entitySelectVisible}
              entityTab={resolvedEntityTab}
              onEntityChange={resolvedOnEntityChange}
              entityOptions={resolvedEntityOptions}
              showCompanyFilter={showCompanyFilter || headerProps?.showCompanyFilter}
              company={company ?? headerProps?.company ?? ''}
              onCompanyChange={onCompanyChange ?? headerProps?.onCompanyChange}
              companyOptions={companyOptions?.length ? companyOptions : (headerProps?.companyOptions || [])}
              showPeopleFilters={showPeopleFilters}
              showRequesterFilter={showRequesterFilter}
              assignedFilterLabel={assignedFilterLabel}
              requester={requester}
              onRequesterChange={onRequesterChange}
              requesterOptions={requesterOptions}
              assignedTo={assignedTo}
              onAssignedToChange={onAssignedToChange}
              assignedToOptions={assignedToOptions}
              engagementReportUrl={headerProps?.engagementReportUrl}
              engagementReportLabel={headerProps?.engagementReportLabel}
            />

            {scope !== 'team' && Array.isArray(actionRequiredItems) ? (
              <RefexActionRequiredTicker
                items={actionRequiredItems}
                messagePrefix={actionRequiredMessagePrefix}
              />
            ) : null}

            {useCenterDonut ? (
              <section className="mb-4">
                <ITMisCenterDonutInsightRow
                  insightMetrics={insightMetrics}
                  activeQueue={activeQueue}
                  queuePendingCounts={queuePendingCounts}
                  slaKpis={slaKpis}
                  refexLayout
                  refexCenterMetrics={refexCenterMetrics}
                  loading={resolvedKpiLoading}
                  activeFilterKey={activeTab}
                  onFilterChange={scrollToMisTable}
                  compactKpiCards={compactKpiCards}
                />
                {sourceBreakdownCounts ? (
                  <div className="mt-3">
                    <NewCeoGcpSourceBreakdown
                      all={sourceBreakdownCounts.all}
                      today={sourceBreakdownCounts.today}
                      loading={resolvedKpiLoading}
                    />
                  </div>
                ) : null}
                {todaySnapshotMetrics ? (
                  <ITTodaySnapshotCards
                    todayOpen={todaySnapshotMetrics.todayOpen}
                    todayClosed={todaySnapshotMetrics.todayClosed}
                    todaySlaBreached={todaySnapshotMetrics.todaySlaBreached}
                    loading={resolvedKpiLoading}
                    activeFilterKey={activeTab}
                    onFilterChange={scrollToMisTable}
                  />
                ) : null}
              </section>
            ) : null}

            <ITMisTableCard modern className="mt-4 scroll-mt-4 overflow-visible" id="itsm-mis-table">
              <div className={`${IT_SURFACE.borderB} relative z-20 px-3 py-4 sm:px-5`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className={IT_TYPE.sectionTitle}>{resolvedTableTitle}</h2>
                    {tableSubtitle ? (
                      <p className={`mt-0.5 ${IT_TYPE.meta} text-slate-500`}>{tableSubtitle}</p>
                    ) : null}
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
                    {filters ? filters : null}
                    {onSearchChange ? (
                      <div className="w-full sm:w-auto sm:shrink-0">
                        <RefexSearchField
                          value={search ?? ''}
                          onChange={onSearchChange}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={`relative -mx-3 sm:mx-0 ${loading ? 'min-h-[280px] sm:min-h-[320px]' : ''}`}>
                {children}
              </div>
            </ITMisTableCard>
          </div>
        </ITDashboardShell>
      </>
    );
  }

  const useCenterDonut = insightLayout === 'center-donut';
  // Health Monitor — disabled for now; re-enable when needed
  // const showHealthMonitor = !!healthMonitor;
  const showHealthMonitor = false;

  const kpiCards = useCenterDonut
    ? null
    : refexMonitoringMetrics
      ? buildMisRefexMonitoringKpiCards(refexMonitoringMetrics)
      : buildMisItsmInsightKpiCards({
        queueType: activeQueue === 'ChangeRequests' ? 'cr' : 'service',
        activeQueue,
        queuePendingCounts,
        hasHealthMonitor: showHealthMonitor,
        sla: slaKpis,
        refexLayout,
        ...insightMetrics,
      });

  return (
    <>
      <ITMisPageBackground modern />
      <ITDashboardShell shellClassName="overflow-x-hidden bg-transparent">
        <ITMisEmployeeHeader
          modern
          {...headerProps}
          entityTab={resolvedEntityTab}
          onEntityChange={resolvedOnEntityChange}
          showEntitySelect={entitySelectVisible}
          entityOptions={resolvedEntityOptions}
          periodFilter={headerProps?.periodFilter}
        />
        {showQueueSwitch ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
            <ITMisQueueSwitch
              activeQueue={activeQueue}
              onChange={onQueueChange}
              pendingCounts={queuePendingCounts}
              refexLayout={refexLayout}
            />
          </motion.div>
        ) : null}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          {useCenterDonut ? (
            <ITMisCenterDonutInsightRow
              insightMetrics={insightMetrics}
              activeQueue={activeQueue}
              queuePendingCounts={queuePendingCounts}
              slaKpis={slaKpis}
              loading={resolvedKpiLoading}
              compactKpiCards={compactKpiCards}
            />
          ) : (
            <ITMisEmployeeKpiStrip modern customCards={kpiCards} loading={resolvedKpiLoading} />
          )}
        </motion.div>
        {/* Health Monitor — disabled for now; re-enable when needed
        {showHealthMonitor ? (
          <motion.div
            className="px-3 pb-2 pt-1 sm:px-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="mx-auto max-w-[1400px] min-w-0">
              {healthMonitor}
            </div>
          </motion.div>
        ) : null}
        */}
        <div className="px-3 pb-8 sm:px-6">
          <motion.div
            className="mx-auto max-w-[1400px] min-w-0"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <ITMisTableCard modern>
              <ITMisRequestsTableHeader
                title={tableTitle}
                subtitle={tableSubtitle}
                openCount={resultCount}
                overdueCount={(slaKpis?.slaAtRisk ?? 0) + (slaKpis?.slaBreached ?? 0)}
                filters={filters}
              />
              <ITMisStatusTabs
                modern
                tabs={statusTabs}
                tabCounts={tabCounts}
                activeTab={activeTab}
                onTabChange={onTabChange}
                rightSlot={onSearchChange ? (
                  <div className="w-full sm:w-64 sm:shrink-0">
                    <ITMisSearchBar
                      modern
                      value={search ?? ''}
                      onChange={onSearchChange}
                    />
                  </div>
                ) : null}
              />
              {!loading && resultCount != null ? (
                <ITMisResultsCount modern count={resultCount} searchTerm={searchTerm || ''} />
              ) : null}
              {children}
            </ITMisTableCard>
          </motion.div>
        </div>
      </ITDashboardShell>
    </>
  );
}
