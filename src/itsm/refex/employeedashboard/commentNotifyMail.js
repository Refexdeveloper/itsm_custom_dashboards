/**
 * Fire-and-forget User-comment email (never Internal).
 * Agent User comment → requester To. Employee User comment → the entity To list.
 * From and Cc follow the ticket entity. HTML uses the Tech Help Desk comment theme.
 */
import { COMMENT_CHANNEL_USER, normalizeCommentChannel } from './commentChannel.js';
import { resolveDisplayRequestId } from '../../../lib/kfITServiceDashboard.js';
import { isExtrovisSapTicket } from '../../../lib/extrovisSapTicket.js';

export const COMMENT_MAIL_URL = 'https://refex-comment-mail-dhwffeu7pq-el.a.run.app';
export const COMMENT_MAIL_API_KEY = 'cmk_7f3a9c2e1b84d6f0a5e8c193b2470d6e';

export const COMMENT_MAIL_SUPPORT_TO = ['itsupport@extrovis.com'];
export const COMMENT_MAIL_SUPPORT_CC = ['mohamedaasik.m@refex.co.in'];
export const COMMENT_MAIL_AGENT_CC = ['mohamedaasik.m@refex.co.in', 'itsupport@extrovis.com'];
export const REFEXONE_LOGO_URL = 'https://storage.googleapis.com/aasik-refex-report-assets/refexone-logo.png';

const SAP_COMMENT_TO = 'kishore.yepuri@extrovis.com';
const SAP_COMMENT_CC = ['Sarwar.Syed@nttdata.com', 'Chandana.Metikala@nttdata.com'];

const EXTROVIS_COMMENT_FROM = 'itsupport@extrovis.com';
const KAVIS_COMMENT_FROM = 'itsupport@kavispharma.com';
const MODEPRO_COMMENT_FROM = 'itsupport@modepro.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeNotifyEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : '';
}

export function shouldNotifyUserCommentEmail({ extrovis = false, commentsType = '' } = {}) {
  return Boolean(extrovis) && normalizeCommentChannel(commentsType) === COMMENT_CHANNEL_USER;
}

/** From and Cc follow the ticket entity. To stays with the existing recipient rule. */
export function resolveCommentMailIdentity(entity = '') {
  const token = String(entity || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (token.startsWith('kavis')) {
    return {
      from: KAVIS_COMMENT_FROM,
      cc: ['Jon.Hudanich@kavispharma.com', 'Vidhya.Kumar@kavispharma.com'],
    };
  }
  if (token.startsWith('modepro')) {
    return {
      from: MODEPRO_COMMENT_FROM,
      cc: ['pradip.kakade@modepro.com'],
    };
  }
  return {
    from: EXTROVIS_COMMENT_FROM,
    cc: [EXTROVIS_COMMENT_FROM],
  };
}

export function resolveCommentMailEntity(row) {
  const raw = row?.raw && typeof row.raw === 'object' ? row.raw : {};
  const values = [
    row?.entity,
    row?.Entity,
    row?.entityName,
    raw.Entity,
    raw.Entity_1,
    raw.Column_3BS3PmwiFu,
    raw.Column_bmKcae3MCg,
  ];
  for (const value of values) {
    const text = String(value || '').trim();
    if (text && text !== '—') return text;
  }
  return '';
}

/** Employee To follows the entity list. Never fall back to Extrovis for Kavis or ModePro. */
function entityCommentTo(identity) {
  return (identity?.cc || []).map((item) => normalizeNotifyEmail(item)).filter(Boolean);
}

function uniqueMailList(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const email = normalizeNotifyEmail(item);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(String(item).trim());
  }
  return out;
}

function sapTicketOn(sap) {
  if (sap === true || sap === 1) return true;
  const text = String(sap ?? '').trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === '1';
}

const SAP_COMMENT_CC_ALL = [SAP_COMMENT_TO, ...SAP_COMMENT_CC];

/** User comment → entity To. Agent comment → requester To.
 *  From stays on the entity. SAP Yes replaces Cc with the SAP team. */
export function resolveCommentMailRecipients({
  role = 'agent',
  requesterEmail = '',
  entity = '',
  sap = false,
} = {}) {
  const identity = resolveCommentMailIdentity(entity);
  const supportTo = entityCommentTo(identity);
  const baseCc = sapTicketOn(sap) ? SAP_COMMENT_CC_ALL : identity.cc;
  const employee = String(role || '').trim().toLowerCase() === 'employee';
  const email = normalizeNotifyEmail(requesterEmail);
  if (!employee && email) {
    return {
      to: [email],
      cc: uniqueMailList(baseCc).filter((item) => normalizeNotifyEmail(item) !== email),
      from: identity.from,
    };
  }
  return {
    to: supportTo,
    cc: uniqueMailList(baseCc),
    from: identity.from,
  };
}

function personEmail(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.Email || value.email || value.Mail || '';
  }
  return '';
}

export function resolveCommentRequesterEmail(row) {
  const raw = row?.raw && typeof row.raw === 'object' ? row.raw : {};
  const candidates = [
    row?.requesterEmail,
    row?.Requester_Email,
    personEmail(row?.requester),
    raw.Requester_Email,
    raw.Email,
    raw.Column_Egh9ss0nVO,
    raw.Column__SdDpYraVa,
    raw['Column_-BMqFmhcjD'],
  ];
  for (const value of candidates) {
    const email = normalizeNotifyEmail(personEmail(value) || value);
    if (email) return email;
  }
  return '';
}

function greetingFirstName(name) {
  const raw = String(name || '').trim();
  if (!raw || raw === '—') return '';
  if (raw.includes(',')) {
    for (const part of raw.split(',')) {
      const found = greetingFirstName(part.trim());
      if (found) return found;
    }
    return '';
  }
  const text = raw.replace(/\s*\((user|role)\)\s*$/i, '').trim();
  const low = text.toLowerCase();
  if (!text) return '';
  if (low.includes('it agent') || low.includes('itsm bot') || low === 'bot') return '';
  if (text.includes('@')) return text.split('@')[0].split(/[._]/)[0];
  return text.split(/\s+/)[0];
}

export function resolveAssignedGreetingName(row) {
  const values = [
    row?.assignedToUserRaw,
    row?.assignedToRaw,
    row?.assignedTo,
    row?.raw?._current_assigned_to,
  ];
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const kind = String(item?.Kind || item?.kind || '').toLowerCase();
        if (kind === 'approle' || kind === 'role') continue;
        const name = greetingFirstName(item?.Name || item?.name || item);
        if (name) return name;
      }
      continue;
    }
    if (value && typeof value === 'object') {
      const kind = String(value.Kind || value.kind || '').toLowerCase();
      if (kind === 'approle' || kind === 'role') continue;
      const name = greetingFirstName(value.Name || value.name);
      if (name) return name;
      continue;
    }
    const name = greetingFirstName(value);
    if (name) return name;
  }
  return '';
}

export function commentMailSubject(requestId) {
  const id = String(requestId || '').trim() || 'Ticket';
  return `Tech Help Desk - New Comment Added | Ticket ${id}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayField(value, fallback = '—') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function formatCommentMailDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function rowSubject(row) {
  return row?.subject || row?.Subject || row?.title || '';
}

export function buildCommentMailHtml({
  requestId = '',
  requesterName = '',
  greetingName = '',
  ticketType = '',
  category = '',
  subject = '',
  authorName = '',
  comment = '',
  commentedAt = '',
  attachmentCount = 0,
} = {}) {
  const ticket = escapeHtml(displayField(requestId));
  const greeting = escapeHtml(displayField(greetingName || requesterName, 'User'));
  const title = escapeHtml(displayField(subject));
  const author = escapeHtml(displayField(authorName, 'Help Desk'));
  const when = escapeHtml(displayField(commentedAt || formatCommentMailDate(), ''));
  const body = escapeHtml(displayField(comment, '(Attachment only)')).replace(/\r\n|\r|\n/g, '<br/>');
  const files = Number(attachmentCount) > 0
    ? `<div style="margin-top:10px;font-size:13px;color:#397A7A;">${Number(attachmentCount)} attachment(s) added on the ticket.</div>`
    : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>Tech Help Desk - New Comment</title><style>@media only screen and (max-width:600px){.wrapper{width:100% !important;max-width:100% !important;border-radius:0 !important;}.outer-pad{padding:20px 8px !important;}.header-title{font-size:24px !important;line-height:30px !important;}.details-title{font-size:19px !important;line-height:25px !important;}.assignment-status{font-size:13px !important;line-height:20px !important;}.logo-img{width:180px !important;max-width:75% !important;}.header-curve{width:65% !important;}.detail-label{width:35% !important;min-width:35% !important;max-width:35% !important;box-sizing:border-box !important;word-break:normal !important;overflow-wrap:break-word !important;white-space:normal !important;}.detail-value{width:65% !important;min-width:65% !important;max-width:65% !important;box-sizing:border-box !important;word-break:break-word !important;overflow-wrap:anywhere !important;white-space:normal !important;}.details-table{width:100% !important;table-layout:fixed !important;}.comment-title{font-size:19px !important;line-height:25px !important;}.comment-card{padding:18px !important;}.comment-text{font-size:14px !important;line-height:23px !important;}.footer-text{font-size:12px !important;line-height:20px !important;}}</style></head><body style="margin:0;padding:0;background:#EEF4FA;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#334155;"><table width="100%" cellpadding="0" cellspacing="0" border="0" class="outer-pad" style="width:100%;background:#EEF4FA;padding:34px 10px;"><tr><td align="center"><table class="wrapper" width="700" cellpadding="0" cellspacing="0" border="0" style="width:700px;max-width:700px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(70,100,130,0.12);"><tr><td align="center" style="background:#FFFFFF;text-align:center;padding:15px 20px 0 20px;"><img class="logo-img" src="${REFEXONE_LOGO_URL}" alt="Refexone" width="200" style="display:block;width:200px;max-width:80%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;"></td></tr><tr><td align="center" style="background:#FFFFFF;text-align:center;padding:0 20px 4px 20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:8px 0 0 0;"><table class="header-curve" width="65%" cellpadding="0" cellspacing="0" border="0" style="width:65%;height:8px;"><tr><td style="height:8px;border-bottom:3px solid #58A6A6;border-radius:0 0 50% 50%;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr></table></td></tr><tr><td align="center" style="background:#FFFFFF;text-align:center;padding:4px 20px 8px 20px;"><h1 class="header-title" style="margin:0;font-size:27px;font-weight:700;line-height:34px;color:#315E89;">Tech Help Desk</h1><div class="assignment-status" style="margin-top:8px;text-align:center;font-size:14px;line-height:20px;color:#397A7A;font-weight:600;">💬 New Comment</div></td></tr><tr><td style="padding:22px 35px 16px;background:#FFFFFF;"><div style="font-size:16px;line-height:25px;color:#334155;">Dear<strong style="color:#315E89;"> ${greeting}</strong>,</div><div style="margin-top:8px;font-size:14px;line-height:23px;color:#64748B;">A new comment has been added to your ticket. Please review the latest update and take the required action, if applicable.</div></td></tr><tr><td style="padding:10px 35px 26px;background:#FFFFFF;"><h2 class="details-title" style="color:#315E89;border-left:3px solid #58A6A6;padding-left:12px;font-size:22px;font-weight:700;line-height:28px;margin:0 0 18px 0;">Ticket Details</h2><table class="details-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #DCE7F1;table-layout:fixed;"><tr style="background:#F5FAFA;"><td class="detail-label" width="35%" style="width:35%;padding:12px;font-size:14px;font-weight:600;border:1px solid #DCE7F1;color:#35536F;">Request ID</td><td class="detail-value" style="width:65%;padding:12px;font-size:14px;font-weight:600;border:1px solid #DCE7F1;color:#397A7A;">${ticket}</td></tr><tr style="background-color:#FFFFFF;"><td class="detail-label" width="35%" style="width:35%;padding:13px;font-size:14px;font-weight:600;border:1px solid #DCE7F1;color:#1E3A5F;">Subject</td><td class="detail-value" style="width:65%;padding:13px;font-size:14px;border:1px solid #DCE7F1;color:#475569;">${title}</td></tr></table></td></tr><tr><td class="section" style="padding:5px 35px 35px;"><h2 class="section-title" style="margin:0;padding:0 0 0 12px;border-left:5px solid #16A085;font-size:22px;font-weight:700;line-height:28px;color:#16A085;">💬 Latest Comment</h2><table width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin-top:18px;background-color:#F4FBF8;border:1px solid #D5EEE6;border-radius:14px;"><tr><td class="comment-card" style="padding:24px;"><table class="comment-header" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;font-weight:700;color:#166534;">Commented By</td><td align="right" style="font-size:13px;color:#64748B;">${when}</td></tr></table><div style="margin-top:10px;font-size:15px;font-weight:600;color:#334155;">${author}</div><div class="comment-text" style="margin-top:18px;padding:18px;background-color:#ffffff;border-radius:10px;border:1px solid #DDEEE8;font-size:15px;line-height:27px;color:#475569;">${body}${files}</div></td></tr></table></td></tr><tr><td style="background:#222831;text-align:center;padding:18px 20px 22px 20px;"><div class="footer-text" style="font-size:14px;line-height:22px;color:#A3ACB8;">This is an automatically generated email.<br>Please do not reply directly to this message.</div></td></tr></table></td></tr></table></body></html>`;
}

export function buildCommentMailPayload({
  extrovis = false,
  commentsType = '',
  role = 'agent',
  row = null,
  comment = '',
  authorName = '',
  attachments = [],
} = {}) {
  if (!shouldNotifyUserCommentEmail({ extrovis, commentsType })) return null;
  const requestId = resolveDisplayRequestId(row) || row?.requestId || row?.id || '';
  const recipients = resolveCommentMailRecipients({
    role,
    requesterEmail: resolveCommentRequesterEmail(row),
    entity: resolveCommentMailEntity(row),
    sap: isExtrovisSapTicket(row),
  });
  if (!recipients) return null;
  const isEmployee = String(role || '').trim().toLowerCase() === 'employee';
  const requesterName = row?.requesterName || row?.Requester_Name || '';
  const assignedName = resolveAssignedGreetingName(row);
  return {
    to: recipients.to,
    cc: recipients.cc,
    subject: commentMailSubject(requestId),
    html: buildCommentMailHtml({
      requestId,
      requesterName,
      greetingName: isEmployee ? (assignedName || 'IT Support') : (requesterName || assignedName),
      subject: rowSubject(row),
      authorName,
      comment,
      commentedAt: formatCommentMailDate(),
      attachmentCount: Array.isArray(attachments) ? attachments.length : 0,
    }),
    from: recipients.from,
  };
}

export async function queueUserCommentNotifyMail(ctx) {
  const payload = buildCommentMailPayload(ctx);
  if (!payload || typeof fetch !== 'function') return { skipped: true };
  try {
    const response = await fetch(`${COMMENT_MAIL_URL}/v1/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': COMMENT_MAIL_API_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.warn('Comment notify mail failed', response.status);
      return { ok: false, status: response.status };
    }
    return { ok: true };
  } catch (err) {
    console.warn('Comment notify mail skipped', err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}
