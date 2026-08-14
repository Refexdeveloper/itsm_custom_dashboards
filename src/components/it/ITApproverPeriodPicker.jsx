/* eslint-disable react-refresh/only-export-components -- period picker + range helpers */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ChevronDown, Check } from 'lucide-react';
import { IT_TYPE, itSegmentShell, itSegmentBtn } from './itDesignTokens.js';

function padDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMonday(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Indian FY start year for a reference date (Apr–Mar). */
export function getFyStartYear(referenceDate = new Date()) {
  const d = referenceDate instanceof Date ? referenceDate : new Date();
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

export function getFinancialYearRange(fyStartYear, { capToToday = true } = {}) {
  const from = new Date(fyStartYear, 3, 1);
  let to = new Date(fyStartYear + 1, 2, 31);
  if (capToToday) {
    const today = startOfDay(new Date());
    if (to > today) to = today;
  }
  return { from: padDateInput(from), to: padDateInput(to), fyStartYear };
}

export function getWeekRange(mondayDate, { capToToday = true } = {}) {
  const from = startOfDay(mondayDate);
  let to = new Date(from);
  to.setDate(to.getDate() + 6);
  if (capToToday) {
    const today = startOfDay(new Date());
    if (to > today) to = today;
  }
  return { from: padDateInput(from), to: padDateInput(to), monday: from };
}

export function getMonthRange(year, monthIndex, { capToToday = true } = {}) {
  const from = new Date(year, monthIndex, 1);
  let to = new Date(year, monthIndex + 1, 0);
  if (capToToday) {
    const today = startOfDay(new Date());
    if (to > today) to = today;
  }
  return { from: padDateInput(from), to: padDateInput(to), year, monthIndex };
}

/** Weeks of a calendar month (Mon–Sun), up through the current week only (no future). */
export function buildMonthWeekOptions(year, monthIndex) {
  const now = new Date();
  const currentMonday = getMonday(now);
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  let monday = getMonday(monthStart);

  const make = (weekMonday, { label, hint, weekNumber, capToToday }) => {
    const range = getWeekRange(weekMonday, { capToToday });
    const weekEnd = new Date(weekMonday);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const toLabel = capToToday && padDateInput(weekEnd) > padDateInput(startOfDay(now))
      ? 'Today'
      : `Sun ${formatShortDate(weekEnd)}`;
    return {
      key: `week:${range.from}`,
      label,
      sub: `Mon ${formatShortDate(weekMonday)} → ${toLabel}`,
      hint,
      weekNumber,
      range: { from: range.from, to: range.to },
      monday: padDateInput(weekMonday),
    };
  };

  const options = [];
  let weekNumber = 0;
  // Safety: at most 6 Monday starts can touch one month.
  for (let i = 0; i < 6; i += 1) {
    const weekEnd = new Date(monday);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const overlapsMonth = weekEnd >= monthStart && monday <= monthEnd;
    if (monday > monthEnd) break;

    if (overlapsMonth) {
      // No future weeks beyond the current week.
      if (monday.getTime() > currentMonday.getTime()) {
        break;
      }
      weekNumber += 1;
      const isCurrent = monday.getTime() === currentMonday.getTime();
      const prevMonday = new Date(currentMonday);
      prevMonday.setDate(prevMonday.getDate() - 7);
      const isPrevious = monday.getTime() === prevMonday.getTime();

      let label = `Week ${weekNumber}`;
      let hint = formatMonthLabel(year, monthIndex);
      if (isCurrent) {
        label = 'Current week';
        hint = 'This week';
      } else if (isPrevious) {
        label = 'Previous week';
        hint = 'Last week';
      } else if (monday.getTime() < currentMonday.getTime()) {
        // Relative "next" toward today when browsing older weeks in the month.
        const nextMonday = new Date(monday);
        nextMonday.setDate(nextMonday.getDate() + 7);
        if (nextMonday.getTime() === currentMonday.getTime()) {
          hint = 'Next → Current week';
        } else if (nextMonday.getTime() < currentMonday.getTime()) {
          hint = `Next → Week of ${formatShortDate(nextMonday)}`;
        }
      }

      options.push(make(monday, {
        label,
        hint,
        weekNumber,
        capToToday: isCurrent,
      }));
    }

    monday = new Date(monday);
    monday.setDate(monday.getDate() + 7);
  }

  // Newest first: Current week on top, then Previous, then earlier weeks in the month.
  return options.reverse();
}

/**
 * Weekly options for a month — Current / Previous / Week N…
 * Future weeks are never listed. When Current week is selected there is no Next week.
 */
export function buildWeekNavOptions({ year, monthIndex } = {}) {
  const now = new Date();
  const y = Number.isFinite(year) ? year : now.getFullYear();
  const m = Number.isFinite(monthIndex) ? monthIndex : now.getMonth();
  return buildMonthWeekOptions(y, m);
}

/** @deprecated Prefer buildWeekNavOptions — kept for any older callers. */
export function buildRecentWeekOptions(count = 8) {
  void count;
  return buildWeekNavOptions();
}

/** Default weekly selection = Current week. */
export function getCurrentWeekPeriodState() {
  const now = new Date();
  const options = buildWeekNavOptions({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });
  const current = options.find((opt) => opt.label === 'Current week') || options[options.length - 1];
  if (!current) {
    const monday = getMonday(now);
    const range = getWeekRange(monday, { capToToday: true });
    return {
      mode: 'weekly',
      range: { from: range.from, to: range.to },
      summaryLabel: `Current week · Mon ${formatShortDate(monday)} → Today`,
    };
  }
  return {
    mode: 'weekly',
    range: { from: current.range.from, to: current.range.to },
    summaryLabel: `${current.label} · ${current.sub}`,
  };
}

export function buildMonthOptions(year) {
  const now = new Date();
  const options = [];
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    if (year > now.getFullYear()) continue;
    if (year === now.getFullYear() && monthIndex > now.getMonth()) continue;
    const range = getMonthRange(year, monthIndex);
    const isCurrent = year === now.getFullYear() && monthIndex === now.getMonth();
    options.push({
      key: `month:${year}-${monthIndex}`,
      label: formatMonthLabel(year, monthIndex),
      sub: isCurrent
        ? `1 ${new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: 'short' })} → Today`
        : `Full month`,
      range: { from: range.from, to: range.to },
    });
  }
  return options;
}

export function buildFinancialYearOptions(count = 4) {
  const currentFy = getFyStartYear();
  const options = [];
  for (let i = 0; i < count; i += 1) {
    const fyStartYear = currentFy - i;
    const range = getFinancialYearRange(fyStartYear);
    const label = `FY ${fyStartYear}–${String(fyStartYear + 1).slice(-2)}`;
    options.push({
      key: `fy:${fyStartYear}`,
      label,
      sub: `1 Apr ${fyStartYear} → 31 Mar ${fyStartYear + 1}`,
      hint: i === 0 ? 'Current financial year' : undefined,
      range: { from: range.from, to: range.to },
    });
  }
  return options;
}

const MODE_OPTIONS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'fy', label: 'Financial Year' },
];

/**
 * Adaptive period control — Weekly / Monthly / FY (Apr–Mar).
 * Opens a clear panel so users can pick the exact range.
 */
export default function ITApproverPeriodPicker({
  mode = 'fy',
  range = { from: '', to: '' },
  summaryLabel = '',
  onChange,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [panelMode, setPanelMode] = useState(mode === 'custom' ? 'fy' : mode);
  const [monthYear, setMonthYear] = useState(() => new Date().getFullYear());
  const [weekMonthCursor, setWeekMonthCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setPanelMode(mode === 'custom' ? 'fy' : mode);
    if (mode === 'weekly' && range?.from) {
      const anchor = new Date(`${range.from}T12:00:00`);
      if (!Number.isNaN(anchor.getTime())) {
        setWeekMonthCursor({ year: anchor.getFullYear(), monthIndex: anchor.getMonth() });
      }
    }
    const onDoc = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, mode, range?.from]);

  const weekOptions = useMemo(
    () => buildWeekNavOptions({
      year: weekMonthCursor.year,
      monthIndex: weekMonthCursor.monthIndex,
    }),
    [open, weekMonthCursor.year, weekMonthCursor.monthIndex],
  );
  const monthOptions = useMemo(() => buildMonthOptions(monthYear), [monthYear, open]);
  const fyOptions = useMemo(() => buildFinancialYearOptions(4), [open]);

  const triggerLabel = summaryLabel || 'Select period';

  const applySelection = (nextMode, nextRange, label) => {
    onChange?.({
      mode: nextMode,
      range: nextRange,
      summaryLabel: label,
    });
    setOpen(false);
  };

  const shiftWeekMonth = (delta) => {
    setWeekMonthCursor((prev) => {
      const d = new Date(prev.year, prev.monthIndex + delta, 1);
      const now = new Date();
      if (d.getFullYear() > now.getFullYear()
        || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth())) {
        return { year: now.getFullYear(), monthIndex: now.getMonth() };
      }
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  };

  const canShiftWeekMonthForward = (() => {
    const now = new Date();
    return weekMonthCursor.year < now.getFullYear()
      || (weekMonthCursor.year === now.getFullYear() && weekMonthCursor.monthIndex < now.getMonth());
  })();

  return (
    <div ref={rootRef} className={`relative z-40 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Period filter"
        data-testid="approver-period-picker"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-w-[12.5rem] max-w-[18rem] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-[var(--it-brand-primary)]/40 hover:bg-[var(--it-brand-soft)]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--it-brand-primary)]/10 text-[var(--it-brand-primary)]">
          <CalendarRange className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Period</span>
          <span className={`block truncate text-xs font-semibold text-slate-800 ${IT_TYPE.body}`}>
            {triggerLabel}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Choose period type</p>
            <div className={`mt-2 ${itSegmentShell()}`}>
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setPanelMode(opt.key);
                    // Selecting Weekly immediately applies Current week (panel stays open
                    // so user can pick another week in the month).
                    if (opt.key === 'weekly') {
                      const now = new Date();
                      setWeekMonthCursor({ year: now.getFullYear(), monthIndex: now.getMonth() });
                      const currentState = getCurrentWeekPeriodState();
                      onChange?.(currentState);
                    }
                  }}
                  className={itSegmentBtn(panelMode === opt.key, 'whitespace-nowrap px-2.5')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-3">
            {panelMode === 'weekly' ? (
              <div className="space-y-1.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-slate-500">
                    Weeks in month · Mon → Sun
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      onClick={() => shiftWeekMonth(-1)}
                    >
                      ←
                    </button>
                    <span className="min-w-[7rem] text-center text-xs font-bold text-slate-800">
                      {formatMonthLabel(weekMonthCursor.year, weekMonthCursor.monthIndex)}
                    </span>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      disabled={!canShiftWeekMonthForward}
                      onClick={() => shiftWeekMonth(1)}
                    >
                      →
                    </button>
                  </div>
                </div>
                <p className="mb-1 text-[10px] font-medium text-slate-400">
                  {weekOptions.length}
                  {' '}
                  week
                  {weekOptions.length === 1 ? '' : 's'}
                  {' '}
                  available · no future weeks
                </p>
                {weekOptions.map((opt) => {
                  const active = mode === 'weekly' && range.from === opt.range.from && range.to === opt.range.to;
                  return (
                    <PeriodOptionRow
                      key={opt.key}
                      active={active}
                      label={opt.label}
                      sub={opt.sub}
                      hint={opt.hint}
                      onClick={() => applySelection('weekly', opt.range, `${opt.label} · ${opt.sub}`)}
                    />
                  );
                })}
                {!weekOptions.length ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
                    No weeks in this month yet.
                  </p>
                ) : null}
              </div>
            ) : null}

            {panelMode === 'monthly' ? (
              <div className="space-y-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-slate-500">
                    Calendar months · January → December
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      onClick={() => setMonthYear((y) => y - 1)}
                    >
                      ←
                    </button>
                    <span className="min-w-[3.5rem] text-center text-xs font-bold text-slate-800">{monthYear}</span>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      disabled={monthYear >= new Date().getFullYear()}
                      onClick={() => setMonthYear((y) => Math.min(new Date().getFullYear(), y + 1))}
                    >
                      →
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {monthOptions.map((opt) => {
                    const active = mode === 'monthly' && range.from === opt.range.from;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => applySelection('monthly', opt.range, opt.label)}
                        className={`rounded-xl border px-2.5 py-2 text-left transition ${
                          active
                            ? 'border-[var(--it-brand-primary)] bg-[var(--it-brand-primary)]/10'
                            : 'border-slate-200 hover:border-[var(--it-brand-primary)]/40 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-semibold text-slate-800">{opt.label.split(' ')[0]}</span>
                        <span className="block text-[10px] font-medium text-slate-500">{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {panelMode === 'fy' ? (
              <div className="space-y-1.5">
                <p className="mb-2 text-[11px] font-medium text-slate-500">
                  Indian financial year · 1 April → 31 March next year
                </p>
                {fyOptions.map((opt) => {
                  const active = mode === 'fy' && range.from === opt.range.from;
                  return (
                    <PeriodOptionRow
                      key={opt.key}
                      active={active}
                      label={opt.label}
                      sub={opt.sub}
                      hint={opt.hint}
                      onClick={() => applySelection('fy', opt.range, `${opt.label} · Apr–Mar`)}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PeriodOptionRow({ active, label, sub, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? 'border-[var(--it-brand-primary)] bg-[var(--it-brand-primary)]/10'
          : 'border-slate-200 hover:border-[var(--it-brand-primary)]/40 hover:bg-slate-50'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{sub}</span>
        {hint ? (
          <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            {hint}
          </span>
        ) : null}
      </span>
      {active ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--it-brand-primary)]" /> : null}
    </button>
  );
}

/** Default state: current financial year (Apr → today / Mar). */
export function getDefaultApproverPeriodState() {
  const fyStartYear = getFyStartYear();
  const range = getFinancialYearRange(fyStartYear);
  return {
    mode: 'fy',
    range: { from: range.from, to: range.to },
    summaryLabel: `FY ${fyStartYear}–${String(fyStartYear + 1).slice(-2)} · Apr–Mar`,
  };
}
