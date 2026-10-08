import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { REFEX_PROFILE } from './lib/itDashboardProfiles.js';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';

/**
 * Common Refex — signed-in user's own tickets and tasks only.
 * No entity, company, or Me | My Team controls.
 */
export default function ITCommonRefexDashboardProject() {
  return (
    <ITDashboardProfileProvider profile={REFEX_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITCrApproverDashboard
          role="final"
          defaultEntity="Refex"
          skipEntityFilter
          personalOnly
          hideQueueSwitch
          adaptivePeriod
          showSourceBreakdown
          headerRoleLabel="Common Refex Dashboard"
        />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
