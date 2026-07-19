-- 0037_announcements.sql
-- إعلانات/تنبيهات موجّهة للمستخدمين النهائيين (الراكبات/السائقات) — تُنشأ من لوحة
-- الإدارة. منفصلة تمامًا عن system_notifications (الداخلي للموظفين).
-- الجمهور: all | passengers | drivers | specific (مستخدم واحد عبر target_user_id).
-- recipient_count = عدد المستلمين وقت الإرسال (لإحصاء «إجمالي المستلمين»). idempotent.

create table if not exists public.announcements (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  body           text,
  type           text not null default 'announcement'
                   check (type in ('announcement', 'maintenance', 'update')),
  audience       text not null default 'all'
                   check (audience in ('all', 'passengers', 'drivers', 'specific')),
  target_user_id uuid references public.profiles(id) on delete set null,
  status         text not null default 'sent'
                   check (status in ('sent', 'scheduled')),
  recipient_count integer not null default 0,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);

create index if not exists announcements_created_at_idx on public.announcements (created_at desc);

alter table public.announcements enable row level security;

-- القراءة: الموظفون فقط (الكتابة تتم عبر service role من إجراءات الخادم).
drop policy if exists announcements_select_staff on public.announcements;
create policy announcements_select_staff on public.announcements
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) in ('super_admin', 'admin', 'support')
    )
  );
