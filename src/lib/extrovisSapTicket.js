/** Extrovis All_tickets_A00 SAP fields — display only; does not change Me / Open matchers. */

export const EXTROVIS_SAP_COL = 'Column_l8-JThY4eN';
export const EXTROVIS_SAP_MODULE_COL = 'Column_xAD9rXgk8-';

export const EXTROVIS_AGENT_HIDE_ME_TEAM_OPEN_EMAILS = [
  'sumeet.dongre@bs.nttdata.com',
  'chinmayee.maharana@bs.nttdata.com',
  'naveenkumar.thumukunta@bs.nttdata.com',
  'tanuja.villa@bs.nttdata.com',
  'anusha.shyamala@bs.nttdata.com',
  'karthikeyasrivasthav.annaluru@bs.nttdata.com',
  'nithyasree.pa@bs.nttdata.com',
  'seshasaiprasanna.kandikuppa@bs.nttdata.com',
  'waliullah.md@bs.nttdata.com',
  'venugopalareddy.yerreddu@bs.nttdata.com',
  'ganesh11.sable@bs.nttdata.com',
];

export function hidesExtrovisAgentMeTeamAndOpenKpi(email) {
  return EXTROVIS_AGENT_HIDE_ME_TEAM_OPEN_EMAILS.includes(normalizeAgentEmail(email));
}

function normalizeAgentEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Extrovis IT Agent — hide entity filter and lock Me + My Team to one entity. */
export const EXTROVIS_AGENT_LOCKED_ENTITY_BY_EMAIL = {
  'jon.hudanich@kavispharma.com': 'Kavis',
  'vidhya.kumar@kavispharma.com': 'Kavis',
  'pradip.kakade@modepro.com': 'ModePro',
};

/** Extrovis IT Agent — keep entity filter; My Team uses All_tickets $sap=true. Me unchanged. */
export const EXTROVIS_AGENT_SAP_TEAM_EMAILS = [
  'kishore.yepuri@extrovis.com',
  'sarwar.syed@nttdata.com',
  'chandana.metikala@nttdata.com',
];

export const EXTROVIS_AGENT_SAP_TEAM_ENTITY_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'Extrovis', label: 'Extrovis' },
  { key: 'Kavis', label: 'Kavis' },
  { key: 'ModePro', label: 'Modepro' },
];

export function getExtrovisAgentLockedEntity(email) {
  return EXTROVIS_AGENT_LOCKED_ENTITY_BY_EMAIL[normalizeAgentEmail(email)] || '';
}

export function hidesExtrovisAgentEntityFilter(email) {
  return Boolean(getExtrovisAgentLockedEntity(email));
}

export function isExtrovisAgentSapTeamOnly(email) {
  return EXTROVIS_AGENT_SAP_TEAM_EMAILS.includes(normalizeAgentEmail(email));
}

export function isExtrovisAgentSapTeamEntityRow(row) {
  const token = String(row?.entity || row?.entityKey || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (!token) return true;
  return token.includes('extrovis') || token.includes('kavis') || token.includes('modepro');
}

export function isExtrovisSapTicket(row) {
  if (!row) return false;
  const raw = row.raw && typeof row.raw === 'object' ? row.raw : {};
  const value = row.sap ?? raw[EXTROVIS_SAP_COL] ?? raw.SAP ?? raw.sap;
  if (value === true || value === 1) return true;
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === '1';
}

export function getExtrovisSapModule(row) {
  if (!row) return '';
  const raw = row.raw && typeof row.raw === 'object' ? row.raw : {};
  const value = row.sapModule
    ?? raw[EXTROVIS_SAP_MODULE_COL]
    ?? raw.SAP_Module
    ?? raw.sap_module
    ?? '';
  return String(value ?? '').trim();
}
