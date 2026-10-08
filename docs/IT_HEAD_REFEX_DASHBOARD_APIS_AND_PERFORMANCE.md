# IT Head Refex dashboard — APIs, calculations, and load times

**Pack:** `ITHeadRefexDashboardProject.jsx` → `ITCrApproverDashboard` (`role=final`, lands on Refex)  
**Account:** `AcCMptlq60zH` (`refexgroup.kissflow.com`)  
**App:** `IT_Service_Management_A00`  
**Process:** `Live_IT_Service_Request_A00`  
**Report:** `Service_Items_Refex_A00`  

Kissflow does **not** return KPI numbers. The pack loads rows, then we count in the browser (`kfITServiceDashboard.js`).

This note is the Head **Refex** path only. It matches the style of the existing Kissflow performance ticket and adds **measured times** from 17 Sep 2026.

---

## 1. Start to end (what runs)

```
Open IT Head Dashboard (Refex, Me)
        │
        ▼
Phase A — pending APIs (fast paint)
        │  GET pending/activity/count
        │  GET pending/{activityId}  (one call per matched StepName)
        │  Client: Me = those live rows → KPI cards
        │
        ▼  (pack waits ~2.5s on purpose)
Phase B — Main Report (background)
        │  GET process-report …/Service_Items_Refex_A00  (page_size=500, all pages)
        │  Client: merge report + pending → Me/Team, period, KPI recount
        │
        ▼
Comments — only if the user expands a ticket (Refex Head has no Comments chat)
        │  GET …/{instanceId}/progress
        │  GET …/{instanceId}/{activityInstanceId}
```

---

## 2. Phase A — first paint (Me)

**Code:** `fetchRefexApproverMeLandingSeed`  
**Not called:** Main Report, `$request_id`, Comments, participated history, Closed-by-Completed query.

| Order | API | Why |
|---|---|---|
| 1 | `GET /process/2/{account}/Live_IT_Service_Request_A00/pending/activity/count?apply_preference=true&_application_id=IT_Service_Management_A00` | StepName → activity `_id` |
| 2 | `GET /process/2/{account}/Live_IT_Service_Request_A00/pending/{activityId}?apply_preference=true&page_number=1&page_size=100&skip_aggregation=true&_application_id=…` | Live tickets in that step |

Head Me StepNames: **IT Head Approval**, IT Tech / Tech Support / Dependency, reopen (IT Tech Reopen / Ticket Reopen / Employee Feedback).  
One **pending list** call per StepName that has Count > 0.

**Client calc after Phase A**

- Stamp live pending / reopen / approval ids  
- **Me** = those live rows  
- Count All / Pending Approval / Open / Closed from the seed only (Closed here is mostly live ReOpen window, not full-year Closed)

**Measured — Live Kissflow, 17 Sep 2026 (integration key)**

| Call | HTTP | Time | Size | Rows |
|---|---|---|---|---|
| pending/activity/count | 200 | **221 ms** | 97 B | 1 step returned for this key |
| pending / IT Tech Reopen | 200 | **128 ms** | 56 KB | 17 tickets |

**Measured — live Head UI (browser, user session)**  
IT Head Dashboard for Srivaths Varadharajan, Entity Refex, period FY 2026–27:

| Time | What we saw |
|---|---|
| ~12:17:08 | Cards still **0** (Kissflow shell + component still starting) |
| ~12:17:48 | Me painted: **All 46 · Pending Approval 29 · Open 0 · Closed 17 · Today Closed 5** |
| ~12:19:07 | Same Me numbers; table **29 Pending Approval**, footer **46 loaded** |

So **first useful Me paint was ~40 seconds** after the Head page was on screen. That wait is **not** the 221 ms count call alone. It includes:

1. Kissflow **shell JS** — parent page loaded **~250 resources**; many `static-cdn-as1.kissflow.com` chunks reported **~7.5–7.8 s** duration  
2. Custom component iframe (`resource.as.kissflow.store` … `/CCDiHh5d5D3T/…`)  
3. User-session **pending/activity/count** plus **several** `pending/{activityId}` calls (user pending is larger than the integration key: UI shows 29 Head approvals + 17 reopen = 46)

The dashboard APIs are called through the Kissflow SDK (parent), not as `fetch` URLs inside the component iframe, so Chrome resource timing on the iframe does not list `process-report` / `pending`. Times above are from timed Live REST calls + on-screen clock.

---

## 3. Phase B — background full MIS

**Code:** `ensureRefexMappedDataset('monitoring')` after **~2.5 s** delay on Head Me (`deferFullMs`).

| Order | API | Why |
|---|---|---|
| 3 | `GET /process-report/2/{account}/Live_IT_Service_Request_A00/Service_Items_Refex_A00?page_number=&page_size=500&_application_id=…` | Every Refex ticket (paginated) |

**Measured — same Live account**

| Call | HTTP | Time | Size | Rows |
|---|---|---|---|---|
| Report page 1 (`page_size=500`) | 200 | **362 ms** | **1.79 MB** | 500 |
| Report page 2 | 200 | **414 ms** | **1.34 MB** | 290 |
| **Report total (2 pages)** | | **~0.8 s** | **~3.1 MB** | **~790 tickets** |

Each report page is relatively fast (~0.4 s) but **large**. The pack still **waits 2.5 s** before starting this walk, then **parses and maps ~790 rows** in the browser, then merges with pending.

Venwind vs Refex is a **client filter** on this same report (no extra All_tickets fetch).

---

## 4. What we calculate (not Kissflow)

After rows are in memory:

1. Entity = Refex (Venwind off this tab)  
2. **Me** = live pending **or** Closed By you **or** live reopen in your bucket. **My Team** = `!Me`  
3. Period = Weekly / Monthly / FY (Today’s Snapshot skips period)  
4. Count:

| KPI | Rule |
|---|---|
| All Tickets | Rows in Me or Team |
| Pending Approval | Live at **IT Head Approval** (Me). Team = L1+L2+Manager+Head except your Me tasks |
| Open Tickets | Live bucket + agent pipeline open (not approval, not reopen-hold) |
| SLA Breached | Open SLA ⊂ Open; Closed SLA ⊂ Closed. Pending Approval is **not** SLA Open |
| Rejected | Rejected + you closed/modified (Me) / any rejected (Team) |
| Closed | ReOpen window **or** process Completed — **not** Statu_1 |

Source chips use the same rows (no extra API).

On the live Head Me view we opened: All **46** = Pending **29** + Closed/reopen **17**. Open **0** because Head Me open work is not in that user’s live Tech/PickUp bucket.

---

## 5. Soft refresh later

Pending count + pending lists again, plus report `$modified_at_gt` delta. Same Me/Team/KPI calc. KPIs must not flash to 0. No Comments.

---

## 6. Comments — not on land (Refex Head)

Refex Head shows Solution on Overview. **No Comments chat.**  
If another role opens Comments: `GET …/progress` then `GET …/{instanceId}/{activityInstanceId}`. Do **not** call bare `GET …/{instanceId}` (404).

---

## 7. Why it feels slow (Head Refex)

Aligned with the existing Kissflow performance ticket; Head-specific facts:

| Cause | Evidence |
|---|---|
| **No aggregate KPI API** | We must download pending queues + the full ~790-row report to count Closed/Team/SLA |
| **Kissflow shell, not our React paint** | Parent loaded 250 assets; many chunks **~7.8 s**; Head cards stayed 0 for tens of seconds |
| **Pending is 1 + N calls** | Count, then one list per live StepName. User Me had at least Head Approval (29) + Reopen (17) |
| **Report payload is huge** | Two pages, **~3.1 MB**, ~790 tickets — ~0.8 s network, then heavy client map/merge |
| **Intentional 2.5 s wait** | Head Me delays Phase B so first paint is not blocked; Closed/Team from the full report arrive later |
| **Report vs pending lag** | Pending is live; report can lag. We merge by instance id in the pack |
| **`$created_at_gt` not trusted** | Period (FY) is applied **in the browser** after download |

The UI render of the KPI cards is not the bottleneck. **Kissflow shell + multiple pending calls + full report download + client rules** are.

---

## 8. What we already do (client)

Same as the performance ticket: landing seed, skip `$request_id` on land, IndexedDB cache, soft delta, no KPI flash to zero, no participated walk on Head Me land.

---

## 9. What we need from Kissflow (Head)

1. Aggregate KPI API (All / Pending Approval / Open / Closed / SLA by user + period)  
2. Reliable server-side `$created_at_gt` / `$modified_at_gt` / entity / company  
3. Closed-by-user query (not full report)  
4. Documented StepName → ActivityId + pending rate limits  
5. Guidance on **page_size** for a ~3 MB / 790-row `Service_Items_Refex_A00` report  

---

## 10. Code map

| Piece | File |
|---|---|
| Head entry | `src/ITHeadRefexDashboardProject.jsx` |
| Load / seed | `src/components/it/ITCrApproverDashboard.jsx` |
| Me seed | `fetchRefexApproverMeLandingSeed` |
| Pending StepName | `src/itsm/refex/shared/refexPendingByStep.js` |
| KPI rules | `src/lib/kfITServiceDashboard.js` |

Related: [DASHBOARD_LOADING_OPTIMIZATION.md](./DASHBOARD_LOADING_OPTIMIZATION.md), [KPI_CARD_CONDITIONS.md](./KPI_CARD_CONDITIONS.md).  
Reference ticket: *Kissflow ITSM Dashboard Performance API Support Ticket*.
