# Known issues & Kissflow quirks

Update this when bugs are fixed or new quirks are found.

## Open / watch

1. **Rejected workflow expand** — Older deployed packs may still truncate the workflow rail at IT Manager Approval. Code fix may already exist; **redeploy** Rejected-workflow capable zips.
2. **IT Head Me Pending ghosts** — Some Rejected or already-at-IT-Tech tickets can still appear under Pending Approval for Head Me. Investigate live `isLiveApprovalPending` stamps vs step name.
3. **`$created_at_gt`** — Earlier traces showed full unfiltered pages; **re-checked 2 Nov 2026 evening and the filter worked**. Keep watching on the next Performance recording (response size / row count). Client-side FY period filtering still applies either way.

4. **User photo 404s (`aries-cs-pro-p001.storage.googleapis.com/AcCMptlq60zH/Us…/photos/130x130.jpeg`)** — requested twice each (img + script fetch) by the **Kissflow parent page**, ~8 s into load, before our component frame starts. Not our code (our packs only draw initials avatars). Report to Kissflow; nothing to remove here.

## Fixed (do not reintroduce)

- Mobile ticket card tap only expanded; desktop row click opened the Kissflow form (e.g. IT Head Pending Approval). Mobile cards now use `onCardTap` → `handleDashboardCardTap` with the same `canOpenForm` rule as the desktop row; the chevron alone expands. Approver packs (Manager, Head, Common, Extrovis First/Final, Admin, Group CEO), Agent Refex/Extrovis, Employee Refex/Extrovis. Test: `e2e/mobile-card-tap.spec.js`.

- My Team → Create Ticket (or "+" Service / Change Request) → Back landed on Me. Create pages now save the Me / My Team view like row forms (`useMeTeamFormReturn().withFormReturn`). Test: `tests/me-team-create-ticket-return.test.mjs`.

- Past FY showing today’s open / undated tickets via live re-inject — gated by `dashboardDateRangeIncludesToday`.
- Soft refresh flashing KPIs to 0 — keep previous display until new data ready.
- Extrovis polluted by Refex feedback activity IDs.
- Me Closed filled from “participated” history instead of Closed By + live reopen bucket.
- IT Tech Reopen counted as Pending Approval (it belongs on Closed).
- Admin showing Me/Team switch — Admin is org-wide only.

## Verification tips

- Compare KPI counts to Kissflow `pending/activity/count` and `pending/{activityId}` for the signed-in user.
- Me + Team ≈ loaded total for scoped roles (Admin = full report).
- Use Chrome DevTools MCP against the live Kissflow page after zip deploy.
