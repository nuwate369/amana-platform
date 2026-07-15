-- ============================================================
-- 0022_driver_kyc_fields.sql
-- توسيع بيانات توثيق السائقة (KYC): إضافة أربعة أعمدة لجدول drivers
-- ليجمع النموذج بياناتٍ نصية + صورة السيارة من الأمام (كان يجمع 3 صور فقط).
--
--   vehicle_year                (int)  — سنة صنع المركبة
--   national_id_number          (text) — رقم الهوية/الإقامة
--   vehicle_registration_number (text) — رقم الاستمارة
--   car_photo_url               (text) — مسار صورة السيارة من الأمام في bucket kyc-documents
--
-- موجودة مسبقًا: vehicle_make, vehicle_model, vehicle_plate,
-- national_id_url, license_url, vehicle_registration_url. الجوال في profiles.phone.
--
-- idempotent (ADD COLUMN IF NOT EXISTS). Supabase SQL Editor → Run.
-- ملاحظة: car_photo_url مسارٌ في نفس bucket kyc-documents الخاص، فتنطبق عليه
-- سياسات RLS/التخزين القائمة دون تغيير (السائقة ترفع في مجلد معرّفها، والإدارة
-- تعاين عبر روابط موقّعة من مفتاح الخدمة).
-- ============================================================

alter table public.drivers
  add column if not exists vehicle_year                int,
  add column if not exists national_id_number          text,
  add column if not exists vehicle_registration_number text,
  add column if not exists car_photo_url               text;
