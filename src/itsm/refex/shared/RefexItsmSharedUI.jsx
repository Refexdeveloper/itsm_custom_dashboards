/**
 * Shared Refex ITSM dashboard chrome — aligned to IT_CTRL toolbar system.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Filter, Plus, RotateCcw, Search } from 'lucide-react';
import { getGreetingText } from '../../../lib/kfProjectDashboard.js';
import { MIS_SLA_FILTER_OPTIONS, getMisSlaFilterOptionsForRows, getAgentQueueTabs } from '../../../lib/kfITServiceDashboard.js';
import { useLiveClock } from '../employeedashboard/useLiveClock.js';
import {
  IT_TYPE,
  IT_CTRL,
  itToolbarIconBtn,
  itToolbarBtnPrimary,
  itChip,
  itSearchInput,
  itFilterSelect,
  itAvatarGradient,
  itSegmentShell,
  itSegmentBtn,
} from '../../../components/it/itDesignTokens.js';
import { Headset } from 'lucide-react';
import { ITMisScopeSwitch } from '../../../components/it/mis/ITMisEmployeeUI.jsx';
import ITMisSelectField from '../../../components/it/mis/ITMisSelectField.jsx';

export const REFEX_HEADER_ICON_BTN = itToolbarIconBtn();

export const REFEX_HEADER_CREATE_BTN = `${itToolbarBtnPrimary()} px-3`;

export const REFEX_CONTAINER_CLASS = 'relative z-10 mx-auto w-full max-w-[1600px] px-3 pb-10 pt-4 sm:px-5 lg:px-8';

export const REFEX_TABLE_ROW_CLASS = 'border-t border-slate-200 transition-colors duration-150 hover:bg-slate-50';

export const REFEX_TABLE_CELL_CLASS = 'px-3 py-2 align-middle text-sm font-medium leading-none text-slate-700 sm:px-4';

export const REFEX_TABLE_HEAD_CELL = 'px-3 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600 sm:px-4';

export const REFEX_FILTER_SELECT_CLASS = itFilterSelect('w-full sm:w-auto');

export const REFEX_SEARCH_INPUT_CLASS = itSearchInput('py-2 pl-9');

export function RefexLiveClockText() {
  return useLiveClock();
}

/** Dynamic MIS table title from active KPI / status filter key. */
export function resolveRefexMisTableTitle(filterKey, fallback = 'Tickets', activeQueue = 'ServiceQueue') {
  if (activeQueue === 'ChangeRequests') {
    const crTitles = {
      All: 'All Change Requests',
      AllTickets: 'All Change Requests',
      PendingTask: 'Pending Approvals',
      FirstLevelPending: 'First Level Approver Pending',
      InApproval: 'In Approval',
      Implementation: 'Implementation',
      Completed: 'Completed Requests',
    };
    return crTitles[filterKey] || fallback;
  }
  const titles = {
    All: 'All Tickets',
    AllTickets: 'All Tickets',
    AssignedToMe: 'My Tickets',
    PendingTask: 'Pending Approval',
    Open: 'Open Tickets',
    OpenTickets: 'Open Tickets',
    TodayOpen: 'Today Open',
    OpenToday: 'Today Open',
    HoldTasks: 'On Hold Tickets',
    EmployeeFeedback: 'IT Tech Reopen',
    SlaBreached: 'SLA Breached Tickets',
    TodaySlaBreached: 'Today SLA Breached',
    Closed: 'Closed Tickets',
    TodayClosed: 'Today Closed',
    ClosedToday: 'Today Closed',
    Rejected: 'Rejected Tickets',
    Resolved: 'Closed Tickets',
    Cancelled: 'Cancelled Tickets',
    Reopened: 'Reopened Tickets',
    Active: 'Open Tickets',
    AgentPending: 'Agent Pending Tickets',
    OnHold: 'On Hold Tickets',
  };
  return titles[filterKey] || fallback;
}

function useFixedDropdownStyle(rootRef, open) {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !rootRef.current) {
      setStyle(null);
      return undefined;
    }
    const update = () => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        minWidth: '10rem',
        zIndex: 10000,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, rootRef]);

  return style;
}

function RefexMisFilterDropdownPanel({ open, rootRef, panelRef, children }) {
  const style = useFixedDropdownStyle(rootRef, open);
  if (!open || !style || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className="rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

function RefexMisFilterOptionList({
  value = '',
  options = [],
  onChange,
  allowAll = true,
  allLabel = 'All',
}) {
  const items = [];
  if (allowAll) {
    items.push({ value: '', label: allLabel });
  }
  (options || []).forEach((opt) => {
    const optionValue = typeof opt === 'string' ? opt : (opt?.value ?? opt?.label ?? '');
    const optionLabel = typeof opt === 'string' ? opt : (opt?.label ?? opt?.value ?? '');
    if (!optionValue && optionValue !== '') return;
    if (optionValue === '') return;
    items.push({ value: optionValue, label: optionLabel || optionValue });
  });

  return (
    <div className="max-h-56 min-w-[10rem] overflow-y-auto">
      {items.map((item) => {
        const selected = (value || '') === (item.value || '');
        return (
          <button
            key={`${item.value || '__all'}::${item.label}`}
            type="button"
            className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs font-medium transition ${
              selected
                ? 'bg-[var(--it-brand-primary)]/10 text-[var(--it-brand-primary)]'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange?.(item.value);
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function RefexDashboardHeader({
  userName,
  subtitle,
  liveClock,
  loading = false,
  refreshing = false,
  loadError = '',
  onRefresh,
  onCreateTicket,
  createTitle = 'New',
  createMenuOptions = null,
  periodFilter = null,
  showScopeSwitch = false,
  scope = 'me',
  onScopeChange,
  showQueueSwitch = false,
  activeQueue = 'ServiceQueue',
  onQueueChange,
  queuePendingCounts = null,
  showEntitySelect = false,
  entityTab = '',
  onEntityChange,
  entityOptions = [],
}) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);
  const hasCreateMenu = Array.isArray(createMenuOptions) && createMenuOptions.length > 0;

  useEffect(() => {
    if (!createMenuOpen) return undefined;
    const onDoc = (event) => {
      if (createMenuRef.current?.contains(event.target)) return;
      setCreateMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [createMenuOpen]);

  return (
    <header className="mb-6 flex flex-col gap-3 sm:mb-7 md:mb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3 pr-0 sm:pr-4">
          <div className={`${itAvatarGradient()} !h-10 !w-10 !rounded-xl !text-xs sm:!h-11 sm:!w-11`}>
            <Headset className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">IT Service Desk</p>
            <h1 className={IT_TYPE.pageTitle}>
              {getGreetingText()}, {userName || 'User'}
            </h1>
            {subtitle ? (
              <p className={`mt-1 ${IT_TYPE.pageSubtitle}`}>{subtitle}</p>
            ) : null}
            {loadError ? (
              <p className={`mt-2 ${IT_TYPE.body} text-red-600`}>{loadError}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
          {liveClock ? (
            <p className={`${IT_TYPE.meta} order-2 sm:order-1 sm:text-right`}>{liveClock}</p>
          ) : null}
          <div className={`order-1 flex flex-wrap items-center ${IT_CTRL.gapToolbar} sm:order-2 sm:justify-end`}>
            {showEntitySelect && entityOptions?.length > 0 ? (
              <ITMisSelectField
                label="Entity"
                value={entityTab || ''}
                onChange={(e) => onEntityChange?.(e.target.value)}
                options={entityOptions}
                allowClear={false}
                toolbar
                showLabel={false}
                className="min-w-[9.5rem] sm:max-w-[160px]"
              />
            ) : null}
            {showQueueSwitch && onQueueChange ? (
              <div className={itSegmentShell()}>
                {getAgentQueueTabs().map((opt) => {
                  const active = activeQueue === opt.key;
                  void queuePendingCounts;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => onQueueChange(opt.key)}
                      className={itSegmentBtn(active, 'whitespace-nowrap')}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {periodFilter ? (
              <div className="flex shrink-0 items-center">{periodFilter}</div>
            ) : null}
            {showScopeSwitch ? (
              <ITMisScopeSwitch activeScope={scope} onChange={onScopeChange} inline />
            ) : null}
            {onRefresh ? (
              <button
                type="button"
                title="Refresh"
                aria-label="Refresh dashboard"
                disabled={loading || refreshing}
                onClick={onRefresh}
                className={REFEX_HEADER_ICON_BTN}
              >
                <RotateCcw className={`${IT_CTRL.icon} ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            ) : null}
            {hasCreateMenu ? (
              <div
                ref={createMenuRef}
                className="relative"
                onMouseEnter={() => setCreateMenuOpen(true)}
                onMouseLeave={() => setCreateMenuOpen(false)}
              >
                <button
                  type="button"
                  title={createTitle}
                  aria-label={createTitle}
                  aria-expanded={createMenuOpen}
                  onClick={() => setCreateMenuOpen((prev) => !prev)}
                  className={`${REFEX_HEADER_CREATE_BTN} transition-transform duration-200 ${createMenuOpen ? 'scale-105' : ''}`}
                >
                  <Plus className={`${IT_CTRL.icon} transition-transform duration-200 ${createMenuOpen ? 'rotate-45' : ''}`} />
                </button>
                <div
                  className={`absolute right-0 top-full z-50 origin-top-right pt-2 transition-all duration-200 ${
                    createMenuOpen
                      ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                      : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
                  }`}
                >
                  <div className="min-w-[11.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                    {createMenuOptions.map((opt) => (
                      <button
                        key={opt.key || opt.label}
                        type="button"
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-[var(--it-brand-primary)]/10 hover:text-[var(--it-brand-primary)]"
                        onClick={() => {
                          setCreateMenuOpen(false);
                          opt.onClick?.();
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : onCreateTicket ? (
              <button
                type="button"
                title={createTitle}
                aria-label={createTitle}
                onClick={onCreateTicket}
                className={REFEX_HEADER_CREATE_BTN}
              >
                <Plus className={IT_CTRL.icon} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Status MIS tabs — unified chip style. */
export function RefexPillTabs({ tabs = [], activeTab, onTabChange, tabCounts = {} }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            title={tab.tooltip || tab.label}
            onClick={() => onTabChange(tab.key)}
            className={itChip(active)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function RefexSearchField({ value, onChange, placeholder = 'Search Tickets...' }) {
  return (
    <label className="relative w-full sm:min-w-[200px] sm:flex-1 lg:min-w-[220px]">
      <Search className={`pointer-events-none absolute left-3 top-1/2 ${IT_CTRL.icon} -translate-y-1/2 text-slate-400`} />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={REFEX_SEARCH_INPUT_CLASS}
      />
    </label>
  );
}

export function RefexTeamEmptyState() {
  return (
    <div className="px-5 py-16 text-center">
      <p className={IT_TYPE.sectionTitle}>My Team</p>
      <p className={`mt-2 ${IT_TYPE.body} text-slate-500`}>Team data will be available soon.</p>
    </div>
  );
}

export function refexStickyHeadClass(col) {
  void col;
  return '';
}

export function refexStickyCellClass(col, rowBg = 'bg-white') {
  void col;
  void rowBg;
  return '';
}

export function RefexTablePaginationFooter({ children }) {
  return (
    <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
      {children}
    </div>
  );
}

/**
 * Excel-style column header filter — label + funnel icon dropdown in the MIS th.
 * Same filter values as the toolbar selects; placement only changes.
 */
export function RefexMisColumnHeaderFilter({
  label,
  value = '',
  options = [],
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const active = Boolean(value);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-50 inline-flex max-w-full items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        title={`Filter ${label}`}
        aria-label={`Filter ${label}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition ${
          active
            ? 'bg-[var(--it-brand-primary)]/15 text-[var(--it-brand-primary)]'
            : 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-600'
        }`}
      >
        <Filter className="h-3 w-3" strokeWidth={2.25} />
      </button>
      <RefexMisFilterDropdownPanel open={open} rootRef={rootRef} panelRef={panelRef}>
        <RefexMisFilterOptionList
          value={value}
          options={options}
          onChange={(next) => {
            onChange?.(next || '');
            setOpen(false);
          }}
        />
        {active ? (
          <button
            type="button"
            className="mt-1.5 w-full rounded-md px-2 py-1 text-left text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange?.('');
              setOpen(false);
            }}
          >
            Clear filter
          </button>
        ) : null}
      </RefexMisFilterDropdownPanel>
    </div>
  );
}

/** Created / requested date range filter — opens a date dialog from the MIS column header. */
export function RefexMisCreatedDateFilter({
  label = 'Created Date',
  from = '',
  to = '',
  onFromChange,
  onToChange,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const active = Boolean(from || to);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-50 inline-flex max-w-full items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        title={`Filter ${label}`}
        aria-label={`Filter ${label}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition ${
          active
            ? 'bg-[var(--it-brand-primary)]/15 text-[var(--it-brand-primary)]'
            : 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-600'
        }`}
      >
        <Filter className="h-3 w-3" strokeWidth={2.25} />
      </button>
      <RefexMisFilterDropdownPanel open={open} rootRef={rootRef} panelRef={panelRef}>
        <div className="flex min-w-[12rem] flex-col gap-2 p-1">
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
            From
            <input
              type="date"
              value={from || ''}
              onChange={(e) => onFromChange?.(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[var(--it-brand-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
            To
            <input
              type="date"
              value={to || ''}
              onChange={(e) => onToChange?.(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[var(--it-brand-primary)]"
            />
          </label>
          {active ? (
            <button
              type="button"
              className="w-full rounded-md px-2 py-1 text-left text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear?.();
                setOpen(false);
              }}
            >
              Clear date filter
            </button>
          ) : null}
        </div>
      </RefexMisFilterDropdownPanel>
    </div>
  );
}

/**
 * Excel-style Request ID sort — Ascending / Descending in the MIS th.
 */
export function RefexMisRequestIdSortFilter({
  label = 'Request ID',
  value = 'asc',
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const active = value === 'desc';

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-50 inline-flex max-w-full items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        title="Sort Request ID"
        aria-label="Sort Request ID"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition ${
          active
            ? 'bg-[var(--it-brand-primary)]/15 text-[var(--it-brand-primary)]'
            : 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-600'
        }`}
      >
        <Filter className="h-3 w-3" strokeWidth={2.25} />
      </button>
      <RefexMisFilterDropdownPanel open={open} rootRef={rootRef} panelRef={panelRef}>
        <RefexMisFilterOptionList
          value={value || 'asc'}
          allowAll={false}
          options={[
            { value: 'asc', label: 'Ascending' },
            { value: 'desc', label: 'Descending' },
          ]}
          onChange={(next) => {
            onChange?.(next || 'asc');
            setOpen(false);
          }}
        />
      </RefexMisFilterDropdownPanel>
    </div>
  );
}

/** Render MIS th content — attaches Excel-style filters for key Refex columns. */
export function renderRefexMisTableHeadLabel(col, {
  ticketStatus = '',
  ticketStatusOptions = [],
  onTicketStatusChange,
  assignedTo = '',
  assignedToOptions = [],
  onAssignedToChange,
  requester = '',
  requesterOptions = [],
  onRequesterChange,
  criticality = '',
  criticalityOptions = [],
  onCriticalityChange,
  ticketType = '',
  ticketTypeOptions = [],
  onTicketTypeChange,
  category = '',
  categoryOptions = [],
  onCategoryChange,
  subCategory = '',
  subCategoryOptions = [],
  onSubCategoryChange,
  source = '',
  sourceOptions = [],
  onSourceChange,
  closedBy = '',
  closedByOptions = [],
  onClosedByChange,
  sla = '',
  slaOptions = [],
  onSlaChange,
  createdDateFrom = '',
  createdDateTo = '',
  onCreatedDateFromChange,
  onCreatedDateToChange,
  onCreatedDateClear,
  closedDateFrom = '',
  closedDateTo = '',
  onClosedDateFromChange,
  onClosedDateToChange,
  onClosedDateClear,
  reopenedDateFrom = '',
  reopenedDateTo = '',
  onReopenedDateFromChange,
  onReopenedDateToChange,
  onReopenedDateClear,
  sortOrder = 'asc',
  onSortOrderChange,
  enableTicketStatusFilter = false,
  enableAssignedToFilter = false,
  enableRequesterFilter = false,
  enableCriticalityFilter = false,
  enableTicketTypeFilter = false,
  enableCategoryFilter = false,
  enableSubCategoryFilter = false,
  enableSourceFilter = false,
  enableClosedByFilter = false,
  enableSlaFilter = false,
  enableCreatedDateFilter = false,
  enableClosedDateFilter = false,
  enableReopenedDateFilter = false,
  enableRequestIdSort = false,
} = {}) {
  if (enableRequestIdSort && col.key === 'requestId') {
    return (
      <RefexMisRequestIdSortFilter
        label={col.label}
        value={sortOrder}
        onChange={onSortOrderChange}
      />
    );
  }
  if (
    enableCreatedDateFilter
    && (col.key === 'createdAt' || col.key === 'createdOn' || col.key === 'requestedDate' || col.key === 'requestedDateTime' || col.key === 'date')
  ) {
    return (
      <RefexMisCreatedDateFilter
        label={col.label}
        from={createdDateFrom}
        to={createdDateTo}
        onFromChange={onCreatedDateFromChange}
        onToChange={onCreatedDateToChange}
        onClear={onCreatedDateClear}
      />
    );
  }
  if (enableClosedDateFilter && (col.key === 'closedOn' || col.key === 'closedAt' || col.key === 'closedDate')) {
    return (
      <RefexMisCreatedDateFilter
        label={col.label}
        from={closedDateFrom}
        to={closedDateTo}
        onFromChange={onClosedDateFromChange}
        onToChange={onClosedDateToChange}
        onClear={onClosedDateClear}
      />
    );
  }
  if (enableReopenedDateFilter && (col.key === 'reopenedOn' || col.key === 'reopenedAt')) {
    return (
      <RefexMisCreatedDateFilter
        label={col.label}
        from={reopenedDateFrom}
        to={reopenedDateTo}
        onFromChange={onReopenedDateFromChange}
        onToChange={onReopenedDateToChange}
        onClear={onReopenedDateClear}
      />
    );
  }
  if (enableSlaFilter && col.key === 'sla') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={sla}
        options={slaOptions}
        onChange={onSlaChange}
      />
    );
  }
  if (enableTicketStatusFilter && col.key === 'ticketStatus') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={ticketStatus}
        options={ticketStatusOptions}
        onChange={onTicketStatusChange}
      />
    );
  }
  if (enableAssignedToFilter && col.key === 'assignedTo') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={assignedTo}
        options={assignedToOptions}
        onChange={onAssignedToChange}
      />
    );
  }
  if (enableRequesterFilter && col.key === 'requester') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={requester}
        options={requesterOptions}
        onChange={onRequesterChange}
      />
    );
  }
  if (enableCriticalityFilter && col.key === 'criticality') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={criticality}
        options={criticalityOptions}
        onChange={onCriticalityChange}
      />
    );
  }
  if (enableTicketTypeFilter && (col.key === 'ticketType' || col.key === 'requestType')) {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={ticketType}
        options={ticketTypeOptions}
        onChange={onTicketTypeChange}
      />
    );
  }
  if (enableCategoryFilter && (col.key === 'category' || col.key === 'changeType')) {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={category}
        options={categoryOptions}
        onChange={onCategoryChange}
      />
    );
  }
  if (enableSubCategoryFilter && col.key === 'subCategory') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={subCategory}
        options={subCategoryOptions}
        onChange={onSubCategoryChange}
      />
    );
  }
  if (enableSourceFilter && col.key === 'source') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={source}
        options={sourceOptions}
        onChange={onSourceChange}
      />
    );
  }
  if (enableClosedByFilter && col.key === 'closedBy') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={closedBy}
        options={closedByOptions}
        onChange={onClosedByChange}
      />
    );
  }
  return col.label;
}

/** Shared Refex service MIS header filter props — same filters on every card/tab. */
export function getRefexServiceMisHeadLabelProps({
  col,
  misFilters = {},
  sortOrder = 'asc',
  onSortOrderChange,
  ticketStatusOptions = [],
  slaOptions = [],
  /** Rows in the active tab — used to hide SLA filter when no SLA/reopen states exist. */
  tabRows = null,
} = {}) {
  const resolvedSlaOptions = Array.isArray(tabRows)
    ? getMisSlaFilterOptionsForRows(tabRows)
    : (Array.isArray(slaOptions) && slaOptions.length
      ? slaOptions
      : MIS_SLA_FILTER_OPTIONS);
  return {
    enableTicketStatusFilter: true,
    ticketStatus: misFilters.ticketStatus,
    ticketStatusOptions: misFilters.ticketStatusOptions?.length
      ? misFilters.ticketStatusOptions
      : ticketStatusOptions,
    onTicketStatusChange: misFilters.setTicketStatus,
    enableAssignedToFilter: true,
    assignedTo: misFilters.assignedTo,
    assignedToOptions: misFilters.assignedToOptions,
    onAssignedToChange: misFilters.setAssignedTo,
    enableRequesterFilter: true,
    requester: misFilters.requester,
    requesterOptions: misFilters.requesterOptions,
    onRequesterChange: misFilters.setRequester,
    enableCriticalityFilter: true,
    criticality: misFilters.criticality,
    criticalityOptions: misFilters.criticalityOptions,
    onCriticalityChange: misFilters.setCriticality,
    enableTicketTypeFilter: true,
    ticketType: misFilters.ticketType,
    ticketTypeOptions: misFilters.ticketTypeOptions,
    onTicketTypeChange: misFilters.setTicketType,
    enableCategoryFilter: true,
    category: misFilters.category,
    categoryOptions: misFilters.categoryOptions,
    onCategoryChange: misFilters.setCategory,
    enableSubCategoryFilter: true,
    subCategory: misFilters.subCategory,
    subCategoryOptions: misFilters.subCategoryOptions,
    onSubCategoryChange: misFilters.setSubCategory,
    enableSourceFilter: true,
    source: misFilters.source,
    sourceOptions: misFilters.sourceOptions,
    onSourceChange: misFilters.setSource,
    enableClosedByFilter: true,
    closedBy: misFilters.closedBy,
    closedByOptions: misFilters.closedByOptions,
    onClosedByChange: misFilters.setClosedBy,
    // Show SLA filter only when rows have On Track / At Risk / Breached / reopen window states.
    enableSlaFilter: resolvedSlaOptions.length > 0,
    sla: misFilters.sla,
    slaOptions: resolvedSlaOptions,
    onSlaChange: misFilters.setSla,
    enableCreatedDateFilter: true,
    createdDateFrom: misFilters.createdDateFrom,
    createdDateTo: misFilters.createdDateTo,
    onCreatedDateFromChange: misFilters.setCreatedDateFrom,
    onCreatedDateToChange: misFilters.setCreatedDateTo,
    onCreatedDateClear: () => {
      misFilters.setCreatedDateFrom?.('');
      misFilters.setCreatedDateTo?.('');
    },
    enableClosedDateFilter: true,
    closedDateFrom: misFilters.closedDateFrom,
    closedDateTo: misFilters.closedDateTo,
    onClosedDateFromChange: misFilters.setClosedDateFrom,
    onClosedDateToChange: misFilters.setClosedDateTo,
    onClosedDateClear: () => {
      misFilters.setClosedDateFrom?.('');
      misFilters.setClosedDateTo?.('');
    },
    enableReopenedDateFilter: true,
    reopenedDateFrom: misFilters.reopenedDateFrom,
    reopenedDateTo: misFilters.reopenedDateTo,
    onReopenedDateFromChange: misFilters.setReopenedDateFrom,
    onReopenedDateToChange: misFilters.setReopenedDateTo,
    onReopenedDateClear: () => {
      misFilters.setReopenedDateFrom?.('');
      misFilters.setReopenedDateTo?.('');
    },
    enableRequestIdSort: true,
    sortOrder,
    onSortOrderChange,
  };
}
