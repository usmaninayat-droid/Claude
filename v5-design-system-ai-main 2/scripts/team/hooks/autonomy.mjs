#!/usr/bin/env node
/* UserPromptSubmit hook — RUN-TO-COMPLETION autonomy.
 *
 * The team's purpose: once the user gives a task, work it to completion without
 * being told "go / next / continue" at each step. When a prompt is an actionable
 * task (imperative build/fix/etc. verb), this injects a directive that makes the
 * main agent decompose it, execute ALL of it, self-advance, gate+verify, and only
 * return when done+verified, blocked, or a genuine user-decision is needed.
 * Silent on pure questions / conversation, so those still get a normal reply.
 */
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = String(JSON.parse(raw).prompt ?? ''); } catch { prompt = raw; }
  const p = prompt.toLowerCase().trim();
  if (!p) process.exit(0);

  // Actionable-task signal: an imperative build/change verb.
  const taskVerb = /\b(build|create|add|implement|scaffold|wire( up)?|set ?up|make|finish|complete|close|remove|delete|refactor|fix|update|migrate|generate|compose|extend|hook up|automate|integrate|port|apply|redesign|rebuild)\b/.test(p);
  if (!taskVerb) process.exit(0);

  // If it's obviously just a question (starts with an interrogative, no imperative follow-through),
  // don't force the loop — but a task verb usually means real work, so keep this narrow.
  const pureQuestion = /^(what|why|how|is|are|can|should|does|do|which|when|where|who)\b/.test(p) && p.includes('?') && !/\b(then|and|also|,)\b/.test(p);
  if (pureQuestion) process.exit(0);

  process.stdout.write(
`[FAMS AUTONOMY — actionable task detected]
Work this to COMPLETION autonomously; do not stop to ask "go / next / continue / shall I proceed":
  1. DELEGATE BY DEFAULT. For substantial work (a new component/module/feature, a design build, a
     multi-file change, or a review) run the PERSONA TEAM — dispatch the specialists (po-analyst ·
     ux/ui-designer · a11y · tech-lead · frontend-eng · qa · writer) and route their verdicts, or run
     /conductor / a review-fix workflow. Build SOLO only for trivial edits or a direct answer.
  2. Decompose into tracked steps (use the task list) and execute ALL of them, self-advancing between steps.
  3. Reuse the latest DS components/blocks; keep changes token-only + config-driven (the 6 coherence laws).
  4. Run the deterministic gates (coherence → smoke → a11y → build) and VERIFY — for anything visual,
     capture proof with scripts/team/parity/shoot.mjs. Iterate review→fix→re-verify (cap 3, then escalate).
  5. Append a retro learning + run-log entry when the task is done.
Return to the user ONLY when: (a) the task's acceptance criteria are met AND verified, (b) a genuine
decision only the user can make is required, or (c) you are blocked / at the iteration cap. See
docs/AGENT-TEAM-OPERATING-CONTRACT.md.`,
  );
  process.exit(0);
});
