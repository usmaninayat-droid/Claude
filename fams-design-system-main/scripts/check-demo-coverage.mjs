#!/usr/bin/env node
/**
 * check-demo-coverage.mjs — the REVERSE registry check.
 *
 * WHY THIS EXISTS
 * ----------------
 * `build-registry.mjs` / `test-registry.mjs` only ever enforce ONE direction:
 * every showcase registry member must resolve to a real barrel export. Nothing
 * walked the barrel in the other direction asking *"does every exported
 * component actually get rendered in the showcase?"* — so a component could be
 * exported from `@fams/ui-kit` and demoed nowhere, and CI stayed green. That
 * is exactly how `DropdownMenuGroup` / `DropdownMenuPortal` sat uncovered.
 *
 * Root `CLAUDE.md` "Definition of done" items 6–8 are conjunctive: demo page +
 * registry family membership + barrel export. This script closes the missing
 * leg (6 for symbols that are sub-parts of a registered family member).
 *
 * WHAT IT CHECKS
 * ---------------
 * For every VALUE export of `packages/ui-kit/src/index.ts` that classifies as
 * a **renderable React component**, the symbol must either
 *   a) be imported as a value somewhere under `workshop/showcase/src/` (from
 *      `@fams/ui-kit` or a deep `packages/ui-kit/src/...` path), i.e. it is
 *      genuinely rendered on a demo page — unused imports are themselves a
 *      lint error, so an import is a reliable proxy for "rendered"; or
 *   b) appear in COVERED_BY_PARENT below — an EXPLICIT, documented exemption
 *      naming the parent whose demo renders it.
 * Anything else fails the check.
 *
 * CLASSIFICATION (deliberately shape-based, never name-based)
 * -----------------------------------------------------------
 * A naive "capitalized identifier ⇒ component" heuristic produces false
 * positives (`DEFAULT_RANGE_PRESETS`) and false negatives. Instead every value
 * export is resolved to its declaration in the owning source file and
 * classified by AST SHAPE:
 *
 *   component  — `function Foo() { … <jsx/> … }`, `const Foo = (…) => <jsx/>`,
 *                `forwardRef(…)` / `memo(…)`, or a namespace pass-through such
 *                as `const DropdownMenuGroup = DropdownMenuPrimitive.Group`
 *                (Radix/Base UI re-exports — renderable, so in scope).
 *   variants   — a `cva(…)` call (the `*Variants` class-name helpers).
 *   hook       — a function whose name matches /^use[A-Z]/.
 *   function   — a plain function/arrow with no JSX anywhere in its body.
 *   constant   — an object/array/literal initializer.
 *
 * If a declaration cannot be resolved or matched to one of those shapes the
 * script FAILS with `unclassified` rather than silently assuming "not a
 * component" — an unclassifiable export is a bug in this script or a new
 * authoring shape, and either way a human must look.
 *
 * SCOPE
 * ------
 * `@fams/ui-kit` only. That is the tier-1 core the showcase catalogues and the
 * package the DoD is written against; `@fams/v5-templates` members are covered
 * by the forward check and are demoed as whole templates.
 *
 * Run standalone for a readable report:  node scripts/check-demo-coverage.mjs
 * Wired into `node scripts/test-registry.mjs` (root `pnpm test`) for CI.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { REPO_ROOT, resolveModuleFile } from './build-registry.mjs'

const UI_KIT_BARREL = join(REPO_ROOT, 'packages/ui-kit/src/index.ts')
const SHOWCASE_SRC = join(REPO_ROOT, 'workshop/showcase/src')

/* ────────────────────────────────────────────────────────────────────────
 * The allowlist — deliberate, recorded exemptions
 * ────────────────────────────────────────────────────────────────────────
 * These exports are internal sub-parts of a compound component. They ARE
 * rendered in the showcase, but *through* their parent's markup (the parent's
 * `Content` renders its own Portal/Overlay internally), so no demo imports
 * them by name and no separate demo page is warranted — forcing one would
 * produce a page showing an invisible element.
 *
 * Every entry must name the parent whose demo covers it. Adding an entry is a
 * deliberate decision, reviewable in the diff; a NEW undemoed export that is
 * not listed here fails CI. See root CLAUDE.md § "Demo coverage is enforced
 * in both directions".
 */
export const COVERED_BY_PARENT = {
  ToasterHost:
    'AppShell mounts it internally as the app\'s default toast sink (it renders a Toaster and nothing of its own, standing aside when the app brings its own) — showcase demo: Toast',
  TopNavSlotProvider:
    'AppShell renders it internally around its page content (it is half of the top-nav slot contract, exported only for apps that build their own shell host) — showcase demo: AppShell',
  VehiclePopupTabBar:
    'VehiclePopupCard renders it internally as its footer tab bar (exported only so a host can build the same scalable bar over its own card) — showcase demo: VehiclePopupCard',
  DialogPortal: 'DialogContent renders it internally — showcase demo: Dialog',
  DialogOverlay: 'DialogContent renders it internally — showcase demo: Dialog',
  AlertDialogPortal: 'AlertDialogContent renders it internally — showcase demo: AlertDialog',
  AlertDialogOverlay: 'AlertDialogContent renders it internally — showcase demo: AlertDialog',
  SheetPortal: 'SheetContent renders it internally — showcase demo: Sheet',
  SheetOverlay: 'SheetContent renders it internally — showcase demo: Sheet',
  DrawerPortal: 'DrawerContent renders it internally — showcase demo: Drawer',
  DrawerOverlay: 'DrawerContent renders it internally — showcase demo: Drawer',
  ScrollBar: 'ScrollArea renders it internally — showcase demo: ScrollArea',
  NavRailDivider: 'NavRail renders it between rail sections — showcase demo: NavRail',
  NavRailContextProvider: 'NavRail renders it internally (exported for testing custom rows) — showcase demo: NavRail',
}

/* ────────────────────────────────────────────────────────────────────────
 * 1. Barrel → value exports (type-only specifiers dropped)
 * ──────────────────────────────────────────────────────────────────────── */

function parseFile(absPath) {
  const source = readFileSync(absPath, 'utf8')
  const kind = absPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  return ts.createSourceFile(absPath, source, ts.ScriptTarget.Latest, true, kind)
}

/** @returns {{ exported: string, local: string, modulePath: string }[]} */
export function valueExports(barrelAbsPath = UI_KIT_BARREL) {
  const sourceFile = parseFile(barrelAbsPath)
  const out = []
  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue
    if (statement.isTypeOnly) continue
    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue
    const modulePath = statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : undefined
    if (!modulePath || !modulePath.startsWith('.')) continue // re-export from another package — out of scope
    for (const element of statement.exportClause.elements) {
      if (element.isTypeOnly) continue
      out.push({
        exported: element.name.text,
        local: (element.propertyName ?? element.name).text,
        modulePath,
      })
    }
  }
  return out
}

/* ────────────────────────────────────────────────────────────────────────
 * 2. Shape-based classification
 * ──────────────────────────────────────────────────────────────────────── */

function containsJsx(node) {
  let found = false
  const visit = (n) => {
    if (found) return
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
      found = true
      return
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  return found
}

/** Callee text for `cva(...)`, `forwardRef(...)`, `React.memo(...)`, … */
function calleeName(expr) {
  const callee = expr.expression
  if (ts.isIdentifier(callee)) return callee.text
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text
  return undefined
}

const COMPONENT_FACTORIES = new Set(['forwardRef', 'memo'])

/**
 * Classify a symbol this file merely *imported* and re-exported (e.g.
 * `import { toast } from 'sonner'` + `export { toast }`).
 *
 * A relative import is followed into its own file. For a bare third-party
 * specifier there is no local declaration to inspect, so we fall back to the
 * one capitalization rule that is SOUND rather than heuristic: JSX treats a
 * lowercase-initial tag as a DOM element, so a lowercase export can never be
 * rendered as a component. Anything PascalCase is treated as a component —
 * the conservative direction (it demands a demo or an allowlist entry).
 */
function classifyImportedBinding(sourceFile, localName, seen) {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const clause = statement.importClause
    if (!clause || clause.isTypeOnly) continue
    const bindings = clause.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const element of bindings.elements) {
      if (element.name.text !== localName || element.isTypeOnly) continue
      const upstream = (element.propertyName ?? element.name).text
      const specifier = statement.moduleSpecifier.text
      if (specifier.startsWith('.')) {
        const nextFile = resolveModuleFile(dirname(sourceFile.fileName), specifier)
        return classifySymbol(parseFile(nextFile), upstream, seen)
      }
      return /^[A-Z]/.test(upstream)
        ? { kind: 'component', reason: `re-export of "${upstream}" from "${specifier}" (PascalCase ⇒ renderable)` }
        : { kind: 'function', reason: `re-export of "${upstream}" from "${specifier}" (lowercase ⇒ not JSX-renderable)` }
    }
  }
  return { kind: 'unclassified', reason: `re-exported "${localName}" has no matching import in ${relative(REPO_ROOT, sourceFile.fileName)}` }
}

/**
 * Find the declaration of `localName` in `sourceFile`; follows local
 * `export { X } from './y'` re-exports and `const A = B` aliases.
 * @returns {{ kind: string, reason: string }}
 */
function classifySymbol(sourceFile, localName, seen = new Set()) {
  const key = `${sourceFile.fileName}#${localName}`
  if (seen.has(key)) return { kind: 'unclassified', reason: 'circular alias' }
  seen.add(key)

  for (const statement of sourceFile.statements) {
    // export { Local as Name } from './other'   /   export { Name } from './other'
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        if (element.name.text !== localName) continue
        if (statement.isTypeOnly || element.isTypeOnly) return { kind: 'type', reason: 'type-only re-export' }
        const next = (element.propertyName ?? element.name).text
        if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
          const nextFile = resolveModuleFile(dirname(sourceFile.fileName), statement.moduleSpecifier.text)
          return classifySymbol(parseFile(nextFile), next, seen)
        }
        if (next !== localName) return classifySymbol(sourceFile, next, seen)
        // `export { toast }` — re-export of something this file imported.
        return classifyImportedBinding(sourceFile, next, seen)
      }
    }

    if (ts.isFunctionDeclaration(statement) && statement.name?.text === localName) {
      if (/^use[A-Z]/.test(localName)) return { kind: 'hook', reason: 'function declaration named use*' }
      return containsJsx(statement)
        ? { kind: 'component', reason: 'function declaration returning JSX' }
        : { kind: 'function', reason: 'function declaration with no JSX' }
    }

    if (ts.isClassDeclaration(statement) && statement.name?.text === localName) {
      return { kind: 'component', reason: 'class declaration' }
    }

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || decl.name.text !== localName) continue
        const init = decl.initializer
        if (!init) return { kind: 'unclassified', reason: 'variable with no initializer' }

        if (ts.isCallExpression(init)) {
          const callee = calleeName(init)
          if (callee === 'cva') return { kind: 'variants', reason: 'cva() call' }
          if (COMPONENT_FACTORIES.has(callee ?? '')) return { kind: 'component', reason: `${callee}() component factory` }
          return { kind: 'unclassified', reason: `call expression to "${callee ?? '?'}"` }
        }
        if (ts.isPropertyAccessExpression(init)) {
          // e.g. `export const DropdownMenuGroup = DropdownMenuPrimitive.Group`
          return { kind: 'component', reason: `namespace pass-through (${init.getText()})` }
        }
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          if (/^use[A-Z]/.test(localName)) return { kind: 'hook', reason: 'arrow/function expression named use*' }
          return containsJsx(init)
            ? { kind: 'component', reason: 'arrow/function expression returning JSX' }
            : { kind: 'function', reason: 'arrow/function expression with no JSX' }
        }
        if (
          ts.isObjectLiteralExpression(init) ||
          ts.isArrayLiteralExpression(init) ||
          ts.isStringLiteralLike(init) ||
          ts.isNumericLiteral(init) ||
          init.kind === ts.SyntaxKind.TrueKeyword ||
          init.kind === ts.SyntaxKind.FalseKeyword ||
          ts.isAsExpression(init)
        ) {
          return { kind: 'constant', reason: 'literal / as-const initializer' }
        }
        if (ts.isIdentifier(init)) {
          // `export const A = B` — B may be declared in THIS file, or (as with
          // `POI_CATEGORIES = POI_CATEGORY_ART`) imported from a sibling module.
          // Try the local declaration first, then follow the import.
          const local = classifySymbol(sourceFile, init.text, seen)
          if (local.kind !== 'unclassified') return local
          return classifyImportedBinding(sourceFile, init.text, seen)
        }
        return { kind: 'unclassified', reason: `unrecognised initializer (${ts.SyntaxKind[init.kind]})` }
      }
    }
  }
  return { kind: 'unclassified', reason: `no declaration found in ${relative(REPO_ROOT, sourceFile.fileName)}` }
}

/* ────────────────────────────────────────────────────────────────────────
 * 3. What the showcase actually imports (value imports only, alias-aware)
 * ──────────────────────────────────────────────────────────────────────── */

function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    if (statSync(abs).isDirectory()) walkFiles(abs, out)
    else if (/\.tsx?$/.test(entry)) out.push(abs)
  }
  return out
}

const UI_KIT_SPECIFIER_RE = /^@fams\/ui-kit(\/.*)?$|packages\/ui-kit\/src\//

/** Set of ui-kit export names value-imported anywhere under workshop/showcase/src. */
export function showcaseImportedSymbols(root = SHOWCASE_SRC) {
  const imported = new Set()
  for (const file of walkFiles(root)) {
    const sourceFile = parseFile(file)
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) continue
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
      if (!UI_KIT_SPECIFIER_RE.test(statement.moduleSpecifier.text)) continue
      const clause = statement.importClause
      if (!clause || clause.isTypeOnly) continue
      const bindings = clause.namedBindings
      if (!bindings || !ts.isNamedImports(bindings)) continue
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue
        // `import { Badge as BadgeChip }` → record the ui-kit-side name.
        imported.add((element.propertyName ?? element.name).text)
      }
    }
  }
  return imported
}

/* ────────────────────────────────────────────────────────────────────────
 * 4. The check
 * ──────────────────────────────────────────────────────────────────────── */

export function checkDemoCoverage() {
  const barrelDir = dirname(UI_KIT_BARREL)
  const imported = showcaseImportedSymbols()

  const components = []
  const skipped = []
  const unclassified = []

  for (const { exported, local, modulePath } of valueExports()) {
    const moduleFile = resolveModuleFile(barrelDir, modulePath)
    const { kind, reason } = classifySymbol(parseFile(moduleFile), local)
    if (kind === 'component') components.push({ name: exported, modulePath, reason })
    else if (kind === 'unclassified') unclassified.push({ name: exported, modulePath, reason })
    else skipped.push({ name: exported, kind })
  }

  const uncovered = []
  const allowlisted = []
  for (const component of components) {
    if (imported.has(component.name)) continue
    if (component.name in COVERED_BY_PARENT) {
      allowlisted.push(component.name)
      continue
    }
    uncovered.push(component)
  }

  // A stale allowlist is also a failure — an entry that is now demoed (or no
  // longer exported) must be removed so the list stays a true record.
  const staleAllowlist = Object.keys(COVERED_BY_PARENT).filter(
    (name) => !components.some((c) => c.name === name) || imported.has(name),
  )

  return { components, skipped, unclassified, uncovered, allowlisted, staleAllowlist }
}

export function demoCoverageFailures() {
  const { unclassified, uncovered, staleAllowlist } = checkDemoCoverage()
  const failures = []
  for (const { name, modulePath, reason } of unclassified) {
    failures.push(
      `export "${name}" (${modulePath}) could not be classified (${reason}) — ` +
        'teach scripts/check-demo-coverage.mjs this authoring shape rather than ignoring it.',
    )
  }
  for (const { name, modulePath } of uncovered) {
    failures.push(
      `component "${name}" (${modulePath}) is exported from @fams/ui-kit but rendered NOWHERE in ` +
        'workshop/showcase/src — root CLAUDE.md DoD #6. Add it to a demo page (extend the existing ' +
        "family demo — don't create a new family), or, if it is an internal sub-part covered by its " +
        "parent's demo, add it to COVERED_BY_PARENT in scripts/check-demo-coverage.mjs naming that parent.",
    )
  }
  for (const name of staleAllowlist) {
    failures.push(
      `COVERED_BY_PARENT entry "${name}" is stale — it is now demoed directly (or no longer an exported ` +
        'component). Remove the entry so the allowlist stays a true record.',
    )
  }
  return failures
}

function main() {
  const { components, skipped, unclassified, uncovered, allowlisted } = checkDemoCoverage()
  const byKind = skipped.reduce((acc, s) => ({ ...acc, [s.kind]: (acc[s.kind] ?? 0) + 1 }), {})
  console.log(
    `[check-demo-coverage] ${components.length} renderable component export(s); ` +
      `skipped ${skipped.length} non-component value export(s) (${Object.entries(byKind)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}).`,
  )
  console.log(`[check-demo-coverage] ${components.length - uncovered.length - allowlisted.length} demoed directly, ${allowlisted.length} covered via parent (allowlist), ${uncovered.length} uncovered.`)
  const failures = demoCoverageFailures()
  if (failures.length > 0) {
    console.error('[check-demo-coverage] FAILED:\n' + failures.map((f) => `  - ${f}`).join('\n'))
    process.exit(1)
  }
  if (unclassified.length > 0) process.exit(1)
  console.log('[check-demo-coverage] OK — every exported ui-kit component is demoed or explicitly allowlisted.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
