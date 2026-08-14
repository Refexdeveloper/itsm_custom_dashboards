/**
 * Service Request StepField metadata (Service_Items_Refex_A00 / All_tickets_A00 Extrovis).
 * Maps workflow step Name/Label → report column Id for activity resolution.
 *
 * Refex approval sequence (current):
 * L1 Approval → L2 Approval → IT Manager Approval → IT Head Approval
 * → IT Tech (round robin) → IT Tech Support → Goto(IT Tech Support)
 * → Dependency Assigne → IT Tech Support After Dependency
 * → IT Tech Reopen (48h) → Completed.
 */
import { REFEX_SERVICE_COL, EXTROVIS_SERVICE_COL } from '../../../lib/itDashboardProfiles.js';

export const REFEX_SERVICE_STEP_FIELD_META = [
  {
    activityId: 'Activity_Ot8GrzZvSl',
    name: 'IT Tech Reopen',
    label: 'IT Tech Reopen',
    columnId: REFEX_SERVICE_COL.itTechReopenActivity || REFEX_SERVICE_COL.employeeApprovalRefex,
  },
  {
    activityId: 'Activity_tPGd7-Oggb',
    name: 'IT Tech Support After Dependency',
    label: 'IT Tech Support After Dependency',
    columnId: REFEX_SERVICE_COL.techSupportAfterDependencyActivity,
  },
  {
    activityId: 'Activity_4ec092cgUY',
    name: 'Dependency Assigne',
    label: 'Dependency Assigne',
    columnId: REFEX_SERVICE_COL.dependencyAssigneeActivity,
  },
  {
    activityId: 'Activity_9h2Y_0Yvdw',
    name: 'IT Tech Support',
    label: 'IT Tech Support',
    columnId: REFEX_SERVICE_COL.itAgentRefexActivity,
  },
  {
    activityId: 'Activity_br-intVidq',
    name: 'IT Tech',
    label: 'IT Tech',
    columnId: REFEX_SERVICE_COL.itTechActivity || REFEX_SERVICE_COL.itAgentPickupActivity,
  },
  {
    activityId: 'Activity_ZPJhIX0l3A',
    name: 'IT Head Approval',
    label: 'IT Head Approval',
    columnId: REFEX_SERVICE_COL.itHeadApprovalActivity,
  },
  {
    activityId: 'Activity_-_FFwHdMSN',
    name: 'IT Manager Approval',
    label: 'IT Manager Approval',
    columnId: REFEX_SERVICE_COL.itManagerApprovalActivity,
  },
  {
    activityId: 'Activity_WRjo7uuuOz',
    name: 'L2 Approval',
    label: 'L2 Approval',
    columnId: REFEX_SERVICE_COL.l2ApprovalActivity,
  },
  {
    activityId: 'Activity_oghxnzOkyH',
    name: 'L1 Approval',
    label: 'L1 Approval',
    columnId: REFEX_SERVICE_COL.l1ApprovalActivity,
  },
  // Alias labels — former names still appear on older / in-flight tickets.
  {
    activityId: 'Activity_br-intVidq',
    name: 'IT Tech Pickup',
    label: 'IT Tech Pickup',
    columnId: REFEX_SERVICE_COL.itAgentPickupActivity,
  },
  {
    activityId: 'Activity_Ot8GrzZvSl',
    name: 'Employee Feedback',
    label: 'Employee Feedback',
    columnId: REFEX_SERVICE_COL.employeeApprovalRefex,
  },
  {
    activityId: 'Activity_WRjo7uuuOz',
    name: 'L2 Manager',
    label: 'L2 Manager',
    columnId: REFEX_SERVICE_COL.l2ApprovalActivity,
  },
  {
    activityId: 'Activity_oghxnzOkyH',
    name: 'L1 Manager',
    label: 'L1 Manager',
    columnId: REFEX_SERVICE_COL.l1ApprovalActivity,
  },
  // Legacy StepField / activity ids (pre-remap report schema).
  {
    activityId: 'Activity_Go7RgPmouH',
    name: 'IT Tech Support After Dependency',
    label: 'IT Tech Support After Dependency',
    columnId: REFEX_SERVICE_COL.techSupportAfterDependencyActivityLegacy,
  },
  {
    activityId: 'Activity_OCGdY6c0WJ',
    name: 'Employee Feedback',
    label: 'Employee Feedback',
    columnId: REFEX_SERVICE_COL.employeeApprovalRefexLegacy,
  },
  {
    activityId: 'Activity_m8ayEQchb6',
    name: 'Dependency Assigne',
    label: 'Dependency Assigne',
    columnId: REFEX_SERVICE_COL.dependencyAssigneeActivityLegacy,
  },
  {
    activityId: 'Activity_rGkeSduybS',
    name: 'IT Tech Support',
    label: 'IT Tech Support',
    columnId: REFEX_SERVICE_COL.itAgentRefexActivityLegacy,
  },
  {
    activityId: 'Activity_9SL6CMTGfI',
    name: 'IT Tech Pickup',
    label: 'IT Tech Pickup',
    columnId: REFEX_SERVICE_COL.itAgentPickupActivityLegacy,
  },
];

/** Extrovis workflow steps (All_tickets_A00 on Live_IT_Service_Request_Extrovis_A00). */
export const EXTROVIS_SERVICE_STEP_FIELD_META = [
  {
    activityId: 'Activity_XSuxhIx9TQ',
    name: 'IT Tech Support After Dependency',
    label: 'IT Tech Support After Dependency',
    columnId: EXTROVIS_SERVICE_COL.techSupportAfterDependencyActivity,
  },
  {
    activityId: 'Activity_7rCa3_zSic',
    name: 'ReOpen Window',
    label: 'ReOpen Window',
    columnId: EXTROVIS_SERVICE_COL.employeeApprovalRefex
      || EXTROVIS_SERVICE_COL.itTechReopenActivity,
  },
  {
    activityId: 'Activity_mtwvpxK-0q',
    name: 'Dependency Assigne',
    label: 'Dependency Assigne',
    columnId: EXTROVIS_SERVICE_COL.dependencyAssigneeActivity,
  },
  {
    activityId: 'Activity_XVeFnZdKon',
    name: 'IT Agent Solution',
    label: 'IT Agent Solution',
    columnId: EXTROVIS_SERVICE_COL.itAgentActivity,
  },
  {
    activityId: 'Activity_9gAyNCIowD',
    name: 'IT Agent PickUp',
    label: 'IT Agent PickUp',
    columnId: EXTROVIS_SERVICE_COL.itAgentPickupActivity,
  },
];

function metaForProfile(profileId = 'refex') {
  return profileId === 'extrovis'
    ? EXTROVIS_SERVICE_STEP_FIELD_META
    : REFEX_SERVICE_STEP_FIELD_META;
}

export function normalizeWorkflowStepName(step) {
  return String(step ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function resolveRefexStepFieldMetaForStep(stepName, profileId = 'refex') {
  const normalized = normalizeWorkflowStepName(stepName);
  if (!normalized) return null;
  const metaList = metaForProfile(profileId);

  const exact = metaList.find((meta) => {
    const name = normalizeWorkflowStepName(meta.name);
    const label = normalizeWorkflowStepName(meta.label);
    return normalized === name || normalized === label;
  });
  if (exact) return exact;

  // Longest matching step name wins — prevents "IT Tech Support" matching
  // "IT Tech Support After Dependency", and "IT Tech" matching "IT Tech Support".
  let best = null;
  let bestLen = -1;
  for (const meta of metaList) {
    for (const candidate of [meta.name, meta.label]) {
      const token = normalizeWorkflowStepName(candidate);
      if (!token) continue;
      const matches = normalized === token
        || normalized.includes(token)
        || token.includes(normalized);
      if (matches && token.length > bestLen) {
        best = meta;
        bestLen = token.length;
      }
    }
  }
  return best;
}

export function listRefexStepFieldColumnIds(profileId = 'refex') {
  return [...new Set(
    metaForProfile(profileId)
      .map((meta) => meta.columnId)
      .filter(Boolean),
  )];
}

export function resolveRefexStepFieldMetaForActivityId(activityId, profileId = 'refex') {
  const id = String(activityId || '').trim();
  if (!id) return null;
  return metaForProfile(profileId).find((m) => m.activityId === id) || null;
}
