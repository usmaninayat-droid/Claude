# Contract / Project Management — contract (Pass 1: list view)

From the Tadweer ref (`_unpacked/dispatcher/` sibling design; Figma `lXBH6N7ZpHfBuY60tH71TD`,
list node `2111-10733`, detail `2303-3679`, KPI raw-data sheet `2303-4514`). Config-driven,
FAMS-branded, token-only. Multi-pass — this spec covers Pass 1 (the list view).

## Components (src/components/contracts/)
- **ContractCard** — a contract tile: header (name · expiry label · status `Badge`) + identity
  chips (ref# · contractor · lot) + a 2×2 grid of **resource meters** (label · `value/max` · a bar
  whose colour derives from fill — ≥80% success / ≥50% warning / else error — unless a `tone` is
  given). Statuses: `ongoing`/`expiring`/`draft`/`expired` → success/warning/muted/error tokens.
- **ContractManagement** — the list view: header (search · filter · Create) + a KPI stat row
  (Total/Active/Expiring/Drafts/Expired — icon-well + label + count; defaults derive from
  `contracts`, or pass explicit `stats` to match a design summary) + a responsive card grid.

## Laws
- Token-only (status/meter/stat colours are DS tokens); config-driven + domain-agnostic
  (contracts/stats are DATA — the block seeds the waste/lot demo). Default FAMS brand.
- Consumed via `blocks/contracts/contracts.block.tsx` (ModuleConfig "Contract Management" → List
  View), wired into Smart Cities.

## Multi-pass plan (T-014)
1. **DONE** — list view (KPI stat row + contract card grid).
2. **Create wizard** — an 11-step FULL-PAGE LEFT-STEPPER (Basic Info · Zone Selection · Add
   Vehicles/Equipment/Workforce/Bins · Service & Frequency · KPI Targets · Attachments · Summary).
   Note: this is a left-rail stepper, distinct from the top-tab `StepWizardSheet` — may warrant a
   new shared `LeftStepperSheet`/page shell.
3. **Contract detail** — overall-compliance gauge + KPI tiles (Vehicles/Plans/Services/Days
   Remaining/Service Compliance) + Contractor Details + Daily Plan chart + KPI Targets (target-vs-
   achieved bars) + a right **Timeline** panel (activity + status-change chips + comments). Reuse
   the events `ActivityFeed`/detail-sheet timeline pattern.
4. **KPI raw-data sheet** — clicking a detail KPI tile opens a wide right `Sheet` + `DataTable`
   (Vehicle/Driver/Plan/Service Type/Waste Type/Planned Time/Status) — same pattern as Operations.
