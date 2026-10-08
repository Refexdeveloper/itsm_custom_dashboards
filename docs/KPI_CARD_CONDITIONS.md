# KPI card conditions

Pipeline for every KPI count:

1. Load report + live pending / my-task stamps  
2. Apply **Me / My Team / All** (Admin = All)  
3. Apply **Weekly / Monthly / FY** (past FY strict — see PRODUCT_DECISIONS)  
4. Count rows matching the tab matcher  
5. **Today’s Snapshot** skips step 3 (still uses scope)

Implementations: `matchesRefexTechSupportTab`, `matchesRefexMonitoringServiceTab`, `matchesRefexApproverPendingTaskRow` in `src/lib/kfITServiceDashboard.js`.

Tab sets: `REFEX_TECH_SUPPORT_STATUS_TABS`, `EXTROVIS_TECH_SUPPORT_STATUS_TABS`, `REFEX_MONITORING_SERVICE_TABS`, `EXTROVIS_MONITORING_SERVICE_TABS`, employee `KPI_CARDS`.

---

## Shared status primitives

| Status | Condition |
|--------|-----------|
| **Closed** | IT Tech Reopen / ReOpen Window **or** Kissflow process Completed. Not Statu_1 alone. Rejected ≠ Closed. |
| **Rejected** | Business / Kissflow status Rejected |
| **Open (base)** | Not Closed, not Rejected, not Cancelled |
| **Me** | Live bucket pending **or** Closed By you **or** (Extrovis) owned Solution/Dependency |
| **My Team** | `!Me` |

---

## Refex IT Agent / Tech Support

| KPI | Condition |
|-----|-----------|
| All Tickets | Handled / my-task / assigned / reopen-hold / open pickup / closed-by-you union |
| Open Tickets | Live in **your** bucket **and** own RR IT Tech / own Tech Support / Dependency (not other agents). Not Reopen-hold. Includes **Reopened_Ticket** flag (row tag). |
| My Tickets | Owned IT Tech Support / Dependency / After Dependency (not Reopen-hold) |
| SLA Breached | Open SLA ⊂ own Open Tickets with Stages InProgress; Closed SLA ⊂ own Closed (last Solution status). Pending Approval N/A |
| Closed | Closed rule **and** Closed By you **or** live Reopen in your bucket |

> **Reopened KPI removed** — identify with the **Reopened** tag on Request ID.

---

## Extrovis IT Agent

| KPI | Condition |
|-----|-----------|
| All Tickets | Me-scoped union |
| Open Tickets | **IT Agent PickUp** only, in your live bucket |
| My Tickets | Owned Solution / Dependency / After Dependency — includes **Reopened_Ticket** (row tag) |
| SLA / Closed | Open SLA ⊂ **My Tickets** InProgress (Solution / Dependency / After Dependency). PickUp shows created+TAT 2h on the MIS cell only. Closed SLA ⊂ Closed (last Solution status) |

> **Reopened KPI removed** — tag on Request ID.

---

## Refex Manager / Head

| KPI | Me | My Team |
|-----|----|---------|
| All Tickets | Rows in Me set | Rows in Team (`!Me`) |
| Pending Approval | Live pending at **your** role step only (Manager → IT Manager Approval; Head → IT Head Approval) | L1 + L2 + Manager (+ Head on Head). Personal role tasks stay in Me |
| Open Tickets | Live bucket + agent pipeline open (not approvals, not reopen-hold). Includes **Reopened_Ticket** | Same open pipeline for Team |
| SLA Breached | Open SLA ⊂ Open Tickets **or** personal Pending Approval (Me only, 120 min). Closed SLA ⊂ Closed (last Solution status). Stages not InProgress → Hold, not SLA. | Open SLA ⊂ Open Tickets; Closed SLA ⊂ Closed. Pending Approval is **not** SLA Open. |
| Rejected | Rejected and you modified/closed it | Any rejected in Team |
| Closed | Closed and Me (Closed By / live reopen bucket) | Closed and not Me |

IT Tech Reopen is **Closed**, never Pending Approval. **Reopened KPI removed** — row tag only.

---

## Extrovis First / Final (service KPIs)

| KPI | Condition |
|-----|-----------|
| All Tickets | Me or Team scope |
| Open Tickets | IT Agent PickUp only |
| My Tickets | Owned Solution / Dependency / After Dependency — includes **Reopened_Ticket** (row tag) |
| SLA / Closed | Open SLA ⊂ My Tickets InProgress; PickUp TAT 2h is MIS-only. Closed SLA ⊂ Closed. **No Pending Approval** card |
| Closed | ReOpen Window (7d) or Completed |

---

## IT Admin

Same monitoring matchers; **no Me/Team**; scope `all`; Pending = all L1+L2+Manager+Head. No Reopened KPI.

---

## Today’s Snapshot

| Card | Condition |
|------|-----------|
| Today Open | Created today, still in flight |
| Today Closed | Closed KPI + closed today |
| Today SLA Breached | Created today + SLA breached |

---

## Employee

| KPI | Condition |
|-----|-----------|
| All | Your requests in period |
| Open | Your tickets still open (includes reopened; **Reopened** row tag) |
| SLA Breached | Your tickets SLA breached |
| Closed | Your tickets Closed |
