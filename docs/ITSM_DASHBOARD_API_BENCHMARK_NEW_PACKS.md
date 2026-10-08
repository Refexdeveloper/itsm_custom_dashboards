# ITSM dashboards — API calls, timings, and is it optimized?

**Date:** 17 Sep 2026 (evening review)  
**Packs:** the 10 `*DashboardProject.zip` files rebuilt after Admin Get All Items + SLA/Stages work  
**Compared to:**

1. [Kissflow_ITSM_Dashboard_Slowness_Document.docx](file:///Users/mohamedaasik/Downloads/Kissflow_ITSM_Dashboard_Slowness_Document.docx) (17 Sep morning, Head Refex live test)
2. [Refex - IT Helpdesk Dashboard – Supported API Data Retrieval & Me_My Team Logic.docx](file:///Users/mohamedaasik/Downloads/Refex%20-%20IT%20Helpdesk%20Dashboard%20%E2%80%93%20Supported%20API%20Data%20Retrieval%20%26%20Me_My%20Team%20Logic.docx) (Admin Get All Items contract + 791-row benchmark)
3. Live code in this repo (`useAdminItemDataset`, `fetchAllAdminProcessItems`)

**Browser check (this evening):** Kissflow session opened as **asik** on `refexgroup.kissflow.com` (IT Helpdesk app). The **IT Head** page is not in this user’s visible nav, so the ~40 s Head Me clock from the morning test **could not be re-run**. Numbers below that are **measured** are from the two Word docs. Numbers for the new packs that are **not** re-timed in the browser are labelled **code path / expected**.

---

## Verdict (plain)

| Question | Answer |
|----------|--------|
| Is the **data path** better than the old slowness ticket? | **Yes, for Manager / Head / Admin / CEO / Agent.** They now use the supported Admin Get All Items list instead of pending 1+N + 3.1 MB process-report as the primary land. |
| Is first paint **proven** under a few seconds? | **No.** The morning live test still stands: Kissflow **shell** (~250 assets, chunks ~7.5–7.8 s) kept cards at 0 for **~40 s**. Our APIs were already sub-second each. Shell time is unchanged by the new zip. |
| Does the new pack match the Helpdesk API document? | **Mostly yes** for Head/Manager/Admin/CEO. **Employee packs still use the old pending/report path.** Agent still adds live pending/my-task on top of Admin Get All Items. |
| Is it fully optimized? | **Partially.** Client work from the Helpdesk doc is in (canonical list, AppRole Me, page_size 100, bounded parallel 4). Kissflow still has **no aggregate KPI API**. Payload is still ~791 items. Employee is not on the new contract. |

---

## 1. What the old slowness document measured (17 Sep morning)

**Role:** IT Head – Refex, user Srivaths, Me, FY 2026–27.

| Clock | What happened |
|-------|----------------|
| ~12:17:08 | Page on screen; KPI cards still **0** |
| ~12:17:48 | First useful Me paint: All **46** · Pending **29** · Open **0** · Closed **17** · Today Closed **5** |
| ~12:19:07 | Same numbers; table 29 pending; footer 46 loaded |

**Time to first useful KPI: ~40 seconds.** That wait is **not** one slow API.

### APIs used then (Head land)

```
Phase A — pending (fast paint)
  GET /process/2/{account}/Live_IT_Service_Request_A00/pending/activity/count
  GET /process/2/{account}/Live_IT_Service_Request_A00/pending/{activityId}   ← one call per live StepName

  [intentional wait ~2.5 s]

Phase B — Main Report
  GET /process-report/2/{account}/Live_IT_Service_Request_A00/Service_Items_Refex_A00
      page_size=500, all pages
```

### Timed REST (integration key, same morning)

| Call | HTTP | Time | Size | Rows |
|------|------|------|------|------|
| pending/activity/count | 200 | **221 ms** | 97 B | 1 step for that key |
| pending / IT Tech Reopen | 200 | **128 ms** | 56 KB | 17 |
| Report page 1 (`page_size=500`) | 200 | **362 ms** | **1.79 MB** | 500 |
| Report page 2 | 200 | **414 ms** | **1.34 MB** | 290 |
| **Report total** | | **~0.8 s** | **~3.1 MB** | **~790** |

User-session pending was larger than the key (29 Head approvals + 17 reopen = 46). Comments APIs were **not** on Head land.

**Why it felt slow (old doc, still true for the shell):**

1. Kissflow parent shell (~250 resources; many chunks **7.5–7.8 s**)
2. Custom component iframe start
3. Pending is **1 + N** list calls
4. Full report **~3.1 MB** then client map/merge
5. **No aggregate KPI API** — counts are always in the browser

---

## 2. What the Helpdesk API document specified

**Do not** build Me/Team from browser-discovered pending fan-out. Use the **documented** Admin list:

```
GET /process/2/AcCMptlq60zH/admin/Live_IT_Service_Request_A00/item
    ?page_number=N&page_size=100
Headers: X-Access-Key-Id / X-Access-Key-Secret  (server/BFF only — never in the pack)
```

In the **Kissflow custom component** we cannot put access keys in the zip. The pack calls the **same path** through `kf.api` (logged-in session). If that 403s, we fall back to the old report+pending path.

### Pagination they measured

| Page | Rows |
|------|------|
| 1–7 | 100 each |
| 8 | 91 |
| **Total unique `_id`** | **791** |

**Me / My Team (Head):** `_current_assigned_to` has `Kind=AppRole` and `_id=RoDiFs3IfOHC` (IT Head Refex). Do **not** match on role name.

Production check in that doc: **Me 48 + Team 743 = 791** (matched the Head dashboard Me count at that time).

### Their sequential benchmark (same 791 items)

| Run | API retrieval | Local classify | End-to-end |
|-----|---------------|----------------|------------|
| 1 | **~4,004 ms** | ~91 ms | **~4,159 ms** |
| 2 (page 8 spike TTFB ~4.5 s) | **~10,100 ms** | ~127 ms | **~10,227 ms** |

Finding in that doc: local loop is cheap; **Kissflow pagination time** dominates. They asked for the **next** optimization: bounded parallel pages (P1–P4 together, then next batch).

---

## 3. What the new uploaded packs actually call

### Primary land (Head / Manager / Admin / CEO)

```
GET /process/2/{account}/admin/{process}/item?page_number=1&page_size=100
GET … page_number=2..5 in parallel (concurrency 4)
GET … next batch of 4 until a page returns < 100
```

Code: `src/itsm/refex/shared/fetchKissflowAdminProcessItems.js`  
`ADMIN_ITEM_PAGE_SIZE = 100`  
`ADMIN_ITEM_PAGE_CONCURRENCY = 4`  ← this **is** the Helpdesk doc “next optimization”

Then **one** client loop:

- Head Me stamps: AppRole `RoDiFs3IfOHC`
- Manager Me stamps: AppRole `RoDQHEA3eK3L`
- Admin / CEO: **no** Me stamps (oversight)
- KPIs (Pending / Open / Closed / SLA / Today / Source) still counted in `kfITServiceDashboard.js` from those rows

**Not called on a successful Admin land:** pending/activity/count, pending/{id} fan-out, process-report 500-page walk, `$request_id` enrich, participated walk.

**Still called if Admin list fails (403 / error):** old pending + process-report fallback.

**Comments / progress:** still only when a ticket is expanded (Refex Head: no Comments chat on land). Same as the slowness doc.

### Agent (Refex + Extrovis)

```
Admin Get All Items (same 8×100, parallel 4)
  PLUS
live pending / my-task lists   ← still needed for “in my bucket right now”
```

Agent Open/Me is live-bucket, not AppRole Head. That extra pending set is **intentional**, not leftover report fan-out.

### Employee (Refex + Extrovis)

**Not** on Admin Get All Items. Still IndexedDB + pending seed + process-report. The Helpdesk document’s “one canonical dataset” is **not** applied here.

---

## 4. Timing comparison (correct numbers, labelled)

| Metric | Old slowness doc | Helpdesk API doc | New packs (this evening) |
|--------|------------------|------------------|---------------------------|
| First useful KPI (Head Me, real UI) | **~40 s** (12:17:08 → 12:17:48) | not a UI clock | **Not re-measured** (Asik session; Head page not in nav) |
| Kissflow shell | ~250 assets; chunks **7.5–7.8 s** | not addressed | **Unchanged** (parent Kissflow, not our zip) |
| pending/count | **221 ms** | should not be primary | Not primary if Admin list works |
| pending list (example) | **128 ms**, 17 rows | should not be primary | Agent still uses pending; Head/Manager/Admin/CEO do not on success |
| Process report | **~0.8 s**, **3.1 MB**, 2×500, ~790 rows | do not use as contract | Fallback only |
| Admin Get All Items | not used | 8×100, 791 rows, **~4.0 s** sequential / **~10.2 s** with spike | Same API; **parallel 4** so wall clock should be **better than 4 s sequential**, still subject to Kissflow spikes |
| Local classify | (inside map/merge) | **91–127 ms** | Same order of magnitude |
| Me count proof | UI Me 46 that morning | Admin list Me **48** = dashboard | Same AppRole rule in code |

Expected **data** time after shell is ready: **~1–4 s** typical for 8 pages in parallel of 4, **up to ~10 s** if Kissflow stalls a page (Helpdesk run 2). That is **not** the 40 s the user feels on first open.

---

## 5. Is it optimized?

### Done (matches Helpdesk doc)

- One supported list: Admin Get All Items  
- `page_size=100`, stop when `Data.length < 100`  
- Dedupe by `_id`  
- Me from AppRole id, not role name  
- Bounded parallel pages (4)  
- No Get Item Details × N on land  
- No Comments on Head land  
- IndexedDB still used for return visits  
- Fallback so a 403 does not blank the dashboard  

### Not done / still slow

| Item | Status |
|------|--------|
| Kissflow shell ~40 s | **Outside our zip.** Same as slowness ticket §7. |
| Aggregate KPI API | **Kissflow still has none.** Counts stay in the browser. |
| Employee dashboards | Still pending + process-report |
| Agent live pending | Extra APIs on purpose |
| Access keys in a BFF | Pack uses **session `kf.api`**, not a backend BFF (Helpdesk §2 diagram). Keys are not in the zip. |
| Second background walk | After a successful Admin land, a mapped-dataset load is scheduled (~400 ms). In-memory cache should reuse the same key and **not** download 8 pages twice. If the cache key mismatches, that would be a double fetch — watch Network for a second `/admin/.../item` wave. |
| `$created_at_gt` | Period (FY) is still applied **in the browser** after the full list |

### SLA / Stages (today’s other change)

Does **not** add landing APIs. It only changes how rows already in memory are counted (Pending 120 min, Hold, Solution + After Dependency). No extra Kissflow call on open.

---

## 6. Recommended Network check after you install the new zip

On IT Head (Srivaths) or IT Manager, hard refresh, DevTools → Network (filter `admin` and `pending`):

**Good (optimized path):**

- Several `.../admin/Live_IT_Service_Request_A00/item?page_number=…&page_size=100` (about 8, in groups of 4)
- **No** `pending/activity/count` on first land
- **No** `process-report/.../Service_Items_Refex_A00` on first land

**Bad (fallback / not uploaded):**

- `pending/activity/count` then many `pending/{activityId}`
- `process-report` pages of 500

Time the **first KPI numbers**, not the Kissflow logo. Compare to **~40 s** from the morning. If cards still sit at 0 for tens of seconds with no `admin/.../item` calls yet, that wait is still **shell**, not our list.

---

## 7. Code map

| Piece | File |
|-------|------|
| Admin list + parallel pages | `src/itsm/refex/shared/fetchKissflowAdminProcessItems.js` |
| Head/Manager/Admin land | `fetchRefexAdminCanonicalTickets` in `fetchRefexTechSupportTickets.js` |
| Head/Manager UI | `ITCrApproverDashboard.jsx` (`useAdminItemDataset`) |
| Agent | `ITAgentDashboard.jsx` (`useAdminItemDataset` + pending tasks) |
| KPI / Me / SLA | `src/lib/kfITServiceDashboard.js` |
| Old measured Head clock | `docs/IT_HEAD_REFEX_DASHBOARD_APIS_AND_PERFORMANCE.md` |

Related: [DASHBOARD_LOADING_OPTIMIZATION.md](./DASHBOARD_LOADING_OPTIMIZATION.md), [KPI_CARD_CONDITIONS.md](./KPI_CARD_CONDITIONS.md).
