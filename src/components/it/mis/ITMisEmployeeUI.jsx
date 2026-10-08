/**
 * MIS-style employee dashboard shell (expense / travel / project Kissflow patterns).
 * uiVariant="mis" → classic  |  uiVariant="mis-modern" → animated modern (Extrovis trial).
 */
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, ListTodo, CheckCircle2, XCircle, Plus, RotateCcw, Search,
  Clock, AlertTriangle, ChevronDown, ChevronUp, MessageCircle, Calendar, List,
  Wrench, GitBranch,
} from 'lucide-react';
import { getGreetingText, toInitials } from '../../../lib/kfProjectDashboard.js';
import { getAgentQueueTabs } from '../../../lib/kfITServiceDashboard.js';
import { MIS_MAX_KPI_CARDS, kpiStripClass, misKpiGridForCount, useKpiStripWide } from './misKpiLayout.js';
import { useCountUp, ITMobileFieldGrid, ITMisSelectField } from '../ITDashboardUI.jsx';
import { IT_SURFACE, IT_TYPE, IT_CTRL, IT_KPI_ACCENT, itToolbarBtnSecondary, itToolbarBtnPrimary, itToolbarShellMuted, itToolbarBadge, itSegmentShell, itSegmentBtn, itChip, itTabCount, itSearchInput, itAvatarGradient, itSectionShell, itExpandBtn } from '../itDesignTokens.js';

const KPI_CARDS = [
  { label: 'Open Tickets', sub: 'Awaiting assignment', icon: FolderOpen, bg: 'bg-[#E8F1FD]', ...IT_KPI_ACCENT.brand },
  { label: 'In Progress', sub: 'Being worked on', icon: ListTodo, bg: 'bg-[#FFF4E5]', ...IT_KPI_ACCENT.violet },
  { label: 'Resolved', sub: 'Completed tickets', icon: CheckCircle2, bg: 'bg-[#E8F6ED]', ...IT_KPI_ACCENT.success },
  { label: 'Cancelled', sub: 'Withdrawn tickets', icon: XCircle, bg: 'bg-[#FFEBE6]', ...IT_KPI_ACCENT.error },
];

const SLA_CARDS = [
  { label: 'Nearing SLA', sub: 'Tickets at risk', icon: Clock, bg: 'bg-[#FFF4E5]', ...IT_KPI_ACCENT.warning },
  { label: 'SLA Breached', sub: 'Past deadline', icon: AlertTriangle, bg: 'bg-[#FFEBE6]', ...IT_KPI_ACCENT.error },
];

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

function formatTodayPill() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/** Unified display-only stat card — same PM layout for all metrics. */
export function ITMisKpiStatCard(props) {
  return <MisStatCard {...props} modern />;
}

function MisStatCard({
  label, value, sub, icon: Icon, bg, border, wash, radial, iconGradient, accent, watermark, delay = 0, modern = false, insightRow = false, loading = false, onClick, active = false, compact = true,
}) {
  const isTextValue = typeof value === 'string' && (value.includes('%') || value.includes(' ') || value === '—' || Number.isNaN(Number(value)));
  const animated = useCountUp(isTextValue ? 0 : value, 900, { frozen: loading });
  const displayValue = loading ? 0 : (isTextValue ? (value ?? '—') : animated);

  if (modern) {
    const cardBorder = border || IT_KPI_ACCENT.brand.border;
    const cardWash = wash || IT_KPI_ACCENT.brand.wash;
    const cardRadial = radial || IT_KPI_ACCENT.brand.radial;
    const cardIconGradient = iconGradient || IT_KPI_ACCENT.brand.iconGradient;
    const valueClass = accent || IT_KPI_ACCENT.brand.accent;
    const watermarkClass = watermark || IT_KPI_ACCENT.brand.watermark;

    if (insightRow) {
      const activeRing = active ? 'ring-2 ring-[var(--it-brand-primary)] border-[var(--it-brand-primary)] shadow-md' : '';
      const interactiveClass = onClick ? 'cursor-pointer transition hover:shadow-md' : '';
      const activeCardBorder = active ? 'border-[var(--it-brand-primary)]' : cardBorder;
      const inner = (
        <>
          <span aria-hidden className={`pointer-events-none absolute inset-0 ${cardWash}`} />
          <span aria-hidden className={`pointer-events-none absolute inset-0 opacity-[0.82] ${cardRadial}`} />
          <div className={`relative z-10 flex h-full min-h-0 min-w-0 flex-1 items-start justify-between gap-1.5 ${compact ? 'p-2.5 sm:gap-2 lg:p-3' : 'p-3 sm:gap-3 sm:p-4'}`}>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className={`leading-tight ${IT_TYPE.kpiLabel}`}>{label}</p>
              <p className={`mt-1 min-w-0 font-bold tabular-nums leading-none tracking-tight sm:mt-1.5 ${IT_TYPE.kpiValue} ${valueClass}`}>
                {displayValue}
              </p>
              {sub ? (
                <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight text-slate-400 sm:text-xs">
                  {sub}
                </p>
              ) : null}
            </div>
            <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm lg:h-10 lg:w-10 lg:rounded-xl ${cardIconGradient}`}>
              <Icon className="h-3.5 w-3.5 lg:h-[18px] lg:w-[18px]" strokeWidth={2.25} />
            </div>
          </div>
        </>
      );
      if (onClick) {
        return (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClick}
            className={`group relative h-full w-full min-w-0 overflow-hidden rounded-2xl border bg-white text-left it-kpi-card @container ${compact ? 'min-h-[96px] lg:min-h-[120px]' : 'min-h-[112px] lg:min-h-[168px]'} ${IT_SURFACE.shadowKpi} ${activeCardBorder} ${activeRing} ${interactiveClass}`}
          >
            {inner}
          </motion.button>
        );
      }
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`group relative h-full w-full min-w-0 overflow-hidden rounded-2xl border bg-white it-kpi-card @container ${compact ? 'min-h-[96px] lg:min-h-[120px]' : 'min-h-[112px] lg:min-h-[168px]'} ${IT_SURFACE.shadowKpi} ${activeCardBorder} ${activeRing}`}
        >
          {inner}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={`group relative w-full overflow-hidden rounded-2xl border bg-white it-kpi-card @container ${IT_SURFACE.shadowKpi} ${cardBorder} min-h-[96px] md:min-h-[108px]`}
      >
        <span aria-hidden className={`pointer-events-none absolute inset-0 ${cardWash}`} />
        <span aria-hidden className={`pointer-events-none absolute inset-0 opacity-[0.82] ${cardRadial}`} />
        <span aria-hidden className={`pointer-events-none absolute bottom-2 right-2 opacity-[0.15] ${watermarkClass}`}>
          <Icon className="h-14 w-14 md:h-16 md:w-16" strokeWidth={1.25} />
        </span>
        <div className="relative z-10 flex h-full flex-col p-3 sm:p-3.5">
          <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm md:h-7 md:w-7 ${cardIconGradient}`}>
            <Icon className="h-[18px] w-[18px] md:h-3.5 md:w-3.5" strokeWidth={2} />
          </div>
            <div className="mt-2 min-w-0 flex-1">
              <p className={`line-clamp-2 min-h-[2.4em] leading-snug ${IT_TYPE.kpiLabel}`}>{label}</p>
              <p className={`mt-1.5 md:mt-2 ${IT_TYPE.kpiValue} ${valueClass}`}>{displayValue}</p>
            </div>
        </div>
      </motion.div>
    );
  }

  const body = (
    <div className="flex items-start justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#626F86]">{label}</p>
        <p className={`mt-1.5 sm:mt-2 ${IT_TYPE.kpiValue} text-[#172B4D]`}>{displayValue}</p>
        <p className="mt-0.5 text-[11px] text-[#626F86] sm:text-xs">{sub}</p>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-slate-200/60 sm:h-11 sm:w-11 text-[#0d9488]">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className={`flex h-full min-h-[6.25rem] w-full flex-col rounded-2xl border border-transparent p-4 shadow-sm ${bg}`}
    >
      {body}
    </motion.div>
  );
}

function ClassicHeader(props) {
  const {
    userName, poolLabel, companyName, roleLabel, connected, loading, refreshing = false, loadError,
    onRefresh, onCreateTicket, createTicketLabel = 'New Request', lastUpdatedAt,
  } = props;
  const displayRole = roleLabel || poolLabel || companyName;
  const updated = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString(undefined, {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
    : '';

  return (
    <header className="border-b border-gray-300 bg-white px-4 py-5 sm:px-6 shadow-sm">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D] sm:text-[1.65rem]">
            {getGreetingText()}, {userName || 'User'}{' '}
            <span aria-hidden="true">👋</span>
          </h1>
          {displayRole ? (
            <p className={`mt-1 ${IT_TYPE.entityName}`}>{displayRole}</p>
          ) : null}
          {updated ? <p className="mt-0.5 text-xs text-[#97A0AF]">Last updated {updated}</p> : null}
          {loadError ? <p className="mt-2 text-sm font-medium text-[#AE2A19]">{loadError}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!connected && !loading && (
            <span className="rounded-full border border-[#FFE380] bg-[#FFF7D6] px-3 py-1 text-xs font-semibold text-[#7F5F01]">
              Preview mode
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={itToolbarBtnSecondary()}
          >
            <RotateCcw className={`${IT_CTRL.icon} ${loading || refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {onCreateTicket ? (
            <button
              type="button"
              onClick={onCreateTicket}
              className={itToolbarBtnPrimary()}
            >
              <Plus className={IT_CTRL.icon} />
              {createTicketLabel}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ModernHeader(props) {
  const {
    userName, poolLabel, companyName, roleLabel, connected, loading, refreshing = false, loadError,
    onRefresh, onCreateTicket, createTicketLabel = 'New Request',
    scopeTab, onScopeChange, showScopeSwitch = false,
    entityTab, onEntityChange, showEntitySelect = false, entityOptions = [],
    periodFilter = null,
  } = props;
  const displayRole = roleLabel || poolLabel || companyName;
  const initials = toInitials(userName || 'User');

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)] backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className={`${itAvatarGradient()} !h-9 !w-9 !text-xs sm:!h-10 sm:!w-10 sm:!text-sm`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">IT HelpDesk</p>
            <h1 className={`truncate ${IT_TYPE.pageTitle}`}>
              {getGreetingText()}, {userName || 'User'}
            </h1>
            {displayRole ? (
              <p className={`mt-0.5 truncate ${IT_TYPE.entityName}`}>
                {displayRole}
              </p>
            ) : null}
            {loadError ? (
              <p className="mt-1 text-xs font-medium text-[#AE2A19]">{loadError}</p>
            ) : null}
          </div>
        </div>

        <div className={`flex flex-wrap items-center justify-end ${IT_CTRL.gapToolbar}`}>
          {showEntitySelect && entityOptions.length > 0 ? (
            <ITMisSelectField
              label="Entity"
              showLabel={false}
              toolbar
              value={entityTab}
              onChange={(e) => onEntityChange?.(e.target.value)}
              options={entityOptions}
              allowClear={false}
              placeholder="Entity"
              variant="filter"
              className="w-auto shrink-0 sm:max-w-[180px]"
            />
          ) : null}
          {periodFilter ? (
            <div className="flex shrink-0 items-center sm:w-auto">{periodFilter}</div>
          ) : null}
          {showScopeSwitch ? (
            <ITMisScopeSwitch
              inline
              activeScope={scopeTab}
              onChange={onScopeChange}
            />
          ) : null}
          <div className={`hidden sm:flex ${itToolbarShellMuted()}`}>
            <Calendar className={`${IT_CTRL.icon} text-slate-400`} />
            <span className="font-medium">{formatTodayPill()}</span>
          </div>
          {!connected && !loading && (
            <span className={itToolbarBadge()}>Preview</span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={itToolbarBtnSecondary()}
          >
            <RotateCcw className={`${IT_CTRL.icon} ${loading || refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {onCreateTicket ? (
            <button
              type="button"
              onClick={onCreateTicket}
              title={createTicketLabel}
              aria-label={createTicketLabel}
              className={itToolbarBtnPrimary()}
            >
              <Plus className={IT_CTRL.icon} />
              <span className="hidden sm:inline">{createTicketLabel}</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function ITMisEmployeeHeader({ modern = false, ...props }) {
  return modern ? <ModernHeader {...props} /> : <ClassicHeader {...props} />;
}

export function ITMisEmployeeKpiStrip({
  modern = false,
  tabCounts,
  slaAtRisk = 0,
  slaBreached = 0,
  customCards = null,
  loading = false,
  flush = false,
}) {
  const [stripRef, stripWide] = useKpiStripWide();

  if (customCards?.length) {
    const mainCards = customCards.filter((c) => !c.isSla).slice(0, MIS_MAX_KPI_CARDS);
    const slaCards = customCards.filter((c) => c.isSla).slice(0, Math.max(0, MIS_MAX_KPI_CARDS - mainCards.length));
    const stripCards = [...mainCards, ...slaCards];
    return (
      <section ref={stripRef} className={kpiStripClass(stripWide, `${flush ? 'py-3' : 'px-3 py-3 sm:px-6 sm:py-4'} ${modern ? '' : 'bg-gray-100'}`)}>
        <div className={`mx-auto min-w-0 w-full max-w-[1400px] ${misKpiGridForCount(stripCards.length)}`}>
            {stripCards.map((card, idx) => (
              <div key={card.label} className="h-full min-w-0">
                <MisStatCard
                label={card.label}
                value={card.value ?? 0}
                sub={card.sub}
                icon={card.icon || FolderOpen}
                bg={card.bg || 'bg-[#E8F1FD]'}
                border={card.border}
                wash={card.wash}
                radial={card.radial}
                iconGradient={card.iconGradient}
                accent={card.accent}
                watermark={card.watermark}
                delay={modern ? 0.04 + idx * 0.03 : idx * 0.04}
                modern={modern}
                insightRow
                compact
                loading={loading}
                onClick={card.onClick}
                active={Boolean(card.active)}
              />
              </div>
            ))}
        </div>
      </section>
    );
  }

  const kpiValues = [
    tabCounts?.Open ?? 0,
    tabCounts?.InProgress ?? 0,
    tabCounts?.Resolved ?? 0,
    tabCounts?.Cancelled ?? 0,
  ];
  const slaValues = [slaAtRisk, slaBreached];
  const defaultCardCount = KPI_CARDS.length + (modern ? SLA_CARDS.length : 0);

  return (
    <section ref={stripRef} className={kpiStripClass(stripWide, `px-3 py-3 sm:px-6 sm:py-4 ${modern ? '' : 'bg-gray-100'}`)}>
      <div className={`mx-auto min-w-0 w-full max-w-[1400px] ${misKpiGridForCount(defaultCardCount)}`}>
          {KPI_CARDS.map((card, idx) => (
            <MisStatCard
              key={card.label}
              label={card.label}
              value={kpiValues[idx]}
              sub={card.sub}
              icon={card.icon}
              bg={card.bg}
              border={card.border}
              wash={card.wash}
              radial={card.radial}
              iconGradient={card.iconGradient}
              accent={card.accent}
              watermark={card.watermark}
              delay={modern ? 0.04 + idx * 0.03 : idx * 0.04}
              modern={modern}
              insightRow
              compact
            />
          ))}
          {modern ? SLA_CARDS.map((card, idx) => (
            <MisStatCard
              key={card.label}
              label={card.label}
              value={slaValues[idx]}
              sub={card.sub}
              icon={card.icon}
              bg={card.bg}
              border={card.border}
              wash={card.wash}
              radial={card.radial}
              iconGradient={card.iconGradient}
              accent={card.accent}
              watermark={card.watermark}
              delay={0.16 + idx * 0.03}
              modern={modern}
              insightRow
              compact
            />
          )) : null}

        {!modern ? (
        <div className={`mt-3 ${MIS_KPI_GRID_CLASS}`}>
          {SLA_CARDS.map((card, idx) => (
            <MisStatCard
              key={card.label}
              label={card.label}
              value={slaValues[idx]}
              sub={card.sub}
              icon={card.icon}
              bg={card.bg}
              delay={0}
              modern={modern}
            />
          ))}
        </div>
        ) : null}
      </div>
    </section>
  );
}

/** Desktop-only MIS comments action (hidden on mobile). */
export function ITMisCommentsButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title="Comments"
      className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-[#99f6e4] hover:bg-[#f0fdfa] hover:text-[#0f766e] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#0d9488] to-[#059669] text-white">
        <MessageCircle className="h-3 w-3" />
      </span>
      Comments
    </button>
  );
}

export function ITMisMobileTicketCard({
  expanded,
  onToggle,
  requestId,
  title,
  subtitle,
  badges,
  fields,
  children,
  index = 0,
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className={`transition-shadow ${
        expanded
          ? 'overflow-visible rounded-2xl border border-[#99f6e4] bg-white p-3 shadow-md ring-1 ring-[#ccfbf1] sm:p-4'
          : 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm hover:shadow-md sm:p-4'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full touch-manipulation items-start gap-2.5 text-left"
        aria-expanded={expanded}
      >
        <span className={itExpandBtn(expanded, true)}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-[#ccfbf1] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f766e]">
            {requestId}
          </span>
          <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-800">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-[#626F86]">{subtitle}</p>
          ) : null}
          {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
          {!expanded && fields?.length > 0 && (
            <div className="mt-2.5">
              <ITMobileFieldGrid fields={fields} />
            </div>
          )}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && children ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-visible border-t border-gray-200"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export function ITMisRequestsTableHeader({
  title = 'My requests',
  subtitle,
  openCount = 0,
  overdueCount = 0,
  filters = null,
}) {
  const sub = subtitle ?? `${openCount} open · ${overdueCount} SLA at risk`;
  return (
    <div className={`${IT_SURFACE.sectionHead} px-3 py-3 sm:px-5 sm:py-4`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ccfbf1] text-[#0f766e] sm:h-10 sm:w-10">
            <List className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h3 className={IT_TYPE.sectionTitle}>{title}</h3>
            <p className={IT_TYPE.sectionSubtitle}>{sub}</p>
          </div>
        </div>
        {filters ? (
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            {filters}
          </div>
        ) : null}
      </div>
    </div>
  );
}
export function ITMisTableSectionLabel({ label = 'ALL REQUESTS', modern = false }) {
  if (modern) return null;
  const className = 'mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#97A0AF] sm:mb-3 sm:text-[11px]';
  return <p className={className}>{label}</p>;
}

export function ITMisSearchBar({
  value, onChange, placeholder = 'Search request ID, summary, category…', modern = false,
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#97A0AF]" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={itSearchInput('py-2')}
      />
    </div>
  );
}

export function ITMisStatusTabs({ tabs, tabCounts, activeTab, onTabChange, modern = false, rightSlot = null }) {
  if (modern) {
    return (
      <div className="border-b border-slate-300/80 px-3 py-2.5 sm:px-5 sm:py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={itChip(active)}
                >
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
          {rightSlot ? <div className="lg:ml-auto">{rightSlot}</div> : null}
        </div>
      </div>
    );
  }

  const tabBtnClass = (active) => (
    `shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
      active
        ? 'bg-[#f0fdfa] text-[#047857]'
        : 'text-[#626F86] hover:bg-gray-50 hover:text-[#172B4D]'
    }`
  );

  return (
    <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-gray-200 px-2 py-2 sm:px-4 sm:py-2.5">
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={tabBtnClass(active)}
          >
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ITMisTableCard({ modern = false, children, className = '', id = undefined }) {
  if (!modern && !className && !id) return children;
  if (!modern) {
    return <div id={id} className={className}>{children}</div>;
  }
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={itSectionShell(className)}
    >
      {children}
    </motion.div>
  );
}

export function ITMisResultsCount({ count, searchTerm, modern = false }) {
  const text = (
    <>
      Showing {count} result{count === 1 ? '' : 's'}
      {searchTerm ? ` for "${searchTerm}"` : ''}
    </>
  );
  const className = 'border-b border-slate-300/80 px-3 py-2 text-[11px] text-slate-500 sm:px-4 sm:text-xs';
  if (modern) {
    return (
      <AnimatePresence mode="wait">
        <motion.p
          key={`${count}-${searchTerm}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={className}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    );
  }
  return <p className={className}>{text}</p>;
}

export function ITMisPageBackground({ modern = false }) {
  if (modern) {
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#f6f7f9]" aria-hidden />
    );
  }
  return <div className="pointer-events-none fixed inset-0 -z-10 bg-gray-100" aria-hidden />;
}

export const misModernTableHeadClass = IT_SURFACE.tableHeadMis;

export const misModernMobileListClass = 'space-y-2.5 p-3 sm:space-y-3 sm:p-4 lg:hidden';

export function ITMisQueueSwitch({ activeQueue, onChange, className = '', innerClassName = '', pendingCounts = null, refexLayout = false }) {
  const queueTabs = getAgentQueueTabs();
  const tabs = [
    { key: 'ServiceQueue', label: refexLayout ? queueTabs[0]?.label || 'Service' : 'Requests', icon: Wrench },
    { key: 'ChangeRequests', label: refexLayout ? queueTabs[1]?.label || 'Change' : 'Changes', icon: GitBranch },
  ];
  return (
    <div className={`px-3 pt-3 sm:px-6 sm:pt-3 ${className}`}>
      <div className={`mx-auto max-w-[1400px] ${innerClassName}`}>
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeQueue === tab.key;
            void pendingCounts;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                className={`flex shrink-0 snap-start items-center ${IT_CTRL.gap} ${itChip(active)}`}
              >
                <Icon className={IT_CTRL.icon} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Me | My Team scope toggle — non-employee dashboards. */
export function ITMisScopeSwitch({ activeScope = 'me', onChange, className = '', inline = false }) {
  const tabs = [
    { key: 'me', label: 'Me' },
    { key: 'team', label: 'My Team' },
  ];
  const control = (
    <div className={itSegmentShell()}>
      {tabs.map((tab) => {
        const active = activeScope === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={itSegmentBtn(active)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
  if (inline) return control;
  return (
    <div className={`px-3 sm:px-6 ${className}`}>
      <div className="mx-auto max-w-[1400px]">
        {control}
      </div>
    </div>
  );
}
