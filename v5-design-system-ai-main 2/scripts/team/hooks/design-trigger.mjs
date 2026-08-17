#!/usr/bin/env node
/* UserPromptSubmit hook — the "add designs → team fires" trigger.
 *
 * Reads the user's prompt (JSON on stdin), and when it carries DESIGN INPUT
 * (a Figma link / node-id, or explicit design-build intent) prints a directive
 * to stdout. Claude Code injects that stdout as extra context before the model
 * answers — so the main agent deterministically routes the work through the
 * evolve-ds team loop (figma-to-spec → build → gates → QA/a11y → retro) instead
 * of an ad-hoc manual build. Silent (no output, exit 0) when no design is present,
 * so normal prompts are untouched. Deterministic, token-free, fast.
 */
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = String(JSON.parse(raw).prompt ?? ''); } catch { prompt = raw; }
  const p = prompt.toLowerCase();

  // Strong signal: a Figma design link or node-id (unambiguous "here's a design").
  const hasFigma = /figma\.com\/(design|file|proto)\b/.test(p) || /node-id=/.test(p);
  // Soft signal: a build verb + an actual design artifact reference. Kept precise so
  // "add a design token" / "design review" don't trigger, but "build from these mockups" does.
  const buildVerb = /\b(build|create|implement|scaffold|wire up|make|convert|add (a|the|new)|work on|turn (this|these|it))\b/.test(p);
  const designArtifact = /\b(mock-?ups?|wireframes?|redesigns?|screenshots?)\b/.test(p)
    || /\b(these|the|this|attached) designs?\b/.test(p)
    || /\bfrom (the )?figma\b/.test(p);
  const trigger = hasFigma || (buildVerb && designArtifact);
  if (!trigger) process.exit(0);

  process.stdout.write(
`[FAMS AUTOMATION — design input detected]
This message provides a design. Per the team's automation policy, drive it through the
evolve-ds team loop, NOT an ad-hoc manual build:
  1. Fetch every referenced frame (Figma MCP: get_design_context / get_screenshot).
  2. figma-to-spec → module/view mapping + fields + complete state coverage + acceptance criteria.
  3. REUSE the latest DS components/blocks — never rebuild what already exists; if unsure, search first.
  4. Build via frontend-eng, then run the deterministic gates in order
     (coherence → smoke → a11y → build) and iterate until green (cap 3, then escalate).
  5. QA + a11y design-parity review against the frames; route any defect as a ticket.
  6. Append a retro learning + a run-log entry (memory/self-improvement).
Invoke the \`evolve-ds\` skill to run this. Scale the loop to the change — a small tweak
needs one builder + gates, a new module warrants the full persona pass (cap 3, then escalate).
Proceed autonomously; ask only if scope is genuinely ambiguous.`,
  );
  process.exit(0);
});
