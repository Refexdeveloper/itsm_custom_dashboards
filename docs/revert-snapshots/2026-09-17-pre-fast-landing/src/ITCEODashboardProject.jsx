import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { FINAL_LEVEL_ENTITY_OPTIONS } from './lib/kfITServiceDashboard.js';

/**
 * CEO — org-wide oversight (no Me / My Team), IT Agents filter + Entity in header.
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
        hideScopeSwitch
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
