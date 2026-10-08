import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { REFEX_PROFILE } from './lib/itDashboardProfiles.js';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';

export default function ITManagerRefexDashboardProject() {
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
