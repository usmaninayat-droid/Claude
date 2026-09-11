# SideNav — behavioral spec

## Source of truth

- Production code: `_unpacked/truemax/src/app/App.tsx` (AppNav + ModuleNav)
- Walkthrough: `knowledge-base/live-product-references/11-truemax-production-shell-and-kanban.md`
- Figma: Design System V2 — `App_Nav_item_2` component set

## Anatomy

```
┌────┬──────┐
│ ▣  │      │  ← Logo (28×28 img, top of blue rail)
│    │ Mod1 │  ← Module rail items (34×34, bg-card)
│ 📥•│ Mod2 │
│────│ ...  │  ← Optional divider between inbox and apps
│ A1 │      │  ← App rail items (28×28 squares, rounded-[4px])
│ A2 │      │     Active = bg-white + brand-blue icon
│    │      │     Inactive = bg-[rgba(255,255,255,0.4)] + white icon
│    │      │     Both have border-l-2 accent stripe
│ ⋮  │      │
│ ⚙  │      │  ← Footer items (28×28 CIRCULAR, rounded-full)
│ ?  │      │     Permanent bg-[rgba(255,255,255,0.12)]
│ 👤 │      │     Active flips to bg-white + brand-blue icon
└────┴──────┘
```

## Token usage

| Token | Where |
|---|---|
| `--sidebar` | Blue rail bg |
| `--sidebar-foreground` | White icons on inactive items |
| `--sidebar-primary` | White bg of active items |
| `--sidebar-primary-foreground` | Brand-blue icon on active items |
| `--sidebar-accent` | Hover overlay (15% white) |
| `--status-error` | Red notification dot on Inbox |
| `--primary` | Brand-blue (icon color on active white pill) |

## Props

```ts
interface SideNavProps {
  logo?: React.ReactNode;          // 28×28 brand mark at top
  inboxItem?: SideNavItem | null;  // first footer item, with optional red dot
  apps: SideNavItem[];             // app-switch icons (one active)
  footerItems?: SideNavItem[];     // Settings, Help, Profile typically
  moduleRail?: React.ReactNode;    // typically <ModuleRail items={…}/>
  className?: string;
}

interface SideNavItem {
  id: string;
  label: string;
  icon: LucideIcon | ComponentType<{className?:string; size?:number}>;
  badge?: number | string;
  notificationDot?: boolean;
  active?: boolean;
  onClick?: () => void;
}
```

## States

| State | Bg | Icon color | Border accent |
|---|---|---|---|
| App rail — inactive | `rgba(255,255,255,0.4)` | white 95% | `border-l-2 rgba(0,114,214,0.2)` |
| App rail — active | `#FFFFFF` | brand blue | `border-l-2 rgba(0,114,214,0.3)` |
| App rail — hover | (transition only) | (transition only) | — |
| Footer — inactive | `rgba(255,255,255,0.12)` | white 95% | none |
| Footer — active | `#FFFFFF` | brand blue | none |

## Hard constraints

1. **App rail items are 28×28 SQUARE** (`rounded-[4px]`), NEVER round, NEVER pill, NEVER 40×40.
2. **Footer items are 28×28 CIRCULAR** (`rounded-full`). The geometric distinction app↔footer is intentional.
3. **Every app rail item has a left-border accent stripe** (2px). Both active and inactive — the alpha differs.
4. **Inactive app rail items are NOT transparent** — `rgba(255,255,255,0.4)` always visible.
5. **Footer items have permanent translucent bg** `rgba(255,255,255,0.12)` — never fully transparent.
6. **Inbox notification dot has 2px ring** in `var(--sidebar)` for contrast against the blue rail.

## ModuleRail (white rail) — separate primitive in same file

- 34×34 squares with `rounded-[4px]`
- Active: `bg-primary` (deep brand blue) + WHITE icon
- Inactive: transparent + `muted-foreground` icon
- 16px padding, 12px gap between items
- 1px right border separates from main content area

## Anti-patterns

- ❌ Hand-rolling the sidebar in App.tsx instead of using `<AppShell>` (which renders SideNav internally)
- ❌ Adding hex colors as inline styles ("just to match Figma")
- ❌ Using `rounded-lg` on app rail items (Figma value is `rounded-[4px]` = 4px)
- ❌ Forgetting the left-border accent stripe (very common miss)

## When to update this spec

When Figma updates, re-walk `Design System V2` page → `App_Nav_item_2` component set, capture the new geometry, update both the TSX and this spec.

## Cross-references

- Used by: `@fams-v5/shell` (`AppShell` mounts SideNav)
- Replaces: hand-rolled `<aside>` patterns in old projects
- Related: `top-nav.spec.md` (header that lives next to it)
