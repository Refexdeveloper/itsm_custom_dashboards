# IT Head dashboard — landing APIs and client calculations

Pack: `ITHeadRefexDashboardProject.jsx` → `ITCrApproverDashboard` (`role="final"`).  
Lands on **Refex**. Entity dropdown can switch to Extrovis / Kavis / Pharma Pack / ModePro.  
Account: `AcCMptlq60zH`. App: `IT_Service_Management_A00`.

Kissflow does **not** return KPI numbers. The pack loads rows, then counts in the browser (`kfITServiceDashboard.js`).

**APIs + measured load times (17 Sep 2026):** [IT_HEAD_REFEX_DASHBOARD_APIS_AND_PERFORMANCE.md](./IT_HEAD_REFEX_DASHBOARD_APIS_AND_PERFORMANCE.md)

---

## 1. What happens on first land (IT Head)

Two phases. Comments are **not** loaded on land.

### Phase A — fast paint (Me)

`fetchRefexApproverMeLandingSeed` in `fetchRefexTechSupportTickets.js`.

| # | API | Why |
|---|-----|-----|
| 1 | `GET /process/2/{account}/{process}/pending/activity/count?apply_preference=true&_application_id=IT_Service_Management_A00` | Map **StepName → activity `_id`** |
| 2 | `GET /process/2/{account}/{process}/pending/{activityId}?apply_preference=true&page_number=1&page_size=…&skip_aggregation=true&_application_id=…` | Live **Me** queue for Head steps |

**Head Me pending StepNames (Refex):**

- `IT Head Approval` / `IT Head`
- Open work: `IT Tech`, `IT Tech Support`, Dependency / After Dependency
- Reopen: `IT Tech Reopen`, `Ticket Reopen`, `Employee Feedback`

**If entity is Extrovis-family:** PickUp / Solution / Dependency / ReOpen Window (no approval pending).

**Skipped on Phase A:** full Main Report, `$request_id` enrich, participated walk, Closed-by Completed query.

### Phase B — background (fills All / Closed / Team / MIS)

`ensureRefexMappedDataset('monitoring', …)` after ~2.5s (Extrovis ~3.5s).

| # | API | Why |
|---|-----|-----|
| 3 | `GET /process-report/2/{account}/{process}/{reportId}?page_number=&page_size=&_application_id=…` | Full ticket list |

| Entity | Process | Report |
|--------|---------|--------|
| Refex / Venwind | `Live_IT_Service_Request_A00` | `Service_Items_Refex_A00` |
| Extrovis / Kavis / Pharma Pack / ModePro | `Live_IT_Service_Request_Extrovis_A00` | `All_tickets_A00` |

Venwind vs Refex is a **client filter** on the same Refex report (no extra All_tickets fetch).

Soft refresh later: `$modified_at_gt` delta + pending pools again. Hard Refresh: full rebuild.

---

## 2. What we calculate (not Kissflow)

After rows are in memory (`ITCrApproverDashboard.jsx` + `kfITServiceDashboard.js`):

1. **Entity tab** — Refex / Venwind / Extrovis-family  
2. **Me / My Team** — Me = live pending bucket **or** Closed By you **or** live reopen in bucket. Team = `!Me`.  
3. **Period** — Weekly / Monthly / FY (Today’s Snapshot skips period)  
4. **KPI matchers** (Head / Manager)

| KPI | Client rule |
|-----|-------------|
| All Tickets | Rows in Me or Team set |
| Pending Approval | Live pending at **IT Head Approval** (Me). Team = L1+L2+Manager+Head except personal Me |
| Open Tickets | Live bucket + agent pipeline open (not approvals, not reopen-hold) |
| SLA Breached | Open SLA ⊂ Open; Closed SLA ⊂ Closed. Pending Approval is **not** SLA Open |
| Rejected | Rejected + you modified/closed (Me) / any rejected (Team) |
| Closed | ReOpen window **or** process Completed — **not** Statu_1 alone |

Source / company breakdown: `ITHeadSourceBreakdown.jsx` from already-loaded rows (no extra API).

---

## 3. Comments (only when expand / Comments tab opens)

Landing does **not** call these. Same sequence as IT Head / Agent Comments tab (`ITDashboardShared.jsx` → `fetchTicketInstanceEnrichForRevisions`).

| # | API | Why |
|---|-----|-----|
| 4 | `GET /process/2/{account}/{process}/{instanceId}/progress?_application_id=…` | Pick **live InProgress** activity id |
| 5 | `GET /process/2/{account}/{process}/{instanceId}/{activityInstanceId}?_application_id=…` | Nested `Table::IT__Agent_Solution` (Name, Resolution, Comments_2, **Attachments**) |

**Do not** call bare `GET …/{instanceId}` — Kissflow returns **404**. Nested comments live on the **activity** GET.

Then **our side**:

- Union every `Column_*` + `Table::IT__Agent_Solution` copy (text-only table must not drop file rows)
- Extrovis: show **User** channel only; author = table **Name** (no “IT Agent” suffix)
- Attachments: keep `key` from nested row; preview is a later signed GET

Save (Extrovis My Tickets / Employee Open): **POST** to the live InProgress activity (not `/submit`).

---

## 4. APIs we never use for Head landing KPIs

- Participated / completed history  
- Per-ticket `$request_id` on first paint  
- Instance GET for every MIS row  
- A Kissflow “KPI summary” endpoint (does not exist)

---

## 5. Code map

| Piece | File |
|-------|------|
| Head entry | `src/ITHeadRefexDashboardProject.jsx` |
| Load / seed | `src/components/it/ITCrApproverDashboard.jsx` |
| Me seed | `fetchRefexApproverMeLandingSeed` |
| Pending StepName | `src/itsm/refex/shared/refexPendingByStep.js` |
| KPI rules | `src/lib/kfITServiceDashboard.js`, `docs/KPI_CARD_CONDITIONS.md` |
| Comments GET | `fetchTicketInstanceEnrichForRevisions` + `collectConversationEntries` |

Broader landing notes: [DASHBOARD_LOADING_OPTIMIZATION.md](./DASHBOARD_LOADING_OPTIMIZATION.md).
