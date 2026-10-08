/**
 * Documented Kissflow Admin Get All Items.
 * GET /process/2/{account}/admin/{process}/item
 *
 * Uses the logged-in custom-component session (kf.api). Access keys stay off
 * this pack. If the admin list 403s, callers fall back to the existing report path.
 * Me stamps use the pack AppRole id (Head vs Manager). Oversight packs skip Me stamps.
 */
import { kfGetJson } from '../../../lib/kfRuntime.js';
import { resolveAccountId } from '../../../lib/kfITServiceDashboard.js';

/** IT Head Refex AppRole — deterministic Me assignment id from the API note. */
export const REFEX_IT_HEAD_APPROLE_ID = 'RoDiFs3IfOHC';
export const ADMIN_ITEM_PAGE_SIZE = 100;
export const ADMIN_ITEM_PAGE_CONCURRENCY = 4;

export function buildAdminProcessItemPath(accountId, processId, pageNumber, pageSize = ADMIN_ITEM_PAGE_SIZE) {
  return `/process/2/${encodeURIComponent(accountId)}/admin/${encodeURIComponent(processId)}/item?page_number=${pageNumber}&page_size=${pageSize}`;
}

export function extractAdminItemPage(payload) {
  if (!payload) return [];
  if (payload.status === 'error' || payload.error_code) {
    throw new Error(payload.en_message || payload.message || 'Admin Get All Items failed');
  }
  if (Array.isArray(payload.Data)) return payload.Data;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export function mergeAdminItemsById(pages = []) {
  const seen = new Set();
  const out = [];
  (pages || []).forEach((page) => {
    (page || []).forEach((item) => {
      const id = String(item?._id || item?.Id || '').trim();
      if (id) {
        if (seen.has(id)) return;
        seen.add(id);
      }
      out.push(item);
    });
  });
  return out;
}

function assignedToList(item) {
  const raw = item?._current_assigned_to;
  return Array.isArray(raw) ? raw : [];
}

/** Kind=AppRole and _id = role id. Do not match on role name. */
export function itemAssignedToAppRole(item, roleId) {
  const want = String(roleId || '').trim();
  if (!item || !want) return false;
  return assignedToList(item).some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const kind = String(entry.Kind || entry.kind || '').toLowerCase();
    if (kind !== 'approle' && kind !== 'role') return false;
    const id = String(entry._id || entry.Id || entry.id || '').trim();
    return id === want;
  });
}

/**
 * Live assignment from the list payload — no pending/activity fan-out.
 * Me KPIs still apply Closed By / reopen rules on the mapped rows.
 */
export function collectHeadLiveAssignmentIds(items = [], roleId = REFEX_IT_HEAD_APPROLE_ID) {
  const liveBucketPendingIds = new Set();
  (items || []).forEach((item) => {
    if (!itemAssignedToAppRole(item, roleId)) return;
    const id = String(item?._id || item?.Id || '').trim();
    if (id) liveBucketPendingIds.add(id);
  });
  return liveBucketPendingIds;
}

export async function fetchAllAdminProcessItems(kfInstance, processId, {
  pageSize = ADMIN_ITEM_PAGE_SIZE,
  concurrency = ADMIN_ITEM_PAGE_CONCURRENCY,
} = {}) {
  if (!kfInstance?.api) throw new Error('Kissflow SDK is not ready');
  const accountId = resolveAccountId(kfInstance);
  if (!accountId || !processId) throw new Error('Missing account or process id');

  const fetchPage = async (pageNumber) => {
    const path = buildAdminProcessItemPath(accountId, processId, pageNumber, pageSize);
    const payload = await kfGetJson(kfInstance, path);
    return extractAdminItemPage(payload);
  };

  const first = await fetchPage(1);
  const pages = [first];
  if (first.length < pageSize) return mergeAdminItemsById(pages);

  let next = 2;
  while (next <= 80) {
    const batch = [];
    for (let i = 0; i < concurrency; i += 1) batch.push(next + i);
    const rowsList = await Promise.all(
      batch.map((pageNumber) => fetchPage(pageNumber).catch((err) => {
        if (pageNumber === next) throw err;
        return [];
      })),
    );
    let short = false;
    rowsList.forEach((rows) => {
      pages.push(rows);
      if ((rows || []).length < pageSize) short = true;
    });
    if (short) break;
    next += concurrency;
  }
  return mergeAdminItemsById(pages);
}
