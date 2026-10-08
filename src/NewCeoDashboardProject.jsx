import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import NewCeoGcpDashboard from './components/it/NewCeoGcpDashboard.jsx';

/**
 * newceodashboard — CEO chrome, GCP Tech Helpdesk KPIs / filters.
 * Data comes from Notification Engine Cloud Run only (no Kissflow ticket APIs).
 * No Me | My Team.
 */
export default function NewCeoDashboardProject() {
  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <NewCeoGcpDashboard />
    </ITDashboardUiProvider>
  );
}
