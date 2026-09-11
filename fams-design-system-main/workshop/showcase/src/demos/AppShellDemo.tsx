import { useState } from 'react'
import {
  LayoutDashboard,
  Map as MapIcon,
  Truck,
  ClipboardCheck,
  Settings,
  Search,
  User,
} from '@fams/ui-kit/icons'
import {
  AppShell,
  SideNav,
  SideNavFooterItem,
  TopNav,
  ListView,
  Button,
  Input,
  Logo,
  type SideNavItem,
} from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * AppShellDemo — standalone showcase for the AppShell shell. Belongs under
 * the "Shells" showcase page, next to ListView/HybridView/ProfileLayout —
 * this is the outer application frame all of them render into.
 */

const NAV: SideNavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard />, to: '#', active: false },
  { label: 'Live Monitoring', icon: <MapIcon />, to: '#', active: true },
  { label: 'Fleet', icon: <Truck />, to: '#' },
  { label: 'Inspections', icon: <ClipboardCheck />, to: '#', notificationDot: true },
]

const ROWS = [
  { plate: 'AUH 45213', driver: 'Rashid Al Mansoori', lot: 'Lot 1', status: 'Moving' },
  { plate: 'AUH 30188', driver: 'Kareem Haddad', lot: 'Lot 2', status: 'Idle' },
]

function FleetTable() {
  return (
    <table className="w-full text-body-sm">
      <thead className="sticky top-0 bg-muted/60 text-start text-muted-foreground">
        <tr>
          <th className="px-4 py-2.5 text-start font-semibold">Plate</th>
          <th className="px-4 py-2.5 text-start font-semibold">Driver</th>
          <th className="px-4 py-2.5 text-start font-semibold">Lot</th>
          <th className="px-4 py-2.5 text-start font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.plate} className="border-t border-border">
            <td className="px-4 py-2.5 font-medium text-foreground">{r.plate}</td>
            <td className="px-4 py-2.5 text-foreground">{r.driver}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{r.lot}</td>
            <td className="px-4 py-2.5 font-medium text-success">{r.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Fixed viewport so the h-screen shell renders inside the bordered demo box. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[560px] w-full overflow-hidden rounded-md border border-border shadow-sm">
      {children}
    </div>
  )
}

export default function AppShellDemo() {
  const [drawerNote, setDrawerNote] = useState(false)

  return (
    <DocPage
      title="AppShell"
      badge="stable"
      summary="The FAMS responsive application frame — outer tenant-colored icon rail (SideNav), an optional inner ModuleRail, a sticky TopNav, and a scrollable main well painted on the surface-minimal canvas token. Below md both rails collapse into a single Radix Dialog drawer opened by the TopNav hamburger — callers never wire the drawer themselves."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Full shell — SideNav + TopNav + content"
          hint="moduleRail omitted here — single-bar navigation; see the ModuleRail demo for the two-bar case"
          bare
          code={`<AppShell
  sidebar={<SideNav items={nav} logo={<Logo />} footer={<SideNavFooterItem label="Settings" icon={<Settings />} />} />}
  topNav={<TopNav brand="Live Monitoring" actions={<Input placeholder="Search fleet…" />} />}
>
  <ListView title="Fleet" subtitle="Northern Emirates — Al Ain">
    <FleetTable />
  </ListView>
</AppShell>`}
        >
          <Frame>
            <AppShell
              sidebar={
                <SideNav
                  items={NAV}
                  logo={<Logo className="text-2xl text-white" />}
                  footer={
                    <>
                      <SideNavFooterItem label="Settings" icon={<Settings />} />
                      <SideNavFooterItem label="Rashid Al Mansoori" icon={<User />} />
                    </>
                  }
                />
              }
              topNav={
                <TopNav
                  brand={<span className="text-lg font-semibold">Live Monitoring</span>}
                  onAdd={() => setDrawerNote((v) => !v)}
                  actions={
                    <div className="flex items-center gap-2">
                      <div className="hidden w-56 sm:block">
                        <Input placeholder="Search fleet…" />
                      </div>
                      <Button size="sm">
                        <Search /> Filter
                      </Button>
                    </div>
                  }
                />
              }
            >
              <ListView
                title="Fleet"
                subtitle={`Northern Emirates — Al Ain · 2 vehicles${drawerNote ? ' · + filter clicked' : ''}`}
                actions={<Button size="sm">New plan</Button>}
              >
                <FleetTable />
              </ListView>
            </AppShell>
          </Frame>
        </Demo>
      </DocSection>

      <DocSection id="mobile-drawer" title="Mobile drawer">
        <Demo
          title="Mobile drawer"
          hint="< md the rail collapses into a Radix Dialog overlay opened by the TopNav hamburger — resize the browser below md to see it; the trigger is invisible at desktop widths since the query is viewport-based, not container-based"
          bare
        >
          <Frame>
            <AppShell
              sidebar={<SideNav items={NAV} logo={<Logo className="text-2xl text-white" />} />}
              topNav={<TopNav brand={<span className="text-lg font-semibold">Fleet</span>} />}
            >
              <div className="flex h-full items-center justify-center p-6 text-center text-body-sm text-muted-foreground">
                Shrink the window below the md breakpoint to reveal the hamburger + drawer.
              </div>
            </AppShell>
          </Frame>
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'sidebar',
              type: 'ReactElement<{ isCollapsed?: boolean }>',
              required: true,
              description:
                'The outer app/module icon rail (SideNav). Rendered inline on md+ and inside the mobile drawer below md.',
            },
            {
              prop: 'moduleRail',
              type: 'ReactNode',
              description:
                'The inner per-module menu (ModuleRail) — the second bar of the two-bar navigation. Rendered after the icon rail on md+ and inside the mobile drawer.',
            },
            {
              prop: 'topNav',
              type: 'ReactElement<{ onMenuClick?: () => void }>',
              required: true,
              description:
                'The top bar. Cloned with an onMenuClick handler so its hamburger opens the mobile drawer — callers never wire the drawer themselves.',
            },
            {
              prop: 'defaultCollapsed',
              type: 'boolean',
              description:
                'Deprecated back-compat prop. The rail is now a permanent icon rail, so this is inert — kept so existing callers don’t break.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Main content, rendered in the scrollable surface-minimal well.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any native div attribute pass through to the outer frame.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use AppShell for the outer application frame; nest a ModuleRail only when the module has a sub-nav.',
            'Let AppShell manage the mobile drawer — don’t build a second drawer for the same navigation.',
            'Compose page content with ListView / DashboardLayout / HybridView inside children — AppShell only owns the frame.',
            'Give topNav its own actions/onAdd instead of reaching around AppShell to add controls.',
          ]}
          donts={[
            'Don’t render AppShell inside another scrollable container — it expects the full viewport (h-screen).',
            'Don’t wire the hamburger yourself; topNav is cloned with onMenuClick automatically.',
            'Don’t nest a second AppShell for a modal or side panel — use DetailSheet/FormSheet instead.',
            'Don’t hardcode rail colors — the tenant rail color comes from the --shell-rail-bg token.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Mobile drawer is a Radix Dialog — focus trap, Esc-to-close, and aria-label="Navigation" come for free.',
            'The TopNav hamburger renders only when onMenuClick is supplied, with aria-label="Open navigation menu".',
            'SideNav/ModuleRail items are keyboard-operable links with tooltips serving as their accessible name.',
            'Layout uses only flex order and logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          <Code>AppShell</Code> requires an <Code>h-screen</Code>-scoped ancestor — demos above wrap it in a
          fixed-height <Code>Frame</Code> so the shell renders inside the bordered showcase box instead of
          taking over the page. In a real route it fills the viewport directly. Related:{' '}
          <Code>ModuleRail</Code> for the two-bar navigation case, <Code>ListView</Code> /{' '}
          <Code>DashboardLayout</Code> / <Code>HybridView</Code> for the content slot.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
