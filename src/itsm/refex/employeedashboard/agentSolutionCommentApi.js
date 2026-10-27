/**
 * Comments save — Extrovis uses Integration admin PUT (employee + My Team).
 * Refex POSTs the live InProgress activity (never /submit).
 * Nested Table::IT__Agent_Solution only (no scalar It_Agent_Solution).
 */
import {
  APP_ID,
  getActiveServiceProcessId,
  getITProcess,
  resolveAccountId,
  isExtrovisServiceDashboardContext,
  resolveAttachmentUrl,
  getCurrentStepValue,
} from '../../../lib/kfITServiceDashboard.js';
import { kfMutateJson, kfPutBinary, kfPutJson } from '../../../lib/kfRuntime.js';
import {
  fetchRefexProcessProgressCached,
  pickInProgressAgentCommentActivity,
  listInProgressCommentActivityIdsFromProgress,
  listInProgressSolutionCommentActivityIdsFromProgress,
} from './progressApi.js';
import {
  COMMENT_CHANNEL_INTERNAL,
  COMMENT_CHANNEL_USER,
  normalizeCommentChannel,
  isExtrovisSolutionCommentStep,
} from './commentChannel.js';
import { queueUserCommentNotifyMail } from './commentNotifyMail.js';
import { putExtrovisAdminComment } from '../../../lib/extrovisIntegrationApi.js';

function norm(value) {
  return String(value ?? '').trim();
}

function looksLikeEmail(value) {
  return Boolean(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(value));
}

/** Person Name for Name_1 — never an email address. */
export function resolveCommentAuthorName(user) {
  const first = norm(user?.FirstName || user?.firstName);
  const last = norm(user?.LastName || user?.lastName);
  const combined = [first, last].filter(Boolean).join(' ');
  const name = norm(user?.Name || user?.name || user?.displayName);
  if (name && !looksLikeEmail(name)) return name;
  if (combined && !looksLikeEmail(combined)) return combined;
  if (first && !looksLikeEmail(first)) return first;
  return '';
}

/** Match table Name_1 / comment author to the signed-in person (WhatsApp “mine”). */
export function commentAuthorsMatch(authorName, currentUserName) {
  const a = norm(authorName).toLowerCase().replace(/\s+/g, ' ');
  const b = norm(currentUserName).toLowerCase().replace(/\s+/g, ' ');
  if (!a || !b || looksLikeEmail(a) || looksLikeEmail(b)) return false;
  if (a === b) return true;
  const aParts = a.split(' ');
  const bParts = b.split(' ');
  const aLast = aParts[aParts.length - 1];
  const bLast = bParts[bParts.length - 1];
  if (aLast.length >= 4 && aLast === bLast) return true;
  if (aParts.length === 1 && a.length >= 4 && bParts.includes(a)) return true;
  if (bParts.length === 1 && b.length >= 4 && aParts.includes(b)) return true;
  return false;
}

export function generateAgentSolutionRowId() {
  let hex = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    hex = [...crypto.getRandomValues(new Uint8Array(5))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } else {
    hex = Math.random().toString(16).slice(2, 12).padEnd(10, '0');
  }
  return `IT__Agent_Solution_${hex.slice(0, 10)}`;
}

export function buildAgentSolutionCommentPayload({
  instanceId,
  comment,
  authorName,
  extrovis = false,
  rowId = '',
  commentsType = '',
  attachments = [],
} = {}) {
  const id = norm(instanceId);
  const text = norm(comment);
  const name = norm(authorName);
  const files = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  if (!id || !name) return null;
  if (!text && !files.length) return null;
  const nested = {
    _id: norm(rowId) || generateAgentSolutionRowId(),
    Name_1: name,
    Resolution: text,
  };
  if (extrovis) {
    nested.Stages_1 = 'InProgress';
    const channel = normalizeCommentChannel(commentsType) || COMMENT_CHANNEL_INTERNAL;
    nested.Comments_2 = channel;
  }
  if (files.length) nested.Attachments = files;
  return {
    _id: id,
    'Table::IT__Agent_Solution': [nested],
  };
}

function buildProcessPaths(kfInstance) {
  const accountId = resolveAccountId(kfInstance);
  const appQuery = `_application_id=${encodeURIComponent(APP_ID)}`;
  const processId = getActiveServiceProcessId();
  const base = `/process/2/${accountId}/${processId}`;
  return {
    instanceWithActivityPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}?${appQuery}`;
    },
    adminItemPath(instanceId) {
      return `/process/2/${accountId}/admin/${processId}/item/${encodeURIComponent(instanceId)}?${appQuery}`;
    },
  };
}

function collectRowActivityIds(row) {
  const ids = [];
  const push = (value) => {
    const id = norm(value);
    if (id && !ids.includes(id)) ids.push(id);
  };
  push(row?.activityInstanceId);
  push(row?.employeeTaskActivityInstanceId);
  push(row?.raw?._activity_instance_id);
  push(row?.raw?._current_context?.[0]?._context_activity_instance_id);
  push(row?.techSupportMyTaskItem?._activity_instance_id);
  push(row?.raw?._flow_id);
  return ids;
}

function isRetryableCommentSaveError(err) {
  const msg = String(err?.message || err || '');
  return /permission|does not exist|don't have|do not have|not found|404|403|queue|anymore|in progress/i.test(msg);
}

function parseMutationResponse(resp, fallback = 'Comment saved') {
  const successText = norm(
    resp?.success || resp?.Success || resp?.message || resp?.en_message,
  );
  if (resp?.status === 'error' || resp?.error_code) {
    throw new Error(successText || 'Could not save comment');
  }
  if (successText && /permission|does not exist|don't have|do not have/i.test(successText)) {
    throw new Error(successText);
  }
  return { success: successText || fallback };
}

/**
 * KPI card that owns Comments send on every service dashboard.
 * Extrovis: My Tickets. Refex: Open Tickets. Employee Open maps to the same live queue.
 * Extrovis also requires live IT Agent Solution (not PickUp / Open / Closed).
 */
export function getAgentCommentComposeTabKey({ extrovis } = {}) {
  const isExt = extrovis ?? isExtrovisServiceDashboardContext();
  return isExt ? 'AssignedToMe' : 'OpenTickets';
}

/** True when the ticket is live at IT Agent Solution — not PickUp. */
export function ticketIsAtExtrovisSolutionCommentStep({ row, progress } = {}) {
  if (progress) {
    const solutionIds = listInProgressSolutionCommentActivityIdsFromProgress(progress, row);
    if (solutionIds.length) return true;
    const live = pickInProgressAgentCommentActivity(progress, row);
    if (live?.stepName) return isExtrovisSolutionCommentStep(live.stepName);
    const anyLive = listInProgressCommentActivityIdsFromProgress(progress, row);
    if (anyLive.length) return false;
  }
  const step = getCurrentStepValue(row)
    || row?.currentStep
    || row?.processStages
    || '';
  return isExtrovisSolutionCommentStep(step);
}

/** True when the active KPI card allows posting Comments. */
export function canComposeAgentTicketComment({
  extrovis,
  tabKey,
  role,
  row,
  progress,
  scope = '',
} = {}) {
  const composeTab = getAgentCommentComposeTabKey({ extrovis });
  const key = String(tabKey || '').trim();
  if (!key) return false;
  if (key === 'Closed') return false;
  const hasTicket = Boolean(row || progress);
  if (extrovis && hasTicket) {
    const atSolution = ticketIsAtExtrovisSolutionCommentStep({ row, progress });
    if (role === 'employee') {
      return (key === composeTab || key === 'Open') && atSolution;
    }
    // My Team Open uses the same Solution-step rule as Me.
    // PickUp stays closed. Me Open stays closed so Me landing and Accept are unchanged.
    if ((key === 'OpenTickets' || key === 'Open') && scope === 'team') return atSolution;
    if (key === 'OpenTickets' || key === 'Open') return false;
    return atSolution;
  }
  const tabOk = key === composeTab || key === 'Open';
  if (!tabOk) return false;
  if (role === 'employee' || (extrovis && key === 'Open')) {
    if (!hasTicket) return true;
    return ticketIsAtExtrovisSolutionCommentStep({ row, progress });
  }
  return true;
}

function randomToken(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    out = [...bytes].map((byte) => chars[byte % chars.length]).join('');
  } else {
    while (out.length < length) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateAttachId() {
  return `Attach_${randomToken(10)}`;
}

function isImageFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '');
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
}

function safeFileName(name) {
  return String(name || 'file').replace(/[\\/]/g, '_');
}

async function initKissflowUpload(kfInstance, { name, size, key, mimeType }) {
  const accountId = resolveAccountId(kfInstance);
  const path = `/upload/2/${accountId}/?_application_id=${encodeURIComponent(APP_ID)}`;
  return kfMutateJson(kfInstance, path, {
    method: 'POST',
    body: { name, size, key, mimeType },
  });
}

async function requestImageThumbnails(kfInstance, key) {
  const accountId = resolveAccountId(kfInstance);
  const path = `/upload/2/${accountId}/image/thumbnail?_application_id=${encodeURIComponent(APP_ID)}`;
  try {
    return await kfPutJson(kfInstance, path, {
      key,
      sizes: [[1200, 800], [100, 100]],
      isProfile: false,
    });
  } catch {
    return null;
  }
}

export async function uploadAgentSolutionAttachments(kfInstance, {
  instanceId,
  activityInstanceId,
  rowId,
  files = [],
} = {}) {
  const processId = getActiveServiceProcessId();
  const uploaded = [];
  for (const file of files) {
    if (!file) continue;
    const attachId = generateAttachId();
    const fileName = safeFileName(file.name);
    const mimeType = file.type || 'application/octet-stream';
    const key = [
      processId,
      instanceId,
      activityInstanceId,
      'IT__Agent_Solution',
      rowId,
      attachId,
      fileName,
    ].join('/');
    const init = await initKissflowUpload(kfInstance, {
      name: fileName,
      size: file.size,
      key,
      mimeType,
    });
    const putUrl = init?.Url || init?.url;
    const storedKey = init?.Key || init?.key || key;
    if (!putUrl) throw new Error('Kissflow did not return an upload URL');
    await kfPutBinary(putUrl, file, mimeType);
    let photos = [];
    if (isImageFile(file)) {
      const thumbs = await requestImageThumbnails(kfInstance, storedKey);
      if (Array.isArray(thumbs) && thumbs.length) photos = thumbs;
    }
    const now = new Date().toISOString();
    const uploadedFile = {
      uploaded: 100,
      name: fileName,
      id: attachId,
      key: storedKey,
      size: file.size,
      fileExtension: (init?.FileExtension || fileName.split('.').pop() || '').replace(/^\./, ''),
      mimeType: init?.ContentType || mimeType,
      photos,
      _modified_at: now,
      _created_at: now,
    };
    const viewUrl = resolveAttachmentUrl(uploadedFile);
    if (viewUrl) {
      uploadedFile.Url = viewUrl;
      uploadedFile.url = viewUrl;
    }
    uploaded.push(uploadedFile);
  }
  return uploaded;
}

/**
 * Extrovis comments use admin PUT (same as My Team) so Send works when the
 * ticket is not in the signed-in user's queue. Refex still POSTs the live
 * InProgress activity and never calls /submit.
 * Employee Extrovis always writes Comments_2=User (same as Refex One Help Desk).
 */
export async function saveAgentSolutionComment(kfInstance, row, {
  comment,
  authorName,
  progress = null,
  commentsType = '',
  files = [],
  role = 'agent',
} = {}) {
  const instanceId = norm(row?.id || row?.raw?._id);
  const text = norm(comment);
  const name = resolveCommentAuthorName({ Name: authorName }) || norm(authorName);
  const COMMENT_FILE_MAX_BYTES = 1024 * 1024;
  const fileList = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!kfInstance?.api && !kfInstance) throw new Error('Kissflow API is not available');
  if (!instanceId) throw new Error('Missing ticket id for comment save');
  if (!text && !fileList.length) throw new Error('Enter a comment or add an attachment');
  if (fileList.some((file) => Number(file?.size || 0) > COMMENT_FILE_MAX_BYTES)) {
    throw new Error('File limit is 1MB only');
  }
  if (!name) throw new Error('Your name is required to post a comment');

  const extrovis = isExtrovisServiceDashboardContext();
  const employee = role === 'employee';
  const channel = employee
    ? COMMENT_CHANNEL_USER
    : (normalizeCommentChannel(commentsType) || (extrovis ? COMMENT_CHANNEL_INTERNAL : ''));
  const liveProgress = await fetchRefexProcessProgressCached(kfInstance, instanceId, {
    force: true,
  });
  const progressPayload = liveProgress || progress;
  const activityIds = [];
  const pushAct = (value) => {
    const id = norm(value);
    if (id && !activityIds.includes(id)) activityIds.push(id);
  };
  if (employee) {
    listInProgressSolutionCommentActivityIdsFromProgress(progressPayload, row).forEach(pushAct);
    const live = pickInProgressAgentCommentActivity(progressPayload, row);
    if (live?.activityInstanceId && isExtrovisSolutionCommentStep(live.stepName)) {
      pushAct(live.activityInstanceId);
    }
    if (!activityIds.length) {
      throw new Error('Comments can only be sent while the ticket is at IT Agent Solution.');
    }
  } else {
    listInProgressCommentActivityIdsFromProgress(progressPayload, row).forEach(pushAct);
    const live = pickInProgressAgentCommentActivity(progressPayload, row);
    if (live?.activityInstanceId) pushAct(live.activityInstanceId);
    collectRowActivityIds(row).forEach(pushAct);
    if (!activityIds.length) {
      throw new Error('Comments can only be saved while a live activity is in progress.');
    }
  }

  const rowId = generateAgentSolutionRowId();
  let attachments = [];
  if (extrovis && fileList.length) {
    attachments = await uploadAgentSolutionAttachments(kfInstance, {
      instanceId,
      activityInstanceId: activityIds[0],
      rowId,
      files: fileList,
    });
  }

  const body = buildAgentSolutionCommentPayload({
    instanceId,
    comment: text,
    authorName: name,
    extrovis,
    rowId,
    commentsType: channel,
    attachments,
  });
  if (!body) throw new Error('Could not build comment payload');

  const finishSaved = (result) => {
    queueUserCommentNotifyMail({
      extrovis,
      commentsType: channel,
      role: employee ? 'employee' : 'agent',
      row,
      comment: text,
      authorName: name,
      attachments,
    }).catch(() => {});
    return result;
  };

  const paths = buildProcessPaths(kfInstance);
  let lastError = null;
  // Extrovis employee + agent/team: Integration admin PUT, not process.update-item.
  // Requesters get KISSFLOW_ERROR_050201 ("moved out of your queue") on update-item.
  if (extrovis) {
    await putExtrovisAdminComment(kfInstance, instanceId, body['Table::IT__Agent_Solution'][0]);
    return finishSaved(parseMutationResponse({ Success: 'Comment saved' }, 'Comment saved'));
  }
  for (const activityInstanceId of activityIds) {
    try {
      const process = getITProcess(kfInstance);
      if (process?.updateItem) {
        await process.updateItem({
          instanceId,
          activityInstanceId,
          data: body,
        });
        return finishSaved(parseMutationResponse(null, 'Comment saved'));
      }
      const savePath = paths.instanceWithActivityPath(instanceId, activityInstanceId);
      if (/\/submit(\?|$)/i.test(savePath)) {
        throw new Error('Comment save must not call /submit');
      }
      const resp = await kfMutateJson(kfInstance, savePath, {
        method: 'POST',
        body,
      });
      return finishSaved(parseMutationResponse(resp, 'Comment saved'));
    } catch (err) {
      lastError = err;
      if (!isRetryableCommentSaveError(err)) continue;
    }
  }

  try {
    const adminResp = await kfPutJson(kfInstance, paths.adminItemPath(instanceId), body);
    return finishSaved(parseMutationResponse(adminResp, 'Comment saved'));
  } catch (err) {
    lastError = lastError || err;
  }

  throw lastError || new Error('Could not save comment');
}
