# Phase-4 agent drill — add fields to IWMP ticketing

The scripted, replayable drill that proves the full **vibecode → canonicalize →
verify** loop end-to-end: an agent takes a plain-language ticket and lands two
new fields that are actually **visible** on the rendered task-detail surface —
no hand-written ops, no schema-only dead ends (the gap Task 4.D closes).

Everything here is backed by two automated goalposts, so the script and the
suite never drift:

- `app/src/render-path.test.ts` — proves a details-placed field surfaces in the
  exact derivation TaskDetail renders from (label + value).
- `app/src/drill.verify.test.ts` — the drill's success flag: flip its one
  `DRILL_DONE` constant when the resolved blueprint carries the two fields.

---

## The ticket (verbatim)

> **IWMP Ticketing:** add fields **Severity Level** (select: Low/Medium/High) and
> **Penalty Payment Due Date** (date) to task details.

Success criterion: as **Dispatcher@IWMP**, open a ticket's detail and see both
fields (label + value) on the surface.

---

## Expected agent flow

The fastest-iteration path (decision #15 — *edit the resolved blueprint
directly, then canonicalize*). Never hand-author ops; let capture derive them.

### 1. Branch

```bash
git checkout -b feature/iwmp-ticketing-severity-penalty
```

### 2. Edit `resolved/iwmp/ticketing.blueprint.json` directly

This is the sanctioned vibecode input to `demo capture` (CLAUDE.md hard-rule 1).
Make exactly these edits, using the **canonical placement node shape** so
capture canonicalizes them to a single `addField` op each (see §"Why the shapes
matter" below). `systemcol7`/`systemcol8` are the next free storage slots.

**a. Append two field definitions to `systemcolumns` (after the last entry):**

```json
{ "col": "systemcol7", "id": "fld_tk_severity", "listValues": ["Low", "Medium", "High"], "name": "Severity Level", "type": "SingleSelect" },
{ "col": "systemcol8", "id": "fld_tk_penalty_due", "name": "Penalty Payment Due Date", "type": "DateTime" }
```

**b. Append two placements to `uiConfig.profile.details` (after the Due Date
entry `fld_tk_due`, the last detail node):**

```json
{ "col": "systemcol7", "id": "fld_tk_severity", "order": 1, "pos": "left" },
{ "col": "systemcol8", "id": "fld_tk_penalty_due", "order": 1, "pos": "left" }
```

> Keys may be in any order — `demo resolve`/`capture` normalize to
> sorted-key form. The node **shape** (which keys) is what must match.

### 3. Canonicalize (the agent NEVER writes ops by hand)

Dry-run first to see what capture will derive, then run it for real:

```bash
pnpm demo capture-action --dry     # preview: the ladder + the derived ops
pnpm demo capture iwmp             # append the canonical ops, re-resolve
```

Capture derives **two ops**, one per field, each a single canonical
`addField`-with-placements — e.g.:

```json
{ "opId": "cap_ticketing_1", "op": "addField", "after": "fld_tk_tags",
  "field": { "col": "systemcol7", "id": "fld_tk_severity", "listValues": ["Low","Medium","High"], "name": "Severity Level", "type": "SingleSelect" },
  "placements": { "details": { "after": "fld_tk_due" } } }
```

They are appended to `tenants/iwmp/deltas/ticketing.ops.json`, and
`resolved/iwmp/ticketing.blueprint.json` is regenerated from
`resolve(core + deltas)` — **byte-identical** to the hand edit. If capture
instead reports **AMBIGUOUS** (e.g. a placement node shape it can't express), it
writes `*.ops.proposed.json` and commits nothing — fix the edit to the canonical
shape and re-run (never force it; CLAUDE.md hard-rule 4).

### 4. Green the gate

```bash
pnpm demo resolve --all && pnpm demo check    # resolved == resolve(core+deltas)
pnpm demo debt                                # keep the dashboard fresh
pnpm --filter app test                        # incl. render-path + drill.verify
```

### 5. Flip the drill goalpost + merge

Set `DRILL_DONE = true` in `app/src/drill.verify.test.ts` (its assertions now
prove the fields ARE visible), re-run `pnpm --filter app test`, commit, and
merge the branch.

---

## Verification

### Automated

- `app/src/render-path.test.ts` — a details-placed field yields a TaskDetail
  cell with its label + value (the render-path derivation).
- `app/src/drill.verify.test.ts` — with `DRILL_DONE = true`, both drill fields
  are defined AND placed on the IWMP ticketing detail surface.

### Manual walkthrough (the demo)

```bash
pnpm --filter app dev        # http://localhost:6300
```

Open `http://localhost:6300/?tenant=iwmp&persona=u_dispatcher` (or switch to
tenant **IWMP**, persona **Dispatcher** in the Demo Console). Go to **Tickets**,
open any ticket. On the task-detail surface you now see **Severity Level** and
**Penalty Payment Due Date** alongside Priority, Waste Stream, Assignee, etc.

---

## Why the shapes matter

`demo capture` never guesses. It emits an `addField`-with-placements op only when
re-applying it reproduces the hand-edited resolved file **byte-for-byte**. The
op synthesizes each placement node as a fixed convention:

- `details` / `kanbanCard.*` → `{ id, col, order: 1, pos: "left" }`
- `list` → `{ id, col, component: { name: "TextView" } }`

If your hand edit uses a different placement node shape (e.g. `pos: "right"`),
capture can't reproduce it → it stays a **proposal** (the ambiguous path), by
design. Match the shapes above and capture canonicalizes cleanly.

---

## Founder replay

To re-run the drill from a clean tree:

```bash
# 1. discard any drill edits
git checkout main
git branch -D feature/iwmp-ticketing-severity-penalty   # if it exists

# 2. confirm the STARTING gap (fields absent → DRILL_DONE stays false)
pnpm --filter app test app/src/drill.verify.test.ts      # green: "does not yet show …"

# 3. hand the ticket (verbatim, top of this doc) to the agent and let it run
#    the flow above. When it merges, drill.verify flips to DRILL_DONE = true.
```

The drill is deterministic: same ticket + same edits → same two canonical ops →
same byte-identical resolved blueprint every time.
