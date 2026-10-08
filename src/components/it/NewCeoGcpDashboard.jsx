import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Inbox,
  Sparkles,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { KissflowSDKContext } from '../../sdk/index.js';
import { ITCriticalityBadge, ITDashboardBackground, ITDashboardShell, ITEmptyTickets, ITTablePagination, ITTableSkeleton, ITTicketMobileCard, IT_THEME, useITListPagination, useMisTableFilters } from './ITDashboardUI.jsx';
import { IT_KPI_ACCENT, IT_SURFACE, IT_TYPE, itClearFilterBtn, itExpandPanelShell } from './itDesignTokens.js';
import { ITMisEmployeeKpiStrip, ITMisTableCard } from './mis/ITMisEmployeeUI.jsx';
import { useKpiStripWide } from './mis/misKpiLayout.js';
import { MisDetailCard } from './mis/ITMisExpandPrimitives.jsx';
import { TicketStatusMisCell } from '../../itsm/refex/employeedashboard/tableHelpers.jsx';
import { MisPersonInitialsCell } from '../../itsm/refex/shared/misCompactCells.jsx';
import { MisRequestTypeCell } from '../../itsm/refex/shared/misCompactCells.jsx';
import { formatMisTableDate, formatMisTableTime } from '../../itsm/refex/employeedashboard/employeeDates.js';
import { REFEX_COMPANY_NAME_OPTIONS } from '../../lib/kfITServiceDashboard.js';
import { loadNeItsmGcpPayload } from '../../lib/neGcpDashboardClient.js';
import {
  buildNewCeoCompanyOptions,
  ceoRowMatchesKpi,
  ceoSlaMisDisplay,
  compareCreatedDesc,
  engagementFromDashboard,
  filterGcpRecords,
  istParts,
  mapGcpRecordToCeoRow,
  misUsersFromRecords,
  readKissflowSessionUser,
  resolveNewCeoHeaderTitle,
  summarizeGcpRecords,
  userFilterOptions,
  ymdFromIso,
} from '../../lib/neGcpDashboardMath.js';
import NewCeoGcpSourceBreakdown from './newceo/NewCeoGcpSourceBreakdown.jsx';
import NewCeoGcpPeriodFilter from './newceo/NewCeoGcpPeriodFilter.jsx';
import {
  REFEX_TABLE_CELL_CLASS,
  REFEX_TABLE_HEAD_CELL,
  REFEX_TABLE_ROW_CLASS,
  RefexDashboardHeader,
  RefexLiveClockText,
  RefexSearchField,
  RefexTablePaginationFooter,
  getRefexServiceMisHeadLabelProps,
  renderRefexMisTableHeadLabel,
  resolveRefexMisTableTitle,
} from '../../itsm/refex/shared/RefexItsmSharedUI.jsx';

const COMPANY_OPTIONS = buildNewCeoCompanyOptions(REFEX_COMPANY_NAME_OPTIONS);

const CEO_ENGAGEMENT_REPORT_URL = 'https://refex-admin-ui-dhwffeu7pq-el.a.run.app/applications/production-IT_Service_Management_A00?tab=dashboard&embed=1';

const TABLE_COLUMNS = [
  { key: 'expand', label: '' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'requester', label: 'Requester' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'sla', label: 'SLA' },
  { key: 'createdOn', label: 'Created Date' },
  { key: 'ticketStatus', label: 'Ticket Status' },
  { key: 'stages', label: 'Stage' },
  { key: 'source', label: 'Source' },
  { key: 'ticketType', label: 'Request Type' },
  { key: 'closedBy', label: 'Closed By' },
  { key: 'closedOn', label: 'Closed Date' },
];

const KPI_TAB_KEYS = {
  '': 'AllTickets',
  open: 'OpenTickets',
  closed: 'Closed',
  rejected: 'Rejected',
  opened_today: 'TodayOpen',
  closed_today: 'TodayClosed',
};

function ceoMisExpandTiles(row) {
  return [
    { label: 'Subject', value: row.summary },
    { label: 'Description', value: row.description, multiline: true },
    { label: 'Category', value: row.category },
    { label: 'Sub Category', value: row.subCategory },
    { label: 'Criticality', value: row.criticality },
    { label: 'Company', value: row.company },
    { label: 'Stage', value: row.currentStep },
    { label: 'Entity', value: row.entity },
  ];
}

function CeoMisExpandPanel({ row, inset = false }) {
  const body = <MisDetailCard tiles={ceoMisExpandTiles(row)} />;
  if (inset) {
    return <div className="px-3 py-4 sm:px-4 sm:py-5">{body}</div>;
  }
  return (
    <div className={`${itExpandPanelShell()} px-3 py-4 sm:px-5 sm:py-5`}>
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0d9488]/35 to-transparent"
        aria-hidden
      />
      {body}
    </div>
  );
}

function scrollToNewCeoRecords() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const scrollTargetIntoView = () => {
    const el = document.getElementById('itsm-mis-table');
    if (!el) return false;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    } catch {
      /* ignore */
    }
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
}

function formatWhen(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function dash(value) {
  const text = String(value || '').trim();
  return text && text !== '—' ? text : '—';
}

function CeoMisDateCell({ value }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const dateLine = formatMisTableDate(value);
  const timeLine = formatMisTableTime(value);
  if (!dateLine) return <span className="text-slate-400">—</span>;
  return (
    <div className="min-w-[4.5rem]">
      <p className={`${IT_TYPE.body} text-slate-700 whitespace-nowrap`}>{dateLine}</p>
      {timeLine ? <p className={`mt-0.5 ${IT_TYPE.meta} text-slate-500 whitespace-nowrap`}>{timeLine}</p> : null}
    </div>
  );
}

function CeoSlaCell({ row, compact = false }) {
  const display = ceoSlaMisDisplay(row);
  const primary = display.primary && display.primary !== '—' ? display.primary : 'On track';
  const state = display.primary && display.primary !== '—' ? display.state : 'ok';
  const toneClass = state === 'breached'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : state === 'hold' || primary === 'Hold'
      ? 'border-slate-200 bg-slate-100 text-slate-600'
      : state === 'ok' || primary === 'On track' || primary === 'Not Breached'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';
  return (
    <div className={compact ? 'min-w-0' : 'min-w-[5.5rem]'}>
      <span className={`inline-flex max-w-full whitespace-normal break-words rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-snug ${toneClass}`}>
        {primary}
      </span>
      {!compact && display.sub ? <p className={`mt-1 ${IT_TYPE.meta} text-slate-500`}>{display.sub}</p> : null}
    </div>
  );
}

function ceoSlaFilterLabel(row) {
  const display = ceoSlaMisDisplay(row);
  return display?.primary && display.primary !== '—' ? display.primary : '';
}

function renderCeoTableCell(col, row) {
  switch (col.key) {
    case 'requestId':
      return (
        <div className="min-w-0">
          <p className={IT_THEME.requestId}>{dash(row.requestId)}</p>
        </div>
      );
    case 'requester':
      return <MisPersonInitialsCell name={row.requesterName} />;
    case 'assignedTo':
      return <MisPersonInitialsCell name={row.assignedTo} />;
    case 'closedBy':
      return <MisPersonInitialsCell name={row.closedBy} />;
    case 'ticketStatus':
      return <TicketStatusMisCell row={row} status={row.ticketStatus} />;
    case 'source':
      return dash(row.source);
    case 'stages':
      return <span className="max-w-[140px] truncate">{dash(row.ticketStage)}</span>;
    case 'createdOn':
      return <CeoMisDateCell value={row.createdAtRaw} />;
    case 'closedOn':
      return <CeoMisDateCell value={row.closedOn || row.closedAtRaw} />;
    case 'reopenedOn':
      return <CeoMisDateCell value={row.reopenedOn || row.reopenedAtRaw} />;
    case 'sla':
      return <CeoSlaCell row={row} />;
    case 'ticketType':
      return row.ticketType ? <MisRequestTypeCell value={row.ticketType} /> : '—';
    case 'category':
      return dash(row.category);
    case 'subCategory':
      return dash(row.subCategory);
    case 'criticality':
      return row.criticality ? <ITCriticalityBadge criticality={row.criticality} /> : '—';
    default:
      return '—';
  }
}

function sameFilterValue(actual, wanted) {
  if (!wanted || wanted === 'All') return true;
  return String(actual || '').trim().toLowerCase() === String(wanted).trim().toLowerCase();
}

function inDateRange(value, from, to) {
  if (!from && !to) return true;
  const ymd = ymdFromIso(value);
  if (!ymd) return false;
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

function matchesNewCeoColumnFilters(row, filters) {
  if (!sameFilterValue(row.category, filters.category)) return false;
  if (!sameFilterValue(row.subCategory, filters.subCategory)) return false;
  if (!sameFilterValue(row.criticality, filters.criticality)) return false;
  if (!sameFilterValue(row.ticketType, filters.ticketType)) return false;
  if (!sameFilterValue(row.source, filters.source)) return false;
  if (!sameFilterValue(row.ticketStatus, filters.ticketStatus)) return false;
  if (!sameFilterValue(row.ticketStage, filters.stages)) return false;
  if (!sameFilterValue(ceoSlaFilterLabel(row), filters.sla)) return false;
  if (!sameFilterValue(row.subject, filters.subject)) return false;
  if (filters.assignedTo && filters.assignedTo !== 'All') {
    if (!String(row.assignedTo || '').toLowerCase().includes(String(filters.assignedTo).toLowerCase())) return false;
  }
  if (filters.requester && filters.requester !== 'All') {
    if (!String(row.requesterName || '').toLowerCase().includes(String(filters.requester).toLowerCase())) return false;
  }
  if (filters.closedBy && !sameFilterValue(row.closedBy, filters.closedBy)) return false;
  if (!inDateRange(row.createdAtRaw, filters.createdDateFrom, filters.createdDateTo)) return false;
  if (!inDateRange(row.closedOn, filters.closedDateFrom, filters.closedDateTo)) return false;
  if (!inDateRange(row.reopenedOn, filters.reopenedDateFrom, filters.reopenedDateTo)) return false;
  return true;
}

export default function NewCeoGcpDashboard() {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [records, setRecords] = useState([]);
  const [company, setCompany] = useState('');
  const [user, setUser] = useState('');
  const [period, setPeriod] = useState('fy');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const nowParts = istParts();
  const [calendarYear, setCalendarYear] = useState(nowParts.year);
  const [calendarMonth, setCalendarMonth] = useState(nowParts.month);
  const [kpiFocus, setKpiFocus] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [usersOpen, setUsersOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [pageRef, pageWide] = useKpiStripWide(1024);
  const periodScope = { period, dateFrom, dateTo, calendarYear, calendarMonth };
  const desktopTableClass = pageWide ? 'overflow-x-auto overscroll-x-contain' : 'hidden';
  const mobileListClass = pageWide ? 'hidden' : 'space-y-2.5 p-3 sm:space-y-3 sm:p-4';

  useEffect(() => {
    const sync = () => {
      const next = readKissflowSessionUser(kfInstance);
      if (next.name) setUserName(next.name);
      if (next.email) setUserEmail(next.email);
    };
    sync();
    if (userName && userEmail) return undefined;
    const tick = window.setInterval(sync, 400);
    const stop = window.setTimeout(() => window.clearInterval(tick), 10000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(stop);
    };
  }, [kfInstance, sdkReady, userName, userEmail]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const payload = await loadNeItsmGcpPayload();
      setDashboard(payload.dashboard || null);
      setRecords(payload.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Tech Helpdesk data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const periodCompanyRecords = useMemo(
    () => filterGcpRecords(records, { company, user: '', ...periodScope }),
    [records, company, period, dateFrom, dateTo, calendarYear, calendarMonth],
  );
  const scopedRecords = useMemo(
    () => filterGcpRecords(records, { company, user, ...periodScope }),
    [records, company, user, period, dateFrom, dateTo, calendarYear, calendarMonth],
  );

  const engagement = useMemo(() => engagementFromDashboard(dashboard), [dashboard]);
  const signInRoster = useMemo(
    () => [...(engagement.roster || []), ...(engagement.ticketUsers || [])],
    [engagement.roster, engagement.ticketUsers],
  );
  const misUsers = useMemo(
    () => misUsersFromRecords(scopedRecords, signInRoster),
    [scopedRecords, signInRoster],
  );
  const userOptions = useMemo(
    () => userFilterOptions(periodCompanyRecords, engagement.ticketUsers),
    [periodCompanyRecords, engagement.ticketUsers],
  );

  const headerTitle = useMemo(
    () => resolveNewCeoHeaderTitle({ name: userName, email: userEmail }),
    [userName, userEmail],
  );

  const scopedCeoRows = useMemo(
    () => scopedRecords.map(mapGcpRecordToCeoRow),
    [scopedRecords],
  );
  const misFilters = useMisTableFilters(scopedCeoRows, `${company}|${user}|${period}|${kpiFocus}`, {
    resolveTicketStatus: (row) => row.ticketStatus,
    resolveStage: (row) => row.ticketStage || '',
  });

  const misFilteredCeoRows = useMemo(
    () => scopedCeoRows.filter((row) => matchesNewCeoColumnFilters(row, misFilters.params)),
    [scopedCeoRows, misFilters.params],
  );
  const sourcePanelRows = useMemo(
    () => scopedCeoRows.filter((row) => matchesNewCeoColumnFilters(row, { ...misFilters.params, source: '' })),
    [scopedCeoRows, misFilters.params],
  );
  const kpis = useMemo(() => summarizeGcpRecords(misFilteredCeoRows), [misFilteredCeoRows]);
  const sourceKpis = useMemo(() => summarizeGcpRecords(sourcePanelRows), [sourcePanelRows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedCeoRows.filter((row) => {
      if (!ceoRowMatchesKpi(row, kpiFocus)) return false;
      if (!matchesNewCeoColumnFilters(row, misFilters.params)) return false;
      if (!q) return true;
      return [
        row.requestId,
        row.summary,
        row.requesterName,
        row.assignedTo,
        row.closedBy,
        row.source,
        row.company,
        row.currentStep,
        row.ticketStatus,
        row.category,
        row.ticketType,
      ].some((value) => String(value || '').toLowerCase().includes(q));
    }).sort((a, b) => (sortOrder === 'desc' ? compareCreatedDesc(a, b) : -compareCreatedDesc(a, b)));
  }, [scopedCeoRows, kpiFocus, search, misFilters.params, sortOrder]);

  const {
    page, setPage, totalPages, totalItems, pagedItems, rangeStart, rangeEnd,
  } = useITListPagination(visibleRows, [
    company,
    user,
    period,
    dateFrom,
    dateTo,
    calendarYear,
    calendarMonth,
    kpiFocus,
    search,
    sortOrder,
    misFilters.category,
    misFilters.subCategory,
    misFilters.criticality,
    misFilters.ticketType,
    misFilters.source,
    misFilters.closedBy,
    misFilters.assignedTo,
    misFilters.requester,
    misFilters.ticketStatus,
    misFilters.stages,
    misFilters.sla,
    misFilters.createdDateFrom,
    misFilters.createdDateTo,
    misFilters.closedDateFrom,
    misFilters.closedDateTo,
    misFilters.reopenedDateFrom,
    misFilters.reopenedDateTo,
  ]);

  const toggleKpi = (key) => {
    setKpiFocus((prev) => (prev === key ? '' : key));
    scrollToNewCeoRecords();
  };

  const ticketCards = useMemo(() => ([
    { label: 'Total items', value: kpis.total, sub: 'In current filters', icon: ClipboardList, ...IT_KPI_ACCENT.brand, onClick: () => toggleKpi(''), active: kpiFocus === '' },
    { label: 'Open', value: kpis.open, sub: 'Still open', icon: Inbox, ...IT_KPI_ACCENT.cyan, onClick: () => toggleKpi('open'), active: kpiFocus === 'open' },
    { label: 'Closed', value: kpis.closed, sub: 'Completed', icon: CheckCircle2, ...IT_KPI_ACCENT.success, onClick: () => toggleKpi('closed'), active: kpiFocus === 'closed' },
    { label: 'Rejected', value: kpis.rejected, sub: 'Rejected tickets', icon: XCircle, ...IT_KPI_ACCENT.error, onClick: () => toggleKpi('rejected'), active: kpiFocus === 'rejected' },
    { label: 'Opened today', value: kpis.openedToday, sub: 'Created today IST', icon: Inbox, ...IT_KPI_ACCENT.violet, onClick: () => toggleKpi('opened_today'), active: kpiFocus === 'opened_today' },
    { label: 'Closed today', value: kpis.closedToday, sub: 'Closed today IST', icon: Archive, ...IT_KPI_ACCENT.slate, onClick: () => toggleKpi('closed_today'), active: kpiFocus === 'closed_today' },
  ]), [kpis, kpiFocus]);

  const adoptionCards = useMemo(() => ([
    { label: 'Adoption · overall', value: `${engagement.adoptionOverall}%`, sub: 'Ever signed in ÷ app users', icon: Sparkles, ...IT_KPI_ACCENT.brand },
    { label: 'Users', value: engagement.usersCard, sub: 'Kissflow app roster', icon: Users, ...IT_KPI_ACCENT.cyan },
    { label: 'Signed in today', value: engagement.signedInToday, sub: 'Logged in today', icon: UserCheck, ...IT_KPI_ACCENT.success },
    { label: 'Adoption today', value: `${engagement.adoptionToday}%`, sub: 'Signed in today ÷ users', icon: Sparkles, ...IT_KPI_ACCENT.violet },
  ]), [engagement]);

  const tableTitle = resolveRefexMisTableTitle(KPI_TAB_KEYS[kpiFocus] || 'AllTickets', 'All Tickets');

  return (
    <ITDashboardShell shellClassName="bg-transparent overflow-x-hidden">
      <ITDashboardBackground />
      <div ref={pageRef} className="relative z-10 mx-auto w-full min-w-0 max-w-full px-3 pb-10 pt-4">
        <RefexDashboardHeader
          userName={userName}
          subtitle={headerTitle}
          liveClock={<RefexLiveClockText />}
          loading={loading}
          refreshing={refreshing}
          loadError={error}
          onRefresh={() => void load(true)}
          showScopeSwitch={false}
          showQueueSwitch={false}
          showEntitySelect={false}
          showCompanyFilter
          company={company}
          onCompanyChange={(next) => { setCompany(next); setKpiFocus(''); }}
          companyOptions={COMPANY_OPTIONS}
          showPeopleFilters
          showRequesterFilter={false}
          assignedFilterLabel="User"
          assignedTo={user}
          onAssignedToChange={(next) => { setUser(next); setKpiFocus(''); }}
          assignedToOptions={userOptions}
          engagementReportUrl={CEO_ENGAGEMENT_REPORT_URL}
          engagementReportLabel="Engagement Report"
          periodFilter={(
            <NewCeoGcpPeriodFilter
              period={period}
              onPeriodChange={(next) => { setPeriod(next); setKpiFocus(''); }}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              calendarYear={calendarYear}
              calendarMonth={calendarMonth}
              onCalendarYearChange={setCalendarYear}
              onCalendarMonthChange={setCalendarMonth}
            />
          )}
        />

        <ITMisEmployeeKpiStrip
          modern
          flush
          customCards={[...ticketCards, ...adoptionCards]}
          loading={loading}
        />

        <div className="min-w-0">
          <NewCeoGcpSourceBreakdown
            all={sourceKpis.source}
            today={sourceKpis.todaySource}
            loading={loading}
          />
        </div>

        <ITMisTableCard modern className="mt-4 scroll-mt-4 overflow-visible" id="itsm-mis-table">
          <div className={`${IT_SURFACE.borderB} relative z-20 px-3 py-4 sm:px-5`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className={IT_TYPE.sectionTitle}>{tableTitle}</h2>
                <p className={`mt-0.5 ${IT_TYPE.meta} text-slate-500`}>
                  Assigned service pipeline
                </p>
              </div>
              <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
                {misFilters.hasActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      misFilters.clearFilters();
                      setPage(0);
                    }}
                    className={itClearFilterBtn()}
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear filters
                  </button>
                ) : null}
                <div className="w-full min-w-0 sm:w-auto sm:shrink-0">
                  <RefexSearchField
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative -mx-3 min-w-0 sm:mx-0">
          <div className={desktopTableClass}>
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className={IT_SURFACE.tableHead}>
                <tr>
                  {TABLE_COLUMNS.map((col) => (
                    <th key={col.key} className={`whitespace-nowrap ${REFEX_TABLE_HEAD_CELL}`}>
                      {renderRefexMisTableHeadLabel(col, getRefexServiceMisHeadLabelProps({
                        col,
                        misFilters,
                        sortOrder,
                        onSortOrderChange: setSortOrder,
                        ticketStatusOptions: ['Open', 'Closed', 'Rejected'],
                        slaOptions: ['Breached', 'Not Breached', 'On track', 'Hold'],
                      }))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !visibleRows.length ? (
                  <ITTableSkeleton colSpan={TABLE_COLUMNS.length} />
                ) : !visibleRows.length ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS.length}>
                      <ITEmptyTickets title="No records" subtitle="No matching service requests in this filter" />
                    </td>
                  </tr>
                ) : pagedItems.map((row) => {
                  const isExpanded = expandedRowId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                        className={`group cursor-pointer bg-white ${REFEX_TABLE_ROW_CLASS}`}
                      >
                        <td className={REFEX_TABLE_CELL_CLASS}>
                          <button
                            type="button"
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedRowId(isExpanded ? null : row.id);
                            }}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                        {TABLE_COLUMNS.slice(1).map((col) => (
                          <td key={col.key} className={`${REFEX_TABLE_CELL_CLASS} ${col.key === 'createdOn' || col.key === 'closedOn' ? IT_TYPE.meta : ''}`}>
                            {renderCeoTableCell(col, row)}
                          </td>
                        ))}
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td colSpan={TABLE_COLUMNS.length} className="p-0">
                            <CeoMisExpandPanel row={row} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={mobileListClass}>
            {loading && !visibleRows.length ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-gray-200/60" />
              ))
            ) : !visibleRows.length ? (
              <ITEmptyTickets title="No records" subtitle="No matching service requests in this filter" />
            ) : pagedItems.map((row) => {
              const isExpanded = expandedRowId === row.id;
              return (
                <ITTicketMobileCard
                  key={row.id}
                  expanded={isExpanded}
                  onToggle={() => setExpandedRowId(isExpanded ? null : row.id)}
                  requestId={dash(row.requestId)}
                  title={dash(row.summary)}
                  badges={(
                    <>
                      <TicketStatusMisCell row={row} status={row.ticketStatus} />
                      <CeoSlaCell row={row} compact />
                    </>
                  )}
                  fields={[
                    { label: 'Assigned To', value: <MisPersonInitialsCell name={row.assignedTo} /> },
                    { label: 'Requester', value: <MisPersonInitialsCell name={row.requesterName} /> },
                    { label: 'Source', value: dash(row.source) },
                    { label: 'Request Type', value: <MisRequestTypeCell value={row.ticketType} /> },
                    { label: 'Created', value: formatWhen(row.createdAtRaw) },
                    { label: 'Stage', value: dash(row.ticketStage || row.currentStep) },
                  ]}
                >
                  <CeoMisExpandPanel row={row} inset />
                </ITTicketMobileCard>
              );
            })}
          </div>
          </div>

          {!loading && visibleRows.length > 0 ? (
            <RefexTablePaginationFooter>
              <ITTablePagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onPageChange={setPage}
              />
            </RefexTablePaginationFooter>
          ) : null}
        </ITMisTableCard>

        <section className={`mx-auto mt-5 max-w-[1400px] min-w-0 overflow-hidden ${IT_SURFACE.card} ${IT_SURFACE.border} ${IT_SURFACE.shadowTable}`}>
          <button
            type="button"
            aria-expanded={usersOpen}
            onClick={() => setUsersOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
          >
            <div className="min-w-0">
              <h2 className={IT_TYPE.sectionTitle}>Users</h2>
              <p className={`${IT_TYPE.sectionSubtitle} truncate`}>
                Assignees in the current filters
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{misUsers.length}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${usersOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {usersOpen ? (
            <>
              <div className={desktopTableClass}>
                <table className="min-w-full text-sm">
                  <thead className={IT_SURFACE.tableHead}>
                    <tr>
                      <th className="px-4 py-2 text-left">User</th>
                      <th className="px-4 py-2 text-right">Last sign-in</th>
                      <th className="px-4 py-2 text-right">Open</th>
                      <th className="px-4 py-2 text-right">Closed</th>
                      <th className="px-4 py-2 text-right">Rejected</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Closure %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {misUsers.slice(0, 40).map((row) => (
                      <tr key={row.user_id} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-medium text-slate-800">
                          {row.user_name}
                          {row.is_active === false ? ' (InActive)' : ''}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">{formatWhen(row.last_sign_in)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.open}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.closed}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.rejected}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.total || (row.open + row.closed + row.rejected)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {Number.isFinite(row.closure_ratio)
                            ? `${row.closure_ratio}%`
                            : `${row.open + row.closed > 0 ? Math.round((row.closed / (row.open + row.closed)) * 1000) / 10 : 0}%`}
                        </td>
                      </tr>
                    ))}
                    {!misUsers.length ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-400">No assignees in this filter</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className={mobileListClass}>
                {!misUsers.length ? (
                  <p className="py-6 text-center text-sm text-slate-400">No assignees in this filter</p>
                ) : misUsers.slice(0, 40).map((row) => {
                  const total = row.total || (row.open + row.closed + row.rejected);
                  const closure = Number.isFinite(row.closure_ratio)
                    ? `${row.closure_ratio}%`
                    : `${row.open + row.closed > 0 ? Math.round((row.closed / (row.open + row.closed)) * 1000) / 10 : 0}%`;
                  return (
                    <div key={row.user_id} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {row.user_name}
                        {row.is_active === false ? ' (InActive)' : ''}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">Last sign-in {formatWhen(row.last_sign_in)}</p>
                      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                        <p className="flex justify-between gap-2"><span className="text-slate-500">Open</span><span className="font-semibold tabular-nums">{row.open}</span></p>
                        <p className="flex justify-between gap-2"><span className="text-slate-500">Closed</span><span className="font-semibold tabular-nums">{row.closed}</span></p>
                        <p className="flex justify-between gap-2"><span className="text-slate-500">Rejected</span><span className="font-semibold tabular-nums">{row.rejected}</span></p>
                        <p className="flex justify-between gap-2"><span className="text-slate-500">Total</span><span className="font-semibold tabular-nums">{total}</span></p>
                        <p className="col-span-2 flex justify-between gap-2"><span className="text-slate-500">Closure %</span><span className="font-semibold tabular-nums">{closure}</span></p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </ITDashboardShell>
  );
}
