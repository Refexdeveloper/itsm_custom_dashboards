# AGENTS.md

Kissflow ITSM React component packs (Refex + Extrovis).

**Start here:** [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md)

Also read before changing KPI / Me / Team / Closed logic:

- [docs/PRODUCT_DECISIONS.md](docs/PRODUCT_DECISIONS.md)
- [docs/KPI_CARD_CONDITIONS.md](docs/KPI_CARD_CONDITIONS.md)

Source of truth for matchers: `src/lib/kfITServiceDashboard.js`.

KPI card **look** (not matchers): Project Tracker `PremiumKPICard` — 4-up grid, `min-h-[112px] lg:min-h-[168px]`, PT palette. Live tokens: `IT_KPI_ACCENT`. Revert file: `src/components/it/itDesignTokens.classic.js`. Rule: `.cursor/rules/project-tracker-kpi-design.mdc`.
