#!/usr/bin/env node
/* self-improve.mjs — the team's self-improvement WATCHDOG (runs on SessionStart).
 *
 * Makes "adapt / fix themselves" proactive instead of a rule the loop must remember:
 * it deterministically detects DUE self-improvement actions and prints them so the
 * Conductor acts on them this session. Silent (exit 0, no output) when nothing is due.
 *
 *   (1) defect→gate promotion — a defect class in defect-log.md seen >=2× with gate "none".
 *   (2) memory consolidation  — learnings.md past the drift threshold (merge/prune due).
 *   (3) persona-note bloat     — a persona note grown large enough to distil.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] || '.';
const read = (p) => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch { return ''; } };
const actions = [];

// (1) defect→gate promotion — the self-fixing engine (SI-4)
for (const line of read('.claude/team/memory/defect-log.md').split('\n')) {
  const m = line.match(/^\|\s*([\w-]+)\s*\|\s*(\d+)\s*\|[^|]*\|[^|]*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/);
  if (!m) continue;
  const [, cls, countStr, gate, status] = m;
  if (Number(countStr) >= 2 && /^none/i.test(gate.trim()) && !/resolved|promote|wontfix/i.test(status)) {
    actions.push(`PROMOTE-TO-GATE: defect class "${cls}" seen ${countStr}× with no gate → open "promote ${cls} to gate" + write the deterministic check.`);
  }
}

// (2) memory consolidation — learn without drifting
const lessons = read('.claude/team/memory/learnings.md').split('\n').filter((l) => l.trim().startsWith('- ')).length;
const LEARN_LIMIT = 24;
if (lessons > LEARN_LIMIT) actions.push(`CONSOLIDATE-MEMORY: learnings.md has ${lessons} lessons (> ${LEARN_LIMIT}) → merge duplicates, fix contradictions, prune stale (consolidate-memory skill).`);

// (3) persona-note bloat
for (const f of ['frontend-eng', 'qa', 'tech-lead', 'ui-designer', 'ux-designer', 'a11y', 'po-analyst', 'writer', 'researcher']) {
  const n = read(`.claude/team/memory/persona-notes/${f}.md`).split('\n').filter((l) => l.trim().startsWith('- ')).length;
  if (n > 30) actions.push(`DISTIL persona-note "${f}" (${n} notes) → keep the durable patterns, drop one-offs.`);
}

if (!actions.length) process.exit(0);
console.log('=== SELF-IMPROVE (team watchdog): due actions ===');
actions.forEach((a) => console.log('- ' + a));
console.log('Act on these this session (run-to-completion), then re-run to confirm clear.');
process.exit(0);
