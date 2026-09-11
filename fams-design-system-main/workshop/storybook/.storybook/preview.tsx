import { withThemeByDataAttribute } from '@storybook/addon-themes'
import type { Decorator, Preview } from '@storybook/react-vite'
import './preview.css'

/**
 * Tenant + locale chrome, mirroring how `workshop/showcase` proves rule 6
 * (one component, tenants differ only via `data-tenant`) and rule 4 (RTL is a
 * first-class locale, proven globally rather than per-demo). Both are written
 * onto the preview iframe's <html>, which is what the token CSS keys off.
 */
const withTenantAndLocale: Decorator = (Story, ctx) => {
  const root = document.documentElement
  root.setAttribute('data-tenant', String(ctx.globals.tenant ?? 'fams'))
  const lang = String(ctx.globals.locale ?? 'en')
  root.setAttribute('lang', lang)
  root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
  return <Story />
}

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    // The token layer owns the page background (light/dark) — Storybook's own
    // background switcher would fight it.
    backgrounds: { disable: true },
    layout: 'centered',
  },
  initialGlobals: {
    tenant: 'fams',
    locale: 'en',
  },
  globalTypes: {
    tenant: {
      description: 'Tenant token overrides (data-tenant on <html>)',
      toolbar: {
        title: 'Tenant',
        icon: 'globe',
        items: [
          { value: 'fams', title: 'FAMS' },
          { value: 'iwmp', title: 'IWMP' },
          { value: 'ead', title: 'EAD' },
          { value: 'uccp', title: 'UCCP' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Locale + direction (lang/dir on <html>)',
      toolbar: {
        title: 'Locale',
        icon: 'transfer',
        items: [
          { value: 'en', title: 'English (LTR)' },
          { value: 'ar', title: 'العربية (RTL)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    // Light/dark is EXPLICIT, never media-query-derived: the toolbar writes
    // `data-theme="light"` / `data-theme="dark"` on <html>, which is exactly
    // what `@fams/tokens` keys its dark mode off (`:root[data-theme="dark"]`)
    // and exactly what the showcase header toggle does (decision #2, ruling ⑤).
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
    withTenantAndLocale,
  ],
}

export default preview
