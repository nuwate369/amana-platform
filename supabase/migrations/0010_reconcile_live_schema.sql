-- ============================================================
-- 0010_reconcile_live_schema.sql
-- مزامنة رسمية: يعكس حالة قاعدة البيانات الحية الدقيقة
-- بتاريخ 2026-07-13 بعد الإصلاحات اليدوية.
-- يمكن تطبيقه على قاعدة نظيفة للحصول على نفس الحالة بالضبط.
-- ============================================================

-- ===== الأنواع (Enums) =====

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('passenger', 'driver', 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status') THEN
    CREATE TYPE driver_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status') THEN
    CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

-- ===== جدول profiles =====

CREATE TABLE IF NOT EXISTS public.profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               user_role   NOT NULL DEFAULT 'passenger',
  full_name          text,
  phone              text,
  locale             text        NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar', 'en')),
  avatar_url         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول drivers =====

CREATE TABLE IF NOT EXISTS public.drivers (
  id                       uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                   driver_status NOT NULL DEFAULT 'pending',
  national_id_url          text,
  license_url              text,
  vehicle_registration_url text,
  vehicle_make             text,
  vehicle_model            text,
  vehicle_plate            text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول rides =====

CREATE TABLE IF NOT EXISTS public.rides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id        uuid REFERENCES public.profiles(id),
  status           ride_status NOT NULL DEFAULT 'requested',
  pickup_lat       double precision,
  pickup_lng       double precision,
  pickup_address   text,
  dropoff_lat      double precision,
  dropoff_lng      double precision,
  dropoff_address  text,
  price_estimate   numeric,
  price_final      numeric,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول ratings =====

CREATE TABLE IF NOT EXISTS public.ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id    uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_id   uuid NOT NULL REFERENCES public.profiles(id),
  ratee_id   uuid NOT NULL REFERENCES public.profiles(id),
  stars      int  NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول groups =====

CREATE TABLE IF NOT EXISTS public.groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول group_members =====

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id   uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, member_id)
);

-- ===== Triggers: updated_at =====

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_drivers_updated_at ON public.drivers;
CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_rides_updated_at ON public.rides;
CREATE TRIGGER set_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Trigger: handle_new_user =====

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
  -- خريطة user_type → user_role
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

  -- إنشاء صف driver إذا كان النوع driver
  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (id, status)
    VALUES (new.id, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS Policies =====

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- drivers
DROP POLICY IF EXISTS drivers_select_own ON public.drivers;
CREATE POLICY drivers_select_own ON public.drivers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS drivers_update_own ON public.drivers;
CREATE POLICY drivers_update_own ON public.drivers FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- rides
DROP POLICY IF EXISTS rides_select_participant ON public.rides;
CREATE POLICY rides_select_participant ON public.rides FOR SELECT
  USING (passenger_id = auth.uid() OR driver_id = auth.uid());

-- ratings
DROP POLICY IF EXISTS ratings_select_any ON public.ratings;
CREATE POLICY ratings_select_any ON public.ratings FOR SELECT
  USING (true);

-- groups
DROP POLICY IF EXISTS groups_select_any ON public.groups;
CREATE POLICY groups_select_any ON public.groups FOR SELECT
  USING (true);

-- group_members
DROP POLICY IF EXISTS group_members_select_any ON public.group_members;
CREATE POLICY group_members_select_any ON public.group_members FOR SELECT
  USING (true);

-- ===== بيانات حية: nuwate369 admin =====
-- (يتم إنشاؤه تلقائياً عبر inviteUserByEmail + trigger)
-- القيم الحالية في قاعدة البيانات:
--   profiles: 4acfc35f → role=admin, full_name='مسؤول أمانة'
--   profiles: cfd5630a → role=admin, full_name='موظف جديد'
--   drivers: 63f83b19=approved, 92df4b07=pending, 73398093=approved
--   rides: فارغ
--   groups: فارغ

-- ============================================================
-- أعمدة جديدة مطلوبة لإدارة فريق العمل (Staff Management)
-- تُضاف الآن لأنها مطلوبة للميزات الجديدة
-- ============================================================

-- is_protected: حماية الحسابات الحساسة من الحذف/التعديل
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_protected boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- تطبيق الحماية على الحسابات الحساسة
UPDATE public.profiles SET is_protected = true
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';  -- nuwate369

-- ===== تحويل role → user_type (التوحيد مع الكود) =====
-- إضافة enum user_type الجديد إذا لم يكن موجوداً
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('passenger', 'driver', 'super_admin', 'admin', 'support');
  END IF;
END $$;

-- إضافة عمود user_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_type user_type NOT NULL DEFAULT 'passenger';
  END IF;
END $$;

-- مزامنة البيانات: role → user_type
UPDATE public.profiles
SET user_type = CASE role
  WHEN 'admin'   THEN 'admin'::user_type
  WHEN 'driver'  THEN 'driver'::user_type
  WHEN 'passenger' THEN 'passenger'::user_type
  ELSE 'passenger'::user_type
END;

-- nuwate369 = super_admin
UPDATE public.profiles
SET user_type = 'super_admin'::user_type
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- ===== حماية الحسابات المحمية من التعديل =====
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

DROP TRIGGER IF EXISTS trigger_immutable_user_type ON public.profiles;
CREATE TRIGGER trigger_immutable_user_type
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_immutable_user_type();
