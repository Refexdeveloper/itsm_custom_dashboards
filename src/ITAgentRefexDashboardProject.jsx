import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { REFEX_PROFILE } from './lib/itDashboardProfiles.js';
import ITAgentDashboard from './ITAgentDashboard.jsx';

export default function ITAgentRefexDashboardProject() {
  return (
    <ITDashboardProfileProvider profile={REFEX_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITAgentDashboard poolLabel="Refex" headerRoleLabel="IT Agent" adaptivePeriod />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
