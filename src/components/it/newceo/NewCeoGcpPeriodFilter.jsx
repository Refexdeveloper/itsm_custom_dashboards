import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { anchorFixedMenu } from '../../../lib/anchorFixedMenu.js';
import {
  MONTH_NAMES,
  availableCalendarYears,
  availableIndianFyStartYears,
  availableMonthsForYear,
  currentIndianFyStartYear,
  formatShortDay,
  indianFyBounds,
  istParts,
  istTodayYmd,
  periodSummaryLabel,
  resolveGcpPeriodRange,
  weeksInMonth,
} from '../../../lib/neGcpDashboardMath.js';

const QUICK_PRESETS = [
  { id: 'daily', label: 'Today' },
  { id: 'fy', label: 'This FY' },
  { id: 'monthly', label: 'MTD' },
  { id: 'quarterly', label: 'QTD' },
];

export default function NewCeoGcpPeriodFilter({
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  calendarYear,
  calendarMonth,
  onCalendarYearChange,
  onCalendarMonthChange,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(
    period === 'pick_month' ? 'monthly' : period === 'custom' ? 'custom' : period === 'weekly' ? 'weekly' : 'year',
  );
  const parts = istParts();
  const year = calendarYear || parts.year;
  const month = calendarMonth || parts.month;
  const [browseYear, setBrowseYear] = useState(year);
  const [browseMonth, setBrowseMonth] = useState(month);
  const [panelPos, setPanelPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const today = istTodayYmd();
  const fyStart = currentIndianFyStartYear();
  const fyOptions = availableIndianFyStartYears(4);
  const yearOptions = availableCalendarYears(5);
  const monthOptions = availableMonthsForYear(browseYear);
  const weekOptions = useMemo(() => weeksInMonth(browseYear, browseMonth), [browseYear, browseMonth]);
  const summary = periodSummaryLabel(period, { dateFrom, dateTo, calendarYear: year, calendarMonth: month });

  useEffect(() => {
    if (!open) return;
    setBrowseYear(year);
    setBrowseMonth(month);
    setTab(period === 'pick_month' ? 'monthly' : period === 'custom' ? 'custom' : period === 'weekly' ? 'weekly' : 'year');
  }, [open, period, year, month]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPanelPos(null);
      return undefined;
    }
    const place = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos(anchorFixedMenu(rect, {
        minWidth: Math.min(320, window.innerWidth - 24),
        maxWidth: 448,
        estimatedHeight: 420,
      }));
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const applyQuick = (id) => {
    onPeriodChange(id);
    if (id === 'weekly') {
      const range = resolveGcpPeriodRange('weekly');
      onDateFromChange?.(range.from);
      onDateToChange?.(range.to);
    }
    setOpen(false);
  };

  const applyFy = (startYear) => {
    if (startYear === fyStart) {
      onPeriodChange('fy');
    } else {
      const bounds = indianFyBounds(startYear);
      onDateFromChange?.(bounds.from);
      onDateToChange?.(bounds.to);
      onPeriodChange('custom');
    }
    setOpen(false);
  };

  const shiftBrowseMonth = (delta) => {
    let nextMonth = browseMonth + delta;
    let nextYear = browseYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    if (nextYear > parts.year || (nextYear === parts.year && nextMonth > parts.month)) return;
    if (nextYear < parts.year - 4) return;
    setBrowseYear(nextYear);
    setBrowseMonth(nextMonth);
  };

  return (
    <div className="relative z-30 min-w-0 w-full sm:w-auto">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((value) => !value)}
        className="group inline-flex h-11 w-full min-w-0 max-w-full items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-teal-300 sm:h-11 sm:min-w-[12.5rem] sm:max-w-[18rem] sm:gap-3 sm:px-3.5"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-100 ring-1 ring-teal-100">
          <CalendarDays className="h-4 w-4 text-teal-700" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Period</span>
          <span className="block truncate text-sm font-semibold text-slate-900">{summary}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          className="overflow-y-auto rounded-3xl border border-[#E6EBF2] bg-white p-3 shadow-[0_2px_8px_rgba(40,60,90,0.08),0_16px_40px_rgba(40,60,90,0.08)] sm:p-4"
          style={panelPos}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Choose period type
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUICK_PRESETS.map((opt) => {
              const active = period === opt.id || (opt.id === 'daily' && period === 'today') || (opt.id === 'monthly' && period === 'month');
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => applyQuick(opt.id)}
                  className={`h-8 rounded-full px-3 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-[#EAF2FF] text-[#3977BE] shadow-sm ring-1 ring-[#D0E0F5]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-4">
            {[['weekly', 'Weekly'], ['monthly', 'Monthly'], ['year', 'Year'], ['custom', 'Custom']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`h-9 rounded-xl text-xs font-semibold transition ${
                  tab === id ? 'bg-[#EAF2FF] text-[#3977BE] shadow-sm ring-1 ring-[#D0E0F5]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'weekly' ? (
            <div>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] font-medium text-slate-500">Weeks in month · Mon → Sun</p>
                <div className="flex items-center gap-1">
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => shiftBrowseMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[7.5rem] text-center text-xs font-semibold text-slate-800">
                    {MONTH_NAMES[browseMonth - 1]} {browseYear}
                  </span>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => shiftBrowseMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {weekOptions.map((week) => {
                  const active = period === 'weekly' && dateFrom === week.from;
                  return (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() => {
                        onDateFromChange?.(week.from);
                        onDateToChange?.(week.to);
                        onPeriodChange('weekly');
                        setOpen(false);
                      }}
                      className={`relative w-full rounded-2xl border px-3.5 py-3 text-left ${
                        active ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-teal-300'
                      }`}
                    >
                      {active ? <Check className="absolute right-3 top-3 h-4 w-4 text-slate-900" /> : null}
                      <p className="text-sm font-semibold text-slate-900">{week.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatShortDay(week.from)} → {week.to === today ? 'Today' : formatShortDay(week.to)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {tab === 'monthly' ? (
            <div>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] font-medium text-slate-500">Calendar months</p>
                <div className="flex items-center gap-1">
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setBrowseYear((value) => Math.max(value - 1, parts.year - 4))}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[3rem] text-center text-xs font-semibold text-slate-800">{browseYear}</span>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setBrowseYear((value) => Math.min(value + 1, parts.year))}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                {monthOptions.map((value) => {
                  const active = period === 'pick_month' && calendarYear === browseYear && calendarMonth === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        onCalendarYearChange?.(browseYear);
                        onCalendarMonthChange?.(value);
                        onPeriodChange('pick_month');
                        setOpen(false);
                      }}
                      className={`rounded-2xl border px-3 py-3 text-left ${
                        active ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-teal-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{MONTH_NAMES[value - 1]}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {browseYear === parts.year && value === parts.month ? '1 → Today' : 'Full month'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {tab === 'year' ? (
            <div className="max-h-72 space-y-3 overflow-y-auto">
              <p className="text-[11px] font-medium text-slate-500">Indian financial year · 1 April → 31 March next year</p>
              <div className="space-y-2">
                {fyOptions.map((start) => {
                  const bounds = indianFyBounds(start);
                  const active = (period === 'fy' && start === fyStart) || (period === 'custom' && dateFrom === bounds.from);
                  return (
                    <button
                      key={start}
                      type="button"
                      onClick={() => applyFy(start)}
                      className={`relative w-full rounded-2xl border px-3.5 py-3 text-left ${
                        active ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-teal-300'
                      }`}
                    >
                      {active ? <Check className="absolute right-3 top-3 h-4 w-4 text-slate-900" /> : null}
                      <p className="text-sm font-semibold text-slate-900">{bounds.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        1 Apr {start} → {start === fyStart ? 'Today' : `31 Mar ${start + 1}`}
                      </p>
                      {start === fyStart ? (
                        <span className="mt-2 inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
                          Current financial year
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] font-medium text-slate-500">Calendar year</p>
              <div className="grid grid-cols-2 gap-2">
                {yearOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      onCalendarYearChange?.(value);
                      onPeriodChange('year');
                      setOpen(false);
                    }}
                    className={`rounded-2xl border px-3 py-3 text-left ${
                      period === 'year' && calendarYear === value ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-teal-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{value}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{value === parts.year ? 'Jan → Today' : 'Full year'}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'custom' ? (
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-slate-500">Explicit date range (IST · capped at today)</p>
              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-500">Start</span>
                  <input
                    type="date"
                    max={today}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={dateFrom || ''}
                    onChange={(event) => onDateFromChange?.(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-500">End</span>
                  <input
                    type="date"
                    max={today}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={dateTo || ''}
                    onChange={(event) => onDateToChange?.(event.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!dateFrom) onDateFromChange?.(`${parts.year}-01-01`);
                  if (!dateTo) onDateToChange?.(today);
                  onPeriodChange('custom');
                  setOpen(false);
                }}
                className="h-10 w-full rounded-2xl bg-[#EAF2FF] text-sm font-semibold text-[#3977BE] shadow-sm ring-1 ring-[#D0E0F5]"
              >
                Apply custom range
              </button>
            </div>
          ) : null}
        </div>,
        document.body,
      )}
    </div>
  );
}
