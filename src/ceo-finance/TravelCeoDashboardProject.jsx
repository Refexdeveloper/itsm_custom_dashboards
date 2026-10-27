import { ITDashboardUiProvider } from '../context/ITDashboardUiContext.jsx';
import NeFinanceCeoDashboard from '../components/it/NeFinanceCeoDashboard.jsx';
import { NE_TRAVEL_APP_ID } from '../lib/neGcpDashboardClient.js';

const TRAVEL_ENGAGEMENT_URL = 'https://refex-admin-ui-dhwffeu7pq-el.a.run.app/applications/production-Expense_and_Travel_Management_A00?tab=dashboard&embed=1';

/**
 * Travel CEO Kissflow component — Notification Engine travel dashboard
 * (Expense_and_Travel_Management_A00), not the ITSM CEO table.
 */
export default function TravelCeoDashboardProject() {
  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <NeFinanceCeoDashboard
        mode="travel"
        appId={NE_TRAVEL_APP_ID}
        engagementReportUrl={TRAVEL_ENGAGEMENT_URL}
      />
    </ITDashboardUiProvider>
  );
}
