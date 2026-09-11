import { useState } from 'react'
import { Stepper, type StepperStep } from '../../../../packages/ui-kit/src/composites/Stepper'
import { FileText, Zap, Truck, Bell } from '../../../../packages/ui-kit/src/icons'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * StepperDemo — numbered progress trail for multi-step flows (contract
 * create, inspection wizards). Replaces ~3 hand-rolled wizard headers in v5
 * (WizardLayout.vue, ContractCreateStepper.vue, reportIncidentStepper.vue).
 */

const CONTRACT_STEPS: StepperStep[] = [
  { label: 'Basic info', description: 'Contract name, ESP, lot' },
  { label: 'Service details', description: 'Frequency and coverage' },
  { label: 'Attachments', description: 'Supporting documents' },
  { label: 'Review', description: 'Confirm and submit' },
]

// Icon-rail example (create-rule-wizard's PM wizard) — completed's checkmark
// is preserved regardless; icon only ever replaces the index digit on
// current/upcoming steps.
const ICON_STEPS: StepperStep[] = [
  { label: 'Basic Config', icon: <FileText aria-hidden="true" /> },
  { label: 'Trigger Rule', icon: <Zap aria-hidden="true" /> },
  { label: 'Add Assets', icon: <Truck aria-hidden="true" /> },
  { label: 'Reminders', icon: <Bell aria-hidden="true" /> },
]

const STEP_INDEX_OPTIONS = ['0', '1', '2', '3'] as const
const ORIENTATIONS = ['horizontal', 'vertical'] as const
const VARIANTS = ['numbered', 'tabs'] as const

type StepperControls = {
  current: (typeof STEP_INDEX_OPTIONS)[number]
  orientation: (typeof ORIENTATIONS)[number]
  variant: (typeof VARIANTS)[number]
}

/** `tabs` is a header, so its own demo owns the click-to-go-back state (Rule 8). */
function TabsStepperExample() {
  const [current, setCurrent] = useState(2)
  return (
    <div className="w-full">
      <Stepper variant="tabs" steps={CONTRACT_STEPS} current={current} onStepSelect={setCurrent} />
    </div>
  )
}

export default function StepperDemo() {
  return (
    <DocPage
      title="Stepper"
      badge="stable"
      summary="Numbered progress trail for multi-step flows (contract create, inspection wizards). A single current index derives every step's default/current/completed state — replaces ~3 hand-rolled wizard headers in v5 (WizardLayout.vue, ContractCreateStepper.vue, reportIncidentStepper.vue)."
    >
      <DocSection id="playground" title="Playground">
        <Playground<StepperControls>
          controls={[
            { name: 'current', type: 'select', default: '1', options: STEP_INDEX_OPTIONS },
            { name: 'orientation', type: 'select', default: 'horizontal', options: ORIENTATIONS },
            { name: 'variant', type: 'select', default: 'numbered', options: VARIANTS },
          ]}
        >
          {(v) => (
            <div className={v.orientation === 'horizontal' || v.variant === 'tabs' ? 'w-full max-w-2xl' : 'w-full max-w-xs'}>
              <Stepper
                variant={v.variant}
                orientation={v.orientation}
                current={Number(v.current)}
                steps={CONTRACT_STEPS}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="orientation" title="Orientation">
        <Prose>
          Steps before <Code>current</Code> render a check, the current step is ring-emphasized, and
          later steps stay muted — the same state derivation in both layouts.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'Horizontal',
              caption: 'dialog / wizard headers',
              node: (
                <div className="w-full">
                  <Stepper orientation="horizontal" current={1} steps={CONTRACT_STEPS} />
                </div>
              ),
            },
            {
              label: 'Vertical',
              caption: 'side-panel flows',
              node: (
                <div className="w-full max-w-xs">
                  <Stepper orientation="vertical" current={1} steps={CONTRACT_STEPS} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="icons" title="Per-step icons">
        <Prose>
          <Code>StepperStep.icon</Code> replaces the index digit on <Code>current</Code>/upcoming
          steps (create-rule-wizard's PM wizard rail) — but never on <Code>completed</Code>, which
          always keeps its checkmark. The checkmark is the only per-state signal that isn't
          colour, so a custom icon replacing it would make step state colour-only (Phase 3 UX
          pass, B3) — not optional, enforced by the component regardless of what <Code>icon</Code>{' '}
          is passed for a completed step.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Completed keeps its checkmark',
              caption: 'step 1 has an icon too — it never shows',
              node: (
                <div className="w-full max-w-xs">
                  <Stepper orientation="vertical" current={2} steps={ICON_STEPS} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="variant" title="Variant">
        <Prose>
          <Code>numbered</Code> is the classic numbered-circle trail. <Code>tabs</Code> is the
          text-tab header (figma FAMS Settings <Code>366:1994</Code>): a row of labels with the
          active one in <Code>primary</Code> over its own short underline, sitting on a full-width
          bottom divider. <Code>tabs</Code> is horizontal-only — <Code>orientation</Code> is
          ignored for it. Pass <Code>onStepSelect</Code> to make already-visited labels clickable;
          the caller still owns <Code>current</Code>, so it decides which moves are allowed.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'numbered',
              caption: 'wizard progress trail',
              node: (
                <div className="w-full">
                  <Stepper current={1} steps={CONTRACT_STEPS} />
                </div>
              ),
            },
            {
              label: 'tabs',
              caption: 'settings / form header — click a visited tab to go back',
              node: <TabsStepperExample />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'steps',
              type: 'StepperStep[]',
              required: true,
              description:
                'Ordered steps: { label: ReactNode, description?: ReactNode, icon?: ReactNode }. icon replaces the index digit on current/upcoming steps only — completed always keeps its checkmark, never the custom icon (B3, non-negotiable: state would otherwise be colour-only).',
            },
            {
              prop: 'current',
              type: 'number',
              required: true,
              description: 'Zero-based index of the active step. Earlier steps render completed, this one current, later ones default.',
            },
            {
              prop: 'orientation',
              type: "'horizontal' | 'vertical'",
              default: "'horizontal'",
              description: 'Row layout for wizard/dialog headers vs. column layout with a connecting rail for side panels.',
            },
            {
              prop: 'variant',
              type: "'numbered' | 'tabs'",
              default: "'numbered'",
              description:
                'numbered is the numbered-circle progress trail; tabs is the text-tab header (active label in primary over a short underline on a full-width divider). tabs is horizontal-only — orientation is ignored for it.',
            },
            {
              prop: 'onStepSelect',
              type: '(index: number) => void',
              description:
                'Both variants. Every step always renders as a real, accessibly-named button (B3 — never silently inert); providing this makes completed steps (and the current step, as a caller-side no-op) selectable and calls this with the clicked index. Upcoming/unvalidated steps stay disabled + aria-disabled regardless. With no handler, every step is disabled — the rail is presentational only. The Stepper never mutates current — the caller decides which moves are allowed (e.g. back-navigation only).',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLElement>',
              description: 'className and any native <nav> attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Derive current from a single source of truth (the active step index) — never compute per-step booleans.',
            'Use horizontal for wizard/dialog headers, vertical for side-panel or long-form flows.',
            'Keep step labels to 1–3 words; put detail in description.',
            'Advance current only after the active step actually validates.',
            'Use variant="tabs" for a settings/form header where the steps read as sections; keep numbered for a true sequential wizard.',
            'With tabs + onStepSelect, allow BACK-navigation only — forward moves should still go through validation.',
          ]}
          donts={[
            "Don't let a step be clickable navigation unless the caller explicitly wires that via onStepSelect — Stepper itself is display-only.",
            "Don't mix orientations within the same flow.",
            "Don't use more than ~5–6 steps; beyond that, collapse into fewer stages or use StateTransitionToolbar instead.",
            "Don't hand-roll done/active icon logic — current already derives it.",
            "Don't expect a per-step icon to override the completed checkmark — it can't (B3).",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a <nav aria-label="Progress"> around an ordered list — assistive tech announces it as a progress landmark (both variants).',
            'Every step is a real <button> (both variants) whose accessible name carries position, label, and state — e.g. "Step 3 of 6, Trigger Rule, current" — not just its visible label.',
            'The current step\'s button carries aria-current="step".',
            'An upcoming/unvalidated step\'s button is disabled AND aria-disabled — exposed and named, never silently removed from the DOM.',
            'A completed step\'s button stays enabled so assistive tech and keyboard users can activate it to go back; the current step is enabled too (a caller-side no-op if reselected).',
            'The completed check icon and any per-step icon are aria-hidden; the button\'s constructed name is the accessible content, not the glyph.',
            'Connector order and label alignment mirror correctly under RTL via logical flex flow — no direction-specific overrides.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
