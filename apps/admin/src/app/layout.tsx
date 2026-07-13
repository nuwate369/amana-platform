import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// خط الهوية — Cairo
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'أمانة | لوحة الإدارة',
  description: 'لوحة إدارة منصة أمانة للتنقّل الذكي',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cairo.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
