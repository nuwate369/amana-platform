-- 0038_announcements_expiration.sql
-- إضافة تاريخ انتهاء للإعلانات بحيث لا تظهر للمستخدمين الجدد بعد هذا التاريخ.

alter table public.announcements
  add column if not exists expires_at timestamptz not null default (now() + interval '1 day');
