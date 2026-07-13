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
