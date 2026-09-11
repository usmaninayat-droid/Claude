import { createLazyRoute } from '@tanstack/react-router'
import { useTheme } from '@fams/skeleton-kit'

const buttonStyle: React.CSSProperties = {
  cursor: 'pointer',
  padding: '0.5rem 0.875rem',
  fontSize: '0.875rem',
  background: 'var(--color-primary)',
  color: 'var(--color-primary-foreground)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
}

function DashboardPage() {
  const { theme, toggleTheme } = useTheme()
  return (
    <section>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Dashboard</h1>
      <p style={{ color: 'var(--color-muted-foreground)' }}>
        Current theme: <strong>{theme}</strong>
      </p>
      <button type="button" style={buttonStyle} onClick={toggleTheme}>
        Toggle theme
      </button>
    </section>
  )
}

// createLazyRoute id must match the route path skeleton-kit registers.
export const Route = createLazyRoute('/dashboard')({ component: DashboardPage })
