import { CalendarClock, Sparkles } from '@fams/ui-kit/icons'
import { InfoBanner } from '../../../../packages/ui-kit/src/composites/InfoBanner'
import { IdChip } from '../../../../packages/ui-kit/src/composites/IdChip'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type InfoBannerControls = {
  title: string
  metaA: string
  metaB: string
}

export default function InfoBannerDemo() {
  return (
    <DocPage
      title="InfoBanner"
      badge="stable"
      summary="Icon + title banner with a trailing, divider-separated metadata block — e.g. a module's 'Upcoming Plan' strip (# id | date). Sibling to Alert (same inline-strip role) but a flat single-tone card whose right side carries short pre-formatted labels instead of a description/actions stack."
    >
      <DocSection id="playground" title="Playground">
        <Playground<InfoBannerControls>
          controls={[
            { name: 'title', type: 'text', default: 'Upcoming Plan' },
            { name: 'metaA', type: 'text', default: '# 231454' },
            { name: 'metaB', type: 'text', default: '22 Jul, 2025 12:00pm' },
          ]}
        >
          {(v) => (
            <InfoBanner
              title={v.title}
              meta={[{ label: v.metaA }, { label: v.metaB }]}
              className="w-full max-w-2xl"
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="options" title="Options">
        <Prose>
          <Code>meta</Code> is an ordered list of pre-formatted labels — the banner never parses
          or formats a date/id itself (Rule 8); the caller (or a metadata-driven widget) hands it
          already-formatted strings.
        </Prose>
        <Gallery
          minColRem={24}
          items={[
            {
              label: 'No metadata',
              caption: 'meta omitted — title only',
              node: <InfoBanner title="Contract renewal due" className="w-full" />,
            },
            {
              label: 'Custom icon + tone',
              caption: 'icon/iconTone override the bell/success default',
              node: (
                <InfoBanner
                  title="Inspection scheduled"
                  icon={CalendarClock}
                  iconTone="warning"
                  meta={[{ label: '# 88213' }]}
                  className="w-full"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="variants" title="Variants">
        <Prose>
          <Code>variant</Code> covers the two insight shapes on the design board.{' '}
          <Code>insight</Code> is a tinted pill row with a bare accent glyph;{' '}
          <Code>accent</Code> is a neutral row with a leading accent bar and a{' '}
          <Code>trailing</Code> slot (an <Code>IdChip</Code> plus a timestamp). Both take{' '}
          <Code>tone</Code>; <Code>default</Code> is unchanged.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'default',
              node: <InfoBanner title="Upcoming Plan" meta={[{ label: '# 231454' }]} className="w-full" />,
            },
            {
              label: 'insight',
              caption: 'tinted pill + accent glyph',
              node: (
                <InfoBanner
                  variant="insight"
                  tone="success"
                  icon={Sparkles}
                  title="3 anomalies resolved automatically today"
                  className="w-full"
                />
              ),
            },
            {
              label: 'accent',
              caption: 'accent bar + trailing IdChip/timestamp',
              node: (
                <InfoBanner
                  variant="accent"
                  tone="warning"
                  title="Collection plan updated"
                  trailing={
                    <>
                      <IdChip>231454</IdChip>
                      <span className="text-caption text-muted-foreground">2h ago</span>
                    </>
                  }
                  className="w-full"
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
              prop: 'title',
              type: 'ReactNode',
              description: 'Required. The banner headline.',
            },
            {
              prop: 'icon',
              type: 'LucideIcon',
              default: 'Bell',
              description: 'Leading icon, rendered inside an IconBadge.',
            },
            {
              prop: 'iconTone',
              type: 'IconBadgeTone',
              default: "'success'",
              description: "Tint passed straight through to the IconBadge.",
            },
            {
              prop: 'variant',
              type: "'default' | 'insight' | 'accent'",
              default: "'default'",
              description:
                "'insight' is a tinted pill row with a leading accent glyph; 'accent' is a neutral row with a leading accent bar plus a trailing slot.",
            },
            {
              prop: 'tone',
              type: "'info' | 'success' | 'warning' | 'danger' | 'neutral'",
              default: "'info'",
              description: "Accent hue of the 'insight' tint / the 'accent' bar. Ignored by 'default'.",
            },
            {
              prop: 'trailing',
              type: 'ReactNode',
              description: 'Trailing slot rendered after meta — e.g. an IdChip plus a timestamp.',
            },
            {
              prop: 'meta',
              type: 'InfoBannerMetaItem[]',
              description:
                'Trailing metadata items, end-aligned with a vertical divider between each pair. Omit for no metadata block.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for a single, at-a-glance strip above a section (e.g. an upcoming-plan or schedule callout).',
            'Keep meta items short — an id, a date/time — never a sentence.',
            'Pass already-formatted meta labels; this component never formats dates or ids itself.',
          ]}
          donts={[
            "Don't use InfoBanner for severity messaging — use Alert (info/success/warning/error) instead.",
            "Don't put interactive controls in meta — it's a read-only label row.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The icon is decorative (aria-hidden via IconBadge) — the title text carries the meaning.',
            'Meta dividers are aria-hidden — screen readers read the meta labels in order, without divider noise.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
