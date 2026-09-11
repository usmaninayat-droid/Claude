import { cn } from '../lib/cn'
import { DashboardWidgetView } from './dashboard-widgets'
import { sourceOf, type DashboardWidgetRenderProps } from './dashboard-widget-shell'

/**
 * dashboard-stack-widget — the `stack` widget: several widgets sharing ONE
 * cell of the 12-column grid, laid out top to bottom.
 *
 * WHY THIS EXISTS. The Figma dashboards are masonry columns, not a uniform
 * grid: Vehicle Behaviour's first row is a gauge with two stat cards stacked
 * under it in a 4-column cell, beside an 8-column chart; Fuel's left column is
 * a 308px card over a 596px card, beside a 452/452 right column. `span` alone
 * cannot say that — it only sizes a widget horizontally, so every widget in a
 * row shares one implicit row height.
 *
 * WHY A CONTAINER AND NOT A `rowSpan`. The grid's rows are auto-sized, so a
 * `rowSpan` only lines up while every widget in the spanned rows happens to
 * resolve to the same height; the moment one card grows, the spanned cell
 * tears and the column ends ragged — the exact defect the masonry column
 * exists to avoid. A stack states the intent directly ("these cards share one
 * column"), needs no row model, and each child keeps its own authored
 * `dataSource.height`, which is what actually produces the Figma column.
 *
 * A stack is a LAYOUT node and nothing else: no card chrome of its own, no
 * `dataSource`, no state. Its children render through the same
 * `DashboardWidgetView` every top-level widget does, so every widget form is
 * stackable and none of them learns anything about being stacked. The
 * validator rejects nesting a stack inside a stack — one level is all the
 * masonry needs, and more is a second grid.
 *
 * Children's own `span` is deliberately ignored: inside a stack a child is
 * full width of the cell, which is what "stacked" means.
 */
export function StackWidget(props: DashboardWidgetRenderProps) {
  const { widget } = props
  const children = widget.children ?? []
  if (children.length === 0) return null
  return (
    <div
      data-slot="dashboard-widget-stack"
      data-widget-type="stack"
      // `gap-6` is the widget grid's own gap (verdict V8): a stacked column
      // must read as part of the same grid, not as a tighter sub-list.
      className={cn('flex h-full min-w-0 flex-col gap-6')}
    >
      {children.map((child) => (
        <div key={child.id} className="min-w-0">
          {/* Everything the parent was handed flows down unchanged — filters,
              renderer, loading/error state, the item-select seam — so a
              stacked widget behaves exactly as it would at the top level. */}
          <DashboardWidgetView {...props} widget={child} />
        </div>
      ))}
    </div>
  )
}

StackWidget.displayName = 'StackWidget'

/** Re-exported for the widget map's own doc: a stack has no data of its own. */
export function stackHasData(props: DashboardWidgetRenderProps): boolean {
  return Object.keys(sourceOf(props.widget)).length > 0
}
