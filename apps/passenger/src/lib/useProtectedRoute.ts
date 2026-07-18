import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/lib/auth';

/**
 * يحمي المسارات حسب الجلسة + حالة التفعيل:
 *  - بلا جلسة وخارج (auth) ⇐ تسجيل الدخول.
 *  - بجلسة لكن غير مفعّلة (بانتظار موافقة الإدارة أو محظورة) ⇐ شاشة «قيد المراجعة».
 *  - بجلسة ومفعّلة وداخل (auth)/الانتظار/الجذر ⇐ الرئيسية.
 * محميّ ضد حلقات إعادة التوجيه بالتحقق من المقطع الأول قبل التوجيه.
 */
export function useProtectedRoute() {
  const { session, isLoading, isApproved, profileLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // نتعامل مع المقاطع كسلاسل عامّة (أنواع المسارات المولّدة تمنع فحص length===0).
    const seg = segments as string[];
    const inAuthGroup = seg[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    // جلسة قائمة — ننتظر تحميل حالة التفعيل قبل القرار.
    if (profileLoading) return;

    const onPending = seg[0] === 'pending';

    if (!isApproved) {
      // غير مفعّلة ⇒ تُحبَس في شاشة الانتظار (لا تدخل التطبيق).
      if (!onPending) router.replace('/pending');
      return;
    }

    // مفعّلة ⇒ تُنقَل من شاشات المصادقة/الانتظار/الجذر إلى الرئيسية.
    if (inAuthGroup || onPending || seg.length === 0) {
      router.replace('/(tabs)/home');
    }
  }, [session, isLoading, isApproved, profileLoading, segments, router]);
}
