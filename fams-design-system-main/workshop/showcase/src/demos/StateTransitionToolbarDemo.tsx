import {
  StateTransitionToolbar,
  getForwardTransitions,
  type StateTransition,
  type TransitionStage,
} from '../../../../packages/ui-kit/src/composites/StateTransitionToolbar'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * StateTransitionToolbarDemo — current-stage badge + a row of transition
 * action buttons. Replaces the hand-rolled status-pill + approve/reject
 * q-btn pairs scattered across v5 (EspPlansPanel.vue's plan approval row,
 * StatusList.vue's inline-hex status pill).
 */

const PENDING_STAGE: TransitionStage = { id: 'pending', label: 'Pending', tone: 'warning' }
const ACTIVE_STAGE: TransitionStage = { id: 'active', label: 'Active', tone: 'success' }
const DRAFT_STAGE: TransitionStage = { id: 'draft', label: 'Draft', tone: 'neutral' }

const APPROVAL_TRANSITIONS: StateTransition[] = [
  { toStageId: 'approved', label: 'Approve', variant: 'primary' },
  { toStageId: 'rejected', label: 'Reject', variant: 'destructive' },
  { toStageId: 'on-hold', label: 'Put on hold', variant: 'outline' },
]

const RETIRE_TRANSITIONS: StateTransition[] = [{ toStageId: 'retired', label: 'Retire', variant: 'destructive' }]

/** Linear pipeline used by the forward-flow scenario below. */
const PIPELINE_STAGES: TransitionStage[] = [
  { id: 'draft', label: 'Draft', tone: 'neutral' },
  { id: 'submitted', label: 'Submitted', tone: 'info' },
  { id: 'reviewed', label: 'Reviewed', tone: 'warning' },
  { id: 'closed', label: 'Closed', tone: 'success' },
]
const PIPELINE_CURRENT_STAGE = PIPELINE_STAGES[1]
const PIPELINE_TRANSITIONS = getForwardTransitions(PIPELINE_STAGES, PIPELINE_CURRENT_STAGE.id)

const SCENARIOS = {
  Approval: { stage: PENDING_STAGE, transitions: APPROVAL_TRANSITIONS },
  Retire: { stage: ACTIVE_STAGE, transitions: RETIRE_TRANSITIONS },
  Terminal: { stage: DRAFT_STAGE, transitions: [] as StateTransition[] },
  Pipeline: { stage: PIPELINE_CURRENT_STAGE, transitions: PIPELINE_TRANSITIONS },
} as const

const SCENARIO_NAMES = Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]

type StateTransitionToolbarControls = {
  scenario: (typeof SCENARIO_NAMES)[number]
  disabled: boolean
  showCollapse: boolean
}

export default function StateTransitionToolbarDemo() {
  return (
    <DocPage
      title="StateTransitionToolbar"
      badge="stable"
      summary="Current-stage badge + a row of transition action buttons. Replaces the hand-rolled status-pill + approve/reject q-btn pairs scattered across v5 (EspPlansPanel.vue's plan approval row, StatusList.vue's inline-hex status pill) — the stage's tone and each transition's treatment come from closed enums, never raw color."
    >
      <DocSection id="playground" title="Playground">
        <Playground<StateTransitionToolbarControls>
          controls={[
            { name: 'scenario', type: 'select', default: 'Approval', options: SCENARIO_NAMES },
            { name: 'disabled', type: 'boolean', default: false },
            { name: 'showCollapse', type: 'boolean', default: false },
          ]}
        >
          {(v) => {
            const { stage, transitions } = SCENARIOS[v.scenario]
            return (
              <StateTransitionToolbar
                currentStage={stage}
                transitions={transitions}
                disabled={v.disabled}
                onTransition={(toStageId) => {
                  // eslint-disable-next-line no-console -- showcase-only demo affordance.
                  console.log('StateTransitionToolbar transition', toStageId)
                }}
                onCollapse={
                  v.showCollapse
                    ? () => {
                        // eslint-disable-next-line no-console -- showcase-only demo affordance.
                        console.log('StateTransitionToolbar collapse')
                      }
                    : undefined
                }
              />
            )
          }}
        </Playground>
      </DocSection>

      <DocSection id="scenarios" title="Scenarios">
        <Prose>
          <Code>tone</Code> drives the stage <Code>Badge</Code> variant; each transition's{' '}
          <Code>variant</Code> drives its Button treatment (outline/primary/destructive).
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Approval flow',
              caption: 'three transitions',
              node: <StateTransitionToolbar currentStage={PENDING_STAGE} transitions={APPROVAL_TRANSITIONS} />,
            },
            {
              label: 'Single destructive + collapse',
              caption: 'onCollapse renders a trailing chevron',
              node: <StateTransitionToolbar currentStage={ACTIVE_STAGE} transitions={RETIRE_TRANSITIONS} onCollapse={() => {}} />,
            },
            {
              label: 'No transitions',
              caption: 'terminal state — badge alone',
              node: <StateTransitionToolbar currentStage={DRAFT_STAGE} transitions={[]} />,
            },
            {
              label: 'Forward-flow (derived)',
              caption: 'getForwardTransitions(stages, currentId)',
              node: <StateTransitionToolbar currentStage={PIPELINE_CURRENT_STAGE} transitions={PIPELINE_TRANSITIONS} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Default',
              node: <StateTransitionToolbar currentStage={PENDING_STAGE} transitions={APPROVAL_TRANSITIONS} />,
            },
            {
              label: 'Disabled',
              caption: 'transition in flight',
              node: <StateTransitionToolbar currentStage={PENDING_STAGE} transitions={APPROVAL_TRANSITIONS} disabled />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'currentStage',
              type: 'TransitionStage',
              required: true,
              description: 'The stage the record is in right now — rendered as a tone-mapped Badge.',
            },
            {
              prop: 'transitions',
              type: 'StateTransition[]',
              required: true,
              description: 'Actions available from currentStage. An empty array renders the badge alone.',
            },
            {
              prop: 'onTransition',
              type: '(toStageId: string) => void',
              description: 'Called with the target stage id when a transition button is activated.',
            },
            {
              prop: 'onCollapse',
              type: '() => void',
              description: 'Shows a trailing collapse chevron when provided (e.g. hide a right-rail timeline).',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Disables every transition button (e.g. while a transition is in flight) without hiding them.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any native div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Map tone from a closed enum on the stage config, never an inline hex.',
            'Use variant="destructive" only for the irreversible transition (reject, retire).',
            'Pair a requiresReason-style transition with a confirm dialog before calling onTransition.',
            'Render the toolbar alone (empty transitions) for terminal stages instead of hiding it.',
          ]}
          donts={[
            "Don't fetch or mutate state inside the component — onTransition fires synchronously, the caller owns the async submit.",
            "Don't add more than 3 transition buttons; beyond that, use StatusTransitionDropdown instead.",
            "Don't disable the toolbar without showing why nearby (e.g. a saving indicator).",
            "Don't reuse onCollapse for anything other than a visual affordance — it carries no meaning to this component.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Transition actions render as native <button> elements — full keyboard support for free.',
            'The stage Badge carries a text label, not color alone, so status is conveyed to assistive tech.',
            'disabled uses the native disabled attribute — buttons stay visible but are removed from the tab order\'s interactive state.',
            'The collapse chevron mirrors under RTL via rtl:-scale-x-100.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          For a strictly linear (non-branching) workflow, skip hand-building <Code>transitions</Code>{' '}
          — <Code>getForwardTransitions(stages, currentStageId)</Code> returns every later stage as a
          plain-outline action, in order. Branching or conditional flows should build their own list.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
