import { Text, type TextProps } from '../../../../packages/ui-kit/src/primitives/Text'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * TextDemo — reference implementation of the standard component-page template
 * (DocPage → Playground → Gallery per dimension → PropsTable → Guidelines →
 * Accessibility). RTL is proven by the global header switcher, not a
 * per-page block. See docs/COMPONENT-GUIDE.md.
 */

const SIZES: NonNullable<TextProps['size']>[] = [
  'body-xl',
  'body-lg',
  'body-md',
  'body-sm',
  'body-xs',
  'caption',
]

const WEIGHTS: NonNullable<TextProps['weight']>[] = ['normal', 'medium', 'semibold', 'bold']

const TONES: NonNullable<TextProps['tone']>[] = [
  'default',
  'muted',
  'primary',
  'destructive',
  'success',
  'warning',
  'info',
]

type TextControls = {
  size: NonNullable<TextProps['size']>
  weight: NonNullable<TextProps['weight']>
  tone: NonNullable<TextProps['tone']>
  truncate: boolean
  label: string
}

export default function TextDemo() {
  return (
    <DocPage
      title="Text"
      badge="stable"
      summary="General body-copy primitive. The typography primitive the DS was missing — body copy outside a Card had no home, so consumers hand-rolled `<span className=&quot;text-body-sm text-muted-foreground&quot;>` or misused CardDescription outside a card just to stay pure-DS."
    >
      <DocSection id="playground" title="Playground">
        <Playground<TextControls>
          controls={[
            { name: 'size', type: 'select', default: 'body-md', options: SIZES },
            { name: 'weight', type: 'select', default: 'normal', options: WEIGHTS },
            { name: 'tone', type: 'select', default: 'default', options: TONES },
            { name: 'truncate', type: 'boolean', default: false },
            {
              name: 'label',
              type: 'text',
              default: 'The quick brown fox jumps over the lazy dog.',
            },
          ]}
        >
          {(v) => (
            <div className="w-80">
              <Text size={v.size} weight={v.weight} tone={v.tone} truncate={v.truncate}>
                {v.label}
              </Text>
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>
          The body/caption scale only — <Code>body-xl</Code> through <Code>body-xs</Code> and{' '}
          <Code>caption</Code>. Heading sizes live on <Code>Heading</Code>.
        </Prose>
        <Gallery
          layout="rows"
          items={SIZES.map((size) => ({
            label: size,
            node: <Text size={size}>The quick brown fox jumps over the lazy dog.</Text>,
          }))}
        />
      </DocSection>

      <DocSection id="weights" title="Weights">
        <Gallery
          layout="rows"
          items={WEIGHTS.map((weight) => ({
            label: weight,
            node: <Text weight={weight}>The quick brown fox jumps over the lazy dog.</Text>,
          }))}
        />
      </DocSection>

      <DocSection id="tones" title="Tones">
        <Prose>
          Semantic color only, mapped to existing tokens — never a raw hex or arbitrary value.
        </Prose>
        <Gallery
          layout="rows"
          items={TONES.map((tone) => ({
            label: tone,
            node: <Text tone={tone}>The quick brown fox jumps over the lazy dog.</Text>,
          }))}
        />
      </DocSection>

      <DocSection id="element-and-composition" title="Element & composition">
        <Prose>
          <Code>as</Code> picks the rendered element — <Code>span</Code> (default, inline) or{' '}
          <Code>p</Code>/<Code>div</Code>/<Code>label</Code> for block copy. <Code>asChild</Code>{' '}
          merges Text's classes onto a single child via Base UI's{' '}
          <Code>useRender</Code> instead of rendering its own element.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'as="p"',
              node: (
                <Text as="p" tone="muted">
                  Rendered as a paragraph — the block-copy case consumers need most.
                </Text>
              ),
            },
            {
              label: 'asChild',
              node: (
                <Text asChild tone="primary" weight="medium">
                  <a href="#">Rendered via asChild onto an anchor</a>
                </Text>
              ),
            },
            {
              label: 'truncate',
              node: (
                <div className="w-48">
                  <Text truncate>
                    This is a long line of copy that will be truncated with an ellipsis.
                  </Text>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'size',
              type: "'body-xl' | 'body-lg' | 'body-md' | 'body-sm' | 'body-xs' | 'caption'",
              default: "'body-md'",
              description: 'Token-backed font-size class. Never a raw value.',
            },
            {
              prop: 'weight',
              type: "'normal' | 'medium' | 'semibold' | 'bold'",
              default: "'normal'",
              description: 'Standard Tailwind weight utilities (400/500/600/700).',
            },
            {
              prop: 'tone',
              type: "'default' | 'muted' | 'primary' | 'destructive' | 'success' | 'warning' | 'info'",
              default: "'default'",
              description: 'Semantic color, mapped to existing tokens.',
            },
            {
              prop: 'align',
              type: "'start' | 'center' | 'end'",
              description: 'Logical text alignment — never left/right.',
            },
            {
              prop: 'truncate',
              type: 'boolean',
              default: 'false',
              description: 'Single-line ellipsis truncation. Needs a bounded width to take effect.',
            },
            {
              prop: 'as',
              type: "'span' | 'p' | 'div' | 'label'",
              default: "'span'",
              description: 'Rendered element. Use p for paragraphs.',
            },
            {
              prop: 'asChild',
              type: 'boolean',
              default: 'false',
              description: 'Merge classes onto a single child via Base UI useRender instead of rendering as.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLElement>',
              description: 'className, children, and any element attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use Text for any body copy outside a Card — this is the component that exists specifically for that gap.',
            'Use Text instead of CardDescription when the copy is not inside a Card — CardDescription is a Card slot, not a general-purpose primitive.',
            'Use Text instead of a hand-rolled `<span className="text-body-sm text-muted-foreground">` — that is exactly the ad-hoc styling this component replaces.',
            'Use as="p" for paragraph-level copy so it participates correctly in block layout.',
            'Use tone="muted" for secondary/supporting copy, matching the CardDescription look consumers already expect.',
          ]}
          donts={[
            'Don’t reach for CardDescription outside a Card just to "stay pure DS" — that is the exact anti-pattern Text was built to retire.',
            'Don’t hardcode a font-size or color — size and tone already cover the token set.',
            'Don’t use text-left/text-right — use align (logical, RTL-safe).',
            'Don’t use Text for headings — use Heading, which controls document structure via level.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a plain <span> (or the chosen as element) — no implicit ARIA role changes.',
            'Every tone meets WCAG 2.2 AA contrast in every theme/tenant, same as the underlying tokens.',
            'as="p" gives block copy correct semantics for screen readers instead of a bare span.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
