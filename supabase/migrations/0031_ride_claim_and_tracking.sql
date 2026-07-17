-- ============================================================
-- 0031 — قبول الرحلة (claim) + موقع السائقة الحيّ على صفّ الرحلة (للتتبّع)
--
-- 1) سياسة تحديث السائقة: كانت تشترط driver_id = auth.uid()، فلا تستطيع سائقة
--    «المطالبة» برحلة معلّقة (driver_id فيها NULL). نسمح بالمطالبة على الرحلات
--    المعلّقة (requested) وتحديث رحلات السائقة نفسها.
-- 2) أعمدة موقع السائقة على الرحلة: الراكبة تقرأ صفّها (RLS) فترى موقع سائقتها حيًّا
--    دون الحاجة لقراءة جدول الحضور (المحجوب عنها).
-- idempotent.
-- ============================================================

-- ---- 1) سياسة القبول/التحديث ----
drop policy if exists rides_update_driver on public.rides;
create policy rides_update_driver on public.rides for update to authenticated
  using (driver_id = auth.uid() or (driver_id is null and status = 'requested'))
  with check (driver_id = auth.uid());

-- ---- 2) موقع السائقة + لقطة بياناتها على صفّ الرحلة ----
-- الراكبة محجوبة عن قراءة profiles/drivers الخاصّة بالسائقة (RLS)، فنخزّن لقطة
-- (اسم/مركبة/لوحة) على الرحلة عند القبول لتعرضها شاشة التتبّع.
alter table public.rides add column if not exists driver_lat         double precision;
alter table public.rides add column if not exists driver_lng         double precision;
alter table public.rides add column if not exists driver_location_at timestamptz;
alter table public.rides add column if not exists driver_name        text;
alter table public.rides add column if not exists driver_vehicle     text;
alter table public.rides add column if not exists driver_plate       text;
-- لقطة اسم الراكبة (السائقة محجوبة عن قراءة profiles الخاصّة بالراكبة).
alter table public.rides add column if not exists passenger_name     text;

-- الرحلات مضافة أصلًا لبثّ Realtime في 0029؛ replica identity full مضبوط هناك.
