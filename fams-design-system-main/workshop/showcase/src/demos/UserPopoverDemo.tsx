import { User } from '@fams/ui-kit/icons'
import { UserPopover, Button } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * UserPopoverDemo — the compact identity popover: one row of avatar + name +
 * email with a trailing destructive logout icon-button, anchored to a
 * caller-supplied trigger (Figma "Live Monitoring" node 23099:17295).
 */
export default function UserPopoverDemo() {
  return (
    <DocPage
      title="UserPopover"
      badge="stable"
      summary="Compact identity popover — one row of avatar, name, and truncating email with a trailing destructive logout icon-button. A popover, not a modal: Escape, outside click, and trigger re-click dismiss it, and focus returns to the trigger. The v5 shell anchors it to the rail-footer user icon."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click the trigger — the popover opens with focus on the logout button (its only
          interactive child). The trigger is a caller-supplied slot rendered <Code>asChild</Code>,
          so any focusable button-like element works.
        </Prose>
        <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-card p-10">
          <UserPopover
            name="Avery Stone"
            email="avery@fams.example"
            trigger={
              <Button variant="secondary" size="sm">
                <User aria-hidden className="size-4" /> Account
              </Button>
            }
          />
        </div>
      </DocSection>

      <DocSection id="truncation" title="Truncation & identity forms">
        <Prose>
          The popover hugs its content but clamps its width, so a long name or email truncates to
          one line (full value exposed via <Code>title</Code>) instead of pushing the logout button
          out of the container. Email is optional.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Default',
              node: (
                <UserPopover
                  name="Avery Stone"
                  email="avery@fams.example"
                  trigger={<Button variant="secondary" size="sm">Open</Button>}
                />
              ),
            },
            {
              label: 'Long name + email',
              caption: 'truncates, logout stays put',
              node: (
                <UserPopover
                  name="Benjamin Braun-Hohenberg von und zu Liechtenstein"
                  email="benjamin.braun-hohenberg@very-long-subdomain.fams.example"
                  trigger={<Button variant="secondary" size="sm">Open</Button>}
                />
              ),
            },
            {
              label: 'No email',
              node: (
                <UserPopover name="Dana Reyes" trigger={<Button variant="secondary" size="sm">Open</Button>} />
              ),
            },
            {
              label: 'Image avatar',
              node: (
                <UserPopover
                  name="Saed Salah"
                  email="saed@fams.com"
                  avatarSrc="https://i.pravatar.cc/64?img=12"
                  trigger={<Button variant="secondary" size="sm">Open</Button>}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="placement" title="Placement">
        <Prose>
          Defaults to <Code>side=&quot;top&quot; align=&quot;start&quot;</Code> — opening up-right
          from a bottom-rail icon, the shell&apos;s anchor position. Collision handling flips it
          when there is no room.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'top / start (default)',
              node: (
                <UserPopover
                  name="Avery Stone"
                  email="avery@fams.example"
                  trigger={<Button variant="secondary" size="sm">Open</Button>}
                />
              ),
            },
            {
              label: 'right / end',
              node: (
                <UserPopover
                  name="Avery Stone"
                  email="avery@fams.example"
                  side="right"
                  align="end"
                  trigger={<Button variant="secondary" size="sm">Open</Button>}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'name', type: 'string', required: true, description: 'Display name — first row, also seeds the avatar initials.' },
            { prop: 'email', type: 'string', description: 'Secondary identity line; truncates to one line, full value via title.' },
            { prop: 'avatarSrc', type: 'string', description: 'Avatar image URL; falls back to initials.' },
            { prop: 'onLogout', type: '() => void', description: 'Fired when the logout icon-button is pressed.' },
            { prop: 'logoutLabel', type: 'string', default: "'Log out'", description: 'Accessible name for the logout icon-button.' },
            {
              prop: 'trigger',
              type: 'ReactNode',
              required: true,
              description: 'The anchor element (rendered asChild — must be a focusable, ref-taking button-like element).',
            },
            { prop: 'side', type: "'top' | 'right' | 'bottom' | 'left'", default: "'top'", description: 'Popover placement relative to the trigger.' },
            { prop: 'align', type: "'start' | 'center' | 'end'", default: "'start'", description: 'Popover alignment along the chosen side.' },
            { prop: 'open', type: 'boolean', description: 'Controlled open state.' },
            { prop: 'defaultOpen', type: 'boolean', description: 'Uncontrolled initial open state.' },
            { prop: 'onOpenChange', type: '(open: boolean) => void', description: 'Fired when the popover opens or closes.' },
            { prop: 'className', type: 'string', description: 'Applied to the popover content.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for the app shell\'s "who am I / sign out" affordance — one identity row, one action.',
            'Keep the trigger a real button-like element (SideNavFooterItem, Button) so focus and aria wiring land on it.',
            'Supply onLogout from the app layer (session/auth live there, never in here).',
            'Prefer UserMenu instead when the surface needs a LIST of account actions — this popover deliberately has no menu items.',
          ]}
          donts={[
            "Don't add menu rows or navigation into the popover — it is identity + logout only, per design.",
            "Don't read auth/session state inside UserPopover — every field is caller-supplied.",
            "Don't wire logout to a bare icon without confirmation UX at the APP layer if the product mandates one — the component fires immediately by design.",
            "Don't override the width clamp; long identities must truncate, not stretch the popover.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Popover, not modal: role="dialog" without aria-modal, no scrim, no focus trap — Escape, outside click, and trigger re-click dismiss it and focus returns to the trigger.',
            'The trigger receives aria-haspopup="dialog" and aria-expanded from the primitive.',
            'On open, focus moves to the logout button — the only interactive child — a real <button> with an accessible name (logoutLabel) and a ≥40px hit target around its 18px glyph.',
            'Name and email are static text with title attributes carrying the untruncated values; layout uses logical properties and stays correct under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
