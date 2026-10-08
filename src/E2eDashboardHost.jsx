/**
 * Local Playwright host — switch dashboards with ?dashboard=
 * Only used when ?e2e=1 is present (production Kissflow App stays default).
 */
import { useMemo } from 'react';
import ITEmployeeRefexDashboardProject from './ITEmployeeRefexDashboardProject.jsx';
import ITAgentRefexDashboardProject from './ITAgentRefexDashboardProject.jsx';
import ITManagerRefexDashboardProject from './ITManagerRefexDashboardProject.jsx';
import ITHeadRefexDashboardProject from './ITHeadRefexDashboardProject.jsx';
import ITCommonRefexDashboardProject from './ITCommonRefexDashboardProject.jsx';
import ITEmployeeExtrovisDashboardProject from './ITEmployeeExtrovisDashboardProject.jsx';
import ITAgentExtrovisDashboardProject from './ITAgentExtrovisDashboardProject.jsx';
import ITFirstLevelExtrovisApproverDashboardProject from './ITFirstLevelExtrovisApproverDashboardProject.jsx';
import ITFinalLevelExtrovisApproverDashboardProject from './ITFinalLevelExtrovisApproverDashboardProject.jsx';
import ITAdminDashboardProject from './ITAdminDashboardProject.jsx';

const DASHBOARDS = {
  employee: ITEmployeeRefexDashboardProject,
  agent: ITAgentRefexDashboardProject,
  manager: ITManagerRefexDashboardProject,
  head: ITHeadRefexDashboardProject,
  common: ITCommonRefexDashboardProject,
  'extrovis-employee': ITEmployeeExtrovisDashboardProject,
  'extrovis-agent': ITAgentExtrovisDashboardProject,
  'extrovis-first': ITFirstLevelExtrovisApproverDashboardProject,
  'extrovis-final': ITFinalLevelExtrovisApproverDashboardProject,
  admin: ITAdminDashboardProject,
};

export default function E2eDashboardHost() {
  const key = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('dashboard') || 'manager';
  }, []);

  const Dashboard = DASHBOARDS[key] || DASHBOARDS.manager;

  return (
    <div data-testid="e2e-host" data-e2e-dashboard={key}>
      <Dashboard />
    </div>
  );
}
