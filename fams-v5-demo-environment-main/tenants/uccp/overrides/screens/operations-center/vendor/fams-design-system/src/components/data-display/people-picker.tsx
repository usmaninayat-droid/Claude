import * as React from 'react';
import { Search, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { cn } from '../utils/cn';

/**
 * PeoplePicker — a searchable people selector (Pipeline V5 "Assignee field").
 *
 * A trigger (avatar(s) + name, or an unassigned dot) opens a popover with a
 * search box, the current user pinned as "You", a section label (+ Select All
 * in multi mode), and a list of avatar · name · email rows with a check.
 *
 * `mode='single'` (Owner / Created By): picking one replaces the value and
 * closes — radio-style. `mode='multi'` (Assignee): toggles a set of ids.
 * Token-only styling; avatar colors come from the categorical chart palette.
 */

export interface Person {
  id: string;
  name: string;
  email?: string;
  /** Optional explicit avatar color; otherwise derived from the id. */
  color?: string;
}

const AVATAR_PALETTE = ['var(--chart-3)', 'var(--chart-1)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)'];
function colorFor(p: Person): string {
  if (p.color) return p.color;
  let h = 0;
  for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function Avatar({ person, size = 28 }: { person: Person; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: colorFor(person), width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden
    >
      {person.name.charAt(0).toUpperCase()}
    </span>
  );
}

export interface PeoplePickerProps {
  people: Person[];
  /** Selected id (single) or ids (multi). */
  value: string | string[];
  onChange: (value: string | string[]) => void;
  mode?: 'single' | 'multi';
  /** Pins this person to the top as "You". */
  currentUserId?: string;
  /** Section label under the "You" row (e.g. "Owner", "Assignee"). */
  label?: string;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  align?: 'start' | 'end';
}

export function PeoplePicker({
  people,
  value,
  onChange,
  mode = 'single',
  currentUserId,
  label = 'Assignee',
  placeholder = 'Unassigned',
  align = 'start',
}: PeoplePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');

  const selected = mode === 'multi' ? (Array.isArray(value) ? value : []) : value ? [String(value)] : [];
  const byId = React.useMemo(() => new Map(people.map((p) => [p.id, p] as const)), [people]);
  const isOn = (id: string) => selected.includes(id);

  const toggle = (id: string) => {
    if (mode === 'single') {
      onChange(id);
      setOpen(false);
      return;
    }
    onChange(isOn(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const matches = (p: Person) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.email ?? '').toLowerCase().includes(q.toLowerCase());
  const you = currentUserId ? byId.get(currentUserId) : undefined;
  const others = people.filter((p) => p.id !== currentUserId && matches(p));

  const allOn = others.length > 0 && others.every((p) => isOn(p.id));
  const selectAll = () =>
    onChange(
      allOn
        ? selected.filter((s) => !others.some((p) => p.id === s))
        : Array.from(new Set([...selected, ...others.map((p) => p.id)])),
    );

  const chosen = selected.map((id) => byId.get(id)).filter(Boolean) as Person[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-full items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {chosen.length ? (
            <span className="flex shrink-0 items-center -space-x-1.5">
              {chosen.slice(0, 3).map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-card">
                  <Avatar person={p} size={24} />
                </span>
              ))}
            </span>
          ) : (
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/50 text-[10px] font-bold text-muted-foreground">
              ?
            </span>
          )}
          <span className="truncate text-body-sm font-medium text-foreground">
            {chosen.length
              ? mode === 'single'
                ? chosen[0].name
                : `${chosen.length} selected`
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-auto p-1.5">
          {you ? <PersonRow person={you} youLabel on={isOn(you.id)} mode={mode} onClick={() => toggle(you.id)} /> : null}
          <div className="flex items-center justify-between px-2 pb-1 pt-2">
            <span className="text-caption font-semibold text-muted-foreground">{label}</span>
            {mode === 'multi' && others.length ? (
              <button type="button" onClick={selectAll} className="text-caption font-semibold text-primary hover:underline">
                {allOn ? 'Clear all' : 'Select All'}
              </button>
            ) : null}
          </div>
          {others.length ? (
            others.map((p) => <PersonRow key={p.id} person={p} on={isOn(p.id)} mode={mode} onClick={() => toggle(p.id)} />)
          ) : (
            <div className="px-2 py-3 text-center text-body-sm text-muted-foreground">No people found</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PersonRow({
  person,
  on,
  mode,
  youLabel,
  onClick,
}: {
  person: Person;
  on: boolean;
  mode: 'single' | 'multi';
  youLabel?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted"
    >
      <span
        className={cn(
          'flex size-[18px] shrink-0 items-center justify-center border',
          mode === 'single' ? 'rounded-full' : 'rounded-[4px]',
          on ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
        )}
      >
        {on ? mode === 'single' ? <span className="size-2 rounded-full bg-current" /> : <Check size={12} /> : null}
      </span>
      <Avatar person={person} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium text-foreground">
          {youLabel ? 'You' : person.name}
        </span>
        {person.email ? <span className="block truncate text-caption text-muted-foreground">{person.email}</span> : null}
      </span>
    </button>
  );
}
