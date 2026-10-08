import { readTicketStatusField, getExtrovisMisStagesLabel } from '../src/itsm/refex/employeedashboard/ticketStage.js';
import { getRefexServiceQueueMisColumns } from '../src/itsm/refex/shared/refexServiceQueueColumns.js';
import { hasReopenedStamp } from '../src/itsm/refex/employeedashboard/employeeDates.js';

const hold = {
  ticketStage: 'InProgress',
  processStages: 'InProgress',
  raw: { Status: 'On Hold', _status: 'InProgress' },
};
if (readTicketStatusField(hold) !== 'OnHold') throw new Error(`status field ${readTicketStatusField(hold)}`);
if (getExtrovisMisStagesLabel(hold) !== 'OnHold') throw new Error(`stage ${getExtrovisMisStagesLabel(hold)}`);
if (getExtrovisMisStagesLabel({ raw: { Status: 'Closed' } }, 'Open') !== 'Closed') throw new Error('closed stage');
const fromReport = {
  raw: { Column_0GDnNoEuA7: 'InProgress', Statu_1: 'Open' },
};
const extrovisForm = {
  raw: { Column_69zTtmtO92: 'OnHold', Column_JUGHj6d2Xj: 'Open', Stages: 'Open', _status: 'Open' },
};
if (readTicketStatusField(extrovisForm) !== 'OnHold') throw new Error('extrovis status column');
if (getExtrovisMisStagesLabel(extrovisForm) !== 'OnHold') throw new Error('extrovis stage from status');
if (readTicketStatusField(fromReport) !== 'Open') throw new Error('statu_1 must win over older status column');
if (getExtrovisMisStagesLabel(fromReport) !== 'Open') throw new Error('refex stage from Statu_1');
const extrovisStatu1 = {
  raw: { Column_ps84EEKkEI: 'Pending with Vendor', Status: 'Open', _status: 'Open', Column_69zTtmtO92: 'InProgress' },
};
if (readTicketStatusField(extrovisStatu1) !== 'Pending with Vendor') {
  throw new Error(`extrovis Statu_1 column ${readTicketStatusField(extrovisStatu1)}`);
}
const refexStatu1 = {
  raw: { Column_WRiZDgVSqj: 'Pending with Employee', Status: 'Open', Statu: 'Open' },
};
if (readTicketStatusField(refexStatu1) !== 'Pending with Employee') {
  throw new Error(`refex Statu_1 column ${readTicketStatusField(refexStatu1)}`);
}
if (getExtrovisMisStagesLabel({ raw: { Column_0GDnNoEuA7: 'Completed' } }) !== 'Closed') {
  throw new Error('completed stage');
}
const workflowOpen = {
  id: 'wf-open',
  raw: { _status: 'Open', Statu: 'Open', Statu_1: 'Open' },
  ticketStage: 'Open',
};
if (readTicketStatusField(workflowOpen) === 'InProgress') throw new Error('workflow open is not inprogress');
const formInProgress = {
  id: 'form-ip',
  raw: { Status: 'InProgress', _status: 'Open', Statu: 'Open', Stages: 'Open' },
  ticketStage: 'Open',
};
if (readTicketStatusField(formInProgress) !== 'InProgress') {
  throw new Error(`form status should win ${readTicketStatusField(formInProgress)}`);
}
const keys = getRefexServiceQueueMisColumns().map((col) => col.key);
if (keys.includes('reopenedOn')) throw new Error('reopenedOn column must be removed');
if (!keys.includes('ticketStatus') || !keys.includes('stages')) throw new Error('status/stage columns');
if (hasReopenedStamp({ reopenedTicket: true })) {
  /* flag-only still counts as reopened */
} else {
  throw new Error('reopened flag');
}
if (hasReopenedStamp({ status: 'Open' })) throw new Error('open ticket is not reopened');
console.log('extrovis stage ok');
