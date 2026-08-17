---
description: Verify coherence — schemas valid, token-only styling, builds, every module resolves a renderer + data source.
---
Run the verify gate (see `docs/BUILD-SEQUENCE.md` §6). Concretely:
- Validate `recipes/**` and module configs against `schemas/*`.
- Grep `src/components` and `src/runtime` for raw hex (`#[0-9a-fA-F]{3,6}`) outside token files — report violations.
- **Brand-default check (coherence law #6).** Unless the user explicitly asked for a
  custom brand, the recipe MUST set no `brand.theme` and no custom `brand.logo` — it
  inherits FAMS primary blue (`--primary: #0072D6`) + the FAMS logo. Grep the product
  recipe for a `brand.theme`/`logo` key: if present and the user did NOT request a
  custom brand, FAIL and report it. (A custom brand the user asked for is a PASS.)
- `pnpm typecheck` (and `pnpm build` if asked).
- Re-run the pure-TS spine tests if present under `src/__tests__`.

## Fidelity checks (a generated app must look like the showcase, not lag it)

Compile-green is necessary but not sufficient. Also confirm each module actually
consumes the **newest** components / config shapes (per `docs/MODULE-TYPE-COOKBOOK.md`):

- **live-monitoring** — every `MonitoringEntity` sets `assetType` (so pins render as
  **AssetMarker**, not plain dots). Grep the monitoring module: entities without
  `assetType` → FAIL (low-fidelity pins).
- **dashboard** — uses `<Dashboard>` (KPI row + sections) and, where there are
  gauge/compare/map widgets, the declarative `<DashboardWidgetGrid>` — not bespoke
  per-widget JSX. KPIs derive from the same data arrays the other modules read.
- **entity detail** — entities with a profile use the identity panel + **Overview**
  tab (Phase 1c) rather than a flat field dump.
- **pipeline** — `kanbanCard` places fields into header/body/footer slots and lets
  the field *type* pick the renderer (status→pill, priority→flag, Reference→avatar);
  no hand-styled cells.
- **No bespoke screens** — grep the product for module `render:` overrides that
  re-implement a board/detail/map/dashboard the kit already provides. A custom
  `render` is only legitimate for a genuinely new shape; flag the rest.
- **Module-type fit** — each module's `type` matches the cookbook decision guide
  (e.g. staged work is a `pipeline`, not an `entity` with a status column faked in).

Output a PASS/FAIL checklist (coherence + fidelity); any FAIL blocks "done".
