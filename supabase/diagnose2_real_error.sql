-- ============================================================
-- تشخيص مركّز: يُظهر السبب الحقيقي لفشل التسجيل داخل جدول النتائج.
-- انسخه كاملًا في Supabase → SQL Editor → Run، وأرسل صفوف الجدول الظاهرة.
-- آمن تمامًا: لا يُبقي أي بيانات (المستخدم التجريبي يتراجع كليًا).
-- ============================================================

drop table if exists _diag;
create temp table _diag(step text, result text);

-- 1) حالة عمود locale (هل طُبّق إصلاح 0019؟)
insert into _diag
select 'locale_column',
  coalesce(
    (select 'is_nullable=' || is_nullable || '  default=' || coalesce(column_default,'<NONE>')
     from information_schema.columns
     where table_schema='public' and table_name='profiles' and column_name='locale'),
    '<no locale column>');

-- 2) اختبار التسجيل الحيّ ⇒ يلتقط رسالة Postgres الحقيقية
do $$
declare v_id uuid := gen_random_uuid(); v_msg text;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (v_id, '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'diag-'||substr(v_id::text,1,8)||'@amana-verify.test','', now(),
      '{"provider":"email","providers":["email"]}',
      '{"user_type":"driver","full_name":"Diag"}', now(), now());
    raise exception 'undo';   -- نجح الإدراج ⇒ نتراجع عمدًا
  exception
    when others then
      if sqlerrm = 'undo' then v_msg := '✅ OK — signup works now';
      else v_msg := '❌ sqlstate=' || sqlstate || ' | ' || sqlerrm; end if;
  end;
  insert into _diag values ('signup_test', v_msg);
end $$;

select * from _diag;
