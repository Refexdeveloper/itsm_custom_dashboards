import { useEffect, useState } from 'react';
import { kfGetJson, resolveKissflowAccountId } from './kfRuntime.js';
import { readKissflowSessionUser, readViewerDesignation } from './neGcpDashboardMath.js';

/**
 * Display-only job title for the greeting line.
 * Reads the Kissflow user, then the full profile, without blocking ticket load.
 */
export function useKissflowViewerDesignation(kfInstance) {
  const userId = String(kfInstance?.user?._id || kfInstance?.user?.Id || '').trim();
  const [designation, setDesignation] = useState('');

  useEffect(() => {
    if (!kfInstance) return undefined;
    const fromSession = readKissflowSessionUser(kfInstance).designation;
    if (fromSession) setDesignation(fromSession);
    let cancelled = false;
    (async () => {
      const readProfile = (profile) => {
        const body = profile?.data && typeof profile.data === 'object' ? profile.data : profile;
        return readViewerDesignation(body, body?.Name || kfInstance.user?.Name || '');
      };
      let next = fromSession;
      try {
        const getter = kfInstance.user?.getUser;
        if (typeof getter === 'function') next = readProfile(await getter.call(kfInstance.user)) || next;
      } catch {
        /* session designation stays */
      }
      if (!next) {
        try {
          const accountId = resolveKissflowAccountId(kfInstance);
          if (accountId && userId && typeof kfInstance.api === 'function') {
            next = readProfile(await kfGetJson(kfInstance, `/user/2/${accountId}/${userId}`)) || next;
          }
        } catch {
          /* profile call is optional */
        }
      }
      if (!cancelled && next) setDesignation(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [kfInstance, userId]);

  return designation;
}
