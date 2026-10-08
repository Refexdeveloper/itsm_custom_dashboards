import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { FINAL_LEVEL_ENTITY_OPTIONS } from './lib/kfITServiceDashboard.js';

/**
 * IT Admin — full-report oversight (no Me / My Team). Weekly/Monthly/FY + Due,
 * entity switch, reopen form. Oversight label; no create-ticket CTA.
 */
export default function ITAdminDashboardProject() {
  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <ITCrApproverDashboard
        role="final"
        defaultEntity="Refex"
        entityOptions={FINAL_LEVEL_ENTITY_OPTIONS}
        enableHeaderEntitySelect
        hideQueueSwitch
        hideScopeSwitch
        adaptivePeriod
        poolLabel="Admin Dashboard"
        headerRoleLabel="Admin"
        hideCreateTicket
        editDashboard="admin"
      />
    </ITDashboardUiProvider>
  );
}
