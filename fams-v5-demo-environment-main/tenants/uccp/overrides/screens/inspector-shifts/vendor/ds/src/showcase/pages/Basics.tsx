import {
  Logo,
  CalendarCell,
  type CalendarCellType,
  type CalendarCellState,
  DatePickerListItem,
  SkeletonLoader,
  TaskCard,
  DevNote,
  Breadcrumbs,
} from '../../components';

function Sec({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-10">
      <h2 className="text-h4 font-semibold text-foreground">{title}</h2>
      {desc && <p className="mt-1 mb-5 max-w-3xl text-body-sm text-muted-foreground">{desc}</p>}
      <div className={desc ? '' : 'mt-5'}>{children}</div>
    </section>
  );
}

function Tile({ label, dark, children }: { label: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex min-h-[120px] items-center justify-center rounded-lg border border-border p-6 ${
          dark ? 'bg-[var(--fig-brand-darkest)]' : 'bg-card'
        }`}
      >
        {children}
      </div>
      <span className="text-caption text-muted-foreground">{label}</span>
    </div>
  );
}

const CAL_TYPES: CalendarCellType[] = ['default', 'today', 'selected', 'active'];
const CAL_STATES: CalendarCellState[] = ['default', 'hover', 'disabled'];

export function Basics() {
  return (
    <div>
      <Sec id="logos" title="Logos" desc="FAMS and Tadweer brand marks exported from Figma — full lockup and icon-only, on light and dark surfaces.">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Tile label="FAMS · full · default"><Logo brand="fams" variant="full" height={48} /></Tile>
          <Tile label="FAMS · full · white" dark><Logo brand="fams" variant="full" tone="white" height={48} /></Tile>
          <Tile label="FAMS · icon"><Logo brand="fams" variant="icon" height={40} /></Tile>
          <Tile label="FAMS · icon · on brand" dark><Logo brand="fams" variant="icon" height={40} /></Tile>
          <Tile label="Tadweer · full · default"><Logo brand="tadweer" variant="full" height={48} /></Tile>
          <Tile label="Tadweer · full · white" dark><Logo brand="tadweer" variant="full" tone="white" height={48} /></Tile>
          <Tile label="Tadweer · icon"><Logo brand="tadweer" variant="icon" height={40} /></Tile>
          <Tile label="Tadweer · icon · on brand" dark><Logo brand="tadweer" variant="icon" height={40} /></Tile>
        </div>
      </Sec>

      <Sec id="breadcrumbs" title="Breadcrumbs">
        <div className="rounded-lg border border-border bg-card p-6">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '#' },
              { label: 'Assets', href: '#' },
              { label: 'Mixer 4218' },
            ]}
          />
        </div>
      </Sec>

      <Sec id="skeleton" title="Skeleton Loader" desc="Shimmer placeholder rows used while content loads.">
        <SkeletonLoader />
      </Sec>

      <Sec id="date-picker" title="Date Picker — list item" desc="Selectable list rows used in the date-range picker. Selected = brand-secondary fill with brand text.">
        <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-6">
          <DatePickerListItem label="List item" />
          <DatePickerListItem label="List item" selected />
        </div>
      </Sec>

      <Sec id="calendar" title="Calendar cell" desc="Day cell across the full Figma matrix — Type (Default · Today · Selected · Active) × State (Default · Hover · Disabled).">
        <div className="inline-block rounded-lg border border-border bg-card p-6">
          <table className="border-separate border-spacing-3">
            <thead>
              <tr>
                <th />
                {CAL_STATES.map((s) => (
                  <th key={s} className="text-caption font-semibold capitalize text-muted-foreground">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAL_TYPES.map((t) => (
                <tr key={t}>
                  <td className="pr-2 text-caption font-semibold capitalize text-muted-foreground">{t}</td>
                  {CAL_STATES.map((s) => (
                    <td key={s}>
                      <CalendarCell day={1} type={t} state={s} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sec>

      <Sec id="task-card" title="Task Card" desc="Compact card with badges, title, options and a CTA — used on boards and dashboards.">
        <TaskCard />
      </Sec>

      <Sec id="dev-note" title="Dev Note" desc="Annotation callout for design-to-dev handoff, with a directional pointer (top · bottom · left · right).">
        <div className="flex flex-wrap gap-10">
          <DevNote pointer="top" />
          <DevNote pointer="left" title="Note · left" />
        </div>
      </Sec>
    </div>
  );
}
