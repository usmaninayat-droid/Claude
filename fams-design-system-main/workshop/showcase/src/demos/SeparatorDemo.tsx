import { Separator } from '../../../../packages/ui-kit/src/primitives/Separator'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * SeparatorDemo — thin divider between content. Replaces q-separator, used
 * 131x across shared/iwmp/fams/ead component packages (~31 files use the
 * vertical variant).
 */
export default function SeparatorDemo() {
  return (
    <DocPage
      title="Separator"
      badge="stable"
      summary="Thin divider between content — horizontal rule or vertical rule for inline groupings. Decorative by default; set decorative={false} when it separates sections a screen reader should announce. Replaces q-separator, used 131x across shared/iwmp/fams/ead."
    >
      <DocSection id="orientation" title="Orientation">
        <Prose>
          <Code>orientation="horizontal"</Code> (default) spans full width; <Code>"vertical"</Code> spans
          full height and is sized by the surrounding flex row.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Horizontal',
              node: (
                <div className="w-full max-w-xs">
                  <p className="text-body-sm text-foreground">Contract details</p>
                  <Separator className="my-4" />
                  <p className="text-body-sm text-foreground">Compliance status</p>
                </div>
              ),
            },
            {
              label: 'Vertical',
              node: (
                <div className="flex h-5 items-center gap-3 text-body-sm text-foreground">
                  <span>Lot 1</span>
                  <Separator orientation="vertical" />
                  <span>Lot 2</span>
                  <Separator orientation="vertical" />
                  <span>Tajmee'e</span>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="context" title="In context">
        <Prose>Mirrors PipelineProfile.vue's inline stat groups (v5 usage-discovery).</Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'Stat row',
              node: (
                <div className="flex items-center gap-4 rounded-md border border-border p-4">
                  <div>
                    <p className="text-caption text-muted-foreground">Vehicles</p>
                    <p className="text-h5 font-semibold text-foreground">42</p>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div>
                    <p className="text-caption text-muted-foreground">Drivers</p>
                    <p className="text-h5 font-semibold text-foreground">38</p>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div>
                    <p className="text-caption text-muted-foreground">Lots</p>
                    <p className="text-h5 font-semibold text-foreground">4</p>
                  </div>
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
              prop: 'orientation',
              type: "'horizontal' | 'vertical'",
              default: "'horizontal'",
              description: 'Direction of the rule — full width or full height.',
            },
            {
              prop: 'decorative',
              type: 'boolean',
              default: 'true',
              description: 'Marks it purely visual for a11y. Set false when it separates sections a screen reader should announce (adds role="separator").',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>',
              description: 'className and any native Radix Separator attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use vertical between inline stat groups or breadcrumb-style label rows.',
            'Use horizontal to divide stacked content sections (card sections, list groups).',
            'Set decorative={false} when the divider marks a real section boundary for screen readers.',
            'Size a vertical separator with the parent flex row\'s height, not a fixed px value.',
          ]}
          donts={[
            'Don’t use it as a spacing hack — use gap/margin utilities for whitespace.',
            'Don’t hardcode a border colour; it already reads from the border token.',
            'Don’t stack multiple separators back to back — pick one dividing element per boundary.',
            'Don’t use a vertical separator without a fixed-height parent — it collapses to zero height.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Decorative by default — hidden from the accessibility tree (aria-hidden) via Radix.',
            'Set decorative={false} to expose role="separator" for a genuine section boundary.',
            'Purely visual otherwise; carries no interactive or focusable behavior.',
            'Sizing uses logical width/height, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
