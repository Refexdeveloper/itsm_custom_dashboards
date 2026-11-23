/**
 * Plain text for one MIS column. Matches the table labels, without changing filters.
 */
import {
  formatRequesterDisplay,
  resolveDisplayRequestId,
  formatServiceWorkflowStepDisplay,
  formatCrWorkflowStepDisplay,
  getRowStartDateLabel,
  getRowEndDateLabel,
  getSlaTiming,
  getCompletedResolutionTiming,
  getRefexServiceSlaMisDisplay,
  getRefexServiceTatMisDisplay,
  isExtrovisServiceDashboardContext,
} from './kfITServiceDashboard.js';
import {
  getAssignedToDisplay,
  getClosedByDisplay,
} from '../itsm/refex/employeedashboard/closedBy.js';
import {
  formatMisTableDate,
  formatMisTableTime,
  getContextDateRaw,
  getReopenedOnRaw,
  hasReopenedStamp,
} from '../itsm/refex/employeedashboard/employeeDates.js';
import { getMisTicketStatus } from '../itsm/refex/employeedashboard/employeeStatus.js';
import {
  getExtrovisMisStagesLabel,
  getRefexReportStagesLabel,
  getRefexReportStatusLabel,
} from '../itsm/refex/employeedashboard/ticketStage.js';
import { getExtrovisMisSubjectLabel } from '../itsm/refex/employeedashboard/commentChannel.js';
import {
  getMisCategoryLabel,
  getMisCriticalityLabel,
  getMisSourceLabel,
  getMisSubCategoryLabel,
  getMisTicketTypeLabel,
} from '../itsm/refex/shared/misCompactDisplay.js';
import { mapRefexServiceTabToStatusKey } from '../itsm/refex/shared/refexServiceQueueColumns.js';
import { ceoSlaMisDisplay } from './neGcpDashboardMath.js';
import { getExtrovisSapModule, isExtrovisSapTicket } from './extrovisSapTicket.js';

function requestIdText(row) {
  const label = resolveDisplayRequestId(row, row?.id);
  return label || '—';
}

function shown(value) {
  const text = String(value ?? '').trim();
  return text && text !== '—' ? text : '—';
}

function joinShown(primary, extra) {
  const main = shown(primary);
  const sub = String(extra ?? '').trim();
  if (!sub || sub === '—') return main;
  if (main === '—') return sub;
  return `${main} ${sub}`;
}

function dateTimeText(raw) {
  const dateLine = formatMisTableDate(raw);
  const timeLine = formatMisTableTime(raw);
  if (!dateLine) return '—';
  return timeLine ? `${dateLine} ${timeLine}` : dateLine;
}

function simpleSlaText(row) {
  const timing = getCompletedResolutionTiming(row);
  if (!timing.hasData || timing.outcome === 'none') return 'On time';
  return timing.outcome === 'breached' ? 'Breached' : 'On time';
}

function statusWithReopen(status, row) {
  const label = shown(status || 'Open');
  const reopenedRaw = getReopenedOnRaw(row) || row?.reopenedOn || row?.reopened_at || '';
  const reopened = hasReopenedStamp(row) || Boolean(reopenedRaw);
  if (!reopened) return label === '—' ? 'Open' : label;
  const when = formatMisTableDate(reopenedRaw);
  return when ? `${label === '—' ? 'Open' : label} · Reopened ${when}` : `${label === '—' ? 'Open' : label} · Reopened`;
}

function serviceStatus(row) {
  if (!isExtrovisServiceDashboardContext()) {
    return getRefexReportStatusLabel(row) || getMisTicketStatus(row) || 'Open';
  }
  return getMisTicketStatus(row) || 'Open';
}

function slaText(row, { refexLayout = false, isCompletedTab = false } = {}) {
  if (refexLayout) {
    const display = getRefexServiceSlaMisDisplay(row, { isCompletedTab });
    const primary = !display.primary || display.primary === '—'
      ? (isCompletedTab ? 'Not Breached' : 'On track')
      : display.primary;
    return joinShown(primary, display.sub);
  }
  return shown(getSlaTiming(row).shortLabel);
}

export function itsmRecordExportText(col, row, {
  kind = 'service',
  refexLayout = false,
  isCompletedTab = false,
  statusTab = 'All',
} = {}) {
  const key = col?.key || col?.id;
  const mappedStatusTab = refexLayout ? mapRefexServiceTabToStatusKey(statusTab) : statusTab;
  switch (key) {
    case 'requestId':
      return shown(kind === 'ceo' ? (row?.requestId || requestIdText(row)) : requestIdText(row));
    case 'requester':
      return shown(row?.requesterName || formatRequesterDisplay(row));
    case 'assignedTo':
      return shown(kind === 'ceo' ? row?.assignedTo : getAssignedToDisplay(row));
    case 'closedBy':
      return shown(kind === 'ceo' ? row?.closedBy : getClosedByDisplay(row));
    case 'completedBy':
      return shown(row?.completedBy || row?.assignedTo);
    case 'cancelledBy':
      return shown(row?.cancelledBy || row?.assignedTo);
    case 'escalation':
      return refexLayout ? shown(row?.escalation) : '—';
    case 'ticketType':
    case 'changeType':
      return shown(getMisTicketTypeLabel(row) || row?.changeType || row?.ticketType);
    case 'category':
      return shown(kind === 'ceo' ? row?.category : getMisCategoryLabel(row));
    case 'subCategory':
      return shown(kind === 'ceo' ? row?.subCategory : getMisSubCategoryLabel(row));
    case 'department':
      return shown(row?.department);
    case 'location':
      return shown(row?.location);
    case 'criticality':
      return shown(kind === 'ceo' ? row?.criticality : getMisCriticalityLabel(row));
    case 'source':
      return shown(kind === 'ceo' ? row?.source : getMisSourceLabel(row));
    case 'ticketStatus':
      if (kind === 'ceo') return statusWithReopen(row?.ticketStatus, row);
      if (kind === 'cr') return statusWithReopen(getMisTicketStatus(row) || row?.itemStatus || row?.statusLabel || 'Open', row);
      return statusWithReopen(serviceStatus(row), row);
    case 'subject':
      return shown(getExtrovisMisSubjectLabel(row));
    case 'stages':
      if (kind === 'ceo') return shown(row?.ticketStage);
      if (!isExtrovisServiceDashboardContext()) return shown(getRefexReportStagesLabel(row));
      return shown(getExtrovisMisStagesLabel(row, statusTab));
    case 'itemStatus':
      return shown(row?.itemStatus);
    case 'sla':
      if (kind === 'ceo') {
        const display = ceoSlaMisDisplay(row);
        const primary = display?.primary && display.primary !== '—' ? display.primary : 'On track';
        return joinShown(primary, display?.sub);
      }
      return slaText(row, { refexLayout, isCompletedTab });
    case 'tat':
      if (!refexLayout) return '—';
      return joinShown(
        getRefexServiceTatMisDisplay(row, { isCompletedTab }).primary,
        getRefexServiceTatMisDisplay(row, { isCompletedTab }).sub,
      );
    case 'currentStep':
      return shown(kind === 'cr' ? formatCrWorkflowStepDisplay(row) : formatServiceWorkflowStepDisplay(row));
    case 'startDate':
    case 'endDate':
    case 'createdOn':
    case 'closedOn':
    case 'reopenedOn':
      if (kind === 'ceo') {
        if (key === 'createdOn') return dateTimeText(row?.createdAtRaw);
        if (key === 'closedOn') return dateTimeText(row?.closedOn || row?.closedAtRaw);
        return dateTimeText(row?.reopenedOn || row?.reopenedAtRaw);
      }
      if (refexLayout && kind === 'service') {
        const columnKey = key === 'startDate' ? 'createdOn' : key === 'endDate' ? 'closedOn' : key;
        return dateTimeText(getContextDateRaw(row, mappedStatusTab, columnKey));
      }
      if (key === 'startDate' || key === 'createdOn') return shown(getRowStartDateLabel(row));
      if (key === 'endDate' || key === 'closedOn') return shown(getRowEndDateLabel(row));
      return shown(row?.requestedDate);
    case 'slaResult':
    case 'slaOutcome':
      if (refexLayout) return slaText(row, { refexLayout: true, isCompletedTab: true });
      return simpleSlaText(row);
    case 'resolutionTime': {
      const timing = getCompletedResolutionTiming(row);
      return timing.hasData ? shown(timing.resolutionLabel) : '—';
    }
    case 'date':
      return shown(row?.requestedDate);
    case 'sap':
      return isExtrovisSapTicket(row) ? 'Yes' : 'No';
    case 'sapModule':
      return shown(getExtrovisSapModule(row));
    case 'entity':
      return shown(row?.entity);
    case 'requesterEmail':
      return shown(row?.requesterEmail);
    case 'company':
      return shown(row?.company);
    case 'summary':
      return shown(row?.summary);
    case 'description':
      return shown(row?.description);
    case 'holdReason':
      return shown(row?.holdReason);
    case 'solution':
      return shown(row?.solution);
    case 'changeReason':
    case 'impact':
    case 'urgency':
    case 'onBehalfOf':
    case 'plannedStart':
    case 'plannedEnd':
    case 'implementationPlan':
    case 'backoutPlan':
    case 'testPlan':
      return shown(row?.[key]);
    default:
      return '—';
  }
}
