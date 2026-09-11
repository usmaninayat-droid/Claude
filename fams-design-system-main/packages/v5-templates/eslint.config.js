import baseConfig from '../ui-kit/eslint.config.js'

/**
 * v5-templates reuses ui-kit's shared quality rules verbatim (same lint law
 * — the patterns tier is product-specific in vocabulary, never in quality).
 *
 * It does NOT inherit ui-kit's core-tier boundary rule banning `@fams/v5-*`
 * imports (decision #13), though — that rule exists to keep the CORE
 * (tokens/ui-kit/skeleton-kit) product-agnostic. v5-templates IS the v5
 * tier: it may import a sibling v5-tier package (e.g. a future v5-kit) once
 * one exists, so that ban doesn't make sense here. The override below keeps
 * everything else from `no-restricted-imports` (currently just the Radix
 * ban, decision #7) and drops only the v5-boundary pattern.
 */
export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@radix-ui/*', 'radix-ui'],
              message:
                'New Radix usage is banned (decision #7): use @base-ui/react (or React Aria for date/time pickers).',
            },
          ],
        },
      ],
    },
  },
]
