import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/lib/auth';

/**
 * يحمي المسارات حسب حالة الجلسة:
 *  - بلا جلسة وخارج مجموعة (auth) ⇐ توجيه لتسجيل الدخول.
 *  - بجلسة وداخل مجموعة (auth) ⇐ توجيه للصفحة الرئيسية.
 * محميّ ضد حلقات إعادة التوجيه عبر التحقق من المقطع الأول قبل التوجيه.
 */
export function useProtectedRoute() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, isLoading, segments, router]);
}
