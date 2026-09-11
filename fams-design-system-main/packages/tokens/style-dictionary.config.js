import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Maps a Style Dictionary token path (top-level group + rest) to a Tailwind v4
 * `@theme` custom-property name. Tailwind v4 reads these namespaces:
 *   --color-*  --text-*  --leading-*  --font-weight-*  --font-*
 *   --radius-* --shadow-* --spacing-* --breakpoint-*
 * plus our app-specific --icon-size-*.
 *
 * `radius.default` collapses to the bare `--radius` (Tailwind's DEFAULT).
 * Any two-level subgroup's `default` leaf (e.g. `color.sidebar.default`)
 * collapses the same way, to the bare `--color-sidebar` (Tailwind's DEFAULT
 * convention for a token family that also has named sub-tokens).
 *
 * `z-index.*` emits as `--z-index-<name>` (e.g. `--z-index-dropdown`,
 * `--z-index-modal`) — Tailwind v4 derives its `z-*` utilities (`z-dropdown`,
 * `z-modal`, …) from the `--z-index-*` theme namespace specifically; a
 * shortened `--z-*` var is invisible to the utility generator (FIX WAVE C-1,
 * defect A — `z-dropdown` etc. never emitted a rule). The `tailwind/theme`
 * format hook below ALSO emits a `--z-<name>: var(--z-index-<name>)` alias
 * line for every `z-index.*` token, right after its canonical line, so
 * existing direct `var(--z-tooltip)`/`var(--z-modal)` consumers (e.g.
 * `packages/demo-kit/src/console/DemoConsole.tsx`) keep working unchanged.
 */
function themeVarName(path) {
  const [group, ...rest] = path
  if (group === 'radius' && rest.length === 1 && rest[0] === 'default') {
    return '--radius'
  }
  if (group === 'z-index') {
    return `--z-index-${rest.join('-')}`
  }
  if (rest.length === 2 && rest[1] === 'default') {
    return `--${group}-${rest[0]}`
  }
  return `--${path.join('-')}`
}

/** True for any `z-index.*` token — used by the `tailwind/theme` format hook
 *  to also emit the legacy `--z-<name>` alias (see themeVarName doc above). */
function isZIndexToken(token) {
  return token.path[0] === 'z-index'
}

/** Look up a resolved token value by dot-joined DTCG path (e.g. `color.chart.1`). */
function findTokenValue(dictionary, dotPath) {
  const token = dictionary.allTokens.find((t) => t.path.join('.') === dotPath)
  if (!token) return undefined
  return token.$value ?? token.value
}

/** Quote a fontFamily/shadow value if it contains a comma, for safety in CSS. */
function formatValue(token) {
  const v = token.$value ?? token.value
  return typeof v === 'number' ? String(v) : v
}

/** True for any token under the `color.dark.*` group — excluded from normal flat
 *  emission (see `fams/dark-mode` action below, which wires these values to real
 *  selectors instead). */
function isDarkToken(token) {
  return token.path[0] === 'color' && token.path[1] === 'dark'
}

/** ─────────────────────────────────────────────────────────────────────────
 *  Post-build: emit dist/tenants.css from tokens/tenants/*.tokens.json.
 *  Each tenant becomes a `[data-tenant='<name>'] { --color-*: …; }` block
 *  overriding only the semantic vars it declares, so `bg-primary` etc.
 *  re-theme at runtime. Tadweer + IWMP also get the 5-stop sidebar gradient.
 *  ──────────────────────────────────────────────────────────────────────── */
const SIDEBAR_GRADIENT =
  'linear-gradient(149.71deg, rgb(0,114,224) 41.365%, rgb(10,139,196) 11.262%, ' +
  'rgb(25,176,157) 37.477%, rgb(34,199,132) 77.614%, rgb(38,208,124) 101.98%)'
const GRADIENT_TENANTS = new Set(['iwmp'])

/**
 * `<html data-tenant>` is set to the demo-environment's tenant id verbatim
 * (`fams-v5-demo-environment/app/src/boot.ts` — `tenant: runtime.tenant`,
 * the URL `?tenant=` / manifest `id`, with NO indirection). A theme file's
 * name is normally that same id (fams/iwmp/ead/uccp all 1:1). Where a demo
 * tenant's id differs from the DS theme it should render as — e.g. the
 * `uccp` demo tenant resolves 1:1 to `uccp.tokens.json` rather than
 * forking a `uccp.tokens.json` — list it here so its block is ALSO emitted
 * under the demo tenant's own selector, without duplicating the token file.
 */
// No aliases in force. The Qatar MME demo tenant is `uccp`, which resolves
// 1:1 to `uccp.tokens.json` — the alias existed only while that tenant was
// keyed `frms` and had to borrow the identically-valued `qatar-mme` theme,
// which has since been folded into `uccp.tokens.json` and deleted.
const TENANT_ALIASES = {}

function buildTenantsCss() {
  const tenantsDir = join(__dirname, 'tokens', 'tenants')
  const files = readdirSync(tenantsDir)
    .filter((f) => f.endsWith('.tokens.json'))
    .sort()

  const blocks = files.map((file) => {
    const name = file.replace('.tokens.json', '')
    const json = JSON.parse(readFileSync(join(tenantsDir, file), 'utf8'))
    const colors = json.color ?? {}
    const lines = Object.entries(colors).map(
      ([key, tok]) => `  --color-${key}: ${tok.$value ?? tok.value};`,
    )
    if (GRADIENT_TENANTS.has(name)) {
      lines.push(`  --color-sidebar-gradient: ${SIDEBAR_GRADIENT};`)
    }
    // `--shell-rail-bg` — per-tenant override for SideNav's outer app-rail
    // background (packages/ui-kit/src/shells/SideNav.tsx reads it, falling
    // back to --color-primary when unset). Not every tenant needs one (a
    // solid-color rail already "just works" via --color-primary); a tenant
    // file opts in by declaring a top-level `shellRailBg` token (see
    // tokens/tenants/iwmp.tokens.json for the Tadweer gradient).
    const shellRailBg = json.shellRailBg
    if (shellRailBg) {
      lines.push(`  --shell-rail-bg: ${shellRailBg.$value ?? shellRailBg.value};`)
    }
    const selectors = [
      name,
      ...Object.entries(TENANT_ALIASES)
        .filter(([, target]) => target === name)
        .map(([aliasName]) => aliasName),
    ]
    return selectors
      .map((selector) => `[data-tenant='${selector}'] {\n${lines.join('\n')}\n}`)
      .join('\n\n')
  })

  /* ── Dark-scope brand re-assertion (Command Center v2 fix) ─────────────
   * The generic dark block (`darkModeBlock`) is emitted as
   * `:root[data-theme="dark"]` — specificity (0,1,1) — which BEATS every
   * `[data-tenant='X']` block (0,1,0) and silently reverted all tenant
   * BRAND tokens (`--color-primary` et al.) to FAMS blue in dark mode:
   * the "Open-Meteo tab renders blue" leak. Tenants therefore re-assert
   * their brand tokens under dark-scoped selectors of HIGHER specificity
   * (0,2,1, plus the matching media-query variant). Only the brand set is
   * re-asserted — the dark block's surface/text/secondary values are
   * correct for every tenant and must keep winning. A tenant file may
   * dark-adjust any token via an optional top-level `colorDark` group
   * (same shape as `color`), which overrides the light value here. */
  const DARK_BRAND_KEYS = ['primary', 'primary-foreground', 'accent', 'accent-foreground', 'ring']
  const darkBlocks = files
    .map((file) => {
      const name = file.replace('.tokens.json', '')
      const json = JSON.parse(readFileSync(join(tenantsDir, file), 'utf8'))
      const colors = json.color ?? {}
      const colorDark = json.colorDark ?? {}
      const lines = DARK_BRAND_KEYS.filter((key) => colors[key] || colorDark[key]).map((key) => {
        const tok = colorDark[key] ?? colors[key]
        return `  --color-${key}: ${tok.$value ?? tok.value};`
      })
      // Any EXTRA dark-only overrides a tenant declares beyond the brand set.
      for (const [key, tok] of Object.entries(colorDark)) {
        if (DARK_BRAND_KEYS.includes(key) || key.startsWith('$') || key.startsWith('_') || typeof tok !== 'object') continue
        lines.push(`  --color-${key}: ${tok.$value ?? tok.value};`)
      }
      if (lines.length === 0) return ''
      const selectors = [
        name,
        ...Object.entries(TENANT_ALIASES)
          .filter(([, target]) => target === name)
          .map(([aliasName]) => aliasName),
      ]
      const explicit = selectors
        .map((selector) => `:root[data-theme='dark'][data-tenant='${selector}']`)
        .join(',\n')
      const osDefault = selectors
        .map((selector) => `  :root:not([data-theme='light'])[data-tenant='${selector}']`)
        .join(',\n')
      return (
        `${explicit} {\n${lines.join('\n')}\n}\n\n` +
        `@media (prefers-color-scheme: dark) {\n${osDefault} {\n${lines.map((l) => '  ' + l).join('\n')}\n  }\n}`
      )
    })
    .filter(Boolean)

  const header =
    '/* FAMS tenants — runtime semantic overrides. Generated by style-dictionary.config.js. */\n'
  const darkHeader =
    '\n/* FAMS tenants, dark scope — brand tokens re-asserted above the generic dark block. */\n'
  writeFileSync(
    join(__dirname, 'dist', 'tenants.css'),
    header + blocks.join('\n\n') + '\n' + darkHeader + darkBlocks.join('\n\n') + '\n',
  )
}

/** Top-level `color.<group>` names whose light value lives at `color.<group>.default`
 *  (the Tailwind DEFAULT convention — see `themeVarName` above, which collapses this to
 *  the bare `--color-<group>` for theme.css's `tailwind/theme` format). The stock
 *  `css/variables` formatter that emits tokens.css does NOT do that collapsing — it always
 *  full-path-joins, so the light var there is `--fams-color-<group>-default`. A flat
 *  `color.dark.<group>` override (already collapsed in the JSON, matching theme.css's
 *  naming) therefore needs the `-default` suffix restored when targeting tokens.css, or it
 *  silently lands on an unused variable name instead of overriding the light one (this is
 *  the root cause of the pre-existing `color.sidebar` dark-value bug: `dist/tokens.css` got
 *  `--fams-color-sidebar-default` on the light side but `--fams-color-sidebar` on the dark
 *  side). Computed from the JSON so any future `*.default` family is covered automatically —
 *  not a hardcoded `'sidebar'` special case. */
function collapsedDefaultGroups(colorTokens) {
  return new Set(
    Object.entries(colorTokens)
      .filter(([key, val]) => key !== 'dark' && val && typeof val === 'object' && 'default' in val)
      .map(([key]) => key),
  )
}

/** ─────────────────────────────────────────────────────────────────────────
 *  Post-build: wire `color.dark.*` (tokens/core.tokens.json) to real selectors,
 *  appended to the already-written dist/tokens.css + dist/theme.css (decision #2,
 *  ruling ⑤ — Ben's dark values existed but were only ever emitted as inert flat
 *  `--color-dark-*` vars nothing referenced). The normal flat emission of
 *  `color.dark.*` is filtered out at the file level (see `platforms.css`/
 *  `platforms.tailwind` below) — this action is the only place those values
 *  reach the built CSS, and it overrides the SAME variable names the light
 *  values use (e.g. `--color-background` / `--fams-color-background`):
 *    :root[data-theme="dark"] { … }                     — explicit override, always wins
 *    @media (prefers-color-scheme: dark) {
 *      :root:not([data-theme="light"]) { … }             — OS default, unless overridden
 *    }
 *  `defaultGroups` (only needed for tokens.css — see `collapsedDefaultGroups` above) restores
 *  the `-default` suffix for any flat dark key that collapses a Tailwind DEFAULT family, so
 *  the dark override lands on the SAME var name the (uncollapsed) light side used there.
 *  ──────────────────────────────────────────────────────────────────────── */
function darkModeBlock(entries, prefix, defaultGroups = new Set()) {
  const decls = (indent) =>
    entries.map(([key, tok]) => {
      const varKey = defaultGroups.has(key) ? `${key}-default` : key
      return `${indent}--${prefix}color-${varKey}: ${tok.$value ?? tok.value};`
    })
  return (
    `:root[data-theme="dark"] {\n${decls('  ').join('\n')}\n}\n\n` +
    `@media (prefers-color-scheme: dark) {\n` +
    `  :root:not([data-theme="light"]) {\n${decls('    ').join('\n')}\n  }\n` +
    `}\n`
  )
}

function buildDarkModeCss() {
  const core = JSON.parse(readFileSync(join(__dirname, 'tokens', 'core.tokens.json'), 'utf8'))
  const entries = Object.entries(core.color.dark).filter(([key]) => !key.startsWith('$'))
  const defaultGroups = collapsedDefaultGroups(core.color)

  const header = '\n/* FAMS dark mode — generated by style-dictionary.config.js (decision #2). */\n'

  const tokensPath = join(__dirname, 'dist', 'tokens.css')
  writeFileSync(
    tokensPath,
    readFileSync(tokensPath, 'utf8') + header + darkModeBlock(entries, 'fams-', defaultGroups),
  )

  // theme.css's light side (themeVarName, above) already collapses DEFAULT groups to the
  // bare name, matching the already-flat `color.dark.*` keys — no suffix needed here.
  const themePath = join(__dirname, 'dist', 'theme.css')
  writeFileSync(themePath, readFileSync(themePath, 'utf8') + header + darkModeBlock(entries, ''))
}

/** @type {import('style-dictionary').Config} */
export default {
  // Core tokens only — tenant files are handled by the post-build action below.
  source: ['tokens/*.tokens.json'],
  usesDtcg: true,
  log: { verbosity: 'silent' },
  hooks: {
    formats: {
      'tailwind/theme': ({ dictionary }) => {
        const lines = dictionary.allTokens.flatMap((t) => {
          const canonical = `  ${themeVarName(t.path)}: ${formatValue(t)};`
          if (!isZIndexToken(t)) return [canonical]
          // Legacy alias — see themeVarName doc above.
          const name = t.path.slice(1).join('-')
          return [canonical, `  --z-${name}: var(--z-index-${name});`]
        })
        // `static` (Tailwind v4) — emit EVERY custom property in the block,
        // not only the ones a generated utility class happens to reference.
        // Without it Tailwind tree-shakes the unused half of the palette out
        // of the compiled stylesheet, so tokens that exist in the design
        // system are absent from `getComputedStyle(documentElement)` at
        // runtime and every `resolveToken()` call silently falls back.
        return `@theme static {\n${lines.join('\n')}\n}\n`
      },
      /**
       * Emits a valid ECharts theme object (see https://echarts.apache.org/en/theme-builder.html
       * for the shape). Values are read out of the resolved dictionary — never hardcoded —
       * so re-theming `color.chart.*` / `color.chart-heat.*` in tokens/core.tokens.json
       * automatically flows into the emitted chart theme on next build.
       */
      'echarts/theme': ({ dictionary }) => {
        const categorical = ['1', '2', '3', '4', '5'].map((n) =>
          findTokenValue(dictionary, `color.chart.${n}`),
        )
        const heatCool = ['cool-0', 'cool-mid', 'cool-high'].map((k) =>
          findTokenValue(dictionary, `color.chart-heat.${k}`),
        )
        const heatSequential = ['0', 'low', 'mid', 'high'].map((k) =>
          findTokenValue(dictionary, `color.chart-heat.${k}`),
        )
        const theme = {
          color: categorical,
          visualMap: {
            // Sequential cool ramp, low → high, for continuous visualMap components.
            color: heatCool.slice().reverse(),
          },
          heat: {
            // Documented alternate shape: named intensity stops for consumers that
            // want the warm ramp (0/low/mid/high) instead of the cool ramp above.
            sequential: heatSequential,
            cool: heatCool,
          },
        }
        return `${JSON.stringify(theme, null, 2)}\n`
      },
    },
    actions: {
      'fams/tenants': {
        do: () => buildTenantsCss(),
        undo: () => {},
      },
      'fams/dark-mode': {
        do: () => buildDarkModeCss(),
        undo: () => {},
      },
    },
  },
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'fams',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          filter: (token) => !isDarkToken(token),
          options: { outputReferences: true },
        },
      ],
    },
    tailwind: {
      buildPath: 'dist/',
      files: [{ destination: 'theme.css', format: 'tailwind/theme', filter: (token) => !isDarkToken(token) }],
      // 'fams/tenants' reads tokens/tenants/*.tokens.json directly; 'fams/dark-mode' reads
      // tokens/core.tokens.json's color.dark.* and appends to BOTH dist/tokens.css (built by
      // the 'css' platform, which runs before this one) and dist/theme.css (this platform's
      // own file, already written by the time actions run).
      actions: ['fams/tenants', 'fams/dark-mode'],
    },
    echarts: {
      buildPath: 'dist/',
      files: [{ destination: 'theme.echarts.json', format: 'echarts/theme' }],
    },
  },
}
