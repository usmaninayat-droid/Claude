import { useMemo, useState } from 'react'
import { ComposedModule } from '@fams/v5-composer'
import { createV5TemplateRenderers } from '@fams/v5-templates'
import {
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Guidelines, A11yList, Code } from '../../docs'
import { createGateApp, gateModules, gateRoles } from './data'

/**
 * GateDemo — the phase-2 review-gate showcase.
 *
 * ONE call — `<ComposedModule blueprint data renderers/>` — renders every
 * blueprint. Switching the Select swaps the blueprint + its data source and the
 * whole module surface re-renders with ZERO component-code difference: an entity
 * module becomes ListView + EntityProfile + CreationSheet; a pipeline module
 * becomes Kanban + TaskDetail — chosen purely from the blueprint's `type`.
 */
export default function GateDemo() {
  const [selectedId, setSelectedId] = useState<string>('companies')
  const [roleKey, setRoleKey] = useState<string>('manager')
  const [nonce, setNonce] = useState(0)

  const user = gateRoles[roleKey]
  // A fresh app is a full reset (in-memory store re-seeded); rebinding on role
  // change re-derives RBAC from the new user.
  const app = useMemo(() => createGateApp(user), [user, nonce])
  const renderers = useMemo(() => createV5TemplateRenderers({ userContext: user }), [user])

  const selectedModule = gateModules.find((m) => m.id === selectedId) ?? gateModules[0]
  const handle = app.runtime.module(selectedModule.id)

  // Remount the surface on any switch so the module's own view/detail-stack
  // state resets — the demo's equivalent of route-level remounting.
  const surfaceKey = `${selectedModule.id}:${roleKey}:${nonce}`

  return (
    <DocPage
      title="Composer gate demo"
      badge="wip"
      summary="The phase-2 review gate: one <ComposedModule/> call renders three different blueprints — a CRM companies entity, a CRM deals pipeline, and a fleet-vehicles entity — with zero component-code difference. Entity blueprints get ListView → EntityProfile → CreationSheet; the pipeline gets Kanban → TaskDetail with rule-guarded stage moves. All data is an in-memory store seeded from the golden blueprints."
    >
      <DocSection id="preview" title="Live composer">
        <Prose>
          Pick a blueprint. The exact same{' '}
          <Code>{'<ComposedModule blueprint={…} data={…} renderers={v5TemplateRenderers}/>'}</Code>{' '}
          call renders each one — entity vs pipeline is decided by the blueprint’s{' '}
          <Code>type</Code>, not by any code here. Switch the role to watch RBAC + rule-enforced
          stage moves change on the same board.
        </Prose>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-56 flex-col gap-1.5">
            <Label htmlFor="gate-blueprint">Blueprint</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger id="gate-blueprint" aria-label="Blueprint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {gateModules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-44 flex-col gap-1.5">
            <Label htmlFor="gate-role">Acting as</Label>
            <Select value={roleKey} onValueChange={setRoleKey}>
              <SelectTrigger id="gate-role" aria-label="Acting as">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Sales Manager</SelectItem>
                <SelectItem value="rep">Sales Rep</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="secondary" onClick={() => setNonce((n) => n + 1)}>
            Reset data
          </Button>
        </div>

        <div
          data-testid="gate-surface"
          className="h-160 overflow-hidden rounded-md border border-border"
        >
          <ComposedModule
            key={surfaceKey}
            blueprint={selectedModule}
            data={handle}
            renderers={renderers}
          />
        </div>
      </DocSection>

      <DocSection id="what-it-proves" title="What the switch proves">
        <Guidelines
          dos={[
            'Entity path: list → click a row → EntityProfile (30/70, blueprint tabs) → New → CreationSheet (first-five = Basic Info) → submit → the row appears.',
            'Pipeline path: Kanban lanes from the blueprint stages → move a card between allowed stages (a denied transition is blocked) → click a card → TaskDetail with the transition control.',
            'The fleet-vehicles blueprint is authored as JSON only — no bespoke React — and passes validateBlueprint.',
            'Switching the Select never changes component code: the same ComposedModule call re-renders the whole module from the selected blueprint.',
          ]}
          donts={[
            'Don’t look for a per-blueprint screen — there isn’t one; the module type + blueprint drive everything.',
            'Don’t expect persistence — the store is in-memory; Reset re-seeds it.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The blueprint + role pickers are labeled ui-kit Selects (Radix).',
            'Kanban moves have a keyboard "Move to stage" menu (pragmatic-dnd ships no keyboard DnD).',
            'The detail stack is a focus-trapped Sheet with a visually-hidden title; Esc minimizes.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
