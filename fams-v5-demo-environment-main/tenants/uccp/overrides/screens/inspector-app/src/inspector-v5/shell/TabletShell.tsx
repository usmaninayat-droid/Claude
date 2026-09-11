import { useInspectorStore } from '../data/store';
import { InspectorRail } from './InspectorRail';
import { RequestsModule } from '../modules/requests/RequestsModule';
import { PlansModule } from '../modules/plans/PlansModule';
import { DashboardModule } from '../modules/dashboard/DashboardModule';

/**
 * TabletShell — the tablet/desktop app frame: InspectorRail + a full-width
 * main pane. Requests, Plans and Dashboard all render their real modules.
 */
export function TabletShell() {
  const { activeModule: rawActiveModule } = useInspectorStore();
  // Tablet has no Profile rail item; if it's ever selected (e.g. leftover
  // mobile state), fall back to Dashboard rather than showing it.
  const activeModule = rawActiveModule === 'profile' ? 'dashboard' : rawActiveModule;

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--card)' }}>
      <InspectorRail />
      <main className="flex-1 min-w-0" style={{ overflow: 'hidden', display: 'flex' }}>
        {activeModule === 'requests' ? (
          <RequestsModule />
        ) : activeModule === 'plans' ? (
          <PlansModule />
        ) : (
          <div className="fams-hide-scrollbar" style={{ overflow: 'auto', width: '100%' }}>
            <DashboardModule />
          </div>
        )}
      </main>
    </div>
  );
}
