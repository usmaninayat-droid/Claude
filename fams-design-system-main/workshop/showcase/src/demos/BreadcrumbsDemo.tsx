import { Breadcrumbs } from '../../../../packages/ui-kit/src/composites/Breadcrumbs'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

export default function BreadcrumbsDemo() {
  return (
    <DocPage
      title="Breadcrumbs"
      badge="stable"
      summary="Path trail for nested views (settings, entity drill-downs). The last item is always the current page — bold, aria-current='page', rendered as a non-interactive span even if given an href/onClick. Consolidates the one real v5 usage found, shared/components/layouts/SettingsLayout.vue's q-breadcrumbs 2-level trail — low usage today, flagged for the orchestrator."
    >
      <DocSection id="trail-length" title="Trail length">
        <Prose>
          Each item is <Code>{'{ label, href?, onClick? }'}</Code> — <Code>href</Code> renders an{' '}
          <Code>{'<a>'}</Code>, <Code>onClick</Code> with no <Code>href</Code> renders a{' '}
          <Code>{'<button>'}</Code>, neither renders a plain <Code>{'<span>'}</Code>. The last item is
          always the current page regardless of what it was given.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: '2-level',
              caption: 'the only real v5 usage today',
              node: (
                <Breadcrumbs
                  items={[
                    { label: 'Settings', href: '/settings' },
                    { label: 'Users' },
                  ]}
                />
              ),
            },
            {
              label: '3-level',
              caption: 'href + onClick mixed',
              node: (
                <Breadcrumbs
                  items={[
                    { label: 'Contracts', href: '/iwmp_contracts' },
                    {
                      label: 'CNT-1042',
                      onClick: () => {
                        // eslint-disable-next-line no-console -- showcase-only demo affordance.
                        console.log('navigate to CNT-1042')
                      },
                    },
                    { label: 'Compliance history' },
                  ]}
                />
              ),
            },
            {
              label: '4-level',
              caption: 'wraps via flex-wrap, no collapse',
              node: (
                <Breadcrumbs
                  items={[
                    { label: 'Bin Compliance Dashboard', href: '/bin-compliance-dashboard' },
                    { label: 'Lot 1', href: '/bin-compliance-dashboard?lot=1' },
                    { label: 'Sector 4', href: '/bin-compliance-dashboard?lot=1&sector=4' },
                    { label: 'Bin B-1042' },
                  ]}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="separator" title="Separator">
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Default',
              caption: 'chevron, flips under RTL',
              node: (
                <Breadcrumbs
                  items={[
                    { label: 'IIMS', href: '/iims' },
                    { label: 'Incidents' },
                  ]}
                />
              ),
            },
            {
              label: 'Custom',
              caption: 'separator="/" — renders as-is',
              node: (
                <Breadcrumbs
                  separator="/"
                  items={[
                    { label: 'IIMS', href: '/iims' },
                    { label: 'Incidents' },
                  ]}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'items',
              type: 'BreadcrumbItem[]',
              required: true,
              description:
                'Trail items, in order. Each is { label, href?, onClick? }. The last item is always the current page regardless of href/onClick.',
            },
            {
              prop: 'separator',
              type: 'ReactNode',
              description: 'Override the default chevron. Custom separators render as-is (no auto RTL flip).',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLElement>, 'children'>",
              description: 'className and any other nav attribute pass through to the root <nav>.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for nested settings pages and entity drill-downs where the path itself is useful navigation.',
            'Keep labels short — a breadcrumb trail is a path, not a description.',
            'Let the last item stand as plain text; never wire it to href/onClick, it renders as a span regardless.',
            'Prefer the default chevron unless the surrounding UI has an established different separator convention.',
          ]}
          donts={[
            "Don't use Breadcrumbs as the primary navigation for a flat, non-hierarchical page.",
            "Don't truncate long trails yourself — the component wraps via flex-wrap instead of collapsing.",
            "Don't mix href and onClick on the same item; pick one per item.",
            "Don't use it for a single-level page — a trail needs at least two items to carry meaning.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Root renders a <nav aria-label="Breadcrumb"> so assistive tech can jump directly to it.',
            'The current (last) item carries aria-current="page" and is a non-interactive <span>.',
            'Non-final items with href are real <a> elements — full keyboard and screen-reader link semantics.',
            'The separator is aria-hidden — it conveys nothing on its own, order alone carries the hierarchy.',
            'The default chevron flips via rtl:-scale-x-100 — mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
