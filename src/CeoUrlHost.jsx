import NewCeoDashboardProject from './NewCeoDashboardProject.jsx';
import TravelCeoDashboardProject from './ceo-finance/TravelCeoDashboardProject.jsx';
import ExpenseCeoDashboardProject from './ceo-finance/ExpenseCeoDashboardProject.jsx';
import SolarCeoDashboardProject from './ceo-finance/SolarCeoDashboardProject.jsx';

function ceoPath() {
  const path = String(window.location.pathname || '/')
    .replace(/\/+$/, '')
    .toLowerCase();
  return path || '/';
}

/**
 * GCP URL host only. The Docker build copies this over App.jsx.
 * Kissflow zip builds keep their own App.jsx and are not this host.
 */
export default function CeoUrlHost() {
  const path = ceoPath();
  if (path.endsWith('/travel')) return <TravelCeoDashboardProject />;
  if (path.endsWith('/expense')) return <ExpenseCeoDashboardProject />;
  if (path.endsWith('/solar')) return <SolarCeoDashboardProject />;
  return <NewCeoDashboardProject />;
}
