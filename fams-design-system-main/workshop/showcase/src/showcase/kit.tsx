import { useState, type ReactNode } from 'react'

/** A top-level documented section with an anchor id for the side nav. */
export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-12 first:pt-4">
      <div className="mb-8">
        <h2 className="text-h3 font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-2 max-w-3xl text-body-md text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-10">{children}</div>
    </section>
  )
}

/** Copy-to-clipboard button — no dependency, resets after a beat. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
      className="rounded-sm px-2 py-1 text-caption font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Copy code"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * A labelled block within a Section (one component or one facet).
 * Pass `code` to attach a "Show code" toggle with a copyable usage snippet —
 * the showcase's answer to "how do I call this component".
 */
export function Demo({
  title,
  hint,
  children,
  code,
  bare = false,
  className = '',
}: {
  title: string
  hint?: string
  children: ReactNode
  /** Usage snippet shown under the preview via a "Show code" toggle. */
  code?: string
  /** Render children without the bordered card frame (for full-bleed layouts). */
  bare?: boolean
  className?: string
}) {
  const [showCode, setShowCode] = useState(false)
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-body-md font-semibold text-foreground">{title}</h3>
        {hint && <span className="text-body-sm text-muted-foreground">{hint}</span>}
        {code && (
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            aria-expanded={showCode}
            className="ms-auto rounded-sm px-2 py-1 text-caption font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showCode ? 'Hide code' : 'Show code'}
          </button>
        )}
      </div>
      <div
        className={
          bare
            ? className
            : `flex flex-wrap items-start gap-4 rounded-md border border-border bg-card p-6 shadow-sm ${code ? 'rounded-b-none border-b-0' : ''} ${className}`
        }
      >
        {children}
      </div>
      {code && showCode && (
        <div className="overflow-hidden rounded-b-md border border-t-0 border-border bg-muted/40">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
              tsx
            </span>
            <CopyButton text={code} />
          </div>
          <pre className="overflow-x-auto p-4 text-body-sm leading-relaxed text-foreground">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

/** Caption under a swatch / example. */
export function Caption({ children }: { children: ReactNode }) {
  return <span className="text-caption text-muted-foreground">{children}</span>
}
