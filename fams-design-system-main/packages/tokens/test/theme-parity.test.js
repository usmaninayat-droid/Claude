import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { contrastRatio } from '../scripts/contrast-lib.mjs'

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')
const readJson = (p) => JSON.parse(read(p))

/**
 * ─────────────────────────────────────────────────────────────────────────
 * THEME_NEUTRAL — the design-decision record for dark-mode parity.
 *
 * `style-dictionary.config.js`'s `fams/dark-mode` action hand-names the
 * `color.dark.*` overrides to match a subset of the light-side `--color-*`
 * vars (decision #2, ruling ⑤). Nothing tied the two sides together with a
 * completeness assertion, so a light color token could silently gain no dark
 * counterpart (or a dark override could silently stop matching any light
 * var) with no test failure. This file IS that assertion, and the two lists
 * below ARE the reviewed record of which light color tokens are intentionally
 * theme-neutral (raw/primitive palettes) vs. which still need a real dark
 * value but don't have one yet (marked `TODO: probable gap`).
 *
 * Treat an addition here with the SAME care as adding/changing a token: every
 * entry needs a one-line justification, and `TODO: probable gap` entries are
 * a known debt, not a design decision — do not copy them as a template for
 * new neutral-by-default tokens.
 *
 * "One-line justification" means one justification per entry, not one
 * physical source line — a comment wrapped across a few lines for
 * readability is still a single justification and is fine; what's not fine
 * is stacking multiple distinct reasons or unrelated caveats onto one entry.
 * ─────────────────────────────────────────────────────────────────────────
 */

// Prefix matches — whole token FAMILIES judged theme-neutral as a group.
// Names are normalized (see `colorVarNames` below): the `fams-` build prefix
// is stripped, so these match both dist/tokens.css and dist/theme.css.
const THEME_NEUTRAL_PREFIXES = [
  // Wall-display surface (Command Center and any future dark module). This
  // scope is an ALWAYS-DARK canvas, not a dark-mode variant of a light
  // screen — it hangs on an operations-room wall, so it must render the
  // same whatever `data-theme` says; giving it dark overrides would make it
  // flip, which is precisely the bug this scope exists to prevent.
  'color-wall-',
  // Raw brand ramp (0072d6 family). Semantic slots that alias into it
  // (primary, accent, ring, …) carry the dark override; the ramp itself
  // doesn't invert between themes.
  'color-brand-',
  // Raw neutral gray ramp — same rationale as brand: it's the reference
  // scale other semantic tokens (background/foreground/border/…) are built
  // from, not a themed slot itself.
  'color-gray-',
  // Raw error/red ramp — distinct from the singleton `destructive` semantic
  // slot (which DOES have a dark override); this is the underlying palette.
  'color-error-',
  // Raw warning ramp — the palette `warning-scale.500` etc. draw from.
  // (The singleton `warning` alias is flagged separately below — it is NOT
  // covered by this prefix and IS a probable gap.)
  'color-warning-scale-',
  // Raw success ramp — same rationale as warning-scale.
  'color-success-scale-',
  // Raw info ramp — same rationale as warning-scale; also backs `chart`/`brand`.
  'color-info-scale-',
  // Chart categorical palette (chart.1..5) — data-viz series colors are kept
  // fixed across themes so legends/screenshots stay recognizable.
  'color-chart-1',
  'color-chart-2',
  'color-chart-3',
  'color-chart-4',
  'color-chart-5',
  // Chart 10-stop categorical series ramp — same data-viz-consistency rationale.
  'color-chart-series-',
  // Chart named accent picks (purple/orange/green/…) — same rationale.
  'color-chart-accent-',
  // Chart heatmap ramp (cool + sequential stops) — same rationale.
  'color-chart-heat-',
  // Extended named hue families (cyan, azure, gray-blue, lavender, plum, pink,
  // rose, lime, aqua-green, flame, yellow, bronze) used for tags/avatars/data-
  // viz accents. Each has its own lightest→darkest intensity ramp; "dark"/
  // "darkest" here are ramp STEPS, not the app dark THEME — a fixed picker
  // palette, not a themed semantic slot.
  'color-accent-family-',
  // Alpha overlay/scrim primitives (white/black/brand at 20/40/60%) — opacity
  // utilities composited over whatever surface is active in either theme,
  // not surface colors themselves.
  'color-overlay-',
]

// Exact matches — single tokens, judged individually.
const THEME_NEUTRAL_EXACT = new Set([
  // Ordinal podium decoration, BORDER stops only. A stroke may legitimately be
  // theme-neutral — 1st/2nd/3rd should read as the same three metals in either
  // theme. The `-surface`/`-accent` stops are NOT here and must never be
  // re-added: they are filled grounds under themed ink (`text-foreground`), and
  // the light tints measured 1.00-1.26:1 in dark mode. They carry real dark
  // values in `color.dark.medal-*`.
  'color-medal-gold-border',
  'color-medal-silver-border',
  'color-medal-bronze-border',
  // TODO: probable gap. `color.success` is a singleton semantic slot (alias
  // of success-scale.500) sitting alongside primary/destructive — which DO
  // carry an explicit dark override, even where the value is unchanged. No
  // dark value exists for success/warning/info at all; this looks like an
  // oversight in the original `.dark` port (see docs/token-reconciliation.md
  // ruling ⑤), not a deliberate neutrality decision.
  'color-success',
  // TODO: probable gap. Same reasoning as color-success above.
  'color-warning',
  // TODO: probable gap. Same reasoning as color-success above (also aliases
  // info-scale.500 = brand.500 = primary, so a dark value likely already
  // exists in spirit as `color.dark.primary` — just not wired to this slot).
  'color-info',
  // TODO: probable gap. Same reasoning as color-surface-primary (a
  // primary-tinted selection surface; needs a designed dark tint, not a
  // luminance guess — the other three surface slots gained real dark
  // overrides in the 2026-08-25 login-contrast fix).
  'color-surface-secondary',
  // NOTE: color-sidebar-default / color-sidebar (the paired light/dark-only
  // orphans from the tokens.css dark-mode naming bug — see Task A3) are
  // deliberately NOT here: that was a naming bug in `buildDarkModeCss`, now
  // fixed in style-dictionary.config.js, not a theme-neutral design decision.
  // Do not re-add them; if this test starts failing on either name, the fix
  // regressed.
])

function isThemeNeutral(name) {
  if (THEME_NEUTRAL_EXACT.has(name)) return true
  return THEME_NEUTRAL_PREFIXES.some((prefix) => name.startsWith(prefix))
}

/**
 * Pull the `--color-*` (or `--fams-color-*`) var names declared directly
 * inside one CSS block, normalizing away the optional `fams-` build prefix
 * so tokens.css and theme.css produce directly-comparable identifiers.
 */
function colorVarNames(block) {
  const names = [...block.matchAll(/--(?:fams-)?(color-[a-z0-9-]+):/g)].map((m) => m[1])
  return new Set(names)
}

/** Slice the first top-level occurrence of `${startMarker} … }` (marker-to-newline-brace). */
function sliceBlock(css, startMarker) {
  const start = css.indexOf(startMarker)
  if (start === -1) throw new Error(`block not found: ${startMarker}`)
  const bodyStart = start + startMarker.length
  const end = css.indexOf('\n}', bodyStart)
  if (end === -1) throw new Error(`unterminated block: ${startMarker}`)
  return css.slice(bodyStart, end)
}

/**
 * Assert light/dark `--color-*` parity for one built CSS file: every
 * themable light color token has a dark counterpart, and every dark
 * override corresponds to an existing light token — set equality in both
 * directions, modulo THEME_NEUTRAL above. Returns the two diff sets so
 * callers can run additional checks (e.g. allowlist staleness).
 */
function assertColorParity({ light, dark }) {
  const lightOnly = [...light].filter((name) => !dark.has(name))
  const darkOnly = [...dark].filter((name) => !light.has(name))

  const unexplainedLightOnly = lightOnly.filter((name) => !isThemeNeutral(name))
  const unexplainedDarkOnly = darkOnly.filter((name) => !isThemeNeutral(name))

  expect(
    unexplainedLightOnly,
    'light color tokens with no dark counterpart and no THEME_NEUTRAL entry — ' +
      'add a dark value in core.tokens.json OR add a justified THEME_NEUTRAL entry',
  ).toEqual([])
  expect(
    unexplainedDarkOnly,
    'dark color overrides with no matching light token and no THEME_NEUTRAL entry — ' +
      'check for a typo/rename in core.tokens.json color.dark.*',
  ).toEqual([])

  return { lightOnly, darkOnly }
}

describe('@fams/tokens dark-value parity (design-decision allowlist, see THEME_NEUTRAL above)', () => {
  it('dist/tokens.css: every non-neutral light color var has a dark override and vice versa', () => {
    const css = read('../dist/tokens.css')
    const light = colorVarNames(sliceBlock(css, ':root {'))
    const dark = colorVarNames(sliceBlock(css, ':root[data-theme="dark"] {'))

    // Sanity: guard against a broken slice/regex silently producing empty sets.
    expect(light.size).toBeGreaterThan(50)
    expect(dark.size).toBeGreaterThan(20)
    expect(light.has('color-background')).toBe(true)
    expect(dark.has('color-background')).toBe(true)

    const { lightOnly, darkOnly } = assertColorParity({ light, dark })

    // Staleness guard: every THEME_NEUTRAL_EXACT entry must still be needed
    // by *this* (the authoritative, tokens.css) diff. If a `TODO: probable
    // gap` gets fixed — a real dark value added — and the entry isn't
    // removed, this fails loudly instead of letting the allowlist rot into
    // silently hiding a *different*, future gap that happens to reuse the
    // name.
    const stillNeeded = new Set([...lightOnly, ...darkOnly])
    const staleExact = [...THEME_NEUTRAL_EXACT].filter((name) => !stillNeeded.has(name))
    expect(staleExact, 'THEME_NEUTRAL_EXACT entries no longer needed — remove them').toEqual([])
  })

  it('dist/theme.css: same parity holds for the Tailwind @theme output (unprefixed --color-*)', () => {
    const css = read('../dist/theme.css')
    const light = colorVarNames(sliceBlock(css, '@theme static {'))
    const dark = colorVarNames(sliceBlock(css, ':root[data-theme="dark"] {'))

    expect(light.size).toBeGreaterThan(50)
    expect(dark.size).toBeGreaterThan(20)
    expect(light.has('color-background')).toBe(true)
    expect(dark.has('color-background')).toBe(true)

    // No staleness guard here (unlike the tokens.css test above) — this file's
    // allowlist is already validated against tokens.css's more exhaustive diff.
    assertColorParity({ light, dark })
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * D-6 (filters SPEC I.80) — `color.success-text` / `color.error-text` tenant
 * parity + WCAG 4.5:1 text contrast.
 *
 * These two role tokens exist specifically because the raw brand green
 * (`#22c882` / `#12b76a`) fails as TEXT (2.18:1 / 2.62:1 on white) — see
 * qa/UX-NOTES-filters.md #80. `core.tokens.json`'s light values are DTCG
 * alias strings (`{color.<path>}`); `resolveCoreAlias` below does the one
 * level of lookup needed to turn those into literal hex for the contrast
 * maths (style-dictionary itself resolves this at build time — see
 * dist/theme.css — this just mirrors that against SOURCE so the test does
 * not depend on a build having already run). `color.dark.*` and every
 * tenant file store LITERAL hex for both tokens by convention (see each
 * file's $description) — `buildDarkModeCss`/`buildTenantsCss` in
 * style-dictionary.config.js read those raw off the JSON with no reference
 * resolution, so an alias there would ship as broken CSS.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('D-6: color.success-text / color.error-text — tenant parity + WCAG contrast', () => {
  const TOKEN_KEYS = ['success-text', 'error-text']
  const MIN_TEXT_CONTRAST = 4.5

  /** Resolve one level of `{color.a.b.c}` alias syntax against the core color tree. */
  function resolveCoreAlias(colorRoot, rawValue) {
    const m = typeof rawValue === 'string' && rawValue.match(/^\{color\.([^}]+)\}$/)
    if (!m) return rawValue
    let node = colorRoot
    for (const key of m[1].split('.')) {
      expect(node, `alias "${rawValue}" — no such path segment "${key}"`).toBeTruthy()
      node = node[key]
    }
    expect(node, `alias "${rawValue}" did not resolve to a token`).toBeTruthy()
    return node.$value
  }

  const core = readJson('../tokens/core.tokens.json')
  const coreColor = core.color

  const coreLight = {
    card: coreColor.card.$value,
    background: coreColor.background.$value,
    'success-text': resolveCoreAlias(coreColor, coreColor['success-text'].$value),
    'error-text': resolveCoreAlias(coreColor, coreColor['error-text'].$value),
  }
  const coreDark = {
    card: coreColor.dark.card.$value,
    background: coreColor.dark.background.$value,
    'success-text': coreColor.dark['success-text'].$value,
    'error-text': coreColor.dark['error-text'].$value,
  }

  it('core: both tokens are defined at the color.* and color.dark.* layers', () => {
    for (const key of TOKEN_KEYS) {
      expect(coreColor[key], `color.${key} is missing`).toBeTruthy()
      expect(coreColor.dark[key], `color.dark.${key} is missing`).toBeTruthy()
    }
  })

  it.each(TOKEN_KEYS)('core light: %s clears 4.5:1 against card and background', (key) => {
    expect(contrastRatio(coreLight[key], coreLight.card)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(contrastRatio(coreLight[key], coreLight.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it.each(TOKEN_KEYS)('core dark: %s clears 4.5:1 against dark card and dark background', (key) => {
    expect(contrastRatio(coreDark[key], coreDark.card)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(contrastRatio(coreDark[key], coreDark.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  const tenantsDir = fileURLToPath(new URL('../tokens/tenants/', import.meta.url))
  const tenantFiles = readdirSync(tenantsDir).filter((f) => f.endsWith('.tokens.json')).sort()

  // Sanity: guard against a broken glob/path silently testing zero tenants.
  it('at least the four known tenants are present to test', () => {
    expect(tenantFiles.length).toBeGreaterThanOrEqual(4)
  })

  describe.each(tenantFiles)('tenant: %s', (file) => {
    const tenant = readJson(`../tokens/tenants/${file}`)
    const tenantColor = tenant.color ?? {}
    // Neither tenant file overrides card/background today — fall back to the
    // core (light-only; tenant files carry no dark section) surface, same as
    // what actually renders at runtime (tenant CSS only overrides the vars it
    // declares — see buildTenantsCss in style-dictionary.config.js).
    const surface = {
      card: tenantColor.card?.$value ?? coreLight.card,
      background: tenantColor.background?.$value ?? coreLight.background,
    }

    it.each(TOKEN_KEYS)('defines an explicit color.%s override slot', (key) => {
      expect(tenantColor[key], `${file}: color.${key} is missing an explicit override slot`).toBeTruthy()
    })

    it.each(TOKEN_KEYS)('%s clears 4.5:1 against this tenant\'s card and background', (key) => {
      const value = tenantColor[key]?.$value
      expect(value, `${file}: color.${key}.$value is missing`).toBeTruthy()
      expect(contrastRatio(value, surface.card)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(contrastRatio(value, surface.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    })
  })
})
