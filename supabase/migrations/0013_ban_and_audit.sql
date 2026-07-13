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
