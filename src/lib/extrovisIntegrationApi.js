/**
 * Extrovis admin REST (comments + Kishore reassign).
 * Uses the Integration access key already used by Refex One Help Desk comments.
 * Host/account follow the open Kissflow session so Dev/Live tickets stay on the same account.
 */
import { resolveKissflowOrigin, resolveKissflowAccountId, trackKfWrite } from './kfRuntime.js';
import { isExtrovisSolutionCommentStep } from '../itsm/refex/employeedashboard/commentChannel.js';
import { isExtrovisAgentSapTeamOnly } from './extrovisSapTicket.js';
import {
  getActiveServiceProcessId,
  getCurrentStepValue,
  isRefexServiceClosedTicket,
  isRefexServiceProcessCompleted,
  isRefexServiceRejectedTicket,
} from './kfITServiceDashboard.js';

export const EXTROVIS_LIVE_ORIGIN = 'https://refexgroup.kissflow.com';
export const EXTROVIS_LIVE_ACCOUNT_ID = 'AcCMptlq60zH';
export const EXTROVIS_PROCESS_ID = 'Live_IT_Service_Request_Extrovis_A00';
export const EXTROVIS_APP_ID = 'IT_Service_Management_A00';

const ACCESS_KEY_ID = 'Ak8891611c-cbff-47ab-8032-37463a7462f4';
const ACCESS_KEY_SECRET = 'T654Kf6AGZeJLrtlR4N71ki0vQ675gXuPsIDUOF4EiQgFYqEoxJse6dPvXIYYRph91P7TSZtbPVpHomzeoiQ';

/** IT Head reassignment only. Other packs keep the admin key above. */
const ITSM_BOT_ACCESS_KEY_ID = 'Ak2a58cad4-5852-4f9b-b213-849ee7ed89fb';
const ITSM_BOT_ACCESS_KEY_SECRET = 'XGN68FIkSEw5Q15N7s91KjwwBKAb4kC2Bp87v2NMXOvUsSl7OWAnNwZlSMQ5FVB52hH1kcpcydhetViNn8ADFA';

function norm(value) {
  return String(value ?? '').trim();
}

export function resolveExtrovisAdminTarget(kfInstance = null) {
  const origin = (resolveKissflowOrigin(kfInstance) || EXTROVIS_LIVE_ORIGIN).replace(/\/$/, '');
  const accountId = resolveKissflowAccountId(kfInstance, EXTROVIS_LIVE_ACCOUNT_ID) || EXTROVIS_LIVE_ACCOUNT_ID;
  return {
    origin,
    accountId,
    processId: getActiveServiceProcessId() || EXTROVIS_PROCESS_ID,
    applicationId: EXTROVIS_APP_ID,
  };
}

/** Signed-in Kissflow user id from the component session, when Kissflow has already provided it. */
export function readLoggedInKissflowUserId(kfInstance) {
  const user = kfInstance?.user || {};
  return norm(user._id || user.Id || user.id || user.UserId);
}

/** Session id first, then kf.user.getUser when the id is not on the session object. */
export async function resolveLoggedInKissflowUserId(kfInstance) {
  const direct = readLoggedInKissflowUserId(kfInstance);
  if (direct) return direct;
  try {
    const getter = kfInstance?.user?.getUser;
    if (typeof getter === 'function') {
      const profile = await getter.call(kfInstance.user);
      const body = profile?.data && typeof profile.data === 'object' ? profile.data : profile;
      const id = norm(body?._id || body?.Id || body?.id || body?.UserId);
      if (id) return id;
    }
  } catch {
    /* leave empty so the caller does not send a blank impersonation header */
  }
  return '';
}

/**
 * Reassign reads and the reassign POST use the admin integration key.
 * useItsmBot is unused by IT Head; it stays available only when a caller asks for it.
 */
export function integrationAuthHeaders(jsonBody = false, { impersonateUserId = '', useItsmBot = false } = {}) {
  const impersonate = norm(impersonateUserId);
  const bot = useItsmBot;
  const headers = {
    Accept: 'application/json',
    'X-Access-Key-Id': bot ? ITSM_BOT_ACCESS_KEY_ID : ACCESS_KEY_ID,
    'X-Access-Key-Secret': bot ? ITSM_BOT_ACCESS_KEY_SECRET : ACCESS_KEY_SECRET,
  };
  if (impersonate) headers['X-Impersonated-User'] = impersonate;
  if (jsonBody) headers['Content-Type'] = 'application/json';
  return headers;
}

function parseError(data, status) {
  const text = norm(data?.en_message || data?.message || data?.error || data?.Success || '');
  if (status && status >= 400) return text || `HTTP ${status}`;
  if (data?.status === 'error' || data?.error_code) return text || 'Kissflow request failed';
  return '';
}

async function readJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function extrovisAdminFetch(kfInstance, path, options = {}) {
  const method = String(options?.method || 'GET').toUpperCase();
  if (method === 'GET') return extrovisAdminFetchUntracked(kfInstance, path, options);
  return trackKfWrite(() => extrovisAdminFetchUntracked(kfInstance, path, options));
}

async function extrovisAdminFetchUntracked(kfInstance, path, {
  method = 'GET',
  body,
  impersonateUserId = '',
  useItsmBot = false,
} = {}) {
  const target = resolveExtrovisAdminTarget(kfInstance);
  const relativePath = path.startsWith('http')
    ? path.replace(target.origin, '')
    : path;
  const hasBody = body !== undefined && body !== null;
  const headers = integrationAuthHeaders(hasBody, { impersonateUserId, useItsmBot });
  const serialized = hasBody ? JSON.stringify(body) : undefined;

  // Kissflow packs must use kf.api — raw fetch with Integration keys is blocked
  // in the iframe, which previously fell through to session activity POST.
  if (kfInstance?.api) {
    const apiConfig = { method, headers };
    if (hasBody) apiConfig.body = serialized;
    const resp = await kfInstance.api(relativePath, apiConfig);
    const data = resp?.data ?? resp ?? {};
    const status = Number(resp?.status || resp?.statusCode || 200);
    const err = parseError(data && typeof data === 'object' ? data : {}, status);
    if (err) throw new Error(err);
    return data && typeof data === 'object' ? data : {};
  }

  const url = path.startsWith('http') ? path : `${target.origin}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: serialized,
  });
  const data = await readJson(res);
  const err = parseError(data, res.status);
  if (!res.ok || err) throw new Error(err || `HTTP ${res.status}`);
  return data;
}

export function extrovisAdminItemPath(kfInstance, instanceId) {
  const { accountId, processId, applicationId } = resolveExtrovisAdminTarget(kfInstance);
  return `/process/2/${accountId}/admin/${processId}/${encodeURIComponent(instanceId)}?_application_id=${encodeURIComponent(applicationId)}`;
}

export function extrovisAdminReassigneePath(kfInstance, page = 1, pageSize = 500) {
  const { accountId, processId, applicationId } = resolveExtrovisAdminTarget(kfInstance);
  return `/process/2/${accountId}/admin/${processId}/reassignee?page_number=${page}&page_size=${pageSize}&_application_id=${encodeURIComponent(applicationId)}`;
}

export function extrovisAdminReassignPath(kfInstance, instanceId, activityInstanceId) {
  const { accountId, processId, applicationId } = resolveExtrovisAdminTarget(kfInstance);
  return `/process/2/${accountId}/admin/${processId}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/reassign?_application_id=${encodeURIComponent(applicationId)}`;
}

function asUserRef(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = norm(entry._id || entry.Id);
  if (!id) return null;
  return {
    _id: id,
    Name: norm(entry.Name || entry.name) || 'User',
    Kind: norm(entry.Kind || entry.kind) || 'User',
    ...(norm(entry.Email || entry.email) ? { Email: norm(entry.Email || entry.email) } : {}),
  };
}

export function collectAgentSolutionTableRows(item) {
  if (!item || typeof item !== 'object') return [];
  const raw = item['Table::IT__Agent_Solution'] ?? item.IT__Agent_Solution ?? item.Table_IT__Agent_Solution;
  if (Array.isArray(raw)) return raw.filter((row) => row && typeof row === 'object');
  if (raw && typeof raw === 'object') {
    return Object.values(raw).filter((row) => row && typeof row === 'object' && norm(row._id));
  }
  return [];
}

function rowStepName(row) {
  return norm(
    getCurrentStepValue(row)
    || row?.currentStep
    || row?.processStages
    || row?.raw?._current_step
    || '',
  );
}

/** Kishore My Team only — IT Agent Solution, never Open/PickUp or Closed. */
export function canKishoreTeamSolutionReassign({ email, scope, row, isExtrovis, tabKey } = {}) {
  if (!isExtrovis || scope !== 'team') return false;
  if (String(tabKey || '') === 'Closed') return false;
  if (!isExtrovisAgentSapTeamOnly(email)) return false;
  if (!row) return false;
  return isExtrovisSolutionCommentStep(rowStepName(row));
}

function isRefexHeadOrManagerPack(headerRoleLabel) {
  const token = String(headerRoleLabel || '').trim().toLowerCase();
  return token === 'it head' || token === 'it manager';
}

function isRefexAgentPack(headerRoleLabel) {
  const token = String(headerRoleLabel || '').trim().toLowerCase();
  return token === 'it agent';
}

function isExtrovisAgentOrApproverPack(headerRoleLabel) {
  const token = String(headerRoleLabel || '').trim().toLowerCase();
  return token === 'it agent'
    || token === 'first level approver'
    || token === 'final level approver';
}

/** Kishore Extrovis Team Solution, Extrovis Agent/First/Final My Team Open, Refex Head/Manager Open+Pending, or Refex IT Agent My Team Open. */
export function canAdminKeyedReassign({
  email,
  scope,
  row,
  isExtrovis = false,
  isRefex = false,
  tabKey,
  role = '',
  headerRoleLabel = '',
} = {}) {
  if (isExtrovis) {
    if (canKishoreTeamSolutionReassign({ email, scope, row, isExtrovis, tabKey })) return true;
    if (!row || scope !== 'team') return false;
    return isExtrovisAgentOrApproverPack(headerRoleLabel) && String(tabKey || '') === 'OpenTickets';
  }
  if (!isRefex || !row) return false;
  const key = String(tabKey || '');
  if (isRefexHeadOrManagerPack(headerRoleLabel)) {
    if (role !== 'first' && role !== 'final') return false;
    if (key === 'OpenTickets' || key === 'PendingTask') return true;
    // IT Head All Tickets: same open / pending tickets, including after a ticket-id search.
    if (String(headerRoleLabel || '').trim().toLowerCase() === 'it head' && key === 'AllTickets') {
      return !isRefexServiceRejectedTicket(row)
        && !isRefexServiceClosedTicket(row)
        && !isRefexServiceProcessCompleted(row);
    }
    return false;
  }
  // IT Agent Refex has no Pending Approval card — My Team Open Tickets only.
  return isRefexAgentPack(headerRoleLabel) && scope === 'team' && key === 'OpenTickets';
}

export function pickLiveSolutionContext(item) {
  const contexts = Array.isArray(item?._current_context) ? item._current_context : [];
  return contexts.find((ctx) => isExtrovisSolutionCommentStep(ctx?._context_current_step))
    || contexts.find((ctx) => isExtrovisSolutionCommentStep(ctx?._context_current_step || item?._current_step))
    || contexts[0]
    || null;
}

/**
 * Live activity for admin reassign (PickUp / Solution / Dependency / approvals).
 * Prefer the context that matches `_current_step`, not a prior completed solution context.
 */
export function pickLiveReassignContext(item) {
  const contexts = Array.isArray(item?._current_context) ? item._current_context : [];
  const currentStep = norm(item?._current_step).toLowerCase();
  if (currentStep) {
    const byStep = contexts.find((ctx) => {
      const step = norm(ctx?._context_current_step).toLowerCase();
      return step && step === currentStep && norm(ctx?._context_activity_instance_id);
    });
    if (byStep) return byStep;
  }
  const withActivity = contexts.find((ctx) => norm(ctx?._context_activity_instance_id));
  if (withActivity) return withActivity;
  return pickLiveSolutionContext(item);
}

function userRefList(value) {
  const list = Array.isArray(value) ? value : (value ? [value] : []);
  const unique = [];
  const seen = new Set();
  list.forEach((entry) => {
    const ref = asUserRef(entry);
    if (!ref || seen.has(ref._id)) return;
    seen.add(ref._id);
    unique.push({ _id: ref._id, Name: ref.Name, Kind: ref.Kind || 'User' });
  });
  return unique;
}

/** Kissflow Role/Group refs (Ro…) are not valid ReassignedFrom for admin reassign. */
function isHumanUserRef(ref) {
  if (!ref?._id) return false;
  const kind = norm(ref.Kind).toLowerCase();
  if (kind === 'role' || kind === 'userrole' || kind === 'group') return false;
  if (/^ro/i.test(ref._id)) return false;
  return true;
}

function humanUserRefList(value) {
  return userRefList(value).filter(isHumanUserRef);
}

function currentHumanAssignees(item, ctx) {
  return humanUserRefList([
    ...(Array.isArray(ctx?._context_assigned_to) ? ctx._context_assigned_to : []),
    ...(Array.isArray(item?._current_assigned_to) ? item._current_assigned_to : []),
  ]);
}

function reassignContext(item) {
  return pickLiveReassignContext(item)
    || (Array.isArray(item?._current_context) ? item._current_context[0] : null);
}

export function pickReassignedFrom(item) {
  const ctx = reassignContext(item);
  const history = Array.isArray(ctx?._context_reassignments) ? ctx._context_reassignments : [];
  const last = history[history.length - 1];
  // Prefer who holds the ticket now (UI "Current assignee"), never a Role id like Ro….
  const current = currentHumanAssignees(item, ctx);
  if (current.length) return current;
  const fromHistory = humanUserRefList(last?.From);
  if (fromHistory.length) return fromHistory;
  const toHistory = humanUserRefList(last?.To);
  if (toHistory.length) return toHistory;
  return [];
}

/**
 * Admin reassign From candidates.
 * Try current human holder first (avoids "not assigned to Ro…" when history From is a Role),
 * then prior To / From users for second+ reassign retries.
 */
export function extrovisAgentReassignFromCandidates(item) {
  const ctx = reassignContext(item);
  const history = Array.isArray(ctx?._context_reassignments) ? ctx._context_reassignments : [];
  const last = history[history.length - 1];
  const lists = [
    currentHumanAssignees(item, ctx),
    humanUserRefList(last?.To),
    humanUserRefList(last?.From),
    pickReassignedFrom(item),
  ];
  const seen = new Set();
  return lists.filter((list) => {
    if (!list.length) return false;
    const key = list.map((user) => user._id).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isStaleReassignAssigneeError(error) {
  return /not assigned to/i.test(norm(error?.message || error));
}

/** Same second-reassign retry as Extrovis IT Agent. Other packs keep a single attempt. */
export function usesCurrentAssigneeReassignRetry(headerRoleLabel) {
  const token = norm(headerRoleLabel).toLowerCase();
  return token === 'it agent'
    || token === 'it head'
    || token === 'it manager'
    || token === 'first level approver'
    || token === 'final level approver';
}

export async function fetchExtrovisAdminItem(kfInstance, instanceId, { impersonateUserId = '', useItsmBot = false } = {}) {
  const data = await extrovisAdminFetch(kfInstance, extrovisAdminItemPath(kfInstance, instanceId), {
    impersonateUserId,
    useItsmBot,
  });
  return data && typeof data === 'object' ? data : {};
}

export async function putExtrovisAdminComment(kfInstance, instanceId, newRow) {
  const item = await fetchExtrovisAdminItem(kfInstance, instanceId);
  if (!norm(item?._id)) {
    throw new Error('Could not read this ticket from the Kissflow admin API before saving.');
  }
  const existing = collectAgentSolutionTableRows(item).filter((row) => norm(row._id));
  const nextRow = { ...newRow };
  if (!norm(nextRow._id)) throw new Error('Comment row is missing an id.');
  const merged = [...existing.filter((row) => norm(row._id) !== norm(nextRow._id)), nextRow];
  const payload = {
    _id: instanceId,
    'Table::IT__Agent_Solution': merged,
  };
  return extrovisAdminFetch(kfInstance, extrovisAdminItemPath(kfInstance, instanceId), {
    method: 'PUT',
    body: payload,
  });
}

export async function fetchExtrovisAdminReassignees(kfInstance, page = 1, pageSize = 500, { impersonateUserId = '', useItsmBot = false } = {}) {
  const data = await extrovisAdminFetch(kfInstance, extrovisAdminReassigneePath(kfInstance, page, pageSize), {
    impersonateUserId,
    useItsmBot,
  });
  const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  return list.map(asUserRef).filter(Boolean);
}

export async function reassignExtrovisAdminTicket(kfInstance, {
  instanceId,
  activityInstanceId,
  reassignedFrom,
  fromCandidates,
  reassignTo,
  note,
  impersonateUserId = '',
} = {}) {
  const to = asUserRef(reassignTo);
  if (!norm(instanceId) || !norm(activityInstanceId)) {
    throw new Error('Could not resolve the live activity for reassignment.');
  }
  if (!to) throw new Error('Select a user to reassign to.');
  const text = norm(note);
  if (!text) throw new Error('Notes are required.');
  const lists = (Array.isArray(fromCandidates) && fromCandidates.length
    ? fromCandidates
    : [reassignedFrom]
  ).map((list) => (Array.isArray(list) ? list : [])
    .map(asUserRef)
    .filter(Boolean)
    .map(({ _id, Name, Kind }) => ({ _id, Name, Kind: Kind || 'User' })))
    .filter((list) => list.length);
  if (!lists.length) throw new Error('Could not resolve who this ticket is assigned to.');
  let lastError = null;
  for (let index = 0; index < lists.length; index += 1) {
    const payload = {
      ReassignedFrom: lists[index],
      ReassignTo: to,
      Note: text,
      ReassignType: 'admin',
    };
    try {
      return await extrovisAdminFetch(
        kfInstance,
        extrovisAdminReassignPath(kfInstance, instanceId, activityInstanceId),
        { method: 'POST', body: payload, impersonateUserId },
      );
    } catch (error) {
      lastError = error;
      const canRetry = index < lists.length - 1 && isStaleReassignAssigneeError(error);
      if (!canRetry) throw error;
    }
  }
  throw lastError || new Error('Reassign failed');
}

export async function loadExtrovisAdminReassignContext(kfInstance, instanceId, { impersonateUserId = '', useItsmBot = false } = {}) {
  const item = await fetchExtrovisAdminItem(kfInstance, instanceId, { impersonateUserId, useItsmBot });
  const ctx = pickLiveReassignContext(item);
  const activityInstanceId = norm(
    ctx?._context_activity_instance_id
    || item?._current_activity_instance_id
    || item?.Activity_Instance_ID
    || '',
  );
  return {
    item,
    activityInstanceId,
    reassignedFrom: pickReassignedFrom(item),
    fromCandidates: extrovisAgentReassignFromCandidates(item),
    stepName: norm(ctx?._context_current_step || item?._current_step),
  };
}
