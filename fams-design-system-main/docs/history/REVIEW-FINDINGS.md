# Review findings — reference-fidelity + v5-gap audits

> Historical working document from the initial port project (June–July 2026). Kept for provenance — not part of the living documentation.

Consolidated from parallel review agents (design-fidelity vs the reference DS, and gap/alignment vs the v5 product codebase). Split into **intentional scope-outs** (leave), **fidelity fixes** (restore — cheap, real regressions), and **capability gaps** (new phases).

## Verdict
Most sampled components (Button, Card, Select/Combobox, DestructiveActionModal, Badge, EntityProfileCard, EntityPickerDrawer, ViewTabs, Breadcrumbs, StatusTransitionDropdown, NotificationCard) are **genuinely next-level, not just parity** — token-based tone instead of raw hex, real Radix a11y, RTL, consolidation of forks. Gaps cluster narrowly around **heavy/stateful data widgets** and a handful of **dropped visual/functional affordances**.

## A. Intentional scope-outs — NOT regressions (leave as-is)
- **ActivityFeed**: no @mention autocomplete (app-layer mention resolution) and no file-attach composer (file-upload owned separately). Correct per boundary rules.
- **NotificationCard**: dropped Bell icon + hover "Clear" (documented merge decision).
- **DestructiveActionModal**: friction (typed-keyword/reason) is opt-in not on-by-default — state-agnostic redesign. *Consider* a `safe` preset later.

## B. Fidelity fixes — real drops worth restoring (mostly additive, cheap)
| Component | Dropped vs reference | Fix |
|---|---|---|
| **StateTransitionToolbar** | uppercase + letter-spaced action-label style (spec-locked "StatePill style"); `getForwardTransitions` linear-flow helper | restore the label treatment; re-add the helper |
| **ModuleViewTabs** | active tab brand-blue icon + `bg-secondary` (spec-locked) | restore active-state color logic |
| **PeoplePicker** | one-click `onClear` on the assignee-chip trigger | add `onClear` affordance |
| **DateRangePicker** | `field` render mode (borderless label-above trigger for report filters); `withTime` default changed | add `field` variant; document default |
| **TableCell** | 3 generic kinds: `activity` (pulsing dot+label), `start-end-time` (two-line), `tab-actions` | add the 3 kinds |
| **CriticalEventsList** | keyboard-focusable `ListRow` has no `focus-visible` ring | add focus ring to ListRow (also helps every ListRow consumer) |
| **UserMenu** | identity-header `role` line | add optional `role` field |
| **EntityProfileCard** | tag tint lighter (soft vs solid) | confirm/allow solid variant |

## C. Capability gaps — genuinely missing, high-leverage (new phases)
Ranked by how much of v5 they unlock:
1. **DataTable virtual-scroll + server pagination** — `BaseTable.vue` has 27 consumers doing `virtual-scroll` + `@request` server paging; our DataTable renders flat. **Highest-leverage gap.** (PORT-LEDGER's DataTable line mentions groupBy but missed windowing/pagination — add to backlog.)
2. **File upload / attach control** — 10 forks across shared/iwmp/fams/ead (documents, photos, signature); we only have `FileTypeIcon`. Touches active IIMS inspection flows.
3. **Image gallery / lightbox** — `q-carousel` in 6 IIMS/CCMS inspection-evidence contexts; cheap build, high workflow value.
4. **Button `round`/true-circle icon shape** — 55 files use `q-btn round`; minor addition to Button.
5. **Combobox non-searchable async-loading variant** — minor.
6. Charts (ECharts) and Maps (MapLibre `@usage-v5` docs) — already tracked separately.

## D. Structural (IA) — being fixed now
One unified per-component navigation grouped by layer (Primitives/Layout/Composites/Shells/Domain), retiring the duplicate topic "Components" group so every component is reachable exactly one way. (In progress.)
