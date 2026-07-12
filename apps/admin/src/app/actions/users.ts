'use server';

import type { AuthResult } from '@amana/shared-types';
import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * مثال Server Action يستخدم صلاحية service role (خادم فقط).
 * يعيد عدد المستخدمين المسجّلين — بدون منطق أعمال معقّد بعد.
 * لاحقًا: صلاحيات/تحقّق من دور المستخدم الحالي قبل التنفيذ.
 */
export async function countUsers(): Promise<AuthResult<{ total: number }>> {
  try {
    const admin = getAdminSupabase();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return { data: null, error: { message: error.message } };
    }
    // total متاح في بعض إصدارات الـ SDK؛ نعتمد على طول الصفحة كحدّ أدنى مبدئي.
    const total = (data as unknown as { total?: number }).total ?? data.users.length;
    return { data: { total }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'خطأ غير معروف';
    return { data: null, error: { message } };
  }
}
