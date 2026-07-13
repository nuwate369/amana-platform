-- =============================================================================
-- منصة أمانة — Migration 0007: استبدال RBAC بـ user_type Enum
-- =============================================================================
-- يحذف هذا الملف جداول RBAC القديمة (admin_roles / admin_permissions /
-- admin_role_permissions / admin_users) ويستبدلها بحقل user_type ثابت
-- مباشرةً في جدول profiles، مع حماية RLS كاملة لمنع تغيير النوع بعد الإنشاء.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. إنشاء Enum الجديد user_type
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_type') then
    create type user_type as enum (
      'passenger',
      'driver',
      'super_admin',
      'admin',
      'support'
    );
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. إضافة حقل user_type إلى profiles (بجانب role القديم مؤقتاً)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists user_type user_type not null default 'passenger';

-- إضافة حقل is_protected لحماية حسابات معيّنة على مستوى الصف
alter table public.profiles
  add column if not exists is_protected boolean not null default false;

-- -----------------------------------------------------------------------------
-- 3. ترحيل البيانات: نسخ قيم role القديم → user_type الجديد
--    admin القديم → 'admin' (المعنى الأقرب في النظام الجديد)
-- -----------------------------------------------------------------------------
update public.profiles
set user_type = case
  when role::text = 'passenger' then 'passenger'::user_type
  when role::text = 'driver'    then 'driver'::user_type
  when role::text = 'admin'     then 'admin'::user_type
  else 'passenger'::user_type
end;

-- -----------------------------------------------------------------------------
-- 4. تسمير حساب nuwate369@gmail.com كـ super_admin محمي
-- -----------------------------------------------------------------------------
update public.profiles
set
  user_type    = 'super_admin',
  is_protected = true
where id in (
  select id from auth.users where email = 'nuwate369@gmail.com'
);

-- -----------------------------------------------------------------------------
-- 5. حذف جداول RBAC القديمة (بترتيب يحترم المفاتيح الخارجية)
-- -----------------------------------------------------------------------------
drop table if exists public.admin_role_permissions cascade;
drop table if exists public.admin_users             cascade;
drop table if exists public.admin_permissions       cascade;
drop table if exists public.admin_roles             cascade;

-- -----------------------------------------------------------------------------
-- 6. حذف Enum القديم user_role بعد إزالة الجداول التي تعتمد عليه
-- -----------------------------------------------------------------------------
alter table public.profiles drop column if exists role;

do $$
begin
  if exists (select 1 from pg_type where typname = 'user_role') then
    drop type user_role;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 7. تحديث دالة handle_new_user لتقرأ user_type بدلاً من role
--    - passenger app يرسل user_type = 'passenger' دائماً
--    - driver app يرسل user_type = 'driver' دائماً
--    - admin inviteUserByEmail يرسل user_type = 'super_admin'|'admin'|'support'
--    - أي قيمة غير معروفة تُعامَل كـ 'passenger' (الأكثر أماناً)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_type user_type;
  v_raw_type  text;
begin
  v_raw_type := new.raw_user_meta_data ->> 'user_type';

  -- نقبل فقط القيم المعروفة؛ أي شيء آخر يصبح passenger
  v_user_type := case
    when v_raw_type in ('passenger', 'driver', 'super_admin', 'admin', 'support')
      then v_raw_type::user_type
    else 'passenger'::user_type
  end;

  insert into public.profiles (id, user_type, full_name, is_protected)
  values (
    new.id,
    v_user_type,
    new.raw_user_meta_data ->> 'full_name',
    false
  )
  on conflict (id) do update
    set full_name = excluded.full_name;

  return new;
end;
$$;

-- إعادة إنشاء المشغّل (لضمان اعتماده على الدالة المحدَّثة)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 8. Trigger لمنع تغيير user_type بعد إنشاء الصف (حتى service_role)
--    نستخدم SECURITY DEFINER + check داخلي بدلاً من RLS لأن
--    service_role يتجاوز RLS لكنه لا يتجاوز Triggers.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_immutable_user_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- منع تغيير user_type في أي UPDATE
  if tg_op = 'UPDATE' then
    if new.user_type <> old.user_type then
      raise exception
        'IMMUTABLE_USER_TYPE: لا يُسمح بتغيير user_type بعد إنشاء الحساب. '
        'استخدم عملية إدارية موثّقة يدوياً لتغيير نوع المستخدم.'
        using errcode = 'P0001';
    end if;
    -- منع تعديل أي صف is_protected = true
    if old.is_protected = true then
      raise exception
        'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن تعديله (is_protected = true).'
        using errcode = 'P0002';
    end if;
  end if;

  -- منع حذف أي صف is_protected = true
  if tg_op = 'DELETE' then
    if old.is_protected = true then
      raise exception
        'PROTECTED_PROFILE: هذا الحساب محمي ولا يمكن حذفه (is_protected = true).'
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

-- -----------------------------------------------------------------------------
-- 9. فهرس على user_type لأداء الاستعلامات
-- -----------------------------------------------------------------------------
create index if not exists idx_profiles_user_type on public.profiles (user_type);
create index if not exists idx_profiles_is_protected on public.profiles (is_protected) where is_protected = true;

-- -----------------------------------------------------------------------------
-- 10. تحديث سياسات RLS — إضافة سياسة تمنع المستخدم العادي من رؤية الموظفين
--     (الأدمن يعمل بـ service_role؛ هذه السياسات للمستخدمين العاديين فقط)
-- -----------------------------------------------------------------------------
-- تحديث سياسة profiles_update_own: يمنع صراحةً تغيير user_type أو is_protected
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- user_type و is_protected محميّان بالـ trigger أعلاه؛
    -- هذا فقط يضمن أن المستخدم لا يرى سجلات غيره
  );

-- =============================================================================
-- ملاحظة نهائية:
-- - حساب nuwate369@gmail.com الآن: user_type='super_admin', is_protected=true
-- - أي محاولة UPDATE أو DELETE لهذا الصف ستُرفض بـ trigger حتى من service_role
-- - النظام الجديد بلا جداول RBAC، الصلاحيات ثابتة بالكود في can() بـ shared-types
-- =============================================================================
