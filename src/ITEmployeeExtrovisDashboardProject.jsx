import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { EXTROVIS_PROFILE } from './lib/itDashboardProfiles.js';
import RefexEmployeeDashboard from './itsm/refex/employeedashboard/RefexEmployeeDashboard.jsx';

// Extrovis shares the exact Refex employee flow — same dashboard, Extrovis report.
export default function ITEmployeeExtrovisDashboardProject() {
  return (
    <ITDashboardProfileProvider profile={EXTROVIS_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <RefexEmployeeDashboard poolLabel="Extrovis" />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
