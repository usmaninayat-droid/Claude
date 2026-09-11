#!/usr/bin/env node
/**
 * check-peer-singletons.mjs — guards against a class of bug reported by a
 * team consuming this DS from a different workspace (FAMS Desk, 2026-08):
 * a publishable `@fams/*` package pulling in its own private copy of a package
 * that owns React context or hook state.
 *
 * THE RULE: any package that owns React context or hook state (i.e. it
 * exposes a Provider whose value is read via a hook bound to that specific
 * module instance — `useContext`, `useSyncExternalStore`, a custom
 * `useStore`, …) MUST be a `peerDependency`, never a plain `dependency`, of
 * a publishable package. Two copies of such a package can end up resolved
 * in one app (one inside the DS package's own `node_modules`, one the host
 * app installs itself) — the host's `react-dom` renders using ONE hook
 * dispatcher / context instance, while the DS package's private copy reads
 * or writes state against a different, never-mounted instance. That mismatch
 * is exactly `Invalid hook call` / a null hook dispatcher, and it is often
 * silent until a consumer in a DIFFERENT workspace (its own `node_modules`,
 * not this monorepo's shared one) triggers it — which is why this failed on
 * `@tanstack/react-router` / `@tanstack/react-query` in skeleton-kit despite
 * every internal (same-workspace, single-`node_modules`) consumer working
 * fine.
 *
 * ── The singleton list — ONE place, easy to extend ──────────────────────────
 * Add a package's name below the moment it (a) exposes a React context
 * Provider or a hook that reads shared/mutable module-level state, AND
 * (b) is a real dependency of a publishable `@fams/*` package. That is the
 * whole contract — no other file needs to change.
 */
export const REACT_SINGLETON_PACKAGES = [
  // The hook dispatcher itself — the textbook "Invalid hook call".
  'react',
  'react-dom',
  // TanStack Router's `RouterProvider` puts the router in React context;
  // `useRouter`/`useMatches`/`useNavigate`/etc. read it via a `useStore`
  // hook bound to that specific package instance.
  '@tanstack/react-router',
  // TanStack Query's `QueryClientProvider` puts the `QueryClient` in React
  // context; `useQuery`/`useMutation`/etc. read it the same way.
  '@tanstack/react-query',
]

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT, PUBLISHABLE } from './publish-config.mjs'

/**
 * @returns {string[]} one human-readable failure line per violation found;
 * empty when every publishable package is clean.
 */
export function peerSingletonFailures() {
  const failures = []

  for (const dir of PUBLISHABLE) {
    const pkgPath = join(REPO_ROOT, dir, 'package.json')
    /** @type {{ name: string, dependencies?: Record<string, string> }} */
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const deps = pkg.dependencies ?? {}

    for (const singleton of REACT_SINGLETON_PACKAGES) {
      if (singleton in deps) {
        failures.push(
          [
            `${pkg.name} declares "${singleton}" as a plain dependency.`,
            `  "${singleton}" owns React context/hook state and MUST be a peerDependency`,
            `  of a publishable package, or a consuming app can end up with two copies —`,
            `  producing "Invalid hook call" / a null hook dispatcher.`,
            `  Fix: in ${dir}/package.json, move "${singleton}" from "dependencies" to`,
            `  "peerDependencies" (mirror how "react"/"react-dom" are already declared`,
            `  there), and add it to "devDependencies" (using "catalog:") so this`,
            `  monorepo's own build/typecheck/test keep resolving it.`,
          ].join('\n'),
        )
      }
    }
  }

  return failures
}

// Only run as a CLI check when invoked directly (also importable for tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = peerSingletonFailures()

  if (failures.length > 0) {
    console.error(
      `[check-peer-singletons] FAILED — ${failures.length} publishable package(s) ` +
        'declare a React-singleton package as a plain dependency:\n\n' +
        failures.map((f) => `${f}\n`).join('\n'),
    )
    process.exit(1)
  }

  console.log(
    `[check-peer-singletons] OK — none of ${PUBLISHABLE.length} publishable package(s) ` +
      `declare any of [${REACT_SINGLETON_PACKAGES.join(', ')}] as a plain dependency.`,
  )
}
