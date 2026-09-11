#!/usr/bin/env node
/**
 * `prepublishOnly` guard — wired into every publishable package.
 *
 * This is the fail-closed net for the publish flow, and it is deliberately a
 * LIFECYCLE SCRIPT rather than a clever registry URL, because it is the only
 * mechanism that holds for every publish front-end. Empirically verified
 * 2026-08-05 on pnpm 11.1.3 / npm 11 (see docs/PUBLISHING.md § How the switch
 * actually works — verified behaviour):
 *
 *   - `publishConfig.registry` in package.json has ABSOLUTE precedence in
 *     `pnpm publish` — it beats a scoped `@fams:registry`, `--registry`, and
 *     every env var. Putting the switch there would make the switch unusable,
 *     so `publishConfig` here carries `access` only.
 *   - `pnpm publish` ignores `npm_config_*` environment variables entirely
 *     (including the `npm_config_@fams:registry` that `@changesets/cli` sets
 *     for its child process) and ignores `NPM_CONFIG_USERCONFIG` for a key the
 *     project `.npmrc` also defines. Only a project-level `.npmrc` at the
 *     workspace root or an explicit `--@fams:registry=` CLI flag move it.
 *   - `npm publish` run inside `packages/<x>/` does NOT read the workspace-root
 *     `.npmrc` at all, so it defaults to registry.npmjs.org.
 *
 * A `prepublishOnly` script, by contrast, runs before the upload for both npm
 * and pnpm (and therefore for `changeset publish`, which shells out to
 * `pnpm publish`), and it does NOT run on `pnpm pack`. So this is where the
 * "never publish by accident" guarantee lives.
 */

import { basename } from 'node:path'
import { REGISTRY_ENV, TOKEN_ENV, resolveRegistry } from './publish-config.mjs'

const pkgName = process.env.npm_package_name ?? basename(process.cwd())

let registry
try {
  registry = resolveRegistry().registry
} catch (err) {
  console.error(`\n✖ PUBLISH BLOCKED for ${pkgName}: ${err.message}\n`)
  process.exit(1)
}

if (!registry) {
  console.error(
    [
      '',
      '='.repeat(78),
      `  PUBLISH BLOCKED — ${pkgName}`,
      '='.repeat(78),
      `  ${REGISTRY_ENV} is not set, so there is no registry to publish to.`,
      '',
      '  @fams packages are INTERNAL. This guard exists so that a stray',
      '  `npm publish` / `pnpm publish` / `changeset publish` can never leak one',
      '  to registry.npmjs.org.',
      '',
      '  The supported path is:',
      '      pnpm release          (audit → build → changeset publish)',
      `  with ${REGISTRY_ENV} and ${TOKEN_ENV} set. See docs/PUBLISHING.md.`,
      '='.repeat(78),
      '',
    ].join('\n'),
  )
  process.exit(1)
}

console.log(`✔ publish guard: ${pkgName} → ${registry} (${REGISTRY_ENV})`)
