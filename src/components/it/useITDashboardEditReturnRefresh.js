import { useCallback, useEffect, useRef } from 'react';
import {
  clearITDashboardPendingRefresh,
  createFormReturnRefreshScheduler,
  getITDashboardPendingRefreshAgeMs,
  hasITDashboardPendingRefresh,
  hasITDashboardPendingRefreshAsync,
  markITDashboardPendingRefresh,
} from './itDashboardFormReturnRefresh.js';

const POLL_MS = 1500;
const MAX_POLL_ATTEMPTS = 120;
const MIN_RETURN_AGE_MS = 2000;

function isEditNavigationComplete(openResult) {
  return openResult === true || openResult === 'page';
}

/** Refresh dashboard data after Edit opens a Kissflow form (openPage or URL navigation). */
export function useITDashboardEditReturnRefresh(kfInstance, requestRefresh) {
  const schedulerRef = useRef(null);
  const pollAttemptsRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    schedulerRef.current = createFormReturnRefreshScheduler(requestRefresh);
    return () => schedulerRef.current?.cancel();
  }, [requestRefresh]);

  const refreshAfterFormReturn = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    pollAttemptsRef.current = 0;
    clearITDashboardPendingRefresh(kfInstance);
    schedulerRef.current?.trigger();
    window.setTimeout(() => {
      refreshingRef.current = false;
    }, 3000);
  }, [kfInstance]);

  const tryConsumePendingRefresh = useCallback(async (options = {}) => {
    const { force = false } = options;
    const pending = hasITDashboardPendingRefresh()
      || await hasITDashboardPendingRefreshAsync(kfInstance);
    if (!pending) {
      pollAttemptsRef.current = 0;
      return;
    }
    if (!force && getITDashboardPendingRefreshAgeMs() < MIN_RETURN_AGE_MS) return;
    refreshAfterFormReturn();
  }, [kfInstance, refreshAfterFormReturn]);

  useEffect(() => {
    tryConsumePendingRefresh();

    const onAppReturn = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      tryConsumePendingRefresh();
    };

    const onParentMessage = () => {
      tryConsumePendingRefresh();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', onAppReturn);
      window.addEventListener('focus', onAppReturn, true);
      window.addEventListener('message', onParentMessage);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onAppReturn);
    }

    const pollId = window.setInterval(() => {
      if (!hasITDashboardPendingRefresh()) {
        pollAttemptsRef.current = 0;
        return;
      }
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        clearITDashboardPendingRefresh(kfInstance);
        pollAttemptsRef.current = 0;
        return;
      }
      tryConsumePendingRefresh();
    }, POLL_MS);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pageshow', onAppReturn);
        window.removeEventListener('focus', onAppReturn, true);
        window.removeEventListener('message', onParentMessage);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onAppReturn);
      }
      window.clearInterval(pollId);
    };
  }, [kfInstance, tryConsumePendingRefresh]);

  useEffect(() => {
    if (!kfInstance?.context?.watchParams) return undefined;
    kfInstance.context.watchParams(() => {
      tryConsumePendingRefresh();
    });
  }, [kfInstance, tryConsumePendingRefresh]);

  const onBeforeEdit = useCallback(() => {
    markITDashboardPendingRefresh(kfInstance);
  }, [kfInstance]);

  const onAfterEditComplete = useCallback((openResult) => {
    if (!isEditNavigationComplete(openResult)) return;
    tryConsumePendingRefresh({ force: true });
  }, [tryConsumePendingRefresh]);

  const onEditOpenFailed = useCallback(() => {
    clearITDashboardPendingRefresh(kfInstance);
  }, [kfInstance]);

  return {
    onBeforeEdit,
    onAfterEditComplete,
    onEditOpenFailed,
  };
}
