# amana-platform — منصة أمانة

منصة تنقّل ذكية للمرأة في السعودية. مستودع أحادي (Monorepo) يضم ثلاثة
تطبيقات وأربع حزم مشتركة.

## البنية

```
amana-platform/
├── apps/
│   ├── passenger/     تطبيق الراكبة   — Expo + Expo Router (أرجواني)
│   ├── driver/        تطبيق السائقة   — Expo + Expo Router (أزرق داكن)
│   └── admin/         لوحة الإدارة    — Next.js App Router (أنثراسايت + ذهبي)
├── packages/
│   ├── shared-types/    أنواع TypeScript مشتركة
│   ├── shared-ui/       رموز التصميم + preset ألوان لكل تطبيق
│   ├── supabase-client/ عميل Supabase موحّد (anon + service role)
│   └── i18n/            إعداد react-i18next (عربي افتراضي + إنجليزي)
└── package.json         npm workspaces
```

## المتطلبات

- Node.js ‏≥ 20 و npm ‏≥ 10
- للموبايل: تطبيق **Expo Go** على جهازك، أو محاكي iOS/Android
- مشروع **Supabase** (للحصول على `url` و `anon key` و `service role key`)

## التنصيب

من جذر المستودع:

```bash
npm install
```

يثبّت `npm install` تبعيات كل الحِزم والتطبيقات دفعة واحدة (workspaces).

> **مواءمة إصدارات Expo:** بعد التثبيت، شغّل داخل كل تطبيق موبايل
> `npx expo install --fix` لمطابقة إصدارات الحزم الأصلية مع الـ SDK.

## متغيرات البيئة

في كل تطبيق ملف `.env.example`. انسخه ثم املأ القيم الحقيقية:

```bash
# للموبايل
cp apps/passenger/.env.example apps/passenger/.env
cp apps/driver/.env.example    apps/driver/.env
# للإدارة
cp apps/admin/.env.example     apps/admin/.env.local
```

- التطبيقات الثلاثة تستخدم **المفتاح العام anon** فقط على العميل.
- **مفتاح service role** يوجد حصريًا في `apps/admin/.env.local` ويُستعمل داخل
  Server Actions فقط (ملف `src/lib/supabase/admin.ts`). لا تضعه في أي تطبيق موبايل.

## التشغيل محليًا

من جذر المستودع:

```bash
npm run passenger   # تطبيق الراكبة (Expo)
npm run driver      # تطبيق السائقة (Expo)
npm run admin       # لوحة الإدارة (Next.js على http://localhost:3000)
```

أو مباشرةً داخل مجلد التطبيق:

```bash
cd apps/passenger && npm run start
cd apps/admin && npm run dev
```

في تطبيقات Expo: امسح رمز QR بتطبيق Expo Go، أو اضغط `a`/`i` لفتح محاكي.

## أوامر عامة

```bash
npm run lint        # فحص ESLint في كل التطبيقات
npm run typecheck   # فحص أنواع TypeScript
npm run format      # تنسيق Prettier لكل المستودع
```

## قرارات هندسية

- **npm workspaces** بدل pnpm: أبسط توافقًا مع Metro/Expo دون إعداد
  `node-linker=hoisted`. متغيّر `.npmrc` يفعّل `legacy-peer-deps` لتفادي
  تعارضات peer مع React 19.
- **nativewind** في تطبيقَي الموبايل، و**Tailwind CSS** (نفس المحرّك) في
  الإدارة الويبية. اللوحات اللونية مشتركة عبر `@amana/shared-ui/tailwind-preset`.
- **الوضع الداكن:** الموبايل يتبع نظام الجهاز (`darkMode: 'media'`)، والإدارة
  عبر `next-themes` (`darkMode: 'class'`).
- **RTL/LTR:** العربية افتراضية. الموبايل عبر `I18nManager`، والويب عبر سمة
  `dir` على وسم `<html>`.

## الحالة الحالية

هيكل وإعداد أوّلي فقط: شاشات المصادقة (دخول/تسجيل/نسيت كلمة المرور/تأكيد
البريد) موصولة بـ Supabase Auth، دون منطق أعمال (الرحلات، الخرائط، الدفع…).
```
