'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname, notFound } from 'next/navigation';
import { isStaff, can, type UserType } from '@amana/shared-types';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { permissionForPath } from '@/lib/nav';

/** رسائل حجب الحسابات غير النشطة. */
const BLOCK_REASONS: Record<string, string> = {
  pending_invite: 'حسابك بانتظار قبول الدعوة. تحقق من بريدك الإلكتروني.',
  pending_approval: 'حسابك بانتظار موافقة الإدارة.',
  suspended: 'تم تعليق حسابك مؤقتاً. تواصل مع المدير.',
  disabled: 'تم تعطيل حسابك. تواصل مع المدير.',
};

/**
 * غلاف يحمي لوحة الإدارة:
 *  - بلا جلسة → /sign-in
 *  - حساب راكبة/سائقة → تسجيل خروج + /sign-in
 *  - حساب غير نشط (pending/suspended/disabled) → شاشة «الحساب غير متاح»
 *  - حساب نشط بلا صلاحية الشاشة الحالية → 404 (notFound)
 * يقرأ الدور/الحالة من سياق المصادقة (مصدر واحد).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading, role, status, profileLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // توجيه غير المصادَقين + إنهاء جلسة غير الموظفين.
  useEffect(() => {
    if (isLoading || profileLoading) return;
    if (!session) {
      router.replace('/sign-in');
      return;
    }
    if (role && !isStaff(role)) {
      supabase.auth.signOut().finally(() => router.replace('/sign-in'));
    }
  }, [isLoading, profileLoading, session, role, router]);

  // أثناء تحميل الجلسة/الملف: لا نعرض شيئًا (نتجنّب وميض المحتوى أو 404 خاطئ).
  if (isLoading || !session || profileLoading) {
    return null;
  }

  // راكبة/سائقة: لا عرض (يجري توجيهها في الـeffect).
  if (role && !isStaff(role)) {
    return null;
  }

  // حجب الحسابات غير النشطة برسالة واضحة.
  if (status && status !== 'active') {
    const reason = BLOCK_REASONS[status] ?? 'حسابك غير متاح حالياً. تواصل مع المدير.';
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">الحساب غير متاح</h2>
          <p className="text-muted-foreground">{reason}</p>
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

  // بوابة الصلاحية: الشاشة الحالية تتطلّب صلاحية لا يملكها المستخدم → 404 احترافية.
  const required = permissionForPath(pathname);
  if (required && role && !can(role, required)) {
    notFound();
  }

  return <>{children}</>;
}
