# Naming Conventions — locked

Do not rename any of these without founder approval. The naming *journeys* are recorded so nobody re-proposes a rejected name.

## Packages (all in the fams-design-system repo)

| Package | Tier | What it is |
|---|---|---|
| `@fams/tokens` | core | DTCG design tokens, tenant themes, Figma sync source |
| `@fams/ui-kit` | core | Dumb components only — buttons, inputs, badges, **charts, KPI cards** (no data-awareness) |
| `@fams/skeleton-kit` | core | The generic app skeleton: folder convention, routing + lazy loading, query defaults, theming bootstrap, error boundaries. *(journey: app-kit → skeleton-kit — "it just delivers a few basics")* |
| `@fams/demo-kit` | core | Machinery behind every demo environment: mock backend (MSW), seed loader, relational store, reset, tenant/persona switching. *(journey: demo-kit → studio-kit → sim-kit → canvas-kit → **demo-kit**)* |
| `@fams/v5-templates` | v5 | Whole-view constructions: **View** (ClickUp-style: buttons+filters+labels+list), **EntityProfile** (30/70), **CreationSheet**, **TaskDetail**, ListView. *(journey: patterns → v5-patterns → **v5-templates**)* |
| `@fams/v5-composer` | v5 | The low-code brain: reads **blueprints**, composes **modules** from templates + components. *(journey: schema-engine → metadata-engine → **composer** — DB-schema confusion, then too abstract)* |
| `@fams/v5-kit` | v5 | v5's nervous system: tenant bootstrap → route registration, licensed-module contract, composer wiring, privilege gating. The React rewrite of v5's Vue boot layer |

## Repos

| Repo | Purpose |
|---|---|
| `fams-design-system` | The central DS (all packages above + workshop) |
| `fams-v5-demo-environment` | The **demo environment** for v5 — designers + autonomous agents work here *(journey: demo env → studio → Canvas → **demo environment**)* |
| `fams-v5` | Greenfield production (API replicated untouched, frontend rebuilt) — **not started, do not touch ./v5** |
| `fams-hr` etc. | Future internal tools — skeleton-kit + ui-kit only, own in-repo `demo/` |

## Concepts

| Term | Meaning |
|---|---|
| **blueprint** | A tenant's module configuration (fields, stages, tabs, flows) — what the composer reads |
| **core/** | The canonical product modules in the demo environment *(founder: "core", never "base" — matches v5's `isCoreModule`)* |
| **deltas** | Tenant customizations as **typed ops keyed to stable IDs** (`addField{after:id}`, `hideField{id}`) — never JSON-Patch paths |
| **resolved/** | Generated, committed, complete per-tenant blueprints (lockfile pattern) — what agents read and the app renders |
| **seeds** | Demo data per tenant, including **personas** (`users.json` with roles) |
| **persona** | A demo user inside a tenant; switching = app renders as that logged-in user with their apps/modules/privileges |
| **Demo Console** | Hover-reveal widget at top edge → grid overlay: tenant / persona / module / seed state / preview link |
| **capture** | Approval-time canonicalizer: converts a locked-in PR diff into minimal typed deltas |
| **promote** | Moves a delta op — or a whole tenant-native module — into core/ |
| **vibecoding** | How designers work: natural language to Claude Code while looking at the rendered app. **No visual editor exists** |
| **templates** | Whole-view constructions (the rooms); **components** = dumb UI (the doors/windows); **modules** = composer-assembled products |

## Hierarchy

**components → templates → modules** (no "widgets" layer — dropped by founder).
