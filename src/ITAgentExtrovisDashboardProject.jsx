import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { EXTROVIS_PROFILE } from './lib/itDashboardProfiles.js';
import ITAgentDashboard from './ITAgentDashboard.jsx';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';

export default function ITAgentExtrovisDashboardProject() {
  useDashboardPerformanceMode();
  return (
    <ITDashboardProfileProvider profile={EXTROVIS_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITAgentDashboard
          poolLabel="Extrovis"
          headerRoleLabel="IT Agent"
          enableServiceComments
          adaptivePeriod
          showDue={false}
        />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
