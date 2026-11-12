import { useState, useMemo, useCallback } from 'react';
import NewCeoGcpPeriodFilter from './newceo/NewCeoGcpPeriodFilter.jsx';
import {
  periodSummaryLabel,
  resolveGcpPeriodRange,
} from '../../lib/neGcpDashboardMath.js';
import {
  applyDashboardDateRangeFilter,
  matchesMisDuePriorityRow,
} from '../../lib/kfITServiceDashboard.js';

/**
 * Same Period control as Kissflow CEO / Notification Engine replica
 * (Today / This FY / MTD / QTD + Weekly / Monthly / Year / Custom),
 * plus optional Due overlay. Does not change Me / Team matchers.
 */
export function useApproverAdaptivePeriodFilter({ enabled = true, showDue = false } = {}) {
  const [period, setPeriod] = useState('fy');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [calendarYear, setCalendarYear] = useState(undefined);
  const [calendarMonth, setCalendarMonth] = useState(undefined);
  const [dueOnly, setDueOnly] = useState(false);

  const periodRange = useMemo(() => {
    if (!enabled) return { from: '', to: '' };
    return resolveGcpPeriodRange(period, new Date(), {
      dateFrom,
      dateTo,
      calendarYear,
      calendarMonth,
    });
  }, [enabled, period, dateFrom, dateTo, calendarYear, calendarMonth]);

  const summaryLabel = useMemo(
    () => periodSummaryLabel(period, {
      dateFrom: periodRange.from || dateFrom,
      dateTo: periodRange.to || dateTo,
      calendarYear,
      calendarMonth,
    }),
    [period, periodRange.from, periodRange.to, dateFrom, dateTo, calendarYear, calendarMonth],
  );

  const selectCurrentWeek = useCallback(() => {
    const range = resolveGcpPeriodRange('weekly');
    setPeriod('weekly');
    setDateFrom(range.from);
    setDateTo(range.to);
  }, []);

  const handleDueChange = useCallback((checked) => {
    // Due replaces the date filter while checked and restores the previous
    // period filter when unchecked — same as before.
    setDueOnly(checked);
  }, []);

  const applyPeriod = useCallback(
    (rows) => {
      const list = rows || [];
      if (!enabled) return list;

      let next = list;
      if (periodRange.from || periodRange.to) {
        next = applyDashboardDateRangeFilter(next, periodRange);
      }
      if (showDue && dueOnly) {
        next = next.filter((row) => matchesMisDuePriorityRow(row));
      }
      return next;
    },
    [enabled, periodRange, dueOnly, showDue],
  );

  const periodFilterEl = enabled ? (
    <div className="flex max-w-full flex-wrap items-end gap-2">
      <NewCeoGcpPeriodFilter
        period={period}
        onPeriodChange={setPeriod}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        calendarYear={calendarYear}
        calendarMonth={calendarMonth}
        onCalendarYearChange={setCalendarYear}
        onCalendarMonthChange={setCalendarMonth}
      />
      {showDue ? (
        <label
          className={`inline-flex h-[2.25rem] shrink-0 cursor-pointer select-none items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-sm transition ${
            dueOnly
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/40'
          }`}
          title={`Only open tickets with SLA breached within the selected period (${summaryLabel})`}
        >
          <input
            type="checkbox"
            aria-label="Due"
            className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            checked={dueOnly}
            onChange={(event) => handleDueChange(event.target.checked)}
          />
          Due
        </label>
      ) : null}
    </div>
  ) : null;

  return {
    periodKey: period,
    periodState: {
      mode: period,
      range: periodRange,
      summaryLabel,
    },
    setPeriodState: (next) => {
      if (!next || typeof next !== 'object') return;
      if (next.mode) setPeriod(next.mode);
      if (next.range?.from != null) setDateFrom(next.range.from);
      if (next.range?.to != null) setDateTo(next.range.to);
    },
    periodRange,
    applyPeriod,
    periodFilterEl,
    dueOnly,
    setDueOnly,
    selectCurrentWeek,
  };
}
