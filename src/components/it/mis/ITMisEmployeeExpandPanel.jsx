/**
 * Employee MIS expand panel — delegates to shared EmployeeServiceExpandPanel.
 */
import { EmployeeServiceExpandPanel } from '../ITDashboardShared.jsx';

export default function ITMisEmployeeExpandPanel({
  row,
  showSlaInExpand = false,
  showWorkflowHandlers = true,
}) {
  return (
    <EmployeeServiceExpandPanel
      row={row}
      showSlaInExpand={showSlaInExpand}
      showEntityInAside
      showWorkflowHandlers={showWorkflowHandlers}
    />
  );
}
