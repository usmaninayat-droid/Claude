/**
 * Single-cell inline editors — the contract ListView (task 2.4) consumes.
 *
 * A cell editor adapts a field-type's edit widget to the inline-edit contract
 * (`value`, `onCommit`, `onCancel`). Text-like fields commit on Enter/blur and
 * cancel on Escape; discrete controls (boolean/select/picker/color) commit
 * immediately on change. Same registry, one contract — no second widget set.
 */
import { useState } from 'react'
import type { CellEditor, EditWidget } from './types'

/** Wrap an `EditWidget` as a `CellEditor`. `immediate` commits on every change. */
export function makeCellEditor(widget: EditWidget, immediate = false): CellEditor {
  return function CellEditorImpl({ descriptor, value, onCommit, onCancel, context }) {
    const [local, setLocal] = useState<unknown>(value)
    const change = (next: unknown) => {
      setLocal(next)
      if (immediate) onCommit(next)
    }
    return (
      // Presentational key-capture container around a real interactive control:
      // Enter commits, Escape cancels. The control itself owns focus/roles.
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit(local)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
      >
        {widget({
          descriptor,
          value: local,
          onChange: change,
          onBlur: immediate ? undefined : () => onCommit(local),
          context,
        })}
      </div>
    )
  }
}
