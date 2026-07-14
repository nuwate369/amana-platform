-- ============================================================
-- 0019_fix_signup_locale.sql
-- إصلاح: فشل إنشاء أي مستخدم جديد ("Database error saving new user")
-- في التطبيقات الثلاثة (راكبة/سائقة/إدارة) بعد إضافة عمود profiles.locale
-- (قيد CHECK: locale IN ('ar','en')) الذي لا يكتبه مُشغّل handle_new_user.
--
-- الإصلاح من طبقتين (belt-and-suspenders):
--   1) ضبط DEFAULT صالح للعمود locale + تعبئة القيم الفارغة.
--   2) إعادة كتابة handle_new_user لتكتب locale + كل الأعمدة الصحيحة.
-- ثم كتلة تحقّق حيّة تُثبت أن التسجيل صار يعمل (تتراجع كليًا، لا تُبقي بيانات).
--
-- idempotent — آمن لإعادة التشغيل. يُطبَّق في Supabase SQL Editor → Run.
-- ============================================================

-- ---------- 1) إصلاح العمود locale ----------
-- إن كان العمود موجودًا: اضبط default='ar' واملأ أي قيمة فارغة/غير صالحة.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='locale'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN locale SET DEFAULT 'ar';
    UPDATE public.profiles
      SET locale = 'ar'
      WHERE locale IS NULL OR locale NOT IN ('ar','en');
  END IF;
END $$;

-- ---------- 2) handle_new_user كاملة وصحيحة ----------
-- تكتب role + user_type + full_name + locale، وتترك status لِـDEFAULT العمود،
-- وتُنشئ صف السائقة تلقائيًا. locale='ar' صريحة (حزام أمان فوق DEFAULT).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_raw  text := COALESCE(new.raw_user_meta_data ->> 'user_type', new.raw_user_meta_data ->> 'role', 'passenger');
  v_type public.user_type := CASE
    WHEN v_raw IN ('passenger','driver','super_admin','admin','support') THEN v_raw::public.user_type
    ELSE 'passenger'::public.user_type
  END;
  v_role public.user_role := (CASE
    WHEN v_type IN ('super_admin','admin','support') THEN 'admin'
    WHEN v_type = 'driver' THEN 'driver'
    ELSE 'passenger'
  END)::public.user_role;
BEGIN
  INSERT INTO public.profiles (id, role, user_type, full_name, locale)
  VALUES (
    new.id,
    v_role,
    v_type,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'ar'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  IF v_type = 'driver' THEN
    INSERT INTO public.drivers (id, status) VALUES (new.id, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- تأكيد وجود المُشغّل (إعادة ربطه إن لزم).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 3) تحقّق حيّ: هل صار التسجيل يعمل؟ ----------
-- يُدرج مستخدمًا تجريبيًا (يُشغّل المُشغّل فعليًا) ثم يتراجع كليًا.
-- النتيجة تظهر في تبويب Messages/Notices.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  VALUES (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'verify-' || substr(v_id::text,1,8) || '@amana-verify.test', '',
          now(), '{"provider":"email","providers":["email"]}',
          '{"user_type":"driver","full_name":"Verify"}', now(), now());
  -- وصلنا هنا ⇒ الإدراج نجح. نتراجع عبر استثناء مقصود.
  RAISE EXCEPTION 'verify_ok';
EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM = 'verify_ok' THEN
      RAISE NOTICE '✅ SIGNUP FIXED — تم إنشاء مستخدم تجريبي بنجاح وتراجعنا عنه. التسجيل يعمل الآن.';
    ELSE
      RAISE NOTICE '❌ STILL FAILING → %', SQLERRM;
    END IF;
  WHEN OTHERS THEN
    RAISE NOTICE '❌ STILL FAILING → sqlstate=% | message=%', SQLSTATE, SQLERRM;
END $$;
