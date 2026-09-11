import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../lib/cn'

/**
 * LoginBrandPanel — the tenant-variable LEFT pane of the login split screen.
 * [v5 pattern — tier 2]
 *
 * Everything in this pane is tenant brand content supplied by the consuming
 * app (quote, subtext, background, illustration) — NEVER hardcoded per tenant
 * in the DS. When no `background` is given it falls back to the `primary`
 * token, and when no `illustration` is given it renders the swappable
 * `LoginBrandIllustration` default below.
 *
 * The pane is decorative except the headline/subtext: the illustration layer
 * is `aria-hidden` and non-interactive, and the whole pane crops (never
 * squashes) at smaller widths — the consuming layout hides it entirely below
 * the `lg` breakpoint (see `LoginPage`).
 */
export interface LoginBrandPanelProps {
  /** Tenant headline/quote (e.g. from the tenant manifest's login branding). */
  quote?: ReactNode
  /** Tenant supporting line under the quote. */
  subtext?: ReactNode
  /**
   * Tenant brand background — any CSS `background` value (a brand hex from the
   * tenant manifest, a gradient, …). Falls back to the `primary` token.
   */
  background?: string
  /** Tenant imagery — replaces the default `LoginBrandIllustration`. */
  illustration?: ReactNode
  /**
   * Tenant imagery as a flattened image asset URL (e.g. an exported Figma
   * artwork from the tenant manifest's login section). Rendered FULL-BLEED —
   * covers the whole pane, bottom-anchored crop, never squashed (login spec
   * 32171:8228: the left pane is one full artwork). A custom `illustration`
   * node wins when both are given.
   *
   * The literal `"none"` opts a tenant OUT of imagery entirely — a plain
   * brand-color/gradient pane with no illustration, no default fallback
   * (e.g. UCCP's Figma spec: a flat maroon gradient, nothing overlaid).
   * Omit the field (undefined) to keep the DS's default illustration.
   */
  illustrationSrc?: string | 'none'
  /**
   * WHITE (on-brand) tenant logo for the MOBILE brand header — the top ~third
   * of the screen below `lg`, where the brand background fills the viewport
   * and the sheet holds the form (mobile login refs). Consumed by `LoginPage`,
   * NOT by this panel: the desktop `logo` asset is dark-on-white and unusable
   * on the brand color, so mobile takes its own asset. Tenants without a white
   * asset pass a white text wordmark (or omit it — the header then collapses).
   */
  mobileLogo?: ReactNode
  className?: string
  style?: CSSProperties
}

export function LoginBrandPanel({ quote, subtext, background, illustration, illustrationSrc, className, style }: LoginBrandPanelProps) {
  return (
    <div
      data-slot="login-brand-panel"
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden text-primary-foreground',
        !background && 'bg-primary',
        className,
      )}
      style={background ? { background, ...style } : style}
    >
      {/* Decorative imagery layer — FULL-BLEED across the whole pane (spec
          32171:8228: the left pane is one full artwork, its own blue sky IS
          the background). Bottom-anchored crop, never squashed. Sits behind
          the copy so the illustration's own sky region shows through at the
          top instead of a flat filler block. */}
      {illustrationSrc === 'none' ? null : (
        <div aria-hidden className="pointer-events-none absolute inset-0 h-full w-full select-none">
          {illustration ??
            (illustrationSrc ? (
              <img
                src={illustrationSrc}
                alt=""
                data-slot="login-brand-illustration-image"
                className="absolute inset-0 h-full w-full object-cover object-bottom"
              />
            ) : (
              <LoginBrandIllustration />
            ))}
        </div>
      )}
      {/* Copy block overlaid ON TOP of the artwork — the illustration's own
          top region is empty sky, so the headline/subtext sit over it. Only
          the safe area needed for the text is reserved (no full-height flex
          column), which is what let the stat-card collision happen before:
          fixed instead by keeping this block sized to its content and letting
          the underlying `object-bottom` crop keep the cards low in the pane
          at the ≥900×600 viewports the spec targets. */}
      {(quote || subtext) && (
        <div className="relative z-10 flex max-w-[46rem] flex-col gap-2.5 pb-4 pe-10 ps-[clamp(2rem,4.5vw,4rem)] pt-[clamp(1.75rem,6vh,4rem)]">
          {quote ? (
            <h2 className="text-[clamp(1.5rem,2.6vw,2.375rem)] font-bold leading-none">{quote}</h2>
          ) : null}
          {subtext ? (
            <p className="max-w-[42rem] text-[clamp(0.875rem,1.4vw,1.25rem)] font-semibold leading-snug opacity-90">
              {subtext}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

/**
 * LoginBrandIllustration — the DEFAULT decorative fill for the brand pane: a
 * flattened, token-friendly composition (soft glow ellipses, a light map
 * field with dashed route lines, floating stat/route cards) standing in for
 * the ~200-node Figma vector scene. Deliberately simple and swappable —
 * tenants override it via `LoginBrandPanelProps.illustration`.
 */
export function LoginBrandIllustration() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1248 1080"
      preserveAspectRatio="xMidYMax slice"
      role="presentation"
      focusable="false"
    >
      <defs>
        <radialGradient id="fams-login-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.28" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fams-login-map" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0.92" />
          <stop offset="55%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fams-login-spark" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Soft glow ellipses (top-center + bottom-start). */}
      <circle cx="640" cy="60" r="363" fill="url(#fams-login-glow)" />
      <circle cx="80" cy="980" r="363" fill="url(#fams-login-glow)" />

      {/* Light map field blending diagonally into the brand color. */}
      <path d="M0 1080 L0 560 Q240 480 430 520 Q680 570 860 470 Q1060 360 1248 420 L1248 1080 Z" fill="url(#fams-login-map)" />

      {/* Park / water patches. */}
      <ellipse cx="120" cy="700" rx="110" ry="70" fill="white" fillOpacity="0.35" />
      <ellipse cx="980" cy="880" rx="150" ry="90" fill="white" fillOpacity="0.3" />

      {/* Street grid. */}
      <g stroke="white" strokeOpacity="0.5" strokeWidth="10" fill="none">
        <path d="M-40 760 Q300 700 620 780 T1290 720" />
        <path d="M200 1090 Q260 860 460 800" />
        <path d="M760 1090 Q780 900 960 830" />
      </g>

      {/* Dashed route lines. */}
      <g stroke="white" strokeOpacity="0.9" strokeWidth="4" strokeDasharray="10 12" fill="none">
        <path d="M120 620 Q300 640 380 760 T640 880 T1040 800" />
        <path d="M80 380 Q220 420 260 560" />
      </g>

      {/* Route pins. */}
      <g fill="white" fillOpacity="0.95">
        <circle cx="120" cy="620" r="10" />
        <circle cx="640" cy="880" r="10" />
        <circle cx="1040" cy="800" r="10" />
      </g>

      {/* Stat card with a mini spark area. */}
      <g transform="translate(320 300)">
        <rect width="230" height="180" rx="12" fill="white" fillOpacity="0.95" />
        <rect x="20" y="20" width="44" height="10" rx="5" fill="currentColor" opacity="0.85" />
        <rect x="20" y="42" width="110" height="8" rx="4" fill="currentColor" opacity="0.35" />
        <rect x="20" y="66" width="60" height="8" rx="4" fill="currentColor" opacity="0.2" />
        <path d="M20 150 Q60 110 90 128 T150 100 T210 78 L210 160 L20 160 Z" fill="url(#fams-login-spark)" />
        <path d="M20 150 Q60 110 90 128 T150 100 T210 78" stroke="currentColor" strokeOpacity="0.6" strokeWidth="3" fill="none" />
      </g>

      {/* Vehicle card. */}
      <g transform="translate(660 430)">
        <rect width="280" height="110" rx="18" fill="white" fillOpacity="0.92" />
        <circle cx="55" cy="55" r="28" fill="currentColor" opacity="0.12" />
        <rect x="42" y="46" width="26" height="14" rx="4" fill="currentColor" opacity="0.7" />
        <circle cx="48" cy="63" r="4" fill="currentColor" opacity="0.7" />
        <circle cx="62" cy="63" r="4" fill="currentColor" opacity="0.7" />
        <rect x="98" y="30" width="130" height="12" rx="6" fill="currentColor" opacity="0.75" />
        <rect x="98" y="52" width="150" height="9" rx="4" fill="currentColor" opacity="0.35" />
        <rect x="98" y="72" width="70" height="10" rx="5" fill="currentColor" opacity="0.25" />
      </g>

      {/* Route chips. */}
      <g>
        <rect x="120" y="810" width="200" height="48" rx="10" fill="white" fillOpacity="0.95" />
        <circle cx="146" cy="834" r="9" fill="currentColor" opacity="0.6" />
        <rect x="164" y="828" width="130" height="11" rx="5" fill="currentColor" opacity="0.55" />
        <rect x="470" y="860" width="170" height="48" rx="10" fill="white" fillOpacity="0.95" />
        <circle cx="496" cy="884" r="9" fill="currentColor" opacity="0.6" />
        <rect x="514" y="878" width="100" height="11" rx="5" fill="currentColor" opacity="0.55" />
      </g>
    </svg>
  )
}
