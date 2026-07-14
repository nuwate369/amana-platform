-- ============================================================
-- 0016_user_status_and_notification_settings.sql
-- نظام إدارة حالة المستخدم + إعدادات التنبيهات
-- تشغيل: SQL Editor في Supabase Dashboard
-- ============================================================

-- ===== 1. ENUM: user_status =====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE public.user_status AS ENUM (
      'pending_approval',
      'pending_invite',
      'active',
      'suspended',
      'disabled'
    );
  END IF;
END $$;

-- ===== 2. عمود status في profiles =====
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN status public.user_status NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- ===== 3. فهرس =====
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- ===== 4. تعليق كل Triggers التي تمنع التعديل على الحسابات المحمية =====
-- مؤقتاً حتى نتمكن من تحديث الحسابات الحالية
DROP TRIGGER IF EXISTS trg_prevent_protected_update ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_protected_profiles ON public.profiles;
DROP TRIGGER IF EXISTS trigger_immutable_user_type ON public.profiles;

-- ===== 5. تحديث الحسابات الحالية =====
UPDATE public.profiles SET status = 'active'
WHERE status IS NULL OR status = 'active';

-- الحسابات المحمية تكون دائماً active
UPDATE public.profiles SET status = 'active'
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- ===== 6. إعادة إنشاء Triggers الحماية =====
CREATE OR REPLACE FUNCTION public.protect_protected_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_protect_protected_profiles
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_protected_profiles();

CREATE OR REPLACE FUNCTION public.prevent_protected_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_protected_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_protected_update();

-- إعادة إنشاء trigger حماية الدور (من الهجرة 0015)
CREATE OR REPLACE FUNCTION public.enforce_immutable_user_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'immutable_user_type: دور المستخدم لا يمكن تغييره بعد الإنشاء.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_immutable_user_type
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_immutable_user_type();

-- ===== 7. تحديث handle_new_user لضبط status =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_status public.user_status;
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

  IF v_role IN ('super_admin', 'admin', 'support') THEN
    v_status := 'pending_invite';
  ELSIF v_role IN ('passenger', 'driver') THEN
    v_status := 'pending_approval';
  ELSE
    v_status := 'pending_approval';
  END IF;

  INSERT INTO public.profiles (id, role, full_name, status)
  VALUES (
    new.id,
    v_role::user_role,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    v_status
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

-- ===== 8. جدول notification_settings =====
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type  text NOT NULL UNIQUE,
  label_ar           text NOT NULL,
  label_en           text NOT NULL,
  description_ar     text,
  description_en     text,
  is_enabled         boolean NOT NULL DEFAULT true,
  show_in_app        boolean NOT NULL DEFAULT true,
  send_email         boolean NOT NULL DEFAULT false,
  target_roles       text[] NOT NULL DEFAULT ARRAY['super_admin', 'admin', 'support'],
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_type
  ON public.notification_settings(notification_type);

-- ===== 9. RLS =====
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read notification settings"
  ON public.notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin')
    )
  );

-- ===== 10. Seed =====
INSERT INTO public.notification_settings
  (notification_type, label_ar, label_en, description_ar, description_en, is_enabled, show_in_app, send_email, target_roles)
VALUES
  ('new_passenger_registered', 'راكب جديد سجّل', 'New passenger registered', 'إشعار عند تسجيل راكب جديد', 'Notification when a new passenger registers', true, true, true, ARRAY['super_admin', 'admin', 'support']),
  ('new_driver_registered', 'سائقة جديدة سجّلت', 'New driver registered', 'إشعار عند تسجيل سائقة جديدة', 'Notification when a new driver registers', true, true, true, ARRAY['super_admin', 'admin', 'support']),
  ('new_staff_joined', 'موظف جديد انضم', 'New staff joined', 'إشعار عند قبول دعوة موظف جديد', 'Notification when a new staff member accepts invitation', true, true, false, ARRAY['super_admin', 'admin']),
  ('new_ride_created', 'رحلة جديدة', 'New ride created', 'إشعار عند إنشاء رحلة جديدة', 'Notification when a new ride is created', true, true, false, ARRAY['super_admin', 'admin', 'support']),
  ('driver_document_expiring', 'مستندات سائقة تنتهي صلاحيتها', 'Driver documents expiring', 'تنبيه عند اقتراب انتهاء صلاحية مستندات KYC', 'Warning when KYC documents expire', true, true, true, ARRAY['super_admin', 'admin']),
  ('user_status_changed', 'تغيير حالة مستخدم', 'User status changed', 'إشعار عند تغيير حالة مستخدم', 'Notification when a user status changes', true, true, false, ARRAY['super_admin', 'admin'])
ON CONFLICT (notification_type) DO NOTHING;

-- ===== 11. دالة تغيير الحالة =====
CREATE OR REPLACE FUNCTION public.change_user_status(
  p_target_id uuid,
  p_new_status public.user_status
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_protected boolean;
BEGIN
  SELECT is_protected INTO v_is_protected
  FROM public.profiles WHERE id = p_target_id;

  IF v_is_protected = true THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.';
  END IF;

  UPDATE public.profiles SET status = p_new_status WHERE id = p_target_id;
END;
$$;

-- ===== 12. Triggers الإشعارات (مع فحص notification_settings) =====

-- 12a. سائقة جديدة
DROP TRIGGER IF EXISTS trigger_new_driver_registered ON public.drivers;

CREATE OR REPLACE FUNCTION public.notify_new_driver_registered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.notification_settings WHERE notification_type = 'new_driver_registered';
  IF v_settings IS NULL OR v_settings.is_enabled = false THEN RETURN new; END IF;

  select full_name into v_name from public.profiles where id = new.id;
  v_name := coalesce(v_name, 'غير معروفة');

  IF v_settings.show_in_app = true THEN
    insert into public.system_notifications (type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, target_user_id)
    values ('new_driver_registered', 'تم تسجيل سائقة جديدة: ' || v_name, 'New driver registered: ' || v_name,
      'سائقة جديدة (' || v_name || ') قامت بالتسجيل وحالتها: بانتظار الموافقة.',
      'A new driver (' || v_name || ') has registered. Status: pending approval.',
      'driver', new.id, null);
  END IF;

  return new;
end;
$$;

CREATE TRIGGER trigger_new_driver_registered
  after insert on public.drivers
  for each row execute function public.notify_new_driver_registered();

-- 12b. راكبة جديدة
CREATE OR REPLACE FUNCTION public.notify_new_passenger_registered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_settings RECORD;
BEGIN
  IF new.role != 'passenger' THEN RETURN new; END IF;

  SELECT * INTO v_settings FROM public.notification_settings WHERE notification_type = 'new_passenger_registered';
  IF v_settings IS NULL OR v_settings.is_enabled = false THEN RETURN new; END IF;

  select full_name into v_name from public.profiles where id = new.id;
  v_name := coalesce(v_name, 'غير معروفة');

  IF v_settings.show_in_app = true THEN
    insert into public.system_notifications (type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, target_user_id)
    values ('new_passenger_registered', 'راكب جديد سجّل: ' || v_name, 'New passenger registered: ' || v_name,
      'راكب جديد (' || v_name || ') قامت بالتسجيل وحالتها: بانتظار الموافقة.',
      'A new passenger (' || v_name || ') has registered. Status: pending approval.',
      'passenger', new.id, null);
  END IF;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS trigger_new_passenger_registered ON public.profiles;
CREATE TRIGGER trigger_new_passenger_registered
  after insert on public.profiles
  for each row execute function public.notify_new_passenger_registered();

-- 12c. موظف جديد
CREATE OR REPLACE FUNCTION public.notify_new_staff_joined()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_settings RECORD;
BEGIN
  IF new.role not in ('admin') THEN RETURN new; END IF;

  SELECT * INTO v_settings FROM public.notification_settings WHERE notification_type = 'new_staff_joined';
  IF v_settings IS NULL OR v_settings.is_enabled = false THEN RETURN new; END IF;

  select full_name into v_name from public.profiles where id = new.id;
  v_name := coalesce(v_name, 'موظف جديد');

  IF v_settings.show_in_app = true THEN
    insert into public.system_notifications (type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, target_user_id)
    values ('new_staff_joined', 'انضم موظف جديد: ' || v_name, 'New staff joined: ' || v_name,
      'الموظف ' || v_name || ' انضم لفريق الإدارة.',
      'Staff member ' || v_name || ' has joined the admin team.',
      'staff', new.id, null);
  END IF;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS trigger_new_staff_joined ON public.profiles;
CREATE TRIGGER trigger_new_staff_joined
  after insert on public.profiles
  for each row execute function public.notify_new_staff_joined();
