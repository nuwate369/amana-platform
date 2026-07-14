import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState, type Href } from 'expo-router';
import { docsComplete, useAuth, type DriverRecord } from '@/lib/auth';

/**
 * يحدّد الوجهة الصحيحة لسائقة مسجّلة الدخول حسب حالة اعتمادها:
 *  - لا صف سائقة بعد            ⇐ /kyc  (لترفع المستندات)
 *  - مرفوضة                     ⇐ /kyc  (لإعادة الرفع)
 *  - معتمدة (approved)          ⇐ /(tabs)/home  (الوصول الكامل)
 *  - مستندات ناقصة              ⇐ /kyc
 *  - مستندات مكتملة قيد المراجعة ⇐ /pending
 */
export function destinationFor(driver: DriverRecord | null): Href {
  if (!driver) return '/kyc';
  if (driver.status === 'approved') return '/(tabs)/home';
  if (driver.status === 'rejected') return '/kyc';
  return docsComplete(driver) ? '/pending' : '/kyc';
}

/** المقطع الأول من المسار المقابل لكل وجهة (لكشف «هل نحن في المكان الصحيح؟»). */
function segmentOf(dest: Href): string {
  if (dest === '/(tabs)/home') return '(tabs)';
  if (dest === '/pending') return 'pending';
  return 'kyc';
}

/**
 * حارس المسارات — يمنع الوصول لأي شاشة قبل اكتمال دورة الاعتماد:
 *  - بلا جلسة        ⇐ توجيه إجباري لتسجيل الدخول.
 *  - بجلسة           ⇐ توجيه للوجهة المحسوبة من حالة السائقة، ولا يُسمح بتجاوزها.
 * محميّ ضد حلقات إعادة التوجيه بمقارنة المقطع الأول قبل أي توجيه.
 */
export function useProtectedRoute() {
  const { session, driver, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // مفتاح جاهزية المُوجِّه الجذر — لا نُوجّه قبل تركيبه (يمنع خطأ «navigation context»
  // الذي يظهر عند إعادة بناء التطبيق بعد فتح منتقي الصور على أندرويد).
  const navReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    if (isLoading || !navReady) return;

    const seg0 = segments[0] as string | undefined;
    const inAuthGroup = seg0 === '(auth)';

    if (!session) {
      // لا جلسة: تُسمح مجموعة (auth) فقط.
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    // جلسة قائمة: احسب الوجهة المسموح بها وامنع أي شاشة سواها.
    const dest = destinationFor(driver);
    const atDest = seg0 === segmentOf(dest);
    if (!atDest) router.replace(dest);
  }, [session, driver, isLoading, navReady, segments, router]);
}
