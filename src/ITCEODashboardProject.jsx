import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { FINAL_LEVEL_ENTITY_OPTIONS } from './lib/kfITServiceDashboard.js';

/**
 * Group CEO — same Me | My Team as IT Head, plus IT Agents filter and Engagement Report.
 */
export default function ITCEODashboardProject() {
  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <ITCrApproverDashboard
        role="final"
        defaultEntity="Refex"
        entityOptions={FINAL_LEVEL_ENTITY_OPTIONS}
        enableHeaderEntitySelect
        showHeaderCompanyFilter
        hideQueueSwitch
        adaptivePeriod
        showHeaderPeopleFilters
        showHeaderRequesterFilter={false}
        headerAssignedFilterLabel="IT Agents"
        engagementReportUrl="https://refex-admin-ui-dhwffeu7pq-el.a.run.app/applications/production-IT_Service_Management_A00?tab=dashboard&embed=1"
        poolLabel="Group CEO Dashboard"
        headerRoleLabel="Group CEO"
        hideCreateTicket
        editDashboard="admin"
      />
    </ITDashboardUiProvider>
  );
}
