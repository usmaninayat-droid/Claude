import { useState } from 'react'
import { InlineEditField, PickerList } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const INSPECTORS = [
  { value: 'fahad', label: 'Fahad Al-Marri' },
  { value: 'layla', label: 'Layla Hassan' },
  { value: 'karim', label: 'Karim Aziz' },
  { value: 'noora', label: 'Noora Al-Kuwari' },
]

/**
 * InlineEditFieldDemo — the edit-in-place pair: `InlineEditField` (hover-
 * revealed pencil + anchored popover) and `PickerList` (the flat option list
 * that usually fills it).
 */
export default function InlineEditFieldDemo() {
  const [inspector, setInspector] = useState('fahad')
  const [priority, setPriority] = useState('high')
  const nameOf = (v: string) => INSPECTORS.find((i) => i.value === v)?.label ?? v

  return (
    <DocPage
      title="InlineEditField"
      badge="stable"
      summary="Edit a value in place: hover or keyboard-focus reveals a pencil at the end of the value, which opens an anchored popover. Pair it with PickerList for the common pick-a-replacement case."
    >
      <DocSection id="basic" title="Edit in place">
        <Prose>
          Hover the row (or Tab to it) to reveal the pencil. The popover body is yours — here it is
          a <Code>PickerList</Code>; <Code>close()</Code> is called once a value commits.
        </Prose>
        <div className="max-w-sm rounded-md border border-border bg-card p-section">
          <dl className="flex flex-col gap-3 text-body-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Assigned inspector</dt>
              <dd className="min-w-0">
                <InlineEditField label="assigned inspector" value={nameOf(inspector)}>
                  {(close) => (
                    <PickerList
                      options={INSPECTORS}
                      selected={inspector}
                      ariaLabel="Assigned inspector"
                      onPick={(v) => {
                        setInspector(v)
                        close()
                      }}
                    />
                  )}
                </InlineEditField>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Priority</dt>
              <dd className="min-w-0">
                <InlineEditField label="priority" value={priority}>
                  {(close) => (
                    <PickerList
                      options={[
                        { value: 'critical', label: 'critical' },
                        { value: 'high', label: 'high' },
                        { value: 'normal', label: 'normal' },
                        { value: 'low', label: 'low' },
                      ]}
                      selected={priority}
                      ariaLabel="Priority"
                      onPick={(v) => {
                        setPriority(v)
                        close()
                      }}
                    />
                  )}
                </InlineEditField>
              </dd>
            </div>
          </dl>
        </div>
      </DocSection>

      <DocSection id="picker" title="PickerList on its own">
        <Prose>
          <Code>PickerList</Code> is just the body — a flat, scrollable list capped at{' '}
          <Code>max-h-64</Code> so a long roster scrolls instead of pushing the popover off screen.
          It has no search box and no multi-select by design; reach for <Code>IconSelect</Code> or{' '}
          <Code>Combobox</Code> when you need those.
        </Prose>
        <div className="max-w-xs rounded-md border border-border bg-popover p-2">
          <PickerList options={INSPECTORS} onPick={() => {}} />
        </div>
      </DocSection>

      <DocSection id="picker-selected" title="PickerList with a current value">
        <Prose>
          Pass <Code>selected</Code> (matched against each option's <Code>value</Code>) to
          checkmark the current value — additive and default-off, so every existing{' '}
          <Code>PickerList</Code> usage above still renders unchanged unless it opts in. Once
          `selected` is passed, items take <Code>role="option"</Code> inside a named{' '}
          <Code>role="listbox"</Code>, so pair it with <Code>ariaLabel</Code>.
        </Prose>
        <div className="max-w-xs rounded-md border border-border bg-popover p-2">
          <PickerList options={INSPECTORS} selected="layla" ariaLabel="Inspectors" onPick={() => {}} />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'value', type: 'ReactNode', description: 'The rendered value, shown until edited. Truncates when long.' },
            { prop: 'label', type: 'string', description: 'Names the field for assistive tech — becomes "Edit {label}" on the pencil.' },
            { prop: 'children', type: '(close: () => void) => ReactNode', description: 'Popover body. Call close() once a value commits.' },
            { prop: 'PickerList · options', type: '{ value, label }[]', description: 'The pickable options.' },
            { prop: 'PickerList · onPick', type: '(value) => void', description: 'Fires with the chosen value.' },
            {
              prop: 'PickerList · selected',
              type: 'string | undefined',
              description:
                'Optional current value. The matching option gets a checkmark and aria-selected="true", and items take role="option" inside a role="listbox". Omit for the plain, unselected list.',
            },
            {
              prop: 'PickerList · ariaLabel',
              type: 'string | undefined',
              description:
                'Accessible name for the listbox — required (by ARIA) whenever selected is passed; ignored otherwise.',
            },
          ]}
        />
      </DocSection>

      <Guidelines
        dos={[
          'Give label the plain field name — the pencil reads it as "Edit assigned inspector".',
          'Call close() after committing so the popover does not linger over the new value.',
          'Keep the trigger inside the row it edits, so the pencil appears where the value is.',
        ]}
        donts={[
          'Do not use it for a value that needs validation or multiple fields — open a sheet instead.',
          'Do not hide the only path to an action behind hover; the pencil is also keyboard-reachable, keep it that way.',
          'Do not put a search box inside PickerList — use Combobox when the list needs filtering.',
        ]}
      />

      <A11yList
        items={[
          'The pencil is a real button with an aria-label; it is opacity-0, never display:none, so it stays in the tab order.',
          'focus-visible reveals the pencil exactly as hover does — the affordance is hidden, not absent.',
          'The popover traps and restores focus via the underlying Popover primitive.',
        ]}
      />
    </DocPage>
  )
}
