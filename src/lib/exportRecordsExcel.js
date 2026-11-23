/** Download the rows already on screen (after every filter) as an Excel workbook. */

const SKIP_KEYS = new Set(['expand', 'actions', 'viewDetails', 'takeAction']);

export function exportableColumns(columns = []) {
  return (columns || []).filter((col) => {
    const key = col?.key || col?.id;
    if (!key || SKIP_KEYS.has(key)) return false;
    return Boolean(String(col?.label || '').trim());
  });
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellText(value) {
  const text = String(value ?? '').trim();
  return text || '—';
}

export function buildExcelXml({
  sheetName = 'Records',
  columns = [],
  rows = [],
  getCellText,
} = {}) {
  const cols = exportableColumns(columns);
  const header = cols.map((col) => (
    `<Cell><Data ss:Type="String">${xmlEscape(col.label)}</Data></Cell>`
  )).join('');
  const body = (rows || []).map((row) => {
    const cells = cols.map((col) => {
      const raw = typeof getCellText === 'function'
        ? getCellText(col, row)
        : row?.[col.key || col.id];
      return `<Cell><Data ss:Type="String">${xmlEscape(cellText(raw))}</Data></Cell>`;
    }).join('');
    return `<Row>${cells}</Row>`;
  }).join('');
  const name = xmlEscape(String(sheetName || 'Records').slice(0, 31));
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${name}"><Table>
<Row>${header}</Row>
${body}
</Table></Worksheet>
</Workbook>`;
}

export function excelStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function downloadExcelWorkbook({
  filename = 'records',
  ...rest
} = {}) {
  const xml = buildExcelXml(rest);
  if (typeof document === 'undefined') return xml;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safe = String(filename || 'records').replace(/[^\w.-]+/g, '-');
  link.href = url;
  link.download = safe.endsWith('.xls') ? safe : `${safe}.xls`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return xml;
}
