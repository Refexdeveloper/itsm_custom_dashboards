# Extrovis / Non-Refex — requirement coverage

Entities: **Extrovis, ModePro, Kavis, Pharma Pack** (shared process `Live_IT_Service_Request_Extrovis_A00`).  
Surfaces: **Refex One Help Desk** (`super-app`) + **Kissflow MIS packs** (`aasik_ITSM`).

Status: **Done** in code · **Partial** · **Kissflow-only** (not in these repos) · **Needs product decision**

---

## Requested list (1–14)

| # | Requirement | Status | Where / rule |
|---|-------------|--------|----------------|
| 1 | Two-way communication | **Done** | Help Desk + Extrovis MIS comments on **IT Agent Solution / Dependency / After Dependency**. **Not** on PickUp. Employee/Help Desk writes `Comments_2=User`. Agent MIS can send Internal or User. |
| 2 | Two-way with attachments | **Done** | One file, **10 MB**. Help Desk: GCS URL → webhook `Attachment: ["https://…"]`. MIS: Kissflow `/upload/2` on the nested `IT__Agent_Solution` row. |
| 3 | Subject on the form | **Done** | Non-Refex create form: **Subject required**. Webhook sends `Subject`. Refex does **not** send Subject. Empty MIS Subject shows `-`. |
| 4 | Internal / User comments separated | **Done** | Nested `Comments_2`. Agent MIS: **Internal** (default) and **User Comments** tabs. Help Desk / Employee: **User only** (Internal stays in agent MIS). Legacy blank `Comments_2` counts as Internal. |
| 5 | Dashboard UI issues | **Partial** | KPI cards, Subject column, comment tabs, attachments on expand, Extrovis Open/My Tickets/Closed split are in code. No single signed-off UI punch-list — remaining visual bugs need a ticket-by-ticket list. |
| 6 | Changes in the email notification | **Done** | User comments only (`Comments_2=User`). Internal comments do not email. GCP `refex-comment-mail` `POST /v1/send` uses supportone SMTP, display From `itsupport@extrovis.com`. Employee / Help Desk → To `itsupport@extrovis.com` CC `mohamedaasik.m@refex.co.in`. IT Agent User comment → requester email only. Subject: `Tech Help Desk - New Comment Added \| Ticket {Request_ID}`. |
| 7 | Duplicate Assigned-to email | **Kissflow-only** | Repeated “Assigned to” mail is almost always **two Kissflow notification rules** (or assign + re-assign). Fix in Kissflow Notifications, not dashboard code. |
| 8 | Ticket reopen two-way communication | **Done** | After reopen, comments stay enabled. Non-Refex reopen write uses **admin PUT** `{base}/process/2/{account}/admin/{process}/{instance}` with **ITSM Setup** keys (not bot). PickUp still cannot comment. |
| 9 | Location shown by entity | **Done** | Non-Refex: `GET /itsm/non-refex-locations?entity=` → Kissflow location master (`Location_1`) filtered to that entity. Refex: fixed office list. |
| 10 | Edit ticket type + quick search | **Done** | Non-Refex: **No** = Quick Search (Refex catalog, Incident / SR only). **Yes** = cascade Ticket Type → Category → Sub Category → Sub Type. Refex: Quick Search **mandatory**. Change Request is **not** on the create form. |
| 11 | Location discrepancy (user vs ITSM) | **Needs product decision** | See clarification below. Code already maps SSO/HR location onto the entity catalog when the strings match. |
| 12 | Ticket Stage vs Ticket Status | **Needs product decision** | See clarification below. Display and KPI use **different fields** on purpose. |
| 13 | Mandatory fields | **Done** | All required create fields are configured: Name, Email, Entity, Location, Description, Criticality; Non-Refex **Subject**. **Assigned To is not mandatory** on create — the end user opens an unassigned ticket and does not choose the engineer. IT assigns after the ticket is in the Open pool. |
| 14 | Ticket Status discrepancy | **Needs product decision** | Same root as #12. Closed KPI ≠ `Statu_1` alone. |

---

## Clarifications (11, 12, 14)

### 11 — Location: user perspective vs ITSM tool

Two different sources:

| Source | Field | Used for |
|--------|--------|----------|
| Refex One login / HR | `user.location` / office / branch | Pre-fill on create |
| Kissflow location master | `Location_1` (plus Entity) | Dropdown after entity is chosen |

We **normalize** (strip spaces, `II`→`2`, `I`→`1`) and pick the catalog value when it matches. If HR says `EPL I` and Kissflow has `EPL-I` for Extrovis, they match. If HR has a city/office that is **not** on that entity’s master, the dropdown will not show the HR value — that is the “discrepancy.”

**Decision needed:** should we (a) keep catalog-only (current), (b) show HR location as a warning when unmatched, or (c) add the HR value as a one-off option?

### 12 — Stage vs Status

These are **not** the same field.

| Label | What it is | Extrovis rule in MIS |
|-------|------------|----------------------|
| **Ticket Status** | Business / item status (`Statu_1`, Open, Closed, Hold, …) | Shown as stored. **Closed KPI does not use Statu_1 alone.** |
| **Stage** | Process `Stages` / workflow display | **Open Tickets** tab → show **InProgress**. **Closed** tab / Closed KPI → show **Closed**. Empty Subject → `-`. |
| **Current step** | Kissflow `_current_step` | PickUp / Solution / Dependency / After Dependency / ReOpen Window |

Unexpected UI is usually: Status = Closed on the form while the ticket is still at **IT Agent Solution** (still **My Tickets**, not Closed KPI), or Stage = InProgress while Status = Hold.

**Decision needed:** should Stage always follow `Stages` from Kissflow, or keep the Open=InProgress / Closed=Closed display contract?

### 14 — Ticket Status discrepancy

Closed in MIS = **ReOpen Window** (7 days) **or** process **Completed** — not `Statu_1 = Closed`. A ticket with Status Closed that is still in Solution stays **My Tickets**. Reopened work is tagged **Reopened** on the row; there is no Reopened KPI.

**Decision needed:** should Closed KPI follow `Statu_1`, or keep ReOpen Window / Completed (current product rule)?

---

## Requirements we shipped that were not on the list

Add these to the Non-Refex scope so they are not treated as leftovers:

1. **No comments on IT Agent PickUp** (employee and Help Desk). Comments start at Solution / Dependency.
2. **Help Desk hides Internal comments.** Only `Comments_2=User` is shown to the requester.
3. **Refex dashboards have no Comments chat** — Solution / Resolution on Overview only.
4. **One attachment only, 10 MB**, public URL on create webhook.
5. **ITSM Setup Live/Dev** switches host, account, keys, and **both** submit webhooks.
6. **Reopen comments use Setup admin PUT**, not the bot user.
7. **Cloudflare challenge HTML** must never become a ticket, comment, or error payload.
8. **KPI split:** Open = PickUp in live bucket · My Tickets = Solution / Dependency / After Dependency · Closed = ReOpen Window + Closed By.
9. **No Pending Approval card** on Extrovis agent / first / final packs.
10. **Create form:** Incident + Service Request only (no Change Request).
11. **Venwind / Refex company filter** is Refex-process only — do not apply to Extrovis.
12. **SLA:** PickUp MIS cell = created time + TAT 2h (not KPI). Live SLA on My Tickets when Stage = InProgress (Closure_Time + last modified). Other stages → Hold. Closed SLA unchanged.

---

## Still open (not in code)

| Item | Owner | Action |
|------|--------|--------|
| #6 Email content / template changes | Kissflow | Edit Extrovis process email templates |
| #7 Duplicate Assigned-to mail | Kissflow | One notification on assign; disable the second rule |
| #5 leftover UI polish | MIS / Help Desk | Need a screenshot list |
| #13 extra mandatories beyond the create set | Product | Only if Extrovis asks for more than Name / Email / Entity / Location / Description / Criticality / Subject. Assigned To stays optional on create. |
| #11 / #12 / #14 | Product | Pick one rule each (above) |

---

## Code anchors

| Area | File |
|------|------|
| Help Desk create + Subject + locations + edit/quick search | `super-app/frontend/src/pages/CreateITRequest.js` |
| Help Desk comments / reopen / PickUp block | `super-app/frontend/src/pages/ITSMDashboard.js` |
| Locations API + admin PUT comments | `super-app/backend/routes/itsm.py` |
| MIS Internal / User + Subject / Stage display | `aasik_ITSM/src/itsm/refex/employeedashboard/commentChannel.js` |
| MIS comment POST + attachments | `aasik_ITSM/src/itsm/refex/employeedashboard/agentSolutionCommentApi.js` |
| Extrovis Open / My Tickets / Closed | `aasik_ITSM/src/lib/kfITServiceDashboard.js` |
