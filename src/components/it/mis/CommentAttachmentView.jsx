import { useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Paperclip, X } from 'lucide-react';
import { KissflowSDKContext } from '../../../sdk/index.js';
import {
  attachmentKindLabel,
  decodeAttachmentText,
  getAttachmentKind,
  getKissflowAttachmentPreviewSrc,
  isPlayablePreviewUrl,
  loadKissflowAttachment,
} from '../../../lib/kfFileBlob.js';
import { IT_BRAND, IT_COLOR } from '../itDesignTokens.js';

const TEXT_PREVIEW_LIMIT = 200000;

function stopNav(event) {
  event?.stopPropagation?.();
}

function fileCacheKey(file) {
  return String(file?.id || file?.key || file?.Key || file?.name || '');
}

async function previewFromBlob(blob, kind) {
  if (!blob) return { text: '', objectUrl: '' };
  if (kind === 'text') {
    const text = await decodeAttachmentText(blob);
    if (text.length > TEXT_PREVIEW_LIMIT) {
      return { text: `${text.slice(0, TEXT_PREVIEW_LIMIT)}\n\n… truncated`, objectUrl: '' };
    }
    return { text, objectUrl: '' };
  }
  if (kind === 'pdf' || kind === 'audio' || kind === 'video') {
    const type =
      kind === 'pdf'
        ? 'application/pdf'
        : kind === 'audio'
          ? blob.type || 'audio/mpeg'
          : blob.type || 'video/mp4';
    return { text: '', objectUrl: URL.createObjectURL(new Blob([blob], { type })) };
  }
  return { text: '', objectUrl: '' };
}

async function loadRenderablePreview(url, kind, blob = null) {
  if (kind === 'image') return { text: '', objectUrl: '' };
  if (blob) {
    const fromBlob = await previewFromBlob(blob, kind);
    if (kind !== 'text' || fromBlob.text) return fromBlob;
  }
  if (!isPlayablePreviewUrl(url)) return { text: '', objectUrl: '' };
  try {
    const res = await fetch(url, {
      credentials: 'omit',
      mode: 'cors',
    });
    if (!res.ok) return { text: '', objectUrl: '' };
    if (kind === 'text') {
      const text = await res.text();
      if (!text || looksLikeHtmlError(text)) return { text: '', objectUrl: '' };
      if (text.length > TEXT_PREVIEW_LIMIT) {
        return { text: `${text.slice(0, TEXT_PREVIEW_LIMIT)}\n\n… truncated`, objectUrl: '' };
      }
      return { text, objectUrl: '' };
    }
    const nextBlob = await res.blob();
    return previewFromBlob(nextBlob, kind);
  } catch {
    return { text: '', objectUrl: '' };
  }
}

function looksLikeHtmlError(text) {
  const sample = String(text || '').slice(0, 220).toLowerCase();
  return /<!doctype html|<html[\s>]/.test(sample);
}

export default function CommentAttachmentView({ file, mine = false, index = 0 }) {
  const { kf } = useContext(KissflowSDKContext);
  const kfInstance = kf || (typeof window !== 'undefined' ? window.kf : null);
  const kind = getAttachmentKind(file);
  const image = kind === 'image';
  const storedSrc = getKissflowAttachmentPreviewSrc(kfInstance, file, { thumbnail: image });
  const [thumbUrl, setThumbUrl] = useState(storedSrc || '');
  const [fullUrl, setFullUrl] = useState(() => getKissflowAttachmentPreviewSrc(kfInstance, file, { thumbnail: false }) || '');
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(image && !storedSrc);
  const [textPreview, setTextPreview] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const label = file?.name || file?.Name || `Attachment ${index + 1}`;
  const cacheKey = fileCacheKey(file);
  const titleId = useId();
  const objectUrlRef = useRef('');

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setFullUrl(getKissflowAttachmentPreviewSrc(kfInstance, file, { thumbnail: false }) || '');
    setThumbUrl(storedSrc || '');
    setLoading(image && !storedSrc);
    if (!image) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      try {
        const loaded = await loadKissflowAttachment(kfInstance, file, { thumbnail: true });
        if (cancelled) return;
        if (loaded.url) {
          setThumbUrl(loaded.url);
          setFailed(false);
        } else if (!storedSrc) {
          setFailed(true);
        }
      } catch {
        if (!cancelled && !storedSrc) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kfInstance, cacheKey, storedSrc, image]);

  const rememberObjectUrl = (next) => {
    if (objectUrlRef.current && objectUrlRef.current !== next) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = next || '';
    setObjectUrl(next || '');
  };

  const show = async (event) => {
    stopNav(event);
    event?.preventDefault?.();
    setLoading(true);
    let url = '';
    try {
      const loaded = await loadKissflowAttachment(kfInstance, file, { thumbnail: false });
      url = isPlayablePreviewUrl(loaded.url) ? loaded.url : '';
      const downloadHref = url || loaded.path || fullUrl || thumbUrl || '';
      if (downloadHref) setFullUrl(downloadHref);
      if (kind === 'text' || kind === 'pdf' || kind === 'audio' || kind === 'video') {
        const rendered = await loadRenderablePreview(url, kind, loaded.blob);
        setTextPreview(rendered.text || '');
        rememberObjectUrl(rendered.objectUrl);
      } else {
        setTextPreview('');
        rememberObjectUrl('');
      }
      if (url || loaded.blob || downloadHref) {
        setOpen(true);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch {
      const fallback = url || fullUrl || thumbUrl;
      if (fallback) {
        setFullUrl(fallback);
        setOpen(true);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const hide = (event) => {
    stopNav(event);
    event?.preventDefault?.();
    setOpen(false);
  };

  const href = fullUrl || thumbUrl;
  const lightbox =
    open && (href || textPreview || objectUrl) ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 p-3 sm:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        data-stop-row-nav
        onPointerDown={stopNav}
        onClick={hide}
      >
        <div
          className="relative flex max-h-[min(94dvh,960px)] w-full max-w-[min(calc(100vw-1.5rem),72rem)] flex-col overflow-hidden rounded-xl bg-white p-3 shadow-xl"
          onClick={stopNav}
          onPointerDown={stopNav}
        >
          <p id={titleId} className="mb-2 max-w-full truncate pr-8 text-xs font-semibold text-slate-700">
            {label}
          </p>
          <button
            type="button"
            aria-label="Close attachment"
            onClick={hide}
            className="absolute right-2 top-2 min-h-11 min-w-11 rounded-md p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
            {image ? (
              <img src={href} alt={label} referrerPolicy="no-referrer" className="max-h-[80vh] max-w-full object-contain" />
            ) : kind === 'pdf' && objectUrl ? (
              <iframe
                title={label}
                src={objectUrl}
                className="h-[min(78dvh,820px)] w-full rounded-md border border-slate-200 bg-slate-50"
              />
            ) : kind === 'text' && textPreview ? (
              <pre className="max-h-[min(78dvh,820px)] w-full overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-left text-xs text-slate-800">
                {textPreview}
              </pre>
            ) : kind === 'video' && (objectUrl || href) ? (
              <video src={objectUrl || href} controls className="max-h-[78vh] w-full rounded-md bg-black" />
            ) : kind === 'audio' && (objectUrl || href) ? (
              <audio src={objectUrl || href} controls className="w-full" />
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold tracking-wide text-slate-700">
                  {attachmentKindLabel(kind)}
                </span>
                <p className="max-w-md text-sm text-slate-600">{label}</p>
                <a
                  href={href}
                  download={label}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d9488] px-3 py-2 text-sm font-semibold text-white"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={`View ${label}`}
        data-stop-row-nav
        onPointerDown={stopNav}
        onTouchStart={stopNav}
        onClick={show}
        className="block shrink-0 cursor-pointer overflow-hidden rounded-md border border-white/30 bg-white text-left min-h-[4.5rem] min-w-[4.5rem]"
        style={{ touchAction: 'manipulation' }}
      >
        {image && thumbUrl && !failed ? (
          <img
            src={thumbUrl}
            alt={label}
            referrerPolicy="no-referrer"
            draggable={false}
            className="pointer-events-none h-24 w-24 object-cover max-[640px]:h-[4.5rem] max-[640px]:w-[4.5rem]"
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            className="inline-flex h-24 w-24 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-semibold"
            style={{ color: mine ? IT_BRAND.primaryDark : failed ? IT_COLOR.textMuted : IT_BRAND.primaryDark }}
          >
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-slate-700">
              {attachmentKindLabel(kind)}
            </span>
            <span className="line-clamp-2 w-full px-1 text-[9px] font-medium leading-tight">{label}</span>
            <span className="inline-flex items-center gap-0.5 text-[9px]">
              <Paperclip className="h-3 w-3" />
              {loading ? 'Opening…' : failed ? 'Retry' : 'View'}
            </span>
          </span>
        )}
      </button>
      {lightbox && typeof document !== 'undefined' ? createPortal(lightbox, document.body) : null}
    </>
  );
}
