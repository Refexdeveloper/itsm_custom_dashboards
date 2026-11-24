import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { EXTROVIS_PROFILE } from './lib/itDashboardProfiles.js';
import ITAgentDashboard from './ITAgentDashboard.jsx';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';
import { HIDE_EXTROVIS_RECORD_EXPORT } from './lib/extrovisRecordExport.js';

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
          hideRecordExport={HIDE_EXTROVIS_RECORD_EXPORT}
        />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
