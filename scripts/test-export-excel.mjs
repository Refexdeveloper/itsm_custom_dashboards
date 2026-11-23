import assert from 'node:assert/strict';
import { buildExcelXml, exportableColumns } from '../src/lib/exportRecordsExcel.js';

const columns = [
  { key: 'expand', label: '' },
  { key: 'actions', label: 'Actions' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'requester', label: 'Requester' },
];
const rows = [
  { requestId: 'SR-1', requester: 'Asha' },
  { requestId: 'SR-2', requester: 'Ravi & Co <IT>' },
];

assert.deepEqual(exportableColumns(columns).map((col) => col.key), ['requestId', 'requester']);

const xml = buildExcelXml({
  sheetName: 'Records',
  columns,
  rows,
  getCellText: (col, row) => row[col.key],
});

assert.match(xml, /Request ID/);
assert.match(xml, /Asha/);
assert.match(xml, /Ravi &amp; Co &lt;IT&gt;/);
assert.doesNotMatch(xml, /<Data ss:Type="String">Actions<\/Data>/);
assert.equal((xml.match(/<Row>/g) || []).length, 3);

console.log('export excel ok');
