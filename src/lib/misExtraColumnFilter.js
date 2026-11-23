import { getExtrovisSapModule, isExtrovisSapTicket } from './extrovisSapTicket.js';

/** Columns that already have their own header filter. */
const DEDICATED_FILTER_KEYS = new Set([
  'expand',
  'actions',
  'viewDetails',
  'takeAction',
  'requestId',
  'createdAt',
  'createdOn',
  'requestedDate',
  'requestedDateTime',
  'date',
  'closedOn',
  'closedAt',
  'closedDate',
  'reopenedOn',
  'reopenedAt',
  'sla',
  'ticketStatus',
  'assignedTo',
  'requester',
  'criticality',
  'ticketType',
  'requestType',
  'category',
  'changeType',
  'subCategory',
  'source',
  'closedBy',
  'subject',
  'stages',
]);

export function columnNeedsExtraFilter(col) {
  const key = String(col?.key || col?.id || '');
  return Boolean(key) && !DEDICATED_FILTER_KEYS.has(key) && Boolean(String(col?.label || '').trim());
}

function plain(value) {
  if (value == null || typeof value === 'object') return '';
  const text = String(value).trim();
  return text === '—' || text === '-' ? '' : text;
}

/** Text shown in the column, used for both the filter list and the match. */
export function misExtraColumnFilterValue(key, row) {
  if (!row || !key) return '';
  switch (key) {
    case 'sap':
      return isExtrovisSapTicket(row) ? 'Yes' : 'No';
    case 'sapModule':
      return plain(getExtrovisSapModule(row));
    case 'requesterEmail':
      return plain(row.requesterEmail);
    case 'department':
      return plain(row.department);
    case 'location':
      return plain(row.location);
    case 'entity':
      return plain(row.entity || row.entityKey);
    case 'company':
      return plain(row.company);
    case 'itemStatus':
      return plain(row.itemStatus);
    case 'currentStep':
      return plain(row.currentStep || row.activeWorkflowStep);
    default:
      return plain(row[key]);
  }
}

export function collectMisExtraFilterOptions(rows, key) {
  const values = new Set();
  (rows || []).forEach((row) => {
    const text = misExtraColumnFilterValue(key, row);
    if (text) values.add(text);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export function rowMatchesExtraColumnFilters(row, extraFilters) {
  if (!extraFilters || typeof extraFilters !== 'object') return true;
  for (const [key, selected] of Object.entries(extraFilters)) {
    const wanted = plain(selected);
    if (!wanted) continue;
    if (misExtraColumnFilterValue(key, row) !== wanted) return false;
  }
  return true;
}
