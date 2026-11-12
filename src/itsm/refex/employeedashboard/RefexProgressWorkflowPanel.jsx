import { Check, ChevronRight, GitBranch, X } from 'lucide-react';
import { formatDisplayDateTime } from '../../../lib/kfITServiceDashboard.js';
import { IT_TYPE } from '../../../components/it/itDesignTokens.js';
import { isItsmBotName } from './progressApi.js';

function formatDateTime(value) {
  if (!value) return '';
  return formatDisplayDateTime(value);
}

function statusToken(status) {
  return String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
}

function isRejectedStatus(status) {
  const token = statusToken(status);
  return token === 'rejected' || token === 'reject' || token === 'declined';
}

function isCompletedStatus(status) {
  const token = statusToken(status);
  return token === 'completed' || token === 'complete' || token === 'closed';
}

function stepStatusTone(status) {
  const token = String(status || '').toLowerCase();
  if (isRejectedStatus(status)) return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (token === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (token === 'inprogress' || token === 'open') return 'bg-sky-50 text-sky-700 ring-sky-200';
  if (token === 'sentback') return 'bg-orange-50 text-orange-700 ring-orange-200';
  return 'bg-slate-50 text-slate-700 ring-slate-200';
}

function WorkflowStepIcon({ node }) {
  if (node.isRejected || isRejectedStatus(node.status)) {
    return (
      <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 ring-1 ring-rose-200">
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (isCompletedStatus(node.status)) {
    return (
      <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--it-brand-primary)]/10">
      <span className="h-2 w-2 rounded-full bg-[var(--it-brand-primary)]" />
    </span>
  );
}

function WorkflowStepCard({ node, isLast }) {
  const actedLabel = node.actedAt ? formatDateTime(node.actedAt) : '';
  const dueLabel = node.expectedAt ? formatDateTime(node.expectedAt) : '';
  const isReopenHold = node.label === 'Ticket Can be Reopened';
  const rejected = Boolean(node.isRejected || isRejectedStatus(node.status));
  const note = String(node.note || '').trim();

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0 sm:gap-4">
      {!isLast ? (
        <span
          className={`absolute left-[11px] top-7 h-[calc(100%-0.5rem)] w-px ${
            rejected ? 'bg-rose-200' : 'bg-slate-200'
          }`}
          aria-hidden
        />
      ) : null}
      <WorkflowStepIcon node={node} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
            isReopenHold
              ? 'bg-amber-50 text-amber-800 ring-amber-200'
              : stepStatusTone(node.status)
          }`}
          >
            {rejected ? `${node.label} · Rejected` : node.label}
          </span>
          {node.subtitle ? (
            <span className={IT_TYPE.meta}>{node.subtitle}</span>
          ) : null}
        </div>
        {node.actorName && !isItsmBotName(node.actorName) ? (
          <p className={`mt-1.5 ${IT_TYPE.body} font-medium`}>
            {rejected ? `Rejected by ${node.actorName}` : node.actorName}
          </p>
        ) : null}
        {actedLabel ? (
          <p className={`mt-0.5 ${IT_TYPE.meta}`}>{actedLabel}</p>
        ) : null}
        {rejected && note ? (
          <p className="mt-1.5 whitespace-pre-wrap rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium leading-relaxed text-rose-800">
            {note}
          </p>
        ) : null}
        {dueLabel && !isReopenHold && !rejected ? (
          <p className={`mt-0.5 ${IT_TYPE.meta} font-semibold ${node.isOverdue ? 'text-red-600' : ''}`}>
            Due
            {' '}
            {dueLabel}
          </p>
        ) : null}
      </div>
    </li>
  );
}

const KF_CHIP_TONE = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inprogress: 'bg-amber-50 text-amber-800 ring-amber-200',
  open: 'bg-amber-50 text-amber-800 ring-amber-200',
  skipped: 'bg-slate-100 text-slate-600 ring-slate-200',
  notstarted: 'bg-white text-slate-500 ring-slate-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  sentback: 'bg-orange-50 text-orange-700 ring-orange-200',
};

function KissflowStepIcon({ token }) {
  if (token === 'rejected') {
    return (
      <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 ring-1 ring-rose-200">
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (token === 'completed' || token === 'sentback') {
    return (
      <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (token === 'skipped') {
    return (
      <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (token === 'inprogress' || token === 'open') {
    return (
      <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-2 ring-amber-400">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
      </span>
    );
  }
  return (
    <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
    </span>
  );
}

/** Kissflow Status dialog row — step, status chip, actor / assignee, time, reassign notes. */
function KissflowStepCard({ node, isLast }) {
  const token = statusToken(node.status);
  const actedLabel = node.actedAt ? formatDateTime(node.actedAt) : '';
  const dueLabel = node.expectedAt ? formatDateTime(node.expectedAt) : '';
  const muted = token === 'skipped' || token === 'notstarted' || !token;
  const reassignments = Array.isArray(node.reassignments) ? node.reassignments : [];

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0 sm:gap-4">
      {!isLast ? (
        <span className="absolute left-[11px] top-7 h-[calc(100%-0.5rem)] w-px bg-slate-200" aria-hidden />
      ) : null}
      <KissflowStepIcon token={token} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`break-words text-sm font-semibold ${muted ? 'text-slate-500' : 'text-slate-800'}`}>
            {node.label}
          </span>
          {node.statusLabel ? (
            <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
              KF_CHIP_TONE[token] || KF_CHIP_TONE.notstarted
            }`}
            >
              {node.statusLabel}
            </span>
          ) : null}
        </div>
        {node.subtitle ? (
          <p className={`mt-0.5 ${IT_TYPE.meta}`}>{node.subtitle}</p>
        ) : null}
        {node.actorName ? (
          <p className={`mt-1 break-words text-sm ${muted ? 'text-slate-500' : 'font-medium text-slate-700'}`}>
            {node.actorIsAssignee && token !== 'inprogress' && token !== 'open' ? 'Assigned to ' : ''}
            {node.actorName}
          </p>
        ) : null}
        {actedLabel ? (
          <p className={`mt-0.5 ${IT_TYPE.meta}`}>{actedLabel}</p>
        ) : null}
        {dueLabel ? (
          <p className={`mt-0.5 ${IT_TYPE.meta} font-semibold ${node.isOverdue ? 'text-red-600' : ''}`}>
            Due
            {' '}
            {dueLabel}
          </p>
        ) : null}
        {reassignments.map((entry, idx) => (
          <div
            key={`${entry.at || idx}-${entry.to}`}
            className="mt-2 rounded-md border border-sky-100 bg-sky-50 px-2.5 py-2 text-xs leading-relaxed text-sky-900"
          >
            <p className="break-words font-semibold">
              {entry.by || 'Someone'}
              {' reassigned this item'}
              {entry.from ? ` from ${entry.from}` : ''}
              {entry.to ? ` to ${entry.to}` : ''}
              {entry.note ? ' with the following note:' : ''}
            </p>
            {entry.note ? (
              <p className="mt-0.5 whitespace-pre-wrap break-words">{entry.note}</p>
            ) : null}
            {entry.at ? (
              <p className="mt-1 text-[11px] text-sky-700">{formatDateTime(entry.at)}</p>
            ) : null}
          </div>
        ))}
        {node.note ? (
          <p className={`mt-1.5 whitespace-pre-wrap break-words rounded-md border px-2.5 py-1.5 text-xs font-medium leading-relaxed ${
            token === 'rejected'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
          >
            {node.note}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function WorkflowTransition({ label, actedAt = null }) {
  const actedLabel = actedAt ? formatDateTime(actedAt) : '';
  return (
    <li className="relative flex gap-3 py-0.5 sm:gap-4">
      <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="h-px w-3 bg-slate-200" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
          {label}
        </span>
        {actedLabel ? (
          <p className={`mt-1 ${IT_TYPE.meta}`}>{actedLabel}</p>
        ) : null}
      </div>
    </li>
  );
}

/** Revised markers — compact, left-aligned with the workflow rail. */
function WorkflowRevisedMarker({ label, actedAt = null }) {
  const actedLabel = actedAt ? formatDateTime(actedAt) : '';
  return (
    <li className="relative flex gap-3 py-0.5 sm:gap-4">
      <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="h-px w-3 bg-slate-200" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700">
          {label}
        </span>
        {actedLabel ? (
          <p className={`mt-1 ${IT_TYPE.meta}`}>{actedLabel}</p>
        ) : null}
      </div>
    </li>
  );
}

export default function RefexProgressWorkflowPanel({
  journey = [],
  loading = false,
  error = '',
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-5 text-center text-sm text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  if (!journey.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
        No workflow steps available.
      </div>
    );
  }

  const stepNodes = journey.filter((node) => node.type !== 'transition' && node.type !== 'revised');
  let stepCounter = 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      <div className="mb-3 flex items-center gap-1.5">
        <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--it-brand-primary)]" />
        <span className={IT_TYPE.label}>Workflow Steps</span>
      </div>
      <ol className="space-y-0">
        {journey.map((node, index) => {
          if (node.type === 'revised') {
            return (
              <WorkflowRevisedMarker
                key={`revised-${node.label}-${index}`}
                label={node.label}
                actedAt={node.actedAt}
              />
            );
          }
          if (node.type === 'transition') {
            return (
              <WorkflowTransition
                key={`transition-${node.label}-${index}`}
                label={node.label}
                actedAt={node.actedAt}
              />
            );
          }
          stepCounter += 1;
          if (node.kissflow) {
            return (
              <KissflowStepCard
                key={`${node.id || node.label}-${index}`}
                node={node}
                isLast={stepCounter >= stepNodes.length}
              />
            );
          }
          return (
            <WorkflowStepCard
              key={`${node.id || node.label}-${index}`}
              node={node}
              isLast={stepCounter >= stepNodes.length}
            />
          );
        })}
      </ol>
    </div>
  );
}
