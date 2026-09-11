import { useState } from 'react'
import { Button } from '@fams/ui-kit'
import { Flag, Layers } from '@fams/ui-kit/icons'
import { CreationSheet } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'
import { vehiclesConfig } from './v5-fleet-blueprint'

// Keyed by `CreationGroup.id` — the fleet blueprint's decision-#10 grouping
// (no `profile.sections`) always produces exactly `'basic'` + `'details'`.
const STEP_ICONS = {
  basic: <Flag aria-hidden="true" />,
  details: <Layers aria-hidden="true" />,
}

/**
 * CreationSheetDemo — the blueprint-driven create surface. The fleet blueprint
 * has seven editable fields, so decision #10 grouping produces a Basic Info +
 * Details wizard (a ≤5-field entity would render a single FormSheet instead).
 */
export default function CreationSheetDemo() {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null)
  const [tabsOpen, setTabsOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [blueprintIconsOpen, setBlueprintIconsOpen] = useState(false)

  return (
    <DocPage
      title="CreationSheet"
      badge="wip"
      summary="The v5 create surface: fields compiled from a blueprint, grouped by decision #10 (first five → Basic Info, the rest → Details). One group renders a FormSheet; more than one becomes a Stepper wizard with per-step Zod validation. Emits a mapped record — no persistence."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Open the sheet: the seven-field fleet blueprint splits into a <Code>Basic Info</Code> step (first
          five fields) and a <Code>Details</Code> step. <Code>Next</Code> is gated by the compiled Zod schema
          — leave the required <Code>Vehicle</Code> name empty and it won’t advance. Submitting emits the
          mapped record below; the sheet never persists or closes itself.
        </Prose>
        <Button onClick={() => setOpen(true)} className="self-start">
          Create vehicle
        </Button>
        <CreationSheet
          open={open}
          onOpenChange={setOpen}
          config={vehiclesConfig}
          onSubmit={(record) => {
            setSubmitted(record)
            setOpen(false)
          }}
        />
        {submitted ? (
          <DevNote title="onSubmit(record)">
            <pre className="overflow-auto font-mono text-caption">{JSON.stringify(submitted, null, 2)}</pre>
          </DevNote>
        ) : null}
      </DocSection>

      <DocSection id="step-nav-variant" title="Step-nav variant + per-step icons">
        <Prose>
          <Code>stepperVariant</Code> passes straight through to the internal <Code>Stepper</Code>'s own{' '}
          <Code>variant</Code> — default <Code>'numbered'</Code> (unchanged), or <Code>'tabs'</Code> for a
          horizontal text-tab strip (Job Orders' create sheet). <Code>stepIcons</Code>, keyed by{' '}
          <Code>CreationGroup.id</Code> (here <Code>'basic'</Code>/<Code>'details'</Code> — decision #10's
          two implicit buckets), reaches the rail as each step's <Code>StepperStep.icon</Code>.
        </Prose>
        <Button onClick={() => setTabsOpen(true)} className="self-start">
          Create vehicle (tabs nav + icons)
        </Button>
        <CreationSheet
          open={tabsOpen}
          onOpenChange={setTabsOpen}
          config={vehiclesConfig}
          stepperVariant="tabs"
          stepIcons={STEP_ICONS}
          onSubmit={(record) => {
            setSubmitted(record)
            setTabsOpen(false)
          }}
        />
      </DocSection>

      <DocSection id="blueprint-icons" title="stepIcons from a blueprint (W3e)">
        <Prose>
          <Code>stepIcons</Code> also accepts a plain icon-NAME <Code>string</Code> per entry — resolved
          through the platform's existing closed icon vocabulary (
          <Code>resolveFieldIcon</Code>/<Code>FIELD_ICON_VOCABULARY</Code>, <Code>@fams/v5-composer</Code>),
          the same path <Code>IconTextView</Code> uses for a blueprint's <Code>props: {'{ icon: "..." }'}</Code>.
          This is what makes the icon-bearing rail reachable from blueprint JSON at all —{' '}
          <Code>ReactNode</Code> (the previous type) can't be authored there. An unresolvable name
          degrades to the plain numbered/check marker rather than throwing.
        </Prose>
        <Button onClick={() => setBlueprintIconsOpen(true)} className="self-start">
          Create vehicle (string-named icons)
        </Button>
        <CreationSheet
          open={blueprintIconsOpen}
          onOpenChange={setBlueprintIconsOpen}
          config={vehiclesConfig}
          stepIcons={{ basic: 'speedometer-04', details: 'phone' }}
          onSubmit={(record) => {
            setSubmitted(record)
            setBlueprintIconsOpen(false)
          }}
        />
      </DocSection>

      <DocSection id="summary-step" title="Summary step (W3a)">
        <Prose>
          <Code>showSummaryStep</Code> (default <Code>false</Code>, so every existing caller is unchanged)
          appends ONE trailing read-only recap step past the last real group — Figma's "FINAL STEP /
          Summary". Every recapped section's heading carries a working <Code>Edit</Code> affordance
          jumping straight back to that step, values retained. Each field's value renders through
          v5-composer's own <Code>getReadRenderer</Code> — the same read-side presentation used
          everywhere else in the platform — so an untouched field shows that renderer's own em-dash
          placeholder rather than a blank cell. The terminal button still reads <Code>submitLabel</Code>{' '}
          ("Create" here; an edit-mode caller passing <Code>submitLabel="Update"</Code> gets that label on
          the summary step too).
        </Prose>
        <Button onClick={() => setSummaryOpen(true)} className="self-start">
          Create vehicle (with Summary step)
        </Button>
        <CreationSheet
          open={summaryOpen}
          onOpenChange={setSummaryOpen}
          config={vehiclesConfig}
          showSummaryStep
          onSubmit={(record) => {
            setSubmitted(record)
            setSummaryOpen(false)
          }}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'open / onOpenChange', type: 'boolean / (open) => void', required: true, description: 'Controlled visibility.' },
            { prop: 'config', type: 'EntityConfig', required: true, description: 'The module config the fields + Zod schema are compiled from.' },
            { prop: 'onSubmit', type: '(record) => void', required: true, description: 'Fires with the store-contract record on final submit (Rule 8 — consumer persists + closes).' },
            { prop: 'defaultValues', type: 'Record<string, unknown>', description: 'Prefill values keyed by field col.' },
            { prop: 'context', type: 'FieldOptionContext', description: 'Injected option data for pickers/selects/assignees.' },
            { prop: 'title / submitLabel', type: 'string', description: 'Sheet title (default “Create <name>”) and final-step label (default “Create”).' },
            { prop: 'width', type: "'md' | 'lg' | 'xl'", default: "'md'", description: 'Panel width preset.' },
            {
              prop: 'layout',
              type: "'auto' | 'flat' | 'wizard'",
              default: "'auto'",
              description: '\'auto\' — one group is a plain sheet, 2+ becomes a Stepper wizard. \'flat\' — always one scrolling sheet. \'wizard\' — always the Stepper path, even for one group.',
            },
            {
              prop: 'fieldChrome',
              type: 'FieldChrome',
              default: "'default'",
              description: "Field-chrome variant passed to every field's edit widget (e.g. 'inset-label').",
            },
            {
              prop: 'stepperVariant',
              type: "'numbered' | 'tabs'",
              default: "'numbered'",
              description: "Wizard-path step-nav treatment, passed straight through to Stepper's own variant. 'numbered' is today's icon/numbered-circle rail (unchanged); 'tabs' is a horizontal text-tab strip (Job Orders' create sheet). Ignored by the flat/single-group paths.",
            },
            {
              prop: 'stepIcons',
              type: 'Record<string, ReactNode | string>',
              description: "Per-step icon for the wizard rail, keyed by CreationGroup.id ('basic', a section's own id, the trailing 'details' bucket, or 'summary'). A string entry resolves through @fams/v5-composer's resolveFieldIcon/FIELD_ICON_VOCABULARY (blueprint-authorable); a ReactNode passes through unchanged. A group with no entry, or an unresolvable name, falls back to Stepper's own numbered/check marker.",
            },
            {
              prop: 'showSummaryStep',
              type: 'boolean',
              default: 'false',
              description: 'Appends a read-only recap step past the last group (Figma\'s "FINAL STEP / Summary"), each section headed by a working Edit link back to that step. No-op for a single-group config (no wizard rail to append to).',
            },
            { prop: 'className', type: 'string', description: 'Passed to the sheet\'s outer content element.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Let grouping follow the blueprint — decision #10 handles the split; author profile sections to steer the Details grouping.',
            'Persist in onSubmit and set open={false} yourself — the sheet is state-agnostic.',
            'Inject reference/assignee options via context rather than fetching inside a widget.',
          ]}
          donts={[
            'Don’t pre-split fields into steps by hand — computeCreationGroups owns that (decision #10).',
            'Don’t rely on the sheet to validate on submit only — Next validates the current step via the compiled schema.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Fields render through the FieldRegistry edit widgets (labelled controls, per-field error text with role="alert").',
            'The wizard header uses the core Stepper (nav[aria-label="Progress"]); the sheet supplies focus trap + Esc.',
            'Single-group mode uses the core FormSheet chrome; RTL-safe logical properties throughout.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
