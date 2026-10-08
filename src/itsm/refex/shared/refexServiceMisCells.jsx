/**
 * Shared Refex Service Queue MIS table cell renderers.
 */
import { IT_TYPE } from '../../../components/it/itDesignTokens.js';
import {
  getRefexServiceSlaMisDisplay,
  getRefexServiceTatMisDisplay,
} from '../../../lib/kfITServiceDashboard.js';
import {
  formatMisTableDate,
  formatMisTableTime,
  getContextDateRaw,
} from '../employeedashboard/employeeDates.js';
import { formatReopenTimeLeft, isReopenTimeWarning } from '../employeedashboard/feedbackTime.js';

const MIS_CELL_SHORT = 'whitespace-nowrap';

export function RefexMisDateTimeCell({ row, statusTab, columnKey }) {
  // Reopened On uses getReopenedOnRaw — blank for normal Closed tickets (no send-back).
  const raw = getContextDateRaw(row, statusTab, columnKey);
  if (!raw) return <span className="text-slate-400">—</span>;
  const dateLine = formatMisTableDate(raw);
  const timeLine = formatMisTableTime(raw);
  if (!dateLine) return <span className="text-slate-400">—</span>;
  return (
    <div className="min-w-[4.5rem]">
      <p className={`${IT_TYPE.body} text-slate-700 ${MIS_CELL_SHORT}`}>{dateLine}</p>
      {timeLine ? (
        <p className={`mt-0.5 ${IT_TYPE.meta} text-slate-500 ${MIS_CELL_SHORT}`}>{timeLine}</p>
      ) : null}
    </div>
  );
}

export function RefexServiceTatCell({ row, isCompletedTab = false }) {
  const display = getRefexServiceTatMisDisplay(row, { isCompletedTab });
  if (display.primary === '—' && !display.sub) {
    return <span className="text-slate-400">—</span>;
  }

  const toneClass = display.state === 'breached'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : display.state === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : display.state === 'reopen' || display.primary === 'Reopen window'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : display.state === 'ok' || display.primary === 'On Time'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className="min-w-[5.5rem]">
      <span
        className={`inline-flex max-w-full whitespace-normal break-words rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-snug ${toneClass}`}
      >
        {display.primary}
      </span>
      {display.sub ? (
        <p className={`mt-1 ${IT_TYPE.meta} text-slate-500`}>{display.sub}</p>
      ) : null}
    </div>
  );
}

export function RefexServiceSlaCell({ row, isCompletedTab = false }) {
  const display = getRefexServiceSlaMisDisplay(row, { isCompletedTab });
  const primary = display.primary === '—' || !display.primary
    ? (isCompletedTab ? 'Not Breached' : 'On track')
    : display.primary;
  const state = display.primary === '—' || !display.primary
    ? 'ok'
    : display.state;

  const toneClass = state === 'breached'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : state === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : state === 'hold' || primary === 'Hold'
        ? 'border-slate-200 bg-slate-100 text-slate-600'
        : state === 'reopen' || primary === 'Reopen window'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : state === 'ok' || primary === 'On Time' || primary === 'On track' || primary === 'Not Breached'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className="min-w-[5.5rem]">
      <span
        className={`inline-flex max-w-full whitespace-normal break-words rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-snug ${toneClass}`}
      >
        {primary}
      </span>
      {display.sub ? (
        <p className={`mt-1 ${IT_TYPE.meta} text-slate-500`}>{display.sub}</p>
      ) : null}
    </div>
  );
}

export function ReopenTimeLeftCell({ row }) {
  const label = formatReopenTimeLeft(row);
  if (label === '—') return <span className="text-slate-400">—</span>;
  const expired = label === 'Expired';
  const warning = !expired && isReopenTimeWarning(row);
  const cls = expired
    ? 'text-red-600'
    : warning
      ? 'text-orange-600'
      : 'text-slate-700';
  return (
    <span className={`${IT_TYPE.body} font-medium ${MIS_CELL_SHORT} ${cls}`}>
      {label}
    </span>
  );
}
