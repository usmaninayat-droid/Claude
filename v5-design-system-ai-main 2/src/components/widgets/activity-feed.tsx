import * as React from 'react';
import { Paperclip, Send, X, FileText } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * ActivityFeed — the demos' detail-view timeline: system entries interleaved
 * with user comments (avatar, timestamp, @mention highlighting, attachments)
 * plus a composer with @mention autocomplete and attachment chips.
 *
 * T-086: actor/author prefixes (`system.author` e.g. "System"/"Payroll",
 * `comment.author`) are `font-semibold`, SENTENCE CASE, and inherit the row's
 * own `text-body-sm` — a client review flagged the previous
 * `font-bold uppercase tracking-wide` treatment as unevenly "shouting" next
 * to plain (no-actor) rows in the same list. Note: Truemax's shipped
 * `ticket-detail.tsx` renders BOTH the actor AND the full event sentence
 * uppercase (`SYSTEM` / `STATUS CHANGED TO SCHEDULED.`) — this component
 * never copied that verbatim (body text was already sentence case), so
 * normalizing the actor too is completing an already-partial divergence,
 * not breaking a locked idiom. No `.spec.md` documents the old treatment.
 */

export interface FeedUser {
  id: string;
  name: string;
  role?: string;
  avatarFallback: string;
  color?: string;
}

export interface FeedAttachment {
  name: string;
  size?: string;
}

/** Semantic tone for a system entry's circled icon + action chip. */
export type ActivityTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONE_COLOR: Record<ActivityTone, string> = {
  default: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  danger: 'var(--status-error)',
  info: 'var(--primary)',
};
const toneColor = (t?: ActivityTone) => TONE_COLOR[t ?? 'default'];
const toneTint = (t?: ActivityTone) => `color-mix(in srgb, ${toneColor(t)} 14%, transparent)`;

export type FeedEntry =
  | {
      kind: 'system';
      id: string;
      text: React.ReactNode;
      timestamp?: string;
      /** Icon shown in the circle (inherits the tone colour; defaults to a file glyph). */
      icon?: React.ReactNode;
      iconTone?: ActivityTone;
      /** Bold author name shown before the text. */
      author?: string;
      /** Optional coloured action chip (e.g. VALIDATED / SCHEDULED). */
      chip?: { label: string; tone?: ActivityTone };
      /** Day-group label; a new value inserts a centred date separator above. */
      dateGroup?: string;
    }
  | {
      kind: 'comment';
      id: string;
      author: string;
      avatarFallback: string;
      avatarColor?: string;
      timestamp?: string;
      text: string;
      attachments?: FeedAttachment[];
      isCurrentUser?: boolean;
      dateGroup?: string;
    };

export interface ActivityFeedProps {
  entries: FeedEntry[];
  /** Mentionable users for the composer's @ autocomplete. */
  users?: FeedUser[];
  /** Omit to render the feed read-only (no composer). */
  onSubmit?: (text: string, attachments: FeedAttachment[]) => void;
  placeholder?: string;
  className?: string;
}

/** Highlight @Name mentions for the known users. */
function renderWithMentions(text: string, users: FeedUser[]): React.ReactNode {
  if (!users.length) return text;
  const names = users.map((u) => u.name).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    names.includes(part) ? (
      <span key={i} className="font-semibold text-primary">@{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function Avatar({ fallback, color, size = 28 }: { fallback: string; color?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full text-caption font-bold text-white"
      style={{ width: size, height: size, background: color ?? 'var(--primary)' }}
    >
      {fallback}
    </span>
  );
}

export function ActivityFeed({
  entries,
  users = [],
  onSubmit,
  placeholder = 'Write a comment… use @ to mention',
  className,
}: ActivityFeedProps) {
  const [text, setText] = React.useState('');
  const [attachments, setAttachments] = React.useState<FeedAttachment[]>([]);
  const [mentionQ, setMentionQ] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest entry.
  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [entries.length]);

  const onTextChange = (v: string) => {
    setText(v);
    // Trailing "@word" → open the mention dropdown.
    const m = /@([\w ]*)$/.exec(v);
    setMentionQ(m ? m[1] : null);
  };

  const mentionMatches =
    mentionQ != null
      ? users.filter((u) => u.name.toLowerCase().includes(mentionQ.toLowerCase())).slice(0, 6)
      : [];

  const insertMention = (u: FeedUser) => {
    setText((t) => t.replace(/@([\w ]*)$/, `@${u.name} `));
    setMentionQ(null);
  };

  const submit = () => {
    if (!text.trim() && !attachments.length) return;
    onSubmit?.(text.trim(), attachments);
    setText('');
    setAttachments([]);
    setMentionQ(null);
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {/* Entries */}
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1">
        {entries.flatMap((e, i) => {
          const prev = entries[i - 1];
          const sep =
            e.dateGroup && e.dateGroup !== prev?.dateGroup ? (
              <div key={`sep-${e.id}`} className="flex justify-center py-0.5">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-medium text-muted-foreground">
                  {e.dateGroup}
                </span>
              </div>
            ) : null;
          const row =
            e.kind === 'system' ? (
              <div key={e.id} className="flex items-center gap-2.5">
                {/* Neutral circled marker — color lives in the action chip, not the icon
                    (matches the canonical timeline; icons read as a restrained gray rail). */}
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
                  {e.icon ?? <FileText size={13} />}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-1.5 text-body-sm">
                  {e.author ? <span className="shrink-0 font-semibold text-foreground">{e.author}</span> : null}
                  <span className="truncate text-muted-foreground">{e.text}</span>
                  {/* The chip/value trails the action phrase ("moved to [STAGE]",
                      "changed severity to [CRITICAL]") — matches the canonical timeline. */}
                  {e.chip ? (
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-caption font-bold uppercase tracking-wide"
                      style={{ background: toneTint(e.chip.tone), color: toneColor(e.chip.tone) }}
                    >
                      {e.chip.label}
                    </span>
                  ) : null}
                  {e.timestamp ? (
                    <span className="ml-auto shrink-0 text-caption text-muted-foreground">{e.timestamp}</span>
                  ) : null}
                </div>
              </div>
            ) : (
            <div key={e.id} className="flex gap-2.5">
              <Avatar fallback={e.avatarFallback} color={e.avatarColor} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-body-sm font-semibold text-foreground">{e.author}</span>
                  {e.timestamp ? <span className="shrink-0 text-caption text-muted-foreground">{e.timestamp}</span> : null}
                </div>
                {/* Your own messages carry a primary left-accent bar on the bubble;
                    everyone else's render as a plain bordered bubble. Both sit on a white
                    card — the accent bar is the only differentiator (matches canonical). */}
                <div
                  className={cn(
                    'mt-0.5 rounded-lg border border-border bg-card px-3 py-2 text-body-sm text-foreground',
                    e.isCurrentUser && 'border-l-[3px] border-l-primary',
                  )}
                >
                  {renderWithMentions(e.text, users)}
                </div>
                {e.attachments?.length ? (
                  <div className="mt-1.5 flex flex-col gap-1">
                    {e.attachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-caption text-muted-foreground">
                        <Paperclip size={11} />
                        <span className="truncate text-foreground">{a.name}</span>
                        {a.size ? <span>· {a.size}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            );
          return [sep, row].filter(Boolean);
        })}
        {!entries.length ? (
          <div className="py-6 text-center text-body-sm text-muted-foreground">No activity yet.</div>
        ) : null}
      </div>

      {/* Composer */}
      {onSubmit ? (
        <div className="relative mt-3 shrink-0 border-t border-border pt-3">
          {/* Mention dropdown — anchored above the input. */}
          {mentionMatches.length ? (
            <div className="absolute bottom-full left-0 z-10 mb-1 w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
              {mentionMatches.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => insertMention(u)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted"
                >
                  <Avatar fallback={u.avatarFallback} color={u.color} size={24} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-foreground">{u.name}</span>
                    {u.role ? <span className="text-caption text-muted-foreground">{u.role}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {attachments.length ? (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {attachments.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-caption font-medium text-secondary-foreground">
                  <Paperclip size={10} />
                  {a.name}
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2">
            <textarea
              rows={2}
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && mentionMatches.length === 0) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={placeholder}
              className="min-h-[40px] flex-1 resize-none bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].map((f) => ({
                  name: f.name,
                  size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
                }));
                setAttachments((prev) => [...prev, ...files]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              aria-label="Attach files"
              onClick={() => fileRef.current?.click()}
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Paperclip size={15} />
            </button>
            <button
              type="button"
              aria-label="Send comment"
              onClick={submit}
              disabled={!text.trim() && !attachments.length}
              className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
