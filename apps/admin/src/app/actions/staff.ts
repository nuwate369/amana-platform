'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { inviteStaffSchema } from '@amana/shared-ui/validation';
import type { UserType } from '@amana/shared-types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** صفّ موظف إداري كما يُعرض في جدول /staff. */
export interface StaffRow {
  id: string;
  name: string;
  email: string;
  userType: UserType;
  isProtected: boolean;
  createdAt: string;
}

/**
 * قائمة موظفي الإدارة — user_type IN ('super_admin', 'admin', 'support').
 * يدمج بيانات profiles مع auth.users لجلب البريد الإلكتروني.
 */
export async function listStaff(): Promise<StaffRow[]> {
  const [{ data: profiles }, { data: authList }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, user_type, is_protected, created_at')
      .in('user_type', ['super_admin', 'admin', 'support'])
      .order('created_at', { ascending: false }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map<string, string>();
  (authList?.users ?? []).forEach((u) => emailById.set(u.id, u.email ?? ''));

  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.full_name || '—',
    email: emailById.get(p.id) || '',
    userType: p.user_type as UserType,
    isProtected: !!p.is_protected,
    createdAt: p.created_at,
  }));
}

/**
 * دعوة موظف جديد عبر inviteUserByEmail.
 * - يُرسل userType في metadata ليقرأه trigger handle_new_user
 * - يُحدّث profiles مباشرةً بعد الدعوة (في حال وُجد الصف مسبقاً)
 * - يقبل فقط: 'super_admin' | 'admin' | 'support' — طبقة تحقق على الخادم
 */
export async function inviteStaffUser(email: string, userType: string) {
  // طبقة تحقّق ثانية على الخادم — لا نثق بمدخلات العميل
  const parsed = inviteStaffSchema.safeParse({ email, userType });
  if (!parsed.success) {
    return { success: false, error: 'بيانات غير صحيحة' };
  }

  const validEmail = parsed.data.email;
  const validType = parsed.data.userType;

  try {
    // 1. إرسال دعوة عبر Supabase Auth
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      validEmail,
      {
        data: {
          user_type: validType, // يقرأه trigger handle_new_user
          full_name: 'موظف جديد',
        },
      },
    );

    if (inviteError) {
      if (inviteError.message.includes('User already registered') || inviteError.status === 422) {
        return { success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً.' };
      }
      return { success: false, error: inviteError.message };
    }

    const userId = data.user.id;

    // 2. تحديث profiles مباشرةً (للتأكد من القيمة الصحيحة)
    //    ملاحظة: user_type لا يُغيَّر بعد الإنشاء بموجب الـ trigger،
    //    لكن هذا upsert يعمل فقط إذا كان الصف غير موجود بعد.
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        user_type: validType,
        full_name: 'موظف جديد',
        is_protected: false,
      });

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ غير متوقع' };
  }
}

/**
 * حذف موظف — يرفض الحسابات المحمية (is_protected = true).
 * الـ DB trigger سيرفض أيضاً من جانبه كضمان مزدوج.
 */
export async function deleteStaffUser(userId: string) {
  try {
    // التحقق أولاً من أن الحساب غير محمي
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_protected, user_type')
      .eq('id', userId)
      .single();

    if (profile?.is_protected) {
      return { success: false, error: 'لا يمكن حذف هذا الحساب لأنه محمي.' };
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ غير متوقع' };
  }
}
