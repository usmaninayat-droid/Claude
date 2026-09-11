import { AlertTriangle, Truck } from '@fams/ui-kit/icons'
import { Leaderboard } from '../../../../packages/ui-kit/src/composites/Leaderboard'
import type {
  LeaderboardColumn,
  LeaderboardItem,
} from '../../../../packages/ui-kit/src/composites/Leaderboard.types'
import { StatBar } from '../../../../packages/ui-kit/src/composites/StatBar'
import { IconBadge } from '../../../../packages/ui-kit/src/primitives/IconBadge'
import {
  DocPage,
  DocSection,
  Prose,
  Gallery,
  Playground,
  PropsTable,
  Guidelines,
  A11yList,
  Code,
} from '../docs'

/**
 * LeaderboardDemo — a ranked board: an optional top-N podium above a ranked
 * table. Generic by construction: every metric is a caller-defined column, so
 * the same component serves a vehicle ranking, a driver ranking or a
 * depot ranking without a single domain prop.
 */
const ITEMS: LeaderboardItem[] = [
  {
    id: 'u1',
    primary: 'Toyota Hilux',
    secondary: 'SHJ-33445',
    media: <IconBadge icon={Truck} tone="primary" size="sm" />,
    movement: { direction: 'up', value: '1' },
    score: '98 pts',
    cells: { events: 1, score: '98 pts', delta: '+4 pts' },
    detail: <StatBar percent={98} tone="success" compact value="98" aria-label="Score" />,
  },
  {
    id: 'u2',
    primary: 'Toyota Hilux',
    secondary: 'SHJ-33446',
    media: <IconBadge icon={Truck} tone="primary" size="sm" />,
    movement: { direction: 'up', value: '1' },
    score: '90 pts',
    cells: { events: 6, score: '90 pts', delta: '+1 pts' },
    detail: <StatBar percent={90} tone="success" compact value="90" aria-label="Score" />,
  },
  {
    id: 'u3',
    primary: 'Isuzu D-Max',
    secondary: 'SHJ-33447',
    media: <IconBadge icon={Truck} tone="primary" size="sm" />,
    movement: { direction: 'down', value: '2' },
    score: '88 pts',
    cells: { events: 8, score: '88 pts', delta: '-3 pts' },
    detail: <StatBar percent={88} tone="warning" compact value="88" aria-label="Score" />,
  },
  {
    id: 'u4',
    primary: 'Mitsubishi Canter',
    secondary: 'SHJ-33448',
    media: <IconBadge icon={Truck} tone="primary" size="sm" />,
    movement: { direction: 'flat', value: '0' },
    score: '74 pts',
    cells: { events: 12, score: '74 pts', delta: '0 pts' },
  },
  {
    id: 'u5',
    primary: 'Nissan Patrol',
    secondary: 'SHJ-33455',
    media: <IconBadge icon={Truck} tone="primary" size="sm" />,
    movement: { direction: 'down', value: '3' },
    score: '51 pts',
    cells: { events: 19, score: '51 pts', delta: '-9 pts' },
  },
]

const COLUMNS: LeaderboardColumn[] = [
  {
    key: 'events',
    label: 'Critical events',
    minWidth: '11rem',
    align: 'end',
    isSortable: true,
    render: (item) => (
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
        {item.cells?.events}
      </span>
    ),
  },
  { key: 'score', label: 'Score', minWidth: '9rem', isSortable: true },
  { key: 'delta', label: 'Change', minWidth: '8rem', align: 'end' },
]

type LeaderboardControls = {
  variant: 'table' | 'podium'
  searchable: boolean
  loading: boolean
}

export default function LeaderboardDemo() {
  return (
    <DocPage
      title="Leaderboard"
      badge="stable"
      summary="A ranked board — an optional top-N podium above a ranked table. Composes DataTable (sticky header, sortable columns, per-column minimum widths, inner scroll region, loading/empty states), LeaderboardPodium and TrendIndicator rather than re-implementing any of them. Rank and entity columns are injected; every metric is a caller-defined column."
    >
      <DocSection id="playground" title="Playground">
        <Playground<LeaderboardControls>
          controls={[
            { name: 'variant', type: 'select', default: 'podium', options: ['table', 'podium'] },
            { name: 'searchable', type: 'boolean', default: true },
            { name: 'loading', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full">
              <Leaderboard
                items={ITEMS}
                columns={COLUMNS}
                variant={v.variant}
                searchable={v.searchable}
                searchPlaceholder="Search units"
                scoreLabel="Behaviour score"
                entityLabel="Unit"
                loading={v.loading}
                ariaLabel="Unit ranking"
                bodyMaxHeight="18rem"
                onItemClick={() => {}}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="variants" title="Variants">
        <Prose>
          <Code>variant=&quot;table&quot;</Code> is the ranked table alone;{' '}
          <Code>variant=&quot;podium&quot;</Code> adds <Code>podiumCount</Code> highlight cards
          above it. The podium hides itself while a search is active — a podium of a filtered set
          would be a lie. <Code>showRank={'{false}'}</Code> drops the injected rank column for a
          board whose design carries none; the rows are already the ranking, and{' '}
          <Code>movement</Code> re-homes onto the entity column rather than disappearing with it.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'table',
              caption: 'the ranked body alone',
              node: (
                <Leaderboard items={ITEMS} columns={COLUMNS} ariaLabel="Unit ranking" bodyMaxHeight="16rem" />
              ),
            },
            {
              label: 'podium',
              caption: 'top 3 highlight cards above the table',
              node: (
                <Leaderboard
                  variant="podium"
                  items={ITEMS}
                  columns={COLUMNS}
                  scoreLabel="Behaviour score"
                  ariaLabel="Unit ranking"
                  bodyMaxHeight="16rem"
                />
              ),
            },
            {
              label: 'no rank column',
              caption: 'showRank={false} + entityLabel',
              node: (
                <Leaderboard
                  items={ITEMS}
                  columns={COLUMNS}
                  showRank={false}
                  entityLabel="Vehicle"
                  ariaLabel="Unit ranking"
                  bodyMaxHeight="16rem"
                />
              ),
            },
            {
              label: 'searchable',
              caption: 'filters rows live; Escape clears',
              node: (
                <Leaderboard
                  searchable
                  searchPlaceholder="Search units"
                  items={ITEMS}
                  columns={COLUMNS}
                  ariaLabel="Unit ranking"
                  bodyMaxHeight="16rem"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Loading',
              node: <Leaderboard items={ITEMS} columns={COLUMNS} loading ariaLabel="Unit ranking" />,
            },
            {
              label: 'Empty',
              caption: 'caller-supplied copy',
              node: (
                <Leaderboard
                  items={[]}
                  columns={COLUMNS}
                  emptyState="No units match this filter"
                  ariaLabel="Unit ranking"
                />
              ),
            },
            {
              label: 'Interactive rows',
              caption: 'rows focusable, Enter/Space activates',
              node: (
                <Leaderboard
                  items={ITEMS.slice(0, 3)}
                  columns={COLUMNS}
                  onItemClick={() => {}}
                  ariaLabel="Unit ranking"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'items', type: 'LeaderboardItem[]', required: true, description: 'Ranked items, best first — { id, rank?, primary, secondary?, media?, movement?, score?, detail?, cells?, searchText? }. Ranking is the caller’s; this component never re-sorts by score.' },
            { prop: 'columns', type: 'LeaderboardColumn[]', required: true, description: '{ key, label, render?, align?, width?, minWidth?, isSortable? } — the metric columns rendered after the injected rank and entity columns.' },
            { prop: 'variant', type: "'table' | 'podium'", default: "'table'", description: "'podium' adds top-N highlight cards above the table." },
            { prop: 'podiumCount', type: 'number', default: '3', description: 'How many highlight cards the podium renders.' },
            { prop: 'scoreLabel', type: 'ReactNode', description: "Caption above each podium card's score." },
            { prop: 'rankLabel', type: 'string', default: "'Rank'", description: 'Header label of the injected rank column.' },
            { prop: 'entityLabel', type: 'ReactNode', default: "'Name'", description: 'Header label of the injected entity column — author the noun the board actually ranks ("Vehicle", "Driver", "Site").' },
            { prop: 'showRank', type: 'boolean', default: 'true', description: 'Renders the injected rank column. Set false for a board whose rows are already in rank order and whose design carries no rank column — `movement` then re-homes onto the entity column so it is never lost, and the podium keeps its rank medallion either way.' },
            { prop: 'searchable', type: 'boolean', default: 'false', description: 'Renders a search input that filters the table rows.' },
            { prop: 'searchPlaceholder', type: 'string', default: "'Search'", description: 'Placeholder and accessible name of the search input.' },
            { prop: 'searchValue', type: 'string', description: 'Controlled search text. Pair with onSearchChange; omit for uncontrolled search.' },
            { prop: 'onSearchChange', type: '(value: string) => void', description: 'Fires on every keystroke and on Escape (which clears).' },
            { prop: 'onItemClick', type: '(id: string) => void', description: "Called with the clicked item's id. Makes rows and podium cards keyboard-activatable." },
            { prop: 'loading', type: 'boolean', description: 'Shows the loading state in place of rows.' },
            { prop: 'emptyState', type: 'ReactNode', description: 'Rendered instead of the rows when items (or the search result) is empty.' },
            { prop: 'detailLabel', type: 'ReactNode', description: 'Caption above each podium card’s detail block (e.g. a counters row).' },
            { prop: 'ariaLabel', type: 'string', description: 'Accessible name of the table and of its scroll region.' },
            { prop: 'bodyMaxHeight', type: 'string', description: 'Caps the body height so it scrolls inside its card instead of growing the page, e.g. "24rem".' },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className and any native div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Rank the items before passing them in — the board renders the order it was given.',
            'Set minWidth per column so a narrow card scrolls the body instead of crushing headers.',
            'Give ariaLabel so the table and its scroll region are both named.',
            'Set bodyMaxHeight when the board lives in a fixed-height card.',
          ]}
          donts={[
            "Don't name columns after a domain concept in shared code — they are just keys and labels.",
            "Don't mark a header sortable unless sorting actually does something; a dead affordance is worse than none.",
            "Don't rely on rank tint alone — every podium card states its rank in text and its movement with an arrow glyph. The tints come from the ordinal --color-medal-* family, never the reserved status colours.",
            "Don't fetch inside it: search filters the rows already given; lift searchValue/onSearchChange for server-side search.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The body is a real table with a sticky header row and, when ariaLabel is set, a labelled role="region" scroll container reachable by keyboard.',
            'When onItemClick is given, rows are focusable and activate on Enter/Space; podium cards are role="button" with the same keys.',
            'Rank movement pairs its colour with a direction glyph and a value — colour is never the only encoding.',
            'The rank column is always first in reading order and the layout uses logical properties, so the board mirrors correctly under RTL.',
            'The search input has an accessible name, and Escape clears it.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
