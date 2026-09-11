import { Search, Filter } from '@fams/ui-kit/icons'
import { TopNav, Button, Input, Badge } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * TopNavDemo — standalone showcase for the TopNav shell.
 * Belongs under the "Shells" showcase page, next to SideNav/ModuleRail —
 * TopNav is the top bar that sits after both rails inside AppShell.
 */

/** TopNav is sticky/full-width — wrap it in a bordered frame for the doc page. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-border shadow-sm">
      {children}
    </div>
  )
}

export default function TopNavDemo() {
  return (
    <DocPage
      title="TopNav"
      badge="stable"
      summary="The FAMS application top bar. Layout start → end: optional mobile hamburger, the bold module title (brand), a view-switch tabs slot (hidden below md), an optional ghost + button, then actions pinned to the trailing edge. Sticky at the top of AppShell's content column."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Full bar — brand, tabs, add, actions"
          hint="tabs slot is hidden below md — pass any tab-like control (ViewTabs, Tabs, or plain buttons)"
          code={`<TopNav
  brand="Live Monitoring"
  tabs={<div className="flex items-center gap-1 px-2"><Button size="sm" variant="ghost">Hybrid</Button><Button size="sm" variant="ghost">List</Button><Button size="sm" variant="ghost">Map</Button></div>}
  onAdd={() => {}}
  actions={<><Input placeholder="Search fleet…" /><Button size="sm"><Filter />Filter</Button></>}
/>`}
        >
          <Frame>
            <TopNav
              brand={<span className="text-lg font-semibold">Live Monitoring</span>}
              tabs={
                <div className="flex items-center gap-1 px-2">
                  <Button size="sm" variant="ghost">
                    Hybrid
                  </Button>
                  <Button size="sm" variant="ghost">
                    List
                  </Button>
                  <Button size="sm" variant="ghost">
                    Map
                  </Button>
                </div>
              }
              onAdd={() => {}}
              actions={
                <div className="flex items-center gap-2">
                  <div className="hidden w-56 sm:block">
                    <Input placeholder="Search fleet…" />
                  </div>
                  <Button size="sm">
                    <Filter /> Filter
                  </Button>
                  <Badge variant="outline">Lot 1</Badge>
                </div>
              }
            />
          </Frame>
        </Demo>
      </DocSection>

      <DocSection id="configurations" title="Configurations">
        <Prose>
          <Code>tabs</Code>, <Code>onAdd</Code>, <Code>actions</Code>, and <Code>onMenuClick</Code> are
          all optional — a module bar renders only the slots it needs, down to <Code>brand</Code>{' '}
          alone.
        </Prose>
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Minimal',
              caption: 'brand only',
              node: (
                <Frame>
                  <TopNav brand={<span className="text-lg font-semibold">Fleet</span>} />
                </Frame>
              ),
            },
            {
              label: 'With add button',
              caption: 'onAdd, no tabs',
              node: (
                <Frame>
                  <TopNav brand={<span className="text-lg font-semibold">Fleet</span>} onAdd={() => {}} />
                </Frame>
              ),
            },
            {
              label: 'With mobile hamburger',
              caption: 'md:hidden — resize below md to see it',
              node: (
                <Frame>
                  <TopNav
                    brand={<span className="text-lg font-semibold">Fleet</span>}
                    onMenuClick={() => {}}
                    actions={
                      <Button size="sm">
                        <Search /> Search
                      </Button>
                    }
                  />
                </Frame>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'brand',
              type: 'ReactNode',
              description: 'Module title / breadcrumb content, pinned to the start edge — typically the bold module name.',
            },
            {
              prop: 'tabs',
              type: 'ReactNode',
              description: 'View-switch tabs slot, rendered after the title (e.g. Hybrid / List / Map). Hidden below md.',
            },
            {
              prop: 'onAdd',
              type: '() => void',
              description: 'When provided, a ghost + button renders after the tabs — the FAMS "add new view/item" affordance.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Action content (search, filters, tenant switcher, user menu), pinned to the end edge.',
            },
            {
              prop: 'onMenuClick',
              type: '() => void',
              description:
                'Mobile hamburger handler. When provided, a menu button renders before brand and is hidden from md upward — on desktop SideNav is always visible.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLElement>',
              description: 'className and any header attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pin the bold module name to brand — it is the page’s primary heading context, not a separate title element.',
            'Pass a tab-like control (ViewTabs, Tabs, or plain buttons) to tabs and let the built-in md:hidden collapse handle small screens.',
            'Only pass onAdd / onMenuClick when the affordance is genuinely needed — their presence, not a boolean, controls whether the button renders.',
            'Keep actions to a small trailing cluster — one search input plus one or two buttons/badges.',
          ]}
          donts={[
            'Don’t stuff a full toolbar into actions — it is a trailing cluster, not a secondary nav.',
            'Don’t use tabs for primary navigation — it is a within-module view switch, not a route change.',
            'Don’t add direction-specific spacing around actions — ms-auto already reserves the correct trailing gap under RTL.',
            'Don’t render TopNav without AppShell’s SideNav present — onMenuClick exists specifically to open the mobile drawer for that rail.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a semantic <header> landmark, sticky at the top of the content column.',
            'The hamburger button has aria-label="Open navigation menu" and only renders (and is only ever visible, via md:hidden) when onMenuClick is supplied.',
            'The add button has aria-label="Add" since it carries no visible text.',
            'Both icon buttons use the ring focus-visible token, so keyboard focus is always visible.',
            'ms-auto push and logical padding keep actions on the trailing edge under RTL with no direction-specific classes — verify by switching the header language.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          The mobile hamburger is <Code>md:hidden</Code> — it won’t appear in a desktop-width
          preview even when <Code>onMenuClick</Code> is wired; resize the viewport below the{' '}
          <Code>md</Code> breakpoint to see it render. TopNav sits after both rails (SideNav, and
          the optional ModuleRail) inside AppShell’s layout. Related: <Code>SideNav</Code>, the rail
          this bar sits beside.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
