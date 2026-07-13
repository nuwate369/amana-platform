'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { inviteStaffSchema } from '@amana/shared-ui/validation';
import type { UserType } from '@amana/shared-types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * حسابات محمية بشكل دائم — لا يمكن حذفها أو تعديلها أو تعطيلها أو إعادة إرسال دعوتها.
 * هذه القائمة تُفحص قبل أي إجراء على القاعدة ولا تعتمد على عمود is_protected فقط.
 * أضف أي حسابsuper-admin هنا عند الحاجة.
 */
const PROTECTED_IDS = new Set([
  '4acfc35f-a2e1-4da5-bab4-df5e42f2adad', // nuwate369@gmail.com — المدير الرئيسي
]);

/** صفّ موظف إداري كما يُعرض في جدول /staff. */
export interface StaffRow {
  id: string;
  name: string;
  email: string;
  userType: UserType;
  isProtected: boolean;
  isActive: boolean;
  inviteStatus: 'pending' | 'active' | 'inactive';
  createdAt: string;
}

type SchemaInfo = {
  typeCol: 'user_type' | 'role';
  hasProtected: boolean;
  hasActive: boolean;
  staffValues: string[];
};

let _schema: SchemaInfo | null = null;
async function detectSchema(): Promise<SchemaInfo> {
  if (_schema) return _schema;

  const { error: eUserType } = await supabaseAdmin
    .from('profiles').select('user_type').limit(1);
  const typeCol = eUserType?.code === '42703' ? 'role' : 'user_type';

  const { error: eProt } = await supabaseAdmin
    .from('profiles').select('is_protected').limit(1);
  const hasProtected = eProt?.code !== '42703';

  const { error: eActive } = await supabaseAdmin
    .from('profiles').select('is_active').limit(1);
  const hasActive = eActive?.code !== '42703';

  const staffValues = typeCol === 'user_type'
    ? ['super_admin', 'admin', 'support']
    : ['admin'];

  _schema = { typeCol, hasProtected, hasActive, staffValues };
  return _schema;
}

/**
 * ترجمة أخطاء Supabase الشائعة إلى رسائل عربية واضحة.
 */
function translateSupabaseError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many requests'))
    return 'تم إرسال عدد كبير من الدعوات خلال فترة قصيرة. حاول مرة أخرى بعد بضع دقائق.';
  if (m.includes('user already registered') || m.includes('already exists'))
    return 'هذا البريد الإلكتروني مسجل مسبقاً.';
  if (m.includes('invalid email') || m.includes('invalid format'))
    return 'صيغة البريد الإلكتروني غير صحيحة.';
  if (m.includes('password') && m.includes('short'))
    return 'كلمة المرور قصيرة جداً.';
  if (m.includes('not found') || m.includes('does not exist'))
    return 'الحساب غير موجود.';
  if (m.includes('network') || m.includes('fetch'))
    return 'خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
  if (m.includes('protected') || m.includes('cannot be modified'))
    return 'هذا الحساب محمي ولا يمكن تعديله.';
  if (m.includes('invalid input value for enum'))
    return 'لتفعيل دورَي «مدير عام» و«دعم فني» يجب تطبيق تحديث قاعدة البيانات (هجرة user_type) أولًا.';
  return message || 'حدث خطأ غير متوقع.';
}

/**
 * فحص الحماية: hardcoded ID أو عمود is_protected في القاعدة.
 * يُستخدم كخط دفاع أول قبل أي تعديل/حذف/تعطيل.
 */
function isProtectedAccount(userId: string, dbIsProtected?: boolean): boolean {
  return PROTECTED_IDS.has(userId) || !!dbIsProtected;
}

function deriveInviteStatus(
  authUser: { invited_at?: string; last_sign_in_at?: string } | undefined,
  isActive: boolean,
): 'pending' | 'active' | 'inactive' {
  if (!isActive) return 'inactive';
  if (authUser?.invited_at && !authUser?.last_sign_in_at) return 'pending';
  return 'active';
}

function mapRow(
  p: any,
  authMap: Map<string, any>,
  schema: SchemaInfo,
): StaffRow {
  const auth = authMap.get(p.id);
  const dbIsProtected = schema.hasProtected ? !!p.is_protected : false;
  const isProtected = isProtectedAccount(p.id, dbIsProtected);
  const isActive = schema.hasActive ? !!p.is_active : true;
  return {
    id: p.id,
    name: p.full_name || '—',
    email: auth?.email ?? '',
    userType: (p[schema.typeCol] || 'admin') as UserType,
    isProtected,
    isActive,
    inviteStatus: deriveInviteStatus(auth, isActive),
    createdAt: p.created_at,
  };
}

/**
 * قائمة موظفي الإدارة.
 */
export async function listStaff(): Promise<StaffRow[]> {
  const schema = await detectSchema();
  const cols = ['id', 'full_name', schema.typeCol, 'created_at'];
  if (schema.hasProtected) cols.push('is_protected');
  if (schema.hasActive) cols.push('is_active');

  const [{ data: profiles, error: profileErr }, { data: authList, error: authErr }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select(cols.join(', '))
      .in(schema.typeCol, schema.staffValues)
      .order('created_at', { ascending: false }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (profileErr) console.error('[listStaff] profiles error:', profileErr.code, profileErr.message);
  if (authErr) console.error('[listStaff] auth error:', authErr.message);

  const authMap = new Map<string, any>();
  (authList?.users ?? []).forEach((u) => authMap.set(u.id, u));

  return (profiles ?? []).map((p) => mapRow(p, authMap, schema));
}

/**
 * دعوة موظف جديد.
 */
export async function inviteStaffUser(email: string, userType: string) {
  const parsed = inviteStaffSchema.safeParse({ email, userType });
  if (!parsed.success) return { success: false, error: 'بيانات غير صحيحة' };

  const schema = await detectSchema();

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        data: { user_type: parsed.data.userType, full_name: 'موظف جديد' },
        redirectTo: `${siteUrl}/accept-invite`,
      },
    );

    if (inviteError) {
      if (inviteError.message.includes('User already registered') || inviteError.status === 422)
        return { success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً.' };
      return { success: false, error: translateSupabaseError(inviteError.message) };
    }

    const payload: Record<string, any> = { id: data.user.id, full_name: 'موظف جديد' };
    payload[schema.typeCol] = parsed.data.userType;
    if (schema.hasProtected) payload.is_protected = false;
    if (schema.hasActive) payload.is_active = true;

    await supabaseAdmin.from('profiles').upsert(payload);

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ غير متوقع' };
  }
}

/**
 * تعديل بيانات موظف (الاسم + النوع).
 * يرفض الحسابات المحمية.
 */
export async function editStaffUser(userId: string, fullName: string, userType: string) {
  const schema = await detectSchema();

  try {
    // حماية: فحص القائمة المحمية أولاً (حتى لو العمود غير موجود في القاعدة)
    if (isProtectedAccount(userId)) {
      return { success: false, error: 'لا يمكن تعديل هذا الحساب لأنه محمي.' };
    }
    // حماية إضافية: فحص عمود is_protected في القاعدة إن وُجد
    if (schema.hasProtected) {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('is_protected').eq('id', userId).single();
      if (profile?.is_protected) {
        return { success: false, error: 'لا يمكن تعديل هذا الحساب لأنه محمي.' };
      }
    }

    const update: Record<string, any> = { full_name: fullName };
    update[schema.typeCol] = userType;

    const { error } = await supabaseAdmin.from('profiles').update(update).eq('id', userId);
    if (error) return { success: false, error: translateSupabaseError(error.message) };

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: translateSupabaseError(err.message) };
  }
}

/**
 * تبديل حالة الموظف (active/inactive).
 * التعطيل يمنع تسجيل الدخول عبر is_active = false.
 * يرفض الحسابات المحمية.
 */
export async function toggleStaffStatus(userId: string) {
  const schema = await detectSchema();

  try {
    // حماية: فحص القائمة المحمية أولاً (حتى لو العمود غير موجود في القاعدة)
    if (isProtectedAccount(userId)) {
      return { success: false, error: 'لا يمكن تعطيل هذا الحساب لأنه محمي.' };
    }
    // حماية إضافية: فحص أعمدة القاعدة إن وُجدت
    if (schema.hasProtected) {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('is_protected, is_active').eq('id', userId).single();
      if (profile?.is_protected) {
        return { success: false, error: 'لا يمكن تعطيل هذا الحساب لأنه محمي.' };
      }
      if (schema.hasActive) {
        const newActive = !(profile?.is_active ?? true);
        const { error } = await supabaseAdmin
          .from('profiles').update({ is_active: newActive }).eq('id', userId);
        if (error) return { success: false, error: translateSupabaseError(error.message) };
      }
    }

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: translateSupabaseError(err.message) };
  }
}

/**
 * إعادة إرسال الدعوة.
 * يبطل الرابط القديم بإنشاء رابط جديد (inviteUserByEmail يُبطل القديم تلقائياً).
 */
export async function resendInvite(userId: string, email: string) {
  try {
    // حماية: رفض إعادة إرسال الدعوة للحسابات المحمية
    if (isProtectedAccount(userId)) {
      return { success: false, error: 'لا يمكن إعادة إرسال الدعوة لهذا الحساب لأنه محمي.' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { data: { user_type: 'admin', full_name: 'موظف جديد' }, redirectTo: `${siteUrl}/accept-invite` },
    );

    if (error) return { success: false, error: translateSupabaseError(error.message) };

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: translateSupabaseError(err.message) };
  }
}

/**
 * حذف موظف — يزيل auth.users (الذي يحذف profiles عبر CASCADE).
 * يتحقق فعلياً من نجاح الحذف قبل إرجاع النجاح.
 * يرفض الحسابات المحمية.
 */
export async function deleteStaffUser(userId: string) {
  try {
    // حماية: فحص القائمة المحمية أولاً (حتى لو العمود غير موجود في القاعدة)
    if (isProtectedAccount(userId)) {
      return { success: false, error: 'لا يمكن حذف هذا الحساب لأنه محمي.' };
    }
    // حماية إضافية: فحص عمود is_protected في القاعدة إن وُجد
    const schema = await detectSchema();
    if (schema.hasProtected) {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('is_protected').eq('id', userId).single();
      if (profile?.is_protected) {
        return { success: false, error: 'لا يمكن حذف هذا الحساب لأنه محمي.' };
      }
    }

    // الخطوة 1: حذف من auth.users (CASCADE يحذف profiles تلقائياً)
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return { success: false, error: translateSupabaseError(deleteErr.message) };
    }

    // الخطوة 2: التحقق الفعلي من نجاح الحذف
    // انتظار قصير للسماح بال CASCADE
    await new Promise((r) => setTimeout(r, 500));

    const [{ data: authData }, { data: profileCheck }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin.from('profiles').select('id').eq('id', userId).maybeSingle(),
    ]);

    const authStillExists = !!authData?.user;
    const profileStillExists = !!profileCheck;

    if (authStillExists || profileStillExists) {
      console.error(`[deleteStaffUser] Verification failed for ${userId}: auth=${authStillExists}, profile=${profileStillExists}`);
      return { success: false, error: 'فشلت عملية الحذف. حاول مرة أخرى.' };
    }

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: translateSupabaseError(err.message) };
  }
}
