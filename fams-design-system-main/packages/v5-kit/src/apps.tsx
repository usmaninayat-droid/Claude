import { createContext, useContext, type ReactNode } from 'react'
import type { RailStartEntry, UserIdentity } from './types'
import type { RailIndicatorSource } from './rail-indicators'

/**
 * One APPLICATION in a tenant's outer nav rail — a named group of MODULES
 * (e.g. "Telematics" containing the `asset`/`workforce`/`ticketing`
 * modules). Concept: a tenant has applications, each containing modules —
 * the outer `SideNav` rail lists applications; the inner `ModuleRail` lists
 * only the modules of whichever application is currently active (see
 * `V5AppShell` in `shell.tsx`). This is the fix for the pre-existing bug
 * where both rails were fed the same per-module list ("apps ≠ modules").
 */
export interface AppDefinition {
  /** Stable id. Only used to match the active application against a route. */
  id: string
  /** Label shown in the outer rail (as a tooltip — the rail itself is icon-only). */
  name: string
  /** Glyph rendered in the outer rail. Omit to fall back to `SideNav`'s own default. */
  icon?: ReactNode
  /** Module ids (matching `FamsModule.id`) belonging to this application. */
  modules: string[]
  /**
   * Suppress `V5AppShell`'s cross-app switcher row while this application is
   * active — for an app whose persona never navigates to another application
   * (e.g. a single-purpose inspector/field app nested in a multi-app tenant).
   * The row's absence is deliberate chrome, not the pre-`applications` no-op
   * fallback: `NavRail`'s `switcher` prop is simply omitted (its own doc:
   * "Omit to hide the row"), same as a shell rendered with no `AppsProvider`
   * at all. The application's own modules still render in the rail normally
   * — only the OTHER-apps switcher disappears. Omit/default `false`.
   */
  hideSwitcher?: boolean
}

export interface AppsContextValue {
  /**
   * The tenant's configured applications. Empty when the tenant config
   * carries no `applications` grouping — `V5AppShell` then synthesizes a
   * single implicit app spanning every module, so a tenant that hasn't
   * opted in yet never breaks (same module set the outer rail used to show
   * one-for-one, before the split).
   */
  applications: AppDefinition[]
  /** Tenant-branded logo for the outer rail's logo slot. */
  logo?: ReactNode
  /**
   * Suppress the tenant-name text rendered beside the rail logo (from
   * `TenantRuntimeConfig.branding.hideName`). For a `logo` that already
   * contains the wordmark, the label beside it is a duplicate. Scoped to that
   * slot only — `brandLabel` still titles the top bar / switcher / palette.
   */
  hideBrandLabel?: boolean
  /** Expanded-rail brand wordmark (`TenantRuntimeConfig.branding.logoExpanded`). */
  logoExpanded?: ReactNode
  /** Rail-footer attribution wordmark (`TenantRuntimeConfig.branding.poweredBy`). */
  poweredBy?: ReactNode
  /**
   * The signed-in user's display identity (from the injectable `UserSource`,
   * threaded through `bootstrapTenant`). When set, `V5AppShell` turns the
   * rail-footer user item into a real `UserPopover` trigger; when absent the
   * item stays decorative/disabled — exactly the pre-identity behavior.
   */
  user?: UserIdentity
  /**
   * Logout handler the shell's `UserPopover` fires. `bootstrapTenant` wires
   * this to the composed `V5App.logout` (tenant cache wipe → app `onLogout`
   * hook) — the shell itself stays auth-ignorant (rule 8).
   */
  onUserLogout?: () => void
  /**
   * Pinned entries above the outer rail's application icons (the Figma Inbox
   * slot) — from `TenantRuntimeConfig.railStart`. Empty/omitted → no pinned
   * strip, exactly the pre-WP4 rail.
   */
  railStart?: RailStartEntry[]
  /**
   * Subscribable per-rail-item indicator dots (e.g. inbox unread), queried by
   * `railStart[].id`. Omitted → no dots.
   */
  railIndicators?: RailIndicatorSource
}

const DEFAULT_APPS_CONTEXT: AppsContextValue = { applications: [] }

const AppsContext = createContext<AppsContextValue>(DEFAULT_APPS_CONTEXT)

export interface AppsProviderProps {
  value: AppsContextValue
  children: ReactNode
}

/**
 * Feeds `V5AppShell` the tenant's application grouping + branding without
 * widening skeleton-kit's product-agnostic `ShellComponentProps` (locked to
 * `{ modules, brandLabel }`, decision #13 — the core tier must stay
 * ignorant of v5's "applications" vocabulary). `bootstrapTenant` wraps the
 * booted app in this provider (see `bootstrap.tsx`); `V5AppShell` reads it
 * via `useApps`. Any consumer that renders `V5AppShell` outside this
 * provider still works — `useApps` returns the no-applications/no-logo
 * default, which `V5AppShell` handles gracefully.
 */
export function AppsProvider({ value, children }: AppsProviderProps) {
  return <AppsContext.Provider value={value}>{children}</AppsContext.Provider>
}

/** Reads the current tenant's application grouping + branding. Safe to call
 *  outside a provider — defaults to no applications / no logo. */
export function useApps(): AppsContextValue {
  return useContext(AppsContext)
}
