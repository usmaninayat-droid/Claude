import { useState } from 'react'
import {
  NavRail,
  NavRailRow,
  NavRailUserRow,
  AppSwitcherPanel,
  type NavRailMode,
} from '@fams/ui-kit'
import {
  Gauge, Globe, Ticket, Truck, Inbox, Shield, Settings, HelpCircle, ChevronRight, Radio,
} from '@fams/ui-kit/icons'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const ITEMS = [
  { id: 'dash', label: 'Operational Dashboard', icon: <Gauge aria-hidden />, active: true },
  { id: 'live', label: 'Live Monitoring', icon: <Globe aria-hidden /> },
  { id: 'tickets', label: 'Ticketing', icon: <Ticket aria-hidden /> },
  { id: 'fleet', label: 'Fleet Management', icon: <Truck aria-hidden /> },
]

function RailPreview({
  defaultMode,
  inboxCurrent = false,
  inboxCount,
}: {
  defaultMode: NavRailMode
  /** Inbox is the current page — a CROSS-APPLICATION surface. */
  inboxCurrent?: boolean
  inboxCount?: number
}) {
  const [active, setActive] = useState('dash')
  return (
    <div className="flex h-96 overflow-hidden rounded-md border border-border bg-background">
      <NavRail
        defaultMode={defaultMode}
        items={ITEMS.map((i) => ({ ...i, active: !inboxCurrent && i.id === active }))}
        onItemSelect={setActive}
        topItems={[
          {
            id: 'inbox',
            label: 'Inbox',
            icon: <Inbox aria-hidden />,
            active: inboxCurrent,
            notificationDot: inboxCount === undefined,
            badgeCount: inboxCount,
          },
        ]}
        logo={<Radio aria-hidden className="size-6 text-white" />}
        logoExpanded={<span className="text-sm font-bold text-white">FAMS Suite</span>}
        switcher={{
          label: 'CCMS',
          icon: <Shield aria-hidden />,
          // The rail is inside no single application while a
          // cross-application surface is current.
          active: !inboxCurrent,
          panel: (
            <AppSwitcherPanel
              apps={[
                { id: 'ccms', label: 'CCMS', icon: <Shield aria-hidden />, active: true },
                { id: 'telematics', label: 'Telematics', icon: <Truck aria-hidden /> },
              ]}
            />
          ),
        }}
        footer={
          <>
            <NavRailRow label="Settings" tone="footer" icon={<Settings aria-hidden />} trailing={<ChevronRight aria-hidden className="size-3.5 text-white/80" />} />
            <NavRailRow label="Help" tone="footer" icon={<HelpCircle aria-hidden />} />
            <NavRailUserRow name="FAMS Admin" email="admin@fams.com" trailing={<ChevronRight aria-hidden className="size-3.5 text-white/80" />} />
          </>
        }
      />
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Page content
      </div>
    </div>
  )
}

/**
 * NavRailDemo — the unified expandable primary rail (collapsed / expanded /
 * hover-expand), ported from the designer-approved home + side nav prototype.
 */
export default function NavRailDemo() {
  return (
    <DocPage
      title="NavRail"
      badge="stable"
      summary="Unified expandable primary rail: collapsed (46px, default) / expanded (276px) / opt-in hover-expand, a current-app switcher row at 25% under the active module's solid white, scrollable module rows, and a solid footer band. Tenant-branded via --shell-rail-bg."
    >
      <DocSection id="examples" title="Examples">
        <Prose>
          Default mode is <Code>collapsed</Code> (46px): the logo row is the single expansion
          control — the brand mark IS the expand button while collapsed, and a{' '}
          <Code>PanelLeftClose</Code> button collapses it again while expanded. <Code>hover</Code>{' '}
          stays opt-in: a 46px footprint that floats open over the content after a 500ms dwell, so
          the page never reflows for a transient reveal. Rows compose from <Code>NavRailRow</Code>/
          <Code>NavRailUserRow</Code>; the switcher popover here hosts an{' '}
          <Code>AppSwitcherPanel</Code>.
        </Prose>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Expanded (pinned)</p>
          <RailPreview defaultMode="expanded" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Hover mode (dwell over the rail to expand)</p>
          <RailPreview defaultMode="hover" />
        </div>
      </DocSection>

      <DocSection id="selection" title="Selection hierarchy">
        <Prose>
          Three fills, strongest last: the active MODULE is solid white (the current page), the
          active APPLICATION row is white @ 25% (the current scope), everything else is transparent
          with a white/10 hover. A solid-white application row competed with the active module and
          read as ambiguous, so the scope fill stays translucent.
        </Prose>
        <Prose>
          The inbox is CROSS-APPLICATION: while it is the current page the rail is inside no single
          application, so pass <Code>switcher.active = false</Code> and no application row is
          highlighted at all.
        </Prose>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Inside an application — module solid, app row 25%
          </p>
          <RailPreview defaultMode="expanded" inboxCount={13} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Inbox current (cross-application) — no app row highlight
          </p>
          <RailPreview defaultMode="expanded" inboxCurrent inboxCount={13} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Collapsed — the count pill becomes a dot, and the number moves into the row&apos;s name
            and tooltip
          </p>
          <RailPreview defaultMode="collapsed" inboxCount={13} />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'items', type: 'NavRailItem[]', description: 'Scrollable module rows: { id, label, icon?, active?, notificationDot? }.' },
            { prop: 'onItemSelect', type: '(id: string) => void', description: 'Module row click.' },
            { prop: 'topItems / onTopItemSelect', type: 'NavRailItem[] / (id) => void', description: 'Pinned rows between logo and switcher (e.g. Inbox). badgeCount renders the count pill when expanded and a bare dot when collapsed, keeping the number in the accessible name.' },
            { prop: 'logo / logoExpanded / onLogoClick / logoLabel', type: 'ReactNode / ReactNode / () => void / string', description: 'Compact mark, expanded wordmark, and the home action.' },
            { prop: 'switcher', type: '{ label, icon?, panel, active?, mode?, onGoHome?, open?, onOpenChange? }', description: 'Current-app row + the popover panel it opens (e.g. AppSwitcherPanel). active (default true) paints the 25% scope fill — pass false on cross-application pages. mode "page" makes the row route Home instead of opening the popover.' },
            { prop: 'footer', type: 'ReactNode', description: 'Solid footer band content — compose from NavRailRow (tone="footer") and NavRailUserRow.' },
            { prop: 'defaultMode / mode / onModeChange', type: "NavRailMode ('collapsed'|'expanded'|'hover')", description: 'Uncontrolled default or controlled mode.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Feed items from the app-level nav derivation (deriveNavEntries) — the rail renders, it never owns nav data.',
            'Keep tenant branding in tokens: the background reads --shell-rail-bg with a --color-primary fallback.',
            'Wrap NavRailUserRow in an identity popover trigger (UserPopover) for the footer user entry.',
          ]}
          donts={[
            "Don't hardcode tenant names or glyphs — the switcher label and app tiles are props.",
            "Don't pair NavRail with a second module rail — it IS the unified rail (apps live in the switcher).",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every collapsed row keeps its accessible name and shows a right-side tooltip.',
            'Active rows carry aria-current="page"; the unread dot is aria-hidden (decorative).',
            'The edge grip is a real button: keyboard-operable (Enter/Space), aria-expanded, focus ring.',
            'The switcher panel opens in a focus-managed popover; Escape dismisses it from the rail row itself.',
            'A row with badgeCount announces "Inbox, 13 unread" — so the collapsed rail, which shows only a dot, still carries the count.',
            'Hover-expand is never the only path — the grip and the mode menu provide click/keyboard paths.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
