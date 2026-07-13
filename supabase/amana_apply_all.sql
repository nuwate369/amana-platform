-- ============================================================
-- منصة أمانة — تطبيق المخطط كاملًا (الصقه في Supabase SQL Editor ثم Run)
-- يجمع: 0001_init (الجداول الأساسية) + 0002_rls (سياسات RLS) +
--        0007_user_type (user_type enum + حذف RBAC القديم)
-- ============================================================

-- ===== 0001_init.sql (النسخة المحدَّثة — بدون role القديم) =====

create extension if not exists pgcrypto;

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

-- نوع المستخدم الجديد (يستبدل user_role القديم)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_type') then
    create type user_type as enum (
      'passenger', 'driver', 'super_admin', 'admin', 'support'
    );
  end if;
end
$$;

-- جدول profiles
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  user_type          user_type   not null default 'passenger',
  is_protected       boolean     not null default false,
  full_name          text,
  phone              text,
  preferred_language text        not null default 'ar' check (preferred_language in ('ar', 'en')),
  preferred_theme    text        not null default 'system' check (preferred_theme in ('light', 'dark', 'system')),
  avatar_url         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- جدول drivers
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

-- جدول rides
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

-- جدول ratings
create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade,
  rater_id   uuid not null references public.profiles(id),
  ratee_id   uuid not null references public.profiles(id),
  stars      int  not null check (stars between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);

-- جدول groups
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- جدول group_members
create table if not exists public.group_members (
  group_id  uuid references public.groups(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, member_id)
);

-- دالة updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

-- دالة handle_new_user (تقرأ user_type من metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_type user_type;
  v_raw_type  text;
begin
  v_raw_type := new.raw_user_meta_data ->> 'user_type';
  v_user_type := case
    when v_raw_type in ('passenger', 'driver', 'super_admin', 'admin', 'support')
      then v_raw_type::user_type
    else 'passenger'::user_type
  end;
  insert into public.profiles (id, user_type, full_name, is_protected)
  values (new.id, v_user_type, new.raw_user_meta_data ->> 'full_name', false)
  on conflict (id) do update set full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger حماية user_type + is_protected
create or replace function public.enforce_immutable_user_type()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_type <> old.user_type then
      raise exception 'IMMUTABLE_USER_TYPE: لا يُسمح بتغيير user_type بعد إنشاء الحساب.'
        using errcode = 'P0001';
    end if;
    if old.is_protected = true then
      raise exception 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.'
        using errcode = 'P0002';
    end if;
  end if;
  if tg_op = 'DELETE' then
    if old.is_protected = true then
      raise exception 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن حذفه.'
        using errcode = 'P0002';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_immutable_user_type on public.profiles;
create trigger trigger_immutable_user_type
  before update or delete on public.profiles
  for each row execute function public.enforce_immutable_user_type();

-- فهارس
create index if not exists idx_rides_passenger_id   on public.rides (passenger_id);
create index if not exists idx_rides_driver_id       on public.rides (driver_id);
create index if not exists idx_rides_status          on public.rides (status);
create index if not exists idx_ratings_ride_id       on public.ratings (ride_id);
create index if not exists idx_group_members_member  on public.group_members (member_id);
create index if not exists idx_profiles_user_type    on public.profiles (user_type);
create index if not exists idx_profiles_is_protected on public.profiles (is_protected) where is_protected = true;

-- تفعيل RLS
alter table public.profiles      enable row level security;
alter table public.drivers       enable row level security;
alter table public.rides         enable row level security;
alter table public.ratings       enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- ===== 0002_rls.sql =====

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists drivers_select_own on public.drivers;
create policy drivers_select_own
  on public.drivers for select
  using (id = auth.uid());

drop policy if exists drivers_insert_own on public.drivers;
create policy drivers_insert_own
  on public.drivers for insert
  with check (id = auth.uid());

drop policy if exists drivers_update_own on public.drivers;
create policy drivers_update_own
  on public.drivers for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists rides_select_passenger on public.rides;
create policy rides_select_passenger
  on public.rides for select
  using (passenger_id = auth.uid());

drop policy if exists rides_insert_passenger on public.rides;
create policy rides_insert_passenger
  on public.rides for insert
  with check (passenger_id = auth.uid());

drop policy if exists rides_update_passenger on public.rides;
create policy rides_update_passenger
  on public.rides for update
  using (passenger_id = auth.uid())
  with check (passenger_id = auth.uid());

drop policy if exists rides_select_driver on public.rides;
create policy rides_select_driver
  on public.rides for select
  using (driver_id = auth.uid() or status = 'requested');

drop policy if exists rides_update_driver on public.rides;
create policy rides_update_driver
  on public.rides for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

drop policy if exists ratings_select_involved on public.ratings;
create policy ratings_select_involved
  on public.ratings for select
  using (rater_id = auth.uid() or ratee_id = auth.uid());

drop policy if exists ratings_insert_rater on public.ratings;
create policy ratings_insert_rater
  on public.ratings for insert
  with check (rater_id = auth.uid());

drop policy if exists groups_owner_all on public.groups;
create policy groups_owner_all
  on public.groups for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists groups_select_member on public.groups;
create policy groups_select_member
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.member_id = auth.uid()
    )
  );

drop policy if exists group_members_select_own on public.group_members;
create policy group_members_select_own
  on public.group_members for select
  using (member_id = auth.uid());

drop policy if exists group_members_insert_own on public.group_members;
create policy group_members_insert_own
  on public.group_members for insert
  with check (member_id = auth.uid());

drop policy if exists group_members_delete_own on public.group_members;
create policy group_members_delete_own
  on public.group_members for delete
  using (member_id = auth.uid());

drop policy if exists group_members_select_owner on public.group_members;
create policy group_members_select_owner
  on public.group_members for select
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists group_members_insert_owner on public.group_members;
create policy group_members_insert_owner
  on public.group_members for insert
  with check (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists group_members_delete_owner on public.group_members;
create policy group_members_delete_owner
  on public.group_members for delete
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

-- ===== Storage Buckets & Policies =====

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible."
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar."
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own avatar."
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can upload their own kyc documents."
  on storage.objects for insert
  with check (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read their own kyc documents."
  on storage.objects for select
  using (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own kyc documents."
  on storage.objects for delete
  using (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- ===== تسمير حساب super_admin المحمي =====
-- يُشغَّل مرة واحدة بعد إنشاء المخطط كاملاً
-- نُسقط الـ Trigger مؤقتاً ثم نعيد إنشاءه بعد التحديث
-- لأن enforce_immutable_user_type يمنع تغيير user_type بعد الإنشاء
drop trigger if exists trigger_immutable_user_type on public.profiles;

update public.profiles
set user_type = 'super_admin', is_protected = true
where id in (select id from auth.users where email = 'nuwate369@gmail.com');

-- إعادة إنشاء الـ Trigger بعد التسمير
create trigger trigger_immutable_user_type
  before update or delete on public.profiles
  for each row execute function public.enforce_immutable_user_type();
