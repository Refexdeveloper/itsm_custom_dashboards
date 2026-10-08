/**
 * Ticket source panels — same layout as Notification Engine Tech Helpdesk.
 * Used by newceo and Head / Manager / Common Refex.
 */
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

function SourcePanel({ title, subtitle, headerBg, headerColor, counts }) {
  const total = channelTotal(counts);
  const other = Number(counts?.Other || 0);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_18px_rgba(112,144,176,0.12)]">
      <div className="px-3.5 py-3" style={{ background: headerBg }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.4px]" style={{ color: headerColor }}>
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {subtitle}
          {' · '}
          <span className="font-semibold text-slate-900">{total}</span>
        </p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {CHANNELS.map((channel, index) => (
            <tr key={channel.id} className={index % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
              <td className="px-3.5 py-2.5 text-[12px] text-slate-700">
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ background: channel.tone }}
                />
                {channel.id}
              </td>
              <td className="px-3.5 py-2.5 text-right text-[13px] font-bold tabular-nums text-slate-900">
                {Number(counts?.[channel.id] || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {other > 0 ? (
        <p className="border-t border-slate-100 px-3.5 py-2 text-[11px] text-slate-400">
          Other / unmapped · <span className="font-semibold text-slate-600">{other}</span>
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
        <div className="it-source-grid">
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div ref={stripRef} className={kpiStripClass(stripWide, 'space-y-2')}>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-[11px] sm:tracking-[0.14em]">
          Ticket source
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          How tickets arrived — All tickets vs Today open tickets
        </p>
      </div>
      <div className="it-source-grid">
        <SourcePanel
          title="All tickets"
          subtitle="By source"
          headerBg="#f1f5f9"
          headerColor="#475569"
          counts={all}
        />
        <SourcePanel
          title="Today open tickets"
          subtitle="Opened today by source"
          headerBg="#fff7ed"
          headerColor="#9a7a3a"
          counts={today}
        />
      </div>
    </div>
  );
}
