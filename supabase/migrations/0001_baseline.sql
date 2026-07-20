-- ═══════════════════════════════════════════════════════════════════════════
-- 0001_baseline.sql — المخطّط الكامل لقاعدة بيانات «أمانة»
--
-- هذا الملفّ دمج لكل الهجرات المتراكمة (0001 → 0042) في أساس واحد قابل
-- للتشغيل من قاعدة فارغة. الترتيب هنا هو ترتيب تطبيقها الأصلي، فتشغيله
-- كاملًا يُنتج المخطّط نفسه الموجود في الإنتاج اليوم.
--
-- تُبنى الهجرات الجديدة فوقه بأرقام 0002 فما بعد.
-- الملفّات الأصلية محفوظة في تاريخ git إن لزم الرجوع إليها.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- [0001_init.sql]
-- ───────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────
-- [0002_rls.sql]
-- ───────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────
-- [0003_rbac.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- Migration 0003: RBAC (Role-Based Access Control) for Admin Panel

create table if not exists public.admin_roles (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    is_protected boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.admin_permissions (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    description text,
    created_at timestamptz default now()
);

create table if not exists public.admin_role_permissions (
    role_id uuid references public.admin_roles(id) on delete cascade,
    permission_id uuid references public.admin_permissions(id) on delete cascade,
    primary key (role_id, permission_id)
);

create table if not exists public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role_id uuid references public.admin_roles(id),
    is_protected boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_users enable row level security;

-- Protection Trigger
create or replace function public.protect_admin_records()
returns trigger as $$
begin
    if (tg_op = 'DELETE') then
        if old.is_protected = true then
            raise exception 'لا يمكن حذف هذا السجل لأنه محمي (is_protected = true)';
        end if;
        return old;
    elsif (tg_op = 'UPDATE') then
        if old.is_protected = true then
            raise exception 'لا يمكن تعديل هذا السجل لأنه محمي (is_protected = true)';
        end if;
        return new;
    end if;
    return null;
end;
$$ language plpgsql;

drop trigger if exists trigger_protect_admin_roles on public.admin_roles;
create trigger trigger_protect_admin_roles
    before update or delete on public.admin_roles
    for each row execute function public.protect_admin_records();

drop trigger if exists trigger_protect_admin_users on public.admin_users;
create trigger trigger_protect_admin_users
    before update or delete on public.admin_users
    for each row execute function public.protect_admin_records();

-- Seed Data for Roles and Permissions
do $$
declare
    super_admin_role_id uuid;
    perm_id uuid;
begin
    insert into public.admin_roles (name, description, is_protected)
    values ('super_admin', 'المدير العام بصلاحيات كاملة', true)
    on conflict (name) do update set is_protected = true
    returning id into super_admin_role_id;

    insert into public.admin_permissions (key, description) values
    ('manage_roles', 'إدارة المجموعات والصلاحيات'),
    ('manage_admin_users', 'إدارة المستخدمين الإداريين'),
    ('manage_drivers', 'إدارة السائقات'),
    ('manage_passengers', 'إدارة الراكبات'),
    ('manage_settings', 'إدارة إعدادات المنصة')
    on conflict (key) do nothing;

    for perm_id in select id from public.admin_permissions loop
        insert into public.admin_role_permissions (role_id, permission_id)
        values (super_admin_role_id, perm_id)
        on conflict (role_id, permission_id) do nothing;
    end loop;
end
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- [0003_storage.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- سياسات RLS لتخزين أمانة (storage.objects)
-- تُنفَّذ في Supabase SQL Editor (بعد إنشاء الـ buckets).
-- اصطلاح المسارات: كل مستخدم يرفع ملفاته تحت مجلد باسم معرّفه: {auth.uid}/الملف
--   لذا (storage.foldername(name))[1] = معرّف المالك.
-- ملاحظة: مفتاح service_role (المستخدم في Server Actions بالإدارة) يتجاوز RLS دائمًا.
-- ============================================================

-- دالة مساعدة: هل المستخدم الحالي إداري؟
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ===== avatars: قراءة عامة، الكتابة/التعديل/الحذف لصاحب المجلد فقط =====
drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== kyc-documents: القراءة لصاحبه أو الإدارة؛ الكتابة لصاحبه؛ الحذف لصاحبه أو الإدارة =====
drop policy if exists "kyc_read_own_or_admin" on storage.objects;
create policy "kyc_read_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kyc-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "kyc_insert_own" on storage.objects;
create policy "kyc_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc_update_own" on storage.objects;
create policy "kyc_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc_delete_own_or_admin" on storage.objects;
create policy "kyc_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'kyc-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ===== admin-attachments: كل العمليات للإدارة فقط =====
drop policy if exists "admin_attach_all" on storage.objects;
create policy "admin_attach_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'admin-attachments' and public.is_admin())
  with check (bucket_id = 'admin-attachments' and public.is_admin());


-- ───────────────────────────────────────────────────────────────────────────
-- [0004_admin_status.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- Migration 0004: Add status to admin_users for invite system

alter table public.admin_users 
add column if not exists status text default 'active' check (status in ('pending', 'active'));

-- Also we might want to ensure profiles matches this logic, but admin_users is sufficient.
-- The user will be created via Supabase Auth Admin API (inviteUserByEmail)
-- and then we insert/update admin_users with status = 'pending'.


-- ───────────────────────────────────────────────────────────────────────────
-- [0005_seed_roles.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- Migration 0005: Seed Supervisor and Analyst Roles

do $$
declare
    supervisor_role_id uuid;
    analyst_role_id uuid;
    perm_id uuid;
begin
    -- 1. Create Supervisor Role (مشرف)
    insert into public.admin_roles (name, description, is_protected)
    values ('مشرف', 'متابعة الرحلات والسائقات ومراجعة طلبات KYC', false)
    on conflict (name) do nothing
    returning id into supervisor_role_id;

    -- If it already existed, fetch its ID
    if supervisor_role_id is null then
        select id into supervisor_role_id from public.admin_roles where name = 'مشرف';
    end if;

    -- 2. Create Analyst Role (محلل)
    insert into public.admin_roles (name, description, is_protected)
    values ('محلل', 'اطّلاع على التقارير ولوحات المؤشرات فقط', false)
    on conflict (name) do nothing
    returning id into analyst_role_id;

    if analyst_role_id is null then
        select id into analyst_role_id from public.admin_roles where name = 'محلل';
    end if;

    -- 3. Assign specific permissions to Supervisor
    -- Let's say supervisor gets manage_drivers and manage_passengers
    for perm_id in select id from public.admin_permissions where key in ('manage_drivers', 'manage_passengers') loop
        insert into public.admin_role_permissions (role_id, permission_id)
        values (supervisor_role_id, perm_id)
        on conflict (role_id, permission_id) do nothing;
    end loop;

    -- Analyst might get read-only permissions (we can add a 'view_reports' permission)
    insert into public.admin_permissions (key, description) values
    ('view_reports', 'عرض التقارير والإحصائيات')
    on conflict (key) do nothing;

    for perm_id in select id from public.admin_permissions where key = 'view_reports' loop
        insert into public.admin_role_permissions (role_id, permission_id)
        values (analyst_role_id, perm_id)
        on conflict (role_id, permission_id) do nothing;
        
        -- Also give super_admin this new permission
        insert into public.admin_role_permissions (role_id, permission_id)
        select id, perm_id from public.admin_roles where name = 'super_admin'
        on conflict (role_id, permission_id) do nothing;
    end loop;
end
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- [0006_storage_and_rls.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- Migration 0006: Storage, RLS, and Profiles Schema Updates

-- 1. Profiles Schema Update
alter table public.profiles rename column locale to preferred_language;
alter table public.profiles alter column preferred_language set default 'ar';

alter table public.profiles 
add column if not exists preferred_theme text not null default 'system' check (preferred_theme in ('light', 'dark', 'system'));

-- 2. Admin Tables RLS Policies (Allow users to read their own roles, and super_admins to read all)
create policy "Users can read their own admin record"
on public.admin_users for select
using ( auth.uid() = user_id );

-- We allow authenticated users to read roles and permissions to know what they can do
create policy "Authenticated users can read roles"
on public.admin_roles for select
to authenticated
using ( true );

create policy "Authenticated users can read permissions"
on public.admin_permissions for select
to authenticated
using ( true );

create policy "Authenticated users can read role_permissions"
on public.admin_role_permissions for select
to authenticated
using ( true );

-- 3. Storage Buckets & Policies
-- Create avatars bucket (Public)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Create kyc-documents bucket (Private)
insert into storage.buckets (id, name, public) 
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

-- Avatars RLS: Anyone can read, only owner can insert/update/delete their own folder
create policy "Avatar images are publicly accessible."
on storage.objects for select
using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar."
on storage.objects for insert
with check ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can update their own avatar."
on storage.objects for update
using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can delete their own avatar."
on storage.objects for delete
using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

-- KYC Documents RLS: Private, owner can read/write, super_admins/supervisors can read.
create policy "Users can upload their own kyc documents."
on storage.objects for insert
with check ( bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can read their own kyc documents."
on storage.objects for select
using ( bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can delete their own kyc documents."
on storage.objects for delete
using ( bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1] );

-- Allow admins with 'manage_drivers' permission (or super_admin) to read all kyc documents
create policy "Admins can read all kyc documents"
on storage.objects for select
using (
  bucket_id = 'kyc-documents' and
  exists (
    select 1 from public.admin_users au
    join public.admin_role_permissions arp on au.role_id = arp.role_id
    join public.admin_permissions ap on arp.permission_id = ap.id
    where au.user_id = auth.uid() and ap.key = 'manage_drivers'
  )
);


-- ───────────────────────────────────────────────────────────────────────────
-- [0007_user_type.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- =============================================================================
-- منصة أمانة — Migration 0007: نموذج user_type الثابت (RBAC مبسّط بأدوار ثابتة)
-- =============================================================================
-- الهدف: هوية الحساب تُحدَّد برمجيًا لحظة التسجيل حسب مصدره وتصبح غير قابلة
-- للتغيير نهائيًا (لا عبر واجهة ولا عبر طلب مباشر ولا service_role) — لإغلاق
-- ثغرة تصعيد الصلاحيات. الصلاحيات التفصيلية ثابتة في الكود عبر can() في
-- packages/shared-types (بلا جداول أدوار).
--
-- آمنة وتراكمية (idempotent): تُطبَّق فوق الأساس (0001+0002) دون تخريب.
-- نُبقي عمود role القديم كما هو (deprecated) لتفادي أي انحدار؛ لم يعد يُستخدم
-- في أي قرار صلاحية داخل الكود.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) تعداد user_type (5 قيم؛ يُوسَّع لاحقًا بإضافة قيمة هنا + can() + التسميات)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_type') then
    create type public.user_type as enum ('passenger', 'driver', 'super_admin', 'admin', 'support');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2) الأعمدة الجديدة على profiles
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists user_type public.user_type;
alter table public.profiles add column if not exists is_protected boolean not null default false;
alter table public.profiles add column if not exists is_active    boolean not null default true;
alter table public.profiles add column if not exists preferred_theme text not null default 'system'
  check (preferred_theme in ('light', 'dark', 'system'));
-- preferred_language: بديل locale الحديث (نُبقي locale كما هو للتوافق)
alter table public.profiles add column if not exists preferred_language text not null default 'ar'
  check (preferred_language in ('ar', 'en'));

-- تعبئة user_type للبيانات الموجودة من role القديم
update public.profiles
set user_type = case
  when role::text = 'admin'  then 'admin'::public.user_type
  when role::text = 'driver' then 'driver'::public.user_type
  else 'passenger'::public.user_type
end
where user_type is null;

-- مزامنة preferred_language من locale الموجود (مرة واحدة)
update public.profiles set preferred_language = locale
where locale in ('ar', 'en');

alter table public.profiles alter column user_type set default 'passenger';
alter table public.profiles alter column user_type set not null;

-- -----------------------------------------------------------------------------
-- 3) تثبيت المدير الرئيسي كـ super_admin محمي — يُنفَّذ قبل إنشاء الـ trigger
--    (وإلا منَع الـ trigger تغيير user_type لاحقًا)
-- -----------------------------------------------------------------------------
update public.profiles
set user_type = 'super_admin', is_protected = true
where id in (select id from auth.users where email = 'nuwate369@gmail.com');

-- -----------------------------------------------------------------------------
-- 4) مُشغّل الحماية: يمنع تغيير user_type بعد الإنشاء + يحمي صفوف is_protected
--    (SECURITY DEFINER؛ service_role يتجاوز RLS لكنه لا يتجاوز triggers)
-- -----------------------------------------------------------------------------
create or replace function public.enforce_profile_guards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_type is distinct from old.user_type then
      raise exception 'IMMUTABLE_USER_TYPE: لا يُسمح بتغيير نوع الحساب بعد إنشائه — مرفوض أمنيًا'
        using errcode = 'P0001';
    end if;
    if old.is_protected = true and new.is_protected = true then
      -- يُسمح بتعديل الحقول العادية للحساب المحمي لصاحبه، لكن لا حذف/تعطيل:
      if new.is_active = false and old.is_active = true then
        raise exception 'PROTECTED_PROFILE: لا يمكن تعطيل حساب محمي' using errcode = 'P0002';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.is_protected = true then
      raise exception 'PROTECTED_PROFILE: لا يمكن حذف حساب محمي' using errcode = 'P0002';
    end if;
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_enforce_profile_guards on public.profiles;
create trigger trg_enforce_profile_guards
  before update or delete on public.profiles
  for each row execute function public.enforce_profile_guards();

-- -----------------------------------------------------------------------------
-- 5) تحديث handle_new_user: يضبط user_type من الميتاداتا (القيم غير المعروفة
--    تصبح passenger — الأكثر أمانًا). role يبقى على قيمته الافتراضية (deprecated).
--    passenger app → 'passenger' | driver app → 'driver' | دعوة الإدارة → admin/support/super_admin
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw  text := new.raw_user_meta_data ->> 'user_type';
  v_type public.user_type := case
    when v_raw in ('passenger', 'driver', 'super_admin', 'admin', 'support') then v_raw::public.user_type
    else 'passenger'::public.user_type
  end;
begin
  insert into public.profiles (id, full_name, user_type)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_type)
  on conflict (id) do update set full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6) فهارس
-- -----------------------------------------------------------------------------
create index if not exists idx_profiles_user_type on public.profiles (user_type);
create index if not exists idx_profiles_protected on public.profiles (is_protected) where is_protected = true;

-- -----------------------------------------------------------------------------
-- 7) التخزين: buckets + سياسات (قراءة KYC للموظفين عبر user_type — بلا جداول RBAC)
--    idempotent: البكتات موجودة أصلًا؛ ندرج بأمان ونعيد بناء السياسات.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('kyc-documents', 'kyc-documents', false)
  on conflict (id) do nothing;

drop policy if exists "avatars_read_public"  on storage.objects;
drop policy if exists "avatars_write_own"    on storage.objects;
drop policy if exists "kyc_rw_own"           on storage.objects;
drop policy if exists "kyc_read_staff"       on storage.objects;

create policy "avatars_read_public" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_write_own" on storage.objects
  for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "kyc_rw_own" on storage.objects
  for all
  using (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "kyc_read_staff" on storage.objects
  for select using (
    bucket_id = 'kyc-documents'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
  );

-- =============================================================================
-- ملاحظات:
-- - nuwate369@gmail.com الآن: user_type='super_admin', is_protected=true (لا يُحذف/يُعطّل).
-- - أي محاولة لتغيير user_type لأي حساب تُرفض بالـ trigger حتى من service_role.
-- - عمود role باقٍ (deprecated) للتوافق فقط؛ لا يُقرأ في أي قرار صلاحية.
-- - الهجرات 0003–0006 (نظام admin_roles القديم) ملغاة ولا تُطبَّق — راجع PROJECT_MAP.md.
-- =============================================================================


-- ───────────────────────────────────────────────────────────────────────────
-- [0008_system_notifications.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0008_system_notifications.sql
-- نظام الإشعارات الداخلي لفريق الإدارة
-- ============================================================

-- ===== 1. جدول system_notifications =====

create table if not exists public.system_notifications (
  id                 uuid primary key default gen_random_uuid(),
  type               text        not null,
  title_ar           text        not null,
  title_en           text        not null,
  body_ar            text,
  body_en            text,
  related_entity_type text,
  related_entity_id  uuid,
  target_user_id     uuid references public.profiles(id) on delete cascade,
  is_read            boolean     not null default false,
  created_at         timestamptz not null default now()
);

-- فهرس لتسريع جلب الإشعارات غير المقروءة لكل مستخدم
create index if not exists idx_system_notifications_lookup
  on public.system_notifications (target_user_id, is_read, created_at desc);

-- فهرس إضافي للإشعارات العامة (target_user_id IS NULL)
create index if not exists idx_system_notifications_global
  on public.system_notifications (is_read, created_at desc)
  where target_user_id is null;

-- تفعيل RLS
alter table public.system_notifications enable row level security;

-- ===== 2. سياسات RLS =====

-- قراءة: فقط الموظفون (platform_staff) يقرأون
-- كل موظف يرى: إشعاراته الخاصة + الإشعارات العامة (target_user_id = NULL)
drop policy if exists system_notifications_select_staff on public.system_notifications;
create policy system_notifications_select_staff
  on public.system_notifications for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
    and (
      target_user_id = auth.uid()
      or target_user_id is null
    )
  );

-- تحديث is_read: فقط صاحب الإشعار (أو أي موظف إذا كان عاماً)
drop policy if exists system_notifications_update_read on public.system_notifications;
create policy system_notifications_update_read
  on public.system_notifications for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
    and (
      target_user_id = auth.uid()
      or target_user_id is null
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
  );

-- حذف: فقط صاحب الإشعار (للقائمة العامة: أي موظف)
drop policy if exists system_notifications_delete_staff on public.system_notifications;
create policy system_notifications_delete_staff
  on public.system_notifications for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('super_admin', 'admin', 'support')
    )
    and (
      target_user_id = auth.uid()
      or target_user_id is null
    )
  );

-- الإدراج: فقط عبر service_role أو Triggers (لا يسمح لأي مستخدم عادي)
-- لا يوجد INSERT policy — يعني فقط service_role يمكنه الإدراج

-- ===== 3. دالة مساعدة: التحقق من نوع المستخدم =====

create or replace function public.is_staff_user(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = uid and user_type in ('super_admin', 'admin', 'support')
  );
$$;

-- ===== 4. Triggers التلقائية =====

-- 4a. عند إدراج سائقة جديدة (pending) → إشعار عام
create or replace function public.notify_new_driver_registered()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select full_name into v_name from public.profiles where id = new.id;
  v_name := coalesce(v_name, 'غير معروفة');

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'new_driver_registered',
    'تم تسجيل سائقة جديدة: ' || v_name,
    'New driver registered: ' || v_name,
    'سائقة جديدة (' || v_name || ') قامت بالتسجيل وحالتها: معلّق.',
    'A new driver (' || v_name || ') has registered. Status: pending.',
    'driver',
    new.id,
    null
  );
  return new;
end;
$$;

drop trigger if exists trigger_new_driver_registered on public.drivers;
create trigger trigger_new_driver_registered
  after insert on public.drivers
  for each row execute function public.notify_new_driver_registered();

-- 4b. عند إنشاء رحلة جديدة → إشعار عام (قابل للتعطيل لاحقاً)
create or replace function public.notify_new_ride_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_passenger_name text;
begin
  select full_name into v_passenger_name from public.profiles where id = new.passenger_id;
  v_passenger_name := coalesce(v_passenger_name, 'ركّابة');

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'new_ride_created',
    'رحلة جديدة: ' || v_passenger_name,
    'New ride: ' || v_passenger_name,
    'رحلة جديدة طلبها ' || v_passenger_name || ' من ' || coalesce(new.pickup_address, 'موقع غير محدد') || ' إلى ' || coalesce(new.dropoff_address, 'موقع غير محدد') || '.',
    'New ride requested by ' || v_passenger_name || ' from ' || coalesce(new.pickup_address, 'unknown') || ' to ' || coalesce(new.dropoff_address, 'unknown') || '.',
    'ride',
    new.id,
    null
  );
  return new;
end;
$$;

drop trigger if exists trigger_new_ride_created on public.rides;
create trigger trigger_new_ride_created
  after insert on public.rides
  for each row execute function public.notify_new_ride_created();

-- 4c. عند قبول دعوة موظف جديد وتفعيل حسابه → إشعار عام
create or replace function public.notify_new_staff_joined()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  -- فقط عند إنشاء حساب موظف جديد (ليس راكبة أو سائقة)
  if new.user_type in ('super_admin', 'admin', 'support') then
    select full_name into v_name from public.profiles where id = new.id;
    v_name := coalesce(v_name, 'موظف جديد');

    insert into public.system_notifications (
      type, title_ar, title_en, body_ar, body_en,
      related_entity_type, related_entity_id, target_user_id
    ) values (
      'new_staff_joined',
      'انضم موظف جديد: ' || v_name,
      'New staff joined: ' || v_name,
      'الموظف ' || v_name || ' (' || new.user_type || ') انضم لفريق الإدارة.',
      'Staff member ' || v_name || ' (' || new.user_type || ') has joined the admin team.',
      'staff',
      new.id,
      null
    );
  end if;
  return new;
end;
$$;

-- نستخدم AFTER INSERT على auth.users مع فحص نوع المستخدم
-- لكن trigger على profiles أكثر موثوقية لأنه يحتوي user_type
drop trigger if exists trigger_new_staff_joined on public.profiles;
create trigger trigger_new_staff_joined
  after insert on public.profiles
  for each row execute function public.notify_new_staff_joined();

-- 4d. عند اقتراب انتهاء صلاحية مستند KYC ( إن وُجد حقل تاريخ الانتهاء)
-- ملاحظة: لا يوجد حقل تاريخ انتهاء في جدول drivers الحالي
-- سندعمه عند إضافة الحقل لاحقاً via function يدوية
-- يمكنك استدعاء add_document_expiring_notification() يدوياً أو عبر Cron

create or replace function public.add_document_expiring_notification(
  p_driver_id uuid,
  p_days_left int default 7
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select full_name into v_name from public.profiles where id = p_driver_id;
  v_name := coalesce(v_name, 'سائقة');

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'driver_document_expiring',
    'مستندات السائقة ' || v_name || ' تنتهي خلال ' || p_days_left || ' يوم',
    'Driver documents expiring in ' || p_days_left || ' days: ' || v_name,
    'تنبيه: مستندات KYC للسائقة ' || v_name || ' ستنتهي الصلاحية خلال ' || p_days_left || ' يوم. يرجى المتابعة.',
    'Warning: KYC documents for driver ' || v_name || ' will expire in ' || p_days_left || ' days. Please follow up.',
    'driver',
    p_driver_id,
    null
  );
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- [0009_fix_profiles_schema.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 009_fix_profiles_schema.sql
-- إصلاح عدم تطابق المخطط: role → user_type + إضافة الأعمدة المفقودة
-- تشغيل: نسخ هذا الكود في Supabase SQL Editor ثم تشغيله
-- ============================================================

-- 1. إنشاء enum user_type إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM (
      'passenger', 'driver', 'super_admin', 'admin', 'support'
    );
  END IF;
END
$$;

-- 2. إضافة عمود user_type إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_type user_type NOT NULL DEFAULT 'passenger';
  END IF;
END
$$;

-- 3. نسخ البيانات من role → user_type
UPDATE public.profiles
SET user_type = role::user_type
WHERE role IN ('passenger', 'driver', 'admin', 'support', 'super_admin');

-- للحسابات التي role = 'admin' نُحوّلها إلى admin
UPDATE public.profiles
SET user_type = 'admin'::user_type
WHERE role = 'admin';

-- 4. إضافة الأعمدة المفقودة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_protected boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_language text NOT NULL DEFAULT 'ar'
      CHECK (preferred_language IN ('ar', 'en'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_theme'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_theme text NOT NULL DEFAULT 'system'
      CHECK (preferred_theme IN ('light', 'dark', 'system'));
  END IF;
END
$$;

-- 5. تحديث preferred_language من locale القديم (إن وُجد)
UPDATE public.profiles
SET preferred_language = locale
WHERE locale IN ('ar', 'en') AND preferred_language = 'ar';

-- 6. حماية حساب nuwate369 (super_admin)
UPDATE public.profiles
SET user_type = 'super_admin'::user_type, is_protected = true
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- 7. إصلاح khututaltijarah (يجب أن يكون admin وليس passenger)
UPDATE public.profiles
SET user_type = 'admin'::user_type
WHERE id = 'cfd5630a-62dc-4535-b167-d68a83b514be';

-- 8. إنشاء/تحديث الحماية + الملف الشخصي لـ nuwate369 في auth
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"user_type": "super_admin", "full_name": "مسؤول أمانة"}'::jsonb
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

UPDATE public.profiles
SET full_name = 'مسؤول أمانة', is_protected = true
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- 9. حذف وإعادة إنشاء trigger handle_new_user بالشكل الصحيح
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_type user_type;
  v_raw_type  text;
BEGIN
  v_raw_type := new.raw_user_meta_data ->> 'user_type';
  v_user_type := CASE
    WHEN v_raw_type IN ('passenger', 'driver', 'super_admin', 'admin', 'support')
      THEN v_raw_type::user_type
    ELSE 'passenger'::user_type
  END;

  INSERT INTO public.profiles (id, user_type, full_name, is_protected)
  VALUES (
    new.id,
    v_user_type,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. حذف trigger immutable_user_type القديم وإعادة إنشائه
DROP TRIGGER IF EXISTS trigger_immutable_user_type ON public.profiles;

CREATE OR REPLACE FUNCTION public.enforce_immutable_user_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF new.user_type <> old.user_type THEN
      RAISE EXCEPTION 'IMMUTABLE_USER_TYPE: لا يمكن تغيير نوع المستخدم بعد الإنشاء.'
        USING errcode = 'P0001';
    END IF;
    IF old.is_protected = true THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.'
        USING errcode = 'P0002';
    END IF;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER trigger_immutable_user_type
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_immutable_user_type();

-- 11. تحديث RLS — السماح للـ service_role بالقراءة الكاملة
-- (service_role يتجاوز RLS تلقائياً، لكن نضيف policy للمصادقة العادية)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- policy للمصادقة العادية: السماح بقراءة أي ملف تعريف (للعرض العام)
DROP POLICY IF EXISTS profiles_select_any ON public.profiles;
CREATE POLICY profiles_select_any
  ON public.profiles FOR SELECT
  USING (true);

-- 12. نتائج الفحص النهائي
SELECT id, user_type, full_name, is_protected, created_at
FROM public.profiles
WHERE user_type IN ('super_admin', 'admin', 'support')
ORDER BY created_at DESC;


-- ───────────────────────────────────────────────────────────────────────────
-- [0010_reconcile_live_schema.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0010_reconcile_live_schema.sql
-- مزامنة رسمية: يعكس حالة قاعدة البيانات الحية الدقيقة
-- بتاريخ 2026-07-13 بعد الإصلاحات اليدوية.
-- يمكن تطبيقه على قاعدة نظيفة للحصول على نفس الحالة بالضبط.
-- ============================================================

-- ===== الأنواع (Enums) =====

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('passenger', 'driver', 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status') THEN
    CREATE TYPE driver_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status') THEN
    CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

-- ===== جدول profiles =====

CREATE TABLE IF NOT EXISTS public.profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               user_role   NOT NULL DEFAULT 'passenger',
  full_name          text,
  phone              text,
  locale             text        NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar', 'en')),
  avatar_url         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول drivers =====

CREATE TABLE IF NOT EXISTS public.drivers (
  id                       uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                   driver_status NOT NULL DEFAULT 'pending',
  national_id_url          text,
  license_url              text,
  vehicle_registration_url text,
  vehicle_make             text,
  vehicle_model            text,
  vehicle_plate            text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول rides =====

CREATE TABLE IF NOT EXISTS public.rides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id        uuid REFERENCES public.profiles(id),
  status           ride_status NOT NULL DEFAULT 'requested',
  pickup_lat       double precision,
  pickup_lng       double precision,
  pickup_address   text,
  dropoff_lat      double precision,
  dropoff_lng      double precision,
  dropoff_address  text,
  price_estimate   numeric,
  price_final      numeric,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول ratings =====

CREATE TABLE IF NOT EXISTS public.ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id    uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_id   uuid NOT NULL REFERENCES public.profiles(id),
  ratee_id   uuid NOT NULL REFERENCES public.profiles(id),
  stars      int  NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول groups =====

CREATE TABLE IF NOT EXISTS public.groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== جدول group_members =====

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id   uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, member_id)
);

-- ===== Triggers: updated_at =====

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_drivers_updated_at ON public.drivers;
CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_rides_updated_at ON public.rides;
CREATE TRIGGER set_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Trigger: handle_new_user =====

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(
    new.raw_user_meta_data ->> 'user_type',
    new.raw_user_meta_data ->> 'role',
    'passenger'
  );
  -- خريطة user_type → user_role
  v_role := CASE
    WHEN v_role IN ('super_admin', 'admin') THEN 'admin'
    WHEN v_role IN ('passenger', 'driver')  THEN v_role
    ELSE 'passenger'
  END;

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    v_role::user_role,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  -- إنشاء صف driver إذا كان النوع driver
  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (id, status)
    VALUES (new.id, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS Policies =====

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- drivers
DROP POLICY IF EXISTS drivers_select_own ON public.drivers;
CREATE POLICY drivers_select_own ON public.drivers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS drivers_update_own ON public.drivers;
CREATE POLICY drivers_update_own ON public.drivers FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- rides
DROP POLICY IF EXISTS rides_select_participant ON public.rides;
CREATE POLICY rides_select_participant ON public.rides FOR SELECT
  USING (passenger_id = auth.uid() OR driver_id = auth.uid());

-- ratings
DROP POLICY IF EXISTS ratings_select_any ON public.ratings;
CREATE POLICY ratings_select_any ON public.ratings FOR SELECT
  USING (true);

-- groups
DROP POLICY IF EXISTS groups_select_any ON public.groups;
CREATE POLICY groups_select_any ON public.groups FOR SELECT
  USING (true);

-- group_members
DROP POLICY IF EXISTS group_members_select_any ON public.group_members;
CREATE POLICY group_members_select_any ON public.group_members FOR SELECT
  USING (true);

-- ===== بيانات حية: nuwate369 admin =====
-- (يتم إنشاؤه تلقائياً عبر inviteUserByEmail + trigger)
-- القيم الحالية في قاعدة البيانات:
--   profiles: 4acfc35f → role=admin, full_name='مسؤول أمانة'
--   profiles: cfd5630a → role=admin, full_name='موظف جديد'
--   drivers: 63f83b19=approved, 92df4b07=pending, 73398093=approved
--   rides: فارغ
--   groups: فارغ

-- ============================================================
-- أعمدة جديدة مطلوبة لإدارة فريق العمل (Staff Management)
-- تُضاف الآن لأنها مطلوبة للميزات الجديدة
-- ============================================================

-- is_protected: حماية الحسابات الحساسة من الحذف/التعديل
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_protected boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- تطبيق الحماية على الحسابات الحساسة
UPDATE public.profiles SET is_protected = true
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';  -- nuwate369

-- ===== تحويل role → user_type (التوحيد مع الكود) =====
-- إضافة enum user_type الجديد إذا لم يكن موجوداً
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('passenger', 'driver', 'super_admin', 'admin', 'support');
  END IF;
END $$;

-- إضافة عمود user_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_type user_type NOT NULL DEFAULT 'passenger';
  END IF;
END $$;

-- مزامنة البيانات: role → user_type
UPDATE public.profiles
SET user_type = CASE role
  WHEN 'admin'   THEN 'admin'::user_type
  WHEN 'driver'  THEN 'driver'::user_type
  WHEN 'passenger' THEN 'passenger'::user_type
  ELSE 'passenger'::user_type
END;

-- nuwate369 = super_admin
UPDATE public.profiles
SET user_type = 'super_admin'::user_type
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- ===== حماية الحسابات المحمية من التعديل =====
CREATE OR REPLACE FUNCTION public.enforce_immutable_user_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF new.user_type <> old.user_type THEN
      RAISE EXCEPTION 'IMMUTABLE_USER_TYPE: لا يمكن تغيير نوع المستخدم بعد الإنشاء.'
        USING errcode = 'P0001';
    END IF;
    IF old.is_protected = true THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.'
        USING errcode = 'P0002';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trigger_immutable_user_type ON public.profiles;
CREATE TRIGGER trigger_immutable_user_type
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_immutable_user_type();


-- ───────────────────────────────────────────────────────────────────────────
-- [0011_add_staff_management_columns.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0011_add_staff_management_columns.sql
-- أعمدة جديدة مطلوبة لإدارة فريق العمل
-- تشغيل: SQL Editor في Supabase Dashboard
-- ============================================================

-- 1. is_protected: حماية الحسابات الحساسة
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_protected boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. is_active: تبديل تنشيط/تعطيل الحساب
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 3. تطبيق الحماية على الحسابات الحساسة
UPDATE public.profiles SET is_protected = true
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- 4. تحديث handle_new_user ليكتب user_type من metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(
    new.raw_user_meta_data ->> 'user_type',
    new.raw_user_meta_data ->> 'role',
    'passenger'
  );
  v_role := CASE
    WHEN v_role IN ('super_admin', 'admin') THEN 'admin'
    WHEN v_role IN ('passenger', 'driver')  THEN v_role
    ELSE 'passenger'
  END;

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    v_role::user_role,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (id, status) VALUES (new.id, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- 5. حماية على مستوى القاعدة: رفض الحذف والتعديل على الحسابات المحمية
-- هذا خط الدفاع الأخير — يمنع أي عملية حذف/تعديل على صفوف is_protected = true
-- بغض النظر عن مصدر الطلب (service_role أو أي شيء آخر)

CREATE OR REPLACE FUNCTION public.protect_protected_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'Account is protected and cannot be modified or deleted.';
  END IF;
  RETURN OLD;
END;
$$;

-- منع الحذف على الحسابات المحمية
DROP TRIGGER IF EXISTS trg_protect_protected_profiles ON public.profiles;
CREATE TRIGGER trg_protect_protected_profiles
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_protected_profiles();

-- منع التعديل على الحسابات المحمية (الاسم، النوع، is_active — لا شيء يمكن تغييره)
CREATE OR REPLACE FUNCTION public.prevent_protected_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'Account is protected and cannot be modified or deleted.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_protected_update ON public.profiles;
CREATE TRIGGER trg_prevent_protected_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_protected_update();

-- 6. التحقق النهائي
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;


-- ───────────────────────────────────────────────────────────────────────────
-- [0012_add_trusted_devices.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0012_add_trusted_devices.sql
-- جدول الأجهزة الموثوقة + جدول MFA factors
-- تشغيل: SQL Editor في Supabase Dashboard
-- ============================================================

-- 1. جدول الأجهزة الموثوقة
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  browser text,
  os text,
  ip_address text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- فهرس لجلب أجهزة مستخدم بسرعة
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);

-- RLS: كل مستخدم يرى أجهزته فقط
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own devices"
  ON public.trusted_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own devices"
  ON public.trusted_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own devices"
  ON public.trusted_devices FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own devices"
  ON public.trusted_devices FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. دالة لحذف كل أجهزة مستخدم معين (لتسجيل الخروج من كل الأجهزة)
CREATE OR REPLACE FUNCTION public.logout_all_devices(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.trusted_devices WHERE user_id = p_user_id;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- [0013_ban_and_audit.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0013_ban_and_audit.sql
-- منصة أمانة — حظر المستخدمين (سبب + مَن نفّذ) + سجل الحركات (Audit Log)
--
-- مكتفٍ ذاتيًا (self-contained) وتراكمي (idempotent): يعمل على القاعدة الحيّة
-- في حالتها الأساسية (عمود role فقط، بلا user_type). يضيف كل ما تحتاجه الميزة:
--   user_type + is_protected + is_active + أعمدة الحظر + مُشغّلات الحماية +
--   جدول audit_logs + إصلاح handle_new_user.
--
-- يُطبَّق يدويًا: Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) نوع user_type (إن لم يوجد)
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_type') then
    create type public.user_type as enum ('passenger', 'driver', 'super_admin', 'admin', 'support');
  end if;
end
$$;

-- ------------------------------------------------------------
-- 2) الأعمدة على profiles (نضيفها قبل التعبئة)
-- ------------------------------------------------------------
alter table public.profiles add column if not exists user_type    public.user_type;      -- تُملأ ثم تُثبّت not null
alter table public.profiles add column if not exists is_protected boolean not null default false;
alter table public.profiles add column if not exists is_active    boolean not null default true;
-- أعمدة الحظر (نعيد استخدام is_active=false = محظور، + هذا السياق)
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_by  uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists banned_at  timestamptz;

-- ------------------------------------------------------------
-- 3) تعبئة user_type — نُفضّل الميتاداتا (تسترجع نوع الموظف الصحيح مثل support
--    الذي قد يظهر role=passenger)، ثم role القديم كخطة بديلة.
-- ------------------------------------------------------------
update public.profiles p
set user_type = (case
    when m.v in ('passenger', 'driver', 'super_admin', 'admin', 'support') then m.v
    when p.role::text = 'admin'  then 'admin'
    when p.role::text = 'driver' then 'driver'
    else 'passenger'
  end)::public.user_type
from (
  select u.id, coalesce(u.raw_user_meta_data ->> 'user_type', u.raw_user_meta_data ->> 'role') as v
  from auth.users u
) m
where m.id = p.id and p.user_type is null;

-- أي صف بلا حساب auth مطابق (نادر) → من role
update public.profiles
set user_type = case
    when role::text = 'admin'  then 'admin'::public.user_type
    when role::text = 'driver' then 'driver'::public.user_type
    else 'passenger'::public.user_type
  end
where user_type is null;

-- ------------------------------------------------------------
-- 4) تثبيت المدير الرئيسي super_admin محمي — قبل إنشاء مُشغّل الحماية
-- ------------------------------------------------------------
update public.profiles
set user_type = 'super_admin', is_protected = true
where id in (select id from auth.users where email = 'nuwate369@gmail.com');

-- تثبيت العمود بعد التعبئة
alter table public.profiles alter column user_type set default 'passenger';
alter table public.profiles alter column user_type set not null;

-- ------------------------------------------------------------
-- 5) مُشغّل الحماية: user_type غير قابل للتغيير + الحسابات المحمية لا تُعدّل/تُحذف
-- ------------------------------------------------------------
create or replace function public.enforce_immutable_user_type()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_type <> old.user_type then
      raise exception 'IMMUTABLE_USER_TYPE: لا يُسمح بتغيير نوع الحساب بعد إنشائه.'
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

-- ------------------------------------------------------------
-- 6) إصلاح handle_new_user: يكتب role + user_type من الميتاداتا،
--    ويُنشئ صف السائقة تلقائيًا. (الإصدار الحيّ كان يكتب role فقط.)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_raw  text := coalesce(new.raw_user_meta_data ->> 'user_type', new.raw_user_meta_data ->> 'role', 'passenger');
  v_type public.user_type := case
    when v_raw in ('passenger', 'driver', 'super_admin', 'admin', 'support') then v_raw::public.user_type
    else 'passenger'::public.user_type
  end;
  v_role public.user_role := (case
    when v_type in ('super_admin', 'admin', 'support') then 'admin'
    when v_type = 'driver' then 'driver'
    else 'passenger'
  end)::public.user_role;
begin
  insert into public.profiles (id, role, user_type, full_name)
  values (new.id, v_role, v_type, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do update set full_name = coalesce(excluded.full_name, public.profiles.full_name);

  if v_type = 'driver' then
    insert into public.drivers (id, status) values (new.id, 'pending')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 7) فهارس profiles
-- ------------------------------------------------------------
create index if not exists idx_profiles_user_type    on public.profiles (user_type);
create index if not exists idx_profiles_is_protected on public.profiles (is_protected) where is_protected = true;
create index if not exists idx_profiles_is_active    on public.profiles (is_active) where is_active = false;

-- ------------------------------------------------------------
-- 8) جدول سجل الحركات audit_logs — لقطة ثابتة للمنفِّذ والهدف والوقت
-- ------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text,
  actor_type  public.user_type,
  action      text not null,          -- ban_user | unban_user | approve_driver | reject_driver | ...
  target_type text,                   -- profile | driver | ride | ...
  target_id   uuid,
  target_name text,
  reason      text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_actor   on public.audit_logs (actor_id);
create index if not exists idx_audit_logs_target  on public.audit_logs (target_id);
create index if not exists idx_audit_logs_action  on public.audit_logs (action);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_staff on public.audit_logs;
create policy audit_logs_select_staff on public.audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
  );

-- ============================================================
-- ملاحظات:
-- - الحظر: is_active=false + ban_reason + banned_by + banned_at. رفع الحظر
--   يعيد is_active=true ويصفّر الأعمدة الثلاثة.
-- - الحسابات المحمية (is_protected) لا تُحظر — يمنعها المُشغّل أعلاه.
-- - الكتابة في audit_logs عبر service_role (يتجاوز RLS) من الإجراءات الخادمية.
-- ============================================================


-- ───────────────────────────────────────────────────────────────────────────
-- [0014_rating_questions.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0014_rating_questions.sql
-- منصة أمانة — نظام أسئلة التقييم المُدار من لوحة الإدارة
--
-- rating_questions: أسئلة يديرها المسؤول؛ لكل سؤال «وجهة»:
--   target='driver'    → سؤال لتقييم السائقة (يظهر في تطبيق الراكبة)
--   target='passenger' → سؤال لتقييم الراكبة (يظهر في تطبيق السائقة)
-- rating_answers: إجابة (نجوم ١–٥) لكل سؤال ضمن تقييم ratings موجود.
--
-- تراكمي (idempotent). يُطبَّق يدويًا: Supabase SQL Editor → Run.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) جدول الأسئلة
-- ------------------------------------------------------------
create table if not exists public.rating_questions (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  target     text not null check (target in ('driver', 'passenger')),
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- فريد على (السؤال + الوجهة) ليكون إدراج الافتراضيات idempotent
create unique index if not exists uq_rating_questions_question_target
  on public.rating_questions (question, target);

drop trigger if exists set_rating_questions_updated_at on public.rating_questions;
create trigger set_rating_questions_updated_at
  before update on public.rating_questions
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2) جدول الإجابات (إجابة لكل سؤال ضمن تقييم واحد)
-- ------------------------------------------------------------
create table if not exists public.rating_answers (
  id          uuid primary key default gen_random_uuid(),
  rating_id   uuid not null references public.ratings(id) on delete cascade,
  question_id uuid not null references public.rating_questions(id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (rating_id, question_id)
);

create index if not exists idx_rating_answers_rating   on public.rating_answers (rating_id);
create index if not exists idx_rating_answers_question on public.rating_answers (question_id);

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------
alter table public.rating_questions enable row level security;
alter table public.rating_answers   enable row level security;

-- الأسئلة: قراءة للجميع المسجّلين (التطبيقات تعرض الأسئلة النشطة)؛
-- الكتابة عبر service_role فقط (لوحة الإدارة).
drop policy if exists rating_questions_select_all on public.rating_questions;
create policy rating_questions_select_all on public.rating_questions
  for select using (true);

-- الإجابات: القراءة لأطراف التقييم والموظفين؛ الإدراج لصاحب التقييم فقط.
drop policy if exists rating_answers_select_involved on public.rating_answers;
create policy rating_answers_select_involved on public.rating_answers
  for select using (
    exists (
      select 1 from public.ratings r
      where r.id = rating_answers.rating_id
        and (r.rater_id = auth.uid() or r.ratee_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
  );

drop policy if exists rating_answers_insert_rater on public.rating_answers;
create policy rating_answers_insert_rater on public.rating_answers
  for insert with check (
    exists (
      select 1 from public.ratings r
      where r.id = rating_answers.rating_id and r.rater_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4) الأسئلة الافتراضية (idempotent عبر القيد الفريد)
-- ------------------------------------------------------------
insert into public.rating_questions (question, target, sort_order) values
  ('نظافة المركبة',            'driver',    1),
  ('القيادة الآمنة',           'driver',    2),
  ('الالتزام بالموعد',         'driver',    3),
  ('حسن التعامل واللباقة',     'driver',    4),
  ('حسن التعامل',              'passenger', 1),
  ('الالتزام بموعد الانطلاق',  'passenger', 2),
  ('دقة موقع الالتقاط',        'passenger', 3)
on conflict (question, target) do nothing;

-- ============================================================
-- ملاحظات:
-- - التقييم الإجمالي يبقى في ratings.stars؛ الإجابات التفصيلية في rating_answers.
-- - إدارة الأسئلة من لوحة الإدارة (/ratings) عبر service_role + تسجيل audit_logs.
-- ============================================================


-- ───────────────────────────────────────────────────────────────────────────
-- [0015_allow_staff_role_change.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0015_allow_staff_role_change.sql
-- منصة أمانة — السماح بتغيير دور الموظف من لوحة الإدارة
--
-- يستبدل مُشغّل الحماية enforce_immutable_user_type بنسخة تسمح بتغيير
-- user_type **بين أدوار الموظفين فقط** (super_admin/admin/support)
-- و**عبر مفتاح الخادم (service_role) فقط** — أي من لوحة الإدارة حصريًا.
--
-- يبقى ممنوعًا (سدًّا لثغرة تصعيد الصلاحيات):
--   - تحويل راكبة/سائقة إلى موظف أو العكس.
--   - أي تغيير دور من جلسة مستخدم عادية (authenticated/anon) حتى لحسابه.
--   - أي تعديل/حذف على الحسابات المحمية (is_protected).
--
-- تراكمي (idempotent). يُطبَّق يدويًا: Supabase SQL Editor → Run.
-- ============================================================

create or replace function public.enforce_immutable_user_type()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_staff constant text[] := array['super_admin', 'admin', 'support'];
  -- دور الطلب من JWT: 'service_role' لمفتاح الخادم، 'authenticated' لجلسات
  -- المستخدمين، NULL للتنفيذ اليدوي في SQL Editor.
  v_req_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  if tg_op = 'UPDATE' then
    if new.user_type <> old.user_type then
      -- (١) التغيير مسموح بين أدوار الموظفين فقط
      if not (old.user_type::text = any(v_staff) and new.user_type::text = any(v_staff)) then
        raise exception 'IMMUTABLE_USER_TYPE: لا يُسمح بتغيير نوع الحساب إلا بين أدوار الموظفين.'
          using errcode = 'P0001';
      end if;
      -- (٢) وعبر مفتاح الخادم فقط (أو يدويًا من SQL Editor)
      if v_req_role is not null and v_req_role <> 'service_role' then
        raise exception 'IMMUTABLE_USER_TYPE: تغيير الدور متاح من لوحة الإدارة فقط.'
          using errcode = 'P0001';
      end if;
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


-- ───────────────────────────────────────────────────────────────────────────
-- [0016_user_status_and_notification_settings.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0016_user_status_and_notification_settings.sql
-- نظام إدارة حالة المستخدم + إعدادات التنبيهات
-- تشغيل: SQL Editor في Supabase Dashboard
-- ============================================================

-- ===== 1. ENUM: user_status =====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE public.user_status AS ENUM (
      'pending_approval',
      'pending_invite',
      'active',
      'suspended',
      'disabled'
    );
  END IF;
END $$;

-- ===== 2. عمود status في profiles =====
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN status public.user_status NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- ===== 3. فهرس =====
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- ===== 4. تعليق كل Triggers التي تمنع التعديل على الحسابات المحمية =====
-- مؤقتاً حتى نتمكن من تحديث الحسابات الحالية
DROP TRIGGER IF EXISTS trg_prevent_protected_update ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_protected_profiles ON public.profiles;
DROP TRIGGER IF EXISTS trigger_immutable_user_type ON public.profiles;

-- ===== 5. تحديث الحسابات الحالية =====
UPDATE public.profiles SET status = 'active'
WHERE status IS NULL OR status = 'active';

-- الحسابات المحمية تكون دائماً active
UPDATE public.profiles SET status = 'active'
WHERE id = '4acfc35f-a2e1-4da5-bab4-df5e42f2adad';

-- ===== 6. إعادة إنشاء Triggers الحماية =====
CREATE OR REPLACE FUNCTION public.protect_protected_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_protect_protected_profiles
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_protected_profiles();

CREATE OR REPLACE FUNCTION public.prevent_protected_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_protected_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_protected_update();

-- إعادة إنشاء trigger حماية الدور (من الهجرة 0015)
CREATE OR REPLACE FUNCTION public.enforce_immutable_user_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'immutable_user_type: دور المستخدم لا يمكن تغييره بعد الإنشاء.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_immutable_user_type
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_immutable_user_type();

-- ===== 7. تحديث handle_new_user لضبط status =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_status public.user_status;
BEGIN
  v_role := COALESCE(
    new.raw_user_meta_data ->> 'user_type',
    new.raw_user_meta_data ->> 'role',
    'passenger'
  );
  v_role := CASE
    WHEN v_role IN ('super_admin', 'admin') THEN 'admin'
    WHEN v_role IN ('passenger', 'driver')  THEN v_role
    ELSE 'passenger'
  END;

  IF v_role IN ('super_admin', 'admin', 'support') THEN
    v_status := 'pending_invite';
  ELSIF v_role IN ('passenger', 'driver') THEN
    v_status := 'pending_approval';
  ELSE
    v_status := 'pending_approval';
  END IF;

  INSERT INTO public.profiles (id, role, full_name, status)
  VALUES (
    new.id,
    v_role::user_role,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    v_status
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (id, status) VALUES (new.id, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- ===== 8. جدول notification_settings =====
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type  text NOT NULL UNIQUE,
  label_ar           text NOT NULL,
  label_en           text NOT NULL,
  description_ar     text,
  description_en     text,
  is_enabled         boolean NOT NULL DEFAULT true,
  show_in_app        boolean NOT NULL DEFAULT true,
  send_email         boolean NOT NULL DEFAULT false,
  target_roles       text[] NOT NULL DEFAULT ARRAY['super_admin', 'admin', 'support'],
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_type
  ON public.notification_settings(notification_type);

-- ===== 9. RLS =====
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read notification settings"
  ON public.notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin')
    )
  );

-- ===== 10. Seed =====
INSERT INTO public.notification_settings
  (notification_type, label_ar, label_en, description_ar, description_en, is_enabled, show_in_app, send_email, target_roles)
VALUES
  ('new_passenger_registered', 'راكب جديد سجّل', 'New passenger registered', 'إشعار عند تسجيل راكب جديد', 'Notification when a new passenger registers', true, true, true, ARRAY['super_admin', 'admin', 'support']),
  ('new_driver_registered', 'سائقة جديدة سجّلت', 'New driver registered', 'إشعار عند تسجيل سائقة جديدة', 'Notification when a new driver registers', true, true, true, ARRAY['super_admin', 'admin', 'support']),
  ('new_staff_joined', 'موظف جديد انضم', 'New staff joined', 'إشعار عند قبول دعوة موظف جديد', 'Notification when a new staff member accepts invitation', true, true, false, ARRAY['super_admin', 'admin']),
  ('new_ride_created', 'رحلة جديدة', 'New ride created', 'إشعار عند إنشاء رحلة جديدة', 'Notification when a new ride is created', true, true, false, ARRAY['super_admin', 'admin', 'support']),
  ('driver_document_expiring', 'مستندات سائقة تنتهي صلاحيتها', 'Driver documents expiring', 'تنبيه عند اقتراب انتهاء صلاحية مستندات KYC', 'Warning when KYC documents expire', true, true, true, ARRAY['super_admin', 'admin']),
  ('user_status_changed', 'تغيير حالة مستخدم', 'User status changed', 'إشعار عند تغيير حالة مستخدم', 'Notification when a user status changes', true, true, false, ARRAY['super_admin', 'admin'])
ON CONFLICT (notification_type) DO NOTHING;

-- ===== 11. دالة تغيير الحالة =====
CREATE OR REPLACE FUNCTION public.change_user_status(
  p_target_id uuid,
  p_new_status public.user_status
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_protected boolean;
BEGIN
  SELECT is_protected INTO v_is_protected
  FROM public.profiles WHERE id = p_target_id;

  IF v_is_protected = true THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله.';
  END IF;

  UPDATE public.profiles SET status = p_new_status WHERE id = p_target_id;
END;
$$;

-- ===== 12. Triggers الإشعارات (مع فحص notification_settings) =====

-- 12a. سائقة جديدة
DROP TRIGGER IF EXISTS trigger_new_driver_registered ON public.drivers;

CREATE OR REPLACE FUNCTION public.notify_new_driver_registered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.notification_settings WHERE notification_type = 'new_driver_registered';
  IF v_settings IS NULL OR v_settings.is_enabled = false THEN RETURN new; END IF;

  select full_name into v_name from public.profiles where id = new.id;
  v_name := coalesce(v_name, 'غير معروفة');

  IF v_settings.show_in_app = true THEN
    insert into public.system_notifications (type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, target_user_id)
    values ('new_driver_registered', 'تم تسجيل سائقة جديدة: ' || v_name, 'New driver registered: ' || v_name,
      'سائقة جديدة (' || v_name || ') قامت بالتسجيل وحالتها: بانتظار الموافقة.',
      'A new driver (' || v_name || ') has registered. Status: pending approval.',
      'driver', new.id, null);
  END IF;

  return new;
end;
$$;

CREATE TRIGGER trigger_new_driver_registered
  after insert on public.drivers
  for each row execute function public.notify_new_driver_registered();

-- 12b. راكبة جديدة
CREATE OR REPLACE FUNCTION public.notify_new_passenger_registered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_settings RECORD;
BEGIN
  IF new.role != 'passenger' THEN RETURN new; END IF;

  SELECT * INTO v_settings FROM public.notification_settings WHERE notification_type = 'new_passenger_registered';
  IF v_settings IS NULL OR v_settings.is_enabled = false THEN RETURN new; END IF;

  select full_name into v_name from public.profiles where id = new.id;
  v_name := coalesce(v_name, 'غير معروفة');

  IF v_settings.show_in_app = true THEN
    insert into public.system_notifications (type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, target_user_id)
    values ('new_passenger_registered', 'راكب جديد سجّل: ' || v_name, 'New passenger registered: ' || v_name,
      'راكب جديد (' || v_name || ') قامت بالتسجيل وحالتها: بانتظار الموافقة.',
      'A new passenger (' || v_name || ') has registered. Status: pending approval.',
      'passenger', new.id, null);
  END IF;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS trigger_new_passenger_registered ON public.profiles;
CREATE TRIGGER trigger_new_passenger_registered
  after insert on public.profiles
  for each row execute function public.notify_new_passenger_registered();

-- 12c. موظف جديد
CREATE OR REPLACE FUNCTION public.notify_new_staff_joined()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_settings RECORD;
BEGIN
  IF new.role not in ('admin') THEN RETURN new; END IF;

  SELECT * INTO v_settings FROM public.notification_settings WHERE notification_type = 'new_staff_joined';
  IF v_settings IS NULL OR v_settings.is_enabled = false THEN RETURN new; END IF;

  select full_name into v_name from public.profiles where id = new.id;
  v_name := coalesce(v_name, 'موظف جديد');

  IF v_settings.show_in_app = true THEN
    insert into public.system_notifications (type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, target_user_id)
    values ('new_staff_joined', 'انضم موظف جديد: ' || v_name, 'New staff joined: ' || v_name,
      'الموظف ' || v_name || ' انضم لفريق الإدارة.',
      'Staff member ' || v_name || ' has joined the admin team.',
      'staff', new.id, null);
  END IF;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS trigger_new_staff_joined ON public.profiles;
CREATE TRIGGER trigger_new_staff_joined
  after insert on public.profiles
  for each row execute function public.notify_new_staff_joined();


-- ───────────────────────────────────────────────────────────────────────────
-- [0017_support_tickets.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0017_support_tickets.sql
-- منصة أمانة — نظام التذاكر والدعم الفني
--
-- support_tickets: تذاكر الدعم الفني من الركاب/السائقين
-- ticket_messages: رسائل المحادثة داخل كل تذكرة
--
-- معايير:
--   - الحد الأقصى 10 تذاكر مفتوحة في نفس الوقت
--   - الأولوية: عالية (شكاوى)، متوسطة (أسئلة)، منخفضة (اقتراحات)
--   - الحالة: جديد → قيد المعالجة → مغلق
--
-- تراكمي (idempotent). يُطبَّق يدويًا: Supabase SQL Editor → Run.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) جدول التذاكر
-- ------------------------------------------------------------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  user_role   user_role not null,
  subject     text not null,
  description text not null,
  category    text not null check (category in ('complaint', 'question', 'suggestion', 'technical')),
  priority    text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_support_tickets_user   on public.support_tickets (user_id);
create index if not exists idx_support_tickets_status on public.support_tickets (status);
create index if not exists idx_support_tickets_assigned on public.support_tickets (assigned_to);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2) جدول الرسائل
-- ------------------------------------------------------------
create table if not exists public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  sender_role user_role not null,
  message     text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ticket_messages_ticket on public.ticket_messages (ticket_id);

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------
alter table public.support_tickets enable row level security;
alter table public.ticket_messages  enable row level security;

-- التذاكر: الموظفون يرون جميع التذاكر، المستخدمون يرون تذاكرهم فقط
drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
    or user_id = auth.uid()
  );

-- إنشاء تذكرة: أي مستخدم مسجّل (限额 10 تذاكر مفتوحة تُتحقق في الكود)
drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
  for insert with check (user_id = auth.uid());

-- تحديث التذاكر: الموظفون فقط (لتحديث الحالة والتخصيص)
drop policy if exists support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
  );

-- الرسائل: أطراف التذكرة والموظفون
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
    )
    or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
    )
  );

-- إرسال رسالة: أطراف التذكرة فقط (الرسائل الداخلية للموظفين فقط)
drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      not is_internal
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support')
      )
    )
  );

-- ============================================================
-- ملاحظات:
-- - الحد الأقصى 10 تذاكر مفتوحة يُتحقق في server actions (لا يمكن فرضه بـ DB trigger بسهولة)
-- - الأولوية الافتراضية 'medium'؛ يمكن تغييرها عند الإنشاء
-- - is_internal: رسائل داخلية لا يراها المستخدم (للتنسيق بين الموظفين)
-- ============================================================

-- ------------------------------------------------------------
-- 4) إشعار عند إنشاء تذكرة جديدة
-- ------------------------------------------------------------

-- 4a) إضافة نوع الإشعار إلى notification_settings
INSERT INTO public.notification_settings
  (notification_type, label_ar, label_en, description_ar, description_en, is_enabled, show_in_app, send_email, target_roles)
VALUES
  ('new_support_ticket_created', 'تذكرة دعم فني جديدة', 'New support ticket created', 'إشعار عند إنشاء تذكرة دعم فني جديدة', 'Notification when a new support ticket is created', true, true, false, ARRAY['super_admin', 'admin', 'support'])
ON CONFLICT (notification_type) DO NOTHING;

-- 4b) دالة الإشعار
CREATE OR REPLACE FUNCTION public.notify_new_support_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_name text;
  v_settings RECORD;
  v_category text;
  v_priority text;
BEGIN
  -- فحص الإعدادات
  SELECT * INTO v_settings FROM public.notification_settings WHERE notification_type = 'new_support_ticket_created';
  IF v_settings IS NULL OR v_settings.is_enabled = false THEN RETURN new; END IF;

  -- جلب اسم صاحب التذكرة
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = new.user_id;
  v_user_name := COALESCE(v_user_name, 'مستخدم');

  -- ترجمة النوع والأولوية
  v_category := CASE new.category
    WHEN 'complaint' THEN 'شكوى'
    WHEN 'question' THEN 'سؤال'
    WHEN 'suggestion' THEN 'اقتراح'
    WHEN 'technical' THEN 'مشكلة تقنية'
    ELSE new.category
  END;

  v_priority := CASE new.priority
    WHEN 'high' THEN 'عالية'
    WHEN 'medium' THEN 'متوسطة'
    WHEN 'low' THEN 'منخفضة'
    ELSE new.priority
  END;

  -- إدراج الإشعار العام (target_user_id = null = جميع الموظفين)
  INSERT INTO public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) VALUES (
    'new_support_ticket_created',
    'تذكرة دعم جديدة: ' || new.subject,
    'New support ticket: ' || new.subject,
    v_user_name || ' أنشأ تذكرة دعم فني (' || v_category || ') بأولوية ' || v_priority || '.',
    v_user_name || ' created a support ticket (' || new.category || ') with ' || new.priority || ' priority.',
    'ticket',
    new.id,
    null
  );

  RETURN new;
END;
$$;

-- 4c) Trigger على support_tickets
DROP TRIGGER IF EXISTS trigger_new_support_ticket ON public.support_tickets;
CREATE TRIGGER trigger_new_support_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_support_ticket();


-- ───────────────────────────────────────────────────────────────────────────
-- [0018_fix_protected_update.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0018_fix_protected_update.sql
-- تعديل الحماية للسماح بتعديل الحقول الشخصية (الاسم، الصورة، التفضيلات)
-- الحماية تبقى فقط على: الدور، is_protected
-- ============================================================

-- تحديث الدالة للسماح بالتعديل على الحقول الشخصية
CREATE OR REPLACE FUNCTION public.prevent_protected_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- الحماية فقط على الحقول الحساسة
  IF OLD.is_protected = true THEN
    -- منع تغيير الدور
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: لا يمكن تغيير دور الحسابات المحمية.';
    END IF;

    -- منع تغيير is_protected
    IF OLD.is_protected IS DISTINCT FROM NEW.is_protected THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: لا يمكن تغيير حالة الحماية.';
    END IF;

    -- منع تغيير المعرّف
    IF OLD.id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: لا يمكن تغيير معرّف الحساب.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_protected_update() IS 'حماية الحقول الحساسة فقط: الدور، is_protected. يسمح بتعديل الاسم والصورة والتفضيلات.';


-- ───────────────────────────────────────────────────────────────────────────
-- [0019_fix_signup_locale.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0019_fix_signup_locale.sql
-- إصلاح: فشل إنشاء أي مستخدم جديد ("Database error saving new user")
-- في التطبيقات الثلاثة (راكبة/سائقة/إدارة) بعد إضافة عمود profiles.locale
-- (قيد CHECK: locale IN ('ar','en')) الذي لا يكتبه مُشغّل handle_new_user.
--
-- الإصلاح من طبقتين (belt-and-suspenders):
--   1) ضبط DEFAULT صالح للعمود locale + تعبئة القيم الفارغة.
--   2) إعادة كتابة handle_new_user لتكتب locale + كل الأعمدة الصحيحة.
-- ثم كتلة تحقّق حيّة تُثبت أن التسجيل صار يعمل (تتراجع كليًا، لا تُبقي بيانات).
--
-- idempotent — آمن لإعادة التشغيل. يُطبَّق في Supabase SQL Editor → Run.
-- ============================================================

-- ---------- 1) إصلاح العمود locale ----------
-- إن كان العمود موجودًا: اضبط default='ar' واملأ أي قيمة فارغة/غير صالحة.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='locale'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN locale SET DEFAULT 'ar';
    UPDATE public.profiles
      SET locale = 'ar'
      WHERE locale IS NULL OR locale NOT IN ('ar','en');
  END IF;
END $$;

-- ---------- 2) handle_new_user كاملة وصحيحة ----------
-- تكتب role + user_type + full_name + locale، وتترك status لِـDEFAULT العمود،
-- وتُنشئ صف السائقة تلقائيًا. locale='ar' صريحة (حزام أمان فوق DEFAULT).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_raw  text := COALESCE(new.raw_user_meta_data ->> 'user_type', new.raw_user_meta_data ->> 'role', 'passenger');
  v_type public.user_type := CASE
    WHEN v_raw IN ('passenger','driver','super_admin','admin','support') THEN v_raw::public.user_type
    ELSE 'passenger'::public.user_type
  END;
  v_role public.user_role := (CASE
    WHEN v_type IN ('super_admin','admin','support') THEN 'admin'
    WHEN v_type = 'driver' THEN 'driver'
    ELSE 'passenger'
  END)::public.user_role;
BEGIN
  INSERT INTO public.profiles (id, role, user_type, full_name, locale)
  VALUES (
    new.id,
    v_role,
    v_type,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'ar'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  IF v_type = 'driver' THEN
    INSERT INTO public.drivers (id, status) VALUES (new.id, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- تأكيد وجود المُشغّل (إعادة ربطه إن لزم).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 3) تحقّق حيّ: هل صار التسجيل يعمل؟ ----------
-- يُدرج مستخدمًا تجريبيًا (يُشغّل المُشغّل فعليًا) ثم يتراجع كليًا.
-- النتيجة تظهر في تبويب Messages/Notices.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  VALUES (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'verify-' || substr(v_id::text,1,8) || '@amana-verify.test', '',
          now(), '{"provider":"email","providers":["email"]}',
          '{"user_type":"driver","full_name":"Verify"}', now(), now());
  -- وصلنا هنا ⇒ الإدراج نجح. نتراجع عبر استثناء مقصود.
  RAISE EXCEPTION 'verify_ok';
EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM = 'verify_ok' THEN
      RAISE NOTICE '✅ SIGNUP FIXED — تم إنشاء مستخدم تجريبي بنجاح وتراجعنا عنه. التسجيل يعمل الآن.';
    ELSE
      RAISE NOTICE '❌ STILL FAILING → %', SQLERRM;
    END IF;
  WHEN OTHERS THEN
    RAISE NOTICE '❌ STILL FAILING → sqlstate=% | message=%', SQLSTATE, SQLERRM;
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- [0020_create_system_notifications.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0020_create_system_notifications.sql
-- إصلاح نهائي لفشل التسجيل: مُشغّلات الإشعارات (من 0016) تكتب في جدول
-- public.system_notifications الذي لم يُنشأ قط (هجرة 0008 لم تُطبَّق).
-- النتيجة: أي إدراج في profiles/drivers أثناء التسجيل يفشل بـ
-- 42P01 "relation public.system_notifications does not exist".
--
-- هذا الملف يُنشئ الجدول + الفهارس + RLS (بلا تكرار للمُشغّلات الموجودة).
-- idempotent — آمن لإعادة التشغيل. Supabase SQL Editor → Run.
-- ============================================================

-- ---------- 1) الجدول ----------
create table if not exists public.system_notifications (
  id                  uuid primary key default gen_random_uuid(),
  type                text        not null,
  title_ar            text        not null,
  title_en            text        not null,
  body_ar             text,
  body_en             text,
  related_entity_type text,
  related_entity_id   uuid,
  target_user_id      uuid references public.profiles(id) on delete cascade,
  is_read             boolean     not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists idx_system_notifications_lookup
  on public.system_notifications (target_user_id, is_read, created_at desc);

create index if not exists idx_system_notifications_global
  on public.system_notifications (is_read, created_at desc)
  where target_user_id is null;

-- ---------- 2) RLS (قراءة/تحديث/حذف للموظفين؛ الإدراج عبر service_role/triggers فقط) ----------
alter table public.system_notifications enable row level security;

drop policy if exists system_notifications_select_staff on public.system_notifications;
create policy system_notifications_select_staff
  on public.system_notifications for select
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin','admin','support'))
    and (target_user_id = auth.uid() or target_user_id is null)
  );

drop policy if exists system_notifications_update_read on public.system_notifications;
create policy system_notifications_update_read
  on public.system_notifications for update
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin','admin','support'))
    and (target_user_id = auth.uid() or target_user_id is null)
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin','admin','support'))
  );

drop policy if exists system_notifications_delete_staff on public.system_notifications;
create policy system_notifications_delete_staff
  on public.system_notifications for delete
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin','admin','support'))
    and (target_user_id = auth.uid() or target_user_id is null)
  );

-- دالة مساعدة (قد تعتمد عليها كائنات أخرى)
create or replace function public.is_staff_user(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles
                 where id = uid and user_type in ('super_admin','admin','support'));
$$;

-- ---------- 3) تحقّق حيّ (يظهر في جدول Results) ----------
drop table if exists _verify;
create temp table _verify(step text, result text);

do $$
declare v_id uuid := gen_random_uuid(); v_msg text;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (v_id, '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'verify-'||substr(v_id::text,1,8)||'@amana-verify.test','', now(),
      '{"provider":"email","providers":["email"]}',
      '{"user_type":"driver","full_name":"Verify"}', now(), now());
    raise exception 'undo';   -- نجح ⇒ نتراجع عمدًا
  exception
    when others then
      if sqlerrm = 'undo' then v_msg := '✅ SIGNUP FIXED — التسجيل يعمل الآن (راكبة/سائقة/دعوة)';
      else v_msg := '❌ sqlstate=' || sqlstate || ' | ' || sqlerrm; end if;
  end;
  insert into _verify values ('signup_test', v_msg);
end $$;

select * from _verify;


-- ───────────────────────────────────────────────────────────────────────────
-- [0021_fix_self_notifications.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0021_fix_self_notifications.sql
-- ضبط الإشعارات: لا يرى المستخدم إشعارًا متعلّقًا به هو شخصيًا.
--
-- المشكلة: إشعارات مثل "انضم موظف جديد" / "سائقة جديدة" عامة
-- (target_user_id = null) وتُخزّن related_entity_id = معرّف الشخص المعنيّ.
-- سياسة RLS الحالية تعرض كل الإشعارات العامة لكل الموظفين، فيرى الموظف
-- الجديد إشعارًا عن انضمامه هو.
--
-- الحل: إضافة شرط (related_entity_id <> auth.uid()) لسياسة القراءة، فلا
-- يُعرض لأي مستخدم إشعار موضوعه هو نفسه (يبقى ظاهرًا لبقية الموظفين).
--
-- idempotent. Supabase SQL Editor → Run.
-- ============================================================

drop policy if exists system_notifications_select_staff on public.system_notifications;
create policy system_notifications_select_staff
  on public.system_notifications for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type in ('super_admin','admin','support')
    )
    and (target_user_id = auth.uid() or target_user_id is null)
    -- لا تُظهر للمستخدم إشعارًا متعلّقًا به شخصيًا (انضمامه/تسجيله)
    and (related_entity_id is null or related_entity_id is distinct from auth.uid())
  );

-- ملاحظة: هذا فلتر قراءة (read-time) — الإشعارات الحالية «انضم موظف جديد»
-- ستختفي فورًا عن الموظف المعنيّ بها دون حذف، وتبقى ظاهرة لبقية الموظفين.


-- ───────────────────────────────────────────────────────────────────────────
-- [0022_driver_kyc_fields.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0022_driver_kyc_fields.sql
-- توسيع بيانات توثيق السائقة (KYC): إضافة أربعة أعمدة لجدول drivers
-- ليجمع النموذج بياناتٍ نصية + صورة السيارة من الأمام (كان يجمع 3 صور فقط).
--
--   vehicle_year                (int)  — سنة صنع المركبة
--   national_id_number          (text) — رقم الهوية/الإقامة
--   vehicle_registration_number (text) — رقم الاستمارة
--   car_photo_url               (text) — مسار صورة السيارة من الأمام في bucket kyc-documents
--
-- موجودة مسبقًا: vehicle_make, vehicle_model, vehicle_plate,
-- national_id_url, license_url, vehicle_registration_url. الجوال في profiles.phone.
--
-- idempotent (ADD COLUMN IF NOT EXISTS). Supabase SQL Editor → Run.
-- ملاحظة: car_photo_url مسارٌ في نفس bucket kyc-documents الخاص، فتنطبق عليه
-- سياسات RLS/التخزين القائمة دون تغيير (السائقة ترفع في مجلد معرّفها، والإدارة
-- تعاين عبر روابط موقّعة من مفتاح الخدمة).
-- ============================================================

alter table public.drivers
  add column if not exists vehicle_year                int,
  add column if not exists national_id_number          text,
  add column if not exists vehicle_registration_number text,
  add column if not exists car_photo_url               text;


-- ───────────────────────────────────────────────────────────────────────────
-- [0023_driver_rejection_reason.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0023_driver_rejection_reason.sql
-- سبب رفض توثيق السائقة — يصل إليها داخل التطبيق كي تعرف ما تُصلحه.
--
--   rejection_reason (text) — يُملأ عند الرفض، ويُفرَّغ عند القبول أو عند
--   إعادة الإرسال للتدقيق. تقرؤه السائقة عبر سياسة drivers_select_own القائمة
--   (id = auth.uid())، فلا حاجة لتغيير RLS.
--
-- idempotent. Supabase SQL Editor → Run (بعد 0022).
-- ============================================================

alter table public.drivers
  add column if not exists rejection_reason text;


-- ───────────────────────────────────────────────────────────────────────────
-- [0024_fix_driver_user_type.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0024_fix_driver_user_type.sql
-- إصلاح: السائقات الجدد يحصلون على profiles.user_type = 'passenger' بدل 'driver'
-- (دالة handle_new_user الحيّة كانت تكتب `role` فقط وتترك user_type للـdefault).
-- الأثر: تمييز «السائقة» في أماكن تعتمد user_type يفشل.
--
-- هذا الملف: (1) يعيد كتابة handle_new_user لتكتب user_type صحيحًا،
--            (2) يُصلح السجلّات القائمة (كل من له صفّ في drivers → user_type='driver').
-- idempotent. Supabase SQL Editor → Run.
-- ============================================================

-- (1) handle_new_user كاملة وصحيحة — تكتب role + user_type + locale.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_raw  text := COALESCE(new.raw_user_meta_data ->> 'user_type', new.raw_user_meta_data ->> 'role', 'passenger');
  v_type public.user_type := CASE
    WHEN v_raw IN ('passenger','driver','super_admin','admin','support') THEN v_raw::public.user_type
    ELSE 'passenger'::public.user_type
  END;
  v_role public.user_role := (CASE
    WHEN v_type IN ('super_admin','admin','support') THEN 'admin'
    WHEN v_type = 'driver' THEN 'driver'
    ELSE 'passenger'
  END)::public.user_role;
BEGIN
  INSERT INTO public.profiles (id, role, user_type, full_name, locale)
  VALUES (
    new.id, v_role, v_type,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'ar'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  IF v_type = 'driver' THEN
    INSERT INTO public.drivers (id, status) VALUES (new.id, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- (2) تصحيح السجلّات القائمة: كل من له صفّ في drivers → user_type = 'driver'.
-- نُعطّل مؤشّرات profiles مؤقتًا لتجاوز مُشغّل حماية user_type (immutable) لمرّة واحدة.
ALTER TABLE public.profiles DISABLE TRIGGER USER;

UPDATE public.profiles p
   SET user_type = 'driver'
  FROM public.drivers d
 WHERE d.id = p.id
   AND p.user_type IS DISTINCT FROM 'driver';

ALTER TABLE public.profiles ENABLE TRIGGER USER;


-- ───────────────────────────────────────────────────────────────────────────
-- [0025_driver_kyc_submitted_at.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- 0025_driver_kyc_submitted_at.sql
-- تمييز «مسودّة» (لم تُرسَل بعد) عن «مُرسَلة للتدقيق».
--
-- المشكلة: المُشغِّل handle_new_user يُنشئ صف السائقة بـ status='pending' لحظة
-- التسجيل — قبل رفع أي مستند أو إدخال أي حقل. فكانت السائقة تُوجَّه إلى شاشة
-- «قيد المراجعة» بمجرّد رفع الصور (تُحفظ فورًا) دون أن تضغط «إرسال» ودون اكتمال
-- بياناتها النصية، وتظهر في طابور مراجعة الإدارة كطلب مكتمل — وهي ليست كذلك.
--
-- الحل: عمود زمنيّ صريح يُملأ فقط عند ضغط «إرسال للتدقيق».
--   NULL      = مسودّة، تُكمِل بياناتها ولا تظهر للإدارة كطلب.
--   NOT NULL  = أُرسِلت فعلاً للتدقيق (طابور المراجعة).

alter table public.drivers
  add column if not exists kyc_submitted_at timestamptz;

comment on column public.drivers.kyc_submitted_at is
  'وقت إرسال السائقة طلبها للتدقيق. NULL = مسودّة لم تُرسَل بعد (لا تظهر في طابور المراجعة).';

-- تعبئة رجعية: السائقات المعتمَدات/المرفوضات أُرسِلن حتمًا سابقًا، فلا نعاملهنّ
-- كمسودّات. الحالات pending الحالية تبقى NULL (مسودّات) — إن كنّ قد أرسلن فعلاً
-- يكفي أن يضغطن «إرسال» مرة أخرى من التطبيق.
update public.drivers
  set kyc_submitted_at = now()
  where kyc_submitted_at is null
    and status in ('approved', 'rejected');


-- ───────────────────────────────────────────────────────────────────────────
-- [0026_support_module.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- 0026_support_module.sql
-- وحدة الدعم الفني الكاملة + رفع صورة المستخدم (avatars).
-- مكتفية بذاتها وتراكمية (idempotent): تُنشئ جداول الدعم إن لم تكن موجودة
-- (هجرة 0017 قد لا تكون طُبّقت) ثم تضيف التحسينات:
--   • ترقيم تذاكر بشري ببادئة لكل تطبيق: dri/pas/adm + YYMM + تسلسل 4 أرقام.
--   • 5 حالات: open(جديد) · in_progress(قيد العمل) · resolved(بانتظار رد العميل)
--             · closed(منتهي) · cancelled(ملغي — من العميل).
--   • حدّ 5 تذاكر غير مُغلقة (يُتحقّق في الكود أيضًا).
--   • إلغاء العميل لتذكرته + استبيان رضا (تقييم + تعليق) اختياري بعد الإغلاق.
--   • bucket «avatars» عام لرفع صورة المستخدم.
-- يُطبَّق يدويًا: Supabase SQL Editor → Run.

-- ============================================================
-- 0) دالة تحديث updated_at (إن لم توجد)
-- ============================================================
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1) الجداول (تُنشأ إن غابت — أعمدة text لتفادي اعتماد enums)
-- ============================================================
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  user_role   text not null,
  subject     text not null,
  description text not null,
  category    text not null,
  priority    text not null default 'medium',
  status      text not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,
  message     text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 2) أعمدة التحسينات (idempotent على جدول قائم أو جديد)
-- ============================================================
alter table public.support_tickets add column if not exists ticket_number      text;
alter table public.support_tickets add column if not exists survey_sent_at      timestamptz;
alter table public.support_tickets add column if not exists survey_rating       int;
alter table public.support_tickets add column if not exists survey_comment      text;
alter table public.support_tickets add column if not exists survey_answered_at  timestamptz;

create unique index if not exists idx_support_ticket_number
  on public.support_tickets (ticket_number);

-- حالات موحّدة (5) — نُسقط القيد القديم ونعيد إنشاءه شاملًا cancelled.
alter table public.support_tickets drop constraint if exists support_tickets_status_check;
alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in ('open', 'in_progress', 'resolved', 'closed', 'cancelled'));

-- تصنيفات التذكرة (متوافقة مع تطبيق السائقة).
alter table public.support_tickets drop constraint if exists support_tickets_category_check;
alter table public.support_tickets
  add constraint support_tickets_category_check
  check (category in ('complaint', 'question', 'suggestion', 'technical'));

alter table public.support_tickets drop constraint if exists support_tickets_priority_check;
alter table public.support_tickets
  add constraint support_tickets_priority_check
  check (priority in ('high', 'medium', 'low'));

alter table public.support_tickets drop constraint if exists support_tickets_survey_rating_check;
alter table public.support_tickets
  add constraint support_tickets_survey_rating_check
  check (survey_rating is null or survey_rating between 1 and 5);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create index if not exists idx_support_tickets_user     on public.support_tickets (user_id);
create index if not exists idx_support_tickets_status   on public.support_tickets (status);
create index if not exists idx_ticket_messages_ticket   on public.ticket_messages (ticket_id);

-- ============================================================
-- 3) ترقيم التذاكر: <بادئة><YYMM><تسلسل 4> — dri26070001
-- ============================================================
-- عدّاد لكل (بادئة، شهر) لضمان التسلسل الذرّي (قفل صفّ المفتاح يمنع التسابق).
create table if not exists public.ticket_counters (
  prefix text not null,
  ym     text not null,
  seq    int  not null default 0,
  primary key (prefix, ym)
);

create or replace function public.assign_ticket_number()
returns trigger language plpgsql as $$
declare
  v_prefix text;
  v_ym     text := to_char(now(), 'YYMM');
  v_seq    int;
begin
  if new.ticket_number is not null then
    return new;
  end if;
  v_prefix := case new.user_role
    when 'driver'    then 'dri'
    when 'passenger' then 'pas'
    when 'admin'     then 'adm'
    else 'sup'
  end;

  insert into public.ticket_counters (prefix, ym, seq)
    values (v_prefix, v_ym, 1)
    on conflict (prefix, ym)
      do update set seq = public.ticket_counters.seq + 1
    returning seq into v_seq;

  new.ticket_number := v_prefix || v_ym || lpad(v_seq::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_assign_ticket_number on public.support_tickets;
create trigger trg_assign_ticket_number
  before insert on public.support_tickets
  for each row execute function public.assign_ticket_number();

-- ============================================================
-- 4) الاستبيان: يُرسَل تلقائيًّا عند الإغلاق (status → closed)
-- ============================================================
create or replace function public.on_ticket_closed_send_survey()
returns trigger language plpgsql as $$
begin
  if new.status = 'closed'
     and old.status is distinct from 'closed'
     and new.survey_sent_at is null then
    new.survey_sent_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ticket_survey on public.support_tickets;
create trigger trg_ticket_survey
  before update on public.support_tickets
  for each row execute function public.on_ticket_closed_send_survey();

-- ============================================================
-- 5) RLS
-- ============================================================
alter table public.support_tickets enable row level security;
alter table public.ticket_messages  enable row level security;

-- التذاكر: الموظفون يرون الكل، والمستخدم يرى تذاكره فقط.
drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support'))
    or user_id = auth.uid()
  );

-- الإنشاء: المستخدم لنفسه فقط (حدّ 5 مفتوحة يُتحقّق في الكود).
drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
  for insert with check (user_id = auth.uid());

-- التحديث المباشر: الموظفون فقط (إلغاء العميل واستبيانه عبر دوال SECURITY DEFINER).
drop policy if exists support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets
  for update using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support'))
  );

-- الرسائل: أطراف التذكرة والموظفون (لا الداخلية للعميل).
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support'))
    or exists (select 1 from public.support_tickets t
               where t.id = ticket_messages.ticket_id and t.user_id = auth.uid())
  );

drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      not is_internal
      or exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.user_type in ('super_admin', 'admin', 'support'))
    )
  );

-- ============================================================
-- 6) دوال العميل: إلغاء تذكرته + تعبئة الاستبيان (SECURITY DEFINER، مقيّدة بـ auth.uid)
-- ============================================================
create or replace function public.cancel_my_ticket(p_ticket_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
    set status = 'cancelled', updated_at = now()
    where id = p_ticket_id
      and user_id = auth.uid()
      and status in ('open', 'in_progress', 'resolved');
end;
$$;

create or replace function public.submit_ticket_survey(
  p_ticket_id uuid, p_rating int, p_comment text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
    set survey_rating = p_rating,
        survey_comment = nullif(btrim(coalesce(p_comment, '')), ''),
        survey_answered_at = now()
    where id = p_ticket_id
      and user_id = auth.uid()
      and survey_sent_at is not null;
end;
$$;

revoke all on function public.cancel_my_ticket(uuid) from public;
revoke all on function public.submit_ticket_survey(uuid, int, text) from public;
grant execute on function public.cancel_my_ticket(uuid) to authenticated;
grant execute on function public.submit_ticket_survey(uuid, int, text) to authenticated;

-- ============================================================
-- 7) bucket «avatars» العام لرفع صورة المستخدم
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- قراءة عامة (الصور غير حسّاسة)، والكتابة/التحديث/الحذف على مجلّد المستخدم فقط.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ───────────────────────────────────────────────────────────────────────────
-- [0027_support_notifications_realtime.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- 0027_support_notifications_realtime.sql
-- (1) إشعار «تذكرة دعم جديدة» — كان في 0017 التي لم تُطبَّق، فإنشاء تذكرة لم يكن
--     يولّد إشعارًا أصلًا. (2) تفعيل البثّ الحيّ (Supabase Realtime) للجداول حتى
--     تصل الإشعارات للجرس فورًا بلا إعادة تحميل — بلا cron، ويعمل على Vercel المجاني
--     لأن الاتصال متصفّح⇄Supabase مباشرة (لا يمرّ عبر خادم Vercel).
-- تراكمي (idempotent). يُطبَّق يدويًا: Supabase SQL Editor → Run.

-- ============================================================
-- 1) إعداد نوع الإشعار في notification_settings
-- ============================================================
insert into public.notification_settings
  (notification_type, label_ar, label_en, description_ar, description_en,
   is_enabled, show_in_app, send_email, target_roles)
values
  ('new_support_ticket_created', 'تذكرة دعم فني جديدة', 'New support ticket created',
   'إشعار عند إنشاء تذكرة دعم فني جديدة', 'Notification when a new support ticket is created',
   true, true, false, array['super_admin', 'admin', 'support'])
on conflict (notification_type) do nothing;

-- ============================================================
-- 2) دالة + trigger: إشعار الموظفين عند إنشاء تذكرة (يشمل رقم التذكرة)
-- ============================================================
create or replace function public.notify_new_support_ticket()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_name text;
  v_settings  record;
  v_category  text;
  v_priority  text;
  v_num       text := coalesce(new.ticket_number, '');
begin
  select * into v_settings from public.notification_settings
    where notification_type = 'new_support_ticket_created';
  if v_settings is null or v_settings.is_enabled = false then return new; end if;

  select full_name into v_user_name from public.profiles where id = new.user_id;
  v_user_name := coalesce(v_user_name, 'مستخدم');

  v_category := case new.category
    when 'complaint' then 'شكوى' when 'question' then 'سؤال'
    when 'suggestion' then 'اقتراح' when 'technical' then 'مشكلة تقنية'
    else new.category end;

  v_priority := case new.priority
    when 'high' then 'عالية' when 'medium' then 'متوسطة'
    when 'low' then 'منخفضة' else new.priority end;

  insert into public.system_notifications (
    type, title_ar, title_en, body_ar, body_en,
    related_entity_type, related_entity_id, target_user_id
  ) values (
    'new_support_ticket_created',
    'تذكرة دعم جديدة' || case when v_num <> '' then ' (' || v_num || ')' else '' end || ': ' || new.subject,
    'New support ticket' || case when v_num <> '' then ' (' || v_num || ')' else '' end || ': ' || new.subject,
    v_user_name || ' أنشأ تذكرة دعم فني (' || v_category || ') بأولوية ' || v_priority || '.',
    v_user_name || ' created a support ticket (' || new.category || ') with ' || new.priority || ' priority.',
    'ticket',
    new.id,
    null  -- موجّه لجميع الموظفين
  );

  return new;
end;
$$;

drop trigger if exists trigger_new_support_ticket on public.support_tickets;
create trigger trigger_new_support_ticket
  after insert on public.support_tickets
  for each row execute function public.notify_new_support_ticket();

-- ============================================================
-- 3) تفعيل البثّ الحيّ (Realtime) — إضافة الجداول لنشر supabase_realtime
--    (idempotent: لا نضيف الجدول إن كان مضافًا مسبقًا).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'system_notifications'
  ) then
    alter publication supabase_realtime add table public.system_notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'support_tickets'
  ) then
    alter publication supabase_realtime add table public.support_tickets;
  end if;
end $$;

-- بيانات الصفّ الكاملة في أحداث التحديث/الحذف (الإدراج لا يحتاجها).
alter table public.system_notifications replica identity full;
alter table public.support_tickets      replica identity full;


-- ───────────────────────────────────────────────────────────────────────────
-- [0028_ticket_assign_and_cancel.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- 0028_ticket_assign_and_cancel.sql
-- (1) قصر إلغاء العميل على حالة «جديد» فقط (قبل أن يبدأ أي موظف العمل).
-- (2) trigger موحّد على رسائل التذاكر:
--     - أول ردّ من موظف ⇒ تُخصَّص التذكرة له (إن لم تكن مخصّصة).
--     - ردّ موظف على تذكرة «جديد» ⇒ تنتقل تلقائيًّا إلى «قيد العمل».
--     - أي رسالة (موظف أو عميل) تحدّث updated_at.
-- تراكمي (idempotent). Supabase SQL Editor → Run.

-- ============================================================
-- 1) إلغاء العميل: «جديد» (open) فقط
-- ============================================================
create or replace function public.cancel_my_ticket(p_ticket_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
    set status = 'cancelled', updated_at = now()
    where id = p_ticket_id
      and user_id = auth.uid()
      and status = 'open';  -- لا يُلغى إلا قبل أن يبدأ أي موظف العمل
end;
$$;

-- ============================================================
-- 2) trigger موحّد عند إضافة رسالة (تخصيص + تقدّم + updated_at)
-- ============================================================
create or replace function public.on_ticket_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_staff boolean := new.sender_role in ('super_admin', 'admin', 'support');
begin
  update public.support_tickets t set
    updated_at  = now(),
    -- أول ردّ من موظف يُخصّص التذكرة له.
    assigned_to = case when v_is_staff and t.assigned_to is null then new.sender_id else t.assigned_to end,
    -- ردّ موظف على «جديد» ⇒ «قيد العمل» (لا يتقدّم بردّ العميل وحده).
    status      = case when v_is_staff and t.status = 'open' then 'in_progress' else t.status end
  where t.id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_on_ticket_message on public.ticket_messages;
create trigger trg_on_ticket_message
  after insert on public.ticket_messages
  for each row execute function public.on_ticket_message();


-- ───────────────────────────────────────────────────────────────────────────
-- [0029_rides_realtime.sql]
-- ───────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────
-- [0030_presence.sql]
-- ───────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────
-- [0031_ride_claim_and_tracking.sql]
-- ───────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────
-- [0032_ticket_reply_notifications.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0032 — تنبيهات ردود التذاكر + قراءة المستخدم لتنبيهاته
--
-- المشكلة: عند ردّ الموظف لم يكن يصل تنبيه لصاحب التذكرة (لا trigger ينشئه،
-- وجدول system_notifications للموظفين فقط). هذا الملف:
--   1) يوسّع RLS ليقرأ/يحدّث كل مستخدم تنبيهاته الخاصّة (target_user_id = uid).
--   2) يوسّع trigger رسائل التذاكر: ردّ موظف ⇒ تنبيه لصاحب التذكرة؛ ردّ العميل
--      ⇒ تنبيه عامّ للموظفين. (تُتجاهل الرسائل الداخلية.)
--   3) يضيف ticket_messages إلى بثّ Realtime (لتحديث المحادثة لحظيًّا).
-- idempotent.
-- ============================================================

-- ---- 1) RLS: المستخدم يقرأ/يحدّث تنبيهاته الخاصّة ----
drop policy if exists system_notifications_select_own on public.system_notifications;
create policy system_notifications_select_own on public.system_notifications for select to authenticated
  using (target_user_id = auth.uid());

drop policy if exists system_notifications_update_own on public.system_notifications;
create policy system_notifications_update_own on public.system_notifications for update to authenticated
  using (target_user_id = auth.uid()) with check (target_user_id = auth.uid());

-- ---- 2) trigger رسائل التذاكر (تخصيص + تقدّم + تنبيهات) ----
create or replace function public.on_ticket_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_staff boolean := new.sender_role in ('super_admin', 'admin', 'support');
  v_ticket   record;
  v_num      text;
  v_snippet  text := left(coalesce(new.message, ''), 120);
begin
  -- تخصيص أول ردّ موظف + تقدّم الحالة + updated_at (كما كان).
  update public.support_tickets t set
    updated_at  = now(),
    assigned_to = case when v_is_staff and t.assigned_to is null then new.sender_id else t.assigned_to end,
    status      = case when v_is_staff and t.status = 'open' then 'in_progress' else t.status end
  where t.id = new.ticket_id;

  -- تنبيهات — نتجاهل الرسائل الداخلية بين الموظفين.
  if new.is_internal is not true then
    select id, user_id, subject, ticket_number into v_ticket
      from public.support_tickets where id = new.ticket_id;
    v_num := coalesce(v_ticket.ticket_number, '');

    if v_is_staff then
      -- ردّ موظف ⇒ تنبيه لصاحب التذكرة.
      insert into public.system_notifications (
        type, title_ar, title_en, body_ar, body_en,
        related_entity_type, related_entity_id, target_user_id
      ) values (
        'ticket_reply',
        'ردّ جديد على تذكرتك' || case when v_num <> '' then ' (' || v_num || ')' else '' end,
        'New reply on your ticket' || case when v_num <> '' then ' (' || v_num || ')' else '' end,
        v_snippet, v_snippet,
        'ticket', v_ticket.id, v_ticket.user_id
      );
    else
      -- ردّ العميل ⇒ تنبيه عامّ للموظفين.
      insert into public.system_notifications (
        type, title_ar, title_en, body_ar, body_en,
        related_entity_type, related_entity_id, target_user_id
      ) values (
        'ticket_user_reply',
        'ردّ جديد من العميل' || case when v_num <> '' then ' (' || v_num || ')' else '' end
          || ': ' || coalesce(v_ticket.subject, ''),
        'New customer reply' || case when v_num <> '' then ' (' || v_num || ')' else '' end
          || ': ' || coalesce(v_ticket.subject, ''),
        v_snippet, v_snippet,
        'ticket', v_ticket.id, null
      );
    end if;
  end if;

  return new;
end;
$$;

-- الـ trigger موجود من 0028؛ نُعيد ربطه احتياطًا (idempotent).
drop trigger if exists trg_on_ticket_message on public.ticket_messages;
create trigger trg_on_ticket_message
  after insert on public.ticket_messages
  for each row execute function public.on_ticket_message();

-- ---- 3) Realtime لمحادثة التذاكر ----
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ticket_messages'
  ) then
    alter publication supabase_realtime add table public.ticket_messages;
  end if;
end $$;
alter table public.ticket_messages replica identity full;


-- ───────────────────────────────────────────────────────────────────────────
-- [0033_ride_payment.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0033 — دفع الرحلة (تجريبي/محاكى — بلا بوابة حقيقية بعد)
--
-- يغلق ذيل حلقة الرحلة: بعد إنهائها تُسجَّل قيمة الفاتورة النهائية ووقت الدفع
-- ووسيلته. الأسعار حقيقية (محسوبة من المسافة)؛ الدفع محاكى للتجربة — يُستبدَل
-- لاحقًا بربط بوابة دفع حكومية (يتطلّب سجلًّا تجاريًّا).
--
-- RLS: الراكبة تحدّث صفّها أصلًا (rides_update_passenger) فلا حاجة لسياسة جديدة.
-- idempotent.
-- ============================================================

alter table public.rides add column if not exists paid_at        timestamptz;
alter table public.rides add column if not exists fare_total     numeric(10,2);
alter table public.rides add column if not exists payment_method text;


-- ───────────────────────────────────────────────────────────────────────────
-- [0034_user_activation.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0034 — تفعيل المستخدم (راكب + سائق) + عكس حالة تأكيد البريد
--
-- المشكلة: مستخدم سجّل ولم يؤكّد بريده كان يظهر في اللوحة «نشط» لأن:
--   • handle_new_user لا تكتب `status` ⇒ يأخذ العمود الافتراضي 'active'.
--   • اللوحة تقرأ is_active فقط (لا status ولا email_confirmed_at).
--
-- هذا الملف (idempotent):
--   1) يضمن نوع user_status وعمود profiles.status (دفاعيًّا لو 0016 غير مطبّقة).
--   2) يضيف profiles.email_confirmed_at + مُشغّلًا يعكس تأكيد البريد من auth.users
--      (فتعرف اللوحة مَن أكمل تسجيله فعلًا) + تعبئة رجعية.
--   3) يعيد كتابة handle_new_user لتضبط status='pending_approval' للراكب/السائق
--      الجديد (يحتاج تفعيل الإدارة) و'active' للموظفين.
--   4) تعبئة رجعية: التسجيلات غير المؤكّدة (لم تكمل) ⇒ pending_approval.
-- ============================================================

-- ---- 1) نوع الحالة + العمود (دفاعيًّا) ----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type public.user_status as enum
      ('pending_approval', 'pending_invite', 'active', 'suspended', 'disabled');
  end if;
end $$;

alter table public.profiles
  add column if not exists status public.user_status not null default 'active';

-- ---- 2) عكس حالة تأكيد البريد من auth.users ----
alter table public.profiles add column if not exists email_confirmed_at timestamptz;

create or replace function public.sync_email_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email_confirmed_at = new.email_confirmed_at where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.sync_email_confirmed();

-- تعبئة رجعية لحالة التأكيد الحالية.
update public.profiles p
   set email_confirmed_at = u.email_confirmed_at
  from auth.users u
 where u.id = p.id
   and p.email_confirmed_at is distinct from u.email_confirmed_at;

-- ---- 3) handle_new_user تضبط status الابتدائي ----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_raw  text := coalesce(new.raw_user_meta_data ->> 'user_type', new.raw_user_meta_data ->> 'role', 'passenger');
  v_type public.user_type := case
    when v_raw in ('passenger','driver','super_admin','admin','support') then v_raw::public.user_type
    else 'passenger'::public.user_type
  end;
  v_role public.user_role := (case
    when v_type in ('super_admin','admin','support') then 'admin'
    when v_type = 'driver' then 'driver'
    else 'passenger'
  end)::public.user_role;
  -- الراكب/السائق الجديد يحتاج تفعيل الإدارة؛ الموظفون فعّالون.
  v_status public.user_status := case
    when v_type in ('passenger','driver') then 'pending_approval'
    else 'active'
  end::public.user_status;
begin
  insert into public.profiles (id, role, user_type, full_name, locale, status)
  values (
    new.id, v_role, v_type,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'ar', v_status
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  if v_type = 'driver' then
    insert into public.drivers (id, status) values (new.id, 'pending')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- 4) تعبئة رجعية: التسجيلات غير المؤكّدة (لم تكتمل) ⇒ بانتظار الموافقة ----
-- (المستخدمون المؤكّدون النشطون يبقون كما هم — grandfathered — كي لا تتعطّل حسابات
--  التجربة الجارية؛ السياسة الجديدة تسري على التسجيلات القادمة.)
update public.profiles
   set status = 'pending_approval'
 where user_type in ('passenger','driver')
   and status = 'active'
   and email_confirmed_at is null;

-- ---- 5) تنبيه الإدارة بالتسجيل الجديد (لحظة التسجيل) ----
-- دفاعيّ: أي فشل في الإدراج يُبتلَع (EXCEPTION) كي لا يكسر تسجيل المستخدم أبدًا.
-- نُوحّد المُشغّلات (نُسقط أسماء 0016 القديمة) فيصل التنبيه مرّة واحدة بنصّ يطابق الحالة.

create or replace function public.notify_new_passenger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.user_type::text, new.role::text) <> 'passenger' then
    return new;
  end if;
  begin
    insert into public.system_notifications
      (type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, target_user_id)
    values (
      'new_passenger_registered', 'راكبة جديدة', 'New passenger',
      'قامت راكبة جديدة (' || coalesce(new.full_name, '—') || ') بالتسجيل — بانتظار التفعيل.',
      'A new passenger (' || coalesce(new.full_name, '—') || ') registered — pending activation.',
      'passenger', new.id, null
    );
  exception when others then null;
  end;
  return new;
end;
$$;

create or replace function public.notify_new_driver()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  begin
    select full_name into v_name from public.profiles where id = new.id;
    insert into public.system_notifications
      (type, title_ar, title_en, body_ar, body_en, related_entity_type, related_entity_id, target_user_id)
    values (
      'new_driver_registered', 'سائقة جديدة', 'New driver',
      'قامت سائقة جديدة (' || coalesce(v_name, '—') || ') بالتسجيل — بانتظار المراجعة.',
      'A new driver (' || coalesce(v_name, '—') || ') registered — pending review.',
      'driver', new.id, null
    );
  exception when others then null;
  end;
  return new;
end;
$$;

-- إسقاط أسماء 0016 القديمة + أسمائنا (idempotent) ثم إعادة الإنشاء موحّدة.
drop trigger if exists trigger_new_passenger_registered on public.profiles;
drop trigger if exists trg_notify_new_passenger on public.profiles;
create trigger trg_notify_new_passenger
  after insert on public.profiles
  for each row execute function public.notify_new_passenger();

drop trigger if exists trigger_new_driver_registered on public.drivers;
drop trigger if exists trg_notify_new_driver on public.drivers;
create trigger trg_notify_new_driver
  after insert on public.drivers
  for each row execute function public.notify_new_driver();


-- ───────────────────────────────────────────────────────────────────────────
-- [0035_ride_arrival.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 0035 — خطوة «وصول السائقة لنقطة الالتقاط»
--
-- تدفّق الرحلة تقوده السائقة: قبول (matched) ← وصلت لنقطة الالتقاط ← بدء (in_progress)
-- ← إنهاء (completed). «الوصول لنقطة الالتقاط» يُمثَّل بعمود زمنيّ (لا قيمة enum
-- جديدة — أأمن) فالحالة تبقى matched حتى تبدأ الرحلة، وتعرف الراكبة أن سائقتها وصلت.
-- idempotent.
-- ============================================================

alter table public.rides add column if not exists driver_arrived_at timestamptz;


-- ───────────────────────────────────────────────────────────────────────────
-- [0036_vehicle_class.sql]
-- ───────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────
-- [0037_announcements.sql]
-- ───────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────
-- [0038_announcements_expiration.sql]
-- ───────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────
-- [0039_announcements_public_read.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- 0039_announcements_public_read.sql
-- السماح للمستخدمين (الركاب والسائقين) بقراءة الإعلانات الموجهة لهم.

drop policy if exists announcements_select_users on public.announcements;

create policy announcements_select_users on public.announcements
  for select to authenticated
  using (
    status = 'sent' 
    and starts_at <= now() 
    and expires_at > now()
    and (
      audience = 'all'
      or (audience = 'specific' and target_user_id = auth.uid())
      or (audience = 'passengers' and exists(select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'passenger'))
      or (audience = 'drivers' and exists(select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'driver'))
    )
  );


-- ───────────────────────────────────────────────────────────────────────────
-- [0040_ride_messages.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- 0040_ride_messages.sql
-- محادثة الرحلة بين الراكبة والسائقة (طرفا الرحلة فقط). Realtime لتحديث فوريّ.

create table if not exists public.ride_messages (
  id          uuid primary key default gen_random_uuid(),
  ride_id     uuid not null references public.rides(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id),
  sender_role text not null check (sender_role in ('passenger', 'driver')),
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists ride_messages_ride_idx on public.ride_messages (ride_id, created_at);

alter table public.ride_messages enable row level security;
alter table public.ride_messages replica identity full;

-- القراءة: طرفا الرحلة فقط (الراكبة أو السائقة المخصّصة).
drop policy if exists ride_messages_select on public.ride_messages;
create policy ride_messages_select on public.ride_messages
  for select to authenticated using (
    exists (
      select 1 from public.rides r
      where r.id = ride_id and (r.passenger_id = auth.uid() or r.driver_id = auth.uid())
    )
  );

-- الإدراج: المُرسِل نفسه، وطرف في الرحلة.
drop policy if exists ride_messages_insert on public.ride_messages;
create policy ride_messages_insert on public.ride_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.rides r
      where r.id = ride_id and (r.passenger_id = auth.uid() or r.driver_id = auth.uid())
    )
  );

-- Realtime publication (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ride_messages'
  ) then
    alter publication supabase_realtime add table public.ride_messages;
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────
-- [0041_app_versions.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- 0041_app_versions.sql
-- إصدارات التطبيقات المحمولة + مستودع ملفّات APK.
--
-- يقرأ التطبيق صفَّه عند الإقلاع ويقارن versionCode المحلّي بأحدث إصدار منشور.
-- إن كان أقدم تظهر نافذة «تحديث متاح» مع رابط التنزيل. التحديثات الخفيفة (JS)
-- تصل عبر EAS Update تلقائيًّا ولا تمرّ من هنا إطلاقًا — هذا الجدول للبناء الأصلي فقط.

create table if not exists public.app_versions (
  id            uuid primary key default gen_random_uuid(),
  app           text not null check (app in ('passenger', 'driver')),
  platform      text not null default 'android' check (platform in ('android', 'ios')),
  version_code  integer not null check (version_code > 0),
  version_name  text    not null,
  download_url  text    not null,
  notes         text,
  mandatory     boolean not null default false,
  published     boolean not null default false,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (app, platform, version_code)
);

create index if not exists app_versions_lookup_idx
  on public.app_versions (app, platform, published, version_code desc);

alter table public.app_versions enable row level security;

-- أيّ مستخدم مسجَّل يقرأ الإصدارات المنشورة فقط.
drop policy if exists app_versions_select_published on public.app_versions;
create policy app_versions_select_published on public.app_versions
  for select to authenticated
  using (published = true);

-- الإدارة وحدها تكتب.
drop policy if exists app_versions_admin_all on public.app_versions;
create policy app_versions_admin_all on public.app_versions
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- مستودع ملفّات التطبيقات — عامّ للقراءة حتى يعمل رابط التنزيل في صفحة الهبوط
-- ومن داخل التطبيق دون مصادقة.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', true)
on conflict (id) do update set public = true;

drop policy if exists app_releases_public_read on storage.objects;
create policy app_releases_public_read on storage.objects
  for select to public
  using (bucket_id = 'app-releases');

drop policy if exists app_releases_admin_write on storage.objects;
create policy app_releases_admin_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'app-releases'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  )
  with check (
    bucket_id = 'app-releases'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- دالّة عامّة لجلب أحدث إصدار — تُستدعى من صفحة الهبوط دون تسجيل دخول.
-- ---------------------------------------------------------------------------
create or replace function public.latest_app_version(p_app text, p_platform text default 'android')
returns table (
  version_code integer,
  version_name text,
  download_url text,
  notes        text,
  mandatory    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select v.version_code, v.version_name, v.download_url, v.notes, v.mandatory
  from public.app_versions v
  where v.app = p_app
    and v.platform = p_platform
    and v.published = true
  order by v.version_code desc
  limit 1;
$$;

grant execute on function public.latest_app_version(text, text) to anon, authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- [0042_download_stats_and_reviews.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- 0042_download_stats_and_reviews.sql
-- إحصاءات التنزيل وآراء المستخدمات على صفحة التحميل العامّة.

-- ---------------------------------------------------------------------------
-- سجلّ التنزيلات — صفّ لكل ضغطة على زرّ التحميل.
-- kind = 'install' من صفحة التحميل، و'update' من نافذة التحديث داخل التطبيق،
-- فنعرف كم منها تثبيت أوّل وكم تحديث لنسخة قائمة.
-- ---------------------------------------------------------------------------
create table if not exists public.app_downloads (
  id            bigserial primary key,
  app           text not null check (app in ('passenger', 'driver')),
  version_code  integer,
  kind          text not null default 'install' check (kind in ('install', 'update')),
  created_at    timestamptz not null default now()
);

create index if not exists app_downloads_app_idx on public.app_downloads (app, kind);
create index if not exists app_downloads_time_idx on public.app_downloads (created_at desc);

alter table public.app_downloads enable row level security;
-- لا سياسات قراءة عامّة: الكتابة والقراءة تتمّان من الخادم بمفتاح الخدمة فقط.

-- ---------------------------------------------------------------------------
-- آراء المستخدمات — تظهر على صفحة التحميل.
-- تُنشر مباشرةً (visible = true) وللإدارة إخفاؤها؛ الحجم المتوقّع صغير
-- ومراجعة كل تعليق قبل نشره تعطّل التفاعل بلا داعٍ في هذه المرحلة.
-- ---------------------------------------------------------------------------
create table if not exists public.app_reviews (
  id          uuid primary key default gen_random_uuid(),
  app         text not null check (app in ('passenger', 'driver')),
  name        text not null check (char_length(trim(name)) between 2 and 60),
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 600),
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists app_reviews_public_idx
  on public.app_reviews (app, visible, created_at desc);

alter table public.app_reviews enable row level security;

-- الزوّار يقرؤون الآراء الظاهرة فقط. الكتابة تمرّ عبر الخادم (تحقّق + تنظيف).
drop policy if exists app_reviews_public_read on public.app_reviews;
create policy app_reviews_public_read on public.app_reviews
  for select to anon, authenticated
  using (visible = true);

drop policy if exists app_reviews_admin_all on public.app_reviews;
create policy app_reviews_admin_all on public.app_reviews
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.user_type::text, p.role::text) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- ملخّص عامّ يُعرض على صفحة التحميل: عدد التثبيتات والتحديثات ومتوسّط التقييم.
-- ---------------------------------------------------------------------------
create or replace function public.app_public_stats(p_app text)
returns table (
  installs      bigint,
  updates       bigint,
  reviews_count bigint,
  rating_avg    numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.app_downloads d
      where d.app = p_app and d.kind = 'install'),
    (select count(*) from public.app_downloads d
      where d.app = p_app and d.kind = 'update'),
    (select count(*) from public.app_reviews r
      where r.app = p_app and r.visible),
    (select round(avg(r.rating)::numeric, 1) from public.app_reviews r
      where r.app = p_app and r.visible);
$$;

grant execute on function public.app_public_stats(text) to anon, authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- [20260714072243_add_preferences_to_profiles.sql]
-- ───────────────────────────────────────────────────────────────────────────

-- Add preferences columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS preferred_theme text DEFAULT 'system';
