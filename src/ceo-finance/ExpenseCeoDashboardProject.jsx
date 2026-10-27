import { ITDashboardUiProvider } from '../context/ITDashboardUiContext.jsx';
import NeFinanceCeoDashboard from '../components/it/NeFinanceCeoDashboard.jsx';
import { NE_EXPENSE_APP_ID } from '../lib/neGcpDashboardClient.js';

const EXPENSE_ENGAGEMENT_URL = 'https://refex-admin-ui-dhwffeu7pq-el.a.run.app/applications/production-EMS_001_A00?tab=dashboard&embed=1';

/**
 * Expense CEO Kissflow component — Notification Engine expense dashboard
 * (EMS_001_A00), not the ITSM CEO table.
 */
export default function ExpenseCeoDashboardProject() {
  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <NeFinanceCeoDashboard
        mode="expense"
        appId={NE_EXPENSE_APP_ID}
        engagementReportUrl={EXPENSE_ENGAGEMENT_URL}
      />
    </ITDashboardUiProvider>
  );
}
