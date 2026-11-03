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
| **`$created_at_gt` (was ignored in earlier traces)** | Re-checked 2 Nov 2026 evening — filter **works** (small response, not a full 500-row page). FY period is still applied in the browser after download |

The UI render of the KPI cards is not the bottleneck. **Kissflow shell + multiple pending calls + full report download + client rules** are.

---

## 8. What we already do (client)

Same as the performance ticket: landing seed, skip `$request_id` on land, IndexedDB cache, soft delta, no KPI flash to zero, no participated walk on Head Me land.

---

## 9. What we need from Kissflow (Head)

1. Aggregate KPI API (All / Pending Approval / Open / Closed / SLA by user + period)  
2. Reliable server-side entity / company filters ( `$created_at_gt` / `$modified_at_gt` re-checked OK on 2 Nov 2026 evening)  
3. Closed-by-user query (not full report)  
4. Documented StepName → ActivityId + pending rate limits  
5. Guidance on **page_size** for a ~3 MB / 790-row `Service_Items_Refex_A00` report  

---

## 9a. Shared pending requests (IT Head only, 2 Nov 2026)

A DevTools trace of the approver page showed the same `pending/activity/count`, `pending/{activityId}` and
`myitems/inprogress` GETs fired several times in parallel (Me seed, approval, reopen and open-work pools each
fetched them). The IT Head pack now turns on `setRefexPendingRequestSharing(true)` while it is mounted:
identical GETs share one request for 5 s, each caller still applies its own StepName filter, and force
Refresh clears the shared entries. Rows and Me / My Team results are unchanged
(`node scripts/test-head-pending-sharing.mjs`). All other packs keep the old behaviour (switch off).

## 9b. Freeze + stuck fixes (IT Head only, 2 Nov 2026)

Second trace (IT Head, after 9a) showed a **1.08 s main-thread freeze** in the component after the report
arrives, and code review showed **no timeout** on any Kissflow call (the cause of "sometimes stuck").

| Change | What it does | Data impact |
|---|---|---|
| Fast row lookup (`setFastRowLookup`) | `getItemValue` caches each row's lowercase column names (rebuilt if the row's columns change) instead of lowercasing every column on every call | None — same value, same order |
| Cached date formatters | `formatDateTime`, `formatDate`, `formatDisplayDateTime` reuse one `Intl.DateTimeFormat('en-IN')` per format | None — identical text |
| Read timeout (`setKfReadTimeout`, 45 s) | `kfGetJson`, `fetchITServiceReport`, `fetchITChangeRequestReport` fail after 45 s instead of hanging | Only a call that never answers changes — it now fails like a network error (callers already fall back). Writes / submits are **never** timed out |

All three (plus 9a sharing) are switched on together by `setItHeadPerformanceMode(true)` in
`src/lib/itHeadPerformanceMode.js`, called only by `ITHeadRefexDashboardProject.jsx`.
Proof: `node scripts/test-head-performance-mode.mjs` (2,400 rows, 15 KPI / Me matchers and two years of
dates identical with the mode off / on; mapping ~3.3× faster).

## 9c. Rolling out to other dashboards (checklist)

**Do this only after IT Head is confirmed fine** (correct Me / My Team / KPI numbers + a clean
Performance trace). The switches are off for every other pack today.

What Head already turns on via `setItHeadPerformanceMode(true)` (§9a + §9b + §9d) — copy later:

| Switch | Effect |
|---|---|
| `setRefexPendingRequestSharing` | One shared GET for identical pending / inprogress / instance-enrich URLs (5 s) |
| `setJoinInflightMappedLoads` | Twin soft/force `ensureRefexMappedDataset` joins instead of double walk |
| `setFastRowLookup` | Indexed `getItemValue` + cached date formatters + per-ticket step/status cache (§9e) |
| `setKfReadTimeout(45000)` | Hung **reads** fail after 45 s (writes never timed out) |

Steps per pack:

1. In that pack’s `src/IT*DashboardProject.jsx`, add the same two lines as
   `ITHeadRefexDashboardProject.jsx`:
   `useState(() => setItHeadPerformanceMode(true));` and a `useEffect` that turns it off on unmount.
   (Rename the helper when more than one pack uses it.)
2. Run:
   `node scripts/test-head-performance-mode.mjs`,
   `node scripts/test-head-pending-sharing.mjs`,
   `node scripts/test-head-twin-load-and-enrich.mjs`,
   plus the pack’s `test-refex-*` / `test-extrovis-stage` scripts.
3. Rebuild **only that pack** and record a DevTools Performance + Network pass:
   - one `pending/activity/count`, one call per pending step, one `myitems/inprogress` per page size
   - no twin report / enrich race
   - no long task > ~300 ms in the component frame
4. Spot-check Me / My Team / KPI counts against the previous zip before replacing it in Kissflow.

## 9d. Twin load + ticket-detail sharing + indexed lookup (IT Head only, 2 Nov 2026)

Third full trace (IT Head, after 9a–9b) showed three remaining client costs after first paint:

| Change | What it does | Data impact |
|---|---|---|
| Join in-flight mapped loads (`setJoinInflightMappedLoads`) | Soft/force `ensureRefexMappedDataset` joins an identical in-flight promise instead of deleting it and starting a second walk (SDK-ready + params were racing ~10–35 ms apart) | None — same rows, one walk |
| Shared instance enrich GETs | Same `setRefexPendingRequestSharing` map now also collapses identical `/{instanceId}/{activityInstanceId}` (and admin item) GETs for 5 s, so approval/reopen/open-work enrich of the same tickets share one response (~86 → ~15) | None — same payloads |
| Indexed field lookup | `getItemValue` (fast mode) uses a lowercase→actual column `Map` per row and probes field keys in order, instead of scanning every column | None — same value, same order |

Still gated by `setItHeadPerformanceMode(true)`. Proof: existing `test-head-performance-mode.mjs` + `test-head-pending-sharing.mjs`, plus `test-head-twin-load-and-enrich.mjs`.

Fourth trace (`Trace-20261102T205316`, bundle `index-CdC0yZlA.js`) confirmed 9d: no twin load, 12 ticket-detail
calls for 12 tickets, `$created_at_gt` 21–64 KB, our background load ~4.2 s. Remaining cost: a **2.4 s freeze on
the My Team click** (and 731 / 454 ms during load) — every row re-ran the same step / status helpers per tab and card.

## 9e. Per-ticket step / status cache (IT Head only, 2 Nov 2026)

| Change | What it does | Data impact |
|---|---|---|
| `memoRowDerived` in `kfITServiceDashboard.js` (on with `setFastRowLookup`) | Caches per ticket object: `getCurrentStepValue`, `isEmployeeApprovalRefexStep` (so `isITTechReopenStep`), `isRefexServiceProcessCompleted`, `isRefexServiceRejectedTicket`, `pickSrInProgressActivityFromColumn`. Key includes the active profile + service column map, so an entity switch recomputes | None — tickets are never edited in place (new objects on every load / merge); off / on, cold / warm and Refex → Extrovis → Refex all identical |

Proof: `node scripts/test-head-performance-mode.mjs` (map + 15 matchers on 2,400 rows: 41 s off → 0.8 s on; same
mapped rows re-filtered under three profile switches give identical flags and steps). Zip bundle `index-Bl_a_5LV.js`.

## 9f. Rolled out to every Kissflow pack (2 Nov 2026, night)

After the fifth IT Head trace (`Trace-20261102T222159`: My Team click 567 ms, our load ~2.2 s, no twin loads),
the same switch is on for **all** Kissflow packs via `useDashboardPerformanceMode()`
(`src/lib/dashboardPerformanceMode.js`; `itHeadPerformanceMode.js` is a thin alias kept for tests):

Admin, Group CEO (Kissflow), Common Refex, IT Manager, IT Head, Agent Refex, Agent Extrovis,
First / Final Level Extrovis, Employee Refex, Employee Extrovis.
Not used by the Notification Engine CEO pages (`NewCeoDashboardProject`, Travel / Expense / Solar) — they
read NE data, not Kissflow tickets.

Write safety added for the rollout (agents and approvers act inline, unlike Head):

| Guard | Where | Why |
|---|---|---|
| Write epoch (`noteKfWrite` / `trackKfWrite`) | `kfRuntime.js` — `kfMutateJson`, `kfPostCommentJson`, SDK `getITProcess` / `getChangeRequestProcess` write methods (`trackKfProcessWrites`), Extrovis admin PUT | Marks every save / submit / comment |
| Shared GETs cleared on write | `fetchRefexTechSupportTickets.js` (`onKfWrite`) | A refresh after Accept / Submit never reuses a pending list from before it |
| Join only same-epoch loads; force joins only force | `refexDatasetStore.js` | Post-action refresh and the Refresh button always read fresh data |
| Employee expand stamps `isProcessCompleted` when the row copy is built | `RefexEmployeeExpandPanel.jsx` | Per-ticket cache never sees the flag change later |

Proof: `scripts/test-head-twin-load-and-enrich.mjs` (write safety block), `test-head-performance-mode.mjs`,
`test-head-pending-sharing.mjs`, all `scripts/test-*` and `tests/*` pass; Playwright 71 / 75 (the 4 failing
"shows Due checkbox" checks are older than this change — `showDue` has defaulted to `false` since the 28 Oct commit).

**Before rolling 9e to another pack:** confirm that pack does not edit mapped tickets in place
(`rg "row\.(currentStep|systemStatus|isLive…)\s*="`). The only in-place write today is in the Employee
expand panel (`isProcessCompleted = true` when already completed), which stays consistent.

**`$created_at_gt` status (2 Nov 2026 evening):** manually re-checked — filter is working (not returning a full unfiltered page). The two created-at delta pulls in soft refresh can stay; they are no longer treated as a Kissflow ignore bug. Confirm again on the next Head Performance recording (response size / row count).

**Still open (not changed — timing / optional, need sign-off):**
skipping per-ticket instance enrich entirely when report columns are already filled,
the 2.5 s / 3.5 s background delay plus idle wait, and stale loads not being cancelled when Kissflow params change.

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
