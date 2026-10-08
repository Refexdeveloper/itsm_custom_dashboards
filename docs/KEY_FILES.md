# Key files

## Matchers & business rules

| File | Responsibility |
|------|----------------|
| `src/lib/kfITServiceDashboard.js` | Tab matchers, Me/Team, Closed, SLA, date range, step helpers — **edit here first** |
| `src/lib/itDashboardProfiles.js` | Extrovis vs Refex process / report / activity IDs |

## Fetch / cache

| File | Responsibility |
|------|----------------|
| `src/itsm/refex/techsupport/fetchRefexTechSupportTickets.js` | Service queue fetch, soft cache, Today, pending merge |
| `src/itsm/refex/employeedashboard/fetchEmployeeTickets.js` | Employee tickets |
| `src/itsm/refex/shared/refexReportQuery.js` | Report query helpers |
| `src/itsm/refex/shared/refexPendingByStep.js` | Pending-by-step helpers |
| `src/itsm/refex/employeedashboard/progressApi.js` | Progress fetch, workflow journey, Comments InProgress activity pick |
| `src/itsm/refex/employeedashboard/agentSolutionCommentApi.js` | Comments save (process POST, Refex vs Extrovis payload) |

## UI shells

| File | Responsibility |
|------|----------------|
| `src/ITAgentDashboard.jsx` | Agent / tech support KPIs, scope, MIS |
| `src/components/it/ITCrApproverDashboard.jsx` | Manager / Head / Admin |
| `src/ITAdminDashboardProject.jsx` | Admin entry (`hideScopeSwitch`) |
| `src/ITHeadRefexDashboardProject.jsx` | Head entry (`role=final`, entity dropdown) |
| `src/ITCEODashboardProject.jsx` | CEO entry (Head Me\|Team + IT Agents filter) |
| `src/components/it/useApproverAdaptivePeriodFilter.jsx` | Period picker wiring |
| `src/components/it/ITDashboardShared.jsx` | Shared dashboard chrome |
| `src/itsm/refex/employeedashboard/RefexEmployeeDashboard.jsx` | Employee UI |

## MIS / expand

| File | Responsibility |
|------|----------------|
| `src/components/it/mis/misExpandContent.js` | Expand panel content |
| `src/components/it/mis/ITMisExpandPrimitives.jsx` | Expand UI primitives |
| `src/itsm/refex/shared/misCompactCells.jsx` | Compact MIS cells |

## Tests & zips

| File | Responsibility |
|------|----------------|
| `scripts/test-refex-logic.mjs` | Logic regression smoke |
| `scripts/zip-refex-four.js` | Refex four packs |
| `scripts/zip-extrovis-a00.js` | Extrovis packs |
| `scripts/zip-it-admin-only.js` | Admin pack |
