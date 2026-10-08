/** Kissflow form Status field → Stage column. Keep this module free of dashboard imports. */

export const MIS_TICKET_STAGE_VALUES = [
  'Open',
  'InProgress',
  'OnHold',
  'Pending with Vendor',
  'Pending with Employee',
  'Closed',
];

export const MIS_STAGE_FILTER_OPTIONS = [...MIS_TICKET_STAGE_VALUES];

const STAGE_TOKEN_TO_LABEL = {
  open: 'Open',
  inprogress: 'InProgress',
  onhold: 'OnHold',
  hold: 'OnHold',
  pendingwithvendor: 'Pending with Vendor',
  pendingvendor: 'Pending with Vendor',
  pendingwithemployee: 'Pending with Employee',
  pendingemployee: 'Pending with Employee',
  closed: 'Closed',
  close: 'Closed',
  completed: 'Closed',
};

const STAGE_OVERLAY_KEY = 'it-ticket-stage-overlay';
const STAGE_OVERLAY_LIMIT = 50;

/**
 * Stage = form Status select (FieldId Statu_1).
 * Extrovis report id: Column_ps84EEKkEI. Refex report id: Column_WRiZDgVSqj.
 * Do not use workflow Statu / _status for Stage — those stay Ticket Status.
 */
const STATU_1_KEYS = [
  'Statu_1',
  'Column_ps84EEKkEI',
  'Column_WRiZDgVSqj',
];

/** Older Status report columns — only if Statu_1 is empty. */
const FORM_STATUS_KEYS = [
  'Status',
  'Column_0GDnNoEuA7',
  'Column_69zTtmtO92',
  'Column_3NHiBhs65I',
  'Column_dsGDH6n39-',
];

/** Process Stages select — last resort only. */
const STAGE_FALLBACK_KEYS = [
  'Column_GooYV3HuY1',
  'Column_JUGHj6d2Xj',
  'Stages',
];

/** Map Kissflow Status to the Stage list (Open / InProgress / OnHold / …). */
export function canonicalizeTicketStage(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const token = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (STAGE_TOKEN_TO_LABEL[token]) return STAGE_TOKEN_TO_LABEL[token];
  const exact = MIS_TICKET_STAGE_VALUES.find(
    (label) => label.toLowerCase().replace(/[\s_-]+/g, '') === token,
  );
  return exact || raw;
}

function readStageCandidate(value) {
  if (value == null || value === '') return '';
  const raw = typeof value === 'object'
    ? (value.Name || value.name || value.v || value.value || '')
    : value;
  const label = canonicalizeTicketStage(raw);
  if (!label || /^(yes|no)$/i.test(label)) return '';
  return label;
}

function pickFirstPresent(candidates) {
  for (const value of candidates) {
    const label = readStageCandidate(value);
    if (label) return label;
  }
  return '';
}

function readOverlayMap() {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STAGE_OVERLAY_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function rememberTicketStageOverlay(id, stage) {
  const key = String(id || '').trim();
  const label = canonicalizeTicketStage(stage);
  if (!key || !label) return;
  const next = readOverlayMap();
  next[key] = label;
  const ids = Object.keys(next);
  if (ids.length > STAGE_OVERLAY_LIMIT) {
    ids.slice(0, ids.length - STAGE_OVERLAY_LIMIT).forEach((oldId) => {
      delete next[oldId];
    });
  }
  try {
    sessionStorage.setItem(STAGE_OVERLAY_KEY, JSON.stringify(next));
  } catch {
    /* sessionStorage unavailable */
  }
}

export function peekTicketStageOverlay(id) {
  const key = String(id || '').trim();
  if (!key) return '';
  return canonicalizeTicketStage(readOverlayMap()[key] || '');
}

function pickFirstNonOpen(candidates) {
  let fallback = '';
  for (const value of candidates) {
    const label = readStageCandidate(value);
    if (!label) continue;
    if (label !== 'Open') return label;
    fallback = fallback || label;
  }
  return fallback;
}

export function readTicketStatusField(row) {
  if (!row) return '';
  const raw = row.raw ?? row;
  const overlay = peekTicketStageOverlay(row.id || raw?._id || raw?.Id);
  if (overlay) return overlay;

  const fromStatu1 = pickFirstPresent(STATU_1_KEYS.map((key) => raw?.[key]));
  if (fromStatu1) return fromStatu1;

  const fromFormStatus = pickFirstNonOpen([
    ...FORM_STATUS_KEYS.map((key) => raw?.[key]),
    row.form_status,
    row.formStatus,
  ]);
  if (fromFormStatus) return fromFormStatus;

  return pickFirstNonOpen([
    ...STAGE_FALLBACK_KEYS.map((key) => raw?.[key]),
    row.stages,
    row.ticketStage,
    row.processStages,
  ]);
}

/** Process Stages select — SLA Hold / InProgress only. Never Statu_1. */
export function readProcessStagesField(row) {
  if (!row) return '';
  const raw = row.raw ?? row;
  return pickFirstPresent([
    ...STAGE_FALLBACK_KEYS.map((key) => raw?.[key]),
    row.processStages,
    row.stages,
  ]);
}

/**
 * Stage column — exact form Status field.
 * Ticket Status stays Open unless Closed; Closed shows Closed on both columns.
 */
export function getExtrovisMisStagesLabel(row, statusTab = '') {
  const overlay = peekTicketStageOverlay(row?.id);
  if (overlay) return overlay;
  const fromStatus = readTicketStatusField(row);
  const ticketClosed = statusTab === 'Closed'
    || statusTab === 'Resolved'
    || fromStatus === 'Closed'
    || /^(closed|completed|complete)$/i.test(String(row?.itemStatus || row?.ticketStatus || ''));
  if (ticketClosed) return 'Closed';
  return fromStatus || '';
}
