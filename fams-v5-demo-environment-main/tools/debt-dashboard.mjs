#!/usr/bin/env node
// @ts-check
/**
 * `demo debt` — regenerate `docs/debt-dashboard.md` (decision #17). Deterministic
 * output, committed, and byte-compared by `demo check` (fails if stale). Prints a
 * one-line summary. `--check` reports staleness without writing (exit 1 if stale).
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, paths, writeFileEnsuring } from './lib/repo.mjs';
import { buildDebtDashboard, gatherDebt } from './lib/debt.mjs';

export function main(argv = [], root = REPO_ROOT) {
  const checkOnly = argv.includes('--check');
  const fresh = buildDebtDashboard(root);
  const file = paths.debtDashboard(root);

  if (checkOnly) {
    const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (current === fresh) { console.log('debt: dashboard up to date.'); return 0; }
    console.error(`debt: STALE — ${paths.debtDashboard(root)} differs. Run: pnpm demo debt`);
    return 1;
  }

  writeFileEnsuring(file, fresh);
  const { tenants, candidates } = gatherDebt(root);
  const proposals = tenants.reduce((n, t) => n + t.proposed.length, 0);
  const overrides = tenants.reduce((n, t) => n + t.overrides.length, 0);
  console.log(`debt: wrote ${paths.debtDashboard(root)} — ${tenants.length} tenant(s), ${proposals} proposal(s), ${overrides} override(s), ${candidates.length} promotion candidate(s).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`debt: ${err.message}`); process.exit(1); }
}
