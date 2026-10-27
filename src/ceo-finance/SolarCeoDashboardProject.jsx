import { ITDashboardUiProvider } from '../context/ITDashboardUiContext.jsx';
import NeFinanceCeoDashboard from '../components/it/NeFinanceCeoDashboard.jsx';
import { NE_SOLAR_APP_ID } from '../lib/neGcpDashboardClient.js';

const SOLAR_ENGAGEMENT_URL = 'https://refex-admin-ui-dhwffeu7pq-el.a.run.app/applications/production-Solar_Site_Expense_Governance_Syst_A00?tab=dashboard&embed=1';

/**
 * Solar CEO Kissflow component — Notification Engine solar dashboard.
 * Designation under the greeting matches the ITSM / expense / travel CEO packs.
 */
export default function SolarCeoDashboardProject() {
  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <NeFinanceCeoDashboard
        mode="solar"
        appId={NE_SOLAR_APP_ID}
        engagementReportUrl={SOLAR_ENGAGEMENT_URL}
      />
    </ITDashboardUiProvider>
  );
}
