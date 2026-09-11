// Renders a component FAMILY: a slim tab strip (when the family has more than
// one member) plus the active member's demo. A single-member family ("standalone"
// item) renders with no tab strip at all — just the demo, same as before the
// family restructure.
import type { Family } from './registry'

export function FamilyPage({
  family,
  activeMemberId,
  onSelectMember,
}: {
  family: Family
  activeMemberId: string
  onSelectMember: (memberId: string) => void
}) {
  const active = family.members.find((m) => m.id === activeMemberId) ?? family.members[0]
  const ActiveDemo = active.Demo

  if (family.members.length <= 1) {
    return <ActiveDemo />
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-h1 font-bold leading-tight tracking-tight text-foreground">{family.label}</h1>
        {family.intro && (
          <p className="mt-3 max-w-[62ch] text-body-lg leading-relaxed text-muted-foreground">{family.intro}</p>
        )}
      </div>

      <div role="tablist" aria-label={family.label} className="flex flex-wrap gap-1 border-b border-border">
        {family.members.map((m) => {
          const isActive = m.id === active.id
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectMember(m.id)}
              className={
                '-mb-px border-b-2 px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                (isActive
                  ? 'border-b-primary text-foreground'
                  : 'border-b-transparent text-muted-foreground hover:text-foreground')
              }
            >
              {m.label}
            </button>
          )
        })}
      </div>

      <ActiveDemo />
    </div>
  )
}
