/**
 * Refex Tech Support Open/Close workflow — Statu_1 + It_Agent_Solution.
 */
import {
  getITProcess,
  resolveAgentSubmitIdsFromReport,
  getActiveDashboardProfile,
} from '../../../lib/kfITServiceDashboard.js';
import { kfMutateJson } from '../../../lib/kfRuntime.js';
import { APP_ID, getActiveServiceProcessId, resolveAccountId } from '../../../lib/kfITServiceDashboard.js';

const REFEX_TECH_SUPPORT_FIELDS = {
  status: 'Statu_1',
  comments: 'It_Agent_Solution',
};

/** Native fields for the agent Open/Close action — profile-aware (Refex `Statu_1`, Extrovis `Validation`). */
function getTechSupportFields() {
  const profile = getActiveDashboardProfile();
  return {
    status: profile?.techSupportStatusFieldId || REFEX_TECH_SUPPORT_FIELDS.status,
    comments: profile?.techSupportCommentsFieldId || REFEX_TECH_SUPPORT_FIELDS.comments,
  };
}

function norm(value) {
  return String(value ?? '').trim();
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
    instanceSubmitPath(instanceId, activityInstanceId) {
      return `${base}/${encodeURIComponent(instanceId)}/${encodeURIComponent(activityInstanceId)}/submit?${appQuery}`;
    },
  };
}

function resolveTechSupportTaskIds(row) {
  const fromReport = resolveAgentSubmitIdsFromReport(row);
  if (fromReport.instanceId && fromReport.activityInstanceId) {
    return fromReport;
  }

  const task = row?.techSupportMyTaskItem;
  const fromTask = {
    instanceId: norm(task?._id || row?.id || fromReport.instanceId),
    activityInstanceId: norm(
      fromReport.activityInstanceId
      || task?._activity_instance_id
      || task?.activityInstanceId
      || task?.Activity_Instance_ID
      || row?.techSupportTaskActivityInstanceId
      || row?.activityInstanceId,
    ),
  };
  if (fromTask.instanceId && fromTask.activityInstanceId) return fromTask;
  return fromReport;
}

export function validateRefexTechSupportWorkForm(form) {
  const status = norm(form?.status).toLowerCase();
  if (status !== 'open' && status !== 'close') {
    return 'Please select Open or Close';
  }
  if (!norm(form?.comments)) {
    return 'Tech Support Comments are required';
  }
  return '';
}

export function emptyRefexTechSupportFormFromRow(row) {
  return {
    status: norm(row?.refexTechSupportStatus).toLowerCase() === 'close' ? 'Close' : 'Open',
    comments: row?.itAgentSolution || '',
  };
}

async function saveTechSupportFields(kfInstance, instanceId, activityInstanceId, payload) {
  const id = norm(instanceId);
  const actId = norm(activityInstanceId);
  if (!id) throw new Error('Missing instance id for Tech Support update');
  if (!actId) throw new Error('Missing activity instance id for Tech Support update');

  const body = { ...payload, _id: id };
  const process = getITProcess(kfInstance);
  if (process?.updateItem) {
    await process.updateItem({ instanceId: id, activityInstanceId: actId, data: body });
    return;
  }

  const paths = buildProcessPaths(kfInstance);
  await kfMutateJson(kfInstance, paths.instanceWithActivityPath(id, actId), {
    method: 'POST',
    body,
  });
}

async function submitTechSupportTask(kfInstance, instanceId, activityInstanceId) {
  const id = norm(instanceId);
  const actId = norm(activityInstanceId);
  const body = { _id: id };
  const process = getITProcess(kfInstance);
  if (process?.submitItem) {
    await process.submitItem({ instanceId: id, activityInstanceId: actId });
    return { success: 'Submitted successfully' };
  }

  const paths = buildProcessPaths(kfInstance);
  await kfMutateJson(kfInstance, paths.instanceSubmitPath(id, actId), {
    method: 'POST',
    body,
  });
  return { success: 'Submitted successfully' };
}

/** Update Statu_1 + It_Agent_Solution; submit workflow when Close is selected. */
export async function submitRefexTechSupportWork(kfInstance, row, formData) {
  const validation = validateRefexTechSupportWorkForm(formData);
  if (validation) throw new Error(validation);

  const statusToken = norm(formData.status).toLowerCase();
  const statusValue = statusToken === 'close' ? 'Close' : 'Open';
  const comments = norm(formData.comments);

  const { instanceId, activityInstanceId } = resolveTechSupportTaskIds(row);
  if (!instanceId || !activityInstanceId) {
    throw new Error('Could not resolve Tech Support task identifiers for this ticket');
  }

  const fields = getTechSupportFields();
  const payload = {
    [fields.status]: statusValue,
    [fields.comments]: comments,
  };

  await saveTechSupportFields(kfInstance, instanceId, activityInstanceId, payload);

  if (statusToken === 'close') {
    return submitTechSupportTask(kfInstance, instanceId, activityInstanceId);
  }

  return { success: 'Saved successfully' };
}
