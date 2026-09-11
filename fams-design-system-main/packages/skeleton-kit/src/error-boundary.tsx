import { Component, type ComponentType, type CSSProperties, type ErrorInfo, type ReactNode } from 'react'

export interface ErrorFallbackProps {
  error: Error
  /** Clears the caught error and re-renders the subtree. */
  reset: () => void
}

// Token-driven inline styles: reference @fams/tokens CSS variables directly so
// the fallback themes (light/dark/tenant) without skeleton-kit depending on
// Tailwind. The consuming app imports the token CSS; these vars resolve at runtime.
const cardStyle: CSSProperties = {
  maxWidth: '32rem',
  margin: '4rem auto',
  padding: 'var(--spacing-section, 1.5rem)',
  background: 'var(--color-card, #fff)',
  color: 'var(--color-card-foreground, #111)',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: 'var(--radius-md, 0.375rem)',
  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
}
const titleStyle: CSSProperties = {
  margin: 0,
  marginBottom: '0.5rem',
  fontSize: '1.125rem',
  fontWeight: 600,
  color: 'var(--color-destructive, #dc2626)',
}
const messageStyle: CSSProperties = {
  margin: 0,
  marginBottom: '1rem',
  fontSize: '0.875rem',
  color: 'var(--color-muted-foreground, #6b7280)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}
const buttonStyle: CSSProperties = {
  appearance: 'none',
  cursor: 'pointer',
  padding: '0.5rem 0.875rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  background: 'var(--color-primary, #111)',
  color: 'var(--color-primary-foreground, #fff)',
  border: 'none',
  borderRadius: 'var(--radius-md, 0.375rem)',
}

/** Default token-styled fallback used by both the root boundary and route errors. */
export function DefaultErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div role="alert" style={cardStyle}>
      <h2 style={titleStyle}>Something went wrong</h2>
      <p style={messageStyle}>{error.message || 'An unexpected error occurred.'}</p>
      <button type="button" style={buttonStyle} onClick={reset}>
        Try again
      </button>
    </div>
  )
}

interface RootErrorBoundaryProps {
  children: ReactNode
  /** Override the fallback UI. Receives the caught error and a reset callback. */
  fallback?: ComponentType<ErrorFallbackProps>
  /** Optional side-effect hook (e.g. logging) when an error is caught. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface RootErrorBoundaryState {
  error: Error | null
}

/** App-root error boundary. Catches render errors below it and shows a fallback. */
export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error) {
      const Fallback = this.props.fallback ?? DefaultErrorFallback
      return <Fallback error={this.state.error} reset={this.reset} />
    }
    return this.props.children
  }
}
