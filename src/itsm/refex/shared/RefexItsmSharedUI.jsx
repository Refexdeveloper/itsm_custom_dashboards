/**
 * Shared Refex ITSM dashboard chrome — aligned to IT_CTRL toolbar system.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Briefcase,
  ExternalLink,
  Filter,
  Headset,
  Plus,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import { getGreetingText } from '../../../lib/kfProjectDashboard.js';
import { appendNeEmbedViewerParams } from '../../../lib/neEmbedViewerUrl.js';
import { useDebouncedSearchInput } from '../../../components/it/useDebouncedSearchInput.js';
import { MIS_SLA_FILTER_OPTIONS, getMisSlaFilterOptionsForRows, getAgentQueueTabs } from '../../../lib/kfITServiceDashboard.js';
import { useLiveClock } from '../employeedashboard/useLiveClock.js';
import {
  IT_TYPE,
  IT_CTRL,
  itToolbarIconBtn,
  itToolbarBtnSecondary,
  itToolbarBtnPrimary,
  itChip,
  itSearchInput,
  itFilterSelect,
  itAvatarGradient,
  itSegmentShell,
  itSegmentBtn,
} from '../../../components/it/itDesignTokens.js';
import { ITMisScopeSwitch } from '../../../components/it/mis/ITMisEmployeeUI.jsx';
import ITMisSelectField from '../../../components/it/mis/ITMisSelectField.jsx';
import ITMisMobileFilterSheet, {
  MobileFiltersButton,
  MobileActiveFilterChips,
  MobileFilterField,
} from '../../../components/it/mis/ITMisMobileFilterSheet.jsx';

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

function useFixedDropdownStyle(rootRef, open, { align = 'left', zIndex = 10000, minWidth = '10rem' } = {}) {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !rootRef.current) {
      setStyle(null);
      return undefined;
    }
    const update = () => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const next = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        minWidth,
        zIndex,
      };
      if (align === 'right') {
        next.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
      } else {
        next.left = `${rect.left}px`;
      }
      setStyle(next);
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, rootRef, align, zIndex, minWidth]);

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
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
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
  const q = query.trim().toLowerCase();
  const visibleItems = q
    ? items.filter((item) => !item.value || String(item.label).toLowerCase().includes(q) || String(item.value).toLowerCase().includes(q))
    : items;
  const showSearch = (options || []).length > 5;

  useEffect(() => {
    if (!showSearch) return undefined;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [showSearch]);

  return (
    <div className="min-w-[10rem]">
      {showSearch ? (
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a name…"
          autoComplete="off"
          className="mb-1.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-[var(--it-brand-primary)]"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') e.stopPropagation();
          }}
        />
      ) : null}
      <div className="max-h-56 overflow-y-auto">
        {visibleItems.length ? visibleItems.map((item) => {
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
        }) : (
          <p className="px-2 py-1.5 text-xs text-slate-400">No matching names</p>
        )}
      </div>
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
  /** Refex — Company_Name filter (Project Tracker order: Company first). */
  showCompanyFilter = false,
  company = '',
  onCompanyChange,
  companyOptions = [],
  /** CEO — Assigned To / IT Agents beside Period. */
  showPeopleFilters = false,
  showRequesterFilter = true,
  assignedFilterLabel = 'IT Agents',
  requester = '',
  onRequesterChange,
  requesterOptions = [],
  assignedTo = '',
  onAssignedToChange,
  assignedToOptions = [],
  engagementReportUrl = '',
  engagementReportLabel = 'Engagement Report',
  productLabel = 'Tech Helpdesk',
}) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftCompany, setDraftCompany] = useState(company || '');
  const [draftEntity, setDraftEntity] = useState(entityTab || '');
  const [draftAssignedTo, setDraftAssignedTo] = useState(assignedTo || '');
  const [draftRequester, setDraftRequester] = useState(requester || '');
  const createMenuRef = useRef(null);
  const createMenuPanelRef = useRef(null);
  const createMenuStyle = useFixedDropdownStyle(createMenuRef, createMenuOpen, {
    align: 'right',
    zIndex: 10001,
    minWidth: '11.5rem',
  });
  const hasCreateMenu = Array.isArray(createMenuOptions) && createMenuOptions.length > 0;
  const resolvedEngagementReportUrl = useMemo(
    () => appendNeEmbedViewerParams(engagementReportUrl, { name: userName, title: subtitle }),
    [engagementReportUrl, userName, subtitle],
  );

  const showCompany = showCompanyFilter && companyOptions?.length > 0;
  const showEntity = showEntitySelect && entityOptions?.length > 0;
  const showAgents = showPeopleFilters;
  const hasDimensionFilters = showCompany || showEntity || showAgents || Boolean(periodFilter);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (showCompany && company) n += 1;
    if (showEntity && entityTab && String(entityTab).toLowerCase() !== 'all') n += 1;
    if (showAgents && assignedTo) n += 1;
    if (showAgents && showRequesterFilter && requester) n += 1;
    return n;
  }, [showCompany, company, showEntity, entityTab, showAgents, assignedTo, showRequesterFilter, requester]);

  const filterChips = useMemo(() => {
    const chips = [];
    if (showCompany && company) {
      chips.push({ key: 'company', label: company, onRemove: () => onCompanyChange?.('') });
    }
    if (showEntity && entityTab && String(entityTab).toLowerCase() !== 'all') {
      const entityLabel = entityOptions.find((o) => (o.key || o.value) === entityTab)?.label || entityTab;
      chips.push({ key: 'entity', label: entityLabel, onRemove: () => onEntityChange?.('all') });
    }
    if (showAgents && showRequesterFilter && requester) {
      chips.push({ key: 'requester', label: requester, onRemove: () => onRequesterChange?.('') });
    }
    if (showAgents && assignedTo) {
      chips.push({ key: 'agent', label: assignedTo, onRemove: () => onAssignedToChange?.('') });
    }
    return chips;
  }, [
    showCompany, company, onCompanyChange,
    showEntity, entityTab, entityOptions, onEntityChange,
    showAgents, showRequesterFilter, requester, onRequesterChange,
    assignedTo, onAssignedToChange,
  ]);

  useEffect(() => {
    if (!createMenuOpen) return undefined;
    const onDoc = (event) => {
      if (createMenuRef.current?.contains(event.target)) return;
      if (createMenuPanelRef.current?.contains(event.target)) return;
      setCreateMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [createMenuOpen]);

  useEffect(() => {
    if (!filterSheetOpen) return;
    setDraftCompany(company || '');
    setDraftEntity(entityTab || '');
    setDraftAssignedTo(assignedTo || '');
    setDraftRequester(requester || '');
  }, [filterSheetOpen, company, entityTab, assignedTo, requester]);

  const applyFilterDraft = () => {
    if (showCompany && draftCompany !== (company || '')) onCompanyChange?.(draftCompany);
    if (showEntity && draftEntity !== (entityTab || '')) onEntityChange?.(draftEntity);
    if (showAgents && draftAssignedTo !== (assignedTo || '')) onAssignedToChange?.(draftAssignedTo);
    if (showAgents && showRequesterFilter && draftRequester !== (requester || '')) {
      onRequesterChange?.(draftRequester);
    }
    setFilterSheetOpen(false);
  };

  const clearFilterDraft = () => {
    if (showCompany && company) onCompanyChange?.('');
    if (showEntity && entityTab) onEntityChange?.('');
    if (showAgents && assignedTo) onAssignedToChange?.('');
    if (showAgents && showRequesterFilter && requester) onRequesterChange?.('');
    setFilterSheetOpen(false);
  };

  const createMenuPanel = hasCreateMenu ? (
    <div
      ref={createMenuRef}
      className="relative"
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
      {createMenuOpen && createMenuStyle && typeof document !== 'undefined' ? createPortal(
        <div
          ref={createMenuPanelRef}
          style={createMenuStyle}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
        >
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
        </div>,
        document.body,
      ) : null}
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
  ) : null;

  const renderScopeAndQueueControls = () => (
    <>
      {showQueueSwitch && onQueueChange ? (
        <div className={`${itSegmentShell()} shrink-0`}>
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
      {showScopeSwitch ? (
        <ITMisScopeSwitch activeScope={scope} onChange={onScopeChange} inline />
      ) : null}
    </>
  );

  const chromeActionControls = (
    <>
      {resolvedEngagementReportUrl ? (
        <a
          href={resolvedEngagementReportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${itToolbarBtnSecondary()} inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-semibold`}
          title={engagementReportLabel}
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{engagementReportLabel}</span>
        </a>
      ) : null}
      {onRefresh ? (
        <button
          type="button"
          title={refreshing ? 'Refreshing…' : 'Refresh'}
          aria-label={refreshing ? 'Refreshing dashboard' : 'Refresh dashboard'}
          aria-busy={refreshing}
          disabled={refreshing}
          onClick={onRefresh}
          className={REFEX_HEADER_ICON_BTN}
        >
          <RotateCcw className={`${IT_CTRL.icon} ${loading || refreshing ? 'animate-spin' : ''}`} />
        </button>
      ) : null}
      {createMenuPanel}
    </>
  );

  /** Desktop filter row only — Company / Entity / Period / agents (no Me-Team; that sits top-right). */
  const dimensionSelects = (
    <>
      {showCompany ? (
        <ITMisSelectField
          label="Company"
          value={company || ''}
          onChange={(e) => onCompanyChange?.(e.target.value)}
          options={companyOptions}
          placeholder="All companies"
          allowClear={false}
          stackedLabel
          leadingIcon={Building2}
          className="w-full min-w-0 sm:w-auto sm:min-w-[10.5rem] sm:max-w-[180px]"
        />
      ) : null}
      {showEntity ? (
        <ITMisSelectField
          label="Entity"
          value={entityTab || ''}
          onChange={(e) => onEntityChange?.(e.target.value)}
          options={entityOptions}
          allowClear={false}
          stackedLabel
          leadingIcon={Briefcase}
          className="w-full min-w-0 sm:w-auto sm:min-w-[10.5rem] sm:max-w-[180px]"
        />
      ) : null}
      {periodFilter ? (
        <div className="flex min-w-0 shrink-0 items-end gap-2">
          <div className="min-w-0 [&_button]:min-h-[2.25rem] [&_button]:rounded-xl [&_button]:text-xs sm:[&_button]:text-sm">
            {periodFilter}
          </div>
        </div>
      ) : null}
      {showAgents ? (
        <>
          {showRequesterFilter ? (
            <ITMisSelectField
              label="Requester"
              value={requester || ''}
              onChange={(e) => onRequesterChange?.(e.target.value)}
              options={requesterOptions}
              placeholder="All Requesters"
              allowClear={false}
              stackedLabel
              leadingIcon={Users}
              className="w-full min-w-0 sm:w-auto sm:min-w-[10.5rem] sm:max-w-[180px]"
            />
          ) : null}
          <ITMisSelectField
            label={assignedFilterLabel}
            value={assignedTo || ''}
            onChange={(e) => onAssignedToChange?.(e.target.value)}
            options={assignedToOptions}
            placeholder={assignedFilterLabel.startsWith('All') ? assignedFilterLabel : `All ${assignedFilterLabel}`}
            allowClear={false}
            stackedLabel
            leadingIcon={Users}
            className="w-full min-w-0 sm:w-auto sm:min-w-[10.5rem] sm:max-w-[180px]"
          />
        </>
      ) : null}
    </>
  );

  return (
    <header className="mb-5 flex w-full min-w-0 max-w-full flex-col gap-3 sm:mb-6 md:mb-7">
      {/* Row 1 — greeting | clock + Me/Team + Refresh + Add (desktop top-right cluster) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`${itAvatarGradient()} !h-10 !w-10 !rounded-xl !text-xs sm:!h-11 sm:!w-11`}>
            <Headset className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className={`it-hero-title ${IT_TYPE.pageTitle}`}>
              {getGreetingText()}, {userName || 'User'}
            </h1>
            {subtitle ? (
              <p className={`it-hero-sub mt-0.5 ${IT_TYPE.pageSubtitle}`}>{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {liveClock ? (
            <p className={`${IT_TYPE.meta} text-left sm:text-right`}>{liveClock}</p>
          ) : null}
          <div className={`flex flex-wrap items-center justify-start gap-2 sm:justify-end ${IT_CTRL.gapToolbar}`}>
            {/* Desktop + mobile: Me/Team (+ queue) with refresh / create on the right end */}
            {renderScopeAndQueueControls()}
            {chromeActionControls}
          </div>
        </div>
      </div>

      {/* Row 2 — filters only (mobile sheet / desktop wrap). Me-Team stays top-right. */}
      {hasDimensionFilters ? (
        <>
          <div className="flex w-full min-w-0 max-w-full flex-col gap-2 lg:hidden">
            <MobileFiltersButton count={activeFilterCount} onClick={() => setFilterSheetOpen(true)} />
            <MobileActiveFilterChips chips={filterChips} />
          </div>
          <div className={`hidden w-full min-w-0 max-w-full flex-wrap items-end justify-end gap-2 lg:flex ${IT_CTRL.gapToolbar}`}>
            {dimensionSelects}
          </div>
        </>
      ) : null}

      {hasDimensionFilters ? (
        <ITMisMobileFilterSheet
          open={filterSheetOpen}
          title="Dashboard filters"
          onClose={() => setFilterSheetOpen(false)}
          onClear={clearFilterDraft}
          onApply={applyFilterDraft}
        >
          {showCompany ? (
            <MobileFilterField label="Company">
              <ITMisSelectField
                label="Company"
                value={draftCompany}
                onChange={(e) => setDraftCompany(e.target.value)}
                options={companyOptions}
                placeholder="All companies"
                allowClear={false}
                stackedLabel
                leadingIcon={Building2}
                className="w-full max-w-none sm:max-w-none"
                showLabel={false}
              />
            </MobileFilterField>
          ) : null}
          {showEntity ? (
            <MobileFilterField label="Entity">
              <ITMisSelectField
                label="Entity"
                value={draftEntity}
                onChange={(e) => setDraftEntity(e.target.value)}
                options={entityOptions}
                allowClear={false}
                stackedLabel
                leadingIcon={Briefcase}
                className="w-full max-w-none sm:max-w-none"
                showLabel={false}
              />
            </MobileFilterField>
          ) : null}
          {periodFilter ? (
            <MobileFilterField label="Period">
              <div className="flex w-full max-w-full flex-col gap-2 overflow-x-hidden [&_.relative]:w-full [&_button]:min-h-[2.5rem] [&_button]:w-full [&_button]:max-w-none [&_button]:rounded-xl">
                {periodFilter}
              </div>
            </MobileFilterField>
          ) : null}
          {showAgents && showRequesterFilter ? (
            <MobileFilterField label="Requester">
              <ITMisSelectField
                label="Requester"
                value={draftRequester}
                onChange={(e) => setDraftRequester(e.target.value)}
                options={requesterOptions}
                placeholder="All Requesters"
                allowClear={false}
                stackedLabel
                leadingIcon={Users}
                className="w-full max-w-none sm:max-w-none"
                showLabel={false}
              />
            </MobileFilterField>
          ) : null}
          {showAgents ? (
            <MobileFilterField label={assignedFilterLabel}>
              <ITMisSelectField
                label={assignedFilterLabel}
                value={draftAssignedTo}
                onChange={(e) => setDraftAssignedTo(e.target.value)}
                options={assignedToOptions}
                placeholder={`All ${assignedFilterLabel}`}
                allowClear={false}
                stackedLabel
                leadingIcon={Users}
                className="w-full max-w-none sm:max-w-none"
                showLabel={false}
              />
            </MobileFilterField>
          ) : null}
        </ITMisMobileFilterSheet>
      ) : null}
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
  const searchInput = useDebouncedSearchInput(value, onChange);
  return (
    <label className="relative w-full sm:min-w-[200px] sm:flex-1 lg:min-w-[220px]">
      <Search className={`pointer-events-none absolute left-3 top-1/2 ${IT_CTRL.icon} -translate-y-1/2 text-slate-400`} />
      <input
        type="text"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={searchInput.value}
        onChange={searchInput.onChange}
        onKeyDown={searchInput.onKeyDown}
        onBlur={searchInput.onBlur}
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
  subject = '',
  subjectOptions = [],
  onSubjectChange,
  stages = '',
  stagesOptions = [],
  onStagesChange,
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
  enableSubjectFilter = false,
  enableStagesFilter = false,
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
  if (enableSubjectFilter && col.key === 'subject') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={subject}
        options={subjectOptions}
        onChange={onSubjectChange}
      />
    );
  }
  if (enableStagesFilter && col.key === 'stages') {
    return (
      <RefexMisColumnHeaderFilter
        label={col.label}
        value={stages}
        options={stagesOptions}
        onChange={onStagesChange}
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
    enableSubjectFilter: true,
    subject: misFilters.subject,
    subjectOptions: misFilters.subjectOptions,
    onSubjectChange: misFilters.setSubject,
    enableStagesFilter: true,
    stages: misFilters.stages,
    stagesOptions: misFilters.stagesOptions,
    onStagesChange: misFilters.setStages,
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
