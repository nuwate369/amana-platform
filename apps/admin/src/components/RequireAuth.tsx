'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

/**
 * غلاف يحمي الصفحات التي تتطلّب جلسة نشطة.
 * أثناء التحميل لا يعرض شيئًا؛ وبلا جلسة يوجّه إلى /sign-in؛ وإلا يعرض المحتوى.
 *
 * TODO(المرحلة اللاحقة): الحماية الحالية على جهة العميل عبر supabase-js فقط.
 * الخطوة القادمة المخطّطة هي حماية SSR مبنيّة على الكوكيز باستخدام
 * @supabase/ssr مع middleware في Next.js لمنع وميض المحتوى وحماية الخادم.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/sign-in');
    }
  }, [session, isLoading, router]);

  if (isLoading || !session) {
    return null;
  }

  return <>{children}</>;
}
