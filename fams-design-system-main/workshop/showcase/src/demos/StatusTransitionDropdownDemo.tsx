import { useState } from 'react'
import {
  StatusTransitionDropdown,
  type TransitionStage,
} from '../../../../packages/ui-kit/src/composites/StatusTransitionDropdown'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * StatusTransitionDropdownDemo — the stage state-machine control: the
 * current stage renders as a Badge trigger opening a menu of reachable
 * stages. Retires the hand-rolled two-q-select-plus-textarea flow in
 * VisionAIStatusChangeDrawer.vue.
 */

const TICKET_STAGES: TransitionStage[] = [
  { id: 'new', label: 'New', tone: 'neutral' },
  { id: 'in-progress', label: 'In Progress', tone: 'info' },
  { id: 'blocked', label: 'Blocked', tone: 'warning', disabledReason: 'Awaiting spare parts' },
  { id: 'closed', label: 'Closed', tone: 'success', requiresReason: true },
  {
    id: 'cancelled',
    label: 'Cancelled',
    tone: 'danger',
    requiresReason: true,
    destructive: true,
  },
]

const CRM_STAGES: TransitionStage[] = [
  { id: 'lead', label: 'Lead', tone: 'neutral' },
  { id: 'qualified', label: 'Qualified', tone: 'info' },
  { id: 'negotiation', label: 'Negotiation', tone: 'warning' },
  { id: 'won', label: 'Won', tone: 'success' },
  {
    id: 'lost',
    label: 'Lost',
    tone: 'danger',
    requiresReason: true,
    destructive: true,
  },
]

function ForwardOnlyExample() {
  const [currentId, setCurrentId] = useState('in-progress')
  const [log, setLog] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-start gap-2">
      <StatusTransitionDropdown
        stages={TICKET_STAGES}
        currentId={currentId}
        onTransition={(stageId, reason) => {
          setCurrentId(stageId)
          setLog(reason ? `${stageId} — "${reason}"` : stageId)
        }}
      />
      {log ? <p className="text-caption text-muted-foreground">Last transition: {log}</p> : null}
    </div>
  )
}

function AllStagesExample() {
  const [currentId, setCurrentId] = useState('negotiation')
  return (
    <StatusTransitionDropdown
      stages={CRM_STAGES}
      currentId={currentId}
      forwardOnly={false}
      onTransition={(stageId) => setCurrentId(stageId)}
    />
  )
}

function GuardedOpenExample() {
  const [currentId, setCurrentId] = useState('in-progress')
  return (
    <StatusTransitionDropdown
      stages={TICKET_STAGES}
      currentId={currentId}
      defaultOpen
      onTransition={(stageId) => setCurrentId(stageId)}
    />
  )
}

function NoTargetsExample() {
  return <StatusTransitionDropdown stages={TICKET_STAGES} currentId="cancelled" onTransition={() => {}} />
}

function SizeExample({ size }: { size: 'sm' | 'md' }) {
  const [currentId, setCurrentId] = useState('new')
  return (
    <StatusTransitionDropdown
      stages={TICKET_STAGES}
      currentId={currentId}
      size={size}
      onTransition={(stageId) => setCurrentId(stageId)}
    />
  )
}

export default function StatusTransitionDropdownDemo() {
  return (
    <DocPage
      title="StatusTransitionDropdown"
      badge="stable"
      summary="The stage state-machine control: the current stage renders as a Badge trigger opening a menu of reachable stages. Forward-only by default; any target can be blocked (disabledReason) or guarded behind a mandatory reason Dialog (requiresReason). Retires the hand-rolled two-q-select-plus-textarea flow in VisionAIStatusChangeDrawer.vue."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click the trigger to open. <Code>Blocked</Code> is disabled with its reason shown inline;{' '}
          <Code>Closed</Code> and <Code>Cancelled</Code> require a reason and open a confirm{' '}
          <Code>Dialog</Code> before <Code>onTransition</Code> fires.
        </Prose>
        <ForwardOnlyExample />
      </DocSection>

      <DocSection id="scenarios" title="Scenarios">
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'forwardOnly=false',
              caption: 'any stage can move to any other stage',
              node: <AllStagesExample />,
            },
            {
              label: 'Menu open',
              caption: 'defaultOpen — disabled target + guarded transition',
              node: <GuardedOpenExample />,
            },
            {
              label: 'No reachable targets',
              caption: 'forward-only, already at the last stage — trigger disabled',
              node: <NoTargetsExample />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>Mirrors the Badge trigger's size.</Prose>
        <Gallery
          minColRem={10}
          items={[
            { label: 'sm', node: <SizeExample size="sm" /> },
            { label: 'md', node: <SizeExample size="md" /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'stages',
              type: 'TransitionStage[]',
              required: true,
              description:
                'Ordered workflow stages: { id, label, tone, requiresReason?, disabledReason?, destructive? }.',
            },
            {
              prop: 'currentId',
              type: 'string',
              required: true,
              description: 'id of the stage in stages the record is in right now.',
            },
            {
              prop: 'onTransition',
              type: '(stageId: string, reason?: string) => void',
              required: true,
              description: 'Fired once a target is resolved. reason is present only for a requiresReason target.',
            },
            {
              prop: 'forwardOnly',
              type: 'boolean',
              default: 'true',
              description: 'Only stages after the current one (in stages order) are offered.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Locks the control entirely — no menu, no chevron.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md'",
              default: "'md'",
              description: "Mirrors the Badge trigger's size.",
            },
            {
              prop: 'open / defaultOpen / onOpenChange',
              type: 'boolean / boolean / (open: boolean) => void',
              description: 'Controlled or uncontrolled open state of the stage menu.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Applied to the trigger button.',
            },
            {
              prop: 'renderTrigger',
              type: '(current: TransitionStage, canOpen: boolean) => ReactNode',
              description:
                "Overrides the trigger's visible content — the default is the current stage as a colored Badge + chevron. Used by TaskDetailHeader for a static \"Change Status\" label/icon trigger next to a separately-rendered status pill. aria-label and menu behavior are unaffected.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Set requiresReason on any transition that must be auditable (cancel, reject, lose).',
            'Set disabledReason instead of hiding a blocked stage — the explanation stays visible.',
            'Keep forwardOnly=true for linear pipelines; only opt out for a true any-to-any workflow.',
            'Use tone from the closed enum so the trigger Badge and menu dot stay in sync with StateTransitionToolbar.',
          ]}
          donts={[
            "Don't gate every transition behind a reason — reserve requiresReason for the ones that need an audit trail.",
            "Don't use this for more than ~6 stages; a long forward-only chain reads better as a Stepper.",
            "Don't bypass the guard Dialog by calling onTransition directly from outside the component.",
            "Don't rely on color alone for tone — each stage keeps its text label in the trigger and the menu.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The trigger is a real <button> with an aria-label announcing the current stage and whether it can open.',
            'Radix DropdownMenu manages roving focus and typeahead inside the stage menu.',
            'A blocked target is marked disabled in the menu and its reason renders inline, not just on hover.',
            'The guard Dialog traps focus on the reason field and disables Confirm until a reason is typed.',
            'Chevron, dot, and the guard dialog\'s logical layout all mirror correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
