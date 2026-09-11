import { useSyncExternalStore } from 'react'

export type ThemeMode = 'light' | 'dark'

/**
 * How `defaultTheme` interacts with a previously-stored user choice.
 * - `'force'`: `defaultTheme` always wins over a stored choice (today's
 *   behavior — see `defaultThemeMode` below).
 * - `'respect-stored'`: a stored choice wins over `defaultTheme`;
 *   `defaultTheme` only applies when no stored choice exists.
 */
export type DefaultThemeMode = 'force' | 'respect-stored'

export interface ThemeBootstrapConfig {
  /** localStorage key the explicit choice is persisted under. Default `fams-theme`. */
  storageKey?: string
  /** Value written to `<html data-tenant>`. Generic theming attribute. Default `fams`. */
  tenant?: string
  /**
   * Force an initial theme. When omitted the initial theme resolves from
   * localStorage first, then the OS `prefers-color-scheme`.
   */
  defaultTheme?: ThemeMode
  /**
   * Controls whether `defaultTheme` overrides a stored user choice, or
   * defers to it. Default `'force'` — `defaultTheme` wins over a stored
   * choice, matching today's (pre-existing) behavior.
   *
   * NOTE: `'force'` being the default is a deliberate but still-open product
   * decision (see docs/BACKLOG.md) — whether a returning user's stored theme
   * choice *should* be overridable by an app-level `defaultTheme` is not yet
   * settled. This axis exists so the choice is explicit and reversible
   * without a breaking change; it does not itself resolve the question.
   */
  defaultThemeMode?: DefaultThemeMode
}

const DEFAULT_STORAGE_KEY = 'fams-theme'
const DEFAULT_TENANT = 'fams'

// Module-level singleton store. createFamsApp calls bootstrapTheme() exactly
// once at boot, so a singleton is the right shape and keeps useTheme()/setTheme()
// trivially importable anywhere in a consuming app.
let storageKey = DEFAULT_STORAGE_KEY
let currentTheme: ThemeMode | null = null
const listeners = new Set<() => void>()

function readStored(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(storageKey)
  return v === 'dark' || v === 'light' ? v : null
}

function systemPreference(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * localStorage → prefers-color-scheme → 'light' (unless `defaultTheme`
 * forces it — the default `mode: 'force'`). Pass `mode: 'respect-stored'`
 * to let a stored choice win over `defaultTheme` instead.
 */
export function resolveInitialTheme(
  defaultTheme?: ThemeMode,
  mode: DefaultThemeMode = 'force',
): ThemeMode {
  if (mode === 'respect-stored') {
    return readStored() ?? defaultTheme ?? systemPreference()
  }
  return defaultTheme ?? readStored() ?? systemPreference()
}

function applyThemeAttr(theme: ThemeMode): void {
  // Always write an explicit data-theme (never remove it) so the tokens
  // package's `:root[data-theme="dark"]` / `[data-theme="light"]` selectors
  // resolve deterministically regardless of OS preference.
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

/** Set the explicit theme: writes `<html data-theme>`, persists it, notifies subscribers. */
export function setTheme(theme: ThemeMode): void {
  currentTheme = theme
  applyThemeAttr(theme)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, theme)
  }
  listeners.forEach((l) => l())
}

/** Current theme (defaults to 'light' before bootstrap). */
export function getTheme(): ThemeMode {
  return currentTheme ?? 'light'
}

/** Flip between light and dark. */
export function toggleTheme(): void {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** React hook: subscribes to theme changes and exposes setters. */
export function useTheme(): {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
} {
  const theme = useSyncExternalStore(subscribe, getTheme, getTheme)
  return { theme, setTheme, toggleTheme }
}

/**
 * One-time boot: resolves + applies the initial theme and writes the generic
 * `data-tenant` attribute. The consuming APP is responsible for importing the
 * `@fams/tokens` CSS (`theme.css` + `tenants.css` + `fonts.css`) — this only
 * sets the attributes those stylesheets key off of.
 */
export function bootstrapTheme(config: ThemeBootstrapConfig = {}): ThemeMode {
  if (config.storageKey) storageKey = config.storageKey
  const initial = resolveInitialTheme(config.defaultTheme, config.defaultThemeMode)
  setTheme(initial)
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-tenant', config.tenant ?? DEFAULT_TENANT)
  }
  return initial
}
