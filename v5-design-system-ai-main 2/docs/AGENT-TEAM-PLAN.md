# FAMS V5 — Autonomous Product Team (Plan)

> A standing, virtual product team of senior (30+ yr) persona-agents that
> **communicate, delegate to each other, loop until the work passes explicit
> gates, and self-learn** across sessions. Two modes: **evolve the design
> system** (from Figma / screenshots / live) and **build a product** on top of
> it. This is a PLAN — nothing is scaffolded yet.

---

## 1. Principles

1. **A real team, not one generalist.** Each role is a distinct senior persona
   with opinions, standards, and veto power inside its lane.
2. **They communicate and delegate.** Work flows between agents as **tickets** on
   a shared **Team Workspace**, exactly like a real tracker. QA doesn't fix code —
   it files a defect and *delegates* to the Dev Lead, who reworks, who hands back
   to QA to re-verify.
3. **Loop until gates pass.** `build → parallel review → defects → fix →
   re-review`, capped and escalated. "Done" means gates green, not "code ran."
4. **Self-learning — team AND per-agent memory.** Every agent has its **own**
   memory it reads before acting and updates after; a shared team memory sits
   above it. The system **learns, grows, and adapts every run** — mistakes become
   prevention rules and passing bars ratchet up over time.
5. **DS ↔ product fidelity.** In DS mode QA compares implementation to the Figma
   snapshot in depth; in product mode QA always references the design **and** the
   linked design system — like real-world QA against a spec.
6. **The 6 coherence laws are inviolable** (tokens-only, one shell, config-driven,
   fixed module menu, theming = tokens+logo, FAMS default).
7. **Fixes flow back to the DS.** When something fixed while building a demo is
   really a design-system improvement, it is **backported into the DS** — not left
   stranded in one product. Improve once, every product benefits.
8. **Credit-smart by design.** A dedicated steward keeps the team spending Claude
   usage wisely — cheap gates first, batched/parallel calls, capped loops,
   right-sized models, no needless re-reads.

---

## 2. The team roster

Every agent = a **30+ year persona** + the **skills it wraps** + the **gate it
owns** + **who it can delegate to**.

| # | Agent | Persona (30+ yr) | Owns / Gate | Delegates to |
|---|---|---|---|---|
| 0 | **Conductor** — the *brain* (Product-Owner mind) | Ex-VP Product/Eng, 30 yr; ran design systems at scale. Directs, prioritizes, calm, ruthless about "done." | **Directs the whole team**, runs the loop, routes tickets, enforces gates, escalates to human | everyone |
| 1 | **Product Owner / BA** | 30 yr enterprise SaaS PO; turns fog into acceptance criteria | Spec + acceptance gate (G1) | UX, Researcher |
| 2 | **Design Researcher** | 30 yr UX researcher; benchmarks Jira/Linear/ClickUp/Salesforce/ServiceNow | Research brief; patterns/benchmarks | PO, UX |
| 3 | **UX Designer** | 30 yr product designer; flows, IA, every state | Interaction/flow correctness | UI, Tech Lead |
| 4 | **UI / Visual Designer** | 30 yr visual designer; pixel + token discipline | Design-parity gate (G2) | Dev Lead (via defects) |
| 5 | **Accessibility Specialist** | 30 yr a11y engineer | WCAG AA gate (G5) | Dev Lead |
| 6 | **Tech Lead / DS Architect** | 30 yr staff FE; owns the coherence laws | Coherence + code-review gate (G3) | Frontend Eng |
| 7 | **Frontend Engineer** | 30 yr React/TS; implements config + components | Implements; build gate (G6) | asks Tech Lead |
| 8 | **QA / Test Engineer** | 30 yr SDET; writes tests, diffs design vs impl | Functional + parity gates (G2/G4) | **Dev Lead** (files defects) |
| 9 | **Technical Writer** | 30 yr staff writer | Docs gate (G7) | — |
| 10 | **Cost / Efficiency Steward** | 30 yr eng-productivity lead | Guides *how* the team spends Claude usage; approves expensive steps; efficiency gate (G8) | Conductor |

We'll ship this **full roster in definitions**, then *activate* subsets per loop
(you said: set up the whole team, then break into chunks).

---

## 3. How they communicate & delegate — the Team Workspace

Agents don't call each other directly; they collaborate through a shared,
persistent **Team Workspace** the Delivery Lead routes. This is itself a little
FAMS pipeline (fittingly).

**Location:** `.claude/team/workspace/` — a live board the loop reads/writes.

**Ticket schema** (`tickets.md` / `.json`):

```
Ticket = {
  id, title,
  from,            // agent who raised it
  assignedTo,      // agent who must act (the delegation)
  type,            // spec | design | defect | question | handoff | learning | backport
  severity,        // blocker | major | minor | nit
  refs,            // files, Figma node/frame, screenshot paths, gate id
  detail,          // what + expected vs actual
  status           // open | in-progress | resolved | verified | wontfix
}
```

**Delegation rules (the real-world behavior you described):**

- **QA → Dev Lead:** QA compares the design snapshot to the implementation,
  writes a *defect* ticket (`type:defect`, `refs:[figma frame, screenshot, diff]`,
  expected-vs-actual, severity), `assignedTo: Tech Lead`. Tech Lead triages →
  delegates the fix to Frontend Eng → on fix, status `resolved` → **routes back to
  QA** to re-verify → `verified`. The loop only advances when QA verifies.
- **UI Designer → Dev Lead:** parity nits become defect tickets the same way.
- **Anyone → PO:** ambiguity becomes a `question` ticket; PO answers or escalates.
- **Tech Lead → Human:** if a fix would break a coherence law or needs a new
  module *type*, it's escalated up, not hacked around.

The Delivery Lead keeps a **run log** (`run-log.md`) so every hand-off is
traceable — who did what, which gate flipped, how many iterations.

---

## 4. Self-learning — the team memory

A persistent knowledge base the team **reads before work** and **writes after
every loop**. This is what makes it improve over time instead of repeating the
"output not good" misses.

**Location:** `.claude/team/memory/`

| File | What it accumulates |
|---|---|
| `learnings.md` | Hard-won lessons ("progress derives from stage; cards need chips/progress; filters must be multi-facet next to search; never build products inside the DS"). |
| `patterns.md` | Reusable solutions + external benchmarks (how Linear does filters, how Jira does the issue panel). |
| `decisions.md` | ADR-style: what we chose and why (config vs component, editable detail fields). |
| `defect-log.md` | Recurring defect classes → **prevention rules** that become pre-flight checks. |
| `persona-notes/*.md` | Each role's private craft notes it refines over time. |

**Protocol:**
1. **Pre-flight:** before any task, the relevant agents load the slices of memory
   tagged to their lane (Tech Lead reads `decisions.md` + `defect-log.md`, etc.).
2. **Retro (end of every loop):** the Delivery Lead runs a short retrospective —
   the Writer distills new `learnings` and `defect-log` prevention rules, promotes
   repeat defects into **gate checks** so they can't recur.
3. **Per-agent memory:** each agent owns `persona-notes/<role>.md` — its private,
   growing craft memory (what it always checks, mistakes it made, shortcuts it
   found). It reads its own notes first, then the shared memory.
4. **Compounding:** gates get stricter as the defect log grows; research feeds
   `patterns.md`; the team literally gets better each run — it **grows and adapts**.

> This is the "self-learn" loop: **memory in → work → gates → retro → memory out.**

---

## 5. The two loops

### Loop A — Evolve the Design System
Input: a Figma link / screenshots / live reference + an intent ("fix pipeline filters + detail").

```
Delivery Lead ─► Researcher (benchmarks)        ─► patterns.md
             ─► PO/BA (spec + acceptance G1)
             ─► UX (flows/states) + UI (visual target, reads Figma)
             ─► Tech Lead (design→config/component plan, guards laws)
             ─► Frontend Eng (implement)
             ─► VERIFY LOOP (parallel):
                   UI parity (G2, snapshot vs Figma)
                   QA functional (G4, test cases from spec+learnings)
                   A11y (G5) · Tech Lead code+coherence (G3) · build (G6)
                 └► defects → tickets → Dev Lead → Eng → re-verify … until green
             ─► Writer (docs G7) ─► Retro (memory out) ─► sign-off
```

### Loop B — Build a product from the DS
Input: "build a CRM / fleet app."

```
Delivery Lead ─► PO/BA (modules, entities, views, brand=FAMS default; G1)
             ─► UX (module/view choices) (+UI only if custom brand)
             ─► Frontend Eng (recipe + configs + seed in Code\<slug>, via @ds)
             ─► VERIFY LOOP:
                   QA (G4) — clickable checks; ALWAYS references the design +
                     the linked DS (does it use DS components correctly? match
                     the design? honor coherence?)
                   parity (G2 if a design exists) · a11y (G5) · build (G6) ·
                   "nothing written inside the DS" check
                 └► defects → Dev Lead → Eng → re-verify … until green
             ─► Writer (product README) ─► Retro ─► sign-off
```

### Loop C — Backport (product → design system)

The link that makes the whole thing compound: **a fix made in a demo that belongs
in the DS is pushed up to the DS.**

```
While in Loop B, an agent (usually QA or Tech Lead) hits a gap and fixes it.
Tech Lead classifies the fix:
   • product-specific  → stays in Code\<slug>\   (done)
   • DS-level (a missing renderer, card element, filter, token — anything every
     product would want)  → raise a `backport` ticket
Conductor routes the backport into a scoped Loop A on the DS:
   Tech Lead + Eng implement in the DS → QA parity + coherence + build gates →
   Writer updates DS docs → memory out.
The product then consumes the improved DS and drops its local patch.
```

Rule: **you never fix the same thing twice.** If you patched it in a demo and it
wasn't product-specific, it becomes a DS capability. (This is exactly "if I fix
something while building a demo it should reflect in the DS.")

### The Cost / Efficiency Steward — credit-smart operation

Owns *how* the team spends Claude usage, so quality doesn't mean waste:

- **Cheap gates first** — typecheck + coherence + build before the expensive
  visual diff; stop the loop the instant a blocker is found.
- **Right-sized models** — heavy reasoning (architecture, spec) on the strong
  model; routine reviews/formatting on a lighter one.
- **Batch & parallelize** — fan out independent reviews at once; batch tool calls;
  never re-read what's already in context.
- **Capped loops** — a hard iteration cap; escalate instead of grinding.
- **Reuse memory** — consult `patterns.md`/`defect-log.md` before re-deriving or
  re-researching something already learned.
- **Budget guard (G8)** — flags an expensive step (deep research, full-app
  screenshot sweeps) to the Conductor for go/no-go.

---

## 6. Acceptance gates

`G1` Spec approved · `G2` Design parity · `G3` Coherence (6 laws) · `G4`
Functional QA · `G5` Accessibility (WCAG AA) · `G6` Build (`tsc` + boot) · `G7`
Docs updated · `G8` Efficiency (steward-approved spend). Cheap gates (G3/G6) run first; the expensive visual diff (G2) last.
The gate list **grows** from the defect log.

---

## 7. QA in depth (the role you led with)

**DS mode — "compare design snapshot with implementation":**
1. Pull the Figma frame (node screenshot) + a screenshot of the running component.
2. Diff in depth: layout, spacing, tokens/colors, typography, **every state**
   (default/hover/active/empty/loading/error/disabled), and **behaviors** (drag,
   filter, tab-switch, transitions).
3. Write **test cases** from the spec + `learnings.md`; log each miss as a defect
   ticket with expected-vs-actual + refs; **delegate to the Dev Lead**; re-verify
   after rework.

**Product mode — "always refer to design + linked DS":**
- Verifies the product **consumes DS components** (no bespoke re-implementations),
  **matches the product design** if one exists, and **honors coherence** (tokens,
  one shell, config-driven). Same ticket→delegate→re-verify loop.

QA gets its own skills: `write-test-cases`, `design-parity-diff`,
`coherence-audit` (new), on top of the existing `accessibility-review`.

---

## 8. Skills catalog

**Reuse (already installed):** `product-management:write-spec`,
`synthesize-research`, `product-brainstorming`; `design:design-critique`,
`design-system`, `design-handoff`, `accessibility-review`, `ux-copy`,
`user-research`, `research-synthesis`; `module-flow-doc`.

**New skills to build:**
- `figma-to-spec` — Figma frame/screenshots → structured spec + acceptance criteria.
- `qa-parity` — snapshot-diff impl vs design + generate test cases.
- `coherence-audit` — mechanical check of the 6 laws.
- `team-loop` — the orchestration engine (ticket routing + gate loop + retro).

---

## 9. Physical architecture

```
V5 Design System - Ai/.claude/
  agents/            delivery-lead.md, po-analyst.md, researcher.md, ux.md,
                     ui.md, a11y.md, tech-lead.md, frontend-eng.md, qa.md, writer.md
  skills/            figma-to-spec/, qa-parity/, coherence-audit/, team-loop/
  commands/          evolve-ds.md   (Loop A)   ·   product-loop.md (Loop B)
  team/
    workspace/       tickets.md, run-log.md        ← how they communicate
    memory/          learnings.md, patterns.md, decisions.md, defect-log.md,
                     persona-notes/*.md            ← how they self-learn
```

**How it runs:**
- **Claude Code (recommended):** agents are real **subagents** (parallel reviews),
  the persona is each one's prompt, research uses WebSearch, QA parity uses the
  Figma MCP screenshot + a headless-browser screenshot of the preview. Commands
  (`/evolve-ds`, `/product-loop`) drive the loop.
- **Cowork (here):** same definitions run via the sub-agent tool; the Figma-frame
  read is the weak link, so QA parity is strongest on your machine.

---

## 10. Build order (so we can chunk it)

- **Phase 0 — Foundations:** the `team/` workspace + memory files, the ticket
  schema, and the `team-loop` engine (routing + gates + retro). *Nothing works
  without this.*
- **Phase 1 — Core three:** Tech Lead, Frontend Eng, QA (+ the `qa-parity` and
  `coherence-audit` skills). Enough to run a real verify loop.
- **Phase 2 — Design lane:** UX, UI, A11y, `figma-to-spec`.
- **Phase 3 — Bookends:** PO/BA, Researcher, Writer; wire `/evolve-ds` and
  `/product-loop`.
- **Phase 4 — Learning:** turn the first few retros into gate checks; prove the
  team improves run-over-run.

---

## 11. Knowledge sources — harvest & adapt (build on prior art)

We don't invent the personas' expertise from scratch — we **harvest proven public
skills/agents and adapt them to FAMS**. The one rule that governs every import:

> **Harvest the reasoning, rules, and checklists — never the visual choices.**
> Styles, palettes, and fonts stay locked to the FAMS tokens + the 6 coherence
> laws. Everything imported is filtered through them.

### A. UI UX Pro Max (uploaded, MIT — safe to adapt)

A 491-file design-intelligence pack. What we take:

- **`ui-ux-pro-max/data/ux-guidelines.csv`** — 98 rules (Accessibility, Touch,
  Forms, Navigation, Animation, Layout) with Do/Don't + severity → the **UX + QA +
  A11y review brain**; its **Anti-Pattern column becomes QA gate checks**.
- **`design-system/references/states-and-variants.md`** — state set + priority
  (disabled > loading > active > focus > hover > default) → **state-coverage tests**
  for QA and the UI Designer's checklist.
- **`ui-reasoning.csv` (161)** + **`products.csv` (161)** — pattern reasoning per
  product type → the UX Designer's pattern library (adapted to our module/view model).
- **`design-system/references/token-architecture.md`** (primitive→semantic→
  component) → validates/sharpens the Tech Lead's token model.
- **Skip:** the 161 palettes, 84 styles, logo/banner/slides/image-gen — importing
  those as *options* would break "one coherent product." FAMS tokens are the only palette.

### B. Public marketplaces (base the persona-agents on vetted ones)

- **VoltAgent/awesome-claude-code-subagents** — 100+ subagents incl. a **QA-expert**,
  tech-lead, security personas → base for our QA / Tech Lead / (future) Security roles.
- **pm-claude-skills** — PRD/spec/PM skills → PO/BA persona.
- **ComposioHQ/awesome-claude-skills**, **hesreallyhim/awesome-claude-code**,
  **kodustech/awesome-agent-skills**, **rohitg00/awesome-claude-code-toolkit** —
  orchestration patterns + more personas to cherry-pick.
- **Already installed here:** the `design:*` (critique, design-system, handoff,
  accessibility-review, ux-copy, user-research) and `product-management:*` skills —
  wrap these directly.

### C. How harvested knowledge lands

1. Curated, FAMS-adapted rules → `.claude/team/memory/knowledge/` (e.g.
   `ux-rules.md`, `qa-antipatterns.md`, `states.md`) — read by the relevant agents.
2. Public role-agents → rewritten as our **30-yr personas** in `.claude/agents/`,
   pointed at our gates, tokens, and the knowledge base.
3. The anti-pattern catalog → seeds the **defect-log** and hardens **gate G2/G3/G5**.

---

## 12. Decisions I need from you

1. **Personas:** give them **names + fixed identities** (e.g. "Maya, QA lead") for
   continuity, or keep them role-titled only?
2. **Memory scope:** one shared team memory (recommended), or per-loop memory?
3. **Iteration cap** before escalating to you — default **3** review→fix cycles?
4. **Autonomy:** should the loop pause for your approval at each gate, or run to
   green and only surface a summary + the ticket log?
