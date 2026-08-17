import * as React from 'react';
import { Plus, Search, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';

/**
 * AssigneePicker — the demo's TechnicianAssignDropdown: when unassigned, a
 * dashed "+ Assign" chip opens a searchable dropdown of people (24px avatar +
 * name + role); when assigned, the avatar + name render with an optional
 * clear (×). Generic over any people list (technicians, AEs, drivers…).
 */

export interface Assignee {
  id: string;
  name: string;
  role?: string;
  avatarFallback: string;
  color?: string;
}

export interface AssigneePickerProps {
  people: Assignee[];
  /** Currently assigned person (id). Omit/null = unassigned. */
  value?: string | null;
  onAssign: (person: Assignee) => void;
  /** Provide to allow clearing the assignment. */
  onClear?: () => void;
  /** Lock the control (closed records). */
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function PersonAvatar({ p, size = 24 }: { p: Assignee; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full text-caption font-semibold text-white"
      style={{ width: size, height: size, background: p.color ?? 'var(--primary)' }}
    >
      {p.avatarFallback}
    </span>
  );
}

export function AssigneePicker({
  people,
  value,
  onAssign,
  onClear,
  disabled,
  placeholder = 'Assign',
  className,
}: AssigneePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const current = people.find((p) => p.id === value) ?? null;
  const filtered = people.filter((p) =>
    `${p.name} ${p.role ?? ''}`.toLowerCase().includes(q.toLowerCase())
  );

  if (current && disabled) {
    return (
      <span className={cn('flex items-center gap-2', className)}>
        <PersonAvatar p={current} />
        <span className="text-body-sm font-semibold text-foreground">{current.name}</span>
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <PopoverTrigger asChild disabled={disabled}>
        {current ? (
          <button
            type="button"
            className={cn(
              'group flex items-center gap-2 rounded-md px-1 py-0.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
              className
            )}
            aria-label={`Assigned to ${current.name} — change`}
          >
            <PersonAvatar p={current} />
            <span className="text-body-sm font-semibold text-foreground">{current.name}</span>
            {onClear ? (
              <span
                role="button"
                aria-label="Clear assignment"
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="grid size-4 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              >
                <X size={10} />
              </span>
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 rounded-full border border-dashed border-primary/50 py-1 pl-1.5 pr-2.5 text-caption font-semibold text-primary outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
              className
            )}
            aria-label="Assign"
          >
            <span className="grid size-5 place-items-center rounded-full border border-dashed border-primary/50">
              <Plus size={11} />
            </span>
            {placeholder}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="relative border-b border-border p-2">
          <Search size={14} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="h-8 w-full rounded-md bg-muted/50 pl-7 pr-2 text-body-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-56 overflow-auto p-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onAssign(p); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted"
            >
              <PersonAvatar p={p} size={28} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-foreground">{p.name}</span>
                {p.role ? <span className="truncate text-caption text-muted-foreground">{p.role}</span> : null}
              </span>
            </button>
          ))}
          {!filtered.length ? (
            <div className="px-2 py-3 text-center text-caption text-muted-foreground">No matches.</div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
