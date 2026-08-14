import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';
import ITCrApproverDashboard from './components/it/ITCrApproverDashboard.jsx';
import { FINAL_LEVEL_ENTITY_OPTIONS } from './lib/kfITServiceDashboard.js';

/**
 * IT Head — same entity dropdown as Extrovis Final (Extrovis / Kavis / Pharma Pack /
 * Modepro) plus Refex. Lands on Refex by default.
 */
export default function ITHeadRefexDashboardProject() {
  return (
    <ITDashboardUiProvider uiVariant="mis-modern">
      <ITCrApproverDashboard
        role="final"
        defaultEntity="Refex"
        entityOptions={FINAL_LEVEL_ENTITY_OPTIONS}
        enableHeaderEntitySelect
        hideQueueSwitch
        adaptivePeriod
        showSourceBreakdown
      />
    </ITDashboardUiProvider>
  );
}
