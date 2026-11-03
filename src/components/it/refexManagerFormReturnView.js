/**
 * Remember Me / My Team when a ticket form opens, and restore it when
 * Kissflow Back remounts the dashboard. Each pack has its own key.
 * Employee, Admin, and Common packs do not use this. Me matchers are unchanged.
 */

export const REFEX_MANAGER_FORM_RETURN_VIEW_KEY = 'refex-it-manager-form-return-view';

const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const SERVICE_TAB_RE = /^[A-Za-z][A-Za-z0-9]{0,40}$/;

export function isRefexItManagerFormReturnDashboard({
  role = '',
  headerRoleLabel = '',
  defaultEntity = '',
} = {}) {
  return role === 'first'
    && String(headerRoleLabel || '').trim() === 'IT Manager'
    && String(defaultEntity || '').trim() === 'Refex';
}

/** Empty when this pack has no Me | My Team switch. */
export function resolveMeTeamFormReturnKey({
  role = '',
  headerRoleLabel = '',
  defaultEntity = '',
  poolLabel = '',
  hideScopeSwitch = false,
  personalOnly = false,
  hideMeTeam = false,
} = {}) {
  if (hideScopeSwitch || personalOnly || hideMeTeam) return '';
  if (isRefexItManagerFormReturnDashboard({ role, headerRoleLabel, defaultEntity })) {
    return REFEX_MANAGER_FORM_RETURN_VIEW_KEY;
  }
  const label = String(headerRoleLabel || '').trim();
  const entity = String(defaultEntity || poolLabel || '').trim();
  if (!label) return '';
  const id = `${label}|${role}|${entity}`.toLowerCase().replace(/[^a-z0-9|]+/g, '-');
  return `it-form-return-view:${id}`;
}

function readStore(storageKey) {
  if (!storageKey || typeof sessionStorage === 'undefined') return '';
  try {
    return sessionStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}

export function writeFormReturnView(storageKey, { scope = '', serviceTab = '' } = {}) {
  const nextScope = scope === 'team' ? 'team' : (scope === 'me' ? 'me' : '');
  const nextTab = SERVICE_TAB_RE.test(String(serviceTab || '')) ? String(serviceTab) : '';
  if (!storageKey || !nextScope || typeof sessionStorage === 'undefined') return false;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({
      scope: nextScope,
      serviceTab: nextTab,
      at: Date.now(),
    }));
    return true;
  } catch {
    return false;
  }
}

/** Saved view from the open form. Null on a normal landing. */
export function peekFormReturnView(storageKey) {
  let parsed = null;
  try {
    parsed = JSON.parse(readStore(storageKey) || 'null');
  } catch {
    return null;
  }
  const at = Number(parsed?.at);
  if (!Number.isFinite(at) || at <= 0) return null;
  if (Date.now() - at > MAX_AGE_MS) return null;
  const scope = parsed?.scope === 'team' ? 'team' : (parsed?.scope === 'me' ? 'me' : '');
  if (!scope) return null;
  const serviceTab = SERVICE_TAB_RE.test(String(parsed?.serviceTab || ''))
    ? String(parsed.serviceTab)
    : '';
  return { scope, serviceTab };
}

export function releaseFormReturnView(storageKey) {
  if (!storageKey || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function writeRefexManagerFormReturnView(view) {
  return writeFormReturnView(REFEX_MANAGER_FORM_RETURN_VIEW_KEY, view);
}

export function peekRefexManagerFormReturnView() {
  return peekFormReturnView(REFEX_MANAGER_FORM_RETURN_VIEW_KEY);
}

export function releaseRefexManagerFormReturnView() {
  releaseFormReturnView(REFEX_MANAGER_FORM_RETURN_VIEW_KEY);
}
