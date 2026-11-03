const TEAL = { soft: '#7ecfe4', deep: '#3eb4d0', ink: '#ffffff' };

function MiniPlane({ x, y, scale = 1.4, opacity = 0.55 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={TEAL.deep} opacity={opacity}>
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </g>
  );
}

function MiniAmount({ x, y, scale = 1, opacity = 0.7 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <circle cx="16" cy="16" r="16" fill={TEAL.ink} />
      <text x="16" y="21" textAnchor="middle" fontSize="16" fontWeight="700" fill={TEAL.deep}>₹</text>
      <rect x="40" y="4" width="28" height="36" rx="4" fill={TEAL.ink} />
      <rect x="46" y="12" width="16" height="3" rx="1.5" fill={TEAL.soft} />
      <rect x="46" y="19" width="12" height="3" rx="1.5" fill={TEAL.soft} />
      <rect x="46" y="26" width="14" height="3" rx="1.5" fill={TEAL.soft} />
    </g>
  );
}

/** Travel and expense art uses the Tech Helpdesk teal, with small related icons. */
export function AppSceneBackdrop({ scene = 'travel' }) {
  return (
    <div className="it-helpdesk-bg">
      <svg className="it-helpdesk-bg-art" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden>
        <circle cx="1180" cy="70" r="46" fill={TEAL.ink} opacity="0.75" />
        <circle cx="1320" cy="110" r="64" fill={TEAL.soft} opacity="0.45" />
        <path className="it-helpdesk-wave" d="M-40 168 C 180 70, 360 230, 620 130 S 980 40, 1180 120 S 1360 190, 1480 110 V 300 H -40 Z" fill={TEAL.soft} opacity="0.55" />
        <path className="it-helpdesk-wave it-helpdesk-wave-2" d="M-40 205 C 220 120, 420 250, 700 170 S 1040 90, 1260 160 S 1400 210, 1480 170 V 320 H -40 Z" fill={TEAL.deep} opacity="0.28" />
        {scene === 'solar' ? (
          <circle cx="1240" cy="78" r="36" fill="#f6c453" opacity="0.9" />
        ) : null}
      </svg>
      {scene === 'travel' ? (
        <svg viewBox="0 0 280 140" preserveAspectRatio="xMaxYMin meet" className="pointer-events-none absolute right-2 top-2 h-[140px] w-[min(280px,42vw)]" aria-hidden>
          <MiniPlane x="20" y="18" scale="2.2" opacity="0.75" />
          <MiniPlane x="120" y="62" scale="1.5" opacity="0.4" />
          <MiniPlane x="190" y="12" scale="1.7" opacity="0.5" />
        </svg>
      ) : null}
      {scene === 'expense' ? (
        <svg viewBox="0 0 280 140" preserveAspectRatio="xMaxYMin meet" className="pointer-events-none absolute right-2 top-2 h-[140px] w-[min(280px,42vw)]" aria-hidden>
          <MiniAmount x="24" y="16" scale="1.5" opacity="0.9" />
          <MiniAmount x="160" y="64" scale="0.85" opacity="0.5" />
        </svg>
      ) : null}
    </div>
  );
}

/** Decorative page art. No data, filters, or click handlers. */
export function HelpdeskP2pBackdrop() {
  const dots = [
    [78, 28], [92, 28], [106, 28], [120, 28],
    [78, 42], [92, 42], [106, 42], [120, 42],
    [1288, 24], [1302, 24], [1316, 24], [1330, 24],
    [1288, 38], [1302, 38], [1316, 38], [1330, 38],
  ];
  return (
    <div className="it-helpdesk-bg">
      <svg className="it-helpdesk-bg-art" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden>
        <circle cx="150" cy="64" r="46" fill="#ffffff" opacity="0.75" />
        <circle cx="1290" cy="78" r="70" fill="#b7e7f4" opacity="0.55" />
        <circle cx="1124" cy="36" r="14" fill="#ffffff" opacity="0.9" />
        <path className="it-helpdesk-wave" d="M-40 168 C 180 70, 360 230, 620 130 S 980 40, 1180 120 S 1360 190, 1480 110 V 300 H -40 Z" fill="#7ecfe4" opacity="0.72" />
        <path className="it-helpdesk-wave it-helpdesk-wave-2" d="M-40 205 C 220 120, 420 250, 700 170 S 1040 90, 1260 160 S 1400 210, 1480 170 V 320 H -40 Z" fill="#3eb4d0" opacity="0.4" />
        {dots.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill="#7ec4d8" />
        ))}
        <g className="it-helpdesk-badge">
          <rect x="1210" y="108" width="150" height="78" rx="16" fill="#ffffff" opacity="0.95" />
          <rect x="1228" y="126" width="62" height="8" rx="4" fill="#d7eef4" />
          <rect x="1228" y="144" width="96" height="6" rx="3" fill="#e7f1f4" />
          <rect x="1228" y="158" width="74" height="6" rx="3" fill="#e7f1f4" />
          <circle cx="1330" cy="156" r="14" fill="#14b87a" />
          <path d="M1323 156l4 4 8-9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
