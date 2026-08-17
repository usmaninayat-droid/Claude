import type { Config } from 'tailwindcss';
import preset from './src/tokens/tailwind.preset';

export default {
  presets: [preset as Config],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
