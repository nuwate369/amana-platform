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
 * كشف المخطط LiveData:
 *  - عمود التصنيف: `user_type` (enum جديد) أو `role` (enum قديم `user_role`)
 *  - عمود الحماية: `is_protected` قد لا يكون موجوداً بعد
 *  - enum القديم `user_role` يحتوي فقط على passenger/driver/admin
 */
type SchemaInfo = {
  typeCol: 'user_type' | 'role';
  hasProtected: boolean;
  staffValues: string[];
};

let _schema: SchemaInfo | null = null;
async function detectSchema(): Promise<SchemaInfo> {
  if (_schema) return _schema;

  // هل يوجد عمود user_type؟
  const { error: eUserType } = await supabaseAdmin
    .from('profiles').select('user_type').limit(1);
  const typeCol = eUserType?.code === '42703' ? 'role' : 'user_type';

  // هل يوجد عمود is_protected؟
  const { error: eProt } = await supabaseAdmin
    .from('profiles').select('is_protected').limit(1);
  const hasProtected = eProt?.code !== '42703';

  // القيم المدعومة في enum التصنيف
  const staffValues = typeCol === 'user_type'
    ? ['super_admin', 'admin', 'support']
    : ['admin']; // enum القديم `user_role` يدعم فقط admin

  _schema = { typeCol, hasProtected, staffValues };
  return _schema;
}

/** تحويل raw صف إلى StaffRow بشكل موحّد. */
function mapRow(p: any, emailById: Map<string, string>, schema: SchemaInfo): StaffRow {
  return {
    id: p.id,
    name: p.full_name || '—',
    email: emailById.get(p.id) || '',
    userType: (p[schema.typeCol] || 'admin') as UserType,
    isProtected: schema.hasProtected ? !!p.is_protected : false,
    createdAt: p.created_at,
  };
}

/**
 * قائمة موظفي الإدارة.
 * يعمل تلقائياً مع المخطط القديم (`role` + enum `user_role`) والجديد (`user_type`).
 */
export async function listStaff(): Promise<StaffRow[]> {
  const schema = await detectSchema();
  const selectCols = schema.hasProtected
    ? `id, full_name, ${schema.typeCol}, is_protected, created_at`
    : `id, full_name, ${schema.typeCol}, created_at`;

  const [{ data: profiles, error: profileErr }, { data: authList, error: authErr }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select(selectCols)
      .in(schema.typeCol, schema.staffValues)
      .order('created_at', { ascending: false }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (profileErr) {
    console.error('[listStaff] profiles error:', profileErr.code, profileErr.message);
  }
  if (authErr) {
    console.error('[listStaff] auth error:', authErr.message);
  }

  const emailById = new Map<string, string>();
  (authList?.users ?? []).forEach((u) => emailById.set(u.id, u.email ?? ''));

  return (profiles ?? []).map((p) => mapRow(p, emailById, schema));
}

/**
 * دعوة موظف جديد عبر inviteUserByEmail.
 */
export async function inviteStaffUser(email: string, userType: string) {
  const parsed = inviteStaffSchema.safeParse({ email, userType });
  if (!parsed.success) {
    return { success: false, error: 'بيانات غير صحيحة' };
  }

  const validEmail = parsed.data.email;
  const validType = parsed.data.userType;
  const schema = await detectSchema();

  try {
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      validEmail,
      {
        data: { user_type: validType, full_name: 'موظف جديد' },
      },
    );

    if (inviteError) {
      if (inviteError.message.includes('User already registered') || inviteError.status === 422) {
        return { success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً.' };
      }
      return { success: false, error: inviteError.message };
    }

    const userId = data.user.id;

    const payload: Record<string, any> = {
      id: userId,
      full_name: 'موظف جديد',
    };
    payload[schema.typeCol] = validType;
    if (schema.hasProtected) payload.is_protected = false;

    await supabaseAdmin.from('profiles').upsert(payload);

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ غير متوقع' };
  }
}

/**
 * حذف موظف — يرفض الحسابات المحمية إن وُجد عمود is_protected.
 */
export async function deleteStaffUser(userId: string) {
  try {
    const schema = await detectSchema();
    if (schema.hasProtected) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_protected')
        .eq('id', userId)
        .single();

      if (profile?.is_protected) {
        return { success: false, error: 'لا يمكن حذف هذا الحساب لأنه محمي.' };
      }
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
