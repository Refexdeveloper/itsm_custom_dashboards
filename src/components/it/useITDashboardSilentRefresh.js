import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * First dashboard load uses the full loading overlay; subsequent reloads
 * (manual Refresh or Kissflow watchParams after closing a form) run silently.
 * Entity / extra-deps switches always use the full center loader so users see
 * that the dashboard is reloading.
 *
 * requestRefresh({ background: true }) — no loading/refreshing UI, keeps server page.
 */
export function useITDashboardSilentRefresh(kfInstance, loadDashboardFn, extraDeps = []) {
  const [refreshTick, setRefreshTick] = useState(0);
  const hasLoadedOnceRef = useRef(false);
  const refreshOptionsRef = useRef({});
  const prevExtraKeyRef = useRef(null);

  const requestRefresh = useCallback((options = {}) => {
    refreshOptionsRef.current = options;
    setRefreshTick((n) => n + 1);
  }, []);

  const loadGenerationRef = useRef(0);

  useEffect(() => {
    const options = refreshOptionsRef.current;
    refreshOptionsRef.current = {};
    const extraKey = JSON.stringify(extraDeps);
    const extraDepsChanged = prevExtraKeyRef.current != null
      && prevExtraKeyRef.current !== extraKey;
    prevExtraKeyRef.current = extraKey;

    // Entity (and other scoped deps) changes must show the center loader.
    const silent = hasLoadedOnceRef.current
      && !extraDepsChanged
      && !options.force
      && options.silent !== false;

    const generation = ++loadGenerationRef.current;
    let cancelled = false;
    const isStale = () => cancelled || generation !== loadGenerationRef.current;

    (async () => {
      const result = await loadDashboardFn({ silent, ...options, isStale });
      const didLoad = result?.didLoad;
      if (!isStale() && didLoad !== false) hasLoadedOnceRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extraDeps supplied by caller
  }, [loadDashboardFn, refreshTick, ...extraDeps]);

  useEffect(() => {
    if (!kfInstance?.context?.watchParams) return undefined;
    return kfInstance.context.watchParams(() => requestRefresh({ background: true }));
  }, [kfInstance, requestRefresh]);

  return { refreshTick, requestRefresh, setRefreshTick };
}
