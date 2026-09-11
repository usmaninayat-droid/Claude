# Architecture — locked

## The three-repo model

1. **fams-design-system** — publishes versioned packages (changesets). Two tiers in one repo:
   - **Core tier** (product-agnostic, lint-enforced boundary): `tokens`, `ui-kit`, `skeleton-kit`, `demo-kit`
   - **v5 tier**: `v5-templates`, `v5-composer`, `v5-kit`
   - plus `workshop/` (Storybook 10, axe sweeps, visual-regression baselines, component registry, per-tier CLAUDE.md)
2. **fams-v5-demo-environment** — the demo environment (see [tenant-model.md](tenant-model.md))
3. **fams-v5** — greenfield production. **Not started. `./v5` is read-only reference.**

Future tools (fams-hr…): skeleton-kit + ui-kit, own modules, own in-repo `demo/`.

## Layer cake (each layer imports only below)

```
5b @fams/v5-kit          tenant bootstrap, licensed modules, composer wiring, privileges   (v5 tier)
5a @fams/skeleton-kit + @fams/demo-kit   generic app skeleton + demo machinery            (core)
4  blocks/screens registry   copy-in templates agents scaffold (divergence allowed)
3  @fams/v5-templates + @fams/v5-composer   View, EntityProfile, CreationSheet, TaskDetail (v5 tier)
2  @fams/ui-kit          dumb components incl. charts/KPI cards — token-only styling      (core)
1  @fams/tokens          DTCG, primitive→semantic, tenant themes, Figma-synced            (core)
```

## Folder structures

```text
fams-design-system/
├─ packages/{tokens, ui-kit, skeleton-kit, demo-kit, v5-templates, v5-composer, v5-kit}
└─ workshop/

fams-v5-demo-environment/
├─ app/                      # createFamsApp(v5-kit) + demo-kit (mock backend on)
├─ core/modules/<m>/         # canonical: screens/ + blueprint.json + seeds/
├─ tenants/<t>/              # tenant.json · deltas/<m>.ops.json · seeds/(+users.json personas)
│                            #   · overrides/screens/ (rare bespoke) · modules/ (tenant-native)
├─ resolved/<t>/             # GENERATED + COMMITTED — agents read this, the app renders this
├─ tools/                    # demo resolve · capture · check · promote
└─ CLAUDE.md

fams-v5/  (LATER)
└─ src/
   ├─ server.js… + modules/<m>/{config.json, api/, lib/}   # replicated UNTOUCHED
   ├─ modules/<m>/{contract/, frontend/}                    # NEW / REBUILT
   └─ app/                                                  # React shell

fams-hr/  (example future tool)
├─ app/  ├─ modules/<m>/{api, contract, frontend}  └─ demo/   # in-repo demo (decision #20)
```

## v5 metadata contract (the composer's input — from the v5 deep-dive)

- Storage: Postgres `entityconfig` (config JSON per `org_id`) — per-tenant fields on shared code.
- Shape: `profiletemplate`, `uid_sequence{prefix}`, `prefetch`, `systemcolumns[]` mapping physical cols (`systemcol1..N`, `title`, `status`, `tags`) → `{name, key, type, required, listValues, refModule, entityType}`.
- Field types: SmallText, Email, Numeric, Boolean, SingleSelect, MultiSelect, SingleReference, MultiReference, DateTime, Auto (+ phone/color/assignee special cases).
- Three column families: `systemcolumns`, `streamcolumns` (telemetry), `datacolumns` (analytics).
- Views: ClickUp-style registry (list/map/hybrid/kanban/grid/zones/poi/compliance), saved views per user synced server-side.
- Tenant theming: `theme.json` presets → runtime CSS vars (primary + computed light/dark shades). FAMS `#0072D6`, IWMP `#22c882`, Qatar MM `#6e112d`.

## Security model (decision #23)

- Tenant bootstrap registers only licensed modules' routes → unlicensed chunks never requested.
- Code splitting = hygiene, not a security wall (chunks contain UI code only, never data).
- Real security = server-side per-endpoint privilege checks (v5's untouched auth/privilege system).
- Query cache keyed per tenant, wiped on logout. UI privilege gating (`<Privileged>`) = UX only.
- Bootstrap list also drives nav-hover chunk preloading.
