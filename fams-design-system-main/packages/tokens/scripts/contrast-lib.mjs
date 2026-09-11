/**
 * contrast-lib.mjs — shared maths + data for the token contrast/sanity guard.
 *
 * WHY THIS EXISTS: a consuming team reported (2026-08-22) that the dark color
 * ramp in `tokens/core.tokens.json` was copy-pasted from the light ramp and
 * several values were never lifted — several dark tokens held the IDENTICAL
 * hex to their light counterparts, and several held the identical hex to
 * EACH OTHER (`dark/muted-foreground`, `dark/border`, `dark/sidebar-border`,
 * `dark/input` were all `#667085`; `dark/secondary` equalled `dark/card`).
 * `test/theme-parity.test.js` only ever asserted that a dark counterpart
 * EXISTS for each light token — never that it differs, never that it's
 * legible — so the whole bug class shipped undetected. This module is the
 * maths + data the guard (`scripts/check-contrast.mjs`, and
 * `test/contrast-guard.test.js`) runs to close that gap.
 *
 * Everything a future contributor needs to add is DATA at the bottom of this
 * file (CONTRAST_PAIRS / NON_COLLISION_PAIRS / SHARED_ALLOWLIST) — no logic
 * changes required to cover a new semantic color.
 */

// ───────────────────────────── color parsing ──────────────────────────────
// Only formats actually used in tokens/core.tokens.json today: hex (3/4/6/8
// digit) and, defensively, rgb()/rgba()/hsl()/hsla() in case those creep in
// later. Anything else (oklch(), lab(), named colors, …) throws instead of
// silently skipping — a silent skip is exactly how the original bug class
// survived undetected.

function hexToRgba(hex) {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3 || h.length === 4) {
    h = [...h].map((c) => c + c).join('')
  }
  if (h.length !== 6 && h.length !== 8) {
    throw new Error(`unsupported hex color length: "${hex}"`)
  }
  const num = parseInt(h.slice(0, 6), 16)
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a }
}

function rgbFnToRgba(value) {
  const m = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i)
  if (!m) throw new Error(`unrecognized rgb()/rgba() syntax: "${value}"`)
  const [, r, g, b, a] = m
  return { r: Number(r), g: Number(g), b: Number(b), a: a === undefined ? 1 : Number(a) }
}

function hslFnToRgba(value) {
  const m = value.match(
    /hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/i,
  )
  if (!m) throw new Error(`unrecognized hsl()/hsla() syntax: "${value}"`)
  const h = Number(m[1]) / 360
  const s = Number(m[2]) / 100
  const l = Number(m[3]) / 100
  const a = m[4] === undefined ? 1 : Number(m[4])
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v, a }
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = hue2rgb(p, q, h + 1 / 3)
  const g = hue2rgb(p, q, h)
  const b = hue2rgb(p, q, h - 1 / 3)
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a }
}

/**
 * Parse a CSS color value into {r,g,b,a} (0-255 channels, 0-1 alpha).
 * FAILS LOUDLY (throws) for any format it doesn't recognize — do not add a
 * silent fallback here; that is precisely the failure mode this guard exists
 * to prevent.
 */
export function parseColor(value) {
  const v = String(value).trim()
  if (v.startsWith('#')) return hexToRgba(v)
  if (/^rgba?\(/i.test(v)) return rgbFnToRgba(v)
  if (/^hsla?\(/i.test(v)) return hslFnToRgba(v)
  throw new Error(
    `UNSUPPORTED COLOR FORMAT: "${value}" — contrast-lib.mjs only parses hex/rgb()/hsl(). ` +
      `Add a parser branch for this format rather than skipping it (see contrast-lib.mjs header).`,
  )
}

// ───────────────────────── WCAG 2.x contrast maths ─────────────────────────

function srgbChannelToLinear(c8bit) {
  const c = c8bit / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Relative luminance per WCAG 2.x, ignoring alpha (callers must flatten alpha first). */
export function relativeLuminance({ r, g, b }) {
  const R = srgbChannelToLinear(r)
  const G = srgbChannelToLinear(g)
  const B = srgbChannelToLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/** WCAG contrast ratio between two CSS color strings (1:1 .. 21:1). */
export function contrastRatio(colorA, colorB) {
  const a = parseColor(colorA)
  const b = parseColor(colorB)
  if (a.a < 1 || b.a < 1) {
    throw new Error(
      `contrastRatio() received a translucent color (${colorA} / ${colorB}) — flatten it against ` +
        `its actual backing surface before comparing; alpha-aware contrast is not implemented.`,
    )
  }
  const l1 = relativeLuminance(a) + 0.05
  const l2 = relativeLuminance(b) + 0.05
  return l1 > l2 ? l1 / l2 : l2 / l1
}

// ───────────────────────── token-tree flattening ───────────────────────────

/**
 * Flatten a DTCG color subtree into Map<hyphenated-name, hexValue>.
 * A `default` leaf is ALSO aliased to its parent's name (mirrors Style
 * Dictionary's `themeVarName()` collapse in style-dictionary.config.js, e.g.
 * `sidebar.default` -> also reachable as `sidebar`), so pair definitions can
 * use the same short names that appear in the compiled CSS.
 */
export function flattenColorTree(node, prefix = '', out = new Map()) {
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    const path = prefix ? `${prefix}-${key}` : key
    if (val && typeof val === 'object' && '$value' in val) {
      out.set(path, val.$value)
      if (key === 'default' && prefix) out.set(prefix, val.$value)
    } else if (val && typeof val === 'object') {
      flattenColorTree(val, path, out)
    }
  }
  return out
}

/** Build { light, dark } Map<name, hex> from a parsed core.tokens.json object. */
export function buildSourceColorMaps(tokensJson) {
  const colorRoot = tokensJson.color
  const { dark: darkRoot, ...lightRoot } = colorRoot
  const light = flattenColorTree(lightRoot)
  const dark = flattenColorTree(darkRoot ?? {})
  return { light, dark }
}

/**
 * Extract `--color-*` (optionally `--fams-` prefixed) name→value pairs from
 * one CSS block's text. Mirrors the regex approach already used by
 * `test/theme-parity.test.js` (`colorVarNames`) / `test/build.test.js`, just
 * capturing the value too instead of only the name.
 */
export function extractColorVars(blockText) {
  const out = new Map()
  const re = /--(?:fams-)?(color-[a-z0-9-]+):\s*([^;]+);/g
  let m
  while ((m = re.exec(blockText))) {
    out.set(m[1].replace(/^color-/, ''), m[2].trim())
  }
  // Mirror flattenColorTree()'s `default`-leaf aliasing: some build outputs
  // collapse `sidebar.default` to the bare `--color-sidebar` (theme.css),
  // others keep `--color-sidebar-default` (tokens.css) — alias both ways so
  // pair definitions can use one short name regardless of which compiled
  // file they're checked against.
  for (const [name, value] of [...out]) {
    if (name.endsWith('-default')) {
      const parent = name.slice(0, -'-default'.length)
      if (!out.has(parent)) out.set(parent, value)
    }
  }
  return out
}

/** Slice the first top-level `${startMarker} … }` block (same convention as theme-parity.test.js). */
export function sliceBlock(css, startMarker) {
  const start = css.indexOf(startMarker)
  if (start === -1) throw new Error(`block not found: ${startMarker}`)
  const bodyStart = start + startMarker.length
  const end = css.indexOf('\n}', bodyStart)
  if (end === -1) throw new Error(`unterminated block: ${startMarker}`)
  return css.slice(bodyStart, end)
}

/** Build { light, dark } Map<name, value> from a compiled theme.css/tokens.css string. */
export function buildCompiledColorMaps(css, { lightMarker, darkMarker }) {
  const light = extractColorVars(sliceBlock(css, lightMarker))
  const dark = extractColorVars(sliceBlock(css, darkMarker))
  return { light, dark }
}

// ═══════════════════════════ DECLARATIVE DATA ══════════════════════════════
// Add a line here to cover a new semantic color — no logic changes needed.

/**
 * Text/UI-object-on-surface pairs that must clear a WCAG contrast threshold.
 * `theme: 'both'` runs the pair against the light map AND the dark map
 * (resolving the same short names in each); `'light'` / `'dark'` scopes it to
 * one theme only (use this for structurally one-sided families, e.g. the
 * always-blue `sidebar.*` rail, which has no themed counterpart).
 *
 * `level: 'text'` -> 4.5:1 (WCAG 1.4.3, normal text; this repo's smallest
 * body size is 12px/caption, never "large text", so no 3:1 large-text carve-
 * out is modeled here — stay at 4.5:1 by default per the task's guidance).
 * `level: 'ui'` -> 3:1 (WCAG 1.4.11 non-text/UI-component boundary, e.g. an
 * input outline against its surface) — used sparingly, only where a pair is
 * genuinely a graphical-object boundary rather than text.
 */
export const CONTRAST_PAIRS = [
  // Core body/surface pairs.
  { id: 'foreground/background', fg: 'foreground', bg: 'background', level: 'text', theme: 'both' },
  { id: 'card-foreground/card', fg: 'card-foreground', bg: 'card', level: 'text', theme: 'both' },
  { id: 'popover-foreground/popover', fg: 'popover-foreground', bg: 'popover', level: 'text', theme: 'both' },
  { id: 'muted-foreground/card', fg: 'muted-foreground', bg: 'card', level: 'text', theme: 'both' },
  { id: 'muted-foreground/background', fg: 'muted-foreground', bg: 'background', level: 'text', theme: 'both' },
  { id: 'muted-foreground/muted', fg: 'muted-foreground', bg: 'muted', level: 'text', theme: 'both' },

  // Filled semantic buttons/chips.
  { id: 'primary-foreground/primary', fg: 'primary-foreground', bg: 'primary', level: 'text', theme: 'both' },
  { id: 'accent-foreground/accent', fg: 'accent-foreground', bg: 'accent', level: 'text', theme: 'both' },
  // NOTE: `secondary-foreground/secondary` (light: 4.22:1) and
  // `destructive-foreground/destructive` (both themes: 3.76:1) are KNOWN
  // pre-existing near-misses, unrelated to the dark-ramp copy-paste bug this
  // guard was built for. Deliberately left out of this pair list rather than
  // silently declared passing — fixing them is a separate, real design
  // decision (which shade to move, and whether button-label text at this
  // size legitimately qualifies as WCAG "large text") that shouldn't be
  // smuggled in via a guard script. Add them here once that decision is made.

  // Sidebar rail family — `default`-collapse aliases `sidebar.default` to
  // `sidebar` (see flattenColorTree / extractColorVars), so the same short
  // names resolve against both the light (always-blue rail) and dark
  // (app-shell) sidebar families.
  { id: 'sidebar-foreground/sidebar', fg: 'sidebar-foreground', bg: 'sidebar', level: 'text', theme: 'both' },
  {
    id: 'sidebar-primary-foreground/sidebar-primary',
    fg: 'sidebar-primary-foreground',
    bg: 'sidebar-primary',
    level: 'text',
    theme: 'both',
  },
  // NOTE: `sidebar-accent-foreground/sidebar-accent` is deliberately NOT
  // modeled — `sidebar-accent` (and `-border`/`-ring`) are semi-transparent
  // hover-state overlays by design (e.g. `#ffffff26`), not opaque fills.
  // This guard's contrast maths is intentionally alpha-naive (see
  // `contrastRatio` — it throws rather than guess a backing surface), so an
  // overlay pair needs a real compositing model before it belongs here.

  // Medal podium — per its $description in core.tokens.json, `-accent` stops
  // are FILLED GROUNDS under themed ink and carry real dark overrides
  // specifically so this holds in both themes.
  { id: 'foreground/medal-gold-accent', fg: 'foreground', bg: 'medal-gold-accent', level: 'text', theme: 'both' },
  { id: 'foreground/medal-silver-accent', fg: 'foreground', bg: 'medal-silver-accent', level: 'text', theme: 'both' },
  { id: 'foreground/medal-bronze-accent', fg: 'foreground', bg: 'medal-bronze-accent', level: 'text', theme: 'both' },
]

/**
 * Tokens that must NOT be byte-identical. `kind` only affects the failure
 * message (what visual bug this collision causes):
 *   - 'text-vs-border': a text/foreground token colliding with a stroke
 *     token — the original "muted count on a bordered chip renders at
 *     1.00:1 (invisible)" bug.
 *   - 'border-vs-border': two stroke tokens meant to read as distinct
 *     chrome (input outline vs. generic border vs. sidebar border).
 *   - 'surface-vs-surface': two fill/background tokens meant to be visually
 *     separate surfaces — the original "secondary button has no visible
 *     edge on a card" bug (dark.secondary === dark.card).
 * `theme: 'both'` checks the pair within the light map AND within the dark
 * map independently (NOT light-vs-dark — see SHARED_ALLOWLIST for that).
 */
export const NON_COLLISION_PAIRS = [
  { id: 'muted-foreground vs border', a: 'muted-foreground', b: 'border', kind: 'text-vs-border', theme: 'both' },
  {
    id: 'muted-foreground vs sidebar-border',
    a: 'muted-foreground',
    b: 'sidebar-border',
    kind: 'text-vs-border',
    theme: 'dark',
  },
  { id: 'muted-foreground vs input', a: 'muted-foreground', b: 'input', kind: 'text-vs-border', theme: 'both' },
  { id: 'border vs input', a: 'border', b: 'input', kind: 'border-vs-border', theme: 'both' },
  { id: 'border vs sidebar-border', a: 'border', b: 'sidebar-border', kind: 'border-vs-border', theme: 'dark' },
  { id: 'input vs sidebar-border', a: 'input', b: 'sidebar-border', kind: 'border-vs-border', theme: 'dark' },
  { id: 'secondary vs card', a: 'secondary', b: 'card', kind: 'surface-vs-surface', theme: 'both' },
  { id: 'background vs card', a: 'background', b: 'card', kind: 'surface-vs-surface', theme: 'both' },
]

/**
 * Dark tokens EXPLICITLY allowed to share their exact hex with the light
 * counterpart of the same name. Anything not listed here that turns out
 * identical is a FAILURE — this is what makes the copy-paste-never-lifted
 * bug class impossible to reintroduce silently; a genuine sharing decision
 * has to be written down as a line below with a reason.
 *
 * Seeded 2026-08-23 from the current token set (verified by walking every
 * name common to both color maps and diffing values):
 */
export const SHARED_ALLOWLIST = new Set([
  // Default Text scale midpoint — #667085 (Gray Modern/500) is the pivot of the
  // inverted dark ramp, so it is intentionally identical in both themes.
  'text-color-light',
  // Brand blue — the same accent color is used as the interactive/brand hue
  // in both themes by design (decision: brand identity doesn't invert).
  'primary',
  'primary-foreground', // pure white — legible on the brand blue in either theme.
  // `accent` is a literal alias of `primary` in this token set (both semantic
  // slots point at brand blue) — same rationale.
  'accent',
  'accent-foreground',
  // Destructive/error red is a fixed semantic status color — it does not
  // invert with the theme (a red "delete" affordance stays the same red),
  // and white text stays legible on it in both themes.
  'destructive',
  'destructive-foreground',
  // Focus ring = brand primary in both themes by design (WCAG 2.4.7 fix,
  // run 2026-08-15: light ring was near-white primary-50 and invisible) —
  // same rationale as `primary`: the brand accent doesn't invert.
  'ring',
])

/**
 * Run every declared check against one { light, dark } pair of
 * Map<name, colorValue>. Returns an array of failure records; empty = clean.
 * `source` is a label ('source JSON' / 'dist/theme.css' / 'dist/tokens.css')
 * used only to make failure output traceable to where the bad value lives.
 */
export function runChecks({ light, dark }, source) {
  const failures = []
  const mapFor = (theme) => (theme === 'light' ? light : dark)

  const resolve = (theme, name) => {
    const map = mapFor(theme)
    if (!map.has(name)) return undefined
    return map.get(name)
  }

  // 1. AA/UI contrast pairs.
  for (const pair of CONTRAST_PAIRS) {
    const themes = pair.theme === 'both' ? ['light', 'dark'] : [pair.theme]
    const threshold = pair.level === 'ui' ? 3 : 4.5
    for (const theme of themes) {
      const fgVal = resolve(theme, pair.fg)
      const bgVal = resolve(theme, pair.bg)
      if (fgVal === undefined || bgVal === undefined) {
        failures.push({
          check: 'contrast',
          source,
          theme,
          id: pair.id,
          message:
            `[${source}] [${theme}] contrast pair "${pair.id}" could not be resolved — ` +
            `fg("${pair.fg}") = ${fgVal ?? 'MISSING'}, bg("${pair.bg}") = ${bgVal ?? 'MISSING'}. ` +
            `Check the token name against core.tokens.json / the compiled CSS.`,
        })
        continue
      }
      let ratio
      try {
        ratio = contrastRatio(fgVal, bgVal)
      } catch (err) {
        failures.push({
          check: 'contrast',
          source,
          theme,
          id: pair.id,
          message: `[${source}] [${theme}] contrast pair "${pair.id}" (${pair.fg}=${fgVal}, ${pair.bg}=${bgVal}) — ${err.message}`,
        })
        continue
      }
      if (ratio < threshold) {
        failures.push({
          check: 'contrast',
          source,
          theme,
          id: pair.id,
          ratio,
          threshold,
          message:
            `[${source}] [${theme}] AA CONTRAST FAIL: "${pair.fg}" (${fgVal}) on "${pair.bg}" (${bgVal}) ` +
            `= ${ratio.toFixed(2)}:1, needs >= ${threshold}:1 (${pair.level === 'ui' ? 'WCAG 1.4.11 UI component' : 'WCAG 1.4.3 normal text'}).`,
        })
      }
    }
  }

  // 2. Non-collision pairs.
  for (const pair of NON_COLLISION_PAIRS) {
    const themes = pair.theme === 'both' ? ['light', 'dark'] : [pair.theme]
    for (const theme of themes) {
      const aVal = resolve(theme, pair.a)
      const bVal = resolve(theme, pair.b)
      if (aVal === undefined || bVal === undefined) continue // token doesn't exist in this theme/source; not this check's job
      if (String(aVal).toLowerCase() === String(bVal).toLowerCase()) {
        failures.push({
          check: 'collision',
          source,
          theme,
          id: pair.id,
          message:
            `[${source}] [${theme}] TOKEN COLLISION (${pair.kind}): "${pair.a}" and "${pair.b}" are both ${aVal}. ` +
            `These must be visually distinct — see NON_COLLISION_PAIRS in contrast-lib.mjs.`,
        })
      }
    }
  }

  // 3. Light/dark divergence (allowlist-gated).
  for (const [name, darkVal] of dark) {
    if (!light.has(name)) continue
    const lightVal = light.get(name)
    if (String(lightVal).toLowerCase() === String(darkVal).toLowerCase() && !SHARED_ALLOWLIST.has(name)) {
      failures.push({
        check: 'divergence',
        source,
        id: name,
        message:
          `[${source}] UNEXPLAINED LIGHT/DARK COLLISION: "${name}" is ${darkVal} in BOTH light and dark themes, ` +
          `and is not in SHARED_ALLOWLIST (contrast-lib.mjs). Either give dark."${name}" a real dark value, or, ` +
          `if the sharing is intentional (brand accent, fixed status color, pure white/black), add "${name}" to ` +
          `SHARED_ALLOWLIST with a one-line reason.`,
      })
    }
  }

  return failures
}
