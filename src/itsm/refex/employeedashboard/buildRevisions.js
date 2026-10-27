import { isExtrovisServiceDashboardContext } from '../../../lib/kfITServiceDashboard.js';

function norm(value) {
  return String(value ?? '').trim();
}

function toTimestamp(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatPerson(value) {
  if (!value) return '';
  if (typeof value === 'string') return norm(value);
  if (Array.isArray(value)) {
    return value.map(formatPerson).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    // Prefer human Name — never fall back to Email for revision author.
    return norm(value?.Name || value?.name || value?.FullName || value?.displayName);
  }
  return norm(value);
}

function isGenericPersonLabel(text) {
  const compact = norm(text).toLowerCase().replace(/[\s_-]+/g, '');
  return /^(employee|user|agent|tech\s*support|it\s*agent|system|bot)$/i.test(norm(text))
    || compact.includes('itsmbot')
    || compact === 'bot'
    || compact.endsWith('bot');
}

/**
 * Table Name exact when present; empty Name → entry/row last modified by only.
 * Do not invent progress ActedBy over a filled table Name.
 */
function resolveRevisionAgentName(entry, matched, row) {
  const tableName = norm(entry?.agentName);
  if (tableName) return tableName;

  const fallbacks = [
    entry?.modifiedBy,
    entry?._modified_by,
    matched?.actedBy,
    row?.modifiedBy,
    row?.raw?._modified_by,
  ];
  for (const value of fallbacks) {
    const label = formatPerson(value);
    if (label) return label;
  }
  return '';
}

function commentKey(role, comment) {
  return `${role}|${norm(comment).toLowerCase()}`;
}

function isSyntheticConversationId(id) {
  const token = norm(id);
  if (!token) return true;
  return token === 'it-agent-solution-text'
    || token.startsWith('agent-solution-text')
    || token.startsWith('progress-agent-note')
    || token.startsWith('agent-solution-')
    || token.startsWith('employee-comment-')
    || token.startsWith('reopen-comment-');
}

function pushUnique(entries, seen, entry) {
  const hasFiles = Array.isArray(entry?.attachments) && entry.attachments.length > 0;
  if (!norm(entry.comment) && !hasFiles) return;
  const id = norm(entry.recordId);
  const idKey = id ? `id:${id}` : '';
  const textKey = commentKey(entry.role, entry.comment || id);
  const minuteKey = norm(entry.comment)
    ? `min:${entry.role}|${norm(entry.comment).toLowerCase()}|${norm(entry.userName).toLowerCase()}|${Math.floor((Number(entry.timestamp) || 0) / 60000)}`
    : '';

  // Nested IT__Agent_Solution rows: keep every real _id unless the same
  // text + author landed twice in the same minute (Kissflow duplicate rows).
  if (id && !isSyntheticConversationId(id)) {
    if (seen.has(idKey)) {
      const idx = entries.findIndex((row) => norm(row.recordId) === id);
      if (idx >= 0 && hasFiles && !((entries[idx].attachments || []).length)) {
        entries[idx] = entry;
      }
      return;
    }
    if (minuteKey && seen.has(minuteKey)) {
      const idx = entries.findIndex((row) => {
        const rowMinute = norm(row.comment)
          ? `min:${row.role}|${norm(row.comment).toLowerCase()}|${norm(row.userName).toLowerCase()}|${Math.floor((Number(row.timestamp) || 0) / 60000)}`
          : '';
        return rowMinute === minuteKey;
      });
      if (idx >= 0 && hasFiles && !((entries[idx].attachments || []).length)) {
        entries[idx] = entry;
      }
      return;
    }
    seen.add(idKey);
    if (textKey) seen.add(textKey);
    if (minuteKey) seen.add(minuteKey);
    entries.push(entry);
    return;
  }

  if (minuteKey && seen.has(minuteKey) && !hasFiles) return;
  if (idKey && seen.has(idKey)) return;
  if (seen.has(textKey)) return;
  if (idKey) seen.add(idKey);
  seen.add(textKey);
  if (minuteKey) seen.add(minuteKey);
  entries.push(entry);
}

export function isAgentSolutionTextPlaceholder(entry) {
  const id = norm(entry?.recordId || entry?.id);
  return id === 'it-agent-solution-text'
    || id.startsWith('agent-solution-text');
}

/** Real IT__Agent_Solution table rows (excludes textarea / progress placeholders). */
export function getTableAgentSolutions(agentSolutions = []) {
  return (Array.isArray(agentSolutions) ? agentSolutions : []).filter((entry) => (
    !isAgentSolutionTextPlaceholder(entry)
    && (
      Boolean(norm(entry?.resolution || entry?.comment))
      || (Array.isArray(entry?.attachments) && entry.attachments.length > 0)
    )
  ));
}

function solutionRicher(a, b) {
  const score = (entry) => {
    const text = norm(entry?.resolution || entry?.comment);
    const files = Array.isArray(entry?.attachments) ? entry.attachments.length : 0;
    return (
      (files ? 50 + files : 0)
      + (norm(entry?.agentName) && !isGenericPersonLabel(entry.agentName) ? 2 : 0)
      + (entry?.dateTime ? 1 : 0)
      + (text.length > 0 ? 1 : 0)
      + Math.min(text.length, 4000)
    );
  };
  return score(b) > score(a) ? b : a;
}

/**
 * Union IT__Agent_Solution rows from seed/report + instance enrich.
 * Prefer richer row for the same recordId; drop text placeholders here.
 */
export function mergeAgentSolutionLists(...lists) {
  const byId = new Map();
  const withoutId = [];
  const seenText = new Set();

  lists.flat().forEach((entry) => {
    if (!entry || isAgentSolutionTextPlaceholder(entry)) return;
    const text = norm(entry?.resolution || entry?.comment);
    const hasFiles = Array.isArray(entry?.attachments) && entry.attachments.length > 0;
    if (!text && !hasFiles) return;
    const id = norm(entry?.recordId || entry?.id);
    if (id) {
      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, entry);
        return;
      }
      const next = solutionRicher(prev, entry);
      const prevFiles = Array.isArray(prev.attachments) ? prev.attachments : [];
      const entryFiles = Array.isArray(entry.attachments) ? entry.attachments : [];
      byId.set(id, {
        ...next,
        attachments: entryFiles.length > prevFiles.length ? entryFiles : prevFiles,
      });
      return;
    }
    const key = text.toLowerCase() || `files:${id}`;
    if (seenText.has(key)) return;
    // Also skip if same text already kept via recordId.
    const already = [...byId.values()].some(
      (row) => norm(row?.resolution || row?.comment).toLowerCase() === key,
    );
    if (already) return;
    seenText.add(key);
    withoutId.push(entry);
  });

  const fromIds = [...byId.values()];
  fromIds.forEach((row) => {
    seenText.add(norm(row?.resolution || row?.comment).toLowerCase());
  });
  return [...fromIds, ...withoutId.filter((row) => {
    const key = norm(row?.resolution || row?.comment).toLowerCase();
    if (!key) return false;
    // Report rows have no _id. Keep them only when the activity row is absent.
    return !seenText.has(key);
  })];
}

export function collectConversationEntries(row) {
  const entries = [];
  const seen = new Set();
  let order = 0;

  const agentActivities = row?.itAgentActivities || [];
  // Prefer full IT__Agent_Solution table rows (Name + Resolution + Date).
  const tableSolutions = getTableAgentSolutions(row?.agentSolutions);
  const textOnlySolutions = isExtrovisServiceDashboardContext()
    ? []
    : (row?.agentSolutions || []).filter(
      (entry) => norm(entry?.recordId || entry?.id) === 'it-agent-solution-text',
    );

  tableSolutions.forEach((entry, index) => {
    const comment = norm(entry?.resolution || entry?.comment);
    const attachments = Array.isArray(entry?.attachments) ? entry.attachments : [];
    if (!comment && !attachments.length) return;

    const dateTime = entry?.dateTime || null;
    const timestamp = toTimestamp(dateTime);
    const recordId = norm(entry?.recordId || entry?.id);
    const matched = agentActivities.find(
      (act) => recordId && norm(act.id) === recordId,
    ) || agentActivities.find(
      (act) => toTimestamp(act.actedAt) === timestamp,
    ) || agentActivities[index];

    pushUnique(entries, seen, {
      role: 'itAgent',
      userName: resolveRevisionAgentName(entry, matched, row),
      comment: comment || (attachments.length ? 'Attachment' : ''),
      rating: null,
      dateTime: dateTime || matched?.actedAt || null,
      timestamp: timestamp || toTimestamp(matched?.actedAt),
      recordId: recordId || norm(matched?.id) || `agent-solution-${index}`,
      sourceOrder: order++,
      commentsType: entry?.commentsType || '',
      attachments,
    });
  });

  // Textarea It_Agent_Solution — only when table did not already cover that comment.
  textOnlySolutions.forEach((entry, textIndex) => {
    const text = norm(entry?.resolution || entry?.comment);
    if (!text || text === '—') return;
    if (seen.has(commentKey('itAgent', text))) return;

    const latest = agentActivities[agentActivities.length - 1];
    const dateTime = entry?.dateTime || latest?.actedAt || row?.modifiedAtRaw || null;
    pushUnique(entries, seen, {
      role: 'itAgent',
      userName: resolveRevisionAgentName(entry, latest, row),
      comment: text,
      rating: null,
      dateTime,
      timestamp: toTimestamp(dateTime),
      recordId: norm(entry?.recordId) || `agent-solution-text-${textIndex}`,
      sourceOrder: order++,
    });
  });

  // Legacy fallbacks when agentSolutions was never mapped from the table.
  if (!tableSolutions.length && !isExtrovisServiceDashboardContext()) {
    const textCandidates = [
      row?.latestAgentSolution,
      row?.solution,
      row?.itAgentSolution,
    ];
    textCandidates.forEach((rawText, textIndex) => {
      const text = norm(rawText);
      if (!text || text === '—') return;
      if (seen.has(commentKey('itAgent', text))) return;

      const latest = agentActivities[agentActivities.length - 1];
      const dateTime = latest?.actedAt || row?.modifiedAtRaw || null;
      pushUnique(entries, seen, {
        role: 'itAgent',
        userName: resolveRevisionAgentName({}, latest, row),
        comment: text,
        rating: null,
        dateTime,
        timestamp: toTimestamp(dateTime),
        recordId: `agent-solution-text-legacy-${textIndex}`,
        sourceOrder: order++,
      });
    });
  }

  // Employee confirmation / feedback table (alongside agent solutions).
  const employeeNotes = [
    ...(Array.isArray(row?.employeeConfirmations) ? row.employeeConfirmations : []),
  ];
  employeeNotes.forEach((entry, index) => {
    const comment = norm(entry?.comments || entry?.comment || entry?.note);
    if (!comment) return;
    // Same text already posted as IT agent table note — keep agent, skip duplicate employee copy.
    if (seen.has(commentKey('itAgent', comment))) return;
    pushUnique(entries, seen, {
      role: 'employee',
      userName: formatPerson(entry?.userName)
        || formatPerson(row?.requesterName)
        || formatPerson(row?.requester)
        || 'Employee',
      comment,
      rating: entry?.ratings ?? entry?.rating ?? null,
      dateTime: entry?.dateTime || null,
      timestamp: toTimestamp(entry?.dateTime) || Number(entry?.timestamp) || 0,
      recordId: norm(entry?.recordId || entry?.id) || `employee-comment-${index}`,
      sourceOrder: order++,
    });
  });

  // Reopen comments (sendback Note) from progress API and/or hydrated row field.
  const reopenNotes = [
    ...(Array.isArray(row?.reopenComments) ? row.reopenComments : []),
    ...(Array.isArray(row?.progressReopenNotes) ? row.progressReopenNotes : []),
  ];
  reopenNotes.forEach((entry, index) => {
    const comment = norm(entry?.comment || entry?.note || entry?.comments);
    if (!comment) return;
    if (seen.has(commentKey('itAgent', comment))) return;
    if (seen.has(commentKey('employee', comment))) return;
    pushUnique(entries, seen, {
      role: 'reopen',
      userName: formatPerson(entry?.userName) || 'Reopen',
      comment,
      rating: null,
      dateTime: entry?.dateTime || null,
      timestamp: toTimestamp(entry?.dateTime) || Number(entry?.timestamp) || 0,
      recordId: norm(entry?.recordId || entry?.id) || `reopen-comment-${index}`,
      sourceOrder: order++,
      commentsType: entry?.commentsType || 'User',
    });
  });

  return entries.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.sourceOrder - b.sourceOrder;
  });
}

export function shouldShowRevisions(entries = []) {
  return entries.some((entry) => norm(entry.comment));
}
