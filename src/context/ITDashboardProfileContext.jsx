import { useLayoutEffect } from 'react';
import { setITDashboardProfile } from '../lib/kfITServiceDashboard.js';
import { setITDashboardUiVariant } from '../lib/itDashboardUi.js';
import { ITDashboardUiProvider } from './ITDashboardUiContext.jsx';

export default function ITDashboardProfileProvider({
  profile,
  uiVariant = 'mis-modern',
  children,
}) {
  // Sync during render so child useState initializers (e.g. My Tasks tab) see the profile.
  setITDashboardProfile(profile || null);
  setITDashboardUiVariant(uiVariant);

  useLayoutEffect(() => {
    setITDashboardProfile(profile || null);
    setITDashboardUiVariant(uiVariant);
    return () => {
      setITDashboardProfile(null);
      setITDashboardUiVariant('default');
    };
  }, [profile, uiVariant]);

  return (
    <ITDashboardUiProvider uiVariant={uiVariant}>
      {children}
    </ITDashboardUiProvider>
  );
}
