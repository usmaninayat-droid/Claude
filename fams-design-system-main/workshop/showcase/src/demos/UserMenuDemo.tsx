import { User, Settings, LogOut } from '@fams/ui-kit/icons'
import { UserMenu, type UserMenuItem } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const ITEMS: UserMenuItem[] = [
  { key: 'profile', label: 'Profile', icon: <User className="size-4" /> },
  { key: 'settings', label: 'Settings', icon: <Settings className="size-4" /> },
  { key: 'logout', label: 'Log out', icon: <LogOut className="size-4" />, destructive: true },
]

/**
 * UserMenuDemo — the app-shell identity control: an avatar trigger opening
 * an identity header plus a caller-defined action list. Composes Avatar and
 * DropdownMenu; retires the v5 codebase's hand-wired
 * shared/components/menus/UserMenu.vue (q-menu + useAuthStore + useViewStore).
 */
export default function UserMenuDemo() {
  return (
    <DocPage
      title="UserMenu"
      badge="stable"
      summary="The app-shell identity control — an avatar trigger opening an identity header plus a caller-defined action list. Composes Avatar and DropdownMenu; retires the v5 codebase's hand-wired shared/components/menus/UserMenu.vue (q-menu + useAuthStore + useViewStore)."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click the avatar — <Code>showName=false</Code> (the default) keeps the trigger to just the
          avatar; identity shows in the opened header instead.
        </Prose>
        <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-card p-10">
          <UserMenu name="Kashish Bindrani" email="kashish@fams.com" jobTitle="Product Manager" items={ITEMS} />
        </div>
      </DocSection>

      <DocSection id="trigger" title="Trigger style">
        <Prose>
          <Code>showName</Code> renders the name beside the avatar in the trigger itself.{' '}
          <Code>avatarSrc</Code> falls back to initials if the image fails to load. <Code>disabled</Code>{' '}
          makes the trigger inert.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Avatar-only',
              caption: 'default',
              node: <UserMenu name="Kashish Bindrani" email="kashish@fams.com" items={ITEMS} />,
            },
            {
              label: 'showName',
              node: <UserMenu name="Emmad Ahmad" email="emmad@fams.com" items={ITEMS} showName />,
            },
            {
              label: 'Image avatar',
              node: (
                <UserMenu
                  name="Saed Salah"
                  email="saed@fams.com"
                  avatarSrc="https://i.pravatar.cc/64?img=12"
                  items={ITEMS}
                />
              ),
            },
            {
              label: 'Disabled',
              node: <UserMenu name="Kashish Bindrani" email="kashish@fams.com" items={ITEMS} disabled />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="header" title="Identity header">
        <Prose>
          <Code>jobTitle</Code> adds a third muted line under email. Omitting both <Code>name</Code>{' '}
          and <Code>email</Code> drops the header entirely — the menu opens straight into the item
          list.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'With jobTitle',
              node: (
                <UserMenu
                  name="Kashish Bindrani"
                  email="kashish@fams.com"
                  jobTitle="Product Manager"
                  items={ITEMS}
                />
              ),
            },
            { label: 'No identity header', node: <UserMenu items={ITEMS} /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'name', type: 'string', description: 'Display name — shown in the trigger (when showName) and identity header.' },
            { prop: 'email', type: 'string', description: 'Secondary identity line under name in the header.' },
            { prop: 'jobTitle', type: 'string', description: 'Tertiary identity line under email in the header (e.g. job title).' },
            { prop: 'avatarSrc', type: 'string', description: 'Avatar image URL; falls back to initials on load failure.' },
            {
              prop: 'items',
              type: 'UserMenuItem[]',
              required: true,
              description: 'Menu rows — { key, label, icon?, onSelect?, destructive?, disabled? }. Order and content are entirely caller-supplied.',
            },
            {
              prop: 'showName',
              type: 'boolean',
              default: 'false',
              description: 'Show name beside the avatar in the trigger itself. Default is avatar-only.',
            },
            { prop: 'align', type: "'start' | 'center' | 'end'", default: "'end'", description: 'Dropdown alignment relative to the trigger.' },
            { prop: 'side', type: "'top' | 'right' | 'bottom' | 'left'", default: "'bottom'", description: 'Dropdown placement relative to the trigger.' },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: "Avatar size, mirrored by the trigger's overall footprint.",
            },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Trigger is inert; menu cannot open.' },
            { prop: 'open', type: 'boolean', description: 'Controlled open state of the menu.' },
            { prop: 'defaultOpen', type: 'boolean', description: 'Uncontrolled initial open state.' },
            { prop: 'onOpenChange', type: '(open: boolean) => void', description: 'Fired when the menu opens or closes.' },
            { prop: 'className', type: 'string', description: 'Applied to the trigger button.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Keep the default avatar-only trigger in dense app shells; reserve showName for wide headers.',
            'Order items with destructive actions (log out) last.',
            'Pass jobTitle when the identity needs a third line — never cram it into email.',
            'Supply onOpenChange only when the caller genuinely needs to sync external state.',
          ]}
          donts={[
            "Don't encode business meaning in an item's label — pass plain label/icon/onSelect/destructive.",
            "Don't read auth/session state inside UserMenu — every field is caller-supplied.",
            "Don't add a navigation item that isn't a real action — this is a menu, not a nav rail.",
            "Don't disable the trigger without another way to reach account actions.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Trigger is a native <button>; when showName is false it carries an aria-label ("<name> — account menu") since the visible content is icon-only.',
            'Full keyboard support inherited from Radix DropdownMenu — arrow keys, Home/End, Escape to close, focus returns to the trigger.',
            'destructive rows are visually distinct but still keyboard-reachable and announced as regular menu items — the label text carries the meaning.',
            'Header, item icons, and destructive row stay logical under RTL (switch the header language) — no left/right overrides.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
