import { BellRing } from 'lucide-react';
import { IT_TYPE } from '../../../components/it/itDesignTokens.js';
import { resolveDisplayRequestId } from '../../../lib/kfITServiceDashboard.js';

function displayRequestId(row) {
  return resolveDisplayRequestId(row, row?.id) || '—';
}

/**
 * Compact Action Required ticker — scrolling alert for tickets needing user action.
 * @param {string} messagePrefix - Prefix before request id (default: employee feedback copy).
 */
export default function RefexActionRequiredTicker({ items = [], messagePrefix = 'Feedback required for' }) {
  const prefix = String(messagePrefix || 'Action required for').trim();
  const messages = (items || [])
    .map((row) => {
      const id = displayRequestId(row);
      if (!id || id === '—') return null;
      return `${prefix} ${id}`;
    })
    .filter(Boolean);

  if (!messages.length) return null;

  const tickerText = messages.join('   •   ');

  return (
    <div
      className="mb-4 overflow-hidden rounded-xl border border-sky-200/80 bg-sky-50/90 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-h-[2.25rem] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 sm:flex-nowrap sm:gap-2 sm:px-4">
        <BellRing className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
        <span className={`shrink-0 ${IT_TYPE.meta} font-semibold text-sky-900`}>Action Required</span>
        <span className="hidden shrink-0 text-sky-400 sm:inline" aria-hidden>•</span>
        <div className="relative min-w-0 w-full flex-1 overflow-hidden sm:w-auto">
          <div className="refex-action-ticker-track whitespace-nowrap">
            <span className={`${IT_TYPE.meta} text-sky-800`}>{tickerText}</span>
            <span className={`ml-8 ${IT_TYPE.meta} text-sky-800`} aria-hidden>{tickerText}</span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes refex-action-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .refex-action-ticker-track {
          display: inline-flex;
          animation: refex-action-ticker 28s linear infinite;
        }
        .refex-action-ticker-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .refex-action-ticker-track {
            animation: none;
            white-space: normal;
          }
          .refex-action-ticker-track span:last-child {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
