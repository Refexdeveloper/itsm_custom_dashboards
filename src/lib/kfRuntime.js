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

  const re = /\/(?:flow|case|metadata|process-report|process|view\/process)\/2\/([^/]+)/i;
  const storeRe = /kissflow\.store\/([^/]+)\//i;
  for (const raw of candidates) {
    const match = raw.match(re) || raw.match(storeRe);
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
  return trackKfWrite(() => kfPostCommentJsonUntracked(kfInstance, path, bodyObject));
}

async function kfPostCommentJsonUntracked(kfInstance, path, bodyObject) {
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

let kfReadTimeoutMs = 0;

/**
 * IT Head pack only: a Kissflow GET that never answers fails after `ms` instead of
 * hanging the dashboard. 0 (default) keeps the old wait-forever behaviour.
 * Writes (POST / PUT / submit) are never timed out, so a slow save cannot be sent twice.
 */
export function setKfReadTimeout(ms) {
  kfReadTimeoutMs = Math.max(0, Number(ms) || 0);
}

export function withKfReadTimeout(promise, path = '') {
  if (!kfReadTimeoutMs) return promise;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Kissflow request timed out after ${Math.round(kfReadTimeoutMs / 1000)}s: ${String(path).split('?')[0]}`));
    }, kfReadTimeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function kfGetJson(kfInstance, path, absoluteUrl) {
  if (kfInstance?.api) {
    const resp = await withKfReadTimeout(
      kfInstance.api(path, { method: 'GET', headers: { Accept: 'application/json' } }),
      path,
    );
    return resp?.data ?? resp ?? null;
  }

  const origin = resolveKissflowOrigin(kfInstance);
  const url = absoluteUrl || `${origin}${path}`;
  const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Bumped around every Kissflow write (POST / PUT / SDK submit / update). Read-side
 * request sharing and in-flight load joining must never hand out data that was
 * fetched before a write finished.
 */
let kfWriteEpoch = 0;
const kfWriteListeners = new Set();

export function getKfWriteEpoch() {
  return kfWriteEpoch;
}

export function onKfWrite(listener) {
  kfWriteListeners.add(listener);
  return () => kfWriteListeners.delete(listener);
}

export function noteKfWrite() {
  kfWriteEpoch += 1;
  kfWriteListeners.forEach((listener) => {
    try {
      listener(kfWriteEpoch);
    } catch {
      /* listener errors must not break a save */
    }
  });
}

export async function trackKfWrite(run) {
  noteKfWrite();
  try {
    return await run();
  } finally {
    noteKfWrite();
  }
}

const KF_PROCESS_WRITE_RE = /^(submit|update|create|reassign|reject|approve|delete|remove|sendBack|withdraw|save)/i;
const trackedProcesses = new WeakMap();

/** SDK process object whose write methods (submitItem, updateItem, …) bump the write epoch. */
export function trackKfProcessWrites(process) {
  if (!process || typeof process !== 'object' || typeof Proxy === 'undefined') return process;
  const hit = trackedProcesses.get(process);
  if (hit) return hit;
  const proxy = new Proxy(process, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== 'function') return value;
      if (typeof prop === 'string' && KF_PROCESS_WRITE_RE.test(prop)) {
        return (...args) => trackKfWrite(() => value.apply(target, args));
      }
      return value.bind(target);
    },
  });
  trackedProcesses.set(process, proxy);
  return proxy;
}

export async function kfMutateJson(kfInstance, path, options = {}) {
  return trackKfWrite(() => kfMutateJsonUntracked(kfInstance, path, options));
}

async function kfMutateJsonUntracked(kfInstance, path, { method = 'POST', body } = {}) {
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

/** PUT JSON (Kissflow thumbnail). */
export async function kfPutJson(kfInstance, path, body) {
  return kfMutateJson(kfInstance, path, { method: 'PUT', body });
}

/** PUT raw bytes to a signed upload URL (GCS). */
export async function kfPutBinary(url, blob, contentType = 'application/octet-stream') {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Upload failed (HTTP ${res.status})`);
  }
  return true;
}

function blobFromUnknown(data) {
  if (!data) return null;
  if (typeof Response !== 'undefined' && data instanceof Response) return null;
  if (data instanceof Blob) {
    if (data.size <= 0 || /json/i.test(data.type || '')) return null;
    return data;
  }
  if (data instanceof ArrayBuffer) return data.byteLength > 0 ? new Blob([data]) : null;
  if (ArrayBuffer.isView(data) && data.byteLength > 0) return new Blob([data]);
  return null;
}

function shouldIncludeCredentials(url) {
  try {
    const host = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://kissflow.com').hostname;
    return /kissflow\.com$/i.test(host);
  } catch {
    return false;
  }
}

/** Binary GET. Prefer kf.api so Kissflow parent cookies work from the component iframe. */
export async function kfGetBinary(kfInstance, path) {
  const headers = { Accept: '*/*' };
  const csrf = readKissflowCsrfToken();
  if (csrf) headers['x-csrf-token'] = csrf;

  if (kfInstance?.api) {
    try {
      const resp = await kfInstance.api(path, { method: 'GET', headers });
      if (typeof Response !== 'undefined' && resp instanceof Response) {
        const type = resp.headers.get('content-type') || '';
        if (!/json/i.test(type)) return resp.blob();
      } else {
        const blob = blobFromUnknown(resp?.data ?? resp);
        if (blob) return blob;
      }
    } catch {
      // kf.api often JSON-parses; binary downloads fall through to fetch.
    }
  }

  const origin = resolveKissflowOrigin(kfInstance);
  const url = path.startsWith('http')
    ? path
    : `${origin}${path}`;
  const kissflowHost = shouldIncludeCredentials(url);
  const res = await fetch(url, {
    method: 'GET',
    credentials: kissflowHost ? 'include' : 'omit',
    headers,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const type = res.headers.get('content-type') || '';
  if (/json/i.test(type)) {
    throw new Error('Not a file');
  }
  return res.blob();
}
