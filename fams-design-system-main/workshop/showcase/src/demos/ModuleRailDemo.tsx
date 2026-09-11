import { LayoutGrid, Truck, MapPinned, Bell, Users, Shield, Palette, Globe } from '@fams/ui-kit/icons'
import { ModuleRail, type ModuleRailItem, type ModuleRailSection } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Gallery, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * ModuleRailDemo — standalone showcase for the ModuleRail shell.
 * Belongs under the "Shells" showcase page, next to SideNav — this is the
 * inner (secondary) per-module menu that sits after SideNav inside AppShell,
 * forming the real v5 two-bar navigation.
 */

const ITEMS: ModuleRailItem[] = [
  { label: 'Overview', icon: <LayoutGrid />, to: '#', active: true },
  { label: 'Vehicles', icon: <Truck />, to: '#', badge: 24 },
  { label: 'Geofences', icon: <MapPinned />, to: '#' },
  { label: 'Alerts', icon: <Bell />, to: '#', badge: '3' },
]

const SETTINGS_SECTIONS: ModuleRailSection[] = [
  {
    label: 'Platform Settings',
    items: [
      { label: 'Users', icon: <Users />, to: '#', active: true },
      { label: 'Roles', icon: <Shield />, to: '#' },
    ],
  },
  {
    label: 'My Settings',
    items: [
      { label: 'Appearance', icon: <Palette />, to: '#' },
      { label: 'Language', icon: <Globe />, to: '#' },
    ],
  },
]

/** ModuleRail is h-full — give it a fixed-height column to render into. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[420px] overflow-hidden rounded-md border border-border shadow-sm">
      {children}
      <div className="flex-1 bg-surface-minimal" />
    </div>
  )
}

/** Compact frame for gallery cells — wraps just the rail, no filler pane. */
function RailPreview({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[280px] overflow-hidden rounded-md border border-border shadow-sm">
      {children}
    </div>
  )
}

export default function ModuleRailDemo() {
  return (
    <DocPage
      title="ModuleRail"
      badge="stable"
      summary="The FAMS inner (secondary) navigation rail — sits immediately after SideNav inside AppShell's moduleRail slot. Compact is a slim icon-only column with tooltips; expanded widens to show the module title and item labels (with optional trailing badges); stacked renders icon-over-label tiles; sections groups items into labeled blocks for the Settings-nav case."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Compact (default) — icon-only, tooltips"
          hint="active item = bg-primary with a white icon; hover any icon for its label"
          code={`<ModuleRail items={items} />`}
          bare
        >
          <Frame>
            <ModuleRail items={ITEMS} />
          </Frame>
        </Demo>
      </DocSection>

      <DocSection id="modes" title="Modes">
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Compact',
              caption: 'default — icon-only, tooltips',
              node: (
                <RailPreview>
                  <ModuleRail items={ITEMS} />
                </RailPreview>
              ),
            },
            {
              label: 'Expanded',
              caption: 'title + labels + badges',
              node: (
                <RailPreview>
                  <ModuleRail title="Live Monitoring" items={ITEMS} compact={false} />
                </RailPreview>
              ),
            },
            {
              label: 'Stacked',
              caption: 'icon over label, ~72px tiles',
              node: (
                <RailPreview>
                  <ModuleRail items={ITEMS} stacked />
                </RailPreview>
              ),
            },
            {
              label: 'Sections',
              caption: 'expanded + grouped (Settings nav)',
              node: (
                <RailPreview>
                  <ModuleRail title="Settings" sections={SETTINGS_SECTIONS} compact={false} />
                </RailPreview>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'title',
              type: 'ReactNode',
              description: 'Module title shown at the top of the rail. Rendered only in expanded mode (compact = false).',
            },
            {
              prop: 'items',
              type: 'ModuleRailItem[]',
              description: 'Flat sub-navigation entries, top to bottom. Ignored when sections is set in expanded mode.',
            },
            {
              prop: 'sections',
              type: 'ModuleRailSection[]',
              description: 'Grouped, labeled item lists for expanded mode (the Settings-nav case). Takes precedence over items when non-empty; compact and stacked always fall back to the flat items list.',
            },
            {
              prop: 'compact',
              type: 'boolean',
              default: 'true',
              description: 'Slim icon-only column with tooltip labels. false widens the rail and shows the title + item labels.',
            },
            {
              prop: 'stacked',
              type: 'boolean',
              default: 'false',
              description: 'Icon-over-label tiles (~72px column), the authentic v5 secondary-rail nav-item look. Takes precedence over compact.',
            },
            {
              prop: 'footer',
              type: 'ReactNode',
              description: 'Footer slot pinned to the bottom of the rail.',
            },
            {
              prop: 'renderItem',
              type: '(item: ModuleRailItem, inner: ReactNode) => ReactNode',
              description: 'Render bridge for each item — wrap the styled inner node in a router Link. Defaults to an anchor pointing at item.to.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLElement>, 'title'>",
              description: 'className and any nav element attribute pass through (the native title attribute is reserved by the title prop above).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use compact (default) as the standard secondary rail inside AppShell — it matches the real v5 two-bar navigation.',
            'Use stacked when the module wants the authentic v5 icon-over-label nav-item tiles.',
            'Group settings-style navigation with sections — never hand-roll section headers above a flat item list.',
            "Mark the current route's item active so the primary-tinted highlight and aria-current line up with real navigation state.",
          ]}
          donts={[
            'Don’t pass sections in compact or stacked mode — both ignore it and always render the flat items list.',
            'Don’t use ModuleRail for the outer/top-level app nav — that’s SideNav; ModuleRail is the inner per-module menu.',
            'Don’t rely on the default anchor wrapper in a routed app — pass renderItem to wrap items in a router Link instead of a full page reload.',
            "Don’t overload a section with many items — the rail is quick per-module navigation, not a full site map.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a landmark <nav aria-label="Module"> so assistive tech can jump straight to the rail.',
            'The active item sets aria-current="page" on its wrapping element — not communicated by colour alone.',
            'Compact mode keeps an sr-only label on every icon-only item and surfaces it as a Radix tooltip on hover/focus; stacked mode shows the label as visible text instead.',
            'All icons are aria-hidden — the label (visible or sr-only) is what assistive tech announces.',
            'Every interactive item has a visible focus-visible ring; Tab order follows document order in every mode.',
            'Layout uses logical properties (border-e), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          <Code>ModuleRailItem</Code> is <Code>{'{ label, icon?, to, active?, badge? }'}</Code> —
          <Code>badge</Code> (count or short string) only renders in expanded mode.{' '}
          <Code>ModuleRailSection</Code> is <Code>{'{ label?, items }'}</Code>, used only by the{' '}
          <Code>sections</Code> prop in expanded mode. Related: <Code>SideNav</Code> (the outer,
          tenant-colored app rail this component sits inside of).
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
