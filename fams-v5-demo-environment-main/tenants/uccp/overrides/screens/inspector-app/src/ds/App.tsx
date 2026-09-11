import * as React from 'react';
import { Logo } from './components';
import { Menu, X } from 'lucide-react';
import { Cover } from './showcase/pages/Cover';
import { TokensStyles } from './showcase/pages/TokensStyles';
import { Basics } from './showcase/pages/Basics';
import { IconsPage } from './showcase/pages/Icons';
import { Charts } from './showcase/pages/Charts';
import { Widgets } from './showcase/pages/Widgets';
import { Primitives } from './showcase/Primitives';
import { Forms } from './showcase/Forms';
import { Overlays } from './showcase/Overlays';
import { DataDisplay } from './showcase/DataDisplay';
import { Navigation } from './showcase/Navigation';
import { Architecture } from './showcase/pages/Architecture';
import { ModuleTypes } from './showcase/pages/ModuleTypes';

type Section = { id: string; label: string };
type Page = { id: string; label: string; group: string; note?: string; sections: Section[] };

const PAGES: Page[] = [
  { id: 'cover', label: 'Cover', group: '', sections: [] },
  {
    id: 'architecture',
    label: 'App Architecture',
    group: 'Architecture',
    note: 'App → Module → View — the FAMS V5 composition layer',
    sections: [
      { id: 'app-shell', label: 'App Shell' },
      { id: 'composition', label: 'App = Module → View' },
      { id: 'module-types', label: 'Module types' },
      { id: 'views', label: 'Views' },
    ],
  },
  {
    id: 'module-types',
    label: 'Module Types',
    group: 'Architecture',
    note: 'The fixed menu of module types',
    sections: [
      { id: 'core', label: 'Core module types' },
      { id: 'others', label: 'Additional types' },
    ],
  },
  {
    id: 'tokens',
    label: 'Tokens & Styles',
    group: 'Style Guide',
    sections: [
      { id: 'colors', label: 'Color Tokens' },
      { id: 'size', label: 'Size Tokens' },
      { id: 'typography', label: 'Typography' },
      { id: 'text-styles', label: 'Text Styles' },
      { id: 'effect-styles', label: 'Effect Styles' },
      { id: 'paint-styles', label: 'Paint Styles' },
    ],
  },
  {
    id: 'basics',
    label: 'Basics',
    group: 'Components',
    sections: [
      { id: 'logos', label: 'Logos' },
      { id: 'breadcrumbs', label: 'Breadcrumbs' },
      { id: 'skeleton', label: 'Skeleton Loader' },
      { id: 'date-picker', label: 'Date Picker' },
      { id: 'calendar', label: 'Calendar cell' },
      { id: 'task-card', label: 'Task Card' },
      { id: 'dev-note', label: 'Dev Note' },
    ],
  },
  {
    id: 'icons',
    label: 'Icons',
    group: 'Components',
    sections: [
      { id: 'icon-sizes', label: 'Icon sizes' },
      { id: 'general-icons', label: 'General Icons' },
      { id: 'file-type', label: 'File Type' },
    ],
  },
  {
    id: 'charts',
    label: 'Charts',
    group: 'Components',
    note: 'Faithful adaptations of the Figma Charts page',
    sections: [
      { id: 'sample-dashboards', label: 'Sample Dashboards' },
      { id: 'legend', label: 'Legend' },
    ],
  },
  {
    id: 'widgets',
    label: 'Widgets',
    group: 'Components',
    note: 'Faithful adaptations of the Figma Widgets page',
    sections: [
      { id: 'metric-cards', label: 'Metric Cards' },
      { id: 'notification-cards', label: 'Notification Cards' },
      { id: 'event-log', label: 'Event Log Cards' },
      { id: 'stepper', label: 'Stepper' },
      { id: 'kpi-selection', label: 'KPI Selection Card' },
      { id: 'user-role', label: 'User Role Card' },
    ],
  },
  {
    id: 'components',
    label: 'UI Components',
    group: 'Components',
    note: 'Primitives, forms, overlays & data table — themed with the same tokens',
    sections: [
      { id: 'primitives', label: 'Buttons & Badges' },
      { id: 'forms', label: 'Inputs & File Upload' },
      { id: 'overlays', label: 'Overlays & Tooltips' },
      { id: 'data-display', label: 'Table & Data' },
      { id: 'navigation', label: 'Navigation & Tabs' },
    ],
  },
];

const GROUP_ORDER = ['', 'Architecture', 'Style Guide', 'Components'];

function UIComponents() {
  return (
    <div className="flex flex-col">
      <Primitives />
      <Forms />
      <Overlays />
      <DataDisplay />
      <Navigation />
    </div>
  );
}

export default function App() {
  const [pageId, setPageId] = React.useState('cover');
  const [navOpen, setNavOpen] = React.useState(false);
  const page = PAGES.find((p) => p.id === pageId)!;

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageId]);

  const go = (id: string) => {
    setPageId(id);
    setNavOpen(false);
  };

  const navContent = (
    <nav className="fams-scroll flex-1 overflow-y-auto px-3 py-2">
      {GROUP_ORDER.map((group) => {
        const pages = PAGES.filter((p) => p.group === group);
        if (!pages.length) return null;
        return (
          <div key={group || 'top'} className="mb-3">
            {group && (
              <div className="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-wide text-white/50">{group}</div>
            )}
            {pages.map((p) => {
              const activePage = p.id === pageId;
              return (
                <div key={p.id} className="mb-0.5">
                  <button
                    onClick={() => go(p.id)}
                    className={[
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body-sm font-semibold transition-colors',
                      activePage
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/90 hover:bg-white/15',
                    ].join(' ')}
                  >
                    {p.label}
                  </button>
                  {activePage && p.sections.length > 0 && (
                    <div className="mb-2 ml-3 mt-1 flex flex-col border-l border-white/20 pl-3">
                      {p.sections.map((s) => (
                        <a
                          key={s.id}
                          href={`#${s.id}`}
                          onClick={() => setNavOpen(false)}
                          className="rounded px-2 py-1 text-body-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          {s.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex size-9 items-center justify-center rounded-lg bg-white p-1.5">
          <Logo brand="fams" variant="icon" height={22} />
        </div>
        <div className="leading-tight">
          <div className="text-body-md font-bold">FAMS</div>
          <div className="text-caption text-white/70">Design System</div>
        </div>
      </div>
      {navContent}
      <div className="px-5 py-4 text-caption text-white/60">FAMS Design System</div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
            <button
              onClick={() => setNavOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-5 rounded-md p-1.5 text-white/80 hover:bg-white/15"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/85 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-1.5 text-foreground hover:bg-muted md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <div className="text-caption uppercase tracking-wide text-muted-foreground">
                {page.group || 'Page'}
              </div>
              <h1 className="text-h6 font-semibold text-foreground md:text-h5">{page.label}</h1>
            </div>
          </div>
          {page.note && <span className="hidden text-caption text-muted-foreground lg:block">{page.note}</span>}
        </header>
        <main className={pageId === 'cover' ? 'flex-1' : 'mx-auto w-full max-w-6xl px-4 pb-16 md:px-8'}>
          {pageId === 'cover' && <Cover />}
          {pageId === 'architecture' && <Architecture />}
          {pageId === 'module-types' && <ModuleTypes />}
          {pageId === 'tokens' && <TokensStyles />}
          {pageId === 'basics' && <Basics />}
          {pageId === 'icons' && <IconsPage />}
          {pageId === 'charts' && <Charts />}
          {pageId === 'widgets' && <Widgets />}
          {pageId === 'components' && <UIComponents />}
        </main>
      </div>
    </div>
  );
}
