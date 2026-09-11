import { forwardRef, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import {
  EMPTY_VALUE,
  renderTextCell,
  renderCheckboxCell,
  renderBadgeCell,
  renderBadgesCell,
  renderTagsCell,
  renderToggleCell,
  renderGaugeCell,
  renderProgressCell,
  renderTrendCell,
  renderAvatarCell,
  renderAvatarStackCell,
  renderActionsCell,
  renderGroupTitleCell,
  renderGroupDividerCell,
  renderActivityCell,
  renderStartEndTimeCell,
  renderTabActionsCell,
  renderEntityCell,
  renderIconValueCell,
  renderMetricsCell,
} from './TableCellRenderers'
import type { TableCellAlign, TableCellProps } from './TableCell.types'

/**
 * TableCell — kind-dispatch cell content renderer for `DataTable`. [L3 composite]
 *
 * A vocabulary of common cell shapes so callers write `column.render={(row) =>
 * <TableCell kind="badge" label={row.status} variant="success" />}` instead of
 * hand-rolling the same status pill / toggle / avatar markup per screen. This
 * renders CONTENT for a `DataTable` `<td>` — not the `<td>` itself — matching
 * `DataTableColumn['render']`'s contract (see `composites/DataTable.tsx`).
 *
 * Generic, business-neutral kinds only (Rule 10): `text` / `empty` / `checkbox` /
 * `badge` / `badges` / `tags` / `toggle` / `gauge` / `actions` / `avatar` /
 * `avatar-stack` / `progress` / `trend` / `group-title` / `group-divider` /
 * `activity` / `start-end-time` / `tab-actions` / `entity` / `icon-value` /
 * `metrics`. Each kind composes an existing primitive —
 * never a bespoke reimplementation — so status colors, a11y, and RTL all
 * inherit from the primitive for free. The three list-table kinds
 * (`activity`, `start-end-time`, `tab-actions`) have no dedicated primitive
 * yet, so they compose token utility classes directly (same pattern as this
 * file's own `group-title`/`group-divider`) rather than introduce one.
 *
 * `activity` takes a closed `tone` enum (never a raw hex or a business string
 * like `status: 'online'`); `tab-actions` takes a plain `isActive` boolean per
 * tab, not a "current tab id" string enum — the caller maps its own business
 * state to these before calling, same principle as `gauge`'s closed tone.
 *
 * `gauge` (renamed from the reference's `compliance`) uses `RadialProgress` — a
 * closed status enum, never a raw hex threshold color. `progress` composes
 * `StatBar` (itself a `Progress` wrapper — the linear bar is never
 * reimplemented, and the grandfathered Radix `Progress` primitive is never
 * touched directly). Both read `value` 0-100 by default; which one to reach
 * for is a layout choice (ring vs bar), not a business one.
 *
 * `progress` additionally takes `target` + `unit` for a `value / target unit`
 * caption line below the bar (Figma's `"3,800 / 5,000 km"`) — given together,
 * the fill percentage is `value / target`, otherwise `value` is read
 * directly as a 0-100 percentage (original contract, unchanged). An absent
 * or non-numeric `value` renders an explicit **empty state** — a flat grey
 * track and a dash — never a bar that clamps to 0 and silently asserts "0%
 * complete" for a measure the record doesn't track. `tone` lets three
 * adjacent `progress` cells differ (Figma: odometer amber, interval red,
 * engine-hours green) without this component ever deciding which value
 * counts as good — same closed-tone principle as `gauge`.
 *
 * `entity` / `icon-value` / `metrics` are the three PRODUCT-LIST row
 * anatomies moved down into the core tier on 2026-09-07 (they had only ever
 * existed above it, in `@fams/v5-templates`/`@fams/v5-composer`, so a
 * consumer of `DataTable` alone could not reproduce the product's own list
 * row). Each keeps its media/icon as an opaque `ReactNode` slot, so the core
 * never learns what kind of record a row is — see `TableCellIdentity.tsx`.
 *
 * `align` defaults to `start` for every kind except `actions`, which defaults
 * to `end` — trailing row-actions are exactly the kind of decision Rule 9/the
 * boundary doc says the system should own so callers stop re-deciding it.
 *
 * State-agnostic (Rule 8): every kind takes data + callbacks via props. No
 * fetch, no store, no formatting business logic (e.g. `progress`/`gauge` show
 * the raw `value`; "which value counts as good" stays the caller's call, same
 * principle as `TrendIndicator`).
 *
 * Structure: this file orchestrates + dispatches by `kind`; each kind's actual
 * JSX lives in `TableCellRenderers.tsx` (same decomposition convention as
 * `DataTable.tsx` + its sibling subcomponents). Types are in `TableCell.types.ts`.
 *
 * @usage-v5
 *   Consolidates ad-hoc per-column cell renderers scattered across list/table
 *   Vue components — there is no shared cell-kind system in v5 today:
 *   - `shared/components/list/StatusList.vue:274` — `q-badge` with an inline
 *     `:style="{ backgroundColor: status.color || '#6B7280' }"` raw-hex fallback,
 *     exactly what `badge`'s closed `variant`/`colorIndex` replaces.
 *   - `shared/components/list/GroupListing.vue`, `GroupedEntityList.vue` — grouped
 *     row badges + section headers, the `badge`/`group-title` kinds.
 *   - `iwmp/components/charts/{ContractCard,BreakdownTable,ComparisonChart,
 *     CompianceBreakdown}.vue` — `q-linear-progress` bound to a per-file `color`
 *     prop for a 0-100 compliance value — the `progress`/`gauge` kinds.
 *   - ~10 files with `q-toggle` inside row/list contexts (e.g.
 *     `iwmp/components/inspector/common/OnlineStatusToggle.vue`) — the `toggle` kind.
 *   Forms needed: badge/badges (status chip), toggle + checkbox (row controls),
 *   gauge + progress (0-100 value), avatar/avatar-stack (assignee), actions
 *   (trailing icon buttons) — one shared vocabulary instead of N inline templates.
 * @usage-index table-cell
 */

export type {
  TableCellKind,
  TableCellAlign,
  TableCellActivityTone,
  TableCellBadgeItem,
  TableCellAvatarItem,
  TableCellAction,
  TableCellTabAction,
  TableCellMetric,
  TableCellProps,
} from './TableCell.types'

const JUSTIFY_CLASS: Record<TableCellAlign, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}

export const TableCell = forwardRef<HTMLDivElement, TableCellProps>((props, ref) => {
  const { className } = props
  const align = props.align ?? (props.kind === 'actions' ? 'end' : 'start')

  let content: ReactNode

  switch (props.kind) {
    case 'text':
      content = renderTextCell(props)
      break
    case 'empty':
      content = EMPTY_VALUE
      break
    case 'checkbox':
      content = renderCheckboxCell(props)
      break
    case 'badge':
      content = renderBadgeCell(props)
      break
    case 'badges':
      content = renderBadgesCell(props)
      break
    case 'tags':
      content = renderTagsCell(props)
      break
    case 'toggle':
      content = renderToggleCell(props)
      break
    case 'gauge':
      content = renderGaugeCell(props)
      break
    case 'progress':
      content = renderProgressCell(props)
      break
    case 'trend':
      content = renderTrendCell(props)
      break
    case 'avatar':
      content = renderAvatarCell(props)
      break
    case 'avatar-stack':
      content = renderAvatarStackCell(props)
      break
    case 'actions':
      content = renderActionsCell(props)
      break
    case 'group-title':
      content = renderGroupTitleCell(props)
      break
    case 'group-divider':
      content = renderGroupDividerCell()
      break
    case 'activity':
      content = renderActivityCell(props)
      break
    case 'start-end-time':
      content = renderStartEndTimeCell(props)
      break
    case 'tab-actions':
      content = renderTabActionsCell(props)
      break
    case 'entity':
      content = renderEntityCell(props)
      break
    case 'icon-value':
      content = renderIconValueCell(props)
      break
    case 'metrics':
      content = renderMetricsCell(props)
      break
    default:
      content = EMPTY_VALUE
  }

  return (
    <div
      ref={ref}
      data-slot="table-cell"
      data-table-cell-kind={props.kind}
      className={cn('flex w-full items-center', JUSTIFY_CLASS[align], className)}
    >
      {content}
    </div>
  )
})

TableCell.displayName = 'TableCell'
