/* eslint-disable max-lines -- Refex Employee Dashboard */
import { useState, useContext, useMemo, useCallback, useRef, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Plus, RotateCcw, Ticket, FolderOpen,
  CheckCircle2, ClockAlert, ClipboardList,
} from 'lucide-react';
import { KissflowSDKContext } from '../../../sdk/index.js';
import {
  ITDashboardShell,
  ITCriticalityBadge,
  useITListPagination,
  ITTablePagination,
  ITEmptyTickets,
  ITTicketMobileCard,
  useMisTableFilters,
} from '../../../components/it/ITDashboardUI.jsx';
import { IT_TYPE, IT_SURFACE } from '../../../components/it/itDesignTokens.js';
import { useITDashboardSilentRefresh } from '../../../components/it/useITDashboardSilentRefresh.js';
import {
  ITMisPageBackground,
  ITMisKpiStatCard,
  ITMisTableCard,
  misModernTableHeadClass,
  misModernMobileListClass,
} from '../../../components/it/mis/ITMisEmployeeUI.jsx';
import { kpiStripClass, misKpiGridForCount, useKpiStripWide } from '../../../components/it/mis/misKpiLayout.js';
import { openITCreateTicketPage, isMyItem, applyMisColumnFilters, canShowServiceRecordEditIcon, isExtrovisServiceDashboardContext, resolveItsmHeaderRoleLabel } from '../../../lib/kfITServiceDashboard.js';
import { scrollToMisRecords } from '../../../lib/scrollToMisRecords.js';
import {
  handleDashboardRowClick,
  renderEditRecordTableCell,
  isTableInteractionColumn,
  formatRequestId,
} from '../../../components/it/ITDashboardShared.jsx';
import { useITEditRecordRefreshBindings } from '../../../components/it/useITEditRecordRefreshBindings.js';
import { getGreetingText } from '../../../lib/kfProjectDashboard.js';
import { MOCK_IT_USER } from '../../../mocks/itServiceRequests.js';
import {
  KPI_CARDS,
  MIS_TICKET_STATUS_FILTER_OPTIONS,
} from './constants.js';
import { getRefexServiceQueueMisColumns } from '../shared/refexServiceQueueColumns.js';
import { getExtrovisMisSubjectLabel } from './commentChannel.js';
import { getExtrovisMisStagesLabel, getRefexReportStagesLabel, getRefexReportStatusLabel } from './ticketStage.js';
import {
  fetchRefexEmployeeMyTaskSeed,
  hydrateRefexEmployeeFromPersistentCache,
  mergeEmployeeLandingRows,
} from './fetchEmployeeTickets.js';
import {
  ensureRefexMappedDataset,
  scheduleRefexMappedDatasetLoad,
  invalidateRefexMappedDataset,
  getCachedRefexMappedRows,
} from '../shared/refexDatasetStore.js';
import {
  computeEmployeeKpis,
  filterEmployeeRows,
} from './computeKpis.js';
import {
  getEmployeeDisplayStatus,
  getMisTicketStatus,
  matchesEmployeeStatusFilter,
  canShowEmployeeFeedbackActions,
  isEmployeeLivePendingApproval,
} from './employeeStatus.js';
import {
  canSubmitEmployeeFeedback,
} from './employeeFeedbackApi.js';
import RefexEmployeeExpandPanel from './RefexEmployeeExpandPanel.jsx';
import {
  AssignedToCell,
  ClosedByCell,
  MisWrapText,
  RequesterCell,
  TicketStatusMisCell,
  getMisCategoryLabel,
  getMisSubCategoryLabel,
  getMisCriticalityLabel,
} from './tableHelpers.jsx';
import {
  RefexMisDateTimeCell,
  RefexServiceSlaCell,
  RefexServiceTatCell,
} from '../shared/refexServiceMisCells.jsx';
import { MisRequestTypeCell } from '../shared/misCompactCells.jsx';
import { getMisSourceLabel } from '../shared/misCompactDisplay.js';
import {
  RefexLiveClockText,
  RefexSearchField,
  renderRefexMisTableHeadLabel,
  getRefexServiceMisHeadLabelProps,
  resolveRefexMisTableTitle,
} from '../shared/RefexItsmSharedUI.jsx';

function displayRequestId(row) {
  return formatRequestId(row);
}

const KPI_ICON_MAP = {
  All: Ticket,
  open: FolderOpen,
  closed: CheckCircle2,
  reopened: RotateCcw,
  slaBreached: ClockAlert,
  pendingApproval: ClipboardList,
};

const KPI_TONE = {
  blue: {
    modernBg: 'from-sky-50/92 via-white to-indigo-50/72',
    accent: 'text-[#2B5AED]',
    ring: 'ring-[#2B5AED]/15',
    iconColor: 'text-[#2B5AED]',
    iconBg: 'bg-[#2B5AED]',
    text: 'text-[#2B5AED]',
  },
  green: {
    modernBg: 'from-emerald-50/92 via-white to-green-50/78',
    accent: 'text-[#22C55E]',
    ring: 'ring-[#22C55E]/15',
    iconColor: 'text-[#22C55E]',
    iconBg: 'bg-[#22C55E]',
    text: 'text-[#22C55E]',
  },
  orange: {
    modernBg: 'from-amber-50/92 via-white to-orange-50/72',
    accent: 'text-[#F97316]',
    ring: 'ring-[#F97316]/15',
    iconColor: 'text-[#F97316]',
    iconBg: 'bg-[#F97316]',
    text: 'text-[#F97316]',
  },
  red: {
    modernBg: 'from-rose-50/92 via-white to-red-50/78',
    accent: 'text-[#EF4444]',
    ring: 'ring-[#EF4444]/15',
    iconColor: 'text-[#EF4444]',
    iconBg: 'bg-[#EF4444]',
    text: 'text-[#EF4444]',
  },
  violet: {
    modernBg: 'from-violet-50/92 via-white to-purple-50/72',
    accent: 'text-[#8B5CF6]',
    ring: 'ring-[#8B5CF6]/15',
    iconColor: 'text-[#8B5CF6]',
    iconBg: 'bg-[#8B5CF6]',
    text: 'text-[#6D28D9]',
  },
};

function renderTableCell(col, row, {
  statusTab,
  kfInstance,
  canOpenForm,
  getEditRecordCellProps,
}) {
  switch (col.key) {
    case 'expand':
      return null;
    case 'requestId':
      return (
        <div className="min-w-0">
          <span className={`font-semibold text-slate-800 ${IT_TYPE.body}`}>{displayRequestId(row)}</span>
        </div>
      );
    case 'requester':
      return <RequesterCell row={row} />;
    case 'ticketType':
      return <MisRequestTypeCell value={row.ticketType} row={row} />;
    case 'category':
      return <MisWrapText>{getMisCategoryLabel(row)}</MisWrapText>;
    case 'subCategory':
      return <MisWrapText>{getMisSubCategoryLabel(row)}</MisWrapText>;
    case 'criticality':
      return <ITCriticalityBadge criticality={getMisCriticalityLabel(row)} />;
    case 'source':
      return <MisWrapText>{getMisSourceLabel(row)}</MisWrapText>;
    case 'ticketStatus': {
      const status = isExtrovisServiceDashboardContext()
        ? (getMisTicketStatus(row) || 'Open')
        : (getRefexReportStatusLabel(row) || getMisTicketStatus(row) || 'Open');
      return <TicketStatusMisCell row={row} status={status} />;
    }
    case 'subject':
      return <MisWrapText>{getExtrovisMisSubjectLabel(row)}</MisWrapText>;
    case 'stages':
      return (
        <MisWrapText>
          {isExtrovisServiceDashboardContext()
            ? getExtrovisMisStagesLabel(row, statusTab)
            : (getRefexReportStagesLabel(row) || '—')}
        </MisWrapText>
      );
    case 'sla':
      return statusTab === 'Closed'
        ? <RefexServiceSlaCell row={row} isCompletedTab />
        : <RefexServiceSlaCell row={row} />;
    case 'tat':
      return statusTab === 'Closed'
        ? <RefexServiceTatCell row={row} isCompletedTab />
        : <RefexServiceTatCell row={row} />;
    case 'assignedTo':
      return <AssignedToCell row={row} />;
    case 'createdOn':
    case 'closedOn':
    case 'reopenedOn':
    case 'contextDate':
      return <RefexMisDateTimeCell row={row} statusTab={statusTab} columnKey={col.key} />;
    case 'closedBy':
      return <ClosedByCell row={row} />;
    case 'viewDetails':
      return renderEditRecordTableCell(kfInstance, row, {
        queueType: 'service',
        canEdit: canOpenForm,
        ...getEditRecordCellProps('service'),
      });
    default:
      return '—';
  }
}

const HEADER_ICON_BTN = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60';

const HEADER_CREATE_BTN = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--it-brand)]/30 bg-gradient-to-br from-[var(--it-brand)] to-[var(--it-brand-end)] text-white shadow-sm transition hover:from-[var(--it-brand-dark)] hover:to-[var(--it-brand-darker)] disabled:opacity-60';

export default function RefexEmployeeDashboard({ poolLabel = 'Refex', headerRoleLabel = 'Employee' }) {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);
  const kfUser = kfInstance?.user;
  const userId = kfUser?._id || kfUser?.Id || MOCK_IT_USER._id;
  const userEmail = kfUser?.Email || kfUser?.email || MOCK_IT_USER.Email;
  const user = useMemo(
    () => kfUser || MOCK_IT_USER,
    [userId, userEmail, kfUser?.Name],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [allRows, setAllRows] = useState([]);
  const [datasetReady, setDatasetReady] = useState(false);
  const [statusTab, setStatusTab] = useState('Open');
  const [sortOrder, setSortOrder] = useState(() => (
    isExtrovisServiceDashboardContext() ? 'desc' : 'asc'
  ));
  const [search, setSearch] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [kpiStripRef, kpiStripWide] = useKpiStripWide();

  const userName = user?.Name || user?.FirstName || 'Employee';
  const helpdeskTitle = resolveItsmHeaderRoleLabel({
    headerRoleLabel,
    pack: 'employee',
    userEmail: userEmail,
  });
  void poolLabel;
  const tableColumns = useMemo(() => getRefexServiceQueueMisColumns(), []);

  // Tracks the SDK/user context of the last successful load so that effect
  // re-runs caused by context churn (sdkReady flip, kf instance identity,
  // user resolution) do not refetch the same data again.
  const lastLoadedKeyRef = useRef('');

  const loadDashboard = useCallback(async ({ silent = false, background = false, force = false, isStale } = {}) => {
    const hasApi = Boolean(kfInstance?.api || kfInstance?.app?.getProcess);
    if (!hasApi) {
      setAllRows([]);
      setLoading(false);
      setRefreshing(false);
      setDatasetReady(true);
      return { didLoad: false };
    }
    if (!sdkReady && !lastLoadedKeyRef.current) {
      // SDK context not settled yet (window.kf exists but the provider hasn't
      // flipped sdkReady). Wait for the flip instead of loading twice; report
      // didLoad: false so the real load still runs as the initial load.
      setRefreshing(false);
      return { didLoad: false };
    }

    const loadKey = `${userId}|${userEmail}`;
    const hardRefresh = Boolean(force);
    const softRefresh = Boolean(silent || background) && !hardRefresh;
    if (!hardRefresh && !softRefresh && lastLoadedKeyRef.current === loadKey) {
      // Same context already loaded — skip duplicate API calls.
      if (!isStale?.()) {
        setLoading(false);
        setRefreshing(false);
        setDatasetReady(true);
      }
      return { didLoad: true };
    }

    if (!silent && !background) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setLoadError('');
    try {
      if (isStale?.()) return { didLoad: false };

      if (softRefresh) {
        try {
          const rows = await ensureRefexMappedDataset('employee', kfInstance, user, {
            forceRefresh: false,
            softRefresh: true,
          });
          if (isStale?.()) return { didLoad: false };
          if (Array.isArray(rows) && rows.length) setAllRows(rows);
          setDatasetReady(true);
        } catch (softErr) {
          console.warn('Employee soft refresh failed:', softErr?.message || softErr);
        }
        if (!isStale?.()) {
          setLoading(false);
          setRefreshing(false);
          lastLoadedKeyRef.current = loadKey;
        }
        return { didLoad: true };
      }

      if (hardRefresh) {
        invalidateRefexMappedDataset('employee', kfInstance, user, { clearPersistent: true });
      }

      const cached = !hardRefresh
        ? getCachedRefexMappedRows('employee', kfInstance, user)
        : null;

      let painted = false;
      let hadReportLanding = Boolean(cached?.length);
      if (cached?.length) {
        setAllRows(cached);
        setDatasetReady(true);
        if (!silent) setLoading(false);
        painted = true;
      }

      // Cold land: race IndexedDB hydrate + My Task seed; paint whichever is useful first.
      // Prefer hydrate when present (Closed / history); seed covers live reopen when IDB empty.
      if (!hardRefresh && !painted) {
        try {
          const [hydrated, seedRows] = await Promise.all([
            hydrateRefexEmployeeFromPersistentCache(kfInstance, user).catch(() => null),
            fetchRefexEmployeeMyTaskSeed(kfInstance, user, { force: false }).catch((err) => {
              console.warn('Refex employee My Task seed failed:', err?.message || err);
              return [];
            }),
          ]);
          if (isStale?.()) return { didLoad: false };
          hadReportLanding = Boolean(hydrated?.length);
          const landingRows = mergeEmployeeLandingRows(
            hydrated,
            Array.isArray(seedRows) ? seedRows : [],
          );
          setAllRows(landingRows);
          setDatasetReady(true);
          if (!silent) setLoading(false);
          painted = true;
        } catch (landErr) {
          console.warn('Employee landing hydrate/seed failed:', landErr?.message || landErr);
          setDatasetReady(true);
          if (!silent) setLoading(false);
        }
      } else if (hardRefresh && !painted) {
        try {
          const seedRows = await fetchRefexEmployeeMyTaskSeed(kfInstance, user, { force: true });
          if (isStale?.()) return { didLoad: false };
          if (Array.isArray(seedRows) && seedRows.length) setAllRows(seedRows);
          setDatasetReady(true);
        } catch (seedErr) {
          console.warn('Refex employee My Task seed failed:', seedErr?.message || seedErr);
          setDatasetReady(true);
        }
        if (!silent) setLoading(false);
      }

      // Defer full report so seed/hydrate paint stays responsive (match Agent).
      // Soft delta only when memory/IDB already had report rows; seed-only needs full+completed.
      scheduleRefexMappedDatasetLoad('employee', kfInstance, user, {
        forceRefresh: hardRefresh,
        delayMs: painted ? 800 : (hardRefresh ? 0 : 2000),
        onReady: (rows) => {
          if (isStale?.()) return;
          if (Array.isArray(rows) && rows.length) {
            setAllRows((prev) => (
              rows.length >= (prev?.length || 0)
                ? rows
                : mergeEmployeeLandingRows(prev, rows)
            ));
          }
          setDatasetReady(true);
        },
        loadFn: () => ensureRefexMappedDataset('employee', kfInstance, user, {
          forceRefresh: hardRefresh,
          softRefresh: hadReportLanding && !hardRefresh,
        }),
      });

      if (!isStale?.()) {
        lastLoadedKeyRef.current = loadKey;
      }
    } catch (err) {
      console.error(err);
      setLoadError(err?.message || 'Failed to load tickets.');
      setAllRows((prev) => (Array.isArray(prev) && prev.length ? prev : []));
      setDatasetReady(true);
    } finally {
      if (!isStale?.()) {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    }
    return { didLoad: true };
  }, [kfInstance, sdkReady, userId, userEmail, user]);

  const { requestRefresh } = useITDashboardSilentRefresh(kfInstance, loadDashboard, [sdkReady]);
  const applyEditedRow = useCallback((row) => {
    if (!row?.id) return;
    setAllRows((prev) => {
      if (!Array.isArray(prev) || !prev.length) return [row];
      const map = new Map(prev.map((item) => [item.id, item]));
      map.set(row.id, { ...(map.get(row.id) || {}), ...row });
      return Array.from(map.values());
    });
  }, []);
  const { getEditRecordCellProps } = useITEditRecordRefreshBindings(kfInstance, requestRefresh, applyEditedRow);

  const kpis = useMemo(() => computeEmployeeKpis(allRows, user), [allRows, user]);
  const isRefexEmployee = !isExtrovisServiceDashboardContext();
  const visibleKpiCards = useMemo(() => {
    if (!isRefexEmployee || !kpis.pendingApproval) return KPI_CARDS;
    const pendingCard = {
      key: 'pendingApproval',
      label: 'Pending Approval',
      filterKey: 'PendingTask',
      sub: 'Waiting for your approval',
      tone: 'orange',
    };
    const cards = [...KPI_CARDS];
    cards.splice(2, 0, pendingCard);
    return cards;
  }, [isRefexEmployee, kpis.pendingApproval]);

  useEffect(() => {
    if ((statusTab === 'PendingTask' || statusTab === 'PendingApproval') && !kpis.pendingApproval) {
      setStatusTab('Open');
    }
  }, [kpis.pendingApproval, statusTab]);

  const tabScopedRows = useMemo(() => (
    (allRows || []).filter((row) => {
      if (statusTab === 'PendingTask' || statusTab === 'PendingApproval') {
        return isEmployeeLivePendingApproval(row);
      }
      return isMyItem(row, user) && matchesEmployeeStatusFilter(row, statusTab, user);
    })
  ), [allRows, statusTab, user]);

  const misFilterResetKey = `employee-${statusTab}`;
  const resolveTicketStatus = useCallback((row) => (
    isRefexEmployee
      ? (getRefexReportStatusLabel(row) || getMisTicketStatus(row, user) || 'Open')
      : getMisTicketStatus(row, user)
  ), [isRefexEmployee, user]);
  const resolveStage = useCallback((row) => (
    isRefexEmployee ? getRefexReportStagesLabel(row) : getExtrovisMisStagesLabel(row, statusTab)
  ), [isRefexEmployee, statusTab]);
  const misFilters = useMisTableFilters(tabScopedRows, misFilterResetKey, {
    resolveTicketStatus,
    resolveStage,
  });

  const filteredRows = useMemo(() => {
    const base = filterEmployeeRows(allRows, {
      statusTab,
      criticality: misFilters.criticality || 'All',
      requestType: misFilters.ticketType || 'All',
      search,
      user,
      sortOrder,
    });
    return applyMisColumnFilters(base, {
      ...misFilters.params,
      categoryField: 'category',
    });
  }, [allRows, statusTab, misFilters.criticality, misFilters.ticketType, misFilters.params, search, user, sortOrder]);

  const {
    page,
    setPage,
    pagedItems,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = useITListPagination(filteredRows, [statusTab, misFilters.criticality, misFilters.ticketType, search, sortOrder]);

  const pageRows = pagedItems ?? [];

  const renderActionCellProps = (col) => (
    isTableInteractionColumn(col) ? { onClick: (e) => e.stopPropagation() } : {}
  );

  const handleRefresh = () => {
    if (refreshing) return;
    requestRefresh({ silent: true, force: true });
  };

  return (
    <>
      <ITMisPageBackground modern />
      <ITDashboardShell shellClassName="bg-transparent overflow-x-hidden">
        <div className="relative z-10 mx-auto w-full max-w-[1600px] px-3 pb-10 pt-4 sm:px-5 lg:px-8">
          <header className="mb-4 flex flex-col gap-3 sm:mb-5 md:mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 pr-0 sm:pr-4">
                <h1 className={`it-hero-title ${IT_TYPE.pageTitle}`}>
                  {getGreetingText()}, {userName}
                </h1>
                {helpdeskTitle ? (
                  <p className={`it-hero-sub mt-1 ${IT_TYPE.pageSubtitle}`}>{helpdeskTitle}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                <p className={`${IT_TYPE.meta} order-2 sm:order-1 sm:text-right`}>
                  <RefexLiveClockText />
                </p>
                <div className="order-1 flex items-center gap-2 sm:order-2">
                  <button
                    type="button"
                    title="Refresh"
                    aria-label="Refresh dashboard"
                    disabled={refreshing}
                    onClick={handleRefresh}
                    className={HEADER_ICON_BTN}
                  >
                    <RotateCcw className={`h-4 w-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <motion.button
                    type="button"
                    title="New Ticket"
                    aria-label="New Ticket"
                    onClick={() => openITCreateTicketPage(kfInstance)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 22 }}
                    className={HEADER_CREATE_BTN}
                  >
                    <Plus className="h-4 w-4 stroke-[2.5] text-white" />
                  </motion.button>
                </div>
              </div>
            </div>
          </header>

          <section ref={kpiStripRef} className={kpiStripClass(kpiStripWide, 'mb-4')}>
            <div className={misKpiGridForCount(visibleKpiCards.length)}>
            {visibleKpiCards.map((card, idx) => {
              const tone = KPI_TONE[card.tone] || KPI_TONE.blue;
              const Icon = KPI_ICON_MAP[card.key] || Ticket;
              const filterKey = card.filterKey || card.key;
              return (
                <ITMisKpiStatCard
                  key={card.key}
                  label={card.label}
                  value={loading ? 0 : (kpis[card.key] ?? 0)}
                  loading={loading}
                  sub={card.sub}
                  shareOf={kpis.All || 0}
                  hint={card.key === 'open' ? 'Awaiting action' : card.key === 'closed' ? 'Resolved' : ''}
                  icon={Icon}
                  modernBg={tone.modernBg}
                  accent={tone.accent}
                  ring={tone.ring}
                  iconColor={tone.iconColor}
                  iconBg={tone.iconBg}
                  delay={idx * 0.04}
                  insightRow
                  compact
                  active={statusTab === filterKey}
                  onClick={() => {
                    setStatusTab(filterKey);
                    scrollToMisRecords('itsm-mis-table');
                  }}
                />
              );
            })}
            </div>
          </section>

          <ITMisTableCard modern className="mt-4 scroll-mt-4 overflow-visible" id="itsm-mis-table">
            <div className={`${IT_SURFACE.borderB} relative z-20 px-3 py-4 sm:px-5`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h2 className={IT_TYPE.sectionTitle}>{resolveRefexMisTableTitle(statusTab, 'My Requests')}</h2>
                  {loadError ? (
                    <p className={`mt-2 ${IT_TYPE.body} text-red-600`}>{loadError}</p>
                  ) : null}
                </div>
                <div className="w-full lg:w-auto lg:shrink-0">
                  <RefexSearchField
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tickets..."
                  />
                </div>
              </div>
            </div>

            <div className={`relative -mx-3 hidden overflow-x-auto sm:mx-0 lg:block ${loading ? 'min-h-[280px] sm:min-h-[320px]' : ''}`}>
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className={`${misModernTableHeadClass} relative z-30`}>
                  <tr>
                    {tableColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-3 font-semibold sm:px-4"
                      >
                        {renderRefexMisTableHeadLabel(col, getRefexServiceMisHeadLabelProps({
                          col,
                          misFilters,
                          sortOrder,
                          onSortOrderChange: setSortOrder,
                          ticketStatusOptions: MIS_TICKET_STATUS_FILTER_OPTIONS,
                          tabRows: tabScopedRows,
                        }))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!loading && pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={tableColumns.length} className="p-8">
                        <ITEmptyTickets />
                      </td>
                    </tr>
                  ) : !loading ? (
                    pageRows.map((row) => {
                      const displayStatus = getEmployeeDisplayStatus(row, user);
                      const expanded = expandedRowId === row.id;
                      // Closed + IT Tech Reopen ("Reopen window") → open Kissflow form on row click.
                      const canOpenForm = canShowServiceRecordEditIcon(row, user, {
                        dashboard: 'employee',
                        tabKey: statusTab,
                      })
                        || canSubmitEmployeeFeedback(row)
                        || canShowEmployeeFeedbackActions(row, user)
                        || isEmployeeLivePendingApproval(row);
                      return (
                        <Fragment key={row.id}>
                          <tr
                            onClick={(e) => handleDashboardRowClick(e, kfInstance, row, {
                              canOpenForm,
                              onToggleExpand: () => setExpandedRowId(expanded ? null : row.id),
                              formOptions: {
                                queueType: 'service',
                                ...getEditRecordCellProps('service'),
                              },
                            })}
                            className="cursor-pointer border-t border-slate-200 transition hover:bg-slate-50/80"
                          >
                            <td className="bg-white px-3 py-2.5 sm:px-4 sm:py-3" data-stop-row-nav>
                              <button
                                type="button"
                                aria-label={expanded ? 'Collapse row' : 'Expand row'}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRowId(expanded ? null : row.id);
                                }}
                              >
                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            {tableColumns.filter((col) => col.key !== 'expand').map((col) => (
                              <td
                                key={col.key}
                                {...renderActionCellProps(col)}
                                className={`px-3 py-2.5 align-middle text-slate-700 sm:px-4 sm:py-3 ${
                                  ['category', 'subCategory', 'requester', 'assignedTo', 'closedBy', 'ticketStatus', 'source'].includes(col.key) ? 'max-w-[8.5rem]' : ''
                                }`}
                              >
                                {renderTableCell(col, row, {
                                  statusTab,
                                  kfInstance,
                                  canOpenForm,
                                  getEditRecordCellProps,
                                })}
                              </td>
                            ))}
                          </tr>

                          {expanded ? (
                            <tr>
                              <td colSpan={tableColumns.length} className="p-0">
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.18 }}
                                >
                                  <RefexEmployeeExpandPanel
                                    row={row}
                                    user={user}
                                    displayStatus={displayStatus}
                                    progressRefreshKey={progressRefreshKey}
                                    statusTab={statusTab}
                                  />
                                </motion.div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className={misModernMobileListClass}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200/60" />
                ))
              ) : pageRows.length === 0 ? (
                <ITEmptyTickets />
              ) : (
                pageRows.map((row) => {
                  const displayStatus = getEmployeeDisplayStatus(row, user);
                  const expanded = expandedRowId === row.id;
                  const canOpenForm = canShowServiceRecordEditIcon(row, user, {
                    dashboard: 'employee',
                    tabKey: statusTab,
                  })
                    || canSubmitEmployeeFeedback(row)
                    || canShowEmployeeFeedbackActions(row, user)
                    || isEmployeeLivePendingApproval(row);
                  const status = isRefexEmployee
                    ? (getRefexReportStatusLabel(row) || getMisTicketStatus(row) || 'Open')
                    : (getMisTicketStatus(row) || 'Open');
                  return (
                    <ITTicketMobileCard
                      key={row.id}
                      expanded={expanded}
                      onToggle={() => setExpandedRowId(expanded ? null : row.id)}
                      requestId={displayRequestId(row)}
                      title={getExtrovisMisSubjectLabel(row)}
                      badges={(
                        <>
                          <ITCriticalityBadge criticality={getMisCriticalityLabel(row)} />
                          <TicketStatusMisCell row={row} status={status} />
                        </>
                      )}
                      fields={[
                        { label: 'Category', value: getMisCategoryLabel(row) },
                        { label: 'Assigned to', value: <AssignedToCell row={row} /> },
                        { label: 'Requester', value: <RequesterCell row={row} /> },
                      ]}
                      headerAction={canOpenForm ? renderEditRecordTableCell(kfInstance, row, {
                        queueType: 'service',
                        canEdit: canOpenForm,
                        ...getEditRecordCellProps('service'),
                      }) : null}
                    >
                      <RefexEmployeeExpandPanel
                        row={row}
                        user={user}
                        displayStatus={displayStatus}
                        progressRefreshKey={progressRefreshKey}
                        statusTab={statusTab}
                      />
                    </ITTicketMobileCard>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
              <ITTablePagination
                page={page}
                totalPages={totalPages}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                totalItems={totalItems}
                onPageChange={setPage}
                itemLabel="tickets"
              />
            </div>
          </ITMisTableCard>
        </div>
      </ITDashboardShell>
    </>
  );
}
