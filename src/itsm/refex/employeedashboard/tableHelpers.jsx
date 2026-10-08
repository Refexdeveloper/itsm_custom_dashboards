import { ITSlaBadge, ITSimpleSlaResultBadge } from '../../../components/it/ITDashboardUI.jsx';
import { formatRequesterDisplay } from '../../../lib/kfITServiceDashboard.js';
import { getContextDateRaw, formatMisTableDate, getReopenedOnRaw, hasReopenedStamp } from './employeeDates.js';
import { getAssignedToDisplay, getClosedByDisplay } from './closedBy.js';
import { IT_TYPE, IT_TICKET_STATUS, itBadge, itBadgeDot } from '../../../components/it/itDesignTokens.js';
import { TICKET_STATUS } from './constants.js';
import { ReopenTimeLeftCell } from '../shared/refexServiceMisCells.jsx';
import { MisPersonInitialsCell, MisRequestTypeCell } from '../shared/misCompactCells.jsx';
import { getMisCategoryLabel, getMisSubCategoryLabel, getMisCriticalityLabel } from '../shared/misCompactDisplay.js';

/** Short values — single line where natural. */
export const MIS_CELL_SHORT = 'whitespace-nowrap';

/** Long text columns — content-aware wrap. */
export const MIS_CELL_WRAP = 'max-w-[6.5rem] whitespace-normal break-words sm:max-w-[7.5rem]';

export const MIS_CELL_WRAP_WIDE = 'max-w-[7.5rem] whitespace-normal break-words sm:max-w-[8.5rem]';

export function MisWrapText({ children, className = MIS_CELL_WRAP, title = '' }) {
  if (children == null || children === '' || children === '—') {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <span className={`block align-middle ${IT_TYPE.body} text-slate-700 ${className}`} title={title || undefined}>
      {children}
    </span>
  );
}

function norm(value) {
  return String(value ?? '').trim();
}

function formatPerson(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const parts = norm(value).split(',').map((part) => part.trim()).filter(Boolean);
    const seen = new Set();
    const unique = [];
    parts.forEach((part) => {
      const token = part.toLowerCase();
      if (seen.has(token)) return;
      seen.add(token);
      unique.push(part);
    });
    return unique.join(', ');
  }
  if (Array.isArray(value)) {
    const seen = new Set();
    const unique = [];
    value.forEach((entry) => {
      const label = formatPerson(entry);
      const token = label.toLowerCase();
      if (!label || seen.has(token)) return;
      seen.add(token);
      unique.push(label);
    });
    return unique.join(', ');
  }
  if (typeof value === 'object') {
    return norm(value?.Name || value?.name);
  }
  return norm(value);
}

export function formatEscalationValue(row) {
  const raw = row?.escalation;
  if (raw == null || raw === '') return '—';
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  const token = norm(raw);
  if (!token) return '—';
  const lower = token.toLowerCase();
  if (lower === 'true' || lower === 'yes') return 'Yes';
  if (lower === 'false' || lower === 'no') return 'No';
  return token;
}

export function EscalationBadge({ value }) {
  const label = formatEscalationValue({ escalation: value });
  if (label === '—') return <span className="text-slate-400">—</span>;
  const yes = label.toLowerCase() === 'yes';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${MIS_CELL_SHORT} ${
        yes
          ? 'bg-orange-50 text-orange-600'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {label}
    </span>
  );
}

/** Compact row tag when Reopened_Ticket is set (KPI merged into Open / My Tickets). */
export function ReopenedRowTag({ row }) {
  const flagged = row?.reopenedTicket === true
    || row?.reopenedTicket === 1
    || /^(yes|true|1)$/i.test(String(row?.reopenedTicket ?? '').trim());
  if (!flagged) return null;
  return (
    <span
      className={itBadge(`mt-0.5 max-w-[6.5rem] bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200`)}
      title="Reopened ticket"
    >
      <span className={itBadgeDot('bg-orange-500')} aria-hidden />
      Reopened
    </span>
  );
}

export function RequesterCell({ row }) {
  const label = formatRequesterDisplay(row);
  return <MisPersonInitialsCell name={label} />;
}

export function AssignedToCell({ row }) {
  const label = getAssignedToDisplay(row);
  return <MisPersonInitialsCell name={label} />;
}

export function SlaResultCell({ row, statusTab }) {
  if (statusTab === 'Closed') {
    return <ITSimpleSlaResultBadge row={row} />;
  }
  return <ITSlaBadge row={row} />;
}

export function formatContextDate(row, statusTab = 'All', columnKey = '') {
  const raw = getContextDateRaw(row, statusTab, columnKey);
  if (!raw) return '—';
  const formatted = formatMisTableDate(raw);
  return formatted || '—';
}

const TICKET_STATUS_STYLES = {
  [TICKET_STATUS.Open]: IT_TICKET_STATUS.open,
  [TICKET_STATUS.EmployeeFeedback]: IT_TICKET_STATUS.feedback,
  [TICKET_STATUS.Closed]: IT_TICKET_STATUS.closed,
  [TICKET_STATUS.Rejected]: IT_TICKET_STATUS.cancelled,
  [TICKET_STATUS.Reopened]: IT_TICKET_STATUS.reopened,
};

const TICKET_STATUS_FALLBACK = IT_TICKET_STATUS.open;

export function TicketStatusBadge({ status }) {
  const label = !status || status === '—' ? 'Open' : status;
  const entry = TICKET_STATUS_STYLES[label] || TICKET_STATUS_FALLBACK;
  return (
    <span
      className={itBadge(`max-w-[7.5rem] whitespace-normal break-words text-center leading-snug sm:max-w-[8rem] ${entry.badge}`)}
      title={label}
    >
      <span className={itBadgeDot(entry.dot)} aria-hidden />
      {label}
    </span>
  );
}

/** Ticket Status + Reopened line (no separate Reopened On column). */
export function TicketStatusMisCell({ row, status }) {
  const label = status && status !== '—' ? status : 'Open';
  const reopenedRaw = getReopenedOnRaw(row) || row?.reopenedOn || row?.reopened_at || '';
  const reopened = hasReopenedStamp(row) || Boolean(reopenedRaw);
  const reopenedDate = reopenedRaw ? formatMisTableDate(reopenedRaw) : '';
  return (
    <div className="flex min-w-0 flex-col items-start gap-0.5">
      <TicketStatusBadge status={label} />
      {reopened ? (
        <span className="mt-0.5 text-[10px] font-semibold leading-tight text-orange-700">
          Reopened
          {reopenedDate ? (
            <span className="block font-medium text-slate-500">{reopenedDate}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export { getMisCategoryLabel, getMisSubCategoryLabel, getMisCriticalityLabel };

export function ClosedByCell({ row }) {
  const label = getClosedByDisplay(row);
  return <MisPersonInitialsCell name={label} />;
}

export function FeedbackTimeLeftCell({ row }) {
  return <ReopenTimeLeftCell row={row} />;
}

export function StarRating({ value, compact = false }) {
  const numeric = Number.parseFloat(String(value ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const stars = Math.max(0, Math.min(5, Math.round(numeric)));
  return (
    <p
      className={`tracking-wide text-amber-500 ${compact ? 'mt-0.5 text-[11px] leading-none' : 'mt-1 text-sm'}`}
      aria-label={`${stars} out of 5 stars`}
    >
      {'★'.repeat(stars)}
      {'☆'.repeat(5 - stars)}
    </p>
  );
}
