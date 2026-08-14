import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { FINAL_LEVEL_ENTITY_OPTIONS } from './lib/kfITServiceDashboard.js';

/**
 * IT Admin — same Refex Head model (monitoring tabs, Weekly/Monthly/FY + Due,
 * Me/Team, entity switch, reopen form). Oversight label; no create-ticket CTA.
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
        adaptivePeriod
        poolLabel="Admin Dashboard"
        hideCreateTicket
        editDashboard="admin"
      />
    </ITDashboardUiProvider>
  );
}
