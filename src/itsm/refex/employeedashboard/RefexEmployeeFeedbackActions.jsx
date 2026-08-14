import { useState } from 'react';
import { Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { IT_TYPE, itBtnPrimary } from '../../../components/it/itDesignTokens.js';
import { StarRating } from './tableHelpers.jsx';
import { canShowEmployeeFeedbackActions, hasEmployeeSubmittedFeedback } from './employeeStatus.js';
import { TICKET_STATUS } from './constants.js';

function RatingField({ rating, onChange, id }) {
  return (
    <div>
      <span className={`mb-1.5 block ${IT_TYPE.label}`} id={id}>
        Rating <span className="text-red-500">*</span>
      </span>
      <div className="flex items-center gap-1" role="group" aria-labelledby={id}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} star${value > 1 ? 's' : ''}`}
            onClick={() => onChange(value)}
            className="rounded p-1 text-2xl leading-none text-amber-500 transition hover:scale-105"
          >
            {value <= rating ? '★' : '☆'}
          </button>
        ))}
      </div>
      {rating > 0 ? (
        <p className={`mt-1 ${IT_TYPE.meta} text-slate-500`}>
          <StarRating value={rating} compact />
        </p>
      ) : (
        <p className={`mt-1 ${IT_TYPE.meta} text-amber-700`}>Please select a rating</p>
      )}
    </div>
  );
}

/** Inline feedback / reopen actions shown directly below ticket details. */
export default function RefexEmployeeFeedbackActions({
  row,
  user,
  displayStatus,
  onSubmitFeedback,
  onReopen,
  feedbackExpired = false,
}) {
  const [comments, setComments] = useState('');
  const [rating, setRating] = useState(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [submittingReopen, setSubmittingReopen] = useState(false);
  const [error, setError] = useState('');

  if (!row || feedbackExpired) return null;
  if (!canShowEmployeeFeedbackActions(row, user) && displayStatus !== TICKET_STATUS.EmployeeFeedback) {
    return null;
  }

  const hasSubmitted = hasEmployeeSubmittedFeedback(row);

  const validateFeedback = () => {
    if (rating <= 0) return 'Please select a rating';
    return '';
  };

  const validateReopen = () => {
    if (!comments.trim()) return 'Reopen reason is required';
    return '';
  };

  const handleSubmitFeedback = async () => {
    const msg = validateFeedback();
    setError(msg);
    if (msg) return;
    setSubmittingFeedback(true);
    try {
      await onSubmitFeedback?.({ comments: comments.trim(), ratings: rating });
      setComments('');
      setRating(0);
      setError('');
    } catch (err) {
      setError(err?.message || 'Unable to save feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReopen = async () => {
    const msg = validateReopen();
    setError(msg);
    if (msg) return;
    setSubmittingReopen(true);
    try {
      await onReopen?.({ comments: comments.trim() });
      setComments('');
      setRating(0);
      setError('');
    } catch (err) {
      setError(err?.message || 'Unable to reopen ticket');
    } finally {
      setSubmittingReopen(false);
    }
  };

  const busy = submittingFeedback || submittingReopen;

  if (hasSubmitted) {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" data-stop-row-nav>
        <div className="mb-3 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-amber-600" aria-hidden />
          <h3 className={`${IT_TYPE.body} font-semibold text-slate-800`}>Reopen Ticket</h3>
        </div>
        <div className="min-w-0">
          <label className="block">
            <span className={`mb-1.5 block ${IT_TYPE.label}`}>
              Reopen Reason <span className="text-red-500">*</span>
            </span>
            <textarea
              value={comments}
              onChange={(e) => { setComments(e.target.value); setError(''); }}
              rows={3}
              placeholder="Explain why you are reopening this ticket…"
              className={`w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 ${IT_TYPE.body} focus:border-[var(--it-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--it-brand-rgb),0.20)]`}
            />
          </label>
          {error ? (
            <p className={`mt-2 ${IT_TYPE.body} text-red-600`}>{error}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleReopen}
              disabled={busy || !comments.trim()}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border-0 bg-amber-600 px-5 text-sm font-semibold text-white shadow-md shadow-amber-600/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingReopen ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reopen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" data-stop-row-nav>
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[var(--it-brand-primary)]" aria-hidden />
        <h3 className={`${IT_TYPE.body} font-semibold text-slate-800`}>Employee Feedback</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
        <div>
          <RatingField
            id="employee-feedback-rating"
            rating={rating}
            onChange={(value) => { setRating(value); setError(''); }}
          />
        </div>

        <div className="min-w-0">
          <label className="block">
            <span className={`mb-1.5 block ${IT_TYPE.label}`}>
              Feedback / Comment <span className="text-slate-400">(optional)</span>
            </span>
            <textarea
              value={comments}
              onChange={(e) => { setComments(e.target.value); setError(''); }}
              rows={3}
              placeholder="Share your feedback (optional)…"
              className={`w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 ${IT_TYPE.body} focus:border-[var(--it-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--it-brand-rgb),0.20)]`}
            />
          </label>

          {error ? (
            <p className={`mt-2 ${IT_TYPE.body} text-red-600`}>{error}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={busy || rating <= 0}
              className={itBtnPrimary('min-h-9 gap-2 px-5 shadow-lg shadow-[#0d9488]/25')}
            >
              {submittingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Feedback
            </button>
            <button
              type="button"
              onClick={handleReopen}
              disabled={busy || !comments.trim()}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-amber-200 bg-white px-5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingReopen ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reopen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
