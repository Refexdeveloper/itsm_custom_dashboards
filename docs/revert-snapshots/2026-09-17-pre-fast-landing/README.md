# Revert snapshot — 17 Sep 2026

Copy of Kissflow ITSM dashboard files **before** applying IT Head titled/fast-landing behaviour to the other packs, and before the Group CTO header override.

Use this if KPIs, Me/Team, or landing data look wrong after the 17 Sep packs.

## Restore

From the `aasik_ITSM` repo root:

```bash
SNAP="docs/revert-snapshots/2026-09-17-pre-fast-landing/src"
cp "$SNAP"/IT*.jsx src/
cp "$SNAP/lib/kfITServiceDashboard.js" src/lib/
cp "$SNAP/lib/itDashboardProfiles.js" src/lib/
cp "$SNAP/components/it/ITCrApproverDashboard.jsx" src/components/it/
cp "$SNAP/itsm/refex/shared/fetchKissflowAdminProcessItems.js" src/itsm/refex/shared/
cp "$SNAP/itsm/refex/shared/refexDatasetStore.js" src/itsm/refex/shared/
cp "$SNAP/itsm/refex/techsupport/fetchRefexTechSupportTickets.js" src/itsm/refex/techsupport/
cp "$SNAP/itsm/refex/employeedashboard/RefexEmployeeDashboard.jsx" src/itsm/refex/employeedashboard/
```

Then rebuild zips (`node scripts/zip-all-it.js`) and redeploy the packs in Kissflow.

## What this snapshot preserves

- Pack header labels (Employee / IT Agent / IT Manager / IT Head / Admin / Group CEO / Extrovis First & Final)
- IT Head–only `useAdminItemDataset` (Admin Get All Items)
- Manager / Admin / CEO / Extrovis / Agent / Employee landing paths as they were
- Me / Team / SLA matchers in `kfITServiceDashboard.js` at this point in time
