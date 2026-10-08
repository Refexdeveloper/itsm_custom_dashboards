import { resolveAccountId, APP_ID } from './kfITServiceDashboard.js';
import { kfGetBinary, resolveKissflowOrigin } from './kfRuntime.js';

function asText(value) {
  return String(value ?? '').trim();
}

function photoSizeToken(photo) {
  if (!photo || typeof photo !== 'object') return '';
  if (Array.isArray(photo.size)) return photo.size.join('x');
  return asText(photo.size || photo.Size);
}

function photoKey(photo) {
  return asText(photo?.key || photo?.Key);
}

export function isGcsSignedUrl(url) {
  const text = asText(url);
  return /https:\/\/storage\.googleapis\.com\//i.test(text)
    && /[?&]X-Goog-Algorithm=/i.test(text);
}

export function gcsSignedUrlIsFresh(url, skewMs = 15000) {
  if (!isGcsSignedUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const date = parsed.searchParams.get('X-Goog-Date') || '';
    const expires = Number(parsed.searchParams.get('X-Goog-Expires') || 0);
    if (!/^\d{8}T\d{6}Z$/.test(date) || !expires) return false;
    const start = Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(4, 6)) - 1,
      Number(date.slice(6, 8)),
      Number(date.slice(9, 11)),
      Number(date.slice(11, 13)),
      Number(date.slice(13, 15)),
    );
    return Date.now() + skewMs < start + expires * 1000;
  } catch {
    return false;
  }
}

function pickStoredGcsUrl(file, { thumbnail = false } = {}) {
  const photos = Array.isArray(file?.photos) ? file.photos : [];
  const candidates = [];
  if (thumbnail) {
    photos.forEach((photo) => {
      candidates.push(photo?.Url, photo?.url, photo?.URL);
    });
  }
  candidates.push(file?.Url, file?.url, file?.URL);
  if (!thumbnail) {
    photos.forEach((photo) => {
      candidates.push(photo?.Url, photo?.url, photo?.URL);
    });
  }
  return candidates.find((value) => gcsSignedUrlIsFresh(value)) || '';
}

export function getKissflowAttachmentKey(file, { thumbnail = false } = {}) {
  const photos = Array.isArray(file?.photos) ? file.photos : [];
  if (thumbnail && photos.length) {
    const thumb = photos.find((photo) => {
      const size = photoSizeToken(photo);
      return size === '100x100' || size.includes('100');
    }) || photos[0];
    const key = photoKey(thumb);
    if (key) return key;
  }
  return asText(file?.key || file?.Key) || photoKey(photos[0]);
}

function fileExtension(file) {
  const named = asText(file?.name || file?.Name);
  const keyName = (asText(file?.key || file?.Key).split('/').pop() || '');
  const fromName = named.includes('.') ? named.split('.').pop() : '';
  const fromKey = keyName.includes('.') ? keyName.split('.').pop() : '';
  return asText(file?.fileExtension || file?.FileExtension || fromName || fromKey).replace(/^\./, '').toLowerCase();
}

const TEXT_EXTS = new Set(['txt', 'csv', 'log', 'json', 'md', 'xml', 'html', 'htm', 'rtf', 'eml']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']);
const SLIDE_EXTS = new Set(['ppt', 'pptx', 'odp', 'key']);
const WORD_EXTS = new Set(['doc', 'docx', 'odt', 'pages']);
const EXCEL_EXTS = new Set(['xls', 'xlsx', 'ods', 'numbers']);
const ARCHIVE_EXTS = new Set(['zip', '7z', 'rar', 'tar', 'gz', 'tgz']);
const DOCUMENT_EXTS = new Set([
  ...TEXT_EXTS,
  ...VIDEO_EXTS,
  ...AUDIO_EXTS,
  ...SLIDE_EXTS,
  ...WORD_EXTS,
  ...EXCEL_EXTS,
  ...ARCHIVE_EXTS,
  'pdf',
]);

export function getAttachmentKind(file) {
  const mime = asText(file?.mimeType || file?.type || file?.contentType).toLowerCase();
  const ext = fileExtension(file);
  if (mime.startsWith('image/') || /^(png|jpe?g|gif|webp|bmp|svg|tif|tiff|heic|ico)$/.test(ext)) return 'image';
  if (Array.isArray(file?.photos) && file.photos.length && !DOCUMENT_EXTS.has(ext)) return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    mime.startsWith('text/')
    || mime === 'application/json'
    || mime === 'application/xml'
    || mime === 'application/rtf'
    || TEXT_EXTS.has(ext)
  ) {
    return 'text';
  }
  if (mime.startsWith('video/') || VIDEO_EXTS.has(ext)) return 'video';
  if (mime.startsWith('audio/') || AUDIO_EXTS.has(ext)) return 'audio';
  if (mime.includes('presentationml') || mime.includes('powerpoint') || SLIDE_EXTS.has(ext)) return 'slides';
  if (mime.includes('wordprocessingml') || mime === 'application/msword' || WORD_EXTS.has(ext)) return 'word';
  if (mime.includes('spreadsheetml') || mime.includes('excel') || EXCEL_EXTS.has(ext)) return 'excel';
  if (mime.includes('zip') || mime.includes('compressed') || ARCHIVE_EXTS.has(ext)) return 'zip';
  return 'file';
}

export function attachmentKindLabel(kind) {
  return (
    {
      image: 'IMG',
      pdf: 'PDF',
      text: 'TXT',
      video: 'VIDEO',
      audio: 'AUDIO',
      slides: 'PPT',
      word: 'DOCX',
      excel: 'XLSX',
      zip: 'ZIP',
      file: 'FILE',
    }[kind] || 'FILE'
  );
}

function keyToPathSegments(key) {
  return asText(key).replace(/^\/+/, '').split('/').filter(Boolean);
}

function keyLooksLikeImage(key) {
  const last = asText(key).split('/').pop() || '';
  return /^(100x100|1200x800)\.png$/i.test(last) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(last);
}

/**
 * Native Kissflow attachment path that 302s to a GET-signed GCS URL:
 * /upload/2/{account}/{process}/{instance}/{activity}/IT__Agent_Solution/{row}/{attachId}/photos/100x100.png
 * Non-image keys stay on the original file path (txt/pdf/docx/xlsx/zip).
 * Slashes stay as path segments (not ?key= and not /file/2).
 */
export function buildKissflowUploadObjectPath(accountId, key, { thumbnail = false } = {}) {
  const account = asText(accountId);
  const parts = keyToPathSegments(key);
  if (!account || !parts.length) return '';
  if (thumbnail && !keyLooksLikeImage(parts.join('/'))) {
    thumbnail = false;
  }
  if (thumbnail) {
    const last = parts[parts.length - 1] || '';
    const prev = parts[parts.length - 2] || '';
    if (!/^100x100\.png$/i.test(last)) {
      if (prev === 'photos') {
        parts[parts.length - 1] = '100x100.png';
      } else {
        parts.pop();
        parts.push('photos', '100x100.png');
      }
    }
  }
  return `/upload/2/${account}/${parts.map(encodeURIComponent).join('/')}`;
}

function isOnKissflowPage() {
  if (typeof window === 'undefined') return false;
  return /(^|\.)kissflow\.com$/i.test(window.location.hostname || '');
}

function readKissflowCsrfToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)__CSRF=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function withApplicationId(path) {
  if (!path) return '';
  if (/[?&]_application_id=/.test(path)) return path;
  return `${path}${path.includes('?') ? '&' : '?'}_application_id=${encodeURIComponent(APP_ID)}`;
}

function uniqueUrls(list) {
  return [...new Set((list || []).map((item) => asText(item)).filter(Boolean))];
}

/** blob / data / signed GCS only — Kissflow pages cannot be nested-iframed. */
export function isPlayablePreviewUrl(url) {
  const text = asText(url);
  if (!text) return false;
  if (text.startsWith('blob:') || text.startsWith('data:')) return true;
  return isGcsSignedUrl(text);
}

function credentialsForUrl(url) {
  try {
    const host = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://kissflow.com').hostname;
    return /kissflow\.com$/i.test(host) ? 'include' : 'omit';
  } catch {
    return 'omit';
  }
}

function uploadGetHeaders() {
  const headers = { Accept: '*/*' };
  const csrf = readKissflowCsrfToken();
  if (csrf) headers['x-csrf-token'] = csrf;
  return headers;
}

function locationFromResponse(res) {
  if (!res || typeof res.headers?.get !== 'function') return '';
  const loc = asText(res.headers.get('Location') || res.headers.get('location'));
  return loc;
}

async function readBlobIfFile(res) {
  if (!res || !res.ok) return null;
  const type = asText(res.headers?.get?.('content-type')).toLowerCase();
  if (/json/i.test(type) && !/^text\/plain/i.test(type)) return null;
  if (/text\/html/i.test(type)) return null;
  try {
    const blob = await res.blob();
    if (!blob || blob.size <= 0) return null;
    if (/json/i.test(blob.type || '') && !/^text\/plain/i.test(blob.type || '')) return null;
    return blob;
  } catch {
    return null;
  }
}

function blobFromApiPayload(value) {
  if (!value) return null;
  if (value instanceof Blob) {
    if (value.size <= 0) return null;
    return value;
  }
  if (value instanceof ArrayBuffer && value.byteLength > 0) return new Blob([value]);
  if (ArrayBuffer.isView(value) && value.byteLength > 0) return new Blob([value]);
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text || isGcsSignedUrl(text) || text.startsWith('{') || text.startsWith('<')) return null;
    return new Blob([value], { type: 'text/plain;charset=utf-8' });
  }
  return null;
}

export async function decodeAttachmentText(blob) {
  if (!blob || blob.size <= 0) return '';
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (!bytes.length) return '';
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  let zeros = 0;
  const sample = Math.min(bytes.length, 400);
  for (let i = 0; i < sample; i += 1) {
    if (bytes[i] === 0) zeros += 1;
  }
  if (zeros > sample / 4) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

async function readGcsTextBlob(url) {
  if (!isGcsSignedUrl(url)) return null;
  try {
    const res = await fetch(url, { credentials: 'omit', mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size <= 0) return null;
    return blob;
  } catch {
    return null;
  }
}

/**
 * Mint a usable preview URL without following the GCS 302 with cookies.
 * Credentialed fetch + ACAO:* on storage.googleapis.com is blocked; images hid
 * this because getImageUrl worked. Non-images need Location or a same-origin blob.
 */
async function mintUploadAccess(kfInstance, path) {
  const relative = withApplicationId(path);
  const origin = resolveKissflowOrigin(kfInstance);
  const absolute = relative.startsWith('http') ? relative : `${origin}${relative}`;
  const headers = uploadGetHeaders();

  for (const url of uniqueUrls([isOnKissflowPage() ? relative : '', absolute, relative])) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: credentialsForUrl(url),
        redirect: 'manual',
        headers,
      });
      const loc = locationFromResponse(res);
      const absLoc = loc && !loc.startsWith('http') ? `${origin}${loc}` : loc;
      if ([301, 302, 303, 307, 308].includes(res.status) && isGcsSignedUrl(absLoc)) {
        const gcsBlob = await readGcsTextBlob(absLoc);
        return { url: absLoc, blob: gcsBlob };
      }
      if (isGcsSignedUrl(res.url)) {
        const gcsBlob = await readGcsTextBlob(res.url);
        return { url: res.url, blob: gcsBlob };
      }
      const blob = await readBlobIfFile(res);
      if (blob) return { url: URL.createObjectURL(blob), blob };
      if (res.ok && /json/i.test(asText(res.headers?.get?.('content-type')))) {
        const body = await res.json().catch(() => null);
        const gcs = pickGcsUrlFromUnknown(body);
        if (gcs) return { url: gcs, blob: null };
      }
    } catch {
      // iframe / CORS — try the next hop.
    }
  }

  if (kfInstance?.api) {
    try {
      const resp = await kfInstance.api(relative, {
        method: 'GET',
        headers,
        redirect: 'manual',
      });
      const fromApi = blobFromApiPayload(resp?.data ?? resp);
      if (fromApi) return { url: URL.createObjectURL(fromApi), blob: fromApi };
      const gcs = pickGcsUrlFromUnknown(resp);
      if (gcs) {
        const gcsBlob = await readGcsTextBlob(gcs);
        return { url: gcs, blob: gcsBlob };
      }
      if (typeof Response !== 'undefined' && resp instanceof Response) {
        const loc = locationFromResponse(resp);
        const absLoc = loc && !loc.startsWith('http') ? `${origin}${loc}` : loc;
        if (isGcsSignedUrl(absLoc)) {
          const gcsBlob = await readGcsTextBlob(absLoc);
          return { url: absLoc, blob: gcsBlob };
        }
        if (isGcsSignedUrl(resp.url)) {
          const gcsBlob = await readGcsTextBlob(resp.url);
          return { url: resp.url, blob: gcsBlob };
        }
        const blob = await readBlobIfFile(resp);
        if (blob) return { url: URL.createObjectURL(blob), blob };
      }
    } catch {
      // kf.api often JSON-parses binary; fall through.
    }
  }

  try {
    const blob = await kfGetBinary(kfInstance, relative);
    if (blob && blob.size > 0) return { url: URL.createObjectURL(blob), blob };
  } catch {
    // last hop failed
  }

  return { url: '', blob: null };
}

function pickGcsUrlFromUnknown(value, depth = 0) {
  if (!value || depth > 4) return '';
  if (typeof value === 'string') return isGcsSignedUrl(value) ? value : '';
  if (typeof Response !== 'undefined' && value instanceof Response) {
    return isGcsSignedUrl(value.url) ? value.url : '';
  }
  if (typeof value !== 'object') return '';
  const direct = [
    value.url,
    value.URL,
    value.Url,
    value.href,
    value.responseURL,
    value.responseUrl,
  ];
  for (const candidate of direct) {
    if (isGcsSignedUrl(candidate)) return candidate;
  }
  if (value.request) {
    const nested = pickGcsUrlFromUnknown(value.request, depth + 1);
    if (nested) return nested;
  }
  return '';
}

function fileValueForImageUrl(file, { thumbnail = false } = {}) {
  const key = getKissflowAttachmentKey(file, { thumbnail });
  if (!key) return null;
  return {
    name: asText(file?.name || file?.Name) || (thumbnail ? '100x100.png' : 'file'),
    key,
  };
}

async function loadViaKissflowImageUrl(kfInstance, file, { thumbnail = false } = {}) {
  const getImageUrl = kfInstance?.client?.getImageUrl;
  if (typeof getImageUrl !== 'function') return '';
  const key = getKissflowAttachmentKey(file, { thumbnail: false });
  const name = asText(file?.name || file?.Name) || 'file';
  const candidates = [
    fileValueForImageUrl(file, { thumbnail }),
    key ? { name, key } : null,
    file,
  ];
  for (const value of candidates) {
    if (!value) continue;
    try {
      const url = await getImageUrl.call(kfInstance.client, value);
      if (typeof url === 'string' && isPlayablePreviewUrl(url)) return url;
    } catch {
      // try the next payload shape
    }
  }
  return '';
}

const previewCache = new Map();
const previewInflight = new Map();

function attachmentCacheId(file, thumbnail) {
  const key = getKissflowAttachmentKey(file, { thumbnail })
    || getKissflowAttachmentKey(file, { thumbnail: false })
    || asText(file?.id || file?.name || file?.Name);
  return key ? `${key}|${thumbnail ? 't' : 'f'}` : '';
}

function cacheEntryStillValid(entry) {
  const url = asText(entry?.url);
  if (!url) return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  return gcsSignedUrlIsFresh(url);
}

export function peekKissflowAttachmentCache(file, { thumbnail = true } = {}) {
  const id = attachmentCacheId(file, thumbnail);
  if (!id) return '';
  const hit = previewCache.get(id);
  if (!cacheEntryStillValid(hit)) {
    if (id) previewCache.delete(id);
    return '';
  }
  return hit.url;
}

function rememberKissflowAttachment(file, { thumbnail = true } = {}, url, path = '') {
  const id = attachmentCacheId(file, thumbnail);
  if (!id || !url) return;
  previewCache.set(id, { url, path });
}

export function getKissflowAttachmentPreviewSrc(kfInstance, file, { thumbnail = true } = {}) {
  return pickStoredGcsUrl(file, { thumbnail }) || peekKissflowAttachmentCache(file, { thumbnail });
}

export async function blobToDataUrl(blob) {
  if (!blob || typeof FileReader === 'undefined') return '';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Preview URL for comment attachments.
 * GET /upload/2/{account}/{key-as-path} 302s to a GET-signed GCS URL.
 * Do not follow that redirect with cookies (CORS). Read Location or keep a blob.
 */
export async function loadKissflowAttachment(kfInstance, file, { thumbnail = true } = {}) {
  const kind = getAttachmentKind(file);
  if (kind !== 'image') thumbnail = false;
  const stored = pickStoredGcsUrl(file, { thumbnail }) || peekKissflowAttachmentCache(file, { thumbnail });
  if (stored && kind !== 'text') {
    rememberKissflowAttachment(file, { thumbnail }, stored);
    return { url: stored, path: '', blob: null };
  }
  if (stored && kind === 'text') {
    const gcsBlob = await readGcsTextBlob(stored);
    if (gcsBlob) {
      rememberKissflowAttachment(file, { thumbnail }, stored);
      return { url: stored, path: '', blob: gcsBlob };
    }
  }

  const cacheId = attachmentCacheId(file, thumbnail);
  if (cacheId && previewInflight.has(cacheId)) {
    return previewInflight.get(cacheId);
  }

  const pending = (async () => {
    const accountId = resolveAccountId(kfInstance);
    const key = getKissflowAttachmentKey(file, { thumbnail: false })
      || getKissflowAttachmentKey(file, { thumbnail: true });
    const path = buildKissflowUploadObjectPath(accountId, key, { thumbnail });
    const origin = resolveKissflowOrigin(kfInstance);
    const fallback = path ? `${origin}${withApplicationId(path)}` : '';

    const playable = async (url, blob = null) => {
      if (!url && !blob) return null;
      if (blob && blob.size > 0) {
        const objectUrl = url && isPlayablePreviewUrl(url) ? url : URL.createObjectURL(blob);
        rememberKissflowAttachment(file, { thumbnail }, objectUrl, path);
        return { url: objectUrl, path: fallback, blob };
      }
      if (isPlayablePreviewUrl(url)) {
        const gcsBlob = isGcsSignedUrl(url) && kind === 'text' ? await readGcsTextBlob(url) : null;
        rememberKissflowAttachment(file, { thumbnail }, url, path);
        return { url, path: fallback, blob: gcsBlob };
      }
      return null;
    };

    const sdkUrl = await loadViaKissflowImageUrl(kfInstance, file, { thumbnail });
    const fromSdk = await playable(sdkUrl);
    if (fromSdk) return fromSdk;

    if (path) {
      const minted = await mintUploadAccess(kfInstance, path);
      const fromMint = await playable(minted.url, minted.blob);
      if (fromMint) return fromMint;
    }

    if (stored) {
      const fromStored = await playable(stored);
      if (fromStored) return fromStored;
    }

    return { url: '', path: fallback, blob: null };
  })();

  if (cacheId) previewInflight.set(cacheId, pending);
  try {
    return await pending;
  } finally {
    if (cacheId) previewInflight.delete(cacheId);
  }
}
