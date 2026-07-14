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
- **مطبَّق فعليًا:** `0001_init` (profiles/drivers/rides/ratings/groups + enum `user_role` + `handle_new_user`) و`0002_rls`. (القاعدة المشتركة على Supabase ما زالت على هذا الأساس — عمود `role` فقط.)
- **يجب تطبيقه — `0013_ban_and_audit.sql` (مكتفٍ ذاتيًا):** الطريق الموصى به الآن. يضيف فوق الأساس كل ما يلزم: `user_type` (تعبئة ذكية من ميتاداتا auth تسترجع نوع الموظف الصحيح) + `is_protected` + `is_active` + أعمدة الحظر (`ban_reason`/`banned_by`/`banned_at`) + مُشغّل حماية `trigger_immutable_user_type` + جدول `audit_logs` (RLS: قراءة للموظفين) + إصلاح `handle_new_user` (يكتب `user_type` وينشئ صف السائقة). idempotent.
  - **يُطبَّق يدويًا في Supabase SQL Editor** (لا يمكن تنفيذ DDL برمجيًا عبر عميل JS).
  - `0007_user_type.sql` سابقٌ يُغطّيه 0013؛ لا حاجة لتطبيقه منفصلًا.
- **يجب تطبيقه — `0014_rating_questions.sql`:** نظام أسئلة التقييم المُدار — `rating_questions` (سؤال + وجهة driver/passenger + تفعيل + ترتيب) و`rating_answers` (نجوم لكل سؤال ضمن تقييم) + RLS + ٧ أسئلة افتراضية idempotent. تُدار من `/ratings`.
- **بذر البيانات الافتراضية:** `node supabase/seed-demo.mjs` — سائقتان (١ approved + ١ pending) + ٤ راكبات + ١٣ رحلة موزّعة على ٢١ يومًا + ١٨ تقييمًا ثنائي الاتجاه بتعليقات (وإجابات تفصيلية إن طُبّقت 0014) + مجموعتان. يمسح حسابات `demo_*@amana.test` فقط (يحذف السجلات التابعة أولًا — rides.driver_id وratings بلا CASCADE). يتطلّب 0013.
- **التحقّق:** `node scripts/verify-moderation.mjs` (يفحص المخطط + الأعداد + دورة حظر/سجل تجريبية ذاتية التنظيف).
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

إجراءات الخادم: `actions/{admin,staff,devices,notifications,users,moderation,details,ratings}.ts`. الحماية: `components/RequireAuth.tsx` (يشترط `isStaff`).
- `moderation.ts`: حظر/رفع حظر + قبول/رفض KYC + `logAudit` مُصدَّرة (كل حركة تُسجَّل في `audit_logs` بلقطة المنفِّذ) — تُستدعى أيضًا من `staff.ts` و`ratings.ts`.
- `details.ts` + `components/UserDetailsModal.tsx`: نافذة تفاصيل موحّدة (راكبة/سائقة/**موظف**) بنمط «تفاصيل الفاتورة» — ملخّص يمين + تفاصيل يسار (رحلات/مركبة/KYC/تقييمات مستلمة للراكبة والسائقة؛ حركات سجل النظام + آخر دخول للموظف)؛ تُفتح بأيقونة العين من السائقات والراكبات وفريق العمل.
- `ratings.ts` + `(dashboard)/ratings`: تقرير مؤشرات (إجمالي/متوسط سائقات/متوسط راكبات/إجابات/تقييمات منخفضة) + إدارة أسئلة التقييم + إحصائيات لكل سؤال (زر العين: عدد/متوسط/توزيع نجوم/أول-آخر إجابة/آخر الإجابات) + آخر التقييمات. الإدارة `manage_ratings` (super_admin)، العرض `view_ratings` (super_admin+admin).
  - **قواعد حفظ التقييم:** سؤال له إجابات **لا يُحذف** (يُوقَف فقط — زر الحذف يُستبدل بقفل) **ولا تتغيّر وجهته** (مقفلة في نموذج التعديل)؛ النص ≥ ٣ أحرف وفريد لكل وجهة. تُفرض في `ratings.ts` (server) والواجهة معًا.
- **تغيير دور الموظف:** بعد هجرة `0015` يسمح مُشغّل القاعدة بتغيير `user_type` **بين أدوار الموظفين فقط وعبر service_role فقط** (تبقى ممنوعة: راكبة/سائقة ↔ موظف، وأي تغيير من جلسة مستخدم عادية، وتعديل المحمي). نموذج تعديل الموظف: الاسم + الجوال + الدور (مع وصف الصلاحيات)، والبريد قراءة فقط. تبديل نشط/معطّل يمرّ بحوار تأكيد (ActionDialog).
- **درس مُصلَح:** `detectSchema()` كان يخزّن نتيجة «ما قبل الهجرة» في كاش الخادم فيعطّل التبديل بصمت — الآن لا يُخزَّن إلا المخطط المكتمل، والتبديل يفشل بخطأ صريح بدل التخطي الصامت.
- مكوّنات معاد استخدامها: `ActionDialog.tsx` (تأكيد + سبب + اسم المنفِّذ)، `UserDetailsModal.tsx`، `lib/audit-meta.tsx` (تسميات/أيقونات أنواع حركات السجل — مصدر واحد).

## خريطة تطبيق السائقة (`apps/driver`) — المرحلة أ (مبنية ومربوطة فعليًا)

أُعيد بناء تطبيق السائقة من الصفر لتغطية **دورة الالتحاق والاعتماد** بالكامل، مربوطًا ببيانات Supabase حقيقية (لا mock). اللون الأزرق الداكن (`driverNavy`) وخط IBM Plex Sans Arabic.

| المسار | الوصف |
|---|---|
| `index` (الجذر "/") | شاشة البداية (Splash) — تُعرض أثناء قراءة الجلسة وحالة السائقة ثم توجّه البوابة |
| `(auth)/sign-in, sign-up, forgot-password, verify-email` | المصادقة عبر Supabase Auth؛ التسجيل يمرّر `user_type='driver'` |
| `kyc` | **رفع مستندات KYC فعليًا** إلى bucket `kyc-documents` (اختيار صورة → base64 → Storage) وحفظ المسار في أعمدة `drivers.{national_id_url,license_url,vehicle_registration_url}` عبر upsert؛ زر «إرسال للتدقيق» يضبط `status='pending'` |
| `pending` | «قيد المراجعة» — تقرأ `drivers.status` الفعلية، وزر «تحديث الحالة» يعيد الجلب |
| `(tabs)/home` | الشاشة الرئيسية — تُعرض فقط بعد `status='approved'` (تبويب واحد؛ بقية التبويبات مؤجّلة للمرحلة ب) |

- **البوابة (`src/lib/useProtectedRoute.ts`):** تمنع الوصول لأي شاشة قبل الاعتماد. الوجهة تُحسب من `destinationFor(driver)`: لا صف/مرفوضة/ناقصة ⇐ `/kyc`؛ مكتملة قيد المراجعة ⇐ `/pending`؛ `approved` ⇐ `/(tabs)/home`؛ لا جلسة ⇐ `/(auth)/sign-in`.
- **سياق المصادقة (`src/lib/auth.tsx`):** يجلب الجلسة + صف السائقة (الحالة + روابط المستندات) ويعرض `refreshDriver()` و`signOut()`.
- **منطق الرفع (`src/lib/kyc.ts`):** `expo-image-picker` (base64) + `base64-arraybuffer` (decode) → `supabase.storage.upload`. يُخزَّن **مسار** الكائن (bucket خاص) لا رابط عام.
- الاعتماد من `apps/admin` (قبول/رفض KYC) أو بضبط `drivers.status` مباشرة؛ ثم «تحديث الحالة» في شاشة pending ينقل السائقة للرئيسية.
- **مؤجّل للمرحلة ب:** ميزات القيادة (استقبال الطلبات/الأرباح/الرحلات)، eas build والتوزيع التجريبي، آلية التحديث الإجباري. حُذفت شاشات mock سابقة (active-ride/documents/earnings/ride-history/profile) وتُبنى في ب.

## ملغى/محذوف (deprecated)
- **MFA بالكامل:** صفحات `setup-mfa`/`verify-mfa`/`manage-mfa` + قسم الملف الشخصي + تبعية `qrcode.react` — حُذفت (كانت معطوبة وتعيق الدخول).
- **نظام admin_roles:** جداول `admin_roles/admin_users/...` + صفحتا `(dashboard)/users` و`/roles` + `actions/admins.ts` + دوال `createAdminUser/listAllProfiles` — حُذفت، استُبدلت بـ`/staff` + `user_type`.

## النواقص / متابعة لاحقًا
- **تطبيق الهجرة `0007`** في Supabase (الحاجز الوحيد لتفعيل النموذج كاملًا).
- **تقوية بوابة super_admin على الخادم:** حاليًا التقييد على مستوى الواجهة (`StaffClient` via `can()`)؛ لا يوجد عميل SSR يقرأ هوية المُستدعي في Server Actions. يلزم `@supabase/ssr` لإضافة فحص خادمي في `staff.ts` (دفاع بعمق). مُشغّلات القاعدة تمنع أصلًا تصعيد `user_type`.
- حذف عمود `role` نهائيًا بعد التأكد من عدم وجود أي مرجع.
