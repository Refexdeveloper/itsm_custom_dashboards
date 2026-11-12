/**
 * SAP Yes + Kavis Pharma comment mail keeps Vidhya Kumar on Cc. Other entities unchanged.
 * Run via: node tests/kavis-sap-comment-cc.test.mjs
 */
import assert from 'node:assert/strict';
import { resolveCommentMailRecipients } from '../src/itsm/refex/employeedashboard/commentNotifyMail.js';

const VIDHYA = 'vidhya.kumar@kavispharma.com';
const hasVidhya = (list) => (list || []).some((item) => String(item).toLowerCase() === VIDHYA);

// SAP + Kavis: agent comment (To = requester) and employee comment (To = SAP assignee).
const agent = resolveCommentMailRecipients({
  role: 'agent', requesterEmail: 'employee@kavispharma.com', entity: 'KavisPharma', sap: true,
});
assert.ok(hasVidhya(agent.cc), 'agent SAP Kavis Cc has Vidhya');
assert.ok(agent.cc.some((item) => /nttdata|kishore/i.test(item)), 'SAP Cc list kept');
const employee = resolveCommentMailRecipients({
  role: 'employee', entity: 'Kavis Pharma', sap: true, assignedTo: 'Kishore Yepuri',
});
assert.ok(hasVidhya(employee.cc), 'employee SAP Kavis Cc has Vidhya');
assert.equal(new Set(employee.cc.map((item) => item.toLowerCase())).size, employee.cc.length, 'no duplicate Cc');

// SAP + Extrovis: no Vidhya.
const extrovis = resolveCommentMailRecipients({ role: 'agent', requesterEmail: 'a@extrovis.com', entity: 'Extrovis', sap: true });
assert.ok(!hasVidhya(extrovis.cc), 'Extrovis SAP Cc unchanged');

// Non-SAP Kavis: unchanged entity Cc (already Jon + Vidhya).
const kavisNoSap = resolveCommentMailRecipients({ role: 'agent', requesterEmail: 'employee@kavispharma.com', entity: 'KavisPharma', sap: false });
assert.deepEqual(kavisNoSap.cc.map((item) => item.toLowerCase()).sort(), ['jon.hudanich@kavispharma.com', VIDHYA]);

console.log('Kavis SAP comment Cc: OK');
