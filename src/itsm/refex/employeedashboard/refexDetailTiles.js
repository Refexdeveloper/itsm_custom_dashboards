import { buildServiceContextTiles } from '../../../components/it/mis/misExpandContent.js';

/** Refex employee Details tab — excludes workflow/ticket status fields. */
export function buildRefexEmployeeDetailTiles(row) {
  const hidden = new Set(['Status', 'Ticket Status', 'Workflow Status']);
  return buildServiceContextTiles(row, {
    showEntity: true,
    showDeptLocation: false,
  }).filter((tile) => !hidden.has(tile.label));
}
