import { WallPanel, WallStatBar, WallKpiCard, usePrefersReducedMotion } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * WallDisplayDemo — showcase for the always-dark wall-display family
 * (`WallPanel`, `WallStatBar`, `WallKpiCard`), the surface the Command Center
 * is built from.
 *
 * Every example sits on a `bg-wall-bg` stage: these components read the
 * separate `--color-wall-*` token scope and are unreadable on the light
 * canvas the rest of the showcase uses, which is the point — a wall display
 * is its own always-dark surface, not a dark-mode variant of a light screen.
 */
export default function WallDisplayDemo() {
  const animate = !usePrefersReducedMotion()
  return (
    <DocPage
      title="Wall display"
      badge="stable"
      summary="The always-dark operations-wall surface: floating glass panels, count-up KPI cards and proportion bars, painted on the separate --color-wall-* scope so they never flip with data-theme."
    >
      <DocSection id="kpis" title="KPI cards">
        <Prose>
          <Code>WallKpiCard</Code> counts its value up on mount (pass{' '}
          <Code>animate={'{!usePrefersReducedMotion()}'}</Code>) and pins the sub-line to the card
          foot so a row of cards stays aligned.
        </Prose>
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-wall-bg p-4 md:grid-cols-4">
          <WallKpiCard label="Open requests" value={128} sub="+12 since 06:00" color="#F79009" animate={animate} />
          <WallKpiCard label="Tankers moving" value={34} sub="of 41 in service" color="#12B76A" animate={animate} />
          <WallKpiCard label="Breaches" value={3} sub="SLA at risk" color="#F04438" animate={animate} />
          <WallKpiCard label="Stations reporting" value={22} sub="all zones" color="#2E90FA" animate={animate} />
        </div>
      </DocSection>

      <DocSection id="panel" title="Panel + stat bars">
        <Prose>
          <Code>WallPanel</Code> is the glass card everything else sits in; <Code>WallStatBar</Code>{' '}
          is one labelled proportion row. The bar colour is caller-owned — no single token can carry
          &ldquo;severity&rdquo; vs &ldquo;stage&rdquo; vs &ldquo;status&rdquo;.
        </Prose>
        <div className="grid gap-4 rounded-xl bg-wall-bg p-4 md:grid-cols-2">
          <WallPanel title="Requests by priority" hint="last 24h">
            <div className="flex flex-col gap-2">
              <WallStatBar label="Critical" value={8} max={64} color="#F04438" />
              <WallStatBar label="High" value={21} max={64} color="#F79009" />
              <WallStatBar label="Normal" value={64} max={64} color="#2E90FA" />
              <WallStatBar label="Low" value={12} max={64} color="#12B76A" />
            </div>
          </WallPanel>
          <WallPanel title="Fleet readiness" hint="live">
            <div className="flex flex-col gap-2">
              <WallStatBar label="Moving" value={34} max={41} color="#12B76A" />
              <WallStatBar label="Idling" value={5} max={41} color="#F79009" />
              <WallStatBar label="Stopped" value={2} max={41} color="#F04438" />
            </div>
          </WallPanel>
        </div>
      </DocSection>

      <DocSection id="unpadded" title="Full-bleed body">
        <Prose>
          Set <Code>padded={'{false}'}</Code> when the body is edge-to-edge — a map, a chart that
          paints its own gutters.
        </Prose>
        <div className="rounded-xl bg-wall-bg p-4">
          <WallPanel title="Live map" hint="Doha" padded={false}>
            <div className="flex h-32 items-center justify-center rounded-b-xl bg-wall-panel-solid text-wall-stat text-wall-ink-faint">
              full-bleed body — no horizontal padding
            </div>
          </WallPanel>
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'WallPanel · title', type: 'ReactNode', description: 'Small all-caps caption. Omit for a chrome-less panel.' },
            { prop: 'WallPanel · hint', type: 'ReactNode', description: 'Right-aligned secondary caption. Only rendered alongside a title.' },
            { prop: 'WallPanel · padded', type: 'boolean', default: 'true', description: 'Set false for an edge-to-edge body.' },
            { prop: 'WallStatBar · value / max', type: 'number', description: 'Proportion filled. A max of 0 renders an empty track, never a divide-by-zero.' },
            { prop: 'WallStatBar · color', type: 'string', description: 'Fill colour — caller-owned semantics.' },
            { prop: 'WallKpiCard · sub', type: 'string', description: 'Secondary line pinned to the card foot.' },
            { prop: 'WallKpiCard · animate', type: 'boolean', description: 'Count up on mount. Pass !usePrefersReducedMotion().' },
          ]}
        />
      </DocSection>

      <Guidelines
        dos={[
          'Put these on their own dark stage (bg-wall-bg) — they are unreadable on the light canvas.',
          'Pass animate={!usePrefersReducedMotion()} so the count-up respects the OS setting.',
          'Use useWallClock({ timeZone }) for the header clock so it ticks rather than freezing.',
        ]}
        donts={[
          'Do not use these as a dark-mode variant of a light screen — they never flip with data-theme.',
          'Do not reach for bg-card / border-border here; the wall scope is deliberately separate.',
          'Do not hand WallStatBar a max of 0 expecting a full bar — it renders empty by design.',
        ]}
      />

      <A11yList
        items={[
          'The KPI status dot is aria-hidden — colour alone carries no meaning, the label and sub-line do.',
          'Long labels truncate with a title attribute, so the full text stays available on hover and to assistive tech.',
          'Count-up is suppressed entirely under prefers-reduced-motion; the final value renders immediately.',
        ]}
      />
    </DocPage>
  )
}
