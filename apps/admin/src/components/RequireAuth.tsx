'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { isStaff, type UserType } from '@amana/shared-types';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';

/**
 * غلاف يحمي لوحة الإدارة: يتطلّب جلسة نشطة + حساب من نوع موظّف (isStaff).
 * - بلا جلسة → /sign-in.
 * - حساب راكبة/سائقة → تسجيل خروج + /sign-in (لا يُسمح بدخول اللوحة).
 * - متسامح قبل تطبيق هجرة user_type: إن كان العمود غير موجود يُسمح بالدخول.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/sign-in');
      return;
    }

    let alive = true;
    supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!alive) return;
        // عمود user_type غير موجود بعد (نافذة ما قبل الهجرة) → نسمح
        if (error?.code === '42703') {
          setAllowed(true);
          return;
        }
        const ut = data?.user_type as UserType | undefined;
        if (!ut || isStaff(ut)) {
          setAllowed(true);
        } else {
          // راكبة/سائقة حاولت دخول اللوحة → إنهاء الجلسة ثم توجيه
          supabase.auth.signOut().finally(() => router.replace('/sign-in'));
        }
      });

    return () => {
      alive = false;
    };
  }, [session, isLoading, router]);

  if (isLoading || !session || allowed !== true) {
    return null;
  }

  return <>{children}</>;
}
