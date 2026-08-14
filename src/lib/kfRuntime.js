const DEV_KISSFLOW_ORIGIN = 'https://development-refexgroup.kissflow.com';
const LIVE_KISSFLOW_ORIGIN = 'https://refexgroup.kissflow.com';

function readKissflowOriginCandidateUrls(kfInstance = null) {
  const candidates = [];
  const safePush = (value) => {
    if (value) candidates.push(String(value));
  };

  if (typeof window !== 'undefined') {
    safePush(window.location?.origin);
    safePush(window.location?.href);
    try {
      safePush(window.top?.location?.origin);
      safePush(window.top?.location?.href);
      safePush(window.parent?.location?.origin);
      safePush(window.parent?.location?.href);
    } catch {
      // Sandboxed / cross-origin parent frame.
    }
  }

  if (typeof document !== 'undefined') {
    safePush(document.referrer);
  }

  safePush(kfInstance?.account?.url);
  safePush(kfInstance?.account?.baseUrl);
  safePush(kfInstance?.account?.BaseUrl);

  return candidates;
}

function extractKissflowOriginFromText(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';

  const match = text.match(/^(https?:\/\/(?:development-)?[^/]*kissflow\.com)/i);
  return match?.[1] || '';
}

/** Resolve dev vs live Kissflow host — parent frame wins when component runs in an iframe. */
export function resolveKissflowOrigin(kfInstance = null) {
  for (const raw of readKissflowOriginCandidateUrls(kfInstance)) {
    const origin = extractKissflowOriginFromText(raw);
    if (origin) return origin;
  }

  const isDev =
    (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) ||
    (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development');

  return isDev ? DEV_KISSFLOW_ORIGIN : LIVE_KISSFLOW_ORIGIN;
}

export function resolveKissflowAccountId(kfInstance, fallbackAccountId = '') {
  const sdkAccountId = String(kfInstance?.account?._id || '').trim();
  if (sdkAccountId) return sdkAccountId;

  const candidates = [];
  const safePush = (v) => {
    if (v) candidates.push(String(v));
  };

  safePush(typeof window !== 'undefined' ? window?.location?.href : '');
  safePush(typeof window !== 'undefined' ? window?.location?.pathname : '');
  safePush(typeof document !== 'undefined' ? document?.referrer : '');

  try {
    safePush(typeof window !== 'undefined' ? window?.top?.location?.href : '');
    safePush(typeof window !== 'undefined' ? window?.top?.location?.pathname : '');
    safePush(typeof window !== 'undefined' ? window?.parent?.location?.href : '');
    safePush(typeof window !== 'undefined' ? window?.parent?.location?.pathname : '');
  } catch {
    // Cross-origin/sandboxed frames: ignore.
  }

  const re = /\/(?:flow|case|metadata)\/2\/([^/]+)/i;
  for (const raw of candidates) {
    const match = raw.match(re);
    if (match?.[1]) return match[1];
  }

  return fallbackAccountId;
}

function readKissflowCsrfToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)__CSRF=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function parseKfApiError(data, status) {
  if (data?.status === 'error' || data?.error_code) {
    return data.en_message || data.message || 'Kissflow request failed';
  }
  if (status && status >= 400) {
    return data?.en_message || data?.message || `HTTP ${status}`;
  }
  return '';
}

async function readJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/** Native Kissflow process POST — prefers SDK bridge when embedded (avoids cross-origin fetch failures). */
export async function kfPostProcessJson(kfInstance, path, body = null) {
  return kfMutateJson(kfInstance, path, { method: 'POST', body });
}

/**
 * Comment POST — Kissflow expects a JSON-serialized body (not a raw object through the SDK bridge).
 * Uses SDK when available; falls back to credentialed fetch.
 */
export async function kfPostCommentJson(kfInstance, path, bodyObject) {
  const serialized = JSON.stringify(bodyObject ?? {});
  const headers = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
  const csrf = readKissflowCsrfToken();
  if (csrf) headers['x-csrf-token'] = csrf;

  if (kfInstance?.api) {
    const resp = await kfInstance.api(path, {
      method: 'POST',
      headers,
      body: serialized,
    });
    const data = resp?.data ?? resp ?? null;
    const err = parseKfApiError(data);
    if (err) throw new Error(err);
    return data;
  }

  const origin = resolveKissflowOrigin(kfInstance);
  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: serialized,
  });
  const data = await readJsonResponse(res);
  if (!res.ok) {
    const err = parseKfApiError(data, res.status);
    throw new Error(err || `HTTP ${res.status}`);
  }
  const err = parseKfApiError(data, res.status);
  if (err) throw new Error(err);
  return Object.keys(data).length ? data : { success: true };
}

export async function kfGetJson(kfInstance, path, absoluteUrl) {
  if (kfInstance?.api) {
    const resp = await kfInstance.api(path, { method: 'GET', headers: { Accept: 'application/json' } });
    return resp?.data ?? resp ?? null;
  }

  const origin = resolveKissflowOrigin(kfInstance);
  const url = absoluteUrl || `${origin}${path}`;
  const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function kfMutateJson(kfInstance, path, { method = 'POST', body } = {}) {
  const headers = { Accept: 'application/json' };
  const hasBody = body !== undefined && body !== null;
  const serialized = hasBody ? JSON.stringify(body) : undefined;
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (kfInstance?.api) {
    const apiConfig = { method, headers };
    if (hasBody) {
      apiConfig.body = serialized;
    }
    const resp = await kfInstance.api(path, apiConfig);
    const data = resp?.data ?? resp ?? null;
    const err = parseKfApiError(data);
    if (err) throw new Error(err);
    return data;
  }

  const origin = resolveKissflowOrigin(kfInstance);
  const res = await fetch(`${origin}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: hasBody ? serialized : undefined,
  });
  const data = await readJsonResponse(res);
  if (!res.ok) {
    const err = parseKfApiError(data, res.status);
    throw new Error(err || `HTTP ${res.status}`);
  }
  const err = parseKfApiError(data, res.status);
  if (err) throw new Error(err);
  return Object.keys(data).length ? data : { success: true };
}
