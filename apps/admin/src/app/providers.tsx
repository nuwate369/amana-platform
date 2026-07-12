'use client';

import { ThemeProvider } from 'next-themes';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { i18n } from '@/lib/i18n';

/**
 * مزوّدات جهة العميل: الوضع الداكن (next-themes) + الترجمة (react-i18next).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </ThemeProvider>
  );
}
