/**
 * Kept for the IT Head tests and older imports — same switch as
 * `dashboardPerformanceMode.js`, which every Kissflow pack now uses.
 */
import {
  DASHBOARD_KF_READ_TIMEOUT_MS,
  setDashboardPerformanceMode,
} from './dashboardPerformanceMode.js';

export const IT_HEAD_KF_READ_TIMEOUT_MS = DASHBOARD_KF_READ_TIMEOUT_MS;

export function setItHeadPerformanceMode(enabled) {
  setDashboardPerformanceMode(enabled);
}
