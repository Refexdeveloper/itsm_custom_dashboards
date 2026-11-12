/**
 * CEO Adoption report — same rules as Notification Engine `adoptionReport.ts`.
 * Status uses the IST calendar day, like the Signed in today card.
 */

function istYmd(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function adoptionStatus(user, now = new Date()) {
  const last = user?.last_sign_in;
  if (last && istYmd(last) && istYmd(last) === istYmd(now)) return 'today';
  if (last || user?.ever_logged_in === true) return 'earlier';
  return 'never';
}

export function adoptionMatchesFocus(status, focus) {
  if (focus === 'today') return status === 'today';
  if (focus === 'ever') return status !== 'never';
  if (focus === 'never') return status === 'never';
  return true;
}

export function adoptionCounts(users, now = new Date()) {
  const counts = { all: 0, today: 0, ever: 0, never: 0 };
  for (const u of users || []) {
    const status = adoptionStatus(u, now);
    counts.all += 1;
    if (status === 'today') counts.today += 1;
    if (status !== 'never') counts.ever += 1;
    if (status === 'never') counts.never += 1;
  }
  return counts;
}

export function adoptionRows(users, focus, now = new Date()) {
  const rank = { today: 0, earlier: 1, never: 2 };
  return (users || [])
    .map((user) => ({ user, status: adoptionStatus(user, now) }))
    .filter((row) => adoptionMatchesFocus(row.status, focus))
    .sort((a, b) => {
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      const at = Date.parse(String(a.user.last_sign_in || '')) || 0;
      const bt = Date.parse(String(b.user.last_sign_in || '')) || 0;
      if (at !== bt) return bt - at;
      return String(a.user.user_name || '').localeCompare(String(b.user.user_name || ''));
    });
}

/** Card label → report focus (Users = all, Signed in / Adoption today = today, Adoption overall = ever). */
export const ADOPTION_CARD_FOCUS = {
  'Adoption · overall': 'ever',
  Users: 'all',
  'Signed in today': 'today',
  'Adoption today': 'today',
};

export function adoptionKpisFromUsers(users, now = new Date()) {
  const counts = adoptionCounts(users, now);
  const denom = counts.all || 0;
  const pct = (n) => (denom > 0 ? Math.round((n / denom) * 1000) / 10 : 0);
  return {
    usersCard: denom,
    signedInToday: counts.today,
    adoptionOverall: pct(counts.ever),
    adoptionToday: pct(counts.today),
    counts,
  };
}
