import { useState, type ReactNode } from 'react'
import { Check, X, Info } from '@fams/ui-kit/icons'

/** Standalone copyable code block (for install commands, snippets in prose). */
export function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-caption font-medium uppercase tracking-widest text-muted-foreground">
          {lang}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
          }}
          className="rounded-sm px-2 py-1 text-caption font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-body-sm leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** Status pill for a component's maturity. */
export function Badge({ kind }: { kind: 'stable' | 'beta' | 'wip' }) {
  const map = {
    stable: 'bg-success/10 text-success',
    beta: 'bg-warning/10 text-warning',
    wip: 'bg-muted text-muted-foreground',
  } as const
  const label = { stable: 'Stable', beta: 'Beta', wip: 'In progress' }[kind]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${map[kind]}`}
    >
      {label}
    </span>
  )
}

/** The page header — identical shape on every doc/component page. */
export function DocPage({
  title,
  summary,
  badge,
  children,
}: {
  title: string
  summary?: string
  badge?: 'stable' | 'beta' | 'wip'
  children: ReactNode
}) {
  return (
    <article className="pb-28">
      <header className="border-b border-border pb-10">
        <div className="flex items-center gap-3">
          <h1 className="text-h1 font-bold leading-tight tracking-tight text-foreground">{title}</h1>
          {badge && <Badge kind={badge} />}
        </div>
        {summary && (
          <p className="mt-4 max-w-[62ch] text-body-lg leading-relaxed text-muted-foreground">
            {summary}
          </p>
        )}
      </header>
      <div className="flex flex-col gap-16 pt-12">{children}</div>
    </article>
  )
}

/** An anchored content section; the id feeds the "On this page" rail. */
export function DocSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-6 text-h3 font-semibold leading-tight tracking-tight text-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}

/** Prose paragraph tuned for docs measure. */
export function Prose({ children }: { children: ReactNode }) {
  return <p className="max-w-[68ch] text-body-md leading-7 text-muted-foreground">{children}</p>
}

export type PropRow = {
  prop: string
  type: string
  default?: string
  required?: boolean
  description: string
}

/** The props / API reference table. */
export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-start text-body-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-caption uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-2.5 text-start font-semibold">Prop</th>
            <th className="px-4 py-2.5 text-start font-semibold">Type</th>
            <th className="px-4 py-2.5 text-start font-semibold">Default</th>
            <th className="px-4 py-2.5 text-start font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              // index, not r.prop — tables that merge related components
              // (RadioGroup + RadioGroupItem, discriminated `kind` variants
              // on TableCell, …) legitimately repeat prop names like `value`
              // or `tone`; rows are a static authored list, never reordered.
              key={i}
              className="border-b border-border align-top transition-colors last:border-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3.5 font-mono text-body-sm font-medium text-foreground">
                {r.prop}
                {r.required && <span className="ms-1 text-destructive">*</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 font-mono text-caption text-primary">
                {r.type}
              </td>
              <td className="px-4 py-3.5 font-mono text-caption text-muted-foreground">
                {r.default ?? '—'}
              </td>
              <td className="px-4 py-3.5 leading-relaxed text-muted-foreground">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Do / Don't guidance — side by side. */
export function Guidelines({ dos, donts }: { dos: string[]; donts: string[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-md border border-success/25 bg-success/5 p-6">
        <div className="mb-4 flex items-center gap-2 text-body-sm font-semibold text-success">
          <span className="grid size-5 place-items-center rounded-full bg-success/15">
            <Check className="size-3.5" />
          </span>
          Do
        </div>
        <ul className="flex flex-col gap-2.5">
          {dos.map((d) => (
            <li key={d} className="text-body-sm leading-relaxed text-foreground">
              {d}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-md border border-destructive/25 bg-destructive/5 p-6">
        <div className="mb-4 flex items-center gap-2 text-body-sm font-semibold text-destructive">
          <span className="grid size-5 place-items-center rounded-full bg-destructive/15">
            <X className="size-3.5" />
          </span>
          Don't
        </div>
        <ul className="flex flex-col gap-2.5">
          {donts.map((d) => (
            <li key={d} className="text-body-sm leading-relaxed text-foreground">
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Accessibility notes as a checklist. */
export function A11yList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i} className="flex gap-3 text-body-sm leading-relaxed text-foreground">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
            <Check className="size-3.5" />
          </span>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  )
}

/** A developer callout — gotchas, related components, token mapping. */
export function DevNote({ title = 'Developer note', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border border-s-2 border-s-primary bg-muted/40 p-6">
      <div className="mb-2 flex items-center gap-2 text-body-sm font-semibold text-foreground">
        <Info className="size-4 text-primary" /> {title}
      </div>
      <div className="text-body-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  )
}

/** Inline code token. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  )
}

/**
 * A labelled grid of examples — the canonical way to show every facet of ONE
 * dimension (all variants, all sizes, all states) in a single block instead
 * of one stacked Demo per permutation. Keeps component pages curated.
 *
 * @param minColRem  responsive min column width in rem (auto-fill grid; `layout: 'grid'` only)
 * @param maxCols    hard ceiling on column count (`layout: 'grid'` only). Use for wide
 *                    composite items (Card-like components) whose natural rendered width
 *                    would otherwise get squeezed by auto-fill packing in a 3rd+ column —
 *                    caps the grid at N columns (still degrades to fewer on narrow
 *                    viewports) instead of clipping/overflowing content. Switches the grid
 *                    to `auto-fit` under the hood so it never reserves empty tracks.
 * @param layout     `'grid'` (default) for compact controls that read fine side-by-side
 *                    (buttons, badges, avatars…). `'rows'` for full-width field-style
 *                    components (text inputs, selects, pickers…) — one item per row,
 *                    label at the side, field stretching to fill the width, so it
 *                    renders at (closer to) its real-world size instead of being
 *                    squeezed into a fixed grid column.
 */
export function Gallery({
  items,
  minColRem = 11,
  maxCols,
  layout = 'grid',
}: {
  items: { label: ReactNode; node: ReactNode; caption?: ReactNode }[]
  minColRem?: number
  maxCols?: number
  layout?: 'grid' | 'rows'
}) {
  if (layout === 'rows') {
    return (
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-6">
            <div className="shrink-0 sm:w-40">
              <div className="text-caption font-medium text-foreground">{it.label}</div>
              {it.caption && <div className="text-caption text-muted-foreground">{it.caption}</div>}
            </div>
            <div className="min-w-0 flex-1">{it.node}</div>
          </div>
        ))}
      </div>
    )
  }
  // gap-px below is Tailwind's 1px gap — baked into the calc so a maxCols
  // ceiling accounts for the (maxCols - 1) gaps between columns.
  const colMin = maxCols
    ? `max(${minColRem}rem, calc((100% - ${maxCols - 1}px) / ${maxCols}))`
    : `${minColRem}rem`
  return (
    <div
      className="grid gap-px overflow-hidden rounded-md border border-border bg-border"
      style={{
        gridTemplateColumns: `repeat(${maxCols ? 'auto-fit' : 'auto-fill'}, minmax(${colMin}, 1fr))`,
      }}
    >
      {items.map((it, i) => (
        <div key={i} className="flex flex-col items-stretch gap-3 bg-card p-6">
          <div className="flex min-h-12 flex-1 items-center justify-center">{it.node}</div>
          <div className="text-center">
            <div className="text-caption font-medium text-foreground">{it.label}</div>
            {it.caption && <div className="text-caption text-muted-foreground">{it.caption}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Control definitions driving the interactive Playground. */
export type PlaygroundControl =
  | { name: string; type: 'select'; options: readonly string[]; default: string; label?: string }
  | { name: string; type: 'boolean'; default: boolean; label?: string }
  | { name: string; type: 'text'; default: string; label?: string }

/**
 * An interactive playground — a live component wired to a compact controls
 * bar. Opt-in, reserved for flagship interactive components (Button, Input,
 * Select, DatePicker…) where combining props live earns its keep. Static
 * components use a plain example instead.
 */
export function Playground<T extends Record<string, unknown>>({
  controls,
  children,
  className = '',
}: {
  controls: PlaygroundControl[]
  /** Render prop — receives the live control values. */
  children: (values: T) => ReactNode
  className?: string
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(controls.map((c) => [c.name, c.default])),
  )
  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }))

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className={`flex min-h-40 flex-wrap items-center justify-center gap-4 bg-card p-10 ${className}`}>
        {children(values as T)}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border bg-muted/40 px-4 py-3">
        {controls.map((c) => (
          <label key={c.name} className="flex items-center gap-2 text-body-sm text-foreground">
            <span className="text-caption font-medium text-muted-foreground">{c.label ?? c.name}</span>
            {c.type === 'select' && (
              <select
                value={String(values[c.name])}
                onChange={(e) => set(c.name, e.target.value)}
                className="rounded-sm border border-border bg-background px-2 py-1 text-caption text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {c.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {c.type === 'boolean' && (
              <input
                type="checkbox"
                checked={Boolean(values[c.name])}
                onChange={(e) => set(c.name, e.target.checked)}
                className="size-4 rounded-md border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
            {c.type === 'text' && (
              <input
                type="text"
                value={String(values[c.name])}
                onChange={(e) => set(c.name, e.target.value)}
                className="w-36 rounded-sm border border-border bg-background px-2 py-1 text-caption text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
