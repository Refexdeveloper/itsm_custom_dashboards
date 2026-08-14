/**
 * Kissflow employee feedback / reopen API helpers.
 */
import {
  APP_ID,
  getActiveServiceProcessId,
  getITProcess,
  resolveAccountId,
  extractItemsFromResponse,
  getActiveDashboardProfile,
  REFEX_REPORT_PAGE_SIZE,
} from '../../../lib/kfITServiceDashboard.js';
import { kfGetJson, kfMutateJson } from '../../../lib/kfRuntime.js';
import {
  EMPLOYEE_FEEDBACK_NATIVE_FIELDS as F,
} from './employeeFeedbackFields.js';
import {
  EMPLOYEE_APPROVAL_ACTIVITY_ID,
  EMPLOYEE_APPROVAL_ACTIVITY_ID_LEGACY,
  EMPLOYEE_APPROVAL_STEP_LABEL,
} from './constants.js';
import {
  pickEmployeeTaskActivityId,
  pickEmployeeFeedbackActivityFromReport,
  pickItTechSupportSendbackTargetId,
  resolveProcessInstanceId,
} from './employeeTaskIds.js';
import { isEmployeeApprovalRefexStep, getActiveWorkflowStep } from './employeeStatus.js';
import {
  fetchRefexProcessProgress,
  parseRefexProgress,
} from './progressApi.js';

function norm(value) {
  return String(value ?? '').trim();
}

/** Employee Feedback step activity id — profile-aware (Refex / Extrovis share this flow). */
function employeeFeedbackActivityId() {
  return getActiveDashboardProfile()?.employeeFeedbackActivityId || EMPLOYEE_APPROVAL_ACTIVITY_ID;
}

function employeeFeedbackActivityIds() {
  const profile = getActiveDashboardProfile();
  return [...new Set([
    profile?.employeeFeedbackActivityId,
    profile?.employeeFeedbackActivityIdLegacy,
    EMPLOYEE_APPROVAL_ACTIVITY_ID,
    EMPLOYEE_APPROVAL_ACTIVITY_ID_LEGACY,
  ].filter(Boolean))];
}

function normLower(value) {
  return norm(value).toLowerCase();
}

function buildProcessPaths(kfInstance) {
  const accountId = resolveAccountId(kfInstance);
  const appQuery = `_application_id=${encodeURIComponent(APP_ID)}`;
  const processId = getActiveServiceProcessId();
  const base = `/process/2/${accountId}/${processId}`;
  return {
    instanceActivityPath(instanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/activity?${appQuery}`;
    },
    instanceWithActivityPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}?${appQuery}`;
    },
    instanceSendbackPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/sendback?${appQuery}`;
    },
  };
}

function parseMutationResponse(resp, fallback = 'Success') {
  const successText = norm(
    resp?.success || resp?.Success || resp?.message || resp?.en_message,
  );
  if (resp?.status === 'error' || resp?.error_code) {
    throw new Error(successText || 'Request failed');
  }
  if (successText && !/success|saved|submitted|updated|sent back|sendback|reopened/i.test(successText)) {
    throw new Error(successText);
  }
  if (!resp) return { success: fallback };
  if (typeof resp === 'string') return { success: resp };
  if (resp.Success) return { success: String(resp.Success) };
  if (resp.success) return { success: String(resp.success) };
  if (resp.message) return { success: String(resp.message) };
  return { success: fallback };
}

function pickActivityIdFromItem(item) {
  return norm(
    item?._activity_instance_id
    || item?.activityInstanceId
    || item?.Activity_Instance_ID,
  );
}

function isEmployeeFeedbackBackendStep(stepName) {
  const step = normLower(stepName);
  if (!step) return false;
  return step === 'employee verification'
    || step === 'employee feedback'
    || step === 'employee approval'
    || step === 'it tech reopen'
    || step.includes('employee verification')
    || step.includes('employee feedback')
    || step.includes('it tech reopen');
}

function isEmployeeApprovalTask(task) {
  const activityId = norm(task?._activity_id || task?.Activity_ID || task?.activity_id);
  if (employeeFeedbackActivityIds().includes(activityId)) return true;
  const step = norm(task?._current_step || task?.Current_Step).toLowerCase();
  return step.includes('employee approval')
    || step.includes('employee feedback')
    || step.includes('employee verification')
    || step.includes('it tech reopen');
}

function isEmployeeFeedbackStageRow(row) {
  if (!row) return false;
  const step = getActiveWorkflowStep(row);
  if (isEmployeeApprovalRefexStep(step)) return true;
  if (isEmployeeFeedbackBackendStep(step)) return true;
  if (norm(row?.employeeDisplayStatusHint) === EMPLOYEE_APPROVAL_STEP_LABEL) return true;
  return (row?.employeeApprovalActivities || []).some(
    (entry) => normLower(entry?.status) === 'inprogress',
  );
}

function buildResolvedIds(row, task, activityInstanceId, reportActivityInstanceId) {
  const instanceId = resolveProcessInstanceId(row, task);
  const resolvedCurrentStep = norm(
    task?._current_step || task?.Current_Step || row?.currentStep || getActiveWorkflowStep(row),
  );
  const resolvedCurrentStepId = norm(
    task?._current_step_id || task?.Current_Step_ID || row?.currentStepId,
  );
  return {
    instanceId,
    activityInstanceId: norm(activityInstanceId),
    task,
    reportActivityInstanceId: norm(reportActivityInstanceId),
    resolvedCurrentStep,
    resolvedCurrentStepId,
  };
}

/** Sync resolution — Employee Feedback StepField in-progress `_id` first (never Activity_*). */
function resolveEmployeeFeedbackTaskIdsFromRow(row) {
  const task = row?.employeeMyTaskItem;
  const raw = row?.raw ?? row;
  const reportActivityInstanceId = pickEmployeeFeedbackActivityFromReport(raw)
    || pickEmployeeTaskActivityId(null, row);
  const fromTask = isEmployeeApprovalTask(task) ? pickActivityIdFromItem(task) : '';
  const activityInstanceId = preferActivityInstanceId(
    reportActivityInstanceId,
    fromTask,
    row?.employeeTaskActivityInstanceId,
  );

  return buildResolvedIds(row, task, activityInstanceId, reportActivityInstanceId);
}

/** Prefer StepField / confirmation activity instance ids; reject workflow definition ids. */
function preferActivityInstanceId(...candidates) {
  for (const candidate of candidates) {
    const id = norm(candidate);
    if (!id) continue;
    if (id.startsWith('Activity_')) continue;
    if (id.startsWith('Employee_Confirmation_')) continue;
    return id;
  }
  return '';
}

async function findEmployeeMyTaskActivityId(kfInstance, instanceId) {
  if (!instanceId) return '';

  const accountId = resolveAccountId(kfInstance);
  const appQuery = `_application_id=${encodeURIComponent(APP_ID)}`;
  const processId = getActiveServiceProcessId();
  const base = `/process/2/${accountId}/${processId}`;

  // 1) pending/{Employee Feedback activity} — current + legacy activity ids.
  if (kfInstance?.api) {
    for (const feedbackActivityId of employeeFeedbackActivityIds()) {
      try {
        const path = `${base}/pending/${encodeURIComponent(feedbackActivityId)}?apply_preference=true&page_number=1&page_size=${REFEX_REPORT_PAGE_SIZE}&skip_aggregation=true&${appQuery}`;
        const resp = await kfGetJson(kfInstance, path);
        const match = extractItemsFromResponse(resp).find((it) => norm(it?._id) === instanceId);
        const actId = preferActivityInstanceId(pickActivityIdFromItem(match));
        if (actId) return actId;
      } catch (err) {
        console.warn(`employee pending-at-step/${feedbackActivityId} lookup failed:`, err?.message || err);
      }
    }
  }

  // 2) myitems/inprogress — Employee Feedback tasks live here (not myitems/pending|all).
  if (kfInstance?.api) {
    try {
      const path = `${base}/myitems/inprogress?apply_preference=true&page_number=1&page_size=${REFEX_REPORT_PAGE_SIZE}&skip_aggregation=true&${appQuery}`;
      const resp = await kfGetJson(kfInstance, path);
      const match = extractItemsFromResponse(resp).find((it) => (
        norm(it?._id) === instanceId && isEmployeeApprovalTask(it)
      ));
      const actId = preferActivityInstanceId(pickActivityIdFromItem(match));
      if (actId) return actId;
    } catch (err) {
      console.warn('employee myitems/inprogress lookup failed:', err?.message || err);
    }
  }

  const process = getITProcess(kfInstance);
  if (!process?.getMyTasksItems) return '';

  try {
    const resp = await process.getMyTasksItems({
      activityId: feedbackActivityId,
      pageNumber: 1,
      pageSize: REFEX_REPORT_PAGE_SIZE,
    });
    const match = extractItemsFromResponse(resp).find(
      (it) => norm(it?._id) === instanceId,
    );
    const actId = preferActivityInstanceId(pickActivityIdFromItem(match));
    if (actId) return actId;
  } catch (err) {
    console.warn('employee myTasks lookup failed:', err?.message || err);
  }

  return '';
}

async function fetchEmployeeFeedbackActivityFromInstance(kfInstance, instanceId, hintId = '') {
  if (!instanceId || !kfInstance?.api) return norm(hintId);

  const paths = buildProcessPaths(kfInstance);
  try {
    const activities = await kfGetJson(kfInstance, paths.instanceActivityPath(instanceId));
    const list = Array.isArray(activities) ? activities : extractItemsFromResponse(activities);

    for (const act of list || []) {
      const actId = pickActivityIdFromItem(act);
      const actStatus = normLower(act?.Status || act?._status || act?.status);
      if (!actId || actStatus === 'completed' || actStatus === 'cancelled' || actStatus === 'canceled') {
        continue;
      }

      const activityId = norm(act?._activity_id || act?.Activity_ID || act?.activity_id);
      if (employeeFeedbackActivityIds().includes(activityId)) {
        return actId;
      }

      const stepName = norm(
        act?.Name || act?.Activity_Name || act?.activity_name || act?.Step_Name || act?.step_name,
      );
      if (isEmployeeFeedbackBackendStep(stepName)) {
        return actId;
      }
    }
  } catch (err) {
    console.warn('employee feedback activity lookup failed:', err?.message || err);
  }

  return norm(hintId);
}

/** Resolve current Employee Verification / Employee Feedback activity instance (async). */
export async function resolveEmployeeFeedbackTaskIdsAsync(kfInstance, row) {
  const task = row?.employeeMyTaskItem;
  const syncIds = resolveEmployeeFeedbackTaskIdsFromRow(row);
  const instanceId = syncIds.instanceId;

  // Same order as Refex: report StepField → live Employee Feedback task → mapped/task → activity list.
  let resolvedActivityInstanceId = preferActivityInstanceId(syncIds.reportActivityInstanceId);

  if (!resolvedActivityInstanceId && kfInstance?.api && instanceId) {
    resolvedActivityInstanceId = preferActivityInstanceId(
      await findEmployeeMyTaskActivityId(kfInstance, instanceId),
    );
  }

  if (!resolvedActivityInstanceId) {
    resolvedActivityInstanceId = preferActivityInstanceId(
      (task && isEmployeeApprovalTask(task)) ? pickActivityIdFromItem(task) : '',
      row?.employeeTaskActivityInstanceId,
      syncIds.activityInstanceId,
    );
  }

  if (!resolvedActivityInstanceId && kfInstance?.api && instanceId) {
    resolvedActivityInstanceId = preferActivityInstanceId(
      await fetchEmployeeFeedbackActivityFromInstance(
        kfInstance,
        instanceId,
        syncIds.reportActivityInstanceId,
      ),
    );
  }

  return buildResolvedIds(
    row,
    task,
    resolvedActivityInstanceId,
    syncIds.reportActivityInstanceId,
  );
}

export function resolveEmployeeFeedbackTaskIds(row) {
  return resolveEmployeeFeedbackTaskIdsFromRow(row);
}

export function canSubmitEmployeeFeedback(row) {
  const { instanceId, activityInstanceId } = resolveEmployeeFeedbackTaskIds(row);
  if (!instanceId) return false;
  if (!activityInstanceId && !isEmployeeFeedbackStageRow(row)) return false;

  const task = row?.employeeMyTaskItem;
  if (task && isEmployeeApprovalTask(task)) return true;

  return isEmployeeFeedbackStageRow(row);
}

async function assertEmployeeFeedbackStep(ids, row) {
  const step = ids.resolvedCurrentStep || getActiveWorkflowStep(row);
  if (!isEmployeeFeedbackBackendStep(step) && !isEmployeeFeedbackStageRow(row)) {
    throw new Error('This ticket is not at the Employee Feedback step.');
  }
  if (!ids.instanceId || !ids.activityInstanceId) {
    throw new Error('Could not resolve the current Employee Feedback task.');
  }
}

export async function refreshEmployeeFeedbackProgress(kfInstance, row) {
  const instanceId = resolveProcessInstanceId(row, row?.employeeMyTaskItem);
  if (!instanceId || !kfInstance?.api) return null;
  const progress = await fetchRefexProcessProgress(kfInstance, instanceId);
  return parseRefexProgress(progress, row);
}

async function saveEmployeeFeedbackFields(kfInstance, ids, payload) {
  const id = norm(ids.instanceId);
  const actId = norm(ids.activityInstanceId);
  if (!id) throw new Error('Missing instance id for employee feedback update');
  if (!actId) throw new Error('Missing activity instance id for employee feedback update');
  if (id.startsWith('Activity_')) {
    throw new Error('Invalid ticket instance id for employee feedback update');
  }
  if (actId.startsWith('Activity_')) {
    throw new Error('Invalid activity instance id for employee feedback update');
  }
  if (actId.startsWith('Employee_Confirmation_')) {
    throw new Error('Confirmation table id cannot be used as the activity instance id');
  }

  const body = { ...payload, _id: id };
  const paths = buildProcessPaths(kfInstance);
  const process = getITProcess(kfInstance);
  if (process?.updateItem) {
    await process.updateItem({
      instanceId: id,
      activityInstanceId: actId,
      data: body,
    });
    return parseMutationResponse(null, 'Saved successfully');
  }

  const resp = await kfMutateJson(kfInstance, paths.instanceWithActivityPath(id, actId), {
    method: 'POST',
    body,
  });
  return parseMutationResponse(resp, 'Saved successfully');
}

function generateConfirmationRowId() {
  return `Employee_Confirmation_${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeConfirmationRowId(value) {
  const id = norm(value);
  if (!id) return '';
  if (id.startsWith('Employee_Confirmation_')) return id;
  // Kissflow table row ids for this field always use the Employee_Confirmation_ prefix.
  if (id.startsWith('Activity_')) return '';
  return id;
}

function buildExistingConfirmationPatches(row) {
  const parsed = row?.employeeConfirmations || [];
  return parsed
    .map((entry) => {
      const id = normalizeConfirmationRowId(entry?.recordId || entry?.id);
      if (!id) return null;
      const patch = { _id: id };
      const comments = norm(entry?.comments);
      if (comments) patch[F.confirmationComments] = comments;
      if (entry?.ratings != null && entry?.ratings !== '') {
        patch[F.confirmationRatings] = Number(entry.ratings);
      }
      return patch;
    })
    .filter(Boolean);
}

function buildConfirmationTablePayload(row, { comments, ratings }) {
  const newRowId = generateConfirmationRowId();
  return [
    ...buildExistingConfirmationPatches(row),
    {
      _id: newRowId,
      _is_created: true,
      [F.confirmationComments]: comments,
      [F.confirmationRatings]: Number(ratings),
    },
  ];
}

function buildFeedbackUpdatePayload(row, { comments, ratings }) {
  const note = norm(comments);
  const ratingValue = Number(ratings);
  const tablePayload = buildConfirmationTablePayload(row, {
    comments: note,
    ratings: ratingValue,
  });
  return {
    [F.comments]: note,
    [F.ratings]: ratingValue,
    [F.confirmationTable]: tablePayload,
  };
}

export async function updateEmployeeFeedbackFields(kfInstance, row, {
  comments,
  ratings,
} = {}, preResolvedIds = null) {
  const note = norm(comments);
  const ratingValue = ratings;
  if (ratingValue == null || ratingValue === '' || Number(ratingValue) <= 0) {
    throw new Error('Please select a rating');
  }

  const ids = preResolvedIds || await resolveEmployeeFeedbackTaskIdsAsync(kfInstance, row);
  await assertEmployeeFeedbackStep(ids, row);

  await saveEmployeeFeedbackFields(
    kfInstance,
    ids,
    buildFeedbackUpdatePayload(row, { comments: note, ratings: Number(ratingValue) }),
  );

  return { success: 'Feedback saved successfully' };
}

async function sendBackEmployeeFeedbackTask(kfInstance, ids, row, comment) {
  const instanceId = norm(ids.instanceId);
  const activityInstanceId = norm(ids.activityInstanceId);
  if (!instanceId || !activityInstanceId) {
    throw new Error('Missing task identifiers for employee feedback reopen');
  }
  if (instanceId.startsWith('Activity_')) {
    throw new Error('Invalid ticket instance id for reopen');
  }
  if (activityInstanceId.startsWith('Activity_')) {
    throw new Error('Invalid activity instance id for reopen');
  }

  const sendbackTargetId = pickItTechSupportSendbackTargetId(row);
  if (!sendbackTargetId) {
    throw new Error('Could not resolve IT Tech Support activity for reopen.');
  }
  if (sendbackTargetId.startsWith('Activity_')) {
    throw new Error('Invalid IT Tech Support activity id for reopen');
  }

  const note = norm(comment) || 'Reopen ticket';
  const body = {
    Note: note,
    _id: sendbackTargetId,
  };
  const paths = buildProcessPaths(kfInstance);
  const resp = await kfMutateJson(
    kfInstance,
    paths.instanceSendbackPath(instanceId, activityInstanceId),
    { method: 'POST', body },
  );
  return parseMutationResponse(resp, 'Sent back successfully');
}

/** Submit Feedback — update API only (no submit). */
export async function submitEmployeeFeedbackWorkflow(kfInstance, row, { comments, ratings } = {}) {
  const ids = await resolveEmployeeFeedbackTaskIdsAsync(kfInstance, row);
  const result = await updateEmployeeFeedbackFields(
    kfInstance,
    row,
    { comments, ratings },
    ids,
  );
  await refreshEmployeeFeedbackProgress(kfInstance, row);
  return result;
}

/** Reopen — send back only (no update API). */
export async function sendBackEmployeeFeedback(kfInstance, row, { comments } = {}) {
  const note = norm(comments);
  if (!note) throw new Error('Reopen reason is required');

  const ids = await resolveEmployeeFeedbackTaskIdsAsync(kfInstance, row);
  await assertEmployeeFeedbackStep(ids, row);

  const result = await sendBackEmployeeFeedbackTask(kfInstance, ids, row, note);
  await refreshEmployeeFeedbackProgress(kfInstance, row);
  return result;
}

export async function submitEmployeeFeedbackAutoClose(kfInstance, row, payload = {}) {
  return submitEmployeeFeedbackWorkflow(kfInstance, row, payload);
}
