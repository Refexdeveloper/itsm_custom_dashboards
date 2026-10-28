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
  let page = <NewCeoDashboardProject />;
  if (path.endsWith('/travel')) page = <TravelCeoDashboardProject />;
  else if (path.endsWith('/expense')) page = <ExpenseCeoDashboardProject />;
  else if (path.endsWith('/solar')) page = <SolarCeoDashboardProject />;
  return <div className="rootDiv">{page}</div>;
}
