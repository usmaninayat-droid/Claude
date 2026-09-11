import { Tabs, TabsList, TabsTrigger, TabsContent } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const TAB_VALUES = ['overview', 'devices', 'documents'] as const

type TabsControls = {
  defaultTab: (typeof TAB_VALUES)[number]
  disableDocuments: boolean
}

/**
 * TabsDemo — the canonical tab strip. Every tabbed surface in the platform
 * (entity profiles, HybridView's mobile split, settings pages) uses this —
 * never a raw div[role=tablist] or framework-native tab markup. Composition
 * (which tabs, in which order, hidden by privilege) is app data — see
 * ProfileLayout + ProfileTab for the privilege-aware wrapper.
 */
export default function TabsDemo() {
  return (
    <DocPage
      title="Tabs"
      badge="stable"
      summary="The canonical tab strip. Every tabbed surface in the platform (entity profiles, HybridView's mobile split, settings pages) uses this — never a raw div[role=tablist] or framework-native tab markup."
    >
      <DocSection id="playground" title="Playground">
        <Playground<TabsControls>
          controls={[
            { name: 'defaultTab', type: 'select', default: 'overview', options: TAB_VALUES },
            { name: 'disableDocuments', type: 'boolean', default: true },
          ]}
        >
          {(v) => (
            <Tabs key={v.defaultTab} defaultValue={v.defaultTab} className="w-full max-w-md">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="documents" disabled={v.disableDocuments}>
                  Documents
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="p-field text-body-sm text-muted-foreground">
                Overview panel content.
              </TabsContent>
              <TabsContent value="devices" className="p-field text-body-sm text-muted-foreground">
                Devices panel content.
              </TabsContent>
              <TabsContent value="documents" className="p-field text-body-sm text-muted-foreground">
                Documents panel content.
              </TabsContent>
            </Tabs>
          )}
        </Playground>
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          <Code>defaultValue</Code> can start on any tab, not just the first. A disabled trigger stays
          visible but non-interactive — e.g. a privilege-gated tab.
        </Prose>
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'first tab active',
              node: (
                <Tabs defaultValue="overview" className="w-full max-w-xs">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="devices">Devices</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="p-field text-body-sm text-muted-foreground">
                    Overview panel content.
                  </TabsContent>
                  <TabsContent value="devices" className="p-field text-body-sm text-muted-foreground">
                    Devices panel content.
                  </TabsContent>
                </Tabs>
              ),
            },
            {
              label: 'second tab active',
              node: (
                <Tabs defaultValue="devices" className="w-full max-w-xs">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="devices">Devices</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="p-field text-body-sm text-muted-foreground">
                    Overview panel content.
                  </TabsContent>
                  <TabsContent value="devices" className="p-field text-body-sm text-muted-foreground">
                    Devices panel content — currently active.
                  </TabsContent>
                </Tabs>
              ),
            },
            {
              label: 'disabled tab',
              caption: 'privilege-gated',
              node: (
                <Tabs defaultValue="compliance" className="w-full max-w-xs">
                  <TabsList>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                    <TabsTrigger value="incidents">Incidents</TabsTrigger>
                    <TabsTrigger value="settlement" disabled>
                      Settlement
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="compliance" className="p-field text-body-sm text-muted-foreground">
                    Compliance panel content.
                  </TabsContent>
                  <TabsContent value="incidents" className="p-field text-body-sm text-muted-foreground">
                    Incidents panel content.
                  </TabsContent>
                </Tabs>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>Tabs</Code>, <Code>TabsList</Code>, <Code>TabsTrigger</Code>, and{' '}
          <Code>TabsContent</Code> are separate exports composed together — the table below covers the
          props used in practice.
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'value',
              type: 'string',
              description:
                'Tabs (root): controlled active tab value. TabsTrigger / TabsContent: the tab id each one represents.',
            },
            {
              prop: 'defaultValue',
              type: 'string',
              description: 'Tabs (root). Uncontrolled initial active tab.',
            },
            {
              prop: 'onValueChange',
              type: '(value: string) => void',
              description: 'Tabs (root). Fires when the active tab changes.',
            },
            {
              prop: 'orientation',
              type: "'horizontal' | 'vertical'",
              default: "'horizontal'",
              description: 'Tabs (root). Sets the arrow-key navigation axis.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'TabsTrigger. Excludes the tab from selection and keyboard navigation, stays visible.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof TabsPrimitive.Root | List | Trigger | Content>',
              description: 'Native Radix Tabs attributes pass through on each subcomponent.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for 2–7 peer views of the same entity — profile sections, settings pages.',
            'Keep tab labels to one or two words; move detail into the panel content.',
            'Disable a tab (not hide it) when a privilege gate temporarily blocks it.',
            'Let composition (order, visibility) live in the caller — Tabs itself stays presentational.',
          ]}
          donts={[
            'Don’t use Tabs for a multi-step wizard — that’s sequential, not peer navigation.',
            'Don’t hide unauthorized tabs silently; a disabled tab with a reason is more honest.',
            'Don’t nest a Tabs strip inside another Tabs strip on the same screen.',
            'Don’t roll a custom div[role=tablist] — this is the one canonical implementation.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on Radix Tabs — implements the WAI-ARIA tabs pattern with roving tabindex.',
            'Arrow keys move focus and selection between tabs; Home/End jump to the first/last tab.',
            'Visible focus ring via the ring token on the focused trigger.',
            'Disabled triggers are excluded from arrow-key navigation and keyboard activation.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
