import { HomeLaunchPad, usePinnedIds } from '@fams/v5-templates'
import { Gauge, Globe, Ticket, Truck, Users, LayoutDashboard, Boxes } from '@fams/ui-kit/icons'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const GROUPS = [
  {
    id: 'ccms',
    label: 'CCMS',
    icon: <LayoutDashboard aria-hidden />,
    modules: [
      { id: 'dash', label: 'Operational Dashboard', icon: <Gauge aria-hidden />, accentColor: 'var(--color-chart-1)' },
      { id: 'live', label: 'Live Monitoring', icon: <Globe aria-hidden />, accentColor: 'var(--color-chart-1)' },
      { id: 'tickets', label: 'Ticketing', icon: <Ticket aria-hidden />, accentColor: 'var(--color-chart-1)' },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: <Boxes aria-hidden />,
    modules: [
      { id: 'fleet', label: 'Fleet Management', icon: <Truck aria-hidden />, accentColor: 'var(--color-chart-2)' },
      { id: 'workforce', label: 'Workforce', icon: <Users aria-hidden />, accentColor: 'var(--color-chart-2)' },
    ],
  },
]

/* A stand-in wave asset. In a real app the tenant supplies the URL — the
   component uses it as a CSS MASK, so the tint comes from the tenant's
   primary token and one asset serves every tenant. */
const WAVE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 415" preserveAspectRatio="none">' +
      '<path fill="black" d="M0 210 C 240 120 480 300 720 210 C 960 120 1200 300 1440 210 L1440 415 L0 415 Z"/>' +
      '<path fill="black" opacity="0.5" d="M0 290 C 300 200 600 380 900 290 C 1140 220 1300 330 1440 300 L1440 415 L0 415 Z"/>' +
      '</svg>',
  )

function PadPreview() {
  const [pins, togglePin] = usePinnedIds('showcase.home.pins', ['dash', 'fleet'])
  return (
    <div className="h-[560px] overflow-hidden rounded-md border border-border">
      <HomeLaunchPad
        groups={GROUPS}
        pinnedIds={pins}
        onTogglePin={togglePin}
        onOpen={() => {}}
        title="FAMS"
        onInbox={() => {}}
        inboxDot
        onMinimize={() => {}}
        wavePattern={WAVE}
        poweredBy={<span className="text-sm font-extrabold tracking-tight text-foreground">FAMS</span>}
      />
    </div>
  )
}

/**
 * HomeLaunchPadDemo — the launch-pad Home surface, ported from the
 * designer-approved home + side nav prototype.
 */
export default function HomeLaunchPadDemo() {
  return (
    <DocPage
      title="HomeLaunchPad"
      badge="stable"
      summary="Launch-pad Home: tenant header, local module search, pinned Favorites grid, and modules grouped by application — metadata-driven, with locally-persisted pins."
    >
      <DocSection id="examples" title="Examples">
        <Prose>
          The 60px top bar (40px side margins) is page chrome — the tenant lockup on the leading
          edge, inbox then minimize on the trailing edge — so it never scrolls away. Hover a tile to
          reveal its star pin toggle; pins persist via <Code>usePinnedIds</Code> (localStorage).
          Typing in the search live-filters the groups and hides Favorites. The bottom wave is a{' '}
          <Code>wavePattern</Code> asset used as a CSS mask, tinted from the tenant primary at 15%.
        </Prose>
        <PadPreview />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'groups', type: 'LaunchPadGroup[]', description: 'Modules grouped by application — derive from tenant applications × resolved nav entries, never a hardcoded catalog.' },
            { prop: 'pinnedIds / onTogglePin', type: 'string[] / (id) => void', description: 'Pin state — persistence is the host’s (see usePinnedIds).' },
            { prop: 'onOpen', type: '(id: string) => void', description: 'Open a module (navigate to its route).' },
            { prop: 'logo / title', type: 'ReactNode / string', description: 'Tenant lockup on the leading edge of the 60px top bar.' },
            { prop: 'onBack / onInbox / inboxDot', type: '() => void / () => void / boolean', description: 'Sticky back affordance, top-bar inbox button and its unread dot.' },
            { prop: 'onMinimize', type: '() => void', description: 'Minimize back to the rail\'s anchored app-switcher popup — the launch pad is the switcher\'s EXPANDED state, not a separate destination. Omit to hide.' },
            { prop: 'wavePattern', type: 'string', description: 'URL of the bottom wave asset. Used as a CSS mask tinted from the tenant primary at 15%, so one asset serves every tenant. Omit for no wave.' },
            { prop: 'searchPlaceholder', type: 'string', description: 'Search input placeholder (default "Search modules…").' },
            { prop: 'poweredBy', type: 'ReactNode', description: 'White-label attribution — a muted "Powered by" caption plus this node, centred at the very end of the scroll content. Pass the same node the rail\'s poweredBy gets. Omit to hide (the V5 core fams tenant never supplies it).' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Render it at the index route WITHOUT the rail — the launch pad IS the launcher.',
            'Wire onMinimize to record the "popup" switcher preference (useAppSwitcherPreference) and route back with the grid open.',
            'Pass wavePattern as an asset URL per tenant — never bake a colour into the asset; the mask takes its tint from the primary token.',
            'Cycle accentColor from tokens per application index (chart accents) — never hardcoded hex.',
          ]}
          donts={[
            "Don't hand it a hardcoded module catalog — it must derive from tenant metadata.",
            "Don't persist pins server-side silently — the contract is local, per-user, per-device.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every tile is a labelled button ("Open X"); the star toggle carries aria-pressed and appears on keyboard focus, not just hover.',
            'Search input is labelled; clear button has an accessible name; empty states are polite dead-ends.',
            'Entrance animations respect prefers-reduced-motion.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
