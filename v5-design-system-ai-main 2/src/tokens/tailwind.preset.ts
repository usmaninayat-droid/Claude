/**
 * FAMS V5 — Tailwind 4 Preset
 * ---------------------------
 * Imported by consuming apps via `tailwind.config.ts`:
 *
 *   import { famsV5Preset } from '@fams-v5/tokens/tailwind.preset';
 *   export default { presets: [famsV5Preset], content: ['./src/...'] };
 *
 * Tailwind 4 strongly favors CSS-variable-driven theming (the `@theme`
 * directive in CSS). This preset keeps a `theme.extend` map so utilities
 * like `bg-primary`, `text-foreground`, `rounded-lg` resolve to the CSS
 * variables defined in `theme.css`.
 *
 * All values reference CSS variables — never hardcode hex here. Tenant
 * overrides happen at the CSS layer (`packages/tokens/tenants/*.theme.css`).
 *
 * Animation utilities (`animate-in`, `fade-in-0`, `slide-in-from-*`, etc.)
 * are provided by the `tw-animate-css` package (Tailwind 4 successor to
 * the deprecated `tailwindcss-animate`). It ships as a CSS file and is
 * loaded by the consuming app's stylesheet via:
 *
 *   @import 'tw-animate-css';
 *
 * (See `examples/crm/src/styles.css` for an example.)
 */

import type { Config } from 'tailwindcss';

export const famsV5Preset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          lightest: 'var(--primary-lightest)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
          darkest: 'var(--primary-darkest)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        success: 'var(--status-success)',
        warning: 'var(--status-warning)',
        info: 'var(--status-info)',
        border: 'var(--border)',
        input: {
          DEFAULT: 'var(--input)',
          background: 'var(--input-background)',
        },
        ring: 'var(--ring)',
        surface: {
          minimal: 'var(--surface-minimal)',
          'low-contrast': 'var(--surface-low-contrast)',
        },
        overlay: {
          'white-20': 'var(--overlay-white-20)',
          'white-40': 'var(--overlay-white-40)',
          'white-60': 'var(--overlay-white-60)',
          'brand-20': 'var(--overlay-brand-20)',
          'brand-40': 'var(--overlay-brand-40)',
          'brand-60': 'var(--overlay-brand-60)',
          'black-20': 'var(--overlay-black-20)',
          'black-40': 'var(--overlay-black-40)',
          'black-60': 'var(--overlay-black-60)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
      },
      fontFamily: {
        sans: 'var(--font-family-sans)',
      },
      fontSize: {
        h1:        'var(--text-h1)',
        h2:        'var(--text-h2)',
        h3:        'var(--text-h3)',
        h4:        'var(--text-h4)',
        h5:        'var(--text-h5)',
        h6:        'var(--text-h6)',
        'body-xl': 'var(--text-body-xl)',
        'body-lg': 'var(--text-body-lg)',
        'body-md': 'var(--text-body-md)',
        'body-sm': 'var(--text-body-sm)',
        'body-xs': 'var(--text-body-xs)',
        caption:   'var(--text-caption)',
      },
      lineHeight: {
        h1: 'var(--line-height-h1)',
        h2: 'var(--line-height-h2)',
        h3: 'var(--line-height-h3)',
        h4: 'var(--line-height-h4)',
        h5: 'var(--line-height-h5)',
        h6: 'var(--line-height-h6)',
        'body-xl': 'var(--line-height-body-xl)',
        'body-lg': 'var(--line-height-body-lg)',
        'body-md': 'var(--line-height-body-md)',
        'body-sm': 'var(--line-height-body-sm)',
        'body-xs': 'var(--line-height-body-xs)',
        caption: 'var(--line-height-caption)',
      },
      fontWeight: {
        normal:    'var(--font-weight-normal)' as unknown as string,
        medium:    'var(--font-weight-medium)' as unknown as string,
        semibold:  'var(--font-weight-semibold)' as unknown as string,
        bold:      'var(--font-weight-bold)' as unknown as string,
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--elevation-sm)',
        DEFAULT: 'var(--elevation-md)',
        md: 'var(--elevation-md)',
        lg: 'var(--elevation-lg)',
        xl: 'var(--elevation-xl)',
        '2xl': 'var(--elevation-2xl)',
        '3xl': 'var(--elevation-3xl)',
      },
    },
  },
};

export default famsV5Preset;
