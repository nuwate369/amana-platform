-- 0036_vehicle_class.sql
-- فئة المركبة/الرحلة (standard | premium | group).
-- - drivers.vehicle_class : الفئة التي تُصنّف السائقة مركبتها ضمنها (تُدخَل في التوثيق).
-- - rides.requested_class : الفئة التي اختارتها الراكبة عند طلب الرحلة.
-- عمودان نصّيان اختياريّان (nullable) حتى لا نكسر الصفوف/الحسابات القائمة، ومقيَّدان
-- بقائمة القيم المعتمدة (تطابق RIDE_CLASSES في @amana/shared-types). idempotent.

alter table public.drivers
  add column if not exists vehicle_class text;

alter table public.rides
  add column if not exists requested_class text;

-- قيد تحقّق للفئات المعتمدة (يسمح بـ NULL). نُسقطه أولًا ليكون التشغيل idempotent.
alter table public.drivers drop constraint if exists drivers_vehicle_class_check;
alter table public.drivers
  add constraint drivers_vehicle_class_check
  check (vehicle_class is null or vehicle_class in ('standard', 'premium', 'group'));

alter table public.rides drop constraint if exists rides_requested_class_check;
alter table public.rides
  add constraint rides_requested_class_check
  check (requested_class is null or requested_class in ('standard', 'premium', 'group'));
