# نقطة المتابعة — منصة أمانة (15-07-2026)

مرجع تسليم بين الأجهزة. **اقرأه أولًا عند استئناف العمل**، ثم افتح `PROJECT_MAP.md` للبنية العامة.

> ⚠️ **قبل أي شيء على الجهاز الجديد:** تأكّد أن آخر تغييرات هذه الجلسة **مدفوعة على GitHub**
> واسحبها (`git pull`)، وإلا لن تجد عمل اليوم. ثم `npm install` من جذر المستودع.

---

## 🔴 خطوات يدوية مطلوبة (بعضها قد يكون نُفّذ — تحقّق)

### 1) هجرتان في Supabase → SQL Editor → Run (idempotent)
لم يتأكّد تطبيقهما على القاعدة الحيّة — **دليل عدم التطبيق: فشل رفع صورة السيارة** (عمود
`car_photo_url` مفقود). شغّلهما:
```sql
-- 0022_driver_kyc_fields.sql
alter table public.drivers
  add column if not exists vehicle_year                int,
  add column if not exists national_id_number          text,
  add column if not exists vehicle_registration_number text,
  add column if not exists car_photo_url               text;

-- 0023_driver_rejection_reason.sql
alter table public.drivers
  add column if not exists rejection_reason text;
```
لا تغيير في RLS (الأعمدة ضمن سياسات `drivers_*_own` و`profiles_update_own`).

### 2) إعدادات Supabase Auth (✅ نُفّذت من المالك)
- قالب **Confirm signup** → يعرض `{{ .Token }}` بدل `{{ .ConfirmationURL }}`.
- **Email OTP Length = 6** · **Email OTP Expiration = 3600** (≥10د ✓).
- (اختياري) الحدّ الأدنى بين الرسائل = 120s؛ التطبيق يفرض الدقيقتين بعدّاده أصلًا.

---

## ▶️ المهمة التالية المتّفق عليها (لم تبدأ)

**إصلاح خروج التطبيق بعد رفع آخر مرفق** على الأجهزة الضعيفة (رام 4GB + Expo Go).
- **السبب:** أندرويد يقتل التطبيق أثناء منتقي الصور بسبب ضغط الذاكرة (نرفع الصور كـ
  `base64` وهو ثقيل)؛ يتراكم حتى الصورة الرابعة فيُعاد تشغيل التطبيق ← تظهر الشاشة الأولى.
  (ليس خطأ كود — الصور تُحفظ لحظة رفعها، والذي يضيع هو الحقول النصية غير المُرسَلة.)
- **الحل المتّفق عليه (1):** تحويل الرفع في `src/lib/kyc.ts` من `base64`/`decode` إلى
  **رفع الملف مباشرة** من `asset.uri` (مثلاً `fetch(uri).then(r=>r.arrayBuffer())` أو
  `FileSystem`), وإسقاط `base64:true` من `launchCamera/ImageLibraryAsync` — يقلّل الذاكرة
  بشدّة وقد يُنهي الخروج داخل Expo Go.
- **الحل الجذري (2):** `eas build` لتطبيق مستقل (`largeHeap` + ذاكرة أفضل) — يُنهيها نهائيًّا.

> تذكير بالتدفّق الصحيح: لا يوجد زر «حفظ» منفصل — الصور تُحفظ عند رفعها، وزر **«إرسال
> للتدقيق»** أسفل النموذج (يُفعَّل بعد اكتمال كل الحقول + الصور الأربع) يحفظ النصوص ويضبط
> `status='pending'` ثم تنتقل السائقة لشاشة «قيد المراجعة».

---

## ✅ ما أُنجز في هذه الجلسة (كود جاهز، `tsc`+`eslint` نظيفان على `driver` و`admin`)

### نموذج KYC الاحترافي — `apps/driver/app/kyc.tsx` + `src/lib/kyc.ts`
- **٣ أقسام:** شخصية (جوال → `profiles.phone`، هوية/إقامة) · المركبة · المستندات (٤ صور).
- **تحقّق:** جوال سعودي `^05\d{8}$` · هوية/إقامة 10 أرقام · إدخال رقمي فقط.
- **قوائم منسدلة بحث:** الشركة والموديل (`src/lib/carData.ts` + مكوّن `SearchableSelect`)،
  الموديل يتبع الشركة، **سنة الصنع** منسدلة 2015..العام الحالي.
- **رقم اللوحة:** حقلان — أحرف عربية (≤3، تُعرض بمسافات «ه ه ه») + أرقام (≤4) → `vehicle_plate`.
- **الصور:** **التقاط بالكاميرا** أو من المعرض (Alert)، الجودة 0.6، `cameraPermission` في `app.json`.

### مصادقة السائقة — `app/(auth)/*`
- **تأكيد البريد برمز OTP** (6 أرقام) بدل الرابط: `verify-email.tsx` (تحقّق تلقائي +
  `verifyOtp({type:'signup'})` + `resend` بعدّاد **دقيقتين**). يقتل مشكلة deep link.
- عند «Email not confirmed» في الدخول → رسالة عربية + توجيه لشاشة الرمز (إعادة الإرسال فورية).
- **تعريب أخطاء Supabase Auth:** `src/lib/authErrors.ts` (`sign-in`/`sign-up`).
- **إظهار/إخفاء كلمة المرور:** مكوّن `src/components/PasswordInput.tsx` (كلمة المرور + تأكيدها).
- **تحقّق البريد مرئي:** `mode:'onTouched'` + توست عند الإرسال ببريد غير صالح.
- `i18next` → `compatibilityJSON:'v3'` (أزال تحذير pluralResolver على الجهاز).

### لوحة الإدارة — `apps/admin`
- **تدفّق مراجعة KYC الجديد:** حُذفت بطاقة «طلبات KYC معلّقة» العلوية. في الجدول:
  سائقة **غير معتمدة** → زر «🔍 مراجعة المستندات»؛ **معتمدة** → أيقونة 👁.
  أزرار **موافقة/رفض في أسفل نافذة التفاصيل** بعد رؤية المستندات (`UserDetailsModal`
  props: `onApprove`/`onReject`؛ الصفحة: `reviewDecision()`).
- **عرض حقول KYC الجديدة + صورة السيارة** في `actions/details.ts` + `UserDetailsModal.tsx`.
- **سبب الرفض:** `rejectDriver` يحفظه في `drivers.rejection_reason` → يظهر للسائقة في
  `kyc.tsx` وفي نافذة تفاصيل الإدارة. يُفرَّغ عند القبول/إعادة الإرسال.
- **حذف نهائي** (أداة تجارب): `deleteUser` في `actions/moderation.ts` + زر 🗑 في
  `drivers`/`passengers` (يفكّ `rides.driver_id` و`ratings` ثم يحذف مستخدم المصادقة
  المتتالي + ينظّف `kyc-documents` + يُسجَّل `delete_user`؛ الحسابات المحمية محميّة).

### ترقية توافقية (طُبِّقت عبر `expo install --fix`)
`expo-router@~5.1.11` · `react-native@0.79.6` · `react-native-screens@~4.11.1`
(أصلحت خطأ `navigation getState` عند الإقلاع).

### ملفات جديدة أُنشئت هذه الجلسة
```
supabase/migrations/0022_driver_kyc_fields.sql
supabase/migrations/0023_driver_rejection_reason.sql
apps/driver/src/lib/carData.ts
apps/driver/src/lib/authErrors.ts
apps/driver/src/components/SearchableSelect.tsx
apps/driver/src/components/PasswordInput.tsx
```

---

## 🚀 التشغيل للاختبار
```bash
# تطبيق السائقة
cd apps/driver && npx expo start           # LAN: استخدم رابط exp://<ip>:8081 المطبوع
#            أو  npx expo start --tunnel    # يعمل من أي شبكة (يحتاج ngrok، قد يبطؤ)
# لوحة الإدارة
cd apps/admin && npm run dev                # http://localhost:3002
```
- **Expo Go متوافق مع SDK 53** فقط (الأحدث SDK 54 لا يعمل).
- أول حزمة على جهاز ضعيف تأخذ ~80ث (طبيعي، لمرّة واحدة).
- بعد أي تعديل: **إعادة تحميل كاملة** (Reload) لا Fast Refresh (لتفادي حالات وسيطة عالقة).

---

## 🔜 مؤجّل للـ build المستقل (Expo Go لا يحلّها)
- **لوحة المفاتيح تغطّي الحقول (أندرويد):** Expo Go لا يطبّق `softwareKeyboardLayoutMode`.
  طُبِّق تخفيف مؤقّت (`behavior="padding"`). الجذري في `eas build`:
  `"android": { "softwareKeyboardLayoutMode": "resize" }` أو `react-native-keyboard-controller`.
- **خروج التطبيق بعد آخر مرفق** (المهمة التالية أعلاه — نجرّب حل base64→ملف أولًا داخل Expo Go).

## 🔜 مؤجّل للمرحلة ب
ميزات القيادة (استقبال الطلبات/الأرباح/الرحلات)، `eas build` وتوزيع APK، الربط العميق،
آلية التحديث الإجباري، زر «إرسال رسالة للسائقة» من لوحة الإدارة.
