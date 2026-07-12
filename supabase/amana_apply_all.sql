-- ============================================================
-- منصة أمانة — تطبيق المخطط كاملًا (الصقه في Supabase SQL Editor ثم Run)
-- يجمع: 0001_init.sql (الجداول) + 0002_rls.sql (سياسات RLS)
-- ============================================================

-- ===== 0001_init.sql =====
-- =============================================================================
-- منصة أمانة — المخطط الأساسي (core schema)
-- 0001_init.sql
-- Postgres 15 / Supabase
--
-- يعرّف هذا الملف: الامتدادات، الأنواع المعدودة (enums)، الجداول الأساسية،
-- الدوال والمشغّلات (triggers) الخاصة بـ updated_at وإنشاء ملف المستخدم،
-- الفهارس، وتفعيل Row Level Security على كل الجداول العامة.
-- =============================================================================

-- امتداد pgcrypto مطلوب لـ gen_random_uuid()
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- الأنواع المعدودة (enums)
-- -----------------------------------------------------------------------------

-- دور المستخدم: راكبة / سائقة / مشرفة
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('passenger', 'driver', 'admin');
  end if;
end
$$;

-- حالة توثيق السائقة
do $$
begin
  if not exists (select 1 from pg_type where typname = 'driver_status') then
    create type driver_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

-- حالة الرحلة
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ride_status') then
    create type ride_status as enum ('requested', 'matched', 'in_progress', 'completed', 'cancelled');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- جدول profiles — ملف تعريف كل مستخدم (يمتد من auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role   not null default 'passenger',
  full_name   text,
  phone       text,
  locale      text        not null default 'ar' check (locale in ('ar', 'en')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- جدول drivers — بيانات توثيق السائقة والمركبة (id يساوي profiles.id)
-- -----------------------------------------------------------------------------
create table if not exists public.drivers (
  id                       uuid primary key references public.profiles(id) on delete cascade,
  status                   driver_status not null default 'pending',
  national_id_url          text,
  license_url              text,
  vehicle_registration_url text,
  vehicle_make             text,
  vehicle_model            text,
  vehicle_plate            text,
  created_at               timestamptz   not null default now(),
  updated_at               timestamptz   not null default now()
);

-- -----------------------------------------------------------------------------
-- جدول rides — الرحلات
-- -----------------------------------------------------------------------------
create table if not exists public.rides (
  id              uuid primary key default gen_random_uuid(),
  passenger_id    uuid not null references public.profiles(id) on delete cascade,
  driver_id       uuid references public.profiles(id),
  status          ride_status not null default 'requested',
  pickup_lat      double precision,
  pickup_lng      double precision,
  pickup_address  text,
  dropoff_lat     double precision,
  dropoff_lng     double precision,
  dropoff_address text,
  price_estimate  numeric(10, 2),
  price_final     numeric(10, 2),
  requested_at    timestamptz not null default now(),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- جدول ratings — تقييمات الرحلات (كل تقييم من مقيِّمة إلى مقيَّمة)
-- -----------------------------------------------------------------------------
create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade,
  rater_id   uuid not null references public.profiles(id),
  ratee_id   uuid not null references public.profiles(id),
  stars      int  not null check (stars between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- جدول groups — مجموعات (مثل مجموعة عائلية أو مجموعة زميلات)
-- -----------------------------------------------------------------------------
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- جدول group_members — عضوية المجموعات (مفتاح مركّب)
-- -----------------------------------------------------------------------------
create table if not exists public.group_members (
  group_id  uuid references public.groups(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, member_id)
);

-- -----------------------------------------------------------------------------
-- الدالة set_updated_at() — تحدّث عمود updated_at عند كل UPDATE
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- مشغّلات updated_at على الجداول التي تملك العمود
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_drivers_updated_at on public.drivers;
create trigger set_drivers_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

drop trigger if exists set_rides_updated_at on public.rides;
create trigger set_rides_updated_at
  before update on public.rides
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- الدالة handle_new_user() — تُنشئ سطر profiles تلقائياً عند تسجيل مستخدم جديد
-- SECURITY DEFINER لتتجاوز RLS أثناء الإدراج من مشغّل auth.users
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'passenger'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

-- مشغّل بعد الإدراج على auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- الفهارس (indexes)
-- -----------------------------------------------------------------------------
create index if not exists idx_rides_passenger_id on public.rides (passenger_id);
create index if not exists idx_rides_driver_id    on public.rides (driver_id);
create index if not exists idx_rides_status       on public.rides (status);
create index if not exists idx_ratings_ride_id       on public.ratings (ride_id);
create index if not exists idx_group_members_member  on public.group_members (member_id);

-- -----------------------------------------------------------------------------
-- تفعيل Row Level Security على كل الجداول العامة
-- (السياسات نفسها معرّفة في 0002_rls.sql)
-- -----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.drivers       enable row level security;
alter table public.rides         enable row level security;
alter table public.ratings       enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- ===== 0002_rls.sql =====
-- =============================================================================
-- منصة أمانة — سياسات Row Level Security
-- 0002_rls.sql
-- Postgres 15 / Supabase — تعتمد جميع السياسات على auth.uid()
--
-- ملاحظة مهمة عن لوحة المشرفة (admin dashboard):
--   لوحة المشرفة تستخدم مفتاح service_role الذي يتجاوز RLS بالكامل
--   (service_role BYPASSES RLS)، لذلك لا حاجة لأي سياسات خاصة بدور admin هنا.
--   كل السياسات أدناه تخص الراكبة والسائقة (المستخدم العادي المصادَق).
--
-- تفعيل RLS نفسه تمّ في 0001_init.sql؛ هنا نُعرّف السياسات فقط.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — كل مستخدم يقرأ ويحدّث ملفه فقط (الإدراج يتم عبر مشغّل handle_new_user)
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- drivers — السائقة تقرأ وتُدرج وتحدّث سجلها فقط (id = auth.uid())
-- -----------------------------------------------------------------------------
drop policy if exists drivers_select_own on public.drivers;
create policy drivers_select_own
  on public.drivers
  for select
  using (id = auth.uid());

drop policy if exists drivers_insert_own on public.drivers;
create policy drivers_insert_own
  on public.drivers
  for insert
  with check (id = auth.uid());

drop policy if exists drivers_update_own on public.drivers;
create policy drivers_update_own
  on public.drivers
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- rides — سياسات الراكبة والسائقة
-- -----------------------------------------------------------------------------

-- الراكبة: تقرأ رحلاتها
drop policy if exists rides_select_passenger on public.rides;
create policy rides_select_passenger
  on public.rides
  for select
  using (passenger_id = auth.uid());

-- الراكبة: تُنشئ رحلة باسمها
drop policy if exists rides_insert_passenger on public.rides;
create policy rides_insert_passenger
  on public.rides
  for insert
  with check (passenger_id = auth.uid());

-- الراكبة: تحدّث رحلاتها (مثل الإلغاء)
drop policy if exists rides_update_passenger on public.rides;
create policy rides_update_passenger
  on public.rides
  for update
  using (passenger_id = auth.uid())
  with check (passenger_id = auth.uid());

-- السائقة: تقرأ الرحلات المسندة إليها أو الرحلات المطلوبة (المتاحة للقبول)
drop policy if exists rides_select_driver on public.rides;
create policy rides_select_driver
  on public.rides
  for select
  using (driver_id = auth.uid() or status = 'requested');

-- السائقة: تحدّث الرحلات المسندة إليها
drop policy if exists rides_update_driver on public.rides;
create policy rides_update_driver
  on public.rides
  for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- -----------------------------------------------------------------------------
-- ratings — القراءة لطرفي التقييم، والإدراج للمقيِّمة فقط
-- -----------------------------------------------------------------------------
drop policy if exists ratings_select_involved on public.ratings;
create policy ratings_select_involved
  on public.ratings
  for select
  using (rater_id = auth.uid() or ratee_id = auth.uid());

drop policy if exists ratings_insert_rater on public.ratings;
create policy ratings_insert_rater
  on public.ratings
  for insert
  with check (rater_id = auth.uid());

-- -----------------------------------------------------------------------------
-- groups — المالكة تدير مجموعتها بالكامل، والأعضاء يقرؤون مجموعاتهم
-- -----------------------------------------------------------------------------

-- المالكة: كل العمليات (select/insert/update/delete) على مجموعاتها
drop policy if exists groups_owner_all on public.groups;
create policy groups_owner_all
  on public.groups
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- الأعضاء: قراءة المجموعات التي ينتمون إليها
drop policy if exists groups_select_member on public.groups;
create policy groups_select_member
  on public.groups
  for select
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = groups.id
        and gm.member_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- group_members — العضو يدير عضويته، ومالكة المجموعة تدير أعضاءها
-- -----------------------------------------------------------------------------

-- العضو: قراءة عضويته
drop policy if exists group_members_select_own on public.group_members;
create policy group_members_select_own
  on public.group_members
  for select
  using (member_id = auth.uid());

-- العضو: الانضمام (إدراج عضويته)
drop policy if exists group_members_insert_own on public.group_members;
create policy group_members_insert_own
  on public.group_members
  for insert
  with check (member_id = auth.uid());

-- العضو: مغادرة (حذف عضويته)
drop policy if exists group_members_delete_own on public.group_members;
create policy group_members_delete_own
  on public.group_members
  for delete
  using (member_id = auth.uid());

-- مالكة المجموعة: قراءة أعضاء مجموعاتها
drop policy if exists group_members_select_owner on public.group_members;
create policy group_members_select_owner
  on public.group_members
  for select
  using (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = auth.uid()
    )
  );

-- مالكة المجموعة: إدارة أعضاء مجموعاتها (إدراج/حذف)
drop policy if exists group_members_insert_owner on public.group_members;
create policy group_members_insert_owner
  on public.group_members
  for insert
  with check (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = auth.uid()
    )
  );

drop policy if exists group_members_delete_owner on public.group_members;
create policy group_members_delete_owner
  on public.group_members
  for delete
  using (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = auth.uid()
    )
  );
