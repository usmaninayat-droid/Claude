import { Stack, type LayoutGap } from '@fams/ui-kit'
import {
  DocPage,
  DocSection,
  Prose,
  Gallery,
  Playground,
  PropsTable,
  Guidelines,
  A11yList,
  DevNote,
  Code,
} from '../docs'

/** Bordered placeholder box — deliberately plain so the *gap* around it is what reads, not the content. */
const Box = ({ label }: { label: string }) => (
  <div className="rounded-sm border border-border bg-background px-4 py-3 text-body-sm text-foreground">
    {label}
  </div>
)

const GAPS: LayoutGap[] = ['inline', 'field', 'section']
const ALIGNS = ['start', 'center', 'end', 'stretch'] as const

type StackControls = {
  direction: 'row' | 'column'
  gap: LayoutGap
  align: (typeof ALIGNS)[number]
  wrap: boolean
}

/**
 * StackDemo — the base layout primitive. Composes into FormGrid, FormSection,
 * and Toolbar, so most call sites never reach for Stack directly.
 */
export default function StackDemo() {
  return (
    <DocPage
      title="Stack"
      badge="stable"
      summary="The base layout primitive — a flex container whose gap can only be one of the semantic presets (inline/field/section). Composes into FormGrid, FormSection, and Toolbar, so most call sites never reach for Stack directly."
    >
      <DocSection id="playground" title="Playground">
        <Playground<StackControls>
          controls={[
            { name: 'direction', type: 'select', default: 'column', options: ['row', 'column'] },
            { name: 'gap', type: 'select', default: 'field', options: GAPS },
            { name: 'align', type: 'select', default: 'stretch', options: ALIGNS },
            { name: 'wrap', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <Stack
              direction={v.direction}
              gap={v.gap}
              align={v.align}
              wrap={v.wrap}
              className="w-full max-w-sm rounded-md border border-dashed border-border p-3"
            >
              <Box label="Lot 1" />
              <Box label="Lot 2 — taller content wraps here" />
              <Box label="Lot 7" />
            </Stack>
          )}
        </Playground>
      </DocSection>

      <DocSection id="gap" title="Gap presets">
        <Prose>
          <Code>inline</Code> (8px), <Code>field</Code> (16px, default), and <Code>section</Code>{' '}
          (24px) are the only spacing values a consumer can reach for — there is no numeric escape
          hatch.
        </Prose>
        <Gallery
          items={GAPS.map((gap) => ({
            label: `gap="${gap}"`,
            node: (
              <Stack gap={gap} className="w-32">
                <Box label="A" />
                <Box label="B" />
                <Box label="C" />
              </Stack>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="direction" title="Direction">
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'row',
              node: (
                <Stack direction="row" gap="inline">
                  <Box label="A" />
                  <Box label="B" />
                  <Box label="C" />
                </Stack>
              ),
            },
            {
              label: 'column',
              caption: 'default',
              node: (
                <Stack direction="column" gap="field" className="w-32">
                  <Box label="A" />
                  <Box label="B" />
                </Stack>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="align" title="Align">
        <Prose>Cross-axis alignment on a row of mixed-height boxes.</Prose>
        <Gallery
          minColRem={14}
          items={ALIGNS.map((align) => ({
            label: `align="${align}"`,
            node: (
              <Stack
                direction="row"
                gap="field"
                align={align}
                className="h-24 w-full max-w-52 rounded-md border border-dashed border-border p-2"
              >
                <div className="rounded-sm border border-border bg-background px-3 py-1 text-body-sm text-foreground">
                  short
                </div>
                <div className="rounded-sm border border-border bg-background px-3 py-4 text-body-sm text-foreground">
                  taller
                  <br />
                  content
                </div>
              </Stack>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="wrap" title="Wrap">
        <Prose>
          <Code>wrap</Code> only applies to <Code>direction="row"</Code>; gap is preserved on both
          axes once items flow onto a second line.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'wrap={false}',
              caption: 'default — overflows',
              node: (
                // data-intentional-overflow: deliberately demonstrating the
                // *lack* of wrapping (the "Don't" case) — content is meant to
                // clip here, this is not a bug.
                <Stack
                  direction="row"
                  gap="inline"
                  className="w-40 overflow-hidden"
                  data-intentional-overflow=""
                >
                  {['Lot 1', 'Lot 2', 'Lot 7', 'Lot 8'].map((label) => (
                    <Box key={label} label={label} />
                  ))}
                </Stack>
              ),
            },
            {
              label: 'wrap={true}',
              node: (
                <Stack direction="row" gap="inline" wrap className="w-40">
                  {['Lot 1', 'Lot 2', 'Lot 7', 'Lot 8'].map((label) => (
                    <Box key={label} label={label} />
                  ))}
                </Stack>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'direction',
              type: "'row' | 'column'",
              default: "'column'",
              description: 'Main axis. Row is the horizontal chip/button-row case.',
            },
            {
              prop: 'gap',
              type: "'inline' | 'field' | 'section'",
              default: "'field'",
              description: 'Semantic gap preset — never a raw number.',
            },
            {
              prop: 'align',
              type: "'start' | 'center' | 'end' | 'stretch'",
              description: 'Cross-axis alignment (items-*).',
            },
            {
              prop: 'wrap',
              type: 'boolean',
              default: 'false',
              description: 'Wrap onto multiple lines. Only meaningful with direction="row".',
            },
            {
              prop: 'as',
              type: 'ElementType',
              default: "'div'",
              description: 'Render as a different element, e.g. "section", "form", "ul".',
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
            'Reach for FormGrid, FormSection, or Toolbar first — they compose Stack for the common cases.',
            'Use Stack directly for a plain vertical or horizontal list that none of the above fit.',
            'Use align to fix cross-axis alignment instead of per-child margin/padding tricks.',
            'Pass as="ul" (or another semantic element) when the content is genuinely that element.',
          ]}
          donts={[
            "Don't hand-space children with space-x-*/space-y-* utilities — that is what gap is for.",
            "Don't wrap a Stack in another Stack just to change direction; toggle the direction prop.",
            "Don't use wrap without a bounded width — there is nothing to wrap onto without one.",
            "Don't reach past the three gap presets with an inline style; add a token instead.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a plain <div> by default — carries no implicit role or semantics.',
            'Use the as prop to render the actual semantic element (ul, nav, form) when the content calls for it.',
            'Purely presentational spacing; never affects tab order or focus.',
            'Layout uses logical flex properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          There is deliberately no numeric gap escape hatch — <Code>gap</Code> only accepts the
          three spacing tokens. A new gap size means a new token, not an inline style. FormGrid,
          FormSection, and Toolbar all build on Stack internally, so most call sites should reach
          for one of those before using Stack directly.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
