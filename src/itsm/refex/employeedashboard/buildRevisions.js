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
    return norm(value?.Name || value?.name);
  }
  return norm(value);
}

function buildDedupeKey(entry) {
  const recordId = norm(entry.recordId);
  if (recordId) return `id:${recordId}`;
  return [
    entry.role,
    entry.userName,
    norm(entry.comment),
    entry.timestamp,
    entry.rating ?? '',
  ].join('|');
}

function pushUnique(entries, seen, entry) {
  if (!norm(entry.comment)) return;
  const key = buildDedupeKey(entry);
  if (seen.has(key)) return;
  seen.add(key);
  entries.push(entry);
}

function isDuplicateAgentComment(entries, { comment, timestamp, recordId }) {
  const trimmed = norm(comment);
  if (!trimmed) return true;

  if (recordId) {
    return entries.some((entry) => entry.role === 'itAgent' && entry.recordId === recordId);
  }

  return entries.some((entry) => (
    entry.role === 'itAgent'
    && norm(entry.comment) === trimmed
    && entry.timestamp === timestamp
  ));
}

export function collectConversationEntries(row) {
  const entries = [];
  const seen = new Set();
  let order = 0;

  const agentActivities = row?.itAgentActivities || [];

  (row?.agentSolutions || []).forEach((entry, index) => {
    const comment = norm(entry?.resolution || entry?.comment);
    if (!comment) return;

    const dateTime = entry?.dateTime || null;
    const timestamp = toTimestamp(dateTime);
    const recordId = norm(entry?.recordId || entry?.id);
    const matched = agentActivities.find(
      (act) => recordId && norm(act.id) === recordId,
    ) || agentActivities.find(
      (act) => toTimestamp(act.actedAt) === timestamp,
    ) || agentActivities[index];

    const candidate = {
      role: 'itAgent',
      userName: formatPerson(entry?.agentName || matched?.actedBy) || 'Tech Support',
      comment,
      rating: null,
      dateTime: dateTime || matched?.actedAt || null,
      timestamp: timestamp || toTimestamp(matched?.actedAt),
      recordId: recordId || norm(matched?.id) || `agent-solution-${index}`,
      sourceOrder: order++,
    };

    if (isDuplicateAgentComment(entries, candidate)) return;
    pushUnique(entries, seen, candidate);
  });

  // Fallbacks — report text field, mapped solution, or It_Agent_Solution native field.
  const textCandidates = [
    row?.latestAgentSolution,
    row?.solution,
    row?.itAgentSolution,
  ];
  textCandidates.forEach((rawText, textIndex) => {
    const text = norm(rawText);
    if (!text || text === '—') return;

    const latest = agentActivities[agentActivities.length - 1];
    const dateTime = latest?.actedAt || row?.modifiedAtRaw || null;
    const timestamp = toTimestamp(dateTime);
    const candidate = {
      role: 'itAgent',
      userName: formatPerson(latest?.actedBy) || 'Tech Support',
      comment: text,
      rating: null,
      dateTime,
      timestamp,
      recordId: norm(latest?.id) || `agent-solution-text-${textIndex}`,
      sourceOrder: order++,
    };

    const duplicatesTableRow = (row?.agentSolutions || []).some(
      (entry) => norm(entry?.resolution || entry?.comment) === text,
    );
    const duplicatesExisting = entries.some(
      (entry) => entry.role === 'itAgent' && norm(entry.comment) === text,
    );
    if (!duplicatesTableRow && !duplicatesExisting && !isDuplicateAgentComment(entries, candidate)) {
      pushUnique(entries, seen, candidate);
    }
  });

  // Reopen comments (sendback Note) from progress API and/or hydrated row field.
  const reopenNotes = [
    ...(Array.isArray(row?.reopenComments) ? row.reopenComments : []),
    ...(Array.isArray(row?.progressReopenNotes) ? row.progressReopenNotes : []),
  ];
  reopenNotes.forEach((entry, index) => {
    const comment = norm(entry?.comment || entry?.note || entry?.comments);
    if (!comment) return;
    pushUnique(entries, seen, {
      role: 'reopen',
      userName: formatPerson(entry?.userName) || 'Reopen',
      comment,
      rating: null,
      dateTime: entry?.dateTime || null,
      timestamp: toTimestamp(entry?.dateTime) || Number(entry?.timestamp) || 0,
      recordId: norm(entry?.recordId || entry?.id) || `reopen-comment-${index}`,
      sourceOrder: order++,
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
