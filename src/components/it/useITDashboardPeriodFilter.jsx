import { useState, useMemo, useCallback } from 'react';
import {
  ITPeriodFilterChips,
  resolveAgentPeriodDateRange,
  AGENT_PERIOD_OPTIONS,
} from './ITAgentWorkbench.jsx';
import { applyDashboardDateRangeFilter } from '../../lib/kfITServiceDashboard.js';

/**
 * Shared period chips for ITSM dashboards.
 * @param {{ enabled?: boolean, options?: Array<{key:string,label:string}>, defaultKey?: string }} [opts]
 */
export function useITDashboardPeriodFilter({
  enabled = true,
  options = AGENT_PERIOD_OPTIONS,
  defaultKey = 'all',
} = {}) {
  const [periodKey, setPeriodKey] = useState(defaultKey);

  const periodRange = useMemo(
    () => (enabled ? resolveAgentPeriodDateRange(periodKey) : { from: '', to: '' }),
    [enabled, periodKey],
  );

  const applyPeriod = useCallback(
    (rows) => (
      enabled && periodKey !== 'all'
        ? applyDashboardDateRangeFilter(rows, periodRange)
        : (rows || [])
    ),
    [enabled, periodKey, periodRange],
  );

  const periodFilterEl = enabled ? (
    <ITPeriodFilterChips
      compact
      value={periodKey}
      onChange={setPeriodKey}
      options={options}
    />
  ) : null;

  return {
    periodKey,
    setPeriodKey,
    periodRange,
    applyPeriod,
    periodFilterEl,
  };
}
