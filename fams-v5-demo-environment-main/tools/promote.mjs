#!/usr/bin/env node
// @ts-check
/**
 * `demo promote <tenant> --op <opId>` — graduate a delta into core.
 * `demo promote <tenant> --module <m>` — MOVE a tenant-native module into core.
 * Both re-resolve all tenants so inheritance is visible (decision #16).
 */
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repo.mjs';
import { promoteOp, promoteModule } from './lib/promote.mjs';

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

export function main(argv, root = REPO_ROOT) {
  const tenant = argv.find((a) => !a.startsWith('-') && a !== flag(argv, '--op') && a !== flag(argv, '--module'));
  const opId = flag(argv, '--op');
  const module = flag(argv, '--module');
  if (!tenant || (!opId && !module)) {
    console.error('usage: demo promote <tenant> --op <opId> | demo promote <tenant> --module <m>');
    return 1;
  }
  if (opId && module) { console.error('promote: pass exactly one of --op or --module'); return 1; }

  if (opId) {
    const { module: m, written } = promoteOp(root, tenant, opId);
    console.log(`promote: op "${opId}" folded into core module "${m}"; removed from ${tenant} deltas; re-resolved ${written.length} file(s).`);
  } else {
    const { from, to, written } = promoteModule(root, tenant, module);
    console.log(`promote: moved module "${module}" ${from} → ${to} (no copy left); granted to "${tenant}"; re-resolved ${written.length} file(s).`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`promote: ${err.message}`); process.exit(1); }
}
