# Known issues & Kissflow quirks

Update this when bugs are fixed or new quirks are found.

## Open / watch

1. **Rejected workflow expand** — Older deployed packs may still truncate the workflow rail at IT Manager Approval. Code fix may already exist; **redeploy** Rejected-workflow capable zips.
2. **IT Head Me Pending ghosts** — Some Rejected or already-at-IT-Tech tickets can still appear under Pending Approval for Head Me. Investigate live `isLiveApprovalPending` stamps vs step name.
3. **`$created_at_gt`** — Kissflow may ignore this server-side on report queries; client-side date filtering still applies. Soft cache must not assume server honors both `$modified_at_gt` and `$created_at_gt`.

## Fixed (do not reintroduce)

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
