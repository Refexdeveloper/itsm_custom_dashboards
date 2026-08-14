import { matchesRefexMyTaskRow } from '../../../lib/kfITServiceDashboard.js';

/** My Task rows assigned to the signed-in user — same filter as AssignedToMe / My Tasks tab. */
export function filterRefexMyTaskActionRequiredRows(rows, user) {
  if (!user) return [];
  return (rows || []).filter((row) => matchesRefexMyTaskRow(row, user));
}
