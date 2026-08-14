import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { EXTROVIS_PROFILE } from './lib/itDashboardProfiles.js';
import ITAgentDashboardProject from './ITAgentDashboardProject.jsx';

export default function ITAgentExtrovisDashboardProject() {
  return (
    <ITDashboardProfileProvider profile={EXTROVIS_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITAgentDashboardProject
          poolLabel="Extrovis"
          enableServiceComments
          adaptivePeriod
          showDue={false}
        />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
