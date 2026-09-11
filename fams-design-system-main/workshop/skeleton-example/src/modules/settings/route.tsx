import { createLazyRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { queryClassOptions } from '@fams/skeleton-kit'

function SettingsPage() {
  // Demonstrates the per-class gcTime helper: 'session' data is retained 30m
  // after it goes inactive.
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => ({ notifications: true, locale: 'en' }),
    ...queryClassOptions('session'),
  })
  return (
    <section>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Settings</h1>
      <pre
        style={{
          padding: '1rem',
          background: 'var(--color-muted)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-foreground)',
        }}
      >
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    </section>
  )
}

export const Route = createLazyRoute('/settings')({ component: SettingsPage })
