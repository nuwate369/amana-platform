-- 0038_announcements_expiration.sql
-- إضافة تاريخَي بداية/انتهاء للإعلانات.
-- starts_at : يوم الإرسال (الإشعار لا يظهر قبله).
-- expires_at : يوم الانتهاء (الإشعار لا يظهر للمستخدمين بعده).
-- الحدّ الأدنى: فرق يوم واحد على الأقل بين البداية والنهاية (check constraint).

alter table public.announcements
  add column if not exists starts_at  timestamptz not null default now(),
  add column if not exists expires_at timestamptz not null default (now() + interval '1 day');

-- constraint: expires_at يجب أن يكون بعد starts_at بيوم على الأقل
alter table public.announcements
  drop constraint if exists announcements_expiry_after_start;

alter table public.announcements
  add constraint announcements_expiry_after_start
    check (expires_at >= starts_at + interval '1 day');
