import type { StorybookConfig } from '@storybook/react-vite';

/**
 * FAMS V5 design-system component workbench.
 * Reuses the project's vite.config.ts (React + Tailwind 4 plugins), so stories
 * get the exact same token pipeline as the showcase + appshell entries.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
};

export default config;
