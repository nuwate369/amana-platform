import type { Metadata } from 'next';
import LandingClient from '@/components/landing-client';

/**
 * صفحة الهبوط العامّة لمنصّة أمانة (الجذر `/`).
 * صفحة خادم رقيقة: تُصدّر الـ metadata فقط وتعرض المكوّن العميل (اللغة/الثيم تفاعليّان).
 * عامّة بلا مصادقة؛ لوحة الإدارة تبقى على /dashboard خلف حارس RequireAuth.
 */

export const metadata: Metadata = {
  title: 'أمانة | تنقّلي بأمان — منصّة النقل الذكيّة للمرأة',
  description:
    'أمانة منصّة تنقّل ذكيّة مصمّمة للمرأة: سائقات موثّقات، تتبّع مباشر، زرّ طوارئ، ومساعدة ذكيّة لاختيار وجهتك. رحلتكِ بين يديكِ.',
};

export default function Page() {
  return <LandingClient />;
}
