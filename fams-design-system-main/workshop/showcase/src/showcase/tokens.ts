/**
 * Token catalog for the Foundations pages.
 *
 * Values are lifted verbatim from `@fams/tokens/dist/theme.css` (the generated
 * `@theme` block) so the swatches show the *actual* token hexes. Semantic tokens
 * (primary / ring / accent) are read live from CSS custom properties at runtime
 * so they re-theme with the tenant switcher — see `readCssVar()`.
 */

export type Swatch = { name: string; value: string; note?: string }
export type Ramp = { title: string; note?: string; swatches: Swatch[] }

/* ── Brand / primary ramp ──────────────────────────────────────────────── */
export const BRAND_RAMP: Ramp = {
  title: 'Brand',
  note: 'The FAMS blue ramp — primary aliases to brand-500 in FAMS mode.',
  swatches: [
    { name: 'brand-50', value: '#e6f2fc' },
    { name: 'brand-100', value: '#cce6f9' },
    { name: 'brand-200', value: '#99cdf3' },
    { name: 'brand-300', value: '#66b5ed' },
    { name: 'brand-400', value: '#339ce7' },
    { name: 'brand-500', value: '#0072d6' },
    { name: 'brand-600', value: '#005cb0' },
    { name: 'brand-700', value: '#00478a' },
    { name: 'brand-800', value: '#003165' },
    { name: 'brand-900', value: '#001c3f' },
  ],
}

/* ── Neutral / grey ramp ───────────────────────────────────────────────── */
export const GRAY_RAMP: Ramp = {
  title: 'Neutral / Grey',
  note: 'Text, borders and surfaces are built from this ramp.',
  swatches: [
    { name: 'gray-50', value: '#f9fafb' },
    { name: 'gray-100', value: '#f2f4f7' },
    { name: 'gray-200', value: '#eaecf0' },
    { name: 'gray-300', value: '#d0d5dd' },
    { name: 'gray-400', value: '#98a2b3' },
    { name: 'gray-500', value: '#667085' },
    { name: 'gray-600', value: '#475467' },
    { name: 'gray-700', value: '#344054' },
    { name: 'gray-800', value: '#1d2939' },
    { name: 'gray-900', value: '#101828' },
  ],
}

/* ── Semantic status ramps ─────────────────────────────────────────────── */
export const SUCCESS_RAMP: Ramp = {
  title: 'Success',
  swatches: [
    { name: 'success-50', value: '#ecfdf3' },
    { name: 'success-100', value: '#d1fadf' },
    { name: 'success-200', value: '#a6f4c5' },
    { name: 'success-300', value: '#6ce9a6' },
    { name: 'success-400', value: '#32d583' },
    { name: 'success-500', value: '#12b76a' },
    { name: 'success-600', value: '#039855' },
    { name: 'success-700', value: '#027a48' },
    { name: 'success-800', value: '#05603a' },
    { name: 'success-900', value: '#054f31' },
  ],
}

export const WARNING_RAMP: Ramp = {
  title: 'Warning',
  swatches: [
    { name: 'warning-50', value: '#fffaeb' },
    { name: 'warning-100', value: '#fef0c7' },
    { name: 'warning-200', value: '#fedf89' },
    { name: 'warning-300', value: '#fec84b' },
    { name: 'warning-400', value: '#fdb022' },
    { name: 'warning-500', value: '#f79009' },
    { name: 'warning-600', value: '#dc6803' },
    { name: 'warning-700', value: '#b54708' },
    { name: 'warning-800', value: '#93370d' },
    { name: 'warning-900', value: '#7a2e0e' },
  ],
}

export const ERROR_RAMP: Ramp = {
  title: 'Error',
  swatches: [
    { name: 'error-50', value: '#fef3f2' },
    { name: 'error-100', value: '#fee4e2' },
    { name: 'error-200', value: '#fecdca' },
    { name: 'error-300', value: '#fda29b' },
    { name: 'error-400', value: '#f97066' },
    { name: 'error-500', value: '#f04438' },
    { name: 'error-600', value: '#d92d20' },
    { name: 'error-700', value: '#b42318' },
    { name: 'error-800', value: '#912018' },
    { name: 'error-900', value: '#7a271a' },
  ],
}

export const STATUS_RAMPS = [SUCCESS_RAMP, WARNING_RAMP, ERROR_RAMP]

/* ── Semantic tokens (read live so they follow the tenant) ─────────────── */
export const SEMANTIC_TOKENS: Swatch[] = [
  { name: '--color-primary', value: 'var', note: 'brand action' },
  { name: '--color-accent', value: 'var', note: 'secondary action' },
  { name: '--color-ring', value: 'var', note: 'focus ring' },
  { name: '--color-success', value: 'var', note: 'positive' },
  { name: '--color-warning', value: 'var', note: 'caution' },
  { name: '--color-destructive', value: 'var', note: 'negative' },
  { name: '--color-foreground', value: 'var', note: 'body text' },
  { name: '--color-muted-foreground', value: 'var', note: 'secondary text' },
  { name: '--color-background', value: 'var', note: 'page surface' },
  { name: '--color-card', value: 'var', note: 'raised surface' },
  { name: '--color-secondary', value: 'var', note: 'subtle fill' },
  { name: '--color-border', value: 'var', note: 'hairlines' },
]

/** Resolve a CSS custom property (semantic token) to its current hex/color. */
export function readCssVar(name: string): string {
  if (typeof window === 'undefined') return ''
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw || ''
}

/* ── Radius ────────────────────────────────────────────────────────────── */
export const RADII = [
  { name: 'none', value: '0px', note: '<20px-tall elements with no rounding' },
  { name: 'xs', value: '2px', note: '<20px-tall elements' },
  { name: 'sm', value: '4px', note: '20–48px (buttons/inputs/small cards)' },
  { name: 'md', value: '6px', note: '≥48px surfaces (cards, modals, widgets)' },
  { name: 'full', value: '999px', note: 'pills/chips/avatars' },
]

/* ── Shadows ───────────────────────────────────────────────────────────── */
export const SHADOWS = [
  { name: 'sm', value: '0px 1px 2px 0px rgba(16,24,40,0.06), 0px 1px 3px 0px rgba(16,24,40,0.10)' },
  { name: 'md', value: '0px 2px 4px -2px rgba(16,24,40,0.06), 0px 4px 8px -2px rgba(16,24,40,0.10)' },
  { name: 'lg', value: '0px 4px 6px -2px rgba(16,24,40,0.03), 0px 12px 16px -4px rgba(16,24,40,0.08)' },
  { name: 'xl', value: '0px 8px 8px -4px rgba(16,24,40,0.03), 0px 20px 24px -4px rgba(16,24,40,0.08)' },
  { name: '2xl', value: '0px 24px 48px -12px rgba(16,24,40,0.18)' },
  { name: '3xl', value: '0px 32px 64px -12px rgba(16,24,40,0.14)' },
  { name: 'popover', value: '6px 10px 23px 0px rgba(0,0,0,0.29)', note: 'floating panels' },
  { name: 'popover-sm', value: '1px 2px 6px 0px rgba(0,0,0,0.15)', note: 'compact anchored popovers' },
  { name: 'map', value: '6px 10px 12px 0px rgba(0,0,0,0.05)', note: 'map surface overlays' },
  { name: 'glow', value: '0px 0px 15px 9px #e6f2fc', note: 'spreaded brand glow' },
]

/* ── Spacing ───────────────────────────────────────────────────────────── */
export const SPACING = [
  { name: '0', px: 0 },
  { name: '1', px: 4 },
  { name: '2', px: 8 },
  { name: '3', px: 12 },
  { name: '4', px: 16 },
  { name: '5', px: 20 },
  { name: '6', px: 24 },
  { name: '8', px: 32 },
  { name: '10', px: 40 },
  { name: '12', px: 48 },
  { name: '16', px: 64 },
]

/* ── Type scale (Gilroy) ───────────────────────────────────────────────── */
export type TypeToken = { name: string; className: string; size: number; line: number; weight: number; group: string }
export const TYPE_SCALE: TypeToken[] = [
  { name: 'h1', className: 'text-h1', size: 48, line: 56, weight: 700, group: 'Headings' },
  { name: 'h2', className: 'text-h2', size: 40, line: 48, weight: 700, group: 'Headings' },
  { name: 'h3', className: 'text-h3', size: 32, line: 40, weight: 600, group: 'Headings' },
  { name: 'h4', className: 'text-h4', size: 28, line: 36, weight: 600, group: 'Headings' },
  { name: 'h5', className: 'text-h5', size: 24, line: 32, weight: 600, group: 'Headings' },
  { name: 'h6', className: 'text-h6', size: 20, line: 26, weight: 600, group: 'Headings' },
  { name: 'body-xl', className: 'text-body-xl', size: 20, line: 26, weight: 400, group: 'Body' },
  { name: 'body-lg', className: 'text-body-lg', size: 18, line: 26, weight: 400, group: 'Body' },
  { name: 'body-md', className: 'text-body-md', size: 16, line: 24, weight: 400, group: 'Body' },
  { name: 'body-sm', className: 'text-body-sm', size: 14, line: 20, weight: 400, group: 'Body' },
  { name: 'body-xs', className: 'text-body-xs', size: 12, line: 18, weight: 400, group: 'Body' },
  { name: 'caption', className: 'text-caption', size: 10, line: 12, weight: 500, group: 'Caption' },
]

export const FONT_WEIGHTS = [
  { name: 'Light', value: 300 },
  { name: 'Regular', value: 400 },
  { name: 'Medium', value: 500 },
  { name: 'Semibold', value: 600 },
  { name: 'Bold', value: 700 },
  { name: 'Extrabold', value: 800 },
]

/* ── Icon sizes ────────────────────────────────────────────────────────── */
export const ICON_SIZES = [
  { name: '2xs', px: 14 },
  { name: 'xs', px: 16 },
  { name: 'sm', px: 20 },
  { name: 'md', px: 24 },
  { name: 'lg', px: 32 },
  { name: 'xl', px: 40 },
  { name: '2xl', px: 48 },
]

/* ── Screen / container max-widths (Figma "Responsive" spec) ─────────────
 * Distinct from the Tailwind `breakpoint.*` scale (640/768/1024/1280/1536)
 * used by every `sm:`/`md:`/`lg:`/`xl:`/`2xl:` utility across ui-kit — those
 * stay as-is. `screen.*` is additive: container/canvas max-widths matching
 * the Figma Design System V2 Desktop/Tablet/Mobile frames, for consumers
 * that need to cap a layout's width to the design canvas size. */
export const SCREEN_SIZES = [
  { name: 'sm-mobile', px: 393, note: 'Figma "sm(mobile)"' },
  { name: 'sm-tab', px: 786, note: 'Figma "sm(tab)"' },
  { name: 'md', px: 1024 },
  { name: 'lg', px: 1440 },
  { name: 'xl-desktop', px: 1920, note: 'Figma "xl(desktop)"' },
  { name: '2xl', px: 2560 },
]

/** Light swatches need dark labels; dark swatches need light labels. */
export function isLightHex(hex: string): boolean {
  const m = hex.replace('#', '')
  if (m.length < 6) return true
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  // relative luminance
  return 0.299 * r + 0.587 * g + 0.114 * b > 150
}
