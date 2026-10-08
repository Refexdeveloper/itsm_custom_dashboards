# Agent handoff — Kissflow ITSM

Read this first when continuing work in a new chat/agent session.

## What this repo is

Kissflow **custom React component** packs for **IT Service Management** (not ProjectFlow). Account: `AcCMptlq60zH` (`refexgroup.kissflow.com`).

Two product families share most logic:

| Family | Process / notes |
|--------|-----------------|
| **Refex** | `Live_IT_Service_Request_A00` — L1/L2/Manager/Head approvals, IT Tech → Tech Support → Reopen |
| **Extrovis** (+ related entities) | Separate process/profile — **no** Pending Approval; Open = PickUp; My Tickets = Solution/Dependency; ReOpen Window (7 days) |

Ignore outdated `project_plan.md` if it describes ProjectFlow.

Non-Refex (Extrovis / ModePro / Kavis / Pharma Pack) feature list vs shipped code: [EXTROVIS_NON_REFEX_REQUIREMENTS.md](./EXTROVIS_NON_REFEX_REQUIREMENTS.md).

## Entry points (zip targets)

Thin wrappers under `src/IT*DashboardProject.jsx` mount shared UI:

| Role | Refex | Extrovis |
|------|-------|----------|
| Employee | `ITEmployeeRefexDashboardProject.jsx` | `ITEmployeeExtrovisDashboardProject.jsx` |
| Agent / Tech Support | `ITAgentRefexDashboardProject.jsx` | `ITAgentExtrovisDashboardProject.jsx` |
| Manager (First) | `ITManagerRefexDashboardProject.jsx` | `ITFirstLevelExtrovisApproverDashboardProject.jsx` |
| Head (Final) | `ITHeadRefexDashboardProject.jsx` | `ITFinalLevelExtrovisApproverDashboardProject.jsx` |
| Common Refex | `ITCommonRefexDashboardProject.jsx` (own tickets + tasks only; no entity / company / Me\|Team) | — |
| Admin | `ITAdminDashboardProject.jsx` | same pack (org-wide) |
| CEO | `ITCEODashboardProject.jsx` | Me \| My Team like Head + IT Agents filter + Engagement Report |

Faster landing uses Kissflow **Admin Get All Items** (`useAdminItemDataset`) on Head, Manager, Admin, CEO, Extrovis First/Final, and Agent. Employee stays on the requester report. If the admin list 403s, each pack falls back to the previous report + pending path. Pre-change files: `docs/revert-snapshots/2026-09-17-pre-fast-landing/`.

Shared cores:

- `src/ITAgentDashboard.jsx` — agent / tech support
- `src/components/it/ITCrApproverDashboard.jsx` — Manager / Head / Admin monitoring
- `src/itsm/refex/employeedashboard/` — employee
- **Logic source of truth:** `src/lib/kfITServiceDashboard.js`
- Profiles / IDs: `src/lib/itDashboardProfiles.js`

## Build & deploy

Vite builds **one dashboard per zip**. Scripts rewrite `App.jsx`, emit `dist/manifest.json` (`Category: Component`).

| Script | Output |
|--------|--------|
| `scripts/zip-refex-four.js` | Employee, Agent, Manager, Head (Refex) |
| `scripts/zip-extrovis-a00.js` | Extrovis family packs |
| `scripts/zip-it-admin-only.js` | Admin only |
| `scripts/zip-it-ceo-only.js` | CEO only |
| `scripts/zip-all-it.js` | Broad rebuild |
| Logic smoke | `scripts/test-refex-logic.mjs` |

Local Node (if system Node missing): `.tools/node-runtime/current/bin`.

After logic fixes, **rebuild zips and redeploy** in Kissflow — old packs in the account will not pick up repo changes.

## Docs map

| Doc | Use when |
|-----|----------|
| [PRODUCT_DECISIONS.md](./PRODUCT_DECISIONS.md) | Me/Team, Closed By, period filter, Extrovis vs Refex — **do not reverse without user OK** |
| [KPI_CARD_CONDITIONS.md](./KPI_CARD_CONDITIONS.md) | Exact KPI inclusion rules |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Open bugs / Kissflow quirks |
| [KEY_FILES.md](./KEY_FILES.md) | Where to edit |
| [DASHBOARD_LOADING_OPTIMIZATION.md](./DASHBOARD_LOADING_OPTIMIZATION.md) | Landing seed, cache, API gaps — for Kissflow load-time tickets |
| [IT_HEAD_DASHBOARD_LANDING.md](./IT_HEAD_DASHBOARD_LANDING.md) | IT Head: exact land APIs, KPI calc, Comments GET sequence |
| [IT_HEAD_REFEX_DASHBOARD_APIS_AND_PERFORMANCE.md](./IT_HEAD_REFEX_DASHBOARD_APIS_AND_PERFORMANCE.md) | IT Head Refex: APIs, client calc, **measured load times**, why it is slow |

## Chrome / live checks

MCP: `project-0-aasik_ITSM-chrome-devtools`. Prefer live Kissflow pending + report APIs over guessing counts.

## Working rules for agents

1. Prefer changing shared matchers in `kfITServiceDashboard.js` over one-off UI hacks.
2. Extrovis must not pick up Refex-only approval / feedback activity pollution.
3. **Venwind** shares the Refex process. Filter by company/entity containing Venwind; Refex tab excludes those rows. Do not refetch All_tickets when switching Refex ↔ Venwind.
4. Soft refresh must not flash KPIs to 0 then recover (preserve previous display until new data lands).
5. Do not commit or push unless the user asks.
6. Update these docs when product rules change.

## Comments save

Process **POST** (not `/submit`) to the live **InProgress** user-task. Resolve activity id from `GET …/progress`. **Comments tab** on **Extrovis** dashboards only. **Refex** shows Solution on Overview (no Comments chat). **Send** on Extrovis **My Tickets** (Employee **Open**) — no extra workflow-step filter. Extrovis: `Stages_1: InProgress`. See [PRODUCT_DECISIONS.md](./PRODUCT_DECISIONS.md).
