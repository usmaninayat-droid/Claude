import { useState } from 'react'
import { MapPin, Tag, Flag, Calendar, Container, Clock, Hash } from '@fams/ui-kit/icons'
import {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  type KanbanCardAvatar,
  type KanbanTone,
  type KanbanCardSize,
} from '../../../../packages/ui-kit/src/composites/Kanban'
import { Badge, LiveDurationCard } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

// Domain-agnostic inline SVG placeholder — no network calls, no CSP issues
// (same pattern as ImageGalleryDemo/FileUploaderDemo).
function placeholderImage(label: string, bg: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#ffffff">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

type DemoPriority = 'low' | 'medium' | 'high'

const PRIORITY_BADGE: Record<DemoPriority, { variant: 'muted' | 'warning' | 'destructive'; label: string }> = {
  low: { variant: 'muted', label: 'Low' },
  medium: { variant: 'warning', label: 'Medium' },
  high: { variant: 'destructive', label: 'High' },
}

/**
 * KanbanDemo — reference-template conversion of the Kanban composite
 * showcase (KanbanBoard/KanbanColumn/KanbanCard). RTL is proven by the
 * global header switcher, not a per-page block. The drag-and-drop board is
 * a genuine interactive example — kept as a Preview, per the template's
 * carve-out for interaction-heavy components where a props Playground
 * doesn't fit.
 */

interface DemoCard {
  id: string
  title: string
  tone?: KanbanTone
  ticketId?: string
  priority?: DemoPriority
  metadataFields?: { icon: 'tag' | 'pin'; label: string }[]
  avatars?: KanbanCardAvatar[]
  dueDate?: string
  overdue?: boolean
}

type BoardState = Record<string, DemoCard[]>

const INITIAL_BOARD: BoardState = {
  backlog: [
    {
      id: 'card-1',
      title: 'Deep washing pads — master data',
      tone: 'neutral',
      ticketId: 'WO-1030',
      priority: 'low',
      metadataFields: [{ icon: 'tag', label: 'IWMP · Lot 7' }],
    },
    {
      id: 'card-2',
      title: 'GPS root cause — AMC vs hardware',
      tone: 'danger',
      ticketId: 'WO-1042',
      priority: 'high',
      metadataFields: [{ icon: 'pin', label: 'Northern AUH' }],
      avatars: [{ name: 'Zain Uddin' }],
      dueDate: 'Overdue 2d',
      overdue: true,
    },
  ],
  inProgress: [
    {
      id: 'card-3',
      title: 'Dispatcher dashboard (M3)',
      tone: 'warning',
      ticketId: 'WO-1055',
      priority: 'medium',
      metadataFields: [{ icon: 'tag', label: 'Sprint 26.18' }],
      avatars: [{ name: 'Kashish Bindrani' }, { name: 'Emmad Ahmad' }],
      dueDate: 'Due Jul 28',
    },
  ],
  done: [
    {
      id: 'card-4',
      title: 'Driver checklist dashboard',
      tone: 'success',
      ticketId: 'WO-1011',
      priority: 'low',
      metadataFields: [{ icon: 'tag', label: 'FM-4211' }],
      avatars: [{ name: 'Saed Salah' }],
      dueDate: 'Closed Jul 20',
    },
  ],
}

const COLUMN_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  inProgress: 'In progress',
  done: 'Done',
}

const TONES: KanbanTone[] = ['neutral', 'primary', 'info', 'success', 'warning', 'danger']

function fieldIcon(icon: 'tag' | 'pin') {
  return icon === 'tag' ? <Tag className="size-3.5" /> : <MapPin className="size-3.5" />
}

function moveCard(board: BoardState, cardId: string, fromColumnId: string, toColumnId: string, toIndex: number): BoardState {
  const fromCards = [...(board[fromColumnId] ?? [])]
  const cardIndex = fromCards.findIndex((card) => card.id === cardId)
  if (cardIndex === -1) return board
  const [card] = fromCards.splice(cardIndex, 1)
  const toCards = fromColumnId === toColumnId ? fromCards : [...(board[toColumnId] ?? [])]
  toCards.splice(toIndex, 0, card)
  return { ...board, [fromColumnId]: fromCards, [toColumnId]: toCards }
}

export default function KanbanDemo() {
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD)

  const handleCardMove = (cardId: string, fromColumnId: string, toColumnId: string, toIndex: number) => {
    setBoard((current) => moveCard(current, cardId, fromColumnId, toColumnId, toIndex))
  }

  return (
    <DocPage
      title="Kanban"
      badge="stable"
      summary="KanbanBoard/KanbanColumn/KanbanCard — a drag-and-drop board built on @hello-pangea/dnd. The board owns no state: it only translates a drag into onCardMove(cardId, fromColumnId, toColumnId, toIndex); the app commits the move and re-renders with new props. Tone resolves to status tokens only, never a raw hex."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Drag a card between columns, or reorder within one — try both mouse and keyboard (Space
          to lift, arrow keys to move, Space to drop).
        </Prose>
        <div className="w-full overflow-x-auto rounded-md border border-border bg-muted/20 p-4">
          <KanbanBoard
            columns={Object.keys(board).map((id) => ({ id }))}
            onCardMove={handleCardMove}
            className="w-full"
          >
            {Object.entries(board).map(([columnId, cards]) => (
              <KanbanColumn key={columnId} id={columnId} title={COLUMN_LABELS[columnId]} count={cards.length}>
                {cards.map((card, index) => (
                  <KanbanCard
                    key={card.id}
                    id={card.id}
                    index={index}
                    title={card.title}
                    tone={card.tone}
                    avatars={card.avatars}
                    badges={
                      card.ticketId || card.priority ? (
                        <>
                          {card.ticketId ? (
                            <Badge variant="muted" uppercase>
                              <Hash className="size-3" aria-hidden="true" />
                              {card.ticketId}
                            </Badge>
                          ) : null}
                          {card.priority ? (
                            <Badge variant={PRIORITY_BADGE[card.priority].variant} uppercase className="ms-auto">
                              <Flag className="size-3" />
                              {PRIORITY_BADGE[card.priority].label}
                            </Badge>
                          ) : null}
                        </>
                      ) : undefined
                    }
                    metadataFields={
                      card.metadataFields ? (
                        <>
                          {card.metadataFields.map((field, fieldIndex) => (
                            <span key={fieldIndex} className="inline-flex items-center gap-1.5">
                              {fieldIcon(field.icon)}
                              {field.label}
                            </span>
                          ))}
                        </>
                      ) : undefined
                    }
                    footerEnd={
                      card.dueDate ? (
                        <span
                          className={`inline-flex items-center gap-1 text-body-xs ${
                            card.overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          <Calendar className="size-3.5" aria-hidden />
                          {card.dueDate}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </KanbanColumn>
            ))}
          </KanbanBoard>
        </div>
      </DocSection>

      <DocSection id="tone" title="Card tone">
        <Prose>
          <Code>tone</Code> resolves to a status-token top accent — <Code>neutral</Code> renders a
          plain 1px border on every side instead.
        </Prose>
        <Gallery
          minColRem={14}
          items={TONES.map((tone) => ({
            label: tone,
            node: (
              <KanbanBoard columns={[{ id: tone }]} className="w-full">
                <KanbanColumn id={tone} title="Card" count={1} className="w-full">
                  <KanbanCard id={`tone-${tone}`} index={0} title={`${tone} tone`} tone={tone} />
                </KanbanColumn>
              </KanbanBoard>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="rich-content" title="Cover image, extra content & footer">
        <Prose>
          <Code>coverImage</Code> is the card&apos;s first content row — the thumbnail sits above
          the badge row, per the kanban card anatomy. <Code>extra</Code> is an open slot below the
          metadata rows and is a good home for a <Code>size=&quot;sm&quot;</Code>{' '}
          <Code>LiveDurationCard</Code> (an SLA countdown, a maintenance window, anything with a
          start/expected-end/end). <Code>footerEnd</Code> renders alongside <Code>avatars</Code> in a
          bordered footer row.
        </Prose>
        <div className="max-w-sm">
          <KanbanBoard columns={[{ id: 'rich' }]} className="w-full">
            <KanbanColumn id="rich" title="In progress" count={1} className="w-full">
              <KanbanCard
                id="rich-card"
                index={0}
                title="Compactor 4200 — hydraulic leak"
                tone="warning"
                badges={
                  <>
                    <Badge variant="muted" uppercase>
                      <Hash className="size-3" aria-hidden="true" />
                      WO-1042
                    </Badge>
                    <Badge variant="destructive" uppercase className="ms-auto">
                      <Flag className="size-3" />
                      High
                    </Badge>
                  </>
                }
                metadataFields={
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <Container className="size-3.5" />
                      Compactor 4200
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      Al Ain Central
                    </span>
                  </>
                }
                coverImage={placeholderImage('Photo', '#0072d6')}
                coverImageAlt="Compactor 4200 at the depot"
                extra={
                  <LiveDurationCard
                    size="sm"
                    start={new Date(Date.now() - 3 * 60 * 60 * 1000)}
                    openEndedLabel="Downtime"
                  />
                }
                avatars={[{ name: 'Kashish Bindrani' }]}
                footerEnd={
                  <span className="inline-flex items-center gap-1 text-body-xs font-semibold text-destructive">
                    <Calendar className="size-3.5" aria-hidden />
                    Overdue 2d
                  </span>
                }
              />
            </KanbanColumn>
          </KanbanBoard>
        </div>
      </DocSection>

      <DocSection id="size" title="Size">
        <Prose>
          <Code>size</Code> scales padding and gap only — <Code>compact</Code> for dense boards,{' '}
          <Code>wide</Code> for a roomier single-column lane.
        </Prose>
        <Gallery
          layout="rows"
          items={(['compact', 'default', 'wide'] as KanbanCardSize[]).map((size) => ({
            label: size,
            node: (
              <KanbanBoard columns={[{ id: size }]} className="w-full">
                <KanbanColumn id={size} title="Card" count={1} className="w-full">
                  <KanbanCard
                    id={`size-${size}`}
                    index={0}
                    title="Fuel sensor calibration"
                    size={size}
                    metadataFields={
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Reported 2h ago
                      </span>
                    }
                  />
                </KanbanColumn>
              </KanbanBoard>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="selected" title="Selected state">
        <Prose>
          <Code>selected</Code> adds a ring independent of <Code>tone</Code> — e.g. for a
          keyboard-focused or multi-selected card.
        </Prose>
        <div className="max-w-xs">
          <KanbanBoard columns={[{ id: 'sel' }]} className="w-full">
            <KanbanColumn id="sel" title="Card" count={1} className="w-full">
              <KanbanCard id="selected-card" index={0} title="Selected card" tone="info" selected />
            </KanbanColumn>
          </KanbanBoard>
        </div>
      </DocSection>

      <DocSection id="drop-gating" title="Drop gating">
        <Prose>
          <Code>canDrop=false</Code> on a column dims the lane and disables it as a drop
          target — e.g. while dragging a card type that lane's rules reject.
        </Prose>
        <Demo
          title="Rule-aware drop gating"
          hint="canDrop={false} on Archived"
          code={`<KanbanBoard columns={[{ id: 'open' }, { id: 'archived' }]} onCardMove={handleCardMove}>
  <KanbanColumn id="open" title="Open" count={1}>
    <KanbanCard id="card-a" index={0} title="Bin B-1042 inspection" tone="info" />
  </KanbanColumn>
  <KanbanColumn id="archived" title="Archived" count={0} canDrop={false} />
</KanbanBoard>`}
          className="max-w-2xl"
        >
          <KanbanBoard columns={[{ id: 'open' }, { id: 'archived' }]} className="w-full">
            <KanbanColumn id="open" title="Open" count={1}>
              <KanbanCard id="card-a" index={0} title="Bin B-1042 inspection" tone="info" />
            </KanbanColumn>
            <KanbanColumn id="archived" title="Archived" count={0} canDrop={false} />
          </KanbanBoard>
        </Demo>
      </DocSection>

      <DocSection id="tint-body" title="Column body tint">
        <Prose>
          <Code>accentColor</Code> tints the column body by default (
          <Code>tintBody</Code> defaults to <Code>true</Code>) — pass{' '}
          <Code>tintBody={'{false}'}</Code> for a flat, untinted body (the page
          background shows through the gaps between cards), matching a reference
          with no distinct column-body fill.
        </Prose>
        <Demo
          title="tintBody true (default) vs false"
          hint="Same accentColor, tinted body vs flat body"
          code={`<KanbanColumn id="tinted" title="Tinted" count={1} accentColor="#0072d6">
  <KanbanCard id="card-tinted" index={0} title="Tinted column body" tone="primary" />
</KanbanColumn>
<KanbanColumn id="flat" title="Flat" count={1} accentColor="#0072d6" tintBody={false}>
  <KanbanCard id="card-flat" index={0} title="Flat column body" tone="primary" />
</KanbanColumn>`}
          className="max-w-2xl"
        >
          <KanbanBoard columns={[{ id: 'tinted' }, { id: 'flat' }]} className="w-full">
            <KanbanColumn id="tinted" title="Tinted" count={1} accentColor="#0072d6">
              <KanbanCard id="card-tinted" index={0} title="Tinted column body" tone="primary" />
            </KanbanColumn>
            <KanbanColumn id="flat" title="Flat" count={1} accentColor="#0072d6" tintBody={false}>
              <KanbanCard id="card-flat" index={0} title="Flat column body" tone="primary" />
            </KanbanColumn>
          </KanbanBoard>
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <div className="text-body-sm font-semibold text-foreground">KanbanBoard</div>
        <PropsTable
          rows={[
            {
              prop: 'columns',
              type: '{ id: string }[]',
              required: true,
              description: "The board's known column ids. Renders none of them — validates a drop's destination before onCardMove fires.",
            },
            {
              prop: 'onCardMove',
              type: '(cardId, fromColumnId, toColumnId, toIndex) => void',
              description: 'Fires once per completed, legal drag. Never fires for a no-op move or a drop onto an unknown/canDrop=false column.',
            },
            {
              prop: 'formatMoveAnnouncement',
              type: '(move: KanbanMoveAnnouncement) => string | null',
              description:
                'Derives the screen-reader announcement a card’s keyboard "Move to…" menu makes, called right after onCardMove. Omit for the default "Moved X to Y."; return null to announce nothing — the hook for a board whose onCardMove refused the move.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'The KanbanColumn tree — the board holds no card state of its own.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any div attribute pass through.',
            },
          ]}
        />

        <div className="text-body-sm font-semibold text-foreground">KanbanColumn</div>
        <PropsTable
          rows={[
            {
              prop: 'id',
              type: 'string',
              required: true,
              description: "Droppable id — must match one entry in the parent KanbanBoard's columns.",
            },
            { prop: 'title', type: 'ReactNode', required: true, description: 'Column header label.' },
            {
              prop: 'count',
              type: 'number',
              description: 'Card count shown next to the title as a Badge. Omit to hide the count badge.',
            },
            {
              prop: 'canDrop',
              type: 'boolean',
              default: 'true',
              description: "Rule-aware drop gating decided by the caller. false disables the lane as a drop target and dims it.",
            },
            {
              prop: 'accentColor',
              type: 'string',
              description: 'Runtime accent (e.g. a pipeline stage color) as a 4px top border on the header. Never a hardcoded value.',
            },
            {
              prop: 'tintBody',
              type: 'boolean',
              default: 'true',
              description:
                'Whether the column body derives a light background tint from accentColor. Pass false for a flat, untinted body (the page background shows through) — some references (e.g. an Incident Reporting kanban) show no column tint at all.',
            },
            {
              prop: 'emptyMessage',
              type: 'ReactNode',
              description:
                'Muted in-column line shown when the lane holds no cards. Rendered inside the body (so the empty lane stays a drop target) but outside children, so it never counts as a card in the drop payload. The caller owns the copy.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any div attribute pass through.',
            },
          ]}
        />

        <div className="text-body-sm font-semibold text-foreground">KanbanCard</div>
        <PropsTable
          rows={[
            { prop: 'id', type: 'string', required: true, description: 'Draggable id — must be unique across the whole board.' },
            {
              prop: 'index',
              type: 'number',
              required: true,
              description: 'Position within its column. Required by @hello-pangea/dnd for ordering.',
            },
            { prop: 'title', type: 'ReactNode', required: true, description: 'Card title.' },
            {
              prop: 'badges',
              type: 'ReactNode',
              description: 'Chip row above the title — content is app-owned (e.g. Badge). Put ms-auto on the last item to pin it to the far end.',
            },
            {
              prop: 'metadataFields',
              type: 'ReactNode',
              description: 'Render slot for label/value rows (due date, reference, location…) — content is app-owned.',
            },
            {
              prop: 'coverImage',
              type: 'string',
              description:
                "Cover thumbnail URL, rendered as the card's first content row — above the badge row.",
            },
            {
              prop: 'coverImageAlt',
              type: 'string',
              description: 'Accessible alt text for coverImage — always pass real alt text for a meaningful image.',
            },
            {
              prop: 'extra',
              type: 'ReactNode',
              description: 'Free-form slot below the cover image — e.g. a size="sm" LiveDurationCard.',
            },
            {
              prop: 'avatars',
              type: 'KanbanCardAvatar[]',
              description: 'Overlapping avatar stack ({ name, src? }). Omit to hide.',
            },
            {
              prop: 'footerEnd',
              type: 'ReactNode',
              description: 'Trailing footer content, app-owned (e.g. a due date). Renders alongside avatars in a bordered footer row — the row only appears when at least one of the two is present.',
            },
            {
              prop: 'tone',
              type: "'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger'",
              default: "'neutral'",
              description: 'Closed semantic tone, resolved to a status-token top accent.',
            },
            {
              prop: 'size',
              type: "'compact' | 'default' | 'wide'",
              default: "'default'",
              description: 'Padding/gap density.',
            },
            {
              prop: 'selected',
              type: 'boolean',
              description: 'Selected-state ring, independent of tone — e.g. a keyboard-focused or multi-selected card.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Let the app own board state — commit onCardMove to your data, then re-render with new props.',
            'Use tone to carry closed semantic meaning (priority, health), never an arbitrary hex.',
            'Compose badges from Badge — a ticket id, type, or priority chip is app vocabulary, not a KanbanCard prop.',
            'Use canDrop to encode drop rules explicitly instead of silently ignoring illegal drags.',
            'Keep metadataFields to a couple of short rows — the card is a summary, not the full record.',
          ]}
          donts={[
            'Don’t let the board reorder its own cards — it only reports the drag, never mutates it.',
            'Don’t rely on drag alone; every KanbanCard is also keyboard-operable (Space + arrows).',
            'Don’t nest interactive controls inside a card without stopping propagation to the drag handle.',
            'Don’t omit coverImageAlt for a meaningful photo — an empty alt is only right for a decorative image.',
            'Don’t use Kanban for a small fixed list — a ListRow stack is lighter for anything non-draggable.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            '@hello-pangea/dnd provides full keyboard support: Space to lift a card, arrow keys to move it, Space to drop, Escape to cancel.',
            'Screen readers announce lift, move, and drop via the library’s built-in live region messaging.',
            'A board that can refuse a move returns null from formatMoveAnnouncement for it, so the keyboard "Move to…" menu never announces a success that did not happen.',
            'Each card carries a visible focus ring (focus-visible:ring) independent of drag state.',
            'A canDrop={false} column is marked aria-disabled and dimmed, not just visually implied.',
            'coverImage always renders an alt attribute — pass coverImageAlt for a meaningful image, or leave it unset for a decorative one (defaults to "").',
            'Layout uses logical properties (rtl:space-x-reverse for the avatar stack), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
