-- ============================================================
-- 0024_fix_driver_user_type.sql
-- إصلاح: السائقات الجدد يحصلون على profiles.user_type = 'passenger' بدل 'driver'
-- (دالة handle_new_user الحيّة كانت تكتب `role` فقط وتترك user_type للـdefault).
-- الأثر: تمييز «السائقة» في أماكن تعتمد user_type يفشل.
--
-- هذا الملف: (1) يعيد كتابة handle_new_user لتكتب user_type صحيحًا،
--            (2) يُصلح السجلّات القائمة (كل من له صفّ في drivers → user_type='driver').
-- idempotent. Supabase SQL Editor → Run.
-- ============================================================

-- (1) handle_new_user كاملة وصحيحة — تكتب role + user_type + locale.
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
    new.id, v_role, v_type,
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- (2) تصحيح السجلّات القائمة: كل من له صفّ في drivers → user_type = 'driver'.
-- نُعطّل مؤشّرات profiles مؤقتًا لتجاوز مُشغّل حماية user_type (immutable) لمرّة واحدة.
ALTER TABLE public.profiles DISABLE TRIGGER USER;

UPDATE public.profiles p
   SET user_type = 'driver'
  FROM public.drivers d
 WHERE d.id = p.id
   AND p.user_type IS DISTINCT FROM 'driver';

ALTER TABLE public.profiles ENABLE TRIGGER USER;
