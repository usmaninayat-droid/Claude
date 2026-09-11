import { Heading, type HeadingProps, type HeadingLevel } from '../../../../packages/ui-kit/src/primitives/Heading'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * HeadingDemo — reference implementation of the standard component-page
 * template (DocPage → Playground → Gallery per dimension → PropsTable →
 * Guidelines → Accessibility). RTL is proven by the global header switcher,
 * not a per-page block. See docs/COMPONENT-GUIDE.md.
 */

const LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6]
const SIZES: NonNullable<HeadingProps['size']>[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
const WEIGHTS: NonNullable<HeadingProps['weight']>[] = ['normal', 'medium', 'semibold', 'bold']
const TONES: NonNullable<HeadingProps['tone']>[] = [
  'default',
  'muted',
  'primary',
  'destructive',
  'success',
  'warning',
  'info',
]

type HeadingControls = {
  level: HeadingLevel
  size: NonNullable<HeadingProps['size']> | ''
  weight: NonNullable<HeadingProps['weight']>
  tone: NonNullable<HeadingProps['tone']>
  label: string
}

export default function HeadingDemo() {
  return (
    <DocPage
      title="Heading"
      badge="stable"
      summary="Semantic heading primitive. level controls the rendered element (h1…h6) for document structure; size is decoupled from level so a page can render a structurally-correct heading that visually reads as a different size."
    >
      <DocSection id="playground" title="Playground">
        <Playground<HeadingControls>
          controls={[
            { name: 'level', type: 'select', default: '2', options: ['1', '2', '3', '4', '5', '6'] },
            { name: 'size', type: 'select', default: '', options: ['', ...SIZES] },
            { name: 'weight', type: 'select', default: 'bold', options: WEIGHTS },
            { name: 'tone', type: 'select', default: 'default', options: TONES },
            { name: 'label', type: 'text', default: 'Section heading' },
          ]}
        >
          {(v) => (
            <Heading
              level={Number(v.level) as HeadingLevel}
              size={v.size === '' ? undefined : v.size}
              weight={v.weight}
              tone={v.tone}
            >
              {v.label}
            </Heading>
          )}
        </Playground>
      </DocSection>

      <DocSection id="levels" title="Levels">
        <Prose>
          Each <Code>level</Code> renders its matching element (<Code>h1</Code>…<Code>h6</Code>) at
          its matching default <Code>size</Code>.
        </Prose>
        <Gallery
          layout="rows"
          items={LEVELS.map((level) => ({
            label: `level=${level}`,
            node: <Heading level={level}>Heading level {level}</Heading>,
          }))}
        />
      </DocSection>

      <DocSection id="decoupled-size" title="Level / size decoupling">
        <Prose>
          The main reason this component exists: <Code>size</Code> is independent of{' '}
          <Code>level</Code>. A page can render an <Code>h2</Code> (correct document outline) that
          visually reads as an <Code>h4</Code>, instead of abusing heading order just to get a
          smaller look.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'level=2 size="h4"',
              caption: '<h2> element, h4 visual size',
              node: (
                <Heading level={2} size="h4">
                  Correct outline, smaller look
                </Heading>
              ),
            },
            {
              label: 'level=3 size="h1"',
              caption: '<h3> element, h1 visual size',
              node: (
                <Heading level={3} size="h1">
                  Correct outline, bigger look
                </Heading>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="tones" title="Tones">
        <Gallery
          layout="rows"
          items={TONES.map((tone) => ({
            label: tone,
            node: (
              <Heading level={4} tone={tone}>
                Heading in {tone}
              </Heading>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'level',
              type: '1 | 2 | 3 | 4 | 5 | 6',
              required: true,
              description: 'Controls the rendered element (h1…h6) for document structure / accessibility.',
            },
            {
              prop: 'size',
              type: "'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'",
              default: "level's matching size",
              description: 'Visual size, decoupled from level — see the section above.',
            },
            {
              prop: 'weight',
              type: "'normal' | 'medium' | 'semibold' | 'bold'",
              default: "'bold'",
              description: 'Standard Tailwind weight utilities (400/500/600/700).',
            },
            {
              prop: 'tone',
              type: "'default' | 'muted' | 'primary' | 'destructive' | 'success' | 'warning' | 'info'",
              default: "'default'",
              description: 'Semantic color, mapped to existing tokens.',
            },
            {
              prop: 'truncate',
              type: 'boolean',
              default: 'false',
              description: 'Single-line ellipsis truncation. Needs a bounded width to take effect.',
            },
            {
              prop: 'asChild',
              type: 'boolean',
              default: 'false',
              description: "Merge classes onto a single child via Slot instead of rendering level's element.",
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLHeadingElement>',
              description: 'className, children, and any element attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always set level to the correct structural position in the page outline.',
            'Use size only when the visual weight needs to diverge from that structural level.',
            'Use Text (not Heading) for body copy — Heading is for actual section titles.',
            'Use tone="muted" sparingly — most headings should stay on the default tone for contrast.',
          ]}
          donts={[
            'Don’t skip heading levels (h1 → h3) to get a smaller look — use size instead.',
            'Don’t hardcode a font-size or color — size and tone already cover the token set.',
            'Don’t reach for CardDescription or a hand-rolled span for a heading — use Heading with the right level.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders the semantic h1…h6 element matching level, giving assistive tech a correct document outline.',
            'size never changes the rendered element, so the outline stays correct even when the visual size is overridden.',
            'Every tone meets WCAG 2.2 AA contrast in every theme/tenant, same as the underlying tokens.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
