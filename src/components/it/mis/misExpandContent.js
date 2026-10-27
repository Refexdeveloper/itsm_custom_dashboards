/** Tile builders for MIS expand Overview / Details tabs. */

import {
  getMisTicketTypeLabel,
  getMisCategoryLabel,
  getMisSubCategoryLabel,
  getMisCriticalityLabel,
} from '../../../itsm/refex/shared/misCompactDisplay.js';
import { getExtrovisSapModule, isExtrovisSapTicket } from '../../../lib/extrovisSapTicket.js';

function hasValue(value) {
  const text = String(value ?? '').trim();
  return !!text && text !== '—';
}

function isRejectedRow(row) {
  const candidates = [
    row?.systemStatus,
    row?.workflowStatus,
    row?.status,
    row?.statusLabel,
    row?.itemStatusRaw,
    row?.itemStatus,
  ];
  return candidates.some((value) => {
    const token = String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    return token === 'rejected' || token === 'reject' || token === 'declined';
  });
}

function formatRejectedByName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map(formatRejectedByName).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return String(value?.Name || value?.name || value?.Email || value?.email || '').trim();
  }
  return String(value).trim();
}

/** Prefer Kissflow progress `_note`; fall back to report comments. */
export function getRejectionReasonDisplay(row) {
  if (!row) return '';
  const candidates = [
    ...(Array.isArray(row.progressRejectionNotes)
      ? row.progressRejectionNotes.map((entry) => entry?.comment || entry?.note)
      : []),
    row.rejectionReason,
    row.rejectReason,
    row.managerComments,
    row.comments,
  ];
  for (const value of candidates) {
    if (hasValue(value)) return String(value).trim();
  }
  return '';
}

export function getRejectedByDisplay(row) {
  if (!row) return '';
  const fromNotes = Array.isArray(row.progressRejectionNotes)
    ? row.progressRejectionNotes.map((entry) => entry?.userName).find((name) => hasValue(name))
    : '';
  if (fromNotes) return String(fromNotes).trim();
  const candidates = [
    row.rejectedBy,
    row.modifiedBy,
    row?.raw?._modified_by,
    row.completedBy,
  ];
  for (const value of candidates) {
    const name = formatRejectedByName(value);
    if (hasValue(name)) return name;
  }
  return '';
}

export function buildServiceSummaryTiles(row, { includeSummary = false } = {}) {
  const tiles = [];
  if (includeSummary && row?.summary && row.summary !== '—') tiles.push({ label: 'Summary', value: row.summary });
  if (row?.description && row.description !== '—') tiles.push({ label: 'Description', value: row.description, multiline: true });
  return tiles;
}

export function buildServiceStatusTiles(row, { includeSolution = true } = {}) {
  const tiles = [];
  if (isRejectedRow(row)) {
    const rejectedBy = getRejectedByDisplay(row);
    if (hasValue(rejectedBy)) {
      tiles.push({ label: 'Rejected By', value: rejectedBy });
    }
    const reason = getRejectionReasonDisplay(row);
    tiles.push({
      label: 'Rejection Notes',
      value: reason || 'No rejection notes were captured on this ticket.',
      multiline: true,
      highlight: 'reject',
    });
  }
  if (hasValue(row?.pendingReason)) {
    tiles.push({ label: 'Reason for Pending', value: row.pendingReason, multiline: true });
  }
  if (hasValue(row?.holdReason)) {
    tiles.push({ label: 'Reason for Hold', value: row.holdReason, multiline: true });
  }
  if (hasValue(row?.cancellationReason)) {
    tiles.push({ label: 'Cancellation Reason', value: row.cancellationReason, multiline: true });
  }
  if (includeSolution && hasValue(row?.solution)) {
    tiles.push({ label: 'Solution', value: row.solution, multiline: true });
  }
  return tiles;
}

export function buildServiceContextTiles(row, { showEntity = true, showDeptLocation = true, showRequester = false } = {}) {
  const tiles = [];
  const entityText = String(row?.entity || row?.entityKey || '').trim();
  const isRefexRow = /refex/i.test(entityText) || !entityText;
  const sapTicket = isExtrovisSapTicket(row);
  if (showEntity) tiles.push({ label: 'Entity', value: row?.entity });
  if (sapTicket) {
    tiles.push({ label: 'SAP', value: 'Yes' });
    tiles.push({ label: 'SAP Module', value: getExtrovisSapModule(row) });
  } else {
    tiles.push({ label: 'Ticket Type', value: getMisTicketTypeLabel(row) });
    if (isRefexRow) tiles.push({ label: 'Source', value: row?.source });
    tiles.push({ label: 'Category', value: getMisCategoryLabel(row) });
    tiles.push({ label: 'Sub-Category', value: getMisSubCategoryLabel(row) });
  }
  if (showDeptLocation) {
    tiles.push({ label: 'Department', value: row?.department });
    tiles.push({ label: 'Location', value: row?.location });
  }
  if (!sapTicket) {
    tiles.push({ label: 'Criticality', value: getMisCriticalityLabel(row) });
  }
  tiles.push(
    { label: 'Status', value: row?.itemStatus },
    { label: 'Assigned To', value: row?.assignedTo },
  );
  if (isRefexRow) {
    tiles.push({ label: 'Created By', value: row?.createdBy || row?.requesterName });
  }
  tiles.push({ label: 'Requested', value: row?.requestedDate });
  if (showRequester) {
    tiles.push({ label: 'Requester', value: row?.requesterName || row?.createdBy });
    tiles.push({ label: 'Requester Email', value: row?.requesterEmail });
  }
  return tiles;
}

export function buildServiceOverviewTiles(row, options = {}) {
  const { includeSolution = true, extraTiles = [] } = options;
  return [
    ...buildServiceSummaryTiles(row),
    ...buildServiceStatusTiles(row, { includeSolution }),
    ...extraTiles,
  ];
}

export function buildServiceDetailTiles(row, options = {}) {
  return buildServiceContextTiles(row, options);
}

export function buildCrSummaryTiles(row) {
  const tiles = [];
  if (row?.summary && row.summary !== '—') tiles.push({ label: 'Summary', value: row.summary });
  if (row?.description && row.description !== '—') tiles.push({ label: 'Description', value: row.description, multiline: true });
  return tiles;
}

export function buildCrPlanTiles(row) {
  return [
    { label: 'Implementation Plan', value: row?.implementationPlan, multiline: true },
    { label: 'Backout Plan', value: row?.backoutPlan, multiline: true },
    { label: 'Test Plan', value: row?.testPlan, multiline: true },
  ];
}

export function buildCrDetailTiles(row) {
  return [
    { label: 'Change Type', value: row?.changeType || row?.category },
    { label: 'Criticality', value: row?.criticality },
    { label: 'Raised By', value: row?.createdBy || row?.requesterName },
    { label: 'On Behalf Of', value: row?.onBehalfOf },
    { label: 'Change Reason', value: row?.changeReason, multiline: true },
    { label: 'Impact', value: row?.impact, multiline: true },
    { label: 'Urgency', value: row?.urgency },
    { label: 'Planned Start', value: row?.plannedStart },
    { label: 'Planned End', value: row?.plannedEnd },
    { label: 'Current Step', value: row?.currentStep },
    { label: 'Status', value: row?.itemStatus || row?.finalStatus },
  ];
}

export function buildCrOverviewTiles(row, { extraTiles = [] } = {}) {
  const tiles = [
    ...buildCrSummaryTiles(row),
    ...buildCrPlanTiles(row),
  ];
  if (hasValue(row?.solution)) tiles.push({ label: 'IT Manager Solution', value: row.solution, multiline: true });
  if (hasValue(row?.finalComments)) tiles.push({ label: 'IT Head Comments', value: row.finalComments, multiline: true });
  if (hasValue(row?.comments)) tiles.push({ label: 'Implementation Comments', value: row.comments, multiline: true });
  return [...tiles, ...extraTiles];
}
