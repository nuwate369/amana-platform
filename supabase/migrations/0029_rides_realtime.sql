-- ============================================================
-- 0029 — تفعيل البثّ الحيّ (Realtime) لجدول الرحلات
-- تحتاجه شاشة «مراقبة الرحلات الحيّة» في لوحة الإدارة لتتحدّث لحظيًّا.
-- idempotent: آمن للتشغيل المتكرّر.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'rides'
  ) then
    alter publication supabase_realtime add table public.rides;
  end if;
end $$;

-- بيانات الصفّ الكاملة في أحداث التحديث/الحذف (يساعد الفلترة على العميل).
alter table public.rides replica identity full;
