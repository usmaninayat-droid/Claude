import { Avatar } from '../../../../packages/ui-kit/src/primitives/Avatar'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const STATUSES = ['none', 'online', 'offline', 'busy'] as const

// 1x1 teal PNG data URI — loads instantly, no network dependency, so the
// "image" state renders reliably in the showcase without an external asset.
const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

type AvatarControls = {
  size: (typeof SIZES)[number]
  status: (typeof STATUSES)[number]
  name: string
}

/**
 * AvatarDemo — reference implementation of the standard component-page
 * template (DocPage → Playground → Gallery per dimension → PropsTable →
 * Guidelines → Accessibility). RTL is proven by the global header switcher,
 * not a per-page block.
 */
export default function AvatarDemo() {
  return (
    <DocPage
      title="Avatar"
      badge="stable"
      summary="Person/entity image with an initials fallback. Each size pairs a size-* token with a matched type-scale token. Status dots use ring-card so the outline always matches the surface the avatar sits on. Retires ~173 ad-hoc q-avatar usages and the bespoke CustomAvatar.vue hash-palette component."
    >
      <DocSection id="playground" title="Playground">
        <Playground<AvatarControls>
          controls={[
            { name: 'size', type: 'select', default: 'md', options: SIZES },
            { name: 'status', type: 'select', default: 'online', options: STATUSES },
            { name: 'name', type: 'text', default: 'John Doe' },
          ]}
        >
          {(v) => (
            <Avatar size={v.size} name={v.name} status={v.status === 'none' ? undefined : v.status} />
          )}
        </Playground>
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>
          <Code>xs</Code> · <Code>sm</Code> · <Code>md</Code> (default) · <Code>lg</Code> ·{' '}
          <Code>xl</Code> — initials scale with the circle.
        </Prose>
        <Gallery
          minColRem={8}
          items={SIZES.map((size) => ({
            label: size,
            node: <Avatar size={size} name="John Doe" />,
          }))}
        />
      </DocSection>

      <DocSection id="image-fallback" title="Image & fallback">
        <Prose>
          A working <Code>src</Code> renders the image; a missing or broken <Code>src</Code> falls
          back to initials derived from <Code>name</Code> (or <Code>alt</Code>).
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'image', caption: 'src loads', node: <Avatar size="lg" src={SAMPLE_IMAGE} alt="Sara Ahmed" /> },
            {
              label: 'broken src',
              caption: 'falls back to initials',
              node: <Avatar size="lg" src="/this-image-does-not-exist.jpg" name="Karim Nasser" />,
            },
            { label: 'initials only', node: <Avatar size="lg" name="Layla Haddad" /> },
          ]}
        />
      </DocSection>

      <DocSection id="tones" title="Semantic tones">
        <Prose>
          An explicit <Code>tone</Code> replaces the deterministic per-name hash palette — for
          role/severity-coded avatars (always-red Supervisor, always-green Reported By) and{' '}
          <Code>neutral</Code> for quiet identity surfaces (the user popover, per the logout-popup
          spec: neutral-300 ground, neutral-600 initials).
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'primary', node: <Avatar size="lg" name="Ali Ahmad" tone="primary" /> },
            { label: 'success', node: <Avatar size="lg" name="Ali Ahmad" tone="success" /> },
            { label: 'warning', node: <Avatar size="lg" name="Ali Ahmad" tone="warning" /> },
            { label: 'danger', node: <Avatar size="lg" name="Ali Ahmad" tone="danger" /> },
            { label: 'info', node: <Avatar size="lg" name="Ali Ahmad" tone="info" /> },
            { label: 'neutral', caption: 'quiet identity', node: <Avatar size="lg" name="Avery Stone" tone="neutral" /> },
          ]}
        />
      </DocSection>

      <DocSection id="status" title="Status">
        <Prose>
          <Code>online</Code> · <Code>offline</Code> · <Code>busy</Code> — a corner dot ringed in{' '}
          <Code>ring-card</Code>, so it reads correctly on any surface.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'online', node: <Avatar size="lg" name="John Doe" status="online" /> },
            { label: 'offline', node: <Avatar size="lg" name="John Doe" status="offline" /> },
            { label: 'busy', node: <Avatar size="lg" name="John Doe" status="busy" /> },
            {
              label: 'on muted surface',
              caption: 'ring follows the card token',
              node: (
                <div className="rounded-sm bg-muted p-4">
                  <Avatar size="lg" name="John Doe" status="online" />
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
              type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'",
              default: "'md'",
              description: 'Circle diameter, paired with a matched type-scale token for the initials.',
            },
            {
              prop: 'src',
              type: 'string',
              description: 'Image source. Falls back to initials on load error or when omitted.',
            },
            {
              prop: 'alt',
              type: 'string',
              description: 'Accessible label and fallback source for initials when name is absent.',
            },
            {
              prop: 'name',
              type: 'string',
              description: 'Person/entity display name — the fallback initial is the first letter of this.',
            },
            {
              prop: 'status',
              type: "'online' | 'offline' | 'busy'",
              description: 'Presence indicator rendered as a corner dot. Omit for no dot.',
            },
            {
              prop: '…props',
              type: "Omit<ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>, 'children'>",
              description: 'className and any span attribute pass through to the Radix Avatar root.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always pass name (or alt) so the initials fallback is meaningful, not blank.',
            'Use status only where presence is a real, live signal — not decoratively.',
            'Match size to context: xs/sm in dense lists, lg/xl in profile headers.',
            'Group avatars with a consistent size within the same list or stack.',
          ]}
          donts={[
            "Don't hardcode a background colour for the fallback — it already uses the muted token.",
            "Don't rely on the status dot alone to convey presence — pair with text where it matters.",
            "Don't crop or distort src images outside the component's own object-cover handling.",
            "Don't use Avatar as a clickable button without wrapping it in one — it renders a plain span.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Image swaps to the initials Fallback automatically on load error — no broken-image icon ever shown.',
            'alt (or name) is applied to the underlying <img>, so screen readers announce the person, not "image".',
            'The status dot is aria-hidden — it is decorative, not the sole carrier of presence information.',
            'Meets WCAG 2.2 AA contrast for initials text against the fallback background in every size.',
            'Layout uses logical properties (corner dot at the logical end), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
