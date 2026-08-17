import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Standalone test config (does NOT extend vite.config.ts — no tailwind/server
// concerns in the test pipeline). The spine specs are pure TS over src/sim +
// src/runtime, plus the config-bridge cache which only builds view-models.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.spec.{ts,tsx}'],
  },
});
