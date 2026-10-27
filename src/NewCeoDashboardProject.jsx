import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import NewCeoGcpDashboard from './components/it/NewCeoGcpDashboard.jsx';

/**
 * newceodashboard — CEO chrome.
 * Notification Engine GCP report only.
 */
export default function NewCeoDashboardProject() {
  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <NewCeoGcpDashboard />
    </ITDashboardUiProvider>
  );
}
