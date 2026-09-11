import { TrendIndicator, type TrendIndicatorProps } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type TrendIndicatorControls = {
  direction: TrendIndicatorProps['direction']
  size: 'sm' | 'md'
  value: string
  note: string
}

/**
 * TrendIndicatorDemo — compact delta label (arrow + value + optional note).
 * The one shared trend primitive; KpiTile composes it.
 */
export default function TrendIndicatorDemo() {
  return (
    <DocPage
      title="TrendIndicator"
      badge="stable"
      summary="Compact delta label — arrow + value + optional note. The one shared trend primitive; KpiTile composes it."
    >
      <DocSection id="playground" title="Playground">
        <Playground<TrendIndicatorControls>
          controls={[
            { name: 'direction', type: 'select', default: 'up', options: ['up', 'down', 'flat'] },
            { name: 'size', type: 'select', default: 'md', options: ['sm', 'md'] },
            { name: 'value', type: 'text', default: '12%' },
            { name: 'note', type: 'text', default: 'vs last month' },
          ]}
        >
          {(v) => (
            <TrendIndicator direction={v.direction} size={v.size} value={v.value} note={v.note} />
          )}
        </Playground>
      </DocSection>

      <DocSection id="direction" title="Direction">
        <Prose>
          <Code>direction</Code> picks the arrow and its semantic color: up ={' '}
          <Code>text-success</Code>, down = <Code>text-destructive</Code>, flat ={' '}
          <Code>text-muted-foreground</Code>.
        </Prose>
        <Gallery
          minColRem={11}
          items={[
            { label: 'up', node: <TrendIndicator direction="up" value="12%" note="vs last month" /> },
            { label: 'down', node: <TrendIndicator direction="down" value="8%" note="vs last month" /> },
            { label: 'flat', node: <TrendIndicator direction="flat" value="0%" note="vs last month" /> },
          ]}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Gallery
          minColRem={9}
          items={[
            { label: 'sm', node: <TrendIndicator direction="up" value="12%" size="sm" /> },
            { label: 'md', caption: 'default', node: <TrendIndicator direction="up" value="12%" size="md" /> },
          ]}
        />
      </DocSection>

      <DocSection id="content" title="Content variations">
        <Gallery
          minColRem={11}
          items={[
            {
              label: 'with note',
              node: <TrendIndicator direction="up" value="12%" note="vs last month" />,
            },
            {
              label: 'value only',
              caption: 'e.g. inline in a KPI tile header',
              node: <TrendIndicator direction="up" value="+4" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'direction',
              type: "'up' | 'down' | 'flat'",
              required: true,
              description: 'Selects the arrow icon (TrendingUp/TrendingDown/Minus) and its semantic color.',
            },
            {
              prop: 'value',
              type: 'string | number',
              required: true,
              description: 'The delta to display, pre-formatted by the caller (e.g. "12%", "+4", "-1.2 pts").',
            },
            {
              prop: 'note',
              type: 'string',
              description: 'Optional trailing context, e.g. "vs last month". Always rendered muted.',
            },
            {
              prop: 'directionLabel',
              type: 'string',
              default: "'up' | 'down' | 'no change'",
              description:
                'The direction WORD exposed to assistive tech (visually hidden — the arrow is aria-hidden). Override to localise or to say what the movement means ("improved"). Pass "" only when the surrounding text already states the direction.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md'",
              default: "'md'",
              description: 'Controls icon and text scale.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLSpanElement>, 'children'>",
              description: 'className and any span attribute (except children) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pre-format value and note yourself — the component does no numeric formatting or sign-prefixing.',
            'Choose direction by what’s semantically good/bad for the metric, not just the raw sign.',
            'Use it inside KpiTile for card headers, or standalone inline where a bare delta is enough.',
            'Keep note short — it’s a trailing caption, not a sentence.',
          ]}
          donts={[
            'Don’t compute the direction from a raw number at every call site — centralize the good/bad mapping once per metric.',
            'Don’t add a background or border — use Badge for a chip treatment instead.',
            'Don’t rely on the icon/color alone for meaning that isn’t also in the value text.',
            'Don’t pass raw hex via style — direction and size already carry the token-driven colors.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The direction icon is decorative (aria-hidden) — the value and note text carry the meaning for assistive tech.',
            'Meets WCAG 2.2 AA contrast for success/destructive/muted-foreground across all tenants.',
            'Renders as an inline <span> with no interactive semantics, so it never intercepts keyboard focus.',
            'Layout uses logical gap spacing, so arrow/value/note order follows document direction automatically under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
