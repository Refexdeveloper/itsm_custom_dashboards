import { motion } from 'framer-motion';
import {
  Ticket, Inbox, Activity, ClipboardList, CheckCircle2, XCircle, AlertTriangle, Clock,
  PauseCircle, UserRoundCog, FileSearch, Hammer, Hourglass, LayoutGrid, Headset,
  GitPullRequest, Timer, ShieldAlert, UserCheck,
} from 'lucide-react';
import { IT_THEME, useCountUp } from './ITDashboardUI.jsx';
import { IT_TYPE } from './itDesignTokens.js';

const STATUS_STYLE = {
  Open: { icon: Inbox, accent: '#0d9488', border: 'border-l-[#0d9488]' },
  OpenTickets: { icon: Inbox, accent: '#0d9488', border: 'border-l-[#0d9488]' },
  InProgress: { icon: Activity, accent: '#047857', border: 'border-l-[#047857]' },
  PendingTask: { icon: ClipboardList, accent: '#047857', border: 'border-l-[#047857]' },
  Pending: { icon: ClipboardList, accent: '#047857', border: 'border-l-[#047857]' },
  HoldTasks: { icon: PauseCircle, accent: '#047857', border: 'border-l-[#047857]' },
  OnHold: { icon: PauseCircle, accent: '#047857', border: 'border-l-[#047857]' },
  Hold: { icon: PauseCircle, accent: '#047857', border: 'border-l-[#047857]' },
  Resolved: { icon: CheckCircle2, accent: '#107C10', border: 'border-l-[#107C10]' },
  Completed: { icon: CheckCircle2, accent: '#107C10', border: 'border-l-[#107C10]' },
  Cancelled: { icon: XCircle, accent: '#D13438', border: 'border-l-[#D13438]' },
  AgentPending: { icon: Headset, accent: '#0d9488', border: 'border-l-[#0d9488]' },
  InApproval: { icon: UserCheck, accent: '#0d9488', border: 'border-l-[#0d9488]' },
  Implementation: { icon: Hammer, accent: '#047857', border: 'border-l-[#047857]' },
  FirstLevelPending: { icon: Hourglass, accent: '#E56910', border: 'border-l-[#E56910]' },
  All: { icon: LayoutGrid, accent: '#047857', border: 'border-l-[#047857]' },
  ITAgent: { icon: Headset, accent: '#0d9488', border: 'border-l-[#0d9488]' },
};

function AnalyticsWidget({ title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm sm:p-3 ${className}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#172B4D]">{title}</p>
          {subtitle ? <p className="mt-0.5 text-[10px] leading-snug text-[#626F86]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatusKpiCard({
  label, value, tabKey, active, onClick, delay = 0, compact = false,
}) {
  const style = STATUS_STYLE[tabKey] || STATUS_STYLE.Open;
  const Icon = style.icon;
  const animated = useCountUp(value);

  if (compact) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.2 }}
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-2 rounded-[3px] border border-gray-200 bg-white px-2 py-1.5 text-left transition border-l-[3px] ${style.border} ${
          active ? 'ring-1 ring-[#99f6e4] shadow-sm' : 'hover:border-[#99f6e4] hover:bg-gray-50'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px]"
            style={{ backgroundColor: `${style.accent}14`, color: style.accent }}
          >
            <Icon className="h-3 w-3" />
          </div>
          <span className="truncate text-xs font-medium text-[#44546F]">{label}</span>
        </div>
        <span className="shrink-0 text-base font-semibold tabular-nums text-[#172B4D]">{animated}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      onClick={onClick}
      className={`${IT_THEME.kpiCard} border-l-4 text-left transition ${style.border} ${
        active ? 'ring-2 ring-[#99f6e4] border-[#99f6e4]' : 'hover:border-[#99f6e4]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#626F86]">{label}</p>
          <p className={`mt-1 ${IT_TYPE.kpiValue} text-[#172B4D]`}>{animated}</p>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px]"
          style={{ backgroundColor: `${style.accent}14`, color: style.accent }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </motion.button>
  );
}

function SlaSummaryCard({ atRisk, breached, subtitle = 'Active tickets only' }) {
  const riskAnimated = useCountUp(atRisk);
  const breachedAnimated = useCountUp(breached);
  return (
    <AnalyticsWidget title="SLA Overview" subtitle={subtitle}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[3px] border border-[#FFE380] bg-[#FFF7D6] px-2 py-2">
          <div className="mb-0.5 flex items-center gap-1 text-[#7F5F01]">
            <Timer className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">At Risk</span>
          </div>
          <p className="text-lg font-semibold tabular-nums leading-tight text-[#7F5F01]">{riskAnimated}</p>
        </div>
        <div className="rounded-[3px] border border-[#FFBDAD] bg-[#FFEBE6] px-2 py-2">
          <div className="mb-0.5 flex items-center gap-1 text-[#AE2A19]">
            <ShieldAlert className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Breached</span>
          </div>
          <p className="text-lg font-semibold tabular-nums leading-tight text-[#AE2A19]">{breachedAnimated}</p>
        </div>
      </div>
    </AnalyticsWidget>
  );
}

function PriorityBars({ data, loading, emptyLabel = 'No active tickets', compact = true }) {
  if (loading) {
    return <div className={`${compact ? 'h-[72px]' : 'h-[120px]'} animate-pulse rounded-[3px] bg-gray-50`} />;
  }
  if (!data.length) {
    return (
      <div className={`flex ${compact ? 'h-[56px]' : 'h-[100px]'} items-center justify-center text-[11px] text-[#626F86]`}>
        {emptyLabel}
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const colors = { Critical: '#D13438', High: '#E56910', Medium: '#0d9488', Low: '#626F86', Unknown: '#97A0AF' };
  return (
    <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {data.map((item) => (
        <li key={item.name}>
          <div className="mb-0.5 flex items-center justify-between text-[11px]">
            <span className="font-medium text-[#44546F]">{item.name}</span>
            <span className="tabular-nums font-semibold text-[#172B4D]">{item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(8, (item.value / max) * 100)}%`,
                backgroundColor: colors[item.name] || '#0d9488',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Shared ITSM analytics — status cards left, SLA + priority right.
 */
export function ITQueueAnalyticsPanel({
  heroTitle: _heroTitle,
  heroSubtitle: _heroSubtitle,
  heroTotal: _heroTotal,
  heroStats: _heroStats = [],
  heroIcon: _heroIcon = Ticket,
  statusTabs = [],
  tabCounts = {},
  activeTab,
  onTabChange,
  categoryTitle: _categoryTitle,
  categorySubtitle: _categorySubtitle,
  categoryData: _categoryData = [],
  categoryEmptyLabel: _categoryEmptyLabel,
  priorityTitle = 'Active Tickets by Priority',
  prioritySubtitle = 'Active workload',
  priorityData = [],
  priorityEmptyLabel,
  slaAtRisk = 0,
  slaBreached = 0,
  slaSubtitle,
  loading = false,
  showCharts = true,
}) {
  if (!showCharts) return null;

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <div className="flex flex-col gap-2 lg:col-span-5">
          {statusTabs.length > 0 ? (
            <AnalyticsWidget title="By Status" subtitle="Click to filter the table below">
              <div className="space-y-1.5">
                {statusTabs.map((tab, idx) => (
                  <StatusKpiCard
                    key={tab.key}
                    compact
                    tabKey={tab.key}
                    label={tab.label}
                    value={tabCounts[tab.key] ?? 0}
                    active={activeTab === tab.key}
                    onClick={() => onTabChange?.(tab.key)}
                    delay={idx * 0.04}
                  />
                ))}
              </div>
            </AnalyticsWidget>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 lg:col-span-7">
          <SlaSummaryCard atRisk={slaAtRisk} breached={slaBreached} subtitle={slaSubtitle} />
          <AnalyticsWidget title={priorityTitle} subtitle={prioritySubtitle}>
            <PriorityBars
              data={priorityData}
              loading={loading}
              emptyLabel={priorityEmptyLabel}
              compact
            />
          </AnalyticsWidget>
        </div>
      </div>
    </div>
  );
}

/** Employee dashboard — thin preset over ITQueueAnalyticsPanel */
export function ITEmployeeAnalyticsPanel({
  kpis, tabCounts, activeTab, onTabChange, categoryData: _categoryData, priorityData, loading = false,
  statusTabs = null,
  hideOpenTab = false,
}) {
  const tabs = statusTabs || [
    { key: 'Open', label: 'Open' },
    { key: 'InProgress', label: 'In Progress' },
    { key: 'Resolved', label: 'Resolved' },
    { key: 'Cancelled', label: 'Cancelled' },
  ].filter((tab) => !(hideOpenTab && tab.key === 'Open'));

  return (
    <ITQueueAnalyticsPanel
      heroTitle="My Requests"
      heroSubtitle="Total requests"
      heroTotal={kpis.totalRecords}
      statusTabs={tabs}
      tabCounts={tabCounts}
      activeTab={activeTab}
      onTabChange={onTabChange}
      priorityTitle="Active Tasks by Priority"
      prioritySubtitle="Open and in-progress tickets"
      priorityData={priorityData}
      priorityEmptyLabel="No open or in-progress tickets"
      slaAtRisk={kpis.slaAtRisk}
      slaBreached={kpis.slaBreached}
      loading={loading}
    />
  );
}

export { GitPullRequest as ITCrHeroIcon };
