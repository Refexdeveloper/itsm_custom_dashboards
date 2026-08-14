/** Global MIS UI variant — set by ITDashboardProfileProvider on mount. */
let uiVariant = 'mis-modern';

export function setITDashboardUiVariant(variant = 'mis-modern') {
  uiVariant = variant || 'default';
}

export function getITDashboardUiVariant() {
  return uiVariant;
}

export function isMisModernUi() {
  return uiVariant === 'mis-modern' || uiVariant === 'mis';
}
