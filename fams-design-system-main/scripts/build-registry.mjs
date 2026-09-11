#!/usr/bin/env node
/**
 * build-registry.mjs — generates the repo-root `registry.json` (phase 4 §4,
 * `pnpm build:registry`).
 *
 * WHAT THIS IS (and isn't)
 * -------------------------
 * `registry.json` is a **read-only agent/tooling discovery index** shaped
 * like a shadcn registry (https://ui.shadcn.com/schema/registry.json) —
 * name/homepage/items[] with name, type (`registry:ui` / `registry:component`
 * / `registry:block`), title, description, files[], dependencies,
 * registryDependencies. It is NOT a shadcn-CLI copy-install source: this
 * repo's distribution model explicitly rejects the shadcn registry-copy
 * pattern as institutionalized forking (`docs/BOUNDARIES.md` § Governance —
 * "Distribution: consume, don't fork. Versioned private npm package. The
 * shadcn registry-copy model is rejected."). Consumers install the real
 * versioned `@fams/ui-kit` / `@fams/v5-templates` packages; this file exists
 * so an agent (or a human) can answer "what components exist, what do they
 * do, where do they live" without hand-walking the showcase.
 *
 * SOURCE OF TRUTH
 * ----------------
 * `workshop/showcase/src/registry.tsx` (`COMPONENT_GROUPS`) is parsed
 * with the TypeScript compiler API (already a workspace devDependency — no
 * new dep) to extract every group → family → member, in the exact structure
 * and order authored there. File paths are resolved independently by
 * scanning each package's public barrel(s) (`export { X, … } from './path'`)
 * so `registry.json` always points at the real, currently-exported source
 * file, never a guess.
 *
 * SCOPE
 * -----
 * Only the `@fams/ui-kit` groups (everything except `v5-templates`,
 * `composer`, `demo-kit`) and the `v5-templates` group are covered, per the
 * task brief ("cover ui-kit components + v5-templates templates"). The
 * `composer` (gate-demo) and `demo-kit` (DemoConsole) groups showcase
 * capabilities that aren't themselves ui-kit/v5-templates exports and are
 * deliberately out of scope here.
 *
 * DETERMINISM
 * -----------
 * No timestamps, no non-deterministic ordering (iteration follows
 * `COMPONENT_GROUPS` source order throughout) — running this twice against
 * the same source produces byte-identical output, which is what
 * `scripts/test-registry.mjs` (wired into `pnpm test`) checks for staleness.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = join(SCRIPT_DIR, '..')
const SHOWCASE_REGISTRY = join(REPO_ROOT, 'workshop/showcase/src/registry.tsx')
export const OUTPUT_PATH = join(REPO_ROOT, 'registry.json')

// Groups sourced from `@fams/ui-kit` vs `@fams/v5-templates` vs excluded
// (composer/demo-kit showcase capabilities, not package exports covered here).
const EXCLUDED_GROUP_IDS = new Set(['composer', 'demo-kit'])
const V5_TEMPLATES_GROUP_ID = 'v5-templates'

/* ────────────────────────────────────────────────────────────────────────
 * 1. Parse workshop/showcase/src/registry.tsx → groups[]
 * ──────────────────────────────────────────────────────────────────────── */

/** @returns {string | undefined} the literal text of a string-like property value */
function stringLiteralText(node) {
  if (ts.isStringLiteralLike(node)) return node.text
  return undefined
}

function getObjectStringProp(obj, name) {
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && prop.name && ts.isIdentifier(prop.name) && prop.name.text === name) {
      return stringLiteralText(prop.initializer)
    }
  }
  return undefined
}

function getObjectArrayProp(obj, name) {
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && prop.name && ts.isIdentifier(prop.name) && prop.name.text === name) {
      return ts.isArrayLiteralExpression(prop.initializer) ? prop.initializer : undefined
    }
  }
  return undefined
}

/** Parse COMPONENT_GROUPS out of the showcase registry source via the TS AST. */
export function parseShowcaseRegistry(source = readFileSync(SHOWCASE_REGISTRY, 'utf8')) {
  const sourceFile = ts.createSourceFile(SHOWCASE_REGISTRY, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

  let groupsArray
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'COMPONENT_GROUPS' &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      groupsArray = node.initializer
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  if (!groupsArray) {
    throw new Error(`build-registry: could not find "export const COMPONENT_GROUPS" in ${SHOWCASE_REGISTRY}`)
  }

  const groups = []
  for (const groupNode of groupsArray.elements) {
    if (!ts.isObjectLiteralExpression(groupNode)) continue
    const groupId = getObjectStringProp(groupNode, 'id')
    const groupLabel = getObjectStringProp(groupNode, 'label')
    const familiesArray = getObjectArrayProp(groupNode, 'families')
    if (!groupId || !familiesArray) {
      throw new Error(`build-registry: malformed group entry (missing id/families) near ${groupLabel ?? '?'}`)
    }

    const families = []
    for (const familyNode of familiesArray.elements) {
      if (!ts.isObjectLiteralExpression(familyNode)) continue
      const familyId = getObjectStringProp(familyNode, 'id')
      const familyLabel = getObjectStringProp(familyNode, 'label')
      const intro = getObjectStringProp(familyNode, 'intro')
      const membersArray = getObjectArrayProp(familyNode, 'members')
      if (!familyId || intro === undefined || !membersArray) {
        throw new Error(`build-registry: malformed family entry (missing id/intro/members) in group "${groupId}"`)
      }

      const members = []
      for (const memberNode of membersArray.elements) {
        if (!ts.isObjectLiteralExpression(memberNode)) continue
        const memberId = getObjectStringProp(memberNode, 'id')
        const memberLabel = getObjectStringProp(memberNode, 'label')
        if (!memberId || !memberLabel) {
          throw new Error(`build-registry: malformed member entry in family "${familyId}" (group "${groupId}")`)
        }
        members.push({ id: memberId, label: memberLabel })
      }
      families.push({ id: familyId, label: familyLabel ?? familyId, intro, members })
    }
    groups.push({ id: groupId, label: groupLabel ?? groupId, families })
  }
  return groups
}

/* ────────────────────────────────────────────────────────────────────────
 * 2. Scan a package barrel (`export { … } from '<path>'`) → basename map
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Split a brace-list body ("Foo, type FooProps, Bar as Baz") into the
 * identifiers a *consumer* would import — i.e. after any `as` rename, with
 * bare `type X` entries stripped down to `X` (still useful for cross-linking
 * a `type`-only import back to its owning component).
 */
export function namedBindingIdentifiers(braceBody) {
  return braceBody
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      let e = entry.replace(/^type\s+/, '').trim()
      const asMatch = e.match(/^(.+?)\s+as\s+(.+)$/)
      if (asMatch) e = asMatch[2].trim()
      return e
    })
    .filter(Boolean)
}

export const EXPORT_FROM_RE = /export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/gs

/**
 * Raw, unfiltered `export { … } from '...'` statements in a barrel file —
 * including re-exports from another npm package (e.g. `@fams/v5-composer`),
 * which `scanBarrel` (local-file-only) deliberately skips. Used by
 * `build-llms.mjs`, which documents those re-exports too.
 * @returns {{ braceBody: string, modulePath: string }[]}
 */
export function parseExportStatements(barrelAbsPath) {
  const source = readFileSync(barrelAbsPath, 'utf8')
  return [...source.matchAll(EXPORT_FROM_RE)].map(([, braceBody, modulePath]) => ({ braceBody, modulePath }))
}

export function resolveModuleFile(barrelDir, modulePath) {
  for (const ext of ['.tsx', '.ts']) {
    const candidate = join(barrelDir, `${modulePath}${ext}`)
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`build-registry: cannot resolve module "${modulePath}" from barrel dir ${barrelDir}`)
}

/**
 * Scan one barrel file's `export { … } from '...'` statements.
 * @returns {{ basenameMap: Map<string, {absFile: string, modulePath: string}>,
 *             symbolToBasename: Map<string, string> }}
 */
export function scanBarrel(barrelAbsPath) {
  const barrelDir = dirname(barrelAbsPath)
  const basenameMap = new Map()
  const symbolToBasename = new Map()

  for (const { braceBody, modulePath } of parseExportStatements(barrelAbsPath)) {
    if (!modulePath.startsWith('.')) continue // re-exports from another npm package (e.g. @fams/v5-composer) — not a local file
    const absFile = resolveModuleFile(barrelDir, modulePath)
    const base = basename(modulePath)
    if (!basenameMap.has(base)) basenameMap.set(base, { absFile, modulePath })
    for (const symbol of namedBindingIdentifiers(braceBody)) {
      symbolToBasename.set(symbol, base)
    }
  }
  return { basenameMap, symbolToBasename }
}

/* ────────────────────────────────────────────────────────────────────────
 * 3. Member → component-file matching
 * ──────────────────────────────────────────────────────────────────────── */

function capitalize(word) {
  return word.length ? word[0].toUpperCase() + word.slice(1) : word
}

/** 'date-range-picker' → 'DateRangePicker' */
function idToPascal(id) {
  return id.split('-').map(capitalize).join('')
}

/** 'ListView' → 'ListView'; 'DetailSheet / FormSheet' → 'DetailSheetFormSheet' (fallback only) */
function labelToPascal(label) {
  return label
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(capitalize)
    .join('')
}

function findComponentFile(basenameMap, member) {
  const candidates = [idToPascal(member.id), labelToPascal(member.label)]
  for (const candidate of candidates) {
    const hit = basenameMap.get(candidate)
    if (hit) return hit
  }
  throw new Error(
    `build-registry: no barrel export matches member "${member.label}" (id "${member.id}"). ` +
      `Tried basenames: ${candidates.join(', ')}. Add/rename the barrel export, or extend the matcher.`,
  )
}

/* ────────────────────────────────────────────────────────────────────────
 * 4. registry:ui / registry:component / registry:block classification
 * ──────────────────────────────────────────────────────────────────────── */

function classifyUiKitItem(modulePath) {
  if (modulePath.includes('/primitives/') || modulePath.includes('/layout/')) return 'registry:ui'
  if (
    modulePath.includes('/composites/') ||
    modulePath.includes('/domain/') ||
    // wall-display: composed, always-dark operations-wall parts
    modulePath.includes('/wall-display/')
  )
    return 'registry:component'
  if (modulePath.includes('/shells/')) return 'registry:block'
  throw new Error(`build-registry: cannot classify ui-kit module path "${modulePath}"`)
}

/* ────────────────────────────────────────────────────────────────────────
 * 5. dependencies / registryDependencies extraction (per resolved file)
 * ──────────────────────────────────────────────────────────────────────── */

const IMPORT_FROM_RE = /import\s+(?:type\s+)?(?:[\w*]+\s*,?\s*)?(?:\{([^}]*)\})?\s*(?:from\s+)?['"]([^'"]+)['"]/g

function extractImports(absFile) {
  const source = readFileSync(absFile, 'utf8')
  const specifiers = []
  for (const match of source.matchAll(IMPORT_FROM_RE)) {
    const [, braceBody, specifier] = match
    specifiers.push({ specifier, symbols: braceBody ? namedBindingIdentifiers(braceBody) : [] })
  }
  return specifiers
}

const IGNORED_BARE_DEPS = new Set(['react', 'react-dom'])

/**
 * Resolve a relative import specifier (e.g. './echarts-engine', '../utils/cn')
 * against the file that imports it, to a real file on disk — trying the
 * extensions actually used in this repo (`.tsx`, `.ts`), then the same pair
 * under an `index.*` inside that directory (for `./foo` resolving to
 * `foo/index.ts`). Returns `undefined` if nothing on disk matches (the caller
 * skips it rather than throwing — a relative specifier that doesn't resolve
 * to source, e.g. a JSON/CSS asset import, isn't a code dependency to walk).
 */
function resolveLocalImportFile(fromFile, specifier) {
  const raw = join(dirname(fromFile), specifier)
  for (const ext of ['.tsx', '.ts']) {
    if (existsSync(`${raw}${ext}`)) return `${raw}${ext}`
  }
  for (const ext of ['.tsx', '.ts']) {
    const candidate = join(raw, `index${ext}`)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

/**
 * Walk LOCAL, same-package relative imports transitively starting at
 * `rootFile`, so a helper module extracted out of a component (e.g.
 * `ChartContainer.tsx` → `echarts-engine.ts`) doesn't silently drop its
 * dependencies off the registry entry. A visited set guards against cycles.
 *
 * Bare/external specifiers (npm packages, `@fams/*` sibling packages) are
 * RECORDED at the edge where they're imported but never traversed into —
 * node_modules and other workspace packages are out of scope for this walk,
 * only "how does this component's own local file graph, followed all the
 * way down, actually reach the outside world" is.
 *
 * `import type { … } from '…'` is matched by the same `extractImports` regex
 * used for value imports (see IMPORT_FROM_RE) — type-only imports count
 * toward both `dependencies` and the local-file walk exactly like value
 * imports do, unchanged from the prior single-file behaviour.
 *
 * @returns {{ externalDeps: Set<string>, importsByFile: Map<string, {specifier: string, symbols: string[]}[]> }}
 */
function walkLocalImports(rootFile) {
  const visitedFiles = new Set()
  const externalDeps = new Set()
  const importsByFile = new Map()

  const stack = [rootFile]
  while (stack.length > 0) {
    const file = stack.pop()
    if (visitedFiles.has(file)) continue
    visitedFiles.add(file)

    const specs = extractImports(file)
    importsByFile.set(file, specs)
    for (const { specifier } of specs) {
      if (specifier.startsWith('.')) {
        const resolved = resolveLocalImportFile(file, specifier)
        if (resolved && !visitedFiles.has(resolved)) stack.push(resolved)
      } else if (!IGNORED_BARE_DEPS.has(specifier)) {
        externalDeps.add(specifier)
      }
    }
  }
  return { externalDeps, importsByFile }
}

/* ────────────────────────────────────────────────────────────────────────
 * 6. Build the registry
 * ──────────────────────────────────────────────────────────────────────── */

export function buildRegistry() {
  const groups = parseShowcaseRegistry()

  const uiKitBarrel = scanBarrel(join(REPO_ROOT, 'packages/ui-kit/src/index.ts'))
  const v5MainBarrel = scanBarrel(join(REPO_ROOT, 'packages/v5-templates/src/index.ts'))
  const v5MapBarrel = scanBarrel(join(REPO_ROOT, 'packages/v5-templates/src/map/index.ts'))
  // v5-templates has two independent entry points (main + ./map) — merge their
  // basename/symbol maps for lookup purposes; a component lives in exactly one.
  const v5TemplatesBasenames = new Map([...v5MainBarrel.basenameMap, ...v5MapBarrel.basenameMap])
  const v5TemplatesSymbols = new Map([...v5MainBarrel.symbolToBasename, ...v5MapBarrel.symbolToBasename])

  // Pass 1 — resolve every in-scope member to its source file + item id, and
  // build the reverse basename→itemId map used for registryDependencies.
  const resolved = [] // { groupId, familyId, family, member, pkg, absFile, modulePath }
  const basenameToItemId = { 'ui-kit': new Map(), 'v5-templates': new Map() }
  const seenIds = new Set()

  for (const group of groups) {
    if (EXCLUDED_GROUP_IDS.has(group.id)) continue
    const pkg = group.id === V5_TEMPLATES_GROUP_ID ? 'v5-templates' : 'ui-kit'
    const basenameMap = pkg === 'v5-templates' ? v5TemplatesBasenames : uiKitBarrel.basenameMap

    for (const family of group.families) {
      for (const member of family.members) {
        if (seenIds.has(member.id)) {
          throw new Error(`build-registry: duplicate showcase member id "${member.id}" — every member must appear exactly once`)
        }
        seenIds.add(member.id)

        const { absFile, modulePath } = findComponentFile(basenameMap, member)
        resolved.push({ groupId: group.id, family, member, pkg, absFile, modulePath })
        basenameToItemId[pkg].set(basename(modulePath), member.id)
      }
    }
  }

  // Pass 2 — dependencies / registryDependencies per item, now that every
  // member's item id is known.
  const symbolMaps = { 'ui-kit': uiKitBarrel.symbolToBasename, 'v5-templates': v5TemplatesSymbols }

  const items = resolved.map(({ family, member, pkg, absFile, modulePath }) => {
    const relFile = relative(REPO_ROOT, absFile).split('\\').join('/')
    const type = pkg === 'v5-templates' ? 'registry:block' : classifyUiKitItem(modulePath.split('\\').join('/'))

    const dependencies = new Set()
    const registryDependencies = new Set()

    // Walk this item's own file plus every local module it reaches
    // transitively (e.g. a helper extracted into a sibling file) so an
    // external dependency imported only by that helper — like
    // `echarts-engine.ts` importing `@fams/tokens/theme.echarts.json` on
    // ChartContainer's behalf — still attributes to this item.
    const { externalDeps, importsByFile } = walkLocalImports(absFile)
    for (const dep of externalDeps) dependencies.add(dep)

    for (const specs of importsByFile.values()) {
      for (const { symbols } of specs) {
        for (const symbol of symbols) {
          const symbolMap = symbolMaps[pkg]
          const base = symbolMap.get(symbol)
          const itemId = base ? basenameToItemId[pkg].get(base) : undefined
          if (itemId && itemId !== member.id) registryDependencies.add(itemId)
        }
      }
    }

    return {
      name: member.id,
      type,
      title: member.label,
      description: family.intro,
      files: [{ path: relFile, type }],
      dependencies: [...dependencies].sort(),
      registryDependencies: [...registryDependencies].sort(),
    }
  })

  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'fams-design-system',
    homepage: 'http://localhost:6100',
    description:
      'Read-only agent/tooling discovery index over @fams/ui-kit + @fams/v5-templates, generated from workshop/showcase/src/registry.tsx by scripts/build-registry.mjs. NOT a shadcn-CLI copy-install source — install the real versioned npm packages; see docs/BOUNDARIES.md § Governance ("the shadcn registry-copy model is rejected").',
    items,
  }
}

function main() {
  const registry = buildRegistry()
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(registry, null, 2)}\n`)
  console.log(`[build:registry] wrote ${relative(REPO_ROOT, OUTPUT_PATH)} — ${registry.items.length} item(s).`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
