import type { Config } from 'tailwindcss';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPreset } = require('@amana/shared-ui/tailwind-preset');

// ملاحظة: مشروع الإدارة ويبي (Next.js) فيستخدم Tailwind CSS مباشرةً — وهو
// نفس محرّك nativewind — مع مشاركة لوحة الألوان عبر preset('admin').
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/shared-ui/src/**/*.{ts,tsx}',
  ],
  presets: [createPreset('admin')],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
