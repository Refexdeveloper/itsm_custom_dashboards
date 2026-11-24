import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { EXTROVIS_PROFILE } from './lib/itDashboardProfiles.js';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import {
  EXTROVIS_DASHBOARD_DEFAULT_ENTITY,
  EXTROVIS_DASHBOARD_ENTITY_OPTIONS,
} from './lib/kfITServiceDashboard.js';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';
import { HIDE_EXTROVIS_RECORD_EXPORT } from './lib/extrovisRecordExport.js';

export default function ITFinalLevelExtrovisApproverDashboardProject() {
  useDashboardPerformanceMode();
  return (
    <ITDashboardProfileProvider profile={EXTROVIS_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITCrApproverDashboard
          role="final"
          defaultEntity={EXTROVIS_DASHBOARD_DEFAULT_ENTITY}
          entityOptions={EXTROVIS_DASHBOARD_ENTITY_OPTIONS}
          enableHeaderEntitySelect
          adaptivePeriod
          showDue={false}
          headerRoleLabel="Final Level Approver"
          hideRecordExport={HIDE_EXTROVIS_RECORD_EXPORT}
        />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
