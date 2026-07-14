'use client';

import { createI18n, DEFAULT_LOCALE } from '@amana/i18n';

// العربية افتراضية. اتجاه الصفحة (dir) يُضبط في app/layout.tsx.
const storedLang = typeof window !== 'undefined' ? localStorage.getItem('amana-lang') || DEFAULT_LOCALE : DEFAULT_LOCALE;
export const i18n = createI18n({ locale: storedLang as any });
