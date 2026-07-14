'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { isStaff, type UserType } from '@amana/shared-types';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';

/**
 * غلاف يحمي لوحة الإدارة: يتطلّب جلسة نشطة + حساب موظف (isStaff) + حالة active.
 * - بلا جلسة → /sign-in
 * - حساب راكبة/سائقة → تسجيل خروج + /sign-in
 * - حساب suspended/disabled → /sign-in مع رسالة
 * - حساب pending_invite → /sign-in مع رسالة
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/sign-in');
      return;
    }

    let alive = true;
    supabase
      .from('profiles')
      .select('user_type, status')
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
        if (!ut || !isStaff(ut)) {
          // راكبة/سائقة حاولت دخول اللوحة → إنهاء الجلسة ثم توجيه
          supabase.auth.signOut().finally(() => router.replace('/sign-in'));
          return;
        }

        // فحص الحالة
        const status = data?.status as string | undefined;
        if (status === 'active' || !status) {
          // active أو الحالة غير موجودة (قبل الهجرة) → نسمح
          setAllowed(true);
        } else if (status === 'pending_invite') {
          setBlockReason('حسابك بانتظار قبول الدعوة. تحقق من بريدك الإلكتروني.');
          setAllowed(false);
        } else if (status === 'pending_approval') {
          setBlockReason('حسابك بانتظار موافقة الإدارة.');
          setAllowed(false);
        } else if (status === 'suspended') {
          setBlockReason('تم تعليق حسابك مؤقتاً. تواصل مع المدير.');
          setAllowed(false);
        } else if (status === 'disabled') {
          setBlockReason('تم تعطيل حسابك. تواصل مع المدير.');
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      });

    return () => {
      alive = false;
    };
  }, [session, isLoading, router]);

  if (isLoading || !session) {
    return null;
  }

  if (allowed !== true) {
    // إذا كان هناك سبب للحظر، نعرض صفحة حظر
    if (blockReason) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8 max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">الحساب غير متاح</h2>
            <p className="text-muted-foreground">{blockReason}</p>
            <button
              onClick={() => {
                supabase.auth.signOut();
                router.replace('/sign-in');
              }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-xl font-semibold transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}
