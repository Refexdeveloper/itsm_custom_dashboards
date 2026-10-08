/**
 * Shared MIS expand panel primitives — Overview (+ merged details) / Resolution History + Workflow rail.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, FileText, Paperclip, Activity, AlignLeft, Lightbulb, MessageSquareText, RefreshCw, Send,
} from 'lucide-react';
import {
  itAccordionShell,
  itExpandPanelShell,
  itBadge,
  itBadgeDot,
  IT_BRAND,
  IT_COLOR,
  IT_STEP_BADGE,
  IT_TYPE,
  resolveItemStatusStyle,
} from '../itDesignTokens.js';
import {
  formatDisplayDateTime,
  formatRequesterDisplay,
  formatServiceWorkflowStepDisplay,
  resolveDisplayRequestId,
} from '../../../lib/kfITServiceDashboard.js';
import { StarRating } from '../../../itsm/refex/employeedashboard/tableHelpers.jsx';
import { getPersonAvatarTone, getPersonInitials } from '../../../itsm/refex/shared/misCompactDisplay.js';
import { commentAuthorsMatch } from '../../../itsm/refex/employeedashboard/agentSolutionCommentApi.js';
import {
  COMMENT_CHANNEL_INTERNAL,
  COMMENT_CHANNEL_USER,
  commentMatchesChannel,
} from '../../../itsm/refex/employeedashboard/commentChannel.js';
import CommentAttachmentView from './CommentAttachmentView.jsx';

function resolveAttachmentUrl(file) {
  if (!file || typeof file !== 'object') return null;
  const candidates = [
    file.url, file.URL, file.Url, file.download_url, file.downloadUrl,
    file.File_URL, file.file_url, file.href, file.link, file.preview_url, file.previewUrl,
  ];
  const photos = Array.isArray(file.photos) ? file.photos : [];
  photos.forEach((photo) => {
    if (photo && typeof photo === 'object') {
      candidates.push(photo.url, photo.URL, photo.Url, photo.href, photo.link);
    }
  });
  for (const candidate of candidates) {
    const token = String(candidate ?? '').trim();
    if (token && (token.startsWith('http') || token.startsWith('/'))) return token;
  }
  return null;
}
void resolveAttachmentUrl;

const OVERVIEW_TAB = { key: 'overview', label: 'Overview', icon: LayoutGrid };

/** Agent/employee solution + reopen notes (was "Revisions"). */
const RESOLUTION_HISTORY_TAB = { key: 'resolutionHistory', label: 'Comments', icon: MessageSquareText };

const PERSISTED_MIS_TAB_BY_KEY = new Map();

export function usePersistedMisExpandTab(persistKey = '', defaultTab = 'overview') {
  const key = String(persistKey || '');
  const [activeTab, setActiveTab] = useState(() => {
    const stored = (key && PERSISTED_MIS_TAB_BY_KEY.get(key)) || defaultTab;
    if (stored === 'details') return 'overview';
    if (stored === 'tracking') return 'resolutionHistory';
    return stored;
  });

  useEffect(() => {
    if (key && activeTab) PERSISTED_MIS_TAB_BY_KEY.set(key, activeTab);
  }, [key, activeTab]);

  const handleTabChange = (next) => {
    setActiveTab(next);
    if (key) PERSISTED_MIS_TAB_BY_KEY.set(key, next);
  };

  return [activeTab, handleTabChange];
}

const RICH_TEXT_LABELS = new Set([
  'Description',
  'Solution',
  'Summary',
  'Subject',
  'Implementation Plan',
  'Backout Plan',
  'Test Plan',
  'Reason for Pending',
  'Reason for Hold',
  'Cancellation Reason',
  'Rejection Reason',
  'Rejection Notes',
]);

const RICH_TEXT_ICONS = {
  Description: AlignLeft,
  Solution: Lightbulb,
  Summary: FileText,
  Subject: FileText,
};

export function visibleMisTiles(tiles) {
  return (tiles || []).filter((t) => t?.value && t.value !== '—');
}

function splitTiles(tiles) {
  const reject = [];
  const rich = [];
  const meta = [];
  for (const tile of tiles || []) {
    const isReject = tile.highlight === 'reject'
      || tile.label === 'Rejected By'
      || tile.label === 'Rejection Notes'
      || tile.label === 'Rejection Reason';
    if (isReject) {
      reject.push(tile);
      continue;
    }
    const multiline = tile.multiline || RICH_TEXT_LABELS.has(tile.label);
    if (multiline && RICH_TEXT_LABELS.has(tile.label)) rich.push(tile);
    else meta.push(tile);
  }
  return { rich: [...reject, ...rich], meta };
}

export function MisDetailRow({ label, value, multiline = false }) {
  return (
    <div className="min-w-0 border-b border-slate-100 py-2.5 last:border-0 sm:py-3">
      <p className={IT_TYPE.label}>{label}</p>
      <p className={`mt-1 break-words text-sm font-medium text-slate-800 ${multiline ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function MisRichTextSections({ blocks }) {
  if (!blocks.length) return null;
  return (
    <div className={`${itAccordionShell()} overflow-hidden`}>
      {blocks.map(({ label, value, highlight }, index) => {
        const Icon = RICH_TEXT_ICONS[label] || FileText;
        const reject = highlight === 'reject'
          || label === 'Rejection Notes'
          || label === 'Rejection Reason'
          || label === 'Rejected By';
        return (
          <section key={label} className={index > 0 ? 'border-t border-slate-100' : ''}>
            <header className={`flex items-center gap-2 border-b px-4 py-2.5 ${
              reject
                ? 'border-rose-100 bg-gradient-to-r from-rose-50 to-white'
                : 'border-slate-100 bg-gradient-to-r from-[#f0fdfa]/80 to-white'
            }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                reject ? 'bg-rose-100 text-rose-600' : 'bg-[#0d9488]/10 text-[#0d9488]'
              }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <p className={`text-[11px] font-bold uppercase tracking-[0.08em] ${
                reject ? 'text-rose-700' : 'text-slate-600'
              }`}
              >
                {label}
              </p>
            </header>
            <div className={`px-4 py-3.5 sm:px-5 sm:py-4 ${reject ? 'bg-rose-50/70' : ''}`}>
              <p className={`break-words whitespace-pre-wrap text-sm leading-relaxed ${
                reject ? 'font-medium text-rose-800' : 'text-slate-700'
              }`}
              >
                {value}
              </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MisMetaGrid({ tiles }) {
  if (!tiles.length) return null;
  return (
    <div className={`${itAccordionShell()} p-3 sm:p-4`}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ label, value, multiline }) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition-colors hover:border-[#99f6e4]/60 hover:bg-[#f0fdfa]/40"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
            <p className={`mt-1 break-words text-sm font-semibold text-slate-800 ${multiline ? 'whitespace-pre-wrap font-medium leading-relaxed' : ''}`}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** IT Agent Refex ticket files — same preview/download chips as comments. */
export function MisTicketAttachmentsLikeComments({ attachments }) {
  if (!Array.isArray(attachments) || !attachments.length) return null;
  return (
    <div className={`${itAccordionShell()} p-3 sm:p-4 sm:col-span-full`}>
      <p className={`mb-2.5 ${IT_TYPE.label}`}>Supporting Documents</p>
      <div className="flex flex-wrap gap-1.5" data-stop-row-nav onPointerDown={(event) => event.stopPropagation()}>
        {attachments.map((file, fileIdx) => (
          <CommentAttachmentView
            key={`${file?.id || file?.key || file?.name || fileIdx}`}
            file={file}
            index={fileIdx}
          />
        ))}
      </div>
    </div>
  );
}

export function MisDocumentsInline({ attachments }) {
  return <MisTicketAttachmentsLikeComments attachments={attachments} />;
}

export function MisDetailCard({ tiles, attachments, footer = null }) {
  const visible = visibleMisTiles(tiles);
  const { rich, meta } = splitTiles(visible);
  const hasDocs = attachments?.length > 0;

  if (!visible.length && !hasDocs && !footer) {
    return (
      <div className={`${itAccordionShell()} flex flex-col items-center justify-center px-4 py-10 text-center`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <FileText className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-slate-600">No details available</p>
        <p className="mt-0.5 text-xs text-slate-400">This request has no overview content yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rich.length > 0 ? <MisRichTextSections blocks={rich} /> : null}
      {meta.length > 0 ? <MisMetaGrid tiles={meta} /> : null}
      {hasDocs ? <MisDocumentsInline attachments={attachments} /> : null}
      {footer}
    </div>
  );
}

export function MisWorkflowPanel({ workflow, sla = null }) {
  if (!workflow && !sla) return null;
  return (
    <div className="flex h-full flex-col gap-3">
      {workflow}
      {sla ? (
        <div className={`${itAccordionShell()} p-3 sm:p-4`}>
          {sla}
        </div>
      ) : null}
    </div>
  );
}

function trackingStatusTone(status) {
  const token = String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (token.includes('cancel')) return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (token.includes('resolve') || token.includes('complete')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (token.includes('hold')) return 'bg-amber-50 text-amber-800 ring-amber-200';
  if (token.includes('pending')) return 'bg-violet-50 text-violet-700 ring-violet-200';
  if (token.includes('accept')) return 'bg-sky-50 text-sky-700 ring-sky-200';
  if (token.includes('progress')) return 'bg-blue-50 text-blue-700 ring-blue-200';
  return 'bg-slate-50 text-slate-700 ring-slate-200';
}

const CHAT_QUICK_CHIPS = ['Thanks', 'Not resolved', 'Need update'];

function stopChatEvent(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
}

function chatDayKey(dateTime) {
  const raw = dateTime instanceof Date ? dateTime : new Date(dateTime);
  if (!dateTime || Number.isNaN(raw.getTime())) return '';
  const y = raw.getFullYear();
  const m = String(raw.getMonth() + 1).padStart(2, '0');
  const d = String(raw.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatChatDayLabel(dateTime) {
  const raw = dateTime instanceof Date ? dateTime : new Date(dateTime);
  if (!dateTime || Number.isNaN(raw.getTime())) return '';
  return raw.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}

function chatRoleLabel(role) {
  if (role === 'employee') return 'Employee';
  if (role === 'reopen') return 'Reopen';
  return 'IT Agent';
}

const COMMENT_FILE_MAX_BYTES = 1024 * 1024;
const COMMENT_FILE_LIMIT_MESSAGE = 'File limit is 1MB only';

function chatTicketDescription(ticket) {
  const text = String(ticket?.description || ticket?.summary || '').trim();
  return text && text !== '—' ? text : '';
}

function chatTicketMeta(ticket) {
  const requester = formatRequesterDisplay(ticket)
    || String(ticket?.requesterName || ticket?.createdBy || '').trim();
  const entity = String(ticket?.entity || ticket?.companyName || ticket?.company || '').trim();
  const date = formatDisplayDateTime(
    ticket?.requestedDateTimeRaw || ticket?.createdAtRaw || ticket?.createdOnLabel || '',
  );
  return [requester, entity, date].filter((part) => part && part !== '—').join(' · ');
}

export function MisResolutionHistoryPanel({
  entries = [],
  ticket = null,
  onRefresh = null,
  refreshing = false,
  loadError = '',
  showHeaderRefresh = true,
  canCompose = false,
  composeDisabledReason = '',
  onSubmitComment = null,
  composing = false,
  composeError = '',
  currentUserName = '',
  splitCommentChannels = false,
  allowAttachments = false,
}) {
  void showHeaderRefresh;
  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [fileLimitError, setFileLimitError] = useState('');
  const [channel, setChannel] = useState(COMMENT_CHANNEL_USER);
  const threadRef = useRef(null);
  const fileInputRef = useRef(null);
  const draftFieldId = useId();
  const fileInputId = `${draftFieldId}-attach`;
  const requestId = resolveDisplayRequestId(ticket, ticket?.id) || ticket?.requestId || '';
  const statusLabel = ticket?.statusLabel || ticket?.itemStatus || ticket?.status || '';
  const statusStyle = resolveItemStatusStyle(statusLabel);
  const stepLabel = formatServiceWorkflowStepDisplay(ticket) || ticket?.currentStep || '';
  const description = chatTicketDescription(ticket);
  const metaLine = chatTicketMeta(ticket);
  const visibleEntries = useMemo(
    () => (splitCommentChannels ? (entries || []).filter((entry) => commentMatchesChannel(entry, channel)) : (entries || [])),
    [entries, splitCommentChannels, channel],
  );
  const count = visibleEntries.length;

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [visibleEntries, composing, refreshing, channel]);

  const handleChatRefresh = (event) => {
    stopChatEvent(event);
    if (refreshing || typeof onRefresh !== 'function') return;
    onRefresh();
  };

  const handleSend = async (event) => {
    stopChatEvent(event);
    const text = String(draft || '').trim();
    if (composing || refreshing || typeof onSubmitComment !== 'function') return;
    if (!text && !pendingFiles.length) return;
    if (allowAttachments && pendingFiles.some((file) => file.size > COMMENT_FILE_MAX_BYTES)) {
      setFileLimitError(COMMENT_FILE_LIMIT_MESSAGE);
      return;
    }
    setFileLimitError('');
    try {
      await onSubmitComment(text, {
        commentsType: splitCommentChannels ? channel : '',
        files: allowAttachments ? pendingFiles : [],
      });
      setDraft('');
      setPendingFiles([]);
    } catch {
      // composeError is shown by the parent
    }
  };

  const identity = (
    <div
      className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5"
      data-stop-row-nav
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {requestId ? (
              <p className="text-sm font-semibold tracking-tight" style={{ color: IT_COLOR.textPrimary }}>
                {requestId}
              </p>
            ) : (
              <p className="text-sm font-semibold" style={{ color: IT_COLOR.textPrimary }}>Comments</p>
            )}
            {statusLabel && statusLabel !== '—' ? (
              <span className={itBadge(statusStyle.badge)}>
                <span className={itBadgeDot(statusStyle.dot)} aria-hidden />
                {statusLabel}
              </span>
            ) : null}
            {stepLabel && stepLabel !== '—' ? (
              <span className={itBadge(IT_STEP_BADGE)}>{stepLabel}</span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-snug" style={{ color: IT_COLOR.textPrimary }}>
              {description}
            </p>
          ) : null}
          {metaLine ? (
            <p className="mt-1 text-xs" style={{ color: IT_COLOR.textMuted }}>{metaLine}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-xs font-bold tabular-nums"
            style={{
              backgroundColor: IT_BRAND.soft,
              borderColor: IT_BRAND.border,
              color: IT_BRAND.primaryDark,
            }}
            title={`${count} comments`}
          >
            {count}
          </span>
          {typeof onRefresh === 'function' ? (
            <button
              type="button"
              title={refreshing ? 'Refreshing comments…' : 'Refresh comments'}
              aria-label={refreshing ? 'Refreshing comments' : 'Refresh comments'}
              aria-busy={refreshing}
              disabled={refreshing}
              data-stop-row-nav
              onClick={handleChatRefresh}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-[#99f6e4] hover:bg-[#f0fdfa] hover:text-[#0f766e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          ) : null}
        </div>
      </div>
      {loadError ? (
        <p className="mt-2 text-xs text-rose-600">{loadError}</p>
      ) : null}
      {splitCommentChannels ? (
        <div className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {[
            { key: COMMENT_CHANNEL_USER, label: 'User Comments' },
            { key: COMMENT_CHANNEL_INTERNAL, label: 'Internal' },
          ].map((tab) => {
            const active = channel === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                data-stop-row-nav
                onClick={(event) => {
                  stopChatEvent(event);
                  setChannel(tab.key);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  active ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  const composer = (canCompose && typeof onSubmitComment === 'function') ? (
    <form
      className="mt-2 rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3"
      onSubmit={handleSend}
      onClick={(e) => e.stopPropagation()}
      data-stop-row-nav
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        {CHAT_QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={composing || refreshing}
            onClick={(event) => {
              stopChatEvent(event);
              setDraft(chip);
            }}
            className="rounded-md border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50"
            style={{
              borderColor: IT_BRAND.border,
              backgroundColor: IT_BRAND.soft,
              color: IT_BRAND.primaryDark,
            }}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2 max-[640px]:flex-wrap">
        <label className="sr-only" htmlFor={draftFieldId}>Write a comment</label>
        <textarea
          id={draftFieldId}
          rows={2}
          value={draft}
          disabled={composing || refreshing}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder="Write a comment…"
          className="max-h-28 min-h-[2.5rem] w-full min-w-0 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/20 max-[640px]:min-w-full"
          style={{ color: IT_COLOR.textPrimary }}
        />
        {allowAttachments ? (
          <>
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              className="sr-only"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.ods,.odp,.txt,.csv,.json,.xml,.html,.md,.zip,.7z,.rar,.tar,.gz,.mp4,.mov,.webm,.mp3,.wav,.m4a,.svg,.tif,.tiff,.heic,application/pdf,text/plain,application/zip"
              onChange={(event) => {
                const next = Array.from(event.target.files || []);
                if (next.some((file) => file.size > COMMENT_FILE_MAX_BYTES)) {
                  setFileLimitError(COMMENT_FILE_LIMIT_MESSAGE);
                  setPendingFiles([]);
                  event.target.value = '';
                  return;
                }
                setFileLimitError('');
                setPendingFiles(next);
                event.target.value = '';
              }}
            />
            <label
              htmlFor={fileInputId}
              title="Attach file"
              aria-label="Attach file"
              className={`inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-[#0d9488] hover:text-[#0f766e] max-[640px]:h-12 max-[640px]:w-12 ${composing || refreshing ? 'pointer-events-none opacity-40' : ''}`}
            >
              <Paperclip className="h-4 w-4" />
            </label>
          </>
        ) : null}
        <button
          type="submit"
          disabled={composing || refreshing || (!String(draft || '').trim() && !pendingFiles.length)}
          aria-label={composing ? 'Saving comment' : 'Send comment'}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#0d9488] px-3.5 text-sm font-semibold text-white transition hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className={`h-3.5 w-3.5 ${composing ? 'animate-pulse' : ''}`} />
          Send
        </button>
      </div>
      {pendingFiles.length ? (
        <p className="pt-1.5 text-[11px] text-slate-500">
          {pendingFiles.map((file) => file.name).join(', ')}
        </p>
      ) : null}
      {fileLimitError ? (
        <p className="pt-1.5 text-[11px] text-rose-600">{fileLimitError}</p>
      ) : null}
      {composeError ? (
        <p className="pt-1.5 text-[11px] text-rose-600">{composeError}</p>
      ) : null}
    </form>
  ) : composeDisabledReason ? (
    <p className="mt-2 px-0.5 text-xs" style={{ color: IT_COLOR.textMuted }}>{composeDisabledReason}</p>
  ) : null;

  const threadItems = [];
  (visibleEntries || []).forEach((entry, index) => {
    const day = chatDayKey(entry.dateTime || entry.timestamp);
    const prev = index > 0 ? visibleEntries[index - 1] : null;
    const prevDay = prev ? chatDayKey(prev.dateTime || prev.timestamp) : '';
    if (day && day !== prevDay) {
      threadItems.push({ type: 'day', key: `day-${day}-${index}`, label: formatChatDayLabel(entry.dateTime) });
    }
    threadItems.push({ type: 'message', entry, index });
  });

  return (
    <div
      className="space-y-2 py-0.5"
      data-stop-row-nav
      onClick={(e) => e.stopPropagation()}
    >
      {identity}
      <div
        ref={threadRef}
        className="relative max-h-[min(36rem,68vh)] overflow-y-auto overflow-x-visible rounded-xl border border-slate-200 px-2.5 py-3 sm:px-3"
        style={{ backgroundColor: '#f8fafc' }}
      >
        <span
          className="pointer-events-none absolute inset-y-3 left-1/2 hidden w-px -translate-x-1/2 bg-[#e2e8f0] lg:block"
          aria-hidden
        />
        {refreshing ? (
          <div className="relative z-[1] min-h-[8rem]" aria-busy="true" aria-label="Loading comments" />
        ) : visibleEntries?.length ? threadItems.map((item) => {
          if (item.type === 'day') {
            return (
              <div key={item.key} className="relative z-[1] my-3 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#e2e8f0]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {item.label}
                </span>
                <span className="h-px flex-1 bg-[#e2e8f0]" />
              </div>
            );
          }
          const { entry, index } = item;
          const isEmployee = entry.role === 'employee';
          const isReopen = entry.role === 'reopen';
          const displayName = entry.userName
            || (isEmployee || isReopen ? 'Employee' : 'IT Agent');
          const mine = commentAuthorsMatch(displayName, currentUserName)
            || commentAuthorsMatch(entry.userName, currentUserName);
          const prev = index > 0 ? visibleEntries[index - 1] : null;
          const sameDay = Boolean(prev)
            && chatDayKey(prev.dateTime || prev.timestamp) === chatDayKey(entry.dateTime || entry.timestamp);
          const grouped = Boolean(prev)
            && sameDay
            && commentAuthorsMatch(prev.userName || '', entry.userName || displayName);
          const initials = getPersonInitials(displayName) || (mine ? 'ME' : 'IT');
          const tone = isReopen
            ? { bg: 'bg-amber-100', text: 'text-amber-800' }
            : mine
              ? { bg: 'bg-[#99f6e4]', text: 'text-[#0f766e]' }
              : getPersonAvatarTone(displayName);
          const role = splitCommentChannels ? '' : chatRoleLabel(entry.role);
          return (
            <div
              key={`${entry.recordId || entry.role}-${entry.timestamp}-${index}`}
              className={`relative z-[1] flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'} ${grouped ? 'mt-1' : 'mt-3 first:mt-0'}`}
            >
              {grouped ? (
                <span className="h-7 w-7 shrink-0" aria-hidden />
              ) : (
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold ${tone.bg} ${tone.text}`}
                  aria-hidden
                >
                  {initials}
                </span>
              )}
              <div className={`min-w-0 max-w-[92%] max-[640px]:max-w-full sm:max-w-[80%] ${mine ? 'text-right' : 'text-left'}`}>
                {!grouped ? (
                  <p className="mb-1 px-0.5 text-[11px] font-semibold" style={{ color: IT_COLOR.textMuted }}>
                    {displayName}
                    {role ? <span className="font-medium"> · {role}</span> : null}
                  </p>
                ) : null}
                <div
                  className={`px-3 py-2 text-left shadow-sm ${
                    mine
                      ? 'rounded-xl border-r-4'
                      : isReopen
                        ? 'rounded-xl border border-amber-200 bg-amber-50 border-l-4 border-l-amber-400'
                        : 'rounded-xl border border-slate-200 bg-white border-l-4 border-l-slate-400'
                  }`}
                  style={mine ? {
                    backgroundColor: IT_BRAND.primaryDark,
                    borderRightColor: IT_BRAND.border,
                  } : undefined}
                >
                  <p
                    className="break-words whitespace-pre-wrap text-sm leading-snug"
                    style={{ color: mine ? '#ffffff' : IT_COLOR.textPrimary }}
                  >
                    {entry.comment}
                  </p>
                  {Array.isArray(entry.attachments) && entry.attachments.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5" data-stop-row-nav onPointerDown={(event) => event.stopPropagation()}>
                      {entry.attachments.map((file, fileIdx) => (
                        <CommentAttachmentView
                          key={`${file?.id || file?.key || file?.name || fileIdx}`}
                          file={file}
                          mine={mine}
                          index={fileIdx}
                        />
                      ))}
                    </div>
                  ) : null}
                  {isEmployee ? <StarRating value={entry.rating} compact /> : null}
                </div>
                {entry.dateTime ? (
                  <p className="mt-1 px-0.5 text-[10px] leading-none" style={{ color: IT_COLOR.textMuted }}>
                    {formatDisplayDateTime(entry.dateTime)}
                  </p>
                ) : null}
              </div>
            </div>
          );
        }) : (
          <div className="relative z-[1] flex flex-col items-center px-2 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium" style={{ color: IT_COLOR.textPrimary }}>No comments yet</p>
            <p className="mt-1 max-w-xs text-xs" style={{ color: IT_COLOR.textMuted }}>
              {canCompose
                ? 'Write a comment to start the conversation.'
                : 'Comments will appear here as a conversation.'}
            </p>
          </div>
        )}
      </div>
      {composer}
    </div>
  );
}

export function MisRequestTrackingPanel({ entries = [] }) {
  if (!entries?.length) {
    return (
      <div className={`${itAccordionShell()} flex flex-col items-center px-4 py-10 text-center`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Activity className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-slate-600">No activity history yet</p>
      </div>
    );
  }

  return (
    <div className={`${itAccordionShell()} p-4 sm:p-5`}>
      <ol className="space-y-0">
        {entries.map((entry, idx) => (
          <li key={entry.id || `${entry.status}-${idx}`} className="relative flex gap-3 pb-5 last:pb-0 sm:gap-4">
            {idx < entries.length - 1 ? (
              <span className="absolute left-[13px] top-8 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[#0d9488]/40 to-slate-200" aria-hidden />
            ) : null}
            <span className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#0d9488]/10 shadow-sm ring-1 ring-[#0d9488]/20">
              <span className="h-2 w-2 rounded-full bg-[#0d9488]" />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${trackingStatusTone(entry.status)}`}>
                  {entry.status}
                </span>
                {entry.dateTime && entry.dateTime !== '—' ? (
                  <span className="text-xs text-slate-400">{entry.dateTime}</span>
                ) : null}
              </div>
              {entry.comments ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{entry.comments}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MisExpandTabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div
      className="flex max-w-full items-center gap-1 overflow-x-auto border-b border-slate-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTabChange(tab.key);
            }}
            className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold transition sm:px-3.5 sm:text-sm ${
              active
                ? 'text-[#0f766e]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${active ? 'text-[#0f766e]' : 'text-slate-400'}`} />
            <span className="whitespace-nowrap">{tab.label}</span>
            {active ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#0d9488]" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function MisTabbedExpandShell({
  overview,
  workflow,
  resolutionHistory,
  revisionCount = null,
  persistKey = '',
  defaultTab = 'overview',
  showCommentsTab = true,
}) {
  void revisionCount;
  const key = String(persistKey || '');
  const [activeTab, handleTabChange] = usePersistedMisExpandTab(key, defaultTab);
  const emptyHistory = useMemo(() => <MisResolutionHistoryPanel entries={[]} />, []);
  const historyPanel = showCommentsTab === false
    ? null
    : (resolutionHistory == null ? emptyHistory : resolutionHistory);
  const panels = useMemo(
    () => ({ overview, resolutionHistory: historyPanel }),
    [overview, historyPanel],
  );
  const visibleTabs = useMemo(
    () => [OVERVIEW_TAB, RESOLUTION_HISTORY_TAB].filter((tab) => panels[tab.key] != null),
    [panels],
  );
  const hasWorkflow = Boolean(workflow);
  const safeActiveTab = panels[activeTab] ? activeTab : (visibleTabs[0]?.key || defaultTab);

  useEffect(() => {
    if (safeActiveTab === activeTab) return;
    handleTabChange(safeActiveTab);
  }, [safeActiveTab, activeTab, handleTabChange]);

  return (
    <div className={`${itExpandPanelShell()} px-3 py-4 sm:px-5 sm:py-5`}>
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0d9488]/35 to-transparent"
        aria-hidden
      />

      <div className="mb-4">
        <MisExpandTabBar tabs={visibleTabs} activeTab={safeActiveTab} onTabChange={handleTabChange} />
      </div>

      <div className={`grid items-start gap-4 ${hasWorkflow ? 'lg:grid-cols-12 lg:items-stretch lg:gap-5' : ''}`}>
        <div className={`min-w-0 ${hasWorkflow ? 'lg:col-span-7 xl:col-span-8' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={safeActiveTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {panels[safeActiveTab]}
            </motion.div>
          </AnimatePresence>
        </div>

        {hasWorkflow ? (
          <aside className="min-w-0 lg:col-span-5 xl:col-span-4">
            <div className="h-full lg:sticky lg:top-3">
              {workflow}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
