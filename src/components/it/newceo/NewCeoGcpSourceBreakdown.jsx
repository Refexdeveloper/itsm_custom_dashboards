/**
 * Ticket source panels — same layout as Notification Engine Tech Helpdesk.
 * Used by newceo and Head / Manager / Common Refex.
 */
import { IT_KPI_SIZE_PRIOR, IT_TYPE } from '../itDesignTokens.js';
import { kpiStripClass, useKpiStripWide } from '../mis/misKpiLayout.js';

const CHANNELS = [
  { id: 'Email', tone: '#3b82f6' },
  { id: 'WhatsApp', tone: '#22c55e' },
  { id: 'Mobile', tone: '#f59e0b' },
  { id: 'Web', tone: '#8b5cf6' },
];

function channelTotal(counts = {}) {
  return CHANNELS.reduce((sum, channel) => sum + Number(counts[channel.id] || 0), 0);
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function SourcePanel({ title, subtitle, accent, counts }) {
  const total = channelTotal(counts);
  const other = Number(counts?.Other || 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={IT_KPI_SIZE_PRIOR.kpiLabel}>
          {title}
          </p>
          <p className={`mt-0.5 ${IT_TYPE.meta}`}>{subtitle}</p>
        </div>
        <p className={IT_KPI_SIZE_PRIOR.kpiValue}>
          {formatCount(total)}
        </p>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
        {CHANNELS.map((channel) => {
          const n = Number(counts?.[channel.id] || 0);
          const width = total > 0 ? (n / total) * 100 : 0;
          if (width <= 0) return null;
          return (
            <span
              key={channel.id}
              className="h-full"
              style={{ width: `${width}%`, background: channel.tone }}
              title={`${channel.id} ${formatCount(n)}`}
            />
          );
        })}
        {total === 0 ? (
          <span className="h-full w-full" style={{ background: accent, opacity: 0.25 }} />
        ) : null}
      </div>
      <ul className="mt-3 space-y-2">
        {CHANNELS.map((channel) => {
          const n = Number(counts?.[channel.id] || 0);
          const pct = total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
          return (
            <li key={channel.id} className="flex items-center gap-2 text-sm">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: channel.tone }} />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-600">{channel.id}</span>
              <span className="tabular-nums font-semibold text-slate-800">{formatCount(n)}</span>
              <span className="w-12 text-right tabular-nums text-slate-400">
                {pct.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%
              </span>
            </li>
          );
        })}
      </ul>
      {other > 0 ? (
        <p className="mt-2 text-[11px] text-slate-400">
          Other / unmapped · <span className="font-semibold text-slate-600">{formatCount(other)}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function NewCeoGcpSourceBreakdown({
  all = {},
  today = {},
  loading = false,
}) {
  const [stripRef, stripWide] = useKpiStripWide();

  if (loading) {
    return (
      <div ref={stripRef} className={kpiStripClass(stripWide)}>
        <div className="grid grid-cols-1 items-stretch gap-2.5 sm:gap-4 md:grid-cols-2 md:gap-5">
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div ref={stripRef} className={kpiStripClass(stripWide, 'space-y-2')}>
      <div>
        <p className={IT_TYPE.sectionTitle}>Ticket source</p>
        <p className={`mt-0.5 ${IT_TYPE.meta}`}>
          How tickets arrived — All tickets vs Today open tickets
        </p>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-2.5 sm:gap-4 md:grid-cols-2 md:gap-5">
        <SourcePanel
          title="All tickets — by source"
          subtitle="All tickets"
          accent="#2B5AED"
          counts={all}
        />
        <SourcePanel
          title="Today open tickets — by source"
          subtitle="Opened today by source"
          accent="#F97316"
          counts={today}
        />
      </div>
    </div>
  );
}
