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
