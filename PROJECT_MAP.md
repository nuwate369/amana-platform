# خريطة مشروع أمانة (PROJECT_MAP)

مرجع حيّ لبنية المشروع وحالته. يُحدَّث مع كل تعديل جراحي.

## البنية العامة
مونوريبو (npm workspaces) لثلاثة تطبيقات تتشارك خلفية Supabase واحدة:
- `apps/passenger` — تطبيق الراكبة (Expo / React Native، بنفسجي).
- `apps/driver` — تطبيق السائقة (Expo / React Native، كحلي).
- `apps/admin` — لوحة الإدارة (Next.js 15 App Router، أنثراسايت + ذهبي).

حزم مشتركة:
- `packages/shared-types` — الأنواع + **نظام الصلاحيات المركزي** `can(userType, action)` + **فئات المركبة/الرحلة** `RIDE_CLASSES` (standard/premium/group، مصدر واحد للراكب والسائق) + أدوات لوحة المركبة (`formatPlate`).
- `packages/shared-ui` — `tokens`, `tailwind-preset`, `validation.ts` (zod)، و**`MapView` (`AmanaMap`)**: مكوّن خريطة موحّد فوق **Mapbox** (`@rnmapbox/maps`) — علامات، أيقونة سائقة (سيّارة)، ومسار طريق عبر Mapbox Directions. يتطلّب Dev Build (لا يعمل في Expo Go).
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
- **هجرات لاحقة مطبَّقة تباعًا (idempotent، عبر SQL Editor):**
  - `0026` وحدة الدعم الفني (`support_tickets`/`ticket_messages` + ترقيم بشريّ `dri/pas/adm...` + استبيان) · `0003_storage` (bucket `avatars` عام + `kyc-documents`).
  - `0029` Realtime للرحلات · `0030` الحضور (presence) · `0031` قبول الرحلة والتتبّع (`driver_id`, `driver_lat/lng`) · `0032` تنبيهات ردّ التذاكر · `0033` الدفع (`paid_at`, `fare_total`, `payment_method`).
  - `0034` تفعيل المستخدم (`profiles.status`, `email_confirmed_at`) · `0035` وصول السائقة (`driver_arrived_at`).
  - `0036` فئة المركبة (`drivers.vehicle_class`, `rides.requested_class`) · `0037`+`0038`+`0039` الإعلانات (`announcements` + `starts_at`/`expires_at` بحدّ يوم + قراءة للمستخدمين) · `0040` محادثة الرحلة (`ride_messages` + RLS + Realtime).
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
| `(dashboard)/notifications` | **الإعلانات الحقيقية** (جدول `announcements`): إحصاءات (مُرسَل/مستلمين) بمحدِّد تاريخ + فلاتر + نموذج منبثق للإرسال لـ الكل/ركاب/سائقات/**مستخدم محدّد** + تاريخ بداية/انتهاء |
| `(dashboard)/system-notifications, notification-settings` | إشعارات النظام الداخلية للموظفين |
| `api/ai/support, api/ai/planner` | **الذكاء الاصطناعي (Groq)** — مساعد دعم يُصعّد لتذكرة + مقترِح وجهات؛ المفتاح `GROQ_API_KEY` على الخادم فقط |
| خريطة الرحلات الحيّة | تعتمد `NEXT_PUBLIC_MAPBOX_TOKEN` (pk) على Vercel |
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

## خريطة تطبيق السائقة (`apps/driver`) — دورة كاملة (مبنية ومربوطة فعليًا)

يغطّي **الالتحاق والاعتماد + دورة القيادة الكاملة**، ببيانات Supabase حقيقية (لا mock). اللون الكحليّ (`driverNavy`) وخط IBM Plex Sans Arabic. خريطة Mapbox عبر `AmanaMap`. أيقونة التطبيق `driver.png`.

| المسار | الوصف |
|---|---|
| `index` (الجذر "/") | شاشة البداية (Splash) — تُعرض أثناء قراءة الجلسة وحالة السائقة ثم توجّه البوابة |
| `(auth)/sign-in, sign-up, forgot-password, verify-email` | المصادقة عبر Supabase Auth؛ التسجيل يمرّر `user_type='driver'` |
| `kyc` | **رفع مستندات KYC + بيانات المركبة** (منها **فئة المركبة** standard/premium/group) إلى `drivers` و bucket `kyc-documents`؛ حفظ تلقائيّ للمسودّة؛ «إرسال للتدقيق» يضبط `status='pending'` |
| `pending` | «قيد المراجعة» — تقرأ `drivers.status`، وزر «تحديث الحالة» يعيد الجلب |
| `(tabs)/home` | **خريطة القيادة الحيّة** + مفتاح الاتصال (presence) + استقبال الطلبات (تُعرَض الفئة المطلوبة و«بدون وجهة») + دورة الرحلة (قبول → وصلت → بدء → إنهاء) + **بطاقة «قيّمي الراكبة» بعد اكتمال الدفع** (`paid_at`). الشريط العلويّ: جرس التنبيهات + أيقونة الحساب |
| `(tabs)/ride-history` | **«رحلاتي»** — سجلّ رحلات السائقة الحقيقية (لقطة الراكبة/المسار/الأجرة/التاريخ + تصفية) |
| `(tabs)/account` | حسابي (مخفيّ من الشريط السفلي، يُفتح من أيقونة الشريط العلويّ) — الملف + رفع الصورة (`avatar.ts`) + التفضيلات |
| `support/{index,new,[id]}` | تذاكر الدعم (قائمة/إنشاء/محادثة/إلغاء/استبيان) — `support.ts` |
| `chat` | محادثة الرحلة مع الراكبة (Realtime عبر `ride_messages`) — `ride-chat.ts` |
| `rating` | تقييم الراكبة (يكتب في `ratings`) — `ratePassenger` |
| `notifications` | تنبيهات النظام + الإعلانات؛ فتح الشاشة يصفّر العدّاد (ختم «آخر اطّلاع» محليّ) |

- **البوابة (`src/lib/useProtectedRoute.ts`):** تمنع الوصول لأي شاشة قبل الاعتماد. الوجهة تُحسب من `destinationFor(driver)`: لا صف/مرفوضة/ناقصة ⇐ `/kyc`؛ مكتملة قيد المراجعة ⇐ `/pending`؛ `approved` ⇐ `/(tabs)/home`؛ لا جلسة ⇐ `/(auth)/sign-in`.
- **سياق المصادقة (`src/lib/auth.tsx`):** يجلب الجلسة + صف السائقة (الحالة + روابط المستندات) ويعرض `refreshDriver()` و`signOut()`.
- **منطق الرفع (`src/lib/kyc.ts`):** `expo-image-picker` (base64) + `base64-arraybuffer` (decode) → `supabase.storage.upload`. يُخزَّن **مسار** الكائن (bucket خاص) لا رابط عام.
- الاعتماد من `apps/admin` (قبول/رفض KYC) أو بضبط `drivers.status` مباشرة؛ ثم «تحديث الحالة» في شاشة pending ينقل السائقة للرئيسية.
- **منطق الرحلات (`src/lib/driver-rides.tsx`):** استقبال الطلبات المعلّقة لحظيًّا (Realtime على `rides`) + قبول (claim مشروط) + دورة الحياة + بثّ موقع السائقة أثناء الرحلة.
- **مؤجّل:** الأرباح التفصيلية، بوابة دفع حقيقية، زرّ الاتصال (يحتاج كشف/تقنيع رقم).

## خريطة تطبيق الراكبة (`apps/passenger`) — دورة كاملة

اللون البنفسجي (`passengerPurple`) وخط IBM Plex Sans Arabic. خريطة Mapbox عبر `AmanaMap`.

| المسار | الوصف |
|---|---|
| `(auth)/sign-in, sign-up, forgot-password, verify-email` | المصادقة (مع `KeyboardAvoidingView`)؛ بوابة `pending` لغير المفعّل |
| `(tabs)/home` | خريطة حيّة + ترحيب بالاسم + مدخل طلب رحلة. الشريط العلويّ: جرس + حساب |
| `request-ride` | تحديد الرحلة على الخريطة + اختيار **الفئة** + **«طلب بدون تحديد وجهة»**؛ يُنشئ صف `rides` (`requested`) |
| `matching, tracking` | مطابقة لحظية ثم تتبّع حيّ (مسار Mapbox + علامة السائقة) + حالة الرحلة + مقبض طيّ الورقة + مراسلة |
| `rating, payment` | تقييم السائقة → دفع تجريبي بأسعار حقيقية (`payRide` يضبط `paid_at`) |
| `(tabs)/ride-history` | سجلّ الرحلات الحقيقيّ + تصفية |
| `(tabs)/profile` | الملف + **رفع الصورة** (`avatar.ts`) + مداخل الإعدادات/الدعم/التنبيهات |
| `(tabs)/notifications` | تنبيهات + إعلانات؛ مخفيّة من الشريط السفلي (تُفتح من العلويّ) |
| `support/{index,tickets,new,[id]}` | **دعم ذكيّ**: محادثة AI (Groq عبر `EXPO_PUBLIC_ADMIN_API_URL`) تُصعّد لتذكرة + إدارة التذاكر |
| `chat` | محادثة الرحلة مع السائقة (Realtime) — `ride-chat.ts` |

## ملغى/محذوف (deprecated)
- **MFA بالكامل:** صفحات `setup-mfa`/`verify-mfa`/`manage-mfa` + قسم الملف الشخصي + تبعية `qrcode.react` — حُذفت (كانت معطوبة وتعيق الدخول).
- **نظام admin_roles:** جداول `admin_roles/admin_users/...` + صفحتا `(dashboard)/users` و`/roles` + `actions/admins.ts` + دوال `createAdminUser/listAllProfiles` — حُذفت، استُبدلت بـ`/staff` + `user_type`.

## النواقص / متابعة لاحقًا
- **هجرات معلّقة (SQL Editor بالترتيب):** `0034`–`0040` (تفعيل، وصول، فئة، إعلانات+تواريخ، محادثة الرحلة). راجع `CONTINUE-HERE.md`.
- **متغيّرات بيئة الإنتاج:** `NEXT_PUBLIC_MAPBOX_TOKEN` (pk) + `GROQ_API_KEY` على Vercel؛ و`EXPO_PUBLIC_ADMIN_API_URL` كمتغيّر EAS للراكب (للدعم الذكيّ).
- **إعادة بناء APK** عند التغييرات الأصلية فقط: أيقونة السائق (`driver.png`)، و`expo-image-picker` في الراكب (صلاحيات الصورة). تغييرات JS اليومية فورية عبر dev-client.
- **مؤجّل:** بوابة دفع حقيقية (سجلّ تجاريّ)، زرّ الاتصال (كشف/تقنيع الرقم)، تقوية بوابة super_admin بفحص خادميّ (`@supabase/ssr`) في `staff.ts`، وحذف عمود `role` القديم.
