export const meta = {
  name: 'review-fix',
  description: 'Autonomous team loop: parallel persona review of a target → tech-lead triage → frontend-eng fix + gates',
  whenToUse: 'Run a real collaborating/delegating team pass over a feature or change. args: { target: string, files?: string[] }',
  phases: [
    { title: 'Review', detail: 'ui/ux/a11y/qa review in parallel' },
    { title: 'Triage', detail: 'tech-lead → prioritized safe fix plan' },
    { title: 'Fix', detail: 'frontend-eng applies + runs gates' },
  ],
}

// args: { target: string (what to review), files?: string[] (hint paths) }
const target = (args && args.target) || 'the most recent change in src/components (inspect git diff to scope it)'
const files = (args && args.files && args.files.length) ? `\nFiles: ${args.files.join(', ')}.` : ''
const TARGET = `${target}${files} Constraints: token-only (no raw hex except data/functional with // coherence-allow), config-driven/domain-agnostic, reuse DS primitives, guard the 6 coherence laws.`

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'pass-with-nits', 'changes-requested'] },
    findings: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['major', 'minor', 'nit'] },
      area: { type: 'string' }, issue: { type: 'string' }, suggestion: { type: 'string' }, file: { type: 'string' },
    }, required: ['severity', 'issue', 'suggestion'] } },
  },
  required: ['verdict', 'findings'],
}
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    fixes: { type: 'array', items: { type: 'object', properties: {
      title: { type: 'string' }, file: { type: 'string' }, change: { type: 'string' }, severity: { type: 'string' },
    }, required: ['title', 'change'] } },
    deferred: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'fixes'],
}
const ENG_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' }, changed: { type: 'array', items: { type: 'string' } },
    gates: { type: 'string' }, notes: { type: 'string' },
  },
  required: ['summary', 'gates'],
}

phase('Review')
const REVIEWERS = [
  { type: 'ui-designer', lens: `VISUAL fidelity — spacing rhythm, hierarchy, typography, token usage, component proportions. MANDATORY number-formatting check (T-054): every count/quantity ≥1,000 renders with thousand separators (toLocaleString) — KPI values, stat cells, 'Showing N' lines, banner copy; money uses compact M/k forms consistently.` },
  { type: 'ux-designer', lens: `INTERACTION + state coverage — flows, empty/loading/error/edge states, keyboard/escape, lifecycle. MANDATORY label cold-read test (T-037/T-054, unclear-domain-vocab count=2): every KPI/metric/action label must read clean to a client cold — no author-jargon ('Between shifts', 'Buses over', 'relief headcount'), no sentence-y KPI labels ('Open critical incidents' → 'Critical Incidents'). MANDATORY in-context interaction law (T-054): a dashboard/cockpit NEVER switches rail modules to show a record — drill-ins stack IN PLACE (raw-data sheet expands to full, the record's TaskDetail sheet opens OVER it); cross-module openModule is allowed only from a record's OWN surface, never from a dashboard row.` },
  { type: 'design-qa', lens: `DS FIDELITY + ADOPTION (rubric = docs/contracts/*.contract.md). (1) REUSE/NO-FORK: every control/surface must reuse the canonical DS component; a NEW component built beside an existing primitive (a RefinedSelect beside Select, a bespoke detail sheet beside TaskDetail, a second toolbar) is a BLOCKER — the fix for "make X better" is to edit the one X, not add a sibling. (2) CONTRACT conformance: list toolbar = ONE row (search · pinned quick-filters · Sort · Group · All-Filters popover · view actions), no second filter row, no popover filters duplicated inline, dashboards excepted; status pill fixed type scale (never larger than body, --status-* only); form/detail header = title→divider→tabs→panel (never tabs above the divider); detail surface = config-driven TaskDetail; table-loading = skeleton first-load + "Showing X of Y" = materialized/filtered-total. (3) RHYTHM: 4px spacing scale, regular padding, no oversized text/sections. (4) ADOPTION SWEEP: if the diff changed a shared component or a pattern, grep the DS + EVERY showcase app for the old variant and report un-migrated call-sites — half-done adoption (built one thing, forgot the rest) is a BLOCKER. Return adoption_sweep counts.` },
  { type: 'a11y', lens: `WCAG 2.1 AA — colour contrast, focus states, keyboard nav, labels on icon-only controls, target sizes` },
  { type: 'qa', lens: `FUNCTIONAL QA — derive test cases and list real defects/risks; config-driven correctness. MANDATORY drop-on-load-hydration checklist (G-HYDRATION gates only the seed-reachability + save-draft-close slice; the rest is yours): for every wizard/edit sheet, mentally round-trip edit(a SEEDED row with no stored draft)→save and confirm no persisted ROW field silently drops (e.g. fieldCount recomputed to 0) and no COMPOSITE is corrupted (e.g. phone \`\${code} \${phone}\` double-prefixing because the seed didn't reverse-split), and that no step-gate (\`canProceed\`) leaves Save permanently disabled for a seeded edit. MANDATORY ignored-existing-ds-component checklist (T-024, count=4 — not regex-able): for EVERY control/surface in the diff, name the DS component consumed AND its variant vs the Figma standard (date filters = DateRangePicker preset+range popup 6649-24799; entity records = EntityDetail; pipeline cards = TaskDetail with the right timeline panel; timelines = ActivityFeed; documents = the 31695-* Upload pattern). A "no DS component fits" claim must cite the barrels checked (basics · primitives · data-display · data-viz · widgets · operations · scheduling · zones). MANDATORY token-color-in-non-css-renderer check (count=2): does any color in the diff reach a NON-CSS renderer (MapLibre/canvas paint, fillStyle/strokeStyle, hex-regex parsers, SVG attribute serializers) without resolving var() tokens first (hex fast-path + getComputedStyle or color-mix fallback)?` },
]
const reviews = (await parallel(REVIEWERS.map((r) => () =>
  agent(`Review ${TARGET}\n\nYour lens: ${r.lens}. Read the files first. Return concrete findings, each with a file + a token-only suggestion. Do NOT edit code.`,
    { agentType: r.type, label: `review:${r.type}`, phase: 'Review', schema: REVIEW_SCHEMA }),
))).filter(Boolean)
const allFindings = reviews.flatMap((r, i) => (r.findings || []).map((f) => ({ ...f, from: REVIEWERS[i].type })))
log(`Reviews in: ${allFindings.length} findings (${allFindings.filter((f) => f.severity === 'major').length} major).`)

phase('Triage')
const plan = await agent(
  `As tech-lead, triage these ${allFindings.length} findings into a SAFE, prioritized, in-scope fix plan. Guard the 6 coherence laws. Drop speculative/law-breaking items to "deferred" with a reason. Findings:\n${JSON.stringify(allFindings, null, 2)}`,
  { agentType: 'tech-lead', phase: 'Triage', schema: PLAN_SCHEMA },
)
log(`Plan: ${plan.fixes.length} fixes, ${(plan.deferred || []).length} deferred.`)

phase('Fix')
const fix = await agent(
  `As frontend-eng, APPLY this fix plan. Edit only the in-scope files. Keep token-only + config-driven. Then run the gates: \`node scripts/team/gates/coherence.mjs .\`, \`node scripts/team/gates/a11y-static.mjs .\`, \`node scripts/team/gates/roundtrip.mjs .\`, \`node scripts/team/gates/hydration.mjs .\`, \`node scripts/team/gates/vocab.mjs .\`, \`node scripts/team/gates/search-field.mjs .\`, \`npx tsc --noEmit -p tsconfig.json\` and report results in \`gates\`. Skip any fix that would break a gate/law and say why. Plan:\n${JSON.stringify(plan, null, 2)}`,
  { agentType: 'frontend-eng', phase: 'Fix', schema: ENG_SCHEMA },
)

return { reviewVerdicts: reviews.map((r, i) => ({ persona: REVIEWERS[i].type, verdict: r.verdict, findings: (r.findings || []).length })), totalFindings: allFindings.length, plan, fix }
