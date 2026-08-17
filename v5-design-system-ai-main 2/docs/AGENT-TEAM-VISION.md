# FAMS Agent Team — The Idea, The Problem, The Why

> Read this first. This is *why* the autonomous team exists — the intent behind it,
> not the file layout. Mechanics live in `AGENT-TEAM-ARCHITECTURE.md`; the roster
> and loops in `AGENT-TEAM-PLAN.md`. This doc is the north star.

## The problem we hit (what forced this)

Building the FAMS design system and products from it with a single AI session
kept running into the same walls:

1. **Quality drift.** One generalist assistant does spec + design + code + test +
   docs all at once, so nothing gets a specialist's scrutiny. Output was often
   "not good enough" and we only found out by eyeballing it.
2. **No memory.** Every session started from zero. The same mistakes recurred
   (raw hex in components, single-filter toolbars, wrong detail layout, building
   products inside the design system). Lessons learned on Monday were gone by
   Tuesday.
3. **Design ↔ build gap.** Implementations silently diverged from the Figma /
   demos. Nobody was *comparing the built screen to the design* as a first-class,
   repeatable step.
4. **Everything needed a human trigger.** Nothing happened unless someone typed
   the next instruction. Progress was bottlenecked on the person, not the work.
5. **Fixes didn't compound.** A fix made while building a demo stayed stuck in
   that demo; the design system never learned from it, so the next product hit the
   same gap.
6. **Effort/cost was undisciplined.** Expensive reasoning got spent on trivial
   checks; loops could grind forever with no cap.

## The idea

Replace "one AI doing everything, when told" with **a standing, self-driving
virtual product team of senior specialists** that owns the FAMS design system and
the products built from it — and **improves itself every time it runs.**

Think of it as hiring a real 10-person product team (Product Owner, Researcher,
UX, UI, Accessibility, Tech Lead, Frontend Engineer, QA, Writer, plus a Cost
steward), each a 30-year expert, who:

- **know what to do without being told** — they read the state of the work
  (backlog, open tickets, memory) and pick the highest-value next action;
- **collaborate and delegate** — QA finds a defect and hands it to the Tech Lead,
  who plans the fix and hands it to the Engineer, who fixes it, and QA re-verifies;
- **test against the design** — QA compares the built screen to the Figma frame and
  the design system, in depth, not by vibes;
- **learn, grow, and adapt** — every loop writes lessons to a shared memory, and
  recurring mistakes get turned into automatic checks so they can't happen again;
- **run hands-off** — on a heartbeat, with no human trigger, escalating only when
  they genuinely need a decision;
- **spend wisely** — cheap deterministic checks first, the right-sized model per
  role, hard caps on looping.

## What we're actually trying to solve (the goal)

**Make "perfect, on-design, coherent implementations" the default output — produced,
tested, fixed, documented, and learned-from by the system itself, with the human as
director, not operator.**

Concretely, the team should:

- Take an intent or a Figma link and **evolve the design system** to match it —
  build → self-test against the design + the coherence laws → fix → re-test until it
  passes, then document.
- Take a product request and **build it from the design system** in the products
  folder — same loop — never polluting the design system, always consuming it.
- **Backport**: when a fix made in a product belongs in the design system, push it
  up so every product benefits. Fix once, everywhere. Nothing is fixed twice.
- **Get better over time**: the memory grows, the gates get stricter, the personas
  refine their craft notes. Run #50 is sharper than run #1.

## Why it's built the way it is (the key decisions)

- **Memory + gates + a state-driven brain**, not a chat of bots. Agents run in
  isolated contexts and can't literally talk to each other, so they collaborate
  through a shared filesystem (the board + memory) with the Conductor as router.
  This is *more* durable than a chatroom — every hand-off and lesson is logged and
  survives across sessions and machines.
- **Deterministic gates do the cheap truth-telling** (typecheck, token-only,
  build) so models are only spent on judgment and code — that's how quality stays
  high without burning credits.
- **Autonomy = a heartbeat + events, plus a brain that decides from state.** There
  is no self-waking daemon; a scheduler fires the tick, and the brain does the rest.
  We're honest about that rather than pretending.
- **The design system's coherence laws are the constitution.** The team may never
  break them to "make it work" — it escalates instead. That's what keeps every
  product feeling like one product even as the team moves fast on its own.

## The north-star behaviors (how the team should always act)

1. **Read state before acting; write learnings after.** Never start blind, never
   finish without recording what was learned.
2. **Compare to the design.** "Done" means it matches the design and passes the
   gates — not "the code ran."
3. **Delegate, don't hoard.** Each role stays in its lane and hands off through the
   board.
4. **Escalate, don't grind.** Hit the cap or a real ambiguity → raise it to the
   human with the full ticket trail.
5. **Compound every fix.** If it's design-system-level, backport it.
6. **Spend like it's your money.** Cheapest sufficient path, always.

The measure of success is simple: **over time, the human does less and the output
gets better** — the team catches its own mistakes, matches the design, and teaches
itself, so shipping an on-brand FAMS product becomes a director's decision, not a
week of hand-holding.
