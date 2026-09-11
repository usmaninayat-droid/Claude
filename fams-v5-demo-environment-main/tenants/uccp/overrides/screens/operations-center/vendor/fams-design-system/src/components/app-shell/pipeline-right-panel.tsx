import * as React from 'react';
import { Clock, MessageSquare, Link2, Paperclip, Circle, PlusCircle, Pencil } from 'lucide-react';
import type { ActivityTone } from '../widgets';
import { cn } from '../utils/cn';
import { Timeline } from '../data-display';
import { ActivityFeed } from '../widgets';
import type { FeedEntry } from '../widgets';
import { AttachmentDrop } from './task-detail';
import type { EntityConfig, EntityRecord } from '../../sim/engine/types';

/**
 * Config-driven right panel for the dynamic pipeline (task) detail — the
 * Jira / ClickUp "issue side panel" rendered in V5.
 *
 * A pipeline module's `profile.rightPanel.tabs` (JSON config) names a set of
 * tabs; each tab's `component` resolves here to a built-in panel renderer.
 * Built-ins: **Timeline** (stage history) · **Activity** (event/comment feed) ·
 * **Linked** (related records via reference fields) · **Attachments** (notes +
 * files). Unknown names degrade to a friendly placeholder. The whole thing is
 * config — no per-product React.
 */

export interface RightPanelContext {
  config: EntityConfig;
  record: EntityRecord;
  /** Resolve a reference value (id) to a display label. */
  refLabel?: (col: string, value: unknown) => string;
}

export interface RightPanelTabDef {
  key: string;
  title: React.ReactNode;
  render: () => React.ReactNode;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

interface StageDef {
  key: string;
  label: string;
  color?: string;
}

function stages(config: EntityConfig) {
  return (config.uiConfig.statusList ?? []) as StageDef[];
}

function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <div className="px-1 py-8 text-center text-caption text-muted-foreground">{children}</div>;
}

/* ── built-in panels ─────────────────────────────────────────────────────── */

/** Stage-progression timeline derived from `statusList` + the current stage. */
export function PipelineTimelinePanel({ config, record }: RightPanelContext) {
  const list = stages(config);
  const idx = list.findIndex((s) => s.key === record.status);
  if (!list.length) return <PanelEmpty>No stages configured.</PanelEmpty>;
  return (
    <Timeline
      items={list.map((s, i) => ({
        id: s.key,
        title: s.label,
        subtitle: i < idx ? 'Completed' : i === idx ? 'Current stage' : 'Pending',
        color: i <= idx ? s.color ?? 'var(--primary)' : 'var(--muted-foreground)',
      }))}
    />
  );
}

/** Map a stage's position to a semantic tone for its timeline icon + chip. */
function stageTone(index: number, total: number): ActivityTone {
  if (total <= 1) return 'info';
  if (index >= total - 1) return 'success'; // final stage
  if (index === 0) return 'default';        // first stage
  return index === 1 ? 'info' : 'warning';  // mid stages
}

/** Event/comment feed. Synthesises stage events (per-type circled icons + action
 *  chips + day separators); accepts user comments (local, image/initial avatars). */
export function ActivityPanel({ config, record }: RightPanelContext) {
  const list = stages(config);
  const idx = list.findIndex((s) => s.key === record.status);
  const noun = config.name.replace(/s$/, '');
  const base: FeedEntry[] = [
    {
      kind: 'system',
      id: 'created',
      icon: <PlusCircle size={13} />,
      iconTone: 'info',
      text: `${noun} created`,
      dateGroup: 'Earlier',
    },
    ...list.slice(1, Math.max(1, idx + 1)).map((s, i): FeedEntry => {
      const stageIndex = i + 1; // slice started at 1
      const tone = stageTone(stageIndex, list.length);
      const isLatest = stageIndex === idx;
      return {
        kind: 'system',
        id: `mv-${s.key}`,
        icon: <Pencil size={12} />,
        iconTone: tone,
        text: 'moved this work order to',
        chip: { label: s.label, tone },
        timestamp: isLatest ? 'just now' : undefined,
        dateGroup: 'Today',
      };
    }),
  ];
  const [entries, setEntries] = React.useState<FeedEntry[]>(base);
  // Reset when the record changes.
  React.useEffect(() => setEntries(base), [record.id, record.status]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ActivityFeed
      entries={entries}
      onSubmit={(text) =>
        setEntries((prev) => [
          ...prev,
          { kind: 'comment', id: `c-${Date.now()}`, author: 'You', avatarFallback: 'YO', text, timestamp: 'just now', isCurrentUser: true, dateGroup: 'Today' },
        ])
      }
    />
  );
}

/** Related records via reference fields (Single/MultiReference systemcolumns). */
export function LinkedItemsPanel({ config, record, refLabel }: RightPanelContext) {
  const refs = config.systemcolumns.filter((c) => c.type === 'SingleReference' || c.type === 'MultiReference');
  const rows = refs
    .map((c) => {
      const raw = record[c.col];
      const values = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : [];
      return { col: c.col, label: c.name, values };
    })
    .filter((r) => r.values.length);
  if (!rows.length) return <PanelEmpty>No linked items.</PanelEmpty>;
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <div key={r.col} className="flex flex-col gap-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {r.values.map((v, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-caption font-medium text-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                {refLabel ? refLabel(r.col, v) : String(v)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Notes + attachments (ephemeral demo state). */
export function AttachmentsPanel(_: RightPanelContext) {
  const [note, setNote] = React.useState('');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="min-h-[88px] w-full resize-y rounded-md border border-border bg-card p-2.5 text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <AttachmentDrop />
    </div>
  );
}

/* ── registry + tabbed wrapper ───────────────────────────────────────────── */

/** Map a configured tab (`component` name / key) to a built-in panel renderer. */
export function resolveRightPanelTab(
  tab: { key: string; title: React.ReactNode; component?: string },
  ctx: RightPanelContext,
): RightPanelTabDef {
  const name = `${tab.component ?? ''} ${tab.key ?? ''}`.toLowerCase();
  const render = () => {
    if (name.includes('timeline')) return <PipelineTimelinePanel {...ctx} />;
    if (name.includes('activ')) return <ActivityPanel {...ctx} />;
    if (name.includes('link')) return <LinkedItemsPanel {...ctx} />;
    if (name.includes('attach') || name.includes('note') || name.includes('file')) return <AttachmentsPanel {...ctx} />;
    return <PanelEmpty>No panel renderer for “{tab.title}”.</PanelEmpty>;
  };
  return { key: tab.key, title: tab.title, render };
}

/** Icon for a right-panel tab, derived from its key (timeline / activity / linked / files). */
function tabIcon(key: string) {
  const k = key.toLowerCase();
  if (k.includes('timeline')) return Clock;
  if (k.includes('activ')) return MessageSquare;
  if (k.includes('link')) return Link2;
  if (k.includes('attach') || k.includes('file') || k.includes('note')) return Paperclip;
  return Circle;
}

/** The tab strip — rendered into TaskDetail's right-panel header slot. Desktop shows
 *  TEXT labels; on small viewports the tabs collapse to ICON-ONLY (the icon is the
 *  small-viewport treatment, not shown alongside the label). Title tooltip carries the
 *  full label when icon-only. */
export function RightPanelTabStrip({
  tabs,
  active,
  onChange,
}: {
  tabs: RightPanelTabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="-my-1 flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
      {tabs.map((t) => {
        const Icon = tabIcon(t.key);
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => onChange(t.key)}
            title={typeof t.title === 'string' ? t.title : undefined}
            className={cn(
              '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2 text-caption font-semibold outline-none transition-colors',
              active === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {/* Icon is the small-viewport treatment only; desktop shows the text label. */}
            <Icon className="size-4 shrink-0 md:hidden" aria-hidden />
            <span className="hidden md:inline">{t.title}</span>
          </button>
        );
      })}
    </div>
  );
}
