import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { EXTROVIS_PROFILE } from './lib/itDashboardProfiles.js';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { EXTROVIS_DASHBOARD_ENTITY_OPTIONS } from './lib/kfITServiceDashboard.js';

export default function ITFinalLevelExtrovisApproverDashboardProject() {
  return (
    <ITDashboardProfileProvider profile={EXTROVIS_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITCrApproverDashboard
          role="final"
          defaultEntity="Extrovis"
          entityOptions={EXTROVIS_DASHBOARD_ENTITY_OPTIONS}
          enableHeaderEntitySelect
          adaptivePeriod
          showDue={false}
        />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
