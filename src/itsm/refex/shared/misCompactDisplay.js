/** Compact MIS display helpers — initials + request-type codes. */

import { getActiveDashboardProfile } from '../../../lib/kfITServiceDashboard.js';

function norm(value) {
  return String(value ?? '').trim();
}

export function hasMisDisplayValue(value) {
  const label = norm(value);
  return Boolean(label) && label !== '—';
}

function readProfileCol(row, key) {
  const raw = row?.raw ?? row;
  if (!raw || typeof raw !== 'object') return '';
  const col = getActiveDashboardProfile()?.serviceCol?.[key]
    || getActiveDashboardProfile()?.employeeCol?.[key]
    || '';
  if (!col) return '';
  const value = raw?.[col] ?? raw?.Data?.[col] ?? raw?.data?.[col];
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    return norm(value?.Name || value?.label || value?.value || '');
  }
  return norm(value);
}

/** Mohamed Aasik → MA, Arun Kumar → AK, Gowtham → GW */
export function getPersonInitials(name) {
  const label = norm(name);
  if (!label || label === '—') return '';
  const parts = label.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.map((part) => getPersonInitials(part)).filter(Boolean).join(', ');
  }
  const words = label.split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) {
    const token = words[0].replace(/[^A-Za-z]/g, '');
    if (!token) return words[0].slice(0, 2).toUpperCase();
    const first = token.charAt(0);
    const nextConsonant = token.slice(1).split('').find((ch) => !/[aeiou]/i.test(ch));
    if (nextConsonant) return `${first}${nextConsonant}`.toUpperCase();
    return token.slice(0, 2).toUpperCase();
  }
  const first = words[0].replace(/[^A-Za-z]/g, '').charAt(0);
  const last = words[words.length - 1].replace(/[^A-Za-z]/g, '').charAt(0);
  return `${first}${last}`.toUpperCase();
}

export const MIS_AVATAR_TONES = [
  { bg: 'bg-teal-100', text: 'text-teal-800' },
  { bg: 'bg-sky-100', text: 'text-sky-800' },
  { bg: 'bg-violet-100', text: 'text-violet-800' },
  { bg: 'bg-amber-100', text: 'text-amber-800' },
  { bg: 'bg-rose-100', text: 'text-rose-800' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  { bg: 'bg-orange-100', text: 'text-orange-800' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800' },
];

/** Stable color for a person name so MA / AS stay distinct across rows. */
export function getPersonAvatarTone(name) {
  const label = norm(name).toLowerCase();
  if (!label) return MIS_AVATAR_TONES[0];
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = ((hash << 5) - hash) + label.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % MIS_AVATAR_TONES.length;
  return MIS_AVATAR_TONES[index];
}

export function splitPersonNames(name) {
  return norm(name)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part !== '—');
}

export function getMisSourceLabel(row) {
  const candidates = [
    row?.source,
    row?.entitySource,
    readProfileCol(row, 'source'),
    readProfileCol(row, 'entitySource'),
    row?.raw?.Source,
    row?.raw?.source,
    row?.raw?.Channel,
    row?.raw?.Entity_Source,
    row?.raw?.Raised_By,
  ];
  for (const value of candidates) {
    if (hasMisDisplayValue(value)) return String(value).trim();
  }
  return '—';
}

export function getMisTicketTypeLabel(row) {
  const candidates = [
    row?.ticketType,
    row?.ticketTypeDetail,
    row?.changeType,
    row?.requestType,
    readProfileCol(row, 'ticketType'),
    readProfileCol(row, 'ticketTypeDetail'),
    row?.raw?.Ticket_Type,
    row?.raw?.Request_Type,
  ];
  let fallback = '';
  for (const value of candidates) {
    if (!hasMisDisplayValue(value)) continue;
    const label = String(value).trim();
    const token = label.toLowerCase().replace(/[\s_-]+/g, '');
    if (token === 'other' || token === 'others') {
      if (!fallback) fallback = label;
      continue;
    }
    return label;
  }
  const requestId = norm(
    row?.requestId
    || readProfileCol(row, 'requestId')
    || row?.raw?.Request_ID
    || '',
  );
  if (requestId) {
    const upper = requestId.toUpperCase();
    if (/(^|[-_/])IC([-_/]|$)/.test(upper) || upper.includes('-IC-')) return 'Incident';
    if (/(^|[-_/])SR([-_/]|$)/.test(upper) || upper.includes('-SR-')) return 'Service Request';
    if (/(^|[-_/])CR([-_/]|$)/.test(upper) || upper.includes('-CR-')) return 'Change Request';
  }
  return fallback || 'Others';
}

export function getMisCategoryLabel(row) {
  if (hasMisDisplayValue(row?.category)) return String(row.category).trim();
  const fromProfile = readProfileCol(row, 'category');
  if (hasMisDisplayValue(fromProfile)) return fromProfile;
  const raw = row?.raw;
  const fromRaw = norm(raw?.Category || raw?.category || '');
  if (fromRaw && fromRaw !== '—') return fromRaw;
  return 'Others';
}

export function getMisSubCategoryLabel(row) {
  if (hasMisDisplayValue(row?.subCategory)) return String(row.subCategory).trim();
  const fromProfile = readProfileCol(row, 'subCategory');
  if (hasMisDisplayValue(fromProfile)) return fromProfile;
  return 'Others';
}

export function getMisCriticalityLabel(row) {
  if (hasMisDisplayValue(row?.criticality)) return String(row.criticality).trim();
  const fromProfile = readProfileCol(row, 'criticality');
  if (hasMisDisplayValue(fromProfile)) return fromProfile;
  return 'Low';
}

/** Service Request → SR, Incident → IC */
export function getRequestTypeShort(value) {
  const label = norm(value);
  if (!label || label === '—') return '';
  const token = label.toLowerCase().replace(/[\s_-]+/g, '');
  if (token.includes('incident')) return 'IC';
  if (token.includes('servicerequest') || token === 'sr' || token.includes('service')) return 'SR';
  if (token.includes('changerequest') || token === 'cr') return 'CR';
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
}
