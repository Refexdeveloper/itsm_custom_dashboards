import { useEffect, useRef } from 'react';
import { TICKET_STATUS } from './constants.js';
import { canSubmitEmployeeFeedback } from './employeeFeedbackApi.js';
import {
  getEmployeeDisplayStatus,
  hasEmployeeSubmittedFeedback,
  isProcessCompleted,
  isReopenedTicket,
} from './employeeStatus.js';
import { getFeedbackExpiryMs, isFeedbackExpired } from './feedbackTime.js';

function ticketGuardKey(row) {
  return `${row?.id || ''}:${row?.employeeTaskActivityInstanceId || ''}`;
}

/**
 * On refresh, open Feedback Required dialog for the oldest expired Employee Feedback
 * ticket with missing feedback/rating — one at a time, employee task owner only.
 */
export function useEmployeeFeedbackExpiredPrompt(rows, {
  onPrompt,
  dialogOpen = false,
  loading = false,
} = {}) {
  const promptedRef = useRef(new Set());
  const onPromptRef = useRef(onPrompt);
  onPromptRef.current = onPrompt;

  useEffect(() => {
    if (loading || dialogOpen) return undefined;

    const safeRows = Array.isArray(rows) ? rows : [];
    const candidates = safeRows
      .filter((row) => {
        if (getEmployeeDisplayStatus(row) !== TICKET_STATUS.EmployeeFeedback) return false;
        if (isProcessCompleted(row)) return false;
        if (isReopenedTicket(row)) return false;
        if (!canSubmitEmployeeFeedback(row)) return false;
        if (!isFeedbackExpired(row)) return false;
        if (!hasEmployeeSubmittedFeedback(row)) return false;
        const key = ticketGuardKey(row);
        if (!key || promptedRef.current.has(key)) return false;
        return true;
      })
      .sort((a, b) => (getFeedbackExpiryMs(a) || 0) - (getFeedbackExpiryMs(b) || 0));

    if (!candidates.length) return undefined;

    const row = candidates[0];
    const key = ticketGuardKey(row);
    if (!key) return undefined;

    promptedRef.current.add(key);
    onPromptRef.current?.(row);

    return undefined;
  }, [rows, loading, dialogOpen]);
}
