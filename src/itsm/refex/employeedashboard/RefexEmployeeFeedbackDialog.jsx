import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, RotateCcw, X } from 'lucide-react';
import { IT_TYPE } from '../../../components/it/itDesignTokens.js';
import { StarRating } from './tableHelpers.jsx';

export default function RefexEmployeeFeedbackDialog({
  open,
  mode = 'feedback',
  row,
  onClose,
  onSubmitFeedback,
  onReopen,
  onSubmitExpired,
}) {
  const [comments, setComments] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setComments('');
    setRating(0);
    setError('');
    setSubmitting(false);
  }, [open, mode, row?.id]);

  if (!open || !row) return null;

  const isReopen = mode === 'reopen';
  const isExpired = mode === 'expired';
  const title = isReopen
    ? 'Reopen Ticket'
    : isExpired
      ? 'Feedback Required'
      : 'Provide Feedback';
  const requestId = row.requestId || '—';

  const handleSubmit = async () => {
    setError('');
    if (isReopen) {
      if (!comments.trim()) {
        setError('Reopen reason is required');
        return;
      }
    } else {
      if (rating <= 0) {
        setError('Please select a rating');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = isReopen
        ? { comments: comments.trim() }
        : { comments: comments.trim(), ratings: rating };
      if (isReopen) {
        await onReopen?.(payload);
      } else if (isExpired) {
        await onSubmitExpired?.(payload);
      } else {
        await onSubmitFeedback?.(payload);
      }
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Unable to save feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-3 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-feedback-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0 pr-3">
            <h2 id="employee-feedback-title" className={IT_TYPE.sectionTitle}>{title}</h2>
            <p className={`mt-1 ${IT_TYPE.meta} text-slate-500`}>
              {isExpired ? requestId : `${isReopen ? 'Reopen' : 'Feedback for'} ${requestId}`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {isExpired ? (
            <p className={`${IT_TYPE.body} text-slate-600`}>
              The 48-hour reopen period has ended. Please provide your feedback and rating to complete this ticket.
            </p>
          ) : null}

          <label className="block">
            <span className={`mb-1.5 block ${IT_TYPE.label}`}>
              {isReopen ? 'Reopen Reason' : 'Feedback'}
              {isReopen ? <span className="text-red-500"> *</span> : <span className="text-slate-400"> (optional)</span>}
            </span>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              placeholder={isReopen ? 'Describe why the issue is not resolved…' : 'Share your verification feedback…'}
              className={`w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 ${IT_TYPE.body} focus:border-[var(--it-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--it-brand-rgb),0.20)]`}
            />
          </label>

          {!isReopen ? (
            <div>
              <span className={`mb-1.5 block ${IT_TYPE.label}`}>Rating <span className="text-red-500">*</span></span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    onClick={() => setRating(value)}
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
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className={`${IT_TYPE.body} text-red-600`}>{error}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={`min-h-10 rounded-xl border border-slate-200 px-4 py-2 ${IT_TYPE.body} text-slate-700 hover:bg-slate-50`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (isReopen ? !comments.trim() : rating <= 0)}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--it-brand-primary)] px-4 py-2 ${IT_TYPE.body} font-semibold text-white hover:bg-[var(--it-brand-dark)] disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isReopen ? (
              <>
                <RotateCcw className="h-4 w-4" />
                Reopen
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
