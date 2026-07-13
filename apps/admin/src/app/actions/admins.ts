'use server';

/**
 * هذا الملف أُهمِل بالكامل — نظام RBAC لم يعد موجوداً.
 *
 * الاستبدال:
 *   - inviteAdminUser    → apps/admin/src/app/actions/staff.ts → inviteStaffUser
 *   - listAdminUsers     → apps/admin/src/app/actions/staff.ts → listStaff
 *   - listAdminRoles     → محذوف (لا جداول admin_roles بعد الآن)
 *   - listAllPermissions → محذوف (لا جداول admin_permissions بعد الآن)
 *   - createAdminRole    → محذوف (الصلاحيات ثابتة بالكود في can() بـ shared-types)
 *   - updateAdminUserRole→ محذوف (user_type غير قابل للتغيير بعد الإنشاء)
 *
 * لا تستورد من هذا الملف — سيُحذف في نسخة مستقبلية.
 */

// Re-export من staff.ts للتوافق مع أي import قديم
export { listStaff as listAdminUsers, inviteStaffUser as inviteAdminUser } from './staff';
