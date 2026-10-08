# Settled product decisions

These were confirmed with the product owner. Changing them needs explicit user approval.

## Scope: Me vs My Team vs Admin

### Me (signed-in user only)

1. **Live Open / Pending Approval** in the user’s Kissflow **pending / My Task bucket** (authoritative).
2. **Live Reopen** only if the ticket is in that user’s pending reopen / My Task bucket.
3. **Closed** they **solved** — Closed By / IT Tech ActedBy / Assigned To; if **ITSM BOT** auto-closed, attribute to the **human** solver.

Do **not** use “participated” / history-only touches to put tickets into Me Closed.

### My Team

Everything that is **not** Me (`!Me`).

### Admin

- **No Me / My Team switch** (`hideScopeSwitch`).
- Monitoring scope = **`all`** (full report).
- Pending includes **all** L1 + L2 + Manager + Head approval steps.

### Group CEO

- **Has Me | My Team** like IT Head (`role=final`). Do **not** use `hideScopeSwitch`.
- Me / Team matchers are the same as Head.
- Keeps the IT Agents filter and Engagement Report.

## Header role (under the greeting)

The line under the user name is the **installed pack role** (Employee, IT Agent, IT Manager, IT Head, Admin, Group CEO, First/Final Level Approver) — not Kissflow AppRoles.

**Exception (display only):** if the signed-in email is `srivaths.varadharajan@refex.co.in`, show **Group CTO**. This does not change Me / Team / KPI matchers.

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
- **Open** = **IT Agent PickUp** only (and in Me bucket when scoped to Me). **PickUp MIS SLA** = created time + TAT **2 hours** (field TAT, else 120 min). This clock is display-only — Open SLA KPI stays on My Tickets.
- **My Tickets** = owned Solution / Dependency / After Dependency (not PickUp, not ReOpen). **Live SLA when Stage is InProgress** (process Stages or Statu_1) using Closure_Time + last modified. Other stages → **Hold**. Tickets with **Reopened_Ticket** merge into **My Tickets** with a **Reopened** row tag (no separate Reopened KPI).
- **Closed** includes **ReOpen Window** (7 days) or Completed.
- Do not apply Refex feedback / L1–L2 activity IDs to Extrovis fetches.
- **IT__Agent_Solution** table: **Name** on Refex + Extrovis; **Stages** on Extrovis only.
- **Comments save** is process **POST** (save) to the live **InProgress** user-task — never `/submit`. Nested `Table::IT__Agent_Solution` only (new `IT__Agent_Solution_` + 10 hex row each time). **Name_1** = person name, not email.
  - **Comments section** on **Extrovis** service dashboards only (Agent, Manager / First, Head / Final, Admin Extrovis rows, Employee). **Refex** dashboards show **Solution / Resolution** on Overview — no Comments chat tab.
  - **Send** on the live KPI card: Extrovis **My Tickets** (Employee **Open**). Do **not** filter by workflow step — the KPI matcher already selected the tickets.
  - Extrovis: send `Stages_1: "InProgress"`.

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
- Extrovis comments are nested table only — do **not** merge progress **IT Tech Support** notes into the thread.
- Extrovis MIS **Open Tickets** Stage display = **InProgress**. **Closed** tickets (Closed KPI / Closed tab) Stage display = **Closed**. Empty **Subject** = `-`. Column label is **Stage**. Subject / Stage are process fields (`Column_HEiwMtIBBO`, `Column_JUGHj6d2Xj`), not nested `Stages_1`.

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
