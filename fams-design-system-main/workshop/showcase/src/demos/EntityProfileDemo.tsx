import { useState } from 'react'
import { Button, Switch, Label } from '@fams/ui-kit'
import {
  EntityProfile,
  ProfileStack,
  useDetailStack,
  type EntityProfileTab,
  type ProfileTabRenderer,
  type UserContext,
} from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { vehiclesConfig, vehicleRecords } from './v5-fleet-blueprint'

/**
 * EntityProfileDemo — the blueprint-driven 30/70 entity profile, plus its
 * multi-profile stacking surface. All rendering is derived from the inlined
 * fleet blueprint (identity from `deriveDetail`, tab set from the profile's
 * rightPanel), so this demo owns no per-field React.
 */

const tabRenderers: Record<string, ProfileTabRenderer> = {
  OverviewPanel: ({ record }) => (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-body-sm">
      <div>
        <dt className="text-muted-foreground">Odometer</dt>
        <dd className="font-medium">{String(record?.systemcol3 ?? '—')} km</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Driver</dt>
        <dd className="font-medium">{String(record?.systemcol4 ?? '—')}</dd>
      </div>
    </dl>
  ),
  TripsPanel: () => <p className="text-body-sm">12 trips completed today.</p>,
  MaintenancePanel: () => <p className="text-body-sm">Next service due in 1,800 km.</p>,
}

const admin: UserContext = { id: 'u-admin', roles: ['admin'], privileges: ['fleet.audit'] }
const viewer: UserContext = { id: 'u-view', roles: ['viewer'], privileges: [] }

const auditTab: EntityProfileTab = {
  id: 'audit',
  label: 'Audit log',
  requiredPrivileges: ['fleet.audit'],
  content: <p className="text-body-sm">Full change history (visible only with the fleet.audit privilege).</p>,
}

export default function EntityProfileDemo() {
  const [asAdmin, setAsAdmin] = useState(true)
  const stack = useDetailStack<{ id: string; title: string }>()
  const [stackOpen, setStackOpen] = useState(false)

  const openStack = () => {
    vehicleRecords.forEach((r) => stack.pushDetail({ id: r.id, title: String(r.title) }))
    setStackOpen(true)
  }

  return (
    <DocPage
      title="EntityProfile"
      badge="wip"
      summary="The v5 30/70 entity-profile template: a derived identity panel (image/status/name/id/tags/key-details) beside blueprint-driven, privilege-gated tabs. Bespoke escape hatches accept custom regions. Presentational — no fetching."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Everything here is derived from the fleet blueprint: the left identity panel comes from{' '}
          <Code>deriveDetail</Code>, the right tabs from <Code>uiConfig.profile.rightPanel</Code>. Toggle the
          user below — the <Code>Audit log</Code> tab is gated behind the <Code>fleet.audit</Code> privilege
          and disappears for the viewer.
        </Prose>
        <div className="flex items-center gap-2">
          <Switch id="as-admin" checked={asAdmin} onCheckedChange={setAsAdmin} />
          <Label htmlFor="as-admin">Sign in as admin (has fleet.audit)</Label>
        </div>
        <div className="h-[460px] overflow-hidden rounded-md border border-border">
          <EntityProfile
            config={vehiclesConfig}
            record={vehicleRecords[0]}
            statusTone="success"
            tabs={[auditTab]}
            tabRenderers={tabRenderers}
            userContext={asAdmin ? admin : viewer}
            avatarFallback="VH"
          />
        </div>
      </DocSection>

      <DocSection id="stacking" title="Multi-profile stacking (ProfileStack + useDetailStack)">
        <Prose>
          The <Code>useDetailStack</Code> hook ports v5's browser-tab stacking state (dedupe-by-id, active
          fallback on close, minimize-keeps-stack). <Code>ProfileStack</Code> renders it as stacked tabs with
          tokenized window-chrome controls (close-all / minimize) — no raw-hex traffic lights.
        </Prose>
        <Button onClick={openStack} className="self-start">
          Open stacked profiles
        </Button>
        <ProfileStack
          open={stackOpen}
          onOpenChange={setStackOpen}
          items={stack.items}
          activeId={stack.activeId}
          onActivate={stack.activate}
          onClose={stack.closeDetail}
          onCloseAll={() => {
            stack.closeAll()
            setStackOpen(false)
          }}
          onMinimize={() => setStackOpen(false)}
          renderProfile={(item) => {
            const record = vehicleRecords.find((r) => r.id === item.id) ?? vehicleRecords[0]
            return (
              <EntityProfile config={vehiclesConfig} record={record} statusTone="success" tabRenderers={tabRenderers} userContext={admin} />
            )
          }}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config / record', type: 'EntityConfig / EntityRecord', description: 'Blueprint mode: identity + tabs derived from the config and record.' },
            { prop: 'tabs', type: 'EntityProfileTab[]', description: 'Tabs added on top of the blueprint set (or the whole set in bespoke mode).' },
            { prop: 'tabRenderers', type: 'Record<string, ProfileTabRenderer>', description: 'Blueprint-tab bodies, keyed by the tab component name.' },
            { prop: 'userContext', type: 'UserContext', description: 'Subject of every tab visibility gate (visibleWhen / requiredPrivileges).' },
            { prop: 'moduleCode', type: 'string', description: 'Pulls contributed tabs from the ProfileTabRegistry for this module.' },
            { prop: 'identity / details / title', type: 'ReactNode / …', description: 'Bespoke escape hatches — replace the derived identity panel or its rows.' },
            { prop: 'activeTabId / onTabChange', type: 'string / (id) => void', description: 'Controlled active tab; omit for uncontrolled.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Drive it from a blueprint — pass config + record and let deriveDetail + the rightPanel tabs do the work.',
            'Gate cross-cutting tabs with requiredPrivileges / visibleWhen against an injected UserContext.',
            'Contribute another module’s tab through the ProfileTabRegistry rather than hard-coding it in the blueprint.',
          ]}
          donts={[
            'Don’t fetch inside the profile — pass the record and tab renderers in (Rule 8).',
            'Don’t hand-roll the traffic-light chrome with raw hex — ProfileStack uses destructive/warning tokens.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Right-panel tabs use the core Tabs primitive (full keyboard + SR support); the identity panel is a semantic <aside> with a heading.',
            'ProfileStack tabs are activate/close button pairs (siblings, never nested) — no nested-interactive violations; the Sheet supplies focus trap + Esc.',
            'RTL-safe: logical properties throughout (ps/pe, border-e, start-*).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
