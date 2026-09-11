import { type CSSProperties } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import type { FamsModule, NavEntry } from './types'

export interface DerivedNavItem extends NavEntry {
  /** Module id this entry came from. */
  id: string
  /** Resolved sort order (declaration index when `order` is unset). */
  resolvedOrder: number
}

/**
 * Derive the app nav from the module contract: one entry per module's
 * `navEntry`, sorted by `order` (declaration order as the tiebreaker/fallback).
 * Pure and product-agnostic — the unit tests assert against this directly.
 */
export function deriveNavEntries(modules: FamsModule[]): DerivedNavItem[] {
  return modules
    .map((m, i) => ({
      ...m.navEntry,
      id: m.id,
      resolvedOrder: m.navEntry.order ?? i,
    }))
    .sort((a, b) => a.resolvedOrder - b.resolvedOrder)
}

const shellStyle: CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: 'var(--color-background, #fff)',
  color: 'var(--color-foreground, #111)',
  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
}
const navStyle: CSSProperties = {
  width: '14rem',
  flexShrink: 0,
  borderInlineEnd: '1px solid var(--color-border, #e5e7eb)',
  padding: '1rem 0.75rem',
}
const brandStyle: CSSProperties = {
  padding: '0 0.5rem 1rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--color-muted-foreground, #6b7280)',
}
const linkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.625rem',
  borderRadius: 'var(--radius-md, 0.375rem)',
  fontSize: '0.875rem',
  color: 'var(--color-muted-foreground, #6b7280)',
  textDecoration: 'none',
}
const activeLinkStyle: CSSProperties = {
  ...linkStyle,
  background: 'var(--color-muted, #f3f4f6)',
  color: 'var(--color-foreground, #111)',
  fontWeight: 500,
}
const mainStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '1.5rem',
}

export interface AppShellProps {
  modules: FamsModule[]
  /** Optional label above the nav. */
  brandLabel?: string
}

/** The generic app chrome: a nav rail derived from modules + the routed outlet. */
export function AppShell({ modules, brandLabel }: AppShellProps) {
  const items = deriveNavEntries(modules)
  return (
    <div style={shellStyle}>
      <nav style={navStyle} aria-label="Primary">
        {brandLabel ? <div style={brandStyle}>{brandLabel}</div> : null}
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            style={linkStyle}
            activeProps={{ style: activeLinkStyle }}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  )
}
