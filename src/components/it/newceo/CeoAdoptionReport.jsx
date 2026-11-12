import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { IT_SURFACE, IT_TYPE } from '../itDesignTokens.js';
import { adoptionCounts, adoptionRows } from '../../../lib/ceoAdoptionReport.js';

export const CEO_ADOPTION_REPORT_ID = 'ceo-adoption-report';

const FOCUS_TABS = [
  { id: 'all', label: 'All users' },
  { id: 'today', label: 'Signed in today' },
  { id: 'ever', label: 'Ever signed in' },
  { id: 'never', label: 'Never signed in' },
];

const STATUS_BADGE = {
  today: { label: 'Signed in today', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  earlier: { label: 'Signed in earlier', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  never: { label: 'Never signed in', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

function StatusBadge({ status }) {
  const badge = STATUS_BADGE[status] || STATUS_BADGE.never;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function formatSignIn(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** App roster sign-in report shown below the Users table. */
export default function CeoAdoptionReport({
  users,
  open,
  onToggle,
  focus,
  onFocusChange,
  desktopTableClass,
  mobileListClass,
}) {
  const counts = useMemo(() => adoptionCounts(users), [users]);
  const rows = useMemo(() => adoptionRows(users, focus), [focus, users]);

  return (
    <section
      id={CEO_ADOPTION_REPORT_ID}
      className={`mx-auto mt-5 max-w-[1400px] min-w-0 overflow-hidden ${IT_SURFACE.card} ${IT_SURFACE.border} ${IT_SURFACE.shadowTable}`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
      >
        <div className="min-w-0">
          <h2 className={IT_TYPE.sectionTitle}>Adoption report</h2>
          <p className={`${IT_TYPE.sectionSubtitle} truncate`}>Kissflow app roster sign-in</p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{counts.all}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open ? (
        <>
          <div className="flex flex-wrap gap-2 px-3 pb-2 sm:px-4" role="tablist" aria-label="Adoption filter">
            {FOCUS_TABS.map((tab) => {
              const active = focus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onFocusChange(tab.id)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition ${
                    active
                      ? 'border-[#2B5AED] bg-[#2B5AED] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                  <span className={`tabular-nums ${active ? 'text-white/90' : 'text-slate-400'}`}>{counts[tab.id]}</span>
                </button>
              );
            })}
          </div>
          <div className={desktopTableClass}>
            <table className="min-w-full text-sm">
              <thead className={IT_SURFACE.tableHead}>
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-right">Last sign-in</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ user, status }, index) => (
                  <tr key={`${user.user_id || user.email || user.user_name}-${index}`} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{user.user_name || '—'}</td>
                    <td className="px-4 py-2 text-slate-500">{user.email || '—'}</td>
                    <td className={`px-4 py-2 text-right ${status === 'today' ? 'font-semibold text-emerald-700' : 'text-slate-500'}`}>
                      {formatSignIn(user.last_sign_in)}
                    </td>
                    <td className="px-4 py-2 text-right"><StatusBadge status={status} /></td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No users for this filter</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className={mobileListClass}>
            {!rows.length ? (
              <p className="py-6 text-center text-sm text-slate-400">No users for this filter</p>
            ) : rows.map(({ user, status }, index) => (
              <div
                key={`${user.user_id || user.email || user.user_name}-${index}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.user_name || user.email || '—'}</p>
                    {user.email && user.email !== user.user_name ? (
                      <p className="truncate text-[10px] text-slate-500">{user.email}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={status} />
                </div>
                <p className="mt-2 flex justify-between gap-2 text-[11px]">
                  <span className="text-slate-500">Last sign-in</span>
                  <span className="font-semibold tabular-nums">{formatSignIn(user.last_sign_in)}</span>
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
