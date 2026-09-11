import { useState } from 'react'
import { RecordSectionsGrid, type RecordSectionsGridGroup } from '@fams/v5-templates'
import type { EntityRecord } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * RecordSectionsGridDemo — the profile "Details" tab: a two-column grid of
 * titled key/value cards with an Edit affordance that flips the pane into a
 * form. Driven entirely by the `groups` config.
 */

const record: EntityRecord = {
  id: 'tk-2201',
  title: 'Mitsubishi X6734',
  tankerStatus: 'Active',
  plate: 'Plate# 512834',
  brand: 'Japanese Mitsubishi',
  model: '2024',
  colour: 'Blue',
  fuelType: 'Diesel',
  manufacturedOn: '18 October, 2024',
  registeredOn: '20 November, 2024',
  admittedOn: '25 December, 2024',

  length: '321 cm',
  width: '132 cm',
  height: '65 cm',
  interiorVolume: null,
  groundVolume: null,
  cargo: 'Not allowed',
  cargoVolume: '232',

  curbWeight: '2,461 kg',
  grossWeight: '6,541 kg',

  towerCapacity: null,
  maxPayload: '2,073 kg',
  topSpeed: '200 km/h',
}

const groups: RecordSectionsGridGroup[] = [
  {
    title: 'Tanker Details',
    column: 'start',
    fields: [
      { field: 'title', label: 'Title' },
      {
        field: 'tankerStatus',
        label: 'Tanker Status',
        render: 'statusChip',
        toneMap: { Active: 'success', Inactive: 'neutral', Grounded: 'danger' },
      },
      { field: 'plate', label: 'Plate' },
      { field: 'brand', label: 'Brand' },
      { field: 'model', label: 'Model' },
      {
        field: 'colour',
        label: 'Tanker Color',
        render: 'colorSwatch',
        colorMap: { Blue: '#2e90fa', White: '#ffffff', Silver: '#d0d5dd' },
      },
      { field: 'fuelType', label: 'Fuel Type' },
      { field: 'manufacturedOn', label: 'Manufacturing Year' },
      { field: 'registeredOn', label: 'Registration Date' },
      { field: 'admittedOn', label: 'Admission Date', readOnly: true },
    ],
  },
  {
    title: 'Performance',
    column: 'start',
    fields: [
      { field: 'towerCapacity', label: 'Tower Capacity' },
      { field: 'maxPayload', label: 'Max Payload' },
      { field: 'topSpeed', label: 'Top Speed' },
    ],
  },
  {
    title: 'Dimension',
    column: 'end',
    fields: [
      { field: 'length', label: 'Length' },
      { field: 'width', label: 'Width' },
      { field: 'height', label: 'Height' },
      { field: 'interiorVolume', label: 'Interior Volume' },
      { field: 'groundVolume', label: 'Ground Volume' },
      { field: 'cargo', label: 'Cargo' },
      { field: 'cargoVolume', label: 'Cargo Volume' },
    ],
  },
  {
    title: 'Weight',
    column: 'end',
    fields: [
      { field: 'curbWeight', label: 'Curb Weight' },
      { field: 'grossWeight', label: 'Gross Vehicle Weight' },
    ],
  },
]

export default function RecordSectionsGridDemo() {
  const [saved, setSaved] = useState<string | null>(null)

  return (
    <DocPage
      title="RecordSectionsGrid"
      badge="wip"
      summary="The profile Details tab: a responsive two-column grid of titled cards, each a list of key/value rows, driven by an explicit groups config. The Edit affordance flips the pane into a form built from each field’s own edit widget, with Save reporting only what changed."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Each group names its <Code>title</Code>, its <Code>column</Code> and its <Code>fields</Code>. Row
          values use a closed set of renderers: plain text, a <Code>statusChip</Code>, a{' '}
          <Code>colorSwatch</Code> (name + dot), and an em dash whenever the value is empty. Press{' '}
          <Code>Edit</Code> to swap the rows into their field-type edit widgets — the pane keeps its shape
          rather than becoming an unrelated form.
        </Prose>
        <div className="rounded-md border border-border bg-muted p-4">
          <RecordSectionsGrid
            groups={groups}
            record={record}
            editable
            onSave={(values) => setSaved(JSON.stringify(values))}
          />
        </div>
        <Prose>
          Last save payload: <Code>{saved ?? 'none yet — press Edit, change a field, then Save'}</Code>
        </Prose>
      </DocSection>

      <DocSection id="vs-sections" title="Versus ProfileSectionsPanel">
        <Prose>
          <Code>ProfileSectionsPanel</Code> renders whatever <Code>deriveDetail</Code> produced from the
          blueprint&rsquo;s own section placements — the right tool when the blueprint already says it. This
          component takes an EXPLICIT <Code>groups</Code> config instead, because it also needs to say which
          of the two COLUMNS each card sits in (Details / Performance start, Dimension / Weight end) — a
          layout a flat derived section list cannot express. Neither replaces the other.
        </Prose>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'groups', type: 'RecordSectionsGridGroup[]', description: '{ title, column?, fields } per card. column defaults to "start".' },
            { prop: 'groups[].fields[]', type: 'RecordSectionsGridField', description: '{ field, label?, render?, toneMap?, colorMap?, readOnly? }. `field` is a record key.' },
            { prop: 'render', type: "'text' | 'statusChip' | 'colorSwatch'", description: 'Value presentation. Default "text". Empty values are always an em dash.' },
            { prop: 'config', type: 'EntityConfig', description: 'Supplies each field’s descriptor (label + type) so edit mode can pick the right widget.' },
            { prop: 'record', type: 'EntityRecord', description: 'The record every row reads (and, in edit mode, drafts against).' },
            { prop: 'editable', type: 'boolean', description: 'Shows the top-end Edit link. Needs onSave too — without a handler the control stays hidden rather than opening a form that discards its input.' },
            { prop: 'onSave', type: '(values) => void', description: 'Receives ONLY the changed keys. Persisting and re-fetching are the caller’s (Rule 8).' },
            { prop: 'fieldContext', type: 'FieldOptionContext', description: 'Injected option data for reference/select editors.' },
            { prop: 'readOnly (per field)', type: 'boolean', description: 'Keeps a derived/computed row read-only while the rest of the pane edits.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Balance the two columns by row count, not by card count — the frame’s start column carries two cards to the end column’s two.',
            'Mark computed values readOnly rather than omitting them: they still belong on the read grid.',
            'Use statusChip for a value that has a state, and colorSwatch only where the colour IS the value.',
          ]}
          donts={[
            'Don’t save the whole draft back — onSave already narrows to changed keys so a concurrent edit elsewhere is not clobbered.',
            'Don’t add a fourth renderer for a one-off presentation; extend the record’s data or use a section component instead.',
            'Don’t pass editable without onSave and expect an edit flow.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every edit widget is bound to a real <Label htmlFor>, so each field is reachable and nameable in a form-controls list.',
            'Status is stated as a WORD in the chip, never by tint alone; the colour swatch is decorative (aria-hidden) beside the colour’s name.',
            'Edit / Save / Cancel are ordinary buttons in the tab order — the pane never traps focus.',
            'Cards are semantic <section>s with an <h3> title (DetailSection), so the grid is navigable by heading.',
            'RTL-safe: logical properties only; the two columns swap under dir="rtl" with no extra work.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
