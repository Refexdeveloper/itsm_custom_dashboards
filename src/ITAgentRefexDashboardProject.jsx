import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { REFEX_PROFILE } from './lib/itDashboardProfiles.js';
import ITAgentDashboard from './ITAgentDashboard.jsx';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';
import { useRefexServiceComments } from './components/it/useRefexServiceComments.js';

export default function ITAgentRefexDashboardProject() {
  useDashboardPerformanceMode();
  useRefexServiceComments();
  return (
    <ITDashboardProfileProvider profile={REFEX_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITAgentDashboard poolLabel="Refex" headerRoleLabel="IT Agent" adaptivePeriod hideRecordExport />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
