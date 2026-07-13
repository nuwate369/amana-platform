-- ============================================================
-- 0011_add_staff_management_columns.sql
-- أعمدة جديدة مطلوبة لإدارة فريق العمل
-- تشغيل: SQL Editor في Supabase Dashboard
-- ============================================================

-- 1. is_protected: حماية الحسابات الحساسة
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_protected boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. is_active: تبديل تنشيط/تعطيل الحساب
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 3. تطبيق الحماية على الحسابات الحساسة
UPDATE public.profiles SET is_protected = true
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- 4. تحديث handle_new_user ليكتب user_type من metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(
    new.raw_user_meta_data ->> 'user_type',
    new.raw_user_meta_data ->> 'role',
    'passenger'
  );
  v_role := CASE
    WHEN v_role IN ('super_admin', 'admin') THEN 'admin'
    WHEN v_role IN ('passenger', 'driver')  THEN v_role
    ELSE 'passenger'
  END;

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    v_role::user_role,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (id, status) VALUES (new.id, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- 5. حماية على مستوى القاعدة: رفض الحذف والتعديل على الحسابات المحمية
-- هذا خط الدفاع الأخير — يمنع أي عملية حذف/تعديل على صفوف is_protected = true
-- بغض النظر عن مصدر الطلب (service_role أو أي شيء آخر)

CREATE OR REPLACE FUNCTION public.protect_protected_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'Account is protected and cannot be modified or deleted.';
  END IF;
  RETURN OLD;
END;
$$;

-- منع الحذف على الحسابات المحمية
DROP TRIGGER IF EXISTS trg_protect_protected_profiles ON public.profiles;
CREATE TRIGGER trg_protect_protected_profiles
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_protected_profiles();

-- منع التعديل على الحسابات المحمية (الاسم، النوع، is_active — لا شيء يمكن تغييره)
CREATE OR REPLACE FUNCTION public.prevent_protected_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'Account is protected and cannot be modified or deleted.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_protected_update ON public.profiles;
CREATE TRIGGER trg_prevent_protected_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_protected_update();

-- 6. التحقق النهائي
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
