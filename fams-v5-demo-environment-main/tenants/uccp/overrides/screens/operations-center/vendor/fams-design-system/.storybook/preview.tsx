import * as React from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
import '../src/styles.css';

/**
 * Global tenant-theme switcher — mirrors the per-app `brand.theme` mechanism
 * the AppShell uses (inline CSS variables on a wrapper, not global :root), so
 * every story can be reviewed under each tenant skin from the toolbar.
 * Values mirror src/tokens/{fams-v5,tadweer,ead-rms}.theme.css.
 */
const TENANT_THEMES: Record<string, Record<string, string>> = {
  'fams-v5': {}, // base theme — no overrides
  tadweer: {
    '--primary': '#22C882',
    '--primary-foreground': '#FFFFFF',
    '--secondary': '#DCFAE6',
    '--secondary-foreground': '#22C882',
    '--accent': '#22C882',
    '--accent-foreground': '#FFFFFF',
    '--ring': '#DCFAE6',
    '--sidebar': '#22C882',
  },
  'ead-rms': {
    '--primary': '#004B87',
    '--primary-foreground': '#FFFFFF',
    '--secondary': '#EAECF0',
    '--secondary-foreground': '#004B87',
    '--accent': '#F79009',
    '--accent-foreground': '#FFFFFF',
    '--ring': '#EAECF0',
    '--sidebar': '#004B87',
    '--chart-1': '#004B87',
  },
};

const withTenantTheme: Decorator = (Story, context) => {
  const vars = TENANT_THEMES[context.globals.theme as string] ?? {};
  return (
    <div style={vars as React.CSSProperties} className="font-sans text-foreground">
      <Story />
    </div>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Tenant theme (white-label token overrides)',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'fams-v5', title: 'FAMS V5 (blue)' },
          { value: 'tadweer', title: 'Tadweer (green)' },
          { value: 'ead-rms', title: 'EAD RMS (navy)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'fams-v5' },
  decorators: [withTenantTheme],
  parameters: {
    controls: { matchers: { color: /(background|color|bg)$/i, date: /Date$/i } },
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default preview;
