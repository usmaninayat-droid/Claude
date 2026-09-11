/**
 * IimsShell — mounts the FAMS V5 config-driven AppShell with the IIMS · Inspector
 * AppConfig. The shell renders the blue app rail + module rail + per-module
 * toolbar/views/detail-sheet from config; the modules (Home, Incidents,
 * Inspections) are built in `iims-modules`. Wizards (Report Incident / New
 * Inspection) still launch from the Home tiles via NavProvider overlays.
 */
import { AppShell } from '@ds/components/app-shell';
import { useIimsApps } from './iims-modules';
import { useIims } from '../store/store';

export function IimsShell() {
  const apps = useIimsApps();
  const s = useIims();
  // `data-duty` drives the off-duty lock: when clocked out, CSS in index.css
  // makes the non-Home INS rail items (Incidents / Inspections / My Tasks)
  // non-clickable + dimmed while keeping them visible in the rail. The wrapper
  // uses display:contents so it adds no box and leaves AppShell's layout intact.
  return (
    <div data-duty={s.data.onDuty ? 'on' : 'off'} style={{ display: 'contents' }}>
      <AppShell apps={apps} logo={apps[0].brand.logo} />
    </div>
  );
}
