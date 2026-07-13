'use server';

import { revalidatePath } from 'next/cache';
import type { UserType } from '@amana/shared-types';
import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * إجراءات الإشراف — الحظر/رفع الحظر ومراجعة KYC — مع تسجيل كل حركة في audit_logs.
 * تعمل بصلاحية service role (تتجاوز RLS، لا تتجاوز مُشغّلات الحماية على القاعدة).
 *
 * هوية المنفِّذ (actorId) تُمرَّر من العميل عبر useAuth؛ نلتقط لقطة اسمه ودوره
 * وقت التنفيذ. (تقوية خادمية لاحقة عبر @supabase/ssr مذكورة في PROJECT_MAP.)
 */

type ActionResult = { success: true } | { success: false; error: string };

/** أنواع الحركات المُسجَّلة. */
export type AuditActionType =
  | 'ban_user'
  | 'unban_user'
  | 'approve_driver'
  | 'reject_driver'
  | 'invite_staff'
  | 'edit_staff'
  | 'toggle_staff'
  | 'resend_invite'
  | 'delete_staff'
  | 'create_rating_question'
  | 'update_rating_question'
  | 'delete_rating_question';

export interface AuditLogRow {
  id: string;
  actorName: string | null;
  actorType: UserType | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  reason: string | null;
  createdAt: string;
}

/**
 * كتابة سطر في سجل الحركات. best-effort: أي فشل يُسجَّل في اللوق ولا يُفشل
 * العملية الأصلية (الحظر أهمّ من تدوينه). يلتقط لقطة اسم/دور المنفِّذ.
 * مُصدَّرة لإعادة الاستخدام من إجراءات الموظفين وأسئلة التقييم.
 */
export async function logAudit(params: {
  actorId: string | null;
  action: AuditActionType;
  targetType: string;
  targetId: string;
  targetName: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const db = getAdminSupabase();
  let actorName: string | null = null;
  let actorType: UserType | null = null;

  if (params.actorId) {
    const { data } = await db
      .from('profiles')
      .select('full_name, user_type')
      .eq('id', params.actorId)
      .maybeSingle();
    actorName = (data?.full_name as string | null) ?? null;
    actorType = (data?.user_type as UserType | null) ?? null;
  }

  const { error } = await db.from('audit_logs').insert({
    actor_id: params.actorId,
    actor_name: actorName,
    actor_type: actorType,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    target_name: params.targetName,
    reason: params.reason ?? null,
    metadata: params.metadata ?? null,
  });

  if (error) {
    console.error('[logAudit] failed:', error.code, error.message);
  }
}

/** جلب لقطة الهدف (الاسم + الحماية) قبل أي إجراء. */
async function getTarget(targetId: string) {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('profiles')
    .select('full_name, is_protected')
    .eq('id', targetId)
    .maybeSingle();
  if (error) return { error: error.message, name: null as string | null, protected: false };
  if (!data) return { error: 'الحساب غير موجود.', name: null, protected: false };
  return { error: null, name: (data.full_name as string | null) ?? null, protected: !!data.is_protected };
}

/**
 * حظر مستخدم (راكبة/سائقة): is_active=false + سبب + مَن نفّذ + وقت.
 * السبب إلزامي. الحسابات المحمية مرفوضة.
 */
export async function banUser(
  targetId: string,
  actorId: string | null,
  reason: string,
): Promise<ActionResult> {
  const trimmed = (reason ?? '').trim();
  if (trimmed.length < 3) {
    return { success: false, error: 'يجب ذكر سبب الحظر (٣ أحرف على الأقل).' };
  }

  try {
    const target = await getTarget(targetId);
    if (target.error) return { success: false, error: target.error };
    if (target.protected) {
      return { success: false, error: 'هذا الحساب محمي ولا يمكن حظره.' };
    }

    const db = getAdminSupabase();
    const { error } = await db
      .from('profiles')
      .update({
        is_active: false,
        ban_reason: trimmed,
        banned_by: actorId,
        banned_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes('protected')) return { success: false, error: 'هذا الحساب محمي ولا يمكن حظره.' };
      return { success: false, error: error.message };
    }

    await logAudit({
      actorId,
      action: 'ban_user',
      targetType: 'profile',
      targetId,
      targetName: target.name,
      reason: trimmed,
    });

    revalidatePath('/drivers');
    revalidatePath('/passengers');
    revalidatePath('/audit-log');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
    return { success: false, error: message };
  }
}

/** رفع الحظر: is_active=true + تصفير أعمدة الحظر. */
export async function unbanUser(targetId: string, actorId: string | null): Promise<ActionResult> {
  try {
    const target = await getTarget(targetId);
    if (target.error) return { success: false, error: target.error };

    const db = getAdminSupabase();
    const { error } = await db
      .from('profiles')
      .update({ is_active: true, ban_reason: null, banned_by: null, banned_at: null })
      .eq('id', targetId);

    if (error) return { success: false, error: error.message };

    await logAudit({
      actorId,
      action: 'unban_user',
      targetType: 'profile',
      targetId,
      targetName: target.name,
    });

    revalidatePath('/drivers');
    revalidatePath('/passengers');
    revalidatePath('/audit-log');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
    return { success: false, error: message };
  }
}

/** قبول طلب KYC للسائقة: drivers.status = approved. */
export async function approveDriver(driverId: string, actorId: string | null): Promise<ActionResult> {
  try {
    const target = await getTarget(driverId);
    const db = getAdminSupabase();
    const { error } = await db.from('drivers').update({ status: 'approved' }).eq('id', driverId);
    if (error) return { success: false, error: error.message };

    await logAudit({
      actorId,
      action: 'approve_driver',
      targetType: 'driver',
      targetId: driverId,
      targetName: target.name,
    });

    revalidatePath('/drivers');
    revalidatePath('/audit-log');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
    return { success: false, error: message };
  }
}

/** رفض طلب KYC للسائقة: drivers.status = rejected + سبب إلزامي. */
export async function rejectDriver(
  driverId: string,
  actorId: string | null,
  reason: string,
): Promise<ActionResult> {
  const trimmed = (reason ?? '').trim();
  if (trimmed.length < 3) {
    return { success: false, error: 'يجب ذكر سبب الرفض (٣ أحرف على الأقل).' };
  }
  try {
    const target = await getTarget(driverId);
    const db = getAdminSupabase();
    const { error } = await db.from('drivers').update({ status: 'rejected' }).eq('id', driverId);
    if (error) return { success: false, error: error.message };

    await logAudit({
      actorId,
      action: 'reject_driver',
      targetType: 'driver',
      targetId: driverId,
      targetName: target.name,
      reason: trimmed,
    });

    revalidatePath('/drivers');
    revalidatePath('/audit-log');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
    return { success: false, error: message };
  }
}

/** قائمة سجل الحركات (الأحدث أولًا). */
export async function listAuditLog(limit = 200): Promise<AuditLogRow[]> {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('audit_logs')
    .select('id, actor_name, actor_type, action, target_type, target_id, target_name, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[listAuditLog] error:', error.code, error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    actorName: r.actor_name,
    actorType: r.actor_type as UserType | null,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    targetName: r.target_name,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}
