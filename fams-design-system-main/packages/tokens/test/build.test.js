import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')

describe('@fams/tokens build output', () => {
  it('theme.css exposes a valid Tailwind @theme block with the semantic + scale tokens', () => {
    const css = read('../dist/theme.css')
    expect(css).toContain('@theme')
    // brand primary (case-insensitive — emitted lowercase)
    expect(css.toLowerCase()).toContain('--color-primary: #0072d6')
    // radius.md must survive (Tailwind rounded-md utility) — Figma Design System V2 scale
    expect(css).toContain('--radius-md: 6px')
    // full scale: none/xs/sm/md/full (Figma Design System V2)
    expect(css).toContain('--radius-none: 0px')
    expect(css).toContain('--radius-xs: 2px')
    expect(css).toContain('--radius-sm: 4px')
    expect(css).toContain('--radius-full: 999px')
    // type scale + line-heights + weights wired to Tailwind v4 namespaces
    expect(css).toContain('--text-h1: 48px')
    expect(css).toContain('--leading-h1: 56px')
    expect(css).toContain('--font-weight-bold: 700')
    // shadow ladder + elevation (dropdown/popover surfaces), spacing, breakpoints, icon sizes
    expect(css).toContain('--shadow-sm:')
    expect(css).toContain('--shadow-elevation:')
    // form-control fill surface (bg-input-background) + surface scale
    expect(css).toContain('--color-input-background: #ffffff')
    expect(css).toContain('--color-surface-primary: #ffffff')
    expect(css).toContain('--spacing-4: 16px')
    expect(css).toContain('--breakpoint-md: 768px')
    expect(css).toContain('--icon-size-md: 24px')
    // chart palette
    expect(css).toContain('--color-chart-1: #f79009')
    // font default = Gilroy (brand font), with Inter + system + -apple-system fallbacks
    expect(css).toContain('--font-sans: Gilroy, Inter, system-ui, -apple-system, sans-serif')
    // motion — durations + easing curves
    expect(css).toContain('--duration-fast: 150ms')
    expect(css).toContain('--duration-normal: 200ms')
    expect(css).toContain('--duration-slow: 300ms')
    expect(css).toContain('--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)')
    expect(css).toContain('--ease-emphasized:')
    // semantic z-index scale — emitted BOTH as --z-index-* (Tailwind v4's z-*
    // utility namespace — FIX WAVE C-1 defect A: `--z-*` alone never generated
    // a `.z-dropdown` utility) AND aliased to legacy --z-* for direct
    // var(--z-…) consumers (see the dedicated describe block below for the
    // full parse-and-assert coverage across all six+ semantic names).
    expect(css).toContain('--z-index-base: 0')
    expect(css).toContain('--z-index-modal: 1400')
    expect(css).toContain('--z-index-tooltip: 1700')
    expect(css).toContain('--z-base: var(--z-index-base)')
    expect(css).toContain('--z-modal: var(--z-index-modal)')
    expect(css).toContain('--z-tooltip: var(--z-index-tooltip)')
  })

  it('tokens.css exposes prefixed CSS variables (:root --fams-*)', () => {
    const css = read('../dist/tokens.css')
    expect(css).toContain('--fams-color-primary')
    expect(css).toContain('--fams-radius-md')
  })

  it('tenants.css emits a [data-tenant] block per tenant overriding semantic vars', () => {
    const css = read('../dist/tenants.css')
    // four real tenant presets (matching v1 public/presets/*) — decision #2 ruling ⑦
    // (uccp is a Ben-only addition vs Shaheer's 3 tenants; kept)
    for (const t of ['fams', 'iwmp', 'ead', 'uccp', 'dmt']) {
      expect(css).toContain(`[data-tenant='${t}']`)
    }
    // iwmp (Tadweer) green re-themes bg-primary at runtime
    expect(css).toMatch(/\[data-tenant='iwmp'\]\s*\{[^}]*--color-primary:\s*#22c882/i)
    // iwmp 5-stop diagonal sidebar-rail gradient (Pattern #47)
    expect(css).toMatch(/\[data-tenant='iwmp'\]\s*\{[^}]*--color-sidebar-gradient:\s*linear-gradient\(/i)
    expect(css).toContain('rgb(34,199,132)')
    // ead navy primary + accent = primary (#004B87) + navy chart-1 override
    expect(css).toMatch(/\[data-tenant='ead'\]\s*\{[^}]*--color-primary:\s*#004B87/i)
    expect(css).toMatch(/\[data-tenant='ead'\]\s*\{[^}]*--color-accent:\s*#004B87/i)
    expect(css).toMatch(/\[data-tenant='ead'\]\s*\{[^}]*--color-chart-1:\s*#004B87/i)
    // uccp (MM Qatar) maroon
    expect(css).toMatch(/\[data-tenant='uccp'\]\s*\{[^}]*--color-primary:\s*#6E112D/i)
  })

  it('caption is 12px font / 14px line-height everywhere, no stray 10px caption (decision #2, T-072)', () => {
    const theme = read('../dist/theme.css')
    const tokens = read('../dist/tokens.css')
    expect(theme).toContain('--text-caption: 12px')
    expect(theme).toContain('--leading-caption: 14px')
    expect(tokens).toContain('--fams-text-caption: 12px')
    expect(tokens).toContain('--fams-leading-caption: 14px')
    // no leftover 10px caption value anywhere in the built output
    expect(theme).not.toMatch(/--text-caption:\s*10px/)
    expect(theme).not.toMatch(/--leading-caption:\s*10px/)
    expect(tokens).not.toMatch(/--fams-text-caption:\s*10px/)
    expect(tokens).not.toMatch(/--fams-leading-caption:\s*10px/)
  })

  it('dark mode is wired to real selectors, not just inert flat vars (decision #2, ruling ⑤)', () => {
    const theme = read('../dist/theme.css')
    const tokens = read('../dist/tokens.css')

    for (const css of [theme, tokens]) {
      expect(css).toContain(':root[data-theme="dark"]')
      expect(css).toContain('@media (prefers-color-scheme: dark)')
      expect(css).toContain(':root:not([data-theme="light"])')
    }
    // sampled values inside the explicit override selector (unprefixed theme.css)
    expect(theme).toMatch(/:root\[data-theme="dark"\]\s*\{[^}]*--color-background:\s*#101828/)
    expect(theme).toMatch(/:root\[data-theme="dark"\]\s*\{[^}]*--color-sidebar:\s*#101828/)
    // sampled values inside the prefixed tokens.css override
    expect(tokens).toMatch(/:root\[data-theme="dark"\]\s*\{[^}]*--fams-color-foreground:\s*#f9fafb/)
    // the old inert flat namespace must be gone now that values are wired to selectors
    expect(theme).not.toContain('--color-dark-background')
    expect(tokens).not.toContain('--fams-color-dark-background')
  })

  it('z-index scale emits both --z-index-<name> (Tailwind z-* utility namespace) and a --z-<name> alias, for every semantic name, in ascending stacking order (FIX WAVE C-1, defect A)', () => {
    const css = read('../dist/theme.css')

    // Parse the @theme static { … } block only — dark-mode/tenant appendices
    // reuse unrelated var names and would confuse a naive whole-file scan.
    const themeBlockMatch = css.match(/@theme static \{([\s\S]*?)\n\}/)
    expect(themeBlockMatch).not.toBeNull()
    const themeBlock = themeBlockMatch[1]

    // Discover every semantic name from the canonical --z-index-<name> declarations
    // rather than hardcoding the list, so a future addition/removal to
    // tokens/core.tokens.json's `z-index` group is covered automatically.
    const indexDecls = new Map()
    for (const m of themeBlock.matchAll(/--z-index-([a-z-]+):\s*(\d+);/g)) {
      indexDecls.set(m[1], Number(m[2]))
    }

    // The six names called out in FIX WAVE C-1's evidence (the filter family's
    // z-dropdown, plus siblings) must all be present — a partial emission would
    // still leave some utilities as no-ops.
    const requiredNames = ['base', 'dropdown', 'sticky', 'overlay', 'drawer', 'modal']
    for (const name of requiredNames) {
      expect(indexDecls.has(name), `--z-index-${name} missing from @theme`).toBe(true)
    }
    // Full scale from tokens/core.tokens.json (popover/toast/tooltip too) —
    // asserted so the alias-generation logic is proven for the whole group,
    // not just the six named in the bug report.
    expect([...indexDecls.keys()].sort()).toEqual(
      ['base', 'drawer', 'dropdown', 'modal', 'overlay', 'popover', 'sticky', 'toast', 'tooltip'].sort(),
    )

    // Every discovered name must ALSO have a legacy --z-<name> alias, pointing
    // back at the canonical --z-index-<name> var (so existing var(--z-…) call
    // sites — e.g. packages/demo-kit/src/console/DemoConsole.tsx — keep working).
    for (const name of indexDecls.keys()) {
      const aliasRe = new RegExp(`--z-${name}:\\s*var\\(--z-index-${name}\\);`)
      expect(themeBlock, `--z-${name} alias missing or not pointing at --z-index-${name}`).toMatch(aliasRe)
    }

    // Ordering: the semantic stacking scale must stay monotonically ordered on
    // the canonical namespace (the one Tailwind actually resolves utilities
    // against) so overlays/menus/toasts never collide.
    expect(indexDecls.get('dropdown')).toBeLessThan(indexDecls.get('modal'))
  })
})
