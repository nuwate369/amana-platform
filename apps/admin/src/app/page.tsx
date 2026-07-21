import type { Metadata } from 'next';
import LandingClient from '@/components/landing-client';

/**
 * صفحة الهبوط العامّة لمنصّة أمانة (الجذر `/`).
 * صفحة خادم رقيقة: تُصدّر الـ metadata فقط وتعرض المكوّن العميل (اللغة/الثيم تفاعليّان).
 * عامّة بلا مصادقة؛ لوحة الإدارة تبقى على /dashboard خلف حارس RequireAuth.
 */

export const metadata: Metadata = {
  title: 'أمانة | المنصّة السعودية الأولى للتنقّل النسائي والخدمات الذكية (أمانة 100% نسائي)',
  description:
    'أمانة هي المنصّة السعودية الرائدة للتنقّل النسائي الذكي تماشياً مع رؤية 2030. سائقات موثّقات بالهوية والتحقق الجنائي، تتبّع مباشر 24/7، زر طوارئ SOS، مجموعات نقل مغلقة للطالبات والموظفات، ومخطط وجهات ذكي (AI Planner). تنقّلي بأمان وراحة لا تُضاهى.',
  keywords: [
    'أمانة',
    'تطبيق أمانة',
    'Amana',
    'Amana App',
    'توصيل نسائي',
    'تطبيق توصيل نسائي السعودية',
    'سائقات سعوديات',
    'تاكسي نسائي الرياض',
    'تطبيق نقل طالبات',
    'تطبيق نقل موظفات',
    'أمانة للتنقّل الذكي',
    'تطبيق سائقة نسائية',
    'Women ride hailing Saudi Arabia',
    'Amana Passenger',
    'Amana Driver',
  ],
  authors: [{ name: 'منصّة أمانة الذكيّة', url: 'https://amana-app.test' }],
  creator: 'أمانة تكنولوجي',
  publisher: 'Amana Platform KSA',
  metadataBase: new URL('https://amana-app.test'),
  openGraph: {
    title: 'أمانة (Amana) | أول منصة تنقّل نسائية ذكية بالكامل في السعودية 🇸🇦',
    description:
      'رحلتكِ بأمان مطلق وراحة تامّة. سائقات موثّقات بالتحقق الجنائي، مجموعات نقل مغلقة، تتبّع حي مباشر 24/7، ومساعد ذكي لاقتراح أجمل الوجهات.',
    url: 'https://amana-app.test',
    siteName: 'منصّة أمانة الذكيّة — Amana',
    locale: 'ar_SA',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'منصّة أمانة للتنقّل النسائي الذكي في السعودية',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'أمانة (Amana) | المنصّة السعودية الأولى للتنقّل النسائي والخدمات الذكية',
    description:
      'تنقّلي بأمان وراحة لا تُضاهى مع سائقات سعوديات موثّقات 100%، تتبّع مباشر 24/7، ومجموعات نقل دائرية مغلقة.',
    images: ['/og-image.png'],
    creator: '@AmanaKSA',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'Transportation & Mobility',
};

export default function Page() {
  return <LandingClient />;
}
