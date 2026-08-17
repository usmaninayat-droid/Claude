#!/usr/bin/env node
/* G-SMOKE gate (SI-1) — deterministic module mount-and-assert, no browser/WebGL.
 * Runs the config-driven module smoke spec via vitest and maps the result to a
 * single parseable line the loop reads. Exit 0 = pass, 1 = fail.
 *
 *   node scripts/team/gates/smoke.mjs [ROOT]
 *
 * Covers: every fixed module TYPE resolves a renderer; every golden config-driven
 * module (CRM + Sales seeds) binds data and derives a valid view-model (columns/
 * rows or stages/cards, facets, sort fields, buildable detail) without throwing. */
import { spawnSync } from 'node:child_process';

const ROOT = process.argv[2] || '.';
const SPEC = 'src/__tests__/module-smoke.spec.tsx';

const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const res = spawnSync(runner, ['vitest', 'run', SPEC], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
// vitest prints a "Tests  N passed" / "N failed" summary line.
const failed = /Tests?\b.*\bfailed/i.test(out) || res.status !== 0;
const passMatch = out.match(/Tests\s+(\d+)\s+passed/i);
const count = passMatch ? passMatch[1] : '?';

if (failed) {
  // surface the failing assertions compactly
  const lines = out.split('\n').filter((l) => /✗|FAIL|failed|Error|Expected|AssertionError/.test(l));
  console.log(`SMOKE: FAIL`);
  lines.slice(0, 20).forEach((l) => console.log(`  ${l.trim()}`));
  process.exit(1);
}
console.log(`SMOKE: PASS (${count} checks)`);
process.exit(0);
