import type { Metadata } from 'next';
import { dirFor, DEFAULT_LOCALE } from '@amana/i18n';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'أمانة | لوحة الإدارة',
  description: 'لوحة إدارة منصة أمانة للتنقّل الذكي',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = DEFAULT_LOCALE;
  return (
    <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
