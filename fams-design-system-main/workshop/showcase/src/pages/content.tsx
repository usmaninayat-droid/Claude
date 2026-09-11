import { DocPage, DocSection, Prose, CodeBlock, Guidelines, A11yList, PropsTable, Code, DevNote } from '../docs'

/* ─────────────────────────── Overview ─────────────────────────── */

export function Introduction() {
  return (
    <DocPage
      title="FAMS Design System"
      summary="One component library and one token source for the FAMS platform. The workshop and the documentation in one place."
    >
      <DocSection id="what" title="What this is">
        <Prose>
          The design system for FAMS. <Code>@fams/tokens</Code> are the framework-agnostic spine;
          the components (<Code>@fams/ui-kit</Code>) are built on top. Everything here is rendered
          by the real components.
        </Prose>
      </DocSection>
      <DocSection id="pillars" title="How it's organised">
        <Prose>
          <b>Foundations</b> — the token layer (colour, type, spacing, theming).{' '}
          <b>Guidelines</b> — how to use the system well.{' '}
          <b>Components</b> — every component with preview, usage, props, guidelines and
          accessibility.{' '}
          <b>Developers</b> — how to consume the package and the engineering rules.
        </Prose>
      </DocSection>
      <DocSection id="principles-preview" title="Principles at a glance">
        <A11yList
          items={[
            'Tokens are the single source of truth — never a hardcoded hex or px.',
            'Accessibility is built in, not added — every interactive component passes axe.',
            'RTL is first-class — Arabic is a supported locale everywhere.',
            'One component, no per-tenant forks — tenants differ only via tokens.',
            'Components are state-agnostic presenters — data and state live in the app.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

export function Installation() {
  return (
    <DocPage title="Installation" summary="Add the design system to a product app as a versioned package.">
      <DocSection id="registry" title="1. Point @fams at the private registry">
        <CodeBlock lang="ini" code={`# .npmrc\n@fams:registry=https://npm.fams.dev`} />
      </DocSection>
      <DocSection id="install" title="2. Install">
        <CodeBlock code={`pnpm add @fams/ui-kit @fams/tokens`} />
        <Prose>
          Peer dependencies: React 19 and Tailwind CSS v4. Until the registry is live, a packaged
          tarball (<Code>file:</Code>) can serve the first wiring — a real package artifact, not a
          source symlink.
        </Prose>
      </DocSection>
      <DocSection id="css" title="3. Load the tokens stylesheet">
        <CodeBlock lang="css" code={`/* app entry css */\n@import "tailwindcss";\n@import "@fams/tokens/theme.css";\n@import "@fams/ui-kit/tailwind.css";`} />
      </DocSection>
    </DocPage>
  )
}

export function QuickStart() {
  return (
    <DocPage title="Quick start" summary="Render your first themed component in under a minute.">
      <DocSection id="tenant" title="1. Set the tenant on the shell root">
        <Prose>
          Theming is entirely token-driven. Set <Code>data-tenant</Code> once on the root; every
          component re-themes with no per-component change.
        </Prose>
        <CodeBlock lang="html" code={`<html data-tenant="iwmp"> … </html>`} />
      </DocSection>
      <DocSection id="use" title="2. Use a component">
        <CodeBlock
          lang="tsx"
          code={`import { Button } from '@fams/ui-kit'

export function Toolbar() {
  return <Button onClick={createPlan}>New plan</Button>
}`}
        />
      </DocSection>
      <DocSection id="next" title="Next">
        <Prose>
          Browse the <b>Components</b> section for every component with live states and copyable
          usage, or read <b>Developers → Component API contract</b> for the conventions all
          components share.
        </Prose>
      </DocSection>
    </DocPage>
  )
}

/* ─────────────────────────── Foundations ─────────────────────────── */

export function Principles() {
  return (
    <DocPage
      title="Design principles"
      summary="The load-bearing rules that keep the system coherent as many hands (and agents) add to it."
    >
      <DocSection id="tokens" title="Tokens are the single source of truth">
        <Prose>
          Every visual value is a token. A component never hardcodes a hex, px or font — it uses a
          Tailwind utility backed by <Code>@fams/tokens</Code> (<Code>bg-primary</Code>,{' '}
          <Code>rounded-sm</Code>). A new visual value is a new token, not an inline value.
        </Prose>
      </DocSection>
      <DocSection id="a11y" title="Accessibility is built in">
        <Prose>
          Components are built on Radix primitives; every interactive component passes axe and targets
          WCAG 2.2 AA. Accessibility is a property of the component, not something the consumer adds.
        </Prose>
      </DocSection>
      <DocSection id="rtl" title="RTL is first-class">
        <Prose>
          Arabic is a supported locale. Components use logical properties only (<Code>ms-</Code>,{' '}
          <Code>text-start</Code>) — never <Code>ml-</Code>/<Code>text-left</Code> — so they mirror
          correctly. Toggle RTL in the top bar to verify.
        </Prose>
      </DocSection>
      <DocSection id="no-forks" title="One component, no per-tenant forks">
        <Prose>
          Tenants differ only through tokens and <Code>data-tenant</Code>. There is never a
          per-tenant copy of a component. Switch tenant in the top bar to see every component
          re-theme live.
        </Prose>
      </DocSection>
      <DocSection id="state-agnostic" title="Components are state-agnostic presenters">
        <Prose>
          A component takes data and callbacks via props. It never fetches, never holds global state,
          never routes — that is the application layer. See <b>Developers → State & performance</b>.
        </Prose>
      </DocSection>
    </DocPage>
  )
}

const LAYERS = [
  { layer: 'L0 · Tokens', folder: '@fams/tokens', examples: 'color, type, radius, semantic spacing' },
  { layer: 'L1 · Primitives', folder: 'primitives/', examples: 'Button, Input, Select, Tabs, Dialog, Popover, Tooltip' },
  { layer: 'L2 · Layout', folder: 'layout/', examples: 'Stack, FormGrid, FormSection, Toolbar' },
  { layer: 'L3 · Composites', folder: 'composites/', examples: 'DataTable, FilterPanel, Combobox, StatusView' },
  { layer: 'L4 · Shells', folder: 'shells/', examples: 'AppShell, ListView, HybridView, ProfileLayout' },
]

/** A compact reference table for the L0–L4 layer model — same visual language as PropsTable. */
function LayerTable() {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-start text-body-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-caption uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-2.5 text-start font-semibold">Layer</th>
            <th className="px-4 py-2.5 text-start font-semibold">Folder</th>
            <th className="px-4 py-2.5 text-start font-semibold">Examples</th>
          </tr>
        </thead>
        <tbody>
          {LAYERS.map((row) => (
            <tr key={row.layer} className="border-b border-border align-top transition-colors last:border-0 hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-3.5 font-medium text-foreground">{row.layer}</td>
              <td className="whitespace-nowrap px-4 py-3.5 font-mono text-caption text-primary">{row.folder}</td>
              <td className="px-4 py-3.5 leading-relaxed text-muted-foreground">{row.examples}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Layers() {
  return (
    <DocPage
      title="Layers & boundaries"
      summary="Where a decision belongs — and why a design system that only has buttons and inputs doesn't actually solve the spacing, tabs, or searchable-dropdown problem."
    >
      <DocSection id="rule" title="The rule">
        <Prose>
          <b>The design system owns every decision that should not be re-made per developer.
          The application owns every decision that legitimately varies per feature.</b> The gap
          between two form fields is not a feature decision — no client ever asked for 12px vs
          16px — so the system owns it. Which tabs a vehicle profile shows <em>is</em> a feature
          decision, so the app owns it, as data.
        </Prose>
        <Prose>Run these three questions, in order, for any component candidate:</Prose>
        <A11yList
          items={[
            'Does it fetch, store, or route? → Application (Rule 8 — state-agnostic presenters).',
            'Would a second FAMS product use it unchanged if handed different data? → Design system.',
            'Is it a visual or behavioral decision a developer would otherwise make ad-hoc? → Design system.',
          ]}
        />
        <DevNote>
          The boundary often runs <em>through</em> a component, not between components: the{' '}
          <Code>Combobox</Code> presenter is design-system; the entity fetcher feeding it (
          <Code>useEntityPicker</Code>) is application. Split there, always.
        </DevNote>
      </DocSection>

      <DocSection id="layers" title="Five layers, one folder each">
        <Prose>
          The repo structure <em>is</em> the mental model — no separate mapping to remember.
          Four application-side layers sit opposite these: hooks (fetch/debounce/cache),
          containers (which API, auth, routing), manifests (composition as data — tab sets,
          column sets), and domain UI (the feature's own panel bodies).
        </Prose>
        <LayerTable />
      </DocSection>

      <DocSection id="why-atoms-fail" title="Why atoms-only fails">
        <Prose>
          Buttons were never the problem. An audit of the v5 (Vue) codebase this system replaces
          found the chaos living entirely in the middle layers — exactly the ones a
          buttons-and-inputs-only design system leaves unbuilt:
        </Prose>
        <A11yList
          items={[
            'No L2 (layout): 4,653 scattered spacing utility classes plus 2,468 inline styles (602 with literal margin/padding) — a spacing scale existed and nothing forced its use.',
            'No L1 Tabs as a real primitive: raw tab markup hand-rolled in 45 files; one 781-line profile component contained two different, competing tab mechanisms at once.',
            'No L3 Combobox: ~20 forked searchable-dropdown implementations, several byte-for-byte identical across tenants, each re-implementing search, async loading, and display columns.',
            'No L4 shell + manifest: 31 hand-rolled profile components across 3 tenant packages — composition (which tabs, in what order) encoded as copied source, not data.',
          ]}
        />
      </DocSection>

      <DocSection id="per-layer" title="Pattern vs. anti-pattern, per layer">
        <div>
          <h3 className="mb-3 text-body-md font-semibold text-foreground">L1 — Primitives</h3>
          <Guidelines
            dos={['One canonical primitive per interaction concept (Tabs, Dialog, Popover…).', 'Variants via a variant/size prop, matching Figma names.']}
            donts={['Reaching past the design system to the underlying library (raw Radix) in feature code.']}
          />
        </div>
        <div>
          <h3 className="mb-3 text-body-md font-semibold text-foreground">L2 — Layout</h3>
          <Guidelines
            dos={['Spacing between components comes only from Stack / FormGrid / FormSection / Toolbar.', 'Gap props accept only semantic presets (gap="field") — never a number.']}
            donts={['Per-developer margins, space-x-*, or padding-arbitrary values in feature code.']}
          />
        </div>
        <div>
          <h3 className="mb-3 text-body-md font-semibold text-foreground">L3 — Composites</h3>
          <Guidelines
            dos={['Three variation axes: behavior → props, content → render slots, data → an app hook.', 'Every data surface renders all its states (loading/empty/error/no-permission).']}
            donts={['Per-use-case boolean flags (isVehiclePicker) instead of a slot or hook.', 'A composite fetching its own data.']}
          />
        </div>
        <div>
          <h3 className="mb-3 text-body-md font-semibold text-foreground">L4 — Shells</h3>
          <Guidelines
            dos={['Shells own chrome (header, tab strip, drawer mechanics); slots own content.', 'Composition (tab sets, column sets) is app-side data — a manifest, not a fork.']}
            donts={['A shell with domain opinions (a ProfileLayout that knows about bins) — it becomes a fork magnet the moment a second entity needs it.']}
          />
        </div>
      </DocSection>

      <DocSection id="promotion" title="Scenario coverage: harvest, don't enumerate">
        <Prose>
          Don't attempt an a-priori scenario matrix — it overcomplicates the system and still
          misses reality. The platform's existing screens already ran the experiment: they{' '}
          <em>are</em> the requirements document.
        </Prose>
        <A11yList
          items={[
            '1. A component is born in feature code. It stays there.',
            '2. Needed a second time → promoted to a shared app-level component. Watch it.',
            '3. Needed a third time, or by a second product → promoted to the design system, generalizing only the variation the three real uses demonstrated.',
          ]}
        />
      </DocSection>

      <DocSection id="governance" title="Governance">
        <A11yList
          items={[
            'This app is the contract — if a state isn’t demoed here, it doesn’t exist.',
            'No business vocabulary in shared component props (options, not vehicleType).',
            'Deprecate, don’t break — semver, deprecated aliases kept one minor cycle.',
            'Consume, don’t fork — versioned package, never the shadcn copy-registry model.',
          ]}
        />
        <Prose>
          Full doctrine with file-and-line evidence: <Code>docs/BOUNDARIES.md</Code> in the
          repo. This page is the same rules, written for reading rather than enforcing.
        </Prose>
      </DocSection>
    </DocPage>
  )
}

export function Theming() {
  return (
    <DocPage title="Theming & tenants" summary="How one component set serves every FAMS tenant.">
      <DocSection id="how" title="How it works">
        <Prose>
          Base tokens live in <Code>@fams/tokens</Code>. Per-tenant overrides (FAMS, Tadweer/IWMP,
          EAD, UCCP, DMT, MM) are emitted by Style Dictionary as <Code>[data-tenant='…']</Code> blocks. Set the
          attribute on the shell root and the whole tree re-themes.
        </Prose>
        <CodeBlock lang="css" code={`:root { --color-primary: … }              /* base */\n[data-tenant='mm'] { --color-primary: … }  /* tenant override */`} />
      </DocSection>
      <DocSection id="assets" title="Logos & brand assets">
        <Prose>
          Logos and brand name come from a per-tenant config surfaced via the <Code>Logo</Code> and{' '}
          <Code>Icon</Code> components — never hardcoded into a component.
        </Prose>
      </DocSection>
    </DocPage>
  )
}

/* ─────────────────────────── Guidelines ─────────────────────────── */

export function ContentVoice() {
  return (
    <DocPage title="Content & voice" summary="Words are design material. Write to help the person navigate, not to decorate.">
      <DocSection id="rules" title="The rules">
        <Guidelines
          dos={[
            'Sentence case for labels and headings.',
            'Active voice — a control says what it does: “Save changes”.',
            'Keep the same verb through a flow: a “Publish” button produces a “Published” toast.',
            'Name things by what the user controls, not how the system is built.',
          ]}
          donts={[
            'Don’t use title case or ALL CAPS for UI copy.',
            'Don’t apologise in errors — say what happened and how to fix it.',
            'Don’t be clever at the cost of clarity — specific beats witty.',
            'Don’t leave empty states blank — make them an invitation to act.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

export function AccessibilityGuide() {
  return (
    <DocPage title="Accessibility" summary="The system's WCAG 2.2 AA commitment and how it's enforced.">
      <DocSection id="commit" title="What's guaranteed">
        <A11yList
          items={[
            'Built on Radix primitives — focus management and ARIA come from the primitive layer.',
            'Every interactive component passes axe; a11y is a merge gate, not an afterthought.',
            'Visible keyboard focus everywhere; focus rings are never removed.',
            'Colour contrast meets AA in every variant across all tenants.',
            'RTL supported via logical properties; layouts mirror correctly.',
          ]}
        />
      </DocSection>
      <DocSection id="author" title="When you author a component">
        <Prose>
          Start from a Radix/Reka primitive rather than a div. Give icon-only controls an{' '}
          <Code>aria-label</Code>. Test with keyboard only, and add an axe assertion to the
          component's test.
        </Prose>
      </DocSection>
    </DocPage>
  )
}

export function Contributing() {
  return (
    <DocPage title="Contributing" summary="How design and engineering add a component — and when it's done.">
      <DocSection id="dod" title="Definition of done">
        <Prose>A component is not done until all of the following hold:</Prose>
        <A11yList
          items={[
            'Implementation covers every variant and size in the design.',
            'Tokens only — no hardcoded hex/px/font.',
            'RTL-safe — logical properties only.',
            'Accessible — built on a primitive; passes axe.',
            'Has a Vitest test (render + behaviour + key states).',
            'Has a live demo here in the showcase (states + an RTL example).',
            'Exported from src/index.ts.',
            'State-agnostic and render-safe — no data fetching or global store; memoizable.',
          ]}
        />
      </DocSection>
      <DocSection id="layout" title="Where it lives">
        <Prose>
          Component and test sit together under <Code>packages/ui-kit/src/</Code>, in the
          folder matching its layer (<Code>primitives/</Code>, <Code>layout/</Code>,{' '}
          <Code>composites/</Code>, <Code>shells/</Code>) — e.g.{' '}
          <Code>primitives/Button.tsx</Code> + <Code>primitives/Button.test.tsx</Code>. Then add
          its demo here in <Code>workshop/showcase</Code>: a new page under{' '}
          <Code>pages/</Code> for a flagship component, or a section in an existing gallery page
          under <Code>showcase/</Code>.
        </Prose>
      </DocSection>
    </DocPage>
  )
}

export function TextTruncation() {
  return (
    <DocPage
      title="Text truncation"
      summary="How identifiers and descriptive text behave in a table or list cell when a column runs out of room — and how the table itself responds when the whole panel runs out of room."
    >
      <DocSection id="principle" title="The headline rule">
        <Prose>
          A user must always be able to tell rows apart. A value may be shown incomplete, but the
          part of it that makes the row unique must stay visible. Full rationale and the
          stakeholder reconciliation live in <Code>docs/guidelines/text-truncation.md</Code>; the
          three rules below, plus column expansion and responsive column behavior further down
          this page, are all implemented — see{' '}
          <a className="text-primary underline underline-offset-2" href="#/data/table/data-table">
            DataTable → Column content types
          </a>
          ,{' '}
          <a className="text-primary underline underline-offset-2" href="#/data/table/data-table">
            → Column expansion
          </a>
          ,{' '}
          <a className="text-primary underline underline-offset-2" href="#/data/table/data-table">
            → Responsive column behavior
          </a>{' '}
          and{' '}
          <a className="text-primary underline underline-offset-2" href="#/data/table/data-table">
            → Narrow layout
          </a>{' '}
          for the live versions.
        </Prose>
        <Guidelines
          dos={[
            'Fixed-length identifiers (plate, IMEI) — never truncate. Column width = the max code length.',
            'Variable-length identifiers (names) — wrap up to 2 lines; middle-truncate only beyond that.',
            'Descriptive text (address, notes) — end-truncate, but always with one-gesture full-value access.',
          ]}
          donts={[
            'Never end-truncate an identifier — the differentiating part is as likely to sit at the end.',
            'Never let a column grow unbounded just to avoid wrapping a long composite name.',
            'Never truncate descriptive text without a hover/focus tooltip (desktop) or tap (touch).',
          ]}
        />
      </DocSection>

      <DocSection id="column-expansion" title="Column expansion">
        <Prose>
          The original product guidance: on mobile, double-tap a column to expand it and see its
          full values. Reconciled with a stakeholder's ask for an equivalent on web — expansion is
          not a mobile-only affordance.
        </Prose>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-6">
            <div className="mb-3 text-body-sm font-semibold text-foreground">Touch — double-tap</div>
            <ul className="flex flex-col gap-2.5 text-body-sm leading-relaxed text-muted-foreground">
              <li>Double-tap a column (header or cells) to expand it to its full-content width.</li>
              <li>
                Every other visible column compresses to its minimum width, in the same
                left-to-right order, to make room — none are hidden, only compressed (and further
                clipped by their own <Code>contentType</Code> rule).
              </li>
              <li>
                Double-tap the expanded column again, or tap any other column, to collapse it back
                and restore the rest.
              </li>
              <li>Only one column is expanded at a time.</li>
            </ul>
          </div>
          <div className="rounded-md border border-border bg-card p-6">
            <div className="mb-3 text-body-sm font-semibold text-foreground">
              Web — click-to-expand / drag-resize
            </div>
            <ul className="flex flex-col gap-2.5 text-body-sm leading-relaxed text-muted-foreground">
              <li>
                A small expand affordance at the column header edge (alongside the existing{' '}
                <Code>ColumnCustomizer</Code> "Columns" control) toggles the same expand/collapse
                behavior on click.
              </li>
              <li>
                Pointer users additionally get the standard drag-to-resize column border —
                expand-to-full-content is the one-click shortcut, drag is the fine-grained version.
              </li>
              <li>
                Same collapse rule as touch: expanding one column compresses the others rather than
                triggering the table's horizontal scroll first.
              </li>
            </ul>
          </div>
        </div>
        <DevNote title="Implemented">
          Both interactions ship in <Code>DataTable</Code> today via a controlled{' '}
          <Code>expandedColumnKey</Code> / <Code>onExpandedColumnChange</Code> pair, mirroring the
          controlled-prop pattern <Code>selectionMode</Code> / <Code>selectedIds</Code> /{' '}
          <Code>onSelectionChange</Code> already uses — see{' '}
          <a className="text-primary underline underline-offset-2" href="#/data/table/data-table">
            DataTable → Column expansion
          </a>{' '}
          for the live version, including the drag/keyboard-resizable column border (APG "Window
          Splitter": <Code>role=&quot;separator&quot;</Code>, arrow-key resize).
        </DevNote>
      </DocSection>

      <DocSection id="responsive-columns" title="Mobile responsive column behavior">
        <Prose>
          Below a defined viewport width, columns don't all fit — even before considering per-cell
          truncation. Which ones give way first follows the same priority that already governs
          in-row width allocation via <Code>DataTable</Code>'s <Code>contentType</Code>:
        </Prose>
        <ol className="flex flex-col gap-3">
          {[
            [
              '1 — stays visible longest: fixed-content / fixed-id',
              'Status, speed, timestamps, plates, IMEI. Bounded width, carries the row’s identity — hidden last, if ever.',
            ],
            [
              '2 — hides next: variable-id',
              'Names, incl. long composites. Wraps to 2 lines as long as there’s room; collapses/hides only once the fixed columns alone can’t fit.',
            ],
            [
              '3 — hides first: descriptive',
              'Addresses, notes. Already the only content type allowed to lose information (via truncation) at full width, so it is also the first dropped from the column set on a narrow viewport — its content is never load-bearing for telling rows apart.',
            ],
          ].map(([title, body]) => (
            <li key={title} className="rounded-md border border-border bg-card p-4">
              <div className="text-body-sm font-semibold text-foreground">{title}</div>
              <div className="mt-1 text-body-sm leading-relaxed text-muted-foreground">{body}</div>
            </li>
          ))}
        </ol>
        <Prose>
          This is a DEFAULT layered on top of the existing explicit <Code>hiddenColumnKeys</Code>/
          <Code>ColumnCustomizer</Code> model, never inside it — an auto-hidden column is still
          "visible" in that model, so hiding another (lower-priority) column via the customizer to
          free up space is what brings it back; narrowing the viewport changes the defaults, not
          what's possible to show. Below the width where even the surviving columns can't read as a
          row (e.g. a list beside a map), switch to <Code>layout="stacked"</Code> yourself at that
          breakpoint — both layouts read the same <Code>columns</Code>/<Code>data</Code>, so this
          composes with a caller's own responsive breakpoints instead of DataTable silently
          overriding an explicit <Code>layout</Code> prop.
        </Prose>
        <DevNote title="Implemented">
          Viewport-driven hide order (steps 1–3 above) ships in <Code>DataTable</Code> today — see{' '}
          <a className="text-primary underline underline-offset-2" href="#/data/table/data-table">
            DataTable → Responsive column behavior
          </a>{' '}
          for the live version. It measures the table's own scroll container (via{' '}
          <Code>ResizeObserver</Code>) rather than the raw viewport, so it composes correctly inside
          a fixed-width card or a split panel, not just a full-bleed page table. The automatic{' '}
          <Code>layout="table"</Code> → <Code>layout="stacked"</Code> handoff mentioned above is a
          deliberate exception — see Open items below.
        </DevNote>
      </DocSection>

      <DocSection id="api" title="Implemented API today">
        <Prose>
          What <Code>DataTable</Code> already does, mapped against this guideline — full live
          examples on the{' '}
          <a className="text-primary underline underline-offset-2" href="#/data/table/data-table">
            DataTable page
          </a>
          .
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'column.contentType',
              type: "'fixed-id' | 'variable-id' | 'descriptive' | 'fixed-content'",
              description:
                'Per-column width/wrap/truncation behavior — implements rules 1–3 above. Implemented.',
            },
            {
              prop: 'layout',
              type: "'table' | 'stacked'",
              default: "'table'",
              description:
                'The narrow-panel stacked row shape (identifier line + folded "label: value" line). Implemented — flagged in code as still under stakeholder debate, matching the open item below.',
            },
            {
              prop: 'stackedIdentifierKey',
              type: 'string',
              description:
                "Which column renders on the stacked row's own first line. Implemented, layout=\"stacked\" only.",
            },
            {
              prop: 'selectionMode',
              type: "'checkbox' | 'radio'",
              default: "'checkbox'",
              description:
                'Not a truncation control — cited here as the existing controlled-prop naming convention expandedColumnKey follows.',
            },
            {
              prop: 'expandedColumnKey / onExpandedColumnChange',
              type: 'string | null / (key: string | null) => void',
              description:
                'Implemented. Double-tap (touch) / click-to-expand + drag/keyboard-resize (web) column expansion — see Column expansion above.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="open" title="Open items">
        <div className="rounded-md border border-warning/25 bg-warning/5 p-6">
          <ul className="flex flex-col gap-2.5">
            {[
              'Narrow-panel row shape: layout="stacked" (recommended, implemented) vs. a dissenting stakeholder’s "apply the same column rules everywhere, no special case" — needs sign-off.',
              'Wrap/truncation threshold: re-specify as a pixel max-width rather than a character count (font/script-dependent) — needs a design QA pass.',
              'Whether middle-truncation (beyond 2-line wrap) ever fires on real data, or 2-line wrap alone covers it — needs a production name-length audit.',
              'Automatic layout="table" → layout="stacked" handoff at a width threshold (§8\'s "constraint on the eventual implementation, not something already reconciled") is deliberately NOT wired automatically — layout="stacked" itself is still the first open item above, and auto-overriding a caller\'s explicit layout prop would fight DataTable\'s state-agnostic contract; callers switch it themselves at their own breakpoint today.',
              'Responsive column hiding does not yet expose a way to force-show an auto-hidden column below its floor width (e.g. to opt into horizontal scroll instead) — the ColumnCustomizer\'s checked state reflects the explicit visibility model, not the auto-hide layer, so there is no dedicated "show anyway" toggle for it today.',
            ].map((i) => (
              <li key={i} className="text-body-sm leading-relaxed text-foreground">
                {i}
              </li>
            ))}
          </ul>
        </div>
      </DocSection>
    </DocPage>
  )
}

/* ─────────────────────────── Developers ─────────────────────────── */

export function Consuming() {
  return (
    <DocPage title="Consuming the package" summary="Products depend on the design system as a versioned package — consume, don't fork.">
      <DocSection id="model" title="The model">
        <Prose>
          The design system publishes versioned packages (<Code>@fams/ui-kit</Code>,{' '}
          <Code>@fams/tokens</Code>) to a private registry. A product app declares them as
          dependencies and updates by version bump. No source is copied; nothing is forked. This is
          deliberately not the shadcn registry-copy model and not a git submodule.
        </Prose>
      </DocSection>
      <DocSection id="steps" title="In a product app">
        <CodeBlock code={`# .npmrc → @fams:registry=https://npm.fams.dev\npnpm add @fams/ui-kit@^1 @fams/tokens@^1`} />
        <CodeBlock lang="tsx" code={`import { Button, DataTable } from '@fams/ui-kit'\n// set data-tenant on the shell root; import @fams/tokens/theme.css once`} />
      </DocSection>
    </DocPage>
  )
}

export function ApiContract() {
  return (
    <DocPage title="Component API contract" summary="The conventions every component follows, so they all feel identical to use.">
      <DocSection id="conventions" title="Conventions">
        <PropsTable
          rows={[
            { prop: 'variant', type: 'string union', description: 'Visual style; names match Figma. Never numeric.' },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'String scale, never numeric pixel values.' },
            { prop: 'loading', type: 'boolean', description: 'Async pending state (spinner + disabled).' },
            { prop: 'disabled', type: 'boolean', description: 'Native disabled — prefer over a custom prop.' },
            { prop: 'hasError', type: 'boolean', description: 'Invalid state on inputs.' },
            { prop: 'asChild', type: 'boolean', description: 'Polymorphism via Base UI useRender (Radix Slot only in grandfathered files, decision #7).' },
            { prop: 'className', type: 'string', description: 'Always passed through and merged with cn().' },
          ]}
        />
      </DocSection>
      <DocSection id="rules" title="Rules">
        <A11yList
          items={[
            'forwardRef on every component; native element props extend through.',
            'Variants via class-variance-authority; classes merged with cn() (clsx + tailwind-merge).',
            'A data-slot attribute on the root for styling hooks.',
            'Compound components export named parts (CardHeader, CardContent…).',
            'No cross-package reach-ins; consumers import only from the @fams/ui-kit barrel.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

export function StatePerformance() {
  return (
    <DocPage
      title="State & performance"
      summary="Where state lives, and how the design system keeps a beautiful UI from becoming a slow one."
    >
      <DocSection id="boundary" title="The boundary">
        <Prose>
          The design system is presentation only. State management (Zustand / Pinia), server cache
          (TanStack Query), realtime (SSE) and offline (Dexie) are the <b>application layer</b>, not
          the design system. Components take data + callbacks via props; the app maps API responses to
          those props in a container.
        </Prose>
      </DocSection>
      <DocSection id="render" title="Rendering discipline (what the DS owns)">
        <A11yList
          items={[
            'Pure presenters — no internal global state, no data fetching.',
            'Memoizable — stable prop identities; no new object/array/function per render.',
            'Virtualization built into data-heavy components (DataTable, long lists) — never render 60k rows.',
            'Patch, don’t re-render, for high-frequency data — the map updates via layer setData, not a re-render per GPS tick.',
          ]}
        />
        <DevNote>
          Choosing the right libraries does not by itself make an app fast. At IWMP scale (≈15k live
          markers, 60k bins, 100k-row tables) the discipline above is what decides fast-versus-slow.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}

export function Testing() {
  return (
    <DocPage title="Testing & Definition of Done" summary="Every component ships tested; guardrails are enforced, not hoped for.">
      <DocSection id="stack" title="The stack">
        <Prose>
          Vitest + Testing Library per component, with an axe assertion on interactive components.
          Tests are colocated next to the component and its story. Visual regression is added once the
          system stabilises.
        </Prose>
        <CodeBlock code={`pnpm --filter @fams/ui-kit test\npnpm --filter @fams/ui-kit typecheck`} />
      </DocSection>
      <DocSection id="verify" title="Verify before finishing">
        <Prose>
          A change is not done until tests and typecheck are green and, for UI, the story renders. See{' '}
          <b>Guidelines → Contributing</b> for the full Definition of Done.
        </Prose>
      </DocSection>
    </DocPage>
  )
}
