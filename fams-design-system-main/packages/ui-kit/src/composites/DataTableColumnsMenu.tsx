import { useState } from 'react'
import { Popover } from 'radix-ui'
import { Pencil, Settings2 } from '../icons'
import { IconControl } from './IconControl'
import { ColumnCustomizer, type ColumnCatalogItem } from './ColumnCustomizer'

interface DataTableColumnsMenuProps {
  catalog: ColumnCatalogItem[]
  /** Ordered visible column keys (visibility + order). */
  value: string[]
  onChange: (orderedVisibleKeys: string[]) => void
  /**
   * `'icon'` (default) — an icon-only pencil, no border/label — the trigger
   * every real product screen uses (VALUES-CROSSCHECK.md row 25: F1/F2/F4's
   * figma.png all show a small pencil at the header row's end, never a
   * bordered "Columns" button). `'labelled'` is the legacy bordered
   * gear-icon + text button, kept for a standalone toolbar context with no
   * header row to pin a pencil into — see `DataTable`'s `columnsMenuVariant`
   * doc comment.
   */
  variant?: 'icon' | 'labelled'
}

/**
 * The DataTable columns-customizer trigger button + popover. The popover
 * CONTENT is always the standard `ColumnCustomizer` (search + drag-reorder +
 * grouped toggles) — only the trigger's look changes with `variant`.
 * Internal to DataTable.
 */
export function DataTableColumnsMenu({
  catalog,
  value,
  onChange,
  variant = 'icon',
}: DataTableColumnsMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {variant === 'labelled' ? (
        <Popover.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-sm border border-border bg-card px-3 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings2 className="size-3.5" />
            Columns
          </button>
        </Popover.Trigger>
      ) : (
        // Icon-only ⇒ name AND a hover/focus tooltip (UX K.67), same
        // convention as `trailingAction`'s hand-built pencil button. 32px hit
        // area on a 16px glyph — between F1's "12px pencil in 26px
        // container" and F4's "16px pencil in 32px container".
        <IconControl tip="Edit columns" popoverTrigger>
          <button
            type="button"
            aria-label="Edit columns"
            className="inline-flex size-8 items-center justify-center rounded-xs text-muted-foreground outline-none transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        </IconControl>
      )}
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-popover outline-none">
          <ColumnCustomizer
            catalog={catalog}
            value={value}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
