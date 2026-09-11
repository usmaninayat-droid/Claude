# Event Configuration — contract

Settings › Event Configuration. Figma: `211-9075` (list) · `211-3718`/`211-3140`/`211-4380`/`211-6878`/`211-8156`/`211-8760` (configure wizard). Reuses the DS `EventIcon`/`EVENT_ICONS` registry for glyphs.

## EventConfiguration (`event-configuration.tsx`) — list
One row per event. Config-driven, token-only.

**Props** — `events: EventRow[]` (`{ id, name, iconKey?, type:'single'|'dual', trigger, criticality:'critical'|'normal', configType:'system'|'custom', enabled }`) · `onCreateEvent?()` · `onToggleEvent?(id, enabled)` · `onEventAction?(event, 'edit'|'duplicate'|'delete')` · `title?` · `subtitle?`.

**Row** — EventIcon + name · Event Type (SINGLE/DUAL) · Trigger (`--status-success`) · Criticality badge (Critical=`--status-error` / Normal=`--muted-foreground`) · Config Type badge (SYSTEM=`--primary` / CUSTOM=`--status-success`) · enable `Switch` · kebab (CUSTOM only: Edit / Duplicate / Delete-with-confirm). Empty state included.

## EventConfigSheet (`event-config-sheet.tsx`) — WIDE 3-step wizard
On the shared `StepWizardSheet` (`width=min(1040px,96vw)`, `onCancel` + `secondaryAction="Save as draft"`). `initial` (with `id`) → edit.
1. **Event Details** — General detail (Event Name* · Criticality select · Trigger select · **searchable Event-Icon combobox** over `EVENT_ICONS`), Flags (Zone Based / Trip Location Based), **Assign Entity** 2-col: entity-scope radios (All Entities/Assets/Devices/Workforce) + **category-scoped** Assign-by-Entity checkbox grid + Assign-by-Tags (chips via `TagChip`).
2. **Configure Conditions** — recursive AND/OR **rule builder** (`RuleGroupEditor`): op toggle + condition rows (Tracker/Operator/Trigger Value) + Add condition + Add nested condition (1 level) + Add Rule Delay / Add Rule End.
3. **Actions** — checkboxes Send Email / Trigger Action Script / Send SMS / Task in Pipeline; a checked action reveals its config (email → Send-Email-on input). Final button "Create Event".

**EventDraft** — `{ name, criticality, triggerPoint, iconKey, eventType, flags{zoneBased,tripLocationBased}, entityScope, assetTypes[], tagIds[], rule: RuleGroup, actions{email,script,sms,pipeline}, emailTo }`. RuleGroup = `{ op, conditions[], groups[] }` (recursive).

**Type→Trigger linkage (optional, back-compat)** — pass `eventTypes?: EventTypeOption[]` (`{ id, label, triggers: string[] }`) to add an "Event Type" select to step 1 that constrains the Trigger Point select to that type's `triggers` subset (auto-reselects the first valid trigger if the current one becomes invalid). Omit the prop (default) to keep the original unconstrained Trigger Point behaviour with no Event Type field rendered — `EventDraft.eventType` is `''` in that case. `entityScopeLabel?`/`assetTypeLabel?` override the two "Assign Entity" box headings (default "List of All Entities"/"Assign by Asset Type") for a non-fleet consumer whose vocabulary doesn't fit "asset" (e.g. a workforce recipe assigning by site/trade/camp/bus-route via the `assetTypes` checkbox grid). Added for ifm-workforce T-048; consumer-agnostic, zero behavior change for existing callers.

**Category-scoped "Assign by Entity" (T-097)** — `entityScopes` items are `EntityScopeOption { id, label, icon, desc, members?: string[] }`. When a scope carries its own `members` catalogue, selecting that LEFT radio shows ONLY that category's members in the right checkbox grid (never every category mixed together — the pre-fix defect). A scope with NO `members` of its own (e.g. "All Entities") groups every OTHER categorized scope's members together under its own heading, so nothing is hidden. A scope selection defaults every member of its category CHECKED (the "All X" semantic = the whole category; a muted "Applies to the whole category — uncheck any to scope to a subset" note shows while every member stays checked) — unchecking any member narrows `EventDraft.assetTypes` to an explicit subset scope. Switching categories mid-session remembers each category's own picks (re-selecting an earlier category restores what you left checked there, not a fresh full-category reset) — this memory is sheet-session-local, not persisted; only the CURRENTLY selected category's members ever live in the saved `EventDraft.assetTypes`/`entityScope` pair. Omitting `members` on every scope (no consumer opt-in) falls back to the original flat `assetTypes` grid unaffected by the radio — fully back-compat for any pre-T-097 consumer.

## Acceptance
- List matches `211-9075`; wizard steps match their frames (parity-verified via `shoot.mjs`: list + Event Details + Conditions rule-builder). Event glyphs are the real DS `EventIcon` registry.
- Consumer persists EVERY EventDraft field on create+edit (T-007 round-trip) — the block keeps a `drafts` map + hydrates `initial`.
- Gates green (coherence · smoke · a11y · build); token-only; Settings access model per decisions.md. Wired at `blocks/settings` + live in Smart Cities.
