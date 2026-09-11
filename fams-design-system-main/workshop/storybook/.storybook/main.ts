import { createRequire } from 'node:module'
import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import { mergeConfig } from 'vite'

// The FAMS design system (@fams/ui-kit / @fams/tokens) is consumed as BUILT
// DIST via the package `exports` map — exactly like `workshop/showcase` does
// (see its vite.config.ts for the full rationale):
//   - optimizeDeps.exclude keeps Vite from pre-bundling the linked workspace
//     packages (stale pre-bundle after a `dist` rebuild).
//   - server.fs.allow lets Vite read the sibling workspace packages across
//     pnpm's symlinks (sourcemaps / on-disk dist).
//   - dedupe + alias pin a SINGLE React copy so hooks inside the linked
//     library don't null the dispatcher ("Invalid hook call").
const require = createRequire(import.meta.url)

const reactAliases = [
  { find: /^react$/, replacement: require.resolve('react') },
  { find: /^react-dom$/, replacement: require.resolve('react-dom') },
  { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
  { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
]

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    // All three are MIT, same 10.x line as the `storybook` core package
    // (docs/LIBRARIES.md § Alignment). No hosted service is involved —
    // Chromatic and every other SaaS addon is explicitly excluded (hard rule 1).
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  // No phone-home: Storybook's telemetry + crash reporting are opt-out, and
  // this repo opts out (hard rule 1 — no mandatory SaaS, and nothing about the
  // component library leaves the machine).
  core: { disableTelemetry: true, enableCrashReports: false },
  // PropsTables are transcribed from the real TS interfaces, same generator
  // the showcase's PropsTable uses.
  typescript: { reactDocgen: 'react-docgen-typescript' },
  viteFinal: (cfg) =>
    mergeConfig(cfg, {
      plugins: [tailwindcss()],
      resolve: {
        dedupe: ['react', 'react-dom'],
        alias: reactAliases,
      },
      server: {
        fs: { allow: ['..', '../..', '../../..'] },
      },
      optimizeDeps: {
        exclude: ['@fams/ui-kit', '@fams/tokens'],
      },
    }),
}

export default config
