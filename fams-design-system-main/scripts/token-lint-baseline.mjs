/**
 * Token-lint grandfather list (phase 1 §6 — migrate-on-touch).
 *
 * `scripts/lint-tokens.mjs` bans raw hex colors and raw Tailwind `[Npx]`
 * arbitrary values in `packages/{ui-kit,skeleton-kit,v5-templates}/src`. These
 * files predate the gate (37 occurrences across 13 files, all in
 * `@fams/ui-kit`, at the time this baseline was regenerated — see
 * `docs/history/PORT-LEDGER.md` / task-6 report for the full count) and are
 * exempted so the gate can go green without a mass, unreviewed find-and-
 * replace pass across unrelated components.
 *
 * This baseline was regenerated after a task-6 code-review fix to the
 * scanner itself (`lint-tokens.mjs`): the scanner now strips `//`/`/* *\/`
 * comments before matching (so JSDoc `@usage-v5` blocks quoting legacy Vue
 * hex values no longer count as violations) and treats `resolveToken(...)`
 * calls as exempt, same as `var(...)` (the established pattern for ECharts
 * canvas components — see Gauge.tsx/ComplianceGauge.tsx). That dropped 8
 * files that had only comment-only or resolveToken-fallback hex (54→37
 * occurrences, 21→13 files): ChartTooltip, ComplianceGauge, Gauge,
 * StateTransitionToolbar, TableCell, Timeline, DestructiveActionModal,
 * ScrollArea. Every remaining entry below is a genuine raw hex/px value in
 * real (non-comment, non-resolveToken) code.
 *
 * Migrate-on-touch: when a listed file is next touched for real work (not a
 * drive-by fix), replace its raw hex/px with a token or Tailwind theme class
 * and remove its entry from this list. NEVER add a new file here — new
 * violations are not grandfathered, they're bugs.
 *
 * Regenerate the current violation set with:
 *   node scripts/lint-tokens.mjs --list
 *
 * Paths are relative to the repo root (matching how `lint-tokens.mjs`
 * resolves scanned files).
 */
export const tokenLintBaseline = [
  // --- composites: stray Tailwind `[Npx]` arbitrary values ---
  'packages/ui-kit/src/composites/ColumnCustomizer.tsx',
  'packages/ui-kit/src/composites/FileUploader.tsx',
  'packages/ui-kit/src/composites/FilterPanel.tsx',
  'packages/ui-kit/src/composites/TagChipList.tsx',

  // --- domain/map ---
  // VehiclePopupCard migrated off `[Npx]` classes in the 2026-08-15 live-
  // monitoring wave (rem equivalents) and left this list. MapChip and
  // VehicleMarker migrated in the 2026-08-24 live-monitoring wave (tokens +
  // component-scoped rem/inline geometry) and left it too — as did
  // MapControls in that wave's fix1 round (rounded-lg + inline geometry),
  // so `domain/map` now carries NO grandfathered entries at all.

  // --- primitives: stray `[Npx]` sizing predating the semantic scale ---
  'packages/ui-kit/src/primitives/Input.tsx',
  // Float-label caption offset (top-[9px]) shared with Input's floating mode —
  // migrate all three together when a field-label spacing token lands
  // (2026-08-25 fields parity cycle).
  'packages/ui-kit/src/primitives/Select.tsx',
  'packages/ui-kit/src/composites/Combobox.tsx',
  'packages/ui-kit/src/primitives/Switch.tsx',
  'packages/ui-kit/src/primitives/Textarea.tsx',

  // --- shells: stray `[Npx]` sizing ---
  'packages/ui-kit/src/shells/HybridView.tsx',
  'packages/ui-kit/src/shells/ModuleRail.tsx',
]
