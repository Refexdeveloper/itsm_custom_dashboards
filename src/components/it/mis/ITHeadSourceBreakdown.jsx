/**
 * IT Head Refex only — compact Source counts under the center KPI row.
 * Click a source to filter the MIS table (same idea as KPI cards).
 * Easy to remove: drop `showSourceBreakdown` from ITHeadRefexDashboardProject.
 */

function normalizeSourceLabel(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '—') return '';
  return text;
}

/** Count tickets by Source for the current KPI-tab scoped rows. */
export function buildSourceBreakdownCounts(rows = []) {
  const counts = new Map();
  (rows || []).forEach((row) => {
    const label = normalizeSourceLabel(row?.source);
    if (!label) return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export default function ITHeadSourceBreakdown({
  items = [],
  loading = false,
  activeSource = '',
  onSourceChange,
}) {
  if (loading) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Source</span>
          <span className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
          <span className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
          <span className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  const total = items.reduce((sum, item) => sum + (item.count || 0), 0);
  const active = normalizeSourceLabel(activeSource);

  return (
    <div
      className="mt-3 rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-3 py-2.5 shadow-sm sm:px-4"
      aria-label="Ticket source breakdown"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Source
        </span>
        <span className="text-[11px] font-medium text-slate-400">
          {total} total
        </span>
        <span className="hidden h-3 w-px bg-slate-200 sm:block" aria-hidden />
        {items.map((item) => {
          const isActive = active.toLowerCase() === item.label.toLowerCase();
          return (
            <button
              key={item.label}
              type="button"
              aria-pressed={isActive}
              title={isActive ? `Clear ${item.label} filter` : `Show ${item.label} tickets`}
              onClick={() => onSourceChange?.(isActive ? '' : item.label)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                isActive
                  ? 'border-2 border-[var(--it-brand)] bg-[var(--it-brand-soft)] text-[var(--it-brand-dark)] shadow-sm ring-2 ring-[var(--it-brand)]/25 ring-offset-1'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-[var(--it-brand)]/50 hover:bg-[var(--it-brand-soft)]/60'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  isActive ? 'bg-[var(--it-brand)] text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
