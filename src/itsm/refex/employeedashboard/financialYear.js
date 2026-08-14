/** Indian financial year — April 1 through March 31. */

export function getFinancialYearBounds(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const start = new Date(startYear, 3, 1, 0, 0, 0, 0);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
}

export function isInCurrentFinancialYear(rawDate, referenceDate = new Date()) {
  if (!rawDate) return false;
  const t = new Date(rawDate).getTime();
  if (!t || Number.isNaN(t)) return false;
  const { start, end } = getFinancialYearBounds(referenceDate);
  return t >= start.getTime() && t <= end.getTime();
}
