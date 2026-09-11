import { createLazyRoute, Link, useParams } from '@tanstack/react-router'

const linkStyle: React.CSSProperties = {
  color: 'var(--color-primary)',
}

function TicketDetailPage() {
  // `strict: false` for the same reason as `list-route.tsx` — see its comment.
  const params = useParams({ strict: false }) as { ticketId?: string }

  return (
    <section>
      <p>
        <Link to="/tickets" style={linkStyle}>
          &larr; Back to tickets
        </Link>
      </p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Ticket {params.ticketId}</h1>
      <p style={{ color: 'var(--color-muted-foreground)' }}>
        This is its own route (`/tickets/$ticketId`), registered via the module's
        `additionalRoutes` and code-split into its own chunk — separate from the list
        route's chunk.
      </p>
    </section>
  )
}

// createLazyRoute id must match this entry's path in the module's `additionalRoutes`.
export const Route = createLazyRoute('/tickets/$ticketId')({ component: TicketDetailPage })
