import ITDashboardProfileProvider from './context/ITDashboardProfileContext.jsx';

import { ITDashboardUiProvider } from './context/ITDashboardUiContext.jsx';

import { REFEX_PROFILE } from './lib/itDashboardProfiles.js';

import RefexEmployeeDashboard from './itsm/refex/employeedashboard/RefexEmployeeDashboard.jsx';



export default function ITEmployeeRefexDashboardProject() {

  return (

    <ITDashboardProfileProvider profile={REFEX_PROFILE}>

      <ITDashboardUiProvider uiVariant="mis-modern">

        <RefexEmployeeDashboard poolLabel="Refex" headerRoleLabel="Employee" />

      </ITDashboardUiProvider>

    </ITDashboardProfileProvider>

  );

}

