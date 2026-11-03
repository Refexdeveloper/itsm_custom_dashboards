import { useEffect } from 'react';
import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { REFEX_PROFILE } from './lib/itDashboardProfiles.js';
import RefexEmployeeDashboard from './itsm/refex/employeedashboard/RefexEmployeeDashboard.jsx';
import './itsm/refex/employeedashboard/itEmployeeRefexP2p.css';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';

const P2P_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap';

export default function ITEmployeeRefexDashboardProject() {
  useDashboardPerformanceMode();
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('it-p2p-fonts')) return undefined;
    const link = document.createElement('link');
    link.id = 'it-p2p-fonts';
    link.rel = 'stylesheet';
    link.href = P2P_FONT_HREF;
    document.head.appendChild(link);
    return undefined;
  }, []);

  return (
    <div className="it-p2p-theme">
      <ITDashboardProfileProvider profile={REFEX_PROFILE}>
        <ITDashboardUiProvider uiVariant="mis-modern">
          <RefexEmployeeDashboard poolLabel="Refex" headerRoleLabel="Employee" uiTheme="p2p" />
        </ITDashboardUiProvider>
      </ITDashboardProfileProvider>
    </div>
  );
}

