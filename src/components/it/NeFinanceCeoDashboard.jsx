import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Inbox,
  Landmark,
  Plane,
  Receipt,
  Sparkles,
  Sun,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { KissflowSDKContext } from '../../sdk/index.js';
import { ITDashboardBackground, ITDashboardShell, ITEmptyTickets, ITTablePagination, ITTicketMobileCard, useITListPagination } from './ITDashboardUI.jsx';
import { IT_KPI_ACCENT, IT_SURFACE, IT_TYPE } from './itDesignTokens.js';
import { ITMisEmployeeKpiStrip, ITMisTableCard } from './mis/ITMisEmployeeUI.jsx';
import { MisDetailCard } from './mis/ITMisExpandPrimitives.jsx';
import { useKpiStripWide } from './mis/misKpiLayout.js';
import { formatMisTableDate, formatMisTableTime } from '../../itsm/refex/employeedashboard/employeeDates.js';
import { REFEX_COMPANY_NAME_OPTIONS } from '../../lib/kfITServiceDashboard.js';
import { loadNeAppGcpPayload, peekNeAppGcpCache } from '../../lib/neGcpDashboardClient.js';
import {
  buildNewCeoCompanyOptions,
  engagementFromDashboard,
  filterGcpRecords,
  istParts,
  misUsersFromRecords,
  ensureCeoViewerParamWatch,
  readKissflowSessionUser,
  resolveNewCeoHeaderTitle,
  periodSummaryLabel,
  summarizeGcpRecords,
  ticketKpisFromDashboard,
  userFilterOptions,
} from '../../lib/neGcpDashboardMath.js';
import NewCeoGcpPeriodFilter from './newceo/NewCeoGcpPeriodFilter.jsx';
import {
  REFEX_TABLE_CELL_CLASS,
  REFEX_TABLE_HEAD_CELL,
  REFEX_TABLE_ROW_CLASS,
  RefexDashboardHeader,
  RefexLiveClockText,
  RefexSearchField,
  RefexTablePaginationFooter,
} from '../../itsm/refex/shared/RefexItsmSharedUI.jsx';
import { scrollToMisRecords } from '../../lib/scrollToMisRecords.js';
import {
  EMS_TABLE_COLUMNS,
  TRAVEL_PROCESS_SECTIONS,
  annotateTravelBookingFareRows,
  claimsSub,
  countByStatus,
  fareTrendFilterLabel,
  filterFinanceVisibleRows,
  formatInr,
  formatOverMedianPct,
  isTravelBookingRow,
  requestsSub,
  resolveTravelFareTrendDisplay,
  SOLAR_TABLE_COLUMNS,
  solarPackCountsFromRecords,
  sumRecordAmount,
  travelColumnsForPack,
  travelExpandTiles,
  travelPackMatches,
  travelSlaDisplay,
} from '../../lib/neFinanceDashboardMath.js';

const TREND_COLOR = { Up: '#EF4444', Down: '#16A34A', Flat: '#9CA3AF' };

const COMPANY_OPTIONS = buildNewCeoCompanyOptions(REFEX_COMPANY_NAME_OPTIONS);
const ACCENT = [IT_KPI_ACCENT.brand, IT_KPI_ACCENT.cyan, IT_KPI_ACCENT.success, IT_KPI_ACCENT.error];

function FinanceDateCell({ value }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const dateLine = formatMisTableDate(value);
  const timeLine = formatMisTableTime(value);
  if (!dateLine) return <span className="text-slate-400">—</span>;
  return (
    <div className="min-w-[4.5rem]">
      <p className={`${IT_TYPE.body} whitespace-nowrap text-slate-700`}>{dateLine}</p>
      {timeLine ? <p className={`mt-0.5 ${IT_TYPE.meta} whitespace-nowrap text-slate-500`}>{timeLine}</p> : null}
    </div>
  );
}

function dash(value) {
  const text = String(value || '').trim();
  return text && text !== '—' ? text : '—';
}

function isAmountCol(id) {
  return id === 'amount' || id === 'raised_amount' || id === 'claimed_amount'
    || id === 'reference_fare' || id === 'policy_deviation_cost';
}

function FareTrendCell({ trend, deviationPct }) {
  const display = resolveTravelFareTrendDisplay(trend, deviationPct);
  if (!display) return <span className="text-slate-400">—</span>;
  const color = TREND_COLOR[display.kind];
  const down = display.kind === 'Down';
  return (
    <span className="inline-flex items-center justify-end gap-1" title={fareTrendFilterLabel(display.kind, display.kind === 'Flat' ? 0 : deviationPct)}>
      {display.kind === 'Flat' ? (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="shrink-0">
          <rect x="1" y="1" width="8" height="8" rx="1" fill={color} />
        </svg>
      ) : (
        <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden className="shrink-0">
          <path d={down ? 'M7 11.2 L0.8 1.4 H13.2 Z' : 'M7 0.8 L13.2 10.6 H0.8 Z'} fill={color} />
        </svg>
      )}
      <span className="tabular-nums text-[12px] font-semibold leading-none" style={{ color }}>{display.pct}</span>
    </span>
  );
}

function SlaCell({ row }) {
  const sla = travelSlaDisplay(row);
  if (sla.state === 'none') return <span className="text-slate-400">—</span>;
  const tone = sla.state === 'breached'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>{sla.primary}</span>
      {sla.sub ? <span className="text-[11px] font-medium tabular-nums text-slate-500">{sla.sub}</span> : null}
    </span>
  );
}

function isDateCol(id) {
  return id === 'created_at' || id === 'expense_date';
}

function formatSignIn(value) {
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

function financeRowId(row, index) {
  const id = String(row?.id || row?.request_id || row?.instance_id || '').trim();
  return id || `row-${index}`;
}

function financeMobileValue(col, row) {
  const raw = row?.[col.id];
  if (isAmountCol(col.id)) return raw == null || raw === '' ? '—' : formatInr(raw);
  if (isDateCol(col.id)) {
    const dateLine = formatMisTableDate(raw);
    const timeLine = formatMisTableTime(raw);
    return [dateLine, timeLine].filter(Boolean).join(', ') || '—';
  }
  return dash(raw);
}

function financeCardTitle(row, solar) {
  if (solar) return dash(row?.subject || row?.requested_by);
  return dash(row?.expense_type || row?.requested_by);
}

function FinancePack({ title, hint, icon: Icon, styleIndex = 0, cards, loading }) {
  const theme = ACCENT[styleIndex % ACCENT.length];
  return (
    <section className="mt-4 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={IT_TYPE.sectionTitle}>{title}</p>
          {hint ? <p className={`mt-0.5 ${IT_TYPE.meta} text-slate-500`}>{hint}</p> : null}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${theme.iconGradient}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
      <ITMisEmployeeKpiStrip modern flush customCards={cards} loading={loading} />
    </section>
  );
}

export default function NeFinanceCeoDashboard({
  mode = 'expense',
  appId,
  engagementReportUrl,
} = {}) {
  const travelMode = mode === 'travel';
  const solarMode = mode === 'solar';
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext);
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null);

  const cachedPayload = peekNeAppGcpCache(appId);
  const [loading, setLoading] = useState(!cachedPayload.dashboard && !cachedPayload.records.length);
  const [recordsReady, setRecordsReady] = useState(cachedPayload.records.length > 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(cachedPayload.dashboard);
  const [records, setRecords] = useState(cachedPayload.records);
  const [company, setCompany] = useState('');
  const [user, setUser] = useState('');
  const [period, setPeriod] = useState('fy');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const nowParts = istParts();
  const [calendarYear, setCalendarYear] = useState(nowParts.year);
  const [calendarMonth, setCalendarMonth] = useState(nowParts.month);
  const [kpiFocus, setKpiFocus] = useState('');
  const [travelPackFocus, setTravelPackFocus] = useState(null);
  const [solarPackFocus, setSolarPackFocus] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [usersOpen, setUsersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [pageRef, pageWide] = useKpiStripWide(1024);
  const desktopTableClass = pageWide ? 'overflow-x-auto overscroll-x-contain' : 'hidden';
  const mobileListClass = pageWide ? 'hidden' : 'space-y-2.5 p-3 sm:space-y-3 sm:p-4';
  const periodScope = { period, dateFrom, dateTo, calendarYear, calendarMonth };

  useEffect(() => {
    const sync = (next = readKissflowSessionUser(kfInstance)) => {
      if (next.name) setUserName(next.name);
      if (next.email) setUserEmail(next.email);
    };
    sync();
    ensureCeoViewerParamWatch(kfInstance, sync);
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
    setError('');
    try {
      const payload = await loadNeAppGcpPayload(appId, {
        refresh: isRefresh,
        onPartial: (next) => {
          if (next.dashboard) setDashboard(next.dashboard);
          if (Array.isArray(next.records)) {
            setRecords((prev) => (next.records.length || !prev.length ? next.records : prev));
            if (next.records.length) setRecordsReady(true);
          }
          if (next.recordsSettled) setRecordsReady(true);
          setLoading(false);
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Could not load Notification Engine data');
          setRecordsReady(true);
        },
      });
      if (payload.dashboard) setDashboard(payload.dashboard);
      if (payload.records?.length) setRecords(payload.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Notification Engine data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    setTravelPackFocus(null);
    setSolarPackFocus(null);
    setKpiFocus('');
  }, [company, user, period, dateFrom, dateTo, calendarYear, calendarMonth]);

  const fareReadyRecords = useMemo(
    () => (travelMode ? annotateTravelBookingFareRows(records) : records),
    [records, travelMode],
  );
  const periodCompanyRecords = useMemo(
    () => filterGcpRecords(fareReadyRecords, { company, user: '', ...periodScope }),
    [fareReadyRecords, company, period, dateFrom, dateTo, calendarYear, calendarMonth],
  );
  const scopedRecords = useMemo(
    () => filterGcpRecords(fareReadyRecords, { company, user, ...periodScope }),
    [fareReadyRecords, company, user, period, dateFrom, dateTo, calendarYear, calendarMonth],
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
  const liveKpis = useMemo(() => summarizeGcpRecords(scopedRecords), [scopedRecords]);
  const dashKpis = useMemo(() => ticketKpisFromDashboard(dashboard), [dashboard]);
  const filtersDefault = !company && !user && period === 'fy';
  const useDashTicketKpis = !records.length && filtersDefault && dashKpis.total > 0;
  const kpis = useDashTicketKpis ? dashKpis : liveKpis;

  const amountTotals = useMemo(() => {
    const booking = scopedRecords.filter((row) => travelPackMatches(row, TRAVEL_PROCESS_SECTIONS[0].match));
    const advance = scopedRecords.filter((row) => travelPackMatches(row, TRAVEL_PROCESS_SECTIONS[1].match));
    const claimed = scopedRecords.filter((row) => travelPackMatches(row, TRAVEL_PROCESS_SECTIONS[2].match));
    return {
      all: sumRecordAmount(scopedRecords),
      open: sumRecordAmount(scopedRecords, 'open'),
      closed: sumRecordAmount(scopedRecords, 'closed'),
      rejected: sumRecordAmount(scopedRecords, 'rejected'),
      booking: sumRecordAmount(booking),
      advance: sumRecordAmount(advance),
      claimed: sumRecordAmount(claimed),
    };
  }, [scopedRecords]);

  const visibleRows = useMemo(
    () => filterFinanceVisibleRows(scopedRecords, {
      kpiFocus,
      travelPack: travelMode ? travelPackFocus : null,
      solarPack: solarMode ? solarPackFocus : null,
      search,
    }),
    [kpiFocus, scopedRecords, search, solarMode, solarPackFocus, travelMode, travelPackFocus],
  );

  const {
    page, setPage, totalPages, totalItems, pagedItems, rangeStart, rangeEnd,
  } = useITListPagination(visibleRows, [
    company, user, period, dateFrom, dateTo, calendarYear, calendarMonth, kpiFocus, travelPackFocus, search,
  ]);

  const toggleKpi = (key) => {
    setKpiFocus((prev) => (prev === key ? '' : key));
    setTravelPackFocus(null);
    scrollToMisRecords('finance-mis-table');
  };

  const periodHint = useMemo(
    () => periodSummaryLabel(period, { dateFrom, dateTo, calendarYear, calendarMonth }),
    [period, dateFrom, dateTo, calendarYear, calendarMonth],
  );

  const topCards = useMemo(() => ([
    { label: 'Total items', value: kpis.total, hint: periodHint, sub: `${Number(kpis.openedToday || 0).toLocaleString('en-IN')} opened today`, shareOf: kpis.total, icon: ClipboardList, ...IT_KPI_ACCENT.brand, onClick: () => toggleKpi('total'), active: kpiFocus === 'total' || kpiFocus === '' },
    { label: 'Open', value: kpis.open, hint: 'Awaiting action', shareOf: kpis.total, icon: Inbox, ...IT_KPI_ACCENT.cyan, onClick: () => toggleKpi('open'), active: kpiFocus === 'open' },
    { label: 'Closed', value: kpis.closed, hint: 'Resolved', sub: `${Number(kpis.closedToday || 0).toLocaleString('en-IN')} closed today`, shareOf: kpis.total, icon: CheckCircle2, ...IT_KPI_ACCENT.success, onClick: () => toggleKpi('closed'), active: kpiFocus === 'closed' },
    { label: 'Rejected', value: kpis.rejected, hint: 'Not actioned', shareOf: kpis.total, icon: XCircle, ...IT_KPI_ACCENT.error, onClick: () => toggleKpi('rejected'), active: kpiFocus === 'rejected' },
    { label: 'Opened today', value: kpis.openedToday, icon: Inbox, ...IT_KPI_ACCENT.violet, onClick: () => toggleKpi('opened_today'), active: kpiFocus === 'opened_today' },
    { label: 'Closed today', value: kpis.closedToday, icon: Archive, ...IT_KPI_ACCENT.slate, onClick: () => toggleKpi('closed_today'), active: kpiFocus === 'closed_today' },
    { label: 'Adoption · overall', value: `${engagement.adoptionOverall}%`, sub: 'Ever signed in ÷ app users', icon: Sparkles, ...IT_KPI_ACCENT.brand },
    { label: 'Users', value: engagement.usersCard, sub: 'Kissflow app roster', icon: Users, ...IT_KPI_ACCENT.cyan },
    { label: 'Signed in today', value: engagement.signedInToday, sub: 'Logged in today', icon: UserCheck, ...IT_KPI_ACCENT.success },
    { label: 'Adoption today', value: `${engagement.adoptionToday}%`, sub: 'Signed in today ÷ users', icon: Sparkles, ...IT_KPI_ACCENT.violet },
  ]), [engagement, kpiFocus, kpis, periodHint]);

  const travelPacks = useMemo(() => TRAVEL_PROCESS_SECTIONS.map((section, index) => {
    const rows = scopedRecords.filter((row) => travelPackMatches(row, section.match));
    const total = rows.length;
    const open = countByStatus(rows, 'open');
    const closed = countByStatus(rows, 'closed');
    const packActive = (metric) => travelPackFocus?.key === section.kind && travelPackFocus?.metric === metric;
    const click = (metric) => {
      setTravelPackFocus((prev) => (
        prev?.key === section.kind && prev?.metric === metric ? null : { key: section.kind, metric }
      ));
      setKpiFocus('');
      scrollToMisRecords('finance-mis-table');
    };
    const icons = [Plane, Wallet, Receipt];
    if (section.kind === 'booking') {
      return {
        ...section,
        icon: icons[index],
        cards: [
          { label: 'Total', value: total, sub: requestsSub(total), icon: ClipboardList, ...IT_KPI_ACCENT.brand, active: packActive('total'), onClick: () => click('total') },
          { label: 'Open', value: open, icon: Inbox, ...IT_KPI_ACCENT.cyan, active: packActive('open'), onClick: () => click('open') },
          { label: 'Closed', value: closed, icon: CheckCircle2, ...IT_KPI_ACCENT.success, active: packActive('closed'), onClick: () => click('closed') },
          { label: 'Booked', value: formatInr(amountTotals.booking), sub: requestsSub(total), icon: Plane, ...IT_KPI_ACCENT.error, active: packActive('amount'), onClick: () => click('amount') },
        ],
      };
    }
    const claimedAmt = sumRecordAmount(rows, 'closed');
    const submitted = section.kind === 'advance' ? amountTotals.advance : amountTotals.claimed;
    const last = claimedAmt > 0
      ? { label: 'Claimed', value: formatInr(claimedAmt), sub: requestsSub(closed), icon: Receipt, ...IT_KPI_ACCENT.error, active: packActive('amount'), onClick: () => click('amount') }
      : { label: 'Submitted', value: formatInr(submitted), sub: requestsSub(total), icon: Wallet, ...IT_KPI_ACCENT.error, active: packActive('amount'), onClick: () => click('amount') };
    return {
      ...section,
      icon: icons[index],
      cards: [
        { label: 'Total', value: total, sub: requestsSub(total), icon: ClipboardList, ...IT_KPI_ACCENT.brand, active: packActive('total'), onClick: () => click('total') },
        { label: 'Open', value: open, icon: Inbox, ...IT_KPI_ACCENT.cyan, active: packActive('open'), onClick: () => click('open') },
        { label: 'Closed', value: closed, icon: CheckCircle2, ...IT_KPI_ACCENT.success, active: packActive('closed'), onClick: () => click('closed') },
        last,
      ],
    };
  }), [amountTotals, scopedRecords, travelPackFocus]);

  const solarCounts = useMemo(
    () => solarPackCountsFromRecords(scopedRecords),
    [scopedRecords],
  );
  const tableColumns = travelMode
    ? travelColumnsForPack(travelPackFocus?.key)
    : (solarMode ? SOLAR_TABLE_COLUMNS : EMS_TABLE_COLUMNS);
  const tableTitle = travelMode
    ? (TRAVEL_PROCESS_SECTIONS.find((section) => section.kind === travelPackFocus?.key)?.title || 'Travel records')
    : (solarMode ? 'Solar records' : 'Expense records');

  const renderCell = (col, row) => {
    const raw = row?.[col.id];
    if (col.id === 'fare_trend') return <FareTrendCell trend={row.fare_trend} deviationPct={row.deviation_pct} />;
    if (col.id === 'sla') return <SlaCell row={row} />;
    if (col.id === 'deviation_pct') return dash(formatOverMedianPct(raw));
    if (isAmountCol(col.id)) return raw == null || raw === '' ? '—' : formatInr(raw);
    if (isDateCol(col.id)) return <FinanceDateCell value={raw} />;
    return dash(raw);
  };

  return (
    <ITDashboardShell shellClassName="bg-transparent overflow-x-hidden">
      <ITDashboardBackground />
      <div ref={pageRef} className="relative z-10 mx-auto w-full min-w-0 max-w-full px-3 pb-10 pt-4">
        <RefexDashboardHeader
          userName={userName}
          subtitle={headerTitle}
          productLabel={travelMode ? 'Travel Management' : (solarMode ? 'Solar Site Expense' : 'Expense Management')}
          liveClock={<RefexLiveClockText />}
          loading={!recordsReady || refreshing}
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
          engagementReportUrl={engagementReportUrl}
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

        <ITMisEmployeeKpiStrip modern flush customCards={topCards} loading={!recordsReady || refreshing} />

        {solarMode ? (
          <>
            <FinancePack
              title="Operation"
              hint="Start → HO Review → VP Approval. Closed = moved to Finance."
              icon={Sun}
              styleIndex={0}
              cards={[
                { label: 'Open', value: solarCounts.operation.open, icon: Inbox, ...IT_KPI_ACCENT.cyan, active: solarPackFocus?.key === 'operation' && solarPackFocus?.metric === 'open', onClick: () => setSolarPackFocus((prev) => (prev?.key === 'operation' && prev?.metric === 'open' ? null : { key: 'operation', metric: 'open' })) },
                { label: 'Closed', value: solarCounts.operation.closed, sub: 'Moved to Finance', icon: CheckCircle2, ...IT_KPI_ACCENT.success, active: solarPackFocus?.key === 'operation' && solarPackFocus?.metric === 'closed', onClick: () => setSolarPackFocus((prev) => (prev?.key === 'operation' && prev?.metric === 'closed' ? null : { key: 'operation', metric: 'closed' })) },
                { label: 'Rejected', value: solarCounts.operation.rejected, icon: XCircle, ...IT_KPI_ACCENT.error, active: solarPackFocus?.key === 'operation' && solarPackFocus?.metric === 'rejected', onClick: () => setSolarPackFocus((prev) => (prev?.key === 'operation' && prev?.metric === 'rejected' ? null : { key: 'operation', metric: 'rejected' })) },
              ]}
              loading={!recordsReady || refreshing}
            />
            <FinancePack
              title="Finance"
              hint="BU Approval onward. Rejected uses the last real step."
              icon={Landmark}
              styleIndex={1}
              cards={[
                { label: 'Open', value: solarCounts.finance.open, icon: Inbox, ...IT_KPI_ACCENT.cyan, active: solarPackFocus?.key === 'finance' && solarPackFocus?.metric === 'open', onClick: () => setSolarPackFocus((prev) => (prev?.key === 'finance' && prev?.metric === 'open' ? null : { key: 'finance', metric: 'open' })) },
                { label: 'Closed', value: solarCounts.finance.closed, sub: 'Process completed', icon: CheckCircle2, ...IT_KPI_ACCENT.success, active: solarPackFocus?.key === 'finance' && solarPackFocus?.metric === 'closed', onClick: () => setSolarPackFocus((prev) => (prev?.key === 'finance' && prev?.metric === 'closed' ? null : { key: 'finance', metric: 'closed' })) },
                { label: 'Rejected', value: solarCounts.finance.rejected, icon: XCircle, ...IT_KPI_ACCENT.error, active: solarPackFocus?.key === 'finance' && solarPackFocus?.metric === 'rejected', onClick: () => setSolarPackFocus((prev) => (prev?.key === 'finance' && prev?.metric === 'rejected' ? null : { key: 'finance', metric: 'rejected' })) },
              ]}
              loading={!recordsReady || refreshing}
            />
          </>
        ) : travelMode ? travelPacks.map((pack, index) => (
          <FinancePack
            key={pack.kind}
            title={pack.title}
            hint="Submitted and claimed amounts from the current filters"
            icon={pack.icon}
            styleIndex={index}
            cards={pack.cards}
            loading={!recordsReady || refreshing}
          />
        )) : (
          <>
            <FinancePack
              title="Claims"
              hint="Amount and claim count from filtered records — click a cell to filter the table"
              icon={Receipt}
              styleIndex={0}
              cards={[
                { label: 'Total submitted', value: formatInr(amountTotals.all), sub: claimsSub(kpis.total), icon: ClipboardList, ...IT_KPI_ACCENT.brand, active: kpiFocus === 'total', onClick: () => toggleKpi('total') },
                { label: 'Pending review', value: formatInr(amountTotals.open), sub: claimsSub(kpis.open), icon: Inbox, ...IT_KPI_ACCENT.cyan, active: kpiFocus === 'open', onClick: () => toggleKpi('open') },
                { label: 'Approved', value: formatInr(amountTotals.closed), sub: claimsSub(kpis.closed), icon: CheckCircle2, ...IT_KPI_ACCENT.success, active: kpiFocus === 'closed', onClick: () => toggleKpi('closed') },
                { label: 'Rejected', value: formatInr(amountTotals.rejected), sub: claimsSub(kpis.rejected), icon: XCircle, ...IT_KPI_ACCENT.error, active: kpiFocus === 'rejected', onClick: () => toggleKpi('rejected') },
              ]}
              loading={!recordsReady || refreshing}
            />
          </>
        )}

        <ITMisTableCard modern className="mt-4 scroll-mt-4 overflow-visible" id="finance-mis-table">
          <div className={`${IT_SURFACE.borderB} relative z-20 px-3 py-4 sm:px-5`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className={IT_TYPE.sectionTitle}>{tableTitle}</h2>
                <p className={`mt-0.5 ${IT_TYPE.meta} text-slate-500`}>
                  {travelMode ? 'Travel booking, advance, and expense records' : (solarMode ? 'Solar operation and finance records' : 'Expense claims in the current filters')}
                </p>
              </div>
              <div className="w-full min-w-0 sm:w-auto">
                <RefexSearchField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>

          {!recordsReady ? (
            <p className="px-5 py-8 text-sm text-slate-500">Loading records…</p>
          ) : pagedItems.length === 0 ? (
            <ITEmptyTickets title="No records" subtitle="No rows match the current filters." />
          ) : !pageWide && travelMode ? (
            <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
              {pagedItems.map((row, index) => {
                const rowId = financeRowId(row, index);
                const tiles = travelExpandTiles(row, {
                  includeFareDetails: travelPackFocus?.key !== 'booking' && isTravelBookingRow(row),
                });
                const canExpand = tiles.length > 0;
                const isExpanded = expandedRowId === rowId;
                return (
                  <ITTicketMobileCard
                    key={rowId}
                    expanded={isExpanded && canExpand}
                    onToggle={() => {
                      if (!canExpand) return;
                      setExpandedRowId(isExpanded ? null : rowId);
                    }}
                    requestId={dash(row.request_id)}
                    title={dash(row.purpose || row.requested_by)}
                    badges={<span className="text-[11px] font-semibold text-slate-600">{dash(row.status)}</span>}
                    fields={[
                      { label: 'Requestor', value: dash(row.requested_by) },
                      { label: 'Assigned to', value: dash(row.assigned_to) },
                      { label: 'Amount', value: row.amount == null || row.amount === '' ? '—' : formatInr(row.amount) },
                      { label: 'Step', value: dash(row.current_step) },
                    ]}
                  >
                    {canExpand ? (
                      <div className="px-3 py-4">
                        <MisDetailCard tiles={tiles} />
                      </div>
                    ) : null}
                  </ITTicketMobileCard>
                );
              })}
            </div>
          ) : !pageWide ? (
            <div className={mobileListClass}>
              {pagedItems.map((row, index) => {
                const rowId = financeRowId(row, index);
                const titleId = solarMode ? 'subject' : 'expense_type';
                const fields = tableColumns
                  .filter((col) => col.id !== 'request_id' && col.id !== 'status' && col.id !== titleId)
                  .map((col) => ({ label: col.label, value: financeMobileValue(col, row) }));
                return (
                  <ITTicketMobileCard
                    key={rowId}
                    expandable={false}
                    requestId={dash(row.request_id)}
                    title={financeCardTitle(row, solarMode)}
                    badges={<span className="text-[11px] font-semibold text-slate-600">{dash(row.status)}</span>}
                    fields={fields}
                  />
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className={IT_SURFACE.tableHead}>
                  <tr>
                    {travelMode ? <th className={REFEX_TABLE_HEAD_CELL} aria-label="Expand" /> : null}
                    {tableColumns.map((col) => (
                      <th key={col.id} className={REFEX_TABLE_HEAD_CELL}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((row, index) => {
                    const rowId = financeRowId(row, index);
                    const tiles = travelMode
                      ? travelExpandTiles(row, {
                        includeFareDetails: travelPackFocus?.key !== 'booking' && isTravelBookingRow(row),
                      })
                      : [];
                    const canExpand = tiles.length > 0;
                    const isExpanded = expandedRowId === rowId;
                    return (
                      <Fragment key={rowId}>
                        <tr className={REFEX_TABLE_ROW_CLASS}>
                          {travelMode ? (
                            <td className={REFEX_TABLE_CELL_CLASS}>
                              {canExpand ? (
                                <button
                                  type="button"
                                  aria-label={isExpanded ? 'Hide details' : 'Show details'}
                                  className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded p-1 text-slate-500 hover:bg-slate-100"
                                  onClick={() => setExpandedRowId(isExpanded ? null : rowId)}
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              ) : null}
                            </td>
                          ) : null}
                          {tableColumns.map((col) => (
                            <td key={col.id} className={REFEX_TABLE_CELL_CLASS}>{renderCell(col, row)}</td>
                          ))}
                        </tr>
                        {isExpanded && canExpand ? (
                          <tr>
                            <td colSpan={tableColumns.length + 1} className="p-0">
                              <div className="px-3 py-4 sm:px-5">
                                <MisDetailCard tiles={tiles} />
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <RefexTablePaginationFooter>
            <ITTablePagination
              page={page}
              onPageChange={setPage}
              totalPages={totalPages}
              totalItems={totalItems}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
            />
          </RefexTablePaginationFooter>
        </ITMisTableCard>

        <section className={`mx-auto mt-5 max-w-[1400px] min-w-0 overflow-hidden ${IT_SURFACE.card} ${IT_SURFACE.border} ${IT_SURFACE.shadowTable}`}>
          <button
            type="button"
            aria-expanded={usersOpen}
            onClick={() => setUsersOpen((prev) => !prev)}
            className="flex w-full touch-manipulation items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
          >
            <div className="min-w-0">
              <h2 className={IT_TYPE.sectionTitle}>Users</h2>
              <p className={`${IT_TYPE.sectionSubtitle} truncate`}>Assignees in the current filters</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {misUsers.length ? misUsers.slice(0, 40).map((row) => (
                      <tr key={row.user_id} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-medium text-slate-800">{row.user_name}</td>
                        <td className="px-4 py-2 text-right text-slate-500">{formatSignIn(row.last_sign_in)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.open}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.closed}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.rejected}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.total || (row.open + row.closed + row.rejected)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No assignees in this filter</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className={mobileListClass}>
                {misUsers.length ? misUsers.slice(0, 40).map((row) => (
                  <div key={row.user_id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="truncate text-sm font-semibold text-slate-800">{row.user_name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Last sign-in {formatSignIn(row.last_sign_in)}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      <p className="flex justify-between gap-2"><span className="text-slate-500">Open</span><span className="font-semibold tabular-nums">{row.open}</span></p>
                      <p className="flex justify-between gap-2"><span className="text-slate-500">Closed</span><span className="font-semibold tabular-nums">{row.closed}</span></p>
                      <p className="flex justify-between gap-2"><span className="text-slate-500">Rejected</span><span className="font-semibold tabular-nums">{row.rejected}</span></p>
                      <p className="flex justify-between gap-2"><span className="text-slate-500">Total</span><span className="font-semibold tabular-nums">{row.total || (row.open + row.closed + row.rejected)}</span></p>
                    </div>
                  </div>
                )) : (
                  <p className="py-6 text-center text-sm text-slate-400">No assignees in this filter</p>
                )}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </ITDashboardShell>
  );
}
