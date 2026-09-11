import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { compileFieldSet, clearCompileCache } from './compiler'
import type { FieldSetInput } from './compiler'
import type { AuthoredSystemColumn } from '../blueprint-schema'
import { SchemaForm, SchemaFormField, mapSchemaFormOut } from './SchemaForm'
import { registerEditWidget, resetEditWidgetRegistry } from './registry'
import type { EditWidget } from './types'
import { InMemoryDataStore } from '../store'
import type { EntityConfig } from '../types'
import contactsModule from '../../blueprints/crm/contacts.module.json'

function col(c: Partial<AuthoredSystemColumn> & { col: string; type: AuthoredSystemColumn['type'] }): AuthoredSystemColumn {
  return { id: `fld_${c.col}`, name: c.col, ...c }
}

beforeEach(() => clearCompileCache())

describe('SchemaForm — validation + submit', () => {
  const compiled = () =>
    compileFieldSet(
      {
        code: 'form/basic',
        version: 1,
        fields: [
          col({ col: 'title', name: 'Full name', type: 'SmallText', required: true }),
          col({ col: 'email', name: 'Email', type: 'Email', required: true }),
        ],
      } satisfies FieldSetInput,
    )

  it('surfaces zod errors for a required miss and a bad email', async () => {
    const onSubmit = vi.fn()
    render(<SchemaForm compiled={compiled()} onSubmit={onSubmit} mode="onSubmit" />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(2) // title required + email format
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a { col: value } record when valid', async () => {
    const onSubmit = vi.fn()
    render(<SchemaForm compiled={compiled()} onSubmit={onSubmit} mode="onSubmit" />)

    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Acme', email: 'a@b.com' })
  })

  it('renders from the CRM golden blueprint fields', () => {
    const c = compileFieldSet(contactsModule as unknown as FieldSetInput)
    render(<SchemaForm compiled={c} onSubmit={vi.fn()} />)
    // Contacts' Full name + Email + Company + Role fields all render a control.
    expect(screen.getByLabelText(/Full name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
  })

  // fix7 wave 6, P2: the required-field `*` used `text-destructive` (a FILL
  // token) as text — 3.76:1 light / 3.91:1 dark, failing AA — the same root
  // cause this cycle already fixed for `ReadFlagToneDate` (wave 4b) and
  // `ReadSignedNumber` (wave 5). Pinned on the accessible `-emphasis` alias.
  it('renders the required-field marker in the accessible `-emphasis` text tone, not the fill tone', () => {
    const c = compiled()
    render(<SchemaForm compiled={c} onSubmit={vi.fn()} />)
    const markers = screen.getAllByText('*')
    expect(markers.length).toBeGreaterThan(0)
    for (const marker of markers) {
      expect(marker).toHaveClass('text-destructive-emphasis')
      expect(marker).not.toHaveClass('text-destructive')
    }
  })
})

describe('SchemaForm — repeating group (useFieldArray)', () => {
  it('adds and removes items', () => {
    const c = compileFieldSet(
      { code: 'form/rep', version: 1, fields: [col({ col: 'aliases', name: 'Alias', type: 'SmallText' })] },
      { repeating: ['aliases'] },
    )
    render(<SchemaForm compiled={c} onSubmit={vi.fn()} />)

    expect(screen.queryAllByRole('button', { name: 'Remove' })).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: /Add Alias/ }))
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Add Alias/ }))
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1)
  })

  it('renders the repeating-group legend\'s required marker in the accessible `-emphasis` text tone', () => {
    const c = compileFieldSet(
      { code: 'form/rep-req', version: 1, fields: [col({ col: 'aliases', name: 'Alias', type: 'SmallText', required: true })] },
      { repeating: ['aliases'] },
    )
    render(<SchemaForm compiled={c} onSubmit={vi.fn()} />)
    const marker = screen.getByText('*')
    expect(marker).toHaveClass('text-destructive-emphasis')
    expect(marker).not.toHaveClass('text-destructive')
  })
})

describe('SchemaForm — scoped re-render guard', () => {
  it('typing in one field does NOT re-render a sibling field', () => {
    const c = compileFieldSet({
      code: 'form/scoped',
      version: 1,
      fields: [
        col({ col: 'first', name: 'First', type: 'SmallText' }),
        col({ col: 'second', name: 'Second', type: 'SmallText' }),
      ],
    })
    const counts: Record<string, number> = {}
    render(<SchemaForm compiled={c} onSubmit={vi.fn()} onFieldRender={(col) => (counts[col] = (counts[col] ?? 0) + 1)} />)

    const secondAfterMount = counts.second
    const firstInput = screen.getByLabelText(/First/)
    fireEvent.change(firstInput, { target: { value: 'a' } })
    fireEvent.change(firstInput, { target: { value: 'ab' } })
    fireEvent.change(firstInput, { target: { value: 'abc' } })

    // `first` re-rendered on each keystroke; `second` never re-rendered.
    expect(counts.first).toBeGreaterThan(secondAfterMount)
    expect(counts.second).toBe(secondAfterMount)
  })
})

describe('SchemaForm — submit mapping: MultiReference array ↔ CSV contract', () => {
  const compiled = () =>
    compileFieldSet({
      code: 'form/refs',
      version: 1,
      fields: [
        col({ col: 'title', name: 'Title', type: 'SmallText' }),
        col({ col: 'companies', name: 'Companies', type: 'MultiReference', refModule: 'Entity', entityType: 'crm/companies' }),
      ],
    } satisfies FieldSetInput)

  it('joins a 2-selection MultiReference field to a CSV string', () => {
    const out = mapSchemaFormOut(compiled(), { title: 'Acme', companies: ['id1', 'id2'] })
    expect(out).toEqual({ title: 'Acme', companies: 'id1,id2' })
  })

  it('maps an empty MultiReference selection to "" (matches writeRefs semantics)', () => {
    const out = mapSchemaFormOut(compiled(), { title: 'Acme', companies: [] })
    expect(out.companies).toBe('')
  })

  it('leaves non-reference multi-valued fields (MultiSelect/tags) as arrays', () => {
    const c = compileFieldSet({
      code: 'form/tags',
      version: 1,
      fields: [col({ col: 'tags', name: 'Tags', type: 'tags' })],
    } satisfies FieldSetInput)
    const out = mapSchemaFormOut(c, { tags: ['a', 'b'] })
    expect(out.tags).toEqual(['a', 'b'])
  })

  it('round-trips through the store: mapSchemaFormOut → store.create → readRefs returns the original array', () => {
    const config: EntityConfig = {
      code: 'crm/deals',
      name: 'Deals',
      systemcolumns: [
        { col: 'title', name: 'Title', type: 'SmallText' },
        { col: 'companies', name: 'Companies', type: 'MultiReference', refModule: 'Entity', entityType: 'crm/companies' },
      ],
      uiConfig: { statusList: [] },
      listcolumns: [],
    }
    const store = new InMemoryDataStore()
    store.registerConfig(config)

    const formValues = { title: 'Acme deal', companies: ['id1', 'id2'] }
    const record = store.create('crm/deals', mapSchemaFormOut(compiled(), formValues))

    expect(record.companies).toBe('id1,id2')
    expect(store.readRefs('crm/deals', record, 'companies')).toEqual(['id1', 'id2'])
  })
})

describe('SchemaFormField — fieldChrome + named edit-widget override', () => {
  afterEach(() => resetEditWidgetRegistry())

  const compiled = () =>
    compileFieldSet({
      code: 'form/chrome',
      version: 1,
      fields: [
        col({ col: 'title', name: 'Title', type: 'SmallText' }),
        col({ col: 'note', name: 'Note', type: 'BigText' }),
      ],
    } satisfies FieldSetInput)

  function Harness({ col: fieldCol, fieldChrome }: { col: string; fieldChrome?: 'default' | 'inset-label' }) {
    const c = compiled()
    const { control } = useForm<Record<string, unknown>>({ defaultValues: { title: '', note: '' } })
    return <SchemaFormField compiled={c} col={fieldCol} control={control} fieldChrome={fieldChrome} />
  }

  it('default chrome renders an external <label> above an inset-capable field', () => {
    render(<Harness col="title" />)
    expect(screen.getByText('Title').tagName).toBe('LABEL')
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('inset-label chrome moves the label inside the field (no external <label> sibling)', () => {
    render(<Harness col="title" fieldChrome="inset-label" />)
    // The label text still exists (rendered by InsetField), but is no longer
    // a `<label for="sf-title">` paired via `getByLabelText` at the FieldControl
    // level — FieldControl's own external <Label> is suppressed.
    const labels = document.querySelectorAll(`label[for="sf-title"]`)
    expect(labels).toHaveLength(1) // InsetField's own <label>, not a duplicate.
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  it('leaves a textarea-shaped field (BigText) on the external-label default even under inset-label chrome', () => {
    render(<Harness col="note" fieldChrome="inset-label" />)
    expect(screen.getByLabelText('Note').tagName).toBe('TEXTAREA')
  })

  it('a component.name override always owns its own label, regardless of fieldChrome', () => {
    const Custom: EditWidget = ({ id }) => <div data-testid="custom-widget" id={id} />
    registerEditWidget('CustomWidget', Custom)
    const c = compileFieldSet({
      code: 'form/override',
      version: 1,
      fields: [{ ...col({ col: 'title', name: 'Title', type: 'SmallText' }), component: { name: 'CustomWidget' } }],
    } satisfies FieldSetInput)
    const { control } = renderHookControl()
    render(<SchemaFormField compiled={c} col="title" control={control} />)
    expect(screen.getByTestId('custom-widget')).toBeInTheDocument()
    expect(screen.queryByText('Title')).not.toBeInTheDocument()
  })
})

describe('SchemaForm — zero-shift reserved error slots (fix3)', () => {
  const compiled = () =>
    compileFieldSet(
      {
        code: 'form/zeroshift',
        version: 1,
        fields: [
          col({ col: 'title', name: 'Full name', type: 'SmallText', required: true }),
          col({ col: 'notes', name: 'Notes', type: 'SmallText' }),
        ],
      } satisfies FieldSetInput,
    )

  // jsdom has no layout engine, so this is the boundingBox-style assertion's
  // stand-in: every field ALWAYS renders a `FieldErrorSlot` that reserves the
  // 18px error row (`min-h-[1.125rem]`) plus the 12px field→error rhythm
  // (`mt-2` + the wrapper's 4px gap), in the error and no-error states alike —
  // so mounting/unmounting the `FieldError` cannot move content below the
  // field (the round-3 interaction P1: 30px shift on appear AND clear).
  const slotSignature = () =>
    Array.from(document.querySelectorAll('[data-slot="field-error-slot"]')).map(
      (slot) => `${slot.parentElement?.childElementCount}|${slot.className}`,
    )

  it('reserves one error row per field, stable across error appear and clear', async () => {
    render(<SchemaForm compiled={compiled()} onSubmit={vi.fn()} mode="onSubmit" />)

    const slots = document.querySelectorAll('[data-slot="field-error-slot"]')
    expect(slots).toHaveLength(2) // one reserved row per field, error or not
    for (const slot of Array.from(slots)) {
      expect(slot.className).toContain('min-h-[1.125rem]') // 18px row reserved
      expect(slot.className).toContain('mt-2') // gap reserved too
      expect(slot.childElementCount).toBe(0) // empty until an error exists
    }
    const before = slotSignature()

    // Error APPEARS: the row mounts INSIDE the reserved slot; the field
    // wrapper's child structure (and hence everything below) is unchanged.
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const alert = await screen.findByRole('alert')
    expect(alert.closest('[data-slot="field-error-slot"]')).not.toBeNull()
    expect(slotSignature()).toEqual(before)

    // Error CLEARS: same invariant on the way out.
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Avery' } })
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(slotSignature()).toEqual(before)
    expect(document.querySelectorAll('[data-slot="field-error-slot"]')).toHaveLength(2)
  })

  it('reserves the row in repeating-item controls too', () => {
    const c = compileFieldSet(
      { code: 'form/rep-slot', version: 1, fields: [col({ col: 'aliases', name: 'Alias', type: 'SmallText' })] },
      { repeating: ['aliases'] },
    )
    render(<SchemaForm compiled={c} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Add Alias/ }))
    // repeating fieldset renders no scalar FieldControl slot of its own; the
    // added item's ItemControl must carry the reserved slot.
    expect(document.querySelectorAll('[data-slot="field-error-slot"]').length).toBeGreaterThanOrEqual(1)
  })
})

function renderHookControl() {
  let captured!: ReturnType<typeof useForm<Record<string, unknown>>>
  function Capture() {
    captured = useForm<Record<string, unknown>>({ defaultValues: { title: '' } })
    return null
  }
  render(<Capture />)
  return captured
}
