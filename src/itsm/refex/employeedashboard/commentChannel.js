/** Non-Refex IT__Agent_Solution.Comments_2 — Internal vs User. Refex has no Comments_2. */

export {
  canonicalizeTicketStage,
  getExtrovisMisStagesLabel,
  readTicketStatusField,
} from './ticketStage.js';

export const COMMENT_CHANNEL_INTERNAL = 'Internal';
export const COMMENT_CHANNEL_USER = 'User';
/** @deprecated Kissflow value is Internal — kept so older rows still match. */
export const COMMENT_CHANNEL_EXTERNAL = COMMENT_CHANNEL_INTERNAL;

export function normalizeCommentChannel(value) {
  if (value && typeof value === 'object') {
    value = value.Name || value.name || value.label || value.value || value.Id || value.id || '';
  }
  const token = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!token) return '';
  if (token === 'user' || token === 'usercomments' || token === 'employee') {
    return COMMENT_CHANNEL_USER;
  }
  if (token === 'internal' || token === 'external') {
    return COMMENT_CHANNEL_INTERNAL;
  }
  return '';
}

function isReopenCommentEntry(entry) {
  const role = String(entry?.role || '').trim().toLowerCase();
  if (role === 'reopen') return true;
  const id = String(entry?.recordId || entry?.id || '').trim().toLowerCase();
  return id.startsWith('reopen-note-') || id.startsWith('reopen-comment-');
}

/** Legacy rows without Comments_2 stay on Internal only. Reopen notes belong on User. */
export function commentMatchesChannel(entry, channel) {
  const want = normalizeCommentChannel(channel);
  if (!want) return true;
  if (isReopenCommentEntry(entry)) return want === COMMENT_CHANNEL_USER;
  const got = normalizeCommentChannel(
    entry?.commentsType || entry?.Comments_2 || entry?.commentChannel || '',
  );
  if (!got) return want === COMMENT_CHANNEL_INTERNAL;
  return got === want;
}

/** Help Desk / Employee Extrovis — User comments only. Internal stays on agent MIS. */
export function isEmployeeVisibleComment(entry) {
  return commentMatchesChannel(entry, COMMENT_CHANNEL_USER);
}

/** Employee Extrovis can send comments only at IT Agent Solution — not PickUp. */
export function isExtrovisSolutionCommentStep(stepName) {
  const token = String(stepName || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!token) return false;
  if (token.includes('pickup') || token.includes('pick')) return false;
  if (token.includes('reopen')) return false;
  return token.includes('itagentsolution')
    || (token.includes('solution') && !token.includes('dependency'));
}

export function isExtrovisOpenTicketsTab(statusTab = '') {
  return statusTab === 'OpenTickets' || statusTab === 'Open';
}

export function getExtrovisMisSubjectLabel(row) {
  return String(row?.subject || '').trim() || '-';
}
