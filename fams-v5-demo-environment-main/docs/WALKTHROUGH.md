# Founder walkthrough — FAMS v5 demo (Phase 3 gate)

The exact click-path to demo the multi-tenant, metadata-driven, coherent-data
environment. Every claim here is backed by an automated test (mapping at the
bottom), so the script and the suite never drift.

## 0. Run it

```bash
cd ../fams-design-system && pnpm install && pnpm build   # build all DS packages
cd ../fams-v5-demo-environment && pnpm install
pnpm --filter app msw:init      # once — writes public/mockServiceWorker.js (committed)
pnpm --filter app dev           # http://localhost:6300
```

Opens on tenant **FAMS**, persona **Administrator** (the first tenant + persona).

## 1. The Demo Console

Hover the **top edge** of the window (or press `Tab` to the hidden trigger) → the
Demo Console drops down. It drives tenant / persona / module-jump / reset / share.

## 2. Switch tenant: FAMS ↔ IWMP (theme + metadata change)

In the console, switch **FAMS → IWMP**. The app reloads as IWMP:

- **Theme**: the rail turns green with the IWMP **gradient** (the DS
  `[data-tenant='iwmp']` token block — `--color-primary #22c882` +
  `--color-sidebar-gradient`). FAMS is canonical blue (`#0072D6`).
- **Metadata deltas** on the Vehicles module (open Vehicles, view a profile /
  the list, and the "New" form):
  - **Renamed** — the "Vehicle Type" field/column reads **"Vehicle Class"**
    (`setLabel`).
  - **Hidden** — the **Brand** column is gone from the vehicles list
    (`hideField`; the field still exists on the profile).
  - **Added** — two IWMP-only fields, **Bin Capacity** and **Collection
    Route** (`addField` ×2), appear in the New-vehicle creation form and in
    IWMP's resolved blueprint. FAMS has neither.

FAMS carries **zero deltas** (the reference view); IWMP's four asset deltas +
one ticketing delta ("Category" → **"Waste Stream"**) are the only differences,
all expressed as typed ops on stable ids.

## 3. Switch persona: Administrator ↔ Dispatcher (RBAC)

In the console, switch persona **Administrator → Dispatcher** (same tenant):

- The **Settings** module disappears from the rail (dispatcher lacks
  `settings.view`; the `/api/bootstrap` endpoint omits it).
- On **Tickets** (the kanban board) the dispatcher has **no "New" button**
  (lacks `ticketing.create`).
- The dispatcher keeps `asset.view` / `workforce.view|create` / `ticketing.view`.

## 4. Data coherence: workforce → vehicle Assignments

As either persona:

1. Open **Workforce** → **New** → create a person, set **Assigned Vehicle** to a
   vehicle (e.g. `VEH-45`), save.
2. Open **Vehicles** → open **VEH-45** → the **Assignments** tab now lists that
   person.

Under the hood: the create goes `fetch → MSW → demo-kit store`; the store keeps
bidirectional reference integrity, and the Assignments tab reads
`store.getReferrers(vehicleId)` (filtered to workforce). No bespoke plumbing —
the link surfaces because the reference exists.

## 5. Reset seeds

Console → **Reset**. The store re-seeds (the created person is gone, counts back
to the seeded set) and the app reloads.

## 6. `demo check` is green

```bash
pnpm demo resolve --all && pnpm demo check
# → check: OK — 12 resolved file(s) match; ops, manifests and JSON all valid.
```

## 7. Break a delta, watch CI fail (the honesty proof)

Make this **one-line edit** to a live delta — corrupt a stable id:

- Open `tenants/iwmp/deltas/asset.ops.json`, in the `op_iwmp_label_type` op
  change `"id": "fld_type"` to `"id": "fld_typo"`.

Then run the gate:

```bash
pnpm demo check
# → check: FAILED with 7 problem(s):
#     ✗ resolve failed for tenant "iwmp": resolve: invalid op at
#       iwmp/deltas/asset.ops.json[3]:
#       - setLabel (op_iwmp_label_type): references missing field id "fld_typo"
#     ✗ orphaned resolved file (nothing resolves to it): resolved/iwmp/asset.blueprint.json
#     … (the stale-id failure cascades — the point is it is LOUD and non-zero)
```

Non-zero exit → **CI fails** (never a silent wrong-merge). **Revert** the edit
(`git checkout tenants/iwmp/deltas/asset.ops.json`) and `demo check` is green
again. This is exactly what the `break-a-delta` tool test asserts.

## Automated coverage (script ↔ test map)

| Walkthrough step | Test |
|---|---|
| §2 tenant deltas render (renamed/hidden/added, FAMS vs IWMP) | `app/src/pilot.integration.test.ts` › *tenant delta* |
| §3 persona gating (admin vs dispatcher; settings + ticketing.create) | `app/src/demo/gating.test.ts`; `app/src/boot.test.ts` |
| §4 create workforce → vehicle Assignments (fetch/MSW → getReferrers) | `app/src/pilot.integration.test.ts` › *coherence* |
| §5 reset re-seeds | `app/src/pilot.integration.test.ts` › *coherence* (reset) |
| §2/§4 CRUD over the v5 contract | `app/src/demo/ApiDataAdapter.test.ts` |
| Tickets land in the right lane + create default stage | `app/src/pilot.integration.test.ts` › *pipeline … correct lane* |
| §3 role-gated transition blocked for dispatcher | `app/src/pilot.integration.test.ts` › *role-gated transition* |
| §7 break-a-delta → check exits non-zero, loud | `tools/test/check.test.mjs` › *break-a-delta* |
