import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Appearance } from './components/settings';
import type { AppearanceValue } from './components/settings';
import { Toaster, toast, Switch } from './components/primitives';
import './styles.css';

/** Standalone Appearance demo (served at `/appearance.html`). Parity harness for
 *  Figma 2-6120 (main) / 2-6350 (unsaved-changes dialog). */

function Demo() {
  const [value, setValue] = React.useState<AppearanceValue>({ primary: '#0072D6', onPrimary: 'light' });
  const [canEdit, setCanEdit] = React.useState(true);
  return (
    <div style={{ height: '100vh' }} className="flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-6 py-2.5">
        <span className="text-body font-semibold text-foreground">Settings</span>
        <label className="ml-auto flex items-center gap-2 text-body-sm text-muted-foreground">
          Super-admin (canEdit)
          <Switch checked={canEdit} onCheckedChange={setCanEdit} aria-label="Toggle super-admin" />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Appearance
          value={value}
          canEdit={canEdit}
          onSave={(next) => { setValue(next); toast.success('Appearance saved'); }}
          onBack={() => toast('Back to Settings')}
        />
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);
