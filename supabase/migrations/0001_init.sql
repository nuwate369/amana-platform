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
