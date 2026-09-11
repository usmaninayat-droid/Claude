import { AlertTriangle, Bell, CheckCircle2, Info, Settings, ShieldAlert } from '@fams/ui-kit/icons'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { IconBadge, type IconBadgeTone } from '../../../../packages/ui-kit/src/primitives/IconBadge'

const TONES: { tone: IconBadgeTone; icon: typeof Bell; label: string }[] = [
  { tone: 'primary', icon: Bell, label: 'primary' },
  { tone: 'success', icon: CheckCircle2, label: 'success' },
  { tone: 'warning', icon: AlertTriangle, label: 'warning' },
  { tone: 'danger', icon: ShieldAlert, label: 'danger' },
  { tone: 'info', icon: Info, label: 'info' },
  { tone: 'neutral', icon: Settings, label: 'neutral' },
]

/**
 * IconBadgeDemo — an icon rendered inside a tinted disc/square. See
 * docs/COMPONENT-GUIDE.md for the standard component-page template.
 */
export default function IconBadgeDemo() {
  return (
    <DocPage
      title="IconBadge"
      badge="stable"
      summary="An icon in a tinted disc/square, driven by a closed tone enum resolved to token-based tints (bg-{tone}/10 + text-{tone}). Retires ad-hoc iconBgColor/iconColor hex props hand-rolled per card in StatisticCard.vue, DetailsCard.vue (iwmp/fams/ead) and WidgetsCardWrapper.vue."
    >
      <DocSection id="tones" title="Tones">
        <Prose>A closed enum, each tone a token-based tint — never a raw hex.</Prose>
        <Gallery
          minColRem={8}
          items={TONES.map(({ tone, icon: Icon, label }) => ({
            label,
            node: <IconBadge tone={tone} icon={Icon} />,
          }))}
        />
      </DocSection>

      <DocSection id="shapes-sizes" title="Shapes & sizes">
        <Gallery
          minColRem={8}
          items={[
            { label: 'circle', caption: 'default', node: <IconBadge tone="info" shape="circle" icon={Info} /> },
            { label: 'square', node: <IconBadge tone="info" shape="square" icon={Info} /> },
            { label: 'sm', node: <IconBadge tone="primary" size="sm" icon={Bell} /> },
            { label: 'md', caption: 'default', node: <IconBadge tone="primary" size="md" icon={Bell} /> },
            { label: 'lg', node: <IconBadge tone="primary" size="lg" icon={Bell} /> },
          ]}
        />
      </DocSection>

      <DocSection id="options" title="Custom icon & labelled">
        <Prose>
          Pass any icon element via <Code>children</Code> instead of <Code>icon</Code>, or an{' '}
          <Code>aria-label</Code> when the icon conveys meaning on its own — that drops the
          default <Code>aria-hidden</Code>.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            {
              label: 'children',
              caption: 'custom icon element',
              node: (
                <IconBadge tone="danger">
                  <ShieldAlert />
                </IconBadge>
              ),
            },
            {
              label: 'aria-label',
              caption: 'meaningful, not decorative',
              node: <IconBadge tone="warning" icon={AlertTriangle} aria-label="Overdue" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'tone',
              type: "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'",
              default: "'primary'",
              description: 'Token-based tint: bg-{tone}/10 + text-{tone}.',
            },
            {
              prop: 'shape',
              type: "'circle' | 'square'",
              default: "'circle'",
              description: 'Container shape.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Disc/square and icon scale together.',
            },
            {
              prop: 'icon',
              type: 'LucideIcon',
              description:
                'Lucide icon component to render centered in the badge. Omit and pass children for a custom icon element instead.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLSpanElement>',
              description:
                'className, children, and any span attribute pass through. Passing aria-label marks the icon as meaningful and drops the default aria-hidden.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use tone to carry status/semantic meaning (success, warning, danger…), never a raw hex.',
            'Pair it with a text label nearby — the badge alone is usually decorative.',
            'Pass aria-label when the icon is the only signal (e.g. a standalone status dot).',
            'Keep size consistent within one list or card grid.',
          ]}
          donts={[
            'Don’t use IconBadge as a clickable button; it is a non-interactive presenter.',
            'Don’t hardcode a background/foreground hex — the tone already carries the token.',
            'Don’t mix icon and children on the same instance.',
            'Don’t rely on tone alone to convey meaning without a nearby label — colour-blind users need the text.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'aria-hidden by default — the icon is treated as decorative unless aria-label is passed.',
            'Passing aria-label marks it as meaningful and removes aria-hidden automatically.',
            'Every tone tint meets WCAG 2.2 AA contrast against its background.',
            'Layout uses only a token-based background/foreground pair, so it renders identically under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
