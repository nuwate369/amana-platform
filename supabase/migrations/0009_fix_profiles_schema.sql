-- ============================================================
-- 009_fix_profiles_schema.sql
-- إصلاح عدم تطابق المخطط: role → user_type + إضافة الأعمدة المفقودة
-- تشغيل: نسخ هذا الكود في Supabase SQL Editor ثم تشغيله
-- ============================================================

-- 1. إنشاء enum user_type إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM (
      'passenger', 'driver', 'super_admin', 'admin', 'support'
    );
  END IF;
END
$$;

-- 2. إضافة عمود user_type إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_type user_type NOT NULL DEFAULT 'passenger';
  END IF;
END
$$;

-- 3. نسخ البيانات من role → user_type
UPDATE public.profiles
SET user_type = role::user_type
WHERE role IN ('passenger', 'driver', 'admin', 'support', 'super_admin');

-- للحسابات التي role = 'admin' نُحوّلها إلى admin
UPDATE public.profiles
SET user_type = 'admin'::user_type
WHERE role = 'admin';

-- 4. إضافة الأعمدة المفقودة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_protected boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_language text NOT NULL DEFAULT 'ar'
      CHECK (preferred_language IN ('ar', 'en'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_theme'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_theme text NOT NULL DEFAULT 'system'
      CHECK (preferred_theme IN ('light', 'dark', 'system'));
  END IF;
END
$$;

-- 5. تحديث preferred_language من locale القديم (إن وُجد)
UPDATE public.profiles
SET preferred_language = locale
WHERE locale IN ('ar', 'en') AND preferred_language = 'ar';

-- 6. حماية حساب nuwate369 (super_admin)
UPDATE public.profiles
SET user_type = 'super_admin'::user_type, is_protected = true
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- 7. إصلاح khututaltijarah (يجب أن يكون admin وليس passenger)
UPDATE public.profiles
SET user_type = 'admin'::user_type
WHERE id = 'cfd5630a-62dc-4535-b167-d68a83b514be';

-- 8. إنشاء/تحديث الحماية + الملف الشخصي لـ nuwate369 في auth
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"user_type": "super_admin", "full_name": "مسؤول أمانة"}'::jsonb
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

UPDATE public.profiles
SET full_name = 'مسؤول أمانة', is_protected = true
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- 9. حذف وإعادة إنشاء trigger handle_new_user بالشكل الصحيح
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_type user_type;
  v_raw_type  text;
BEGIN
  v_raw_type := new.raw_user_meta_data ->> 'user_type';
  v_user_type := CASE
    WHEN v_raw_type IN ('passenger', 'driver', 'super_admin', 'admin', 'support')
      THEN v_raw_type::user_type
    ELSE 'passenger'::user_type
  END;

  INSERT INTO public.profiles (id, user_type, full_name, is_protected)
  VALUES (
    new.id,
    v_user_type,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. حذف trigger immutable_user_type القديم وإعادة إنشائه
DROP TRIGGER IF EXISTS trigger_immutable_user_type ON public.profiles;

CREATE OR REPLACE FUNCTION public.enforce_immutable_user_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF new.user_type <> old.user_type THEN
      RAISE EXCEPTION 'IMMUTABLE_USER_TYPE: لا يمكن تغيير نوع المستخدم بعد الإنشاء.'
        USING errcode = 'P0001';
    END IF;
    IF old.is_protected = true THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.'
        USING errcode = 'P0002';
    END IF;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER trigger_immutable_user_type
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_immutable_user_type();

-- 11. تحديث RLS — السماح للـ service_role بالقراءة الكاملة
-- (service_role يتجاوز RLS تلقائياً، لكن نضيف policy للمصادقة العادية)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- policy للمصادقة العادية: السماح بقراءة أي ملف تعريف (للعرض العام)
DROP POLICY IF EXISTS profiles_select_any ON public.profiles;
CREATE POLICY profiles_select_any
  ON public.profiles FOR SELECT
  USING (true);

-- 12. نتائج الفحص النهائي
SELECT id, user_type, full_name, is_protected, created_at
FROM public.profiles
WHERE user_type IN ('super_admin', 'admin', 'support')
ORDER BY created_at DESC;
