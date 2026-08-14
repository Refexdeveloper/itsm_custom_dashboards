/** Shared MIS KPI grid — equal-width cards that fill available row space. */
export const MIS_KPI_GRID_CLASS = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] auto-rows-fr gap-2.5 sm:gap-3';

/** Maximum KPI cards shown in the insight strip. */
export const MIS_MAX_KPI_CARDS = 8;

/** Health monitor — full-width row, six balanced cards on large screens. */
export const MIS_HEALTH_MONITOR_GRID =
  'grid grid-cols-2 auto-rows-fr gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6';

/** Fixed minimum height for KPI cards; donut may grow when legend has many items. */
export const MIS_INSIGHT_CARD_HEIGHT = 'min-h-[112px]';

export const MIS_INSIGHT_CARD_HEIGHT_CLASS = `${MIS_INSIGHT_CARD_HEIGHT} h-auto max-h-none min-w-0`;
