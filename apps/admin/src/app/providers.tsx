'use client';

import { ThemeProvider } from 'next-themes';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { i18n } from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth';

/**
 * مزوّدات جهة العميل: الوضع الداكن (next-themes) + الترجمة (react-i18next)
 * + سياق المصادقة (AuthProvider).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>{children}</AuthProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}
