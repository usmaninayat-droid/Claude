/**
 * App shell — the FAMS two-tier side nav (per the DS "Side Navigation V2" spec)
 * + routed content. The DS `SideNav` renders the blue **app rail** (FAMS logo,
 * the IIMS app tile, Settings + the inspector's avatar in the footer); the
 * `ModuleRail` renders the white **module rail** (Home · Incidents · Inspections).
 * Content area renders the active module. Overlays are mounted by NavProvider.
 * Token-only styling (sidebar tokens drive the brand-blue rail).
 */
import * as React from 'react';
import { Logo } from '@ds/components/basics';
import { SideNav, ModuleRail } from '@ds/components/navigation';
import type { SideNavItem, ModuleRailItem } from '@ds/components/navigation';
import * as Icons from '@ds/icons';
import { useNav, type Route } from './nav';
import { useIims } from '../store/store';
import { AvatarChip } from '../lib/ui';
import { Home } from '../screens/Home';
import { Incidents } from '../screens/Incidents';
import { Inspections } from '../screens/Inspections';

interface RailItem { route: Route; label: string; icon: React.ComponentType<{ size?: number }>; }
const MODULES: RailItem[] = [
  { route: 'home', label: 'Home', icon: Icons.Home01 },
  { route: 'incidents', label: 'Incidents', icon: Icons.AlertTriangle },
  { route: 'inspections', label: 'Inspections', icon: Icons.ClipboardCheck },
];

export function Shell() {
  const { route, setRoute } = useNav();
  const s = useIims();
  const me = s.currentInspector();

  // Blue app rail — the IIMS suite. INS (Inspector) is the first of three apps;
  // add the Supervisor / Admin tiles here as they come online.
  const apps: SideNavItem[] = [
    { id: 'iims-ins', label: 'IIMS · Inspector', icon: Icons.ClipboardCheck, active: true },
  ];

  const footerItems: SideNavItem[] = [
    { id: 'settings', label: 'Settings', icon: Icons.Settings01 },
  ];

  // White module rail — the Inspector app's modules.
  const moduleItems: ModuleRailItem[] = MODULES.map((m) => ({
    id: m.route,
    label: m.label,
    icon: m.icon,
    active: route === m.route,
    onClick: () => setRoute(m.route),
  }));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SideNav
        logo={<Logo brand="fams" variant="icon" height={26} className="brightness-0 invert" aria-label="FAMS" />}
        apps={apps}
        footerItems={footerItems}
        footerExtra={
          <span className="inline-flex size-7 items-center justify-center rounded-full ring-2 ring-white/40">
            <AvatarChip name={me.name} color={me.avatarColor} size={28} />
          </span>
        }
        moduleRail={<ModuleRail items={moduleItems} />}
      />

      {/* Content */}
      <main className="min-w-0 flex-1 overflow-hidden">
        {route === 'home' && <Home />}
        {route === 'incidents' && <Incidents />}
        {route === 'inspections' && <Inspections />}
      </main>
    </div>
  );
}
