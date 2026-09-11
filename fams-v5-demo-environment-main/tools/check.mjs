#!/usr/bin/env node
// @ts-check
/** `demo check` — the CI gate. Non-zero on any mismatch/invalid input. */
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repo.mjs';
import { runCheck } from './lib/check.mjs';

export function main(_argv, root = REPO_ROOT) {
  const { ok, errors, warnings, checked } = runCheck(root);
  for (const w of warnings ?? []) console.warn(`  ⚠ ${w}`);
  if (ok) {
    console.log(`check: OK — ${checked} resolved file(s) match; ops, manifests, JSON and seed refs all valid.${warnings?.length ? ` (${warnings.length} warning(s) above)` : ''}`);
    return 0;
  }
  console.error(`check: FAILED with ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`check: ${err.message}`); process.exit(1); }
}
