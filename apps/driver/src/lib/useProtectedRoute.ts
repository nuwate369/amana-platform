import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState, type Href } from 'expo-router';
import { isSubmitted, useAuth, type DriverRecord } from '@/lib/auth';

/**
 * يحدّد الوجهة الصحيحة لسائقة مسجّلة الدخول حسب حالة اعتمادها:
 *  - لا صف سائقة بعد            ⇐ /kyc  (لترفع المستندات)
 *  - مرفوضة                     ⇐ /kyc  (لإعادة الرفع)
 *  - معتمدة (approved)          ⇐ /(tabs)/home  (الوصول الكامل)
 *  - مسودّة لم تُرسَل بعد         ⇐ /kyc  (تُكمِل بياناتها وتضغط «إرسال»)
 *  - أُرسِلت فعلاً للتدقيق        ⇐ /pending
 *
 * ملاحظة مهمّة: «قيد المراجعة» ليست مجرّد رفع الصور — بل ضغط «إرسال للتدقيق»
 * (kyc_submitted_at). فرفع صورة يحفظها فورًا لكنه لا يُرسِل الطلب، وبذلك لا
 * تظهر شاشة «قيد المراجعة» ما لم تُكمِل السائقة كل بياناتها وترسلها بنفسها.
 */
export function destinationFor(driver: DriverRecord | null): Href {
  if (!driver) return '/kyc';
  if (driver.status === 'approved') return '/(tabs)/home';
  if (driver.status === 'rejected') return '/kyc';
  return isSubmitted(driver) ? '/pending' : '/kyc';
}

/**
 * المقاطع الممنوعة على السائقة المعتمدة — وهي شاشات دورة الاعتماد والمصادقة فقط.
 *
 * قائمة **منع** لا قائمة سماح: القائمة البيضاء السابقة كانت تطرد السائقة من أيّ
 * شاشة جذرية غير مذكورة فيها (المحادثة، التقييم، الإشعارات)، فيقع `replace` يُعيد
 * بناء مجموعة التبويبات كاملة — فيُفكَّك موفّر الحضور (فتنقطع السائقة فعليًّا عن
 * النظام) وتُبنى الخريطة من جديد فيُعاد ضبط تقريبها. وكانت ستتكرّر مع كل شاشة
 * جديدة تُضاف. المنع يعكس القاعدة: المعتمدة تصل كل شيء إلا ما يخصّ الاعتماد.
 */
const BLOCKED_FOR_APPROVED = ['(auth)', 'kyc', 'pending'];

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

    // شاشة الشروط والأحكام معلوماتية — تُتاح في أي حالة (تُفتح من التسجيل و«حول»).
    if (seg0 === 'terms') return;

    if (!session) {
      // لا جلسة: تُسمح مجموعة (auth) فقط.
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    // جلسة قائمة: السائقة المعتمدة تتنقّل بحرّية في كل الشاشات عدا شاشات الاعتماد
    // والمصادقة؛ أمّا غير المعتمدة فمحصورة في وجهتها (kyc/pending).
    if (driver?.status === 'approved') {
      if (BLOCKED_FOR_APPROVED.includes(seg0 ?? '')) router.replace('/(tabs)/home');
      return;
    }
    const dest = destinationFor(driver);
    const atDest = seg0 === segmentOf(dest);
    if (!atDest) router.replace(dest);
  }, [session, driver, isLoading, navReady, segments, router]);
}
