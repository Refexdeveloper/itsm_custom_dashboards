import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { EXTROVIS_PROFILE } from './lib/itDashboardProfiles.js';
import RefexEmployeeDashboard from './itsm/refex/employeedashboard/RefexEmployeeDashboard.jsx';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';
import { HIDE_EXTROVIS_RECORD_EXPORT } from './lib/extrovisRecordExport.js';

// Extrovis shares the exact Refex employee flow — same dashboard, Extrovis report.
export default function ITEmployeeExtrovisDashboardProject() {
  useDashboardPerformanceMode();
  return (
    <ITDashboardProfileProvider profile={EXTROVIS_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <RefexEmployeeDashboard poolLabel="Extrovis" headerRoleLabel="Employee" uiTheme="p2p" hideRecordExport={HIDE_EXTROVIS_RECORD_EXPORT} />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
