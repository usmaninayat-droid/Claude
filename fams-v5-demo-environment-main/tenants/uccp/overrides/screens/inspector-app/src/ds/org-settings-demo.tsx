import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { OrganizationSettings } from './components/settings';
import type { OrgStat, OrgActivity } from './components/settings';
import { Toaster, toast, Switch } from './components/primitives';
import * as Icons from './icons';
import './styles.css';

/** Standalone Organization Settings demo (served at `/org-settings.html`).
 *  Parity harness for Figma 2-11415 (logo-set) / 2-11663 (logo-empty). */

const spark = (up: boolean) => (up
  ? [4, 6, 5, 8, 7, 10, 9, 12, 11, 15, 14, 18]
  : [18, 15, 16, 12, 14, 10, 12, 8, 9, 6, 7, 5]);

const STATS: OrgStat[] = [
  { id: 'assets', label: 'Total Assets', value: '179', icon: <Icons.Cube01 />, trend: { value: '6.6%', direction: 'up' }, caption: 'Compared to last month', spark: spark(true), onDrill: () => toast('Assets') },
  { id: 'devices', label: 'Total Devices', value: '432', icon: <Icons.Signal01 />, trend: { value: '4.2', direction: 'down' }, caption: 'Compared to last month', spark: spark(false), onDrill: () => toast('Devices') },
  { id: 'billing', label: '', value: '$3,321.50', subValue: 'Next billing date: 12 Jan, 2023', wide: true, trend: { value: '4.2', direction: 'down' }, caption: 'Compared to last month', spark: spark(false), onDrill: () => toast('Billing') },
  { id: 'invited', label: 'Total Invited Users', value: '12', icon: <Icons.UserPlus01 />, trend: { value: '4.2', direction: 'down' }, caption: 'Compared to last month', spark: spark(false), onDrill: () => toast('Invited') },
  { id: 'workforce', label: 'Total Workforce', value: '323', icon: <Icons.Users01 />, trend: { value: '6.6%', direction: 'up' }, caption: 'Compared to last month', spark: spark(true), onDrill: () => toast('Workforce') },
];

const ACTIVITY: OrgActivity[] = [
  { id: 'a1', actor: 'Mohammed Ahmed', actorRole: 'Owner & Super Admin', action: 'has created a new report templates for reports module and given access to all the organizations.', timestamp: '12:32 PM', dateGroup: 'Today', onActorClick: () => toast('Mohammed') },
  { id: 'a2', actor: 'Mohammed Ahmed', actorRole: 'Owner & Super Admin', action: 'has added 32 new assets, 66 new workforce and assigned it to Voltro (Sub-organization)', timestamp: '12:32 PM', dateGroup: 'Today', onActorClick: () => toast('Mohammed') },
  { id: 'a3', actor: 'Ben Stokes', actorRole: 'Fleet Manager and Operations Manager', action: 'has created a new tags category "Illegal Dumping Tags" consisting 12 Multi-select tags.', timestamp: '12:32 PM', dateGroup: 'Yesterday', onActorClick: () => toast('Ben') },
  { id: 'a4', actor: 'Ben Stokes', actorRole: 'Fleet Manager and Operations Manager', action: 'has created a new tags category "Illegal Dumping Tags" consisting 12 Multi-select tags.', timestamp: '12:32 PM', dateGroup: '27th November, 2023', onActorClick: () => toast('Ben') },
];

const LOGO_DATA_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#e11d48"/><text x="32" y="41" font-family="sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">NP</text></svg>'
);

function Demo() {
  const [hasLogo, setHasLogo] = React.useState(true);
  return (
    <div style={{ height: '100vh' }} className="flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-6 py-2.5">
        <span className="text-body font-semibold text-foreground">Settings</span>
        <label className="ml-auto flex items-center gap-2 text-body-sm text-muted-foreground">
          Logo set
          <Switch checked={hasLogo} onCheckedChange={setHasLogo} aria-label="Toggle logo" />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <OrganizationSettings
          identity={{ name: 'National Paints LLC - Dubai', email: 'FamsLLC@dubai.com', logo: hasLogo ? LOGO_DATA_URI : undefined }}
          stats={STATS}
          activity={ACTIVITY}
          onEditIdentity={() => toast('Edit organization')}
          onBack={() => toast('Back to Settings')}
        />
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);
