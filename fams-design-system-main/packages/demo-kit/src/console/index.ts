/**
 * `@fams/demo-kit/console` — the DemoConsole control surface (React).
 *
 * A SEPARATE subpath entry (tsup two-entry pattern, like `@fams/v5-templates/
 * map`) so the core store barrel (`@fams/demo-kit`) stays React-free: React is
 * an optional peer at the package level and a real dependency only here.
 */
export { DemoConsole } from './DemoConsole'
export type { DemoConsoleProps, DemoConsoleOption, DemoConsolePersona } from './DemoConsole'
export { useHoverReveal, type HoverReveal } from './useHoverReveal'
