import { getActiveDashboardProfile } from '../../../lib/kfITServiceDashboard.js';
import { REFEX_EMPLOYEE_COL } from './constants.js';

/** Active profile column map — Refex and Extrovis share this flow. */
function employeeCol() {
  return getActiveDashboardProfile()?.employeeCol || REFEX_EMPLOYEE_COL;
}

function normalizeText(v) {
  if (v == null) return '';
  return String(v).trim();
}

function isProcessInstanceId(value) {
  const id = normalizeText(value);
  if (!id) return false;
  return !id.startsWith('Activity_');
}

/** Ticket instance id (Pk…) — never an Activity_* workflow definition id. */
export function resolveProcessInstanceId(row, task = null) {
  const raw = row?.raw ?? row;
  const candidates = [
    row?.id,
    raw?._id,
    raw?.[employeeCol().instanceId],
    task?._id,
    task?.Instance_ID,
    row?.employeeMyTaskItem?._id,
  ];
  for (const candidate of candidates) {
    if (isProcessInstanceId(candidate)) return normalizeText(candidate);
  }
  return '';
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase().replace(/[\s_-]+/g, '');
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** In-progress `_id` from IT Tech Reopen / Employee Feedback StepField. */
export function pickEmployeeFeedbackActivityFromReport(item) {
  if (!item) return '';

  const col = employeeCol();
  const columnKeys = [
    col.itTechReopenActivity,
    col.employeeApprovalRefex,
    col.itTechReopenActivityLegacy,
    col.employeeApprovalRefexLegacy,
  ].filter(Boolean);

  const ranked = [];
  for (const columnKey of columnKeys) {
    const raw = item?.[columnKey] ?? item?.raw?.[columnKey];
    const list = asArray(raw);
    for (const entry of list) {
      const id = normalizeText(entry?._id ?? entry?.id);
      if (!id || id.startsWith('Activity_') || id.startsWith('Employee_Confirmation_')) continue;
      const status = normalizeStatus(entry?.Status ?? entry?.status ?? entry?._status);
      if (status === 'completed' || status === 'cancelled' || status === 'canceled' || status === 'skipped') {
        continue;
      }
      let rank = 99;
      if (status === 'inprogress') rank = 0;
      else if (status === 'open') rank = 1;
      else if (status === 'notpickedyet') rank = 2;
      else if (status === '') rank = 3;
      else continue;
      ranked.push({ id, rank });
    }
  }

  ranked.sort((a, b) => a.rank - b.rank);
  return ranked[0]?.id || '';
}

export function pickEmployeeTaskActivityId(task, row) {
  const raw = row?.raw ?? row;
  const fromReportColumn = pickEmployeeFeedbackActivityFromReport(raw);
  if (fromReportColumn && !fromReportColumn.startsWith('Activity_')) return fromReportColumn;

  const inProgress = (row?.employeeApprovalActivities || []).find(
    (entry) => normalizeStatus(entry?.status) === 'inprogress',
  );
  if (inProgress?.id && !String(inProgress.id).startsWith('Activity_')) {
    return normalizeText(inProgress.id);
  }

  const fromTask = normalizeText(
    task?._activity_instance_id
    || task?.activityInstanceId
    || task?.Activity_Instance_ID,
  );
  if (fromTask && !fromTask.startsWith('Activity_')) return fromTask;

  const fromMappedRow = normalizeText(row?.employeeTaskActivityInstanceId);
  if (fromMappedRow && !fromMappedRow.startsWith('Activity_')) return fromMappedRow;

  return '';
}

function toTimestamp(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function pickLatestCompletedActivityId(entries) {
  const completed = asArray(entries)
    .map((entry) => ({
      id: normalizeText(entry?._id ?? entry?.id),
      status: normalizeStatus(entry?.Status ?? entry?.status ?? entry?._status),
      actedAt: entry?.ActedAt || entry?.actedAt || null,
    }))
    .filter((entry) => entry.id && entry.status === 'completed');

  if (!completed.length) return '';

  completed.sort((a, b) => toTimestamp(b.actedAt) - toTimestamp(a.actedAt));
  return completed[0].id;
}

/**
 * Completed IT Tech Support activity id (`Column_PdcW660jHk`) for Employee Feedback sendback.
 * Kissflow expects the peer completed step instance, not the current Employee Feedback activity.
 */
export function pickItTechSupportSendbackTargetId(row) {
  if (!row) return '';

  const fromMapped = pickLatestCompletedActivityId(
    (row?.itAgentActivities || []).map((entry) => ({
      _id: entry?.id,
      Status: entry?.status,
      ActedAt: entry?.actedAt,
    })),
  );
  if (fromMapped) return fromMapped;

  const raw = row?.raw ?? row;
  const fromItTechSupport = pickLatestCompletedActivityId(raw?.[employeeCol().itAgentRefex]);
  if (fromItTechSupport) return fromItTechSupport;

  const fromPickup = pickLatestCompletedActivityId(raw?.[employeeCol().itAgentPickupActivity]);
  if (fromPickup) return fromPickup;

  return pickLatestCompletedActivityId(raw?.[employeeCol().techSupportAfterDependencyActivity]);
}
