# Kissflow ITSM Dashboard — Loading Optimization & Landing Behavior

**Purpose:** Clear summary for raising a Kissflow support / product ticket about dashboard load time and API gaps.  
**Product:** IT Service Management custom React components (`IT_Service_Management_A00`)  
**Account:** `AcCMptlq60zH` (`refexgroup.kissflow.com`)  
**Processes:** `Live_IT_Service_Request_A00` (Refex), `Live_IT_Service_Request_Extrovis_A00` (Extrovis)

---

## 1. Problem we are solving

Custom dashboards (Employee, Agent, Manager, Head, Admin, CEO) must show:

- Live **pending** work (Me / Open / Pending Approval / ReOpen)
- Full **pipeline** KPIs (All / Closed / SLA / Today, etc.)
- Correct **Me vs My Team** ownership

Kissflow does **not** expose a single “dashboard summary” API. The UI must assemble data from **process report** + **pending activity** + client-side rules. Without optimization, first paint was slow (especially CEO/Admin) because of:

- Full paginated Main Report walks
- Extra report pulls for “today / recent”
- Per-ticket `$request_id` / instance enrichment (N+1)
- Participated / completed history walks

---

## 2. What happens when the dashboard lands (first open)

Landing is **two-phase**: fast paint first, full dataset in background.

### Phase A — Fast landing (loader clears; KPIs/table paint)

| Role | What loads first | Kissflow APIs used |
|------|------------------|--------------------|
| **Employee** | IndexedDB hydrate (return visit) **and/or** live Employee Feedback pending seed (no instance enrich) | Pending/activity by reopen step; IDB when present |
| **Agent / Tech Support** | User’s live My Task / pending bucket only | Pending / myitems by step (PickUp, Tech Support, Dependency, ReOpen, etc.) |
| **Manager / Head (Me)** | Role pending pools + optional small open-work pending | `pending/activity/count` + `pending/{activityId}` (approval + reopen + open work) |
| **Admin / CEO** | Live pending pools only (no Main Report yet) + optional **IndexedDB** hydrate from last session | Approval pending + ReOpen pending + open-work pending (in parallel) |

**Explicitly skipped on Phase A:**

- Full Main Report pagination
- Per-ticket instance / `$request_id` enrich
- Participated history walk
- Closed-by Completed query (expensive) — Closed KPI fills in Phase B

Goal: first meaningful paint often under ~2s when pending APIs are healthy (network/Kissflow dependent).

### Phase B — Background full load (fills MIS, Closed, Team, filters)

| Role | Background work |
|------|-----------------|
| **Agent** | Full report + merge with live tasks; soft refresh later uses report **delta** |
| **Manager / Head / Admin / CEO** | Full Main Report (paginated) + live pending merge; oversight mode skips N+1 enrich |
| **All (return visit)** | IndexedDB report cache hydrate in parallel with seed where available |

**Soft refresh (not hard Refresh):**

- Does **not** blank KPI cards to 0
- Merges `$modified_at_gt` / status deltas into IndexedDB cache
- Re-fetches live pending pools so Pending Approval stays accurate

**Hard Refresh:** clears / rebuilds as needed and reloads.

---

## 3. Optimizations we already implemented (client side)

| # | Optimization | Why |
|---|--------------|-----|
| 1 | **Landing seed** before full report | Paint Open / Pending / ReOpen from live APIs immediately |
| 2 | **Skip `$request_id` / instance enrich on landing & CEO/Admin oversight** | Avoided hundreds of per-ticket calls |
| 3 | **`reportOnlyFullLoad` for Admin/CEO** | One Main Report walk; no today/recent triple-pull on oversight path |
| 4 | **IndexedDB persistent report cache** | Next visit can hydrate without waiting for full report |
| 5 | **Soft delta refresh** | Later loads merge changed rows instead of always full rebuild |
| 6 | **Parallel hydrate + seed (CEO/Admin + Employee)** | IndexedDB + pending seed race; paint whichever arrives first |
| 7 | **Entity switch cache-first** | Switching Entity uses cached mapped rows when possible |
| 8 | **TTL cache on pending/myitems** | Seed and full load share one pending fetch where safe |
| 9 | **No KPI flash to zero** | Keep previous numbers until new data is ready |
| 10 | **Oversight mode** | Admin/CEO: report + pending pools only — no myitems/participated N+1 |
| 11 | **Employee landing skips instance enrich** | Seed stamps live reopen only; N+1 instance GET runs in Phase B |
| 12 | **Employee / Agent defer full report** | `delayMs` + idle so Me landing paints before Main Report walk |

These are **custom component** optimizations. They do not change Kissflow platform APIs.

---

## 4. What Kissflow does **not** provide (gaps for the ticket)

Please treat these as product/API requests — they are why dashboards must do heavy client work:

| Gap | Impact |
|-----|--------|
| **No dashboard aggregate / KPI API** | Counts (Open, Closed, SLA, Today, Me/Team) must be computed in the browser after loading rows |
| **No single “my queue + closed by me” feed** | Me scope needs pending bucket **plus** Closed By matching on report rows |
| **Report pagination is slow for org-wide views** | Admin/CEO must walk many Main Report pages |
| **`$created_at_gt` may be ignored server-side** | We still filter dates in the client; soft cache cannot trust server alone |
| **Report lag vs pending** | New tickets can appear in pending before Main Report; we merge live pending into report |
| **No batch enrich by request id** | Filling sparse report columns required per-item calls (we largely stopped this on oversight) |
| **Pending is step/activity based** | We must resolve StepName → activity id, then page each activity |
| **Closed is not a simple Status field** | Product rule: Closed = ReOpen Window / process Completed — **not** Statu_1 alone — so client matchers are required |
| **Me ≠ “I participated”** | Platform participated APIs over-count for Me Closed; we use Closed By + live reopen bucket instead |

---

## 5. What we calculate in the custom component (not Kissflow)

All of the following run **in the React pack** after APIs return:

### 5.1 Scope

- **Me** = live pending bucket for the signed-in user **+** Closed By (human solver; BOT → human) **+** live reopen in bucket  
- **My Team** = everything else (`!Me`)  
- **Admin / CEO** = full org scope (no Me/Team switch)

### 5.2 KPI / tab matchers

- Open / Pending Approval / My Tickets / Closed / Rejected / SLA Open / SLA Closed / Today Open / Today Closed / Today SLA  
- Extrovis: Open = PickUp; My Tickets = Solution/Dependency; **no** Pending Approval  
- Refex: Pending Approval at Manager/Head steps; Closed includes IT Tech Reopen window  

### 5.3 Display fields

- Assigned To / Closed By solver (prefer Solution/Tech Support over PickUp pool)  
- Period filters (Weekly / Monthly / FY); **Due** narrows to open SLA-breached **within** the selected period  
- Company filter from `user_details_lookup` Company_Name (blank → Refex Industries Limited); Venwind entity tab on Refex process (client filter; no extra All_tickets fetch vs Refex)  
- Instant land with 0 KPI counts; Refresh spins the header icon only (no center / full-screen loader)
- Comments (expand tab): nested `IT__Agent_Solution` loads when the Comments tab opens (one instance GET). Empty `Column_*` arrays must not block native `IT__Agent_Solution` table rows (Extrovis first-paint bug). Tab has its own refresh (force instance + progress) so full dashboard refresh is not required. New comments POST to the live InProgress activity (save only; never `/submit`).
- Agent background load skips participated/completed walks and per-row report enrich (`skipEnrich`) to cut API storms; progress/instance caches are per-ticket TTL maps

### 5.4 Merge logic

- Union of report rows + live pending rows by instance id  
- Stamp `isLiveBucketPending` / live reopen / live approval so approved tickets drop from Pending immediately  

Source of truth for matchers: `src/lib/kfITServiceDashboard.js`  
KPI rules: `docs/KPI_CARD_CONDITIONS.md`  
Product rules: `docs/PRODUCT_DECISIONS.md`

---

## 6. Kissflow APIs we rely on (typical)

| API pattern | Use |
|-------------|-----|
| `process-report/.../All_tickets...` (paginated) | Main dataset for All / Closed / MIS |
| `.../pending/activity/count` | Discover live steps + counts |
| `.../pending/{activityId}` | Live queue rows for Me / Pending / ReOpen / PickUp |
| Myitems / inprogress (where used) | Agent landing seed |
| Instance / `$request_id` (avoided on oversight landing) | Sparse field backfill only when needed |

Application id: `IT_Service_Management_A00`.

---

## 7. Suggested ask to Kissflow (for the ticket)

To reduce custom-component load time and API volume, we need platform support such as:

1. **Aggregated KPI endpoint** for a process report (counts by status/step/assignee/SLA/date range) without downloading every row.  
2. **Reliable server-side filters** for `$created_at_gt` / `$modified_at_gt` / entity / company on process reports.  
3. **Batch get-by-request-id** (or richer report columns) so sparse fields do not require N+1.  
4. **Documented, stable pending StepName → ActivityId** contract (or include StepName on pending list payloads consistently).  
5. **“Closed by user / solved by user”** query capability matching workflow Closed By (not only participated).  
6. Guidance on **max page size / rate limits** for process-report and pending list under org-wide Admin/CEO load.

---

## 8. Short “what we did vs what we need” (copy for ticket body)

**What we did (client):**

- Fast landing from live pending only  
- Background full report load  
- IndexedDB cache + soft delta refresh  
- Removed per-ticket enrich on Admin/CEO oversight  
- Parallel cache hydrate + seed  
- Client KPIs / Me-Team / Closed / SLA / period filters  

**What is not available in Kissflow today:**

- Dashboard KPI aggregate API  
- Trustworthy date filters on all report queries  
- Efficient org-wide closed-by / Me ownership query  
- Batch enrich for sparse report fields  

**Result:** Dashboards work correctly per ITSM product rules, but **first full org load (Admin/CEO) and large reports remain limited by Kissflow report + pending pagination**, not by UI rendering alone.

---

## 9. Roles covered by this behavior

| Dashboard zip | Landing seed | Full load |
|---------------|--------------|-----------|
| IT Employee (Refex/Extrovis) | IDB hydrate ∥ Feedback pending (no enrich) | Report + enrich + completed |
| IT Agent (Refex/Extrovis) | My Task / pending seed | Report + merge |
| IT Manager / IT Head | Me pending seed | Monitoring report + pending |
| Admin / CEO | Oversight pending seed + IDB | Oversight report (`skipEnrich`) |

---

*Document generated for Kissflow escalation. Update when landing strategy or API usage changes.*
