/**
 * Local Playwright host — switch Refex dashboards with ?dashboard=
 * Only used when ?e2e=1 is present (production Kissflow App stays default).
 */
import { useMemo } from 'react';
import ITEmployeeRefexDashboardProject from './ITEmployeeRefexDashboardProject.jsx';
import ITAgentRefexDashboardProject from './ITAgentRefexDashboardProject.jsx';
import ITManagerRefexDashboardProject from './ITManagerRefexDashboardProject.jsx';
import ITHeadRefexDashboardProject from './ITHeadRefexDashboardProject.jsx';

const DASHBOARDS = {
  employee: ITEmployeeRefexDashboardProject,
  agent: ITAgentRefexDashboardProject,
  manager: ITManagerRefexDashboardProject,
  head: ITHeadRefexDashboardProject,
};

export default function E2eRefexHost() {
  const Dashboard = useMemo(() => {
    const key = new URLSearchParams(window.location.search).get('dashboard') || 'manager';
    return DASHBOARDS[key] || DASHBOARDS.manager;
  }, []);

  return <Dashboard />;
}
