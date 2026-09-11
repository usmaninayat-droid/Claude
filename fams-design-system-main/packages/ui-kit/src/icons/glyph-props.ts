import type { SVGProps } from 'react'

/**
 * The props every vendored FAMS V5 glyph takes: plain SVG props plus the
 * `size` shorthand (one number for both width and height, defaulting to the
 * library's 24px art box). `size` is kept because it is the shorthand every
 * DS call site already writes — `<Plus size={16} />` — and dropping it would
 * have meant touching several hundred JSX sites for no design reason.
 */
export type IconSvgProps = Omit<SVGProps<SVGSVGElement>, 'size'> & { size?: number | string }
