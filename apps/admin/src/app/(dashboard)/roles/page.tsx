import { redirect } from 'next/navigation';

/**
 * صفحة /roles أُزيلت نهائياً — نظام RBAC لم يعد موجوداً.
 * الصلاحيات ثابتة بالكود في can() بـ packages/shared-types.
 * هذا Redirect يضمن عدم ظهور 404 للروابط القديمة.
 */
export default function RolesRedirectPage() {
  redirect('/staff');
}
