/**
 * Shared MIS expand panel primitives — Overview (+ merged details) / Resolution History + Workflow rail.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, FileText, Paperclip, Activity, AlignLeft, Lightbulb, History,
} from 'lucide-react';
import { itAccordionShell, itExpandPanelShell, IT_TYPE } from '../itDesignTokens.js';
import { formatDisplayDateTime, resolveAttachmentUrl } from '../../../lib/kfITServiceDashboard.js';
import { StarRating } from '../../../itsm/refex/employeedashboard/tableHelpers.jsx';

const OVERVIEW_TAB = { key: 'overview', label: 'Overview', icon: LayoutGrid };

const RESOLUTION_HISTORY_TAB = { key: 'resolutionHistory', label: 'Revisions', icon: History };

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
  'Implementation Plan',
  'Backout Plan',
  'Test Plan',
  'Reason for Pending',
  'Reason for Hold',
  'Cancellation Reason',
]);

const RICH_TEXT_ICONS = {
  Description: AlignLeft,
  Solution: Lightbulb,
  Summary: FileText,
};

export function visibleMisTiles(tiles) {
  return (tiles || []).filter((t) => t?.value && t.value !== '—');
}

function splitTiles(tiles) {
  const rich = [];
  const meta = [];
  for (const tile of tiles || []) {
    const multiline = tile.multiline || RICH_TEXT_LABELS.has(tile.label);
    if (multiline && RICH_TEXT_LABELS.has(tile.label)) rich.push(tile);
    else meta.push(tile);
  }
  return { rich, meta };
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
      {blocks.map(({ label, value }, index) => {
        const Icon = RICH_TEXT_ICONS[label] || FileText;
        return (
          <section key={label} className={index > 0 ? 'border-t border-slate-100' : ''}>
            <header className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-[#f0fdfa]/80 to-white px-4 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">{label}</p>
            </header>
            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{value}</p>
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

export function MisDocumentsInline({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className={`${itAccordionShell()} p-3 sm:p-4 sm:col-span-full`}>
      <p className={`mb-2.5 ${IT_TYPE.label}`}>Supporting Documents</p>
      <ul className="space-y-2">
        {attachments.map((file) => {
          const url = resolveAttachmentUrl(file);
          const name = file?.name || 'file';
          const content = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
                <Paperclip className="h-4 w-4" />
              </span>
              <span className="truncate font-medium">{name}</span>
            </>
          );
          return (
            <li key={file?.id || file?.name}>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition-colors hover:border-[#99f6e4] hover:bg-[#f0fdfa]/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  {content}
                </a>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
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

export function MisResolutionHistoryPanel({ entries = [] }) {
  if (!entries?.length) {
    return (
      <div className={`${itAccordionShell()} flex flex-col items-center px-4 py-10 text-center`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <History className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-slate-600">No revisions yet</p>
      </div>
    );
  }

  const count = entries.length;

  return (
    <div className="space-y-2 py-0.5">
      <p className={`px-0.5 pb-1 ${IT_TYPE.label}`}>
        Revisions (
        {count}
        )
      </p>
      {entries.map((entry, index) => {
        const isEmployee = entry.role === 'employee';
        const isReopen = entry.role === 'reopen';
        const roleLabel = isReopen
          ? 'Reopen Comment'
          : (isEmployee ? 'Employee Feedback' : 'Tech Support Resolution');
        const alignEnd = isEmployee || isReopen;
        return (
          <div
            key={`${entry.recordId || entry.role}-${entry.timestamp}-${index}`}
            className={`flex ${alignEnd ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`w-full max-w-[92%] sm:max-w-[68%] ${alignEnd ? 'text-right' : 'text-left'}`}>
              <p className={`mb-0.5 ${IT_TYPE.label}`}>
                {roleLabel}
              </p>
              <div
                className={`rounded-lg border px-2.5 py-1.5 shadow-sm sm:px-3 ${
                  isReopen
                    ? 'border-amber-100 bg-amber-50/70 text-left'
                    : isEmployee
                      ? 'border-violet-100 bg-violet-50/70 text-left'
                      : 'border-sky-100 bg-sky-50/70'
                }`}
              >
                <p className={`${IT_TYPE.body} font-semibold leading-snug text-slate-800`}>{entry.userName}</p>
                <p className={`mt-1 whitespace-pre-wrap ${IT_TYPE.body} leading-snug`}>{entry.comment}</p>
                {isEmployee ? <StarRating value={entry.rating} compact /> : null}
                {entry.dateTime ? (
                  <p className={`mt-1 ${IT_TYPE.meta}`}>{formatDisplayDateTime(entry.dateTime)}</p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
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
      className="inline-flex max-w-full overflow-x-auto rounded-full border border-slate-200/90 bg-slate-100/80 p-1 shadow-inner shadow-slate-200/30 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              e.stopPropagation();
              onTabChange(tab.key);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
              active
                ? 'bg-gradient-to-r from-[#0d9488] to-[#059669] text-white shadow-md shadow-[#0d9488]/25'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-800'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${active ? 'text-white' : 'text-slate-500'}`} />
            <span className="whitespace-nowrap">{tab.label}</span>
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
}) {
  const key = String(persistKey || '');
  const [activeTab, handleTabChange] = usePersistedMisExpandTab(key, defaultTab);
  // Always expose Revisions — empty state is handled by MisResolutionHistoryPanel.
  const emptyHistory = useMemo(() => <MisResolutionHistoryPanel entries={[]} />, []);
  const historyPanel = resolutionHistory == null ? emptyHistory : resolutionHistory;
  const panels = useMemo(
    () => ({ overview, resolutionHistory: historyPanel }),
    [overview, historyPanel],
  );
  const historyTab = useMemo(() => {
    if (typeof revisionCount === 'number' && revisionCount > 0) {
      return { ...RESOLUTION_HISTORY_TAB, label: `Revisions (${revisionCount})` };
    }
    return RESOLUTION_HISTORY_TAB;
  }, [revisionCount]);
  const visibleTabs = useMemo(
    () => [OVERVIEW_TAB, historyTab].filter((tab) => panels[tab.key] != null),
    [panels, historyTab],
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
