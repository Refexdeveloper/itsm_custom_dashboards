import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { useDashboardPerformanceMode } from './lib/dashboardPerformanceMode.js';
import { useRefexServiceComments } from './components/it/useRefexServiceComments.js';

/**
 * IT Head latency test pack. Same screen as IT Head, with incremental report
 * refresh. The live IT Head pack does not pass this flag.
 */
export default function ITHeadRefexLatencyTestDashboardProject() {
  useDashboardPerformanceMode();
  useRefexServiceComments();

  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <ITCrApproverDashboard
        incrementalHeadReport
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
