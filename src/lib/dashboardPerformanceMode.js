/**
 * Dashboard performance mode (first shipped on IT Head, 2 Nov 2026).
 * Data, Me / My Team, filters and KPI rules are unchanged — see
 * docs/IT_HEAD_REFEX_DASHBOARD_APIS_AND_PERFORMANCE.md §9a–9f.
 */
import { useEffect, useState } from 'react';
import { setKfReadTimeout } from './kfRuntime.js';
import { setFastRowLookup } from './kfITServiceDashboard.js';
import { setRefexPendingRequestSharing } from '../itsm/refex/techsupport/fetchRefexTechSupportTickets.js';
import { setJoinInflightMappedLoads } from '../itsm/refex/shared/refexDatasetStore.js';

export const DASHBOARD_KF_READ_TIMEOUT_MS = 45000;

export function setDashboardPerformanceMode(enabled) {
  const on = Boolean(enabled);
  setRefexPendingRequestSharing(on);
  setJoinInflightMappedLoads(on);
  setFastRowLookup(on);
  setKfReadTimeout(on ? DASHBOARD_KF_READ_TIMEOUT_MS : 0);
}

/** Call at the top of a pack wrapper. On before the dashboard's first load effect runs. */
export function useDashboardPerformanceMode() {
  useState(() => setDashboardPerformanceMode(true));
  useEffect(() => {
    setDashboardPerformanceMode(true);
    return () => setDashboardPerformanceMode(false);
  }, []);
}
