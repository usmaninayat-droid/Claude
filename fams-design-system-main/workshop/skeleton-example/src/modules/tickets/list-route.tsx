import { createLazyRoute, Link, useSearch } from '@tanstack/react-router'
import type { TicketsSearch } from './index'

const TICKETS = [
  { id: 't-1', title: 'Printer offline in HQ' },
  { id: 't-2', title: 'VPN certificate expiring' },
  { id: 't-3', title: 'Onboard new fleet driver' },
]

const linkStyle: React.CSSProperties = {
  color: 'var(--color-primary)',
}

function TicketsListPage() {
  // `strict: false` because this example composes its router from a runtime
  // module array rather than a single statically-registered route tree (see
  // @fams/skeleton-kit's README § the lazy-route trap for the same reason
  // `router.load()` must be awaited) — so there is no global `Register`
  // augmentation for `useSearch({ from: '/tickets' })` to key off. The search
  // object is still the one `ticketsValidateSearch` produced: parsed and
  // guaranteed valid before this lazy chunk ever loaded.
  const search = useSearch({ strict: false }) as Partial<TicketsSearch>
  const page = search.page ?? 1

  return (
    <section>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Tickets</h1>
      <p style={{ color: 'var(--color-muted-foreground)' }}>Page {page}</p>
      <ul>
        {TICKETS.map((ticket) => (
          <li key={ticket.id}>
            <Link to="/tickets/$ticketId" params={{ ticketId: ticket.id }} style={linkStyle}>
              {ticket.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

// createLazyRoute id must match the route path skeleton-kit registers
// (this module's `navEntry.path`).
export const Route = createLazyRoute('/tickets')({ component: TicketsListPage })
