import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';
import { useRefexServiceComments } from './components/it/useRefexServiceComments.js';

/**
 * IT Head — Refex process only. No entity filter so My Team KPI counts match
 * IT Agent / IT Manager (full Refex queue including Venwind rows).
 */
export default function ITHeadRefexDashboardProject() {
  useDashboardPerformanceMode();
  useRefexServiceComments();

  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <ITCrApproverDashboard
        role="final"
        defaultEntity="Refex"
        skipEntityFilter
        showHeaderCompanyFilter
        hideQueueSwitch
        adaptivePeriod
        showSourceBreakdown
        headerRoleLabel="IT Head"
        hideRecordExport
      />
    </ITDashboardUiProvider>
  );
}
