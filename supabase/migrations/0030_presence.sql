-- ============================================================
-- 0030 — حضور المستخدمين وتتبّع النشاط (سائقات/ركاب)
--
-- presence:        الحالة الآنية لكل مستخدم (offline/foreground/online) + آخر موقع
--                  + الطوابع الزمنية. تُقرأ لحظيًّا في لوحة الإدارة عبر Realtime.
-- presence_events: سجلّ أحداث الانتقال (فتح/اتصال/فصل/إغلاق) لحساب المدد (المتابعة).
--
-- الخصوصية: المستخدم يكتب صفّه فقط؛ الموظفون (is_staff_user) يقرؤون الكل.
-- idempotent — آمن للتشغيل المتكرّر.
-- ============================================================

-- ---- نوع الحالة ----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'presence_status') then
    create type presence_status as enum ('offline', 'foreground', 'online');
  end if;
end $$;

-- ---- جدول الحالة الآنية ----
create table if not exists public.presence (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  role          text,                                   -- 'driver' | 'passenger' (للفلترة)
  status        presence_status not null default 'offline',
  available     boolean not null default false,         -- وضع الاتصال/الإتاحة (سائقة)
  lat           double precision,
  lng           double precision,
  location_at   timestamptz,
  app_opened_at timestamptz,                            -- بداية جلسة التطبيق الحالية
  online_since  timestamptz,                            -- وقت آخر «اتصال»
  last_seen_at  timestamptz not null default now(),     -- آخر نبضة (لكشف الانقطاع)
  updated_at    timestamptz not null default now()
);
create index if not exists presence_status_idx    on public.presence (status);
create index if not exists presence_available_idx on public.presence (available) where available;
create index if not exists presence_role_idx      on public.presence (role);

drop trigger if exists set_presence_updated_at on public.presence;
create trigger set_presence_updated_at before update on public.presence
  for each row execute function public.set_updated_at();

-- ---- سجلّ الأحداث (لحساب المدد) ----
create table if not exists public.presence_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event      text not null,        -- app_open | go_online | go_offline | app_close
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now()
);
create index if not exists presence_events_user_idx on public.presence_events (user_id, created_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.presence        enable row level security;
alter table public.presence_events enable row level security;

-- presence: قراءة/كتابة الصفّ الخاص + قراءة الموظفين للكل
drop policy if exists presence_select_own   on public.presence;
create policy presence_select_own   on public.presence for select to authenticated
  using (user_id = auth.uid());
drop policy if exists presence_select_staff on public.presence;
create policy presence_select_staff on public.presence for select to authenticated
  using (public.is_staff_user(auth.uid()));
drop policy if exists presence_insert_own   on public.presence;
create policy presence_insert_own   on public.presence for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists presence_update_own   on public.presence;
create policy presence_update_own   on public.presence for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- presence_events: إدراج/قراءة الخاص + قراءة الموظفين
drop policy if exists presence_events_insert_own   on public.presence_events;
create policy presence_events_insert_own   on public.presence_events for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists presence_events_select_own   on public.presence_events;
create policy presence_events_select_own   on public.presence_events for select to authenticated
  using (user_id = auth.uid());
drop policy if exists presence_events_select_staff on public.presence_events;
create policy presence_events_select_staff on public.presence_events for select to authenticated
  using (public.is_staff_user(auth.uid()));

-- ============================================================
-- Realtime + إصلاح: تمكين الموظفين من استقبال تغيّرات الرحلات لحظيًّا
-- (كانت السياسة تقصر الرؤية على الراكبة/السائقة؛ فلا تصل أحداث اللوحة.)
-- ============================================================
drop policy if exists rides_select_staff on public.rides;
create policy rides_select_staff on public.rides for select to authenticated
  using (public.is_staff_user(auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'presence'
  ) then
    alter publication supabase_realtime add table public.presence;
  end if;
end $$;

alter table public.presence replica identity full;
