/**
 * Radix grandfather list (decision #7 — migrate-on-touch).
 *
 * New `@radix-ui/*` / `radix-ui` imports are banned by `no-restricted-imports`
 * in `eslint.config.js` — Base UI (`@base-ui/react`) is the headless base for
 * new primitives going forward, with React Aria (`react-aria-components`)
 * reserved for date/time pickers and Tree. These files predate the ban and
 * are exempted from the rule so existing Radix-based primitives keep
 * building; do NOT add new files here.
 *
 * Migrate-on-touch: when a listed file is next touched for real work (not a
 * drive-by fix), port it off Radix onto Base UI / React Aria and remove its
 * entry from this list. Regenerate the full current list with:
 *   rg -l "@radix-ui|from 'radix-ui'|from \"radix-ui\"" packages/ui-kit/src
 *
 * Paths are relative to this package's root (`packages/ui-kit/`), matching
 * how `eslint.config.js` `files` globs resolve.
 */
export const radixAllowlistFiles = [
  'src/composites/DataTableColumnsMenu.tsx',
  'src/composites/ModuleViewTabs.tsx',
  'src/primitives/Accordion.tsx',
  'src/primitives/AlertDialog.tsx',
  'src/primitives/Avatar.tsx',
  'src/primitives/Checkbox.tsx',
  'src/primitives/Dialog.tsx',
  'src/primitives/DropdownMenu.tsx',
  'src/primitives/Label.tsx',
  'src/primitives/Popover.tsx',
  'src/primitives/Progress.tsx',
  'src/primitives/RadialProgress.tsx',
  'src/primitives/RadioGroup.tsx',
  'src/primitives/ScrollArea.test.tsx',
  'src/primitives/ScrollArea.tsx',
  'src/primitives/Select.tsx',
  'src/primitives/Separator.tsx',
  'src/primitives/Sheet.tsx',
  'src/primitives/Slider.tsx',
  'src/primitives/Switch.tsx',
  'src/primitives/Tabs.tsx',
  'src/primitives/Tooltip.tsx',
  'src/shells/AppShell.tsx',
  'src/shells/ModuleRail.tsx',
  'src/shells/SideNav.tsx',
]
