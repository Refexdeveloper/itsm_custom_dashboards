import { useEffect, useRef, useState } from 'react';

/** Shared MIS KPI grid — 2-up until the strip itself is wide enough for 4.
 * Never use viewport sm/md/xl columns: Kissflow iframes are often phone-narrow
 * while the laptop window is xl, which hid the right-hand cards.
 */
export const MIS_KPI_GRID_CLASS = 'it-kpi-grid';

/** Six primary KPIs in one desktop row (Notification Engine ITSM); mobile stays 2-up. */
export const MIS_KPI_PRIMARY_ROW_CLASS = 'it-kpi-grid-6';
export const MIS_KPI_FIVE_ROW_CLASS = MIS_KPI_GRID_CLASS;

/** Two equal rows when there are 6+ cards (10→5+5, 8→4+4, 12→6+6, 6→3+3). */
export function misKpiGridForCount(count) {
  const n = Number(count) || 0;
  if (n <= 4) return MIS_KPI_GRID_CLASS;
  const cols = Math.min(6, Math.max(3, Math.ceil(n / 2)));
  if (cols === 4) return MIS_KPI_GRID_CLASS;
  return `it-kpi-grid-${cols}`;
}

/** Width of the component strip, not the laptop window. */
export const KPI_STRIP_WIDE_PX = 640;

export function useKpiStripWide(minPx = KPI_STRIP_WIDE_PX) {
  const ref = useRef(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const sync = () => {
      const width = el.getBoundingClientRect().width;
      setWide(width >= minPx);
    };
    sync();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', sync);
      return () => window.removeEventListener('resize', sync);
    }
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [minPx]);

  return [ref, wide];
}

export function kpiStripClass(wide, extra = '') {
  return ['it-kpi-strip', 'min-w-0', 'w-full', 'max-w-full', wide ? 'is-kpi-wide' : '', extra]
    .filter(Boolean)
    .join(' ');
}

/** Maximum KPI cards shown in the insight strip. */
export const MIS_MAX_KPI_CARDS = 12;

/** Health monitor — same 2/4 strip as Head; never 6-up from the laptop viewport. */
export const MIS_HEALTH_MONITOR_GRID = MIS_KPI_GRID_CLASS;

/** Equal-height KPI cards — Head compact floor (no empty padding inside the card). */
export const MIS_INSIGHT_CARD_HEIGHT = 'min-h-[96px] lg:min-h-[120px]';

/** Same as the live floor — kept so older compact props still resolve. */
export const MIS_INSIGHT_CARD_HEIGHT_COMPACT = MIS_INSIGHT_CARD_HEIGHT;

export const MIS_INSIGHT_CARD_HEIGHT_CLASS = `${MIS_INSIGHT_CARD_HEIGHT} h-full min-w-0`;
export const MIS_INSIGHT_CARD_HEIGHT_COMPACT_CLASS = `${MIS_INSIGHT_CARD_HEIGHT_COMPACT} h-full min-w-0`;
