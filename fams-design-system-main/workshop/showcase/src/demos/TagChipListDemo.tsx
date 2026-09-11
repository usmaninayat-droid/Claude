import { TagChipList, type TagOption } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const ESP_TAGS: TagOption[] = [
  { value: 'lavajet', label: 'Lavajet', color: '#12b76a' },
  { value: 'alphamed', label: 'Alphamed', color: '#f79009' },
  { value: 'tajmee', label: "Tajmee'e", color: '#0072e0' },
]

const OVERFLOW_TAGS: TagOption[] = [
  { value: 'gps-issue', label: 'GPS issue', color: '#f04438' },
  { value: 'fuel-theft', label: 'Fuel theft', color: '#f79009' },
  { value: 'overspeeding', label: 'Overspeeding', color: '#f04438' },
  { value: 'geofencing', label: 'Geofencing', color: '#0072e0' },
  { value: 'idle-time', label: 'Idle time', color: '#12b76a' },
]

type TagChipListControls = {
  variant: 'soft' | 'solid'
  size: 'sm' | 'md'
  removable: boolean
}

/**
 * TagChipListDemo — read-only tag display, given already-resolved tags.
 * Retires the v5 codebase's TagChips (68 call sites, the single
 * highest-count component migrated so far) — this presenter never reads a
 * tag store; resolving ids to {label,color} is an app-layer hook.
 */
export default function TagChipListDemo() {
  return (
    <DocPage
      title="TagChipList"
      badge="stable"
      summary="Pure display, given already-resolved tags. soft shows a muted pill with a color dot; solid fills with the tag's own color when supplied. Resolving ids to {label,color} is the caller's job — same contract as useEntityPicker."
    >
      <DocSection id="playground" title="Playground">
        <Playground<TagChipListControls>
          controls={[
            { name: 'variant', type: 'select', default: 'soft', options: ['soft', 'solid'] },
            { name: 'size', type: 'select', default: 'sm', options: ['sm', 'md'] },
            { name: 'removable', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <TagChipList
              tags={ESP_TAGS}
              variant={v.variant}
              size={v.size}
              onRemove={v.removable ? () => {} : undefined}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="variants" title="Variants & sizes">
        <Prose>
          <Code>soft</Code> = muted pill + color dot. <Code>solid</Code> = filled with the tag's own
          color. <Code>size</Code> is <Code>sm</Code> (default) or <Code>md</Code> — height and font
          scale together.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            { label: 'soft', node: <TagChipList tags={ESP_TAGS} variant="soft" /> },
            { label: 'solid', node: <TagChipList tags={ESP_TAGS} variant="solid" /> },
            { label: 'sm', caption: 'default', node: <TagChipList tags={ESP_TAGS} size="sm" /> },
            { label: 'md', node: <TagChipList tags={ESP_TAGS} size="md" /> },
          ]}
        />
      </DocSection>

      <DocSection id="overflow" title="Overflow and editable">
        <Prose>
          <Code>max</Code> caps visible chips into a "+N" chip with a tooltip listing the rest;{' '}
          <Code>onRemove</Code> renders a remove button per chip.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            { label: 'max={3}', caption: '5 tags, capped', node: <TagChipList tags={OVERFLOW_TAGS} max={3} /> },
            { label: 'onRemove', caption: 'editable', node: <TagChipList tags={ESP_TAGS} onRemove={() => {}} /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'tags',
              type: 'TagOption[]',
              required: true,
              description: 'Already-resolved tags — { value, label, color?, group? }. Never reads a tag store itself.',
            },
            {
              prop: 'variant',
              type: "'soft' | 'solid'",
              default: "'soft'",
              description: 'soft = muted pill + color dot. solid = filled with the tag\'s own color.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md'",
              default: "'sm'",
              description: 'Height and font scale together.',
            },
            {
              prop: 'max',
              type: 'number',
              description: 'Cap visible chips; the rest collapse into a "+N" chip with a tooltip. Omit to show all.',
            },
            {
              prop: 'onRemove',
              type: '(value: string) => void',
              description: 'Presence renders a remove button per chip (the given-array tag-editor case).',
            },
            { prop: 'className', type: 'string', description: 'Applied to the chip list container.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Resolve ids to {label, color} in an app-layer hook before passing tags in.',
            'Use solid only when the tag color itself carries meaning (ESP, category).',
            'Cap long tag lists with max instead of letting chips wrap indefinitely.',
            'Pass onRemove only in editable contexts — its presence is the affordance.',
          ]}
          donts={[
            "Don't have TagChipList read a tag store directly — it is pure display.",
            "Don't invent a new chip variant for a one-off screen; soft/solid cover the design space.",
            "Don't treat color as a design token — it is caller data, same as a chart series color.",
            "Don't omit a group on tags meant for TagPicker's exclusiveGroups — grouping happens upstream.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The overflow "+N" chip exposes its full list via an accessible tooltip, not just a hover title.',
            'Remove buttons carry an aria-label ("Remove <label>") — never an icon-only unlabeled control.',
            'Color dots are decorative; the text label always carries the tag identity.',
            'Chip padding/gap and the remove button mirror automatically under RTL via logical properties.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
