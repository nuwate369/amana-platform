-- ============================================================
-- تشخيص: فشل إنشاء أي مستخدم جديد ("Database error saving new user")
-- شغّل كل الكتل في Supabase → SQL Editor → Run، وأرسل المخرجات كاملة.
-- ============================================================

-- 1) التعريف الحيّ الفعلي لدالة إنشاء المستخدم (المشتبه الأول)
select pg_get_functiondef('public.handle_new_user()'::regprocedure) as handle_new_user_def;

-- 2) كل المُشغّلات على auth.users (هل يوجد أكثر من on_auth_user_created؟)
select tgname, pg_get_triggerdef(oid) as trigger_def
from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- 3) كل المُشغّلات على public.profiles (أي مُشغّل INSERT قد يرمي استثناءً)
select tgname, pg_get_triggerdef(oid) as trigger_def
from pg_trigger
where tgrelid = 'public.profiles'::regclass and not tgisinternal;

-- 4) أعمدة profiles: أي عمود NOT NULL بلا default يكسر أي إدراج يُغفله
select column_name, is_nullable, column_default, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;

-- 5) قيود CHECK على profiles
select conname, pg_get_constraintdef(oid) as check_def
from pg_constraint
where conrelid = 'public.profiles'::regclass and contype = 'c';

-- 6) اختبار حيّ يكشف رسالة Postgres الحقيقية (يُنشئ مستخدمًا وهميًا ثم يتراجع كليًا)
do $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'diag-' || substr(v_id::text,1,8) || '@amana-diag.test', '',
          now(), '{"provider":"email","providers":["email"]}',
          '{"user_type":"driver","full_name":"Diag"}', now(), now());
  raise notice 'INSERT succeeded (unexpected) — rolling back';
  raise exception 'rollback_diag';
exception
  when others then
    raise notice 'REAL ERROR → sqlstate=% | message=%', sqlstate, sqlerrm;
end $$;
