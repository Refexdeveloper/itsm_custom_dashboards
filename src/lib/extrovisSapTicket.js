/** Extrovis All_tickets_A00 SAP fields — display only; does not change Me / Open matchers. */

export const EXTROVIS_SAP_COL = 'Column_l8-JThY4eN';
export const EXTROVIS_SAP_MODULE_COL = 'Column_xAD9rXgk8-';

/**
 * Former NTT Data SAP agents now on @refexls.com.
 * Used only for email normalize / mail rewrite — not Me matchers.
 */
export const EXTROVIS_AGENT_REFEXLS_SAP_LOCALS = new Set([
  'sumeet.dongre',
  'chinmayee.maharana',
  'naveenkumar.thumukunta',
  'tanuja.villa',
  'anusha.shyamala',
  'karthikeyasrivasthav.annaluru',
  'nithyasree.pa',
  'seshasaiprasanna.kandikuppa',
  'waliullah.md',
  'venugopalareddy.yerreddu',
  'ganesh11.sable',
  'sarwar.syed',
  'chandana.metikala',
]);

/**
 * Legacy list — these users now use SAP Team (My Team = SAP only).
 * Kept empty so Me / My Team / Open KPI stay visible for them.
 */
export const EXTROVIS_AGENT_HIDE_ME_TEAM_OPEN_EMAILS = [];

export function hidesExtrovisAgentMeTeamAndOpenKpi(email) {
  return EXTROVIS_AGENT_HIDE_ME_TEAM_OPEN_EMAILS.includes(normalizeAgentEmail(email));
}

/**
 * Canonicalize agent login email for Extrovis SAP lists.
 * Me / Open / Closed matchers are unchanged — this only maps mailbox aliases.
 */
export function normalizeAgentEmail(email) {
  let text = String(email || '')
    .trim()
    .toLowerCase()
    .replace(/@bs\.nttdata\.com$/, '@nttdata.com');
  if (text.endsWith('@nttdata.com')) {
    const local = text.slice(0, -'@nttdata.com'.length);
    if (EXTROVIS_AGENT_REFEXLS_SAP_LOCALS.has(local)) {
      text = `${local}@refexls.com`;
    }
  }
  return text;
}

/** Extrovis IT Agent — Me stays on this entity. Matchers are unchanged. */
export const EXTROVIS_AGENT_LOCKED_ENTITY_BY_EMAIL = {
  'jon.hudanich@kavispharma.com': 'Kavis',
  'vidhya.kumar@kavispharma.com': 'Kavis',
  'pradip.kakade@modepro.com': 'ModePro',
};

/** Extrovis IT Agent — My Team only. Dropdown stays hidden for these emails. */
export const EXTROVIS_AGENT_TEAM_ENTITY_BY_EMAIL = {
  'jon.hudanich@kavispharma.com': 'Kavis',
  'vidhya.kumar@kavispharma.com': 'Kavis',
  'pradip.kakade@modepro.com': 'ModePro',
};

/**
 * Extrovis IT Agent — keep entity filter; My Team uses All_tickets $sap=true.
 * Me landing / matchers unchanged.
 */
export const EXTROVIS_AGENT_SAP_TEAM_EMAILS = [
  'kishore.yepuri@extrovis.com',
  'chandana.metikala@refexls.com',
  'sarwar.syed@refexls.com',
  'sumeet.dongre@refexls.com',
  'chinmayee.maharana@refexls.com',
  'naveenkumar.thumukunta@refexls.com',
  'tanuja.villa@refexls.com',
  'anusha.shyamala@refexls.com',
  'karthikeyasrivasthav.annaluru@refexls.com',
  'nithyasree.pa@refexls.com',
  'seshasaiprasanna.kandikuppa@refexls.com',
  'waliullah.md@refexls.com',
  'venugopalareddy.yerreddu@refexls.com',
  'ganesh11.sable@refexls.com',
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

export function getExtrovisAgentTeamLockedEntity(email) {
  return EXTROVIS_AGENT_TEAM_ENTITY_BY_EMAIL[normalizeAgentEmail(email)] || '';
}

export function hidesExtrovisAgentEntityFilter(email) {
  return Boolean(getExtrovisAgentLockedEntity(email) || getExtrovisAgentTeamLockedEntity(email));
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
