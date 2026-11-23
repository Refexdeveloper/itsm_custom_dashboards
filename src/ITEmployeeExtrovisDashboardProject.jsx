import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { EXTROVIS_PROFILE } from './lib/itDashboardProfiles.js';
import RefexEmployeeDashboard from './itsm/refex/employeedashboard/RefexEmployeeDashboard.jsx';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';

// Extrovis shares the exact Refex employee flow — same dashboard, Extrovis report.
export default function ITEmployeeExtrovisDashboardProject() {
  useDashboardPerformanceMode();
  return (
    <ITDashboardProfileProvider profile={EXTROVIS_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <RefexEmployeeDashboard poolLabel="Extrovis" headerRoleLabel="Employee" uiTheme="p2p" hideRecordExport />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
