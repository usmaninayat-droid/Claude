import { LayoutDashboard, Map as MapIcon, Truck, ClipboardCheck, Settings, User } from '@fams/ui-kit/icons'
import { SideNav, SideNavFooterItem, Logo, type SideNavItem } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * SideNavDemo — standalone showcase for the SideNav primitive rail.
 * Belongs under the "Shells" showcase page, alongside ModuleRail and TopNav —
 * SideNav is the outer (tenant-colored) bar of AppShell's two-bar navigation.
 */

const NAV: SideNavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard />, to: '#' },
  { label: 'Live Monitoring', icon: <MapIcon />, to: '#', active: true },
  { label: 'Fleet', icon: <Truck />, to: '#' },
  { label: 'Inspections', icon: <ClipboardCheck />, to: '#', notificationDot: true },
]

/** SideNav is h-full — give it a fixed-height column to render into. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[420px] overflow-hidden rounded-md border border-border shadow-sm">
      {children}
    </div>
  )
}

/** Shorter frame for gallery cells — the full 420px rail height is unnecessary there. */
function GalleryFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-64 overflow-hidden rounded-md border border-border shadow-sm">{children}</div>
  )
}

export default function SideNavDemo() {
  return (
    <DocPage
      title="SideNav"
      badge="stable"
      summary="The FAMS icon rail — a fixed w-11 (44px), full-height column painted with the tenant rail color (--shell-rail-bg). Active item is a white rounded square with a brand-colored icon; every label surfaces as a Radix tooltip since the rail never shows text. Renders inline in AppShell's sidebar slot on md+, and inside the mobile drawer below md."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Rail — active state, notification dot, footer"
          hint="hover any icon to see the tooltip label; Inspections carries a notificationDot corner badge"
          code={`<SideNav
  items={[
    { label: 'Dashboard', icon: <LayoutDashboard />, to: '#' },
    { label: 'Live Monitoring', icon: <MapIcon />, to: '#', active: true },
    { label: 'Inspections', icon: <ClipboardCheck />, to: '#', notificationDot: true },
  ]}
  logo={<Logo className="text-2xl text-white" />}
  footer={<SideNavFooterItem label="Settings" icon={<Settings />} />}
/>`}
          bare
        >
          <Frame>
            <SideNav
              items={NAV}
              logo={<Logo className="text-2xl text-white" />}
              footer={
                <>
                  <SideNavFooterItem label="Settings" icon={<Settings />} />
                  <SideNavFooterItem label="Rashid Al Mansoori" icon={<User />} active />
                </>
              }
            />
          </Frame>
        </Demo>
      </DocSection>

      <DocSection id="configurations" title="Configurations">
        <Prose>
          <Code>logo</Code> and <Code>footer</Code> are both optional slots — a rail can be as
          minimal as the item list alone, or carry a footer button in an <Code>active</Code> state
          via <Code>SideNavFooterItem</Code>.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Full — logo + footer',
              node: (
                <GalleryFrame>
                  <SideNav
                    items={NAV}
                    logo={<Logo className="text-2xl text-white" />}
                    footer={<SideNavFooterItem label="Settings" icon={<Settings />} />}
                  />
                </GalleryFrame>
              ),
            },
            {
              label: 'Items only',
              caption: 'no logo, no footer',
              node: (
                <GalleryFrame>
                  <SideNav items={NAV} />
                </GalleryFrame>
              ),
            },
            {
              label: 'Footer only',
              caption: 'no logo',
              node: (
                <GalleryFrame>
                  <SideNav
                    items={NAV}
                    footer={<SideNavFooterItem label="Settings" icon={<Settings />} />}
                  />
                </GalleryFrame>
              ),
            },
            {
              label: 'Active footer item',
              caption: 'SideNavFooterItem active',
              node: (
                <GalleryFrame>
                  <SideNav
                    items={NAV}
                    footer={<SideNavFooterItem label="Rashid Al Mansoori" icon={<User />} active />}
                  />
                </GalleryFrame>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>SideNav</Code>
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'items',
              type: 'SideNavItem[]',
              required: true,
              description: 'Navigation entries, top to bottom.',
            },
            {
              prop: 'logo',
              type: 'ReactNode',
              description: 'Brand logomark rendered at the top of the rail (white, ~30px).',
            },
            {
              prop: 'footer',
              type: 'ReactNode',
              description: 'Footer slot (settings + user avatar) pinned to the bottom of the rail.',
            },
            {
              prop: 'isCollapsed',
              type: 'boolean',
              description:
                'Legacy prop kept for AppShell clone-compatibility only — the rail is now permanently icon-only, so this no longer toggles width. Does not reach the DOM.',
            },
            {
              prop: 'renderItem',
              type: '(item: SideNavItem, inner: ReactNode) => ReactNode',
              description:
                'Render bridge for each item — wrap the styled inner content in a router Link instead of the default anchor pointing at item.to.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLElement>',
              description: 'className and any nav attribute pass through.',
            },
          ]}
        />
        <Prose>
          <Code>SideNavItem</Code>
        </Prose>
        <PropsTable
          rows={[
            { prop: 'label', type: 'string', required: true, description: 'Accessible name, also shown in the tooltip.' },
            { prop: 'icon', type: 'ReactNode', description: 'Glyph rendered in the rail — the system ships no icon set.' },
            { prop: 'to', type: 'string', required: true, description: 'Opaque href/route segment consumed by renderItem (or the default anchor).' },
            { prop: 'active', type: 'boolean', description: 'Renders the white rounded-square active state and sets aria-current="page".' },
            {
              prop: 'notificationDot',
              type: 'boolean',
              description: 'Small destructive corner dot (e.g. unseen items). Purely visual, opt-in per item.',
            },
          ]}
        />
        <Prose>
          <Code>SideNavFooterItem</Code>
        </Prose>
        <PropsTable
          rows={[
            { prop: 'label', type: 'string', required: true, description: 'Accessible name — also shown in the hover/focus tooltip.' },
            { prop: 'icon', type: 'ReactNode', description: 'Glyph rendered inside the circle.' },
            { prop: 'active', type: 'boolean', description: 'Highlights the item as the current view (e.g. an open settings panel).' },
            {
              prop: '…props',
              type: 'ButtonHTMLAttributes<HTMLButtonElement>',
              description: 'className, onClick, and any native button attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Render SideNav via AppShell’s sidebar slot, not as a standalone routing component.',
            'Keep the item list short (4–6) — it’s icon-only, so every entry needs an instantly recognizable glyph.',
            'Reserve notificationDot for a real unseen/unread state — not a decorative flourish.',
            'Compose the footer from SideNavFooterItem so settings/user entries match the rail’s tooltip and active treatment.',
          ]}
          donts={[
            'Don’t rely on isCollapsed to change rail width — it’s a legacy no-op kept for type compatibility only.',
            'Don’t add a text label next to the icon — the rail is icon-only by design; the label lives in the tooltip.',
            'Don’t mark more than one item active at a time.',
            'Don’t bypass renderItem’s default anchor unless you specifically need router-aware navigation.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a <nav aria-label="Primary"> landmark; the active item’s <li> carries aria-current="page".',
            'Every item is wrapped in a Radix Tooltip — the label surfaces on hover and on keyboard focus alike.',
            'SideNavFooterItem sets aria-label from label and aria-current="page" when active, and carries its own focus-visible ring.',
            'Focus rings use ring-white/60 for contrast against the dark tenant rail background.',
            'Layout uses a logical border-s-2 accent and no physical-direction utilities, so it mirrors correctly under RTL (switch the header language) — AppShell places the rail on the logical start edge either way.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          <Code>isCollapsed</Code> is accepted and silently dropped before it reaches the DOM —
          it exists only so <Code>AppShell.cloneElement</Code> and older call sites don’t type-error;
          the rail no longer has an expanded/labeled state. <Code>SideNavFooterItem</Code> carries its
          own <Code>Tooltip.Provider</Code>, so it renders correctly even outside <Code>SideNav</Code>.
          Related: <Code>TopNav</Code>, the bar that sits after this rail inside AppShell.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
