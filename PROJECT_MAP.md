# خريطة مشروع أمانة (PROJECT_MAP)

مرجع حيّ لبنية المشروع وحالته. يُحدَّث مع كل تعديل جراحي.

## البنية العامة
مونوريبو (npm workspaces) لثلاثة تطبيقات تتشارك خلفية Supabase واحدة:
- `apps/passenger` — تطبيق الراكبة (Expo / React Native، بنفسجي).
- `apps/driver` — تطبيق السائقة (Expo / React Native، كحلي).
- `apps/admin` — لوحة الإدارة (Next.js 15 App Router، أنثراسايت + ذهبي).

حزم مشتركة:
- `packages/shared-types` — الأنواع + **نظام الصلاحيات المركزي** `can(userType, action)`.
- `packages/shared-ui` — `tokens`, `tailwind-preset`, مخططات التحقق `validation.ts` (zod).
- `packages/i18n` — الترجمة (ar/en، RTL افتراضي).

## نموذج الهوية والصلاحيات (المصدر: `packages/shared-types/src/index.ts`)
`profiles.user_type` (enum ثابت، **غير قابل للتغيير بعد الإنشاء** — محمي بـ DB trigger):
| النوع | المصدر | الصلاحية |
|---|---|---|
| `passenger` | تطبيق الراكبة (تلقائي) | لا دخول للوحة |
| `driver` | تطبيق السائقة (تلقائي) | لا دخول للوحة |
| `super_admin` | تثبيت يدوي (nuwate369@gmail.com) | كل شيء + إدارة الموظفين |
| `admin` | دعوة من super_admin | **مشاهدة كل الأقسام فقط** |
| `support` | دعوة من super_admin | مشاهدة شاشات محددة (لوحة/سائقات/ركاب/رحلات/تقارير) |

الصلاحيات كلها في `can()` — لإضافة نوع: عدّل الـenum + `can()` + `STAFF_TYPE_LABELS/COLORS`.

## قاعدة البيانات
- **مطبَّق فعليًا:** `0001_init` (profiles/drivers/rides/ratings/groups + enum `user_role` + `handle_new_user`) و`0002_rls`.
- **يجب تطبيقه:** `0007_user_type.sql` — يضيف `user_type`+`is_protected`+`is_active`+`preferred_language`+`preferred_theme`، مُشغّل حماية (يمنع تغيير النوع + يحمي الحسابات المحمية)، تثبيت super_admin، سياسات التخزين. يُبقي عمود `role` (deprecated).
  - **يُطبَّق يدويًا في Supabase SQL Editor** (لا يمكن تنفيذ DDL برمجيًا).
- **ملغاة — لا تُطبَّق (نظام admin_roles القديم المهجور):** `0003_rbac`, `0004_admin_status`, `0005_seed_roles`, `0006_storage_and_rls`, `0003_storage`. مكتوبة لكن غير مطبَّقة؛ استُبدلت بنموذج `user_type`.

> ملاحظة تصميمية: `apps/admin/src/app/actions/staff.ts` يكتشف المخطط تلقائيًا (`detectSchema`) ويتراجع لـ`role` إن لم يوجد `user_type` — فالكود يعمل قبل الهجرة وبعدها دون تعديل.

## خريطة لوحة الإدارة (`apps/admin`)
| المسار | الوصف |
|---|---|
| `(auth)/sign-in, sign-up, forgot-password, reset-password, accept-invite, verify-email` | المصادقة |
| `(dashboard)/dashboard` | المؤشرات (يقرأ `user_type`) |
| `(dashboard)/drivers, passengers, rides, pricing, reports` | الأقسام التشغيلية |
| `(dashboard)/groups` | **مجموعات النقل المشتركة** — ميزة اجتماعية للراكبات (مراقبة فقط، لا علاقة بالصلاحيات) |
| `(dashboard)/notifications, system-notifications` | الإعلانات والإشعارات |
| `(dashboard)/staff` | **فريق العمل** — الموظفون (`STAFF_TYPES`)؛ الدعوة/التعديل/الحذف لـ`super_admin` فقط |
| `(dashboard)/profile` | الملف الشخصي (يقرأ `user_type`/`preferred_*`) |

إجراءات الخادم: `actions/{admin,staff,devices,notifications,users}.ts`. الحماية: `components/RequireAuth.tsx` (يشترط `isStaff`).

## ملغى/محذوف (deprecated)
- **MFA بالكامل:** صفحات `setup-mfa`/`verify-mfa`/`manage-mfa` + قسم الملف الشخصي + تبعية `qrcode.react` — حُذفت (كانت معطوبة وتعيق الدخول).
- **نظام admin_roles:** جداول `admin_roles/admin_users/...` + صفحتا `(dashboard)/users` و`/roles` + `actions/admins.ts` + دوال `createAdminUser/listAllProfiles` — حُذفت، استُبدلت بـ`/staff` + `user_type`.

## النواقص / متابعة لاحقًا
- **تطبيق الهجرة `0007`** في Supabase (الحاجز الوحيد لتفعيل النموذج كاملًا).
- **تقوية بوابة super_admin على الخادم:** حاليًا التقييد على مستوى الواجهة (`StaffClient` via `can()`)؛ لا يوجد عميل SSR يقرأ هوية المُستدعي في Server Actions. يلزم `@supabase/ssr` لإضافة فحص خادمي في `staff.ts` (دفاع بعمق). مُشغّلات القاعدة تمنع أصلًا تصعيد `user_type`.
- حذف عمود `role` نهائيًا بعد التأكد من عدم وجود أي مرجع.
