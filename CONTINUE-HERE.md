# نقطة المتابعة — منصة أمانة (آخر تحديث: 16-07-2026)

مرجع تسليم بين الأجهزة. **اقرأه أولًا عند استئناف العمل.**

> ✅ **حالة Git:** كل العمل مدفوع على `main` — آخر commit: **`7d25161`** (تحويل الخريطة إلى Mapbox + إعداد EAS). الشجرة نظيفة.

## ⚠️ على جهاز المنزل قبل أي شيء
```bash
git pull
npm install          # postinstall يطبّق رقعة css-interop تلقائيًّا
```
**ثم أعِد إنشاء `apps/driver/.env`** (متجاهَل في Git — لا يُسحب) — انسخه من الجهاز الآخر، أو أنشئه بالمتغيّرات:
`EXPO_PUBLIC_SUPABASE_URL` · `EXPO_PUBLIC_SUPABASE_ANON_KEY` · `EXPO_PUBLIC_MAPBOX_TOKEN` (pk.) · `MAPBOX_DOWNLOAD_TOKEN` (sk.).

---

## 🔴 المهمة العالقة الآن: بناء نسخة السائق التطويرية (Mapbox) يفشل في gradle

- المشروع مربوط بـ EAS: **@amana-platform/amana-driver** (projectId في app.json).
- متغيّرا البيئة مضبوطان على EAS (بيئة development): `MAPBOX_DOWNLOAD_TOKEN` (sensitive) + `EXPO_PUBLIC_MAPBOX_TOKEN`.
- **بناءان فشلا** في مرحلة «Run gradlew» (آخرهما commit `7d25161`).
- **المطلوب للتشخيص:** افتح صفحة البناء على expo.dev → مرحلة **«Run gradlew»** → انسخ الأسطر الحمراء
  (`FAILURE:` / `> Task ... FAILED` / `Caused by:` / `Could not GET ...`).
- **أقوى مشتبَه:** مفتاح التنزيل **`Amana_App_Build`** — يجب أن يحمل نطاق **`DOWNLOADS:READ`**؛
  إن غاب النطاق تفشل مصادقة Maven (401) ويفشل gradle. **تحقّق/أعد إنشاء المفتاح بهذا النطاق** وحدّث
  متغيّر EAS: `eas env:update --environment development --name MAPBOX_DOWNLOAD_TOKEN --value sk...`.
- إعادة البناء: `cd apps/driver && eas build --profile development --platform android`.

> بعد نجاح APK: ثبّته على الهاتف → `npx expo start --dev-client` → افتح التطبيق (لا Expo Go) → تبويب «الخريطة».
> **ملاحظة:** لا تُعاد نسخة APK إلا عند تغيير وحدة/إعداد أصليّ؛ تعديلات الكود اليوميّة فورية عبر dev-client.

---

## ✅ ما أُنجز (كله مدفوع)

### الخريطة — Mapbox (السائق) — الكود جاهز، ينقص نجاح البناء فقط
- استُبدلت `react-native-maps/Google` بـ **`@rnmapbox/maps@10.3.2`** (SDK 54).
- مكوّن مشترك محايد عن المزوّد: `packages/shared-ui/src/MapView.tsx` (`AmanaMap`): إذن الموقع + معالجة الرفض،
  الموقع الحالي، `markers`، إعادة تمركز أمريّة، **بديل نظيف داخل Expo Go** (لا ينهار).
- `apps/driver/app/(tabs)/map.tsx` يستخدم `AmanaMap`. `app.config.js` يحقن مفتاح التنزيل من البيئة. `eas.json` (بروفايل development).

### تطبيق السائق (سابقًا)
- إصلاح انهيار css-interop، مسودّة/إرسال (`kyc_submitted_at`)، الإعدادات (مظهر/لغة)، «حسابي» + الأفاتار،
  الدعم (تذاكر/محادثة/إلغاء/استبيان)، الشروط + «حول»، لوحة لاتينية.

### لوحة الإدارة
- وحدة الدعم الكاملة (ترقيم `dri26070001`، آلة حالات ٥، تخصيص/تقدّم تلقائي، Realtime، نموذج منبثق، للقراءة فقط عند الإغلاق، تقييم/ترتيب/بحث).
- `FilterToolbar` + `DateRangePicker` قابلان لإعادة الاستخدام على ٥ شاشات.

---

## 🔴 هجرات Supabase — SQL Editor → Run (idempotent، شغّل ما لم يُطبَّق)
`0024` (user_type) · `0025` (kyc_submitted_at — إلزامي) · `0026` ✅ · **`0027`** (Realtime — شغّلها) · **`0028`** (إلغاء/تخصيص — شغّلها).

## ▶️ التالي بعد نجاح خريطة السائق
1. **خريطة لوحة الإدارة (ويب):** مكتبة مختلفة — `react-map-gl`/Mapbox GL JS (لا @rnmapbox/maps).
2. **خريطة الراكب:** نفس `AmanaMap` (الراكب على SDK 53).

## ⏸️ قرارات معلّقة
1. آلة الحالات: إغلاق مباشر من «قيد العمل»؟ إرجاع «بانتظار الرد»→«قيد العمل» عند ردّ العميل؟ SLA؟ (طُبّق: «منتهية» نهائية فقط.)
2. نصّ الشروط النهائي (قانونيّ) — يُستبدَل النصّ المبدئي في i18n.

---

## 🚀 التشغيل
```bash
cd apps/driver && npx expo start --dev-client   # بعد تثبيت APK التطويري (الخريطة تحتاجه)
cd apps/admin && npm run dev                     # http://localhost:3002
```
الأنواع: `npm run typecheck` من الجذر.
