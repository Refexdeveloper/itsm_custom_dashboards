/** Text match for the MIS search box. Does not change Me / tab filters. */

export function dashboardRowMatchesSearch(row, query, fields = []) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const values = [
    row?.subject,
    row?.summary,
    row?.name,
    row?.description,
    ...(Array.isArray(fields) ? fields : []),
  ];
  return values.some((value) => String(value ?? '').toLowerCase().includes(q));
}
