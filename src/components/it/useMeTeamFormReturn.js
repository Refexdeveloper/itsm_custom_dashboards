import { useCallback, useEffect, useRef } from 'react';
import {
  peekFormReturnView,
  releaseFormReturnView,
  writeFormReturnView,
} from './refexManagerFormReturnView.js';

/**
 * Save Me / My Team before a ticket form opens, and clear that saved view
 * after Back has restored it. Does not change Me matchers or landing fetches.
 */
export function useMeTeamFormReturn({
  formReturnKey = '',
  scope = 'me',
  serviceTab = '',
  getEditRecordCellProps,
}) {
  const viewRef = useRef({ scope: 'me', serviceTab: '' });
  const openingRef = useRef(false);
  const releaseTimerRef = useRef(0);
  if (formReturnKey) {
    viewRef.current = { scope, serviceTab };
  }

  useEffect(() => {
    if (!formReturnKey) return undefined;
    const hadViewOnMount = Boolean(peekFormReturnView(formReturnKey));
    const timerId = hadViewOnMount
      ? window.setTimeout(() => releaseFormReturnView(formReturnKey), 4000)
      : 0;
    return () => {
      if (timerId) window.clearTimeout(timerId);
      window.clearTimeout(releaseTimerRef.current);
      if (!hadViewOnMount && !openingRef.current) {
        releaseFormReturnView(formReturnKey);
      }
    };
  }, [formReturnKey]);

  const scheduleRelease = useCallback(() => {
    if (!formReturnKey) return;
    window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => {
      if (!openingRef.current) return;
      openingRef.current = false;
      releaseFormReturnView(formReturnKey);
    }, 2500);
  }, [formReturnKey]);

  const getFormEditProps = useCallback((queueType) => {
    const props = getEditRecordCellProps(queueType);
    if (!formReturnKey) return props;
    const rememberView = props.onBeforeEdit;
    const afterOpen = props.onAfterEditComplete;
    return {
      ...props,
      onBeforeEdit: (row) => {
        writeFormReturnView(formReturnKey, viewRef.current);
        openingRef.current = true;
        if (typeof rememberView === 'function') rememberView(row);
      },
      onAfterEditComplete: (openResult) => {
        if (typeof afterOpen === 'function') afterOpen(openResult);
        scheduleRelease();
      },
    };
  }, [getEditRecordCellProps, formReturnKey, scheduleRelease]);

  /**
   * Create Ticket / "+" menu pages leave the dashboard the same way a row form
   * does, so Back must restore the same Me / My Team view.
   */
  const withFormReturn = useCallback((openPage) => (...args) => {
    if (formReturnKey) {
      writeFormReturnView(formReturnKey, viewRef.current);
      openingRef.current = true;
    }
    const result = openPage(...args);
    Promise.resolve(result).catch(() => {}).finally(scheduleRelease);
    return result;
  }, [formReturnKey, scheduleRelease]);

  return { getFormEditProps, withFormReturn };
}
