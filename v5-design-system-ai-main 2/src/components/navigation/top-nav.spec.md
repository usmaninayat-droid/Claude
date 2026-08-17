# TopNav (Module + Detail variants) — behavioral spec

## Source of truth

- Production code: `_unpacked/truemax/src/app/App.tsx` (view-tab system)
- Walkthrough: `knowledge-base/product-context/20-shell-and-navigation.md`
- Figma screenshots provided 2026-06-08 (Pattern #02)

## Two variants

The shell renders ONE of two top-nav components depending on whether any
detail tab is open in `useDetailTabs()`:

### Variant A — TopNavModule (default)

```
┌────────────────────────────────────────────────────────────────┐
│ Module Name   [Hybrid] [List] [Map] [Kanban] [+]     [+ New] │
└────────────────────────────────────────────────────────────────┘
```

- LEFT: Module display name (14px semibold foreground)
- MIDDLE: view-type tabs from `module.config.views[]`
  - Active: `bg-secondary` (light blue) + brand-blue icon + foreground text
  - Inactive: transparent + `muted-foreground`
- RIGHT (optional): `rightSlot` for toolbar items (Filter, +New, etc.)

### Variant B — TopNavDetail (when details are open)

```
┌────────────────────────────────────────────────────────────────┐
│ ⊙ ⊙   [○ Asset · Hybrid View ×] [○ Asset · Hybrid View ×]      │
└────────────────────────────────────────────────────────────────┘
```

- LEFT: traffic-light dots (red + orange) — DECORATIVE, NOT window controls
- MIDDLE: open detail tabs (one per record in `useDetailTabs()`)
  - Active tab: white bg + 1px border + shadow + brand-blue ring on the circle indicator
  - Inactive: `bg-muted/60`, muted ring
  - Each tab shows `category` (uppercase 9px) + `label` (12px semibold)
  - X button at right of each tab closes it
- Optional "← Back" affordance to close ALL details and return to module

## Props

```ts
interface TopNavModuleProps {
  moduleName: React.ReactNode;
  views: ModuleViewTab[];        // declared by module config
  onAddView?: () => void;        // optional + button
  rightSlot?: React.ReactNode;   // optional right toolbar
}

interface TopNavDetailProps {
  tabs: DetailTab[];             // from useDetailTabs()
  onBack?: () => void;
  showTrafficLights?: boolean;   // default true
  rightSlot?: React.ReactNode;
}
```

## When the shell switches variants

Inside `AppShell`, the `ShellHeader` component reads `useDetailTabs()`:

```ts
if (tabs.length > 0) return <TopNavDetail tabs={…} />;
return <TopNavModule moduleName={…} views={…} />;
```

So when a module renderer calls `openTab({…})`, the shell auto-flips to detail
mode. When the last tab closes, it flips back.

## Hard constraints

1. **TopNavModule + TopNavDetail are NEVER both rendered** — they're mutually
   exclusive based on `useDetailTabs().tabs.length`.
2. **The traffic-light dots are NEVER macOS window controls** — they're a
   tab-strip cue. They're red + orange (no green third). Decorative only.
3. **Each detail tab has a circle indicator** (12×12 with `border-2`) — brand
   blue on active, muted on inactive. NOT a colored dot, an OUTLINE ring.
4. **Detail tab labels are TWO-LINE stacked** — small uppercase category on
   top, larger label below. Not a single line.
5. **View tabs use `kind` → icon mapping** — `hybrid`/`list`/`map`/`kanban`/
   `calendar`/`grouped-list`. The icon comes from the kit's `VIEW_ICON` table.

## Anti-patterns

- ❌ Rendering TopNavModule AND TopNavDetail simultaneously
- ❌ Putting page-level breadcrumbs in TopNav — that's the module's job
- ❌ Adding window-control behavior to the traffic lights
- ❌ Single-line detail tabs (production uses two-line stacked)

## Cross-references

- Used by: `@fams-v5/shell` (`AppShell.ShellHeader`)
- Reads from: `useDetailTabs()` context provider
- Related: `side-nav.spec.md`, `view-tabs.spec.md` (older single-row variant)
