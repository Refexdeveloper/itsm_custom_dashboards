import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { REFEX_PROFILE } from './lib/itDashboardProfiles.js';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';
import { useRefexServiceComments } from './components/it/useRefexServiceComments.js';

/** IT Manager — no entity filter; My Team counts match Agent / Head on Refex. */
export default function ITManagerRefexDashboardProject() {
  useDashboardPerformanceMode();
  useRefexServiceComments();
  return (
    <ITDashboardProfileProvider profile={REFEX_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITCrApproverDashboard
          role="first"
          defaultEntity="Refex"
          skipEntityFilter
          showHeaderCompanyFilter
          adaptivePeriod
          showSourceBreakdown
          headerRoleLabel="IT Manager"
        />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
