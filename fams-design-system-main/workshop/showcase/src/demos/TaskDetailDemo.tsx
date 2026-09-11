import { useState } from 'react'
import { Badge } from '@fams/ui-kit'
import { TaskDetail, type EntityRecord } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { dealsConfig, dealRecords, dealTransitions } from './v5-views-blueprint'

const tabRenderers = {
  PipelineTimeline: () => <p className="text-body-sm">Stage history appears here (phase 3).</p>,
  ActivityFeed: () => <p className="text-body-sm">Recent activity appears here (phase 3).</p>,
  LinkedItems: () => <p className="text-body-sm">Linked records appear here (phase 3).</p>,
  Attachments: () => <p className="text-body-sm">Files appear here (phase 3).</p>,
}

const CHECKLIST_ITEMS = [
  { id: 'discovery', label: 'Discovery call completed' },
  { id: 'proposal', label: 'Proposal sent' },
  { id: 'legal', label: 'Legal review' },
]

/**
 * TaskDetailDemo — the pipeline record surface: header (title / stage-transition
 * control / priority), blueprint-derived detail fields, and the right-panel
 * contract-slot tabs (Timeline / Activity / Linked / Files).
 */
export default function TaskDetailDemo() {
  const [record, setRecord] = useState<EntityRecord>(dealRecords.find((r) => r.id === 'D-104')!)
  const [checklistValue, setChecklistValue] = useState<Record<string, string>>({ discovery: 'checked' })
  const allowed = dealTransitions[record.status ?? ''] ?? []

  return (
    <DocPage
      title="TaskDetail"
      badge="wip"
      summary="The pipeline-module record surface — header (id/type chip, solid status pill + Change Status control, title), blueprint-derived detail fields grouped into collapsible sections plus an optional Additional Info block (description / checklist / attachments / images), and a right panel whose tabs are contract slots (placeholder until phase 3). Presentational."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          The stage control offers every stage but disables the ones the rule check forbids (
          <Code>allowedTransitions</Code>, wired here to the golden transitions). Detail fields come from{' '}
          <Code>deriveDetail</Code>; blueprint <Code>sections</Code> render as collapsible groups (open by
          default, figma-spec-detail.md §4); the right-panel tabs are the blueprint’s{' '}
          <Code>rightPanel.tabs</Code>.
        </Prose>
        <div className="h-[620px] overflow-hidden rounded-md border border-border">
          <TaskDetail
            config={dealsConfig}
            record={record}
            allowedTransitions={allowed}
            onTransition={(to) => setRecord((r) => ({ ...r, status: to }))}
            statusTones={{ won: 'success', lost: 'danger', proposal: 'warning', qualified: 'info' }}
            priority={<Badge variant="destructive" dot>{String(record.systemcol2)} priority</Badge>}
            recordType="Deal"
            additionalInfo={{
              description:
                'Enterprise rollout across three regional offices. Legal is reviewing the MSA redline; procurement expects a revised quote by end of week. Champion is bullish, economic buyer still needs a security review sign-off before signature.',
              checklist: {
                items: CHECKLIST_ITEMS,
                value: checklistValue,
                onToggle: (id, stateId) => setChecklistValue((v) => ({ ...v, [id]: stateId })),
              },
            }}
            tabRenderers={tabRenderers}
          />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config / record', type: 'EntityConfig / EntityRecord', description: 'Pipeline blueprint + the record being detailed.' },
            { prop: 'allowedTransitions', type: 'string[]', description: 'Stage keys the user may move to (from the rule check).' },
            { prop: 'onTransition', type: '(toStage, reason?) => void', description: 'Fires for a permitted stage move.' },
            { prop: 'statusTones', type: 'Record<statusKey, tone>', description: 'Per-stage chip tone in the header.' },
            { prop: 'priority', type: 'ReactNode', description: 'Priority / severity slot in the header.' },
            { prop: 'recordType', type: 'ReactNode', description: 'Type chip next to the id chip (figma-spec-detail.md §3.1); omit when the module has no type taxonomy.' },
            { prop: 'additionalInfo', type: 'TaskDetailAdditionalInfoProps', description: 'Trailing "Additional Info" section: description / checklist / attachments / images, each independently optional.' },
            { prop: 'tabRenderers', type: 'Record<string, fn>', description: 'Right-panel tab bodies keyed by blueprint component name.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Compute allowedTransitions from the rule evaluator and pass them in — the control gates itself.',
            'Treat the right-panel tabs as contract slots; fill them via tabRenderers (real data in phase 3).',
            'Pass additionalInfo sub-blocks only for the data the module actually has — each renders independently.',
          ]}
          donts={[
            'Don’t mutate the record on transition inside the template — commit onTransition and re-render (Rule 8).',
            'Don’t hardcode stage colors/tones — pass statusTones or let them default to neutral.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Stage control is the core StatusTransitionDropdown — forbidden targets are disabled with a reason.',
            'Detail fields use FieldGrid; sections use the core Accordion (full keyboard support); the right panel uses the core Tabs primitive (full keyboard + SR support).',
            'RTL-safe: logical properties (border-e, ps/pe) throughout.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
