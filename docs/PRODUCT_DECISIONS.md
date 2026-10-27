# Settled product decisions

These were confirmed with the product owner. Changing them needs explicit user approval.

## Scope: Me vs My Team vs Admin

### Me (signed-in user only)

1. **Live Open / Pending Approval** in the user’s Kissflow **pending / My Task bucket** (authoritative).
2. **Live Reopen** only if the ticket is in that user’s pending reopen / My Task bucket.
3. **Closed** they **solved** — Closed By / IT Tech ActedBy / Assigned To; if **ITSM BOT** auto-closed, attribute to the **human** solver.

Do **not** use “participated” / history-only touches to put tickets into Me Closed.

### My Team

Full queue for the current period / entity / tab — **including** the signed-in user's tickets. Do **not** exclude Me rows.

Me stays personal. Admin is still the unscoped pack (`hideScopeSwitch`).

### Admin

- **No Me / My Team switch** (`hideScopeSwitch`).
- Monitoring scope = **`all`** (full report).
- Pending includes **all** L1 + L2 + Manager + Head approval steps.

### Group CEO

- **Has Me | My Team** like IT Head (`role=final`). Do **not** use `hideScopeSwitch`.
- Me / Team matchers are the same as Head.
- Keeps the IT Agents filter and Engagement Report.

### New CEO (GCP pack)

- Notification Engine GCP report only. No Me | My Team toggle and no create-ticket action.
- Head / Agent fast landing and Me matchers stay unchanged.

## Header role (under the greeting)

The line under the user name is the **installed pack role** (Employee, IT Agent, IT Manager, IT Head, Admin, Group CEO, First/Final Level Approver) — not Kissflow AppRoles.

**Exception (display only):** the line under the greeting follows the person, not the pack title.

- Srivaths Varadharajan → Group Chief Technical Officer
- Anil Jain → Managing Director / Chairman
- Dinesh → Group Chief Executive Officer

Matched by email or by the name. This does not change Me / Team / KPI matchers.

## Open vs Pending vs Closed (Refex)

| Bucket | Rule |
|--------|------|
| **Open** | Active agent pipeline in bucket (IT Tech / Tech Support / Dependency / After Dependency). **Not** IT Tech Reopen. Approvals are **not** Open on Manager/Head. Tickets with **Reopened_Ticket** flag stay under **Open Tickets** (Refex) with a **Reopened** row tag — no separate Reopened KPI. |
| **SLA Breached Open** | Subset of **Open Tickets** with Stages **InProgress** and Closure_Time clock from last modified. Pending Approval uses a **static 120 min** SLA (no Stages — treated as InProgress). Team / Admin: Pending is **not** Open SLA except Manager/Head **Me** personal pending. Stages not InProgress → MIS **Hold**, not SLA. **Do not** run a live clock on **IT Tech Reopen** / **ReOpen Window** — show last IT Agent Solution / IT Tech Support result (Breached / Not Breached + elapsed / budget). |
| **Pending Approval** | Live pending at approval steps. Manager Me = IT Manager Approval only; Head Me = IT Head Approval only. Team = L1+L2+Manager (+Head on Head). |
| **Closed** | Step **IT Tech Reopen** **or** process **Completed**. Not `Statu_1` / Validation “Closed” alone. Rejected ≠ Closed. |
| **Revised (workflow rail)** | Only **completed Goto-*** steps from the Kissflow **progress** API. 1st Goto → `Revised`, 2nd → `Revised (2)`, …. **Skipped** steps (common on Extrovis) never create a revision. Not-started Goto is hidden. |

## Company / Entity filters (Refex)

- **Company** comes from `user_details_lookup` → `Company_Name` / `REFEX_COMPANY_NAME_1` (not Entity). Blank company → treat as **Refex Industries Limited**.
- **Venwind** is a separate Entity tab (same Refex process); filters rows whose company/entity contains Venwind. Refex entity tab excludes Venwind rows. Switching **Refex ↔ Venwind** is a client filter on the cached Refex report — do not refetch All_tickets.
- **Due** = open SLA-breached only, **and** still applies Weekly / Monthly / FY (does not replace the period).

## Extrovis differences

- **No Pending Approval** KPI on monitoring / agent packs that use Extrovis monitoring tabs.
- **Open (Me)** = live **IT Agent PickUp**. Me membership and Accept stay unchanged. Accept is **Me Open** PickUp only. **PickUp MIS SLA** = created time + TAT **2 hours** (field TAT, else 120 min). This clock is display-only — Open SLA KPI stays on My Tickets.
- **Open (My Team / Admin)** = MIS **Ticket Status Open** (not Closed / Rejected / Cancelled). Do **not** require Stage / `Statu_1` Open or PickUp. Stage remains a display / optional filter column only.
- **My Tickets** = owned Solution / Dependency / After Dependency (not PickUp, not ReOpen). **Live SLA when Stage is InProgress** (process Stages or Statu_1) using Closure_Time + last modified. Other stages → **Hold**. Tickets with **Reopened_Ticket** merge into **My Tickets** with a **Reopened** row tag (no separate Reopened KPI).
- **Closed** includes **ReOpen Window** (7 days) or Completed.
- Do not apply Refex feedback / L1–L2 activity IDs to Extrovis fetches.
- **IT__Agent_Solution** table: **Name** on Refex + Extrovis; **Stages** on Extrovis only.
- **Comments save (Extrovis)** uses the Integration **admin PUT** (`/process/2/{account}/admin/{process}/{instance}`) for Employee and My Team / agent — never process `update-item` (that fails with queue `050201` for requesters). Nested `Table::IT__Agent_Solution` only (new `IT__Agent_Solution_` + 10 hex row each time). **Name_1** = person name, not email.
  - **Comments section** on **Extrovis** service dashboards only (Agent, Manager / First, Head / Final, Admin Extrovis rows, Employee). **Refex** dashboards show **Solution / Resolution** on Overview — no Comments chat tab.
  - **Send** on the live KPI card: Extrovis **My Tickets** (Employee **Open**) while the ticket is at **IT Agent Solution**. Agent / First / Final send at Solution (Me and Team) and on **My Team → Open Tickets**. **Me Open** and Closed stay closed.
  - Extrovis: send `Stages_1: "InProgress"`.
- Extrovis **IT Agent** only — named users:
  - Jon Hudanich / Vidhya Kumar (`kavispharma.com`) and Pradip Kakade (`modepro.com`): no entity filter; Me and My Team stay on that entity only. Me matchers unchanged.
  - Kishore Yepuri: entity filter stays (Extrovis / Kavis / Modepro). **My Team** uses All_tickets `$sap=true` (SAP tickets only). **Me** is unchanged.
  - Extrovis **IT Agent / First / Final**: Internal + User comments with attachments at **IT Agent Solution** (Me and Team) and on **My Team → Open Tickets** (live PickUp / Solution). Not Closed. **Me Open** stays without compose. Save uses the same admin PUT + Integration key as Employee comments.
  - Kishore **My Team** only: Reassign at IT Agent Solution (admin reassignee list + notes, both required) on IT Agent, First, and Final. Me landing is unchanged.
  - Extrovis **IT Agent / First / Final**: admin reassign on **My Team → Open Tickets**. Accept is **Me → Open Tickets** PickUp only — not My Team.
  - Extrovis **Open Tickets**: **Me** = **IT Agent PickUp**; **My Team / Admin** = Ticket Status Open (ignore Stage). **My Tickets** stays Solution / Dependency.
  - Refex **IT Head / IT Manager**: same admin reassign on **Open Tickets** and **Pending Approval**. Admin / CEO packs are unchanged.
  - Refex **IT Agent**: same admin reassign on **My Team → Open Tickets** only. No Pending Approval on this pack. **Me**, Accept, and landing fetches stay unchanged.
  - Extrovis Assigned To at **IT Agent PickUp** shows **Waiting for Pickup** (raw assignees unchanged for Me matching).

## Closed By

Prefer human Closed By / ActedBy. BOT auto-close → resolve to human who solved.

## Period filter (Weekly / Monthly / FY)

- Counts use `applyDashboardDateRangeFilter`.
- **Past FY** (period that does **not** include today): **strict** date filter only.
  - Do **not** re-inject live Open/Pending outside the period.
  - Do **not** keep undated open tickets in every FY.
- Helper: `dashboardDateRangeIncludesToday` — live re-inject / undated-open only when the selected range includes today.
- Open uses Created/Requested date; Closed uses Closed Date where applicable.

## Non-Refex comments (Extrovis / ModePro / Kavis / Pharma Pack)

- Nested `IT__Agent_Solution.Comments_2` is **Internal** or **User**. Refex has no `Comments_2` — do not send it.
- MIS Comments tabs (Extrovis service dashboards only): **Internal** (default send) and **User Comments**. Legacy blank `Comments_2` stays visible on both tabs. Older `External` rows still match Internal.
- Attachments on Non-Refex nested rows only (Kissflow `/upload/2` + `Attachments` on the table row). The working preview is the GET-signed GCS URL (`storage.googleapis.com/...&X-Goog-Algorithm=GOOG4-RSA-SHA256`). Mint it with one native hop `GET /upload/2/{account}/{key-as-path}` (thumbnail: `.../photos/100x100.png`) — never `/file/2` and never `?key=`. The component iframe cannot read that 302 Location through `kf.api`, so it uses `kf.client.getImageUrl` for the same file key. Lightbox on click. Single attachment objects are treated as a one-file list.
- MIS Comments tabs: **Internal** (default send, also shows untagged legacy rows) and **User Comments** (explicit `Comments_2=User` only).
- User comment email (not Internal): GCP `refex-comment-mail`. Employee / Help Desk → support To/CC. IT Agent User comment → requester only. Subject `Tech Help Desk - New Comment Added | Ticket {Request_ID}`.
- Extrovis comments are nested table only — do **not** merge progress **IT Tech Support** notes into the thread.
- Extrovis expand/refresh reads comments from process-report `$request_id={Request ID}` (`Column_qr_9gP_vE5` Column_* rows). Same `$request_id` param on Refex. Progress API stays for the live activity id. Me landing fetches are unchanged.
- Extrovis MIS **Open Tickets** Stage display = **InProgress**. **Closed** tickets (Closed KPI / Closed tab) Stage display = **Closed**. Empty **Subject** = `-`. Column label is **Stage**. Subject / Stage are process fields (`Column_HEiwMtIBBO`, `Column_JUGHj6d2Xj`), not nested `Stages_1`.
- **Refex MIS table only (display / column filter):** Ticket Status maps InProgress → Open, Completed → Closed, Rejected → Rejected (never show InProgress / Completed as Status). Stage = overall-report `Column_Bug5EApiHs` when present; if empty, Open → InProgress and Completed / Rejected → Closed. This does **not** change Me / Closed / SLA matchers, which still use `Statu_1` and process Stages (`Column_GooYV3HuY1`). Extrovis MIS Stage/Status display is unchanged.

Full Non-Refex requirement checklist (comments, Subject, locations, emails, Stage/Status clarifications): [EXTROVIS_NON_REFEX_REQUIREMENTS.md](./EXTROVIS_NON_REFEX_REQUIREMENTS.md).

## Today’s Snapshot

Independent of Weekly / Monthly / FY. Still respects Me / Team / All.

| Card | Rule |
|------|------|
| Today Open | Created today, still in flight (not Closed / Rejected / Reopen hold) |
| Today Closed | Matches Closed KPI and closed today |
| Today SLA Breached | Created today and SLA breached |

## Soft refresh / Refresh

Soft cache may use `$modified_at_gt` + `$created_at_gt`. Kissflow may **ignore** `$created_at_gt` server-side (client filter still applies). Soft refresh must not blank KPI cards to zero while reloading.

## Code anchors

- Me: `matchesRefexMeOnlyScope`
- Team: `matchesRefexServiceTeamScope`
- Agent tabs: `matchesRefexTechSupportTab`
- Manager/Head/Admin tabs: `matchesRefexMonitoringServiceTab`
- Pending: `matchesRefexApproverPendingTaskRow`
- Closed: `isRefexServiceClosedTicket`, `isTicketClosedByUser`
