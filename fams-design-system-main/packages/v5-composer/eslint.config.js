import baseConfig from '../ui-kit/eslint.config.js'

/**
 * @fams/v5-composer reuses ui-kit's shared quality rules verbatim (same lint
 * law — the v5 tier is product-aware in vocabulary, never in quality).
 *
 * Like @fams/v5-templates, it does NOT inherit ui-kit's core-tier boundary
 * rule banning `@fams/v5-*` imports (decision #13): that rule keeps the CORE
 * (tokens/ui-kit/skeleton-kit) product-agnostic, but v5-composer IS the v5
 * tier and may import sibling v5-tier packages. The override below keeps
 * everything else from `no-restricted-imports` (the Radix ban, decision #7)
 * and drops only the v5-boundary pattern.
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
