import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';
import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import { REFEX_PROFILE } from './lib/itDashboardProfiles.js';
import ITAgentDashboardProject from './ITAgentDashboardProject.jsx';

export default function ITAgentRefexDashboardProject() {
  return (
    <ITDashboardProfileProvider profile={REFEX_PROFILE}>
      <ITDashboardUiProvider uiVariant="mis-modern">
        <ITAgentDashboardProject poolLabel="Refex" adaptivePeriod />
      </ITDashboardUiProvider>
    </ITDashboardProfileProvider>
  );
}
