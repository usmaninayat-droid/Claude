#!/usr/bin/env node
// @ts-check
/** `demo resolve [<tenant>|--all]` — regenerate resolved/ from core + deltas. */
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, listTenants } from './lib/repo.mjs';
import { resolveAndWrite } from './lib/resolve.mjs';

export function main(argv, root = REPO_ROOT) {
  const all = argv.includes('--all');
  const tenant = argv.find((a) => !a.startsWith('-'));
  if (!all && !tenant) {
    console.error('usage: demo resolve <tenant> | demo resolve --all');
    return 1;
  }
  const written = resolveAndWrite(root, all ? null : tenant, listTenants);
  for (const f of written) console.log(`  wrote ${relative(root, f)}`);
  console.log(`resolve: ${written.length} file(s) ${all ? 'across all tenants' : `for "${tenant}"`}.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`resolve: ${err.message}`); process.exit(1); }
}
