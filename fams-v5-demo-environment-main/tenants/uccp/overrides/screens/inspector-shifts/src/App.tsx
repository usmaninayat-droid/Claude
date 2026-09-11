import * as React from 'react';
import { Toaster } from '@ds/components/primitives';
import { IimsProvider, useIims } from '@/store/store';
import { buildInspectorShiftsModule } from '@/app/inspector-shifts';

/**
 * Pristine verbatim port of the "Inspector Shifts" module (Planning +
 * Compliance Monitoring), taken as-is from
 * /Users/apple/Desktop/FAMS-V5-IIMS-DEMO-main/src/app/inspector-shifts.tsx
 * (buildInspectorShiftsModule) + its full vendored @ds tree, store, catalog
 * and assets. Only plumbing change: the reference app's own AppShell/nav
 * chrome is not mounted here — this entry renders ONLY the module's active
 * tab body, selected by the shell via `?view=planning|compliance`, mirroring
 * the tenants/uccp/overrides/screens/planning-v2 embed pattern (App.tsx
 * there). The UCCP shell owns the real module/tab chrome (ModuleViewShell)
 * outside this iframe — see app/src/demo (Inspector Shifts module wiring).
 *
 * Content, data, behavior of both tabs stay byte-for-byte verbatim. The only
 * adaptation permitted anywhere in this bundle is the branding pass in
 * vendor/fms-main-ds/styles.css (maroon action/brand roles; statuses/avatars/
 * shift icons/progress bars keep their semantic accent colors).
 */

function embedViewParam(): 'planning' | 'compliance' {
  const v = new URLSearchParams(window.location.search).get('view');
  return v === 'compliance' ? 'compliance' : 'planning';
}

function InspectorShiftsBody() {
  const s = useIims();
  const view = embedViewParam();
  const module = React.useMemo(() => buildInspectorShiftsModule(s), [s]);
  const tab = module.tabs?.find((t) => t.id === view) ?? module.tabs?.[0];
  return <div className="min-h-0 flex-1">{tab?.render?.() ?? null}</div>;
}

export default function App() {
  return (
    <IimsProvider>
      <div style={{ height: '100vh' }} className="flex flex-col">
        <InspectorShiftsBody />
      </div>
      <Toaster position="bottom-right" richColors />
    </IimsProvider>
  );
}
