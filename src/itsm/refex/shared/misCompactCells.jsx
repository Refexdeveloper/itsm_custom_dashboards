import {
  getPersonInitials,
  getPersonAvatarTone,
  getRequestTypeShort,
  hasMisDisplayValue,
  splitPersonNames,
} from './misCompactDisplay.js';

export { getPersonInitials, getRequestTypeShort };

function norm(value) {
  return String(value ?? '').trim();
}

const MIS_HOVER_NAME_TOOLTIP_CLASS = 'pointer-events-none absolute left-1/2 top-full z-40 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-black shadow-lg group-hover/misrel:block';

export function MisHoverCompact({ shortLabel, fullLabel, badgeClass = '' }) {
  if (!fullLabel || fullLabel === '—' || !shortLabel) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <span className="group/misrel relative inline-flex max-w-full leading-none">
      <span
        className={`inline-flex cursor-default items-center rounded-full px-2 py-0.5 text-xs font-semibold leading-none tracking-wide ${badgeClass}`}
      >
        {shortLabel}
      </span>
      <span role="tooltip" className={MIS_HOVER_NAME_TOOLTIP_CLASS}>
        {fullLabel}
      </span>
    </span>
  );
}

function MisPersonAvatar({ name }) {
  const full = norm(name);
  const initials = getPersonInitials(full) || full.slice(0, 2).toUpperCase();
  const tone = getPersonAvatarTone(full);
  return (
    <span className="group/misrel relative inline-flex leading-none">
      <span
        className={`inline-flex h-6 w-6 shrink-0 cursor-default items-center justify-center rounded-full text-[10px] font-bold leading-none ${tone.bg} ${tone.text}`}
      >
        {initials}
      </span>
      <span role="tooltip" className={MIS_HOVER_NAME_TOOLTIP_CLASS}>
        {full}
      </span>
    </span>
  );
}

export function MisPersonInitialsCell({ name }) {
  const names = splitPersonNames(name);
  if (!names.length) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1 leading-none">
      {names.map((person) => (
        <MisPersonAvatar key={person} name={person} />
      ))}
    </span>
  );
}

export function MisRequestTypeCell({ value }) {
  const full = hasMisDisplayValue(value) ? norm(value) : 'Others';
  const isFallback = full === 'Others';
  const short = isFallback ? 'Others' : (getRequestTypeShort(full) || full);
  const isIncident = short === 'IC';
  return (
    <MisHoverCompact
      shortLabel={short}
      fullLabel={full}
      badgeClass={
        isFallback
          ? 'bg-slate-100 text-slate-600'
          : isIncident
            ? 'bg-orange-50 text-orange-700'
            : 'bg-sky-50 text-sky-700'
      }
    />
  );
}
