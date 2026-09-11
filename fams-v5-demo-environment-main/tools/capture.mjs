#!/usr/bin/env node
// @ts-check
/**
 * `demo capture <tenant>` — canonicalize hand-edited resolved/ into minimal
 * typed deltas. Expressible edits are appended to the deltas and re-resolved;
 * ANY ambiguity writes a *.ops.proposed.json + explanation and exits non-zero.
 * Never guesses silently (decision #17).
 */
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, listTenants } from './lib/repo.mjs';
import { planCapture, appendOps, writeProposed } from './lib/capture.mjs';
import { resolveAndWrite } from './lib/resolve.mjs';

export function main(argv, root = REPO_ROOT) {
  const tenant = argv.find((a) => !a.startsWith('-'));
  if (!tenant) { console.error('usage: demo capture <tenant>'); return 1; }

  const plans = planCapture(root, tenant);
  const ambiguous = plans.filter((p) => p.status === 'ambiguous');
  const expressible = plans.filter((p) => p.status === 'expressible');

  if (ambiguous.length) {
    console.error(`capture: ${ambiguous.length} module(s) could not be canonicalized — NOTHING was committed.`);
    for (const p of ambiguous) {
      const file = writeProposed(root, tenant, p.module, p);
      console.error(`  ✗ ${p.module}: wrote ${relative(root, file)}`);
      for (const n of p.notes) console.error(`      - ${n}`);
    }
    return 1;
  }

  if (!expressible.length) { console.log('capture: no edits to canonicalize (resolved/ matches core + deltas).'); return 0; }

  for (const p of expressible) {
    appendOps(root, tenant, p.module, p.ops);
    console.log(`  ${p.module}: appended ${p.ops.length} op(s) — ${p.ops.map((o) => o.op).join(', ')}`);
  }
  resolveAndWrite(root, tenant, listTenants);
  console.log(`capture: canonicalized ${expressible.length} module(s) for "${tenant}" and re-resolved.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`capture: ${err.message}`); process.exit(1); }
}
