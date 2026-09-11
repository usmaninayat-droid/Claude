import { type ReactNode } from 'react'
import { X } from '../icons'
import { cn } from '../lib/cn'
import { Sheet, SheetContent, SheetTitle, SheetClose } from '../primitives/Sheet'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../primitives/Accordion'
import { Button } from '../primitives/Button'
import { Badge } from '../primitives/Badge'
import { Input } from '../primitives/Input'
import { Checkbox } from '../primitives/Checkbox'
import { CustomScrollbar } from './CustomScrollbar'
import { Combobox, type ComboOption } from './Combobox'
import { DateRangePicker, type DateRangePickerValue } from './DateRangePicker'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../primitives/Select'

/**
 * FiltersSheet — the standard FAMS V5 "All Filters" extended side sheet. [L3 composite]
 *
 * A full-height right-anchored sheet (built on the DS `Sheet` primitive) that
 * groups an arbitrary set of filter fields into collapsible `Accordion`
 * sections. Where `FilterPopup` earns its keep for a small, anchored set of
 * filters, `FiltersSheet` is the "advanced filtering beyond the standard
 * dropdown" surface (Tadweer July Figma node 4217:27408, "All Filters" /
 * "Plan Monitoring Filters") — every field type used across that batch
 * (plain text, single select, searchable combobox, date, and a checkbox
 * group) is expressed as data, never as a bespoke section component.
 *
 * State-agnostic (Rule 8): `sections` + `value` fully describe what renders;
 * every mutation flows out through `onChange`, and `onApply`/`onClear`/
 * `onReset` are fired on user action only — the caller owns persistence.
 *
 * Field-value shapes (keyed by `FiltersSheetField.key` in `value`):
 *   - `text` → `string`
 *   - `select` → `string`
 *   - `combobox` → `string | string[] | null` (per `field.multiple`)
 *   - `date` → `DateRangePickerValue | undefined` (single-day picks use `mode="date"`, still a range internally with `from` only)
 *   - `checkbox-group` → `string[]`
 *
 * @usage-index filters-sheet
 */

export type FiltersSheetFieldType = 'text' | 'select' | 'combobox' | 'date' | 'checkbox-group'

export interface FiltersSheetOption {
  value: string
  label: string
  count?: number
}

export interface FiltersSheetField {
  key: string
  label: string
  type: FiltersSheetFieldType
  placeholder?: string
  /** Options for `select` / `combobox` / `checkbox-group`. */
  options?: FiltersSheetOption[]
  /** Multi-select for `combobox`. Ignored by other field types. */
  multiple?: boolean
  disabled?: boolean
}

export interface FiltersSheetSection {
  key: string
  label: string
  fields: FiltersSheetField[]
}

export type FiltersSheetValue = Record<string, unknown>

export interface FiltersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  sections: FiltersSheetSection[]
  /** Controlled field values, keyed by `FiltersSheetField.key`. */
  value: FiltersSheetValue
  onChange: (value: FiltersSheetValue) => void
  /** Fired with the current value when "Apply" is pressed. Omit for a live-filtering sheet with no Apply footer. */
  onApply?: (value: FiltersSheetValue) => void
  /** Fired (alongside an emptied `onChange`) when "Clear all" is used. */
  onClear?: () => void
  applyLabel?: string
  clearLabel?: string
  /** Number of active filters, shown as a badge next to the title. 0/undefined hides it. */
  activeCount?: number
  /** Accordion sections open by default (uncontrolled). Defaults to every section open. */
  defaultOpenSections?: string[]
  className?: string
}

function setField(value: FiltersSheetValue, key: string, next: unknown): FiltersSheetValue {
  return { ...value, [key]: next }
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FiltersSheetField
  value: unknown
  onChange: (next: unknown) => void
}) {
  const options: ComboOption[] = (field.options ?? []).map((o) => ({ value: o.value, label: o.label }))

  switch (field.type) {
    case 'text':
      return (
        <Input
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={field.disabled}
          aria-label={field.label}
        />
      )

    case 'select':
      return (
        <Select value={(value as string) ?? undefined} onValueChange={onChange} disabled={field.disabled}>
          <SelectTrigger aria-label={field.label}>
            <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
                {opt.count !== undefined ? ` (${opt.count})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'combobox':
      return (
        <Combobox
          options={options}
          value={(value as string | string[] | null) ?? (field.multiple ? [] : null)}
          onChange={onChange}
          multiple={field.multiple}
          placeholder={field.placeholder ?? `Select ${field.label}`}
          disabled={field.disabled}
        />
      )

    case 'date':
      return (
        <DateRangePicker
          mode="single"
          value={value as DateRangePickerValue | undefined}
          onChange={onChange}
          placeholder={field.placeholder ?? `Select ${field.label}`}
          disabled={field.disabled}
          triggerVariant="button"
        />
      )

    case 'checkbox-group': {
      const selected = (value as string[]) ?? []
      return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3" role="group" aria-label={field.label}>
          {(field.options ?? []).map((opt) => {
            const checked = selected.includes(opt.value)
            return (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={checked}
                  disabled={field.disabled}
                  onCheckedChange={(next) => {
                    const isChecked = next === true
                    onChange(
                      isChecked
                        ? [...selected, opt.value]
                        : selected.filter((v) => v !== opt.value),
                    )
                  }}
                  aria-label={opt.label}
                />
                <span className="text-sm text-foreground">{opt.label}</span>
                {opt.count !== undefined ? (
                  <span className="ms-1 text-xs text-muted-foreground">{opt.count}</span>
                ) : null}
              </label>
            )
          })}
        </div>
      )
    }

    default:
      return null
  }
}

export function FiltersSheet({
  open,
  onOpenChange,
  title = 'All Filters',
  sections,
  value,
  onChange,
  onApply,
  onClear,
  applyLabel = 'Apply',
  clearLabel = 'Clear all',
  activeCount,
  defaultOpenSections,
  className,
}: FiltersSheetProps) {
  const hasFooter = Boolean(onApply || onClear)

  const clearAll = () => {
    onChange({})
    onClear?.()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        data-slot="filters-sheet"
        className={cn('gap-0 p-0 sm:max-w-md', className)}
      >
        <div
          data-slot="filters-sheet-header"
          className="flex shrink-0 items-center justify-between gap-4 border-b border-border p-6 text-start"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SheetTitle>{title}</SheetTitle>
            {activeCount ? (
              <Badge variant="muted" size="xs" data-slot="filters-sheet-count" aria-hidden="true">
                {activeCount}
              </Badge>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {onClear ? (
              <button
                type="button"
                onClick={clearAll}
                data-slot="filters-sheet-clear"
                className="text-sm font-medium text-destructive-emphasis outline-none transition-colors hover:text-destructive-emphasis/80 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {clearLabel}
              </button>
            ) : null}
            <SheetClose asChild>
              <Button type="button" variant="tertiary" size="icon" aria-label="Close">
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>
        </div>

        <CustomScrollbar data-slot="filters-sheet-body" className="min-h-0 flex-1">
          <Accordion
            type="multiple"
            defaultValue={defaultOpenSections ?? sections.map((s) => s.key)}
            className="px-6"
          >
            {sections.map((section) => (
              <AccordionItem key={section.key} value={section.key}>
                <AccordionTrigger>{section.label}</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-4">
                    {section.fields.map((field) => (
                      <div key={field.key} className="flex flex-col gap-2">
                        {field.type !== 'checkbox-group' ? (
                          <span className="text-sm font-medium text-muted-foreground">{field.label}</span>
                        ) : null}
                        <FieldControl
                          field={field}
                          value={value[field.key]}
                          onChange={(next) => onChange(setField(value, field.key, next))}
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CustomScrollbar>

        {hasFooter ? (
          <div
            data-slot="filters-sheet-footer"
            className="mt-auto flex shrink-0 items-center justify-end gap-2 border-t border-border p-6"
          >
            {onApply ? (
              <Button type="button" variant="primary" onClick={() => onApply(value)} data-slot="filters-sheet-apply">
                {applyLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

FiltersSheet.displayName = 'FiltersSheet'
