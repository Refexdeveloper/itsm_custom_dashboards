import { useState, useMemo, useCallback } from 'react';
import ITApproverPeriodPicker, {
  getCurrentWeekPeriodState,
  getDefaultApproverPeriodState,
} from './ITApproverPeriodPicker.jsx';
import {
  applyDashboardDateRangeFilter,
  matchesMisDuePriorityRow,
} from '../../lib/kfITServiceDashboard.js';

/** Adaptive Weekly / Monthly / FY period filter + optional Due overlay. */
export function useApproverAdaptivePeriodFilter({ enabled = true, showDue = true } = {}) {
  const [periodState, setPeriodState] = useState(() => getDefaultApproverPeriodState());
  const [dueOnly, setDueOnly] = useState(false);

  const periodRange = useMemo(
    () => (enabled ? (periodState.range || { from: '', to: '' }) : { from: '', to: '' }),
    [enabled, periodState.range],
  );

  const selectCurrentWeek = useCallback(() => {
    setPeriodState(getCurrentWeekPeriodState());
  }, []);

  const handleDueChange = useCallback((checked) => {
    // Do not change Weekly / Monthly / FY selection — Due is an overlay only.
    setDueOnly(checked);
  }, []);

  const handlePeriodChange = useCallback((next) => {
    setPeriodState(next);
  }, []);

  const applyPeriod = useCallback(
    (rows) => {
      const list = rows || [];
      if (!enabled) return list;

      // Due: all open tickets + all SLA-breached closed tickets (ignore date range).
      // Unchecked: only the selected Weekly / Monthly / FY filtered set.
      if (showDue && dueOnly) {
        return list.filter((row) => matchesMisDuePriorityRow(row));
      }

      if (periodRange.from || periodRange.to) {
        return applyDashboardDateRangeFilter(list, periodRange);
      }
      return list;
    },
    [enabled, periodRange, dueOnly, showDue],
  );

  const periodFilterEl = enabled ? (
    <div className="flex flex-wrap items-center gap-2">
      <ITApproverPeriodPicker
        mode={periodState.mode}
        range={periodState.range}
        summaryLabel={periodState.summaryLabel}
        onChange={handlePeriodChange}
      />
      {showDue ? (
        <label
          className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
            dueOnly
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/40'
          }`}
          title="All open tickets + SLA-breached closed tickets (keeps your Weekly/Monthly/FY selection)"
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
    periodKey: periodState.mode,
    periodState,
    setPeriodState,
    periodRange,
    applyPeriod,
    periodFilterEl,
    dueOnly,
    setDueOnly,
    selectCurrentWeek,
  };
}
