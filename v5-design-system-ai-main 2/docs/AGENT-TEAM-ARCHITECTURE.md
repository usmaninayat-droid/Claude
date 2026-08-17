# FAMS V5 — Agent Team: Claude Code Architecture

> The concept lives in `AGENT-TEAM-PLAN.md`. This doc maps it onto **how Claude
> Code actually works** — its real primitives and hard constraints — so the team
> is buildable, not aspirational.

---

## 0. The reality of Claude Code (what we must design around)

| Capability | What it gives us | Hard constraint we design around |
|---|---|---|
| **Subagents** (`.claude/agents/*.md`) | A persona with its own **isolated context**, own tool allowlist, own **model** | They **cannot call or talk to each other**. They run, then return **one final message** to whoever spawned them. |
| **Skills** (`.claude/skills/<n>/SKILL.md`) | Reusable procedures + bundled scripts, model-invoked by description | Just instructions/'+scripts; no state of their own. |
| **Slash commands** (`.claude/commands/*.md`) | The **orchestrator entrypoints** the human runs (`$ARGUMENTS`, can run bash with `!`, embed files with `@`) | One invocation = one main-thread run (which *can* loop internally). |
| **CLAUDE.md** (auto-loaded) | Always-on **memory + laws** in every session | Costs context every turn — keep lean; it's the "constitution," not the archive. |
| **Hooks** (`.claude/settings.json`) | Deterministic shell on events: `SessionStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop` | Shell only; used for **injecting memory** and **running gates for free** (no tokens). |
| **Model per subagent** (`model:` frontmatter) | **Cost routing** — cheap reviewers on Haiku, architects on the strong model | The Steward is *mostly configuration*, not a running agent. |
| **Headless** (`claude -p`) | Unattended / CI runs of the loop | Same subagent rules apply. |
| **MCP** (Figma, browser) | QA design-parity: real Figma frame + real screenshot | Must be connected on the machine; the weak link in this Cowork chat. |

**The three consequences that shape everything below:**
1. **The orchestrator (main thread) is the only "router."** Agents don't delegate
   to each other — an agent *returns a verdict*, the orchestrator *reads it and
   dispatches the next agent*. "QA delegates to Dev Lead" = QA returns defects →
   orchestrator invokes the Engineer with those defects.
2. **The filesystem is the team's shared brain and message bus.** Communication +
   memory = files under `.claude/team/`, because contexts are isolated and
   ephemeral.
3. **Cheap, deterministic gates run in hooks/scripts; models run only when
   judgment is needed.** That's how we stay credit-smart.

---

## 1. Directory layout (exact)

```
V5 Design System - Ai/
├── CLAUDE.md                      # constitution: laws + "read team/ before acting"
├── .claude/
│   ├── settings.json              # hooks (SessionStart inject memory, Stop run gates) + model
│   ├── agents/                    # the personas (subagents)
│   │   ├── conductor.md           #   model: opus   (the brain/router — usually the MAIN thread)
│   │   ├── po-analyst.md          #   model: sonnet
│   │   ├── researcher.md          #   model: sonnet   tools: WebSearch, Read
│   │   ├── ux-designer.md         #   model: sonnet
│   │   ├── ui-designer.md         #   model: sonnet
│   │   ├── a11y.md                #   model: haiku
│   │   ├── tech-lead.md           #   model: opus
│   │   ├── frontend-eng.md        #   model: sonnet   tools: Read,Edit,Write,Bash
│   │   ├── qa.md                  #   model: sonnet   tools: Read,Bash,+Figma/Chrome MCP
│   │   ├── writer.md              #   model: haiku
│   │   └── cost-steward.md        #   (mostly a rulebook; see §6)
│   ├── skills/
│   │   ├── team-loop/             # the loop algorithm (SKILL.md + orchestrate.md)
│   │   ├── figma-to-spec/
│   │   ├── qa-parity/             # SKILL.md + scripts/screenshot-diff.*, gen-testcases.*
│   │   └── coherence-audit/       # SKILL.md + scripts/audit.mjs  (deterministic)
│   ├── commands/
│   │   ├── evolve-ds.md           # Loop A entrypoint
│   │   └── product-loop.md        # Loop B entrypoint
│   └── team/
│       ├── workspace/
│       │   ├── tickets.md         # the live board (schema in the plan)  ← message bus
│       │   └── run-log.md         # every dispatch + gate result         ← audit trail
│       ├── memory/
│       │   ├── learnings.md · patterns.md · decisions.md · defect-log.md
│       │   └── persona-notes/<role>.md    ← per-agent memory
│       └── knowledge/             # harvested + FAMS-adapted (from §11 of the plan)
│           ├── ux-rules.md · qa-antipatterns.md · states.md
└── scripts/team/
    ├── gates/  coherence.mjs · smoke.mjs · build.sh · a11y-static.mjs · roundtrip.mjs · hydration.mjs · vocab.mjs · search-field.mjs   # deterministic gates
    └── memory/ inject.sh · retro-append.sh                  # hook helpers
```

Products (Loop B) still live in `Code\<slug>\`; the DS is consumed read-only —
**except** a Backport (§7), which edits the DS library on purpose.

---

## 2. How each primitive is used

- **Subagent = persona.** Frontmatter carries `name`, a sharp `description` (so the
  orchestrator/auto-routing knows when to use it), a **`model`** (cost routing),
  and a **`tools`** allowlist (least privilege — reviewers get read-only + Bash;
  only the Engineer gets Write/Edit). Body = the 30-yr persona + "read your
  `persona-notes/<role>.md` and the relevant `knowledge/` file first; emit your
  verdict as a fenced ```yaml block at the end."
- **Skill = procedure.** `qa-parity`, `coherence-audit`, `figma-to-spec`,
  `team-loop`. Skills own the *scripts* (screenshot diff, token/hex audit) so logic
  is deterministic and reusable, not re-derived each run.
- **Command = orchestrator.** `/evolve-ds` and `/product-loop` are the human
  entrypoints; their body IS the loop algorithm (§5). They run on the main thread
  (the Conductor), which is the only thing allowed to spawn subagents and route.
- **CLAUDE.md = constitution.** The 6 laws + "before any task, read
  `team/memory/` and `team/workspace/tickets.md`; after, update them." Lean.
- **Hooks = free automation** (§4, §6).

---

## 3. Communication & delegation (given subagents can't talk)

Everything flows through the **orchestrator + the `tickets.md` board**. A subagent
ends its run by emitting a structured block; the orchestrator parses it, writes
tickets, and dispatches the next agent.

```
Agent verdict block (last thing every review agent prints):
```yaml
verdict: fail            # pass | fail
gate: G2                 # which gate this agent owns
tickets:
  - title: "Priority chip missing on kanban card"
    type: defect
    severity: major
    assignedTo: tech-lead
    refs: [figma:345-1877, shot:kanban.png]
    expected: "flag chip, token-colored"
    actual: "no chip rendered"
```

Delegation loop (QA → Dev Lead → Eng → re-verify), as the orchestrator runs it:

```
1. orchestrator spawns  qa           → returns verdict{fail, tickets[...]}
2. orchestrator writes tickets to team/workspace/tickets.md, logs run
3. orchestrator spawns  tech-lead    (input: the tickets) → triage + fix plan
4. orchestrator spawns  frontend-eng (input: fix plan)    → edits code
5. orchestrator re-runs cheap gates (bash) then re-spawns qa on the changed files
6. repeat until qa verdict=pass  OR  iteration cap  →  escalate to human
```

So "agents communicate" = **they read/write the same files, and the orchestrator
is the postman.** No agent ever needs to call another.

---

## 4. Memory & self-learning (persistence across ephemeral contexts)

Subagent contexts vanish after each run, so memory = **files + hooks**:

- **Read (pre-flight):** a `SessionStart` hook runs `scripts/team/memory/inject.sh`,
  which prints a compact digest of `learnings.md` + open `tickets.md` into the
  session context. Each subagent's prompt also says "read your
  `persona-notes/<role>.md` first."
- **Write (retro):** at loop end the orchestrator runs the **Retro** — the Writer
  distills new lessons and the orchestrator appends them via
  `scripts/team/memory/retro-append.sh` to `learnings.md` / `defect-log.md` /
  `persona-notes/*`. A `Stop` hook can also auto-append the run-log.
- **Compounding:** recurring defects in `defect-log.md` get promoted into
  deterministic checks in `scripts/team/gates/` — so the same miss becomes
  impossible next run. **This is the self-learning: memory in → work → gates →
  retro → memory out**, and the files persist across every session and machine
  (they're committed to the DS repo).

---

## 4b. Autonomy — the self-driving brain (no human trigger)

Goal: the team runs itself — the Conductor already knows *what* to do and *when*,
without being told each time. **Honest reality first:** an LLM agent is **not a
self-waking daemon** — some event or clock must *fire* the process. We make that
firing invisible and let the brain decide everything after.

1. **State-driven brain (the "already knows" part).** The Conductor is never told
   a task. Each time it wakes it reads:
   - `team/workspace/backlog.md` — **standing goals** ("keep pipeline at Figma
     parity", "close all major defects", "nightly showcase QA sweep", "drain the
     backport queue"),
   - `team/workspace/tickets.md` — open/failed work, + `memory/` + gate status,
   then **derives the single highest-value next action** and dispatches it.
   Knowing what/when = reading state, not waiting for orders.

2. **Event triggers (feels continuous in a session) — hooks:**
   - `SessionStart` → inject memory + run the **self-improvement watchdog**
     (`scripts/team/self-improve.mjs`): surfaces DUE actions — defect→gate promotions
     (a class seen ≥2× with no gate) and memory consolidation (learnings past the drift
     threshold) — so the team adapts/fixes itself proactively, not just when the loop remembers.
   - `UserPromptSubmit` → **autonomy** (`autonomy.mjs`: delegate-by-default + run-to-completion on
     any task) + **design auto-trigger** (`design-trigger.mjs`: a Figma link / design-build intent
     routes through the `evolve-ds` loop → figma-to-spec → build → gates → QA/a11y parity → retro).
     Silent on non-actionable / non-design prompts.
   - `PostToolUse` on Edit/Write → cheap gates fire automatically (coherence + a11y).
   - `Stop` / `SubagentStop` → append the run-log line (and, in loop mode, auto-advance).

3. **Heartbeat (truly hands-off) — a scheduler:** an OS/Cowork scheduled task runs
   `claude -p "/conductor tick" --model opus` on a cadence (e.g. every 30 min or
   nightly). Each tick: wake → read state → do the next best thing → write results
   → sleep. The scheduler is the only external nudge, and **you never send it.**

**Autonomy levels (config in `settings.json`):**
- **L1** — runs a whole loop unattended once you start it.
- **L2** — event-driven: hooks advance work automatically in-session.
- **L3** — heartbeat: scheduled ticks, fully hands-off.  ← the target.

**Hands-off guardrails (so autonomy is safe):** iteration cap; Steward budget
guard; **escalate-don't-grind** (a blocked / over-budget / ambiguous item raises an
escalation ticket that surfaces to you); hard no-go actions (never delete, never
touch prod; backport writes DS-library only). It runs on its own and taps you on
the shoulder only when it genuinely needs a human.

---

## 5. The loop engine (the orchestrator algorithm)

`/evolve-ds` and `/product-loop` share this core (pseudocode the command encodes):

```
load: CLAUDE.md laws + team/memory digest + team/knowledge
1  SPEC     spawn po-analyst (+researcher if new pattern) → spec + acceptance → G1
2  DESIGN   spawn ux (+ui) → intended behavior/visual mapped to DS primitives
3  BUILD    spawn frontend-eng (guided by tech-lead plan) → code
4  GATES (cheap → expensive, stop on first blocker):
     G6 build      = bash: tsc --noEmit + boot            (script, no tokens)
     G3 coherence  = bash: scripts/team/gates/coherence.mjs (script, no tokens)
     G-SMOKE       = bash: smoke.mjs   (every module resolves a renderer + binds a view-model)
     G5 a11y-static= bash: a11y-static.mjs                  (script) + a11y agent if needed
     G-ROUNDTRIP   = bash: roundtrip.mjs (block save handlers persist every *Draft field — no drop-on-save)
     G-HYDRATION   = bash: hydration.mjs (edit-path `initial` seed-reachability + `onSaveDraft` close discriminator — no drop-on-load)
     G-VOCAB       = bash: vocab.mjs (shared app-shell + navigation chrome bakes no un-overridable fleet vocabulary)
     G-SEARCHFIELD = bash: search-field.mjs (icon-under-input needs z-10+ next to an Input/input; a
                     search-placeholder Input/input needs a leadingIcon or nearby Search* icon)
     G4 functional = spawn qa (test cases from knowledge/ux-rules)
     G2 parity     = spawn qa/ui-designer (screenshot-diff vs Figma)   ← most expensive, last
5  ROUTE   any fail → write tickets → tech-lead triage → eng fix → GOTO 4
          (hard cap = N iterations; then escalate to human with the ticket log)
6  DOCS    spawn writer → update MDs → G7
7  RETRO   distill learnings → append to memory → promote repeat defects to gates
8  SIGN-OFF Conductor summarizes: what changed, gates, iterations, open tickets
```

Key: **steps 1–3 and the fixes are model work; step 4's G6/G3/G5 are free scripts.**
The loop only spends model tokens on judgment and code.

---

## 6. Cost / model routing (the Steward, mostly as config)

- **Model per role** (frontmatter): Haiku for `a11y`, `writer`, first-pass
  reviewers; Sonnet for `po`, `ux/ui`, `frontend-eng`, `qa`; Opus for `tech-lead`
  and the Conductor. Escalate a reviewer to Sonnet only on ambiguity.
- **Cheap gates first** — never run the expensive visual diff before `tsc` +
  coherence pass.
- **Isolated contexts = cheaper** — reviews run in subagents, so their file-reading
  never bloats the main thread.
- **Parallel reviews** — the orchestrator spawns independent reviewers together.
- **Budget hook** — a `PreToolUse` hook can warn/block before an expensive step
  (deep research, full screenshot sweep) unless the run is flagged `--deep`.
- **Reuse memory** — agents check `patterns.md`/`defect-log.md` before re-deriving.

The Steward is therefore: the model table + the gate ordering + one budget hook +
a short rulebook in CLAUDE.md — not a token-burning agent.

---

## 7. Backport (product fix → DS) — cross-folder mechanics

The orchestrator runs with filesystem access to **both** `Code\<slug>\` and the DS
folder (absolute paths). On a `type: backport` ticket:

```
tech-lead classifies fix as DS-level
 → orchestrator opens a scoped Loop A ON THE DS FOLDER (build → gates → docs)
 → frontend-eng edits the DS library (this is the ONE allowed DS write)
 → product drops its local patch and consumes the improved DS
 → retro records the capability in patterns.md
```

The "never write products inside the DS" guardrail still holds — a backport writes
DS *library* code, which is exactly what the DS folder is for.

---

## 8. Entrypoints

- `/evolve-ds "<intent>" [figma-url]` — Loop A on the DS.
- `/product-loop "<product>" [figma-url]` — Loop B in `Code\<slug>\`.
- Unattended: `claude -p "/evolve-ds 'fix pipeline filters' <url>" --model opus`
  for a CI-style run; the loop caps + escalates on its own.

---

## 9. Honest limits

- **No true agent-to-agent chat** — all coordination is orchestrator-mediated via
  files. (Designed for, not a gap.)
- **Parallel subagents** have practical bounds; keep review fan-out to ~3–4.
- **Design-parity needs the Figma + browser MCP** connected — strongest in Claude
  Code on your machine; degraded in this Cowork chat.
- **Loops cost tokens** — the cap + cheap-gates-first + Haiku reviewers keep it sane.
- **Determinism where possible** — anything a script can check (hex, tokens, build,
  contrast) is a script, not a model call.

---

## 10. Build phases → concrete files

- **Phase 0 — Spine:** `team/` dirs + `tickets.md`/memory files + `settings.json`
  hooks (inject + gates) + `scripts/team/gates/*` + `skills/team-loop/` + the
  `/evolve-ds` skeleton. *Prove the loop runs with one stub agent.*
- **Phase 1 — Core three:** `tech-lead.md`, `frontend-eng.md`, `qa.md` +
  `qa-parity` & `coherence-audit` skills. *Run a real verify loop on the pipeline.*
- **Phase 2 — Design lane:** `ux-designer.md`, `ui-designer.md`, `a11y.md`,
  `figma-to-spec` + harvest `knowledge/` from UI UX Pro Max.
- **Phase 3 — Bookends & routing:** `po-analyst.md`, `researcher.md`, `writer.md`,
  `conductor` wiring, `/product-loop`, backport routing.
- **Phase 4 — Learning:** turn the first retros into gate scripts; measure that
  iterations-to-green drop run over run.
```
