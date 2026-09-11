# WORKING-AGREEMENT.md — how four designers share this repo

Read by agents on demand; the mandatory parts are inlined at the top of
[`CLAUDE.md`](CLAUDE.md) so they are always loaded. The sibling file in
`../fams-v5-demo-environment` governs the demo repo, where most designer work
happens — and it works differently, on purpose.

**This repo is different, and the difference is the whole point:** everything
here is *shared*. One button, one status pill, one spacing token is used by
every screen all four designers are building, and by Ben's FAMS Desk, which
vendors this repo as a subtree. A change that is wrong here is wrong on forty
screens at once, silently. So this repo has a guardian.

---

## 1. The tree

```
main                                   production · what the demo repo consumes
│
└── design-master                      the design team's build
    │
    ├── status-pill-density            ← the work, named for what it is
    ├── uccp-brand-refresh
    └── kanban-lane-tint
```

| Branch | What it is | Who writes to it |
|---|---|---|
| `main` | Production. What the demo environment and FAMS Desk consume. | By **promotion** from `design-master`, once someone has looked at the build. |
| `design-master` | The design team's build. Checked by `fams-done.sh`, not by review. | Finished work is folded **in**. Nobody edits it directly. |
| *`<what-you-are-doing>`* | One change, named for itself. | Whoever holds the repo claim. |

Nothing else exists. No `cycle/*`, no `feature/*`, no branches named after
people.

---

## 2. Branch names here are descriptive, not structural

The demo repo derives its branch names mechanically — `module/<tenant>/<module>`
— because the work maps one-to-one onto a file. **That doesn't hold here.** A
single real design-system change usually crosses packages: making the status
pill denser touches `tokens` (a spacing value), `ui-kit` (the component) and
sometimes `v5-templates` (where it's composed). Forcing that into one package's
name would be a lie about what the branch contains.

So the branch is named **for the change itself**, in three or four words:

```
status-pill-density          uccp-brand-refresh        kanban-lane-tint
datatable-sticky-header      rtl-toolbar-fixes         filter-panel-density
```

Decide it from what the work actually is, not from which folder gets touched
first. If it can't be named in a few words, it is probably two changes — see §4.

---

## 3. Why this repo is careful

Nobody owns `fams-design-system` — it is the FAMS Design System, and designers
work in it through its skills (**styling-change**, **new-component**,
**tenant-branding**) like anywhere else.

What makes it different is **blast radius**, not permission. A button, a status
pill, a spacing token is used by every screen all four designers are building,
and by FAMS Desk, which vendors this repo as a subtree. A change that's wrong
here is wrong on forty screens at once, silently. Two consequences:

- **One unfinished branch at a time.** Two branches editing
  `tokens/core.tokens.json` in parallel is the most expensive collision this
  workspace can produce. The claim is on the repo, not a package, because the
  work crosses packages (§2).
- **The engineering guardrails in [`CLAUDE.md`](CLAUDE.md) are absolute** —
  tokens only, RTL, axe, the Definition of Done. Those are what protect the
  system; no hand-over or approval substitutes for them.

If you'd rather not make the change yourself, describing the symptom is always a
valid outcome — *"the status pill text is cramped on the pipelines board"*, with
a screenshot. It gets fixed once here and everyone picks it up.

---

## 4. One change per branch

A branch is one thing that can be described in a few words and released on its
own. If describing it needs an "and", it's two branches.

The reason matters more here than in the demo repo: a branch merges **whole or
not at all**, and a design-system merge goes out to every consumer at once. Two
unrelated changes on one branch means the half that isn't ready blocks the half
that is, across every screen and both repos.

Crossing packages is not the same as doing two things. `status-pill-density`
touching tokens *and* ui-kit is **one** change. `status-pill-density` plus
`datatable-sticky-header` is two.

---

## 5. Handover

The claim moves; the branch does not. Whoever picks up `status-pill-density`
continues from the last commit — nothing to copy, nothing to re-explain. That is
why branches are named after the change, never after a person.

---

## 6. What does NOT change here

The engineering guardrails in [`CLAUDE.md`](CLAUDE.md) are untouched by any of
this. Tokens are still the single source of truth, RTL is still mandatory,
components still pass axe, the Definition of Done in the **new-component** skill
still applies in full, and rule 12's line budget still binds. This file governs
*who* and *which branch* — never *whether the rules apply*.

There are no pull requests. Finished work merges straight into `design-master`;
the review that matters is the design lead promoting `design-master` to `main` after
looking at the running build — which is what actually catches a wrong pill, and
is a review a designer can do. A component that reaches `main` lands on every
screen in the demo environment and in FAMS Desk, so that look is not a
formality.

---

## 7. The five stop rules

1. **The design system is shared** — its guardrails, not a person, are what protect it.
2. **One active branch in this repo at a time.**
3. **One change per branch** — crossing packages is fine, doing two things is not.
4. **Say when a change is finished** — that, and only that, folds it into `design-master`.
5. **Never touch `main`.** it gets promoted to main.
