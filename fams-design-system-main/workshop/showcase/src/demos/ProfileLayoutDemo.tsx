import { useState } from 'react'
import { ProfileLayout, Button, Badge, Avatar, type ProfileTab } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * ProfileLayoutDemo — standalone showcase for the ProfileLayout shell.
 * Belongs under the "Shells" showcase page, next to RecordLayout — the
 * tabbed sibling for records that need a tab strip (RecordLayout is the flat
 * non-tabbed alternative).
 */

function DeviceRow({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
      <span className="text-body-sm font-medium text-foreground">{label}</span>
      <span className="text-body-sm text-muted-foreground">{meta}</span>
    </div>
  )
}

function OverviewPanel() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-sm text-foreground">
        Compactor truck assigned to Lot 2 under Alphamed. Last GPS ping 3 minutes ago, currently
        moving along Route 14.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Odometer', value: '128,340 km' },
          { label: 'Fuel type', value: 'Diesel' },
          { label: 'Last service', value: '2026-05-11' },
          { label: 'Driver', value: 'Kareem Haddad' },
        ].map((f) => (
          <div key={f.label} className="rounded-sm border border-border p-3">
            <div className="text-caption text-muted-foreground">{f.label}</div>
            <div className="mt-1 text-body-sm font-medium text-foreground">{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function makeTabs(): ProfileTab[] {
  return [
    { id: 'overview', label: 'Overview', content: <OverviewPanel /> },
    {
      id: 'devices',
      label: 'Devices',
      content: (
        <div className="overflow-hidden rounded-sm border border-border">
          <DeviceRow label="GPS tracker — TR-4821" meta="Online" />
          <DeviceRow label="RFID reader — RF-1092" meta="Online" />
        </div>
      ),
    },
    {
      id: 'billing',
      label: 'Billing',
      content: <p className="text-body-sm text-muted-foreground">Billing detail.</p>,
      disabled: true,
      disabledReason: 'Requires the Finance role',
    },
  ]
}

/** ProfileLayout is h-full — give it a fixed-height column to render into. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-md border border-border shadow-sm">
      {children}
    </div>
  )
}

export default function ProfileLayoutDemo() {
  const [tabs] = useState<ProfileTab[]>(makeTabs())
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <DocPage
      title="ProfileLayout"
      badge="stable"
      summary="Header (media, title, subtitle, actions) + Radix tab strip + panel canvas. Chrome only — the tab manifest is app data (ProfileTab[]), built per entity/tenant; ProfileLayout has zero knowledge of what an AssetVehicle or a bin is. Companion to RecordLayout for records that need a tab strip."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Full profile — media, tabs, disabled tab"
          hint="the Billing tab is disabled with a reason — NoPermission renders it inert with a tooltip instead of hiding it"
          code={`<ProfileLayout
  media={<Avatar name="Truck 07" />}
  title="Truck 07"
  subtitle="Lot 2 · Alphamed"
  actions={<><Button variant="secondary" size="sm">Unlink</Button><Button size="sm">Edit</Button></>}
  tabs={[
    { id: 'overview', label: 'Overview', content: <Overview /> },
    { id: 'devices', label: 'Devices', content: <Devices /> },
    { id: 'billing', label: 'Billing', content: <Billing />, disabled: true, disabledReason: 'Requires the Finance role' },
  ]}
/>`}
          bare
        >
          <Frame>
            <ProfileLayout
              media={<Avatar name="Truck 07" />}
              title="Truck 07"
              subtitle="Lot 2 · Alphamed"
              actions={
                <>
                  <Badge variant="success" dot>
                    Moving
                  </Badge>
                  <Button variant="secondary" size="sm">
                    Unlink
                  </Button>
                  <Button size="sm">Edit</Button>
                </>
              }
              tabs={makeTabs()}
            />
          </Frame>
        </Demo>
      </DocSection>

      <DocSection id="controlled" title="Controlled active tab">
        <Demo
          title="Lifting tab state to the caller"
          hint="activeTab + onTabChange lift tab state to the caller — e.g. to deep-link a tab in the URL"
          code={`const [activeTab, setActiveTab] = useState('devices')
<ProfileLayout title="Truck 07" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />`}
          bare
        >
          <div className="flex w-full flex-col gap-3">
            <p className="text-body-sm text-muted-foreground">
              Active tab: <span className="font-medium text-foreground">{activeTab}</span>
            </p>
            <Frame>
              <ProfileLayout
                title="Truck 07"
                subtitle="Lot 2 · Alphamed"
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </Frame>
          </div>
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'media',
              type: 'ReactNode',
              description: 'Small identity element — avatar, icon, or thumbnail — rendered at the head of the header row.',
            },
            {
              prop: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Primary heading, rendered as an <h2>.',
            },
            {
              prop: 'subtitle',
              type: 'ReactNode',
              description: 'Optional supporting line below the title.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Header action buttons (edit, link, unlink…), rendered in a trailing toolbar.',
            },
            {
              prop: 'tabs',
              type: 'ProfileTab[]',
              required: true,
              description: 'The tab manifest — see Developer notes for the ProfileTab shape.',
            },
            {
              prop: 'activeTab',
              type: 'string',
              description: 'Controlled active tab id. Omit for uncontrolled (defaults to the first visible tab).',
            },
            {
              prop: 'onTabChange',
              type: '(id: string) => void',
              description: 'Called when the user selects a different tab, controlled or uncontrolled.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Merged onto the root element.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Build the tabs array once, per entity/tenant, as data — don’t branch JSX by role inside the shell.',
            'Use disabled + disabledReason for privilege-gated tabs so they stay visible but explain why they’re inert.',
            'Lift activeTab/onTabChange to the caller when the active tab needs to be deep-linked in the URL.',
            'Reach for RecordLayout instead when the record has no need for a tab strip.',
          ]}
          donts={[
            'Don’t use hidden just to express "no access" — reserve it for tabs that truly don’t apply; use disabled + disabledReason for privilege gates.',
            'Don’t fetch or own tab content inside ProfileLayout — every tab’s content is a slot owned by the caller.',
            'Don’t fix the panel canvas height — the tab content region already scrolls on its own (overflow-auto).',
            'Don’t skip subtitle or media just because they’re optional — they carry the domain context (lot, tenant, status).',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Tab strip is built on Radix Tabs — roving-tabindex keyboard support (arrow keys, Home/End) and correct tab/tabpanel ARIA wiring out of the box.',
            'Disabled tabs stay in the layout as inert triggers wrapped in NoPermission (aria-disabled="true") with the reason exposed via a tooltip, instead of vanishing silently.',
            'title renders as an <h2> — pair ProfileLayout with a page that already has its own <h1>.',
            'Layout uses logical properties (Stack/Toolbar), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          <Code>ProfileTab</Code> is{' '}
          <Code>{'{ id, label, content, hidden?, disabled?, disabledReason? }'}</Code>. Retires
          31 hand-rolled per-tenant, per-entity profile components (including byte-identical
          fams/ead forks) down to one shell + N manifests. Related: <Code>RecordLayout</Code> for
          the flat, non-tabbed alternative.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
