import { useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * DropdownMenuDemo — Radix-backed menu for contextual actions and option
 * lists. See docs/COMPONENT-GUIDE.md for the standard component-page template.
 */
export default function DropdownMenuDemo() {
  const [showGps, setShowGps] = useState(true)
  const [showFuel, setShowFuel] = useState(false)
  const [sortBy, setSortBy] = useState('lot')

  return (
    <DocPage
      title="DropdownMenu"
      badge="stable"
      summary="Radix-backed menu for contextual actions and option lists — row actions, kebab menus, and pickers. Supports a destructive item variant plus checkbox, radio, and nested sub-menu items."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click the trigger to open. Arrow keys move between items, Enter/Space selects, Escape or
          an outside click dismisses.
        </Prose>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Truck 07</DropdownMenuLabel>
            <DropdownMenuItem>
              Edit
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DocSection>

      <DocSection id="item-types" title="Item types">
        <Prose>
          Beyond a plain <Code>DropdownMenuItem</Code>, the menu composes checkbox items, a
          single-select radio group, and nested sub-menus.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Checkbox items',
              caption: 'toggle without closing the menu',
              node: (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary">Map layers</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Layers</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem checked={showGps} onCheckedChange={setShowGps}>
                      GPS layer
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={showFuel} onCheckedChange={setShowFuel}>
                      Fuel theft alerts
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
            {
              label: 'Radio group',
              caption: 'single-select option list',
              node: (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary">Sort by</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                      <DropdownMenuRadioItem value="lot">Lot</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="lastReport">Last report</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
            {
              label: 'Sub-menu',
              caption: 'nested second-level list',
              node: (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary">Route actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Assign to</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>Lavajet</DropdownMenuItem>
                        <DropdownMenuItem>Alphamed</DropdownMenuItem>
                        <DropdownMenuItem>Tajmee'e</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="grouping" title="Grouping & portaling">
        <Prose>
          <Code>DropdownMenuGroup</Code> wraps a run of related items in a semantic{' '}
          <Code>role=&quot;group&quot;</Code>, so a <Code>DropdownMenuLabel</Code> placed above it is
          announced as that group&apos;s heading rather than as a loose row. Use it whenever one menu
          carries two or more distinct clusters of actions — the separator alone is decoration, the
          group is the semantics.
        </Prose>
        <Prose>
          <Code>DropdownMenuPortal</Code> is only needed for <em>manual</em> composition:{' '}
          <Code>DropdownMenuContent</Code> already portals itself, but{' '}
          <Code>DropdownMenuSubContent</Code> does not. Wrap a sub-menu&apos;s content in the portal
          when the menu is mounted inside a clipped or transformed ancestor (an overflow-hidden card,
          a scroll container, a transformed drawer) so the second-level panel escapes the clip.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Grouped items',
              caption: 'DropdownMenuGroup — role="group" per cluster',
              node: (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary">Vehicle</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Record</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem>Edit details</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Dispatch</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem>Assign driver</DropdownMenuItem>
                      <DropdownMenuItem>Send to workshop</DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive>Decommission</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
            {
              label: 'Portaled sub-menu',
              caption: 'DropdownMenuPortal wrapping DropdownMenuSubContent',
              node: (
                <div className="w-full overflow-hidden rounded-md border border-border p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary">Clipped card</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>Open</DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Move to lot</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem>Lot 1</DropdownMenuItem>
                            <DropdownMenuItem>Lot 2</DropdownMenuItem>
                            <DropdownMenuItem>Lot 7</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              prop: 'DropdownMenu',
              type: 'Radix DropdownMenu.Root props',
              description: 'open, defaultOpen, onOpenChange, modal — the root controls open state.',
            },
            {
              prop: 'DropdownMenuTrigger',
              type: 'Radix DropdownMenu.Trigger props',
              description: 'asChild renders the trigger as its child element instead of a wrapping button.',
            },
            {
              prop: 'DropdownMenuContent',
              type: 'ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>',
              default: 'sideOffset=4',
              description: 'The floating panel, portaled and positioned relative to the trigger.',
            },
            {
              prop: 'DropdownMenuItem',
              type: 'ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }',
              description:
                'destructive tints the row red for irreversible actions; disabled skips it during navigation.',
            },
            {
              prop: 'DropdownMenuCheckboxItem',
              type: 'ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>',
              description: 'checked, onCheckedChange — toggles without closing the menu.',
            },
            {
              prop: 'DropdownMenuRadioGroup / DropdownMenuRadioItem',
              type: 'Radix RadioGroup / RadioItem props',
              description: 'value, onValueChange on the group; value on each item — single-select option list.',
            },
            {
              prop: 'DropdownMenuLabel',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Muted, non-interactive section heading.',
            },
            {
              prop: 'DropdownMenuGroup',
              type: 'Radix DropdownMenu.Group props',
              description:
                'Semantic wrapper (role="group") around a cluster of related items — pair with a DropdownMenuLabel so the cluster gets an announced heading. Renders no chrome of its own.',
            },
            {
              prop: 'DropdownMenuPortal',
              type: 'Radix DropdownMenu.Portal props',
              description:
                'container, forceMount — portals its children to the document body. Only needed for manual composition around DropdownMenuSubContent; DropdownMenuContent already portals itself, so wrapping that would double-portal.',
            },
            {
              prop: 'DropdownMenuShortcut',
              type: 'HTMLAttributes<HTMLSpanElement>',
              description: 'Muted keyboard-shortcut hint, pushed to the trailing edge via logical ms-auto.',
            },
            {
              prop: 'DropdownMenuSeparator',
              type: 'Radix Separator props',
              description: 'Visual divider between groups or items.',
            },
            {
              prop: 'DropdownMenuSub / SubTrigger / SubContent',
              type: 'Radix Sub / SubTrigger / SubContent props',
              description: 'Nested second-level menu; the chevron flips under RTL via rtl:-scale-x-100.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Lead each item label with a verb — "Edit", "Duplicate", "Delete".',
            'Group related items with a DropdownMenuSeparator instead of a blank row.',
            'Use destructive only for the one irreversible action in the menu, placed last.',
            'Use checkbox items for independent toggles, radio items for mutually exclusive choices.',
            'Wrap each cluster in a DropdownMenuGroup under its DropdownMenuLabel — the separator is decoration, the group carries the semantics.',
          ]}
          donts={[
            'Don’t put more than one destructive item in the same menu.',
            'Don’t nest a sub-menu more than one level deep.',
            'Don’t use DropdownMenu for a searchable list of more than ~10 options — use Command instead.',
            'Don’t rely on hover alone to reveal a sub-menu; it must open on click/keyboard too.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Radix manages roving focus — arrow keys move between items, Home/End jump to the ends.',
            'Typeahead: typing jumps to the next item starting with that character.',
            'Checkbox and radio items expose aria-checked so state is announced by assistive tech.',
            'Escape closes the menu and returns focus to the trigger.',
            'DropdownMenuGroup emits role="group", so the DropdownMenuLabel above it is announced as that cluster’s heading instead of a stray row.',
            'DropdownMenuPortal keeps a sub-menu in the document body, so clipping ancestors never truncate it — focus order and the aria wiring are preserved by Radix regardless.',
            'The sub-menu chevron mirrors under RTL (switch the header language); item order mirrors via logical properties.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
