import { useMemo, useRef, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import {
  ActivityFeed,
  mentionsUser,
  renderLogText,
  renderMentions,
  type ActivityAttachment,
  type ActivityEntry,
  type ActivityTone,
} from './ActivityFeed';
import type { RecordComment } from '../data/comments';

/**
 * RecordActivityPanel — the record-detail right panel's Timeline tab.
 *
 * PORTED from `fams-design-system/packages/v5-templates/src/views/task-detail/
 * ActivityCommentFeed.tsx`: same seed-row → `ActivityEntry` mapping, same
 * `Intl` date-group / time formats ("18 May, 2025" · "9:49 am"), same
 * oldest-first ordering with optimistic posts appended at the bottom, same
 * "accent ONLY the comment that @-mentions the current user" rule, same
 * staged-attachment flow. Posts are local/in-memory (web Rule 8) — the demo
 * store never round-trips them.
 */

export interface ActivityLogRow {
  id: string;
  actor?: string;
  /** May contain `**bold**` value emphasis. */
  text: string;
  at: string;
  /** 'added' renders the Plus glyph, anything else the Pencil (as on the web). */
  icon?: 'added' | 'updated';
  /** Solid uppercase chip after the actor name (the status the record moved to). */
  badge?: { label: string; tone?: ActivityTone };
  /** Trailing flag + tonal label ("changed severity to ⚑ CRITICAL"). */
  severity?: { label: string; tone?: ActivityTone };
}

export interface RecordActivityPanelProps {
  logs: ActivityLogRow[];
  comments: RecordComment[];
  /** Drives the "@mentions you" accent rule and authors optimistic posts. */
  currentUser: string;
}

const DATE_GROUP_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const YEAR_FORMAT = new Intl.DateTimeFormat('en-GB', { year: 'numeric' });
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

function dateGroupOf(at: string | undefined, now: Date): string {
  if (!at) return 'Earlier';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  return date.toDateString() === now.toDateString()
    ? 'Today'
    : `${DATE_GROUP_FORMAT.format(date)}, ${YEAR_FORMAT.format(date)}`;
}

function timeOf(at: string | undefined): string | undefined {
  if (!at) return undefined;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? undefined : TIME_FORMAT.format(date);
}

export function RecordActivityPanel({ logs, comments, currentUser }: RecordActivityPanelProps) {
  const [posted, setPosted] = useState<ActivityEntry[]>([]);
  const [staged, setStaged] = useState<ActivityAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const now = useMemo(() => new Date(), []);

  const seeded = useMemo<ActivityEntry[]>(() => {
    const rows: ActivityEntry[] = [
      ...logs.map(
        (row): ActivityEntry => ({
          id: row.id,
          kind: 'system',
          author: row.actor,
          text: renderLogText(row.text, row.severity),
          timestamp: timeOf(row.at),
          dateGroup: dateGroupOf(row.at, now),
          icon: row.icon === 'added' ? <Plus /> : <Pencil />,
          badge: row.badge,
          tone: row.badge?.tone,
        }),
      ),
      ...comments.map(
        (row): ActivityEntry => ({
          id: row.id,
          kind: 'comment',
          author: row.actor,
          text: renderMentions(row.text),
          timestamp: timeOf(row.at),
          dateGroup: dateGroupOf(row.at, now),
          // Accent ONLY the comment that @-mentions the current user.
          accented: mentionsUser(row.text, currentUser),
        }),
      ),
    ];
    // Oldest-first (the Figma Incident Task Detail Timeline read order): the
    // oldest entry and date group read first, new posts append at the bottom.
    const order = new Map<string, string>();
    [...logs, ...comments].forEach((row) => order.set(row.id, row.at));
    return rows.sort((a, b) => String(order.get(a.id) ?? '').localeCompare(String(order.get(b.id) ?? '')));
  }, [logs, comments, currentUser, now]);

  const entries = useMemo(() => [...seeded, ...posted], [seeded, posted]);

  const post = (text: string) => {
    setPosted((prev) => [
      ...prev,
      {
        id: `posted-${Date.now()}-${prev.length}`,
        kind: 'comment' as const,
        author: currentUser,
        text: renderMentions(text),
        timestamp: TIME_FORMAT.format(new Date()),
        dateGroup: 'Today',
        accented: mentionsUser(text, currentUser),
        attachments: staged.length ? staged : undefined,
      },
    ]);
    setStaged([]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ActivityFeed
        className="min-h-0 flex-1"
        entries={entries}
        uppercaseAuthors
        stickyComposer
        onSubmit={post}
        onAttach={() => fileInputRef.current?.click()}
        stagedAttachments={staged}
        onRemoveStagedAttachment={(name) => setStaged((prev) => prev.filter((a) => a.name !== name))}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        aria-label="Attach a file"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            setStaged((prev) =>
              prev.some((a) => a.name === file.name)
                ? prev
                : [...prev, { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` }],
            );
          }
          event.target.value = '';
        }}
      />
    </div>
  );
}
