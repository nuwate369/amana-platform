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
