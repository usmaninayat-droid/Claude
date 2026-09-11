/**
 * vite-base-literals — make ROOT-ABSOLUTE string literals base-aware.
 *
 * WHY THIS EXISTS
 * ---------------
 * Vite rewrites `base` into *imported* assets and into HTML attributes it
 * parses. It cannot touch a path that lives inside a plain JavaScript string:
 *
 *     <img src="/assets/truck-tanker.svg" />          // operations-center
 *     <img src="/branding/qatar-mme-rail-mark.svg" /> // the host app
 *     "logo": "/branding/qatar-mme-login-logo.svg"    // a tenant.json manifest
 *     '/screens/operations-center/index.html?embed=1' // iframe srcs
 *
 * Those resolve against the ORIGIN root. That is correct on Vercel (the app is
 * served at `/`) and wrong on GitHub Pages project pages, where everything
 * lives under `/MME-FRMS-MVP/`.
 *
 * Rather than convert 30-odd literals across a dozen files into calls to some
 * runtime helper — churn in three separate apps, easy to regress — this plugin
 * does the rewrite at BUILD time, from the base Vite has already resolved:
 *
 *     "/assets/x.svg"   ->  "/MME-FRMS-MVP/screens/operations-center/assets/x.svg"
 *     "/branding/y.svg" ->  "/MME-FRMS-MVP/branding/y.svg"
 *
 * It is a NO-OP when base is `/` (the Vercel build and every dev server), so
 * the default deployment path is bit-for-bit what it was before.
 *
 * Only literal-quoted occurrences of the configured prefixes are touched, and
 * only in the app's own source (node_modules and virtual modules are skipped),
 * so a same-named substring inside prose or a comment stays put unless it is
 * quoted — which is exactly the set we want.
 */

/**
 * @param {object} options
 * @param {string[]} options.prefixes root-absolute directory names to rewrite,
 *   without slashes — e.g. `['assets', 'branding', 'screens']`.
 * @returns {import('vite').Plugin}
 */
export function baseLiterals({ prefixes }) {
  let base = '/'
  return {
    name: 'fams:base-literals',
    apply: 'build',
    configResolved(config) {
      base = config.base || '/'
    },
    transform(code, id) {
      if (base === '/') return null
      if (id.includes('/node_modules/') || id.startsWith('\0')) return null
      if (!/\.(tsx?|jsx?|mjs|json)($|\?)/.test(id)) return null

      // base always ends with '/' after Vite resolves it; strip it so the
      // captured literal's own leading '/' is the only separator.
      const prefix = base.replace(/\/$/, '')
      const group = prefixes.join('|')
      const re = new RegExp(`(["'\`])(/(?:${group})/)`, 'g')
      if (!re.test(code)) return null
      re.lastIndex = 0
      return { code: code.replace(re, (_m, quote, path) => `${quote}${prefix}${path}`), map: null }
    },
  }
}
