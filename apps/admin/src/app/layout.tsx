import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// ملاحظة: لا نستورد '@amana/i18n' هنا لأنه يجرّ react-i18next (createContext)
// إلى مكوّن خادمي، وهو ممنوع في App Router. العربية هي الافتراضية.

// خط الهوية — IBM Plex Sans Arabic (نفس خط تطبيقات الجوال).
const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'أمانة | لوحة الإدارة',
  description: 'لوحة إدارة منصة أمانة للتنقّل الذكي',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={plex.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
