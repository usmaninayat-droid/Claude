import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import { HORIZONTAL_LOGO_MARKS } from './logo-marks'

/**
 * Logo — tenant wordmark. [L3 composite]
 * Resolves which brand to render (`fams` / `tadweer` / `iwmp` / `ead` / `mm`)
 * from an explicit `tenant` prop or `document.documentElement.dataset.tenant`.
 */
export type Tenant = 'fams' | 'tadweer' | 'iwmp' | 'ead' | 'mm'

/**
 * Lockup orientation: `'horizontal'` (mark beside the wordmark) or
 * `'stacked'` (mark above the wordmark, default — matches the plain-text
 * fallback's single-line shape most closely). Generic across all tenants:
 * a tenant with no built-in horizontal mark (see `HORIZONTAL_LOGO_MARKS`)
 * simply keeps rendering its explicit `src` image or the text fallback —
 * `variant` only ever adds a rendering option, never removes one.
 */
export type LogoVariant = 'stacked' | 'horizontal'

const WORDMARKS: Record<Tenant, string> = {
  fams: 'FAMS',
  tadweer: 'Tadweer',
  iwmp: 'Tadweer',
  ead: 'EAD',
  mm: 'MM',
}

function resolveTenant(tenant?: Tenant): Tenant {
  if (tenant) return tenant
  if (typeof document !== 'undefined') {
    const fromDom = document.documentElement.dataset.tenant as
      | Tenant
      | undefined
    if (fromDom && fromDom in WORDMARKS) return fromDom
  }
  return 'fams'
}

export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Tenant brand to render. Defaults to reading
   * `document.documentElement.dataset.tenant`, falling back to `fams`.
   */
  tenant?: Tenant
  /**
   * Real logo asset URL (a tenant-branding asset, e.g. from the tenant
   * manifest). When given, the image renders instead of the text wordmark
   * (which stays the fallback for tenants with no exported asset). The image
   * scales to the slot's height, natural aspect (`h-full w-auto`). Takes
   * priority over `variant`'s built-in mark when both are given.
   */
  src?: string
  /**
   * Lockup orientation — `'stacked'` (default) or `'horizontal'`. Only
   * matters when `src` is omitted: `'horizontal'` then renders the tenant's
   * built-in inline mark (`HORIZONTAL_LOGO_MARKS`) if one exists, scaled to
   * the slot's height (`h-full w-auto`); a tenant with none falls back to
   * the plain text wordmark, same as `'stacked'`.
   */
  variant?: LogoVariant
}

export const Logo = forwardRef<HTMLSpanElement, LogoProps>(
  ({ tenant, src, variant = 'stacked', className, ...props }, ref) => {
    const resolved = resolveTenant(tenant)
    const HorizontalMark = variant === 'horizontal' ? HORIZONTAL_LOGO_MARKS[resolved] : undefined
    const hasImage = Boolean(src) || Boolean(HorizontalMark)
    return (
      <span
        ref={ref}
        data-tenant-logo={resolved}
        data-variant={variant}
        className={cn(
          'inline-flex items-center text-primary font-bold text-2xl tracking-tight',
          hasImage && 'h-full',
          className,
        )}
        {...props}
      >
        {src ? (
          <img src={src} alt={WORDMARKS[resolved]} className="h-full w-auto" />
        ) : HorizontalMark ? (
          <HorizontalMark className="h-full w-auto" />
        ) : (
          WORDMARKS[resolved]
        )}
      </span>
    )
  },
)

Logo.displayName = 'Logo'
