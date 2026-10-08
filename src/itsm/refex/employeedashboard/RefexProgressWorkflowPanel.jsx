import { Check, GitBranch, X } from 'lucide-react';
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
