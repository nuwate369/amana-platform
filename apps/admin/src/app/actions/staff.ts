'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { inviteStaffSchema } from '@amana/shared-ui/validation';
import type { UserType } from '@amana/shared-types';
import { logAudit } from '@/app/actions/moderation';

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
  phone: string | null;
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

  const info: SchemaInfo = { typeCol, hasProtected, hasActive, staffValues };
  // لا نخزّن في الكاش إلا المخطط المكتمل — وإلا علِقت نتيجة «ما قبل الهجرة»
  // في ذاكرة الخادم وعطّلت التفعيل/التعطيل بصمت بعد تطبيق الهجرة.
  if (typeCol === 'user_type' && hasProtected && hasActive) _schema = info;
  return info;
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
  if (m.includes('immutable_user_type'))
    return 'تغيير الدور يتطلب تطبيق تحديث قاعدة البيانات (هجرة 0015) أولًا.';
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
    phone: p.phone ?? null,
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
  const cols = ['id', 'full_name', 'phone', schema.typeCol, 'created_at'];
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
 * دعوة موظف جديد — الاسم + البريد + الجوال (اختياري) + الدور.
 * الدور يُثبَّت لحظة الإنشاء ولا يتغيّر بعدها (مُشغّل قاعدة البيانات يمنع ذلك).
 * تُسجَّل الحركة في audit_logs باسم المنفِّذ.
 */
export async function inviteStaffUser(
  actorId: string | null,
  input: { email: string; userType: string; fullName: string; phone?: string },
) {
  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'بيانات غير صحيحة' };

  const schema = await detectSchema();

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        data: { user_type: parsed.data.userType, full_name: parsed.data.fullName },
        redirectTo: `${siteUrl}/accept-invite`,
      },
    );

    if (inviteError) {
      if (inviteError.message.includes('User already registered') || inviteError.status === 422)
        return { success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً.' };
      return { success: false, error: translateSupabaseError(inviteError.message) };
    }

    const payload: Record<string, any> = { id: data.user.id, full_name: parsed.data.fullName };
    if (parsed.data.phone) payload.phone = parsed.data.phone;
    payload[schema.typeCol] = parsed.data.userType;
    if (schema.hasProtected) payload.is_protected = false;
    if (schema.hasActive) payload.is_active = true;

    await supabaseAdmin.from('profiles').upsert(payload);

    await logAudit({
      actorId,
      action: 'invite_staff',
      targetType: 'staff',
      targetId: data.user.id,
      targetName: parsed.data.fullName,
      metadata: { email: parsed.data.email, userType: parsed.data.userType },
    });

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ غير متوقع' };
  }
}

/**
 * تعديل بيانات موظف (الاسم + الجوال + الدور).
 * تغيير الدور مسموح بين أدوار الموظفين فقط (يفرضه مُشغّل القاعدة بعد هجرة 0015
 * ولا يمرّ إلا عبر service_role). يرفض الحسابات المحمية. تُسجَّل الحركة في audit_logs.
 */
export async function editStaffUser(
  actorId: string | null,
  userId: string,
  fullName: string,
  phone?: string,
  userType?: string,
) {
  const schema = await detectSchema();

  // تحقّق مبكر: الدور الجديد ضمن أدوار الموظفين فقط
  if (userType && !schema.staffValues.includes(userType)) {
    return { success: false, error: 'الدور المحدد غير صحيح.' };
  }

  try {
    // حماية: فحص القائمة المحمية أولاً (حتى لو العمود غير موجود في القاعدة)
    if (isProtectedAccount(userId)) {
      return { success: false, error: 'لا يمكن تعديل هذا الحساب لأنه محمي.' };
    }
    // حماية إضافية: فحص عمود is_protected + الدور الحالي (يجب أن يكون موظفًا)
    let previousType: string | null = null;
    if (schema.hasProtected) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select(`is_protected, ${schema.typeCol}`)
        .eq('id', userId)
        .single();
      if ((profile as any)?.is_protected) {
        return { success: false, error: 'لا يمكن تعديل هذا الحساب لأنه محمي.' };
      }
      previousType = ((profile as any)?.[schema.typeCol] as string | null) ?? null;
      if (userType && previousType && !schema.staffValues.includes(previousType)) {
        return { success: false, error: 'لا يمكن تغيير دور حساب ليس من فريق العمل.' };
      }
    }

    const update: Record<string, any> = { full_name: fullName };
    if (phone !== undefined) update.phone = phone || null;
    if (userType) update[schema.typeCol] = userType;

    const { error } = await supabaseAdmin.from('profiles').update(update).eq('id', userId);
    if (error) return { success: false, error: translateSupabaseError(error.message) };

    await logAudit({
      actorId,
      action: 'edit_staff',
      targetType: 'staff',
      targetId: userId,
      targetName: fullName,
      metadata:
        userType && previousType && userType !== previousType
          ? { roleChanged: { from: previousType, to: userType } }
          : null,
    });

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
export async function toggleStaffStatus(actorId: string | null, userId: string) {
  const schema = await detectSchema();

  try {
    // حماية: فحص القائمة المحمية أولاً (حتى لو العمود غير موجود في القاعدة)
    if (isProtectedAccount(userId)) {
      return { success: false, error: 'لا يمكن تعطيل هذا الحساب لأنه محمي.' };
    }
    // فشل صريح بدل التخطي الصامت إن كان العمود غير موجود بعد
    if (!schema.hasActive) {
      return { success: false, error: 'تفعيل/تعطيل الحساب يتطلب تطبيق تحديث قاعدة البيانات (هجرة 0013) أولًا.' };
    }

    const cols = schema.hasProtected ? 'is_protected, is_active, full_name' : 'is_active, full_name';
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles').select(cols).eq('id', userId).single();
    if (pErr) return { success: false, error: translateSupabaseError(pErr.message) };
    if ((profile as any)?.is_protected) {
      return { success: false, error: 'لا يمكن تعطيل هذا الحساب لأنه محمي.' };
    }

    const newActive = !((profile as any)?.is_active ?? true);
    const { error } = await supabaseAdmin
      .from('profiles').update({ is_active: newActive }).eq('id', userId);
    if (error) return { success: false, error: translateSupabaseError(error.message) };

    await logAudit({
      actorId,
      action: 'toggle_staff',
      targetType: 'staff',
      targetId: userId,
      targetName: (profile as any)?.full_name ?? null,
      metadata: { isActive: newActive },
    });

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
export async function resendInvite(actorId: string | null, userId: string, email: string) {
  try {
    // حماية: رفض إعادة إرسال الدعوة للحسابات المحمية
    if (isProtectedAccount(userId)) {
      return { success: false, error: 'لا يمكن إعادة إرسال الدعوة لهذا الحساب لأنه محمي.' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // الملف الشخصي موجود مسبقًا (أُنشئ عند الدعوة الأولى) — لا نمرّر metadata
    // حتى لا نكتب فوق الاسم/الدور الصحيحَين.
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${siteUrl}/accept-invite` },
    );

    if (error) return { success: false, error: translateSupabaseError(error.message) };

    await logAudit({
      actorId,
      action: 'resend_invite',
      targetType: 'staff',
      targetId: userId,
      targetName: email,
    });

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
export async function deleteStaffUser(actorId: string | null, userId: string) {
  try {
    // حماية: فحص القائمة المحمية أولاً (حتى لو العمود غير موجود في القاعدة)
    if (isProtectedAccount(userId)) {
      return { success: false, error: 'لا يمكن حذف هذا الحساب لأنه محمي.' };
    }
    // حماية إضافية: فحص عمود is_protected في القاعدة إن وُجد + لقطة الاسم للسجل
    let targetName: string | null = null;
    const schema = await detectSchema();
    if (schema.hasProtected) {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('is_protected, full_name').eq('id', userId).single();
      targetName = profile?.full_name ?? null;
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

    // التسجيل بعد التحقق الفعلي من الحذف (actor_id يبقى؛ target حُذف فتبقى لقطة اسمه)
    await logAudit({
      actorId,
      action: 'delete_staff',
      targetType: 'staff',
      targetId: userId,
      targetName,
    });

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: translateSupabaseError(err.message) };
  }
}
