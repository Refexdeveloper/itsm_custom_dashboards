/* eslint-disable react-refresh/only-export-components -- agent workbench kit (Extrovis pilot) */
import { useMemo } from 'react';
import {
  AlertTriangle, Bell, Clock, Flame, Inbox, UserCheck, Users, X,
} from 'lucide-react';
import { useIsMisModern } from '../../context/ITDashboardUiContext.jsx';
import { IT_SURFACE, IT_TYPE, itSegmentShell, itSegmentBtn } from './itDesignTokens.js';
import {
  isSlaAtRisk,
  isSlaBreached,
  matchesAgentServiceTab,
} from '../../lib/kfITServiceDashboard.js';

export const AGENT_PERIOD_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

/** IT Manager / IT Head — Today / Month / Financial Year (left of Me / My Team). */
export const APPROVER_PERIOD_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'Month' },
  { key: 'fy', label: 'Financial Year' },
];

export const AGENT_FOCUS_KEYS = {
  ALL: 'all',
  SLA_AT_RISK: 'slaAtRisk',
  SLA_BREACHED: 'slaBreached',
  OPEN_QUEUE: 'openQueue',
  PENDING_ON_ME: 'pendingOnMe',
  CRITICAL_HIGH: 'criticalHigh',
};

function padDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Map period chip key to inclusive from/to strings for applyDashboardDateRangeFilter. */
export function resolveAgentPeriodDateRange(periodKey) {
  if (!periodKey || periodKey === 'all') return { from: '', to: '' };

  const now = new Date();
  const today = padDateInput(now);

  if (periodKey === 'today') {
    return { from: today, to: today };
  }

  if (periodKey === 'week') {
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    return { from: padDateInput(monday), to: today };
  }

  if (periodKey === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: padDateInput(monthStart), to: today };
  }

  if (periodKey === 'fy') {
    // Indian FY: Apr 1 → Mar 31 (cap end at today).
    const month = now.getMonth();
    const startYear = month >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(startYear, 3, 1);
    return { from: padDateInput(fyStart), to: today };
  }

  return { from: '', to: '' };
}

function isCriticalOrHigh(row) {
  const c = String(row?.criticality || '').toLowerCase();
  return c.includes('critical') || c.includes('high');
}

export function computeAgentFocusMetrics(rows, user) {
  const list = rows || [];
  return {
    slaAtRisk: list.filter((row) => isSlaAtRisk(row)).length,
    slaBreached: list.filter((row) => isSlaBreached(row)).length,
    openQueue: list.filter((row) => matchesAgentServiceTab(row, 'OpenTickets', null)).length,
    pendingOnMe: list.filter((row) => matchesAgentServiceTab(row, 'PendingTask', user)).length,
    criticalHigh: list.filter(isCriticalOrHigh).length,
  };
}

export function applyAgentFocusFilter(rows, focusKey, user) {
  if (!focusKey || focusKey === AGENT_FOCUS_KEYS.ALL) return rows || [];

  switch (focusKey) {
    case AGENT_FOCUS_KEYS.SLA_AT_RISK:
      return (rows || []).filter((row) => isSlaAtRisk(row));
    case AGENT_FOCUS_KEYS.SLA_BREACHED:
      return (rows || []).filter((row) => isSlaBreached(row));
    case AGENT_FOCUS_KEYS.OPEN_QUEUE:
      return (rows || []).filter((row) => matchesAgentServiceTab(row, 'OpenTickets', null));
    case AGENT_FOCUS_KEYS.PENDING_ON_ME:
      return (rows || []).filter((row) => matchesAgentServiceTab(row, 'PendingTask', user));
    case AGENT_FOCUS_KEYS.CRITICAL_HIGH:
      return (rows || []).filter(isCriticalOrHigh);
    default:
      return rows || [];
  }
}

const NOTIFICATION_META = {
  slaBreached: {
    title: 'SLA breached',
    subtitle: 'Needs immediate attention',
    icon: AlertTriangle,
    tone: 'danger',
    focusKey: AGENT_FOCUS_KEYS.SLA_BREACHED,
  },
  slaAtRisk: {
    title: 'SLA at risk',
    subtitle: 'Resolve before deadline',
    icon: Clock,
    tone: 'warning',
    focusKey: AGENT_FOCUS_KEYS.SLA_AT_RISK,
  },
  openQueue: {
    title: 'Open pool',
    subtitle: 'Unclaimed tickets waiting',
    icon: Inbox,
    tone: 'info',
    focusKey: AGENT_FOCUS_KEYS.OPEN_QUEUE,
  },
  criticalHigh: {
    title: 'Critical / High',
    subtitle: 'Priority tickets in scope',
    icon: Flame,
    tone: 'critical',
    focusKey: AGENT_FOCUS_KEYS.CRITICAL_HIGH,
  },
  pendingOnMe: {
    title: 'My pending',
    subtitle: 'Assigned and in progress',
    icon: Bell,
    tone: 'info',
    focusKey: AGENT_FOCUS_KEYS.PENDING_ON_ME,
  },
};

const TONE_STYLES = {
  danger: {
    card: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white',
    icon: 'bg-rose-100 text-rose-600',
    count: 'text-rose-700',
  },
  warning: {
    card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
    icon: 'bg-amber-100 text-amber-700',
    count: 'text-amber-800',
  },
  critical: {
    card: 'border-orange-200 bg-gradient-to-br from-orange-50 to-white',
    icon: 'bg-orange-100 text-orange-700',
    count: 'text-orange-800',
  },
  info: {
    card: 'border-[var(--it-brand-border)] bg-gradient-to-br from-[var(--it-brand-soft)] to-white',
    icon: 'bg-[var(--it-brand-muted)] text-[var(--it-brand-dark)]',
    count: 'text-[var(--it-brand-dark)]',
  },
};

function periodChipClass(active, mis, _compact = false) {
  if (!mis) {
    const pad = 'px-2.5 py-1';
    if (active) return `rounded-[3px] border border-gray-300 bg-white text-slate-800 font-semibold shadow-sm text-xs ${pad}`;
    return `rounded-[3px] border border-gray-300 bg-gray-50 text-[#626F86] font-medium hover:bg-gray-100 text-xs ${pad}`;
  }
  return itSegmentBtn(active);
}

export function ITPeriodFilterChips({
  value = 'all',
  onChange,
  className = '',
  compact = false,
  options = AGENT_PERIOD_OPTIONS,
}) {
  const mis = useIsMisModern();
  const periodOptions = Array.isArray(options) && options.length ? options : AGENT_PERIOD_OPTIONS;

  if (mis) {
    return (
      <div className={`flex flex-wrap items-center ${className}`}>
        {!compact ? (
          <span className={`mr-2 shrink-0 ${IT_TYPE.label}`}>
            Period
          </span>
        ) : null}
        <div className={itSegmentShell()}>
          {periodOptions.map((opt) => {
            const active = value === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChange?.(opt.key)}
                className={periodChipClass(active, true, compact)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const radius = 'rounded-[3px]';

  return (
    <div className={`flex flex-wrap items-center justify-end gap-1 ${className}`}>
      {!compact ? (
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-[#626F86]">
          Period
        </span>
      ) : null}
      {periodOptions.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange?.(opt.key)}
            className={`${radius} border text-xs font-semibold transition ${periodChipClass(active, false, compact)}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FocusChip({ label, count, active, onClick, variant = 'default' }) {
  const mis = useIsMisModern();
  const radius = mis ? 'rounded-full' : 'rounded-[3px]';

  const variants = {
    danger: active
      ? 'border-rose-500 bg-rose-500 text-white'
      : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300',
    warning: active
      ? 'border-amber-500 bg-amber-500 text-white'
      : 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300',
    default: active
      ? mis
        ? 'border-[var(--it-brand)] bg-[var(--it-brand)] text-white'
        : 'border-[var(--it-brand)] bg-[var(--it-brand)] text-white'
      : mis
        ? 'border-slate-200 bg-white text-slate-700 hover:border-[var(--it-brand-light)] hover:bg-[var(--it-brand-soft)]'
        : 'border-gray-200 bg-white text-[#44546F] hover:border-[var(--it-brand-border)] hover:bg-[var(--it-brand-soft)]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${radius} border px-3 py-1.5 text-xs font-semibold transition ${variants[variant] || variants.default}`}
    >
      {label}
      <span className={`ml-1.5 tabular-nums ${active ? 'opacity-90' : 'opacity-70'}`}>{count}</span>
    </button>
  );
}

export function ITAgentFocusWorkspace({
  metrics,
  focusKey = AGENT_FOCUS_KEYS.ALL,
  onFocusChange,
  className = '',
}) {
  const mis = useIsMisModern();
  const shell = mis
    ? `${IT_SURFACE.borderMis} bg-white ${IT_SURFACE.shadow} ${IT_SURFACE.radius}`
    : 'rounded-lg border border-gray-200 bg-white shadow-sm';

  const notifications = useMemo(() => {
    const order = ['slaBreached', 'slaAtRisk', 'openQueue', 'criticalHigh', 'pendingOnMe'];
    return order
      .map((id) => {
        const meta = NOTIFICATION_META[id];
        const count = metrics?.[id] ?? 0;
        if (!count) return null;
        return { id, count, ...meta };
      })
      .filter(Boolean);
  }, [metrics]);

  const focusChips = [
    { key: AGENT_FOCUS_KEYS.SLA_BREACHED, label: 'SLA breached', count: metrics.slaBreached, variant: 'danger' },
    { key: AGENT_FOCUS_KEYS.SLA_AT_RISK, label: 'SLA at risk', count: metrics.slaAtRisk, variant: 'warning' },
    { key: AGENT_FOCUS_KEYS.OPEN_QUEUE, label: 'Open pool', count: metrics.openQueue },
    { key: AGENT_FOCUS_KEYS.PENDING_ON_ME, label: 'My pending', count: metrics.pendingOnMe },
    { key: AGENT_FOCUS_KEYS.CRITICAL_HIGH, label: 'Critical / High', count: metrics.criticalHigh },
  ].filter((chip) => chip.count > 0);

  return (
    <div className={`${shell} ${className}`}>
      <div className="grid gap-3 p-3 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-4 lg:p-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Bell className={`h-4 w-4 ${mis ? 'text-[var(--it-brand)]' : 'text-[var(--it-brand)]'}`} />
            <p className={`text-xs font-bold uppercase tracking-wide ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>
              Alerts
            </p>
          </div>
          {notifications.length === 0 ? (
            <p className={`text-sm ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>
              No urgent alerts in the current period.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {notifications.map((item) => {
                const tone = TONE_STYLES[item.tone] || TONE_STYLES.info;
                const Icon = item.icon;
                const active = focusKey === item.focusKey;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onFocusChange?.(active ? AGENT_FOCUS_KEYS.ALL : item.focusKey)}
                    className={`min-w-[148px] shrink-0 rounded-xl border p-2.5 text-left transition hover:shadow-sm ${
                      active ? 'ring-2 ring-[var(--it-brand)]/40' : ''
                    } ${tone.card}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{item.title}</p>
                        <p className={`text-lg font-bold tabular-nums leading-tight ${tone.count}`}>{item.count}</p>
                        <p className="truncate text-[10px] text-slate-500">{item.subtitle}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 lg:max-w-md lg:border-l lg:border-gray-200 lg:pl-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={`text-xs font-bold uppercase tracking-wide ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>
              My focus
            </p>
            {focusKey !== AGENT_FOCUS_KEYS.ALL ? (
              <button
                type="button"
                onClick={() => onFocusChange?.(AGENT_FOCUS_KEYS.ALL)}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${mis ? 'text-slate-500 hover:text-slate-700' : 'text-[#626F86] hover:text-[#172B4D]'}`}
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {focusChips.length === 0 ? (
              <p className={`text-sm ${mis ? 'text-slate-500' : 'text-[#626F86]'}`}>All clear for this period.</p>
            ) : (
              focusChips.map((chip) => (
                <FocusChip
                  key={chip.key}
                  label={chip.label}
                  count={chip.count}
                  variant={chip.variant}
                  active={focusKey === chip.key}
                  onClick={() => onFocusChange?.(focusKey === chip.key ? AGENT_FOCUS_KEYS.ALL : chip.key)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ITAgentBulkActionBar({
  selectedCount = 0,
  onClear,
  onAccept,
  onReassign,
  accepting = false,
  className = '',
}) {
  const mis = useIsMisModern();
  if (!selectedCount) return null;

  const shell = mis
    ? 'border-[var(--it-brand-border)] bg-[var(--it-brand-soft)]'
    : 'border-[var(--it-brand-border)] bg-[var(--it-brand-soft)]';

  return (
    <div className={`flex flex-col gap-2 border-b px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${shell} ${className}`}>
      <p className={`text-sm font-semibold ${mis ? 'text-[var(--it-brand-dark)]' : 'text-[var(--it-brand-darker)]'}`}>
        {selectedCount}
        {' '}
        ticket
        {selectedCount === 1 ? '' : 's'}
        {' '}
        selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={accepting}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
            mis
              ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              : 'border-gray-200 bg-white text-[#44546F] hover:bg-gray-50'
          }`}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
        <button
          type="button"
          onClick={onReassign}
          disabled={accepting}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
            mis
              ? 'border-[var(--it-brand-border)] bg-white text-[var(--it-brand-dark)] hover:bg-[var(--it-brand-soft)]'
              : 'border-[var(--it-brand-border)] bg-white text-[var(--it-brand-darker)] hover:bg-[var(--it-brand-soft)]'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Reassign
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={accepting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/80 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          <UserCheck className="h-3.5 w-3.5" />
          {accepting ? 'Accepting…' : 'Accept'}
        </button>
      </div>
    </div>
  );
}

export function ITAgentRowSelectCell({ checked, onChange, disabled = false }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 rounded border-slate-300 text-[var(--it-brand)] focus:ring-[var(--it-brand)]/30"
      aria-label={checked ? 'Deselect ticket' : 'Select ticket'}
    />
  );
}
