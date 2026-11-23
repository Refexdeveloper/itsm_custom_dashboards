# Non-Refex ITSM — configuration and customizations

Account: `AcCMptlq60zH` (`refexgroup.kissflow.com`).  
Scope: every entity on the Extrovis service process. Refex and Venwind use a different process and are not covered here.

This is the implemented configuration as of 18 Nov 2026. Source of truth in code: `src/lib/itDashboardProfiles.js`, `src/lib/kfITServiceDashboard.js`, `src/lib/extrovisSapTicket.js`, `src/itsm/refex/employeedashboard/commentNotifyMail.js`.

---

## 1. Entities

All four entities share one Kissflow process and one service report. The dashboard filters rows by the Entity column. It does not load a separate report per entity. Kissflow `$entity` on `All_tickets` returns empty, so named tabs are a client filter on the shared report.

| Entity key | Label in the tool | Process | Service report |
|------------|-------------------|---------|----------------|
| Extrovis | Extrovis | `Live_IT_Service_Request_Extrovis_A00` | `All_tickets_A00` |
| Kavis / KavisPharma | Kavis | same | same |
| PharmaPack | Pharma Pack | same | same |
| ModePro / Modepro | Modepro | same | same |

Change requests use report `Change_Request_Extrovis_A00` on the same family.

Entity dropdown on Agent, First, and Final packs:

| Key | Label |
|-----|--------|
| all | All |
| Extrovis | Extrovis |
| Kavis | Kavis |
| PharmaPack | Pharma Pack |
| ModePro | Modepro |

**All** shows every ticket on the Extrovis process. A named tab keeps only rows whose entity matches that name.

---

## 2. Dashboard packs

Each pack is a Kissflow component zip. Rebuild with `npm run zip:it` (or `scripts/zip-extrovis-a00.js` for the Extrovis family) and upload the zip. An old pack already installed in Kissflow does not pick up code changes.

| Role | Pack | What it is for |
|------|------|----------------|
| Employee | `ITEmployeeExtrovisDashboardProject` | Requester: own tickets, comments at Solution |
| IT Agent | `ITAgentExtrovisDashboardProject` | PickUp, Solution, My Team, SAP team rule |
| First level | `ITFirstLevelExtrovisApproverDashboardProject` | Same service KPIs as the agent monitoring view. No Pending Approval card |
| Final level | `ITFinalLevelExtrovisApproverDashboardProject` | Same as First |
| Admin | `ITAdminDashboardProject` | Org-wide. Default entity Extrovis. Includes Refex as a separate option |
| CEO | `ITCEODashboardProject` | Me / My Team like Head, plus IT Agents filter |

Queue labels on these packs: **SR & INC** (service request and incident) and **Change**.

There is no L1, L2, IT Manager, or IT Head approval step on this process. There is no Pending Approval KPI.

---

## 3. Workflow

Service path:

1. **IT Agent PickUp** — open pool. Activity `Activity_9gAyNCIowD`. Report column `Column_7WajlrHQ7C`.
2. **IT Agent Solution** — a person owns the ticket. Activity `Activity_XVeFnZdKon`. Report column `Column_hqa27TIa-1`.
3. **Dependency Assignee** — optional. Activity `Activity_mtwvpxK-0q`. Column `Column_kJ9fZjyn6Q`.
4. **IT Tech Support After Dependency** — optional. Activity `Activity_XSuxhIx9TQ`. Column `Column_APHthsvL9P`.
5. **ReOpen Window** — 7 days. Activity `Activity_7rCa3_zSic`. Column `Column_9edMpjzOjb`.

Create page: `Extrovis_Create_Employee_Ticket_A00`.  
Progress branch name: `Extrovis`.  
Agent status field written on open/close: `Validation`. Solution text field: `It_Agent_Solution`.

Assigned To at PickUp displays **Waiting for Pickup**. Accept is only on **Me → Open Tickets** while the step is PickUp. Accept is not on My Team.

---

## 4. Ticket status, stage, and closed

These are three different values.

| Name | Field | How the dashboard uses it |
|------|--------|---------------------------|
| Ticket Status | `Statu_1` / item status, column `Column_ps84EEKkEI` | Shown as stored (Open, InProgress, OnHold, Closed, …) |
| Stage | process Stages, column `Column_JUGHj6d2Xj` | Display and SLA clock. InProgress starts the live SLA clock. Any other stage is Hold |
| Current step | `Column_Yf9r2UCRuu` | PickUp, Solution, Dependency, After Dependency, ReOpen Window |

**Closed** means the ticket is in **ReOpen Window** or the Kissflow process is **Completed**. `Statu_1 = Closed` alone does not close the KPI. A ticket that still sits on Solution stays in My Tickets even if Status says Closed.

**Rejected** is its own status. It is not Closed.

Reopened tickets keep a **Reopened** tag on the request id (`Column_U0QcqEXR63`). There is no Reopened KPI card.

---

## 5. Me, My Team, and who sees which tickets

### Me (every IT Agent, and the same owned-work rule on First / Final)

Me shows:

- Extrovis **PickUp** tickets that are in the live pending bucket (the Accept pool)
- An open ticket only when the **live workflow task** is assigned to that person
- Tickets that person closed (human solver; a BOT auto-close is credited to the human who solved it)

The report columns **Assigned To** (`Column_7Fn1867jLF`) and **Assigned To User** (`Column_9uwhycudkA`) do not put a ticket in Me by themselves. A pending row with no personal assignee is not Me, except the PickUp pool.

### My Team

My Team is the full entity-scoped queue. It includes the signed-in user’s own tickets.

**My Team → Open Tickets** is Ticket Status Open. It does not require Stage or `Statu_1` to say Open.

### Named logins

| Login | Me | My Team | Entity filter |
|-------|----|---------|----------------|
| `jon.hudanich@kavispharma.com` | Unchanged. Stays on Kavis | Stays on Kavis | Hidden |
| `vidhya.kumar@kavispharma.com` | Unchanged. Stays on Kavis | Stays on Kavis | Hidden |
| `pradip.kakade@modepro.com` | Unchanged. Stays on Modepro | Stays on Modepro | Hidden |
| `agnes.simon@pharmapack.hu` | Unchanged. Not entity-locked | Pharma Pack only | Hidden on My Team |
| `gabriella.farkas@pharmapack.hu` | Unchanged. Not entity-locked | Pharma Pack only | Hidden on My Team |
| SAP team list below | Unchanged (own tasks + closed + PickUp) | **SAP tickets only** (`All_tickets` with `$sap=true`), entities All / Extrovis / Kavis / Modepro | Stays visible |

Pharma Pack is on the normal entity list. It is not on the SAP-team entity list.

### SAP team (My Team = SAP tickets only)

`kishore.yepuri@extrovis.com`, `chandana.metikala@refexls.com`, `sarwar.syed@refexls.com`, `sumeet.dongre@refexls.com`, `chinmayee.maharana@refexls.com`, `prasad.mandula@bs.nttdata.com`, `naveenkumar.thumukunta@refexls.com`, `tanuja.villa@refexls.com`, `anusha.shyamala@refexls.com`, `karthikeyasrivasthav.annaluru@refexls.com`, `nithyasree.pa@refexls.com`, `seshasaiprasanna.kandikuppa@refexls.com`, `waliullah.md@refexls.com`, `venugopalareddy.yerreddu@refexls.com`, `ganesh11.sable@refexls.com`, `vishnu.vishwanadh@refexls.com`, `naveen.gudla@refexls.com`.

A former `@nttdata.com` or `@bs.nttdata.com` login for these locals is treated as the same `@refexls.com` user. Me landing is not replaced when My Team loads the SAP report.

A ticket is SAP when column `Column_l8-JThY4eN` is true / yes / 1. SAP module is `Column_xAD9rXgk8-`.

---

## 6. KPI cards

Period (Weekly, Monthly, FY) applies after Me / My Team. A past financial year does not pull in today’s open tickets. Today’s snapshot (Today Open, Today Closed, Today SLA) ignores the period and still uses Me / My Team.

### IT Agent, First, and Final

| Card | Me | My Team |
|------|----|---------|
| All Tickets | Union of that user’s Me rows | Full scoped queue |
| Open Tickets | Live **IT Agent PickUp** | Ticket Status Open |
| My Tickets | Solution, Dependency, or After Dependency with a live task assigned to that user. Includes the Reopened tag | Same owned-work rule for the signed-in user. The My Tickets card is hidden on the My Team tab; Open covers the queue |
| SLA Breached | Open SLA is a subset of My Tickets whose Stage is InProgress. Closed SLA is a subset of Closed, using the last Solution result | Same |
| Closed | ReOpen Window or Completed, and closed by that user (or live in their reopen bucket) | Every closed ticket in the queue |

PickUp shows a 2 hour clock on the row (created time + TAT, field TAT or 120 minutes). That clock is display only. It is not the Open SLA KPI.

On My Tickets, the live SLA clock runs only when Stage is InProgress, using Closure Time plus last modified. Any other stage shows **Hold** and does not count as SLA breached.

---

## 7. Comments

Comments exist on Extrovis-family dashboards only. Refex shows Solution / Resolution on Overview and has no comment chat.

| Who | Where they can write | Channel |
|-----|----------------------|---------|
| Employee and Help Desk | IT Agent Solution (Employee Open). Not on PickUp. Not on Closed | User only. Internal comments stay hidden |
| IT Agent, First, Final | IT Agent Solution, on Me and on My Team, and on My Team → Open Tickets | Internal (default) and User |

Save uses the Integration admin PUT:

`/process/2/{account}/admin/{process}/{instance}`

Nested table `Table::IT__Agent_Solution` only. Each save adds a new row (`IT__Agent_Solution_` + 10 hex). `Name_1` is the person name. Extrovis also sends `Stages_1: InProgress`. The process `update-item` API is not used (it fails for requesters).

One attachment, 10 MB, uploaded with Kissflow `/upload/2` onto that solution row. Help Desk create stores a public URL and sends `Attachment: ["https://…"]`.

Channel field on the nested row: `Comments_2`. Blank legacy rows count as Internal. Reopen does not turn comments off. PickUp still cannot comment.

Subject on a non-Refex ticket is required at create. An empty subject on the MIS table shows `-`.

---

## 8. Comment email

Only **User** comments send mail. Internal comments do not.

Service: `refex-comment-mail` `POST /v1/send`. Display From and Cc follow the ticket entity.

| Ticket entity | From | Employee / Help Desk comment goes To | Cc |
|---------------|------|--------------------------------------|----|
| Extrovis | `itsupport@extrovis.com` | `itsupport@extrovis.com` | `itsupport@extrovis.com` |
| Pharma Pack | `itsupport@extrovis.com` | `agnes.simon@pharmapack.hu`, `gabriella.farkas@pharmapack.hu` | same two |
| Kavis | `itsupport@kavispharma.com` | `Jon.Hudanich@kavispharma.com`, `Vidhya.Kumar@kavispharma.com` | same two |
| Modepro | `itsupport@modepro.com` | `pradip.kakade@modepro.com` | same |

An IT Agent User comment goes **To the requester**. Cc stays the entity list above. Kavis, Modepro, and Pharma Pack never fall back to the Extrovis mailbox. Pharma Pack still sends From `itsupport@extrovis.com`.

Subject shape: `Tech Help Desk - New Comment Added | Ticket {Request_ID}`.

### SAP comment routing

When the ticket is SAP, User-comment routing replaces the entity Cc.

Cc becomes Kishore Yepuri plus Sarwar Syed, Chandana Metikala, Vishnu Vishwanadh, and Naveen Gudla. Kavis SAP comments also keep `Vidhya.Kumar@kavispharma.com` on Cc.

To is chosen in this order: the Kissflow assignee’s mailbox, then the SAP module owner, then Kishore Yepuri.

| Module | Mailbox |
|--------|---------|
| PP, QM | `Sumeet.Dongre@refexls.com` |
| MM | `chinmayee.maharana@refexls.com`, `prasad.mandula@bs.nttdata.com` |
| PM | `naveenkumar.thumukunta@refexls.com` |
| SD | `Tanuja.Villa@refexls.com` and `Anusha.Shyamala@refexls.com` (both, even if only one name matched) |
| BASIS | `KarthikeyaSriVasthav.Annaluru@refexls.com` |
| FI | `Nithyasree.PA@refexls.com` |
| WM | `SeshaSaiPrasanna.Kandikuppa@refexls.com` |
| SECURITY | `Waliullah.Md@refexls.com` |
| CO | `VenugopalaReddy.Yerreddu@refexls.com` |
| PS | `Ganesh11.Sable@refexls.com` |

Duplicate “Assigned to” mail is a Kissflow notification rule, not this comment sender. Turn off the extra Kissflow rule if that mail fires twice.

---

## 9. Create form and locations

Non-Refex create (Help Desk and the Extrovis create page):

| Rule | Configuration |
|------|----------------|
| Required | Name, Email, Entity, Location, Description, Criticality, Subject |
| Assigned To | Not required. The requester does not pick an engineer. The ticket enters the PickUp pool |
| Ticket types | Incident and Service Request. Change Request is not on this create form |
| Quick search | **No** = Quick Search against the Refex catalog (Incident / SR only). **Yes** = Ticket Type → Category → Sub Category → Sub Type |
| Location | `GET /itsm/non-refex-locations?entity=` reads Kissflow `Location_1` for that entity. Refex uses a fixed office list |
| Location match | HR / SSO location is normalized (spaces, `II`→`2`, `I`→`1`) and selected when it matches the entity catalog. A city that is not on that entity’s master is not added to the dropdown |

---

## 10. Reassign

On My Team → Open Tickets, IT Agent, First, and Final can reassign at IT Agent Solution. The admin reassignee list and notes are both required. Accept stays on Me → Open Tickets → PickUp only.

---

## 11. Report columns (service)

Process `Live_IT_Service_Request_Extrovis_A00`, report `All_tickets_A00`.

| Use | Column |
|-----|--------|
| Request ID | `Column_y4srngcUo1` |
| Requester name | `Column_a4jK_PYnj7` |
| Requester email | `Column_Egh9ss0nVO` |
| Entity | `Column_KOIeT2FK23` |
| Location | `Column_B1fS7sdEsr` |
| Subject | `Column_HEiwMtIBBO` |
| Description | `Column_AS7UbLz7Mg` |
| Ticket type | `Column_ngHfbXhmqj` |
| Category | `Column_53Z2oyBbZk` |
| Sub category | `Column_AC0_BCY9hP` |
| Criticality | `Column_nps6UwRtUp` |
| Ticket status (`Statu_1`) | `Column_ps84EEKkEI` |
| Stage | `Column_JUGHj6d2Xj` |
| Current step | `Column_Yf9r2UCRuu` |
| Assigned To | `Column_7Fn1867jLF` |
| Assigned To User | `Column_9uwhycudkA` |
| Source | `Column_hFjGV8lRrn` |
| SAP | `Column_l8-JThY4eN` |
| SAP module | `Column_xAD9rXgk8-` |
| TAT minutes | `Column_VO-1shRU1Q` |
| Closure minutes | `Column_mEZwE_B6CW` |
| Solution text | `Column_oCwk2a69nP` |
| Solution table | `Column_qr_9gP_vE5` |
| Created | `Column_OuyTOsNWaK` |
| Modified | `Column_QpPzei51U2` |
| Quick search | `Column_BWkBKpBTaI` |

MIS tables for this family do not show Source, Type, Category, or Sub Category as default columns. SAP and SAP Module are available in the column picker.

Nested `IT__Agent_Solution` columns: resolution `Column_KzHlT9k9fc`, date `Column_R_u4Nyl5q_`, name `Column_ZipK5a_k8Y`, stages `Column_EA6Nomn1w4`, comment channel `Column_x6WUN8QD4O`, attachments `Column_zXMX1EDrCx`.

---

## 12. What this family does not use

- Refex process `Live_IT_Service_Request_A00` and Refex column ids
- L1 / L2 / IT Manager / IT Head approval and the Pending Approval card
- Venwind company filter (that filter is Refex-process only)
- Refex 48 hour reopen window (this family uses 7 days)
- Refex comment chat
- Me membership from the Assigned To report column alone

---

## 13. Where to change it

| Change | File |
|--------|------|
| Columns, process id, activity ids | `src/lib/itDashboardProfiles.js` |
| Me, My Team, Open, Closed, SLA | `src/lib/kfITServiceDashboard.js` |
| SAP team logins and SAP ticket test | `src/lib/extrovisSapTicket.js` |
| Comment mail From / To / Cc and SAP modules | `src/itsm/refex/employeedashboard/commentNotifyMail.js` |
| Help Desk create, subject, locations | `super-app/frontend/src/pages/CreateITRequest.js` |
| Help Desk comments | `super-app/frontend/src/pages/ITSMDashboard.js` and `super-app/backend/routes/itsm.py` |
