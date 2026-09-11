import { useState } from 'react'
import { Truck, Fuel, Map, Settings, Search } from '@fams/ui-kit/icons'
import { Button } from '../../../../packages/ui-kit/src/primitives/Button'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '../../../../packages/ui-kit/src/primitives/Command'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * CommandDemo — cmdk-based command list / palette, ported from
 * `FAMS-Design-System-By-Shaheer` (phase 1 §6). `Command` is the inline list
 * primitive (same `cmdk` dependency the Combobox composite already uses);
 * `CommandDialog` renders it inside a modal for the "⌘K" palette pattern.
 */
export default function CommandDemo() {
  const [open, setOpen] = useState(false)

  return (
    <DocPage
      title="Command"
      badge="stable"
      summary="cmdk-based searchable command list. Use Command inline (a search-driven action list) or CommandDialog to present it as a modal palette."
    >
      <DocSection id="preview" title="Preview — inline list">
        <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-card p-10">
          <Command className="w-full max-w-sm border border-border">
            <CommandInput placeholder="Search vehicles or actions…" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Vehicles">
                <CommandItem value="truck-04-12">
                  <Truck aria-hidden="true" className="size-4" />
                  Truck 04-12
                </CommandItem>
                <CommandItem value="truck-08-01">
                  <Truck aria-hidden="true" className="size-4" />
                  Truck 08-01
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem value="view-map">
                  <Map aria-hidden="true" className="size-4" />
                  Open live map
                  <CommandShortcut>⌘M</CommandShortcut>
                </CommandItem>
                <CommandItem value="fuel-report">
                  <Fuel aria-hidden="true" className="size-4" />
                  Fuel report
                </CommandItem>
                <CommandItem value="settings">
                  <Settings aria-hidden="true" className="size-4" />
                  Settings
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </DocSection>

      <DocSection id="dialog" title="Preview — command palette">
        <Prose>
          <Code>CommandDialog</Code> composes the existing <Code>Dialog</Code>/<Code>DialogContent</Code>{' '}
          primitives (no new Radix import — decision #7) and gives the list an accessible, visually-hidden
          title by default.
        </Prose>
        <div className="flex min-h-24 items-center justify-center rounded-md border border-border bg-card p-10">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Search aria-hidden="true" className="size-4" />
            Open command palette
          </Button>
          <CommandDialog open={open} onOpenChange={setOpen} title="Jump to…">
            <CommandInput placeholder="Type a command or search…" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigate">
                <CommandItem value="live-monitoring" onSelect={() => setOpen(false)}>
                  <Map aria-hidden="true" className="size-4" />
                  Live Monitoring
                </CommandItem>
                <CommandItem value="settings" onSelect={() => setOpen(false)}>
                  <Settings aria-hidden="true" className="size-4" />
                  Settings
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'shouldFilter',
              type: 'boolean',
              default: 'true',
              description: 'Command (root, cmdk). Set false to own filtering yourself (async search).',
            },
            {
              prop: 'open / onOpenChange',
              type: 'boolean / (open: boolean) => void',
              description: 'CommandDialog. Controlled — CommandDialog has no built-in trigger; the caller owns when it opens (button click, keyboard shortcut, …).',
            },
            {
              prop: 'title / description',
              type: 'ReactNode',
              default: "'Command palette' / 'Search for a command…'",
              description: 'CommandDialog. Visually-hidden (sr-only) accessible name/description for the dialog.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use Command inline for an always-visible searchable action list.',
            'Use CommandDialog for a global "⌘K" palette triggered from a button or keyboard shortcut.',
            'Group related items with CommandGroup + a heading; separate groups with CommandSeparator.',
          ]}
          donts={[
            'Don’t use Command as a general Select — that’s Select or Combobox.',
            'Don’t forget to close CommandDialog (setOpen(false)) in each item’s onSelect.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'cmdk manages listbox semantics and keyboard navigation (arrow keys, Enter to select) internally.',
            'CommandDialog is built on Dialog (Radix) — traps focus while open and restores it to the trigger on close.',
            'CommandDialog always renders an accessible title/description, even when visually hidden (sr-only).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
