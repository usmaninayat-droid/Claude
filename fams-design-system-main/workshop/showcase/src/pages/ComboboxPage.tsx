import { useMemo, useState } from 'react'
import { Combobox, type ComboOption } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

const VEHICLES: ComboOption[] = [
  { value: 'v1', label: 'Truck 01 — Lot 1' },
  { value: 'v2', label: 'Truck 02 — Lot 1' },
  { value: 'v3', label: 'Truck 07 — Lot 2' },
  { value: 'v4', label: 'Bin Lorry 12 — Lot 2' },
  { value: 'v5', label: "Water Tanker 03 — Tajmee'e" },
]

export function ComboboxPage() {
  const [single, setSingle] = useState<string | null>(null)
  const [eventValue, setEventValue] = useState<string | null>(null)
  const [multi, setMulti] = useState<string[]>(['v1'])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const asyncOptions = useMemo(
    () => VEHICLES.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  return (
    <DocPage
      title="Combobox"
      badge="stable"
      summary="The one searchable dropdown in the platform. Search is built in — there is nothing else to reach for. Retires ~20 forked entity-pickers in the v5 codebase (EntityLinkingDrawer, VehicleSelector, LotSectorSelector, …)."
    >
      {/* 1 — Preview */}
      <DocSection id="preview" title="Preview">
        <Demo title="Default" bare className="rounded-md border border-border bg-card p-8">
          <div className="w-72">
            <Combobox
              options={VEHICLES}
              value={single}
              onChange={(v) => setSingle(v as string | null)}
              placeholder="Select a vehicle…"
            />
          </div>
        </Demo>
      </DocSection>

      {/* 2 — Usage */}
      <DocSection id="usage" title="Usage">
        <Prose>
          <Code>options</Code> is always supplied by the caller — a static array, or the current
          page from an async hook. The component filters what it was <em>given</em>; it never
          fetches. See <Code>useEntityPicker</Code> in Developer notes for the async contract.
        </Prose>
        <Demo
          title="Static, single-select"
          code={`import { Combobox, type ComboOption } from '@fams/ui-kit'

const VEHICLES: ComboOption[] = [
  { value: 'v1', label: 'Truck 01 — Lot 1' },
  { value: 'v2', label: 'Truck 02 — Lot 1' },
]

<Combobox options={VEHICLES} value={value} onChange={setValue} placeholder="Select a vehicle…" />`}
        >
          <div className="w-72">
            <Combobox
              options={VEHICLES}
              value={single}
              onChange={(v) => setSingle(v as string | null)}
              placeholder="Select a vehicle…"
            />
          </div>
        </Demo>
      </DocSection>

      {/* 3 — Variants & states */}
      <DocSection id="variants" title="Variants & states">
        <Demo
          title="Multiple — chips + max-reached"
          hint="maxSelected disables unpicked options once reached"
          code={`<Combobox options={VEHICLES} value={value} onChange={setValue} multiple maxSelected={3} />`}
        >
          <div className="w-96">
            <Combobox
              options={VEHICLES}
              value={multi}
              onChange={(v) => setMulti((v as string[]) ?? [])}
              multiple
              maxSelected={3}
              placeholder="Select up to 3 vehicles…"
            />
          </div>
        </Demo>

        <Demo
          title="Async — caller owns filtering"
          hint="onSearchChange present ⇒ filterLocally=false; loading is set by the caller's hook"
          code={`const picker = useEntityPicker({
  queryKey: ['vehicles', lotId],
  fetcher: (q, page) => api.post('/vehicle/list', { search: q, page, lot: lotId }),
  mapItem: (v) => ({ value: v.id, label: v.plate_no }),
  minChars: 2,
})

<Combobox {...picker} filterLocally={false} value={value} onChange={setValue} />`}
        >
          <div className="w-72">
            <Combobox
              options={asyncOptions}
              value={single}
              onChange={(v) => setSingle(v as string | null)}
              query={query}
              onSearchChange={(q) => {
                setLoading(true)
                setQuery(q)
                window.setTimeout(() => setLoading(false), 200)
              }}
              filterLocally={false}
              minChars={2}
              loading={loading}
              placeholder="Type at least 2 characters…"
            />
          </div>
        </Demo>

        <Demo
          title="Error and empty"
          code={`<Combobox options={[]} value={null} onChange={setValue} hasError errorText="Couldn't load vehicles." />
<Combobox options={[]} value={null} onChange={setValue} emptyText="No vehicles in this lot" />`}
          className="flex-col items-stretch gap-4"
        >
          <div className="w-72">
            <Combobox
              options={[]}
              value={null}
              onChange={() => {}}
              hasError
              errorText="Couldn't load vehicles — check your connection."
            />
          </div>
          <div className="w-72">
            <Combobox options={[]} value={null} onChange={() => {}} emptyText="No vehicles in this lot" />
          </div>
        </Demo>
      </DocSection>

      {/* 4 — Props / API */}
      <DocSection id="searchable-field" title="Searchable field (float label)">
        <Prose>
          The FAMS-portal searchable dropdown: <Code>label</Code> switches the trigger to the float-label
          field anatomy; typing directly on the closed field opens the list seeded with the typed
          character; <Code>clearable</Code> adds the clear (X) affordance in single mode.
        </Prose>
        <Demo title="Searchable field" hint="Type on the closed field to search; X clears.">
          <div className="w-full max-w-sm" data-testid="searchable-field-demo">
            <Combobox
              options={VEHICLES}
              value={eventValue}
              onChange={(v) => setEventValue(v as string | null)}
              label="Select Events"
              required
              clearable
              hint="This is a hint text to help user."
              placeholder="Search events…"
              ariaLabel="Select Events"
            />
          </div>
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'options',
              type: 'ComboOption[]',
              required: true,
              description: 'Always caller-supplied — static list, or the current page from an async hook.',
            },
            {
              prop: 'value',
              type: 'string | string[] | null',
              required: true,
              description: 'Controlled selection.',
            },
            {
              prop: 'onChange',
              type: '(value: string | string[] | null) => void',
              required: true,
              description: 'Fires on every selection change.',
            },
            {
              prop: 'multiple',
              type: 'boolean',
              default: 'false',
              description: 'Chips + checkmarks instead of a single value.',
            },
            {
              prop: 'onSearchChange',
              type: '(query: string) => void',
              description: 'Presence means the CALLER owns filtering (async or custom). Pair with filterLocally={false}.',
            },
            {
              prop: 'filterLocally',
              type: 'boolean',
              default: 'true',
              description: 'Filter options against the query in the component. Set false when onSearchChange refetches.',
            },
            {
              prop: 'minChars',
              type: 'number',
              default: '0',
              description: 'Gate results until this many characters are typed.',
            },
            {
              prop: 'loading / hasError / errorText',
              type: 'boolean / boolean / ReactNode',
              description: 'Async status, set by the caller’s hook — never fetched by this component.',
            },
            {
              prop: 'maxSelected',
              type: 'number',
              description: 'Disables unpicked options once this many are selected (multiple mode).',
            },
            {
              prop: 'renderOption',
              type: '(option: ComboOption) => ReactNode',
              description: 'Custom row content (e.g. avatar + plate + status) — falls back to option.label.',
            },
            {
              prop: 'triggerProps',
              type: 'HTMLAttributes<HTMLDivElement> & Record<string, unknown>',
              description:
                'Attributes merged onto the trigger — className (merged, not replaced) plus any data-* a host surface identifies its controls by. The escape hatch that lets a searchable single-select take the shape of a host control (a filter pill, a widget-header select) without forking this component.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Trigger height, matching Input/Select.',
            },
          ]}
        />
      </DocSection>

      {/* 5 — Guidelines */}
      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use Combobox for every searchable selection — never a plain Select with a long option list.',
            'Set minChars for large/expensive result sets to avoid firing a search on every keystroke.',
            'Use renderOption when a row needs more than a label (avatar, status, secondary text).',
            'Keep the fetch, debounce, and cache inside an app-layer hook (useEntityPicker) — never in feature code.',
          ]}
          donts={[
            "Don't fork a new picker component per entity type — change the fetcher and mapItem, not the presenter.",
            "Don't fetch inside a Combobox usage's parent render — that recreates options on every keystroke.",
            "Don't add a boolean flag per use case (isVehiclePicker); use renderOption and the hook instead.",
          ]}
        />
      </DocSection>

      {/* 6 — Accessibility */}
      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on cmdk + Radix Popover — full listbox roles, arrow-key navigation, and type-ahead.',
            'Every state is reachable by keyboard: open, search, select, remove a chip (Backspace on an empty query).',
            'Loading and error states are announced via visible text, not color alone.',
            'RTL-safe — chips, remove buttons, and the chevron use logical spacing only.',
          ]}
        />
      </DocSection>

      {/* 7 — Developer notes */}
      <DocSection id="notes" title="Developer notes">
        <DevNote>
          State-agnostic per Rule 8: <Code>Combobox</Code> filters <Code>options</Code> it was{' '}
          <em>given</em>; it never fetches. The async contract is a small app-layer hook —{' '}
          <Code>useEntityPicker</Code> — that owns debounce, cancellation, cache, and pagination,
          and feeds <Code>options</Code> / <Code>loading</Code> / <Code>onSearchChange</Code>{' '}
          straight into this component. One presenter + one hook + N fetchers replaces every
          forked entity-picker. Full spec:{' '}
          <Code>vault/01-projects/tadweer-iwmp/notes/2026-07-02-design-system-inventory.md</Code> §7.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
