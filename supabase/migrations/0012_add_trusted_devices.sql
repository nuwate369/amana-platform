-- ============================================================
-- 0012_add_trusted_devices.sql
-- جدول الأجهزة الموثوقة + جدول MFA factors
-- تشغيل: SQL Editor في Supabase Dashboard
-- ============================================================

-- 1. جدول الأجهزة الموثوقة
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  browser text,
  os text,
  ip_address text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- فهرس لجلب أجهزة مستخدم بسرعة
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);

-- RLS: كل مستخدم يرى أجهزته فقط
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own devices"
  ON public.trusted_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own devices"
  ON public.trusted_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own devices"
  ON public.trusted_devices FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own devices"
  ON public.trusted_devices FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. دالة لحذف كل أجهزة مستخدم معين (لتسجيل الخروج من كل الأجهزة)
CREATE OR REPLACE FUNCTION public.logout_all_devices(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.trusted_devices WHERE user_id = p_user_id;
END;
$$;
