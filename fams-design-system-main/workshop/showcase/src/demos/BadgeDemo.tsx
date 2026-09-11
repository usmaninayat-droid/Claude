import { Badge as BadgeChip, type BadgeVariant, type BadgeColorIndex } from '../../../../packages/ui-kit/src/primitives/Badge'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * BadgeDemo — reference implementation of the standard component-page template
 * (DocPage → Playground → Gallery per dimension → PropsTable → Guidelines →
 * Accessibility). RTL is proven by the global header switcher, not a per-page
 * block. See docs/COMPONENT-GUIDE.md.
 */

const VARIANTS: BadgeVariant[] = [
  'default',
  'secondary',
  'outline',
  'muted',
  'success',
  'warning',
  'info',
  'destructive',
]

const CATEGORY_INDEXES: { index: BadgeColorIndex; label: string }[] = [
  { index: 1, label: 'Lot 1' },
  { index: 3, label: 'Lot 2' },
  { index: 5, label: 'Lot 7' },
  { index: 7, label: 'Lot 8' },
  { index: 9, label: "Tajmee'e" },
]

type BadgeControls = {
  variant: BadgeVariant
  size: 'xs' | 'sm' | 'md'
  dot: boolean
  uppercase: boolean
  label: string
}

export default function BadgeDemo() {
  return (
    <DocPage
      title="Badge"
      badge="stable"
      summary="Compact status/label chip. Retires ~35 files' worth of ad-hoc q-badge / q-chip status coloring and the per-file colorPalette[index % length] pattern used for categorical tagging (lots, ESPs, districts)."
    >
      <DocSection id="playground" title="Playground">
        <Playground<BadgeControls>
          controls={[
            { name: 'variant', type: 'select', default: 'success', options: VARIANTS },
            { name: 'size', type: 'select', default: 'sm', options: ['xs', 'sm', 'md'] },
            { name: 'dot', type: 'boolean', default: true },
            { name: 'uppercase', type: 'boolean', default: false },
            { name: 'label', type: 'text', default: 'Compliant' },
          ]}
        >
          {(v) => (
            <BadgeChip variant={v.variant} size={v.size} dot={v.dot} uppercase={v.uppercase}>
              {v.label}
            </BadgeChip>
          )}
        </Playground>
      </DocSection>

      <DocSection id="variants" title="Variants">
        <Prose>
          Neutral tones (<Code>default</Code>, <Code>secondary</Code>, <Code>outline</Code>,{' '}
          <Code>muted</Code>) and status tones (<Code>success</Code>, <Code>warning</Code>,{' '}
          <Code>info</Code>, <Code>destructive</Code>) — every tint comes from a token, never raw hex.
        </Prose>
        <Gallery
          items={VARIANTS.map((variant) => ({
            label: variant,
            node: <BadgeChip variant={variant}>{variant}</BadgeChip>,
          }))}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes & options">
        <Gallery
          minColRem={8}
          items={[
            { label: 'xs', caption: 'count-pill', node: <BadgeChip size="xs">9</BadgeChip> },
            { label: 'sm', caption: 'default', node: <BadgeChip size="sm">Open</BadgeChip> },
            { label: 'md', node: <BadgeChip size="md">Open</BadgeChip> },
            { label: 'dot', caption: 'currentColor', node: <BadgeChip variant="success" dot>Active</BadgeChip> },
            { label: 'uppercase', caption: 'StatePill', node: <BadgeChip variant="default" uppercase>Won</BadgeChip> },
          ]}
        />
      </DocSection>

      <DocSection id="categorical" title="Categorical color">
        <Prose>
          <Code>colorIndex</Code> tags data by <em>category</em> (lot, ESP, district) rather than
          status — mapping onto the <Code>--color-chart-1..5</Code> categorical palette, cycling every
          five. There is deliberately no raw color prop.
        </Prose>
        <Gallery
          minColRem={8}
          items={CATEGORY_INDEXES.map(({ index, label }) => ({
            label: `colorIndex={${index}}`,
            node: (
              <BadgeChip colorIndex={index} dot>
                {label}
              </BadgeChip>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'variant',
              type: "'default' | 'secondary' | 'outline' | 'muted' | 'success' | 'warning' | 'info' | 'destructive'",
              default: "'default'",
              description: 'Neutral or status tint. Overridden by colorIndex when set.',
            },
            {
              prop: 'size',
              type: "'xs' | 'sm' | 'md'",
              default: "'sm'",
              description: 'xs is the rounded-full count-pill; sm/md are the label chip.',
            },
            {
              prop: 'dot',
              type: 'boolean',
              default: 'false',
              description: 'Leading status dot in currentColor (or the categorical color).',
            },
            {
              prop: 'uppercase',
              type: 'boolean',
              default: 'false',
              description: 'Uppercase, bold, letter-spaced label — the StatePill text treatment.',
            },
            {
              prop: 'colorIndex',
              type: '1 – 10',
              description:
                'Categorical tag by index (cycling every 5) instead of status. Takes precedence over variant color; size still applies.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLSpanElement>',
              description: 'className, children, and any span attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use status variants for state (compliant, overdue, offline).',
            'Use colorIndex for categorical tagging — lots, ESPs, districts.',
            'Keep labels to one or two words; a badge is a chip, not a sentence.',
            'Pair dot with a text label for colour-blind-safe status.',
          ]}
          donts={[
            'Don’t hardcode a hex colour — the variant or colorIndex already carries the token.',
            'Don’t use a badge as a button; it is non-interactive by design.',
            'Don’t mix status and categorical meaning in the same list of badges.',
            'Don’t rely on colour alone — always keep the text label.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a non-interactive <span> — conveys meaning through its text label, not colour alone.',
            'Meets WCAG 2.2 AA contrast in every variant across all tenants.',
            'The leading dot is decorative; the text label carries the status for assistive tech.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
