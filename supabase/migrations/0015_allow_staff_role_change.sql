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
