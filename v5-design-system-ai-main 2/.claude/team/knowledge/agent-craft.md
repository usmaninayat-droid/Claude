# Agent Craft — synthesised best practices (multi-source, cited)

> Distilled from several public collections + the uploaded pack, adapted to FAMS.
> All agents read the slice relevant to their role. Provenance below.

## Sources consumed
- **UI UX Pro Max** (MIT, uploaded) → design/UX/QA rules, states, tokens. → `ux-rules.md`, `qa-antipatterns.md`, `states.md`.
- **VoltAgent/awesome-claude-code-subagents** (MIT) → qa-expert, code-reviewer, react-specialist, product-manager, agent-organizer.
- **wshobson/agents** → test-automator, architect-review.

## QA (Maya)
Test pyramid · AAA · behaviour-not-implementation · deterministic/no-flake · risk-based
selection · test-design techniques (equivalence, boundary, decision-table, state-
transition, pairwise) · defect discipline (severity, root-cause, regression) · shift-left.

## Tech Lead (Omar)
Review lenses: correctness · security · perf · maintainability · coherence laws.
SOLID/DRY/KISS/YAGNI. Architecture: dependency direction, layering, abstraction w/o
over-engineering, architectural-impact rating, "architecture enables change".
Fix order: config → component → new type. Constructive, prioritised feedback.

## Frontend Eng (Sana)
React 18: hook-dep correctness, memoisation on hot paths, stable identities, code-
splitting, concurrent features, error/empty/loading states, a11y markup. Token-only,
config-over-bespoke, no new deps, tests for behaviour.

## PO/BA (Amir)
Jobs-to-be-Done · RICE / value-vs-effort / MoSCoW · OKR / North-Star · acceptance
criteria as checkable statements · smallest slice that delivers the outcome.

## Conductor (orchestration)
Task decomposition + dependency mapping · pattern choice (sequential / parallel /
pipeline / hierarchical) · capability-based dispatch · monitor & adapt · promote
recurring defects to gates · cheapest-sufficient path · escalate over grind.

## The FAMS overlay (always wins over any imported practice)
6 coherence laws · token-only · config-driven · never build products in the DS ·
FAMS default brand · escalate rather than break a law · backport DS-level fixes.
