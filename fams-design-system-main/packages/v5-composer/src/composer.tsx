import type { ReactElement, ReactNode } from 'react'
import type { ModuleBlueprint } from './blueprint-schema'
import type { EntityRecord } from './types'
import type { ListQuery } from './store'
import { getModuleType, resolveModuleViews } from './module-registry'
import type { ModuleTypeDef } from './module-registry'

/**
 * Composer entry — the composer's public React surface.
 *
 * `<ComposedModule>` / `composeModule()` accept EITHER of two mutually-exclusive
 * prop shapes, enforced at compile time by a discriminated union (the `never`
 * XOR trick):
 *   - LOW-CODE path: `{ blueprint, data, renderers? }` — the composer resolves
 *     the module's template contract ref from the module-type registry and
 *     renders it through the injected renderer registry.
 *   - BESPOKE path: `{ children }` — the caller supplies its own subtree.
 *
 * The component is intentionally THIN in v1: the real React templates arrive in
 * later tasks (they live in `@fams/v5-templates`). Until an app wires a renderer
 * for a template ref, the composer renders a clearly-marked placeholder. React
 * is allowed here (this is the composer's public surface); the runtime core
 * files stay React-free.
 */

/** The data source for the low-code path. A runtime `ModuleHandle` satisfies this. */
export interface DataAdapter {
  list: (query?: ListQuery) => EntityRecord[]
  get: (id: string) => EntityRecord | undefined
  create?: (input: Partial<EntityRecord>) => EntityRecord
  transitions?: (id: string) => string[]
  move?: (id: string, toStage: string) => EntityRecord
  update?: (id: string, patch: Partial<EntityRecord>) => EntityRecord | undefined
  /**
   * Delete a record. Optional because deletion is privilege-gated per module
   * and per app — but a module whose `uiConfig.rowActions.delete` /
   * `bulkActions.delete` is on and whose adapter omits this gets a LOUD dev
   * warning rather than a silently missing menu item (see
   * `@fams/v5-templates`' `views/actions/module-actions-config.ts`), because
   * that silent vanish is how `Delete` went missing from every lens in the
   * pipelines round-1 gate. Returns whether the record was removed.
   */
  remove?: (id: string) => boolean
}

/** Context handed to a template renderer. */
export interface ModuleRenderContext {
  module: ModuleBlueprint
  data: DataAdapter
  typeDef: ModuleTypeDef
  /** The template contract ref being rendered (e.g. `ListView`). */
  templateRef: string
}

/** A function that renders one template contract ref to React. */
export type ModuleRenderer = (ctx: ModuleRenderContext) => ReactNode

/** Maps a template contract ref (from the module-type registry) → a renderer. */
export type RendererRegistry = Record<string, ModuleRenderer>

/* ── Discriminated-union props (compile-time XOR) ───────────────────────────── */

export interface LowCodeModuleProps {
  /** A single module node — the low-code path. */
  blueprint: ModuleBlueprint
  /** The data source the resolved template renders from. */
  data: DataAdapter
  /** App-supplied renderers, keyed by template contract ref. */
  renderers?: RendererRegistry
  children?: never
}

export interface BespokeModuleProps {
  /** A bespoke subtree — the escape hatch. */
  children: ReactNode
  blueprint?: never
  data?: never
  renderers?: never
}

export type ComposedModuleProps = LowCodeModuleProps | BespokeModuleProps

/* ── Resolution ─────────────────────────────────────────────────────────────── */

/** Resolve the primary template contract ref a module renders through. */
export function resolvePrimaryTemplateRef(
  module: ModuleBlueprint,
  typeDef: ModuleTypeDef,
): string | undefined {
  const refs = typeDef.templateRefs
  if (typeDef.tabKind === 'instance') return refs.grid ?? refs.detail
  const views = resolveModuleViews(module.type, module.views)
  const primary = views[0]
  return (primary && refs.views?.[primary]) ?? refs.grid ?? refs.detail
}

function Placeholder({ label, hint }: { label: string; hint: string }): ReactElement {
  return (
    <div
      data-composer-placeholder=""
      role="note"
      className="composer-placeholder rounded-sm border border-dashed border-border p-section text-muted-foreground"
    >
      <strong className="composer-placeholder-title">{label}</strong>
      <span className="composer-placeholder-hint"> — {hint}</span>
    </div>
  )
}

function isBespoke(props: ComposedModuleProps): props is BespokeModuleProps {
  return (props as BespokeModuleProps).children !== undefined &&
    (props as LowCodeModuleProps).blueprint === undefined
}

/**
 * Resolve a module's composition to React. Returns the caller's `children` on
 * the bespoke path; on the low-code path, resolves the template ref and renders
 * it via the renderer registry, falling back to a marked placeholder when the
 * type is a registered placeholder or no renderer is wired.
 */
export function composeModule(props: ComposedModuleProps): ReactNode {
  if (isBespoke(props)) return props.children

  const { blueprint, data, renderers } = props
  const typeDef = getModuleType(blueprint.type)
  if (!typeDef) {
    return (
      <Placeholder
        label={blueprint.label}
        hint={`unknown module type "${blueprint.type}" — register it with registerModuleType()`}
      />
    )
  }

  const templateRef = resolvePrimaryTemplateRef(blueprint, typeDef)
  const renderer = templateRef ? renderers?.[templateRef] : undefined
  if (typeDef.placeholder || !templateRef || !renderer) {
    const hint = !templateRef
      ? `no template ref for "${blueprint.type}" — configure views or a grid template`
      : typeDef.placeholder
        ? `the "${blueprint.type}" template is not wired yet (placeholder module type)`
        : `no renderer supplied for template "${templateRef}" — wire it in the renderer registry`
    return <Placeholder label={blueprint.label} hint={hint} />
  }

  return renderer({ module: blueprint, data, typeDef, templateRef })
}

/** The composer's React component. See `ComposedModuleProps` for the prop XOR. */
export function ComposedModule(props: ComposedModuleProps): ReactElement {
  return <>{composeModule(props)}</>
}
