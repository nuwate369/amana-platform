'use client';

import { createI18n, DEFAULT_LOCALE } from '@amana/i18n';

// العربية افتراضية. اتجاه الصفحة (dir) يُضبط في app/layout.tsx.
export const i18n = createI18n({ locale: DEFAULT_LOCALE });
