const { createPreset } = require('@amana/shared-ui/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // على الموبايل نتبع مظهر الجهاز تلقائيًا (فاتح/داكن).
  darkMode: 'media',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/shared-ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset'), createPreset('driver')],
  theme: {
    extend: {
      // خط IBM Plex Sans Arabic — مطابق لتصميم Stitch.
      fontFamily: {
        plex: ['IBMPlexSansArabic_400Regular'],
        'plex-medium': ['IBMPlexSansArabic_500Medium'],
        'plex-semibold': ['IBMPlexSansArabic_600SemiBold'],
        'plex-bold': ['IBMPlexSansArabic_700Bold'],
      },
    },
  },
  plugins: [],
};
