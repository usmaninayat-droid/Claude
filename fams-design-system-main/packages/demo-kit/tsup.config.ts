import { defineConfig } from 'tsup'

export default defineConfig({
  // Three entries — the React-free core barrel (`index`), the optional React
  // persona hook (`react`), and the React DemoConsole subpath (`console/
  // index`). An `entry` OBJECT pins each output path (an array would flatten
  // `console/index` to `dist/index.js` by basename and collide with the core
  // barrel) — same reasoning as `@fams/v5-templates`'s `map/index` split.
  entry: { index: 'src/index.ts', react: 'src/react.ts', 'console/index': 'src/console/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ['react', 'react-dom', 'msw', 'msw/browser', 'msw/node'],
})
