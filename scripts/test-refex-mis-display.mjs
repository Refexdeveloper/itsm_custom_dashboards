import assert from 'node:assert/strict';
import {
  getRefexReportStatusLabel,
  getRefexReportStagesLabel,
  mapRefexMisStatusDisplay,
} from '../src/itsm/refex/employeedashboard/ticketStage.js';

assert.equal(mapRefexMisStatusDisplay('InProgress'), 'Open');
assert.equal(mapRefexMisStatusDisplay('in progress'), 'Open');
assert.equal(mapRefexMisStatusDisplay('Completed'), 'Closed');
assert.equal(mapRefexMisStatusDisplay('Rejected'), 'Rejected');
assert.equal(mapRefexMisStatusDisplay('Open'), 'Open');
assert.equal(mapRefexMisStatusDisplay('Closed'), 'Closed');

assert.equal(getRefexReportStatusLabel({ raw: { Column_0GDnNoEuA7: 'InProgress' } }), 'Open');
assert.equal(getRefexReportStatusLabel({ raw: { Status: 'Completed' } }), 'Closed');
assert.equal(getRefexReportStatusLabel({ raw: { _status: 'Rejected' } }), 'Rejected');

assert.equal(getRefexReportStagesLabel({
  raw: { Column_Bug5EApiHs: 'OnHold', Status: 'InProgress' },
}), 'OnHold');
assert.equal(getRefexReportStagesLabel({
  raw: { Status: 'InProgress' },
}), 'InProgress');
assert.equal(getRefexReportStagesLabel({
  raw: { Status: 'Completed' },
}), 'Closed');
assert.equal(getRefexReportStagesLabel({
  raw: { Status: 'Rejected' },
}), 'Closed');

console.log('refex MIS status/stage display mapping ok');
