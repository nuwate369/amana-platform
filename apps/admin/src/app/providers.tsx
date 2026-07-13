'use client';

import { ThemeProvider } from 'next-themes';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import type { ReactNode } from 'react';
import { i18n } from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth';

/**
 * مزوّدات جهة العميل: الوضع الداكن (next-themes) + الترجمة (react-i18next)
 * + سياق المصادقة (AuthProvider) + مُنبّهات (react-hot-toast).
 * موضع المُنبّه: أعلى اليمين (يناسب RTL العربي الافتراضي).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'inherit', direction: 'rtl' },
            success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
            error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
      </I18nextProvider>
    </ThemeProvider>
  );
}
