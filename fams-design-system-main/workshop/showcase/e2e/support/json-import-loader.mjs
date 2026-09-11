// Node ESM loader shim — registered from playwright.config.ts before any test
// file loads.
//
// Why this exists: Playwright's test-discovery phase imports spec files
// directly in a Node process (not through Vite) to enumerate `test()` calls.
// The route-derivation chain (nav.ts -> registry.tsx -> demo components ->
// @fams/ui-kit / @fams/v5-templates) statically imports the FULL demo tree,
// which trips three separate Node-vs-bundler resolution gaps below. Every
// one of these is fine in the browser (Vite bundles around all of them) —
// only this Node-side static-import pass is affected.

import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

// (1) `.json` imports. `import chartTheme from '@fams/tokens/theme.echarts.json'`
// (a chart composite in @fams/ui-kit) — because @fams/tokens declares
// `"type": "module"`, Node's native ESM loader requires an explicit
// `with { type: 'json' }` import attribute on modern Node, which the source
// doesn't carry. Patch the load step to treat any `.json` specifier as JSON
// regardless of the attribute, restoring the pre-Node-22 auto-detection.
//
// (2) Plain asset imports Vite handles natively but Node has no format for at
// all ("Unknown file extension"): `import 'maplibre-gl/dist/maplibre-gl.css'`,
// `import logo from '…/logo.svg?url'`. This Node-side pass only needs these
// modules to exist (it's enumerating `test()` calls, never rendering a
// component) — stub them out to an empty default export.
const ASSET_EXT_RE = /\.(css|less|scss|svg|png|jpe?g|gif|webp|avif|woff2?|ttf|otf|eot|ico|bmp|mp4|webm|glb|gltf)(\?.*)?$/i

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json') && context.importAttributes?.type !== 'json') {
    return nextLoad(url, { ...context, importAttributes: { ...context.importAttributes, type: 'json' } })
  }
  if (ASSET_EXT_RE.test(url)) {
    return { format: 'module', source: 'export default "";', shortCircuit: true }
  }
  return nextLoad(url, context)
}

// (3) Discovered while wiring the visual-regression suites (phase 4 §2):
// @fams/v5-templates' compiled `dist/index.js` transitively pulls in
// @atlaskit/pragmatic-drag-and-drop (the Kanban demo's DnD backend), whose
// published ESM build (a) exposes subpaths as folders with their own
// package.json main/module fields — no root `exports` map — and (b) contains
// its OWN internal relative imports with no file extension (e.g.
// `from '../../adapter/element-adapter'`). Both patterns are exactly what
// bundlers (Vite/webpack/Rollup) resolve — that's what this package was
// actually shipped to be consumed by — but neither is legal under Node's
// native ESM resolver, which requires explicit `exports` map entries for
// directory/main-field fallback and full file extensions on relative
// specifiers. This is a PRE-EXISTING gap, independent of this task — it
// already blocked routes.smoke.spec.ts's and visual.spec.ts's own Node-side
// test-discovery pass before any of this task's spec files existed (verified:
// `--list` failed the same way on a clean checkout). Fixed generically (not
// hardcoded to this one package) so any other dependency shipping either
// pattern is covered too.
const DIR_IMPORT_RE = /^Directory import '([^']+)' is not supported/
const MISSING_MODULE_RE = /^Cannot find module '([^']+)'/

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    // Directory import without an `exports` map — read the nested
    // package.json's `module`/`main` field ourselves (legacy CJS-style
    // resolution `import` doesn't do, but bundlers and `require` both do).
    const dirMatch = err?.code === 'ERR_UNSUPPORTED_DIR_IMPORT' && DIR_IMPORT_RE.exec(err.message ?? '')
    if (dirMatch) {
      const dir = dirMatch[1]
      const pkgJsonPath = path.join(dir, 'package.json')
      if (existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
        const entry = pkg.module ?? pkg.main
        if (entry) return nextResolve(pathToFileURL(path.join(dir, entry)).href, context)
      }
    }
    // Extensionless relative specifier inside a legacy-ESM dist bundle —
    // probe the same candidates a bundler/`require` would (`.js`, `.mjs`,
    // `/index.js`) before giving up.
    const missingMatch = err?.code === 'ERR_MODULE_NOT_FOUND' && MISSING_MODULE_RE.exec(err.message ?? '')
    if (missingMatch) {
      const missingPath = missingMatch[1]
      for (const candidate of [`${missingPath}.js`, `${missingPath}.mjs`, path.join(missingPath, 'index.js')]) {
        if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context)
      }
    }
    throw err
  }
}
