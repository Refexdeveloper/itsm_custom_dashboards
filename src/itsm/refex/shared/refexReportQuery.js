/**
 * Kissflow process-report query helpers.
 * Status / datetime / entity / created|modified-by contains params match
 * advanced filters configured on Service_Items_Refex_A00 (and Extrovis All_tickets).
 */

/** UTC ISO for $modified_at_gt — Kissflow expects GMT, e.g. 2026-08-05T11:00:00Z */
export function toKissflowUtcIso(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Local calendar day start as Kissflow UTC ISO — for `$created_at_gt` Today pulls.
 * Kissflow uses strict greater-than, so subtract 1ms so local-midnight tickets are included.
 */
export function startOfLocalDayKissflowIso(referenceDate = new Date()) {
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (!Number.isFinite(now.getTime())) return '';
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return toKissflowUtcIso(new Date(start.getTime() - 1));
}

/** Overlap the delta window so report-index lag does not miss brand-new email tickets. */
export function overlapKissflowSyncIso(lastSyncAt, overlapMs = 15 * 60 * 1000) {
  const t = new Date(lastSyncAt).getTime();
  if (!Number.isFinite(t)) return lastSyncAt || '';
  return toKissflowUtcIso(new Date(Math.max(0, t - overlapMs)));
}

/**
 * Build process-report query string (keeps `$` unescaped for Kissflow params).
 * @param {{
 *   page?: number,
 *   pageSize?: number,
 *   applicationId?: string,
 *   status?: string,
 *   statusOc?: string,
 *   modifiedAtGt?: string,
 *   modifiedAtLt?: string,
 *   entity?: string,
 *   createdByContain?: string,
 *   modifiedByContain?: string,
 *   assignedTo?: string,
 *   requestId?: string,
 * }} params
 */
export function buildProcessReportQuery(params = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 100);
  const appId = params.applicationId || 'IT_Service_Management_A00';
  const parts = [
    `page_number=${page}`,
    `page_size=${pageSize}`,
    `_application_id=${encodeURIComponent(appId)}`,
  ];

  const append = (key, value) => {
    const v = String(value ?? '').trim();
    if (!v) return;
    parts.push(`${key}=${encodeURIComponent(v)}`);
  };

  append('$status', params.status);
  append('$status_OC', params.statusOc);
  append('$modified_at_gt', params.modifiedAtGt);
  append('$modified_at_lt', params.modifiedAtLt);
  append('$modified_at_bt', params.modifiedAtBt);
  append('$created_at_gt', params.createdAtGt);
  append('$entity', params.entity);
  // Kissflow filter binds Name contains — param names unchanged.
  append('$created_by_contain', params.createdByContain);
  append('$modified_by_contain', params.modifiedByContain);
  append('$assigned_to', params.assignedTo);
  if (params.requestIdColumn && params.requestId) {
    append(`$${params.requestIdColumn}`, params.requestId);
  } else {
    append('$request_id', params.requestId);
  }

  return parts.join('&');
}

/** Stable suffix for cache keys when report filters change. */
export function buildReportFilterCacheSuffix({ entity = '', status = '', statusOc = '' } = {}) {
  return [entity || '-', status || '-', statusOc || '-'].join('|');
}
