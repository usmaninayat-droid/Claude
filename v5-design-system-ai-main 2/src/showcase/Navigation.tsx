import * as React from 'react';
import { Section, Demo } from './kit';
import {
  Breadcrumbs,
  ViewTabs,
  TopNavModule,
  type ModuleViewTab,
} from '../components';

export function Navigation() {
  const [active, setActive] = React.useState('my-view');
  const [view, setView] = React.useState('hybrid');

  const views: ModuleViewTab[] = [
    { id: 'hybrid', kind: 'hybrid', label: 'Hybrid', active: view === 'hybrid', onClick: () => setView('hybrid') },
    { id: 'list', kind: 'list', label: 'List', active: view === 'list', onClick: () => setView('list') },
    { id: 'kanban', kind: 'kanban', label: 'Kanban', active: view === 'kanban', onClick: () => setView('kanban') },
    { id: 'map', kind: 'map', label: 'Map', active: view === 'map', onClick: () => setView('map') },
  ];

  return (
    <Section
      id="navigation"
      title="Navigation"
      description="Breadcrumbs, saveable view tabs, and the module top-nav with view-kind switching — the chrome that frames every workspace."
    >
      <Demo title="Breadcrumbs">
        <Breadcrumbs
          items={[
            { label: 'Fleet', href: '#' },
            { label: 'Assets', href: '#' },
            { label: 'Mixer 4218' },
          ]}
        />
      </Demo>

      <Demo title="View tabs" className="flex-col items-stretch p-0">
        <ViewTabs
          tabs={[
            { id: 'my-view', label: 'My View', closable: true },
            { id: 'all', label: 'All Assets' },
            { id: 'overdue', label: 'Overdue', closable: true },
          ]}
          activeId={active}
          onSelect={setActive}
          onAdd={() => undefined}
        />
      </Demo>

      <Demo title="Top nav — module" className="flex-col items-stretch p-0">
        <TopNavModule moduleName="Assets" views={views} onAddView={() => undefined} />
      </Demo>
    </Section>
  );
}
